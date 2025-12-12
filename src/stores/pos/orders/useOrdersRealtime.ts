// src/stores/pos/orders/useOrdersRealtime.ts
// POS Orders Realtime Composable - Subscribe to order updates from Kitchen
// Updated for order_items table architecture (Migration 053-054)

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import { usePosOrdersStore } from './ordersStore'
import { fromSupabase, fromOrderItemRow } from './supabaseMappers'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'POSOrdersRealtime'

/**
 * POS Orders Realtime Subscription (NEW: Migration 053-054)
 * Listens for order updates from Kitchen (item status changes)
 *
 * Key change: Now subscribes to BOTH orders and order_items tables
 * - orders: for order-level changes (status, payment, etc.)
 * - order_items: for item-level changes (status from kitchen)
 *
 * IMPORTANT: This composable is used in Pinia stores, not Vue components.
 * DO NOT use onUnmounted() here - it won't work in stores!
 * Cleanup must be handled manually via unsubscribe() method.
 */
export function useOrdersRealtime() {
  const ordersChannel = ref<RealtimeChannel | null>(null)
  const itemsChannel = ref<RealtimeChannel | null>(null)
  const isConnected = ref(false)
  const ordersStore = usePosOrdersStore()

  /**
   * Subscribe to orders and order_items table changes
   * POS listens for updates from Kitchen (item status changes)
   */
  function subscribe() {
    if (ordersChannel.value || itemsChannel.value) {
      DebugUtils.debug(MODULE_NAME, 'Already subscribed, unsubscribing first')
      unsubscribe()
    }

    DebugUtils.info(MODULE_NAME, 'Subscribing to POS orders + order_items...')

    // =====================================================
    // SUBSCRIBE TO orders TABLE (order-level updates)
    // =====================================================
    ordersChannel.value = supabase
      .channel('pos-orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        payload => {
          handleOrderUpdate(payload)
        }
      )
      .subscribe(status => {
        DebugUtils.info(MODULE_NAME, 'Orders channel status', { status })
        if (status === 'SUBSCRIBED') {
          DebugUtils.info(MODULE_NAME, '📡 POS orders Realtime connected')
        }
      })

    // =====================================================
    // SUBSCRIBE TO order_items TABLE (item-level updates)
    // =====================================================
    itemsChannel.value = supabase
      .channel('pos-order-items')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'order_items'
        },
        payload => {
          handleItemUpdate(payload)
        }
      )
      .subscribe(status => {
        DebugUtils.info(MODULE_NAME, 'Items channel status', { status })
        isConnected.value = status === 'SUBSCRIBED'

        if (status === 'SUBSCRIBED') {
          DebugUtils.info(MODULE_NAME, '📡 POS order_items Realtime connected')
        } else if (status === 'CHANNEL_ERROR') {
          DebugUtils.error(MODULE_NAME, '❌ POS order_items Realtime error')
        }
      })
  }

  /**
   * Handle order-level updates (status, payment, metadata)
   */
  function handleOrderUpdate(payload: any) {
    const updatedOrder = payload.new

    DebugUtils.info(MODULE_NAME, '🔄 POS order update received', {
      orderNumber: updatedOrder?.order_number,
      status: updatedOrder?.status
    })

    const index = ordersStore.orders.findIndex(o => o.id === updatedOrder?.id)

    if (index !== -1) {
      const existingOrder = ordersStore.orders[index]

      // Update only order-level fields, preserve local items
      // Items are updated via order_items subscription
      existingOrder.status = updatedOrder.status || existingOrder.status
      existingOrder.paymentStatus = updatedOrder.payment_status || existingOrder.paymentStatus
      existingOrder.totalAmount = updatedOrder.total_amount ?? existingOrder.totalAmount
      existingOrder.discountAmount = updatedOrder.discount_amount ?? existingOrder.discountAmount
      existingOrder.taxAmount = updatedOrder.tax_amount ?? existingOrder.taxAmount
      existingOrder.finalAmount = updatedOrder.final_amount ?? existingOrder.finalAmount
      existingOrder.paidAmount = updatedOrder.paid_amount ?? existingOrder.paidAmount
      existingOrder.paymentIds = updatedOrder.payment_ids || existingOrder.paymentIds
      existingOrder.updatedAt = updatedOrder.updated_at

      DebugUtils.info(MODULE_NAME, '✅ Order metadata updated in POS', {
        orderNumber: existingOrder.orderNumber,
        status: existingOrder.status
      })
    } else {
      DebugUtils.debug(MODULE_NAME, 'Order not found in local state, ignoring', {
        orderId: updatedOrder?.id
      })
    }
  }

  /**
   * Handle item-level updates (status from kitchen)
   * NEW: Migration 053-054
   */
  function handleItemUpdate(payload: any) {
    const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
    const item = payload.new
    const oldItem = payload.old
    const orderId = item?.order_id || oldItem?.order_id

    if (!orderId) {
      DebugUtils.debug(MODULE_NAME, 'Item update without order_id, ignoring')
      return
    }

    // Find order in local state
    const orderIndex = ordersStore.orders.findIndex(o => o.id === orderId)
    if (orderIndex === -1) {
      DebugUtils.debug(MODULE_NAME, 'Order not found for item update', { orderId })
      return
    }

    const order = ordersStore.orders[orderIndex]

    if (eventType === 'UPDATE') {
      // Find item in any bill and update it
      for (const bill of order.bills) {
        const itemIndex = bill.items.findIndex(i => i.id === item.id)
        if (itemIndex !== -1) {
          // Preserve kitchenNotes from local if not in Supabase
          const localItem = bill.items[itemIndex]
          const updatedItem = fromOrderItemRow(item)

          // Merge: keep local kitchenNotes if Supabase doesn't have it
          if (localItem.kitchenNotes && !updatedItem.kitchenNotes) {
            updatedItem.kitchenNotes = localItem.kitchenNotes
          }

          bill.items[itemIndex] = updatedItem

          DebugUtils.info(MODULE_NAME, '✅ Item updated from kitchen', {
            orderNumber: order.orderNumber,
            itemName: item.menu_item_name,
            oldStatus: oldItem?.status,
            newStatus: item.status
          })

          // Also update localStorage
          updateItemInLocalStorage(updatedItem)

          break
        }
      }
    } else if (eventType === 'DELETE') {
      // Remove item from order (cancelled)
      for (const bill of order.bills) {
        const itemIndex = bill.items.findIndex(i => i.id === (item?.id || oldItem?.id))
        if (itemIndex !== -1) {
          bill.items.splice(itemIndex, 1)

          DebugUtils.info(MODULE_NAME, '🗑️ Item removed', {
            orderNumber: order.orderNumber,
            itemName: item?.menu_item_name || oldItem?.menu_item_name
          })

          // Also remove from localStorage
          removeItemFromLocalStorage(item?.id || oldItem?.id)

          break
        }
      }
    }
    // INSERT is handled by POS when adding items, not from Kitchen
  }

  /**
   * Update item in localStorage (for offline sync)
   */
  function updateItemInLocalStorage(item: any) {
    try {
      const items = JSON.parse(localStorage.getItem('pos_order_items') || '[]')
      const index = items.findIndex((i: any) => i.id === item.id)
      if (index !== -1) {
        items[index] = { ...items[index], ...item }
        localStorage.setItem('pos_order_items', JSON.stringify(items))
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to update localStorage', { err })
    }
  }

  /**
   * Remove item from localStorage
   */
  function removeItemFromLocalStorage(itemId: string) {
    try {
      const items = JSON.parse(localStorage.getItem('pos_order_items') || '[]')
      const filtered = items.filter((i: any) => i.id !== itemId)
      localStorage.setItem('pos_order_items', JSON.stringify(filtered))
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove from localStorage', { err })
    }
  }

  /**
   * Unsubscribe from realtime updates
   * IMPORTANT: Must be called manually by the parent store (e.g., posStore.cleanup())
   */
  function unsubscribe() {
    if (ordersChannel.value) {
      DebugUtils.info(MODULE_NAME, 'Unsubscribing from POS orders')
      supabase.removeChannel(ordersChannel.value)
      ordersChannel.value = null
    }
    if (itemsChannel.value) {
      DebugUtils.info(MODULE_NAME, 'Unsubscribing from POS order_items')
      supabase.removeChannel(itemsChannel.value)
      itemsChannel.value = null
    }
    isConnected.value = false
  }

  return {
    subscribe,
    unsubscribe,
    isConnected
  }
}
