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
import { DebugUtils, generateId } from '@/utils'
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

// Helper: Timeout wrapper for Supabase requests
const SUPABASE_TIMEOUT = 5000 // 5 seconds

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
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const { data, error } = await withTimeout(
        supabase.from('accounts').select('*').order('name', { ascending: true })
      )

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch accounts:', error)
        throw error
      }

      const accounts = data ? accountsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Accounts loaded from Supabase', {
        count: accounts.length
      })

      return accounts
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading accounts:', error)
      throw error
    }
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
        DebugUtils.error(MODULE_NAME, 'Failed to fetch account:', error)
        throw error
      }

      const account = data ? accountFromSupabase(data) : null

      DebugUtils.info(MODULE_NAME, '✅ Account loaded from Supabase', {
        id,
        name: account?.name
      })

      return account
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading account:', error)
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
        DebugUtils.error(MODULE_NAME, 'Failed to create account:', error)
        throw error
      }

      const account = data ? accountFromSupabase(data) : newAccount

      DebugUtils.info(MODULE_NAME, '✅ Account created in Supabase', {
        id: account.id,
        name: account.name
      })

      return account
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating account:', error)
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
        DebugUtils.error(MODULE_NAME, 'Failed to update account:', error)
        throw error
      }

      DebugUtils.info(MODULE_NAME, '✅ Account updated in Supabase', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating account:', error)
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
      DebugUtils.error(MODULE_NAME, 'Error updating account balance:', error)
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
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const { data, error } = await withTimeout(
        supabase.from('transactions').select('*').order('created_at', { ascending: false })
      )

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch transactions:', error)
        throw error
      }

      const transactions = data ? transactionsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Transactions loaded from Supabase', {
        count: transactions.length
      })

      return transactions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading transactions:', error)
      throw error
    }
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
        DebugUtils.error(MODULE_NAME, 'Failed to fetch account transactions:', error)
        throw error
      }

      const transactions = data ? transactionsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Account transactions loaded from Supabase', {
        accountId,
        count: transactions.length
      })

      return transactions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading account transactions:', error)
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
        DebugUtils.error(MODULE_NAME, 'Failed to create transaction:', error)
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
      DebugUtils.error(MODULE_NAME, 'Error creating transaction:', error)
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
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase not available')
      }

      const { data, error } = await withTimeout(
        supabase.from('pending_payments').select('*').order('due_date', { ascending: true })
      )

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch pending payments:', error)
        throw error
      }

      const payments = data ? pendingPaymentsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Pending payments loaded from Supabase', {
        count: payments.length
      })

      return payments
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading pending payments:', error)
      throw error
    }
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
        DebugUtils.error(MODULE_NAME, 'Failed to fetch filtered payments:', error)
        throw error
      }

      const payments = data ? pendingPaymentsFromSupabase(data) : []

      DebugUtils.info(MODULE_NAME, '✅ Filtered payments loaded from Supabase', {
        count: payments.length,
        filters
      })

      return payments
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading filtered payments:', error)
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
        DebugUtils.error(MODULE_NAME, 'Failed to create pending payment:', error)
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
      DebugUtils.error(MODULE_NAME, 'Error creating pending payment:', error)
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
      DebugUtils.error(MODULE_NAME, 'Error calculating payment statistics:', error)
      throw error
    }
  }
}

// Export singleton instance
export const accountSupabaseService = new AccountSupabaseService()
