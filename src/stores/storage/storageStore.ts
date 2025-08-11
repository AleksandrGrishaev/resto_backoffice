// src/stores/storage/storageStore.ts - SIMPLIFIED (without write-offs)
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { storageService } from './storageService'
import { useProductsStore } from '@/stores/productsStore'
import type {
  StorageState,
  StorageOperation,
  StorageBalance,
  InventoryDocument,
  InventoryItem,
  StorageDepartment,
  CreateReceiptData,
  CreateCorrectionData,
  CreateInventoryData
} from './types'

const MODULE_NAME = 'StorageStore'

export const useStorageStore = defineStore('storage', () => {
  // State (simplified - removed write-off loading and filters)
  const state = ref<StorageState>({
    batches: [],
    operations: [],
    balances: [],
    inventories: [],
    loading: {
      balances: false,
      operations: false,
      inventory: false,
      writeOff: false, // Keep for compatibility but won't be used here
      correction: false
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
      expiryWarningDays: 3,
      lowStockMultiplier: 1.2,
      autoCalculateBalance: true,
      enableQuickWriteOff: true
    }
  })

  // ✅ Dependencies
  const productsStore = useProductsStore()

  // ===========================
  // COMPUTED PROPERTIES (GETTERS)
  // ===========================

  const filteredBalances = computed(() => {
    try {
      let balances = [...state.value.balances]
      const filters = state.value.filters

      if (filters.department !== 'all') {
        balances = balances.filter(b => b.department === filters.department)
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        balances = balances.filter(b => b.itemName.toLowerCase().includes(searchLower))
      }

      if (filters.showExpired) {
        balances = balances.filter(b => b.hasExpired)
      }
      if (filters.showBelowMinStock) {
        balances = balances.filter(b => b.belowMinStock)
      }
      if (filters.showNearExpiry) {
        balances = balances.filter(b => b.hasNearExpiry)
      }

      return balances
    } catch (error) {
      console.warn('Error filtering product balances:', error)
      return []
    }
  })

  const filteredOperations = computed(() => {
    try {
      let operations = [...state.value.operations]
      const filters = state.value.filters

      if (filters.department !== 'all') {
        operations = operations.filter(op => op.department === filters.department)
      }

      if (filters.operationType) {
        operations = operations.filter(op => op.operationType === filters.operationType)
      }

      return operations
    } catch (error) {
      console.warn('Error filtering operations:', error)
      return []
    }
  })

  const departmentBalances = computed(() => {
    return (department: StorageDepartment) =>
      state.value.balances.filter(b => b.department === department)
  })

  const totalInventoryValue = computed(() => {
    return (department?: StorageDepartment) => {
      let balances = state.value.balances
      if (department && department !== 'all') {
        balances = balances.filter(b => b.department === department)
      }
      return balances.reduce((sum, b) => sum + b.totalValue, 0)
    }
  })

  const alertCounts = computed(() => {
    return {
      expiring: state.value.balances.filter(b => b.hasNearExpiry).length,
      expired: state.value.balances.filter(b => b.hasExpired).length,
      lowStock: state.value.balances.filter(b => b.belowMinStock).length
    }
  })

  // ===========================
  // CORE STORAGE ACTIONS
  // ===========================

  async function fetchBalances(department?: StorageDepartment) {
    try {
      state.value.loading.balances = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching product balances', { department })

      const balances = await storageService.getBalances(department)
      state.value.balances = balances

      DebugUtils.info(MODULE_NAME, 'Product balances loaded', {
        count: balances.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch product balances'
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

      DebugUtils.info(MODULE_NAME, 'Fetching storage operations', { department })

      const operations = await storageService.getOperations(department)
      state.value.operations = operations

      DebugUtils.info(MODULE_NAME, 'Storage operations loaded', {
        count: operations.length
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

      DebugUtils.info(MODULE_NAME, 'Fetching product inventories', { department })

      const inventories = await storageService.getInventories(department)
      state.value.inventories = inventories

      DebugUtils.info(MODULE_NAME, 'Product inventories loaded', {
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
  // ✅ CORE OPERATIONS (without write-offs)
  // ===========================

  async function createCorrection(data: CreateCorrectionData): Promise<StorageOperation> {
    try {
      state.value.loading.correction = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating product correction operation', { data })

      const operation = await storageService.createCorrection(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Product correction operation created', {
        operationId: operation.id
      })

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product correction'
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

      DebugUtils.info(MODULE_NAME, 'Creating product receipt operation', { data })

      const operation = await storageService.createReceipt(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Product receipt operation created', {
        operationId: operation.id
      })

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create product receipt'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.correction = false
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async function startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Starting product inventory', { data })

      const inventory = await storageService.startInventory(data)

      // Update local state
      state.value.inventories.unshift(inventory)

      DebugUtils.info(MODULE_NAME, 'Product inventory started', {
        inventoryId: inventory.id
      })

      return inventory
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start product inventory'
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

      DebugUtils.info(MODULE_NAME, 'Updating product inventory', { inventoryId })

      const inventory = await storageService.updateInventory(inventoryId, items)

      // Update local state
      const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)
      if (index !== -1) {
        state.value.inventories[index] = inventory
      }

      DebugUtils.info(MODULE_NAME, 'Product inventory updated', { inventoryId })

      return inventory
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update product inventory'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  async function finalizeInventory(inventoryId: string): Promise<void> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Finalizing product inventory', { inventoryId })

      const correctionOperations = await storageService.finalizeInventory(inventoryId)

      // Update local state
      const inventoryIndex = state.value.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex !== -1) {
        state.value.inventories[inventoryIndex].status = 'confirmed'
      }

      // Add correction operations to operations list
      correctionOperations.forEach(op => {
        state.value.operations.unshift(op)
      })

      DebugUtils.info(MODULE_NAME, 'Product inventory finalized', {
        inventoryId,
        correctionOperations: correctionOperations.length
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to finalize product inventory'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  // ===========================
  // ✅ WRITE-OFF SUPPORT (delegated to useWriteOff)
  // ===========================

  /**
   * Create write-off operation - delegated to useWriteOff composable
   * This method is here for compatibility and to update the store state
   */
  async function createWriteOff(data: any): Promise<StorageOperation> {
    try {
      // This is called by useWriteOff composable
      const operation = await storageService.createWriteOff(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      return operation
    } catch (error) {
      throw error
    }
  }

  function getWriteOffStatistics(department?: any, dateFrom?: any, dateTo?: any) {
    return storageService.getWriteOffStatistics(department, dateFrom, dateTo)
  }

  // ===========================
  // FIFO CALCULATIONS
  // ===========================

  function calculateFifoAllocation(
    itemId: string,
    department: StorageDepartment,
    quantity: number
  ) {
    try {
      return storageService.calculateFifoAllocation(itemId, department, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', { error })
      throw error
    }
  }

  function calculateCorrectionCost(
    itemId: string,
    department: StorageDepartment,
    quantity: number
  ): number {
    try {
      return storageService.calculateCorrectionCost(itemId, department, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate correction cost', { error })
      throw error
    }
  }

  // ===========================
  // ALERT HELPERS
  // ===========================

  function getExpiringItems(days: number = 3): StorageBalance[] {
    try {
      return storageService.getExpiringItems(days)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expiring products', { error })
      return []
    }
  }

  function getLowStockItems(): StorageBalance[] {
    try {
      return storageService.getLowStockItems()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock products', { error })
      return []
    }
  }

  // ===========================
  // DATA HELPERS
  // ===========================

  function getAvailableProducts(department: StorageDepartment): any[] {
    try {
      if (department === 'kitchen') {
        return productsStore.rawProducts.filter(p => p.isActive)
      } else if (department === 'bar') {
        return productsStore.sellableProducts.filter(
          p => p.isActive && ['beverages'].includes(p.category)
        )
      }
      return productsStore.activeProducts
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available products', { error })
      return []
    }
  }

  function getItemName(itemId: string): string {
    try {
      const product = productsStore.products.find(p => p.id === itemId)
      return product?.name || itemId
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get product name', { error, itemId })
      return itemId
    }
  }

  function getItemUnit(itemId: string): string {
    try {
      const product = productsStore.products.find(p => p.id === itemId)
      return product?.unit || 'kg'
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get product unit', { error, itemId })
      return 'kg'
    }
  }

  function getItemCostPerUnit(itemId: string): number {
    try {
      const product = productsStore.products.find(p => p.id === itemId)
      return product?.costPerUnit || 0
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get product cost', { error, itemId })
      return 0
    }
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
  // INITIALIZATION
  // ===========================

  async function initialize() {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing product storage store')

      state.value.loading.balances = true
      state.value.error = null

      // Load products store if not loaded
      if (productsStore.products.length === 0) {
        DebugUtils.info(MODULE_NAME, 'Loading products store')
        await productsStore.loadProducts(true) // mock mode
      }

      // Initialize storage service
      await storageService.initialize()

      // Load storage data
      await Promise.all([fetchBalances(), fetchOperations(), fetchInventories()])

      DebugUtils.info(MODULE_NAME, 'Product storage store initialized successfully')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize product storage store'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.balances = false
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
  // STATISTICS
  // ===========================

  const statistics = computed(() => {
    const allBalances = state.value.balances
    const kitchenBalances = allBalances.filter(b => b.department === 'kitchen')
    const barBalances = allBalances.filter(b => b.department === 'bar')

    return {
      totalProducts: allBalances.length,
      totalValue: allBalances.reduce((sum, b) => sum + b.totalValue, 0),

      kitchen: {
        products: kitchenBalances.length,
        value: kitchenBalances.reduce((sum, b) => sum + b.totalValue, 0)
      },

      bar: {
        products: barBalances.length,
        value: barBalances.reduce((sum, b) => sum + b.totalValue, 0)
      },

      alerts: {
        expiring: allBalances.filter(b => b.hasNearExpiry).length,
        expired: allBalances.filter(b => b.hasExpired).length,
        lowStock: allBalances.filter(b => b.belowMinStock).length
      },

      recentOperations: state.value.operations.slice(0, 10),
      recentInventories: state.value.inventories.slice(0, 5)
    }
  })

  // ===========================
  // RETURN PUBLIC API
  // ===========================

  return {
    // State
    state,

    // Getters
    filteredBalances,
    filteredOperations,
    departmentBalances,
    totalInventoryValue,
    alertCounts,
    statistics,

    // Core Actions
    fetchBalances,
    fetchOperations,
    fetchInventories,

    // Operations (simplified - write-offs delegated to useWriteOff)
    createCorrection,
    createReceipt,

    // ✅ Write-off support (for useWriteOff composable)
    createWriteOff,
    getWriteOffStatistics,

    // Inventory
    startInventory,
    updateInventory,
    finalizeInventory,

    // FIFO calculations
    calculateFifoAllocation,
    calculateCorrectionCost,

    // Alerts
    getExpiringItems,
    getLowStockItems,

    // Data helpers
    getAvailableProducts,
    getItemName,
    getItemUnit,
    getItemCostPerUnit,

    // Filters
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

    // Initialize
    initialize
  }
})
