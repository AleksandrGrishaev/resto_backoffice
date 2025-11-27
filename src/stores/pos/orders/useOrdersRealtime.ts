// src/stores/pos/orders/useOrdersRealtime.ts
// POS Orders Realtime Composable - Subscribe to order updates from Kitchen

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import { usePosOrdersStore } from './ordersStore'
import { fromSupabase } from './supabaseMappers'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'POSOrdersRealtime'

/**
 * POS Orders Realtime Subscription
 * Listens for order updates from Kitchen (item status changes)
 *
 * IMPORTANT: This composable is used in Pinia stores, not Vue components.
 * DO NOT use onUnmounted() here - it won't work in stores!
 * Cleanup must be handled manually via unsubscribe() method.
 */
export function useOrdersRealtime() {
  const channel = ref<RealtimeChannel | null>(null)
  const isConnected = ref(false)
  const ordersStore = usePosOrdersStore()

  /**
   * Subscribe to orders table changes
   * POS listens for updates from Kitchen (item status changes)
   */
  function subscribe() {
    if (channel.value) {
      DebugUtils.debug(MODULE_NAME, 'Already subscribed, unsubscribing first')
      unsubscribe()
    }

    DebugUtils.info(MODULE_NAME, 'Subscribing to POS orders...')

    channel.value = supabase
      .channel('pos-orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        payload => {
          DebugUtils.info(MODULE_NAME, '🔄 POS order update received', {
            orderNumber: payload.new?.order_number,
            status: payload.new?.status
          })

          const index = ordersStore.orders.findIndex(o => o.id === payload.new?.id)

          if (index !== -1) {
            // IMPORTANT: Preserve local bills/items, only update order-level fields
            // Supabase Realtime UPDATE events may not include full JSONB items array
            const existingOrder = ordersStore.orders[index]
            const updatedOrderPartial = fromSupabase(payload.new)

            // Merge: keep local bills, update order-level fields
            const mergedOrder = {
              ...existingOrder,
              // Update order-level fields from Supabase
              status: updatedOrderPartial.status,
              paymentStatus: updatedOrderPartial.paymentStatus,
              totalAmount: updatedOrderPartial.totalAmount,
              discountAmount: updatedOrderPartial.discountAmount,
              taxAmount: updatedOrderPartial.taxAmount,
              finalAmount: updatedOrderPartial.finalAmount,
              paidAmount: updatedOrderPartial.paidAmount,
              paymentIds: updatedOrderPartial.paymentIds,
              updatedAt: updatedOrderPartial.updatedAt,

              // Preserve local bills unless Supabase has bills (from full fetch)
              bills:
                updatedOrderPartial.bills.length > 0
                  ? updatedOrderPartial.bills
                  : existingOrder.bills
            }

            ordersStore.orders[index] = mergedOrder

            DebugUtils.info(MODULE_NAME, '✅ Order updated in POS (merged)', {
              orderNumber: mergedOrder.orderNumber,
              status: mergedOrder.status,
              billsCount: mergedOrder.bills.length,
              itemsCount: mergedOrder.bills.reduce((sum, b) => sum + b.items.length, 0)
            })
          } else {
            // Order not found locally - might be from another POS instance
            // Load full order from Supabase (not from Realtime payload)
            DebugUtils.debug(MODULE_NAME, 'Order not found in local state, ignoring', {
              orderId: payload.new?.id
            })
          }
        }
      )
      .subscribe(status => {
        DebugUtils.info(MODULE_NAME, 'Realtime subscription status', { status })
        isConnected.value = status === 'SUBSCRIBED'

        if (status === 'SUBSCRIBED') {
          DebugUtils.info(MODULE_NAME, '📡 POS Realtime connected')
        } else if (status === 'CHANNEL_ERROR') {
          DebugUtils.error(MODULE_NAME, '❌ POS Realtime error')
        } else if (status === 'CLOSED') {
          DebugUtils.info(MODULE_NAME, '📡 POS Realtime closed')
        }
      })
  }

  /**
   * Unsubscribe from realtime updates
   * IMPORTANT: Must be called manually by the parent store (e.g., posStore.cleanup())
   */
  function unsubscribe() {
    if (channel.value) {
      DebugUtils.info(MODULE_NAME, 'Unsubscribing from POS orders')
      supabase.removeChannel(channel.value)
      channel.value = null
      isConnected.value = false
    }
  }

  return {
    subscribe,
    unsubscribe,
    isConnected
  }
}
