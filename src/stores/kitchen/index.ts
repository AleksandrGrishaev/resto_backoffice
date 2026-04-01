// src/stores/kitchen/index.ts - Kitchen Coordinator with Supabase + Realtime
// Updated for order_items table architecture (Migration 053-054)
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { kitchenService, recoverStaleProcessingItems } from './kitchenService'
import { useKitchenRealtime } from './useKitchenRealtime'
import {
  fromSupabase as orderFromSupabase,
  fromOrderItemRow
} from '@/stores/pos/orders/supabaseMappers'
import { KITCHEN_ACTIVE_STATUSES } from '@/stores/pos/types'
import { startScheduledOrdersService, stopScheduledOrdersService } from './scheduledOrdersService'
import { DebugUtils, syncServerTime } from '@/utils'
import { ENV } from '@/config/environment'

const MODULE_NAME = 'KitchenStore'

export const useKitchenStore = defineStore('kitchen', () => {
  const initialized = ref(false)
  const error = ref<string | null>(null)
  const realtimeConnected = ref(false)

  const posOrdersStore = usePosOrdersStore()
  const { subscribe, unsubscribe, isConnected } = useKitchenRealtime()

  // Event deduplication: Track recently processed item updates
  // Prevents duplicate Supabase events from causing UI duplicates
  const recentItemUpdates = new Map<string, number>()
  const ITEM_UPDATE_DEBOUNCE_MS = 100 // 100ms window for deduplication

  // Track orders currently being fetched to prevent duplicate fetches
  const fetchingOrders = new Set<string>()

  // Buffer events that arrive while an order is being fetched
  // After fetch completes, buffered events are replayed to catch items added mid-fetch
  const pendingItemEvents = new Map<
    string,
    Array<{ item: any; eventType: 'INSERT' | 'UPDATE' | 'DELETE'; oldItem?: any }>
  >()

  // Track items from fetched orders to prevent re-processing
  const fetchedOrderItems = new Set<string>()

  /**
   * Initialize Kitchen System with Supabase
   * Загружает активные заказы из Supabase и подписывается на обновления
   */
  async function initialize() {
    if (initialized.value) {
      DebugUtils.debug(MODULE_NAME, 'Already initialized')
      return { success: true }
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing Kitchen system...')

      // Sync server time to handle device clock skew (common on tablets)
      await syncServerTime()

      // Load active orders from Supabase
      DebugUtils.info(MODULE_NAME, 'Loading orders from Supabase...')

      const orders = await kitchenService.getActiveKitchenOrders()
      posOrdersStore.orders = orders

      DebugUtils.info(MODULE_NAME, 'Kitchen orders loaded from Supabase', {
        count: orders.length,
        waiting: orders.filter(o => o.status === 'waiting').length,
        cooking: orders.filter(o => o.status === 'cooking').length,
        ready: orders.filter(o => o.status === 'ready').length
      })

      // ✨ Recovery: Reset any items stuck in 'processing' state (crash recovery)
      const recoveredCount = await recoverStaleProcessingItems()
      if (recoveredCount > 0) {
        DebugUtils.warn(MODULE_NAME, `Recovered ${recoveredCount} stuck processing items`, {
          recoveredCount
        })
      }

      // Subscribe to realtime updates (NEW: item-level updates)
      subscribe(
        // Item update callback (primary)
        (item, eventType, oldItem) => {
          handleItemUpdate(item, eventType, oldItem)
        },
        // Order update callback (for metadata changes)
        (order, eventType) => {
          handleOrderUpdate(order, eventType)
        }
        // No department filter - kitchen sees all items
      )

      realtimeConnected.value = isConnected.value

      // Start scheduled orders monitoring service
      startScheduledOrdersService()

      initialized.value = true

      DebugUtils.info(MODULE_NAME, 'Kitchen initialized successfully', {
        ordersCount: posOrdersStore.orders.length,
        realtimeEnabled: ENV.useSupabase
      })

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage

      DebugUtils.error(MODULE_NAME, 'Kitchen initialization failed', {
        error: errorMessage
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Check if item update was recently processed (deduplication)
   */
  function wasRecentlyProcessed(itemId: string, eventType: string): boolean {
    const key = `${itemId}_${eventType}`
    const now = Date.now()
    const lastProcessed = recentItemUpdates.get(key)

    if (lastProcessed && now - lastProcessed < ITEM_UPDATE_DEBOUNCE_MS) {
      return true
    }

    // Mark as processed and cleanup old entries
    recentItemUpdates.set(key, now)

    // Cleanup entries older than debounce window
    for (const [mapKey, timestamp] of recentItemUpdates.entries()) {
      if (now - timestamp > ITEM_UPDATE_DEBOUNCE_MS * 2) {
        recentItemUpdates.delete(mapKey)
      }
    }

    return false
  }

  /**
   * Handle realtime ITEM updates (NEW: Migration 053-054)
   * Items are now tracked in separate order_items table
   */
  async function handleItemUpdate(
    item: any,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    oldItem?: any
  ) {
    try {
      const orderId = item?.order_id || oldItem?.order_id
      const itemId = item?.id || oldItem?.id

      if (!orderId || !itemId) {
        DebugUtils.warn(MODULE_NAME, 'Item update without order_id or itemId', { item, oldItem })
        return
      }

      // Deduplication: Check if we recently processed this exact event
      if (wasRecentlyProcessed(itemId, eventType)) {
        DebugUtils.debug(MODULE_NAME, 'Skipping duplicate item update (debounced)', {
          itemId,
          eventType,
          itemName: item?.menu_item_name || oldItem?.menu_item_name
        })
        return
      }

      // Find the order in local state
      const orderIndex = posOrdersStore.orders.findIndex(o => o.id === orderId)
      let order = orderIndex !== -1 ? posOrdersStore.orders[orderIndex] : null

      if (eventType === 'INSERT') {
        // Check if item is from a recently fetched order
        if (fetchedOrderItems.has(itemId)) {
          DebugUtils.debug(MODULE_NAME, 'Skipping INSERT for item from fetched order', {
            itemId,
            itemName: item.menu_item_name,
            orderId
          })
          return
        }

        // New item arrived (status changed to waiting, cooking, or ready)
        if (!order) {
          // Check if order is already being fetched — buffer the event for replay
          if (fetchingOrders.has(orderId)) {
            const buffer = pendingItemEvents.get(orderId) || []
            buffer.push({ item, eventType, oldItem })
            pendingItemEvents.set(orderId, buffer)
            DebugUtils.debug(MODULE_NAME, 'Buffered item event during order fetch', {
              orderId,
              itemId,
              itemName: item.menu_item_name,
              bufferSize: buffer.length
            })
            return
          }

          // Mark order as being fetched
          fetchingOrders.add(orderId)

          try {
            // Order not in local state - fetch it
            order = await kitchenService.getOrderById(orderId)
            if (order) {
              posOrdersStore.orders.push(order)

              // Mark all items from fetched order as processed
              for (const bill of order.bills) {
                for (const billItem of bill.items) {
                  fetchedOrderItems.add(billItem.id)
                }
              }

              DebugUtils.info(MODULE_NAME, '📥 New order fetched for item', {
                orderNumber: order.orderNumber,
                itemName: item.menu_item_name,
                totalItems: order.bills.reduce((sum, b) => sum + b.items.length, 0)
              })

              // Clean up fetched items tracking after 5 seconds
              setTimeout(() => {
                for (const bill of order!.bills) {
                  for (const billItem of bill.items) {
                    fetchedOrderItems.delete(billItem.id)
                  }
                }
              }, 5000)
            }
          } finally {
            fetchingOrders.delete(orderId)

            // Replay buffered events only if fetch succeeded (order is in store)
            const buffered = pendingItemEvents.get(orderId)
            pendingItemEvents.delete(orderId)
            if (buffered && buffered.length > 0 && order) {
              DebugUtils.info(MODULE_NAME, 'Replaying buffered events after fetch', {
                orderId,
                count: buffered.length
              })
              for (const evt of buffered) {
                if (!fetchedOrderItems.has(evt.item?.id || evt.oldItem?.id)) {
                  // Direct add instead of recursive handleItemUpdate to prevent re-fetch loops
                  if (evt.eventType === 'INSERT' || evt.eventType === 'UPDATE') {
                    addItemToOrder(order, evt.item)
                  }
                }
              }
            }
          }
        } else {
          addItemToOrder(order, item)
        }
      } else if (eventType === 'UPDATE') {
        // Item status changed (or item moved between orders via merge)

        // Handle item migration: if item's order_id changed (merge), remove it from the old order.
        // This happens when a website order is merged into a dine-in order —
        // items get upserted with the new order_id, but kitchen still has them
        // under the old order. Without this cleanup, items appear duplicated.
        // Guard: only scan when order_id actually changed (oldItem available from realtime)
        const orderIdChanged = oldItem && oldItem.order_id && oldItem.order_id !== item.order_id
        let migratedFromOrderId: string | null = null
        if (orderIdChanged)
          for (const existingOrder of posOrdersStore.orders) {
            if (existingOrder.id === orderId) continue // skip target order
            for (const bill of existingOrder.bills) {
              const oldIndex = bill.items.findIndex(i => i.id === itemId)
              if (oldIndex !== -1) {
                bill.items.splice(oldIndex, 1)
                migratedFromOrderId = existingOrder.id
                DebugUtils.info(MODULE_NAME, '🔀 Item migrated from order (merge)', {
                  fromOrder: existingOrder.orderNumber,
                  toOrderId: orderId,
                  itemName: item.menu_item_name
                })
                break
              }
            }
            if (migratedFromOrderId) break
          }

        // Clean up source order if it has no more kitchen items after migration
        if (migratedFromOrderId) {
          const srcIdx = posOrdersStore.orders.findIndex(o => o.id === migratedFromOrderId)
          if (srcIdx !== -1) {
            const srcOrder = posOrdersStore.orders[srcIdx]
            const hasKitchenItems = srcOrder.bills.some(b =>
              b.items.some(i => KITCHEN_ACTIVE_STATUSES.includes(i.status))
            )
            if (!hasKitchenItems) {
              posOrdersStore.orders.splice(srcIdx, 1)
              DebugUtils.info(MODULE_NAME, '📤 Old order removed after merge', {
                orderNumber: srcOrder.orderNumber
              })
            }
          }
        }

        if (order) {
          const appItem = fromOrderItemRow(item)
          // Find item in any bill
          let itemFound = false
          for (const bill of order.bills) {
            const itemIndex = bill.items.findIndex(i => i.id === item.id)
            if (itemIndex !== -1) {
              const existingItem = bill.items[itemIndex]

              // Detailed change detection (prevent unnecessary updates)
              const statusChanged = existingItem.status !== appItem.status
              const quantityChanged = existingItem.quantity !== appItem.quantity
              const modifiersChanged =
                JSON.stringify(existingItem.selectedModifiers) !==
                JSON.stringify(appItem.selectedModifiers)
              const hasActualChanges = statusChanged || quantityChanged || modifiersChanged

              if (hasActualChanges) {
                // Use splice to trigger Vue reactivity in nested array
                bill.items.splice(itemIndex, 1, appItem)
                DebugUtils.info(MODULE_NAME, '🔄 Item updated', {
                  orderNumber: order.orderNumber,
                  itemName: item.menu_item_name,
                  oldStatus: existingItem.status,
                  newStatus: appItem.status,
                  changes: {
                    status: statusChanged,
                    quantity: quantityChanged,
                    modifiers: modifiersChanged
                  }
                })
              } else {
                DebugUtils.debug(MODULE_NAME, 'Ignoring item update (no actual changes)', {
                  itemId: item.id,
                  status: item.status
                })
              }
              itemFound = true
              break
            }
          }

          if (itemFound) {
            // Recalculate order status based on items
            recalculateOrderStatus(order)
          } else {
            // Item not found in any bill — add it (may have arrived via new bill)
            DebugUtils.warn(MODULE_NAME, 'Item not found in order for update, adding it', {
              orderId,
              itemId: item.id,
              itemName: item.menu_item_name
            })
            addItemToOrder(order, item)
            recalculateOrderStatus(order)
          }
        } else {
          // Order not found — fetch it from DB (e.g., after reconnect)
          // Guard against concurrent fetches for the same order
          if (fetchingOrders.has(orderId)) {
            DebugUtils.debug(MODULE_NAME, 'Order fetch already in progress for UPDATE, skipping', {
              orderId,
              itemId: item.id
            })
          } else {
            fetchingOrders.add(orderId)
            try {
              const fetchedOrder = await kitchenService.getOrderById(orderId)
              if (fetchedOrder && fetchedOrder.bills.some(b => b.items.length > 0)) {
                posOrdersStore.orders.push(fetchedOrder)
                DebugUtils.info(MODULE_NAME, '📥 Order fetched for unknown update', {
                  orderNumber: fetchedOrder.orderNumber,
                  totalItems: fetchedOrder.bills.reduce((sum, b) => sum + b.items.length, 0)
                })
              }
            } finally {
              fetchingOrders.delete(orderId)
            }
          }
        }
      } else if (eventType === 'DELETE') {
        // Item removed from kitchen view (served, cancelled, or department changed)
        if (order) {
          // Remove item from order
          for (const bill of order.bills) {
            const itemIndex = bill.items.findIndex(i => i.id === (item?.id || oldItem?.id))
            if (itemIndex !== -1) {
              bill.items.splice(itemIndex, 1)
              DebugUtils.info(MODULE_NAME, '🗑️ Item removed', {
                orderNumber: order.orderNumber,
                itemName: item?.menu_item_name || oldItem?.menu_item_name
              })
              break
            }
          }

          // Check if order should be removed (no more kitchen items)
          const hasKitchenItems = order.bills.some(b =>
            b.items.some(i => KITCHEN_ACTIVE_STATUSES.includes(i.status))
          )

          if (!hasKitchenItems) {
            posOrdersStore.orders.splice(orderIndex, 1)
            DebugUtils.info(MODULE_NAME, '📤 Order removed (no more kitchen items)', {
              orderNumber: order.orderNumber
            })
          } else {
            // Recalculate order status
            recalculateOrderStatus(order)
          }
        }
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to handle item update', { err, eventType, item })
    }
  }

  /**
   * Add item to order with bill_id fallback
   * If exact bill not found, uses first bill (prevents silent item loss)
   */
  function addItemToOrder(order: any, item: any) {
    // Check if item already exists in any bill (before expensive mapping)
    for (const bill of order.bills) {
      if (bill.items.some((i: any) => i.id === item.id)) {
        DebugUtils.debug(MODULE_NAME, 'Item already exists in order (skipping add)', {
          itemId: item.id,
          itemName: item.menu_item_name
        })
        return
      }
    }

    const appItem = fromOrderItemRow(item)

    // Find matching bill or fallback to first bill
    let targetBill = order.bills.find((b: any) => b.id === item.bill_id)
    if (!targetBill && order.bills.length > 0) {
      targetBill = order.bills[0]
      DebugUtils.warn(MODULE_NAME, 'Bill not found for item, using fallback bill', {
        itemId: item.id,
        itemName: item.menu_item_name,
        expectedBillId: item.bill_id,
        fallbackBillId: targetBill.id,
        orderNumber: order.orderNumber
      })
    }

    if (targetBill) {
      targetBill.items.push(appItem)
      DebugUtils.info(MODULE_NAME, '➕ Item added to order', {
        orderNumber: order.orderNumber,
        itemName: item.menu_item_name,
        status: item.status,
        billId: targetBill.id,
        usedFallback: targetBill.id !== item.bill_id
      })
    } else {
      DebugUtils.error(MODULE_NAME, 'Cannot add item - order has no bills', {
        orderId: order.id,
        itemId: item.id,
        itemName: item.menu_item_name
      })
    }
  }

  /**
   * Handle realtime ORDER updates (metadata changes only)
   */
  function handleOrderUpdate(updatedOrder: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') {
    try {
      if (eventType === 'DELETE') {
        // Order deleted from database
        const index = posOrdersStore.orders.findIndex(o => o.id === updatedOrder.id)
        if (index !== -1) {
          const order = posOrdersStore.orders[index]
          posOrdersStore.orders.splice(index, 1)
          DebugUtils.info(MODULE_NAME, '🗑️ Order deleted', {
            orderNumber: order.orderNumber
          })
        }
      } else if (eventType === 'UPDATE') {
        // Order metadata updated (table_id, notes, etc.)
        const index = posOrdersStore.orders.findIndex(o => o.id === updatedOrder.id)
        if (index !== -1) {
          // Update metadata + status from DB (safety net for recalculateOrderStatus)
          const localOrder = posOrdersStore.orders[index]
          if (updatedOrder.status && updatedOrder.status !== localOrder.status) {
            DebugUtils.info(MODULE_NAME, '📝 Order status synced from DB', {
              orderNumber: localOrder.orderNumber,
              oldStatus: localOrder.status,
              newStatus: updatedOrder.status
            })
            localOrder.status = updatedOrder.status
          }
          localOrder.tableId = updatedOrder.table_id || undefined
          localOrder.notes = updatedOrder.notes || undefined
          localOrder.customerName = updatedOrder.customer_name || undefined
          // Don't update bills - items come from order_items subscription
          DebugUtils.debug(MODULE_NAME, '📝 Order metadata updated', {
            orderNumber: localOrder.orderNumber
          })
        }
      }
      // INSERT is handled by item subscription (when first item arrives)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to handle order update', { err, eventType })
    }
  }

  /**
   * Recalculate order status based on item statuses
   * Order status = min status of all items (waiting < cooking < ready)
   */
  function recalculateOrderStatus(order: any) {
    // Note: 'scheduled' is an ITEM-level status, not order-level.
    // At order level, scheduled items are treated as 'waiting'.
    const statusPriority: Record<string, number> = {
      scheduled: 1, // Same priority as waiting (order-level = waiting)
      waiting: 1,
      cooking: 2,
      ready: 3,
      served: 4,
      cancelled: 5
    }

    // Map item statuses to valid order statuses
    const statusToOrderStatus: Record<string, string> = {
      scheduled: 'waiting', // scheduled items → order shows as 'waiting'
      waiting: 'waiting',
      cooking: 'cooking',
      ready: 'ready',
      served: 'served',
      cancelled: 'cancelled'
    }

    let minPriority = Infinity
    let minStatus = 'ready'

    for (const bill of order.bills) {
      for (const item of bill.items) {
        const priority = statusPriority[item.status] || Infinity
        if (priority < minPriority) {
          minPriority = priority
          minStatus = item.status
        }
      }
    }

    // Map to valid order-level status (e.g., scheduled → waiting)
    const orderStatus = statusToOrderStatus[minStatus] || minStatus

    // Update order status if changed (allow all statuses including served/cancelled)
    if (order.status !== orderStatus && minPriority !== Infinity) {
      order.status = orderStatus as any
      DebugUtils.debug(MODULE_NAME, 'Order status recalculated', {
        orderNumber: order.orderNumber,
        newStatus: minStatus
      })
    }
  }

  /**
   * Cleanup - unsubscribe from realtime
   */
  function cleanup() {
    unsubscribe()
    stopScheduledOrdersService()
    recentItemUpdates.clear()
    fetchingOrders.clear()
    pendingItemEvents.clear()
    fetchedOrderItems.clear()
    initialized.value = false
    realtimeConnected.value = false
    DebugUtils.info(MODULE_NAME, 'Kitchen store cleaned up')
  }

  return {
    initialized,
    error,
    realtimeConnected,
    initialize,
    cleanup
  }
})
