// src/stores/preparation/preparationStore.ts - UPDATED: Added Write-off Support
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { preparationService } from './preparationService'
import { useRecipesStore } from '@/stores/recipes'
import type {
  PreparationState,
  PreparationOperation,
  PreparationBalance,
  PreparationBatch,
  PreparationInventoryDocument,
  PreparationInventoryItem,
  PreparationDepartment,
  CreatePreparationReceiptData,
  CreatePreparationInventoryData,
  CreatePreparationWriteOffData
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
      production: false,
      writeOff: false // ✅ NEW
    },
    error: null,
    filters: {
      department: 'all',
      operationType: undefined, // ✅ NEW
      showExpired: false,
      showBelowMinStock: false,
      showNearExpiry: false,
      search: '',
      dateFrom: undefined,
      dateTo: undefined
    },
    settings: {
      expiryWarningDays: 1,
      lowStockMultiplier: 1.2,
      autoCalculateBalance: true,
      enableQuickWriteOff: true // ✅ NEW
    }
  })

  const recipesStore = useRecipesStore()

  // ===========================
  // COMPUTED PROPERTIES
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
        balances = balances.filter(b => b.preparationName.toLowerCase().includes(searchLower))
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
      console.warn('Error filtering preparation balances:', error)
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
    return (department: PreparationDepartment) =>
      state.value.balances.filter(b => b.department === department)
  })

  // ✅ NEW: Computed for batches
  const departmentBatches = computed(() => {
    return (department: PreparationDepartment) =>
      state.value.batches.filter(b => b.department === department)
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
        return recipesStore.activePreparations.slice(0, 10).map(prep => ({
          id: prep.id,
          name: prep.name,
          unit: prep.outputUnit,
          type: prep.type
        }))
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

      DebugUtils.info(MODULE_NAME, 'Fetching preparation balances and batches', { department })

      // ✅ FIXED: Load both balances AND batches simultaneously
      const [balances, batches] = await Promise.all([
        preparationService.getBalances(department),
        preparationService.getBatches(department)
      ])

      state.value.balances = balances
      state.value.batches = batches

      DebugUtils.info(MODULE_NAME, 'Preparation balances and batches loaded', {
        balances: balances.length,
        batches: batches.length
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch preparation balances'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.balances = false
    }
  }

  async function fetchBatches(department?: PreparationDepartment) {
    try {
      state.value.loading.balances = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Fetching preparation batches', { department })

      const batches = await preparationService.getBatches(department)
      state.value.batches = batches

      DebugUtils.info(MODULE_NAME, 'Preparation batches loaded', {
        count: batches.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch preparation batches'
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
  // CORE OPERATIONS (with batch sync)
  // ===========================

  // ✅ REMOVED: createCorrection method - no longer needed (only Recipe Production now)

  async function createReceipt(data: CreatePreparationReceiptData): Promise<PreparationOperation> {
    try {
      state.value.loading.production = true
      state.value.error = null

      const operation = await preparationService.createReceipt(data)
      state.value.operations.unshift(operation)

      // ✅ FIXED: Sync both balances AND batches
      await fetchBalances(data.department)

      return operation
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create preparation receipt'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.production = false
    }
  }

  // ===========================
  // ✅ WRITE-OFF SUPPORT (with batch sync)
  // ===========================

  async function createWriteOff(
    data: CreatePreparationWriteOffData
  ): Promise<PreparationOperation> {
    try {
      state.value.loading.writeOff = true
      state.value.error = null

      const operation = await preparationService.createWriteOff(data)

      // ✅ FIXED: Sync all data including batches
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

  /**
   * Get write-off statistics (delegated to preparationService)
   */
  function getWriteOffStatistics(department?: any, dateFrom?: any, dateTo?: any) {
    return preparationService.getWriteOffStatistics(department, dateFrom, dateTo)
  }

  // ===========================
  // INVENTORY OPERATIONS (with batch sync)
  // ===========================

  async function startInventory(
    data: CreatePreparationInventoryData
  ): Promise<PreparationInventoryDocument> {
    try {
      state.value.loading.inventory = true
      state.value.error = null

      const inventory = await preparationService.startInventory(data)
      state.value.inventories.unshift(inventory)

      return inventory
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start preparation inventory'
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

      const inventory = await preparationService.updateInventory(inventoryId, items)

      const index = state.value.inventories.findIndex(inv => inv.id === inventoryId)
      if (index !== -1) {
        state.value.inventories[index] = inventory
      }

      return inventory
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update preparation inventory'
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

      const correctionOperations = await preparationService.finalizeInventory(inventoryId)

      const inventoryIndex = state.value.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex !== -1) {
        state.value.inventories[inventoryIndex].status = 'confirmed'
      }

      correctionOperations.forEach(op => {
        state.value.operations.unshift(op)
      })

      // ✅ FIXED: After inventory finalization, sync all data including batches
      const inventory = state.value.inventories[inventoryIndex]
      if (inventory) {
        await fetchBalances(inventory.department)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to finalize preparation inventory'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading.inventory = false
    }
  }

  // ===========================
  // FIFO CALCULATIONS (delegated to preparationService)
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

  function calculateCorrectionCost(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): number {
    try {
      return preparationService.calculateCorrectionCost(preparationId, department, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate correction cost', { error })
      throw error
    }
  }

  // ===========================
  // DATA HELPERS
  // ===========================

  function getAvailablePreparations(department: PreparationDepartment): any[] {
    try {
      return recipesStore.activePreparations.filter(p => p.isActive)
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

  // ✅ NEW: Batch helper methods
  function getPreparationBatches(
    preparationId: string,
    department: PreparationDepartment
  ): PreparationBatch[] {
    return state.value.batches
      .filter(
        b =>
          b.preparationId === preparationId && b.department === department && b.status === 'active'
      )
      .sort((a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime())
  }

  function getBatchById(batchId: string): PreparationBatch | undefined {
    return state.value.batches.find(b => b.id === batchId)
  }

  // ===========================
  // FILTER ACTIONS
  // ===========================

  function setDepartmentFilter(department: PreparationDepartment | 'all') {
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
  // INITIALIZATION (with batch loading)
  // ===========================

  async function initialize() {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing preparation store')

      state.value.loading.balances = true
      state.value.error = null

      if (recipesStore.preparations.length === 0) {
        await recipesStore.fetchPreparations()
      }

      await preparationService.initialize()

      // ✅ FIXED: Load ALL data including batches
      await Promise.all([
        fetchBalances(), // this now loads both balances AND batches
        fetchOperations(),
        fetchInventories()
      ])

      DebugUtils.info(MODULE_NAME, 'Preparation store initialized successfully', {
        balances: state.value.balances.length,
        batches: state.value.batches.length,
        operations: state.value.operations.length,
        inventories: state.value.inventories.length
      })
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
  // STATISTICS
  // ===========================

  const statistics = computed(() => {
    const allBalances = state.value.balances
    const kitchenBalances = allBalances.filter(b => b.department === 'kitchen')
    const barBalances = allBalances.filter(b => b.department === 'bar')

    return {
      totalPreparations: allBalances.length,
      totalValue: allBalances.reduce((sum, b) => sum + b.totalValue, 0),

      kitchen: {
        preparations: kitchenBalances.length,
        value: kitchenBalances.reduce((sum, b) => sum + b.totalValue, 0)
      },

      bar: {
        preparations: barBalances.length,
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
  // NEGATIVE INVENTORY METHODS (Sprint 1)
  // ===========================

  /**
   * Update cached last_known_cost for a preparation
   * Called after batch creation/update to maintain cost cache
   *
   * @param preparationId - UUID of the preparation
   */
  async function updatePreparationLastKnownCost(preparationId: string): Promise<void> {
    const { negativeBatchService } = await import('./negativeBatchService')

    try {
      const lastBatch = await negativeBatchService.getLastActiveBatch(preparationId)
      if (lastBatch) {
        const { supabase } = await import('@/supabase')
        const { error } = await supabase
          .from('preparations')
          .update({ last_known_cost: lastBatch.costPerUnit })
          .eq('id', preparationId)

        if (error) {
          console.error('❌ Failed to update last_known_cost:', error)
        } else {
          console.info(
            `✅ Updated last_known_cost for preparation ${preparationId}: ${lastBatch.costPerUnit}`
          )
        }
      }
    } catch (error) {
      console.error('❌ Error updating last_known_cost:', error)
    }
  }

  /**
   * Check if preparation allows negative inventory
   * Configurable per preparation (default: true)
   *
   * @param preparationId - UUID of the preparation
   * @returns True if preparation allows negative inventory
   */
  async function canGoNegative(preparationId: string): Promise<boolean> {
    try {
      const { supabase } = await import('@/supabase')
      const { data, error } = await supabase
        .from('preparations')
        .select('allow_negative_inventory')
        .eq('id', preparationId)
        .single()

      if (error) {
        console.error('❌ Error checking allow_negative_inventory:', error)
        return true // Default to true on error
      }

      return data?.allow_negative_inventory ?? true
    } catch (error) {
      console.error('❌ Error in canGoNegative:', error)
      return true // Default to true on error
    }
  }

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
    departmentBatches, // ✅ NEW
    totalInventoryValue,
    alertCounts,
    quickPreparations,
    statistics,

    // Core Actions
    fetchBalances,
    fetchBatches, // ✅ NEW
    fetchOperations,
    fetchInventories,

    // Operations
    createReceipt,

    // ✅ Write-off support (with batch sync)
    createWriteOff,
    getWriteOffStatistics,

    // Inventory
    startInventory,
    updateInventory,
    finalizeInventory,

    // FIFO calculations
    calculateFifoAllocation,
    calculateCorrectionCost,

    // Data helpers
    getAvailablePreparations,
    getPreparationName,
    getPreparationUnit,
    getPreparationCostPerUnit,

    // ✅ NEW: Batch helpers
    getPreparationBatches,
    getBatchById,

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

    // ✅ Negative Inventory methods (Sprint 1)
    updatePreparationLastKnownCost,
    canGoNegative,

    // Initialize
    initialize
  }
})
