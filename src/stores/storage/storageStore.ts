// src/stores/storage/storageStore.ts - FIXED: Clean implementation without circular dependencies
import { ref, computed, readonly } from 'vue'
import { storageService } from './storageService'
import { mockDataCoordinator } from '@/stores/shared/mockDataCoordinator'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'
import type {
  StorageState,
  StorageDepartment,
  StorageBalance,
  StorageOperation,
  InventoryDocument,
  CreateReceiptData,
  CreateCorrectionData,
  CreateWriteOffData,
  CreateInventoryData,
  StorageBatch,
  OperationType
} from './types'

const MODULE_NAME = 'StorageStore'

// ===========================
// STATE MANAGEMENT
// ===========================

const state = ref<StorageState>({
  // Data
  balances: [],
  operations: [],
  batches: [],
  inventories: [],

  // Loading states
  loading: {
    balances: false,
    operations: false,
    inventory: false,
    correction: false,
    writeOff: false,
    plannedDeliveries: false
  },

  // UI State
  filters: {
    department: 'all',
    operationType: undefined,
    search: '',
    showExpired: false,
    showLowStock: false,
    showNearExpiry: false
  },

  // Error state
  error: null,

  // Last update timestamp
  lastUpdated: null
})

// ===========================
// COMPUTED PROPERTIES
// ===========================

const filteredBalances = computed(() => {
  let balances = [...state.value.balances]

  // Department filter
  if (state.value.filters.department && state.value.filters.department !== 'all') {
    balances = balances.filter(b => b.department === state.value.filters.department)
  }

  // Search filter
  if (state.value.filters.search) {
    const search = state.value.filters.search.toLowerCase()
    balances = balances.filter(b => b.itemName.toLowerCase().includes(search))
  }

  // Status filters
  if (state.value.filters.showExpired) {
    balances = balances.filter(b => b.hasExpired)
  }

  if (state.value.filters.showLowStock) {
    balances = balances.filter(b => b.belowMinStock)
  }

  if (state.value.filters.showNearExpiry) {
    balances = balances.filter(b => b.hasNearExpiry)
  }

  return balances
})

const filteredOperations = computed(() => {
  let operations = [...state.value.operations]

  // Department filter
  if (state.value.filters.department && state.value.filters.department !== 'all') {
    operations = operations.filter(op => op.department === state.value.filters.department)
  }

  // Operation type filter
  if (state.value.filters.operationType) {
    operations = operations.filter(op => op.operationType === state.value.filters.operationType)
  }

  return operations
})

const totalStockValue = computed(() => {
  return filteredBalances.value.reduce((total, balance) => total + balance.totalValue, 0)
})

const lowStockItemsCount = computed(() => {
  return state.value.balances.filter(b => b.belowMinStock).length
})

const expiredItemsCount = computed(() => {
  return state.value.balances.filter(b => b.hasExpired).length
})

const nearExpiryItemsCount = computed(() => {
  return state.value.balances.filter(b => b.hasNearExpiry).length
})

// Active batches
const activeBatches = computed(() => {
  return state.value.batches.filter(batch => batch.status === 'active' && batch.isActive === true)
})

// Transit batches
const transitBatches = computed(() => {
  return state.value.batches.filter(batch => batch.status === 'in_transit')
})

// Transit metrics
const transitMetrics = computed(() => {
  const batches = transitBatches.value
  return {
    totalBatches: batches.length,
    totalQuantity: batches.reduce((sum, batch) => sum + batch.currentQuantity, 0),
    totalValue: batches.reduce((sum, batch) => sum + batch.totalValue, 0),
    departments: [...new Set(batches.map(b => b.department))],
    nearestDelivery: batches
      .map(b => b.plannedDeliveryDate)
      .filter(date => date)
      .sort()[0]
  }
})

// Balances with transit support
const balancesWithTransit = computed(() => {
  const transitBatchesValue = transitBatches.value

  return state.value.balances.map(balance => {
    const transitItems = transitBatchesValue.filter(
      batch => batch.itemId === balance.itemId && batch.department === balance.department
    )

    const transitQuantity = transitItems.reduce((sum, batch) => sum + batch.currentQuantity, 0)
    const transitValue = transitItems.reduce((sum, batch) => sum + batch.totalValue, 0)

    return {
      ...balance,
      transitQuantity,
      transitValue,
      totalWithTransit: balance.totalQuantity + transitQuantity,
      nearestDelivery: transitItems
        .map(b => b.plannedDeliveryDate)
        .filter(date => date)
        .sort()[0]
    }
  })
})

