// src/stores/account/supabaseMappers.ts
// Mappers for Account ↔ Supabase conversion

import type { Account, Transaction, PendingPayment } from './types'
import type { Tables, TablesInsert, TablesUpdate } from '@/supabase/types.gen'

// =============================================
// SUPABASE TYPES (from generated types.gen.ts)
// =============================================

export type SupabaseAccount = Tables<'accounts'>
export type SupabaseAccountInsert = TablesInsert<'accounts'>
export type SupabaseAccountUpdate = TablesUpdate<'accounts'>

export type SupabaseTransaction = Tables<'transactions'>
export type SupabaseTransactionInsert = TablesInsert<'transactions'>
export type SupabaseTransactionUpdate = TablesUpdate<'transactions'>

export type SupabasePendingPayment = Tables<'pending_payments'>
export type SupabasePendingPaymentInsert = TablesInsert<'pending_payments'>
export type SupabasePendingPaymentUpdate = TablesUpdate<'pending_payments'>

// =============================================
// ACCOUNT MAPPERS
// =============================================

/**
 * Convert Account to Supabase INSERT format
 */
export function accountToSupabaseInsert(account: Account): SupabaseAccountInsert {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    is_active: account.isActive,
    balance: account.balance,
    description: account.description || null,
    last_transaction_date: account.lastTransactionDate || null,
    updated_at: account.updatedAt
  }
}

/**
 * Convert Account to Supabase UPDATE format
 */
export function accountToSupabaseUpdate(account: Account): SupabaseAccountUpdate {
  const insert = accountToSupabaseInsert(account)
  // created_at is immutable, already omitted by type
  return insert
}

/**
 * Convert Supabase row to Account
 */
export function accountFromSupabase(row: SupabaseAccount): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type as any, // AccountType
    isActive: row.is_active ?? true,
    balance: Number(row.balance) || 0,
    description: row.description || undefined,
    lastTransactionDate: row.last_transaction_date || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  }
}

// =============================================
// TRANSACTION MAPPERS
// =============================================

/**
 * Convert Transaction to Supabase INSERT format
 */
export function transactionToSupabaseInsert(transaction: Transaction): SupabaseTransactionInsert {
  return {
    id: transaction.id,
    account_id: transaction.accountId,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    balance_after: transaction.balanceAfter,
    expense_category: transaction.expenseCategory || null,
    counteragent_id: transaction.counteragentId || null,
    counteragent_name: transaction.counteragentName || null,
    related_order_ids: transaction.relatedOrderIds || null,
    related_payment_id: transaction.relatedPaymentId || null,
    performed_by: transaction.performedBy,
    status: transaction.status,
    transfer_details: transaction.transferDetails || null,
    is_correction: transaction.isCorrection || false,
    updated_at: transaction.updatedAt
  }
}

/**
 * Convert Transaction to Supabase UPDATE format
 */
export function transactionToSupabaseUpdate(transaction: Transaction): SupabaseTransactionUpdate {
  const insert = transactionToSupabaseInsert(transaction)
  // created_at is immutable, already omitted by type
  return insert
}

/**
 * Convert Supabase row to Transaction
 */
export function transactionFromSupabase(row: SupabaseTransaction): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type as any, // OperationType
    amount: Number(row.amount),
    description: row.description,
    balanceAfter: Number(row.balance_after) || 0,
    expenseCategory: (row.expense_category as any) || undefined,
    counteragentId: row.counteragent_id || undefined,
    counteragentName: row.counteragent_name || undefined,
    relatedOrderIds: row.related_order_ids || undefined,
    relatedPaymentId: row.related_payment_id || undefined,
    performedBy: row.performed_by as any, // TransactionPerformer
    status: row.status as any, // TransactionStatus
    transferDetails: (row.transfer_details as any) || undefined,
    isCorrection: row.is_correction || false,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  }
}

// =============================================
// PENDING PAYMENT MAPPERS
// =============================================

/**
 * Convert PendingPayment to Supabase INSERT format
 */
