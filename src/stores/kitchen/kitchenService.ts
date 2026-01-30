// src/stores/kitchen/kitchenService.ts
// Kitchen Service - Read-only operations + item status updates
// Updated for order_items table architecture (Migration 053-054)

import { supabase } from '@/supabase/client'
import {
  fromSupabase as orderFromSupabase,
  fromOrderItemRow,
  buildStatusUpdatePayload
} from '@/stores/pos/orders/supabaseMappers'
import type { PosOrder, ItemStatus, PosBillItem } from '@/stores/pos/types'
import { DebugUtils, extractErrorDetails } from '@/utils'
import { executeSupabaseMutation } from '@/utils/supabase'

const MODULE_NAME = 'KitchenService'

// Timeout for 'processing' status - items stuck longer than this are recovered
const PROCESSING_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get all active kitchen orders (waiting, cooking, ready)
 * Kitchen only sees orders that need preparation
 *
 * NEW (Migration 053-054): Loads from 2 tables - orders + order_items
 *
 * IMPORTANT: Filters by ITEM status, not ORDER status!
 * This ensures all ready items are shown, even if order status is 'served' or 'collected'
 * Items are filtered by today's date only (disappear at end of day)
 */
export async function getActiveKitchenOrders(): Promise<PosOrder[]> {
  try {
    // Calculate start of today (00:00:00 local time in ISO format)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfDay = today.toISOString()

    // Step 1: Get all kitchen items (waiting, cooking, ready) created today
    // FILTER BY ITEMS, NOT ORDERS!
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('status', ['waiting', 'cooking', 'ready']) // Filter by item status
      .gte('created_at', startOfDay) // Only today's items

    if (itemsError) {
      DebugUtils.error(MODULE_NAME, 'Failed to load kitchen items', { error: itemsError })
      return []
    }

    if (!itemsData || itemsData.length === 0) {
      DebugUtils.debug(MODULE_NAME, 'No active kitchen items today')
      return []
    }

    // Step 2: Get orders for these items (any order status - served, ready, collected, etc.)
    const orderIds = [...new Set(itemsData.map(item => item.order_id))]
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .in('id', orderIds)
      .order('created_at', { ascending: true })

    if (ordersError) {
      DebugUtils.error(MODULE_NAME, 'Failed to load orders for kitchen items', {
        error: ordersError
      })
      return []
    }

    if (!ordersData || ordersData.length === 0) {
      DebugUtils.debug(MODULE_NAME, 'No orders found for kitchen items')
      return []
    }

    // Step 3: Assemble orders with kitchen items only (filter items by order_id)
    const orders = ordersData.map(order => {
      const orderItems = itemsData.filter(row => row.order_id === order.id).map(fromOrderItemRow)
      return orderFromSupabase(order, orderItems)
    })

    DebugUtils.info(MODULE_NAME, 'Kitchen orders loaded (filtered by items, today only)', {
      count: orders.length,
      totalItems: itemsData.length,
      waitingItems: itemsData.filter(i => i.status === 'waiting').length,
      cookingItems: itemsData.filter(i => i.status === 'cooking').length,
      readyItems: itemsData.filter(i => i.status === 'ready').length,
      uniqueOrderStatuses: [...new Set(ordersData.map(o => o.status))].join(', '),
      dateFilter: startOfDay
    })

    return orders
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Exception loading kitchen orders', { error })
    return []
  }
}

/**
 * Get single order by ID with items
 * Used when a new item arrives for an order not in local state
 */
export async function getOrderById(orderId: string): Promise<PosOrder | null> {
  try {
    // Get order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !orderData) {
      DebugUtils.error(MODULE_NAME, 'Order not found', { orderId, error: orderError })
      return null
    }

    // Get items for this order (only kitchen statuses - waiting, cooking, ready)
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .in('status', ['waiting', 'cooking', 'ready'])

    if (itemsError) {
      DebugUtils.error(MODULE_NAME, 'Failed to load items for order', {
        orderId,
        error: itemsError
      })
      return null
    }

    const items = (itemsData || []).map(fromOrderItemRow)
    const order = orderFromSupabase(orderData, items)

    DebugUtils.debug(MODULE_NAME, 'Order loaded by ID', {
      orderNumber: order.orderNumber,
      itemCount: items.length
    })

    return order
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Exception getting order by ID', { orderId, error })
    return null
  }
}

/**
 * Calculate order status from items (minimum status)
 * Priority: draft > waiting > cooking > ready
 *
 * Business Logic:
 * - If ANY item is waiting → Order: waiting
 * - If ALL items cooking or higher → Order: cooking
 * - If ALL items ready → Order: ready
 */
