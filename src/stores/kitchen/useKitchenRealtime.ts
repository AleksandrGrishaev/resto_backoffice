// src/stores/kitchen/useKitchenRealtime.ts
// Kitchen Realtime Composable - Subscribe to order updates from POS

import { ref, onUnmounted } from 'vue'
import { supabase } from '@/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'KitchenRealtime'

/**
 * Kitchen Realtime Subscription
 * Listens for order changes from POS (new orders, status updates)
 */
export function useKitchenRealtime() {
  const channel = ref<RealtimeChannel | null>(null)
  const isConnected = ref(false)

  /**
   * Subscribe to orders table changes
   * Listen for: INSERT, UPDATE on orders with status in (waiting, cooking, ready)
   *
   * @param onOrderUpdate - Callback when order is inserted or updated
   */
  function subscribe(
    onOrderUpdate: (order: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void
  ) {
    if (channel.value) {
      DebugUtils.debug(MODULE_NAME, 'Already subscribed, unsubscribing first')
      unsubscribe()
    }

    DebugUtils.info(MODULE_NAME, 'Subscribing to kitchen orders...')

    channel.value = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders'
        },
        payload => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
          const order = payload.new || payload.old

          // Filter: Kitchen only sees waiting, cooking, ready
          if (order && ['waiting', 'cooking', 'ready'].includes(order.status)) {
            DebugUtils.info(MODULE_NAME, 'Kitchen order update received', {
              event: eventType,
              orderNumber: order.order_number,
              status: order.status
            })

            onOrderUpdate(order, eventType)
          } else if (eventType === 'DELETE') {
            // Handle deletion (order moved to served/cancelled)
            DebugUtils.info(MODULE_NAME, 'Order removed from kitchen view', {
              event: eventType,
              orderId: payload.old?.id
            })
            onOrderUpdate(payload.old, eventType)
          } else if (eventType === 'UPDATE' && order) {
            // Order status changed to non-kitchen status (e.g., cancelled)
            if (!['waiting', 'cooking', 'ready'].includes(order.status)) {
              DebugUtils.info(MODULE_NAME, 'Order status changed to non-kitchen', {
                orderNumber: order.order_number,
                status: order.status
              })
              onOrderUpdate(order, 'DELETE') // Treat as removal
            }
          }
        }
      )
      .subscribe(status => {
        DebugUtils.info(MODULE_NAME, 'Realtime subscription status', { status })
        isConnected.value = status === 'SUBSCRIBED'

        if (status === 'SUBSCRIBED') {
          DebugUtils.info(MODULE_NAME, '📡 Kitchen Realtime connected')
        } else if (status === 'CHANNEL_ERROR') {
          DebugUtils.error(MODULE_NAME, '❌ Kitchen Realtime error')
        } else if (status === 'CLOSED') {
          DebugUtils.info(MODULE_NAME, '📡 Kitchen Realtime closed')
        }
      })
  }

  /**
   * Unsubscribe from realtime updates
   */
  function unsubscribe() {
    if (channel.value) {
      DebugUtils.info(MODULE_NAME, 'Unsubscribing from kitchen orders')
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
