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

  // ✅ Alias for getAll() - used by store.ts
  async getAllTransactions(): Promise<Transaction[]> {
    return this.getAll()
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

  /**
   * ✅ Sprint 8: Assign payment to account
   * Sets assignedToAccount field and requiresCashierConfirmation if needed
   */
  async assignToAccount(paymentId: string, accountId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Assigning payment to account', { paymentId, accountId })

      if (shouldUseSupabase()) {
        await accountSupabaseService.assignPaymentToAccount(paymentId, accountId)
        DebugUtils.info(MODULE_NAME, 'Payment assigned successfully')
      } else {
        throw new Error('Supabase not available - cannot assign payment')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to assign payment:', error)
      throw error
    }
  }

  /**
   * Update an existing payment
   */
  async update(paymentId: string, updates: Partial<PendingPayment>): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating payment', { paymentId, updates })

      if (shouldUseSupabase()) {
        await accountSupabaseService.updatePendingPayment(paymentId, updates)
        DebugUtils.info(MODULE_NAME, 'Payment updated successfully')
      } else {
        throw new Error('Supabase not available - cannot update payment')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment:', error)
      throw error
    }
  }

  /**
   * Update payment used amount
   * Called when payments are linked/unlinked to orders
   */
  async updatePaymentUsedAmount(paymentId: string, usedAmount: number): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating payment used amount', { paymentId, usedAmount })

      if (shouldUseSupabase()) {
        await accountSupabaseService.updatePaymentUsedAmount(paymentId, usedAmount)
        DebugUtils.info(MODULE_NAME, 'Payment used amount updated successfully')
      } else {
        throw new Error('Supabase not available - cannot update payment used amount')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment used amount:', error)
      throw error
    }
  }

  /**
   * Update payment amount (with history tracking)
   */
  async updatePaymentAmount(data: UpdatePaymentAmountDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating payment amount', data)

      if (shouldUseSupabase()) {
        await accountSupabaseService.updatePaymentAmount(data)
        DebugUtils.info(MODULE_NAME, 'Payment amount updated successfully')
      } else {
        throw new Error('Supabase not available - cannot update payment amount')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment amount:', error)
      throw error
    }
  }

  /**
   * Update payment priority
   */
  async updatePaymentPriority(paymentId: string, priority: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating payment priority', { paymentId, priority })

      if (shouldUseSupabase()) {
        await accountSupabaseService.updatePaymentPriority(paymentId, priority)
        DebugUtils.info(MODULE_NAME, 'Payment priority updated successfully')
      } else {
        throw new Error('Supabase not available - cannot update payment priority')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment priority:', error)
      throw error
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(paymentId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Cancelling payment', { paymentId })

      if (shouldUseSupabase()) {
        await accountSupabaseService.cancelPayment(paymentId)
        DebugUtils.info(MODULE_NAME, 'Payment cancelled successfully')
      } else {
        throw new Error('Supabase not available - cannot cancel payment')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to cancel payment:', error)
      throw error
    }
  }

  /**
   * ✅ Sprint 8: Process payment and return transaction ID
   * ⚠️ FIX: Preserve all payment data in transaction (amount, counteragent, category, etc.)
   */
  async processPayment(data: ProcessPaymentDto): Promise<string> {
    try {
      DebugUtils.info(MODULE_NAME, 'Processing payment', data)

      const account = await accountService.getById(data.accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // ✅ FIX: Get original payment to preserve all data
      const payments = await this.getAll()
      const payment = payments.find(p => p.id === data.paymentId)

      if (!payment) {
        throw new Error(`Payment not found: ${data.paymentId}`)
      }

      // ✅ FIX: Use actualAmount if provided, otherwise use payment.amount
      const actualAmount = data.actualAmount !== undefined ? data.actualAmount : payment.amount

      if (account.balance < actualAmount) {
        throw new Error('Insufficient funds')
      }

      // ✅ FIX: Determine expense category from payment.category
      const expenseCategory =
        payment.category === 'supplier' || payment.category === 'product'
          ? { type: 'expense' as const, category: 'supplier' as const }
          : { type: 'expense' as const, category: 'other' as const }

      // ✅ ENHANCEMENT: Build detailed description with order/payment info
      let enhancedDescription = data.notes || payment.description

      // Add linked order info if available
      if (payment.linkedOrders && payment.linkedOrders.length > 0) {
        const activeOrders = payment.linkedOrders.filter(o => o.isActive)
        if (activeOrders.length > 0) {
          const orderNumbers = activeOrders.map(o => o.orderNumber || o.orderId).join(', ')
          enhancedDescription += ` | Orders: ${orderNumbers}`
        }
      }

      // Add invoice number if available
      if (payment.invoiceNumber) {
        enhancedDescription += ` | Invoice: ${payment.invoiceNumber}`
      }

      // ✅ FIX: Create expense transaction with ALL payment data preserved
      const transaction = await transactionService.createTransaction({
        accountId: data.accountId,
        type: 'expense',
        amount: actualAmount,
        description: enhancedDescription,
        performedBy: data.performedBy,
        expenseCategory,
        counteragentId: payment.counteragentId,
        counteragentName: payment.counteragentName,
        relatedPaymentId: payment.id
      })

      DebugUtils.info(MODULE_NAME, 'Payment processed successfully', {
        transactionId: transaction.id
      })

      return transaction.id
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
