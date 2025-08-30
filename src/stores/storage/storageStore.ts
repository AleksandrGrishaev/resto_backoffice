// src/stores/storage/storageStore.ts - ИСПРАВЛЕНО: Добавлен departmentBalances
// Удалена собственная генерация моков, используется единый координатор

import { ref, computed } from 'vue'
import { storageService } from './storageService'
import { useProductsStore } from '@/stores/productsStore'
import { mockDataCoordinator } from '@/stores/shared/mockDataCoordinator'
import { DebugUtils } from '@/utils'

import type {
  StorageState,
  StorageBatch,
  StorageOperation,
  StorageBalance,
  StorageDepartment,
  InventoryDocument,
  CreateReceiptData,
  CreateWriteOffData,
  CreateCorrectionData,
  CreateInventoryData,
  InventoryItem
} from './types'

const MODULE_NAME = 'StorageStore'

// ===========================
// STATE - ИНТЕГРАЦИЯ С КООРДИНАТОРОМ
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
  }
})

// ===========================
// COMPUTED PROPERTIES
// ===========================

const filteredBalances = computed(() => {
  let balances = [...state.value.balances]

  // Фильтр по департаменту
  if (state.value.filters.department !== 'all') {
    balances = balances.filter(b => b.department === state.value.filters.department)
  }

  // Фильтр по поиску
  if (state.value.filters.search) {
    const search = state.value.filters.search.toLowerCase()
    balances = balances.filter(b => b.itemName.toLowerCase().includes(search))
  }

  // Специальные фильтры
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

  // Фильтр по департаменту
  if (state.value.filters.department !== 'all') {
    operations = operations.filter(op => op.department === state.value.filters.department)
  }

  // Фильтр по типу операции
  if (state.value.filters.operationType) {
    operations = operations.filter(op => op.operationType === state.value.filters.operationType)
  }

  // Фильтр по поиску
  if (state.value.filters.search) {
    const search = state.value.filters.search.toLowerCase()
    operations = operations.filter(
      op =>
        op.documentNumber.toLowerCase().includes(search) ||
        op.responsiblePerson.toLowerCase().includes(search) ||
        op.items.some(item => item.itemName.toLowerCase().includes(search))
    )
  }

  // Фильтр по датам
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

// ✅ ДОБАВЛЕНО: Метод departmentBalances
const departmentBalances = (department: StorageDepartment) => {
  return state.value.balances.filter(
    b => b && b.itemType === 'product' && b.department === department
  )
}

// ===========================
// INITIALIZATION - ИСПОЛЬЗУЕТ MockDataCoordinator
// ===========================

async function initialize() {
  try {
    DebugUtils.info(MODULE_NAME, 'Initializing storage store with MockDataCoordinator')

    state.value.loading.balances = true
    state.value.error = null

    const productsStore = useProductsStore()
    if (productsStore.products.length === 0) {
      await productsStore.loadProducts(true)
    }

    // ✅ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Инициализируем service с координатором
    await storageService.initialize()

    // ✅ Загружаем ВСЕ данные включая батчи
    await Promise.all([fetchBalances(), fetchOperations(), fetchInventories()])

    DebugUtils.info(MODULE_NAME, 'Storage store initialized successfully', {
      balances: state.value.balances.length,
      batches: state.value.batches.length,
      operations: state.value.operations.length,
      inventories: state.value.inventories.length,
      unitSystem: 'BASE_UNITS (gram/ml/piece)'
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

// ===========================
// DATA FETCHING - ОБНОВЛЕНО ДЛЯ КООРДИНАТОРА
// ===========================

async function fetchBalances(department?: StorageDepartment) {
  try {
    state.value.loading.balances = true
    state.value.error = null

    // ✅ ИЗМЕНЕНО: Получаем данные через service (который использует координатор)
    const [balances, batches] = await Promise.all([
      storageService.getBalances(department),
      storageService.getBatches(department)
    ])

    state.value.balances = balances
    state.value.batches = batches

    DebugUtils.debug(MODULE_NAME, 'Balances and batches fetched', {
      balances: balances.length,
      batches: batches.length,
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
// CRUD OPERATIONS - БАЗОВЫЕ ЕДИНИЦЫ
// ===========================

async function createCorrection(data: CreateCorrectionData): Promise<StorageOperation> {
  try {
    state.value.loading.correction = true
    state.value.error = null

    DebugUtils.info(MODULE_NAME, 'Creating correction in BASE UNITS', {
      department: data.department,
      items: data.items.length,
      reason: data.correctionDetails.reason
    })

    const operation = await storageService.createCorrection(data)
    state.value.operations.unshift(operation)

    // ✅ Синхронизируем балансы И батчи после операции
    await fetchBalances(data.department)

    DebugUtils.info(MODULE_NAME, 'Correction created successfully', {
      operationId: operation.id,
      unitSystem: 'BASE_UNITS'
    })

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

    DebugUtils.info(MODULE_NAME, 'Creating receipt in BASE UNITS', {
      department: data.department,
      items: data.items.length,
      sourceType: data.sourceType
    })

    const operation = await storageService.createReceipt(data)
    state.value.operations.unshift(operation)

    // ✅ Синхронизируем данные после создания
    await fetchBalances(data.department)

    DebugUtils.info(MODULE_NAME, 'Receipt created successfully', {
      operationId: operation.id,
      unitSystem: 'BASE_UNITS'
    })

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

// ===========================
// WRITE-OFF SUPPORT
// ===========================

async function createWriteOff(data: CreateWriteOffData): Promise<StorageOperation> {
  try {
    state.value.loading.writeOff = true
    state.value.error = null

    DebugUtils.info(MODULE_NAME, 'Creating write-off in BASE UNITS', {
      department: data.department,
      reason: data.reason,
      items: data.items.length
    })

    const operation = await storageService.createWriteOff(data)
    state.value.operations.unshift(operation)

    // ✅ Синхронизируем все данные включая батчи
    await fetchBalances(data.department)

    DebugUtils.info(MODULE_NAME, 'Write-off created successfully', {
      operationId: operation.id,
      reason: data.reason,
      unitSystem: 'BASE_UNITS'
    })

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

function getWriteOffStatistics(department?: any, dateFrom?: any, dateTo?: any) {
  return storageService.getWriteOffStatistics(department, dateFrom, dateTo)
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

    // Обновляем в локальном состоянии
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

    // Обновляем в локальном состоянии
    const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)
    if (index !== -1) {
      state.value.inventories[index] = inventory
    }

    // Обновляем балансы после финализации
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
// HELPER METHODS
// ===========================

function getItemName(itemId: string): string {
  const productsStore = useProductsStore()
  const product = productsStore.products.find(p => p.id === itemId)
  return product?.name || 'Unknown Product'
}

function getItemUnit(itemId: string): string {
  const productDef = mockDataCoordinator.getProductDefinition(itemId)
  return productDef?.baseUnit || 'piece'
}

function getItemCostPerUnit(itemId: string): number {
  const productDef = mockDataCoordinator.getProductDefinition(itemId)
  return productDef?.baseCostPerUnit || 0
}

function getItemBatches(itemId: string, department: StorageDepartment): StorageBatch[] {
  return state.value.batches.filter(
    b => b.itemId === itemId && b.department === department && b.status === 'active'
  )
}

function getBatchById(batchId: string): StorageBatch | undefined {
  return state.value.batches.find(b => b.id === batchId)
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
// COMPOSABLE EXPORT
// ===========================

export function useStorageStore() {
  const productsStore = useProductsStore()

  return {
    // State
    state: state,

    // Computed
    filteredBalances,
    filteredOperations,
    totalStockValue,
    lowStockItemsCount,
    expiredItemsCount,
    nearExpiryItemsCount,

    // ✅ ДОБАВЛЕНО: departmentBalances как функция
    departmentBalances,

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
}

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  ;(window as any).__STORAGE_STORE__ = { state, useStorageStore }
  ;(window as any).__TEST_STORAGE_STORE_INTEGRATION__ = async () => {
    console.log('=== STORAGE STORE INTEGRATION TEST ===')

    try {
      const store = useStorageStore()
      await store.initialize()

      console.log('✅ Store initialized successfully')
      console.log(`📦 Balances: ${store.state.value.balances.length}`)
      console.log(`🏷️ Batches: ${store.state.value.batches.length}`)
      console.log(`📋 Operations: ${store.state.value.operations.length}`)
      console.log(`📊 Inventories: ${store.state.value.inventories.length}`)

      // Тестируем несколько балансов
      store.state.value.balances.slice(0, 3).forEach(balance => {
        const productDef = mockDataCoordinator.getProductDefinition(balance.itemId)
        console.log(`\n📦 ${balance.itemName} (${balance.department}):`)
        console.log(`   Stock: ${balance.totalQuantity} ${balance.unit}`)
        console.log(`   Expected unit: ${productDef?.baseUnit}`)
        console.log(`   Cost: ${balance.latestCost} IDR/${balance.unit}`)
        console.log(`   ✅ Unit correct: ${balance.unit === productDef?.baseUnit}`)
        console.log(`   ✅ Cost source: baseCostPerUnit`)
      })

      // Проверяем что filteredBalances работает
      console.log('\n=== FILTERED DATA TEST ===')
      console.log(`Filtered balances: ${store.filteredBalances.value.length}`)
      console.log(`Filtered operations: ${store.filteredOperations.value.length}`)
      console.log(`Total stock value: ${store.totalStockValue.value} IDR`)
      console.log(`Low stock items: ${store.lowStockItemsCount.value}`)
      console.log(`Expired items: ${store.expiredItemsCount.value}`)
      console.log(`Near expiry items: ${store.nearExpiryItemsCount.value}`)

      // ✅ ТЕСТИРУЕМ: departmentBalances функцию
      console.log('\n=== DEPARTMENT BALANCES TEST ===')
      const kitchenBalances = store.departmentBalances('kitchen')
      const barBalances = store.departmentBalances('bar')
      console.log(`Kitchen balances: ${kitchenBalances.length}`)
      console.log(`Bar balances: ${barBalances.length}`)

      return {
        balances: store.state.value.balances,
        batches: store.state.value.batches,
        operations: store.state.value.operations,
        statistics: {
          totalValue: store.totalStockValue.value,
          lowStock: store.lowStockItemsCount.value,
          expired: store.expiredItemsCount.value,
          nearExpiry: store.nearExpiryItemsCount.value
        }
      }
    } catch (error) {
      console.error('❌ Storage store integration test failed:', error)
      throw error
    }
  }

  setTimeout(() => {
    console.log('\n🎯 UPDATED Storage Store loaded!')
    console.log('🔧 Now integrated with MockDataCoordinator')
    console.log('📏 All data in BASE UNITS (gram/ml/piece)')
    console.log('🔄 No more duplicate mock data generation')
    console.log('✅ Added departmentBalances function')
    console.log('\nAvailable commands:')
    console.log('• window.__TEST_STORAGE_STORE_INTEGRATION__()')
  }, 100)
}
