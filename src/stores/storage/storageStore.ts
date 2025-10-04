// src/stores/storage/storageStore.ts - КОНВЕРТИРОВАНО В PINIA STORE
// ✅ Полная конвертация с сохранением ВСЕГО API для обратной совместимости

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { storageService } from './storageService'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'
import { convertToBaseUnits } from '@/composables/useMeasurementUnits'

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
    batches: [],
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

  const transitBatches = computed(() => {
    return state.value.batches.filter(batch => batch.status === 'in_transit')
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
    // ===== ЗАЩИТА ОТ ПОВТОРНЫХ ВЫЗОВОВ =====
    if (initialized.value) {
      DebugUtils.debug(MODULE_NAME, 'Storage store already initialized, skipping')
      return
    }

    // ===== ЗАЩИТА ОТ ОДНОВРЕМЕННЫХ ВЫЗОВОВ =====
    if (state.value.loading.balances) {
      DebugUtils.debug(MODULE_NAME, 'Storage store initialization already in progress')
      return
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage store...')

      // Устанавливаем флаг загрузки
      state.value.loading.balances = true
      state.value.error = null

      // Проверяем зависимости - productsStore должен быть загружен
      const productsStore = useProductsStore()
      if (productsStore.products.length === 0) {
        DebugUtils.debug(MODULE_NAME, 'Products store not loaded, loading first...')
        await productsStore.loadProducts(true)
      }

      // Инициализируем сервисный слой
      DebugUtils.debug(MODULE_NAME, 'Initializing storage service...')
      await storageService.initialize()

      // Загружаем данные параллельно
      DebugUtils.debug(MODULE_NAME, 'Loading storage data...')
      await Promise.all([fetchBalances(), fetchOperations(), fetchInventories()])

      // Помечаем как инициализированный
      initialized.value = true

      DebugUtils.info(MODULE_NAME, 'Storage store initialized successfully', {
        balances: state.value.balances.length,
        batches: state.value.batches.length,
        operations: state.value.operations.length,
        inventories: state.value.inventories.length,
        isReady: true
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize storage store'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })

      // НЕ устанавливаем initialized = true при ошибке
      throw error
    } finally {
      // Всегда снимаем флаг загрузки
      state.value.loading.balances = false
    }
  }

  async function fetchBalances(department?: StorageDepartment) {
    try {
      state.value.loading.balances = true
      state.value.error = null

      const [balances, batches] = await Promise.all([
        storageService.getBalances(department),
        storageService.getAllBatches(department)
      ])

      state.value.balances = balances

      // ✅ ИСПРАВЛЕНО: Сохраняем transit batches при обновлении
      const existingTransitBatches = state.value.batches.filter(b => b.status === 'in_transit')

      // ✅ Объединяем новые active batches + существующие transit batches
      const activeBatches = batches.filter(b => b.status === 'active')
      state.value.batches = [...activeBatches, ...existingTransitBatches]

      DebugUtils.debug(MODULE_NAME, 'Balances and batches fetched', {
        balances: balances.length,
        activeBatches: activeBatches.length,
        transitBatches: existingTransitBatches.length,
        totalBatches: state.value.batches.length,
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
  // TRANSIT BATCH OPERATIONS
  // ===========================

  async function createTransitBatches(
    orderData: Array<{
      itemId: string
      quantity: number
      unit: string
      estimatedCostPerUnit: number
      department: StorageDepartment
      purchaseOrderId: string
      supplierId: string
      supplierName: string
      plannedDeliveryDate: string
      notes?: string
    }>
  ): Promise<string[]> {
    try {
      state.value.loading.correction = true
      const batchIds: string[] = []

      DebugUtils.info(MODULE_NAME, 'createTransitBatches called', {
        itemsCount: orderData.length,
        orderId: orderData[0]?.purchaseOrderId,
        items: orderData.map(i => ({
          itemId: i.itemId,
          quantity: i.quantity,
          unit: i.unit,
          purchaseOrderId: i.purchaseOrderId
        }))
      })

      // Защита от дубликатов
      if (orderData.length > 0) {
        const existingBatches = state.value.batches.filter(
          batch =>
            batch.purchaseOrderId === orderData[0].purchaseOrderId && batch.status === 'in_transit'
        )

        DebugUtils.debug(MODULE_NAME, 'Checking for duplicate transit batches', {
          orderId: orderData[0].purchaseOrderId,
          existingCount: existingBatches.length,
          existingBatchIds: existingBatches.map(b => b.id),
          totalBatchesInState: state.value.batches.length
        })

        if (existingBatches.length > 0) {
          DebugUtils.warn(
            MODULE_NAME,
            'Transit batches already exist for order, returning existing',
            {
              orderId: orderData[0].purchaseOrderId,
              existingCount: existingBatches.length
            }
          )
          return existingBatches.map(b => b.id)
        }
      }

      for (const item of orderData) {
        if (!item.itemId || !item.quantity || item.quantity <= 0) {
          DebugUtils.warn(MODULE_NAME, 'Invalid item data for transit batch', { item })
          continue
        }

        // Получаем продукт из productsStore
        const product = productsStore.getProductById(item.itemId)
        if (!product) {
          DebugUtils.warn(MODULE_NAME, 'Product not found for transit batch', {
            itemId: item.itemId
          })
          continue
        }

        // Конвертация в базовые единицы
        let unitType: 'weight' | 'volume' | 'piece' = 'piece'
        if (product.baseUnit === 'gram') unitType = 'weight'
        else if (product.baseUnit === 'ml') unitType = 'volume'

        const conversionResult = convertToBaseUnits(item.quantity, item.unit, unitType)
        const quantityInBaseUnits = conversionResult.success
          ? conversionResult.value!
          : item.quantity
        const baseUnit = conversionResult.success ? conversionResult.baseUnit! : item.unit

        let costPerUnitInBase = item.estimatedCostPerUnit
        if (conversionResult.success && item.unit !== baseUnit) {
          const conversionFactor = item.quantity / quantityInBaseUnits
          costPerUnitInBase = item.estimatedCostPerUnit * conversionFactor
        }

        const batchId = `transit-batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const batchNumber = generateTransitBatchNumber()

        const batch: StorageBatch = {
          id: batchId,
          batchNumber,
          itemId: item.itemId,
          itemType: 'product',
          department: item.department,
          initialQuantity: quantityInBaseUnits,
          currentQuantity: quantityInBaseUnits,
          unit: baseUnit,
          costPerUnit: costPerUnitInBase,
          totalValue: quantityInBaseUnits * costPerUnitInBase,
          receiptDate: item.plannedDeliveryDate,
          sourceType: 'purchase',
          status: 'in_transit',
          isActive: false,
          purchaseOrderId: item.purchaseOrderId,
          supplierId: item.supplierId,
          supplierName: item.supplierName,
          plannedDeliveryDate: item.plannedDeliveryDate,
          notes: item.notes || `Transit batch from order`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        state.value.batches.unshift(batch)
        batchIds.push(batchId)

        DebugUtils.debug(MODULE_NAME, 'Transit batch created and added to state', {
          batchId,
          itemId: item.itemId,
          productName: product.name,
          purchaseOrderId: item.purchaseOrderId,
          quantity: quantityInBaseUnits,
          unit: baseUnit,
          status: batch.status,
          isActive: batch.isActive,
          totalBatchesNow: state.value.batches.length,
          transitBatchesNow: state.value.batches.filter(b => b.status === 'in_transit').length,
          activeBatchesNow: state.value.batches.filter(b => b.status === 'active').length
        })
      }

      DebugUtils.info(MODULE_NAME, 'Transit batches created successfully', {
        totalBatches: batchIds.length,
        orderId: orderData[0]?.purchaseOrderId,
        batchIds,
        finalStateStats: {
          totalBatches: state.value.batches.length,
          transitBatches: state.value.batches.filter(b => b.status === 'in_transit').length,
          activeBatches: state.value.batches.filter(b => b.status === 'active').length
        }
      })

      return batchIds
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create transit batches'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error, orderData })
      throw error
    } finally {
      state.value.loading.correction = false
    }
  }

  async function convertTransitBatchesToActive(
    purchaseOrderId: string,
    receiptItems: Array<{ itemId: string; receivedQuantity: number; actualPrice?: number }>
  ): Promise<void> {
    try {
      state.value.loading.correction = true

      const transitBatches = state.value.batches.filter(
        batch => batch.purchaseOrderId === purchaseOrderId && batch.status === 'in_transit'
      )

      if (transitBatches.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No transit batches found for order', { purchaseOrderId })
        return
      }

      // ✅ КРИТИЧНО: Удаляем из БАЗЫ ДАННЫХ
      for (const transitBatch of transitBatches) {
        try {
          await storageService.deleteBatch(transitBatch.id)

          DebugUtils.debug(MODULE_NAME, 'Transit batch deleted from database', {
            batchId: transitBatch.id,
            itemId: transitBatch.itemId
          })
        } catch (deleteError) {
          DebugUtils.error(MODULE_NAME, 'Failed to delete transit batch from database', {
            batchId: transitBatch.id,
            error: deleteError
          })
        }

        // Удаляем из state (для немедленного обновления UI)
        const index = state.value.batches.indexOf(transitBatch)
        if (index !== -1) {
          state.value.batches.splice(index, 1)
        }
      }

      DebugUtils.info(MODULE_NAME, 'Transit batches removed from database and state', {
        purchaseOrderId,
        removedCount: transitBatches.length,
        totalBatchesAfter: state.value.batches.length,
        transitBatchesAfter: state.value.batches.filter(b => b.status === 'in_transit').length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to convert transit batches', { error })
      throw error
    } finally {
      state.value.loading.correction = false
    }
  }

  async function removeTransitBatchesOnOrderCancel(orderId: string): Promise<void> {
    try {
      const transitBatchesToRemove = state.value.batches.filter(
        batch => batch.purchaseOrderId === orderId && batch.status === 'in_transit'
      )

      if (transitBatchesToRemove.length === 0) return

      state.value.batches = state.value.batches.filter(
        batch => !(batch.purchaseOrderId === orderId && batch.status === 'in_transit')
      )

      DebugUtils.info(MODULE_NAME, 'Transit batches removed successfully', {
        orderId,
        removedCount: transitBatchesToRemove.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove transit batches', { error })
      throw error
    }
  }

  function generateTransitBatchNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '')
    const timeStr =
      date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0')
    const sequence = state.value.batches.filter(b => b.status === 'in_transit').length + 1
    return `TRN-${dateStr}-${timeStr}-${sequence.toString().padStart(3, '0')}`
  }

  function getTransitBatchesByOrder(purchaseOrderId: string): StorageBatch[] {
    return transitBatches.value.filter(batch => batch.purchaseOrderId === purchaseOrderId)
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  function getTransitBatchesForItem(itemId: string, department: StorageDepartment): StorageBatch[] {
    return transitBatches.value.filter(
      batch => batch.itemId === itemId && batch.department === department
    )
  }

  function isTransitDeliveryOverdue(plannedDate?: string): boolean {
    if (!plannedDate) return false
    return new Date(plannedDate) < new Date()
  }

  function isTransitDeliveryToday(plannedDate?: string): boolean {
    if (!plannedDate) return false
    const deliveryDate = new Date(plannedDate)
    const today = new Date()
    return deliveryDate.toDateString() === today.toDateString()
  }

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
    return state.value.batches.filter(
      b => b.itemId === itemId && b.department === department && b.status === 'active'
    )
  }

  function getBatchById(batchId: string): StorageBatch | undefined {
    return state.value.batches.find(b => b.id === batchId)
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

    // Существующие helper-ы для транзита
    getTransitBatchesForItem,
    isTransitDeliveryOverdue,
    isTransitDeliveryToday,

    // Новые методы для транзита
    createTransitBatches,
    convertTransitBatchesToActive,
    removeTransitBatchesOnOrderCancel,
    generateTransitBatchNumber,
    getTransitBatchesByOrder,

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