export function calculateOrderStatus(
  items: Array<{ status: ItemStatus }>
): 'draft' | 'waiting' | 'cooking' | 'ready' {
  if (items.length === 0) return 'draft'

  // Check for minimum status (priority order)
  if (items.some(i => i.status === 'draft')) return 'draft'
  if (items.some(i => i.status === 'waiting')) return 'waiting'
  if (items.some(i => i.status === 'cooking')) return 'cooking'

  // All items ready
  return 'ready'
}

/**
 * Update item status in order_items table (NEW: Migration 053-054)
 * Kitchen updates individual items directly
 *
 * @param orderId - Order UUID (for reference)
 * @param itemId - Item UUID in order_items table
 * @param newStatus - New status (waiting, cooking, ready)
 */
export async function updateItemStatus(
  orderId: string,
  itemId: string,
  newStatus: 'waiting' | 'cooking' | 'ready'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Build update payload with appropriate timestamp
    const payload = buildStatusUpdatePayload(newStatus)

    // Update item directly in order_items table
    const { error: updateError } = await supabase
      .from('order_items')
      .update(payload)
      .eq('id', itemId)

    if (updateError) {
      DebugUtils.error(MODULE_NAME, 'Failed to update item status', {
        orderId,
        itemId,
        newStatus,
        error: updateError
      })
      return { success: false, error: updateError.message }
    }

    DebugUtils.info(MODULE_NAME, 'Item status updated', {
      itemId,
      newStatus
    })

    // Auto-update order status based on all items
    await checkAndUpdateOrderStatus(orderId)

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update item status'
    DebugUtils.error(MODULE_NAME, 'Exception updating item status', { error })
    return { success: false, error: message }
  }
}

/**
 * Auto-update order status based on items (NEW: Migration 053-054)
 * Called after each item status change
 *
 * Calculates order status from order_items and updates if changed
 */
export async function checkAndUpdateOrderStatus(orderId: string): Promise<void> {
  try {
    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      DebugUtils.error(MODULE_NAME, 'Order not found for status update', {
        orderId,
        error: orderError
      })
      return
    }

    // Get all items for this order
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('status')
      .eq('order_id', orderId)

    if (itemsError) {
      DebugUtils.error(MODULE_NAME, 'Failed to load items for status calculation', {
        orderId,
        error: itemsError
      })
      return
    }

    const itemStatuses = (items || []).map(i => ({ status: i.status as ItemStatus }))
    const calculatedStatus = calculateOrderStatus(itemStatuses)

    // Update order status if changed
    if (calculatedStatus !== order.status) {
      const updates: any = {
        status: calculatedStatus,
        updated_at: new Date().toISOString()
      }

      // Set actual_ready_time when all items ready (first time only)
      if (calculatedStatus === 'ready' && !order.actual_ready_time) {
        updates.actual_ready_time = new Date().toISOString()
      }

      try {
        await executeSupabaseMutation(async () => {
          const { error: updateError } = await supabase
            .from('orders')
            .update(updates)
            .eq('id', orderId)
          if (updateError) throw updateError
        }, `${MODULE_NAME}.autoUpdateOrderStatus`)

        DebugUtils.info(MODULE_NAME, 'Order status auto-updated', {
          orderNumber: order.order_number,
          oldStatus: order.status,
          newStatus: calculatedStatus,
          itemsCount: items?.length || 0
        })
      } catch (updateError) {
        DebugUtils.error(MODULE_NAME, 'Failed to auto-update order status', {
          orderId,
          calculatedStatus,
          ...extractErrorDetails(updateError)
        })
        return
      }
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Exception checking order status', { orderId, error })
  }
}

/**
 * ✨ RECOVERY: Reset stale 'processing' items back to 'pending'
 *
 * If the app crashes while an item is in 'processing' status, it will be stuck forever.
 * This function finds items older than PROCESSING_TIMEOUT_MS in 'processing' state
 * and resets them to 'pending' so they can be retried.
 *
 * Call this on app startup or periodically to recover from crashes.
 */
