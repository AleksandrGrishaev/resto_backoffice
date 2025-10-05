// src/stores/storage/storageStore.ts - КОНВЕРТИРОВАНО В PINIA STORE
// ✅ Полная конвертация с сохранением ВСЕГО API для обратной совместимости

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { storageService } from './storageService'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'
import { convertToBaseUnits } from '@/composables/useMeasurementUnits'
import { transitBatchService } from './transitBatchService'

import type {
  StorageState,
  StorageBatch,
  StorageOperation,
  StorageBalance,
  StorageBalanceWithTransit,
  StorageDepartment,
  InventoryDocument,
  CreateReceiptData,
  CreateWriteOffData,
  CreateCorrectionData,
  CreateInventoryData,
  InventoryItem,
  CreateTransitBatchData
} from './types'

const MODULE_NAME = 'StorageStore'

// ============================================================================
// PINIA STORE DEFINITION
// ============================================================================

export const useStorageStore = defineStore('storage', () => {
  // ===========================
  // STATE
  // ===========================

  const state = ref<StorageState>({
    activeBatches: [], // ✅ Only active batches
    transitBatches: [], // ✅ Only transit batches
    operations: [],
    balances: [],
    inventories: [],

    loading: {
      balances: false,
      operations: false,
      inventory: false,
      correction: false,
      writeOff: false
    },
    error: null,

    filters: {
      department: 'all',
      operationType: undefined,
      showExpired: false,
      showBelowMinStock: false,
      showNearExpiry: false,
      search: '',
      dateFrom: undefined,
      dateTo: undefined
    },

    settings: {
      expiryWarningDays: 7,
      lowStockMultiplier: 1.5,
      autoCalculateBalance: true,
      enableQuickWriteOff: true
    }
  })

  const initialized = ref(false)

  // ===========================
  // COMPUTED PROPERTIES
  // ===========================

  /**
   * All batches (active + transit) for backward compatibility
   */
  const allBatches = computed(() => [...state.value.activeBatches, ...state.value.transitBatches])

  /**
   * Direct access to transit batches
   */
  const transitBatches = computed(() => state.value.transitBatches)

  /**
   * Active batches only
   */
  const activeBatches = computed(() => state.value.activeBatches)

  const filteredBalances = computed(() => {
    let balances = [...state.value.balances]

    if (state.value.filters.department !== 'all') {
      balances = balances.filter(b => b.department === state.value.filters.department)
    }

    if (state.value.filters.search) {
      const search = state.value.filters.search.toLowerCase()
      balances = balances.filter(b => b.itemName.toLowerCase().includes(search))
    }

    if (state.value.filters.showExpired) {
      balances = balances.filter(b => b.hasExpired)
    }

    if (state.value.filters.showBelowMinStock) {
      balances = balances.filter(b => b.belowMinStock)
    }

    if (state.value.filters.showNearExpiry) {
      balances = balances.filter(b => b.hasNearExpiry)
    }

    return balances
  })

  const filteredOperations = computed(() => {
    let operations = [...state.value.operations]

    if (state.value.filters.department !== 'all') {
      operations = operations.filter(op => op.department === state.value.filters.department)
    }

    if (state.value.filters.operationType) {
      operations = operations.filter(op => op.operationType === state.value.filters.operationType)
    }

    if (state.value.filters.search) {
      const search = state.value.filters.search.toLowerCase()
      operations = operations.filter(
        op =>
          op.documentNumber.toLowerCase().includes(search) ||
          op.responsiblePerson.toLowerCase().includes(search) ||
          op.items.some(item => item.itemName.toLowerCase().includes(search))
      )
    }

    if (state.value.filters.dateFrom) {
      const fromDate = new Date(state.value.filters.dateFrom)
      operations = operations.filter(op => new Date(op.operationDate) >= fromDate)
    }

    if (state.value.filters.dateTo) {
      const toDate = new Date(state.value.filters.dateTo)
      operations = operations.filter(op => new Date(op.operationDate) <= toDate)
    }

    return operations
  })

  const totalStockValue = computed(() => {
    return state.value.balances.reduce((sum, balance) => sum + balance.totalValue, 0)
  })

  const lowStockItemsCount = computed(() => {
    return state.value.balances.filter(balance => balance.belowMinStock).length
  })

  const expiredItemsCount = computed(() => {
    return state.value.balances.filter(balance => balance.hasExpired).length
  })

  const nearExpiryItemsCount = computed(() => {
    return state.value.balances.filter(balance => balance.hasNearExpiry).length
  })

  // ✅ ИСПРАВЛЕНО: departmentBalances как computed функция
  const departmentBalances = computed(() => {
    return (department: StorageDepartment) => {
      return state.value.balances.filter(
        b => b && b.itemType === 'product' && b.department === department
      )
    }
  })

  const balancesWithTransit = computed((): StorageBalanceWithTransit[] => {
    const transit = transitBatches.value

    return state.value.balances.map(balance => {
      const itemTransitBatches = transit.filter(
        batch => batch.itemId === balance.itemId && batch.department === balance.department
      )

      const transitQuantity = itemTransitBatches.reduce(
        (sum, batch) => sum + batch.currentQuantity,
        0
      )
      const transitValue = itemTransitBatches.reduce((sum, batch) => sum + batch.totalValue, 0)

      const deliveryDates = itemTransitBatches
        .map(b => b.plannedDeliveryDate)
        .filter(date => date)
        .sort()

      const extendedBalance: StorageBalanceWithTransit = {
        ...balance,
        transitQuantity,
        transitValue,
        totalWithTransit: balance.totalQuantity + transitQuantity,
        nearestDelivery: deliveryDates[0] || undefined,
        transitBatches: itemTransitBatches
      }

      return extendedBalance
    })
  })

  const transitMetrics = computed(() => {
    const transit = transitBatches.value
    const now = new Date()

    const overdueTransit = transit.filter(batch => {
      if (!batch.plannedDeliveryDate) return false
      return new Date(batch.plannedDeliveryDate) < now
    })

    const dueTodayTransit = transit.filter(batch => {
      if (!batch.plannedDeliveryDate) return false
      const deliveryDate = new Date(batch.plannedDeliveryDate)
      return deliveryDate.toDateString() === now.toDateString()
    })

    return {
      totalTransitBatches: transit.length,
      totalTransitOrders: new Set(transit.map(b => b.purchaseOrderId)).size,
      totalTransitValue: transit.reduce((sum, b) => sum + b.totalValue, 0),
      overdueCount: overdueTransit.length,
      overdueValue: overdueTransit.reduce((sum, b) => sum + b.totalValue, 0),
      dueTodayCount: dueTodayTransit.length,
      dueTodayValue: dueTodayTransit.reduce((sum, b) => sum + b.totalValue, 0)
    }
  })

  // ===========================
  // CORE ACTIONS
  // ===========================

  async function initialize() {
    try {
      if (initialized.value) {
        DebugUtils.debug(MODULE_NAME, 'Storage store already initialized')
        return
      }

      DebugUtils.info(MODULE_NAME, 'Initializing storage store...')
      state.value.loading.balances = true
      state.value.error = null

      // ✅ ВРЕМЕННОЕ РЕШЕНИЕ - динамический импорт
      const { storageService: service } = await import('./storageService')

      await service.initialize()

      // Проверяем что методы доступны
      console.log('getActiveBatches type:', typeof service.getActiveBatches)
      console.log('getTransitBatches type:', typeof service.getTransitBatches)

      const balances = await service.getBalances()
      const activeBatches = await service.getActiveBatches()
      const transitBatches = await service.getTransitBatches()
      const operations = await service.getOperations()
      const inventories = await service.getInventories()

      // Update state
      state.value.balances = balances
      state.value.activeBatches = activeBatches
      state.value.transitBatches = transitBatches
      state.value.operations = operations
      state.value.inventories = inventories

      transitBatchService.load(transitBatches)

      initialized.value = true

      DebugUtils.info(MODULE_NAME, 'Storage store initialized successfully', {
        activeBatches: activeBatches.length,
        transitBatches: transitBatches.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize storage store'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.balances = false
    }
  }

  async function fetchBalances(department?: StorageDepartment) {
    try {
      state.value.loading.balances = true
      state.value.error = null

      const [balances, activeBatches, transitBatches] = await Promise.all([
        storageService.getBalances(department),
        storageService.getActiveBatches(department), // ✅ CHANGED
        storageService.getTransitBatches(department) // ✅ NEW
      ])

      state.value.balances = balances
      state.value.activeBatches = activeBatches // ✅ CHANGED
      state.value.transitBatches = transitBatches // ✅ NEW

      DebugUtils.debug(MODULE_NAME, 'Balances and batches fetched', {
        balances: balances.length,
        activeBatches: activeBatches.length,
        transitBatches: transitBatches.length,
        department: department || 'all'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch balances'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.balances = false
    }
  }

  async function fetchOperations(department?: StorageDepartment) {
    try {
      state.value.loading.operations = true
      state.value.error = null

      const operations = await storageService.getOperations(department)
      state.value.operations = operations

      DebugUtils.debug(MODULE_NAME, 'Operations fetched', {
        operations: operations.length,
        department: department || 'all'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch operations'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.operations = false
    }
  }

  async function fetchInventories(department?: StorageDepartment) {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      const inventories = await storageService.getInventories(department)
      state.value.inventories = inventories

      DebugUtils.debug(MODULE_NAME, 'Inventories fetched', {
        inventories: inventories.length,
        department: department || 'all'
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch inventories'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  // ===========================
  // CRUD OPERATIONS
  // ===========================

  async function createCorrection(data: CreateCorrectionData): Promise<StorageOperation> {
    try {
      state.value.loading.correction = true
      state.value.error = null

      const operation = await storageService.createCorrection(data)
      state.value.operations.unshift(operation)
      await fetchBalances(data.department)

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create correction'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.correction = false
    }
  }

  async function createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      state.value.loading.correction = true
      state.value.error = null

      const operation = await storageService.createReceipt(data)
      state.value.operations.unshift(operation)
      await fetchBalances(data.department)

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create receipt'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.correction = false
    }
  }

  async function createWriteOff(data: CreateWriteOffData): Promise<StorageOperation> {
    try {
      state.value.loading.writeOff = true
      state.value.error = null

      const operation = await storageService.createWriteOff(data)
      state.value.operations.unshift(operation)
      await fetchBalances(data.department)

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create write-off'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.writeOff = false
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async function startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      const inventory = await storageService.startInventory(data)
      state.value.inventories.unshift(inventory)

      return inventory
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start inventory'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  async function updateInventory(
    inventoryId: string,
    items: InventoryItem[]
  ): Promise<InventoryDocument> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      const inventory = await storageService.updateInventory(inventoryId, items)
      const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)

      if (index !== -1) {
        state.value.inventories[index] = inventory
      }

      return inventory
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update inventory'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  async function finalizeInventory(inventoryId: string): Promise<InventoryDocument> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      const inventory = await storageService.finalizeInventory(inventoryId)
      const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)

      if (index !== -1) {
        state.value.inventories[index] = inventory
      }

      await fetchBalances(inventory.department)
      return inventory
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to finalize inventory'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  // ===========================
  // BATCH METHODS
  // ===========================

  /**
   * Create transit batches from order
   */
  async function createTransitBatches(orderData: CreateTransitBatchData[]): Promise<string[]> {
    try {
      state.value.loading.correction = true

      DebugUtils.info(MODULE_NAME, 'Creating transit batches', {
        itemsCount: orderData.length
      })

      // Extract order ID (all items should have same orderId)
      const orderId = orderData[0]?.purchaseOrderId
      if (!orderId) {
        throw new Error('Order ID is required')
      }

      // Delegate to service
      const batches = await transitBatchService.createFromOrder(orderId, orderData)

      // Add to state
      state.value.transitBatches.push(...batches)

      DebugUtils.info(MODULE_NAME, 'Transit batches created', {
        count: batches.length,
        batchIds: batches.map(b => b.id)
      })

      return batches.map(b => b.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create transit batches'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.correction = false
    }
  }

  /**
   * Convert transit batches to active on receipt
   */
  async function convertTransitBatchesToActive(
    orderId: string,
    receivedItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
  ): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Converting transit batches to active', {
        orderId,
        itemsCount: receivedItems.length
      })

      // Delegate to service
      const activeBatches = await transitBatchService.convertToActive(orderId, receivedItems)

      // Remove from transit state
      state.value.transitBatches = state.value.transitBatches.filter(
        b => b.purchaseOrderId !== orderId
      )

      // Add to active state
      state.value.activeBatches.push(...activeBatches)

      DebugUtils.info(MODULE_NAME, 'Transit batches converted successfully', {
        orderId,
        convertedCount: activeBatches.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to convert transit batches', { error })
      throw error
    }
  }

  /**
   * Remove transit batches on order cancellation
   */
  async function removeTransitBatchesOnOrderCancel(orderId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Removing transit batches', { orderId })

      // Delegate to service
      const removedCount = transitBatchService.removeByOrder(orderId)

      // Update state
      state.value.transitBatches = state.value.transitBatches.filter(
        b => b.purchaseOrderId !== orderId
      )

      DebugUtils.info(MODULE_NAME, 'Transit batches removed', {
        orderId,
        removedCount
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove transit batches', { error })
      throw error
    }
  }

  /**
   * Get transit batches by order
   */
  function getTransitBatchesByOrder(orderId: string): StorageBatch[] {
    return transitBatchService.findByOrder(orderId)
  }

  /**
   * Get transit batches for specific item
   */
  function getTransitBatchesForItem(itemId: string, department: StorageDepartment): StorageBatch[] {
    return transitBatchService.findByItem(itemId, department)
  }

  /**
   * Check if transit delivery is overdue
   */
  function isTransitDeliveryOverdue(plannedDate?: string): boolean {
    if (!plannedDate) return false
    return new Date(plannedDate) < new Date()
  }

  /**
   * Check if transit delivery is today
   */
  function isTransitDeliveryToday(plannedDate?: string): boolean {
    if (!plannedDate) return false
    const deliveryDate = new Date(plannedDate)
    const today = new Date()
    return deliveryDate.toDateString() === today.toDateString()
  }

  /**
   * Get transit batch statistics
   */
  function getTransitBatchStatistics() {
    return transitBatchService.getStatistics()
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  function getItemName(itemId: string): string {
    const productsStore = useProductsStore()
    const product = productsStore.products.find(p => p.id === itemId)
    return product?.name || 'Unknown Product'
  }

  async function getItemUnit(itemId: string): Promise<string> {
    try {
      // ✅ ИСПРАВЛЕНО: Используем productsStore
      const product = productsStore.getProductById(itemId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, 'Product not found, using default unit', { itemId })
        return 'piece'
      }

      return product.baseUnit || 'piece'
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to get item unit', { itemId, error })
      return 'piece'
    }
  }

  async function getItemCostPerUnit(itemId: string): Promise<number> {
    try {
      // ✅ ИСПРАВЛЕНО: Используем productsStore
      const product = productsStore.getProductById(itemId)

      if (!product) {
        DebugUtils.warn(MODULE_NAME, 'Product not found, using zero cost', { itemId })
        return 0
      }

      return product.baseCostPerUnit || 0
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to get item cost', { itemId, error })
      return 0
    }
  }

  function getItemBatches(itemId: string, department: StorageDepartment): StorageBatch[] {
    return state.value.activeBatches.filter(
      b => b.itemId === itemId && b.department === department && b.status === 'active'
    )
  }

  function getBatchById(batchId: string): StorageBatch | undefined {
    return (
      state.value.activeBatches.find(b => b.id === batchId) ||
      state.value.transitBatches.find(b => b.id === batchId)
    )
  }

  function getWriteOffStatistics(department?: any, dateFrom?: any, dateTo?: any) {
    return storageService.getWriteOffStatistics(department, dateFrom, dateTo)
  }

  // ===========================
  // FILTER ACTIONS
  // ===========================

  function setDepartmentFilter(department: StorageDepartment | 'all') {
    state.value.filters.department = department
  }

  function setOperationTypeFilter(operationType?: typeof state.value.filters.operationType) {
    state.value.filters.operationType = operationType
  }

  function setSearchFilter(search: string) {
    state.value.filters.search = search
  }

  function toggleExpiredFilter() {
    state.value.filters.showExpired = !state.value.filters.showExpired
  }

  function toggleLowStockFilter() {
    state.value.filters.showBelowMinStock = !state.value.filters.showBelowMinStock
  }

  function toggleNearExpiryFilter() {
    state.value.filters.showNearExpiry = !state.value.filters.showNearExpiry
  }

  function clearFilters() {
    state.value.filters = {
      department: 'all',
      operationType: undefined,
      showExpired: false,
      showBelowMinStock: false,
      showNearExpiry: false,
      search: '',
      dateFrom: undefined,
      dateTo: undefined
    }
  }

  // ===========================
  // UTILITIES
  // ===========================

  function clearError() {
    state.value.error = null
  }

  function getBalance(itemId: string, department: StorageDepartment) {
    return state.value.balances.find(
      b => b.itemId === itemId && b.itemType === 'product' && b.department === department
    )
  }

  function getOperation(operationId: string) {
    return state.value.operations.find(op => op.id === operationId)
  }

  function getInventory(inventoryId: string) {
    return state.value.inventories.find(inv => inv.id === inventoryId)
  }

  // ===========================
  // PINIA STORE RETURN - ТОЧНОЕ СООТВЕТСТВИЕ ОРИГИНАЛЬНОМУ API
  // ===========================

  const productsStore = useProductsStore()

  return {
    // State
    state: state,
    initialized: readonly(initialized),
    isReady: computed(() => initialized.value && !state.value.loading.balances),
    hasData: computed(() => state.value.balances.length > 0),
    allBatches,
    activeBatches,

    // Existing computed
    filteredBalances,
    filteredOperations,
    totalStockValue,
    lowStockItemsCount,
    expiredItemsCount,
    nearExpiryItemsCount,
    departmentBalances,

    // Транзитные computed
    transitBatches: readonly(transitBatches),
    balancesWithTransit: readonly(balancesWithTransit),
    transitMetrics: readonly(transitMetrics),

    // Core actions
    initialize,
    fetchBalances,
    fetchOperations,
    fetchInventories,

    // CRUD operations
    createCorrection,
    createReceipt,
    createWriteOff,

    // Inventory operations
    startInventory,
    updateInventory,
    finalizeInventory,

    // Write-off statistics
    getWriteOffStatistics,

    // Helper methods
    getItemName,
    getItemUnit,
    getItemCostPerUnit,
    getItemBatches,
    getBatchById,

    // ✅ NEW: Transit batch actions
    createTransitBatches,
    convertTransitBatchesToActive,
    removeTransitBatchesOnOrderCancel,
    getTransitBatchesByOrder,
    getTransitBatchesForItem,
    isTransitDeliveryOverdue,
    isTransitDeliveryToday,
    getTransitBatchStatistics,

    // Filter actions
    setDepartmentFilter,
    setOperationTypeFilter,
    setSearchFilter,
    toggleExpiredFilter,
    toggleLowStockFilter,
    toggleNearExpiryFilter,
    clearFilters,

    // Utilities
    clearError,
    getBalance,
    getOperation,
    getInventory,

    // External stores
    productsStore
  }
})

// ===========================
// DEV HELPERS - ТОЛЬКО ССЫЛКИ
// ===========================

if (import.meta.env.DEV) {
  ;(window as any).__STORAGE_STORE__ = { useStorageStore }
  // Убираем всё остальное
}
