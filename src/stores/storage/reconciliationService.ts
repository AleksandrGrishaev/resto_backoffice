import { negativeBatchService } from './negativeBatchService'
import { writeOffExpenseService } from './writeOffExpenseService'
import { useProductsStore } from '@/stores/productsStore'

/**
 * Service for auto-reconciling negative batches when new stock arrives
 *
 * @module reconciliationService
 * @description
 * When new inventory arrives for a product that has unreconciled negative batches:
 * 1. Detects all unreconciled negative batches for the product
 * 2. Creates income transactions to offset the original expenses
 * 3. Marks negative batches as reconciled
 *
 * This ensures that:
 * - P&L reports accurately reflect inventory movements
 * - Negative batch expenses are offset when stock arrives
 * - Full audit trail of reconciliation events
 */
class ReconciliationService {
  /**
   * Auto-reconcile negative batches when new batch is added
   * Creates income transactions to offset negative batch expenses
   *
   * @param productId - UUID of the product
   * @returns Promise that resolves when reconciliation is complete
   *
   * @example
   * // Called after creating new batch
   * await reconciliationService.autoReconcileOnNewBatch(productId)
   */
  async autoReconcileOnNewBatch(productId: string): Promise<void> {
    // 1. Check for unreconciled negative batches
    const negativeBatches = await negativeBatchService.getNegativeBatches(productId)
    if (negativeBatches.length === 0) {
      // No negative batches to reconcile
      return
    }

    // 2. Get product info for transaction description
    const productsStore = useProductsStore()
    const product = productsStore.products.find(p => p.id === productId)

    if (!product) {
      console.error(`❌ Product not found for reconciliation: ${productId}`)
      return
    }

    console.info(
      `🔄 Auto-reconciling ${negativeBatches.length} negative batches for ${product.name}`
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
          productName: product.name,
          quantity: quantity,
          costPerUnit: costPerUnit,
          unit: negativeBatch.unit
        })

        // 5. Mark negative batch as reconciled
        await negativeBatchService.markAsReconciled(negativeBatch.id)

        console.info(
          `✅ Reconciled negative batch: ${product.name} (+${quantity} ${negativeBatch.unit} @ ${costPerUnit})`
        )

        // 6. ✅ FIX: Refresh balances cache to ensure reconciled status is reflected
        const { useStorageStore } = await import('@/stores/storage')
        const storageStore = useStorageStore()
        await storageStore.fetchBalances()
      } catch (error) {
        console.error(`❌ Failed to reconcile negative batch ${negativeBatch.id}:`, error)
        // Continue with other batches even if one fails
      }
    }

    // 6. Log summary
    const totalQty = negativeBatches.reduce((sum, b) => sum + Math.abs(b.currentQuantity), 0)
    console.info(
      `✅ Auto-reconciled ${negativeBatches.length} negative batches for ${product.name} (total: ${totalQty} ${negativeBatches[0]?.unit || ''})`
    )
  }

  /**
   * Get reconciliation summary for a product
   * Useful for reports and debugging
   *
   * @param productId - UUID of the product
   * @returns Summary of unreconciled negative batches
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
