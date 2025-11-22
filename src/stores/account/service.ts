// src/stores/account/service.ts - Supabase-first implementation
import type {
  Account,
  Transaction,
  PendingPayment,
  CreateOperationDto,
  CreateTransferDto,
  CreateCorrectionDto,
  CreatePaymentDto,
  ProcessPaymentDto,
  TransactionFilters,
  PaymentFilters,
  PaymentStatistics,
  UpdatePaymentAmountDto,
  AmountChange
} from './types'
import { DebugUtils, generateId } from '@/utils'
import { ENV } from '@/config/environment'
import { accountSupabaseService } from './accountSupabaseService'

const MODULE_NAME = 'AccountService'

// Helper: Check if we should use Supabase
function shouldUseSupabase(): boolean {
  return ENV.useSupabase
}

// ============ ACCOUNT SERVICE ============
export class AccountService {
  async getAll(): Promise<Account[]> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.getAllAccounts()
      }

      // Fallback to empty array (mock data removed)
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning empty accounts list')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get accounts:', error)
      throw error
    }
  }

  async getById(id: string): Promise<Account | null> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.getAccountById(id)
      }

      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning null')
      return null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get account by ID:', error)
      throw error
    }
  }

  async create(
    data: Omit<Account, 'id' | 'lastTransactionDate' | 'createdAt' | 'updatedAt'>
  ): Promise<Account> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.createAccount(data)
      }

      throw new Error('Supabase not available - cannot create account')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create account:', error)
      throw error
    }
  }

  async update(id: string, data: Partial<Account>): Promise<void> {
    try {
      if (shouldUseSupabase()) {
        await accountSupabaseService.updateAccount(id, data)
        return
      }

      throw new Error('Supabase not available - cannot update account')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update account:', error)
      throw error
    }
  }

  async updateBalance(id: string, amount: number): Promise<void> {
    try {
      if (shouldUseSupabase()) {
        await accountSupabaseService.updateAccountBalance(id, amount)
        return
      }

      throw new Error('Supabase not available - cannot update balance')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update account balance:', error)
      throw error
    }
  }

  async transferBetweenAccounts(fromId: string, toId: string, amount: number): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Starting transfer between accounts', { fromId, toId, amount })

      const [fromAccount, toAccount] = await Promise.all([this.getById(fromId), this.getById(toId)])

      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts not found')
      }

      if (fromAccount.balance < amount) {
        throw new Error('Insufficient funds')
      }

      const transferId = generateId()
      const timestamp = new Date().toISOString()
      const performedBy = { type: 'user' as const, id: 'system', name: 'System' }

      // Create transfer transactions
      await Promise.all([
        transactionService.createTransaction({
          accountId: fromId,
          type: 'transfer',
          amount: -amount,
          description: `Transfer to ${toAccount.name}`,
          performedBy,
          transferDetails: { fromAccountId: fromId, toAccountId: toId }
        }),
        transactionService.createTransaction({
          accountId: toId,
          type: 'transfer',
          amount: amount,
          description: `Transfer from ${fromAccount.name}`,
          performedBy,
          transferDetails: { fromAccountId: fromId, toAccountId: toId }
        })
      ])

      DebugUtils.info(MODULE_NAME, 'Transfer completed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Transfer failed:', error)
      throw error
    }
  }
}

