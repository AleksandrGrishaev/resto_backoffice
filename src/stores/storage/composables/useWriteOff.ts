// src/stores/storage/composables/useWriteOff.ts - COMPLETE WRITE-OFF COMPOSABLE
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
  CreateWriteOffData,
  WriteOffItem,
  StorageOperationItem,
  BatchAllocation
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

      // Pre-validate stock availability
      const stockCheck = checkStockAvailability(itemId, quantity, department)
      if (!stockCheck.available) {
        const productName = storageStore.getItemName(itemId)
        const unit = storageStore.getItemUnit(itemId)
        throw new Error(
          `Insufficient stock for ${productName}. Requested: ${quantity} ${unit}, Available: ${stockCheck.currentStock} ${unit}, Missing: ${stockCheck.shortage} ${unit}`
        )
      }

      const writeOffData: CreateWriteOffData = {
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
          itemType: 'product',
          quantity: item.writeOffQuantity,
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
    department: StorageDepartment,
    responsiblePerson: string,
    notes?: string
  ): Promise<StorageOperation | null> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Writing off expired products', { department })

      // ✅ Filter by Product.usedInDepartments
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
          itemType: 'product' as const,
          quantity: balance.totalQuantity,
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
   * Core function to create write-off operation (replaces storageService.createWriteOff)
   */
  async function createWriteOffOperation(data: CreateWriteOffData): Promise<StorageOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Delegating write-off operation to storageStore', {
        department: data.department,
        reason: data.reason,
        itemCount: data.items.length
      })

      // ✅ ЕДИНСТВЕННАЯ ЛОГИКА: делегируем в storageStore
      // storageStore.createWriteOff уже:
      // - Рассчитывает FIFO allocation
      // - Создает operationItems
      // - Обновляет батчи
      // - Создает StorageOperation
      // - Сохраняет в state
      // - Синхронизирует балансы
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
  // WRITE-OFF HELPERS
  // ===========================

  /**
   * Get available products for write-off in department
   */
  function getAvailableProductsForWriteOff(department: StorageDepartment): QuickWriteOffItem[] {
    try {
      // ✅ Filter by Product.usedInDepartments
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
   * Get products that need attention (expired, near expiry, spoiled)
   */
  function getProductsNeedingAttention(department: StorageDepartment) {
    try {
      // ✅ Filter by Product.usedInDepartments
      const balances = storageStore.state.balances.filter(balance => {
        const product = productsStore.products.find(p => p.id === balance.itemId)
        if (!product) return false
        return product.usedInDepartments.includes(department)
      })

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
      // ИСПРАВЛЕНИЕ: Вместо несуществующего calculateCorrectionCost
      // используем логику расчета стоимости через балансы и батчи

      const balance = storageStore.getBalance(itemId, department)
      if (!balance || !balance.batches || balance.batches.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No balance or batches found for cost calculation', {
          itemId,
          department,
          hasBalance: !!balance
        })
        return 0
      }

      // Получаем активные батчи, отсортированные по FIFO (первый пришел - первый ушел)
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

      // Рассчитываем стоимость по FIFO принципу
      let remainingQuantity = quantity
      let totalCost = 0

      for (const batch of availableBatches) {
        if (remainingQuantity <= 0) break

        const allocationQuantity = Math.min(batch.currentQuantity, remainingQuantity)
        const batchCost = allocationQuantity * batch.costPerUnit

        totalCost += batchCost
        remainingQuantity -= allocationQuantity

        DebugUtils.debug(MODULE_NAME, 'Batch allocation for cost calculation', {
          batchId: batch.id,
          batchQuantity: batch.currentQuantity,
          allocationQuantity,
          costPerUnit: batch.costPerUnit,
          batchCost,
          remainingQuantity
        })
      }

      if (remainingQuantity > 0) {
        DebugUtils.warn(MODULE_NAME, 'Insufficient stock for full cost calculation', {
          requestedQuantity: quantity,
          calculatedQuantity: quantity - remainingQuantity,
          shortage: remainingQuantity
        })
      }

      DebugUtils.debug(MODULE_NAME, 'Write-off cost calculated', {
        itemId,
        quantity,
        totalCost,
        averageCostPerUnit: totalCost / (quantity - remainingQuantity || 1)
      })

      return Math.round(totalCost * 100) / 100 // Округляем до центов
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off cost', { err })

      // Критический fallback: используем среднюю стоимость из баланса
      try {
        const balance = storageStore.getBalance(itemId, department)
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
   * Get write-off reason options for UI (from types.ts)
   */
  const writeOffReasonOptions = computed(() => WRITE_OFF_REASON_OPTIONS)

  /**
   * Get display info for write-off reason (from types.ts)
   */
  function getReasonInfo(reason: WriteOffReason) {
    return getWriteOffReasonInfo(reason)
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
   * Get product information
   */
  function getProductInfo(productId: string) {
    try {
      const product = productsStore.products.find(p => p.id === productId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, 'Product not found', { productId })
        return {
          name: productId,
          unit: 'kg',
          costPerUnit: 0,
          minStock: 0,
          shelfLife: 7
        }
      }

      return {
        name: product.name,
        unit: product.unit,
        costPerUnit: product.costPerUnit,
        minStock: product.minStock || 0,
        shelfLife: product.shelfLife || 7
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting product info', { error, productId })
      return {
        name: productId,
        unit: 'kg',
        costPerUnit: 0,
        minStock: 0,
        shelfLife: 7
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
