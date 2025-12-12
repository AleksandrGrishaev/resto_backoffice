// src/stores/pos/orders/supabaseMappers.ts - Supabase data mappers for orders
// Updated for order_items table architecture (Migration 053-054)

import type { PosOrder, PosBill, PosBillItem } from '../types'
import type {
  SupabaseOrder,
  SupabaseOrderInsert,
  SupabaseOrderUpdate,
  SupabaseOrderItem,
  SupabaseOrderItemInsert,
  SupabaseOrderItemUpdate
} from '@/supabase/types'

// =====================================================
// BILL METADATA TYPE (stored in orders.bills JSONB)
// =====================================================

/**
 * Bill metadata stored in orders.bills JSONB (without items)
 * Items are stored in separate order_items table
 */
interface BillMetadata {
  id: string
  billNumber: string
  orderId: string
  name: string
  status: 'draft' | 'active' | 'closed' | 'cancelled'
  subtotal: number
  discountAmount: number
  discountReason?: string
  discountType?: 'percentage' | 'fixed'
  taxAmount: number
  total: number
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  paidAmount: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// =====================================================
// ORDER MAPPERS
// =====================================================

/**
 * Convert PosOrder (app) to Supabase format for INSERT
 * Note: items are NOT included - they go to order_items table separately
 */
export function toSupabaseInsert(order: PosOrder): SupabaseOrderInsert {
  // Convert bills to metadata (without items)
  const billsMetadata: BillMetadata[] = order.bills.map(bill => ({
    id: bill.id,
    billNumber: bill.billNumber,
    orderId: bill.orderId,
    name: bill.name,
    status: bill.status,
    subtotal: bill.subtotal,
    discountAmount: bill.discountAmount,
    discountReason: bill.discountReason,
    discountType: bill.discountType,
    taxAmount: bill.taxAmount,
    total: bill.total,
    paymentStatus: bill.paymentStatus,
    paidAmount: bill.paidAmount,
    notes: bill.notes,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt
  }))

  return {
    // Identity
    id: order.id,
    order_number: order.orderNumber,

    // Type & Status
    type: order.type,
    status: order.status,
    payment_status: order.paymentStatus,

    // Links
    table_id: order.tableId || null,
    shift_id: null, // TODO: Add shiftId to PosOrder type
    customer_name: order.customerName || null,

    // Bills metadata (without items)
    bills: billsMetadata as any,

    // Financial data
    total_amount: order.totalAmount,
    discount_amount: order.discountAmount,
    tax_amount: order.taxAmount,
    final_amount: order.finalAmount,

    // Legacy fields (for backward compatibility)
    subtotal: order.totalAmount,
    discount: order.discountAmount,
    tax: order.taxAmount,
    total: order.finalAmount,

    // Payment tracking
    payment_ids: order.paymentIds?.length > 0 ? order.paymentIds : null,
    paid_amount: order.paidAmount || 0,

    // Revenue breakdown (Sprint 7)
    planned_revenue: order.plannedRevenue || null,
    actual_revenue: order.actualRevenue || null,
    total_collected: order.totalCollected || null,
    revenue_breakdown: order.revenueBreakdown ? (order.revenueBreakdown as any) : null,

    // Waiter & timing
    waiter_name: order.waiterName || null,
    estimated_ready_time: order.estimatedReadyTime || null,
    actual_ready_time: order.actualReadyTime || null,

    // Notes
    notes: order.notes || null,

    // Timestamps
    created_at: order.createdAt
  }
}

/**
 * Convert PosOrder (app) to Supabase format for UPDATE
 */
export function toSupabaseUpdate(order: PosOrder): SupabaseOrderUpdate {
  const insert = toSupabaseInsert(order)
  return {
    ...insert,
    created_at: undefined,
    updated_at: order.updatedAt
  }
}

/**
 * Convert Supabase order to PosOrder (app)
 * Note: items must be loaded separately from order_items table
 *
 * @param supabaseOrder - Order row from Supabase
 * @param items - Items loaded from order_items table (optional, can be added later)
 */
export function fromSupabase(supabaseOrder: SupabaseOrder, items?: PosBillItem[]): PosOrder {
  // Parse bills metadata from JSONB
  const billsMetadata = (supabaseOrder.bills as any as BillMetadata[]) || []

  // Group items by bill_id if items provided
  const itemsByBillId = new Map<string, PosBillItem[]>()
  if (items) {
    items.forEach(item => {
      const existing = itemsByBillId.get(item.billId) || []
      existing.push(item)
      itemsByBillId.set(item.billId, existing)
    })
  }

  // Reconstruct bills with items
  const bills: PosBill[] = billsMetadata.map(meta => ({
    id: meta.id,
    billNumber: meta.billNumber,
    orderId: supabaseOrder.id,
    name: meta.name,
    status: meta.status,
    items: itemsByBillId.get(meta.id) || [],
    subtotal: meta.subtotal,
    discountAmount: meta.discountAmount,
    discountReason: meta.discountReason,
    discountType: meta.discountType,
    taxAmount: meta.taxAmount,
    total: meta.total,
    paymentStatus: meta.paymentStatus,
    paidAmount: meta.paidAmount,
    notes: meta.notes,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt
  }))

  return {
    // Identity
    id: supabaseOrder.id,
    orderNumber: supabaseOrder.order_number,

    // Type & Status
    type: supabaseOrder.type as 'dine_in' | 'takeaway' | 'delivery',
    status: supabaseOrder.status as
      | 'draft'
      | 'waiting'
      | 'cooking'
      | 'ready'
      | 'served'
      | 'collected'
      | 'delivered'
      | 'cancelled',
    paymentStatus: supabaseOrder.payment_status as 'unpaid' | 'partial' | 'paid' | 'refunded',

    // Links
    tableId: supabaseOrder.table_id || undefined,
    customerId: undefined,
    customerName: supabaseOrder.customer_name || undefined,

    // Reconstructed bills with items
    bills,

    // Financial data
    totalAmount: supabaseOrder.total_amount || 0,
    discountAmount: supabaseOrder.discount_amount || 0,
    taxAmount: supabaseOrder.tax_amount || 0,
    finalAmount: supabaseOrder.final_amount || 0,

    // Revenue breakdown (Sprint 7)
    plannedRevenue: supabaseOrder.planned_revenue || undefined,
    actualRevenue: supabaseOrder.actual_revenue || undefined,
    totalCollected: supabaseOrder.total_collected || undefined,
    revenueBreakdown: (supabaseOrder.revenue_breakdown as any) || undefined,

    // Payment tracking
    paymentIds: supabaseOrder.payment_ids || [],
    paidAmount: supabaseOrder.paid_amount || 0,

    // Waiter & timing
    waiterName: supabaseOrder.waiter_name || undefined,
    estimatedReadyTime: supabaseOrder.estimated_ready_time || undefined,
    actualReadyTime: supabaseOrder.actual_ready_time || undefined,

    // Notes
    notes: supabaseOrder.notes || undefined,

    // Timestamps
    createdAt: supabaseOrder.created_at,
    updatedAt: supabaseOrder.updated_at
  }
}

// =====================================================
// ORDER ITEM MAPPERS (for order_items table)
// =====================================================

/**
 * Convert PosBillItem (app) to Supabase format for INSERT into order_items table
 *
 * @param item - Bill item from app
 * @param orderId - Parent order ID
 * @param billNumber - Bill number for kitchen display (denormalized)
 */
export function toOrderItemInsert(
  item: PosBillItem,
  orderId: string,
  billNumber: string
): SupabaseOrderItemInsert {
  return {
    id: item.id,
    order_id: orderId,
    bill_id: item.billId,
    bill_number: billNumber,

    // Menu item
    menu_item_id: item.menuItemId,
    menu_item_name: item.menuItemName,
    variant_id: item.variantId || null,
    variant_name: item.variantName || null,

    // Pricing
    quantity: item.quantity,
    unit_price: item.unitPrice,
    modifiers_total: item.modifiersTotal || 0,
    total_price: item.totalPrice,

    // Modifiers & discounts (JSONB)
    selected_modifiers: (item.selectedModifiers || []) as any,
    discounts: (item.discounts || []) as any,

    // Status & department
    status: item.status,
    department: item.department || 'kitchen',

    // Payment
    payment_status: item.paymentStatus,
    paid_by_payment_ids: item.paidByPaymentIds || [],

    // Kitchen
    kitchen_notes: item.kitchenNotes || null,

    // KPI timestamps
    draft_at: item.createdAt,
    sent_to_kitchen_at: item.sentToKitchenAt || null,
    cooking_started_at: null, // Set when status changes to 'cooking'
    ready_at: item.preparedAt || null,
    served_at: null, // Set when status changes to 'served'

    // Audit
    created_at: item.createdAt,
    updated_at: item.updatedAt
  }
}

/**
 * Convert PosBillItem (app) to Supabase format for UPDATE
 */
export function toOrderItemUpdate(item: PosBillItem): SupabaseOrderItemUpdate {
  return {
    // Pricing (can change)
    quantity: item.quantity,
    modifiers_total: item.modifiersTotal || 0,
    total_price: item.totalPrice,

    // Modifiers & discounts (can change)
    selected_modifiers: (item.selectedModifiers || []) as any,
    discounts: (item.discounts || []) as any,

    // Status & department
    status: item.status,
    department: item.department || 'kitchen',

    // Payment
    payment_status: item.paymentStatus,
    paid_by_payment_ids: item.paidByPaymentIds || [],

    // Kitchen
    kitchen_notes: item.kitchenNotes || null,

    // KPI timestamps (updated by status change)
    sent_to_kitchen_at: item.sentToKitchenAt || null,
    ready_at: item.preparedAt || null,

    // Audit
    updated_at: new Date().toISOString()
  }
}

/**
 * Convert Supabase order_items row to PosBillItem (app)
 */
export function fromOrderItemRow(row: SupabaseOrderItem): PosBillItem {
  return {
    id: row.id,
    billId: row.bill_id,

    // Menu item
    menuItemId: row.menu_item_id,
    menuItemName: row.menu_item_name,
    variantId: row.variant_id || undefined,
    variantName: row.variant_name || undefined,

    // Pricing
    quantity: row.quantity,
    unitPrice: row.unit_price,
    modifiersTotal: row.modifiers_total || 0,
    totalPrice: row.total_price,

    // Modifiers (new system)
    selectedModifiers: (row.selected_modifiers as any) || [],
    modifications: [], // Legacy, not used in new system

    // Discounts
    discounts: (row.discounts as any) || [],

    // Status
    status: row.status as 'draft' | 'waiting' | 'cooking' | 'ready' | 'served' | 'cancelled',
    paymentStatus: (row.payment_status || 'unpaid') as 'unpaid' | 'paid' | 'refunded',

    // Department
    department: (row.department || 'kitchen') as 'kitchen' | 'bar',

    // Kitchen
    kitchenNotes: row.kitchen_notes || undefined,
    sentToKitchenAt: row.sent_to_kitchen_at || undefined,
    preparedAt: row.ready_at || undefined,

    // Payment links
    paidByPaymentIds: row.paid_by_payment_ids || [],

    // Timestamps
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Extract all items from order bills for batch INSERT
 */
export function extractItemsForInsert(order: PosOrder): SupabaseOrderItemInsert[] {
  const items: SupabaseOrderItemInsert[] = []

  order.bills.forEach(bill => {
    bill.items.forEach(item => {
      items.push(toOrderItemInsert(item, order.id, bill.billNumber))
    })
  })

  return items
}

/**
 * Get timestamp field name for status change
 * Used to update KPI timestamps when item status changes
 */
export function getTimestampFieldForStatus(
  status: string
): 'sent_to_kitchen_at' | 'cooking_started_at' | 'ready_at' | 'served_at' | null {
  switch (status) {
    case 'waiting':
      return 'sent_to_kitchen_at'
    case 'cooking':
      return 'cooking_started_at'
    case 'ready':
      return 'ready_at'
    case 'served':
      return 'served_at'
    default:
      return null
  }
}

/**
 * Build status update payload with timestamp
 */
export function buildStatusUpdatePayload(newStatus: string): SupabaseOrderItemUpdate {
  const timestampField = getTimestampFieldForStatus(newStatus)
  const payload: SupabaseOrderItemUpdate = {
    status: newStatus,
    updated_at: new Date().toISOString()
  }

  if (timestampField) {
    payload[timestampField] = new Date().toISOString()
  }

  return payload
}
