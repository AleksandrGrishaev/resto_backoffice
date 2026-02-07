// src/stores/preparation/preparationService.ts - UPDATED: Supabase Integration
import { DebugUtils, TimeUtils } from '@/utils'
import { useRecipesStore } from '@/stores/recipes'
import { storageService } from '@/stores/storage/storageService' // ✨ NEW: For auto write-off
import { useProductsStore } from '@/stores/productsStore' // ✨ NEW: For product names
import { supabase } from '@/supabase/client'
import {
  batchFromSupabase,
  batchToSupabase,
  batchToSupabaseUpdate,
  operationFromSupabase,
  operationToSupabase,
  inventoryDocumentFromSupabase,
  inventoryDocumentToSupabase,
  inventoryDocumentToSupabaseUpdate
} from './supabase/mappers'

// ✅ UPDATED: Import new types
import type {
  PreparationBatch,
  PreparationOperation,
  PreparationBalance,
  PreparationDepartment,
  CreatePreparationReceiptData,
  CreatePreparationInventoryData,
  CreatePreparationWriteOffData,
  CreateCorrectionData,
  CorrectionItem,
  PreparationInventoryDocument,
  PreparationInventoryItem,
  PreparationWriteOffStatistics,
  BatchAllocation
} from './types'

// ✅ UPDATED: Import write-off helper function
import { doesPreparationWriteOffAffectKPI } from './types'

// ✨ NEW: Import storage types for auto write-off
import type { WriteOffItem } from '@/stores/storage/types'
import { DEFAULT_WAREHOUSE } from '@/stores/storage/types'

const MODULE_NAME = 'PreparationService'

export class PreparationService {
  private batches: PreparationBatch[] = []
  private operations: PreparationOperation[] = []
  private balances: PreparationBalance[] = []
  private inventories: PreparationInventoryDocument[] = []
  private initialized: boolean = false

  // ===========================
  // HELPER METHODS
  // ===========================

