// src/stores/pos/orders/useOrdersRealtime.ts
// POS Orders Realtime Composable - Subscribe to order updates from Kitchen
// Updated for order_items table architecture (Migration 053-054)

import { ref, computed } from 'vue'
import { supabase } from '@/supabase/client'
import { usePosOrdersStore } from './ordersStore'
import { fromSupabase, fromOrderItemRow } from './supabaseMappers'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'POSOrdersRealtime'

// Online order sound — simple module-level Audio element (no AudioContext!)
// AudioContext.resume() consumes the transient user activation, leaving nothing
// for Audio.play(). So we skip AudioContext entirely and use Audio directly.
const ONLINE_ORDER_SOUND_URL = '/sounds/online-order.mp3'
let _audio: HTMLAudioElement | null = null
let _audioUnlocked = false

/**
 * Unlock audio for browser autoplay policy.
 * Must be called from a Vue @click handler (real user gesture).
 * IMPORTANT: Fully synchronous — async functions lose user activation in some browsers.
 */
export function unlockOnlineOrderAudio(): void {
  if (_audioUnlocked) return
  if (!_audio) {
    _audio = new Audio(ONLINE_ORDER_SOUND_URL)
    _audio.volume = 0.8
  }
  // play() MUST be called synchronously in the user gesture call stack.
  // Do NOT use async/await — Chrome loses user activation across microtask boundaries.
  const p = _audio.play()
  if (p) {
    p.then(() => {
      _audio!.pause()
      _audio!.currentTime = 0
      _audioUnlocked = true
      DebugUtils.info(MODULE_NAME, 'Online order audio unlocked')
    }).catch(err => {
      DebugUtils.warn(MODULE_NAME, 'Could not unlock online order audio', { error: err })
    })
  }
}

// Cancellation request callback type
type CancellationRequestCallback = (order: {
  orderId: string
  orderNumber: string
  reason?: string
}) => void

// Customer linked callback type (from invite QR claim)
type CustomerLinkedCallback = (info: {
  orderId: string
  orderNumber: string
  customerId: string
  customerName?: string
}) => void

