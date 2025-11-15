// src/stores/kitchen/kitchenService.ts
// Kitchen Service - Read-only operations + item status updates

import { supabase } from '@/supabase/client'
import { fromSupabase as orderFromSupabase } from '@/stores/pos/orders/supabaseMappers'
import type { PosOrder, OrderStatus, ItemStatus } from '@/stores/pos/types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'KitchenService'

/**
 * Get all active kitchen orders (waiting, cooking, ready)
 * Kitchen only sees orders that need preparation
 */
export async function getActiveKitchenOrders(): Promise<PosOrder[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['waiting', 'cooking', 'ready'])
      .order('created_at', { ascending: true })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load kitchen orders', { error })
      return []
    }

    const orders = data.map(orderFromSupabase)

    DebugUtils.info(MODULE_NAME, 'Kitchen orders loaded from Supabase', {
      count: orders.length,
      waiting: orders.filter(o => o.status === 'waiting').length,
      cooking: orders.filter(o => o.status === 'cooking').length,
      ready: orders.filter(o => o.status === 'ready').length
    })

    return orders
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Exception loading kitchen orders', { error })
    return []
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
 * Update item status in order
 * Kitchen updates individual items (not full order)
 *
 * @param orderId - Order UUID
 * @param itemId - Item UUID (from flattened items array)
 * @param newStatus - New status (waiting, cooking, ready)
 */
export async function updateItemStatus(
  orderId: string,
  itemId: string,
  newStatus: 'waiting' | 'cooking' | 'ready'
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get order from Supabase
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      DebugUtils.error(MODULE_NAME, 'Order not found', { orderId, error: fetchError })
      return { success: false, error: 'Order not found' }
    }

    // 2. Update item status in JSONB array
    const items = order.items || []
    const itemIndex = items.findIndex((i: any) => i.id === itemId)

    if (itemIndex === -1) {
      DebugUtils.error(MODULE_NAME, 'Item not found in order', { orderId, itemId })
      return { success: false, error: 'Item not found' }
    }

    // Update item status
    items[itemIndex].status = newStatus
    items[itemIndex].updatedAt = new Date().toISOString()

    // Set timestamps
    if (newStatus === 'cooking' && !items[itemIndex].sentToKitchenAt) {
      items[itemIndex].sentToKitchenAt = new Date().toISOString()
    }
    if (newStatus === 'ready') {
      items[itemIndex].preparedAt = new Date().toISOString()
    }

    // 3. Update order in Supabase
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        items,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

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
      orderId: order.order_number,
      itemId,
      newStatus
    })

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update item status'
    DebugUtils.error(MODULE_NAME, 'Exception updating item status', { error })
    return { success: false, error: message }
  }
}

/**
 * Auto-update order status based on items
 * Called after each item status change
 *
 * Calculates order status from items and updates if changed
 */
export async function checkAndUpdateOrderStatus(orderId: string): Promise<void> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      DebugUtils.error(MODULE_NAME, 'Order not found for status update', { orderId, error })
      return
    }

    const items = order.items || []
    const calculatedStatus = calculateOrderStatus(items)

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

      const { error: updateError } = await supabase.from('orders').update(updates).eq('id', orderId)

      if (updateError) {
        DebugUtils.error(MODULE_NAME, 'Failed to auto-update order status', {
          orderId,
          calculatedStatus,
          error: updateError
        })
        return
      }

      DebugUtils.info(MODULE_NAME, 'Order status auto-updated', {
        orderNumber: order.order_number,
        oldStatus: order.status,
        newStatus: calculatedStatus,
        itemsCount: items.length
      })
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Exception checking order status', { orderId, error })
  }
}

export const kitchenService = {
  getActiveKitchenOrders,
  updateItemStatus,
  checkAndUpdateOrderStatus,
  calculateOrderStatus
}