// Department balances function
const departmentBalances = (department: StorageDepartment | 'all') => {
  return computed(() => {
    if (department === 'all') return state.value.balances
    return state.value.balances.filter(b => b.department === department)
  })
}

// ===========================
// CORE ACTIONS
// ===========================

async function initialize(): Promise<void> {
  try {
    state.value.error = null

    DebugUtils.info(MODULE_NAME, 'Initializing storage store with BASE UNITS support...')

    if (!mockDataCoordinator) {
      throw new Error('MockDataCoordinator not available')
    }

    // Load data from coordinator
    const storageData = mockDataCoordinator.getStorageStoreData()

    if (!storageData) {
      throw new Error('No storage data returned from coordinator')
    }

    // Set initial state
    state.value.balances = [...storageData.balances]
    state.value.operations = [...storageData.operations]
    state.value.batches = [...storageData.batches]
    state.value.inventories = []
    state.value.lastUpdated = new Date().toISOString()

    DebugUtils.info(MODULE_NAME, 'Storage store initialized successfully', {
      balances: state.value.balances.length,
      operations: state.value.operations.length,
      batches: state.value.batches.length,
      transitBatches: state.value.batches.filter(b => b.status === 'in_transit').length,
      unitSystem: 'BASE_UNITS'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize storage store'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  }
}

// ===========================
// DATA FETCHING
// ===========================

async function fetchBalances(department?: StorageDepartment): Promise<void> {
  try {
    state.value.loading.balances = true
    state.value.error = null

    const balances = await storageService.getBalances(department)
    state.value.balances = balances
    state.value.lastUpdated = new Date().toISOString()

    DebugUtils.info(MODULE_NAME, 'Balances fetched successfully', {
      count: balances.length,
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

async function fetchOperations(department?: StorageDepartment): Promise<void> {
  try {
    state.value.loading.operations = true
    state.value.error = null

    const operations = await storageService.getOperations(department)
    state.value.operations = operations

    DebugUtils.info(MODULE_NAME, 'Operations fetched successfully', {
      count: operations.length,
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

async function fetchInventories(): Promise<void> {
  try {
    state.value.loading.inventory = true
    state.value.error = null

    // Implementation will be added when inventory system is ready
    const inventories: InventoryDocument[] = []
    state.value.inventories = inventories

    DebugUtils.info(MODULE_NAME, 'Inventories fetched successfully', {
      count: inventories.length
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

    DebugUtils.info(MODULE_NAME, 'Creating correction in BASE UNITS', {
      department: data.department,
      reason: data.correctionDetails.reason,
      items: data.items.length
    })

    const operation = await storageService.createCorrection(data)
    state.value.operations.unshift(operation)

    // Sync data after creation
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

    // Sync data after creation
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

    // Sync all data including batches
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
  updates: Partial<InventoryDocument>
): Promise<void> {
  try {
    const inventory = state.value.inventories.find(inv => inv.id === inventoryId)
    if (!inventory) {
      throw new Error(`Inventory with ID ${inventoryId} not found`)
    }

    Object.assign(inventory, updates, {
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update inventory'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  }
}

async function finalizeInventory(inventoryId: string): Promise<void> {
  try {
    state.value.loading.inventory = true
    state.value.error = null

    const inventory = state.value.inventories.find(inv => inv.id === inventoryId)
    if (!inventory) {
      throw new Error(`Inventory with ID ${inventoryId} not found`)
    }

    // Implement finalization logic
    inventory.status = 'confirmed'
    inventory.updatedAt = new Date().toISOString()

    // Refresh data after finalization
    await fetchBalances()
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

async function createTransitBatches(orderData: any[]): Promise<void> {
  try {
    state.value.loading.plannedDeliveries = true
    state.value.error = null

    DebugUtils.info(MODULE_NAME, 'Creating transit batches', { orderCount: orderData.length })

    for (const order of orderData) {
      for (const item of order.items) {
        const transitBatch: StorageBatch = {
          id: `transit_${order.orderId}_${item.itemId}_${Date.now()}`,
          itemId: item.itemId,
          department: order.department,
          status: 'in_transit',
          isActive: false,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unitCost: item.unitCost,
          totalValue: item.quantity * item.unitCost,
          expirationDate: item.expirationDate,
          plannedDeliveryDate: order.plannedDeliveryDate,
          orderId: order.orderId,
          supplierName: order.supplierName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        state.value.batches.push(transitBatch)
      }
    }

    DebugUtils.info(MODULE_NAME, 'Transit batches created successfully')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create transit batches'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  } finally {
    state.value.loading.plannedDeliveries = false
  }
}

async function convertTransitBatchesToActive(orderId: string, items: any[]): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, 'Converting transit batches to active', { orderId })

    const transitBatches = state.value.batches.filter(
      b => b.status === 'in_transit' && b.orderId === orderId
    )

    for (const batch of transitBatches) {
      const itemData = items.find(item => item.itemId === batch.itemId)
      if (itemData) {
        batch.status = 'active'
        batch.isActive = true
        batch.currentQuantity = itemData.receivedQuantity || batch.currentQuantity
        batch.updatedAt = new Date().toISOString()
      }
    }

    // Refresh balances after conversion
    await fetchBalances()

    DebugUtils.info(MODULE_NAME, 'Transit batches converted successfully')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to convert transit batches'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
  }
}

async function removeTransitBatchesOnOrderCancel(orderId: string): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, 'Removing transit batches for cancelled order', { orderId })

    state.value.batches = state.value.batches.filter(
      b => !(b.status === 'in_transit' && b.orderId === orderId)
    )

    DebugUtils.info(MODULE_NAME, 'Transit batches removed successfully')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove transit batches'
    state.value.error = message
    DebugUtils.error(MODULE_NAME, message, { error })
    throw error
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

function setOperationTypeFilter(operationType?: OperationType) {
  state.value.filters.operationType = operationType
}

function setSearchFilter(search: string) {
  state.value.filters.search = search
}

function toggleExpiredFilter() {
  state.value.filters.showExpired = !state.value.filters.showExpired
}

function toggleLowStockFilter() {
  state.value.filters.showLowStock = !state.value.filters.showLowStock
}

function toggleNearExpiryFilter() {
  state.value.filters.showNearExpiry = !state.value.filters.showNearExpiry
}

function clearFilters() {
  state.value.filters = {
    department: 'all',
    operationType: undefined,
    search: '',
    showExpired: false,
    showLowStock: false,
    showNearExpiry: false
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
    state: readonly(state),

    // Computed
    filteredBalances,
    filteredOperations,
    totalStockValue,
    lowStockItemsCount,
    expiredItemsCount,
    nearExpiryItemsCount,
    balancesWithTransit,

    // Transit functionality
    transitBatches: readonly(transitBatches),
    transitMetrics: readonly(transitMetrics),

    // Department balances function
    departmentBalances,

    // Basic batch operations
    activeBatches: readonly(activeBatches),
    getBatchById,

    // Core actions
    initialize,

    // Data fetching
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

    // Transit operations
    createTransitBatches,
    convertTransitBatchesToActive,
    removeTransitBatchesOnOrderCancel,

    // Write-off statistics
    getWriteOffStatistics,

    // Helper methods
    getItemName,
    getItemUnit,
    getItemCostPerUnit,
    getItemBatches,

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
      console.log(`📦 Balances: ${store.state.balances.length}`)
      console.log(`🏷️ Batches: ${store.state.batches.length}`)
      console.log(`📋 Operations: ${store.state.operations.length}`)
      console.log(`📊 Inventories: ${store.state.inventories.length}`)

      // Test balances
      store.state.balances.slice(0, 3).forEach(balance => {
        const productDef = mockDataCoordinator.getProductDefinition(balance.itemId)
        console.log(`\n📦 ${balance.itemName} (${balance.department}):`)
        console.log(`   Stock: ${balance.totalQuantity} ${balance.unit}`)
        console.log(`   Value: ${balance.totalValue} руб`)
      })

      // Test transit functionality
      console.log('\n🚛 Transit functionality test:')
      console.log(`   Transit batches: ${store.transitBatches.length}`)
      console.log(`   Transit metrics:`, store.transitMetrics)

      // Test balancesWithTransit
      const balancesWithTransit = store.balancesWithTransit
      console.log(`   Balances with transit info: ${balancesWithTransit.length}`)

      const itemsWithTransit = balancesWithTransit.filter(b => b.transitQuantity > 0)
      console.log(`   Items with transit stock: ${itemsWithTransit.length}`)
      itemsWithTransit.forEach(item => {
        console.log(
          `     ${item.itemName}: ${item.totalQuantity} + ${item.transitQuantity} = ${item.totalWithTransit}`
        )
      })
    } catch (error) {
      console.error('❌ Storage store integration test failed:', error)
    }
  }
}
