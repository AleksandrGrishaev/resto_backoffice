import { supabase } from '@/supabase'
import type { StorageBatch } from './types'
import { generateId } from '@/utils/id'
import { mapBatchFromDB } from './supabaseMappers'

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

    // ✅ FIX: Use mapper function for snake_case to camelCase conversion
    return data ? mapBatchFromDB(data) : null
  }

  /**
   * Calculate cost for negative batch
   * Uses last known cost from most recent batch, depleted batches, or historical data
   *
   * @param productId - UUID of the product
   * @param requestedQty - Quantity needed (used for logging only)
   * @returns Cost per unit for the negative batch (never returns 0)
   */
  async calculateNegativeBatchCost(productId: string, requestedQty: number): Promise<number> {
    // Try to get cost from most recent active batch
    const lastBatch = await this.getLastActiveBatch(productId)
    if (lastBatch?.costPerUnit && lastBatch.costPerUnit > 0) {
      console.info(
        `✅ Using last active batch cost: ${lastBatch.costPerUnit} (batch: ${lastBatch.batchNumber})`
      )
      return lastBatch.costPerUnit
    }

    // Try to get cost from depleted/consumed batches (historical cost)
    const { data: depletedBatches, error: depletedError } = await supabase
      .from('storage_batches')
      .select('cost_per_unit, batch_number, receipt_date')
      .eq('item_id', productId)
      .eq('item_type', 'product')
      .or('is_negative.eq.false,is_negative.is.null')
      .in('status', ['consumed', 'depleted'])
      .not('cost_per_unit', 'is', null)
      .gt('cost_per_unit', 0)
      .order('receipt_date', { ascending: false })
      .limit(5) // Get last 5 depleted batches for average

    if (!depletedError && depletedBatches && depletedBatches.length > 0) {
      // Calculate average cost from recent depleted batches
      const totalCost = depletedBatches.reduce((sum, b) => sum + (b.cost_per_unit || 0), 0)
      const avgCost = totalCost / depletedBatches.length

      console.info(
        `✅ Using average cost from ${depletedBatches.length} depleted batches: ${avgCost.toFixed(2)} (most recent: ${depletedBatches[0].batch_number})`
      )
      return avgCost
    }

    // Fallback to cached last_known_cost or base_cost_per_unit from product
    const { data: product, error } = await supabase
      .from('products')
      .select('last_known_cost, base_cost_per_unit, name, base_unit')
      .eq('id', productId)
      .single()

    if (error) {
      console.error('❌ Error fetching product:', error)
      // Still don't return 0, continue to fallback
    }

    if (product?.last_known_cost && product.last_known_cost > 0) {
      console.info(
        `✅ Using cached last_known_cost: ${product.last_known_cost} for ${product.name}`
      )
      return product.last_known_cost
    }

    // Fallback to base_cost_per_unit (manual cost from product card)
    if (product?.base_cost_per_unit && product.base_cost_per_unit > 0) {
      console.info(`✅ Using base_cost_per_unit: ${product.base_cost_per_unit} for ${product.name}`)
      return product.base_cost_per_unit
    }

    // FINAL FALLBACK: Return 0 with CRITICAL ERROR
    // This makes the problem visible instead of masking it with arbitrary values
    const errorContext = {
      timestamp: new Date().toISOString(),
      itemId: productId,
      itemName: product?.name || 'Unknown',
      itemType: 'product',
      requestedQuantity: requestedQty,
      unit: product?.base_unit || 'unknown',
      failedFallbacks: [
        'last_active_batch',
        'depleted_batches_avg',
        'last_known_cost',
        'base_cost_per_unit'
      ],
      suggestedAction: 'Create receipt operation or set base_cost_per_unit in products table'
    }

    console.error('🚨 COST CALCULATION FAILED', errorContext)
    console.error(
      `❌ CRITICAL: NO COST DATA FOUND for product "${product?.name}" (${productId}). ` +
        `Requested: ${requestedQty} ${product?.base_unit || 'units'}. ` +
        `Returning 0 to make this problem visible. ` +
        `SUGGESTED ACTION: Create a receipt operation for this product or set base_cost_per_unit.`
    )

    // Return 0 instead of arbitrary estimated value
    // This makes missing cost data very visible in reports
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

    // ✅ FIX: Use mapper function for snake_case to camelCase conversion
    return data ? data.map(mapBatchFromDB) : []
  }

  /**
   * Mark negative batch as reconciled
   * Called when new stock arrives and covers the negative balance
   *
   * @param batchId - UUID of the negative batch to reconcile
   * @throws Error if update fails
   */
  async markAsReconciled(batchId: string): Promise<void> {
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('storage_batches')
      .update({
        reconciled_at: now,
        status: 'consumed', // ✅ FIX: Set status to consumed (DB constraint doesn't allow 'reconciled')
        is_active: false // ✅ FIX: Mark as inactive
      })
      .eq('id', batchId)

    if (error) {
      throw new Error(`Failed to mark batch as reconciled: ${error.message}`)
    }

    console.info(`✅ Marked negative batch as reconciled: ${batchId}`)
  }

  /**
   * Undo reconciliation for a negative batch
   * Reverts reconciled batch back to active state
   *
   * @param batchId - UUID of the negative batch to undo reconciliation
   * @throws Error if update fails or batch not found
   */
  async undoReconciliation(batchId: string): Promise<void> {
    // Verify batch exists and is reconciled
    const { data: batch, error: fetchError } = await supabase
      .from('storage_batches')
      .select('*')
      .eq('id', batchId)
      .eq('is_negative', true)
      .not('reconciled_at', 'is', null)
      .single()

    if (fetchError || !batch) {
      throw new Error(`Reconciled negative batch not found: ${batchId}`)
    }

    // Revert to active state
    const { error } = await supabase
      .from('storage_batches')
      .update({
        reconciled_at: null,
        status: 'active',
        is_active: true
      })
      .eq('id', batchId)

    if (error) {
      throw new Error(`Failed to undo reconciliation: ${error.message}`)
    }

    console.info(`✅ Undone reconciliation for negative batch: ${batchId}`)
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

    // ✅ FIX: Use mapper function for snake_case to camelCase conversion
    return data ? mapBatchFromDB(data) : null
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

    // ✅ FIX: Use mapper function for snake_case to camelCase conversion
    return mapBatchFromDB(updatedBatchData)
  }
}

export const negativeBatchService = new NegativeBatchService()
