// src/stores/pos/receipts/services.ts - POS Receipt Services
// Sprint 6: POS Receipt Module (ONLINE ONLY)

import { supabase } from '@/supabase'
import type { PendingOrderForReceipt, PendingOrderItem, PosReceiptServiceResponse } from './types'

const MODULE_NAME = 'PosReceiptService'

// =============================================
// LOAD PENDING ORDERS FOR RECEIPT
// =============================================

/**
 * Load orders that are ready for receipt (goods acceptance)
 * Only orders with:
 * - status = 'sent' (sent to supplier)
 * - counteragent.payment_terms = 'on_delivery'
 */
export async function loadPendingOrdersForReceipt(): Promise<
  PosReceiptServiceResponse<PendingOrderForReceipt[]>
> {
  try {
    // First, get counteragents with on_delivery payment terms
    const { data: counteragents, error: counteragentsError } = await supabase
      .from('counteragents')
      .select('id')
      .eq('payment_terms', 'on_delivery')

    if (counteragentsError) {
      console.error(`[${MODULE_NAME}] Error loading counteragents:`, counteragentsError)
      return { success: false, error: counteragentsError.message }
    }

    const onDeliverySupplierIds = (counteragents || []).map(c => c.id)

    if (onDeliverySupplierIds.length === 0) {
      return { success: true, data: [] }
    }

    // Load orders with status='sent' from on_delivery suppliers
    const { data: orders, error: ordersError } = await supabase
      .from('supplierstore_orders')
      .select(
        `
        id,
        order_number,
        supplier_id,
        supplier_name,
        total_amount,
        is_estimated_total,
        created_at,
        status
      `
      )
      .eq('status', 'sent')
      .in('supplier_id', onDeliverySupplierIds)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error(`[${MODULE_NAME}] Error loading orders:`, ordersError)
      return { success: false, error: ordersError.message }
    }

    if (!orders || orders.length === 0) {
      return { success: true, data: [] }
    }

    // Load order items for each order (including package data)
    const orderIds = orders.map(o => o.id)
    const { data: orderItems, error: itemsError } = await supabase
      .from('supplierstore_order_items')
      .select(
        `
        id,
        order_id,
        item_id,
        item_name,
        ordered_quantity,
        unit,
        price_per_unit,
        total_price,
        package_id,
        package_name,
        package_quantity,
        package_unit,
        package_price
      `
      )
      .in('order_id', orderIds)

    if (itemsError) {
      console.error(`[${MODULE_NAME}] Error loading order items:`, itemsError)
      return { success: false, error: itemsError.message }
    }

    // Group items by order
    const itemsByOrder = new Map<string, PendingOrderItem[]>()
    for (const item of orderItems || []) {
      const items = itemsByOrder.get(item.order_id) || []
      items.push({
        id: item.id,
        productId: item.item_id,
        productName: item.item_name,
        unit: item.unit,
        quantity: Number(item.ordered_quantity),
        price: Number(item.price_per_unit),
        total: Number(item.total_price),
        // Package data
        packageId: item.package_id || undefined,
        packageName: item.package_name || undefined,
        packageUnit: item.package_unit || undefined,
        packageQuantity: item.package_quantity ? Number(item.package_quantity) : undefined,
        packagePrice: item.package_price ? Number(item.package_price) : undefined,
        pricePerUnit: Number(item.price_per_unit)
      })
      itemsByOrder.set(item.order_id, items)
    }

    // Transform to PendingOrderForReceipt
    const pendingOrders: PendingOrderForReceipt[] = orders.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      supplierId: order.supplier_id,
      supplierName: order.supplier_name,
      totalAmount: Number(order.total_amount),
      isEstimatedTotal: order.is_estimated_total,
      createdAt: order.created_at,
      items: itemsByOrder.get(order.id) || []
    }))

    console.log(`[${MODULE_NAME}] Loaded ${pendingOrders.length} pending orders for receipt`)
    return { success: true, data: pendingOrders }
  } catch (error) {
    console.error(`[${MODULE_NAME}] Unexpected error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error loading pending orders'
    }
  }
}

// =============================================
// GET SINGLE ORDER FOR RECEIPT
// =============================================

/**
 * Load a single order by ID for receipt
 */
export async function getOrderForReceipt(
  orderId: string
): Promise<PosReceiptServiceResponse<PendingOrderForReceipt>> {
  try {
    // Load order
    const { data: order, error: orderError } = await supabase
      .from('supplierstore_orders')
      .select(
        `
        id,
        order_number,
        supplier_id,
        supplier_name,
        total_amount,
        is_estimated_total,
        created_at,
        status
      `
      )
      .eq('id', orderId)
      .single()

    if (orderError) {
      console.error(`[${MODULE_NAME}] Error loading order:`, orderError)
      return { success: false, error: orderError.message }
    }

    if (!order) {
      return { success: false, error: 'Order not found' }
    }

    // Load order items (including package data)
    const { data: orderItems, error: itemsError } = await supabase
      .from('supplierstore_order_items')
      .select(
        `
        id,
        item_id,
        item_name,
        ordered_quantity,
        unit,
        price_per_unit,
        total_price,
        package_id,
        package_name,
        package_quantity,
        package_unit,
        package_price
      `
      )
      .eq('order_id', orderId)

    if (itemsError) {
      console.error(`[${MODULE_NAME}] Error loading order items:`, itemsError)
      return { success: false, error: itemsError.message }
    }

    const items: PendingOrderItem[] = (orderItems || []).map(item => ({
      id: item.id,
      productId: item.item_id,
      productName: item.item_name,
      unit: item.unit,
      quantity: Number(item.ordered_quantity),
      price: Number(item.price_per_unit),
      total: Number(item.total_price),
      // Package data
      packageId: item.package_id || undefined,
      packageName: item.package_name || undefined,
      packageUnit: item.package_unit || undefined,
      packageQuantity: item.package_quantity ? Number(item.package_quantity) : undefined,
      packagePrice: item.package_price ? Number(item.package_price) : undefined,
      pricePerUnit: Number(item.price_per_unit)
    }))

    const pendingOrder: PendingOrderForReceipt = {
      id: order.id,
      orderNumber: order.order_number,
      supplierId: order.supplier_id,
      supplierName: order.supplier_name,
      totalAmount: Number(order.total_amount),
      isEstimatedTotal: order.is_estimated_total,
      createdAt: order.created_at,
      items
    }

    return { success: true, data: pendingOrder }
  } catch (error) {
    console.error(`[${MODULE_NAME}] Unexpected error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error loading order'
    }
  }
}

// =============================================
// CHECK ONLINE STATUS
// =============================================

/**
 * Check if we have network connectivity
 * Receipt functionality requires online mode
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Add network status listener
 */
export function addNetworkListener(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
