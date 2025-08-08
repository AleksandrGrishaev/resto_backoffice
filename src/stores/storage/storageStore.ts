// src/stores/storage/storageStore.ts - ТОЛЬКО RECEIPT, CORRECTION И INVENTORY
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { storageService } from './storageService'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import type {
  StorageState,
  StorageOperation,
  StorageBalance,
  InventoryDocument,
  InventoryItem,
  StorageDepartment,
  StorageItemType,
  CreateReceiptData,
  CreateCorrectionData, // ✅ НОВОЕ
  CreateInventoryData
} from './types'

const MODULE_NAME = 'StorageStore'

export const useStorageStore = defineStore('storage', () => {
  // State
  const state = ref<StorageState>({
    batches: [],
    operations: [],
    balances: [],
    inventories: [],
    loading: {
      balances: false,
      operations: false,
      inventory: false,
      correction: false // ✅ ИЗМЕНЕНО
    },
    error: null,
    filters: {
      department: 'all',
      itemType: 'all',
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
      autoCalculateBalance: true
    }
  })

  // ✅ Получение связанных stores
  const productsStore = useProductsStore()
  const recipesStore = useRecipesStore()

  // ===========================
  // COMPUTED PROPERTIES (GETTERS)
  // ===========================

  const filteredBalances = computed(() => {
    try {
      let balances = [...state.value.balances]
      const filters = state.value.filters

      // Department filter
      if (filters.department !== 'all') {
        balances = balances.filter(b => b.department === filters.department)
      }

      // Item type filter
      if (filters.itemType !== 'all') {
        balances = balances.filter(b => b.itemType === filters.itemType)
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        balances = balances.filter(b => b.itemName.toLowerCase().includes(searchLower))
      }

      // Status filters
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
      console.warn('Error filtering balances:', error)
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

  const quickProducts = computed(() => {
    return (department: StorageDepartment) => {
      try {
        return storageService.getQuickProducts(department)
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to get quick products', { error })
        return []
      }
    }
  })

  const quickPreparations = computed(() => {
    return (department: StorageDepartment) => {
      try {
        return storageService.getQuickPreparations(department)
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to get quick preparations', { error })
        return []
      }
    }
  })

  // ===========================
  // CORE STORAGE ACTIONS
  // ===========================

  async function fetchBalances(department?: StorageDepartment) {
    try {
      state.value.loading.balances = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching storage balances', { department })

      const balances = await storageService.getBalances(department)
      state.value.balances = balances

      DebugUtils.info(MODULE_NAME, 'Storage balances loaded', {
        count: balances.length
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

      DebugUtils.info(MODULE_NAME, 'Fetching inventories', { department })

      const inventories = await storageService.getInventories(department)
      state.value.inventories = inventories

      DebugUtils.info(MODULE_NAME, 'Inventories loaded', {
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
  // CORRECTION OPERATIONS (замена consumption)
  // ===========================

  async function createCorrection(data: CreateCorrectionData): Promise<StorageOperation> {
    try {
      state.value.loading.correction = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating correction operation', { data })

      const operation = await storageService.createCorrection(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Correction operation created', {
        operationId: operation.id
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

  // ===========================
  // RECEIPT OPERATIONS
  // ===========================

  async function createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      state.value.loading.correction = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating receipt operation', { data })

      const operation = await storageService.createReceipt(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Receipt operation created', {
        operationId: operation.id
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
  // INVENTORY OPERATIONS
  // ===========================

  async function startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Starting inventory', { data })

      const inventory = await storageService.startInventory(data)

      // Update local state
      state.value.inventories.unshift(inventory)

      DebugUtils.info(MODULE_NAME, 'Inventory started', {
        inventoryId: inventory.id
      })

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

      DebugUtils.info(MODULE_NAME, 'Updating inventory', { inventoryId })

      const inventory = await storageService.updateInventory(inventoryId, items)

      // Update local state
      const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)
      if (index !== -1) {
        state.value.inventories[index] = inventory
      }

      DebugUtils.info(MODULE_NAME, 'Inventory updated', { inventoryId })

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

  async function finalizeInventory(inventoryId: string): Promise<void> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Finalizing inventory', { inventoryId })

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

      DebugUtils.info(MODULE_NAME, 'Inventory finalized', {
        inventoryId,
        correctionOperations: correctionOperations.length
      })
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
  // FIFO CALCULATIONS
  // ===========================

  function calculateFifoAllocation(
    itemId: string,
    itemType: StorageItemType,
    department: StorageDepartment,
    quantity: number
  ) {
    try {
      return storageService.calculateFifoAllocation(itemId, itemType, department, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', { error })
      throw error
    }
  }

  function calculateCorrectionCost(
    itemId: string,
    itemType: StorageItemType,
    department: StorageDepartment,
    quantity: number
  ): number {
    try {
      return storageService.calculateCorrectionCost(itemId, itemType, department, quantity)
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
      DebugUtils.error(MODULE_NAME, 'Failed to get expiring items', { error })
      return []
    }
  }

  function getLowStockItems(): StorageBalance[] {
    try {
      return storageService.getLowStockItems()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock items', { error })
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

  function getAvailablePreparations(): any[] {
    try {
      return recipesStore.activePreparations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available preparations', { error })
      return []
    }
  }

  function getItemName(itemId: string, itemType: StorageItemType): string {
    try {
      if (itemType === 'product') {
        const product = productsStore.products.find(p => p.id === itemId)
        return product?.name || itemId
      } else {
        const preparation = recipesStore.preparations.find(p => p.id === itemId)
        return preparation?.name || itemId
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get item name', { error, itemId })
      return itemId
    }
  }

  function getItemUnit(itemId: string, itemType: StorageItemType): string {
    try {
      if (itemType === 'product') {
        const product = productsStore.products.find(p => p.id === itemId)
        return product?.unit || 'kg'
      } else {
        const preparation = recipesStore.preparations.find(p => p.id === itemId)
        return preparation?.outputUnit || 'gram'
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get item unit', { error, itemId })
      return 'kg'
    }
  }

  function getItemCostPerUnit(itemId: string, itemType: StorageItemType): number {
    try {
      if (itemType === 'product') {
        const product = productsStore.products.find(p => p.id === itemId)
        return product?.costPerUnit || 0
      } else {
        const preparation = recipesStore.preparations.find(p => p.id === itemId)
        return preparation?.costPerPortion || 0
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get item cost', { error, itemId })
      return 0
    }
  }

  // ===========================
  // FILTER ACTIONS
  // ===========================

  function setDepartmentFilter(department: StorageDepartment | 'all') {
    state.value.filters.department = department
  }

  function setItemTypeFilter(itemType: StorageItemType | 'all') {
    state.value.filters.itemType = itemType
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
      itemType: 'all',
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
      DebugUtils.info(MODULE_NAME, 'Initializing storage store')

      state.value.loading.balances = true
      state.value.error = null

      // Загружаем зависимые stores если они не загружены
      if (productsStore.products.length === 0) {
        DebugUtils.info(MODULE_NAME, 'Loading products store')
        await productsStore.loadProducts(true) // mock mode
      }

      if (recipesStore.preparations.length === 0) {
        DebugUtils.info(MODULE_NAME, 'Loading recipes store')
        await recipesStore.fetchPreparations()
      }

      // Инициализируем storage service
      await storageService.initialize()

      // Загружаем данные склада
      await Promise.all([fetchBalances(), fetchOperations(), fetchInventories()])

      DebugUtils.info(MODULE_NAME, 'Storage store initialized successfully')
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
  // UTILITIES
  // ===========================

  function clearError() {
    state.value.error = null
  }

  function getBalance(itemId: string, itemType: StorageItemType, department: StorageDepartment) {
    return state.value.balances.find(
      b => b.itemId === itemId && b.itemType === itemType && b.department === department
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
      totalItems: allBalances.length,
      totalValue: allBalances.reduce((sum, b) => sum + b.totalValue, 0),

      kitchen: {
        items: kitchenBalances.length,
        value: kitchenBalances.reduce((sum, b) => sum + b.totalValue, 0),
        products: kitchenBalances.filter(b => b.itemType === 'product').length,
        preparations: kitchenBalances.filter(b => b.itemType === 'preparation').length
      },

      bar: {
        items: barBalances.length,
        value: barBalances.reduce((sum, b) => sum + b.totalValue, 0),
        products: barBalances.filter(b => b.itemType === 'product').length,
        preparations: barBalances.filter(b => b.itemType === 'preparation').length
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
    departmentBalances,
    totalInventoryValue,
    alertCounts,
    quickProducts,
    quickPreparations,
    statistics,

    // Core Actions
    fetchBalances,
    fetchOperations,
    fetchInventories,

    // Operations (только receipt и correction)
    createCorrection, // ✅ НОВОЕ: заменяет consumption
    createReceipt,

    // Inventory
    startInventory,
    updateInventory,
    finalizeInventory,

    // FIFO calculations
    calculateFifoAllocation,
    calculateCorrectionCost, // ✅ НОВОЕ: заменяет calculateConsumptionCost

    // Alerts
    getExpiringItems,
    getLowStockItems,

    // Data helpers
    getAvailableProducts,
    getAvailablePreparations,
    getItemName,
    getItemUnit,
    getItemCostPerUnit,

    // Filters
    setDepartmentFilter,
    setItemTypeFilter,
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
