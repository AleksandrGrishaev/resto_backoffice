// src/stores/storage/storageStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { storageService } from './storageService'
import type {
  StorageState,
  StorageOperation,
  StorageBalance,
  InventoryDocument,
  StorageDepartment,
  StorageItemType,
  CreateConsumptionData,
  CreateReceiptData,
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
      consumption: false
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

  // Getters
  const filteredBalances = computed(() => {
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
  })

  const departmentBalances = computed(() => {
    return (department: StorageDepartment) =>
      state.value.balances.filter(b => b.department === department)
  })

  const totalInventoryValue = computed(() => {
    return (department?: StorageDepartment) => {
      let balances = state.value.balances
      if (department) {
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

  // Actions
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

  async function createConsumption(data: CreateConsumptionData): Promise<StorageOperation> {
    try {
      state.value.loading.consumption = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating consumption operation', { data })

      const operation = await storageService.createConsumption(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Consumption operation created', {
        operationId: operation.id
      })

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create consumption'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.consumption = false
    }
  }

  async function createReceipt(data: CreateReceiptData): Promise<StorageOperation> {
    try {
      state.value.loading.consumption = true
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
      state.value.loading.consumption = false
    }
  }

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

  // FIFO calculations
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

  function calculateConsumptionCost(
    itemId: string,
    itemType: StorageItemType,
    department: StorageDepartment,
    quantity: number
  ): number {
    try {
      return storageService.calculateConsumptionCost(itemId, itemType, department, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate consumption cost', { error })
      throw error
    }
  }

  // Alert helpers
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

  // Filter actions
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

  // Initialize store
  async function initialize() {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing storage store')

      await Promise.all([fetchBalances(), fetchOperations(), fetchInventories()])

      DebugUtils.info(MODULE_NAME, 'Storage store initialized successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize storage store', { error })
      throw error
    }
  }

  return {
    // State
    state,

    // Getters
    filteredBalances,
    departmentBalances,
    totalInventoryValue,
    alertCounts,

    // Actions
    fetchBalances,
    fetchOperations,
    fetchInventories,
    createConsumption,
    createReceipt,
    startInventory,

    // FIFO calculations
    calculateFifoAllocation,
    calculateConsumptionCost,

    // Alerts
    getExpiringItems,
    getLowStockItems,

    // Filters
    setDepartmentFilter,
    setItemTypeFilter,
    setSearchFilter,
    toggleExpiredFilter,
    toggleLowStockFilter,
    toggleNearExpiryFilter,
    clearFilters,

    // Initialize
    initialize
  }
})
