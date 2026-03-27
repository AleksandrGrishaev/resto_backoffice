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
  // Loyalty
  customerId?: string
  customerName?: string
  stampCardId?: string
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
    customerId: bill.customerId,
    customerName: bill.customerName,
    stampCardId: bill.stampCardId,
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
    customer_id: order.customerId || null,
    stamp_card_id: order.stampCardId || null,
    guest_count: order.guestCount || 1,

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

    // Channel tracking
    channel_id: order.channelId || null,
    channel_code: order.channelCode || null,
    external_order_id: order.externalOrderId || null,
    external_status: order.externalStatus || null,

    // Online ordering
    source: order.source || 'pos',
    fulfillment_method: order.fulfillmentMethod || null,
    customer_phone: order.customerPhone || null,
    table_number: order.tableNumber || null,
    pickup_time: order.pickupTime || null,
    comment: order.comment || null,

    // Cancellation request
    cancellation_requested_at: order.cancellationRequestedAt || null,
    cancellation_reason: order.cancellationReason || null,
    cancellation_resolved_at: order.cancellationResolvedAt || null,
    cancellation_resolved_by: order.cancellationResolvedBy || null,

    // Timestamps
    created_at: order.createdAt
  }
}

/**
 * Convert PosOrder (app) to Supabase format for UPDATE
 *
 * IMPORTANT: customer_id/customer_name are excluded from updates.
 * These fields may be set externally (e.g. by claim_invite RPC via website),
 * and POS would overwrite them with stale null values from its local copy.
 * Customer attachment is handled separately via dedicated endpoints.
 */