// ============ TRANSACTION SERVICE ============
export class TransactionService {
  async getAll(): Promise<Transaction[]> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.getAllTransactions()
      }

      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning empty transactions list')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get transactions:', error)
      throw error
    }
  }

  async getAccountTransactions(accountId: string): Promise<Transaction[]> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.getAccountTransactions(accountId)
      }

      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning empty transactions list')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get account transactions:', error)
      throw error
    }
  }

  async createTransaction(data: CreateOperationDto): Promise<Transaction> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.createTransaction(data)
      }

      throw new Error('Supabase not available - cannot create transaction')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transaction:', error)
      throw error
    }
  }

  async createTransfer(data: CreateTransferDto): Promise<Transaction[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating transfer', data)

      const [fromAccount, toAccount] = await Promise.all([
        accountService.getById(data.fromAccountId),
        accountService.getById(data.toAccountId)
      ])

      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts not found')
      }

      if (fromAccount.balance < data.amount) {
        throw new Error('Insufficient funds')
      }

      const performedBy = data.performedBy

      // Create transfer transactions (handled by createTransaction which updates balances)
      const [fromTransaction, toTransaction] = await Promise.all([
        this.createTransaction({
          accountId: data.fromAccountId,
          type: 'transfer',
          amount: -data.amount,
          description: `Transfer to ${toAccount.name}: ${data.description}`,
          performedBy,
          transferDetails: { fromAccountId: data.fromAccountId, toAccountId: data.toAccountId }
        }),
        this.createTransaction({
          accountId: data.toAccountId,
          type: 'transfer',
          amount: data.amount,
          description: `Transfer from ${fromAccount.name}: ${data.description}`,
          performedBy,
          transferDetails: { fromAccountId: data.fromAccountId, toAccountId: data.toAccountId }
        })
      ])

      DebugUtils.info(MODULE_NAME, 'Transfer created successfully')
      return [fromTransaction, toTransaction]
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transfer:', error)
      throw error
    }
  }

  async createCorrection(data: CreateCorrectionDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating correction', data)

      const account = await accountService.getById(data.accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      await this.createTransaction({
        accountId: data.accountId,
        type: 'correction',
        amount: data.amount - account.balance,
        description: data.description,
        performedBy: data.performedBy,
        isCorrection: true
      })

      DebugUtils.info(MODULE_NAME, 'Correction created successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create correction:', error)
      throw error
    }
  }
}

// ============ PAYMENT SERVICE ============
export class PaymentService {
  async getAll(): Promise<PendingPayment[]> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.getAllPendingPayments()
      }

      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning empty payments list')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get payments:', error)
      throw error
    }
  }

  async getPaymentsByFilters(filters: PaymentFilters): Promise<PendingPayment[]> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.getPendingPaymentsByFilters(filters)
      }

      DebugUtils.warn(MODULE_NAME, 'Supabase not available, returning empty payments list')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get filtered payments:', error)
      throw error
    }
  }

  async createPayment(data: CreatePaymentDto): Promise<PendingPayment> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.createPendingPayment(data)
      }

      throw new Error('Supabase not available - cannot create payment')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create payment:', error)
      throw error
    }
  }

  async processPayment(data: ProcessPaymentDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Processing payment', data)

      const account = await accountService.getById(data.accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      const actualAmount = data.actualAmount || 0
      if (account.balance < actualAmount) {
        throw new Error('Insufficient funds')
      }

      // Create expense transaction
      await transactionService.createTransaction({
        accountId: data.accountId,
        type: 'expense',
        amount: actualAmount,
        description: `Payment processing`,
        performedBy: data.performedBy,
        expenseCategory: { type: 'daily', category: 'other' }
      })

      DebugUtils.info(MODULE_NAME, 'Payment processed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to process payment:', error)
      throw error
    }
  }

  async getPaymentStatistics(): Promise<PaymentStatistics> {
    try {
      if (shouldUseSupabase()) {
        return await accountSupabaseService.getPaymentStatistics()
      }

      // Return empty statistics
      return {
        totalPending: 0,
        totalAmount: 0,
        urgentCount: 0,
        overdueCount: 0
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get payment statistics:', error)
      throw error
    }
  }
}

// ============ SERVICE INSTANCES ============
export const accountService = new AccountService()
export const transactionService = new TransactionService()
export const paymentService = new PaymentService()

// ============ UTILITY FUNCTIONS ============

// Legacy function for backward compatibility
export function resetMockData(): void {
  DebugUtils.warn(MODULE_NAME, 'resetMockData called - mock data removed, no action taken')
}

// Legacy function for backward compatibility
export async function getMockDataStats() {
  DebugUtils.warn(MODULE_NAME, 'getMockDataStats called - mock data removed, returning empty stats')
  return {
    accounts: { total: 0, active: 0, totalBalance: 0 },
    transactions: { total: 0, income: 0, expenses: 0, transfers: 0, corrections: 0 },
    payments: { total: 0, pending: 0, totalAmount: 0, urgent: 0, overdue: 0 }
  }
}

// Legacy function for backward compatibility
export async function addTestData(): Promise<void> {
  DebugUtils.warn(MODULE_NAME, 'addTestData called - mock data removed, no action taken')
}
