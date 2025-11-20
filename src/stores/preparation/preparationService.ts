// src/stores/preparation/preparationService.ts - Supabase-only service

import type { Preparation, PreparationIngredient } from '@/stores/recipes/types'
import type {
  PreparationBatch,
  PreparationOperation,
  PreparationBalance,
  PreparationDepartment,
  PreparationInventoryDocument,
  PreparationInventoryItem,
  PreparationWriteOffStatistics,
  CreatePreparationReceiptData,
  CreatePreparationCorrectionData,
  CreatePreparationWriteOffData,
  CreatePreparationInventoryData,
  BatchAllocation,
  PreparationCategory,
  PreparationCategoryDisplay
} from './types'
import { DebugUtils, TimeUtils } from '@/utils'
import { ENV } from '@/config/environment'
import { supabase } from '@/supabase/client'
import {
  preparationFromSupabase,
  preparationsFromSupabase,
  preparationToSupabaseInsert,
  preparationToSupabaseUpdate,
  preparationIngredientsFromSupabase,
  preparationBatchesFromSupabase,
  preparationOperationsFromSupabase,
  preparationBatchFromSupabase,
  preparationOperationToSupabaseInsert,
  preparationIngredientToSupabase,
  generateBatchNumber
} from './supabaseMappers'
import {
  mapPreparationCategoriesFromRows,
  mapPreparationCategoriesToDisplay,
  mapPreparationCategoryFromRow,
  type PreparationCategoryRow
} from './categoryMappers'

const MODULE_NAME = 'PreparationService'

// Helper: Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return ENV.useSupabase && !!supabase
}