export function toSupabaseUpdate(order: PosOrder): SupabaseOrderUpdate {
  const insert = toSupabaseInsert(order)
  return {
    ...insert,
    created_at: undefined,
    updated_at: order.updatedAt,
    // Don't overwrite externally-set customer fields
    customer_id: undefined,
    customer_name: undefined
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
    customerId: meta.customerId,
    customerName: meta.customerName,
    stampCardId: meta.stampCardId,
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
    customerId: supabaseOrder.customer_id || undefined,
    customerName: supabaseOrder.customer_name || undefined,
    stampCardId: supabaseOrder.stamp_card_id || undefined,
    guestCount: supabaseOrder.guest_count ?? 1,

    // Reconstructed bills with items
    bills,

    // Financial data (use ?? to preserve valid 0 values)
    totalAmount: supabaseOrder.total_amount ?? 0,
    discountAmount: supabaseOrder.discount_amount ?? 0,
    taxAmount: supabaseOrder.tax_amount ?? 0,
    finalAmount: supabaseOrder.final_amount ?? 0,

    // Revenue breakdown (Sprint 7)
    plannedRevenue: supabaseOrder.planned_revenue || undefined,
    actualRevenue: supabaseOrder.actual_revenue || undefined,
    totalCollected: supabaseOrder.total_collected || undefined,
    revenueBreakdown: (supabaseOrder.revenue_breakdown as any) || undefined,

    // Payment tracking
    paymentIds: supabaseOrder.payment_ids || [],
    paidAmount: supabaseOrder.paid_amount ?? 0,

    // Waiter & timing
    waiterName: supabaseOrder.waiter_name || undefined,
    estimatedReadyTime: supabaseOrder.estimated_ready_time || undefined,
    actualReadyTime: supabaseOrder.actual_ready_time || undefined,

    // Notes
    notes: supabaseOrder.notes || undefined,

    // Channel tracking
    channelId: (supabaseOrder as any).channel_id || undefined,
    channelCode: (supabaseOrder as any).channel_code || undefined,
    externalOrderId: (supabaseOrder as any).external_order_id || undefined,
    externalStatus: (supabaseOrder as any).external_status || undefined,

    // Online ordering
    source: (supabaseOrder as any).source || 'pos',
    fulfillmentMethod: (supabaseOrder as any).fulfillment_method || undefined,
    customerPhone: (supabaseOrder as any).customer_phone || undefined,
    tableNumber: (supabaseOrder as any).table_number || undefined,
    pickupTime: (supabaseOrder as any).pickup_time || undefined,
    comment: (supabaseOrder as any).comment || undefined,

    // Cancellation request
    cancellationRequestedAt: (supabaseOrder as any).cancellation_requested_at || undefined,
    cancellationReason: (supabaseOrder as any).cancellation_reason || undefined,
    cancellationResolvedAt: (supabaseOrder as any).cancellation_resolved_at || undefined,
    cancellationResolvedBy: (supabaseOrder as any).cancellation_resolved_by || undefined,

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
    cooking_started_at: item.cookingStartedAt || null,
    ready_at: item.readyAt || null,
    served_at: item.servedAt || null,

    // ✨ Ready-Triggered Write-off tracking
    write_off_status: item.writeOffStatus || 'pending',
    write_off_at: item.writeOffAt || null,
    write_off_triggered_by: item.writeOffTriggeredBy || null,
    cached_actual_cost: item.cachedActualCost ? (item.cachedActualCost as any) : null,
    recipe_writeoff_id: item.recipeWriteOffId || null,

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
    // Bill assignment (can change when items are moved between bills)
    bill_id: item.billId,

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
    cooking_started_at: item.cookingStartedAt || null,
    ready_at: item.readyAt || null,
    served_at: item.servedAt || null,

    // ✨ Ready-Triggered Write-off tracking (can be updated)
    write_off_status: item.writeOffStatus || 'pending',
    write_off_at: item.writeOffAt || null,
    write_off_triggered_by: item.writeOffTriggeredBy || null,
    cached_actual_cost: item.cachedActualCost ? (item.cachedActualCost as any) : null,
    recipe_writeoff_id: item.recipeWriteOffId || null,

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
    // Expand modifiers with quantity > 1 into duplicates for POS compatibility
    // Web-winter sends { optionId, optionName, quantity: 2 }, POS expects duplicate objects
    selectedModifiers: expandModifierQuantities((row.selected_modifiers as any) || []),
    modifications: [], // Legacy, not used in new system

    // Discounts
    discounts: (row.discounts as any) || [],

    // Status
    status: row.status as
      | 'draft'
      | 'scheduled'
      | 'waiting'
      | 'cooking'
      | 'ready'
      | 'served'
      | 'cancelled',
    paymentStatus: (row.payment_status || 'unpaid') as 'unpaid' | 'paid' | 'refunded',

    // Department
    department: (row.department || 'kitchen') as 'kitchen' | 'bar',

    // Kitchen
    kitchenNotes: row.kitchen_notes || undefined,

    // KPI timestamps
    sentToKitchenAt: row.sent_to_kitchen_at || undefined,
    cookingStartedAt: row.cooking_started_at || undefined,
    readyAt: row.ready_at || undefined,
    servedAt: row.served_at || undefined,

    // Payment links
    paidByPaymentIds: row.paid_by_payment_ids || [],

    // ✨ Ready-Triggered Write-off tracking
    writeOffStatus: row.write_off_status || 'pending',
    writeOffAt: row.write_off_at || undefined,
    writeOffTriggeredBy: row.write_off_triggered_by || undefined,
    cachedActualCost: row.cached_actual_cost || undefined,
    recipeWriteOffId: row.recipe_writeoff_id || undefined,
    writeOffOperationId: row.write_off_operation_id || undefined,

    // Timestamps
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// =====================================================
// MODIFIER HELPERS
// =====================================================

/**
 * Expand modifiers with quantity > 1 into duplicate objects.
 * Web-winter sends: [{ optionId, optionName, quantity: 2, priceAdjustment: 10000 }]
 * POS expects:      [{ optionId, optionName }, { optionId, optionName }]
 *
 * The priceAdjustment is per-unit, so each duplicate keeps the original priceAdjustment.
 */
function expandModifierQuantities(modifiers: any[]): any[] {
  if (!modifiers || modifiers.length === 0) return []

  const result: any[] = []
  for (const mod of modifiers) {
    const qty = mod.quantity && mod.quantity > 1 ? mod.quantity : 1
    // Create copies without the quantity field so POS logic counts array length
    const { quantity: _q, ...rest } = mod
    for (let i = 0; i < qty; i++) {
      result.push({ ...rest })
    }
  }
  return result
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
