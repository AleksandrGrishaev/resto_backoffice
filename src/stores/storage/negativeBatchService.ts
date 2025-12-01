import { supabase } from '@/supabase'
import type { StorageBatch } from './types'

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

    // Generate batch number
    const batchNumber = `NEG-${Date.now()}`

    const negativeBatch: Partial<StorageBatch> = {
      batchNumber,
      itemId: params.productId,
      itemType: 'product',
      warehouseId: params.warehouseId,
      initialQuantity: params.quantity, // negative value
      currentQuantity: params.quantity, // negative value
      unit: params.unit,
      costPerUnit: params.cost,
      totalValue: params.quantity * params.cost, // negative total
      receiptDate: now,
      sourceType: 'correction', // Negative batches are a type of correction
      status: 'active',
      isActive: true,
      isNegative: true,
      sourceBatchId: lastBatch?.id || undefined,
      negativeCreatedAt: now,
      negativeReason: params.reason,
      sourceOperationType: params.sourceOperationType,
      affectedRecipeIds: params.affectedRecipeIds || [],
      reconciledAt: undefined,
      createdAt: now,
      updatedAt: now
    }

    const { data, error } = await supabase
      .from('storage_batches')
      .insert(negativeBatch)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create negative batch: ${error.message}`)
    }

    console.info(
      `✅ Created negative batch: ${batchNumber} (${params.quantity} ${params.unit}, cost: ${params.cost}/unit)`
    )

    return data
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
      .update({ reconciledAt: new Date().toISOString() })
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
}

export const negativeBatchService = new NegativeBatchService()
