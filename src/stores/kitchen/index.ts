// src/stores/kitchen/index.ts - Kitchen Coordinator with Supabase + Realtime
// Updated for order_items table architecture (Migration 053-054)
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { kitchenService } from './kitchenService'
import { useKitchenRealtime } from './useKitchenRealtime'
import {
  fromSupabase as orderFromSupabase,
  fromOrderItemRow
} from '@/stores/pos/orders/supabaseMappers'
import { DebugUtils } from '@/utils'
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
          // Check if order is already being fetched
          if (fetchingOrders.has(orderId)) {
            DebugUtils.debug(MODULE_NAME, 'Order fetch already in progress, skipping', {
              orderId,
              itemId,
              itemName: item.menu_item_name
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
            // Always remove from fetching set
            fetchingOrders.delete(orderId)
          }
        } else {
          // Order exists - add item to correct bill
          const appItem = fromOrderItemRow(item)
          const bill = order.bills.find(b => b.id === item.bill_id)
          if (bill) {
            const existingItemIndex = bill.items.findIndex(i => i.id === item.id)
            if (existingItemIndex === -1) {
              bill.items.push(appItem)
              DebugUtils.info(MODULE_NAME, '➕ Item added to order', {
                orderNumber: order.orderNumber,
                itemName: item.menu_item_name,
                status: item.status
              })
            } else {
              DebugUtils.debug(MODULE_NAME, 'Item already exists in bill (skipping INSERT)', {
                itemId: item.id,
                itemName: item.menu_item_name
              })
            }
          }
        }
      } else if (eventType === 'UPDATE') {
        // Item status changed
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
            DebugUtils.warn(MODULE_NAME, 'Item not found in order for update', {
              orderId,
              itemId: item.id,
              itemName: item.menu_item_name
            })
          }
        } else {
          // Order not found - might need to fetch it
          DebugUtils.debug(MODULE_NAME, 'Item update for unknown order', { orderId, item })
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
            b.items.some(i => ['waiting', 'cooking', 'ready'].includes(i.status))
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
          // Update only metadata, preserve items from local state
          const localOrder = posOrdersStore.orders[index]
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
    const statusPriority: Record<string, number> = {
      waiting: 1,
      cooking: 2,
      ready: 3,
      served: 4,
      cancelled: 5
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

    // Update order status if changed (allow all statuses including served/cancelled)
    if (order.status !== minStatus && minPriority !== Infinity) {
      order.status = minStatus
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
