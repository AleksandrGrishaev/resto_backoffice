// src/stores/preparation/composables/usePreparationWriteOff.ts - COMPLETE PREPARATION WRITE-OFF COMPOSABLE
import { ref, computed } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import { usePreparationStore } from '../preparationStore'
import { useRecipesStore } from '@/stores/recipes'
import type {
  PreparationWriteOffReason,
  PreparationDepartment,
  PreparationOperation,
  PreparationWriteOffStatistics,
  QuickPreparationWriteOffItem,
  CreatePreparationWriteOffData,
  PreparationWriteOffItem,
  PreparationOperationItem,
  BatchAllocation
} from '../types'
import {
  doesPreparationWriteOffAffectKPI,
  PREPARATION_WRITE_OFF_REASON_OPTIONS,
  getPreparationWriteOffReasonInfo
} from '../types'

const MODULE_NAME = 'usePreparationWriteOff'

export function usePreparationWriteOff() {
  // Dependencies
  const preparationStore = usePreparationStore()
  const recipesStore = useRecipesStore()

  // Local state
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===========================
  // WRITE-OFF OPERATIONS
  // ===========================

  /**
   * Create a simple write-off operation
   */
  async function writeOffPreparation(
    preparationId: string,
    quantity: number,
    reason: PreparationWriteOffReason,
    department: PreparationDepartment,
    responsiblePerson: string,
    notes?: string
  ): Promise<PreparationOperation> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Creating single preparation write-off', {
        preparationId,
        quantity,
        reason,
        department
      })

      // Pre-validate stock availability
      const stockCheck = checkStockAvailability(preparationId, quantity, department)
      if (!stockCheck.available) {
        const preparationName = preparationStore.getPreparationName(preparationId)
        const unit = preparationStore.getPreparationUnit(preparationId)
        throw new Error(
          `Insufficient stock for ${preparationName}. Requested: ${quantity} ${unit}, Available: ${stockCheck.currentStock} ${unit}, Missing: ${stockCheck.shortage} ${unit}`
        )
      }

      const writeOffData: CreatePreparationWriteOffData = {
        department,
        responsiblePerson,
        reason,
        items: [
          {
            preparationId,
            quantity,
            notes
          }
        ],
        notes
      }

      const operation = await createWriteOffOperation(writeOffData)

      DebugUtils.info(MODULE_NAME, 'Preparation write-off created successfully', {
        operationId: operation.id
      })

      return operation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write off preparation'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create bulk write-off operation for multiple preparations
   */
  async function writeOffMultiplePreparations(
    items: QuickPreparationWriteOffItem[],
    department: PreparationDepartment,
    responsiblePerson: string,
    reason: PreparationWriteOffReason,
    notes?: string
  ): Promise<PreparationOperation> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Creating bulk preparation write-off', {
        itemCount: items.length,
        reason,
        department
      })

      // Validate all items first
      for (const item of items) {
        const stockCheck = checkStockAvailability(
          item.preparationId,
          item.writeOffQuantity,
          department
        )
        if (!stockCheck.available) {
          throw new Error(
            `Insufficient stock for ${item.preparationName}. Requested: ${item.writeOffQuantity} ${item.unit}, Available: ${stockCheck.currentStock} ${item.unit}, Missing: ${stockCheck.shortage} ${item.unit}`
          )
        }
      }

      const writeOffData: CreatePreparationWriteOffData = {
        department,
        responsiblePerson,
        reason,
        items: items.map(item => ({
          preparationId: item.preparationId,
          quantity: item.writeOffQuantity,
          notes: item.notes
        })),
        notes
      }

      const operation = await createWriteOffOperation(writeOffData)

      DebugUtils.info(MODULE_NAME, 'Bulk preparation write-off created successfully', {
        operationId: operation.id,
        itemCount: items.length
      })

      return operation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write off preparations'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Quick write-off for expired preparations in department
   */
  async function writeOffExpiredPreparations(
    department: PreparationDepartment,
    responsiblePerson: string,
    notes?: string
  ): Promise<PreparationOperation | null> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Writing off expired preparations', { department })

      // Get expired preparations
      const expiredBalances = preparationStore.filteredBalances.filter(
        balance => balance.department === department && balance.hasExpired
      )

      if (expiredBalances.length === 0) {
        DebugUtils.info(MODULE_NAME, 'No expired preparations found', { department })
        return null
      }

      // Create write-off items for all expired stock
      const writeOffData: CreatePreparationWriteOffData = {
        department,
        responsiblePerson,
        reason: 'expired',
        items: expiredBalances.map(balance => ({
          preparationId: balance.preparationId,
          quantity: balance.totalQuantity, // Write off all expired stock
          notes: `Auto write-off: expired on ${balance.batches.find(b => b.expiryDate)?.expiryDate || 'unknown date'}`
        })),
        notes: notes || 'Automatic write-off of expired preparations'
      }

      const operation = await createWriteOffOperation(writeOffData)

      DebugUtils.info(MODULE_NAME, 'Expired preparations written off successfully', {
        operationId: operation.id,
        itemCount: writeOffData.items.length
      })

      return operation
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to write off expired preparations'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===========================
  // CORE WRITE-OFF OPERATION CREATION
  // ===========================

  /**
   * Core function to create write-off operation (delegates to preparationStore)
   */
  async function createWriteOffOperation(
    data: CreatePreparationWriteOffData
  ): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation write-off operation', { data })

      const operation = await preparationStore.createWriteOff(data)

      DebugUtils.info(MODULE_NAME, 'Preparation write-off operation created', {
        operationId: operation.id,
        reason: data.reason,
        affectsKPI: doesPreparationWriteOffAffectKPI(data.reason),
        totalValue: operation.totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation write-off operation', { error })
      throw error
    }
  }

  // ===========================
  // WRITE-OFF HELPERS
  // ===========================

  /**
   * Get available preparations for write-off in department
   */
  function getAvailablePreparationsForWriteOff(
    department: PreparationDepartment
  ): QuickPreparationWriteOffItem[] {
    try {
      const balances = preparationStore.departmentBalances(department)

      return balances
        .filter(balance => balance.totalQuantity > 0)
        .map(balance => ({
          preparationId: balance.preparationId,
          preparationName: balance.preparationName,
          currentQuantity: balance.totalQuantity,
          unit: balance.unit,
          writeOffQuantity: 0, // User will set this
          reason: 'other' as PreparationWriteOffReason,
          notes: ''
        }))
        .sort((a, b) => a.preparationName.localeCompare(b.preparationName))
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available preparations for write-off', { err })
      return []
    }
  }

  /**
   * Get preparations that need attention (expired, near expiry, etc.)
   */
  function getPreparationsNeedingAttention(department: PreparationDepartment) {
    try {
      const balances = preparationStore.departmentBalances(department)

      return {
        expired: balances.filter(b => b.hasExpired),
        nearExpiry: balances.filter(b => b.hasNearExpiry && !b.hasExpired),
        lowStock: balances.filter(b => b.belowMinStock)
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparations needing attention', { err })
      return {
        expired: [],
        nearExpiry: [],
        lowStock: []
      }
    }
  }

  /**
   * Calculate write-off cost before executing
   */
  function calculateWriteOffCost(
    preparationId: string,
    quantity: number,
    department: PreparationDepartment
  ): number {
    try {
      return preparationStore.calculateCorrectionCost(preparationId, department, quantity)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off cost', { err })
      return 0
    }
  }

  /**
   * Check if sufficient stock for write-off
   */
  function checkStockAvailability(
    preparationId: string,
    quantity: number,
    department: PreparationDepartment
  ): { available: boolean; currentStock: number; shortage: number } {
    try {
      const balance = preparationStore.getBalance(preparationId, department)

      if (!balance) {
        return { available: false, currentStock: 0, shortage: quantity }
      }

      const currentStock = balance.totalQuantity
      const shortage = Math.max(0, quantity - currentStock)

      return {
        available: shortage === 0,
        currentStock,
        shortage
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to check stock availability', { err })
      return { available: false, currentStock: 0, shortage: quantity }
    }
  }

  // ===========================
  // WRITE-OFF STATISTICS
  // ===========================

  /**
   * Get write-off statistics for department and period
   */
  function getWriteOffStatistics(
    department?: PreparationDepartment,
    dateFrom?: string,
    dateTo?: string
  ): PreparationWriteOffStatistics {
    try {
      return preparationStore.getWriteOffStatistics(department, dateFrom, dateTo)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get write-off statistics', { err })
      return {
        total: { count: 0, value: 0 },
        kpiAffecting: {
          count: 0,
          value: 0,
          reasons: {
            expired: { count: 0, value: 0 },
            spoiled: { count: 0, value: 0 },
            other: { count: 0, value: 0 }
          }
        },
        nonKpiAffecting: {
          count: 0,
          value: 0,
          reasons: {
            education: { count: 0, value: 0 },
            test: { count: 0, value: 0 }
          }
        },
        byDepartment: {
          kitchen: { total: 0, kpiAffecting: 0, nonKpiAffecting: 0 },
          bar: { total: 0, kpiAffecting: 0, nonKpiAffecting: 0 }
        }
      }
    }
  }

  /**
   * Get recent write-off operations
   */
  const recentWriteOffs = computed(() => {
    try {
      return preparationStore.filteredOperations
        .filter(op => op.operationType === 'write_off')
        .slice(0, 10)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get recent write-offs', { err })
      return []
    }
  })

  /**
   * Get write-off operations by reason
   */
  function getWriteOffsByReason(reason: PreparationWriteOffReason): PreparationOperation[] {
    try {
      return preparationStore.filteredOperations.filter(
        op => op.operationType === 'write_off' && op.writeOffDetails?.reason === reason
      )
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get write-offs by reason', { err })
      return []
    }
  }

  // ===========================
  // UTILITY FUNCTIONS
  // ===========================

  /**
   * Get write-off reason options for UI (from types.ts)
   */
  const writeOffReasonOptions = computed(() => PREPARATION_WRITE_OFF_REASON_OPTIONS)

  /**
   * Get display info for write-off reason (from types.ts)
   */
  function getReasonInfo(reason: PreparationWriteOffReason) {
    return getPreparationWriteOffReasonInfo(reason)
  }

  /**
   * Clear error state
   */
  function clearError() {
    error.value = null
  }

  // ===========================
  // HELPER FUNCTIONS
  // ===========================

  /**
   * Get preparation information
   */
  function getPreparationInfo(preparationId: string) {
    try {
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)

      if (!preparation) {
        DebugUtils.warn(MODULE_NAME, 'Preparation not found', { preparationId })
        return {
          name: preparationId,
          unit: 'gram',
          costPerPortion: 0,
          shelfLife: 2
        }
      }

      return {
        name: preparation.name,
        unit: preparation.outputUnit,
        costPerPortion: preparation.costPerPortion || 0,
        shelfLife: preparation.shelfLife || 2
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting preparation info', { error, preparationId })
      return {
        name: preparationId,
        unit: 'gram',
        costPerPortion: 0,
        shelfLife: 2
      }
    }
  }

  // ===========================
  // COMPUTED PROPERTIES
  // ===========================

  const hasError = computed(() => !!error.value)
  const isLoading = computed(() => loading.value)

  // Quick access to department statistics
  const kitchenWriteOffs = computed(() => getWriteOffStatistics('kitchen'))
  const barWriteOffs = computed(() => getWriteOffStatistics('bar'))

  // ===========================
  // RETURN PUBLIC API
  // ===========================

  return {
    // State
    loading: isLoading,
    error,
    hasError,

    // Write-off operations
    writeOffPreparation,
    writeOffMultiplePreparations,
    writeOffExpiredPreparations,

    // Helpers
    getAvailablePreparationsForWriteOff,
    getPreparationsNeedingAttention,
    calculateWriteOffCost,
    checkStockAvailability,

    // Statistics
    getWriteOffStatistics,
    recentWriteOffs,
    getWriteOffsByReason,
    kitchenWriteOffs,
    barWriteOffs,

    // UI utilities
    writeOffReasonOptions,
    getReasonInfo,
    clearError
  }
}
