// src/stores/account/accountSupabaseService.ts - Supabase service for accounts

import type {
  Account,
  Transaction,
  PendingPayment,
  CreateOperationDto,
  CreateTransferDto,
  CreateCorrectionDto,
  CreatePaymentDto,
  ProcessPaymentDto,
  UpdatePaymentAmountDto,
  PaymentFilters,
  PaymentStatistics
} from './types'
import { DebugUtils, generateId, extractErrorDetails } from '@/utils'
import { ENV } from '@/config/environment'
import { supabase } from '@/supabase/client'
import {
  accountToSupabaseInsert,
  accountToSupabaseUpdate,
  accountFromSupabase,
  transactionToSupabaseInsert,
  transactionToSupabaseUpdate,
  transactionFromSupabase,
  pendingPaymentToSupabaseInsert,
  pendingPaymentToSupabaseUpdate,
  pendingPaymentFromSupabase,
  accountsFromSupabase,
  transactionsFromSupabase,
  pendingPaymentsFromSupabase
} from './supabaseMappers'

const MODULE_NAME = 'AccountSupabaseService'

// Helper: Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return ENV.useSupabase && !!supabase
}

// Helper: Timeout wrapper for Supabase requests with retry logic
// ⚠️ QUICK FIX: Increased from 5s to 15s to fix timeout issues
const SUPABASE_TIMEOUT = 15000 // 15 seconds (was 5 seconds - too short!)
const MAX_RETRIES = 3
const RETRY_BASE_DELAY = 1000 // 1 second

/**
 * Execute promise with timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = SUPABASE_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase request timeout')), timeoutMs)
    )
  ])
}

/**
 * Execute request with retry logic (exponential backoff)
 * ⚠️ QUICK FIX: Added retry to handle transient network issues
 */
async function withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  let lastError: any = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Execute with timeout
      const result = await withTimeout(operation())

      // Success - log if this was a retry
      if (attempt > 0) {
        DebugUtils.info(MODULE_NAME, `✅ ${operationName} succeeded after retry`, {
          attempt: attempt + 1,
          totalAttempts: attempt + 1
        })
      }

      return result
    } catch (error: any) {
      lastError = error
      const isLastAttempt = attempt === MAX_RETRIES

      // Extract error details for better logging
      const errorDetails = extractErrorDetails(error)

      // Check if error is retryable (timeout or network error)
      const errorMessage = errorDetails.message.toLowerCase()
      const isRetryable =
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('etimedout') ||
        errorMessage.includes('failed to fetch')

      if (!isRetryable || isLastAttempt) {
        // Don't retry or exhausted retries
        DebugUtils.error(MODULE_NAME, `❌ ${operationName} failed (no retry)`, {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          error: errorDetails
        })
        throw error
      }

      // Calculate delay with exponential backoff + jitter
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt)
      const jitter = Math.random() * 1000

      DebugUtils.warn(MODULE_NAME, `⏳ ${operationName} failed, retrying...`, {
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
        retryIn: Math.floor(delay + jitter) + 'ms',
        error: errorDetails.message
      })

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay + jitter))
    }
  }

  // All retries exhausted
  throw lastError
}

/**
 * AccountSupabaseService - Supabase implementation for account operations
 */
export class AccountSupabaseService {
  // =============================================
  // ACCOUNTS
  // =============================================

  /**
   * Get all accounts
   */
  async getAllAccounts(): Promise<Account[]> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    return withRetry(async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        throw error
      }

