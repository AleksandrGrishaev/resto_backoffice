// src/stores/preparation/preparationStore.ts - Адаптация StorageStore для полуфабрикатов
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { preparationService } from './preparationService'
import { useRecipesStore } from '@/stores/recipes'
import type {
  PreparationState,
  PreparationOperation,
  PreparationBalance,
  PreparationInventoryDocument,
  PreparationInventoryItem,
  PreparationDepartment,
  CreatePreparationReceiptData,
  CreatePreparationConsumptionData,
  CreatePreparationCorrectionData,
  CreatePreparationInventoryData
} from './types'

const MODULE_NAME = 'PreparationStore'

export const usePreparationStore = defineStore('preparation', () => {
  // State
  const state = ref<PreparationState>({
    batches: [],
    operations: [],
    balances: [],
    inventories: [],
    loading: {
      balances: false,
      operations: false,
      inventory: false,
      consumption: false,
      production: false
    },
    error: null,
    filters: {
      department: 'all',
      showExpired: false,
      showBelowMinStock: false,
      showNearExpiry: false,
      search: '',
      dateFrom: undefined,
      dateTo: undefined
    },
    settings: {
      expiryWarningDays: 1, // 1 день для полуфабрикатов
      lowStockMultiplier: 1.2,
      autoCalculateBalance: true
    }
  })

  // ✅ Получение связанных stores
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

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        balances = balances.filter(b => b.preparationName.toLowerCase().includes(searchLower))
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
      console.warn('Error filtering preparation balances:', error)
      return []
    }
  })

  const departmentBalances = computed(() => {
    return (department: PreparationDepartment) =>
      state.value.balances.filter(b => b.department === department)
  })

  const totalInventoryValue = computed(() => {
    return (department?: PreparationDepartment) => {
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

  const quickPreparations = computed(() => {
    return (department: PreparationDepartment) => {
      try {
        return preparationService.getQuickPreparations(department)
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to get quick preparations', { error })
        return []
      }
    }
  })

  // ===========================
  // CORE PREPARATION ACTIONS
  // ===========================

  async function fetchBalances(department?: PreparationDepartment) {
    try {
      state.value.loading.balances = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching preparation balances', { department })

      const balances = await preparationService.getBalances(department)
      state.value.balances = balances

      DebugUtils.info(MODULE_NAME, 'Preparation balances loaded', {
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

  async function fetchOperations(department?: PreparationDepartment) {
    try {
      state.value.loading.operations = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching preparation operations', { department })

      const operations = await preparationService.getOperations(department)
      state.value.operations = operations

      DebugUtils.info(MODULE_NAME, 'Preparation operations loaded', {
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

  async function fetchInventories(department?: PreparationDepartment) {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching preparation inventories', { department })

      const inventories = await preparationService.getInventories(department)
      state.value.inventories = inventories

      DebugUtils.info(MODULE_NAME, 'Preparation inventories loaded', {
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
  // CONSUMPTION OPERATIONS
  // ===========================

  async function createConsumption(
    data: CreatePreparationConsumptionData
  ): Promise<PreparationOperation> {
    try {
      state.value.loading.consumption = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating preparation consumption operation', { data })

      const operation = await preparationService.createConsumption(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Preparation consumption operation created', {
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

  // ===========================
  // CORRECTION OPERATIONS
  // ===========================

  async function createCorrection(
    data: CreatePreparationCorrectionData
  ): Promise<PreparationOperation> {
    try {
      state.value.loading.consumption = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating preparation correction operation', { data })

      const operation = await preparationService.createCorrection(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Preparation correction operation created', {
        operationId: operation.id
      })

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create correction'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.consumption = false
    }
  }

  // ===========================
  // RECEIPT OPERATIONS (PRODUCTION)
  // ===========================

  async function createReceipt(data: CreatePreparationReceiptData): Promise<PreparationOperation> {
    try {
      state.value.loading.production = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Creating preparation receipt operation', { data })

      const operation = await preparationService.createReceipt(data)

      // Update local state
      state.value.operations.unshift(operation)

      // Refresh balances
      await fetchBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Preparation receipt operation created', {
        operationId: operation.id
      })

      return operation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create receipt'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.production = false
    }
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async function startInventory(
    data: CreatePreparationInventoryData
  ): Promise<PreparationInventoryDocument> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Starting preparation inventory', { data })

      const inventory = await preparationService.startInventory(data)

      // Update local state
      state.value.inventories.unshift(inventory)

      DebugUtils.info(MODULE_NAME, 'Preparation inventory started', {
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
    items: PreparationInventoryItem[]
  ): Promise<PreparationInventoryDocument> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Updating preparation inventory', { inventoryId })

      const inventory = await preparationService.updateInventory(inventoryId, items)

      // Update local state
      const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)
      if (index !== -1) {
        state.value.inventories[index] = inventory
      }

      DebugUtils.info(MODULE_NAME, 'Preparation inventory updated', { inventoryId })

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

      DebugUtils.info(MODULE_NAME, 'Finalizing preparation inventory', { inventoryId })

      const correctionOperations = await preparationService.finalizeInventory(inventoryId)

      // Update local state
      const inventoryIndex = state.value.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex !== -1) {
        state.value.inventories[inventoryIndex].status = 'confirmed'
      }

      // Add correction operations to operations list
      correctionOperations.forEach(op => {
        state.value.operations.unshift(op)
      })

      DebugUtils.info(MODULE_NAME, 'Preparation inventory finalized', {
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
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ) {
    try {
      return preparationService.calculateFifoAllocation(preparationId, department, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', { error })
      throw error
    }
  }

  function calculateConsumptionCost(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): number {
    try {
      return preparationService.calculateConsumptionCost(preparationId, department, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate consumption cost', { error })
      throw error
    }
  }

  // ===========================
  // ALERT HELPERS
  // ===========================

  function getExpiringPreparations(days: number = 1): PreparationBalance[] {
    try {
      return preparationService.getExpiringPreparations(days)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expiring preparations', { error })
      return []
    }
  }

  function getLowStockPreparations(): PreparationBalance[] {
    try {
      return preparationService.getLowStockPreparations()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock preparations', { error })
      return []
    }
  }

  // ===========================
  // DATA HELPERS
  // ===========================

  function getAvailablePreparations(): any[] {
    try {
      return recipesStore.activePreparations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available preparations', { error })
      return []
    }
  }

  function getPreparationName(preparationId: string): string {
    try {
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)
      return preparation?.name || preparationId
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation name', { error, preparationId })
      return preparationId
    }
  }

  function getPreparationUnit(preparationId: string): string {
    try {
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)
      return preparation?.outputUnit || 'gram'
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation unit', { error, preparationId })
      return 'gram'
    }
  }

  function getPreparationCostPerUnit(preparationId: string): number {
    try {
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)
      return preparation?.costPerPortion || 0
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation cost', { error, preparationId })
      return 0
    }
  }

  // ===========================
  // FILTER ACTIONS
  // ===========================

  function setDepartmentFilter(department: PreparationDepartment | 'all') {
    state.value.filters.department = department
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
      DebugUtils.info(MODULE_NAME, 'Initializing preparation store')

      state.value.loading.balances = true
      state.value.error = null

      // Load dependent stores if not loaded
      if (recipesStore.preparations.length === 0) {
        DebugUtils.info(MODULE_NAME, 'Loading recipes store')
        await recipesStore.fetchPreparations()
      }

      // Initialize preparation service
      await preparationService.initialize()

      // Load preparation data
      await Promise.all([fetchBalances(), fetchOperations(), fetchInventories()])

      DebugUtils.info(MODULE_NAME, 'Preparation store initialized successfully')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize preparation store'
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

  function getBalance(preparationId: string, department: PreparationDepartment) {
    return state.value.balances.find(
      b => b.preparationId === preparationId && b.department === department
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
        value: kitchenBalances.reduce((sum, b) => sum + b.totalValue, 0)
      },

      bar: {
        items: barBalances.length,
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
    departmentBalances,
    totalInventoryValue,
    alertCounts,
    quickPreparations,
    statistics,

    // Core Actions
    fetchBalances,
    fetchOperations,
    fetchInventories,

    // Operations
    createConsumption,
    createCorrection,
    createReceipt,

    // Inventory
    startInventory,
    updateInventory,
    finalizeInventory,

    // FIFO calculations
    calculateFifoAllocation,
    calculateConsumptionCost,

    // Alerts
    getExpiringPreparations,
    getLowStockPreparations,

    // Data helpers
    getAvailablePreparations,
    getPreparationName,
    getPreparationUnit,
    getPreparationCostPerUnit,

    // Filters
    setDepartmentFilter,
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
