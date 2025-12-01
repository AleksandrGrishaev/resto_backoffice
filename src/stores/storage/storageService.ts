// src/stores/storage/storageService.ts - Updated for Supabase integration
// Migrated from mock data to Supabase database

import { DebugUtils, TimeUtils, generateId, extractErrorDetails } from '@/utils'
import {
  executeSupabaseQuery,
  executeSupabaseSingle,
  executeSupabaseMutation
} from '@/utils/supabase'
import { useProductsStore } from '@/stores/productsStore'
import { supabase } from '@/supabase'

import type { Department } from '@/stores/productsStore/types'
import type {
  StorageBatch,
  StorageOperation,
  StorageBalance,
  CreateReceiptData,
  CreateWriteOffData,
  CreateCorrectionData,
  CreateInventoryData,
  InventoryDocument,
  InventoryItem,
  BatchAllocation,
  WriteOffStatistics,
  Warehouse,
  StorageBatchStatus,
  OperationType
} from './types'

import { doesWriteOffAffectKPI, DEFAULT_WAREHOUSE } from './types'
import {
  mapBatchFromDB,
  mapBatchToDB,
  mapOperationFromDB,
  mapOperationToDB,
  mapInventoryFromDB,
  mapInventoryToDB
} from './supabaseMappers'

interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: string
    source: 'api' | 'cache'
  }
}

const MODULE_NAME = 'StorageService'

export class StorageService {
  private warehouses: Warehouse[] = []
  private initialized: boolean = false

  constructor() {
    // Initialize default warehouse
    this.warehouses = [DEFAULT_WAREHOUSE]
  }

  isInitialized(): boolean {
    return this.initialized
  }

  // ===========================
  // HELPER METHODS (используют базовые единицы)
  // ===========================

