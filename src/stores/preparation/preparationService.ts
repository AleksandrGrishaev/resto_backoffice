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
  preparationBalancesFromSupabase,
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

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Error fetching batches', { error })
        return []
      }

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
      // Fetch all needed data in parallel
      const [balancesResponse, preparationsResult, batchesResult] = await Promise.all([
        (supabase as any)
          .from('preparation_balances')
          .select('*')
          .eq('department', department || 'kitchen'),
        this.fetchPreparations(),
        this.fetchBatches()
      ])

      if (balancesResponse.error) {
        DebugUtils.error(MODULE_NAME, 'Error fetching balances', { error: balancesResponse.error })
        return []
      }

      const balances = balancesResponse.data
        ? preparationBalancesFromSupabase(balancesResponse.data)
        : []
      const preparations = preparationsResult
      const batches = batchesResult

      // Enrich balances with preparation data and batches
      const now = new Date()
      const settings = await this.getPreparationSettings()

      balances.forEach(balance => {
        const preparation = preparations.find(p => p.id === balance.preparationId)
        if (preparation) {
          balance.preparationName = preparation.name
        }

        // Get batches for this preparation and department
        const preparationBatches = batches.filter(
          b => b.preparationId === balance.preparationId && b.department === balance.department
        )

        balance.batches = preparationBatches

        // Calculate expiry status
        const expiredBatches = preparationBatches.filter(
          b => b.expiryDate && new Date(b.expiryDate) < now
        )
        const nearExpiryBatches = preparationBatches.filter(b => {
          if (!b.expiryDate) return false
          const expiryDate = new Date(b.expiryDate)
          const daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
          return daysUntilExpiry >= 0 && daysUntilExpiry <= settings.expiryWarningDays
        })

        balance.hasExpired = expiredBatches.length > 0
        balance.hasNearExpiry = nearExpiryBatches.length > 0

        // Calculate low stock status
        const minStockThreshold = preparation?.minStock || 100 // Default to 100g/ml if not set
        balance.belowMinStock = balance.totalQuantity <= minStockThreshold

        // Set batch dates
        if (preparationBatches.length > 0) {
          const sortedBatches = preparationBatches.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          balance.oldestBatchDate = sortedBatches[0].createdAt
          balance.newestBatchDate = sortedBatches[sortedBatches.length - 1].createdAt
        }
      })

      this.setCache(cacheKey, balances)

      DebugUtils.info(MODULE_NAME, `Loaded ${balances.length} balances with batches and status`)

      return balances
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch balances', { error })
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

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Error fetching operations', { error })
        return []
      }

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
    // TODO: Implement correction operations
    throw new Error('Correction operations not implemented yet')
  }

  async createReceipt(data: CreatePreparationReceiptData): Promise<PreparationOperation> {
    // TODO: Implement receipt operations
    throw new Error('Receipt operations not implemented yet')
  }

  async createWriteOff(data: CreatePreparationWriteOffData): Promise<PreparationOperation> {
    // TODO: Implement write-off operations
    throw new Error('Write-off operations not implemented yet')
  }

  async getWriteOffStatistics(
    department?: PreparationDepartment,
    dateFrom?: string,
    dateTo?: string
  ): Promise<PreparationWriteOffStatistics> {
    // TODO: Implement write-off statistics
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

  async startInventory(
    data: CreatePreparationInventoryData
  ): Promise<PreparationInventoryDocument> {
    // TODO: Implement inventory start
    throw new Error('Inventory start not implemented yet')
  }

  async updateInventory(
    inventoryId: string,
    items: PreparationInventoryItem[]
  ): Promise<PreparationInventoryDocument> {
    // TODO: Implement inventory update
    throw new Error('Inventory update not implemented yet')
  }

  async finalizeInventory(inventoryId: string): Promise<PreparationOperation[]> {
    // TODO: Implement inventory finalization
    throw new Error('Inventory finalization not implemented yet')
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
