import { negativeBatchService } from './negativeBatchService'
import { supabase } from '@/supabase'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ReconciliationService'

/**
 * Result of auto-reconciliation for a single preparation
 */
export interface ReconciliationResult {
  reconciled: boolean
  deficitQuantity: number
  unit: string
  batchCount: number
  preparationName: string
}

/**
 * Service for auto-reconciling negative batches when new preparation production arrives.
 *
 * When a new batch is produced, this service:
 * 1. Detects unreconciled negative batches (on-the-fly kitchen production)
 * 2. Creates a phantom "auto_production" batch via preparationService (triggers raw ingredient write-off)
 * 3. Immediately marks the phantom batch as depleted (it was consumed on the spot)
 * 4. Marks all negative batches as reconciled
 */
class ReconciliationService {
  /**
   * Auto-reconcile negative batches when new batch is added.
   * Creates a phantom production to write off raw ingredients for on-the-fly production.
   *
   * @param preparationId - UUID of the preparation
   * @param department - Department of the new production (used for phantom batch)
   * @returns ReconciliationResult with details of what was reconciled
   */
  async autoReconcileOnNewBatch(
    preparationId: string,
    department: 'kitchen' | 'bar'
  ): Promise<ReconciliationResult> {
    const noResult: ReconciliationResult = {
      reconciled: false,
      deficitQuantity: 0,
      unit: '',
      batchCount: 0,
      preparationName: ''
    }

    // 1. Check for unreconciled negative batches
    const negativeBatches = await negativeBatchService.getNegativeBatches(preparationId)
    if (negativeBatches.length === 0) {
      return noResult
    }

    // 2. Get preparation info
    const { data: preparation, error } = await supabase
      .from('preparations')
      .select('id, name')
      .eq('id', preparationId)
      .single()

    if (error || !preparation) {
      DebugUtils.error(MODULE_NAME, 'Preparation not found for reconciliation', {
        preparationId,
        error
      })
      return noResult
    }

    // 3. Calculate total deficit
    const totalDeficit = negativeBatches.reduce((sum, b) => sum + Math.abs(b.currentQuantity), 0)

    // Average cost from negative batches (weighted)
    const totalCostValue = negativeBatches.reduce(
      (sum, b) => sum + Math.abs(b.currentQuantity) * b.costPerUnit,
      0
    )
    const avgCostPerUnit = totalDeficit > 0 ? totalCostValue / totalDeficit : 0

    DebugUtils.info(MODULE_NAME, `Auto-reconciling ${negativeBatches.length} negative batches`, {
      preparationName: preparation.name,
      totalDeficit,
      avgCostPerUnit,
      batches: negativeBatches.map(b => ({
        id: b.id,
        batchNumber: b.batchNumber,
        quantity: b.currentQuantity,
        costPerUnit: b.costPerUnit
      }))
    })

    // 4. Create phantom production via preparationService
    // This triggers raw ingredient write-off through the normal production flow
    try {
      const { preparationService } = await import('./preparationService')

      await preparationService.createReceipt({
        department,
        responsiblePerson: 'System (auto-reconciliation)',
        items: [
          {
            preparationId,
            quantity: totalDeficit,
            costPerUnit: avgCostPerUnit,
            notes: 'auto_reconciliation'
          }
        ],
        sourceType: 'auto_production',
        notes: `Auto-reconciliation: on-the-fly production of ${preparation.name}`,
        skipAutoWriteOff: false // Write off raw ingredients
      })

      // 5. Find the phantom batch we just created and mark it as depleted
      // (it represents production that was already consumed)
      const { data: phantomBatch } = await supabase
        .from('preparation_batches')
        .select('id')
        .eq('preparation_id', preparationId)
        .eq('source_type', 'auto_production')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (phantomBatch) {
        await supabase
          .from('preparation_batches')
          .update({
            status: 'depleted',
            is_active: false,
            current_quantity: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', phantomBatch.id)

        DebugUtils.info(MODULE_NAME, 'Phantom batch marked as depleted', {
          phantomBatchId: phantomBatch.id
        })
      }

      // 6. Mark all negative batches as reconciled
      for (const negativeBatch of negativeBatches) {
        try {
          await negativeBatchService.markAsReconciled(negativeBatch.id)
        } catch (err) {
          DebugUtils.error(MODULE_NAME, 'Failed to reconcile negative batch', {
            batchId: negativeBatch.id,
            error: err
          })
        }
      }

      DebugUtils.info(MODULE_NAME, 'Auto-reconciliation completed', {
        preparationName: preparation.name,
        totalDeficit,
        batchCount: negativeBatches.length
      })

      return {
        reconciled: true,
        deficitQuantity: totalDeficit,
        unit: negativeBatches[0]?.unit || 'g',
        batchCount: negativeBatches.length,
        preparationName: preparation.name
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Auto-reconciliation failed', {
        preparationName: preparation.name,
        error: err
      })
      return noResult
    }
  }

  /**
   * Get reconciliation summary for a preparation
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