export function pendingPaymentToSupabaseInsert(
  payment: PendingPayment
): SupabasePendingPaymentInsert {
  return {
    id: payment.id,
    counteragent_id: payment.counteragentId,
    counteragent_name: payment.counteragentName,
    amount: payment.amount,
    description: payment.description,
    due_date: payment.dueDate || null,
    priority: payment.priority,
    status: payment.status,
    category: payment.category,
    invoice_number: payment.invoiceNumber || null,
    notes: payment.notes || null,
    assigned_to_account: payment.assignedToAccount || null,
    created_by: payment.createdBy,
    used_amount: payment.usedAmount || null,
    linked_orders: payment.linkedOrders || null,
    source_order_id: payment.sourceOrderId || null,
    last_amount_update: payment.lastAmountUpdate || null,
    amount_history: payment.amountHistory || null,
    auto_sync_enabled: payment.autoSyncEnabled || false,
    paid_amount: payment.paidAmount || null,
    paid_date: payment.paidDate || null,
    requires_cashier_confirmation: payment.requiresCashierConfirmation || false,
    confirmation_status: payment.confirmationStatus || null,
    confirmed_by: payment.confirmedBy || null,
    confirmed_at: payment.confirmedAt || null,
    rejection_reason: payment.rejectionReason || null,
    assigned_shift_id: payment.assignedShiftId || null,
    updated_at: payment.updatedAt
  }
}

/**
 * Convert PendingPayment to Supabase UPDATE format
 */
export function pendingPaymentToSupabaseUpdate(
  payment: PendingPayment
): SupabasePendingPaymentUpdate {
  const insert = pendingPaymentToSupabaseInsert(payment)
  // created_at is immutable, already omitted by type
  return insert
}

/**
 * Convert Supabase row to PendingPayment
 */
export function pendingPaymentFromSupabase(row: SupabasePendingPayment): PendingPayment {
  return {
    id: row.id,
    counteragentId: row.counteragent_id,
    counteragentName: row.counteragent_name,
    amount: Number(row.amount),
    description: row.description,
    dueDate: row.due_date || undefined,
    priority: row.priority as any, // PaymentPriority
    status: row.status as any, // PaymentStatus
    category: row.category as any, // PaymentCategory
    invoiceNumber: row.invoice_number || undefined,
    notes: row.notes || undefined,
    assignedToAccount: row.assigned_to_account || undefined,
    createdBy: row.created_by as any,
    usedAmount: Number(row.used_amount) || 0,
    linkedOrders: (row.linked_orders as any) || [],
    sourceOrderId: row.source_order_id || undefined,
    lastAmountUpdate: row.last_amount_update || undefined,
    amountHistory: (row.amount_history as any) || [],
    autoSyncEnabled: row.auto_sync_enabled || false,
    paidAmount: Number(row.paid_amount) || 0,
    paidDate: row.paid_date || undefined,
    requiresCashierConfirmation: row.requires_cashier_confirmation || false,
    confirmationStatus: (row.confirmation_status as any) || undefined,
    confirmedBy: (row.confirmed_by as any) || undefined,
    confirmedAt: row.confirmed_at || undefined,
    rejectionReason: row.rejection_reason || undefined,
    assignedShiftId: row.assigned_shift_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  }
}

// =============================================
// BATCH OPERATIONS
// =============================================

/**
 * Convert multiple accounts to Supabase format
 */
export function accountsToSupabase(accounts: Account[]): SupabaseAccountInsert[] {
  return accounts.map(accountToSupabaseInsert)
}

/**
 * Convert multiple Supabase rows to accounts
 */
export function accountsFromSupabase(rows: SupabaseAccount[]): Account[] {
  return rows.map(accountFromSupabase)
}

/**
 * Convert multiple transactions to Supabase format
 */
export function transactionsToSupabase(transactions: Transaction[]): SupabaseTransactionInsert[] {
  return transactions.map(transactionToSupabaseInsert)
}

/**
 * Convert multiple Supabase rows to transactions
 */
export function transactionsFromSupabase(rows: SupabaseTransaction[]): Transaction[] {
  return rows.map(transactionFromSupabase)
}

/**
 * Convert multiple pending payments to Supabase format
 */
export function pendingPaymentsToSupabase(
  payments: PendingPayment[]
): SupabasePendingPaymentInsert[] {
  return payments.map(pendingPaymentToSupabaseInsert)
}

/**
 * Convert multiple Supabase rows to pending payments
 */
export function pendingPaymentsFromSupabase(rows: SupabasePendingPayment[]): PendingPayment[] {
  return rows.map(pendingPaymentFromSupabase)
}
