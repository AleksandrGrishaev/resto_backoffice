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

/**
 * Get all active kitchen orders (waiting, cooking, ready)
 * Kitchen only sees orders that need preparation
 *
 * NEW (Migration 053-054): Loads from 2 tables - orders + order_items
 */
export async function getActiveKitchenOrders(): Promise<PosOrder[]> {
  try {
    // Step 1: Get orders with kitchen statuses
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['waiting', 'cooking', 'ready'])
      .order('created_at', { ascending: true })

    if (ordersError) {
      DebugUtils.error(MODULE_NAME, 'Failed to load kitchen orders', { error: ordersError })
      return []
    }

    if (!ordersData || ordersData.length === 0) {
      DebugUtils.debug(MODULE_NAME, 'No active kitchen orders')
      return []
    }

    // Step 2: Get items for these orders
    const orderIds = ordersData.map(o => o.id)
    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)
      .in('status', ['waiting', 'cooking', 'ready']) // Only kitchen items

    if (itemsError) {
      DebugUtils.error(MODULE_NAME, 'Failed to load kitchen items', { error: itemsError })
      return []
    }

    // Step 3: Convert to app format
    const items = (itemsData || []).map(fromOrderItemRow)

    // Step 4: Assemble orders with items
    const orders = ordersData.map(order =>
      orderFromSupabase(
        order,
        items.filter(i => {
          // Find bill_id from item's billId
          const orderBills = (order.bills as any[]) || []
          return orderBills.some((b: any) => b.id === i.billId)
        })
      )
    )

    DebugUtils.info(MODULE_NAME, 'Kitchen orders loaded from Supabase', {
      count: orders.length,
      waiting: orders.filter(o => o.status === 'waiting').length,
      cooking: orders.filter(o => o.status === 'cooking').length,
      ready: orders.filter(o => o.status === 'ready').length,
      totalItems: items.length
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

    // Get items for this order (kitchen items only)
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

export const kitchenService = {
  getActiveKitchenOrders,
  getOrderById,
  updateItemStatus,
  checkAndUpdateOrderStatus,
  calculateOrderStatus
}