export async function recoverStaleProcessingItems(): Promise<number> {
  try {
    const cutoffTime = new Date(Date.now() - PROCESSING_TIMEOUT_MS).toISOString()

    const { data: staleItems, error: selectError } = await supabase
      .from('order_items')
      .select('id, order_id, menu_item_name')
      .eq('write_off_status', 'processing')
      .lt('updated_at', cutoffTime)

    if (selectError) {
      DebugUtils.error(MODULE_NAME, 'Failed to find stale processing items', { error: selectError })
      return 0
    }

    if (!staleItems || staleItems.length === 0) {
      return 0
    }

    DebugUtils.warn(MODULE_NAME, 'Found stale processing items, resetting to pending', {
      count: staleItems.length,
      items: staleItems.map(i => ({ id: i.id, name: i.menu_item_name }))
    })

    const { error: updateError } = await supabase
      .from('order_items')
      .update({
        write_off_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .in(
        'id',
        staleItems.map(i => i.id)
      )

    if (updateError) {
      DebugUtils.error(MODULE_NAME, 'Failed to reset stale items', { error: updateError })
      return 0
    }

    DebugUtils.info(MODULE_NAME, 'Recovered stale processing items', { count: staleItems.length })
    return staleItems.length
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Exception in recoverStaleProcessingItems', { error })
    return 0
  }
}

/**
 * ✨ READY-TRIGGERED WRITE-OFF: Mark item as ready WITH background write-off
 *
 * This is the main function for the Ready-Triggered Write-off architecture.
 * When kitchen marks an item as "ready", we:
 * 1. Update item status to 'ready' immediately (UI stays responsive)
 * 2. Queue background write-off task (doesn't block UI)
 *
 * The write-off will:
 * - Decompose the menu item to ingredients
 * - Calculate FIFO cost
 * - Create storage_operation (write-off)
 * - Create recipe_writeoff (WITHOUT salesTransactionId)
 * - Update order_items with cached cost data
 *
 * At payment time:
 * - If cachedActualCost exists → FAST PATH (skip decomposition)
 * - If not → FALLBACK (normal decomposition)
 */
export async function markItemAsReadyWithWriteOff(
  orderId: string,
  item: PosBillItem
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Check if already completed (idempotent)
    if (item.writeOffStatus === 'completed' || item.writeOffStatus === 'processing') {
      DebugUtils.info(MODULE_NAME, 'Item write-off already processed/processing, skipping', {
        itemId: item.id,
        status: item.writeOffStatus
      })
      // Still update status to ready if needed
      if (item.status !== 'ready') {
        return await updateItemStatus(orderId, item.id, 'ready')
      }
      return { success: true }
    }

    // 2. OPTIMISTIC UPDATE: Block duplicate clicks immediately (before any async)
    // This prevents race condition when user double-clicks Ready button
    item.writeOffStatus = 'processing'

    // 3. Update status to 'ready' immediately (UI update)
    const statusResult = await updateItemStatus(orderId, item.id, 'ready')
    if (!statusResult.success) {
      item.writeOffStatus = 'pending' // Rollback on failure
      return statusResult
    }

    // 4. Mark write-off as 'processing' in DB to prevent duplicate processing
    // Note: Using the already imported supabase client (top of file)
    await supabase
      .from('order_items')
      .update({
        write_off_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', item.id)

    // 5. Queue background write-off task (fire and forget)
    const { useBackgroundTasks } = await import('@/core/background')
    const backgroundTasks = useBackgroundTasks()

    backgroundTasks.addReadyWriteOffTask(
      {
        orderId,
        itemId: item.id,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        department: item.department || 'kitchen',
        selectedModifiers: item.selectedModifiers
      },
      {
        onSuccess: msg => {
          DebugUtils.info(MODULE_NAME, 'Ready write-off completed', { itemId: item.id, msg })
        },
        onError: async errorMsg => {
          DebugUtils.error(MODULE_NAME, 'Ready write-off failed', {
            itemId: item.id,
            error: errorMsg
          })
          // Reset local status for retry (optimistic rollback)
          item.writeOffStatus = 'pending'

          // Reset status to pending in DB so it can be retried
          try {
            // Use the already imported supabase client
            const { error: resetError } = await supabase
              .from('order_items')
              .update({
                write_off_status: 'pending',
                updated_at: new Date().toISOString()
              })
              .eq('id', item.id)

            if (resetError) {
              DebugUtils.error(MODULE_NAME, 'Failed to reset write_off_status after error', {
                itemId: item.id,
                error: resetError
              })
            } else {
              DebugUtils.info(MODULE_NAME, 'Reset write_off_status to pending for retry', {
                itemId: item.id
              })
            }
          } catch (resetException) {
            DebugUtils.error(MODULE_NAME, 'Exception resetting write_off_status', {
              itemId: item.id,
              error: resetException
            })
          }
        }
      }
    )

    DebugUtils.info(MODULE_NAME, 'Item marked ready with write-off queued', {
      orderId,
      itemId: item.id,
      menuItemName: item.menuItemName
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to mark item as ready'
    DebugUtils.error(MODULE_NAME, 'markItemAsReadyWithWriteOff failed', { error })
    return { success: false, error: message }
  }
}

export const kitchenService = {
  getActiveKitchenOrders,
  getOrderById,
  updateItemStatus,
  checkAndUpdateOrderStatus,
  calculateOrderStatus,
  markItemAsReadyWithWriteOff,
  recoverStaleProcessingItems // ✨ Recovery for stuck items
}
