// src/stores/kitchen/useKitchenRealtime.ts
// Kitchen Realtime Composable - Subscribe to order updates from POS

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'KitchenRealtime'

/**
 * Kitchen Realtime Subscription
 * Listens for order changes from POS (new orders, status updates)
 *
 * NOTE: This composable is used in Pinia store (not Vue component),
 * so we DON'T use onUnmounted here. Cleanup is handled manually via unsubscribe().
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
          const oldOrder = payload.old

          // IMPORTANT: Kitchen ONLY processes orders in ['waiting', 'cooking', 'ready']
          // Ignore all other statuses (draft, served, cancelled, etc.)
          const kitchenStatuses = ['waiting', 'cooking', 'ready']
          const isKitchenOrder = order && kitchenStatuses.includes(order.status)
          const wasKitchenOrder = oldOrder && kitchenStatuses.includes(oldOrder.status)

          if (eventType === 'DELETE') {
            // Handle deletion (order removed from database)
            DebugUtils.info(MODULE_NAME, 'Order removed from kitchen view', {
              event: eventType,
              orderId: payload.old?.id
            })
            onOrderUpdate(payload.old, eventType)
          } else if (eventType === 'INSERT' && isKitchenOrder) {
            // New order arrived for kitchen
            DebugUtils.info(MODULE_NAME, 'Kitchen order created', {
              event: eventType,
              orderNumber: order.order_number,
              status: order.status
            })
            onOrderUpdate(order, eventType)
          } else if (eventType === 'UPDATE' && isKitchenOrder) {
            // Existing kitchen order updated
            DebugUtils.info(MODULE_NAME, 'Kitchen order updated', {
              event: eventType,
              orderNumber: order.order_number,
              status: order.status
            })
            onOrderUpdate(order, eventType)
          } else if (eventType === 'UPDATE' && wasKitchenOrder && !isKitchenOrder) {
            // Order status changed FROM kitchen status TO non-kitchen status
            // (e.g., cooking → served, ready → cancelled)
            DebugUtils.info(MODULE_NAME, '🔄 Order removed from kitchen', {
              orderNumber: order.order_number,
              oldStatus: oldOrder.status,
              newStatus: order.status
            })
            // Only remove if it was previously in kitchen
            onOrderUpdate(order, 'DELETE')
          } else {
            // IGNORE all other cases:
            // - draft → draft (POS editing order)
            // - draft → waiting (will be handled by INSERT logic)
            // - served → served (already removed)
            DebugUtils.debug(MODULE_NAME, 'Ignoring non-kitchen order update', {
              event: eventType,
              status: order?.status,
              oldStatus: oldOrder?.status
            })
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
   * IMPORTANT: Must be called manually when store is destroyed (e.g., in cleanup())
   */
  function unsubscribe() {
    if (channel.value) {
      DebugUtils.info(MODULE_NAME, 'Unsubscribing from kitchen orders')
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
