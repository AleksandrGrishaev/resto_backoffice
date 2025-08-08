// src/stores/storage/storageStore.ts - УПРОЩЕННАЯ ВЕРСИЯ
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { useStorageData } from './composables/useStorageData'
import { useStorageCalculations } from './composables/useStorageCalculations'
import { useProductionOperations } from './composables/useProductionOperations'
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
  CreateInventoryData,
  CreateProductionData,
  CreateConsumptionData,
  CreateReceiptData,
  ProductionOperation
} from './types'

const MODULE_NAME = 'StorageStore'

export const useStorageStore = defineStore('storage', () => {
  // ==========================================
  // COMPOSABLES
  // ==========================================
  const storageData = useStorageData()
  const storageCalculations = useStorageCalculations()
  const productionOps = useProductionOperations()
  const productsStore = useProductsStore()
  const recipesStore = useRecipesStore()

  // ==========================================
  // STATE
  // ==========================================
  const state = ref<StorageState>({
    batches: [],
    operations: [],
    balances: [],
    inventories: [],
    loading: {
      balances: false,
      operations: false,
      inventory: false,
      production: false
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
      expiryWarningDays: 2,
      lowStockMultiplier: 1.2,
      autoCalculateBalance: true
    }
  })

  // ==========================================
  // COMPUTED PROPERTIES (GETTERS)
  // ==========================================

  const filteredBalances = computed(() => {
    try {
      return storageCalculations.filterBalances(state.value.balances, state.value.filters)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error filtering balances', { error })
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
    return storageCalculations.calculateAlertCounts(state.value.balances)
  })

  const availablePreparations = computed(() => productionOps.availablePreparations.value)

  const productionOperations = computed(
    () =>
      state.value.operations.filter(
        op => op.operationType === 'production'
      ) as ProductionOperation[]
  )

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

      alerts: alertCounts.value,
      recentOperations: state.value.operations.slice(0, 10),
      recentInventories: state.value.inventories.slice(0, 5),
      productionStats: {
        totalProductions: productionOperations.value.length,
        recentProductions: productionOperations.value.slice(0, 5)
      }
    }
  })

  // ==========================================
  // CORE DATA OPERATIONS
  // ==========================================

  async function fetchBalances(department?: StorageDepartment) {
    try {
      state.value.loading.balances = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching storage balances', { department })

      const balances = await storageData.fetchBalances(department)
      state.value.balances = balances

      DebugUtils.info(MODULE_NAME, 'Storage balances updated', { count: balances.length })
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

      const operations = await storageData.fetchOperations(department)
      state.value.operations = operations

      DebugUtils.info(MODULE_NAME, 'Storage operations updated', { count: operations.length })
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

      const inventories = await storageData.fetchInventories(department)
      state.value.inventories = inventories

      DebugUtils.info(MODULE_NAME, 'Inventories updated', { count: inventories.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch inventories'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  // ==========================================
  // CRUD OPERATIONS
  // ==========================================

  async function createConsumption(data: CreateConsumptionData): Promise<StorageOperation> {
    try {
      state.value.loading.operations = true
      state.value.error = null

      const operation = await storageData.createConsumption(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create consumption'
      state.value.error = message
      throw error
    } finally {
      state.value.loading.operations = false
    }
  }

  async function createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      state.value.loading.operations = true
      state.value.error = null

      const operation = await storageData.createReceipt(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create receipt'
      state.value.error = message
      throw error
    } finally {
      state.value.loading.operations = false
    }
  }

  async function createProduction(data: CreateProductionData): Promise<ProductionOperation> {
    try {
      state.value.loading.production = true
      state.value.error = null

      const operation = await productionOps.createProduction(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create production'
      state.value.error = message
      throw error
    } finally {
      state.value.loading.production = false
    }
  }

  // ==========================================
  // INVENTORY OPERATIONS
  // ==========================================

  async function startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      const inventory = await storageData.startInventory(data)
      state.value.inventories.unshift(inventory)

      return inventory
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start inventory'
      state.value.error = message
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

      const inventory = await storageData.updateInventory(inventoryId, items)

      // Update local state
      const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)
      if (index !== -1) {
        state.value.inventories[index] = inventory
      }

      return inventory
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update inventory'
      state.value.error = message
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  async function finalizeInventory(inventoryId: string): Promise<void> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      const correctionOperations = await storageData.finalizeInventory(inventoryId)

      // Update inventory status
      const inventoryIndex = state.value.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex !== -1) {
        state.value.inventories[inventoryIndex].status = 'confirmed'
      }

      // Add correction operations
      correctionOperations.forEach(op => {
        state.value.operations.unshift(op)
      })

      // Refresh balances if there were corrections
      if (correctionOperations.length > 0) {
        const inventory = state.value.inventories[inventoryIndex]
        if (inventory) {
          await fetchBalances(inventory.department)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to finalize inventory'
      state.value.error = message
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  // ==========================================
  // ALERT HELPERS
  // ==========================================

  const getExpiringItems = (days: number = 2) =>
    storageCalculations.getExpiringItems(state.value.balances, days)

  const getLowStockItems = () => storageCalculations.getLowStockItems(state.value.balances)

  // ==========================================
  // DATA HELPERS
  // ==========================================

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

  const getAvailablePreparations = () => recipesStore.activePreparations

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
      return 'kg'
    }
  }

  // ==========================================
  // FILTER ACTIONS
  // ==========================================

  const setDepartmentFilter = (department: StorageDepartment | 'all') => {
    state.value.filters.department = department
  }

  const setItemTypeFilter = (itemType: StorageItemType | 'all') => {
    state.value.filters.itemType = itemType
  }

  const setSearchFilter = (search: string) => {
    state.value.filters.search = search
  }

  const toggleExpiredFilter = () => {
    state.value.filters.showExpired = !state.value.filters.showExpired
  }

  const toggleLowStockFilter = () => {
    state.value.filters.showBelowMinStock = !state.value.filters.showBelowMinStock
  }

  const toggleNearExpiryFilter = () => {
    state.value.filters.showNearExpiry = !state.value.filters.showNearExpiry
  }

  const clearFilters = () => {
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

  // ==========================================
  // UTILITIES
  // ==========================================

  const clearError = () => {
    state.value.error = null
  }

  const getBalance = (itemId: string, itemType: StorageItemType, department: StorageDepartment) =>
    state.value.balances.find(
      b => b.itemId === itemId && b.itemType === itemType && b.department === department
    )

  const getOperation = (operationId: string) =>
    state.value.operations.find(op => op.id === operationId)

  const getInventory = (inventoryId: string) =>
    state.value.inventories.find(inv => inv.id === inventoryId)

  // ==========================================
  // INITIALIZATION
  // ==========================================

  async function initialize() {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage store')

      state.value.loading.balances = true
      state.value.error = null

      // Initialize dependent stores
      if (productsStore.products.length === 0) {
        await productsStore.loadProducts(true)
      }

      if (recipesStore.preparations.length === 0) {
        await recipesStore.fetchPreparations()
      }

      // Initialize storage data service
      await storageData.initializeData()

      // Load storage data
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

  // ==========================================
  // RETURN PUBLIC API
  // ==========================================

  return {
    // State
    state,

    // Getters
    filteredBalances,
    departmentBalances,
    totalInventoryValue,
    alertCounts,
    availablePreparations,
    productionOperations,
    statistics,

    // Core Actions
    fetchBalances,
    fetchOperations,
    fetchInventories,

    // CRUD Operations
    createConsumption,
    createReceipt,
    createProduction,

    // Inventory Operations
    startInventory,
    updateInventory,
    finalizeInventory,

    // Alerts
    getExpiringItems,
    getLowStockItems,

    // Data helpers
    getAvailableProducts,
    getAvailablePreparations,
    getItemName,
    getItemUnit,

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
    initialize,

    // Доступ к composables для UI компонентов
    storageCalculations,
    productionOps
  }
})
