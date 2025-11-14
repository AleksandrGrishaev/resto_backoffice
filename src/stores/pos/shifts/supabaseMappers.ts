// src/stores/pos/shifts/supabaseMappers.ts - Supabase data mappers for shifts

import type { PosShift } from './types'
import type { Database } from '@/supabase/types'

type SupabaseShift = Database['public']['Tables']['shifts']['Row']
type SupabaseShiftInsert = Database['public']['Tables']['shifts']['Insert']
type SupabaseShiftUpdate = Database['public']['Tables']['shifts']['Update']

/**
 * Convert PosShift (app) to Supabase format for INSERT
 */
export function toSupabaseInsert(shift: PosShift): SupabaseShiftInsert {
  // Calculate totals by payment method
  const cashMethod = shift.paymentMethods.find(p => p.methodType === 'cash')
  const cardMethod = shift.paymentMethods.find(p => p.methodType === 'card')
  const qrMethod = shift.paymentMethods.find(p => p.methodType === 'qr')

  // Check if cashier_id is a valid UUID (not mock user)
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    shift.cashierId
  )

  return {
    id: shift.id,
    shift_number: parseInt(shift.shiftNumber.split('-')[1]) || 0, // Extract number from "SHIFT-001-..."
    cashier_id: isValidUUID ? shift.cashierId : null, // NULL for mock users
    cashier_name: shift.cashierName,
    status: shift.status === 'completed' ? 'completed' : 'active',
    start_time: shift.startTime,
    end_time: shift.endTime || null,
    total_sales: shift.totalSales,
    total_cash: cashMethod?.amount || 0,
    total_card: cardMethod?.amount || 0,
    total_qr: qrMethod?.amount || 0,
    payment_methods: shift.paymentMethods.map(p => ({
      type: p.methodType as 'cash' | 'card' | 'qr',
      amount: p.amount,
      label: p.methodName
    })),
    corrections: shift.corrections.map(c => ({
      id: c.id,
      reason: c.reason,
      amount: c.amount,
      timestamp: c.createdAt
    })),
    expense_operations: shift.expenseOperations.map(e => ({
      id: e.id,
      description: e.description || e.type,
      amount: e.amount,
      timestamp: e.createdAt
    })),
    synced_to_account: shift.syncedToAccount || false,
    synced_at: shift.syncedAt || null,
    account_transaction_ids: shift.accountTransactionIds || null,
    sync_error: shift.syncError || null,
    sync_attempts: shift.syncAttempts || 0,
    last_sync_attempt: shift.lastSyncAttempt || null,
    created_at: shift.createdAt,
    updated_at: shift.updatedAt
  }
}

/**
 * Convert PosShift (app) to Supabase format for UPDATE
 */
export function toSupabaseUpdate(shift: PosShift): SupabaseShiftUpdate {
  const insert = toSupabaseInsert(shift)
  return {
    ...insert,
    updated_at: new Date().toISOString()
  }
}

/**
 * Convert Supabase shift to PosShift (app)
 */
export function fromSupabase(supabaseShift: SupabaseShift): PosShift {
  // Generate shift number from shift_number
  const shiftNumber = `SHIFT-${String(supabaseShift.shift_number).padStart(3, '0')}-${supabaseShift.start_time.split('T')[0]}`

  // Convert payment methods back to app format
  const paymentMethods = supabaseShift.payment_methods.map((p, index) => ({
    methodId: p.type,
    methodName: p.label || p.type.toUpperCase(),
    methodType: p.type,
    count: 0, // Not stored in Supabase, would need to calculate
    amount: p.amount,
    percentage: 0 // Will be calculated
  }))

  // Calculate percentages
  const totalAmount = paymentMethods.reduce((sum, p) => sum + p.amount, 0)
  paymentMethods.forEach(p => {
    p.percentage = totalAmount > 0 ? (p.amount / totalAmount) * 100 : 0
  })

  // Convert corrections back to app format
  const corrections = supabaseShift.corrections.map(c => ({
    id: c.id,
    shiftId: supabaseShift.id,
    reason: c.reason,
    amount: c.amount,
    correctionType: c.amount > 0 ? ('overage' as const) : ('shortage' as const),
    createdAt: c.timestamp,
    updatedAt: c.timestamp
  }))

  // Convert expense operations back to app format
  const expenseOperations = supabaseShift.expense_operations.map(e => ({
    id: e.id,
    shiftId: supabaseShift.id,
    type: e.description as any, // TODO: map properly
    description: e.description,
    amount: e.amount,
    accountId: '',
    status: 'completed' as const,
    createdAt: e.timestamp,
    updatedAt: e.timestamp
  }))

  return {
    id: supabaseShift.id,
    shiftNumber,
    status: supabaseShift.status as 'active' | 'completed',
    cashierId: supabaseShift.cashier_id || '',
    cashierName: supabaseShift.cashier_name,
    startTime: supabaseShift.start_time,
    endTime: supabaseShift.end_time || undefined,
    duration: supabaseShift.end_time
      ? Math.floor(
          (new Date(supabaseShift.end_time).getTime() -
            new Date(supabaseShift.start_time).getTime()) /
            60000
        )
      : undefined,
    startingCash: 0, // Not in Supabase, needs to be stored separately or calculated
    startingCashVerified: true,
    endingCash: undefined,
    expectedCash: undefined,
    cashDiscrepancy: undefined,
    cashDiscrepancyType: undefined,
    totalSales: supabaseShift.total_sales,
    totalTransactions: 0, // Not stored in Supabase
    paymentMethods,
    corrections,
    accountBalances: [], // Not in Supabase
    expenseOperations,
    pendingPayments: [], // Not in Supabase
    syncStatus: supabaseShift.synced_to_account ? 'synced' : 'pending',
    lastSyncAt: supabaseShift.synced_at || undefined,
    pendingSync: !supabaseShift.synced_to_account,
    syncedToAccount: supabaseShift.synced_to_account,
    syncedAt: supabaseShift.synced_at || undefined,
    accountTransactionIds: supabaseShift.account_transaction_ids || undefined,
    syncAttempts: supabaseShift.sync_attempts,
    lastSyncAttempt: supabaseShift.last_sync_attempt || undefined,
    syncError: supabaseShift.sync_error || undefined,
    createdAt: supabaseShift.created_at,
    updatedAt: supabaseShift.updated_at
  }
}