  private async getProductInfo(productId: string) {
    try {
      const productsStore = useProductsStore()
      const product = productsStore.products.find(p => p.id === productId)

      if (!product) {
        // Silently return defaults - product might be deleted or not yet loaded
        return {
          name: productId,
          unit: 'gram',
          baseUnit: 'gram' as const,
          baseCostPerUnit: 0,
          minStock: 0,
          shelfLife: 7
        }
      }

      return {
        name: product.name,
        baseUnit: product.baseUnit || 'gram',
        baseCostPerUnit: product.baseCostPerUnit || 0,
        minStock: product.minStock || 0,
        shelfLife: product.shelfLifeDays || 7
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting product info', { error, productId })
      return {
        name: productId,
        baseUnit: 'gram' as const,
        baseCostPerUnit: 0,
        minStock: 0,
        shelfLife: 7
      }
    }
  }

  // ===========================
  // INITIALIZATION - Uses Supabase
  // ===========================
  async initialize(): Promise<void> {
    if (this.initialized) {
      DebugUtils.debug(MODULE_NAME, 'StorageService already initialized')
      return
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing StorageService with Supabase...')

      // No more mock data - data is fetched on demand from Supabase
      this.initialized = true

      DebugUtils.info(MODULE_NAME, 'Storage service initialized', {
        warehouses: this.warehouses.length,
        defaultWarehouse: this.getDefaultWarehouse().name
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize StorageService', { error })
      throw error
    }
  }

  // ===========================
  // SUPABASE DATA FETCHING
  // ===========================

  /**
   * Fetches batches from Supabase with optional filtering
   */
  async getBatches(
    warehouseId: string = 'warehouse-winter',
    status?: StorageBatchStatus
  ): Promise<ServiceResponse<StorageBatch[]>> {
    try {
      let query = supabase
        .from('storage_batches')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('receipt_date', { ascending: true })
        .order('created_at', { ascending: true })

      if (status) {
        query = query.eq('status', status)
      }

      const data = await executeSupabaseQuery(query, `${MODULE_NAME}.getBatches`)

      const batches = data.map(mapBatchFromDB)

      DebugUtils.info(MODULE_NAME, `Fetched ${batches.length} batches`, {
        warehouseId,
        status
      })

      return {
        success: true,
        data: batches,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api'
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch batches', extractErrorDetails(error))
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Fetches operations from Supabase with optional filtering
   */
  async getOperationsFromDB(
    warehouseId: string,
    dateFrom?: string,
    dateTo?: string,
    operationType?: OperationType
  ): Promise<ServiceResponse<StorageOperation[]>> {
    try {
      let query = supabase
        .from('storage_operations')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('operation_date', { ascending: false })

      if (dateFrom) {
        query = query.gte('operation_date', dateFrom)
      }
      if (dateTo) {
        query = query.lte('operation_date', dateTo)
      }
      if (operationType) {
        query = query.eq('operation_type', operationType)
      }

      const data = await executeSupabaseQuery(query, `${MODULE_NAME}.getOperationsFromDB`)

      const operations = data.map(mapOperationFromDB)

      return {
        success: true,
        data: operations,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api'
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch operations', extractErrorDetails(error))
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * FIFO allocation helper - fetches batches and allocates quantities
   */
  private async allocateFIFO(
    itemId: string,
    warehouseId: string,
    neededQuantity: number
  ): Promise<ServiceResponse<BatchAllocation[]>> {
    try {
      // Fetch batches in FIFO order (oldest first)
      const batches = await executeSupabaseQuery(
        supabase
          .from('storage_batches')
          .select('*')
          .eq('item_id', itemId)
          .eq('warehouse_id', warehouseId)
          .eq('status', 'active')
          .gt('current_quantity', 0)
          .order('receipt_date', { ascending: true })
          .order('created_at', { ascending: true }),
        `${MODULE_NAME}.allocateFIFO`
      )

      // Allow empty batches - negative batch will be created later
      if (!batches || batches.length === 0) {
        DebugUtils.warn(MODULE_NAME, '⚠️ No active batches - will create negative batch', {
          itemId,
          needed: neededQuantity
        })
        // Return empty allocations - shortage will be handled by caller
        return {
          success: true,
          data: []
        }
      }

      // Allocate quantities using FIFO logic
      let remaining = neededQuantity
      const allocations: BatchAllocation[] = []

      for (const batch of batches) {
        if (remaining <= 0) break

        const allocatedQty = Math.min(remaining, Number(batch.current_quantity))

        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batch_number,
          quantity: allocatedQty,
          costPerUnit: Number(batch.cost_per_unit),
          batchDate: batch.receipt_date
        })

        remaining -= allocatedQty
      }

      // Check if we have enough quantity
      if (remaining > 0) {
        const available = neededQuantity - remaining
        // FIX: Allow negative stock - just log warning instead of throwing error
        DebugUtils.warn(MODULE_NAME, '⚠️ Insufficient quantity - allowing negative stock', {
          itemId,
          needed: neededQuantity,
          available,
          shortage: remaining
        })
        // Note: This will result in negative stock, which is intentional for POS operations
      }

      DebugUtils.info(MODULE_NAME, 'FIFO allocation complete', {
        itemId,
        needed: neededQuantity,
        batchesUsed: allocations.length,
        hasShortage: remaining > 0
      })

      return {
        success: true,
        data: allocations
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * FIFO allocation for preparations - fetches preparation batches and allocates quantities
   * ✅ NEW: Support for preparation write-offs
   */
  private async allocatePreparationFIFO(
    preparationId: string,
    department: string,
    neededQuantity: number
  ): Promise<ServiceResponse<BatchAllocation[]>> {
    try {
      // Fetch batches in FIFO order (oldest first)
      const batches = await executeSupabaseQuery(
        supabase
          .from('preparation_batches')
          .select('*')
          .eq('preparation_id', preparationId)
          .eq('department', department)
          .eq('status', 'active')
          .gt('current_quantity', 0)
          .order('production_date', { ascending: true })
          .order('created_at', { ascending: true }),
        `${MODULE_NAME}.allocatePreparationFIFO`
      )

      // ✅ FIX: Don't throw error when no batches - return empty allocations
      // This allows negative batch creation logic to work
      if (!batches || batches.length === 0) {
        DebugUtils.warn(MODULE_NAME, '⚠️ No active batches found - will need negative batch', {
          preparationId,
          department,
          neededQuantity
        })
        return {
          success: true,
          data: [] // Empty allocations - will trigger negative batch creation
        }
      }

      // Allocate quantities using FIFO logic
      let remaining = neededQuantity
      const allocations: BatchAllocation[] = []

      for (const batch of batches) {
        if (remaining <= 0) break

        const allocatedQty = Math.min(remaining, Number(batch.current_quantity))

        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batch_number,
          quantity: allocatedQty,
          costPerUnit: Number(batch.cost_per_unit),
          batchDate: batch.production_date || batch.created_at
        })

        remaining -= allocatedQty
      }

      // Check if we have enough quantity
      if (remaining > 0) {
        const available = neededQuantity - remaining
        DebugUtils.warn(
          MODULE_NAME,
          '⚠️ Insufficient preparation quantity - allowing negative stock',
          {
            preparationId,
            department,
            needed: neededQuantity,
            available,
            shortage: remaining
          }
        )
      }

      DebugUtils.info(MODULE_NAME, 'Preparation FIFO allocation complete', {
        preparationId,
        department,
        needed: neededQuantity,
        batchesUsed: allocations.length,
        hasShortage: remaining > 0
      })

      return {
        success: true,
        data: allocations
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ===========================
  // BASIC OPERATIONS
  // ===========================

  async getBalances(): Promise<StorageBalance[]> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    // Calculate balances from Supabase data
    const result = await this.calculateBalances()
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to calculate balances')
    }

    return result.data
  }

  /**
   * Calculates balances from active batches in Supabase
   */
  async calculateBalances(
    warehouseId: string = 'warehouse-winter'
  ): Promise<ServiceResponse<StorageBalance[]>> {
    try {
      // Fetch all active batches from Supabase
      const batchesResponse = await this.getBatches(warehouseId, 'active')
      if (!batchesResponse.success || !batchesResponse.data) {
        throw new Error('Failed to fetch batches')
      }

      const batches = batchesResponse.data
      const balanceMap = new Map<string, StorageBalance>()
      const productsStore = useProductsStore()

      // Products should already be initialized by AppInitializer
      // If not, this will be caught as an error
      if (productsStore.products.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No products in store - balances will be empty', {
          hint: 'Ensure AppInitializer loads products before storage'
        })
      }

      DebugUtils.debug(MODULE_NAME, 'Building balances', {
        productsCount: productsStore.products.length,
        batchesCount: batches.length
      })

      // Initialize balances for ALL products (even with zero stock)
      for (const product of productsStore.products) {
        balanceMap.set(product.id, {
          itemId: product.id,
          itemType: 'product',
          itemName: product.name, // Use product.name directly instead of getProductInfo()
          totalQuantity: 0,
          unit: product.baseUnit || 'gram',
          totalValue: 0,
          averageCost: product.baseCostPerUnit || 0,
          latestCost: product.baseCostPerUnit || 0,
          costTrend: 'stable',
          batches: [],
          oldestBatchDate: TimeUtils.getCurrentLocalISO(),
          newestBatchDate: TimeUtils.getCurrentLocalISO(),
          hasExpired: false,
          hasNearExpiry: false,
          belowMinStock: false,
          lastCalculated: TimeUtils.getCurrentLocalISO()
        })
      }

      // Add data from active batches
      for (const batch of batches) {
        if (!batch.isActive || batch.status !== 'active') continue

        let balance = balanceMap.get(batch.itemId)

        // If batch exists but product not in store (orphaned batch), create placeholder balance
        if (!balance) {
          const product = productsStore.products.find(p => p.id === batch.itemId)
          if (!product) {
            DebugUtils.warn(MODULE_NAME, 'Orphaned batch found - product not in store', {
              batchId: batch.id,
              itemId: batch.itemId
            })
            // Create placeholder balance for orphaned batch
            balance = {
              itemId: batch.itemId,
              itemType: 'product',
              itemName: `[Unknown: ${batch.itemId.slice(0, 8)}]`,
              totalQuantity: 0,
              unit: batch.unit,
              totalValue: 0,
              averageCost: 0,
              latestCost: 0,
              costTrend: 'stable',
              batches: [],
              oldestBatchDate: batch.receiptDate,
              newestBatchDate: batch.receiptDate,
              hasExpired: false,
              hasNearExpiry: false,
              belowMinStock: false,
              lastCalculated: TimeUtils.getCurrentLocalISO()
            }
            balanceMap.set(batch.itemId, balance)
          } else {
            continue // Product exists but balance wasn't created? Skip this batch
          }
        }

        balance.batches.push(batch)
        balance.totalQuantity += batch.currentQuantity
        balance.totalValue += batch.totalValue

        // Update dates
        if (new Date(batch.receiptDate) < new Date(balance.oldestBatchDate)) {
          balance.oldestBatchDate = batch.receiptDate
        }
        if (new Date(batch.receiptDate) > new Date(balance.newestBatchDate)) {
          balance.newestBatchDate = batch.receiptDate
        }
      }

      // Calculate averages and trends
      const now = new Date()
      const warningDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      for (const balance of balanceMap.values()) {
        // Calculate average cost
        if (balance.totalQuantity > 0) {
          balance.averageCost = balance.totalValue / balance.totalQuantity
        }

        // Sort batches and calculate trend
        if (balance.batches.length > 0) {
          balance.batches.sort(
            (a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime()
          )
          balance.latestCost = balance.batches[balance.batches.length - 1].costPerUnit

          if (balance.batches.length > 1) {
            const oldestCost = balance.batches[0].costPerUnit
            const diff = balance.latestCost - oldestCost
            const threshold = oldestCost * 0.05

            if (diff > threshold) {
              balance.costTrend = 'up'
            } else if (diff < -threshold) {
              balance.costTrend = 'down'
            }
          }
        }

        // Check expiry
        for (const batch of balance.batches) {
          if (batch.expiryDate) {
            const expiryDate = new Date(batch.expiryDate)
            if (expiryDate < now) {
              balance.hasExpired = true
            } else if (expiryDate < warningDate) {
              balance.hasNearExpiry = true
            }
          }
        }

        // Check low stock
        const product = productsStore.products.find(p => p.id === balance.itemId)
        if (product?.minStock && balance.totalQuantity <= product.minStock) {
          balance.belowMinStock = true
        }
      }

      const balances = Array.from(balanceMap.values())

      DebugUtils.store(MODULE_NAME, 'Calculated balances', {
        count: balances.length,
        totalValue: balances.reduce((sum, b) => sum + b.totalValue, 0)
      })

      return {
        success: true,
        data: balances
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get transit batches from Supabase
   */
  async getTransitBatches(department?: Department | 'all'): Promise<StorageBatch[]> {
    try {
      const response = await this.getBatches('warehouse-winter', 'in_transit')
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch transit batches')
      }
      return response.data
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get transit batches', { error, department })
      throw error
    }
  }

  /**
   * Get active batches from Supabase
   */
  async getActiveBatches(department?: Department | 'all'): Promise<StorageBatch[]> {
    try {
      const response = await this.getBatches('warehouse-winter', 'active')
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch active batches')
      }
      return response.data
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get active batches', { error, department })
      throw error
    }
  }

  /**
   * Get all batches (active + transit) from Supabase
   */
  async getAllBatches(department?: Department | 'all'): Promise<StorageBatch[]> {
    try {
      const response = await this.getBatches('warehouse-winter')
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch all batches')
      }
      return response.data
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get all batches', { error })
      throw error
    }
  }

  /**
   * Get ALL negative batches (including reconciled) for reporting purposes
   * This method queries the database directly and does NOT filter by is_active
   *
   * @returns Array of all negative batches (both reconciled and unreconciled)
   */
  async getAllNegativeBatches(): Promise<StorageBatch[]> {
    try {
      const data = await executeSupabaseQuery(
        supabase
          .from('storage_batches')
          .select('*')
          .eq('warehouse_id', 'warehouse-winter')
          .eq('is_negative', true)
          .order('negative_created_at', { ascending: false }),
        `${MODULE_NAME}.getAllNegativeBatches`
      )

      const batches = data.map(mapBatchFromDB)

      DebugUtils.info(
        MODULE_NAME,
        `Fetched ${batches.length} negative batches (including reconciled)`
      )

      return batches
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get all negative batches', { error })
      throw error
    }
  }

  /**
   * Get operations from Supabase
   */
  async getOperations(department?: Department | 'all'): Promise<StorageOperation[]> {
    try {
      const warehouseId = this.getDefaultWarehouse().id
      const response = await this.getOperationsFromDB(warehouseId)

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch operations')
      }

      // Filter by department if specified
      if (department && department !== 'all') {
        return response.data.filter(op => op.department === department)
      }

      return response.data
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get operations', { error, department })
      throw error
    }
  }

  // recalculateAllBalances is no longer needed - use calculateBalances() instead

  // ===========================
  // CRUD OPERATIONS - ОБНОВЛЕНЫ ДЛЯ БАЗОВЫХ ЕДИНИЦ
  // ===========================

  /**
   * Creates receipt operation with Supabase transaction
   */
  async createReceipt(data: CreateReceiptData): Promise<ServiceResponse<StorageOperation>> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'StorageService not initialized'
      }
    }

    try {
      const documentNumber = `RC-${String(Date.now()).slice(-6)}`
      const operationDate = TimeUtils.getCurrentLocalISO()
      const warehouseId = data.warehouseId || this.getDefaultWarehouse().id

      DebugUtils.info(MODULE_NAME, 'Creating receipt', {
        documentNumber,
        department: data.department,
        itemCount: data.items.length,
        warehouseId
      })

      // Prepare operation items and batches
      const operationItems: any[] = []
      let totalValue = 0

      for (const item of data.items) {
        const productInfo = await this.getProductInfo(item.itemId)

        const batchId = generateId()
        const batchNumber = this.generateBatchNumber(item.itemId)

        // Create batch record
        const batch: Partial<StorageBatch> = {
          id: batchId,
          batchNumber,
          itemId: item.itemId,
          itemType: 'product',
          warehouseId,
          initialQuantity: item.quantity,
          currentQuantity: item.quantity,
          unit: item.unit,
          costPerUnit: item.costPerUnit,
          totalValue: item.totalCost,
          receiptDate: operationDate,
          expiryDate: item.expiryDate,
          sourceType: data.sourceType,
          status: 'active',
          isActive: true,
          notes: item.notes,
          supplierId: data.supplierId,
          purchaseOrderId: data.purchaseOrderId,
          createdAt: operationDate,
          updatedAt: operationDate
        }

        const dbBatch = mapBatchToDB(batch)

        // Insert batch into database
        await executeSupabaseMutation(async () => {
          const { error: batchError } = await supabase.from('storage_batches').insert([dbBatch])
          if (batchError) throw batchError
        }, `${MODULE_NAME}.createReceipt.insertBatch`)

        // Prepare operation item
        operationItems.push({
          id: generateId(),
          itemId: item.itemId,
          itemType: 'product',
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          totalCost: item.totalCost,
          averageCostPerUnit: item.costPerUnit,
          expiryDate: item.expiryDate,
          notes: item.notes
        })

        totalValue += item.totalCost
      }

      // Create operation record
      const operation: Partial<StorageOperation> = {
        id: generateId(),
        operationType: 'receipt',
        documentNumber,
        operationDate,
        warehouseId,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        status: 'confirmed',
        notes: data.notes,
        createdAt: operationDate,
        updatedAt: operationDate
      }

      const opData = await executeSupabaseSingle(
        supabase
          .from('storage_operations')
          .insert([mapOperationToDB(operation)])
          .select(),
        `${MODULE_NAME}.createReceipt.insertOperation`
      )

      if (!opData) throw new Error('Failed to create operation')

      DebugUtils.info(MODULE_NAME, '✅ Receipt created successfully', {
        documentNumber,
        itemsCount: data.items.length,
        totalValue
      })

      return {
        success: true,
        data: mapOperationFromDB(opData),
        metadata: {
          timestamp: operationDate,
          source: 'api'
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to create receipt', extractErrorDetails(error))
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Creates write-off operation with FIFO allocation and Supabase transaction
   */
  async createWriteOff(data: CreateWriteOffData): Promise<ServiceResponse<StorageOperation>> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'StorageService not initialized'
      }
    }

    try {
      const documentNumber = `WO-${String(Date.now()).slice(-6)}`
      const operationDate = TimeUtils.getCurrentLocalISO()
      const warehouseId = data.warehouseId || this.getDefaultWarehouse().id

      DebugUtils.info(MODULE_NAME, 'Creating write-off operation', {
        documentNumber,
        department: data.department,
        reason: data.reason,
        itemsCount: data.items.length
      })

      const operationItems: any[] = []
      let totalValue = 0

      for (const item of data.items) {
        let allocations: BatchAllocation[] = []
        let allocationResult: ServiceResponse<BatchAllocation[]>

        // ✅ FIXED: Handle both products and preparations
        if (item.itemType === 'preparation') {
          // Allocate from preparation_batches
          allocationResult = await this.allocatePreparationFIFO(
            item.itemId,
            data.department,
            item.quantity
          )

          if (!allocationResult.success || !allocationResult.data) {
            throw new Error(allocationResult.error || 'Preparation FIFO allocation failed')
          }

          allocations = allocationResult.data

          // ✅ NEW: Calculate allocated quantity vs requested
          const allocatedQuantity = allocations.reduce((sum, a) => sum + a.quantity, 0)
          const shortage = item.quantity - allocatedQuantity

          // Update preparation batch quantities
          for (const allocation of allocations) {
            const batchData = await executeSupabaseSingle(
              supabase.from('preparation_batches').select('*').eq('id', allocation.batchId),
              `${MODULE_NAME}.createWriteOff.fetchPreparationBatch`
            )

            if (!batchData) throw new Error(`Preparation batch ${allocation.batchId} not found`)

            const newQuantity = Number(batchData.current_quantity) - allocation.quantity
            const newStatus = newQuantity <= 0 ? 'depleted' : 'active' // ✅ FIXED: 'depleted' not 'consumed'
            const newTotalValue = newQuantity * Number(batchData.cost_per_unit)

            await executeSupabaseMutation(async () => {
              const { error: updateError } = await supabase
                .from('preparation_batches')
                .update({
                  current_quantity: newQuantity,
                  total_value: newTotalValue,
                  status: newStatus,
                  is_active: newQuantity > 0,
                  updated_at: operationDate
                })
                .eq('id', allocation.batchId)

              if (updateError) throw updateError
            }, `${MODULE_NAME}.createWriteOff.updatePreparationBatch`)
          }

          // ✅ NEW: Create or update negative batch if there's a shortage
          if (shortage > 0) {
            DebugUtils.warn(
              MODULE_NAME,
              '⚠️ Shortage detected for preparation - checking for existing negative batch',
              {
                itemId: item.itemId,
                itemName: item.itemName,
                shortage,
                allocated: allocatedQuantity,
                requested: item.quantity
              }
            )

            // Import services
            const { negativeBatchService } = await import(
              '@/stores/preparation/negativeBatchService'
            )
            const { writeOffExpenseService } = await import('./writeOffExpenseService')

            // Get preparation info from recipesStore (preparations are stored there)
            const { useRecipesStore } = await import('@/stores/recipes')
            const recipesStore = useRecipesStore()
            const preparation = recipesStore.preparations?.find(p => p.id === item.itemId)

            if (!preparation) {
              DebugUtils.error(MODULE_NAME, 'Preparation not found for negative batch', {
                itemId: item.itemId,
                preparationsAvailable: recipesStore.preparations?.length || 0
              })
              throw new Error(`Preparation ${item.itemId} not found in recipesStore`)
            }

            // Calculate cost for negative batch (use last known cost)
            const cost = await negativeBatchService.calculateNegativeBatchCost(
              item.itemId,
              shortage
            )

            // Check if there's already an unreconciled negative batch
            const existingNegative = await negativeBatchService.getActiveNegativeBatch(
              item.itemId,
              data.department
            )

            if (existingNegative) {
              // Update existing negative batch
              const updatedBatch = await negativeBatchService.updateNegativeBatch(
                existingNegative.id,
                shortage,
                cost
              )

              // NOTE: No account transaction created - negative batches are technical records only

              DebugUtils.info(MODULE_NAME, '✅ Updated existing negative batch for preparation', {
                batchNumber: updatedBatch.batchNumber,
                additionalShortage: shortage,
                totalNegativeQty: updatedBatch.currentQuantity,
                cost
              })
            } else {
              // Create new negative batch
              const negativeBatch = await negativeBatchService.createNegativeBatch({
                preparationId: item.itemId,
                department: data.department,
                quantity: -shortage,
                unit: item.unit || preparation.unit,
                cost: cost,
                reason: item.notes || data.notes || 'Automatic negative batch creation',
                sourceOperationType: 'manual_writeoff',
                affectedRecipeIds: [],
                userId: undefined,
                shiftId: undefined
              })

              // NOTE: No account transaction created - negative batches are technical records only

              DebugUtils.info(MODULE_NAME, '✅ Created new negative batch for preparation', {
                batchNumber: negativeBatch.batchNumber,
                quantity: -shortage,
                cost,
                totalCost: shortage * cost
              })
            }
          }
        } else {
          // Allocate from storage_batches (original logic for products)
          const productInfo = await this.getProductInfo(item.itemId)

          allocationResult = await this.allocateFIFO(item.itemId, warehouseId, item.quantity)

          if (!allocationResult.success || !allocationResult.data) {
            throw new Error(allocationResult.error || 'FIFO allocation failed')
          }

          allocations = allocationResult.data

          // ✅ NEW: Calculate allocated quantity vs requested
          const allocatedQuantity = allocations.reduce((sum, a) => sum + a.quantity, 0)
          const shortage = item.quantity - allocatedQuantity

          // Update storage batch quantities
          for (const allocation of allocations) {
            const batchData = await executeSupabaseSingle(
              supabase.from('storage_batches').select('*').eq('id', allocation.batchId),
              `${MODULE_NAME}.createWriteOff.fetchBatch`
            )

            if (!batchData) throw new Error(`Batch ${allocation.batchId} not found`)

            const newQuantity = Number(batchData.current_quantity) - allocation.quantity
            const newStatus = newQuantity <= 0 ? 'consumed' : 'active'
            const newTotalValue = newQuantity * Number(batchData.cost_per_unit)

            await executeSupabaseMutation(async () => {
              const { error: updateError } = await supabase
                .from('storage_batches')
                .update({
                  current_quantity: newQuantity,
                  total_value: newTotalValue,
                  status: newStatus,
                  is_active: newQuantity > 0,
                  updated_at: operationDate
                })
                .eq('id', allocation.batchId)

              if (updateError) throw updateError
            }, `${MODULE_NAME}.createWriteOff.updateBatch`)
          }

          // ✅ NEW: Create or update negative batch if there's a shortage
          if (shortage > 0) {
            DebugUtils.warn(
              MODULE_NAME,
              '⚠️ Shortage detected - checking for existing negative batch',
              {
                itemId: item.itemId,
                itemName: item.itemName,
                shortage,
                allocated: allocatedQuantity,
                requested: item.quantity
              }
            )

            // Import services
            const { negativeBatchService } = await import('./negativeBatchService')
            const { writeOffExpenseService } = await import('./writeOffExpenseService')

            // Calculate cost for negative batch (use last known cost)
            const cost = await negativeBatchService.calculateNegativeBatchCost(
              item.itemId,
              shortage
            )

            // Check if there's already an unreconciled negative batch
            const existingNegative = await negativeBatchService.getActiveNegativeBatch(
              item.itemId,
              warehouseId
            )

            if (existingNegative) {
              // Update existing negative batch
              const updatedBatch = await negativeBatchService.updateNegativeBatch(
                existingNegative.id,
                shortage,
                cost
              )

              // NOTE: No account transaction created - negative batches are technical records only

              DebugUtils.info(MODULE_NAME, '✅ Updated existing negative batch', {
                batchNumber: updatedBatch.batchNumber,
                additionalShortage: shortage,
                totalNegativeQty: updatedBatch.currentQuantity,
                cost
              })
            } else {
              // Create new negative batch
              const negativeBatch = await negativeBatchService.createNegativeBatch({
                productId: item.itemId,
                warehouseId: warehouseId,
                quantity: -shortage,
                unit: item.unit || productInfo.unit,
                cost: cost,
                reason: item.notes || data.notes || 'Automatic negative batch creation',
                sourceOperationType: 'manual_writeoff',
                affectedRecipeIds: [],
                userId: undefined,
                shiftId: undefined
              })

              // NOTE: No account transaction created - negative batches are technical records only

              DebugUtils.info(MODULE_NAME, '✅ Created new negative batch', {
                batchNumber: negativeBatch.batchNumber,
                quantity: -shortage,
                cost,
                totalCost: shortage * cost
              })
            }
          }
        }

        // Calculate total cost from allocations
        const itemTotalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        // Prepare operation item
        operationItems.push({
          id: generateId(),
          itemId: item.itemId,
          itemType: item.itemType, // ✅ FIXED: Use actual type
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          totalCost: itemTotalCost,
          batchAllocations: allocations,
          notes: item.notes
        })

        totalValue += itemTotalCost
      }

      // Create operation record
      const operation: Partial<StorageOperation> = {
        id: generateId(),
        operationType: 'write_off',
        documentNumber,
        operationDate,
        warehouseId,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        writeOffDetails: {
          reason: data.reason,
          affectsKPI: doesWriteOffAffectKPI(data.reason),
          notes: data.notes
        },
        status: 'confirmed',
        notes: data.notes,
        createdAt: operationDate,
        updatedAt: operationDate
      }

      const opData = await executeSupabaseSingle(
        supabase
          .from('storage_operations')
          .insert([mapOperationToDB(operation)])
          .select(),
        `${MODULE_NAME}.createWriteOff.insertOperation`
      )

      if (!opData) throw new Error('Failed to create operation')

      const createdOperation = mapOperationFromDB(opData)

      // ✅ NEW: Record financial transaction for KPI-affecting write-offs
      if (operation.writeOffDetails && totalValue > 0) {
        try {
          const { writeOffExpenseService } = await import('./writeOffExpenseService')
          await writeOffExpenseService.recordManualWriteOff({
            reason: data.reason,
            totalValue: totalValue,
            description: `Write-off: ${data.reason} (${documentNumber})${data.notes ? ' - ' + data.notes : ''}`,
            items: operationItems
          })
        } catch (expenseError) {
          // Don't fail entire operation if expense recording fails
          // Financial transaction can be backfilled later if needed
          DebugUtils.error(
            MODULE_NAME,
            '❌ Failed to record write-off expense (operation created successfully)',
            extractErrorDetails(expenseError)
          )
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Write-off created successfully', {
        documentNumber,
        reason: data.reason,
        affectsKPI: operation.writeOffDetails?.affectsKPI,
        batchesUsed: operationItems.reduce(
          (sum, item) => sum + (item.batchAllocations?.length || 0),
          0
        ),
        totalValue
      })

      return {
        success: true,
        data: createdOperation,
        metadata: {
          timestamp: operationDate,
          source: 'api'
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to create write-off', extractErrorDetails(error))
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Creates correction operation with Supabase transaction
   * Handles both positive (surplus) and negative (shortage) corrections
   */
  async createCorrection(data: CreateCorrectionData): Promise<ServiceResponse<StorageOperation>> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'StorageService not initialized'
      }
    }

    try {
      const documentNumber = `CR-${String(Date.now()).slice(-6)}`
      const operationDate = TimeUtils.getCurrentLocalISO()
      const warehouseId = data.warehouseId || this.getDefaultWarehouse().id

      DebugUtils.info(MODULE_NAME, 'Creating correction operation', {
        documentNumber,
        department: data.department,
        reason: data.correctionDetails.reason,
        itemsCount: data.items.length
      })

      const operationItems: any[] = []
      let totalValue = 0

      for (const item of data.items) {
        const productInfo = await this.getProductInfo(item.itemId)
        let allocations: BatchAllocation[] = []
        let itemTotalCost = 0

        if (item.quantity > 0) {
          // Positive correction - create new batch
          const batchId = generateId()
          const batchNumber = this.generateBatchNumber(item.itemId)

          const batch: Partial<StorageBatch> = {
            id: batchId,
            batchNumber,
            itemId: item.itemId,
            itemType: 'product',
            warehouseId,
            initialQuantity: item.quantity,
            currentQuantity: item.quantity,
            unit: item.unit,
            costPerUnit: productInfo.baseCostPerUnit,
            totalValue: item.quantity * productInfo.baseCostPerUnit,
            receiptDate: operationDate,
            sourceType: 'correction',
            status: 'active',
            isActive: true,
            notes: item.notes,
            createdAt: operationDate,
            updatedAt: operationDate
          }

          await executeSupabaseMutation(async () => {
            const { error: batchError } = await supabase
              .from('storage_batches')
              .insert([mapBatchToDB(batch)])

            if (batchError) throw batchError
          }, `${MODULE_NAME}.createCorrection.insertBatch`)

          itemTotalCost = batch.totalValue!
        } else if (item.quantity < 0) {
          // Negative correction - use FIFO allocation
          const allocationResult = await this.allocateFIFO(
            item.itemId,
            warehouseId,
            Math.abs(item.quantity)
          )

          if (!allocationResult.success || !allocationResult.data) {
            throw new Error(allocationResult.error || 'FIFO allocation failed')
          }

          allocations = allocationResult.data

          // Update batch quantities in database
          for (const allocation of allocations) {
            const batchData = await executeSupabaseSingle(
              supabase.from('storage_batches').select('*').eq('id', allocation.batchId),
              `${MODULE_NAME}.createCorrection.fetchBatch`
            )

            if (!batchData) throw new Error(`Batch ${allocation.batchId} not found`)

            const newQuantity = Number(batchData.current_quantity) - allocation.quantity
            const newStatus = newQuantity <= 0 ? 'consumed' : 'active'
            const newTotalValue = newQuantity * Number(batchData.cost_per_unit)

            await executeSupabaseMutation(async () => {
              const { error: updateError } = await supabase
                .from('storage_batches')
                .update({
                  current_quantity: newQuantity,
                  total_value: newTotalValue,
                  status: newStatus,
                  is_active: newQuantity > 0,
                  updated_at: operationDate
                })
                .eq('id', allocation.batchId)

              if (updateError) throw updateError
            }, `${MODULE_NAME}.createCorrection.updateBatch`)
          }

          itemTotalCost = allocations.reduce(
            (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
            0
          )
        }

        // Prepare operation item
        operationItems.push({
          id: generateId(),
          itemId: item.itemId,
          itemType: 'product',
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          totalCost: itemTotalCost,
          batchAllocations: allocations.length > 0 ? allocations : undefined,
          notes: item.notes
        })

        totalValue += itemTotalCost
      }

      // Create operation record
      const operation: Partial<StorageOperation> = {
        id: generateId(),
        operationType: 'correction',
        documentNumber,
        operationDate,
        warehouseId,
        department: data.department,
        responsiblePerson: data.responsiblePerson,
        items: operationItems,
        totalValue,
        correctionDetails: data.correctionDetails,
        status: 'confirmed',
        notes: data.notes,
        createdAt: operationDate,
        updatedAt: operationDate
      }

      const opData = await executeSupabaseSingle(
        supabase
          .from('storage_operations')
          .insert([mapOperationToDB(operation)])
          .select(),
        `${MODULE_NAME}.createCorrection.insertOperation`
      )

      if (!opData) throw new Error('Failed to create operation')

      DebugUtils.info(MODULE_NAME, '✅ Correction created successfully', {
        documentNumber,
        reason: data.correctionDetails.reason,
        totalValue
      })

      return {
        success: true,
        data: mapOperationFromDB(opData),
        metadata: {
          timestamp: operationDate,
          source: 'api'
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to create correction', extractErrorDetails(error))
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ===========================
  // BATCH ALLOCATION - FIFO LOGIC
  // ===========================

  private calculateFifoAllocation(
    availableBatches: StorageBatch[],
    requiredQuantity: number
  ): BatchAllocation[] {
    const allocations: BatchAllocation[] = []
    let remainingQuantity = requiredQuantity

    for (const batch of availableBatches) {
      if (remainingQuantity <= 0) break

      const allocationQuantity = Math.min(batch.currentQuantity, remainingQuantity)

      if (allocationQuantity > 0) {
        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: allocationQuantity,
          costPerUnit: batch.costPerUnit, // ✅ Цена за базовую единицу
          batchDate: batch.receiptDate
        })

        remainingQuantity -= allocationQuantity
      }
    }

    if (remainingQuantity > 0) {
      DebugUtils.warn(MODULE_NAME, 'Insufficient stock for operation', {
        requiredQuantity,
        allocatedQuantity: requiredQuantity - remainingQuantity,
        remainingQuantity
      })
    }

    return allocations
  }

  private generateBatchNumber(itemId: string): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const productCode = itemId.split('-').pop()?.toUpperCase() || 'UNK'
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')

    return `${dateStr}-${productCode}-${random}`
  }

  // ===========================
  // WAREHOUSE METHODS
  // ===========================

  getDefaultWarehouse(): Warehouse {
    return this.warehouses.find(w => w.isActive) || this.warehouses[0]
  }

  getWarehouse(id: string): Warehouse | undefined {
    return this.warehouses.find(w => w.id === id)
  }

  getAllWarehouses(): Warehouse[] {
    return this.warehouses.filter(w => w.isActive)
  }

  // ===========================
  // INVENTORY OPERATIONS
  // ===========================

  /**
   * Creates a new inventory session with items from current balances
   */
  async startInventory(data: CreateInventoryData): Promise<InventoryDocument> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    try {
      const documentNumber = `INV-${String(Date.now()).slice(-6)}`
      const inventoryDate = TimeUtils.getCurrentLocalISO()
      const warehouseId = this.getDefaultWarehouse().id

      DebugUtils.info(MODULE_NAME, 'Starting inventory', {
        documentNumber,
        department: data.department,
        responsiblePerson: data.responsiblePerson
      })

      // 1. Fetch current balances for the department
      const balances = await this.getBalances()
      const productsStore = useProductsStore()

      // Filter balances by department
      const departmentBalances = balances.filter(balance => {
        const product = productsStore.products.find(p => p.id === balance.itemId)
        return product && product.usedInDepartments.includes(data.department)
      })

      // 2. Create inventory items from balances
      const inventoryItems: InventoryItem[] = departmentBalances.map(balance => ({
        id: generateId(),
        itemId: balance.itemId,
        itemType: 'product',
        itemName: balance.itemName,
        systemQuantity: balance.totalQuantity,
        actualQuantity: 0, // To be filled during counting
        difference: -balance.totalQuantity, // Initial difference (not counted yet)
        unit: balance.unit,
        averageCost: balance.averageCost,
        valueDifference: -balance.totalValue,
        confirmed: false
      }))

      // 3. Create inventory document
      const inventory: Partial<InventoryDocument> = {
        id: generateId(),
        documentNumber,
        inventoryDate,
        department: data.department,
        itemType: 'product',
        responsiblePerson: data.responsiblePerson,
        items: inventoryItems,
        totalItems: inventoryItems.length,
        totalDiscrepancies: 0, // Will be calculated on finalize
        totalValueDifference: 0,
        status: 'draft',
        notes: undefined,
        createdAt: inventoryDate,
        updatedAt: inventoryDate
      }

      // 4. Insert into database
      const { data: dbData, error } = await supabase
        .from('inventory_documents')
        .insert([mapInventoryToDB(inventory)])
        .select()
        .single()

      if (error) throw error

      const createdInventory = mapInventoryFromDB(dbData)

      DebugUtils.info(MODULE_NAME, '✅ Inventory started', {
        documentNumber,
        itemsCount: inventoryItems.length
      })

      return createdInventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to start inventory', { error })
      throw error
    }
  }

  /**
   * Updates inventory with counted items
   */
  async updateInventory(inventoryId: string, items: InventoryItem[]): Promise<InventoryDocument> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Updating inventory', {
        inventoryId,
        itemsCount: items.length
      })

      // 1. Fetch current inventory
      const { data: currentInventory, error: fetchError } = await supabase
        .from('inventory_documents')
        .select('*')
        .eq('id', inventoryId)
        .single()

      if (fetchError) throw fetchError
      if (!currentInventory) throw new Error(`Inventory ${inventoryId} not found`)

      // 2. Recalculate differences and totals
      const updatedItems = items.map(item => ({
        ...item,
        difference: item.actualQuantity - item.systemQuantity,
        valueDifference: (item.actualQuantity - item.systemQuantity) * item.averageCost
      }))

      const totalDiscrepancies = updatedItems.filter(
        item => Math.abs(item.difference) > 0.001
      ).length

      const totalValueDifference = updatedItems.reduce((sum, item) => sum + item.valueDifference, 0)

      // 3. Update database
      const { data: dbData, error: updateError } = await supabase
        .from('inventory_documents')
        .update({
          items: updatedItems as any,
          total_discrepancies: totalDiscrepancies,
          total_value_difference: totalValueDifference,
          updated_at: TimeUtils.getCurrentLocalISO()
        })
        .eq('id', inventoryId)
        .select()
        .single()

      if (updateError) throw updateError

      const updatedInventory = mapInventoryFromDB(dbData)

      DebugUtils.info(MODULE_NAME, '✅ Inventory updated', {
        inventoryId,
        discrepancies: totalDiscrepancies,
        valueDifference: totalValueDifference
      })

      return updatedInventory
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to update inventory', { error })
      throw error
    }
  }

  /**
   * Finalizes inventory and creates correction operations for discrepancies
   */
  async finalizeInventory(inventoryId: string): Promise<StorageOperation[]> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Finalizing inventory', { inventoryId })

      // 1. Fetch inventory document
      const { data: inventoryData, error: fetchError } = await supabase
        .from('inventory_documents')
        .select('*')
        .eq('id', inventoryId)
        .single()

      if (fetchError) throw fetchError
      if (!inventoryData) throw new Error(`Inventory ${inventoryId} not found`)

      const inventory = mapInventoryFromDB(inventoryData)

      if (inventory.status === 'confirmed') {
        throw new Error('Inventory already finalized')
      }

      // 2. Find items with discrepancies
      const itemsWithDiscrepancies = inventory.items.filter(
        item => Math.abs(item.difference) > 0.001
      )

      const correctionOperations: StorageOperation[] = []

      // 3. Create correction operations for each discrepancy
      for (const item of itemsWithDiscrepancies) {
        const correctionData: CreateCorrectionData = {
          warehouseId: this.getDefaultWarehouse().id,
          department: inventory.department,
          responsiblePerson: inventory.responsiblePerson,
          items: [
            {
              batchId: '', // Will be set by FIFO allocation for negative corrections
              itemId: item.itemId,
              itemName: item.itemName,
              itemType: 'product',
              quantity: item.difference, // ← Keep the sign! Positive = add, Negative = subtract
              unit: item.unit,
              notes: `Inventory adjustment: ${inventory.documentNumber}`
            }
          ],
          correctionDetails: {
            reason: 'other',
            relatedId: inventoryId,
            relatedName: inventory.documentNumber
          },
          notes: `Inventory correction for ${item.itemName}: System ${item.systemQuantity}, Actual ${item.actualQuantity}, Diff ${item.difference}`
        }

        // Create correction (handles both positive and negative)
        const response = await this.createCorrection(correctionData)

        if (!response.success || !response.data) {
          throw new Error(`Failed to create correction for ${item.itemName}: ${response.error}`)
        }

        correctionOperations.push(response.data)
      }

      // 4. Mark inventory as confirmed
      const { data: confirmedData, error: confirmError } = await supabase
        .from('inventory_documents')
        .update({
          status: 'confirmed',
          updated_at: TimeUtils.getCurrentLocalISO()
        })
        .eq('id', inventoryId)
        .select()
        .single()

      if (confirmError) throw confirmError

      DebugUtils.info(MODULE_NAME, '✅ Inventory finalized', {
        inventoryId,
        correctionsCreated: correctionOperations.length,
        totalValueDifference: inventory.totalValueDifference
      })

      return correctionOperations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Failed to finalize inventory', { error })
      throw error
    }
  }

  async deleteBatch(batchId: string): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Deleting batch from Supabase', { batchId })

      await executeSupabaseMutation(async () => {
        const { error } = await supabase.from('storage_batches').delete().eq('id', batchId)
        if (error) throw error
      }, `${MODULE_NAME}.deleteBatch`)

      DebugUtils.info(MODULE_NAME, 'Batch deleted', { batchId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete batch', {
        batchId,
        ...extractErrorDetails(error)
      })
      throw error
    }
  }

  // ===========================
  // WRITE-OFF STATISTICS
  // ===========================

  async getWriteOffStatistics(
    department?: Department | 'all',
    dateFrom?: string,
    dateTo?: string
  ): Promise<WriteOffStatistics> {
    // Fetch operations from Supabase
    const opsResponse = await this.getOperations(department)

    const writeOffOps = opsResponse.filter(op => {
      if (op.operationType !== 'write_off') return false

      if (dateFrom || dateTo) {
        const opDate = new Date(op.operationDate)
        if (dateFrom && opDate < new Date(dateFrom)) return false
        if (dateTo && opDate > new Date(dateTo)) return false
      }

      return true
    })

    // ... остальная часть метода остаётся без изменений
    const stats: WriteOffStatistics = {
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

    for (const op of writeOffOps) {
      const value = op.totalValue || 0
      const reason = op.writeOffDetails?.reason
      const affectsKPI = reason ? doesWriteOffAffectKPI(reason) : false

      stats.total.count++
      stats.total.value += value

      if (affectsKPI) {
        stats.kpiAffecting.count++
        stats.kpiAffecting.value += value

        if (reason === 'expired') {
          stats.kpiAffecting.reasons.expired.count++
          stats.kpiAffecting.reasons.expired.value += value
        } else if (reason === 'spoiled') {
          stats.kpiAffecting.reasons.spoiled.count++
          stats.kpiAffecting.reasons.spoiled.value += value
        } else {
          stats.kpiAffecting.reasons.other.count++
          stats.kpiAffecting.reasons.other.value += value
        }
      } else {
        stats.nonKpiAffecting.count++
        stats.nonKpiAffecting.value += value

        if (reason === 'education') {
          stats.nonKpiAffecting.reasons.education.count++
          stats.nonKpiAffecting.reasons.education.value += value
        } else if (reason === 'test') {
          stats.nonKpiAffecting.reasons.test.count++
          stats.nonKpiAffecting.reasons.test.value += value
        }
      }

      if (op.department === 'kitchen') {
        stats.byDepartment.kitchen.total += value
        if (affectsKPI) {
          stats.byDepartment.kitchen.kpiAffecting += value
        } else {
          stats.byDepartment.kitchen.nonKpiAffecting += value
        }
      } else if (op.department === 'bar') {
        stats.byDepartment.bar.total += value
        if (affectsKPI) {
          stats.byDepartment.bar.kpiAffecting += value
        } else {
          stats.byDepartment.bar.nonKpiAffecting += value
        }
      }
    }

    return stats
  }

  // Runtime batch methods removed - all data now persists in Supabase
  // Use getBatches(), getActiveBatches(), getTransitBatches() instead

  /**
   * Debug info - fetches current state from Supabase
   */
  async getDebugInfo() {
    const [active, transit] = await Promise.all([this.getActiveBatches(), this.getTransitBatches()])

    return {
      initialized: this.initialized,
      dataStats: {
        activeBatches: active.length,
        transitBatches: transit.length,
        totalValue: active.reduce((sum, b) => sum + b.totalValue, 0)
      }
    }
  }

  // ===========================
  // INVENTORY FETCH OPERATIONS
  // ===========================

  /**
   * Fetches all inventory documents, optionally filtered by department
   */
  async getInventories(department?: Department | 'all'): Promise<InventoryDocument[]> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    try {
      let query = supabase
        .from('inventory_documents')
        .select('*')
        .order('inventory_date', { ascending: false })

      // Filter by department if specified
      if (department && department !== 'all') {
        query = query.eq('department', department)
      }

      const { data, error } = await query

      if (error) throw error

      const inventories = (data || []).map(mapInventoryFromDB)

      DebugUtils.debug(MODULE_NAME, 'Inventories fetched', {
        count: inventories.length,
        department: department || 'all'
      })

      return inventories
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch inventories', { error })
      throw error
    }
  }

  /**
   * Fetches a single inventory document by ID
   */
  async getInventory(inventoryId: string): Promise<InventoryDocument | null> {
    if (!this.initialized) {
      throw new Error('StorageService not initialized')
    }

    try {
      const { data, error } = await supabase
        .from('inventory_documents')
        .select('*')
        .eq('id', inventoryId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null
        }
        throw error
      }

      return data ? mapInventoryFromDB(data) : null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch inventory', { inventoryId, error })
      throw error
    }
  }
}

// =============================================
// SINGLETON INSTANCE
// =============================================

export const storageService = new StorageService()
