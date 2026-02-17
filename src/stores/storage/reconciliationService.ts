import { supabase } from '@/supabase'
import { negativeBatchService } from './negativeBatchService'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ReconciliationService'

/**
 * Result of auto-reconciliation for a single product
 */
export interface ReconciliationResult {
  reconciled: boolean
  deficitQuantity: number
  unit: string
  batchCount: number
  productName: string
}

/**
 * Service for auto-reconciling negative batches when new stock arrives
 *
 * Reconciliation means:
 * 1. Deduct the NEG deficit from the newest positive batches (LIFO — newest first)
 * 2. Mark NEG batches as consumed/is_active=false
 *
 * This keeps SUM(current_quantity WHERE is_active) correct.
 * Example: NEG -950g exists, new batch +1000g arrives →
 *   new batch becomes 50g, NEG marked reconciled. Balance = 50g (correct).
 */
class ReconciliationService {
  /**
   * Auto-reconcile negative batches when new batch is added.
   * Deducts deficit from newest positive batches, then marks NEGs as reconciled.
   */
  async autoReconcileOnNewBatch(productId: string): Promise<ReconciliationResult> {
    const noResult: ReconciliationResult = {
      reconciled: false,
      deficitQuantity: 0,
      unit: '',
      batchCount: 0,
      productName: ''
    }

    // 1. Check for unreconciled negative batches
    const negativeBatches = await negativeBatchService.getNegativeBatches(productId)
    if (negativeBatches.length === 0) {
      return noResult
    }

    // 2. Get product info for logging
    const productsStore = useProductsStore()
    const product = productsStore.products.find(p => p.id === productId)

    if (!product) {
      DebugUtils.error(MODULE_NAME, `Product not found for reconciliation: ${productId}`)
      return noResult
    }

    // 3. Calculate total deficit
    const totalDeficit = negativeBatches.reduce((sum, b) => sum + Math.abs(b.currentQuantity), 0)

    DebugUtils.info(
      MODULE_NAME,
      `Auto-reconciling ${negativeBatches.length} NEG batches for ${product.name} (deficit: ${totalDeficit})`
    )

    // 4. Deduct deficit from newest positive batches (LIFO — newest first absorbs the debt)
    const deducted = await this.deductDeficitFromPositiveBatches(productId, totalDeficit)

    if (deducted < totalDeficit) {
      DebugUtils.warn(
        MODULE_NAME,
        `Could only deduct ${deducted}/${totalDeficit} from positive batches for ${product.name}. ` +
          `Remaining ${totalDeficit - deducted} deficit will stay as unreconciled NEG batches.`
      )
    }

    // 5. Mark NEG batches as reconciled (only if we deducted something)
    let reconciledCount = 0
    if (deducted > 0) {
      let remainingToReconcile = deducted
      for (const negativeBatch of negativeBatches) {
        const batchDeficit = Math.abs(negativeBatch.currentQuantity)
        if (remainingToReconcile <= 0) break

        try {
          if (remainingToReconcile >= batchDeficit) {
            // Fully reconcile this NEG batch
            await negativeBatchService.markAsReconciled(negativeBatch.id)
            remainingToReconcile -= batchDeficit
            reconciledCount++
          } else {
            // Partially reconcile: reduce NEG batch quantity, don't mark as reconciled
            const newNegQty = -(batchDeficit - remainingToReconcile)
            await supabase
              .from('storage_batches')
              .update({ current_quantity: newNegQty, updated_at: new Date().toISOString() })
              .eq('id', negativeBatch.id)
            remainingToReconcile = 0
            reconciledCount++ // counts as partial reconciliation
          }
        } catch (error) {
          DebugUtils.error(MODULE_NAME, `Failed to reconcile negative batch ${negativeBatch.id}`, {
            error
          })
        }
      }
    }

    DebugUtils.info(
      MODULE_NAME,
      `Auto-reconciled ${reconciledCount} NEG batches for ${product.name} (deducted ${deducted} from positive batches)`
    )

    return {
      reconciled: reconciledCount > 0,
      deficitQuantity: deducted,
      unit: negativeBatches[0]?.unit || '',
      batchCount: reconciledCount,
      productName: product.name
    }
  }

  /**
   * Deduct deficit from the newest positive batches for a product.
   * Uses LIFO order (newest batch absorbs first) so the most recent receipt covers the debt.
   *
   * @returns Amount actually deducted
   */
  private async deductDeficitFromPositiveBatches(
    productId: string,
    deficit: number
  ): Promise<number> {
    // Get active positive batches, newest first (LIFO)
    const { data: batches, error } = await supabase
      .from('storage_batches')
      .select('id, batch_number, current_quantity, cost_per_unit')
      .eq('item_id', productId)
      .eq('item_type', 'product')
      .eq('is_active', true)
      .or('is_negative.eq.false,is_negative.is.null')
      .gt('current_quantity', 0)
      .order('created_at', { ascending: false }) // newest first

    if (error || !batches || batches.length === 0) {
      DebugUtils.warn(MODULE_NAME, 'No positive batches found to deduct deficit from', {
        productId,
        error
      })
      return 0
    }

    let remaining = deficit
    let totalDeducted = 0

    for (const batch of batches) {
      if (remaining <= 0) break

      const available = Number(batch.current_quantity)
      const toDeduct = Math.min(remaining, available)
      const newQty = available - toDeduct

      const { error: updateError } = await supabase
        .from('storage_batches')
        .update({
          current_quantity: newQty,
          total_value: newQty * (batch.cost_per_unit || 0),
          status: newQty <= 0 ? 'consumed' : 'active',
          is_active: newQty > 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', batch.id)

      if (updateError) {
        DebugUtils.error(MODULE_NAME, `Failed to deduct from batch ${batch.id}`, {
          error: updateError
        })
        continue
      }

      remaining -= toDeduct
      totalDeducted += toDeduct

      DebugUtils.info(
        MODULE_NAME,
        `Deducted ${toDeduct} from batch ${batch.batch_number} (${available} → ${newQty})`
      )
    }

    return totalDeducted
  }

  /**
   * Bulk reconcile negative batches for multiple products.
   * Used after inventory finalization.
   */
  async autoReconcileMultipleProducts(productIds: string[]): Promise<ReconciliationResult[]> {
    const uniqueIds = [...new Set(productIds)]
    const results: ReconciliationResult[] = []

    for (const productId of uniqueIds) {
      try {
        const result = await this.autoReconcileOnNewBatch(productId)
        if (result.reconciled) {
          results.push(result)
        }
      } catch (err) {
        DebugUtils.warn(MODULE_NAME, 'Reconciliation failed for product', {
          productId,
          error: err
        })
      }
    }

    return results
  }

  /**
   * Get reconciliation summary for a product.
   * Useful for reports and debugging.
   */
  async getReconciliationSummary(productId: string): Promise<{
    hasNegativeBatches: boolean
    totalNegativeQuantity: number
    negativeBatchCount: number
    estimatedValue: number
  }> {
    const negativeBatches = await negativeBatchService.getNegativeBatches(productId)

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
