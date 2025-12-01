import { supabase } from '@/supabase'
import type { StorageBatch } from './types'
import { generateId } from '@/utils/id'

/**
 * Service for managing negative inventory batches for products
 * Handles creation, tracking, and reconciliation of negative batches
 *
 * @module negativeBatchService
 * @description
 * This service provides functionality for:
 * - Calculating costs for negative batches using last known prices
 * - Creating negative batches when inventory goes below zero
 * - Tracking and querying unreconciled negative batches
 * - Marking negative batches as reconciled when new stock arrives
 */
class NegativeBatchService {
  /**
   * Get the most recent active (non-negative) batch for a product
   * Used to determine cost for negative batches
   *
   * @param productId - UUID of the product
   * @returns The most recent active batch or null if none found
   */
  async getLastActiveBatch(productId: string): Promise<StorageBatch | null> {
    const { data, error } = await supabase
      .from('storage_batches')
      .select('*')
      .eq('item_id', productId)
      .eq('item_type', 'product')
      .or('is_negative.eq.false,is_negative.is.null')
      .gt('current_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching last active batch:', error)
      return null
    }

    return data
  }

  /**
   * Calculate cost for negative batch
   * Uses last known cost from most recent batch, or cached cost from product
   *
   * @param productId - UUID of the product
   * @param requestedQty - Quantity needed (used for logging only)
   * @returns Cost per unit for the negative batch
   */
  async calculateNegativeBatchCost(productId: string, requestedQty: number): Promise<number> {
    // Try to get cost from most recent batch
    const lastBatch = await this.getLastActiveBatch(productId)
    if (lastBatch?.costPerUnit) {
      console.info(
        `✅ Using last batch cost: ${lastBatch.costPerUnit} (batch: ${lastBatch.batchNumber})`
      )
      return lastBatch.costPerUnit
    }

    // Fallback to cached last_known_cost from product
    const { data: product, error } = await supabase
      .from('products')
      .select('last_known_cost, name')
      .eq('id', productId)
      .single()

    if (error) {
      console.error('❌ Error fetching product:', error)
      return 0
    }

    if (product?.last_known_cost) {
      console.info(
        `✅ Using cached last_known_cost: ${product.last_known_cost} for ${product.name}`
      )
      return product.last_known_cost
    }

    // Default to 0 if no cost history exists (should log warning)
    console.warn(
      `⚠️  No cost history found for product ${productId} (${product?.name || 'Unknown'}). Using cost = 0 for negative batch (${requestedQty} units).`
    )
    return 0
  }

  /**
   * Create a negative batch to track inventory shortage
   *
   * @param params - Parameters for creating the negative batch
   * @returns The created negative batch
   * @throws Error if batch creation fails
   */
  async createNegativeBatch(params: {
    productId: string
    warehouseId: string
    quantity: number // negative value (e.g., -100)
    unit: string
    cost: number // cost per unit from last batch
    reason: string
    sourceOperationType: 'pos_order' | 'preparation_production' | 'manual_writeoff'
    affectedRecipeIds?: string[]
    userId?: string
    shiftId?: string
  }): Promise<StorageBatch> {
    // Get the last active batch for reference
    const lastBatch = await this.getLastActiveBatch(params.productId)

    const now = new Date().toISOString()

    // Generate batch number and ID
    const batchNumber = `NEG-${Date.now()}`
    const batchId = generateId()

    // Map to snake_case for Supabase (database uses snake_case column names)
    const negativeBatchData = {
      id: batchId,
      batch_number: batchNumber,
      item_id: params.productId,
      item_type: 'product',
      warehouse_id: params.warehouseId,
      initial_quantity: params.quantity, // negative value
      current_quantity: params.quantity, // negative value
      unit: params.unit,
      cost_per_unit: params.cost,
      total_value: params.quantity * params.cost, // negative total
      receipt_date: now,
      source_type: 'correction', // Negative batches are a type of correction
      status: 'active',
      is_active: true,
      is_negative: true,
      source_batch_id: lastBatch?.id || null,
      negative_created_at: now,
      negative_reason: params.reason,
      source_operation_type: params.sourceOperationType,
      affected_recipe_ids: params.affectedRecipeIds || null,
      reconciled_at: null,
      created_at: now,
      updated_at: now
    }

    const { data, error } = await supabase
      .from('storage_batches')
      .insert(negativeBatchData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create negative batch: ${error.message}`)
    }

    console.info(
      `✅ Created negative batch: ${batchNumber} (${params.quantity} ${params.unit}, cost: ${params.cost}/unit)`
    )

    // Map from snake_case to camelCase for TypeScript
    const batch: StorageBatch = {
      id: data.id,
      batchNumber: data.batch_number,
      itemId: data.item_id,
      itemType: data.item_type,
      warehouseId: data.warehouse_id,
      initialQuantity: data.initial_quantity,
      currentQuantity: data.current_quantity,
      unit: data.unit,
      costPerUnit: data.cost_per_unit,
      totalValue: data.total_value,
      receiptDate: data.receipt_date,
      expiryDate: data.expiry_date,
      sourceType: data.source_type,
      status: data.status,
      isActive: data.is_active,
      notes: data.notes,
      isNegative: data.is_negative,
      sourceBatchId: data.source_batch_id,
      negativeCreatedAt: data.negative_created_at,
      negativeReason: data.negative_reason,
      sourceOperationType: data.source_operation_type,
      affectedRecipeIds: data.affected_recipe_ids,
      reconciledAt: data.reconciled_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    return batch
  }

  /**
   * Check if product has unreconciled negative batches
   *
   * @param productId - UUID of the product
   * @returns True if product has unreconciled negative batches
   */
  async hasNegativeBatches(productId: string): Promise<boolean> {
    const { count } = await supabase
      .from('storage_batches')
      .select('*', { count: 'exact', head: true })
      .eq('item_id', productId)
      .eq('item_type', 'product')
      .eq('is_negative', true)
      .is('reconciled_at', null)

    return (count ?? 0) > 0
  }

  /**
   * Get all unreconciled negative batches for a product
   *
   * @param productId - UUID of the product
   * @returns Array of unreconciled negative batches
   */
  async getNegativeBatches(productId: string): Promise<StorageBatch[]> {
    const { data, error } = await supabase
      .from('storage_batches')
      .select('*')
      .eq('item_id', productId)
      .eq('item_type', 'product')
      .eq('is_negative', true)
      .is('reconciled_at', null)
      .order('negative_created_at', { ascending: true })

    if (error) {
      console.error('❌ Error fetching negative batches:', error)
      return []
    }

    return data || []
  }

  /**
   * Mark negative batch as reconciled
   * Called when new stock arrives and covers the negative balance
   *
   * @param batchId - UUID of the negative batch to reconcile
   * @throws Error if update fails
   */
  async markAsReconciled(batchId: string): Promise<void> {
    const { error } = await supabase
      .from('storage_batches')
      .update({ reconciled_at: new Date().toISOString() })
      .eq('id', batchId)

    if (error) {
      throw new Error(`Failed to mark batch as reconciled: ${error.message}`)
    }

    console.info(`✅ Marked negative batch as reconciled: ${batchId}`)
  }

  /**
   * Get total negative quantity for a product (all unreconciled batches)
   *
   * @param productId - UUID of the product
   * @returns Total negative quantity (positive number representing shortage)
   */
  async getTotalNegativeQuantity(productId: string): Promise<number> {
    const batches = await this.getNegativeBatches(productId)
    return batches.reduce((sum, batch) => sum + Math.abs(batch.currentQuantity), 0)
  }

  /**
   * Get active (unreconciled) negative batch for a product in a warehouse
   * Used to consolidate negative batches instead of creating duplicates
   *
   * @param productId - UUID of the product
   * @param warehouseId - Warehouse ID where the product is stored
   * @returns The most recent unreconciled negative batch or null
   */
  async getActiveNegativeBatch(
    productId: string,
    warehouseId: string
  ): Promise<StorageBatch | null> {
    const { data, error } = await supabase
      .from('storage_batches')
      .select('*')
      .eq('item_id', productId)
      .eq('item_type', 'product')
      .eq('warehouse_id', warehouseId)
      .eq('is_negative', true)
      .is('reconciled_at', null)
      .order('negative_created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching active negative batch:', error)
      return null
    }

    return data
  }

  /**
   * Update existing negative batch with additional shortage
   * Consolidates shortages into a single negative batch instead of creating duplicates
   *
   * @param batchId - UUID of the negative batch to update
   * @param additionalShortage - Additional shortage to add (positive number)
   * @param costPerUnit - Cost per unit (for validation/logging)
   * @returns Updated negative batch
   * @throws Error if batch not found or update fails
   */
  async updateNegativeBatch(
    batchId: string,
    additionalShortage: number,
    costPerUnit: number
  ): Promise<StorageBatch> {
    // 1. Get current batch
    const { data: batchData, error: fetchError } = await supabase
      .from('storage_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (fetchError || !batchData) {
      throw new Error(`Negative batch not found: ${batchId}`)
    }

    // Use type assertion for database row (Supabase types may not include storage_batches)
    const batch = batchData as any

    // 2. Calculate new quantities
    const previousQty = batch.current_quantity // e.g., -100 (use snake_case from DB)
    const newQty = previousQty - additionalShortage // e.g., -100 - 100 = -200 (more negative)
    const newTotalValue = newQty * batch.cost_per_unit // use snake_case from DB

    const now = new Date().toISOString()

    // 3. Update batch in database
    const { data: updatedBatchData, error: updateError } = await supabase
      .from('storage_batches')
      .update({
        current_quantity: newQty,
        total_value: newTotalValue,
        updated_at: now
      })
      .eq('id', batchId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update negative batch: ${updateError.message}`)
    }

    console.info(
      `✅ Updated existing negative batch: ${batch.batch_number} (${previousQty} → ${newQty}, +${additionalShortage} shortage)`
    )

    // Convert updated batch from snake_case to camelCase
    const updatedBatch = updatedBatchData as any
    return {
      id: updatedBatch.id,
      batchNumber: updatedBatch.batch_number,
      itemId: updatedBatch.item_id,
      itemType: updatedBatch.item_type,
      warehouseId: updatedBatch.warehouse_id,
      initialQuantity: updatedBatch.initial_quantity,
      currentQuantity: updatedBatch.current_quantity,
      unit: updatedBatch.unit,
      costPerUnit: updatedBatch.cost_per_unit,
      totalValue: updatedBatch.total_value,
      receiptDate: updatedBatch.receipt_date,
      expiryDate: updatedBatch.expiry_date,
      sourceType: updatedBatch.source_type,
      status: updatedBatch.status,
      isActive: updatedBatch.is_active,
      notes: updatedBatch.notes,
      isNegative: updatedBatch.is_negative,
      sourceBatchId: updatedBatch.source_batch_id,
      negativeCreatedAt: updatedBatch.negative_created_at,
      negativeReason: updatedBatch.negative_reason,
      sourceOperationType: updatedBatch.source_operation_type,
      affectedRecipeIds: updatedBatch.affected_recipe_ids,
      reconciledAt: updatedBatch.reconciled_at,
      createdAt: updatedBatch.created_at,
      updatedAt: updatedBatch.updated_at
    }
  }
}

export const negativeBatchService = new NegativeBatchService()
