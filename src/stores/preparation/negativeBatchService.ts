import { supabase } from '@/supabase'
import type { PreparationBatch } from './types'
import { batchToSupabase, batchFromSupabase } from './supabase/mappers'

/**
 * Service for managing negative inventory batches for preparations
 * Handles creation, tracking, and reconciliation of negative batches
 *
 * @module negativeBatchService
 * @description
 * This service provides functionality for:
 * - Calculating costs for negative batches using last known prices
 * - Creating negative batches when inventory goes below zero
 * - Tracking and querying unreconciled negative batches
 * - Marking negative batches as reconciled when new production arrives
 */
class NegativeBatchService {
  /**
   * Get the most recent active (non-negative) batch for a preparation
   * Used to determine cost for negative batches
   *
   * @param preparationId - UUID of the preparation
   * @returns The most recent active batch or null if none found
   */
  async getLastActiveBatch(preparationId: string): Promise<PreparationBatch | null> {
    const { data, error } = await supabase
      .from('preparation_batches')
      .select('*')
      .eq('preparation_id', preparationId)
      .or('is_negative.eq.false,is_negative.is.null')
      .gt('current_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching last active batch:', error)
      return null
    }

    // ✅ Convert snake_case to camelCase
    return data ? batchFromSupabase(data) : null
  }

  /**
   * Calculate cost for negative batch
   * Uses last known cost from most recent batch, or cached cost from preparation
   *
   * @param preparationId - UUID of the preparation
   * @param requestedQty - Quantity needed (used for logging only)
   * @returns Cost per unit for the negative batch
   */
  async calculateNegativeBatchCost(preparationId: string, requestedQty: number): Promise<number> {
    // Try to get cost from most recent batch
    const lastBatch = await this.getLastActiveBatch(preparationId)
    if (lastBatch?.costPerUnit) {
      console.info(
        `✅ Using last batch cost: ${lastBatch.costPerUnit} (batch: ${lastBatch.batchNumber})`
      )
      return lastBatch.costPerUnit
    }

    // Fallback to cached last_known_cost from preparation
    const { data: preparation, error } = await supabase
      .from('preparations')
      .select('last_known_cost, name')
      .eq('id', preparationId)
      .single()

    if (error) {
      console.error('❌ Error fetching preparation:', error)
      return 0
    }

    if (preparation?.last_known_cost) {
      console.info(
        `✅ Using cached last_known_cost: ${preparation.last_known_cost} for ${preparation.name}`
      )
      return preparation.last_known_cost
    }

    // Default to 0 if no cost history exists (should log warning)
    console.warn(
      `⚠️  No cost history found for preparation ${preparationId} (${preparation?.name || 'Unknown'}). Using cost = 0 for negative batch (${requestedQty} units).`
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
    preparationId: string
    department: 'kitchen' | 'bar'
    quantity: number // negative value (e.g., -100)
    unit: string
    cost: number // cost per unit from last batch
    reason: string
    sourceOperationType: 'pos_order' | 'preparation_production' | 'manual_writeoff'
    affectedRecipeIds?: string[]
    userId?: string
    shiftId?: string
  }): Promise<PreparationBatch> {
    // Get the last active batch for reference
    const lastBatch = await this.getLastActiveBatch(params.preparationId)

    const now = new Date().toISOString()

    // Generate batch number
    const batchNumber = `NEG-PREP-${Date.now()}`

    const negativeBatch: Partial<PreparationBatch> = {
      batchNumber,
      preparationId: params.preparationId,
      department: params.department,
      initialQuantity: params.quantity, // negative value
      currentQuantity: params.quantity, // negative value
      unit: params.unit,
      costPerUnit: params.cost,
      totalValue: params.quantity * params.cost, // negative total
      productionDate: now,
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

    // ✅ FIX: Use mapper to convert camelCase to snake_case
    const dbBatch = batchToSupabase(negativeBatch as PreparationBatch)

    const { data, error } = await supabase
      .from('preparation_batches')
      .insert(dbBatch)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create negative batch: ${error.message}`)
    }

    console.info(
      `✅ Created negative batch: ${batchNumber} (${params.quantity} ${params.unit}, cost: ${params.cost}/unit)`
    )

    // ✅ Convert snake_case to camelCase
    return batchFromSupabase(data)
  }

  /**
   * Check if preparation has unreconciled negative batches
   *
   * @param preparationId - UUID of the preparation
   * @returns True if preparation has unreconciled negative batches
   */
  async hasNegativeBatches(preparationId: string): Promise<boolean> {
    const { count } = await supabase
      .from('preparation_batches')
      .select('*', { count: 'exact', head: true })
      .eq('preparation_id', preparationId)
      .eq('is_negative', true)
      .is('reconciled_at', null)

    return (count ?? 0) > 0
  }

  /**
   * Get all unreconciled negative batches for a preparation
   *
   * @param preparationId - UUID of the preparation
   * @returns Array of unreconciled negative batches
   */
  async getNegativeBatches(preparationId: string): Promise<PreparationBatch[]> {
    const { data, error } = await supabase
      .from('preparation_batches')
      .select('*')
      .eq('preparation_id', preparationId)
      .eq('is_negative', true)
      .is('reconciled_at', null)
      .order('negative_created_at', { ascending: true })

    if (error) {
      console.error('❌ Error fetching negative batches:', error)
      return []
    }

    // ✅ Convert snake_case to camelCase for all batches
    return data ? data.map(batchFromSupabase) : []
  }

  /**
   * Mark negative batch as reconciled
   * Called when new production arrives and covers the negative balance
   *
   * @param batchId - UUID of the negative batch to reconcile
   * @throws Error if update fails
   */
  async markAsReconciled(batchId: string): Promise<void> {
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('preparation_batches')
      .update({
        reconciled_at: now, // ✅ FIX: Use snake_case for Supabase
        status: 'depleted', // ✅ FIX: Set status to depleted (preparation constraint: active|depleted|expired|written_off)
        is_active: false // ✅ FIX: Mark as inactive (snake_case)
      })
      .eq('id', batchId)

    if (error) {
      throw new Error(`Failed to mark batch as reconciled: ${error.message}`)
    }

    console.info(`✅ Marked negative batch as reconciled: ${batchId}`)
  }

  /**
   * Undo reconciliation for a negative preparation batch
   * Reverts reconciled batch back to active state
   *
   * @param batchId - UUID of the negative batch to undo reconciliation
   * @throws Error if update fails or batch not found
   */
  async undoReconciliation(batchId: string): Promise<void> {
    // Verify batch exists and is reconciled
    const { data: batch, error: fetchError } = await supabase
      .from('preparation_batches')
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
      .from('preparation_batches')
      .update({
        reconciled_at: null, // ✅ FIX: Use snake_case for Supabase
        status: 'active', // Restore to active status
        is_active: true // ✅ FIX: Use snake_case for Supabase
      })
      .eq('id', batchId)

    if (error) {
      throw new Error(`Failed to undo reconciliation: ${error.message}`)
    }

    console.info(`✅ Undone reconciliation for negative batch: ${batchId}`)
  }

  /**
   * Get total negative quantity for a preparation (all unreconciled batches)
   *
   * @param preparationId - UUID of the preparation
   * @returns Total negative quantity (positive number representing shortage)
   */
  async getTotalNegativeQuantity(preparationId: string): Promise<number> {
    const batches = await this.getNegativeBatches(preparationId)
    return batches.reduce((sum, batch) => sum + Math.abs(batch.currentQuantity), 0)
  }

  /**
   * Get active (unreconciled) negative batch for a preparation in a department
   * Used to consolidate negative batches instead of creating duplicates
   *
   * @param preparationId - UUID of the preparation
   * @param department - Department where the preparation is used
   * @returns The most recent unreconciled negative batch or null
   */
  async getActiveNegativeBatch(
    preparationId: string,
    department: 'kitchen' | 'bar'
  ): Promise<PreparationBatch | null> {
    const { data, error } = await supabase
      .from('preparation_batches')
      .select('*')
      .eq('preparation_id', preparationId)
      .eq('department', department)
      .eq('is_negative', true)
      .is('reconciled_at', null)
      .order('negative_created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('❌ Error fetching active negative batch:', error)
      return null
    }

    // ✅ Convert snake_case to camelCase
    return data ? batchFromSupabase(data) : null
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
  ): Promise<PreparationBatch> {
    // 1. Get current batch
    const { data: currentBatch, error: fetchError } = await supabase
      .from('preparation_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (fetchError || !currentBatch) {
      throw new Error(`Negative batch not found: ${batchId}`)
    }

    const batch = batchFromSupabase(currentBatch)

    // 2. Calculate new quantities
    const previousQty = batch.currentQuantity // e.g., -100
    const newQty = previousQty - additionalShortage // e.g., -100 - 100 = -200 (more negative)
    const newTotalValue = newQty * batch.costPerUnit

    const now = new Date().toISOString()

    // 3. Update batch in database
    const { data: updatedData, error: updateError } = await supabase
      .from('preparation_batches')
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
      `✅ Updated existing negative batch: ${batch.batchNumber} (${previousQty} → ${newQty}, +${additionalShortage} shortage)`
    )

    // ✅ Convert snake_case to camelCase
    return batchFromSupabase(updatedData)
  }
}

export const negativeBatchService = new NegativeBatchService()
