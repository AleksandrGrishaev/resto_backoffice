// src/stores/storage/storageStore.ts - КОНВЕРТИРОВАНО В PINIA STORE
// ✅ Полная конвертация с сохранением ВСЕГО API для обратной совместимости

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { storageService } from './storageService'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'
import { transitBatchService } from './transitBatchService'

import type { Department } from '@/stores/productsStore/types' // ✅ ДОБАВЛЕНО
import type {
  CreateTransitBatchData,
  StorageBatch,
  StorageBalance,
  StorageBalanceWithTransit,
  StorageOperation,
  StorageState,
  CreateReceiptData,
  CreateWriteOffData,
  CreateCorrectionData,
  CreateInventoryData,
  InventoryDocument,
  InventoryItem,
  WriteOffStatistics,
  Warehouse // ✅ ДОБАВЛЕНО
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
    // Phase 4: Additional loading states
    initializing: false,
    loadingBalances: false,
    loadingOperations: false,
    creatingOperation: false,
    error: null,

    filters: {
      department: 'all' as Department | 'all',
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
    return (department: Department) => {
      const productsStore = useProductsStore()

      return state.value.balances.filter(balance => {
        const product = productsStore.products.find(p => p.id === balance.itemId)
        if (!product) return false

        return product.usedInDepartments.includes(department)
      })
    }
  })

  // ✅ ПОЛНАЯ ЗАМЕНА balancesWithTransit
  const balancesWithTransit = computed((): StorageBalanceWithTransit[] => {
    const transit = transitBatches.value

    return state.value.balances.map(balance => {
      // ✅ ИСПРАВЛЕНО: фильтруем только по itemId (БЕЗ department)
      const itemTransitBatches = transit.filter(batch => batch.itemId === balance.itemId)

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
    if (initialized.value) {
      DebugUtils.debug(MODULE_NAME, 'Storage store already initialized')
      return
    }

    state.value.initializing = true
    state.value.error = null

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage store...')

      // Initialize service
      await storageService.initialize()

      // Load initial data in parallel
      await Promise.all([loadBalances(), loadRecentOperations()])

      // Load inventories (if migrated to Supabase)
      try {
        const inventories = await storageService.getInventories()
        state.value.inventories = inventories
      } catch (error) {
        DebugUtils.warn(MODULE_NAME, 'Inventory feature not yet migrated, skipping', { error })
        state.value.inventories = []
      }

      // ✅ REMOVED: transitBatchService.load() - data now loaded from Supabase via getTransitBatches()

      initialized.value = true

      DebugUtils.info(MODULE_NAME, '✅ Storage store initialized successfully', {
        balances: state.value.balances.length,
        activeBatches: state.value.activeBatches.length,
        transitBatches: state.value.transitBatches.length,
        operations: state.value.operations.length,
        inventories: state.value.inventories.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize storage store'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, '❌ Storage store initialization failed', { error })
      throw error
    } finally {
      state.value.initializing = false
    }
  }

  /**
   * Phase 4: Load balances with dedicated loading state
   */
  async function loadBalances() {
    state.value.loadingBalances = true
    state.value.error = null

    try {
      const [balances, activeBatches, transitBatches] = await Promise.all([
        storageService.getBalances(),
        storageService.getActiveBatches(),
        storageService.getTransitBatches()
      ])

      state.value.balances = balances
      state.value.activeBatches = activeBatches
      state.value.transitBatches = transitBatches

      DebugUtils.store(MODULE_NAME, 'Balances loaded', {
        balances: balances.length,
        activeBatches: activeBatches.length,
        transitBatches: transitBatches.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load balances'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, '❌ Failed to load balances', { error })
      throw error
    } finally {
      state.value.loadingBalances = false
    }
  }

  async function fetchBalances(_department?: Department) {
    try {
      state.value.loading.balances = true
      state.value.error = null

      const [balances, activeBatches, transitBatches] = await Promise.all([
        storageService.getBalances(), // ✅ Без параметра department
        storageService.getActiveBatches(),
        storageService.getTransitBatches()
      ])

      state.value.balances = balances
      state.value.activeBatches = activeBatches
      state.value.transitBatches = transitBatches

      DebugUtils.debug(MODULE_NAME, 'Balances and batches fetched', {
        balances: balances.length,
        activeBatches: activeBatches.length,
        transitBatches: transitBatches.length,
        department: _department || 'all'
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

  /**
   * Phase 4: Load recent operations (last 30 days) with dedicated loading state
   */
  async function loadRecentOperations() {
    state.value.loadingOperations = true
    state.value.error = null

    try {
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - 30) // Last 30 days

      const operations = await storageService.getOperations()
      state.value.operations = operations

      DebugUtils.store(MODULE_NAME, 'Recent operations loaded', {
        count: operations.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load operations'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, '❌ Failed to load operations', { error })
      throw error
    } finally {
      state.value.loadingOperations = false
    }
  }

  async function fetchOperations(department?: Department) {
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

  async function fetchInventories(department?: Department) {
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
    state.value.creatingOperation = true
    state.value.error = null

    try {
      const response = await storageService.createCorrection(data)

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create correction')
      }

      state.value.operations.unshift(response.data)

      // Reload balances after operation
      await loadBalances()

      DebugUtils.info(MODULE_NAME, '✅ Correction created successfully')
      return response.data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create correction'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, '❌ Failed to create correction', { error })
      throw error
    } finally {
      state.value.creatingOperation = false
    }
  }

  async function createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    state.value.creatingOperation = true
    state.value.error = null

    try {
      const response = await storageService.createReceipt(data)

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create receipt')
      }

      state.value.operations.unshift(response.data)

      // Reload balances after operation
      await loadBalances()

      // ✅ NEW: Auto-reconcile negative batches for each product
      try {
        const { reconciliationService } = await import('./reconciliationService')

        for (const item of data.items) {
          await reconciliationService.autoReconcileOnNewBatch(item.itemId)
        }

        DebugUtils.info(MODULE_NAME, '✅ Negative batch reconciliation completed')

        // ✅ FIX: Refresh batches after reconciliation to update UI
        // This ensures reconciled batches show correct status in UI
        await fetchBalances(data.department)
        DebugUtils.info(MODULE_NAME, '✅ Batches refreshed after reconciliation')
      } catch (reconciliationError) {
        // Log error but don't fail the receipt creation
        DebugUtils.warn(MODULE_NAME, 'Failed to auto-reconcile negative batches', {
          error: reconciliationError
        })
      }

      DebugUtils.info(MODULE_NAME, '✅ Receipt created successfully')
      return response.data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create receipt'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, '❌ Failed to create receipt', { error })
      throw error
    } finally {
      state.value.creatingOperation = false
    }
  }

  async function createWriteOff(data: CreateWriteOffData): Promise<StorageOperation> {
    state.value.creatingOperation = true
    state.value.error = null

    try {
      const response = await storageService.createWriteOff(data)

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to create write-off')
      }

      state.value.operations.unshift(response.data)

      // Reload balances after operation
      await loadBalances()

      // ✅ FIXED: Reload preparation batches if any preparations were written off
      const hasPreparations = data.items.some(item => item.itemType === 'preparation')
      if (hasPreparations) {
        try {
          const { usePreparationStore } = await import('@/stores/preparation/preparationStore')
          const preparationStore = usePreparationStore()
          await preparationStore.fetchBalances(data.department as any)
          DebugUtils.info(MODULE_NAME, '✅ Preparation batches reloaded after write-off')
        } catch (error) {
          DebugUtils.warn(MODULE_NAME, 'Failed to reload preparation batches', { error })
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Write-off created successfully')
      return response.data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create write-off'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, '❌ Failed to create write-off', { error })
      throw error
    } finally {
      state.value.creatingOperation = false
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

      // ✅ ИСПРАВЛЕНО: finalizeInventory возвращает массив corrections, а не inventory
      const correctionOperations = await storageService.finalizeInventory(inventoryId)

      // Получаем обновлённую инвентаризацию из service
      const inventory = await storageService.getInventory(inventoryId)

      if (!inventory) {
        throw new Error(`Inventory ${inventoryId} not found after finalization`)
      }

      const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)

      if (index !== -1) {
        state.value.inventories[index] = inventory
      }

      // Добавляем corrections в operations
      if (correctionOperations.length > 0) {
        state.value.operations.unshift(...correctionOperations)
      }

      // ✅ Обновляем балансы конкретного департамента
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
    receivedItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>,
    actualDeliveryDate?: string
  ): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Converting transit batches to active', {
        orderId,
        itemsCount: receivedItems.length,
        actualDeliveryDate
      })

      // Delegate to service
      const activeBatches = await transitBatchService.convertToActive(
        orderId,
        receivedItems,
        actualDeliveryDate
      )

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
   * Get transit batches by order (synchronous, uses state)
   */
  function getTransitBatchesByOrder(orderId: string): StorageBatch[] {
    return state.value.transitBatches.filter(b => b.purchaseOrderId === orderId)
  }

  /**
   * Get transit batches for specific item (synchronous, uses state)
   */
  function getTransitBatchesForItem(itemId: string): StorageBatch[] {
    return state.value.transitBatches.filter(b => b.itemId === itemId)
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
  async function getTransitBatchStatistics() {
    return await transitBatchService.getStatistics()
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  function getItemName(itemId: string): string {
    const productsStore = useProductsStore()
    const product = productsStore.products.find(p => p.id === itemId)
    return product?.name || 'Unknown Product'
  }

  function getItemUnit(itemId: string): string {
    try {
      const product = productsStore.products.find(p => p.id === itemId)

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

  function getItemCostPerUnit(itemId: string): number {
    try {
      const product = productsStore.products.find(p => p.id === itemId)

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

  // Warehouse

  function getWarehouse(id: string): Warehouse | undefined {
    return storageService.getWarehouse(id)
  }

  function getDefaultWarehouse(): Warehouse {
    return storageService.getDefaultWarehouse()
  }

  function getAllWarehouses(): Warehouse[] {
    return storageService.getAllWarehouses()
  }

  function getItemBatches(itemId: string, department: Department): StorageBatch[] {
    // ✅ ИСПРАВЛЕНО: возвращаем все батчи продукта (БЕЗ фильтра по department)
    return state.value.activeBatches.filter(b => b.itemId === itemId && b.status === 'active')
  }

  function getBatchById(batchId: string): StorageBatch | undefined {
    return (
      state.value.activeBatches.find(b => b.id === batchId) ||
      state.value.transitBatches.find(b => b.id === batchId)
    )
  }

  async function getWriteOffStatistics(
    department?: Department | 'all',
    dateFrom?: string,
    dateTo?: string
  ): Promise<WriteOffStatistics> {
    return storageService.getWriteOffStatistics(department, dateFrom, dateTo)
  }

  // ===========================
  // FILTER ACTIONS
  // ===========================

  function setDepartmentFilter(department: Department | 'all') {
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

  function getOperation(operationId: string) {
    return state.value.operations.find(op => op.id === operationId)
  }

  function getInventory(inventoryId: string) {
    return state.value.inventories.find(inv => inv.id === inventoryId)
  }

  // ===========================
  // PINIA STORE RETURN - ТОЧНОЕ СООТВЕТСТВИЕ ОРИГИНАЛЬНОМУ API
  // ===========================

  // ===========================
  // NEGATIVE INVENTORY METHODS (Sprint 1)
  // ===========================

  /**
   * Update cached last_known_cost for a product
   * Called after batch creation/update to maintain cost cache
   *
   * @param productId - UUID of the product
   */
  async function updateProductLastKnownCost(productId: string): Promise<void> {
    const { negativeBatchService } = await import('./negativeBatchService')

    try {
      const lastBatch = await negativeBatchService.getLastActiveBatch(productId)
      if (lastBatch) {
        const { supabase } = await import('@/supabase')
        const { error } = await supabase
          .from('products')
          .update({ last_known_cost: lastBatch.costPerUnit })
          .eq('id', productId)

        if (error) {
          console.error('❌ Failed to update last_known_cost:', error)
        } else {
          DebugUtils.info(MODULE_NAME, 'Updated last_known_cost', {
            productId,
            cost: lastBatch.costPerUnit
          })
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating last_known_cost', { error, productId })
    }
  }

  /**
   * Check if product allows negative inventory
   * Configurable per product (default: true)
   *
   * @param productId - UUID of the product
   * @returns True if product allows negative inventory
   */
  function canGoNegative(productId: string): boolean {
    const product = productsStore.products.find(p => p.id === productId)
    return product?.allowNegativeInventory ?? true
  }

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

    // ✅ Transit batch actions
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
    // ❌ УДАЛЕНО: getBalance (метода нет в коде)
    getOperation,
    getInventory,

    // ✅ ДОБАВЛЕНО: Warehouse methods
    getWarehouse,
    getDefaultWarehouse,
    getAllWarehouses,

    // ✅ Negative Inventory methods (Sprint 1)
    updateProductLastKnownCost,
    canGoNegative,

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