// Online order received callback type
type OnlineOrderReceivedCallback = (order: {
  orderId: string
  orderNumber: string
  type: string
  itemCount: number
  total: number
  customerName?: string
  fulfillmentMethod?: string
}) => void

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
  const ordersConnected = ref(false)
  const itemsConnected = ref(false)
  const isConnected = computed(() => ordersConnected.value && itemsConnected.value)
  const ordersStore = usePosOrdersStore()
  let onCancellationRequest: CancellationRequestCallback | null = null
  let onCustomerLinked: CustomerLinkedCallback | null = null
  let onOnlineOrder: OnlineOrderReceivedCallback | null = null

  // Reconnect state
  let isUnsubscribing = false
  let ordersRetryTimer: ReturnType<typeof setTimeout> | null = null
  let itemsRetryTimer: ReturnType<typeof setTimeout> | null = null
  let ordersRetryCount = 0
  let itemsRetryCount = 0
  const MAX_RETRY_DELAY_MS = 30_000 // 30s cap

  // Visibility change catch-up: track when page was last active
  let lastActiveTimestamp: string = new Date().toISOString()
  let visibilityHandler: (() => void) | null = null

  function getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s...
    return Math.min(1000 * Math.pow(2, attempt), MAX_RETRY_DELAY_MS)
  }

  function scheduleOrdersReconnect() {
    if (isUnsubscribing) return
    if (ordersRetryTimer) clearTimeout(ordersRetryTimer)
    const delay = getRetryDelay(ordersRetryCount)
    ordersRetryCount++
    DebugUtils.warn(
      MODULE_NAME,
      `Scheduling orders reconnect in ${delay}ms (attempt ${ordersRetryCount})`
    )
    ordersRetryTimer = setTimeout(() => {
      ordersRetryTimer = null
      if (!isUnsubscribing) subscribeOrders()
    }, delay)
  }

  function scheduleItemsReconnect() {
    if (isUnsubscribing) return
    if (itemsRetryTimer) clearTimeout(itemsRetryTimer)
    const delay = getRetryDelay(itemsRetryCount)
    itemsRetryCount++
    DebugUtils.warn(
      MODULE_NAME,
      `Scheduling order_items reconnect in ${delay}ms (attempt ${itemsRetryCount})`
    )
    itemsRetryTimer = setTimeout(() => {
      itemsRetryTimer = null
      if (!isUnsubscribing) subscribeItems()
    }, delay)
  }

  /**
   * Subscribe to orders table (order-level updates)
   */
  function subscribeOrders() {
    if (ordersChannel.value) {
      supabase.removeChannel(ordersChannel.value)
      ordersChannel.value = null
    }

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
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        payload => {
          handleOrderInsert(payload)
        }
      )
      .subscribe((status, err) => {
        ordersConnected.value = status === 'SUBSCRIBED'

        if (status === 'SUBSCRIBED') {
          ordersRetryCount = 0
          console.log('📡 [POSRealtime] orders channel SUBSCRIBED')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [POSRealtime] orders channel ERROR:', err?.message)
          scheduleOrdersReconnect()
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ [POSRealtime] orders channel TIMED_OUT')
          scheduleOrdersReconnect()
        } else if (status === 'CLOSED') {
          console.warn('🔌 [POSRealtime] orders channel CLOSED')
          if (!isUnsubscribing) scheduleOrdersReconnect()
        } else {
          console.log(`🔄 [POSRealtime] orders channel status: ${status}`)
        }
      })
  }

  /**
   * Subscribe to order_items table (item-level updates)
   */
  function subscribeItems() {
    if (itemsChannel.value) {
      supabase.removeChannel(itemsChannel.value)
      itemsChannel.value = null
    }

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
      .subscribe((status, err) => {
        itemsConnected.value = status === 'SUBSCRIBED'

        if (status === 'SUBSCRIBED') {
          itemsRetryCount = 0
          console.log('📡 [POSRealtime] order_items channel SUBSCRIBED')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [POSRealtime] order_items channel ERROR:', err?.message)
          scheduleItemsReconnect()
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ [POSRealtime] order_items channel TIMED_OUT')
          scheduleItemsReconnect()
        } else if (status === 'CLOSED') {
          console.warn('🔌 [POSRealtime] order_items channel CLOSED')
          if (!isUnsubscribing) scheduleItemsReconnect()
        } else {
          console.log(`🔄 [POSRealtime] order_items channel status: ${status}`)
        }
      })
  }

  /**
   * Catch-up: fetch online orders that arrived while the page was hidden.
   * Supabase Realtime does NOT replay missed events, so we query the DB directly.
   */
  async function catchUpMissedOrders() {
    try {
      DebugUtils.info(MODULE_NAME, '🔄 Catching up missed online orders since', {
        since: lastActiveTimestamp
      })

      const { data: newOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('source', 'website')
        .gte('created_at', lastActiveTimestamp)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: true })

      if (fetchError) {
        DebugUtils.error(MODULE_NAME, 'Failed to catch up missed orders', { error: fetchError })
        return
      }

      if (!newOrders || newOrders.length === 0) {
        DebugUtils.debug(MODULE_NAME, 'No missed online orders')
        return
      }

      let addedCount = 0
      for (const orderRow of newOrders) {
        // Skip if already in store
        if (ordersStore.orders.some(o => o.id === orderRow.id)) continue

        // Load items
        const { data: itemRows } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderRow.id)

        const items = (itemRows || []).map(fromOrderItemRow)
        const order = fromSupabase(orderRow, items)
        ordersStore.orders.push(order)
        addedCount++

        // Play sound + notify for each missed order
        if (_audioUnlocked && _audio) {
          _audio.currentTime = 0
          _audio.play().catch(() => {})
        }
        if (onOnlineOrder) {
          onOnlineOrder({
            orderId: order.id,
            orderNumber: order.orderNumber,
            type: order.type,
            itemCount: items.length,
            total: order.finalAmount,
            customerName: order.customerName,
            fulfillmentMethod: order.fulfillmentMethod
          })
        }
      }

      if (addedCount > 0) {
        DebugUtils.info(MODULE_NAME, `✅ Caught up ${addedCount} missed online order(s)`)
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Error during catch-up', { err })
    }
  }

  /**
   * Handle page visibility change (tablet sleep/wake, tab switch).
   * On return to foreground: catch up missed orders + re-subscribe if needed.
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      // Going to background — record timestamp
      lastActiveTimestamp = new Date().toISOString()
      DebugUtils.debug(MODULE_NAME, 'Page hidden, recording timestamp', {
        at: lastActiveTimestamp
      })
    } else {
      // Returning to foreground — catch up missed orders
      DebugUtils.info(MODULE_NAME, '👁️ Page visible again, checking for missed orders...')

      // Re-subscribe channels if they disconnected while in background
      if (!ordersConnected.value || !itemsConnected.value) {
        DebugUtils.warn(MODULE_NAME, 'Channels disconnected while hidden, re-subscribing')
        subscribeOrders()
        subscribeItems()
      }

      catchUpMissedOrders()
    }
  }

  /**
   * Subscribe to orders and order_items table changes
   * POS listens for updates from Kitchen (item status changes)
   */
  function subscribe() {
    isUnsubscribing = false
    ordersRetryCount = 0
    itemsRetryCount = 0

    if (ordersChannel.value || itemsChannel.value) {
      DebugUtils.debug(MODULE_NAME, 'Already subscribed, unsubscribing first')
      unsubscribe()
      isUnsubscribing = false // Reset after cleanup
    }

    DebugUtils.info(MODULE_NAME, 'Subscribing to POS orders + order_items...')
    subscribeOrders()
    subscribeItems()

    // Register visibility change handler for catch-up on tablet wake
    if (!visibilityHandler) {
      visibilityHandler = handleVisibilityChange
      document.addEventListener('visibilitychange', visibilityHandler)
      DebugUtils.debug(MODULE_NAME, 'Registered visibilitychange handler for catch-up')
    }
  }

  /**
   * Handle new order INSERT (online orders from website)
   * Loads full order with items and adds to POS store
   */
  async function handleOrderInsert(payload: any) {
    const newOrder = payload.new
    console.log('🔔 [POSRealtime] RAW ORDER INSERT EVENT:', {
      id: newOrder?.id,
      order_number: newOrder?.order_number,
      source: newOrder?.source,
      type: newOrder?.type,
      status: newOrder?.status,
      timestamp: new Date().toISOString()
    })

    if (!newOrder?.id) return

    // Only auto-load online orders (source = 'website')
    // POS-created orders are already in local state
    if (newOrder.source !== 'website') {
      console.log('🔔 [POSRealtime] Ignoring non-website order:', newOrder.source)
      return
    }

    // Check if already in store (shouldn't be, but safety check)
    if (ordersStore.orders.some(o => o.id === newOrder.id)) {
      DebugUtils.debug(MODULE_NAME, 'Order already in store', { orderId: newOrder.id })
      return
    }

    DebugUtils.info(MODULE_NAME, '🌐 New online order received!', {
      orderNumber: newOrder.order_number,
      type: newOrder.type,
      source: newOrder.source
    })

    try {
      // IMPORTANT: Re-fetch the full order from DB because the INSERT event
      // fires with stale data (bills=[]) before the RPC's UPDATE sets the actual bills.
      // By the time this handler runs, the RPC transaction has committed.
      const { data: freshOrder, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', newOrder.id)
        .single()

      if (orderError || !freshOrder) {
        DebugUtils.error(MODULE_NAME, 'Failed to re-fetch online order', { error: orderError })
        return
      }

      // Load order items from DB
      const { data: itemRows, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', newOrder.id)

      if (itemsError) {
        DebugUtils.error(MODULE_NAME, 'Failed to load online order items', { error: itemsError })
        return
      }

      // Map to app types using fresh order data (with correct bills JSONB)
      const items = (itemRows || []).map(fromOrderItemRow)
      const order = fromSupabase(freshOrder, items)

      // Add to store
      ordersStore.orders.push(order)

      DebugUtils.info(MODULE_NAME, '✅ Online order added to POS', {
        orderNumber: order.orderNumber,
        type: order.type,
        itemCount: items.length,
        total: order.finalAmount
      })

      // Play online order sound (only if audio was unlocked by user interaction)
      if (_audioUnlocked && _audio) {
        _audio.currentTime = 0
        _audio.play().catch(err => {
          DebugUtils.warn(MODULE_NAME, 'Failed to play online order sound', { error: err })
        })
      } else {
        DebugUtils.debug(
          MODULE_NAME,
          'Audio not yet unlocked — sound skipped (will work after first click)'
        )
      }

      // Notify POS view via callback
      if (onOnlineOrder) {
        onOnlineOrder({
          orderId: order.id,
          orderNumber: order.orderNumber,
          type: order.type,
          itemCount: items.length,
          total: order.finalAmount,
          customerName: order.customerName,
          fulfillmentMethod: order.fulfillmentMethod
        })
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Error loading online order', { err, orderId: newOrder.id })
    }
  }

  /**
   * Handle order-level updates (status, payment, metadata)
   */
  function handleOrderUpdate(payload: any) {
    const updatedOrder = payload.new

    console.log('🔔 [POSRealtime] RAW ORDER UPDATE EVENT:', {
      id: updatedOrder?.id,
      order_number: updatedOrder?.order_number,
      status: updatedOrder?.status,
      source: updatedOrder?.source,
      timestamp: new Date().toISOString()
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

      // Online ordering fields
      if (updatedOrder.source) existingOrder.source = updatedOrder.source
      if (updatedOrder.fulfillment_method)
        existingOrder.fulfillmentMethod = updatedOrder.fulfillment_method
      if (updatedOrder.customer_name !== undefined)
        existingOrder.customerName = updatedOrder.customer_name
      if (updatedOrder.customer_phone) existingOrder.customerPhone = updatedOrder.customer_phone
      if (updatedOrder.customer_id !== undefined) {
        const oldCustomerId = existingOrder.customerId
        existingOrder.customerId = updatedOrder.customer_id

        // Propagate customer to first bill if bill has no customer yet
        if (updatedOrder.customer_id && existingOrder.bills?.length) {
          const firstBill = existingOrder.bills[0]
          if (!firstBill.customerId) {
            firstBill.customerId = updatedOrder.customer_id
            firstBill.customerName = updatedOrder.customer_name || undefined
          }
        }

        // Detect customer linked via invite QR (null → value)
        if (!oldCustomerId && updatedOrder.customer_id && onCustomerLinked) {
          DebugUtils.info(MODULE_NAME, '🔗 Customer linked to order via invite', {
            orderNumber: existingOrder.orderNumber,
            customerId: updatedOrder.customer_id
          })
          onCustomerLinked({
            orderId: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            customerId: updatedOrder.customer_id,
            customerName: updatedOrder.customer_name
          })
        }
      }
      if (updatedOrder.comment) existingOrder.comment = updatedOrder.comment

      // Cancellation request fields
      if (updatedOrder.cancellation_requested_at) {
        existingOrder.cancellationRequestedAt = updatedOrder.cancellation_requested_at
      }
      if (updatedOrder.cancellation_reason) {
        existingOrder.cancellationReason = updatedOrder.cancellation_reason
      }
      if (updatedOrder.cancellation_resolved_at) {
        existingOrder.cancellationResolvedAt = updatedOrder.cancellation_resolved_at
        existingOrder.cancellationResolvedBy = updatedOrder.cancellation_resolved_by
      }

      // Detect NEW cancellation request (not already resolved)
      const oldHadRequest = payload.old?.cancellation_requested_at
      const newHasRequest = updatedOrder.cancellation_requested_at
      const isResolved = updatedOrder.cancellation_resolved_at
      if (!oldHadRequest && newHasRequest && !isResolved && onCancellationRequest) {
        DebugUtils.info(MODULE_NAME, '🔔 Cancellation request detected!', {
          orderNumber: existingOrder.orderNumber,
          reason: updatedOrder.cancellation_reason
        })
        onCancellationRequest({
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          reason: updatedOrder.cancellation_reason
        })
      }

      DebugUtils.info(MODULE_NAME, '✅ Order metadata updated in POS', {
        orderNumber: existingOrder.orderNumber,
        status: existingOrder.status
      })

      // Persist updated order to localStorage for offline resilience
      try {
        const stored = localStorage.getItem('pos_orders')
        if (stored) {
          const ordersList = JSON.parse(stored)
          const idx = ordersList.findIndex((o: { id: string }) => o.id === existingOrder.id)
          if (idx >= 0) {
            Object.assign(ordersList[idx], {
              customer_id: existingOrder.customerId,
              customer_name: existingOrder.customerName,
              status: existingOrder.status
            })
            localStorage.setItem('pos_orders', JSON.stringify(ordersList))
          }
        }
      } catch {
        // localStorage sync is best-effort
      }
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

    console.log('🔔 [POSRealtime] RAW order_items EVENT:', {
      eventType,
      itemId: item?.id || oldItem?.id,
      orderId,
      itemName: item?.menu_item_name,
      status: item?.status,
      oldStatus: oldItem?.status,
      timestamp: new Date().toISOString()
    })

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

    if (eventType === 'INSERT') {
      // New item added to existing order (e.g., customer adds item via website)
      const newItem = fromOrderItemRow(item)
      const billId = item.bill_id

      // Check if item already exists (dedup)
      const alreadyExists = order.bills.some(b => b.items.some(i => i.id === item.id))
      if (alreadyExists) {
        DebugUtils.debug(MODULE_NAME, 'Item already exists in order, skipping INSERT', {
          itemId: item.id
        })
        return
      }

      // Find the matching bill or use the first one
      let targetBill = order.bills.find(b => b.id === billId)
      if (!targetBill && order.bills.length > 0) {
        targetBill = order.bills[0]
      }

      if (targetBill) {
        targetBill.items.push(newItem)
        console.log('✅ [POSRealtime] New item added to existing order', {
          orderNumber: order.orderNumber,
          itemName: item.menu_item_name,
          billId: targetBill.id,
          status: item.status
        })
      } else {
        console.warn('⚠️ [POSRealtime] No bill found for new item, creating placeholder bill', {
          orderNumber: order.orderNumber,
          billId
        })
        // Create a minimal bill to hold the item
        order.bills.push({
          id: billId,
          billNumber: item.bill_number || '1',
          orderId: order.id,
          name: `Bill ${item.bill_number || '1'}`,
          items: [newItem],
          subtotal: 0,
          discountAmount: 0,
          taxAmount: 0,
          total: 0,
          status: 'active',
          paymentStatus: 'unpaid',
          paidAmount: 0
        } as any)
      }
    } else if (eventType === 'UPDATE') {
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
    isUnsubscribing = true
    if (ordersRetryTimer) {
      clearTimeout(ordersRetryTimer)
      ordersRetryTimer = null
    }
    if (itemsRetryTimer) {
      clearTimeout(itemsRetryTimer)
      itemsRetryTimer = null
    }
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
    ordersConnected.value = false
    itemsConnected.value = false

    // Remove visibility handler
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }
  }

  /**
   * Register callback for cancellation request notifications
   */
  function onCancellationRequested(callback: CancellationRequestCallback) {
    onCancellationRequest = callback
  }

  /**
   * Register callback for customer linked via invite QR
   */
  function onCustomerLinkedToOrder(callback: CustomerLinkedCallback) {
    onCustomerLinked = callback
  }

  /**
   * Register callback for online order received notifications
   */
  function onOnlineOrderReceived(callback: OnlineOrderReceivedCallback) {
    onOnlineOrder = callback
  }

  return {
    subscribe,
    unsubscribe,
    isConnected,
    onCancellationRequested,
    onCustomerLinkedToOrder,
    onOnlineOrderReceived
  }
}
