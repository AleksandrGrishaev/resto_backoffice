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

    // Cash management
    starting_cash: shift.startingCash,
    starting_cash_verified: shift.startingCashVerified,
    ending_cash: shift.endingCash || null,
    expected_cash: shift.expectedCash || null,
    cash_discrepancy: shift.cashDiscrepancy || null,
    cash_discrepancy_type: shift.cashDiscrepancyType || null,

    // Sales totals
    total_sales: shift.totalSales,
    total_transactions: shift.totalTransactions,
    total_cash: cashMethod?.amount || 0,
    total_card: cardMethod?.amount || 0,
    total_qr: qrMethod?.amount || 0,

    // Duration
    duration: shift.duration || null,

    // Complex data (JSONB)
    payment_methods: shift.paymentMethods.map(p => ({
      type: p.methodType,
      code: p.methodCode, // Payment method code for matching (e.g., 'alex', 'cash')
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
      type: e.type,
      description: e.description,
      amount: e.amount,
      category: e.category,
      counteragentId: e.counteragentId,
      counteragentName: e.counteragentName,
      invoiceNumber: e.invoiceNumber,
      status: e.status,
      performedBy: e.performedBy,
      confirmedBy: e.confirmedBy,
      confirmedAt: e.confirmedAt,
      rejectionReason: e.rejectionReason,
      relatedPaymentId: e.relatedPaymentId,
      relatedTransactionId: e.relatedTransactionId,
      relatedAccountId: e.relatedAccountId,
      linkingStatus: e.linkingStatus,
      syncStatus: e.syncStatus,
      lastSyncAt: e.lastSyncAt,
      notes: e.notes,
      timestamp: e.createdAt
    })),
    account_balances: shift.accountBalances.map(ab => ({
      accountId: ab.accountId,
      accountName: ab.accountName,
      startingBalance: ab.startingBalance,
      endingBalance: ab.endingBalance,
      totalIncome: ab.totalIncome,
      totalExpense: ab.totalExpense
    })),
    pending_payments: shift.pendingPayments,

    // Notes and metadata
    notes: shift.notes || null,
    device_id: shift.deviceId || null,
    location: shift.location || null,

    // Sync tracking
    sync_status: shift.syncStatus,
    last_sync_at: shift.lastSyncAt || null,
    pending_sync: shift.pendingSync,
    synced_to_account: shift.syncedToAccount || false,
    synced_at: shift.syncedAt || null,
    account_transaction_ids: shift.accountTransactionIds || null,
    sync_error: shift.syncError || null,
    sync_attempts: shift.syncAttempts || 0,
    last_sync_attempt: shift.lastSyncAttempt || null,
    sync_queued_at: shift.syncQueuedAt || null,

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
    methodCode: p.code || p.type, // Fallback to type for old data without code
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
  const expenseOperations = supabaseShift.expense_operations.map((e: any) => ({
    id: e.id,
    shiftId: supabaseShift.id,
    type: e.type || 'direct_expense',
    description: e.description,
    amount: e.amount,
    category: e.category,
    counteragentId: e.counteragentId,
    counteragentName: e.counteragentName,
    invoiceNumber: e.invoiceNumber,
    status: e.status || 'completed',
    performedBy: e.performedBy,
    confirmedBy: e.confirmedBy,
    confirmedAt: e.confirmedAt,
    rejectionReason: e.rejectionReason,
    relatedPaymentId: e.relatedPaymentId,
    relatedTransactionId: e.relatedTransactionId,
    relatedAccountId: e.relatedAccountId || '',
    linkingStatus: e.linkingStatus,
    syncStatus: e.syncStatus || 'pending',
    lastSyncAt: e.lastSyncAt,
    notes: e.notes,
    createdAt: e.timestamp,
    updatedAt: e.timestamp
  }))

  // Convert account balances back to app format
  const accountBalances = (supabaseShift.account_balances || []).map((ab: any) => ({
    accountId: ab.accountId,
    accountName: ab.accountName,
    accountType: 'cash' as const, // Default, should be stored in JSONB
    startingBalance: ab.startingBalance || 0,
    endingBalance: ab.endingBalance,
    expectedBalance: ab.expectedBalance,
    actualBalance: ab.actualBalance,
    totalIncome: ab.totalIncome || 0,
    totalExpense: ab.totalExpense || 0,
    transactionCount: 0,
    expenseOperations: [],
    discrepancy: 0,
    discrepancyExplained: false,
    syncStatus: 'synced' as const
  }))

  return {
    id: supabaseShift.id,
    shiftNumber,
    status: supabaseShift.status as 'active' | 'completed',
    cashierId: supabaseShift.cashier_id || '',
    cashierName: supabaseShift.cashier_name,
    startTime: supabaseShift.start_time,
    endTime: supabaseShift.end_time || undefined,
    duration: supabaseShift.duration || undefined,

    // Cash management - NOW FROM SUPABASE!
    startingCash: supabaseShift.starting_cash || 0,
    startingCashVerified: supabaseShift.starting_cash_verified || false,
    endingCash: supabaseShift.ending_cash || undefined,
    expectedCash: supabaseShift.expected_cash || undefined,
    cashDiscrepancy: supabaseShift.cash_discrepancy || undefined,
    cashDiscrepancyType: (supabaseShift.cash_discrepancy_type as any) || undefined,

    // Sales
    totalSales: supabaseShift.total_sales,
    totalTransactions: supabaseShift.total_transactions || 0,
    paymentMethods,
    corrections,
    accountBalances,
    expenseOperations,
    pendingPayments: supabaseShift.pending_payments || [],

    // Notes and metadata
    notes: supabaseShift.notes || undefined,
    deviceId: supabaseShift.device_id || undefined,
    location: supabaseShift.location || undefined,

    // Sync tracking
    syncStatus: (supabaseShift.sync_status as any) || 'pending',
    lastSyncAt: supabaseShift.last_sync_at || undefined,
    pendingSync: supabaseShift.pending_sync || false,
    syncedToAccount: supabaseShift.synced_to_account,
    syncedAt: supabaseShift.synced_at || undefined,
    accountTransactionIds: supabaseShift.account_transaction_ids || undefined,
    syncAttempts: supabaseShift.sync_attempts,
    lastSyncAttempt: supabaseShift.last_sync_attempt || undefined,
    syncError: supabaseShift.sync_error || undefined,
    syncQueuedAt: supabaseShift.sync_queued_at || undefined,

    createdAt: supabaseShift.created_at,
    updatedAt: supabaseShift.updated_at
  }
}