  private generateBatchNumber(preparationName: string, date: string): string {
    const shortName =
      preparationName
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 4) || 'PREP'
    const counter = String(Date.now()).slice(-3)
    const dateStr = date.substring(0, 10).replace(/-/g, '')
    return `B-PREP-${shortName}-${counter}-${dateStr}`
  }

  private calculateFifoAllocationHelper(
    batches: PreparationBatch[],
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    const allocations: BatchAllocation[] = []
    let remainingQuantity = quantity

    // Sort batches by production date (FIFO - oldest first)
    const sortedBatches = [...batches].sort(
      (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
    )

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0) break

      const allocatedQuantity = Math.min(batch.currentQuantity, remainingQuantity)

      if (allocatedQuantity > 0) {
        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: allocatedQuantity,
          costPerUnit: batch.costPerUnit,
          batchDate: batch.productionDate
        })

        remainingQuantity -= allocatedQuantity
      }
    }

    return { allocations, remainingQuantity }
  }

  private getPreparationInfo(preparationId: string) {
    try {
      const recipesStore = useRecipesStore()

      // ✅ FIX: Initialize recipesStore if not initialized (similar to decomposition engine)
      if (!recipesStore.initialized) {
        console.warn('⚠️ [PrepService] RecipesStore not initialized, using fallback')
        // Can't await here (sync method), so return fallback
        return {
          name: `[Not loaded] ${preparationId.substring(0, 8)}...`,
          unit: 'gram',
          outputQuantity: 1000,
          outputUnit: 'gram',
          costPerPortion: 0,
          shelfLife: 2,
          // ⭐ PHASE 2: Portion type defaults
          portionType: 'weight' as const,
          portionSize: undefined as number | undefined
        }
      }

      const preparation = recipesStore.preparations?.find(p => p.id === preparationId)

      if (!preparation) {
        DebugUtils.warn(MODULE_NAME, 'Preparation not found in recipesStore', {
          preparationId,
          recipesStoreInitialized: recipesStore.initialized,
          availablePreparations: recipesStore.preparations?.length || 0
        })
        return {
          name: preparationId, // ❌ FALLBACK: Shows UUID when preparation not found
          unit: 'gram',
          outputQuantity: 1000,
          outputUnit: 'gram',
          costPerPortion: 0,
          lastKnownCost: 0,
          shelfLife: 2, // days
          // ⭐ PHASE 2: Portion type defaults
          portionType: 'weight' as const,
          portionSize: undefined as number | undefined
        }
      }

      return {
        name: preparation.name,
        unit: preparation.outputUnit,
        outputQuantity: preparation.outputQuantity,
        outputUnit: preparation.outputUnit,
        costPerPortion: preparation.costPerPortion || 0,
        lastKnownCost: preparation.lastKnownCost || 0,
        shelfLife: preparation.shelfLife || 2, // preparations expire faster
        // ⭐ PHASE 2: Portion type support
        portionType: preparation.portionType || 'weight',
        portionSize: preparation.portionSize
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting preparation info', { error, preparationId })
      return {
        name: preparationId,
        unit: 'gram',
        outputQuantity: 1000,
        outputUnit: 'gram',
        costPerPortion: 0,
        lastKnownCost: 0,
        shelfLife: 2,
        // ⭐ PHASE 2: Portion type defaults
        portionType: 'weight' as const,
        portionSize: undefined as number | undefined
      }
    }
  }

  // ===========================
  // ✅ INITIALIZATION WITH MOCK DATA LOADING
  // ===========================

  async initialize(): Promise<void> {
    try {
      if (this.initialized) {
        DebugUtils.info(MODULE_NAME, 'Service already initialized')
        return
      }

      DebugUtils.info(MODULE_NAME, 'Initializing preparation service')

      const recipesStore = useRecipesStore()

      // ✅ FIX: Ensure recipes store is initialized BEFORE loading preparations
      if (!recipesStore.initialized) {
        DebugUtils.warn(MODULE_NAME, 'RecipesStore not initialized - initializing now...')
        await recipesStore.initialize()
      }

      if (recipesStore.preparations.length === 0) {
        DebugUtils.info(MODULE_NAME, 'No preparations in recipesStore - fetching...')
        await recipesStore.fetchPreparations()
      }

      DebugUtils.info(MODULE_NAME, 'RecipesStore ready', {
        initialized: recipesStore.initialized,
        preparations: recipesStore.preparations.length
      })

      // Load data from Supabase
      await this.loadBatchesFromSupabase()
      await this.loadOperationsFromSupabase()
      await this.loadInventoriesFromSupabase()
      await this.recalculateAllBalances()

      this.initialized = true
      DebugUtils.info(MODULE_NAME, 'Preparation service initialized from Supabase', {
        batches: this.batches.length,
        operations: this.operations.length,
        inventories: this.inventories.length,
        balances: this.balances.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize preparation service', { error })
      throw error
    }
  }

  // ===========================
  // SUPABASE DATA LOADING
  // ===========================

  private async loadBatchesFromSupabase(silent: boolean = false): Promise<void> {
    try {
      if (!silent) {
        DebugUtils.info(MODULE_NAME, 'Loading batches from Supabase')
      }

      const { data, error } = await supabase
        .from('preparation_batches')
        .select('*')
        .order('production_date', { ascending: true })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load batches from Supabase', { error })
        throw error
      }

      this.batches = (data || []).map(batchFromSupabase)

      if (!silent) {
        DebugUtils.info(MODULE_NAME, 'Batches loaded from Supabase', {
          count: this.batches.length
        })
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading batches', { error })
      // Initialize with empty array on error
      this.batches = []
    }
  }

  private async loadOperationsFromSupabase(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading operations from Supabase')

      const { data, error } = await supabase
        .from('preparation_operations')
        .select('*')
        .order('operation_date', { ascending: false })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load operations from Supabase', { error })
        throw error
      }

      this.operations = (data || []).map(operationFromSupabase)

      DebugUtils.info(MODULE_NAME, 'Operations loaded from Supabase', {
        count: this.operations.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading operations', { error })
      // Initialize with empty array on error
      this.operations = []
    }
  }

  private async loadInventoriesFromSupabase(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading inventory documents from Supabase')

      const { data, error } = await supabase
        .from('preparation_inventory_documents')
        .select('*')
        .order('inventory_date', { ascending: false })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load inventories from Supabase', { error })
        throw error
      }

      this.inventories = (data || []).map(inventoryDocumentFromSupabase)

      // ⭐ PHASE 2: Enrich old inventory items with portionType/portionSize from preparations
      const recipesStore = useRecipesStore()
      if (recipesStore.initialized && recipesStore.preparations.length > 0) {
        for (const inventory of this.inventories) {
          for (const item of inventory.items) {
            // If item doesn't have portionType/portionSize, get it from preparation
            if (!item.portionType || !item.portionSize) {
              const preparation = recipesStore.preparations.find(p => p.id === item.preparationId)
              if (preparation) {
                item.portionType = preparation.portionType || 'weight'
                item.portionSize = preparation.portionSize
              }
            }
          }
        }
      }

      DebugUtils.info(MODULE_NAME, 'Inventory documents loaded from Supabase', {
        count: this.inventories.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading inventories', { error })
      // Initialize with empty array on error
      this.inventories = []
    }
  }

  // ===========================
  // BASIC OPERATIONS
  // ===========================

  async getBalances(department?: PreparationDepartment): Promise<PreparationBalance[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      if (this.balances.length === 0) {
        await this.recalculateAllBalances()
      }

      let balances = [...this.balances]

      if (department && department !== 'all') {
        balances = balances.filter(b => b.department === department)
      }

      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch preparation balances', { error })
      throw error
    }
  }

  async getBalance(
    preparationId: string,
    department: PreparationDepartment
  ): Promise<PreparationBalance | null> {
    try {
      const balance = this.balances.find(
        b => b.preparationId === preparationId && b.department === department
      )
      return balance || null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation balance', { error, preparationId })
      throw error
    }
  }

  async getBatches(department?: PreparationDepartment): Promise<PreparationBatch[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let batches = [...this.batches]

      // ✅ FIXED: Filter by preparation department, not batch department
      if (department && department !== 'all') {
        const recipesStore = useRecipesStore()
        const departmentPreparationIds = new Set(
          recipesStore.activePreparations.filter(p => p.department === department).map(p => p.id)
        )
        batches = batches.filter(b => departmentPreparationIds.has(b.preparationId))
      }

      return batches
        .filter(b => b.status === 'active')
        .sort((a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime())
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get batches', { error, department })
      throw error
    }
  }

  async getAllBatches(department?: PreparationDepartment): Promise<PreparationBatch[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let batches = [...this.batches]

      // ✅ FIXED: Filter by preparation department, not batch department
      if (department && department !== 'all') {
        const recipesStore = useRecipesStore()
        const departmentPreparationIds = new Set(
          recipesStore.activePreparations.filter(p => p.department === department).map(p => p.id)
        )
        batches = batches.filter(b => departmentPreparationIds.has(b.preparationId))
      }

      return batches.sort(
        (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get all batches', { error, department })
      throw error
    }
  }

  /**
   * ✅ FIX: Refresh batches cache from database
   * Call this after operations that create new batches (like negative batches)
   * to ensure cost calculations use fresh data
   */
  async refreshBatches(): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Refreshing batches cache from database')
      await this.loadBatchesFromSupabase(true) // silent mode
      DebugUtils.debug(MODULE_NAME, 'Batches cache refreshed', {
        count: this.batches.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh batches cache', { error })
      throw error
    }
  }

  async getPreparationBatches(
    preparationId: string,
    department: PreparationDepartment
  ): Promise<PreparationBatch[]> {
    try {
      const batches = this.batches.filter(
        b =>
          b.preparationId === preparationId &&
          b.department === department &&
          b.status === 'active' &&
          !b.reconciledAt // ✅ FIX: Exclude reconciled negative batches
        // ✅ FIX: Include negative batches for cost calculation
        // Negative batches have cost information needed for accurate COGS
        // Removed: && b.currentQuantity > 0
      )

      // ✅ FIX: Prioritize positive batches over negative batches, then FIFO
      return batches.sort((a, b) => {
        // Positive batches first
        if (a.currentQuantity > 0 && b.currentQuantity < 0) return -1
        if (a.currentQuantity < 0 && b.currentQuantity > 0) return 1
        // Then by production date (FIFO)
        return new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation batches', { error, preparationId })
      throw error
    }
  }

  // ===========================
  // ASYNC DB COST LOOKUP
  // ===========================

  /**
   * Get last known cost from database directly (not dependent on store initialization)
   * Used for inventory corrections and other operations that need cost data
   * when recipesStore may not be initialized.
   *
   * Fallback chain:
   * 1. Active batches (newest first by production_date)
   * 2. Depleted batches (newest first)
   * 3. preparation.last_known_cost from DB
   * 4. Zero with error logging
   *
   * @param preparationId - The preparation ID
   * @returns Cost per base unit (gram/ml)
   */
  async getLastKnownCostFromDB(preparationId: string): Promise<number> {
    try {
      // 1. Try active batches (newest first for most recent cost)
      const { data: activeBatch } = await supabase
        .from('preparation_batches')
        .select('cost_per_unit, batch_number')
        .eq('preparation_id', preparationId)
        .gt('current_quantity', 0)
        .eq('status', 'active')
        .or('is_negative.eq.false,is_negative.is.null')
        .gt('cost_per_unit', 0)
        .order('production_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (activeBatch?.cost_per_unit && activeBatch.cost_per_unit > 0) {
        DebugUtils.debug(MODULE_NAME, 'Cost from active batch', {
          preparationId,
          cost: activeBatch.cost_per_unit,
          batchNumber: activeBatch.batch_number
        })
        return activeBatch.cost_per_unit
      }

      // 2. Try depleted batches (historical cost)
      const { data: depletedBatch } = await supabase
        .from('preparation_batches')
        .select('cost_per_unit, batch_number')
        .eq('preparation_id', preparationId)
        .eq('status', 'depleted')
        .or('is_negative.eq.false,is_negative.is.null')
        .gt('cost_per_unit', 0)
        .order('production_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (depletedBatch?.cost_per_unit && depletedBatch.cost_per_unit > 0) {
        DebugUtils.debug(MODULE_NAME, 'Cost from depleted batch', {
          preparationId,
          cost: depletedBatch.cost_per_unit,
          batchNumber: depletedBatch.batch_number
        })
        return depletedBatch.cost_per_unit
      }

      // 3. Try preparation.last_known_cost from DB
      const { data: preparation } = await supabase
        .from('preparations')
        .select('last_known_cost, name, portion_type, portion_size')
        .eq('id', preparationId)
        .single()

      if (preparation?.last_known_cost && preparation.last_known_cost > 0) {
        // last_known_cost is always stored per BASE UNIT (gram/piece) since migration 147
        // No normalization needed — writers ensure consistent per-base-unit storage
        DebugUtils.debug(MODULE_NAME, 'Cost from preparation.last_known_cost (per base unit)', {
          preparationId,
          name: preparation.name,
          cost: preparation.last_known_cost
        })
        return preparation.last_known_cost
      }

      // 4. Log error and return 0
      DebugUtils.error(MODULE_NAME, '❌ No cost data found in DB', {
        preparationId,
        preparationName: preparation?.name || 'Unknown',
        fallbacksAttempted: ['active_batches', 'depleted_batches', 'last_known_cost']
      })
      return 0
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting cost from DB', { preparationId, error })
      return 0
    }
  }

  // ===========================
  // ⭐ PHASE 2: PORTION CONVERSION HELPERS
  // ===========================

  /**
   * Convert portions to weight (grams) for a preparation
   * @param preparationId - The preparation ID
   * @param portions - Number of portions
   * @returns Weight in grams, or null if not a portion-type preparation
   */
  convertPortionsToWeight(preparationId: string, portions: number): number | null {
    const prepInfo = this.getPreparationInfo(preparationId)
    if (prepInfo.portionType === 'portion' && prepInfo.portionSize) {
      return portions * prepInfo.portionSize
    }
    return null // Not a portion-type preparation
  }

  /**
   * Convert weight (grams) to portions for a preparation
   * @param preparationId - The preparation ID
   * @param weight - Weight in grams
   * @returns Number of portions (floored), or null if not a portion-type preparation
   */
  convertWeightToPortions(preparationId: string, weight: number): number | null {
    const prepInfo = this.getPreparationInfo(preparationId)
    if (prepInfo.portionType === 'portion' && prepInfo.portionSize) {
      return Math.floor(weight / prepInfo.portionSize)
    }
    return null // Not a portion-type preparation
  }

  /**
   * Get last known cost for a preparation from most recent active batches
   * Used for negative stock corrections and inventory adjustments
   * @param preparationId - The preparation ID
   * @returns Last known cost per unit, or fallback to estimated/average cost
   */
  getLastKnownCost(preparationId: string): number {
    try {
      const prepInfo = this.getPreparationInfo(preparationId)

      // Get active batches for this preparation, sorted by production date (newest first)
      const activeBatches = this.batches
        .filter(
          b =>
            b.preparationId === preparationId &&
            b.status === 'active' &&
            b.currentQuantity > 0 &&
            !b.isNegative &&
            !b.reconciledAt
        )
        .sort((a, b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime())

      // Return cost from most recent active batch
      if (activeBatches.length > 0) {
        const lastCost = activeBatches[0].costPerUnit
        DebugUtils.info(MODULE_NAME, 'Using last known cost from recent active batch', {
          preparationId,
          preparationName: prepInfo.name,
          lastCost,
          batchNumber: activeBatches[0].batchNumber
        })
        return lastCost
      }

      // Fallback 1: Search in ALL batches (including depleted) if no active batches
      const allBatches = this.batches
        .filter(
          b =>
            b.preparationId === preparationId &&
            !b.isNegative &&
            !b.reconciledAt &&
            b.costPerUnit > 0 // Only batches with valid cost
        )
        .sort((a, b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime())

      if (allBatches.length > 0) {
        const lastCost = allBatches[0].costPerUnit
        DebugUtils.warn(
          MODULE_NAME,
          'No active batches, using cost from most recent batch (any status)',
          {
            preparationId,
            preparationName: prepInfo.name,
            lastCost,
            batchNumber: allBatches[0].batchNumber,
            batchStatus: allBatches[0].status
          }
        )
        return lastCost
      }

      // Fallback 2: Use lastKnownCost from preparation info
      if (prepInfo.lastKnownCost && prepInfo.lastKnownCost > 0) {
        DebugUtils.warn(MODULE_NAME, 'Using last known cost from preparation info', {
          preparationId,
          preparationName: prepInfo.name,
          lastKnownCost: prepInfo.lastKnownCost
        })
        return prepInfo.lastKnownCost
      }

      // Fallback 4: Return 0 (should not happen in normal operation)
      DebugUtils.error(MODULE_NAME, 'No cost information available for preparation', {
        preparationId,
        preparationName: prepInfo.name
      })
      return 0
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting last known cost', { preparationId, error })
      return 0
    }
  }

  /**
   * Calculate FIFO allocation in portions (converts to weight internally)
   * @param preparationId - The preparation ID
   * @param department - The department
   * @param portions - Number of portions to allocate
   * @returns Allocation result with weight-based quantities
   */
  calculateFifoAllocationByPortions(
    preparationId: string,
    department: PreparationDepartment,
    portions: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number; remainingPortions: number } {
    const prepInfo = this.getPreparationInfo(preparationId)

    if (prepInfo.portionType !== 'portion' || !prepInfo.portionSize) {
      throw new Error(`Preparation ${preparationId} is not a portion-type preparation`)
    }

    // Convert portions to weight
    const weightNeeded = portions * prepInfo.portionSize

    // Use standard FIFO allocation (works with weight)
    const { allocations, remainingQuantity } = this.calculateFifoAllocation(
      preparationId,
      department,
      weightNeeded
    )

    // Convert remaining quantity back to portions
    const remainingPortions = Math.ceil(remainingQuantity / prepInfo.portionSize)

    return { allocations, remainingQuantity, remainingPortions }
  }

  // ===========================
  // FIFO CALCULATIONS
  // ===========================

  calculateFifoAllocation(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    try {
      const batches = this.batches.filter(
        b =>
          b.preparationId === preparationId &&
          b.department === department &&
          b.status === 'active' &&
          b.currentQuantity > 0
      )

      return this.calculateFifoAllocationHelper(batches, quantity)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', { error })
      throw error
    }
  }

  calculateCorrectionCost(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): number {
    try {
      const { allocations } = this.calculateFifoAllocation(preparationId, department, quantity)
      return allocations.reduce(
        (total, allocation) => total + allocation.quantity * allocation.costPerUnit,
        0
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate correction cost', { error })
      throw error
    }
  }

  // ===========================
  // ✅ NEW: WRITE-OFF OPERATIONS
  // ===========================

  async createWriteOff(data: CreatePreparationWriteOffData): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation write-off operation', { data })

      const operationItems = []
      let totalValue = 0
      let totalBatchesUpdated = 0

      for (const item of data.items) {
        const preparationInfo = this.getPreparationInfo(item.preparationId)

        const { allocations, remainingQuantity } = this.calculateFifoAllocation(
          item.preparationId,
          data.department,
          item.quantity
        )

        if (remainingQuantity > 0) {
          throw new Error(
            `Insufficient stock for ${preparationInfo.name}. Missing: ${remainingQuantity} ${preparationInfo.unit}`
          )
        }

        const totalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        operationItems.push({
          id: `prep-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          preparationId: item.preparationId,
          preparationName: preparationInfo.name,
          quantity: item.quantity,
          unit: preparationInfo.unit,
          batchAllocations: allocations,
          totalCost,
          notes: item.notes
        })

        totalValue += totalCost
        totalBatchesUpdated += allocations.length

        // ✅ Update batches with precision handling AND save to Supabase
        for (const allocation of allocations) {
          const batchIndex = this.batches.findIndex(b => b.id === allocation.batchId)
          if (batchIndex !== -1) {
            const batch = this.batches[batchIndex]

            const newQuantity = batch.currentQuantity - allocation.quantity
            batch.currentQuantity = Math.round(newQuantity * 10000) / 10000
            batch.totalValue = Math.round(batch.currentQuantity * batch.costPerUnit * 100) / 100
            batch.updatedAt = TimeUtils.getCurrentLocalISO()

            // ⭐ PHASE 2: Update portion quantity if portion-type batch
            if (batch.portionType === 'portion' && batch.portionSize) {
              batch.portionQuantity = Math.floor(batch.currentQuantity / batch.portionSize)
            }

            // ⚠️ IMPORTANT: Only mark as depleted if NOT a negative batch
            // Negative batches should remain active until reconciled (reconciled_at is set)
            if (batch.currentQuantity <= 0.0001 && !batch.isNegative) {
              batch.currentQuantity = 0
              batch.totalValue = 0
              batch.portionQuantity = 0 // ⭐ PHASE 2: Reset portion quantity
              batch.status = 'depleted'
              batch.isActive = false

              DebugUtils.info(MODULE_NAME, 'Preparation batch marked as depleted', {
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                originalQuantity: batch.initialQuantity,
                finalQuantity: batch.currentQuantity
              })
            }

            // ✅ UPDATE batch in Supabase
            const { error: batchUpdateError } = await supabase
              .from('preparation_batches')
              .update(batchToSupabaseUpdate(batch))
              .eq('id', batch.id)

            if (batchUpdateError) {
              DebugUtils.error(MODULE_NAME, 'Failed to update batch in Supabase', {
                batchUpdateError
              })
              throw batchUpdateError
            }

            this.batches[batchIndex] = batch
          }
        }
      }

      const operation: PreparationOperation = {
        id: crypto.randomUUID(),
        operationType: 'write_off',
        documentNumber: `PREP-WR-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        writeOffDetails: {
          reason: data.reason,
          affectsKPI: doesPreparationWriteOffAffectKPI(data.reason),
          notes: data.notes
        },
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // ✅ INSERT operation into Supabase
      const { error: operationError } = await supabase
        .from('preparation_operations')
        .insert(operationToSupabase(operation))

      if (operationError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert operation into Supabase', {
          operationError
        })
        throw operationError
      }

      this.operations.push(operation)
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Preparation write-off operation created', {
        operationId: operation.id,
        reason: data.reason,
        affectsKPI: doesPreparationWriteOffAffectKPI(data.reason),
        totalValue,
        batchesUpdated: totalBatchesUpdated
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation write-off', { error })
      throw error
    }
  }

  // ===========================
  // ✅ WRITE-OFF STATISTICS
  // ===========================

  getWriteOffStatistics(
    department?: PreparationDepartment,
    dateFrom?: string,
    dateTo?: string
  ): PreparationWriteOffStatistics {
    try {
      let writeOffOps = this.operations.filter(op => op.operationType === 'write_off')

      if (department && department !== 'all') {
        writeOffOps = writeOffOps.filter(op => op.department === department)
      }

      if (dateFrom) {
        writeOffOps = writeOffOps.filter(op => op.operationDate >= dateFrom)
      }
      if (dateTo) {
        writeOffOps = writeOffOps.filter(op => op.operationDate <= dateTo)
      }

      const stats: PreparationWriteOffStatistics = {
        total: { count: 0, value: 0 },
        kpiAffecting: {
          count: 0,
          value: 0,
          reasons: {
            expired: { count: 0, value: 0 },
            spoiled: { count: 0, value: 0 },
            other: { count: 0, value: 0 }
          }
        },
        nonKpiAffecting: {
          count: 0,
          value: 0,
          reasons: {
            education: { count: 0, value: 0 },
            test: { count: 0, value: 0 }
          }
        },
        byDepartment: {
          kitchen: { total: 0, kpiAffecting: 0, nonKpiAffecting: 0 },
          bar: { total: 0, kpiAffecting: 0, nonKpiAffecting: 0 }
        }
      }

      writeOffOps.forEach(op => {
        const value = op.totalValue || 0
        const reason = op.writeOffDetails?.reason
        const affectsKPI = op.writeOffDetails?.affectsKPI || false

        stats.total.count += 1
        stats.total.value += value

        if (affectsKPI && reason) {
          stats.kpiAffecting.count += 1
          stats.kpiAffecting.value += value

          if (reason in stats.kpiAffecting.reasons) {
            stats.kpiAffecting.reasons[reason as keyof typeof stats.kpiAffecting.reasons].count += 1
            stats.kpiAffecting.reasons[reason as keyof typeof stats.kpiAffecting.reasons].value +=
              value
          }
        } else if (!affectsKPI && reason) {
          stats.nonKpiAffecting.count += 1
          stats.nonKpiAffecting.value += value

          if (reason in stats.nonKpiAffecting.reasons) {
            stats.nonKpiAffecting.reasons[
              reason as keyof typeof stats.nonKpiAffecting.reasons
            ].count += 1
            stats.nonKpiAffecting.reasons[
              reason as keyof typeof stats.nonKpiAffecting.reasons
            ].value += value
          }
        }

        const dept = op.department
        stats.byDepartment[dept].total += value
        if (affectsKPI) {
          stats.byDepartment[dept].kpiAffecting += value
        } else {
          stats.byDepartment[dept].nonKpiAffecting += value
        }
      })

      return stats
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off statistics', { error })
      throw error
    }
  }

  // ===========================
  // CORRECTION OPERATIONS
  // ===========================

  /**
   * Creates a correction operation for inventory adjustments
   * Handles both positive (surplus) and negative (shortage) corrections
   *
   * @param data - Correction operation data
   * @returns Created preparation operation
   */
  async createCorrection(data: CreateCorrectionData): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation correction operation', { data })

      const operationItems = []
      let totalValue = 0

      for (const item of data.items) {
        const preparationInfo = this.getPreparationInfo(item.preparationId)

        if (item.quantity > 0) {
          // SURPLUS: Create new batch with correction source
          // ✅ FIX: Use async DB lookup instead of sync store data (may not be initialized)
          const costPerUnit = await this.getLastKnownCostFromDB(item.preparationId)
          const batchValue = item.quantity * costPerUnit

          if (costPerUnit <= 0) {
            DebugUtils.warn(MODULE_NAME, '⚠️ Creating surplus batch with zero cost', {
              preparationId: item.preparationId,
              preparationName: preparationInfo.name,
              quantity: item.quantity
            })
          }

          const newBatch: PreparationBatch = {
            id: crypto.randomUUID(),
            batchNumber: `PREP-CORR-${String(this.batches.length + 1).padStart(4, '0')}`,
            preparationId: item.preparationId,
            department: data.department,
            initialQuantity: item.quantity,
            currentQuantity: item.quantity,
            unit: item.unit,
            costPerUnit,
            totalValue: batchValue,
            productionDate: TimeUtils.getCurrentLocalISO(),
            sourceType: 'correction',
            notes: `Inventory correction: ${data.correctionDetails.reason}`,
            status: 'active',
            isActive: true,
            createdAt: TimeUtils.getCurrentLocalISO(),
            updatedAt: TimeUtils.getCurrentLocalISO()
          }

          // Insert batch into Supabase
          const { error: batchError } = await supabase
            .from('preparation_batches')
            .insert(batchToSupabase(newBatch))

          if (batchError) {
            DebugUtils.error(MODULE_NAME, 'Failed to insert batch into Supabase', {
              batchError
            })
            throw batchError
          }

          this.batches.push(newBatch)
          totalValue += batchValue

          operationItems.push({
            id: `prep-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            preparationId: item.preparationId,
            preparationName: preparationInfo.name,
            quantity: item.quantity,
            unit: item.unit,
            batchAllocations: [
              {
                batchId: newBatch.id,
                batchNumber: newBatch.batchNumber,
                quantity: item.quantity,
                costPerUnit,
                batchDate: newBatch.productionDate
              }
            ],
            totalCost: batchValue,
            notes: item.notes
          })

          DebugUtils.info(MODULE_NAME, '✅ Created surplus batch', {
            preparationId: item.preparationId,
            quantity: item.quantity,
            cost: batchValue
          })
        } else if (item.quantity < 0) {
          // SHORTAGE: Allocate from FIFO, create negative batch if needed
          const quantityToAllocate = Math.abs(item.quantity)

          const { allocations, remainingQuantity } = this.calculateFifoAllocation(
            item.preparationId,
            data.department,
            quantityToAllocate
          )

          let totalCost = allocations.reduce(
            (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
            0
          )

          // Update batches with allocations
          for (const allocation of allocations) {
            const batchIndex = this.batches.findIndex(b => b.id === allocation.batchId)
            if (batchIndex !== -1) {
              const batch = this.batches[batchIndex]

              const newQuantity = batch.currentQuantity - allocation.quantity
              batch.currentQuantity = Math.round(newQuantity * 10000) / 10000
              batch.totalValue = Math.round(batch.currentQuantity * batch.costPerUnit * 100) / 100
              batch.updatedAt = TimeUtils.getCurrentLocalISO()

              if (batch.currentQuantity <= 0.0001 && !batch.isNegative) {
                batch.currentQuantity = 0
                batch.totalValue = 0
                batch.status = 'depleted'
                batch.isActive = false
              }

              // Update batch in Supabase
              const { error: batchUpdateError } = await supabase
                .from('preparation_batches')
                .update(batchToSupabaseUpdate(batch))
                .eq('id', batch.id)

              if (batchUpdateError) {
                DebugUtils.error(MODULE_NAME, 'Failed to update batch in Supabase', {
                  batchUpdateError
                })
                throw batchUpdateError
              }

              this.batches[batchIndex] = batch
            }
          }

          // Create negative batch if needed
          if (remainingQuantity > 0) {
            DebugUtils.warn(MODULE_NAME, '⚠️ Insufficient stock - creating negative batch', {
              preparationId: item.preparationId,
              needed: quantityToAllocate,
              available: quantityToAllocate - remainingQuantity,
              shortage: remainingQuantity
            })

            // ✅ FIX: Get cost from DB before creating negative batch
            const negativeBatchCost = await this.getLastKnownCostFromDB(item.preparationId)

            const negativeBatchServiceModule = await import('./negativeBatchService')
            // ✅ FIX: Use correct object signature for createNegativeBatch
            const negativeBatch =
              await negativeBatchServiceModule.negativeBatchService.createNegativeBatch({
                preparationId: item.preparationId,
                department: data.department,
                quantity: -remainingQuantity, // Negative value for shortage
                unit: item.unit,
                cost: negativeBatchCost,
                reason: `Inventory shortage during correction: ${data.correctionDetails.reason}`,
                sourceOperationType: 'manual_writeoff'
              })

            // Add negative batch to allocations
            allocations.push({
              batchId: negativeBatch.id,
              batchNumber: negativeBatch.batchNumber,
              quantity: remainingQuantity,
              costPerUnit: negativeBatch.costPerUnit || 0,
              batchDate: TimeUtils.getCurrentLocalISO()
            })

            totalCost += (negativeBatch.costPerUnit || 0) * remainingQuantity

            // Refresh batches cache to include the new negative batch
            await this.refreshBatches()

            DebugUtils.info(MODULE_NAME, '✅ Created negative batch for shortage', {
              batchId: negativeBatch.id,
              batchNumber: negativeBatch.batchNumber,
              quantity: -remainingQuantity,
              cost: negativeBatch.costPerUnit
            })
          }

          totalValue += totalCost

          operationItems.push({
            id: `prep-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            preparationId: item.preparationId,
            preparationName: preparationInfo.name,
            quantity: item.quantity, // Keep negative sign
            unit: item.unit,
            batchAllocations: allocations,
            totalCost,
            notes: item.notes
          })

          DebugUtils.info(MODULE_NAME, '✅ Processed shortage', {
            preparationId: item.preparationId,
            quantity: item.quantity,
            cost: totalCost
          })
        }
      }

      const operation: PreparationOperation = {
        id: crypto.randomUUID(),
        operationType: 'correction',
        documentNumber: `PREP-CORR-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue: Math.abs(totalValue),
        correctionDetails: data.correctionDetails,
        relatedInventoryId: data.correctionDetails.relatedInventoryId,
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Insert operation into Supabase
      const { error: operationError } = await supabase
        .from('preparation_operations')
        .insert(operationToSupabase(operation))

      if (operationError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert operation into Supabase', {
          operationError
        })
        throw operationError
      }

      this.operations.push(operation)
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, '✅ Correction operation created', {
        operationId: operation.id,
        reason: data.correctionDetails.reason,
        totalValue,
        itemsCount: operationItems.length
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create correction operation', { error })
      throw error
    }
  }

  // ===========================
  // RECEIPT OPERATIONS
  // ===========================

  async createReceipt(data: CreatePreparationReceiptData): Promise<PreparationOperation> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation receipt operation', { data })

      const operationItems = []
      let totalValue = 0
      const now = TimeUtils.getCurrentLocalISO()
      const storageWriteOffIds: string[] = [] // ✨ NEW: Track write-off operations
      const actualCostsMap = new Map<string, number>() // ✅ FIX: Track actual FIFO costs per preparation
      const recipesStore = useRecipesStore()
      const productsStore = useProductsStore()

      // ✨ NEW: Step 0 - Auto write-off raw products for each preparation (unless skipped)
      if (!data.skipAutoWriteOff) {
        for (const item of data.items) {
          // Get preparation with recipe
          const preparation = recipesStore.preparations.find(p => p.id === item.preparationId)

          if (!preparation) {
            throw new Error(
              `Preparation not found: ${item.preparationId}. Cannot create receipt without valid preparation.`
            )
          }

          if (!preparation.recipe || preparation.recipe.length === 0) {
            DebugUtils.warn(MODULE_NAME, 'Preparation has no recipe, skipping auto write-off', {
              preparationId: item.preparationId,
              preparationName: preparation.name
            })
            continue // Skip write-off if no recipe (optional)
          }

          // ⭐ PHASE 1: Calculate ingredient quantities needed (supports products AND preparations)
          // ⭐ PHASE 2 FIX: For portion-type, use portion count for multiplier (not grams)
          let multiplier: number
          if (preparation.portionType === 'portion' && preparation.portionSize) {
            // For portion-type: item.quantity is in grams, convert to portions
            const portionCount = Math.floor(item.quantity / preparation.portionSize)
            multiplier = portionCount / preparation.outputQuantity
          } else {
            // For weight-type: use grams directly
            multiplier = item.quantity / preparation.outputQuantity
          }

          const writeOffItems: WriteOffItem[] = preparation.recipe.map(ingredient => {
            // ⭐ PHASE 1: Get ingredient info based on type
            let ingredientName: string
            let yieldPercentage: number | undefined

            if (ingredient.type === 'product') {
              // === EXISTING LOGIC: Product ingredients ===
              const product = productsStore.getProductById(ingredient.id)
              ingredientName = product?.name || `Product ${ingredient.id}`
              yieldPercentage = product?.yieldPercentage
            } else if (ingredient.type === 'preparation') {
              // ⭐ PHASE 1: NEW LOGIC - Preparation ingredients
              const prep = recipesStore.getPreparationById(ingredient.id)
              ingredientName = prep?.name || `Preparation ${ingredient.id}`
              yieldPercentage = undefined // Preparations don't have yield percentage
            } else {
              ingredientName = `Unknown ${ingredient.id}`
              yieldPercentage = undefined
            }

            // ✅ FIX: Apply yield adjustment if enabled (only for products)
            let adjustedQuantity = ingredient.quantity * multiplier

            if (
              ingredient.type === 'product' &&
              ingredient.useYieldPercentage &&
              yieldPercentage &&
              yieldPercentage < 100
            ) {
              const originalQuantity = adjustedQuantity
              adjustedQuantity = adjustedQuantity / (yieldPercentage / 100)

              DebugUtils.info(MODULE_NAME, `Applied yield adjustment for ${ingredientName}`, {
                baseQuantity: originalQuantity,
                yieldPercentage,
                adjustedQuantity,
                ingredient: ingredient.id
              })
            }

            // ⭐ FIX: Convert portions to grams for portion-type preparation ingredients
            // Batches store quantities in grams, so we must convert before write-off
            let finalQuantity = adjustedQuantity
            let finalUnit = ingredient.unit

            if (ingredient.type === 'preparation' && ingredient.unit === 'portion') {
              const ingredientPrep = recipesStore.getPreparationById(ingredient.id)
              if (ingredientPrep?.portionType === 'portion' && ingredientPrep?.portionSize) {
                // Convert portions to grams: 4 portions × 16.67g = 66.68g
                finalQuantity = adjustedQuantity * ingredientPrep.portionSize
                finalUnit = 'gram'

                DebugUtils.info(
                  MODULE_NAME,
                  'Converted portions to grams for preparation ingredient',
                  {
                    preparationName: ingredientPrep.name,
                    originalQuantity: adjustedQuantity,
                    portionSize: ingredientPrep.portionSize,
                    convertedQuantity: finalQuantity
                  }
                )
              }
            }

            return {
              itemId: ingredient.id,
              itemName: ingredientName,
              itemType: ingredient.type, // ⭐ CHANGED: Use actual type ('product' | 'preparation')
              quantity: finalQuantity, // Now in grams for portion-type preparations
              unit: finalUnit, // Now 'gram' for portion-type preparations
              notes: `Production: ${preparation.name} (${item.quantity}${preparation.outputUnit})`
            }
          })

          DebugUtils.info(MODULE_NAME, 'Auto write-off raw products for preparation', {
            preparation: preparation.name,
            quantity: item.quantity,
            rawProducts: writeOffItems.length
          })

          // ✨ Call storageService to write-off raw products
          const writeOffResult = await storageService.createWriteOff({
            warehouseId: DEFAULT_WAREHOUSE.id,
            department: data.department,
            responsiblePerson: data.responsiblePerson,
            reason: 'production_consumption', // ✨ NEW reason type
            items: writeOffItems,
            notes: `Auto write-off for preparation production: ${preparation.name}`
          })

          if (!writeOffResult.success || !writeOffResult.data) {
            throw new Error(
              `Failed to write-off raw products for ${preparation.name}: ${writeOffResult.error}`
            )
          }

          storageWriteOffIds.push(writeOffResult.data.id)

          // ✅ FIX: Store actual FIFO cost from write-off for batch creation
          const actualWriteOffCost = writeOffResult.data.totalValue || 0
          actualCostsMap.set(item.preparationId, actualWriteOffCost)

          DebugUtils.info(MODULE_NAME, 'Raw products written off successfully', {
            writeOffId: writeOffResult.data.id,
            items: writeOffItems.length,
            actualFifoCost: actualWriteOffCost,
            catalogCost: item.costPerUnit * item.quantity
          })
        }
      } else {
        DebugUtils.info(MODULE_NAME, 'Skipping auto write-off (inventory correction)', {
          itemCount: data.items.length
        })
      }

      // Step 1: Create batches and insert into Supabase
      for (const item of data.items) {
        const preparationInfo = this.getPreparationInfo(item.preparationId)

        // ⭐ PHASE 2: Calculate portion quantity if portionType='portion'
        let portionQuantity: number | undefined
        if (preparationInfo.portionType === 'portion' && preparationInfo.portionSize) {
          portionQuantity = Math.floor(item.quantity / preparationInfo.portionSize)
          DebugUtils.info(MODULE_NAME, '⭐ Calculated portion quantity', {
            preparationName: preparationInfo.name,
            totalWeight: item.quantity,
            portionSize: preparationInfo.portionSize,
            portionQuantity
          })
        }

        // ✅ FIX: Use actual FIFO cost from write-off instead of catalog price
        // Fallback to catalog cost only if write-off was skipped (inventory correction)
        const catalogTotalCost = item.quantity * item.costPerUnit
        const actualTotalCost = actualCostsMap.get(item.preparationId) ?? catalogTotalCost
        let actualCostPerUnit =
          item.quantity > 0 ? actualTotalCost / item.quantity : item.costPerUnit

        // ⚡ FIX: Prevent zero-cost batches - use fallback if cost is 0
        if (actualCostPerUnit <= 0) {
          const fallback = preparationInfo.lastKnownCost || item.costPerUnit
          if (fallback > 0) {
            DebugUtils.warn(MODULE_NAME, '⚠️ Zero cost detected, using fallback', {
              preparationId: item.preparationId,
              preparationName: preparationInfo.name,
              originalCost: actualCostPerUnit,
              fallbackCost: fallback,
              source: preparationInfo.lastKnownCost ? 'lastKnownCost' : 'catalogCost'
            })
            actualCostPerUnit = fallback
          } else {
            DebugUtils.error(MODULE_NAME, '❌ Zero cost with no fallback available', {
              preparationId: item.preparationId,
              preparationName: preparationInfo.name
            })
          }
        }

        if (actualCostsMap.has(item.preparationId)) {
          DebugUtils.info(MODULE_NAME, '✅ Using actual FIFO cost for batch', {
            preparationName: preparationInfo.name,
            catalogCostPerUnit: item.costPerUnit,
            actualCostPerUnit: actualCostPerUnit,
            catalogTotalCost,
            actualTotalCost,
            savings: catalogTotalCost - actualTotalCost
          })
        }

        const batch: PreparationBatch = {
          id: crypto.randomUUID(),
          batchNumber: this.generateBatchNumber(preparationInfo.name, now),
          preparationId: item.preparationId,
          department: data.department,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: preparationInfo.unit,
          costPerUnit: actualCostPerUnit, // ✅ FIX: Use actual FIFO cost
          totalValue: Math.round(actualTotalCost * 100) / 100, // ✅ FIX: Use actual total
          productionDate: now,
          expiryDate: item.expiryDate,
          sourceType: data.sourceType,
          notes: item.notes,
          status: 'active',
          isActive: true,
          // ⭐ PHASE 2: Portion type support
          portionType: preparationInfo.portionType,
          portionSize: preparationInfo.portionSize,
          portionQuantity,
          createdAt: now,
          updatedAt: now
        }

        // Insert batch into Supabase
        const { error: batchError } = await supabase
          .from('preparation_batches')
          .insert(batchToSupabase(batch))

        if (batchError) {
          DebugUtils.error(MODULE_NAME, 'Failed to insert batch into Supabase', { batchError })
          throw batchError
        }

        // Update last_known_cost for preparation with actual FIFO cost
        const { error: updateError } = await supabase
          .from('preparations')
          .update({ last_known_cost: actualCostPerUnit }) // ✅ FIX: Use actual cost
          .eq('id', item.preparationId)

        if (updateError) {
          DebugUtils.warn(MODULE_NAME, '⚠️ Failed to update last_known_cost', {
            preparationId: item.preparationId,
            error: updateError
          })
        } else {
          DebugUtils.info(MODULE_NAME, '✅ Updated preparation last_known_cost', {
            preparationId: item.preparationId,
            preparationName: preparationInfo.name,
            costPerUnit: actualCostPerUnit // ✅ FIX: Log actual cost
          })
        }

        // Add to local array
        this.batches.push(batch)

        operationItems.push({
          id: crypto.randomUUID(),
          preparationId: item.preparationId,
          preparationName: preparationInfo.name,
          quantity: item.quantity,
          unit: batch.unit,
          totalCost: batch.totalValue,
          averageCostPerUnit: actualCostPerUnit, // ✅ FIX: Use actual FIFO cost
          expiryDate: item.expiryDate,
          notes: item.notes
        })

        totalValue += batch.totalValue
      }

      // Step 2: Create operation and insert into Supabase
      const operation: PreparationOperation = {
        id: crypto.randomUUID(),
        operationType: 'receipt',
        documentNumber: `PREP-REC-${String(this.operations.length + 1).padStart(3, '0')}`,
        operationDate: now,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        relatedStorageOperationIds: storageWriteOffIds.length > 0 ? storageWriteOffIds : undefined, // ✨ NEW: Link to storage write-offs
        status: 'confirmed',
        notes: data.notes,
        createdAt: now,
        updatedAt: now
      }

      const { error: operationError } = await supabase
        .from('preparation_operations')
        .insert(operationToSupabase(operation))

      if (operationError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert operation into Supabase', {
          operationError
        })
        throw operationError
      }

      // Add to local array
      this.operations.push(operation)

      // Step 3: Recalculate balances
      await this.recalculateBalances(data.department)

      DebugUtils.info(MODULE_NAME, 'Preparation receipt created in Supabase', {
        operationId: operation.id,
        batchCount: data.items.length,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation receipt', { error })
      throw error
    }
  }

  // ✅ REMOVED: createCorrection - No longer needed (only Recipe Production now)

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  async startInventory(
    data: CreatePreparationInventoryData
  ): Promise<PreparationInventoryDocument> {
    try {
      const recipesStore = useRecipesStore()

      // ✅ FIXED: Get preparations by their department field (not by batch history)
      const departmentPreparations = recipesStore.preparations.filter(
        p => p.department === data.department && p.isActive
      )

      // Get current balances for quick lookup
      const balanceMap = new Map(
        this.balances.filter(b => b.department === data.department).map(b => [b.preparationId, b])
      )

      // ✅ Create inventory items for all active preparations in this department
      const inventoryItems: PreparationInventoryItem[] = []

      for (const preparation of departmentPreparations) {
        const balance = balanceMap.get(preparation.id)

        inventoryItems.push({
          id: crypto.randomUUID(),
          preparationId: preparation.id,
          preparationName: preparation.name,
          systemQuantity: balance ? balance.totalQuantity : 0, // ✅ 0 if consumed/depleted
          actualQuantity: balance ? balance.totalQuantity : 0,
          difference: 0,
          unit: preparation.outputUnit || 'gram',
          averageCost: balance ? balance.averageCost : preparation.costPerPortion || 0,
          valueDifference: 0,
          notes: '',
          countedBy: '',
          // ⭐ PHASE 2: Include portion type info for UI display
          portionType: preparation.portionType || 'weight',
          portionSize: preparation.portionSize
        })
      }

      const inventory: PreparationInventoryDocument = {
        id: crypto.randomUUID(),
        documentNumber: `INV-PREP-${data.department.toUpperCase()}-${String(this.inventories.length + 1).padStart(3, '0')}`,
        inventoryDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: inventoryItems,
        totalItems: inventoryItems.length,
        totalDiscrepancies: 0,
        totalValueDifference: 0,
        status: 'draft',
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // ✅ INSERT inventory document into Supabase
      const { error: inventoryError } = await supabase
        .from('preparation_inventory_documents')
        .insert(inventoryDocumentToSupabase(inventory))

      if (inventoryError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert inventory document into Supabase', {
          inventoryError
        })
        throw inventoryError
      }

      DebugUtils.info(MODULE_NAME, 'Inventory document created in Supabase', {
        documentNumber: inventory.documentNumber,
        department: inventory.department,
        itemsCount: inventoryItems.length
      })

      this.inventories.push(inventory)
      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start preparation inventory', { error })
      throw error
    }
  }

  async updateInventory(
    inventoryId: string,
    items: PreparationInventoryItem[]
  ): Promise<PreparationInventoryDocument> {
    try {
      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Preparation inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      inventory.items = items.map(item => ({
        ...item,
        difference: item.actualQuantity - item.systemQuantity,
        valueDifference: (item.actualQuantity - item.systemQuantity) * item.averageCost
      }))

      inventory.totalDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.01
      ).length

      inventory.totalValueDifference = inventory.items.reduce(
        (sum, item) => sum + item.valueDifference,
        0
      )

      inventory.updatedAt = TimeUtils.getCurrentLocalISO()
      this.inventories[inventoryIndex] = inventory

      // ✅ UPDATE inventory document in Supabase
      const { error: updateError } = await supabase
        .from('preparation_inventory_documents')
        .update(inventoryDocumentToSupabaseUpdate(inventory))
        .eq('id', inventoryId)

      if (updateError) {
        DebugUtils.error(MODULE_NAME, 'Failed to update inventory document in Supabase', {
          updateError,
          inventoryId
        })
        throw updateError
      }

      DebugUtils.info(MODULE_NAME, 'Inventory document updated in Supabase', {
        inventoryId,
        totalItems: inventory.totalItems,
        totalDiscrepancies: inventory.totalDiscrepancies,
        totalValueDifference: inventory.totalValueDifference
      })

      return inventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update preparation inventory', {
        error,
        inventoryId
      })
      throw error
    }
  }

  /**
   * Covers negative stock deficits by creating production receipts
   * Automatically writes off raw materials according to recipes
   *
   * @private
   * @param items - Items with negative stock (systemQuantity < 0)
   * @param inventory - Parent inventory document
   */
  private async coverDeficitsViaProduction(
    items: PreparationInventoryItem[],
    inventory: PreparationInventoryDocument
  ): Promise<void> {
    const recipesStore = useRecipesStore()

    for (const item of items) {
      const preparation = recipesStore.preparations.find(p => p.id === item.preparationId)
      if (!preparation) {
        DebugUtils.warn(MODULE_NAME, 'Preparation not found for deficit coverage', {
          preparationId: item.preparationId
        })
        continue
      }

      const deficitQuantity = Math.abs(item.systemQuantity)
      const actualQuantity = item.actualQuantity || 0
      const totalQuantityNeeded = deficitQuantity + actualQuantity

      DebugUtils.info(MODULE_NAME, 'Covering deficit via production', {
        preparation: preparation.name,
        deficitQuantity,
        actualQuantity,
        totalQuantityNeeded
      })

      // Create production receipt (will auto write-off raw materials)
      await this.createReceipt({
        department: inventory.department,
        responsiblePerson: inventory.countedBy || inventory.responsiblePerson,
        items: [
          {
            preparationId: item.preparationId,
            quantity: totalQuantityNeeded,
            costPerUnit: 0, // Will be calculated from actual FIFO cost
            notes: `Deficit coverage from inventory ${inventory.documentNumber}`
          }
        ],
        sourceType: 'negative_correction',
        skipAutoWriteOff: false, // ✅ DO write off raw materials
        relatedInventoryId: inventory.id,
        notes: `Auto-production to cover negative stock from inventory ${inventory.documentNumber}`
      })

      DebugUtils.info(MODULE_NAME, '✅ Deficit covered via production', {
        preparation: preparation.name,
        quantityProduced: totalQuantityNeeded
      })
    }
  }

  /**
   * Creates correction operations for normal inventory discrepancies
   * Handles both shortages (negative) and surpluses (positive)
   *
   * @private
   * @param items - Items with discrepancies (systemQuantity >= 0)
   * @param inventory - Parent inventory document
   */
  private async createInventoryCorrections(
    items: PreparationInventoryItem[],
    inventory: PreparationInventoryDocument
  ): Promise<void> {
    for (const item of items) {
      await this.createCorrection({
        department: inventory.department,
        responsiblePerson: inventory.countedBy || inventory.responsiblePerson,
        items: [
          {
            preparationId: item.preparationId,
            quantity: item.difference, // Keep sign: +/- (surplus/shortage)
            unit: item.unit,
            notes: `Inventory adjustment from ${inventory.documentNumber}`
          }
        ],
        correctionDetails: {
          reason: 'inventory_adjustment',
          relatedInventoryId: inventory.id,
          relatedDocumentNumber: inventory.documentNumber
        },
        affectsKPI: true, // All inventory discrepancies affect KPI
        notes: `Inventory adjustment: ${inventory.documentNumber}`
      })

      DebugUtils.info(MODULE_NAME, '✅ Inventory correction created', {
        preparation: item.preparationName,
        difference: item.difference,
        unit: item.unit
      })
    }
  }

  async finalizeInventory(inventoryId: string): Promise<void> {
    try {
      const inventoryIndex = this.inventories.findIndex(inv => inv.id === inventoryId)
      if (inventoryIndex === -1) {
        throw new Error('Inventory not found')
      }

      const inventory = this.inventories[inventoryIndex]

      if (inventory.status === 'confirmed') {
        throw new Error('Inventory already finalized')
      }

      // ✅ NEW UNIFIED APPROACH: Split items into 3 categories
      const negativeCorrectionItems = [] // systemQuantity < 0 AND user interacted (needs production)
      const normalDiscrepancyItems = [] // systemQuantity >= 0, has difference AND user interacted (needs correction)
      const matchedItems = [] // no difference OR not interacted with

      // Helper to check if item was counted/touched by user
      const hasItemBeenCounted = (item: PreparationInventoryItem): boolean => {
        return item.confirmed === true || item.userInteracted === true || !!item.countedBy
      }

      for (const item of inventory.items) {
        // Only process items that user explicitly interacted with
        if (!hasItemBeenCounted(item)) {
          matchedItems.push(item)
          continue
        }

        if (item.systemQuantity < 0) {
          // Has negative stock AND user touched it - needs production receipt to cover deficit
          negativeCorrectionItems.push(item)
        } else if (Math.abs(item.difference) > 0.01) {
          // Normal discrepancy AND user touched it - needs correction operation
          normalDiscrepancyItems.push(item)
        } else {
          // User touched it but no difference (e.g., confirmed existing value)
          matchedItems.push(item)
        }
      }

      DebugUtils.info(MODULE_NAME, 'Inventory finalization - item categorization', {
        negativeCorrectionItems: negativeCorrectionItems.length,
        normalDiscrepancyItems: normalDiscrepancyItems.length,
        matchedItems: matchedItems.length
      })

      // STEP 1: Handle negative corrections via production (write off raw materials)
      if (negativeCorrectionItems.length > 0) {
        DebugUtils.info(MODULE_NAME, 'Covering deficits via production', {
          count: negativeCorrectionItems.length
        })
        await this.coverDeficitsViaProduction(negativeCorrectionItems, inventory)
      }

      // STEP 2: Handle normal discrepancies via correction operations
      if (normalDiscrepancyItems.length > 0) {
        DebugUtils.info(MODULE_NAME, 'Creating inventory corrections', {
          count: normalDiscrepancyItems.length
        })
        await this.createInventoryCorrections(normalDiscrepancyItems, inventory)
      }

      // Update inventory status
      inventory.status = 'confirmed'
      inventory.updatedAt = TimeUtils.getCurrentLocalISO()

      // ✅ UPDATE inventory document status in Supabase
      const { error: updateError } = await supabase
        .from('preparation_inventory_documents')
        .update({
          status: 'confirmed',
          updated_at: inventory.updatedAt
        })
        .eq('id', inventoryId)

      if (updateError) {
        DebugUtils.error(MODULE_NAME, 'Failed to update inventory status in Supabase', {
          updateError,
          inventoryId
        })
        throw updateError
      }

      this.inventories[inventoryIndex] = inventory

      // Recalculate balances after all operations
      await this.recalculateBalances(inventory.department)

      DebugUtils.info(MODULE_NAME, '✅ Inventory finalized successfully', {
        inventoryId,
        documentNumber: inventory.documentNumber,
        negativeCorrectionItems: negativeCorrectionItems.length,
        normalDiscrepancyItems: normalDiscrepancyItems.length,
        matchedItems: matchedItems.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to finalize preparation inventory', {
        error,
        inventoryId
      })
      throw error
    }
  }

  // ===========================
  // DATA RETRIEVAL
  // ===========================

  async getOperations(department?: PreparationDepartment): Promise<PreparationOperation[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let operations = [...this.operations]

      if (department && department !== 'all') {
        operations = operations.filter(op => op.department === department)
      }

      return operations.sort(
        (a, b) => new Date(b.operationDate).getTime() - new Date(a.operationDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get operations', { error })
      throw error
    }
  }

  async getInventories(
    department?: PreparationDepartment
  ): Promise<PreparationInventoryDocument[]> {
    try {
      if (!this.initialized) {
        await this.initialize()
      }

      let inventories = [...this.inventories]

      if (department && department !== 'all') {
        inventories = inventories.filter(inv => inv.department === department)
      }

      return inventories.sort(
        (a, b) => new Date(b.inventoryDate).getTime() - new Date(a.inventoryDate).getTime()
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get inventories', { error })
      throw error
    }
  }

  // ===========================
  // ALERT HELPERS
  // ===========================

  getExpiringPreparations(): PreparationBalance[] {
    try {
      return this.balances.filter(balance => balance.hasNearExpiry || balance.hasExpired)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expiring preparations', { error })
      throw error
    }
  }

  getLowStockPreparations(): PreparationBalance[] {
    try {
      return this.balances.filter(balance => balance.belowMinStock)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get low stock preparations', { error })
      throw error
    }
  }

  // ===========================
  // ✅ BALANCE CALCULATION WITH PROPER PRECISION
  // ===========================

  private async recalculateAllBalances(): Promise<void> {
    try {
      this.balances = []
      await this.recalculateBalances('kitchen')
      await this.recalculateBalances('bar')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate all balances', { error })
      throw error
    }
  }

  private async recalculateBalances(department: PreparationDepartment): Promise<void> {
    try {
      // Remove old balances for this department
      this.balances = this.balances.filter(b => b.department !== department)

      // Get available preparations for this department
      let departmentPreparations: any[] = []

      try {
        const recipesStore = useRecipesStore()
        // ✅ FIXED: Filter preparations by their department field
        departmentPreparations = recipesStore.activePreparations.filter(
          p => p.isActive && p.department === department
        )

        DebugUtils.info(
          MODULE_NAME,
          `Found ${departmentPreparations.length} preparations for ${department}`,
          { department, preparationCount: departmentPreparations.length }
        )
      } catch (error) {
        DebugUtils.warn(
          MODULE_NAME,
          'Recipes store not available, will only show preparations with existing batches',
          { error }
        )
        departmentPreparations = []
      }

      // ✅ FIXED: Get preparation IDs for this department from recipes store
      const departmentPreparationIds = new Set(departmentPreparations.map(p => p.id))

      // ✅ FIXED: Filter batches by preparation department, not batch department
      // ⚠️ Include negative batches (currentQuantity < 0) for display
      // ✅ FIX: Exclude reconciled negative batches from balance calculation
      const activeBatches = this.batches.filter(
        b =>
          departmentPreparationIds.has(b.preparationId) &&
          b.status === 'active' &&
          b.currentQuantity !== 0 && // Include both positive and negative quantities
          !b.reconciledAt // ✅ FIX: Exclude reconciled negative batches
      )

      // Group batches by preparationId
      const preparationGroups = new Map<string, PreparationBatch[]>()
      for (const batch of activeBatches) {
        const key = batch.preparationId
        if (!preparationGroups.has(key)) {
          preparationGroups.set(key, [])
        }
        preparationGroups.get(key)!.push(batch)
      }

      // ✅ FIXED: Calculate actual balances from batches using preparation department
      // ✅ FIX: Exclude reconciled negative batches from balance calculation
      const actualBalances = new Map<string, number>()
      const allBatches = this.batches.filter(
        b => departmentPreparationIds.has(b.preparationId) && !b.reconciledAt // ✅ FIX
      )

      allBatches.forEach(batch => {
        if (batch.status === 'active') {
          const currentBalance = actualBalances.get(batch.preparationId) || 0
          actualBalances.set(batch.preparationId, currentBalance + batch.currentQuantity)
        }
      })

      // Create balances for preparations with positive stock
      for (const [, batches] of preparationGroups) {
        const firstBatch = batches[0]
        const preparationId = firstBatch.preparationId
        const preparationInfo = this.getPreparationInfo(preparationId)

        const totalQuantity =
          Math.round(batches.reduce((sum, b) => sum + b.currentQuantity, 0) * 10000) / 10000
        const totalValue = Math.round(batches.reduce((sum, b) => sum + b.totalValue, 0) * 100) / 100
        const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0

        const sortedBatches = batches.sort(
          (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
        )

        const latestCost = sortedBatches[sortedBatches.length - 1].costPerUnit

        let costTrend: 'up' | 'down' | 'stable' = 'stable'
        if (sortedBatches.length > 1) {
          const oldestCost = sortedBatches[0].costPerUnit
          if (latestCost > oldestCost * 1.05) costTrend = 'up'
          else if (latestCost < oldestCost * 0.95) costTrend = 'down'
        }

        const belowMinStock = totalQuantity < 200 // 200g/ml for preparations

        const now = new Date()
        const hasExpired = sortedBatches.some(batch => {
          if (!batch.expiryDate) return false
          return new Date(batch.expiryDate) < now
        })

        const hasNearExpiry = sortedBatches.some(batch => {
          if (!batch.expiryDate) return false
          const expiry = new Date(batch.expiryDate)
          const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          return diffDays <= 1 && diffDays > 0 // 1 day for preparations
        })

        // ⭐ PHASE 2: Calculate portion quantity if portionType='portion'
        const portionQuantity =
          preparationInfo.portionType === 'portion' && preparationInfo.portionSize
            ? Math.floor(totalQuantity / preparationInfo.portionSize)
            : undefined

        // ✅ Calculate oldest expiry date for UI display (sort by expiry, get earliest)
        const batchesWithExpiry = sortedBatches.filter(b => b.expiryDate)
        const oldestExpiryDate =
          batchesWithExpiry.length > 0
            ? batchesWithExpiry.sort(
                (a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()
              )[0].expiryDate!
            : ''

        const balance: PreparationBalance = {
          preparationId,
          preparationName: preparationInfo.name,
          department,
          totalQuantity,
          unit: preparationInfo.unit,
          totalValue,
          averageCost,
          latestCost,
          costTrend,
          batches: sortedBatches,
          oldestBatchDate: sortedBatches[0].productionDate,
          newestBatchDate: sortedBatches[sortedBatches.length - 1].productionDate,
          oldestExpiryDate,
          hasExpired,
          hasNearExpiry,
          belowMinStock,
          lastCalculated: TimeUtils.getCurrentLocalISO(),
          // ⭐ PHASE 2: Portion type support for UI display
          portionType: preparationInfo.portionType,
          portionSize: preparationInfo.portionSize,
          portionQuantity
        }

        this.balances.push(balance)
      }

      // ✅ REMOVED: Don't add preparations without stock
      // Only show preparations that have or had batches in this department
      // This prevents showing all catalog preparations as zero-stock balances

      // Add preparations that have consumed batches but aren't in catalog
      // ✅ FIX: Only include active preparations (skip inactive/archived)
      const allBatchPreparations = new Set<string>()
      this.batches
        .filter(b => b.department === department && departmentPreparationIds.has(b.preparationId))
        .forEach(batch => {
          allBatchPreparations.add(batch.preparationId)
        })

      for (const preparationId of allBatchPreparations) {
        const alreadyExists = this.balances.some(
          b => b.preparationId === preparationId && b.department === department
        )

        if (!alreadyExists) {
          const actualBalance = Math.round((actualBalances.get(preparationId) || 0) * 10000) / 10000
          const preparationInfo = this.getPreparationInfo(preparationId)

          // ✅ Get batches for this preparation (including negative batches)
          const preparationBatches = activeBatches
            .filter(b => b.preparationId === preparationId)
            .sort(
              (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
            )

          // ⭐ PHASE 2: Calculate portion quantity if portionType='portion'
          const portionQuantity =
            preparationInfo.portionType === 'portion' && preparationInfo.portionSize
              ? Math.floor(actualBalance / preparationInfo.portionSize)
              : undefined

          // ✅ Calculate oldest expiry date for UI display
          const batchesWithExpiry = preparationBatches.filter(b => b.expiryDate)
          const oldestExpiryDate =
            batchesWithExpiry.length > 0
              ? batchesWithExpiry.sort(
                  (a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()
                )[0].expiryDate!
              : ''

          const balance: PreparationBalance = {
            preparationId,
            preparationName: preparationInfo.name,
            department,
            totalQuantity: actualBalance,
            unit: preparationInfo.unit,
            totalValue: actualBalance > 0 ? actualBalance * preparationInfo.costPerPortion : 0,
            averageCost: preparationInfo.costPerPortion,
            latestCost: preparationInfo.costPerPortion,
            costTrend: 'stable',
            batches: preparationBatches, // ✅ Include all batches (positive and negative)
            oldestBatchDate:
              preparationBatches.length > 0 ? preparationBatches[0].productionDate : '',
            newestBatchDate:
              preparationBatches.length > 0
                ? preparationBatches[preparationBatches.length - 1].productionDate
                : '',
            oldestExpiryDate,
            hasExpired: false,
            hasNearExpiry: false,
            belowMinStock: true,
            lastCalculated: TimeUtils.getCurrentLocalISO(),
            // ⭐ PHASE 2: Portion type support for UI display
            portionType: preparationInfo.portionType,
            portionSize: preparationInfo.portionSize,
            portionQuantity
          }

          this.balances.push(balance)
        }
      }

      // ✅ NEW: Add ALL active preparations from catalog (even without batches)
      // This ensures new preparations are visible immediately after creation
      const recipesStore = useRecipesStore()
      const allDepartmentPreparations = recipesStore.activePreparations.filter(
        (p: any) => p.isActive && p.department === department
      )

      // Add preparations that don't have batches yet
      let addedWithoutBatches = 0
      for (const prep of allDepartmentPreparations) {
        const alreadyExists = this.balances.some(
          b => b.preparationId === prep.id && b.department === department
        )

        if (!alreadyExists) {
          const balance: PreparationBalance = {
            preparationId: prep.id,
            preparationName: prep.name,
            department,
            totalQuantity: 0,
            unit: prep.outputUnit,
            totalValue: 0,
            averageCost: 0,
            latestCost: 0,
            costTrend: 'stable',
            batches: [],
            oldestBatchDate: '',
            newestBatchDate: '',
            oldestExpiryDate: '', // No batches = no expiry
            hasExpired: false,
            hasNearExpiry: false,
            belowMinStock: true,
            lastCalculated: TimeUtils.getCurrentLocalISO(),
            // ⭐ PHASE 2: Portion type support for UI display
            portionType: prep.portionType || 'weight',
            portionSize: prep.portionSize,
            portionQuantity: 0 // No stock = 0 portions
          }

          this.balances.push(balance)
          addedWithoutBatches++
        }
      }

      // Single summary log instead of per-item logging
      if (addedWithoutBatches > 0) {
        DebugUtils.debug(
          MODULE_NAME,
          `Added ${addedWithoutBatches} catalog preparations without batches for ${department}`
        )
      }

      const departmentBalances = this.balances.filter(b => b.department === department)
      const positiveStock = departmentBalances.filter(b => b.totalQuantity > 0).length
      const zeroStock = departmentBalances.filter(b => b.totalQuantity === 0).length
      const negativeStock = departmentBalances.filter(b => b.totalQuantity < 0).length

      DebugUtils.info(
        MODULE_NAME,
        `Balances recalculated for ${department} using batch-based approach`,
        {
          department,
          totalPreparationsInCatalog: departmentPreparations.length,
          preparationsWithPositiveStock: positiveStock,
          preparationsWithZeroStock: zeroStock,
          preparationsWithNegativeStock: negativeStock,
          totalBalances: departmentBalances.length,
          activeBatchesProcessed: activeBatches.length,
          totalBatchesConsidered: allBatches.length
        }
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate preparation balances', { error })
      throw error
    }
  }
}

export const preparationService = new PreparationService()
