import { negativeBatchService } from './negativeBatchService'
import { writeOffExpenseService } from '@/stores/storage/writeOffExpenseService'
import { supabase } from '@/supabase'

/**
 * Service for auto-reconciling negative batches when new preparation production arrives
 *
 * @module reconciliationService
 * @description
 * When new preparation production arrives for a preparation that has unreconciled negative batches:
 * 1. Detects all unreconciled negative batches for the preparation
 * 2. Creates income transactions to offset the original expenses
 * 3. Marks negative batches as reconciled
 *
 * This ensures that:
 * - P&L reports accurately reflect inventory movements
 * - Negative batch expenses are offset when production arrives
 * - Full audit trail of reconciliation events
 */
class ReconciliationService {
  /**
   * Auto-reconcile negative batches when new batch is added
   * Creates income transactions to offset negative batch expenses
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
      .select('id, name, unit')
      .eq('id', preparationId)
      .single()

    if (error || !preparation) {
      console.error(`❌ Preparation not found for reconciliation: ${preparationId}`, error)
      return
    }

    console.info(
      `🔄 Auto-reconciling ${negativeBatches.length} negative batches for ${preparation.name}`
    )

    // 3. Process each negative batch for reconciliation
    for (const negativeBatch of negativeBatches) {
      const quantity = Math.abs(negativeBatch.currentQuantity)
      const costPerUnit = negativeBatch.costPerUnit

      try {
        // 4. Create inventory correction INCOME transaction
        // This offsets the expense created when negative batch was made
        // IMPORTANT: Use cost from negative batch (NOT new batch cost!)
        await writeOffExpenseService.recordCorrectionIncome({
          productName: preparation.name,
          quantity: quantity,
          costPerUnit: costPerUnit,
          unit: negativeBatch.unit
        })

        // 5. Mark negative batch as reconciled
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
