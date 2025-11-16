// src/stores/pos/orders/supabaseMappers.ts - Supabase data mappers for orders

import type { PosOrder, PosBill, PosBillItem } from '../types'
import type { Database } from '@/supabase/types'

type SupabaseOrder = Database['public']['Tables']['orders']['Row']
type SupabaseOrderInsert = Database['public']['Tables']['orders']['Insert']
type SupabaseOrderUpdate = Database['public']['Tables']['orders']['Update']

/**
 * Flattened item structure for Supabase JSONB storage
 * Includes both item data and bill metadata for reconstruction
 */
interface FlattenedItem {
  // Item data
  id: string
  billId: string
  menuItemId: string
  menuItemName: string
  variantId?: string
  variantName?: string
  quantity: number
  unitPrice: number
  totalPrice: number

  // Modifiers (both systems for backward compatibility)
  modifications: Array<{
    id: string
    name: string
    price: number
  }>
  selectedModifiers?: Array<{
    id: string
    name: string
    price: number
    type?: string
  }>
  modifiersTotal?: number

  // Discounts
  discounts: Array<{
    id: string
    type: 'percentage' | 'fixed'
    value: number
    reason: string
    appliedBy: string
    appliedAt: string
  }>

  // Status
  status: string
  paymentStatus: string

  // Kitchen
  kitchenNotes?: string
  sentToKitchenAt?: string
  preparedAt?: string
  department?: 'kitchen' | 'bar' // Which department should prepare this

  // Payment links
  paidByPaymentIds?: string[]

  // Bill metadata (CRITICAL for reconstruction!)
  bill_id: string
  bill_name: string
  bill_number: string
  bill_status: string
  bill_notes?: string
  bill_subtotal: number
  bill_discountAmount: number
  bill_taxAmount: number
  bill_total: number
  bill_paymentStatus: string
  bill_paidAmount: number

  // Timestamps
  createdAt: string
  updatedAt: string
}

/**
 * Flatten bills hierarchy into a single array of items with bill metadata
 * Order → Bills[] → Items[] becomes Items[] with embedded bill data
 */
export function flattenBillsToItems(order: PosOrder): FlattenedItem[] {
  return order.bills.flatMap(bill =>
    bill.items.map(
      (item): FlattenedItem => ({
        // Item data
        id: item.id,
        billId: item.billId,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        variantId: item.variantId,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,

        // Modifiers (handle both systems!)
        modifications: item.modifications || [],
        selectedModifiers: item.selectedModifiers || [],
        modifiersTotal: item.modifiersTotal || 0,

        // Discounts
        discounts: item.discounts || [],

        // Status
        status: item.status,
        paymentStatus: item.paymentStatus,

        // Kitchen
        kitchenNotes: item.kitchenNotes,
        sentToKitchenAt: item.sentToKitchenAt,
        preparedAt: item.preparedAt,
        department: item.department || 'kitchen', // Default to kitchen

        // Payment links
        paidByPaymentIds: item.paidByPaymentIds || [],

        // Bill metadata (CRITICAL for reconstruction!)
        bill_id: bill.id,
        bill_name: bill.name,
        bill_number: bill.billNumber,
        bill_status: bill.status,
        bill_notes: bill.notes,
        bill_subtotal: bill.subtotal,
        bill_discountAmount: bill.discountAmount,
        bill_taxAmount: bill.taxAmount,
        bill_total: bill.total,
        bill_paymentStatus: bill.paymentStatus,
        bill_paidAmount: bill.paidAmount,

        // Timestamps
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })
    )
  )
}

/**
 * Reconstruct bills hierarchy from flattened items array
 * Items[] with embedded bill data becomes Order → Bills[] → Items[]
 */
export function reconstructBillsFromItems(items: FlattenedItem[]): PosBill[] {
  const billsMap = new Map<string, PosBill>()

  items.forEach(item => {
    const billId = item.bill_id

    // Create bill if not exists
    if (!billsMap.has(billId)) {
      billsMap.set(billId, {
        id: billId,
        billNumber: item.bill_number,
        orderId: '', // Will be set by caller
        name: item.bill_name,
        status: item.bill_status as 'draft' | 'active' | 'closed' | 'cancelled',
        items: [],

        // Use bill metadata from flattened item
        subtotal: item.bill_subtotal,
        discountAmount: item.bill_discountAmount,
        taxAmount: item.bill_taxAmount,
        total: item.bill_total,
        paymentStatus: item.bill_paymentStatus as 'unpaid' | 'partial' | 'paid',
        paidAmount: item.bill_paidAmount,

        notes: item.bill_notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })
    }

    // Add item to bill
    const bill = billsMap.get(billId)!
    const billItem: PosBillItem = {
      id: item.id,
      billId: item.billId,
      menuItemId: item.menuItemId,
      menuItemName: item.menuItemName,
      variantId: item.variantId,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,

      // Modifiers
      modifications: item.modifications || [],
      selectedModifiers: item.selectedModifiers,
      modifiersTotal: item.modifiersTotal,

      // Discounts
      discounts: item.discounts || [],

      // Status
      status: item.status as 'draft' | 'waiting' | 'cooking' | 'ready' | 'served' | 'cancelled',
      paymentStatus: item.paymentStatus as 'unpaid' | 'paid' | 'refunded',

      // Kitchen
      kitchenNotes: item.kitchenNotes,
      sentToKitchenAt: item.sentToKitchenAt,
      preparedAt: item.preparedAt,
      department: item.department,

      // Payment links
      paidByPaymentIds: item.paidByPaymentIds,

      // Timestamps
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }

    bill.items.push(billItem)
  })

  return Array.from(billsMap.values())
}

/**
 * Convert PosOrder (app) to Supabase format for INSERT
 */
export function toSupabaseInsert(order: PosOrder): SupabaseOrderInsert {
  return {
    // Identity
    id: order.id,
    order_number: order.orderNumber,

    // Type & Status
    type: order.type, // 'dine_in' | 'takeaway' | 'delivery'
    status: order.status, // 'draft' | 'waiting' | 'cooking' | 'ready' | 'served' | etc.
    payment_status: order.paymentStatus, // 'unpaid' | 'partial' | 'paid' | 'refunded'

    // Links
    table_id: order.tableId || null,
    shift_id: null, // TODO: Add shiftId to PosOrder type
    customer_name: order.customerName || null,

    // Flattened bills/items → JSONB array
    items: flattenBillsToItems(order) as any,

    // Financial data (from Migration 003)
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
    // Don't update created_at on updates
    created_at: undefined,
    // Supabase has updated_at trigger, so we don't need to set it
    updated_at: order.updatedAt
  }
}

/**
 * Convert Supabase order to PosOrder (app)
 */
export function fromSupabase(supabaseOrder: SupabaseOrder): PosOrder {
  // Reconstruct bills hierarchy from flattened items
  const flattenedItems = supabaseOrder.items as any as FlattenedItem[]
  const bills = reconstructBillsFromItems(flattenedItems || [])

  // Set orderId for each bill
  bills.forEach(bill => {
    bill.orderId = supabaseOrder.id
  })

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
    customerId: undefined, // Not in Supabase yet
    customerName: supabaseOrder.customer_name || undefined,

    // Reconstructed bills hierarchy
    bills,

    // Financial data
    totalAmount: supabaseOrder.total_amount || 0,
    discountAmount: supabaseOrder.discount_amount || 0,
    taxAmount: supabaseOrder.tax_amount || 0,
    finalAmount: supabaseOrder.final_amount || 0,

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
