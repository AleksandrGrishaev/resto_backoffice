import { negativeBatchService } from './negativeBatchService'
import { supabase } from '@/supabase'

/**
 * Service for auto-reconciling negative batches when new preparation production arrives
 *
 * @module reconciliationService
 * @description
 * When new preparation production arrives for a preparation that has unreconciled negative batches:
 * 1. Detects all unreconciled negative batches for the preparation
 * 2. Marks negative batches as reconciled (technical records only)
 *
 * NOTE: Negative batches are technical records for inventory tracking.
 * They do NOT create account transactions as they represent inventory variances,
 * not real cash movements.
 *
 * This ensures that:
 * - Negative batches are tracked for monitoring purposes
 * - Full audit trail of reconciliation events
 * - Real cash accounts (acc_1) are NOT affected by inventory adjustments
 */
class ReconciliationService {
  /**
   * Auto-reconcile negative batches when new batch is added
   * Marks negative batches as reconciled (tracking only, no account transactions)
   *
   * @param preparationId - UUID of the preparation
   * @returns Promise that resolves when reconciliation is complete
   *
   * @example
   * // Called after creating new preparation batch
   * await reconciliationService.autoReconcileOnNewBatch(preparationId)
   */
  async autoReconcileOnNewBatch(preparationId: string): Promise<void> {
    // 1. Check for unreconciled negative batches
    const negativeBatches = await negativeBatchService.getNegativeBatches(preparationId)
    if (negativeBatches.length === 0) {
      // No negative batches to reconcile
      return
    }

    // 2. Get preparation info for transaction description
    const { data: preparation, error } = await supabase
      .from('preparations')
      .select('id, name')
      .eq('id', preparationId)
      .single()

    if (error || !preparation) {
      console.error(`❌ Preparation not found for reconciliation: ${preparationId}`, error)
      return
    }

    // Get unit from negative batch (unit is stored in batches, not preparations table)
    const unit = negativeBatches[0]?.unit || 'ml'

    console.info(
      `🔄 Auto-reconciling ${negativeBatches.length} negative batches for ${preparation.name}`
    )

    // 3. Process each negative batch for reconciliation
    for (const negativeBatch of negativeBatches) {
      const quantity = Math.abs(negativeBatch.currentQuantity)
      const costPerUnit = negativeBatch.costPerUnit

      try {
        // 4. Mark negative batch as reconciled
        // NOTE: We do NOT create account transactions for negative batches
        // Negative batches are technical records for inventory tracking only
        // They should NOT affect real cash accounts
        await negativeBatchService.markAsReconciled(negativeBatch.id)

        console.info(
          `✅ Reconciled negative batch: ${preparation.name} (+${quantity} ${negativeBatch.unit} @ ${costPerUnit})`
        )
      } catch (error) {
        console.error(`❌ Failed to reconcile negative batch ${negativeBatch.id}:`, error)
        // Continue with other batches even if one fails
      }
    }

    // 6. Log summary
    const totalQty = negativeBatches.reduce((sum, b) => sum + Math.abs(b.currentQuantity), 0)
    console.info(
      `✅ Auto-reconciled ${negativeBatches.length} negative batches for ${preparation.name} (total: ${totalQty} ${negativeBatches[0]?.unit || ''})`
    )
  }

  /**
   * Get reconciliation summary for a preparation
   * Useful for reports and debugging
   *
   * @param preparationId - UUID of the preparation
   * @returns Summary of unreconciled negative batches
   */
  async getReconciliationSummary(preparationId: string): Promise<{
    hasNegativeBatches: boolean
    totalNegativeQuantity: number
    negativeBatchCount: number
    estimatedValue: number
  }> {
    const negativeBatches = await negativeBatchService.getNegativeBatches(preparationId)

    const totalNegativeQuantity = negativeBatches.reduce(
      (sum, b) => sum + Math.abs(b.currentQuantity),
      0
    )

    const estimatedValue = negativeBatches.reduce(
      (sum, b) => sum + Math.abs(b.currentQuantity) * b.costPerUnit,
      0
    )

    return {
      hasNegativeBatches: negativeBatches.length > 0,
      totalNegativeQuantity,
      negativeBatchCount: negativeBatches.length,
      estimatedValue
    }
  }
}

export const reconciliationService = new ReconciliationService()
