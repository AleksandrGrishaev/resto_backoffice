// src/stores/pos/orders/composables/useCancellation.ts
import { ref } from 'vue'
import type { PosBillItem, CancellationReason, ServiceResponse } from '@/stores/pos/types'
import { usePosOrdersStore } from '../ordersStore'
import { useAuthStore } from '@/stores/auth/authStore'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'useCancellation'

export interface CancellationRequest {
  reason: CancellationReason
  notes?: string
  shouldWriteOff: boolean
}

export interface CancellationResult {
  success: boolean
  writeOffPending?: boolean // true if write-off is running in background
  error?: string
}

export interface WriteOffCallbacks {
  onSuccess?: (operationId: string) => void
  onError?: (error: string) => void
}

/**
 * Composable for handling order item cancellation with optional write-off
 */
export function useCancellation() {
  const ordersStore = usePosOrdersStore()
  const authStore = useAuthStore()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const writeOffInProgress = ref(false)

  /**
   * Check if item requires cancellation reason (non-draft items)
   */
  function requiresReason(item: PosBillItem): boolean {
    return item.status !== 'draft'
  }

  /**
   * Check if item can be cancelled
   */
  function canCancel(item: PosBillItem): { allowed: boolean; reason?: string } {
    if (item.status === 'served') {
      return { allowed: false, reason: 'Cannot cancel served items' }
    }
    if (item.status === 'cancelled') {
      return { allowed: false, reason: 'Item already cancelled' }
    }
    if (item.paymentStatus === 'paid') {
      return { allowed: false, reason: 'Cannot cancel paid items' }
    }
    return { allowed: true }
  }

  /**
   * Check if write-off should be offered (cooking or ready items)
   */
  function shouldOfferWriteOff(item: PosBillItem): boolean {
    return item.status === 'cooking' || item.status === 'ready'
  }

  /**
   * Cancel an item - either delete (draft) or mark as cancelled (other statuses)
   * Write-off runs in background and doesn't block the cancellation
   */
  async function cancelItem(
    orderId: string,
    billId: string,
    item: PosBillItem,
    request?: CancellationRequest,
    writeOffCallbacks?: WriteOffCallbacks
  ): Promise<CancellationResult> {
    loading.value = true
    error.value = null

    try {
      const currentUser = authStore.user?.name || 'Unknown'

      // Draft items - simple deletion without reason
      if (item.status === 'draft') {
        DebugUtils.info(MODULE_NAME, 'Deleting draft item', { itemId: item.id })

        const result = await ordersStore.removeItemFromBill(orderId, billId, item.id)

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete item')
        }

        return { success: true }
      }

      // Non-draft items - require reason and use cancelItem
      if (!request) {
        throw new Error('Cancellation reason required for non-draft items')
      }

      DebugUtils.info(MODULE_NAME, 'Cancelling item', {
        itemId: item.id,
        status: item.status,
        reason: request.reason,
        shouldWriteOff: request.shouldWriteOff
      })

      // Cancel the item FIRST (fast operation)
      const result = await ordersStore.cancelItem(orderId, billId, item.id, {
        reason: request.reason,
        notes: request.notes,
        cancelledBy: currentUser
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel item')
      }

      DebugUtils.info(MODULE_NAME, 'Item cancelled successfully', {
        itemId: item.id
      })

      // Handle write-off based on item's current write-off status
      if (request.shouldWriteOff) {
        // ✨ CHECK: If item already has completed write-off (Ready-Triggered)
        if (item.writeOffStatus === 'completed' && item.writeOffOperationId) {
          // Just update the reason to 'cancellation_loss' (no new write-off needed)
          DebugUtils.info(
            MODULE_NAME,
            'Item already has write-off, updating reason to cancellation_loss',
            {
              itemId: item.id,
              writeOffOperationId: item.writeOffOperationId
            }
          )
          // ✅ FIX: Await the update to ensure it completes before returning
          await updateExistingWriteOffReason(
            item.writeOffOperationId,
            request.reason,
            request.notes
          )
          return { success: true, writeOffPending: false }
        }

        // Queue new write-off in BACKGROUND (don't block UI)
        queueWriteOffInBackground(
          orderId,
          billId,
          item,
          request.reason,
          currentUser,
          writeOffCallbacks
        )
        return { success: true, writeOffPending: true }
      }

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel item'
      error.value = errorMsg
      DebugUtils.error(MODULE_NAME, 'Cancellation failed', { error: err })
      return { success: false, error: errorMsg }
    } finally {
      loading.value = false
    }
  }

  /**
   * Queue write-off in background - fire and forget with callbacks
   */
  function queueWriteOffInBackground(
    orderId: string,
    billId: string,
    item: PosBillItem,
    reason: CancellationReason,
    responsiblePerson: string,
    callbacks?: WriteOffCallbacks
  ): void {
    writeOffInProgress.value = true

    DebugUtils.info(MODULE_NAME, '🔄 Starting background write-off', {
      itemId: item.id,
      menuItemName: item.menuItemName
    })

    // Fire and forget - don't await
    createWriteOff(item, reason, responsiblePerson)
      .then(async operationId => {
        writeOffInProgress.value = false

        if (operationId) {
          DebugUtils.info(MODULE_NAME, '✅ Background write-off completed', {
            itemId: item.id,
            operationId
          })

          // Update the item with write-off operation ID
          try {
            await ordersStore.updateItemWriteOffId(orderId, billId, item.id, operationId)
          } catch (err) {
            DebugUtils.error(MODULE_NAME, 'Failed to update write-off ID on item', { error: err })
          }

          callbacks?.onSuccess?.(operationId)
        } else {
          DebugUtils.info(
            MODULE_NAME,
            '⚠️ Background write-off completed but no operation created',
            {
              itemId: item.id
            }
          )
        }
      })
      .catch(err => {
        writeOffInProgress.value = false
        const errorMsg = err instanceof Error ? err.message : 'Write-off failed'
        DebugUtils.error(MODULE_NAME, '❌ Background write-off failed', {
          itemId: item.id,
          error: err
        })
        callbacks?.onError?.(errorMsg)
      })
  }

  /**
   * Create write-off for cancelled item using DecompositionEngine
   */
  async function createWriteOff(
    item: PosBillItem,
    reason: CancellationReason,
    responsiblePerson: string
  ): Promise<string | undefined> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating write-off for cancelled item', {
        itemId: item.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity
      })

      // Import decomposition engine dynamically
      const { createDecompositionEngine } = await import('@/core/decomposition/DecompositionEngine')
      const { createWriteOffAdapter } = await import(
        '@/core/decomposition/adapters/WriteOffAdapter'
      )
      const { useStorageStore } = await import('@/stores/storage/storageStore')

      const engine = await createDecompositionEngine()
      const adapter = createWriteOffAdapter()
      const storageStore = useStorageStore()

      // Traverse menu item to get ingredients
      const traversalResult = await engine.traverse(
        {
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          quantity: item.quantity,
          selectedModifiers: item.selectedModifiers || []
        },
        adapter.getTraversalOptions()
      )

      // Transform to write-off items
      const writeOffResult = await adapter.transform(traversalResult, {
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        quantity: item.quantity,
        selectedModifiers: item.selectedModifiers || []
      })

      if (!writeOffResult.items || writeOffResult.items.length === 0) {
        DebugUtils.info(MODULE_NAME, 'No ingredients to write off')
        return undefined
      }

      // Map cancellation reason to write-off reason
      const writeOffReason = mapCancellationToWriteOffReason(reason)

      // Create write-off operation
      const operation = await storageStore.createWriteOff({
        department: item.department || 'kitchen',
        responsiblePerson,
        reason: writeOffReason,
        items: writeOffResult.items.map(wi => ({
          itemId: wi.type === 'product' ? wi.productId! : wi.preparationId!,
          itemName: wi.type === 'product' ? wi.productName! : wi.preparationName!,
          itemType: wi.type as 'product' | 'preparation',
          quantity: wi.quantity,
          unit: wi.unit
        })),
        notes: `Cancelled order item: ${item.menuItemName} (${reason})`
      })

      DebugUtils.info(MODULE_NAME, 'Write-off created', { operationId: operation.id })
      return operation.id
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to create write-off', { error: err })
      // Don't fail the cancellation if write-off fails
      return undefined
    }
  }

  /**
   * Map cancellation reason to write-off reason
   */
  function mapCancellationToWriteOffReason(
    reason: CancellationReason
  ): 'other' | 'spoiled' | 'expired' | 'cancellation_loss' {
    switch (reason) {
      case 'kitchen_mistake':
        return 'other' // Kitchen error - operational loss
      case 'customer_refused':
        return 'other' // Customer decision - operational loss
      case 'wrong_order':
        return 'other' // Order error - operational loss
      case 'out_of_stock':
        return 'other' // Should rarely have write-off
      default:
        return 'other'
    }
  }

  /**
   * ✨ Handle cancellation of item that already had write-off (Ready-Triggered)
   *
   * When an item is cancelled AFTER kitchen marked it as ready:
   * - Write-off already happened (storage_operation exists)
   * - We just need to update the reason to 'cancellation_loss'
   * - This ensures it shows up in losses, not in normal sales COGS
   */
  async function updateExistingWriteOffReason(
    writeOffOperationId: string,
    reason: CancellationReason,
    notes?: string
  ): Promise<void> {
    try {
      const { useStorageStore } = await import('@/stores/storage/storageStore')
      const storageStore = useStorageStore()

      await storageStore.updateWriteOffReason(
        writeOffOperationId,
        'cancellation_loss',
        `Cancelled after ready: ${reason}${notes ? ` - ${notes}` : ''}`
      )

      DebugUtils.info(MODULE_NAME, 'Updated existing write-off reason to cancellation_loss', {
        writeOffOperationId,
        originalReason: reason
      })
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to update write-off reason', { error: err })
      // Non-critical - the cancellation itself succeeded
    }
  }

  return {
    loading,
    error,
    writeOffInProgress,
    requiresReason,
    canCancel,
    shouldOfferWriteOff,
    cancelItem
  }
}