export class PreparationsService {
  private static instance: PreparationsService
  private cache: Map<string, any> = new Map()
  private cacheTimestamps: Map<string, number> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  static getInstance(): PreparationsService {
    if (!PreparationsService.instance) {
      PreparationsService.instance = new PreparationsService()
    }
    return PreparationsService.instance
  }

  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key)
    return timestamp ? Date.now() - timestamp < this.CACHE_TTL : false
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, data)
    this.cacheTimestamps.set(key, Date.now())
  }

  private getCache<T>(key: string): T | null {
    if (this.isCacheValid(key)) {
      return this.cache.get(key) || null
    }
    this.cache.delete(key)
    this.cacheTimestamps.delete(key)
    return null
  }

  private clearCache(key: string): void {
    this.cache.delete(key)
    this.cacheTimestamps.delete(key)
  }

  // =============================================
  // RECIPE OPERATIONS (Existing functionality)
  // =============================================

  async fetchPreparations(): Promise<Preparation[]> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning empty array')
      return []
    }

    const cacheKey = 'preparations'
    const cached = this.getCache<Preparation[]>(cacheKey)
    if (cached) {
      DebugUtils.info(MODULE_NAME, 'Returning cached preparations')
      return cached
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Fetching preparations from Supabase')

      // Fetch preparations
      const { data: preparationsData, error: preparationsError } = await (supabase as any)
        .from('preparations')
        .select('*')
        .order('created_at', { ascending: false })

      if (preparationsError) {
        DebugUtils.error(MODULE_NAME, 'Error fetching preparations', { preparationsError })
        return []
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('preparation_categories')
        .select('*')
        .eq('is_active', true)

      if (categoriesError) {
        DebugUtils.error(MODULE_NAME, 'Error fetching categories', { categoriesError })
      }

      // Create category map
      const categoryMap = new Map()
      if (categoriesData) {
        categoriesData.forEach((cat: any) => {
          categoryMap.set(cat.id, {
            key: cat.key,
            name: cat.name,
            icon: cat.icon,
            emoji: cat.emoji,
            color: cat.color
          })
        })
      }

      const preparations = preparationsData ? preparationsFromSupabase(preparationsData) : []

      // Load ingredients for each preparation and attach category
      for (const prep of preparations) {
        prep.ingredients = await this.fetchPreparationIngredients(prep.id)

        // Attach category information if available
        if (prep.categoryId && categoryMap.has(prep.categoryId)) {
          prep.category = categoryMap.get(prep.categoryId)
        }
      }

      this.setCache(cacheKey, preparations)
      DebugUtils.info(MODULE_NAME, `Fetched ${preparations.length} preparations with categories`)

      return preparations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch preparations', { error })
      return []
    }
  }

  private async fetchPreparationIngredients(
    preparationId: string
  ): Promise<PreparationIngredient[]> {
    if (!isSupabaseAvailable()) return []

    try {
      const { data, error } = await (supabase as any)
        .from('preparation_ingredients')
        .select('*')
        .eq('preparation_id', preparationId)
        .order('sort_order')

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Error fetching preparation ingredients', {
          error,
          preparationId
        })
        return []
      }

      return data ? preparationIngredientsFromSupabase(data) : []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch preparation ingredients', {
        error,
        preparationId
      })
      return []
    }
  }

  async createPreparation(
    data: Partial<Preparation> & { ingredients?: PreparationIngredient[] }
  ): Promise<Preparation | null> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, cannot create preparation')
      return null
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation', { name: data.name })

      const insertData = preparationToSupabaseInsert({
        ...data,
        id: '', // Will be generated by Supabase
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      const { data: result, error } = await (supabase as any)
        .from('preparations')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Error creating preparation', { error })
        return null
      }

      const preparation = result ? preparationFromSupabase(result) : null

      if (preparation && data.ingredients) {
        // Save ingredients
        for (const ingredient of data.ingredients) {
          await this.createPreparationIngredient(preparation.id, ingredient)
        }
        // Load ingredients to complete the preparation object
        preparation.ingredients = await this.fetchPreparationIngredients(preparation.id)
      }

      this.clearAllCache()
      DebugUtils.info(MODULE_NAME, 'Preparation created successfully', { id: preparation?.id })

      return preparation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation', { error })
      return null
    }
  }

  private async createPreparationIngredient(
    preparationId: string,
    ingredient: PreparationIngredient
  ): Promise<boolean> {
    if (!isSupabaseAvailable()) return false

    try {
      const insertData = preparationIngredientToSupabase({
        ...ingredient,
        id: '', // Will be generated
        preparationId
      })

      const { error } = await (supabase as any).from('preparation_ingredients').insert({
        ...insertData,
        preparation_id: preparationId
      })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Error creating preparation ingredient', { error })
        return false
      }

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation ingredient', { error })
      return false
    }
  }

  async updatePreparation(id: string, data: Partial<Preparation>): Promise<Preparation | null> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, cannot update preparation')
      return null
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Updating preparation', { id })

      const updateData = preparationToSupabaseUpdate(data)

      const { data: result, error } = await (supabase as any)
        .from('preparations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Error updating preparation', { error })
        return null
      }

      this.clearAllCache()
      const preparation = result ? preparationFromSupabase(result) : null

      DebugUtils.info(MODULE_NAME, 'Preparation updated successfully', { id })

      return preparation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update preparation', { error })
      return null
    }
  }

  // =============================================
  // STORAGE OPERATIONS (New functionality)
  // =============================================

  async fetchBatches(preparationId?: string): Promise<PreparationBatch[]> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning empty batches')
      return []
    }

    const cacheKey = `batches${preparationId ? `_${preparationId}` : ''}`
    const cached = this.getCache<PreparationBatch[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      let query = (supabase as any)
        .from('preparation_batches')
        .select('*')
        .order('created_at', { ascending: false })

      if (preparationId) {
        query = query.eq('preparation_id', preparationId)
      }

      const { data, error } = await query

      const batches = data ? preparationBatchesFromSupabase(data) : []

      this.setCache(cacheKey, batches)

      return batches
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch batches', { error })
      return []
    }
  }

  async createBatch(data: {
    preparationId: string
    quantity: number
    unit: string
    costPerUnit?: number
    department?: PreparationDepartment
    notes?: string
    responsiblePerson?: string
    producedAt?: string
    expiresAt?: string
  }): Promise<PreparationBatch | null> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, cannot create batch')
      return null
    }

    try {
      const now = TimeUtils.getCurrentLocalISO()
      const batchNumber = generateBatchNumber()

      const batchData = {
        preparation_id: data.preparationId,
        batch_number: batchNumber,
        initial_quantity: data.quantity,
        current_quantity: data.quantity,
        unit: data.unit,
        cost_per_unit: data.costPerUnit || 0,
        created_at: now,
        produced_at: data.producedAt || now,
        expires_at: data.expiresAt || null,
        department: data.department || 'kitchen',
        status: 'active',
        notes: data.notes || null,
        created_by: data.responsiblePerson || null
      }

      const { data: result, error } = await (supabase as any)
        .from('preparation_batches')
        .insert(batchData)
        .select()
        .single()

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Error creating batch', { error })
        return null
      }

      const batch = result ? preparationBatchFromSupabase(result) : null

      // Create production operation
      if (batch) {
        await this.createOperation({
          preparationId: data.preparationId,
          batchId: batch.id,
          operationType: 'production',
          quantity: data.quantity,
          unit: data.unit,
          department: data.department || 'kitchen',
          costPerUnit: data.costPerUnit,
          performedBy: data.responsiblePerson
        })
      }

      this.clearAllCache()
      DebugUtils.info(MODULE_NAME, 'Batch created successfully', { id: batch?.id })

      return batch
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create batch', { error })
      return null
    }
  }

  private async createOperation(data: {
    preparationId: string
    batchId?: string
    operationType: 'production' | 'consumption' | 'write_off' | 'adjustment'
    quantity: number
    unit: string
    department: PreparationDepartment
    costPerUnit?: number
    performedBy?: string
    referenceId?: string
    notes?: string
  }): Promise<boolean> {
    if (!isSupabaseAvailable()) return false

    try {
      const operationData = preparationOperationToSupabaseInsert(
        data.operationType,
        {
          preparationId: data.preparationId,
          department: data.department,
          performedBy: data.performedBy,
          referenceId: data.referenceId,
          notes: data.notes
        },
        data.batchId
      )

      const { error } = await (supabase as any).from('preparation_operations').insert(operationData)

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Error creating operation', { error })
        return false
      }

      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create operation', { error })
      return false
    }
  }

  async fetchBalances(department?: PreparationDepartment): Promise<PreparationBalance[]> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning empty balances')
      return []
    }

    const cacheKey = `balances${department ? `_${department}` : ''}`
    const cached = this.getCache<PreparationBalance[]>(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // Fetch preparations and batches in parallel
      const [preparationsResult, batchesResult, operationsResult] = await Promise.all([
        this.fetchPreparations(),
        this.fetchBatches(),
        this.fetchOperations()
      ])

      const preparations = preparationsResult
      const batches = batchesResult.filter(b => !department || b.department === department)
      const operations = operationsResult.filter(o => !department || o.department === department)

      // Calculate balances from active batches
      const now = new Date()
      const settings = await this.getPreparationSettings()
      const balances: PreparationBalance[] = []

      // Group batches by preparation and department
      const batchesByPreparation = new Map<string, PreparationBatch[]>()
      batches.forEach(batch => {
        const key = `${batch.preparationId}-${batch.department}`
        if (!batchesByPreparation.has(key)) {
          batchesByPreparation.set(key, [])
        }
        batchesByPreparation.get(key)!.push(batch)
      })

      // Calculate balances for each preparation
      for (const preparation of preparations) {
        const departments = department
          ? [department]
          : (['kitchen', 'bar'] as PreparationDepartment[])

        for (const dept of departments) {
          const key = `${preparation.id}-${dept}`
          const preparationBatches = batchesByPreparation.get(key) || []
          const activeBatches = preparationBatches.filter(
            b => b.status === 'active' && b.currentQuantity > 0
          )

          if (activeBatches.length === 0 && !department) continue // Skip empty balances unless specific department requested

          // Calculate totals from active batches
          const totalQuantity = activeBatches.reduce((sum, b) => sum + b.currentQuantity, 0)
          const totalValue = activeBatches.reduce(
            (sum, b) => sum + b.currentQuantity * b.costPerUnit,
            0
          )
          const averageCost = totalQuantity > 0 ? totalValue / totalQuantity : 0

          // Calculate expiry status
          const expiredBatches = activeBatches.filter(
            b => b.expiresAt && new Date(b.expiresAt) < now
          )
          const nearExpiryBatches = activeBatches.filter(b => {
            if (!b.expiresAt) return false
            const expiryDate = new Date(b.expiresAt)
            const daysUntilExpiry = Math.ceil(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
            return daysUntilExpiry >= 0 && daysUntilExpiry <= settings.expiryWarningDays
          })

          // Get last operation date for this preparation and department
          const preparationOperations = operations.filter(
            o => o.preparationId === preparation.id && o.department === dept
          )
          const lastOperationDate =
            preparationOperations.length > 0 ? preparationOperations[0].performedAt : undefined

          // Calculate low stock status (using default 100g/ml if not set)
          const minStockThreshold = 100
          const belowMinStock = totalQuantity <= minStockThreshold

          // Set batch dates
          let oldestBatchDate: string | undefined
          let newestBatchDate: string | undefined
          if (activeBatches.length > 0) {
            const sortedBatches = activeBatches.sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
            oldestBatchDate = sortedBatches[0].createdAt
            newestBatchDate = sortedBatches[sortedBatches.length - 1].createdAt
          }

          // Create balance object
          const balance: PreparationBalance = {
            id: `${preparation.id}-${dept}`, // Composite ID
            preparationId: preparation.id,
            preparationName: preparation.name,
            department: dept,
            totalQuantity,
            unit: preparation.outputUnit || 'gram',
            totalValue,
            averageCost,
            latestCost:
              activeBatches.length > 0 ? activeBatches[activeBatches.length - 1].costPerUnit : 0,
            costTrend: 'stable', // TODO: Calculate based on historical data
            batches: activeBatches,
            oldestBatchDate,
            newestBatchDate,
            hasExpired: expiredBatches.length > 0,
            hasNearExpiry: nearExpiryBatches.length > 0,
            belowMinStock,
            lastConsumptionDate: lastOperationDate,
            lastCalculated: now.toISOString()
          }

          balances.push(balance)
        }
      }

      this.setCache(cacheKey, balances)

      DebugUtils.info(MODULE_NAME, `Calculated ${balances.length} balances from active batches`)

      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate balances', { error })
      return []
    }
  }

  private async getPreparationSettings() {
    // TODO: Load from settings table or use defaults
    return {
      expiryWarningDays: 1,
      lowStockMultiplier: 1.2
    }
  }

  async fetchOperations(preparationId?: string, limit = 50): Promise<PreparationOperation[]> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning empty operations')
      return []
    }

    try {
      let query = (supabase as any)
        .from('preparation_operations')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(limit)

      if (preparationId) {
        query = query.eq('preparation_id', preparationId)
      }

      const { data, error } = await query

      return data ? preparationOperationsFromSupabase(data) : []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch operations', { error })
      return []
    }
  }

  // =============================================
  // INITIALIZATION METHODS
  // =============================================

  async initialize(): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'Initializing preparation service')

    try {
      await Promise.all([
        this.fetchPreparations(),
        this.fetchBatches(),
        this.fetchBalances(),
        this.fetchOperations()
      ])

      DebugUtils.info(MODULE_NAME, '✅ Preparation service initialized successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to initialize preparation service', { error })
      throw error
    }
  }

  // =============================================
  // GETTER METHODS (Called by Store)
  // =============================================

  async getBalances(department?: PreparationDepartment): Promise<PreparationBalance[]> {
    return this.fetchBalances(department)
  }

  async getBatches(department?: PreparationDepartment): Promise<PreparationBatch[]> {
    // If department specified, filter batches by department
    const batches = await this.fetchBatches()
    return department ? batches.filter(b => b.department === department) : batches
  }

  async getOperations(department?: PreparationDepartment): Promise<PreparationOperation[]> {
    // If department specified, filter operations by department
    const operations = await this.fetchOperations()
    return department ? operations.filter(o => o.department === department) : operations
  }

  async getInventories(
    department?: PreparationDepartment
  ): Promise<PreparationInventoryDocument[]> {
    // TODO: Implement inventory tracking when database tables are ready
    DebugUtils.warn(MODULE_NAME, 'Inventory tracking not implemented yet')
    return []
  }

  // =============================================
  // CREATION METHODS (Called by Store)
  // =============================================

  async createCorrection(data: CreatePreparationCorrectionData): Promise<PreparationOperation> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation correction', {
        department: data.department,
        reason: data.correctionDetails.reason,
        itemCount: data.items.length
      })

      const now = TimeUtils.getCurrentLocalISO()
      const documentNumber = `PREP-COR-${Date.now()}`

      // Prepare all operation items with batch allocations
      const operationItems: any[] = []
      let totalValue = 0

      // Process each correction item with FIFO allocation
      for (const item of data.items) {
        // Get preparation details
        const preparation = await this.getPreparationById(item.preparationId)
        if (!preparation) {
          throw new Error(`Preparation not found: ${item.preparationId}`)
        }

        // Use FIFO allocation for negative corrections (similar to write-off)
        const allocations = await this.calculateFifoAllocation(
          item.preparationId,
          data.department,
          Math.abs(item.quantity)
        )

        if (allocations.length === 0 && item.quantity < 0) {
          throw new Error(`Insufficient stock for correction: ${preparation.name}`)
        }

        let totalAllocated = 0
        let totalCost = 0

        // Update each batch and create operation records
        for (const allocation of allocations) {
          // Fetch current batch to get current quantity
          const { data: batchData, error: fetchError } = await (supabase as any)
            .from('preparation_batches')
            .select('current_quantity')
            .eq('id', allocation.batchId)
            .single()

          if (fetchError || !batchData) {
            DebugUtils.error(MODULE_NAME, 'Error fetching batch for update', { fetchError })
            throw fetchError || new Error('Batch not found')
          }

          // Calculate new quantity (item.quantity can be positive or negative)
          const newQuantity = batchData.current_quantity + item.quantity

          // Update batch quantity
          const { error: updateError } = await (supabase as any)
            .from('preparation_batches')
            .update({
              current_quantity: newQuantity,
              status: newQuantity <= 0 ? 'depleted' : 'active'
            })
            .eq('id', allocation.batchId)

          if (updateError) {
            DebugUtils.error(MODULE_NAME, 'Error updating batch quantity', { updateError })
            throw updateError
          }

          // Create operation record
          const operationData = {
            preparation_id: item.preparationId,
            batch_id: allocation.batchId,
            operation_type: 'adjustment',
            quantity: item.quantity, // Can be positive or negative
            unit: preparation.outputUnit,
            cost_per_unit: allocation.costPerUnit,
            department: data.department,
            reference_id: documentNumber,
            reference_type: 'correction',
            notes: `Correction reason: ${data.correctionDetails.reason}${item.notes ? ` - ${item.notes}` : ''}`,
            performed_at: now,
            performed_by: data.responsiblePerson
          }

          const { error: operationError } = await (supabase as any)
            .from('preparation_operations')
            .insert(operationData)

          if (operationError) {
            DebugUtils.error(MODULE_NAME, 'Error creating correction operation', {
              operationError
            })
            throw operationError
          }

          totalAllocated += allocation.quantity
          totalCost += allocation.quantity * allocation.costPerUnit
        }

        operationItems.push({
          id: `cor-${item.preparationId}-${Date.now()}`,
          preparationId: item.preparationId,
          preparationName: preparation.name,
          quantity: item.quantity,
          unit: preparation.outputUnit,
          batchAllocations: allocations,
          totalCost,
          averageCostPerUnit: totalAllocated > 0 ? totalCost / totalAllocated : 0,
          notes: item.notes
        })

        totalValue += totalCost
      }

      // Update balances
      this.clearCache(`balances_${data.department}`)

      const operation: PreparationOperation = {
        id: documentNumber,
        operationType: 'correction',
        documentNumber,
        operationDate: now,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        correctionDetails: data.correctionDetails,
        status: 'confirmed',
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
        closedAt: null,
        createdBy: data.responsiblePerson,
        updatedBy: data.responsiblePerson
      }

      DebugUtils.info(MODULE_NAME, 'Preparation correction created successfully', {
        documentNumber,
        itemCount: operationItems.length,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation correction', { error })
      throw error
    }
  }

  async createReceipt(data: CreatePreparationReceiptData): Promise<PreparationOperation> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation receipt', {
        department: data.department,
        itemCount: data.items.length
      })

      const now = TimeUtils.getCurrentLocalISO()
      const documentNumber = `PREP-RCP-${Date.now()}`

      // Prepare all operation items with batch allocations
      const operationItems: any[] = []
      let totalValue = 0

      // Create batches and operation items for each item in the receipt
      for (const item of data.items) {
        const batchNumber = generateBatchNumber()
        const itemValue = item.quantity * item.costPerUnit

        // Get preparation details
        const preparation = await this.getPreparationById(item.preparationId)
        if (!preparation) {
          throw new Error(`Preparation not found: ${item.preparationId}`)
        }

        // Create batch
        const batchData = {
          preparation_id: item.preparationId,
          batch_number: batchNumber,
          initial_quantity: item.quantity,
          current_quantity: item.quantity,
          unit: preparation.outputUnit,
          cost_per_unit: item.costPerUnit,
          produced_at: now,
          expires_at: item.expiryDate || null,
          department: data.department,
          status: 'active',
          notes: item.notes || null,
          created_by: data.responsiblePerson
        }

        const { data: batchResult, error: batchError } = await (supabase as any)
          .from('preparation_batches')
          .insert(batchData)
          .select()
          .single()

        if (batchError) {
          DebugUtils.error(MODULE_NAME, 'Error creating batch', { batchError })
          throw batchError
        }

        // Create operation record for this batch
        const operationData = {
          preparation_id: item.preparationId,
          batch_id: batchResult.id,
          operation_type: 'production',
          quantity: item.quantity,
          unit: preparation.outputUnit,
          cost_per_unit: item.costPerUnit,
          department: data.department,
          reference_id: documentNumber,
          reference_type: 'receipt',
          notes: item.notes || null,
          performed_at: now,
          performed_by: data.responsiblePerson
        }

        const { error: operationError } = await (supabase as any)
          .from('preparation_operations')
          .insert(operationData)

        if (operationError) {
          DebugUtils.error(MODULE_NAME, 'Error creating operation', { operationError })
          throw operationError
        }

        operationItems.push({
          id: batchResult.id,
          preparationId: item.preparationId,
          preparationName: preparation.name,
          quantity: item.quantity,
          unit: preparation.outputUnit,
          batchAllocations: [
            {
              batchId: batchResult.id,
              batchNumber: batchNumber,
              quantity: item.quantity,
              costPerUnit: item.costPerUnit,
              batchDate: now
            }
          ],
          totalCost: itemValue,
          averageCostPerUnit: item.costPerUnit,
          notes: item.notes,
          expiryDate: item.expiryDate
        })

        totalValue += itemValue
      }

      // Update balances (trigger should handle this automatically, but we can force refresh)
      this.clearCache(`balances_${data.department}`)

      const operation: PreparationOperation = {
        id: documentNumber,
        operationType: 'receipt',
        documentNumber,
        operationDate: now,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        status: 'confirmed',
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
        closedAt: null,
        createdBy: data.responsiblePerson,
        updatedBy: data.responsiblePerson
      }

      DebugUtils.info(MODULE_NAME, 'Preparation receipt created successfully', {
        documentNumber,
        itemCount: operationItems.length,
        totalValue
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation receipt', { error })
      throw error
    }
  }

  async createWriteOff(data: CreatePreparationWriteOffData): Promise<PreparationOperation> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation write-off', {
        department: data.department,
        reason: data.reason,
        itemCount: data.items.length
      })

      const now = TimeUtils.getCurrentLocalISO()
      const documentNumber = `PREP-WO-${Date.now()}`

      // Prepare all operation items with batch allocations
      const operationItems: any[] = []
      let totalValue = 0

      // Process each write-off item with FIFO allocation
      for (const item of data.items) {
        // Get preparation details
        const preparation = await this.getPreparationById(item.preparationId)
        if (!preparation) {
          throw new Error(`Preparation not found: ${item.preparationId}`)
        }

        // Use FIFO allocation to determine which batches to write off
        const allocations = await this.calculateFifoAllocation(
          item.preparationId,
          data.department,
          item.quantity
        )

        if (allocations.length === 0) {
          throw new Error(`Insufficient stock for ${preparation.name}`)
        }

        let totalAllocated = 0
        let totalCost = 0

        // Update each batch and create operation records
        for (const allocation of allocations) {
          // Fetch current batch to get current quantity
          const { data: batchData, error: fetchError } = await (supabase as any)
            .from('preparation_batches')
            .select('current_quantity')
            .eq('id', allocation.batchId)
            .single()

          if (fetchError || !batchData) {
            DebugUtils.error(MODULE_NAME, 'Error fetching batch for update', { fetchError })
            throw fetchError || new Error('Batch not found')
          }

          // Calculate new quantity
          const newQuantity = batchData.current_quantity - allocation.quantity

          // Update batch quantity
          const { error: updateError } = await (supabase as any)
            .from('preparation_batches')
            .update({
              current_quantity: newQuantity,
              status: newQuantity <= 0 ? 'depleted' : 'active'
            })
            .eq('id', allocation.batchId)

          if (updateError) {
            DebugUtils.error(MODULE_NAME, 'Error updating batch quantity', { updateError })
            throw updateError
          }

          // Create operation record for this batch write-off
          const operationData = {
            preparation_id: item.preparationId,
            batch_id: allocation.batchId,
            operation_type: 'write_off',
            quantity: -allocation.quantity, // Negative for write-off
            unit: preparation.outputUnit,
            cost_per_unit: allocation.costPerUnit,
            department: data.department,
            reference_id: documentNumber,
            reference_type: 'write_off',
            notes: `Write-off reason: ${data.reason}${item.notes ? ` - ${item.notes}` : ''}`,
            performed_at: now,
            performed_by: data.responsiblePerson
          }

          const { error: operationError } = await (supabase as any)
            .from('preparation_operations')
            .insert(operationData)

          if (operationError) {
            DebugUtils.error(MODULE_NAME, 'Error creating write-off operation', {
              operationError
            })
            throw operationError
          }

          totalAllocated += allocation.quantity
          totalCost += allocation.quantity * allocation.costPerUnit
        }

        operationItems.push({
          id: `wo-${item.preparationId}-${Date.now()}`,
          preparationId: item.preparationId,
          preparationName: preparation.name,
          quantity: item.quantity,
          unit: preparation.outputUnit,
          batchAllocations: allocations,
          totalCost,
          averageCostPerUnit: totalCost / totalAllocated,
          notes: item.notes
        })

        totalValue += totalCost
      }

      // Update balances (trigger should handle this automatically, but we can force refresh)
      this.clearCache(`balances_${data.department}`)

      const operation: PreparationOperation = {
        id: documentNumber,
        operationType: 'write_off',
        documentNumber,
        operationDate: now,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        writeOffDetails: {
          reason: data.reason,
          affectsKPI: !['education', 'test'].includes(data.reason),
          notes: data.notes
        },
        status: 'confirmed',
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
        closedAt: null,
        createdBy: data.responsiblePerson,
        updatedBy: data.responsiblePerson
      }

      DebugUtils.info(MODULE_NAME, 'Preparation write-off created successfully', {
        documentNumber,
        itemCount: operationItems.length,
        totalValue,
        reason: data.reason
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create preparation write-off', { error })
      throw error
    }
  }

  async getWriteOffStatistics(
    department?: PreparationDepartment,
    dateFrom?: string,
    dateTo?: string
  ): Promise<PreparationWriteOffStatistics> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available for statistics')
      return this.getEmptyStatistics()
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Calculating write-off statistics', {
        department,
        dateFrom,
        dateTo
      })

      // Query write-off operations
      let query = (supabase as any)
        .from('preparation_operations')
        .select('*')
        .eq('operation_type', 'write_off')

      if (department) {
        query = query.eq('department', department)
      }
      if (dateFrom) {
        query = query.gte('performed_at', dateFrom)
      }
      if (dateTo) {
        query = query.lte('performed_at', dateTo)
      }

      const { data, error } = await query

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Error fetching write-off operations', { error })
        return this.getEmptyStatistics()
      }

      // Initialize statistics
      const stats = this.getEmptyStatistics()

      // Process each operation (note: operations may reference multiple batches)
      for (const operation of data || []) {
        const value = Math.abs(operation.quantity) * (operation.cost_per_unit || 0)

        // Extract write-off reason from notes (format: "Write-off reason: expired - ...")
        const reason = this.extractWriteOffReason(operation.notes)
        const isKPIAffecting = !['education', 'test'].includes(reason)

        // Update totals
        stats.total.count++
        stats.total.value += value

        // Update by department
        const dept = operation.department as 'kitchen' | 'bar'
        stats.byDepartment[dept].total += value

        // Update by KPI category
        if (isKPIAffecting) {
          stats.kpiAffecting.count++
          stats.kpiAffecting.value += value
          stats.byDepartment[dept].kpiAffecting += value

          // Update specific reason within KPI-affecting
          if (reason in stats.kpiAffecting.reasons) {
            stats.kpiAffecting.reasons[reason as keyof typeof stats.kpiAffecting.reasons].count++
            stats.kpiAffecting.reasons[reason as keyof typeof stats.kpiAffecting.reasons].value +=
              value
          }
        } else {
          stats.nonKpiAffecting.count++
          stats.nonKpiAffecting.value += value
          stats.byDepartment[dept].nonKpiAffecting += value

          // Update specific reason within non-KPI
          if (reason in stats.nonKpiAffecting.reasons) {
            stats.nonKpiAffecting.reasons[reason as keyof typeof stats.nonKpiAffecting.reasons]
              .count++
            stats.nonKpiAffecting.reasons[
              reason as keyof typeof stats.nonKpiAffecting.reasons
            ].value += value
          }
        }
      }

      DebugUtils.info(MODULE_NAME, 'Write-off statistics calculated', {
        totalCount: stats.total.count,
        totalValue: stats.total.value
      })

      return stats
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off statistics', { error })
      return this.getEmptyStatistics()
    }
  }

  private getEmptyStatistics(): PreparationWriteOffStatistics {
    return {
      total: { count: 0, value: 0 },
      kpiAffecting: {
        count: 0,
        value: 0,
        reasons: {
          expired: { count: 0, value: 0 },
          spoiled: { count: 0, value: 0 },
          contaminated: { count: 0, value: 0 },
          overproduced: { count: 0, value: 0 },
          quality_control: { count: 0, value: 0 },
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
  }

  private extractWriteOffReason(notes: string | null): string {
    if (!notes) return 'other'
    const match = notes.match(/Write-off reason: (\w+)/)
    return match ? match[1] : 'other'
  }

  async startInventory(
    data: CreatePreparationInventoryData
  ): Promise<PreparationInventoryDocument> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Starting preparation inventory', {
        department: data.department
      })

      const now = TimeUtils.getCurrentLocalISO()
      const documentNumber = `PREP-INV-${Date.now()}`

      // Get all balances for the department
      const balances = await this.getBalances(data.department)

      // Create inventory items from current balances
      const inventoryItems: PreparationInventoryItem[] = balances.map(balance => ({
        id: `inv-item-${balance.preparationId}`,
        preparationId: balance.preparationId,
        preparationName: balance.preparationName,
        systemQuantity: balance.totalQuantity,
        actualQuantity: 0, // To be filled by user during counting
        difference: 0,
        unit: balance.unit,
        averageCost: balance.averageCost,
        valueDifference: 0,
        confirmed: false
      }))

      const inventoryDocument: PreparationInventoryDocument = {
        id: documentNumber,
        documentNumber,
        inventoryDate: now,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: inventoryItems,
        totalItems: inventoryItems.length,
        totalDiscrepancies: 0,
        totalValueDifference: 0,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        closedAt: null,
        createdBy: data.responsiblePerson,
        updatedBy: data.responsiblePerson
      }

      // Store inventory document in localStorage (or could be in Supabase)
      // For now, we'll return it and let the store handle persistence
      DebugUtils.info(MODULE_NAME, 'Preparation inventory started', {
        documentNumber,
        itemCount: inventoryItems.length
      })

      return inventoryDocument
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
      DebugUtils.info(MODULE_NAME, 'Updating preparation inventory', {
        inventoryId,
        itemCount: items.length
      })

      // Recalculate differences and totals
      let totalDiscrepancies = 0
      let totalValueDifference = 0

      const updatedItems = items.map(item => {
        const difference = item.actualQuantity - item.systemQuantity
        const valueDifference = difference * item.averageCost

        if (difference !== 0) {
          totalDiscrepancies++
        }

        totalValueDifference += valueDifference

        return {
          ...item,
          difference,
          valueDifference
        }
      })

      // This would normally fetch the inventory document from storage and update it
      // For now, we construct the updated document
      const now = TimeUtils.getCurrentLocalISO()

      // In a real implementation, you would fetch the existing inventory document
      // For now, we create a partial update that the store will merge
      const updatedInventory: PreparationInventoryDocument = {
        id: inventoryId,
        documentNumber: inventoryId, // Will be overwritten by existing value
        inventoryDate: now, // Will be overwritten by existing value
        department: 'kitchen', // Will be overwritten by existing value
        responsiblePerson: '', // Will be overwritten by existing value
        items: updatedItems,
        totalItems: updatedItems.length,
        totalDiscrepancies,
        totalValueDifference,
        status: 'draft',
        createdAt: now, // Will be overwritten by existing value
        updatedAt: now,
        closedAt: null,
        createdBy: '', // Will be overwritten by existing value
        updatedBy: ''
      }

      DebugUtils.info(MODULE_NAME, 'Preparation inventory updated', {
        inventoryId,
        totalDiscrepancies,
        totalValueDifference
      })

      return updatedInventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update preparation inventory', { error })
      throw error
    }
  }

  async finalizeInventory(
    inventoryDocument: PreparationInventoryDocument
  ): Promise<PreparationOperation[]> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Finalizing preparation inventory', {
        inventoryId: inventoryDocument.id,
        totalDiscrepancies: inventoryDocument.totalDiscrepancies
      })

      const now = TimeUtils.getCurrentLocalISO()
      const correctionOperations: PreparationOperation[] = []

      // Group items by whether they have discrepancies
      const itemsWithDiscrepancies = inventoryDocument.items.filter(item => item.difference !== 0)

      if (itemsWithDiscrepancies.length === 0) {
        DebugUtils.info(
          MODULE_NAME,
          'No discrepancies found, inventory finalized without corrections'
        )
        return []
      }

      // Create correction operations for items with discrepancies
      for (const item of itemsWithDiscrepancies) {
        const documentNumber = `PREP-INV-COR-${inventoryDocument.id}-${item.preparationId}`

        // Get preparation details
        const preparation = await this.getPreparationById(item.preparationId)
        if (!preparation) {
          DebugUtils.warn(MODULE_NAME, 'Preparation not found for inventory correction', {
            preparationId: item.preparationId
          })
          continue
        }

        // Determine if this is a positive or negative correction
        const isNegative = item.difference < 0
        const quantity = Math.abs(item.difference)

        if (isNegative) {
          // Negative correction - reduce stock using FIFO
          const allocations = await this.calculateFifoAllocation(
            item.preparationId,
            inventoryDocument.department,
            quantity
          )

          if (allocations.length === 0) {
            DebugUtils.warn(MODULE_NAME, 'Insufficient stock for inventory correction', {
              preparationId: item.preparationId,
              required: quantity
            })
            continue
          }

          // Update each batch
          for (const allocation of allocations) {
            // Fetch current batch
            const { data: batchData, error: fetchError } = await (supabase as any)
              .from('preparation_batches')
              .select('current_quantity')
              .eq('id', allocation.batchId)
              .single()

            if (fetchError || !batchData) {
              DebugUtils.error(MODULE_NAME, 'Error fetching batch for inventory correction', {
                fetchError
              })
              continue
            }

            // Calculate new quantity
            const newQuantity = batchData.current_quantity - allocation.quantity

            // Update batch
            const { error: updateError } = await (supabase as any)
              .from('preparation_batches')
              .update({
                current_quantity: newQuantity,
                status: newQuantity <= 0 ? 'depleted' : 'active'
              })
              .eq('id', allocation.batchId)

            if (updateError) {
              DebugUtils.error(MODULE_NAME, 'Error updating batch for inventory correction', {
                updateError
              })
              continue
            }

            // Create operation record
            const operationData = {
              preparation_id: item.preparationId,
              batch_id: allocation.batchId,
              operation_type: 'adjustment',
              quantity: -allocation.quantity,
              unit: item.unit,
              cost_per_unit: allocation.costPerUnit,
              department: inventoryDocument.department,
              reference_id: inventoryDocument.id,
              reference_type: 'inventory',
              notes: `Inventory correction: ${item.notes || 'System/actual discrepancy'}`,
              performed_at: now,
              performed_by: inventoryDocument.responsiblePerson
            }

            await (supabase as any).from('preparation_operations').insert(operationData)
          }
        } else {
          // Positive correction - create a new batch (like a receipt)
          const batchNumber = generateBatchNumber()

          const batchData = {
            preparation_id: item.preparationId,
            batch_number: batchNumber,
            initial_quantity: quantity,
            current_quantity: quantity,
            unit: item.unit,
            cost_per_unit: item.averageCost,
            produced_at: now,
            expires_at: null,
            department: inventoryDocument.department,
            status: 'active',
            notes: `Inventory correction: Found excess stock`,
            created_by: inventoryDocument.responsiblePerson
          }

          const { data: batchResult, error: batchError } = await (supabase as any)
            .from('preparation_batches')
            .insert(batchData)
            .select()
            .single()

          if (batchError) {
            DebugUtils.error(MODULE_NAME, 'Error creating batch for inventory correction', {
              batchError
            })
            continue
          }

          // Create operation record
          const operationData = {
            preparation_id: item.preparationId,
            batch_id: batchResult.id,
            operation_type: 'adjustment',
            quantity: quantity,
            unit: item.unit,
            cost_per_unit: item.averageCost,
            department: inventoryDocument.department,
            reference_id: inventoryDocument.id,
            reference_type: 'inventory',
            notes: `Inventory correction: ${item.notes || 'System/actual discrepancy'}`,
            performed_at: now,
            performed_by: inventoryDocument.responsiblePerson
          }

          await (supabase as any).from('preparation_operations').insert(operationData)
        }

        // Create operation summary for return
        const correctionOperation: PreparationOperation = {
          id: documentNumber,
          operationType: 'inventory',
          documentNumber,
          operationDate: now,
          department: inventoryDocument.department,
          responsiblePerson: inventoryDocument.responsiblePerson,
          items: [
            {
              id: item.id,
              preparationId: item.preparationId,
              preparationName: item.preparationName,
              quantity: item.difference,
              unit: item.unit,
              totalCost: item.valueDifference,
              averageCostPerUnit: item.averageCost,
              notes: item.notes
            }
          ],
          totalValue: item.valueDifference,
          relatedInventoryId: inventoryDocument.id,
          status: 'confirmed',
          createdAt: now,
          updatedAt: now,
          closedAt: null,
          createdBy: inventoryDocument.responsiblePerson,
          updatedBy: inventoryDocument.responsiblePerson
        }

        correctionOperations.push(correctionOperation)
      }

      // Clear balance cache
      this.clearCache(`balances_${inventoryDocument.department}`)

      DebugUtils.info(MODULE_NAME, 'Preparation inventory finalized', {
        inventoryId: inventoryDocument.id,
        correctionsCreated: correctionOperations.length
      })

      return correctionOperations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to finalize preparation inventory', { error })
      throw error
    }
  }

  // =============================================
  // CALCULATION METHODS (Called by Store)
  // =============================================

  async calculateFifoAllocation(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): Promise<BatchAllocation[]> {
    try {
      const batches = await this.getBatchesByPreparation(preparationId)
      const availableBatches = batches
        .filter(b => b.department === department && b.status === 'active')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      const allocations: BatchAllocation[] = []
      let remainingQuantity = quantity

      for (const batch of availableBatches) {
        if (remainingQuantity <= 0) break

        const availableQuantity = batch.currentQuantity
        const allocateQuantity = Math.min(availableQuantity, remainingQuantity)

        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: allocateQuantity,
          costPerUnit: batch.costPerUnit,
          batchDate: batch.createdAt
        })

        remainingQuantity -= allocateQuantity
      }

      if (remainingQuantity > 0) {
        DebugUtils.warn(MODULE_NAME, 'Insufficient batch quantity for FIFO allocation', {
          preparationId,
          requested: quantity,
          available: quantity - remainingQuantity
        })
      }

      return allocations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', {
        error,
        preparationId,
        quantity
      })
      return []
    }
  }

  async calculateCorrectionCost(
    preparationId: string,
    department: PreparationDepartment,
    quantity: number
  ): Promise<number> {
    try {
      const balance = await this.getBalanceByPreparation(preparationId, department)
      return balance ? balance.averageCost * quantity : 0
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate correction cost', {
        error,
        preparationId,
        quantity
      })
      return 0
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  async getPreparationById(id: string): Promise<Preparation | null> {
    const preparations = await this.fetchPreparations()
    return preparations.find(p => p.id === id) || null
  }

  async getBatchesByPreparation(preparationId: string): Promise<PreparationBatch[]> {
    return this.fetchBatches(preparationId)
  }

  async getBalanceByPreparation(
    preparationId: string,
    department: PreparationDepartment = 'kitchen'
  ): Promise<PreparationBalance | null> {
    const balances = await this.fetchBalances(department)
    return balances.find(b => b.preparationId === preparationId) || null
  }

  // =============================================
  // PREPARATION CATEGORIES
  // =============================================

  /**
   * Получает все категории preparations из Supabase
   */
  async fetchCategories(): Promise<PreparationCategoryDisplay[]> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available for categories')
      return []
    }

    const cacheKey = 'preparation_categories'
    const cached = this.getCache<PreparationCategoryDisplay[]>(cacheKey)
    if (cached) {
      DebugUtils.info(MODULE_NAME, 'Returning cached preparation categories')
      return cached
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Fetching preparation categories from Supabase')

      const { data: rows, error } = await supabase
        .from('preparation_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch preparation categories', { error })
        throw error
      }

      if (!rows || rows.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No preparation categories found')
        return []
      }

      const categories = mapPreparationCategoriesToDisplay(
        mapPreparationCategoriesFromRows(rows as PreparationCategoryRow[])
      )

      this.setCache(cacheKey, categories)
      DebugUtils.info(MODULE_NAME, `Loaded ${categories.length} preparation categories`)

      return categories
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error fetching preparation categories', { error })
      return []
    }
  }

  /**
   * Получает категорию по ключу
   */
  async getCategoryByKey(key: string): Promise<PreparationCategoryDisplay | undefined> {
    const categories = await this.fetchCategories()
    return categories.find(cat => cat.key === key)
  }

  /**
   * Получает дефолтную категорию
   */
  async getDefaultCategory(): Promise<PreparationCategoryDisplay | undefined> {
    const categories = await this.fetchCategories()
    return categories.length > 0 ? categories[0] : undefined
  }

  /**
   * Создает новую категорию в Supabase
   */
  async createCategory(
    categoryData: Omit<PreparationCategory, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PreparationCategory> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating new preparation category', { key: categoryData.key })

      const { data: row, error } = await supabase
        .from('preparation_categories')
        .insert({
          name: categoryData.name,
          key: categoryData.key,
          description: categoryData.description,
          icon: categoryData.icon,
          emoji: categoryData.emoji,
          color: categoryData.color,
          sort_order: categoryData.sortOrder,
          is_active: categoryData.isActive
        })
        .select()
        .single()

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create preparation category', { error })
        throw error
      }

      const category = mapPreparationCategoryFromRow(row as PreparationCategoryRow)

      // Очищаем кэш категорий
      this.clearCache('preparation_categories')

      DebugUtils.info(MODULE_NAME, 'Preparation category created successfully', {
        categoryId: category.id,
        key: category.key
      })

      return category
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating preparation category', { error })
      throw error
    }
  }

  /**
   * Обновляет существующую категорию
   */
  async updateCategory(
    id: string,
    updates: Partial<PreparationCategory>
  ): Promise<PreparationCategory> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Updating preparation category', { id, key: updates.key })

      const { data: row, error } = await supabase
        .from('preparation_categories')
        .update({
          name: updates.name,
          key: updates.key,
          description: updates.description,
          icon: updates.icon,
          emoji: updates.emoji,
          color: updates.color,
          sort_order: updates.sortOrder,
          is_active: updates.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to update preparation category', { error })
        throw error
      }

      const category = mapPreparationCategoryFromRow(row as PreparationCategoryRow)

      // Очищаем кэш категорий
      this.clearCache('preparation_categories')

      DebugUtils.info(MODULE_NAME, 'Preparation category updated successfully', {
        categoryId: category.id,
        key: category.key
      })

      return category
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating preparation category', { error })
      throw error
    }
  }

  clearAllCache(): void {
    this.cache.clear()
    this.cacheTimestamps.clear()
    DebugUtils.info(MODULE_NAME, 'All cache cleared')
  }
}

export const preparationService = PreparationsService.getInstance()
