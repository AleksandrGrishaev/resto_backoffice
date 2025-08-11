// src/stores/storage/composables/useWriteOff.ts - Specialized Write-off Composable
import { ref, computed } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import { useStorageStore } from '../storageStore'
import { useProductsStore } from '@/stores/productsStore'
import type {
  WriteOffReason,
  StorageDepartment,
  StorageOperation,
  WriteOffStatistics,
  QuickWriteOffItem,
  doesWriteOffAffectKPI
} from '../types'

const MODULE_NAME = 'useWriteOff'

export function useWriteOff() {
  // Dependencies
  const storageStore = useStorageStore()
  const productsStore = useProductsStore()

  // Local state
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ===========================
  // WRITE-OFF OPERATIONS
  // ===========================

  /**
   * Create a simple write-off operation
   */
  async function writeOffProduct(
    itemId: string,
    quantity: number,
    reason: WriteOffReason,
    department: StorageDepartment,
    responsiblePerson: string,
    notes?: string
  ): Promise<StorageOperation> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Creating single product write-off', {
        itemId,
        quantity,
        reason,
        department
      })

      const operation = await storageStore.createWriteOff({
        department,
        responsiblePerson,
        reason,
        items: [
          {
            itemId,
            itemType: 'product',
            quantity,
            notes
          }
        ],
        notes
      })

      DebugUtils.info(MODULE_NAME, 'Product write-off created successfully', {
        operationId: operation.id
      })

      return operation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write off product'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create bulk write-off operation for multiple products
   */
  async function writeOffMultipleProducts(
    items: QuickWriteOffItem[],
    department: StorageDepartment,
    responsiblePerson: string,
    reason: WriteOffReason,
    notes?: string
  ): Promise<StorageOperation> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Creating bulk write-off', {
        itemCount: items.length,
        reason,
        department
      })

      const operation = await storageStore.createWriteOff({
        department,
        responsiblePerson,
        reason,
        items: items.map(item => ({
          itemId: item.itemId,
          itemType: 'product',
          quantity: item.writeOffQuantity,
          notes: item.notes
        })),
        notes
      })

      DebugUtils.info(MODULE_NAME, 'Bulk write-off created successfully', {
        operationId: operation.id,
        itemCount: items.length
      })

      return operation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write off products'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Quick write-off for expired products in department
   */
  async function writeOffExpiredProducts(
    department: StorageDepartment,
    responsiblePerson: string,
    notes?: string
  ): Promise<StorageOperation | null> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Writing off expired products', { department })

      // Get expired products
      const expiredBalances = storageStore.filteredBalances.filter(
        balance => balance.department === department && balance.hasExpired
      )

      if (expiredBalances.length === 0) {
        DebugUtils.info(MODULE_NAME, 'No expired products found', { department })
        return null
      }

      // Create write-off items for all expired stock
      const items = expiredBalances.map(balance => ({
        itemId: balance.itemId,
        itemType: 'product' as const,
        quantity: balance.totalQuantity, // Write off all expired stock
        notes: `Auto write-off: expired on ${balance.batches.find(b => b.expiryDate)?.expiryDate || 'unknown date'}`
      }))

      const operation = await storageStore.createWriteOff({
        department,
        responsiblePerson,
        reason: 'expired',
        items,
        notes: notes || 'Automatic write-off of expired products'
      })

      DebugUtils.info(MODULE_NAME, 'Expired products written off successfully', {
        operationId: operation.id,
        itemCount: items.length
      })

      return operation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to write off expired products'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // ===========================
  // WRITE-OFF HELPERS
  // ===========================

  /**
   * Get available products for write-off in department
   */
  function getAvailableProductsForWriteOff(department: StorageDepartment): QuickWriteOffItem[] {
    try {
      const balances = storageStore.departmentBalances(department)

      return balances
        .filter(balance => balance.totalQuantity > 0)
        .map(balance => ({
          itemId: balance.itemId,
          itemName: balance.itemName,
          currentQuantity: balance.totalQuantity,
          unit: balance.unit,
          writeOffQuantity: 0, // User will set this
          reason: 'other' as WriteOffReason,
          notes: ''
        }))
        .sort((a, b) => a.itemName.localeCompare(b.itemName))
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available products for write-off', { err })
      return []
    }
  }

  /**
   * Get products that need attention (expired, near expiry, spoiled)
   */
  function getProductsNeedingAttention(department: StorageDepartment) {
    try {
      const balances = storageStore.departmentBalances(department)

      return {
        expired: balances.filter(b => b.hasExpired),
        nearExpiry: balances.filter(b => b.hasNearExpiry && !b.hasExpired),
        lowStock: balances.filter(b => b.belowMinStock)
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get products needing attention', { err })
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
    itemId: string,
    quantity: number,
    department: StorageDepartment
  ): number {
    try {
      return storageStore.calculateCorrectionCost(itemId, department, quantity)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off cost', { err })
      return 0
    }
  }

  /**
   * Check if sufficient stock for write-off
   */
  function checkStockAvailability(
    itemId: string,
    quantity: number,
    department: StorageDepartment
  ): { available: boolean; currentStock: number; shortage: number } {
    try {
      const balance = storageStore.getBalance(itemId, department)

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
    department?: StorageDepartment,
    dateFrom?: string,
    dateTo?: string
  ): WriteOffStatistics {
    try {
      return storageStore.getWriteOffStatistics(department, dateFrom, dateTo)
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
      return storageStore.filteredOperations
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
  function getWriteOffsByReason(reason: WriteOffReason): StorageOperation[] {
    try {
      return storageStore.filteredOperations.filter(
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
   * Get write-off reason options for UI
   */
  const writeOffReasonOptions = computed(() => [
    {
      value: 'expired' as WriteOffReason,
      title: 'Expired',
      description: 'Product has passed expiry date',
      affectsKPI: true,
      color: 'error'
    },
    {
      value: 'spoiled' as WriteOffReason,
      title: 'Spoiled',
      description: 'Product is damaged or spoiled',
      affectsKPI: true,
      color: 'error'
    },
    {
      value: 'other' as WriteOffReason,
      title: 'Other Loss',
      description: 'Other losses (spill, mistake, etc.)',
      affectsKPI: true,
      color: 'warning'
    },
    {
      value: 'education' as WriteOffReason,
      title: 'Education',
      description: 'Staff training and education',
      affectsKPI: false,
      color: 'info'
    },
    {
      value: 'test' as WriteOffReason,
      title: 'Recipe Testing',
      description: 'Recipe development and testing',
      affectsKPI: false,
      color: 'success'
    }
  ])

  /**
   * Get display info for write-off reason
   */
  function getReasonInfo(reason: WriteOffReason) {
    return (
      writeOffReasonOptions.value.find(option => option.value === reason) || {
        value: reason,
        title: reason,
        description: '',
        affectsKPI: doesWriteOffAffectKPI(reason),
        color: 'default'
      }
    )
  }

  /**
   * Clear error state
   */
  function clearError() {
    error.value = null
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
    writeOffProduct,
    writeOffMultipleProducts,
    writeOffExpiredProducts,

    // Helpers
    getAvailableProductsForWriteOff,
    getProductsNeedingAttention,
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
