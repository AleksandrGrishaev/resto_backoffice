// src/stores/pos/orders/useOrdersRealtime.ts
// POS Orders Realtime Composable - Subscribe to order updates from Kitchen

import { ref, onUnmounted } from 'vue'
import { supabase } from '@/supabase/client'
import { usePosOrdersStore } from './ordersStore'
import { fromSupabase } from './supabaseMappers'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'POSOrdersRealtime'

/**
 * POS Orders Realtime Subscription
 * Listens for order updates from Kitchen (item status changes)
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

          // Update order in local state
          const updatedOrder = fromSupabase(payload.new)
          const index = ordersStore.orders.findIndex(o => o.id === updatedOrder.id)

          if (index !== -1) {
            // Update existing order
            ordersStore.orders[index] = updatedOrder

            DebugUtils.info(MODULE_NAME, '✅ Order updated in POS', {
              orderNumber: updatedOrder.orderNumber,
              status: updatedOrder.status,
              itemsCount: updatedOrder.bills.reduce((sum, b) => sum + b.items.length, 0)
            })
          } else {
            // Order not found locally - might be a new order
            DebugUtils.debug(MODULE_NAME, 'Order not found in local state, ignoring', {
              orderId: updatedOrder.id
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
   */
  function unsubscribe() {
    if (channel.value) {
      DebugUtils.info(MODULE_NAME, 'Unsubscribing from POS orders')
      supabase.removeChannel(channel.value)
      channel.value = null
      isConnected.value = false
    }
  }

  // Cleanup on component unmount
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    subscribe,
    unsubscribe,
    isConnected
  }
}
