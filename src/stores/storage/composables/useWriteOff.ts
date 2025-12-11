// src/stores/storage/composables/useWriteOff.ts - UPDATED WITH FILTERING
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { useStorageStore } from '../storageStore'
import { useProductsStore } from '@/stores/productsStore'
import type { Department } from '@/stores/productsStore/types'

import type {
  WriteOffReason,
  StorageOperation,
  WriteOffStatistics,
  QuickWriteOffItem,
  CreateWriteOffData
} from '../types'
import { doesWriteOffAffectKPI, WRITE_OFF_REASON_OPTIONS, getWriteOffReasonInfo } from '../types'

const MODULE_NAME = 'useWriteOff'

export function useWriteOff() {
  // Dependencies
  const storageStore = useStorageStore()
  const productsStore = useProductsStore()

  // Local state
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedDepartment = ref<Department | 'all'>('all') // ✅ ДОБАВЛЕНО

  // ===========================
  // COMPUTED - Filtered Products
  // ===========================

  /**
   * ✅ НОВОЕ: Available products filtered by department
   */
  const availableProducts = computed((): QuickWriteOffItem[] => {
    try {
      const dept = selectedDepartment.value

      return storageStore.state.balances
        .filter(balance => {
          // Only with stock
          if (balance.totalQuantity <= 0) return false

          // Filter by department through Product
          if (dept !== 'all') {
            const product = productsStore.products.find(p => p.id === balance.itemId)
            if (!product) return false
            return product.usedInDepartments.includes(dept as Department)
          }

          return true
        })
        .map(balance => ({
          itemId: balance.itemId,
          itemName: balance.itemName,
          currentQuantity: balance.totalQuantity,
          unit: balance.unit,
          writeOffQuantity: 0,
          reason: 'other' as WriteOffReason,
          notes: ''
        }))
        .sort((a, b) => a.itemName.localeCompare(b.itemName))
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available products', { err })
      return []
    }
  })

  /**
   * ✅ НОВОЕ: Expired products filtered by department
   */
  const expiredProducts = computed((): QuickWriteOffItem[] => {
    try {
      const dept = selectedDepartment.value

      return storageStore.state.balances
        .filter(balance => {
          if (!balance.hasExpired) return false

          if (dept !== 'all') {
            const product = productsStore.products.find(p => p.id === balance.itemId)
            if (!product) return false
            return product.usedInDepartments.includes(dept as Department)
          }

          return true
        })
        .map(balance => ({
          itemId: balance.itemId,
          itemName: balance.itemName,
          currentQuantity: balance.totalQuantity,
          unit: balance.unit,
          writeOffQuantity: balance.totalQuantity,
          reason: 'expired' as WriteOffReason,
          notes: 'Automatic write-off of expired products',
          hasExpired: true
        }))
        .sort((a, b) => a.itemName.localeCompare(b.itemName))
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expired products', { err })
      return []
    }
  })

  /**
   * ✅ НОВОЕ: Products needing attention (expired + near expiry)
   */
  const productsNeedingAttention = computed((): QuickWriteOffItem[] => {
    try {
      const dept = selectedDepartment.value

      return storageStore.state.balances
        .filter(balance => {
          if (!balance.hasExpired && !balance.hasNearExpiry) return false

          if (dept !== 'all') {
            const product = productsStore.products.find(p => p.id === balance.itemId)
            if (!product) return false
            return product.usedInDepartments.includes(dept as Department)
          }

          return true
        })
        .map(balance => ({
          itemId: balance.itemId,
          itemName: balance.itemName,
          currentQuantity: balance.totalQuantity,
          unit: balance.unit,
          writeOffQuantity: balance.totalQuantity,
          reason: balance.hasExpired
            ? ('expired' as WriteOffReason)
            : ('spoiled' as WriteOffReason),
          notes: balance.hasExpired ? 'Expired' : 'Near expiry - needs attention',
          hasExpired: balance.hasExpired,
          hasNearExpiry: balance.hasNearExpiry
        }))
        .sort((a, b) => {
          // Expired first, then near expiry
          if (a.hasExpired && !b.hasExpired) return -1
          if (!a.hasExpired && b.hasExpired) return 1
          if (a.hasNearExpiry && !b.hasNearExpiry) return -1
          if (!a.hasNearExpiry && b.hasNearExpiry) return 1
          return a.itemName.localeCompare(b.itemName)
        })
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get products needing attention', { err })
      return []
    }
  })

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
    department: Department,
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

      // Pre-validate stock availability
      const stockCheck = checkStockAvailability(itemId, quantity, department)
      if (!stockCheck.available) {
        const productName = storageStore.getItemName(itemId)
        const unit = storageStore.getItemUnit(itemId)
        throw new Error(
          `Insufficient stock for ${productName}. Requested: ${quantity} ${unit}, Available: ${stockCheck.currentStock} ${unit}, Missing: ${stockCheck.shortage} ${unit}`
        )
      }

      // Get item info for the write-off
      const itemName = storageStore.getItemName(itemId)
      const unit = storageStore.getItemUnit(itemId)

      const writeOffData: CreateWriteOffData = {
        department,
        responsiblePerson,
        reason,
        items: [
          {
            itemId,
            itemName,
            itemType: 'product',
            quantity,
            unit,
            notes
          }
        ],
        notes
      }

      const operation = await createWriteOffOperation(writeOffData)

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
    department: Department,
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

      // Validate all items first
      for (const item of items) {
        const stockCheck = checkStockAvailability(item.itemId, item.writeOffQuantity, department)
        if (!stockCheck.available) {
          throw new Error(
            `Insufficient stock for ${item.itemName}. Requested: ${item.writeOffQuantity} ${item.unit}, Available: ${stockCheck.currentStock} ${item.unit}, Missing: ${stockCheck.shortage} ${item.unit}`
          )
        }
      }

      const writeOffData: CreateWriteOffData = {
        department,
        responsiblePerson,
        reason,
        items: items.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          itemType: 'product',
          quantity: item.writeOffQuantity,
          unit: item.unit,
          notes: item.notes
        })),
        notes
      }

      const operation = await createWriteOffOperation(writeOffData)

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
    department: Department,
    responsiblePerson: string,
    notes?: string
  ): Promise<StorageOperation | null> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Writing off expired products', { department })

      // Filter by Product.usedInDepartments
      const expiredBalances = storageStore.state.balances.filter(balance => {
        if (!balance.hasExpired) return false

        const product = productsStore.products.find(p => p.id === balance.itemId)
        if (!product) return false

        return product.usedInDepartments.includes(department)
      })

      if (expiredBalances.length === 0) {
        DebugUtils.info(MODULE_NAME, 'No expired products found', { department })
        return null
      }

      const writeOffData: CreateWriteOffData = {
        department,
        responsiblePerson,
        reason: 'expired',
        items: expiredBalances.map(balance => ({
          itemId: balance.itemId,
          itemName: balance.itemName,
          itemType: 'product' as const,
          quantity: balance.totalQuantity,
          unit: balance.unit,
          notes: `Auto write-off: expired on ${balance.batches.find(b => b.expiryDate)?.expiryDate || 'unknown date'}`
        })),
        notes: notes || 'Automatic write-off of expired products'
      }

      const operation = await createWriteOffOperation(writeOffData)

      DebugUtils.info(MODULE_NAME, 'Expired products written off successfully', {
        operationId: operation.id,
        itemCount: writeOffData.items.length
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
  // CORE WRITE-OFF OPERATION CREATION
  // ===========================

  /**
   * Core function to create write-off operation
   */
  async function createWriteOffOperation(data: CreateWriteOffData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Delegating write-off operation to storageStore', {
        department: data.department,
        reason: data.reason,
        itemCount: data.items.length
      })

      const operation = await storageStore.createWriteOff(data)

      DebugUtils.info(MODULE_NAME, 'Write-off operation completed successfully', {
        operationId: operation.id,
        reason: data.reason,
        affectsKPI: doesWriteOffAffectKPI(data.reason),
        totalValue: operation.totalValue,
        itemCount: operation.items.length
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create write-off operation', { error })
      throw error
    }
  }

  // ===========================
  // HELPER FUNCTIONS
  // ===========================

  /**
   * Get available products for write-off in department (legacy method)
   */
  function getAvailableProductsForWriteOff(department: Department): QuickWriteOffItem[] {
    try {
      const balances = storageStore.state.balances.filter(balance => {
        const product = productsStore.products.find(p => p.id === balance.itemId)
        if (!product) return false
        return product.usedInDepartments.includes(department)
      })

      return balances
        .filter(balance => balance.totalQuantity > 0)
        .map(balance => ({
          itemId: balance.itemId,
          itemName: balance.itemName,
          currentQuantity: balance.totalQuantity,
          unit: balance.unit,
          writeOffQuantity: 0,
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
   * Get products that need attention (legacy method)
   */
  function getProductsNeedingAttention(department: Department): QuickWriteOffItem[] {
    try {
      const balances = storageStore.state.balances.filter(balance => {
        const product = productsStore.products.find(p => p.id === balance.itemId)
        if (!product) return false
        return product.usedInDepartments.includes(department)
      })

      return balances
        .filter(balance => balance.hasExpired || balance.hasNearExpiry || balance.totalQuantity > 0)
        .map(balance => ({
          itemId: balance.itemId,
          itemName: balance.itemName,
          currentQuantity: balance.totalQuantity,
          unit: balance.unit,
          writeOffQuantity: balance.totalQuantity,
          reason: balance.hasExpired ? 'expired' : ('spoiled' as WriteOffReason),
          notes: balance.hasExpired ? 'Expired' : 'Needs attention',
          hasExpired: balance.hasExpired,
          hasNearExpiry: balance.hasNearExpiry
        }))
        .sort((a, b) => {
          if (a.hasExpired && !b.hasExpired) return -1
          if (!a.hasExpired && b.hasExpired) return 1
          if (a.hasNearExpiry && !b.hasNearExpiry) return -1
          if (!a.hasNearExpiry && b.hasNearExpiry) return 1
          return a.itemName.localeCompare(b.itemName)
        })
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get products needing attention', { err })
      return []
    }
  }

  /**
   * Calculate write-off cost before executing
   */
  function calculateWriteOffCost(itemId: string, quantity: number, department: Department): number {
    try {
      const balance = storageStore.state.balances.find(b => b.itemId === itemId)

      if (!balance || !balance.batches || balance.batches.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No balance or batches found for cost calculation', {
          itemId,
          department,
          hasBalance: !!balance
        })
        return 0
      }

      // Check product is used in department
      const product = productsStore.products.find(p => p.id === itemId)
      if (!product || !product.usedInDepartments.includes(department)) {
        DebugUtils.warn(MODULE_NAME, 'Product not used in department', {
          itemId,
          department
        })
        return 0
      }

      // Get active batches sorted by FIFO
      const availableBatches = balance.batches
        .filter(batch => batch.currentQuantity > 0)
        .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

      if (availableBatches.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No available batches for cost calculation', {
          itemId,
          department
        })
        return 0
      }

      // Calculate cost using FIFO principle
      let remainingQuantity = quantity
      let totalCost = 0

      for (const batch of availableBatches) {
        if (remainingQuantity <= 0) break

        const allocationQuantity = Math.min(batch.currentQuantity, remainingQuantity)
        const batchCost = allocationQuantity * batch.costPerUnit

        totalCost += batchCost
        remainingQuantity -= allocationQuantity
      }

      if (remainingQuantity > 0) {
        DebugUtils.warn(MODULE_NAME, 'Insufficient stock for full cost calculation', {
          requestedQuantity: quantity,
          calculatedQuantity: quantity - remainingQuantity,
          shortage: remainingQuantity
        })
      }

      return Math.round(totalCost * 100) / 100
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off cost', { err })

      try {
        const balance = storageStore.state.balances.find(b => b.itemId === itemId)
        const fallbackCost = (balance?.averageCost || 0) * quantity

        DebugUtils.warn(MODULE_NAME, 'Using fallback cost calculation', {
          itemId,
          quantity,
          averageCost: balance?.averageCost || 0,
          fallbackCost
        })

        return fallbackCost
      } catch (fallbackError) {
        DebugUtils.error(MODULE_NAME, 'Fallback cost calculation also failed', { fallbackError })
        return 0
      }
    }
  }

  /**
   * Check stock availability
   */
  function checkStockAvailability(
    itemId: string,
    requiredQuantity: number,
    department: Department
  ): { available: boolean; currentStock: number; shortage: number } {
    try {
      const balance = storageStore.state.balances.find(b => b.itemId === itemId)

      if (!balance) {
        return {
          available: false,
          currentStock: 0,
          shortage: requiredQuantity
        }
      }

      // Check product is used in department
      const product = productsStore.products.find(p => p.id === itemId)
      if (!product || !product.usedInDepartments.includes(department)) {
        return {
          available: false,
          currentStock: 0,
          shortage: requiredQuantity
        }
      }

      const currentStock = balance.totalQuantity
      const available = currentStock >= requiredQuantity
      const shortage = available ? 0 : requiredQuantity - currentStock

      return {
        available,
        currentStock,
        shortage
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to check stock availability', { err })
      return {
        available: false,
        currentStock: 0,
        shortage: requiredQuantity
      }
    }
  }

  // ===========================
  // STATISTICS
  // ===========================

  /**
   * Get write-off statistics for department and period
   */
  async function getWriteOffStatistics(
    department: Department | 'all' = 'all',
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<WriteOffStatistics> {
    try {
      const now = new Date()
      let dateFrom: string

      switch (period) {
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          break
        case 'month':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
          break
        case 'quarter':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
          break
        case 'year':
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
          break
      }

      return await storageStore.getWriteOffStatistics(department, dateFrom)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get write-off statistics', { err })
      throw err
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
  // UI UTILITIES
  // ===========================

  /**
   * Get write-off reason options for UI
   */
  const writeOffReasonOptions = computed(() => {
    return WRITE_OFF_REASON_OPTIONS.map(option => ({
      ...option,
      subtitle: option.affectsKPI ? 'Affects KPI metrics' : 'Does not affect KPI'
    }))
  })

  /**
   * Get display info for write-off reason
   */
  function getReasonInfo(reason: WriteOffReason) {
    return getWriteOffReasonInfo(reason)
  }

  /**
   * ✅ НОВОЕ: Check if product is used in department
   */
  function isProductUsedInDepartment(productId: string, department: Department): boolean {
    const product = productsStore.products.find(p => p.id === productId)
    return product?.usedInDepartments.includes(department) ?? false
  }

  /**
   * ✅ НОВОЕ: Get department display name
   */
  function getDepartmentName(department: Department): string {
    return department === 'kitchen' ? 'Kitchen' : 'Bar'
  }

  /**
   * ✅ НОВОЕ: Get department color
   */
  function getDepartmentColor(department: Department): string {
    return department === 'kitchen' ? 'success' : 'info'
  }

  /**
   * ✅ НОВОЕ: Get department icon
   */
  function getDepartmentIcon(department: Department): string {
    return department === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'
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
    selectedDepartment, // ✅ ДОБАВЛЕНО

    // Computed - Filtered Data
    availableProducts, // ✅ ДОБАВЛЕНО
    expiredProducts, // ✅ ДОБАВЛЕНО
    productsNeedingAttention, // ✅ ДОБАВЛЕНО

    // Write-off operations
    writeOffProduct,
    writeOffMultipleProducts,
    writeOffExpiredProducts,

    // Helpers (legacy methods)
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
    clearError,

    // Department helpers (✅ ДОБАВЛЕНО)
    isProductUsedInDepartment,
    getDepartmentName,
    getDepartmentColor,
    getDepartmentIcon
  }
}
