// src/stores/kitchen/useKitchenRealtime.ts
// Kitchen Realtime Composable - Subscribe to order_items updates
// Updated for order_items table architecture (Migration 053-054)

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'KitchenRealtime'

/**
 * Kitchen Realtime Subscription (NEW: Migration 053-054)
 * Listens for order_items changes (status updates)
 *
 * Key change: Now subscribes to order_items table, not orders!
 * This allows:
 * - Direct filtering by department (kitchen vs bar)
 * - Tracking individual item status changes
 * - Sound alerts only when NEW items arrive (status changes to 'waiting')
 *
 * NOTE: This composable is used in Pinia store (not Vue component),
 * so we DON'T use onUnmounted here. Cleanup is handled manually via unsubscribe().
 */
export function useKitchenRealtime() {
  const itemsChannel = ref<RealtimeChannel | null>(null)
  const ordersChannel = ref<RealtimeChannel | null>(null)
  const isConnected = ref(false)

  /**
   * Subscribe to order_items table changes (NEW architecture)
   *
   * @param onItemUpdate - Callback when item is inserted or updated
   * @param onOrderUpdate - Callback when order metadata changes (optional)
   * @param departmentFilter - Optional filter for department ('kitchen' | 'bar')
   */
  function subscribe(
    onItemUpdate: (item: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE', oldItem?: any) => void,
    onOrderUpdate?: (order: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void,
    departmentFilter?: 'kitchen' | 'bar'
  ) {
    if (itemsChannel.value) {
      DebugUtils.debug(MODULE_NAME, 'Already subscribed, unsubscribing first')
      unsubscribe()
    }

    DebugUtils.info(MODULE_NAME, '🔔 Subscribing to kitchen order_items...', { departmentFilter })

    // =====================================================
    // SUBSCRIBE TO order_items TABLE
    // This is the PRIMARY subscription for kitchen display
    // =====================================================
    itemsChannel.value = supabase
      .channel('kitchen-order-items')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'order_items'
        },
        payload => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
          const item = payload.new as any
          const oldItem = payload.old as any

          // Kitchen statuses we care about
          const kitchenStatuses = ['waiting', 'cooking', 'ready']
          const isKitchenItem = item && kitchenStatuses.includes(item.status)
          const wasKitchenItem = oldItem && kitchenStatuses.includes(oldItem.status)

          // Department filter (if configured)
          const itemDepartment = item?.department || 'kitchen'
          const oldItemDepartment = oldItem?.department || 'kitchen'
          const matchesDepartment = !departmentFilter || itemDepartment === departmentFilter
          const matchedDepartment = !departmentFilter || oldItemDepartment === departmentFilter

          if (eventType === 'DELETE') {
            // Item deleted from order
            if (matchedDepartment) {
              DebugUtils.info(MODULE_NAME, '🗑️ Item deleted', {
                itemId: oldItem?.id,
                itemName: oldItem?.menu_item_name,
                orderId: oldItem?.order_id
              })
              onItemUpdate(oldItem, 'DELETE')
            }
          } else if (eventType === 'INSERT' && isKitchenItem && matchesDepartment) {
            // New item added (shouldn't happen often - usually UPDATE from draft)
            DebugUtils.info(MODULE_NAME, '➕ New item for kitchen', {
              itemId: item.id,
              itemName: item.menu_item_name,
              orderId: item.order_id,
              status: item.status,
              department: itemDepartment
            })
            onItemUpdate(item, 'INSERT')
          } else if (eventType === 'UPDATE') {
            // Status changed
            const statusChanged = oldItem?.status !== item?.status

            if (isKitchenItem && matchesDepartment) {
              // Item is now in kitchen status and matches department
              if (statusChanged && !wasKitchenItem) {
                // Item ENTERED kitchen (e.g., draft → waiting)
                DebugUtils.info(MODULE_NAME, '🆕 Item entered kitchen', {
                  itemId: item.id,
                  itemName: item.menu_item_name,
                  orderId: item.order_id,
                  oldStatus: oldItem?.status,
                  newStatus: item.status,
                  department: itemDepartment
                })
                onItemUpdate(item, 'INSERT', oldItem)
              } else {
                // Item status changed within kitchen (e.g., waiting → cooking)
                DebugUtils.info(MODULE_NAME, '🔄 Item status updated', {
                  itemId: item.id,
                  itemName: item.menu_item_name,
                  orderId: item.order_id,
                  oldStatus: oldItem?.status,
                  newStatus: item.status
                })
                onItemUpdate(item, 'UPDATE', oldItem)
              }
            } else if (
              wasKitchenItem &&
              matchedDepartment &&
              (!isKitchenItem || !matchesDepartment)
            ) {
              // Item LEFT kitchen (e.g., ready → served, or changed department)
              DebugUtils.info(MODULE_NAME, '✅ Item left kitchen', {
                itemId: item.id,
                itemName: item.menu_item_name,
                orderId: item.order_id,
                oldStatus: oldItem?.status,
                newStatus: item.status
              })
              onItemUpdate(item, 'DELETE', oldItem)
            } else {
              // Other updates (draft → draft, etc.) - ignore
              DebugUtils.debug(MODULE_NAME, 'Ignoring non-kitchen item update', {
                itemId: item?.id,
                oldStatus: oldItem?.status,
                newStatus: item?.status,
                department: itemDepartment,
                departmentFilter
              })
            }
          }
        }
      )
      .subscribe(status => {
        DebugUtils.info(MODULE_NAME, 'Items channel status', { status })
        if (status === 'SUBSCRIBED') {
          DebugUtils.info(MODULE_NAME, '📡 order_items Realtime connected')
          isConnected.value = true
        } else if (status === 'CHANNEL_ERROR') {
          DebugUtils.error(MODULE_NAME, '❌ order_items Realtime error')
        }
      })

    // =====================================================
    // OPTIONAL: Subscribe to orders TABLE for metadata changes
    // (e.g., table_id, order_number updates)
    // =====================================================
    if (onOrderUpdate) {
      ordersChannel.value = supabase
        .channel('kitchen-orders-meta')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          payload => {
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
            const order = payload.new || payload.old

            // We only care about orders that might have items in kitchen
            const kitchenStatuses = ['waiting', 'cooking', 'ready']
            const isKitchenOrder = order && kitchenStatuses.includes(order.status)

            if (eventType === 'DELETE' || isKitchenOrder) {
              DebugUtils.debug(MODULE_NAME, 'Order metadata change', {
                event: eventType,
                orderId: order?.id,
                orderNumber: order?.order_number
              })
              onOrderUpdate(order, eventType)
            }
          }
        )
        .subscribe()
    }
  }

  /**
   * Unsubscribe from realtime updates
   * IMPORTANT: Must be called manually when store is destroyed
   */
  function unsubscribe() {
    if (itemsChannel.value) {
      DebugUtils.info(MODULE_NAME, 'Unsubscribing from order_items')
      supabase.removeChannel(itemsChannel.value)
      itemsChannel.value = null
    }
    if (ordersChannel.value) {
      DebugUtils.info(MODULE_NAME, 'Unsubscribing from orders')
      supabase.removeChannel(ordersChannel.value)
      ordersChannel.value = null
    }
    isConnected.value = false
  }

  return {
    subscribe,
    unsubscribe,
    isConnected
  }
}
