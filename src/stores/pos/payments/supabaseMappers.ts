// src/stores/pos/payments/supabaseMappers.ts - Supabase data mappers for payments

import type { PosPayment } from '../types'
import type { Database } from '@/supabase/types'

type SupabasePayment = Database['public']['Tables']['payments']['Row']
type SupabasePaymentInsert = Database['public']['Tables']['payments']['Insert']
type SupabasePaymentUpdate = Database['public']['Tables']['payments']['Update']

/**
 * Convert PosPayment (app) to Supabase format for INSERT
 */
export function toSupabaseInsert(payment: PosPayment): SupabasePaymentInsert {
  return {
    // Identity
    id: payment.id,
    payment_number: payment.paymentNumber,

    // Financial data
    payment_method: payment.method, // 'cash' | 'card' | 'qr'
    status: payment.status, // 'pending' | 'completed' | 'failed' | 'refunded'
    amount: payment.amount,

    // Cash handling
    received_amount: payment.receivedAmount || null,
    change_amount: payment.changeAmount || null,

    // Links to operational data
    order_id: payment.orderId,
    bill_ids: payment.billIds.length > 0 ? payment.billIds : null,
    item_ids: payment.itemIds.length > 0 ? payment.itemIds : null,
    shift_id: payment.shiftId || null,

    // Refund data
    refunded_at: payment.refundedAt || null,
    refund_reason: payment.refundReason || null,
    refunded_by: payment.refundedBy || null,
    original_payment_id: payment.originalPaymentId || null,

    // Reconciliation
    processed_by_name: payment.processedBy, // NOTE: processedBy is cashier name, not UUID
    processed_at: payment.processedAt,
    reconciled_at: payment.reconciledAt || null,
    reconciled_by: payment.reconciledBy || null,

    // Receipt
    receipt_printed: payment.receiptPrinted,
    receipt_number: payment.receiptNumber || null,

    // Sync tracking
    sync_status: payment.syncStatus || 'pending',
    synced_at: payment.syncedAt || null,

    // Additional fields (Supabase-specific)
    details: {}, // Empty JSONB object for future use
    transaction_id: null, // For card/QR payment gateway transaction IDs
    processed_by: null, // UUID field - we use processed_by_name instead

    // Timestamps
    created_at: payment.createdAt
  }
}

/**
 * Convert PosPayment (app) to Supabase format for UPDATE
 */
export function toSupabaseUpdate(payment: PosPayment): SupabasePaymentUpdate {
  const insert = toSupabaseInsert(payment)
  return {
    ...insert,
    // Note: Supabase payments table doesn't have updated_at trigger
    // Updates don't modify created_at
    created_at: undefined
  }
}

/**
 * Convert Supabase payment to PosPayment (app)
 */
export function fromSupabase(supabasePayment: SupabasePayment): PosPayment {
  return {
    // Identity
    id: supabasePayment.id,
    paymentNumber: supabasePayment.payment_number || '',

    // Financial data
    method: supabasePayment.payment_method,
    status: supabasePayment.status as 'pending' | 'completed' | 'failed' | 'refunded',
    amount: supabasePayment.amount,

    // Cash handling
    receivedAmount: supabasePayment.received_amount || undefined,
    changeAmount: supabasePayment.change_amount || undefined,

    // Links to operational data
    orderId: supabasePayment.order_id,
    billIds: supabasePayment.bill_ids || [],
    itemIds: supabasePayment.item_ids || [],
    shiftId: supabasePayment.shift_id || undefined,

    // Refund data
    refundedAt: supabasePayment.refunded_at || undefined,
    refundReason: supabasePayment.refund_reason || undefined,
    refundedBy: supabasePayment.refunded_by || undefined,
    originalPaymentId: supabasePayment.original_payment_id || undefined,

    // Reconciliation
    processedBy: supabasePayment.processed_by_name || '', // Cashier name
    processedAt: supabasePayment.processed_at || new Date().toISOString(),
    reconciledAt: supabasePayment.reconciled_at || undefined,
    reconciledBy: supabasePayment.reconciled_by || undefined,

    // Receipt
    receiptPrinted: supabasePayment.receipt_printed || false,
    receiptNumber: supabasePayment.receipt_number || undefined,

    // Sync tracking
    syncStatus: (supabasePayment.sync_status as 'pending' | 'synced' | 'failed') || 'pending',
    syncedAt: supabasePayment.synced_at || undefined,

    // Timestamps
    createdAt: supabasePayment.created_at,
    updatedAt: supabasePayment.created_at // Supabase doesn't have updated_at for payments
  }
}