      const accounts = data ? accountsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Accounts loaded from Supabase', {
        count: accounts.length
      })

      return accounts
    }, 'getAllAccounts')
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: string): Promise<Account | null> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const { data, error } = await withTimeout(
        supabase.from('accounts').select('*').eq('id', id).single()
      )

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Record not found
        }
        DebugUtils.error(MODULE_NAME, 'Failed to fetch account', extractErrorDetails(error))
        throw error
      }

      const account = data ? accountFromSupabase(data) : null

      DebugUtils.info(MODULE_NAME, '✅ Account loaded from Supabase', {
        id,
        name: account?.name
      })

      return account
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading account', extractErrorDetails(error))
      throw error
    }
  }

  /**
   * Create new account
   */
  async createAccount(
    accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt' | 'lastTransactionDate'>
  ): Promise<Account> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const newAccount: Account = {
        ...accountData,
        id: generateId(),
        lastTransactionDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const { data, error } = await withTimeout(
        supabase.from('accounts').insert(accountToSupabaseInsert(newAccount)).select().single()
      )

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create account', extractErrorDetails(error))
        throw error
      }

      const account = data ? accountFromSupabase(data) : newAccount

      DebugUtils.info(MODULE_NAME, '✅ Account created in Supabase', {
        id: account.id,
        name: account.name
      })

      return account
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating account', extractErrorDetails(error))
      throw error
    }
  }

  /**
   * Update account
   */
  async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      }

      const { error } = await withTimeout(
        supabase
          .from('accounts')
          .update(accountToSupabaseUpdate(updateData as Account))
          .eq('id', id)
      )

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to update account', extractErrorDetails(error))
        throw error
      }

      DebugUtils.info(MODULE_NAME, '✅ Account updated in Supabase', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating account', extractErrorDetails(error))
      throw error
    }
  }

  /**
   * Update account balance
   */
  async updateAccountBalance(id: string, balance: number): Promise<void> {
    try {
      await this.updateAccount(id, {
        balance,
        lastTransactionDate: new Date().toISOString()
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating account balance', extractErrorDetails(error))
      throw error
    }
  }

  // =============================================
  // TRANSACTIONS
  // =============================================

  /**
   * Get all transactions
   */
  async getAllTransactions(): Promise<Transaction[]> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    return withRetry(async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      const transactions = data ? transactionsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Transactions loaded from Supabase', {
        count: transactions.length
      })

      return transactions
    }, 'getAllTransactions')
  }

  /**
   * Get transactions for specific account
   */
  async getAccountTransactions(accountId: string): Promise<Transaction[]> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const { data, error } = await withTimeout(
        supabase
          .from('transactions')
          .select('*')
          .eq('account_id', accountId)
          .order('created_at', { ascending: false })
      )

      if (error) {
        DebugUtils.error(
          MODULE_NAME,
          'Failed to fetch account transactions',
          extractErrorDetails(error)
        )
        throw error
      }

      const transactions = data ? transactionsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Account transactions loaded from Supabase', {
        accountId,
        count: transactions.length
      })

      return transactions
    } catch (error) {
      DebugUtils.error(
        MODULE_NAME,
        'Error loading account transactions',
        extractErrorDetails(error)
      )
      throw error
    }
  }

  /**
   * Create transaction
   */
  async createTransaction(data: CreateOperationDto): Promise<Transaction> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      // Get account to calculate balance
      const account = await this.getAccountById(data.accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Get existing transactions to calculate current balance
      const existingTransactions = await this.getAccountTransactions(data.accountId)
      const currentBalance =
        existingTransactions.length > 0 ? existingTransactions[0].balanceAfter : account.balance

      // Calculate new balance
      let newBalance = currentBalance
      switch (data.type) {
        case 'income':
          newBalance += data.amount
          break
        case 'expense':
          newBalance -= data.amount
          break
        case 'transfer':
          newBalance += data.amount
          break
        case 'correction':
          newBalance += data.amount
          break
      }

      const transaction: Transaction = {
        id: generateId(),
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        description: data.description,
        performedBy: data.performedBy,
        balanceAfter: newBalance,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Optional fields
        expenseCategory: data.expenseCategory,
        counteragentId: data.counteragentId,
        counteragentName: data.counteragentName,
        relatedOrderIds: data.relatedOrderIds,
        relatedPaymentId: data.relatedPaymentId,
        transferDetails: data.transferDetails,
        isCorrection: data.isCorrection
      }

      const { data: result, error } = await withTimeout(
        supabase
          .from('transactions')
          .insert(transactionToSupabaseInsert(transaction))
          .select()
          .single()
      )

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create transaction', extractErrorDetails(error))
        throw error
      }

      // Update account balance
      await this.updateAccountBalance(data.accountId, newBalance)

      const createdTransaction = result ? transactionFromSupabase(result) : transaction

      DebugUtils.info(MODULE_NAME, '✅ Transaction created in Supabase', {
        id: createdTransaction.id,
        type: createdTransaction.type,
        amount: createdTransaction.amount,
        balanceAfter: createdTransaction.balanceAfter
      })

      return createdTransaction
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating transaction', extractErrorDetails(error))
      throw error
    }
  }

  // =============================================
  // PENDING PAYMENTS
  // =============================================

  /**
   * Get all pending payments
   */
  async getAllPendingPayments(): Promise<PendingPayment[]> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase not available')
    }

    return withRetry(async () => {
      const { data, error } = await supabase
        .from('pending_payments')
        .select('*')
        .order('due_date', { ascending: true })

      if (error) {
        throw error
      }

      const payments = data ? pendingPaymentsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Pending payments loaded from Supabase', {
        count: payments.length
      })

      return payments
    }, 'getAllPendingPayments')
  }

  /**
   * Get pending payments with filters
   */
  async getPendingPaymentsByFilters(filters: PaymentFilters): Promise<PendingPayment[]> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      let query = supabase.from('pending_payments').select('*')

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      // Apply priority filter
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }

      // Order by due date
      query = query.order('due_date', { ascending: true })

      const { data, error } = await withTimeout(query)

      if (error) {
        DebugUtils.error(
          MODULE_NAME,
          'Failed to fetch filtered payments',
          extractErrorDetails(error)
        )
        throw error
      }

      const payments = data ? pendingPaymentsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Filtered payments loaded from Supabase', {
        count: payments.length,
        filters
      })

      return payments
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading filtered payments', extractErrorDetails(error))
      throw error
    }
  }

  /**
   * Create pending payment
   */
  async createPendingPayment(data: CreatePaymentDto): Promise<PendingPayment> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const payment: PendingPayment = {
        id: generateId(),
        counteragentId: data.counteragentId,
        counteragentName: data.counteragentName,
        amount: data.amount,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority || 'medium',
        status: 'pending',
        category: data.category,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes,
        createdBy: data.createdBy,
        assignedToAccount: data.assignedToAccount,
        // ✅ FIXED: Copy missing fields from CreatePaymentDto
        usedAmount: data.usedAmount || 0,
        linkedOrders: data.linkedOrders || [],
        sourceOrderId: data.sourceOrderId,
        autoSyncEnabled: data.autoSyncEnabled || false,
        amountHistory: [],
        paidAmount: 0,
        requiresCashierConfirmation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const { data: result, error } = await withTimeout(
        supabase
          .from('pending_payments')
          .insert(pendingPaymentToSupabaseInsert(payment))
          .select()
          .single()
      )

      if (error) {
        DebugUtils.error(
          MODULE_NAME,
          'Failed to create pending payment',
          extractErrorDetails(error)
        )
        throw error
      }

      const createdPayment = result ? pendingPaymentFromSupabase(result) : payment

      DebugUtils.info(MODULE_NAME, '✅ Pending payment created in Supabase', {
        id: createdPayment.id,
        amount: createdPayment.amount,
        status: createdPayment.status,
        linkedOrdersCount: createdPayment.linkedOrders?.length || 0,
        sourceOrderId: createdPayment.sourceOrderId
      })

      return createdPayment
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating pending payment', extractErrorDetails(error))
      throw error
    }
  }

  /**
   * ✅ Sprint 8: Assign payment to account
   */
  async assignPaymentToAccount(paymentId: string, accountId: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const { error } = await withTimeout(
        supabase
          .from('pending_payments')
          .update({
            assigned_to_account: accountId,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentId)
      )

      if (error) {
        DebugUtils.error(
          MODULE_NAME,
          'Failed to assign payment to account',
          extractErrorDetails(error)
        )
        throw error
      }

      DebugUtils.info(MODULE_NAME, '✅ Payment assigned to account in Supabase', {
        paymentId,
        accountId
      })
    } catch (error) {
      DebugUtils.error(
        MODULE_NAME,
        'Error assigning payment to account',
        extractErrorDetails(error)
      )
      throw error
    }
  }

  /**
   * ✅ Sprint 8: Update pending payment
   * ⚠️ FIX: Support all payment fields (status, paidAmount, paidDate, etc.)
   */
  async updatePendingPayment(paymentId: string, updates: Partial<PendingPayment>): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      // Convert app types to Supabase column names
      const supabaseUpdates: any = {
        updated_at: new Date().toISOString()
      }

      if (updates.requiresCashierConfirmation !== undefined) {
        supabaseUpdates.requires_cashier_confirmation = updates.requiresCashierConfirmation
      }
      if (updates.confirmationStatus !== undefined) {
        supabaseUpdates.confirmation_status = updates.confirmationStatus
      }
      if (updates.status !== undefined) {
        supabaseUpdates.status = updates.status
      }
      if (updates.priority !== undefined) {
        supabaseUpdates.priority = updates.priority
      }
      if (updates.assignedToAccount !== undefined) {
        supabaseUpdates.assigned_to_account = updates.assignedToAccount
      }
      // ✅ FIX: Add payment completion fields
      if (updates.paidAmount !== undefined) {
        supabaseUpdates.paid_amount = updates.paidAmount
      }
      if (updates.paidDate !== undefined) {
        supabaseUpdates.paid_date = updates.paidDate
      }
      if (updates.confirmedBy !== undefined) {
        supabaseUpdates.confirmed_by = updates.confirmedBy
      }
      if (updates.confirmedAt !== undefined) {
        supabaseUpdates.confirmed_at = updates.confirmedAt
      }

      const { error } = await withTimeout(
        supabase.from('pending_payments').update(supabaseUpdates).eq('id', paymentId)
      )

      if (error) {
        DebugUtils.error(
          MODULE_NAME,
          'Failed to update pending payment',
          extractErrorDetails(error)
        )
        throw error
      }

      DebugUtils.info(MODULE_NAME, '✅ Pending payment updated in Supabase', {
        paymentId,
        updates: Object.keys(supabaseUpdates)
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating pending payment', extractErrorDetails(error))
      throw error
    }
  }

  /**
   * Update payment used amount
   * Called when payments are linked/unlinked to orders
   */
  async updatePaymentUsedAmount(paymentId: string, usedAmount: number): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const { error } = await withTimeout(
        supabase
          .from('pending_payments')
          .update({
            used_amount: usedAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentId)
      )

      if (error) {
        DebugUtils.error(
          MODULE_NAME,
          'Failed to update payment used amount',
          extractErrorDetails(error)
        )
        throw error
      }

      DebugUtils.info(MODULE_NAME, '✅ Payment used amount updated in Supabase', {
        paymentId,
        usedAmount
      })
    } catch (error) {
      DebugUtils.error(
        MODULE_NAME,
        'Error updating payment used amount',
        extractErrorDetails(error)
      )
      throw error
    }
  }

  /**
   * Update payment amount (with history tracking)
   */
  async updatePaymentAmount(data: UpdatePaymentAmountDto): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      // First get current payment to build history
      const { data: currentPayment, error: fetchError } = await withTimeout(
        supabase.from('pending_payments').select('*').eq('id', data.paymentId).single()
      )

      if (fetchError) {
        throw fetchError
      }

      const payment = currentPayment ? pendingPaymentFromSupabase(currentPayment) : null
      if (!payment) {
        throw new Error('Payment not found')
      }

      // Build amount history entry
      const historyEntry = {
        previousAmount: payment.amount,
        newAmount: data.newAmount,
        changedAt: new Date().toISOString(),
        reason: data.reason || 'manual_update'
      }

      const amountHistory = [...(payment.amountHistory || []), historyEntry]

      const { error } = await withTimeout(
        supabase
          .from('pending_payments')
          .update({
            amount: data.newAmount,
            amount_history: amountHistory,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.paymentId)
      )

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to update payment amount', extractErrorDetails(error))
        throw error
      }

      DebugUtils.info(MODULE_NAME, '✅ Payment amount updated in Supabase', {
        paymentId: data.paymentId,
        oldAmount: payment.amount,
        newAmount: data.newAmount,
        reason: data.reason
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating payment amount', extractErrorDetails(error))
      throw error
    }
  }

  /**
   * Update payment priority
   */
  async updatePaymentPriority(paymentId: string, priority: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const { error } = await withTimeout(
        supabase
          .from('pending_payments')
          .update({
            priority,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentId)
      )

      if (error) {
        DebugUtils.error(
          MODULE_NAME,
          'Failed to update payment priority',
          extractErrorDetails(error)
        )
        throw error
      }

      DebugUtils.info(MODULE_NAME, '✅ Payment priority updated in Supabase', {
        paymentId,
        priority
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating payment priority', extractErrorDetails(error))
      throw error
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const { error } = await withTimeout(
        supabase
          .from('pending_payments')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentId)
      )

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to cancel payment', extractErrorDetails(error))
        throw error
      }

      DebugUtils.info(MODULE_NAME, '✅ Payment cancelled in Supabase', { paymentId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error cancelling payment', extractErrorDetails(error))
      throw error
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(): Promise<PaymentStatistics> {
    try {
      const payments = await this.getAllPendingPayments()
      const pending = payments.filter(p => p.status === 'pending')
      const totalAmount = pending.reduce((sum, p) => sum + p.amount, 0)
      const urgent = pending.filter(p => p.priority === 'urgent')
      const overdue = pending.filter(p => {
        if (!p.dueDate) return false
        return new Date(p.dueDate) < new Date()
      })

      return {
        totalPending: pending.length,
        totalAmount,
        urgentCount: urgent.length,
        overdueCount: overdue.length
      }
    } catch (error) {
      DebugUtils.error(
        MODULE_NAME,
        'Error calculating payment statistics',
        extractErrorDetails(error)
      )
      throw error
    }
  }
}

// Export singleton instance
export const accountSupabaseService = new AccountSupabaseService()
