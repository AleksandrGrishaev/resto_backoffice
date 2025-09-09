// src/stores/account/service.ts
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
import { mockAccounts, mockTransactions } from './mock'
import {
  mockPendingPayments,
  calculatePaymentStatistics,
  getPendingPayments,
  getOverduePayments,
  getUrgentPayments
} from './paymentMock'
import { DebugUtils, generateId } from '@/utils'

const MODULE_NAME = 'AccountService'

// ============ MOCK BASE SERVICE ============
class MockBaseService<T extends { id: string }> {
  protected data: T[]

  constructor(initialData: T[]) {
    this.data = [...initialData]
  }

  async getAll(): Promise<T[]> {
    return Promise.resolve([...this.data])
  }

  async getById(id: string): Promise<T | null> {
    const item = this.data.find(item => item.id === id)
    return Promise.resolve(item || null)
  }

  async create(item: Omit<T, 'id'>): Promise<T> {
    const newItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as T

    this.data.push(newItem)
    return Promise.resolve(newItem)
  }

  async update(id: string, updates: Partial<T>): Promise<void> {
    const index = this.data.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error(`Item with id ${id} not found`)
    }

    this.data[index] = {
      ...this.data[index],
      ...updates,
      updatedAt: new Date().toISOString()
    } as T

    return Promise.resolve()
  }

  async delete(id: string): Promise<void> {
    const index = this.data.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error(`Item with id ${id} not found`)
    }

    this.data.splice(index, 1)
    return Promise.resolve()
  }
}

// ============ ACCOUNT SERVICE ============
export class AccountService extends MockBaseService<Account> {
  constructor() {
    super(mockAccounts)
  }

  async updateBalance(id: string, amount: number): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating account balance', { id, amount })

      const account = await this.getById(id)
      if (!account) {
        throw new Error('Account not found')
      }

      await this.update(id, {
        balance: amount,
        lastTransactionDate: new Date().toISOString()
      })

      DebugUtils.info(MODULE_NAME, 'Account balance updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update account balance', { error })
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

      await Promise.all([
        this.updateBalance(fromId, fromAccount.balance - amount),
        this.updateBalance(toId, toAccount.balance + amount)
      ])

      DebugUtils.info(MODULE_NAME, 'Transfer completed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Transfer failed', { error })
      throw error
    }
  }

  async create(
    data: Omit<Account, 'id' | 'lastTransactionDate' | 'createdAt' | 'updatedAt'>
  ): Promise<Account> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating account', { data })

      const newAccount: Omit<Account, 'id'> = {
        ...data,
        balance: data.balance || 0,
        lastTransactionDate: null
      }

      const account = await super.create(newAccount)

      // Создаем начальную транзакцию если есть баланс
      if (data.balance && data.balance > 0) {
        await transactionService.createTransaction({
          accountId: account.id,
          type: 'income',
          amount: data.balance,
          description: 'Начальный баланс',
          performedBy: {
            type: 'user',
            id: 'system',
            name: 'System'
          }
        })
      }

      return account
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create account', { error })
      throw error
    }
  }

  async update(id: string, data: Partial<Account>): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating account', { id, data })

      const account = await this.getById(id)
      if (!account) {
        throw new Error('Account not found')
      }

      // Проверка возможности деактивации
      if (data.isActive === false && account.balance !== 0) {
        throw new Error('Cannot deactivate account with non-zero balance')
      }

      await super.update(id, data)

      DebugUtils.info(MODULE_NAME, 'Account updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update account', { error })
      throw error
    }
  }
}

// ============ TRANSACTION SERVICE ============
export class TransactionService extends MockBaseService<Transaction> {
  constructor() {
    super(mockTransactions)
  }

  // ✅ ОБНОВЛЕНИЕ createTransaction с валидацией
  async createTransaction(data: CreateOperationDto): Promise<Transaction> {
    try {
      // Валидация обязательной категории
      if (data.type === 'expense' && !data.expenseCategory) {
        throw new Error('Expense category is required for expense operations')
      }

      DebugUtils.info(MODULE_NAME, 'Creating transaction', { data })

      const account = await accountService.getById(data.accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Проверяем достаточность средств для expense
      if (data.type === 'expense' && account.balance < data.amount) {
        throw new Error('Insufficient funds')
      }

      const balanceAfter =
        data.type === 'income' ? account.balance + data.amount : account.balance - data.amount

      const transaction: Transaction = {
        id: generateId(),
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        balanceAfter,
        description: data.description,
        expenseCategory: data.expenseCategory!, // Теперь обязательное для expense
        performedBy: data.performedBy,
        status: 'completed',

        // Новые поля
        counteragentId: data.counteragentId,
        counteragentName: data.counteragentName,
        relatedOrderIds: data.relatedOrderIds,
        relatedPaymentId: data.relatedPaymentId,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await Promise.all([
        this.create(transaction),
        accountService.updateBalance(data.accountId, balanceAfter)
      ])

      DebugUtils.info(MODULE_NAME, 'Transaction created successfully')
      return transaction
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transaction', { error })
      throw error
    }
  }

  async createTransfer(data: CreateTransferDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating transfer', { data })

      const fromAccount = await accountService.getById(data.fromAccountId)
      const toAccount = await accountService.getById(data.toAccountId)

      if (!fromAccount || !toAccount) {
        throw new Error('Account not found')
      }

      if (fromAccount.balance < data.amount) {
        throw new Error('Insufficient funds')
      }

      const fromBalanceAfter = fromAccount.balance - data.amount
      const toBalanceAfter = toAccount.balance + data.amount

      // ✅ ИСПРАВЛЕНИЕ: Добавляем все обязательные поля
      const outgoingTransaction: Omit<Transaction, 'id'> = {
        accountId: data.fromAccountId,
        type: 'transfer',
        amount: data.amount,
        balanceAfter: fromBalanceAfter,
        description: data.description,
        expenseCategory: { type: 'daily', category: 'other' }, // ✅ ДОБАВЛЕНО: Обязательное поле
        performedBy: data.performedBy,
        status: 'completed',
        transferDetails: {
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          fromBalanceAfter,
          toBalanceAfter
        },
        createdAt: new Date().toISOString(), // ✅ ДОБАВЛЕНО
        updatedAt: new Date().toISOString() // ✅ ДОБАВЛЕНО
      }

      const incomingTransaction: Omit<Transaction, 'id'> = {
        accountId: data.toAccountId,
        type: 'transfer',
        amount: data.amount,
        balanceAfter: toBalanceAfter,
        description: data.description,
        expenseCategory: { type: 'daily', category: 'other' }, // ✅ ДОБАВЛЕНО: Обязательное поле
        performedBy: data.performedBy,
        status: 'completed',
        transferDetails: {
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          fromBalanceAfter,
          toBalanceAfter
        },
        createdAt: new Date().toISOString(), // ✅ ДОБАВЛЕНО
        updatedAt: new Date().toISOString() // ✅ ДОБАВЛЕНО
      }

      await Promise.all([
        this.create(outgoingTransaction),
        this.create(incomingTransaction),
        accountService.updateBalance(data.fromAccountId, fromBalanceAfter),
        accountService.updateBalance(data.toAccountId, toBalanceAfter)
      ])

      DebugUtils.info(MODULE_NAME, 'Transfer completed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transfer', { error })
      throw error
    }
  }

  async createCorrection(data: CreateCorrectionDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating correction', { data })

      const account = await accountService.getById(data.accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      const correctionAmount = data.amount - account.balance

      // ✅ ИСПРАВЛЕНИЕ: Добавляем все обязательные поля
      const transaction: Omit<Transaction, 'id'> = {
        accountId: data.accountId,
        type: 'correction',
        amount: Math.abs(correctionAmount),
        balanceAfter: data.amount,
        description: data.description,
        expenseCategory: { type: 'daily', category: 'other' }, // ✅ ДОБАВЛЕНО: Обязательное поле
        performedBy: data.performedBy,
        status: 'completed',
        isCorrection: true,
        createdAt: new Date().toISOString(), // ✅ ДОБАВЛЕНО
        updatedAt: new Date().toISOString() // ✅ ДОБАВЛЕНО
      }

      await Promise.all([
        this.create(transaction),
        accountService.updateBalance(data.accountId, data.amount)
      ])

      DebugUtils.info(MODULE_NAME, 'Correction completed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create correction', { error })
      throw error
    }
  }

  async getAccountTransactions(
    accountId: string,
    filters?: TransactionFilters
  ): Promise<Transaction[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching account transactions', { accountId, filters })

      let transactions = this.data.filter(t => t.accountId === accountId)

      // Применяем фильтры
      if (filters?.type) {
        transactions = transactions.filter(t => t.type === filters.type)
      }

      if (filters?.dateFrom) {
        transactions = transactions.filter(t => t.createdAt >= filters.dateFrom!)
      }

      if (filters?.dateTo) {
        transactions = transactions.filter(t => t.createdAt <= filters.dateTo!)
      }

      if (filters?.category) {
        transactions = transactions.filter(t => t.expenseCategory?.type === filters.category)
      }

      // Сортируем по дате создания (новые сначала)
      transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      DebugUtils.info(MODULE_NAME, 'Transactions fetched successfully', {
        count: transactions.length
      })

      return Promise.resolve(transactions)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch transactions', { error })
      throw error
    }
  }

  // Дополнительные методы для работы с mock данными
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching all transactions')

      // Возвращаем все транзакции для статистики
      const transactions = [...this.data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      DebugUtils.info(MODULE_NAME, 'All transactions fetched successfully', {
        count: transactions.length
      })

      return Promise.resolve(transactions)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch all transactions', { error })
      throw error
    }
  }

  async getTransactionsByDateRange(dateFrom: string, dateTo: string): Promise<Transaction[]> {
    const transactions = this.data.filter(t => t.createdAt >= dateFrom && t.createdAt <= dateTo)
    return Promise.resolve(transactions)
  }

  async getTransactionsByType(type: Transaction['type']): Promise<Transaction[]> {
    const transactions = this.data.filter(t => t.type === type)
    return Promise.resolve(transactions)
  }
}

// ============ PAYMENT SERVICE ============
export class PaymentService extends MockBaseService<PendingPayment> {
  constructor() {
    super(mockPendingPayments)
  }

  async createPayment(data: CreatePaymentDto): Promise<PendingPayment> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating payment', { data })

      const payment: Omit<PendingPayment, 'id'> = {
        ...data,
        status: 'pending'
      }

      const createdPayment = await this.create(payment)

      DebugUtils.info(MODULE_NAME, 'Payment created successfully', {
        id: createdPayment.id
      })
      return createdPayment
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create payment', { error })
      throw error
    }
  }

  async updatePaymentAmount(data: UpdatePaymentAmountDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating payment amount', { data })

      const payment = await this.getById(data.paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      // Проверяем, можно ли обновлять сумму
      if (payment.status !== 'pending') {
        throw new Error('Cannot update amount for non-pending payment')
      }

      // Создаем запись об изменении
      const amountChange: AmountChange = {
        oldAmount: payment.amount,
        newAmount: data.newAmount,
        reason: data.reason,
        timestamp: new Date().toISOString(),
        userId: data.userId,
        notes: data.notes
      }

      // В реальной системе здесь был бы API вызов
      await this.update(data.paymentId, {
        amount: data.newAmount,
        lastAmountUpdate: new Date().toISOString(),
        amountHistory: [...(payment.amountHistory || []), amountChange]
      })

      DebugUtils.info(MODULE_NAME, 'Payment amount updated successfully', {
        paymentId: data.paymentId,
        oldAmount: amountChange.oldAmount,
        newAmount: amountChange.newAmount
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment amount', { error })
      throw error
    }
  }

  async getPaymentById(paymentId: string): Promise<PendingPayment | null> {
    return await this.getById(paymentId)
  }

  async processPayment(data: ProcessPaymentDto): Promise<void> {
    try {
      clearError()
      state.value.loading.payments = true
      DebugUtils.info(MODULE_NAME, 'Processing payment', { data })

      const payment = await paymentService.getById(data.paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      // Создаем транзакцию expense с информацией о контрагенте
      const transactionData: CreateOperationDto = {
        accountId: data.accountId,
        type: 'expense',
        amount: data.actualAmount || payment.amount,
        description: `Payment: ${payment.description}`,
        expenseCategory: {
          type: 'daily',
          category: payment.category === 'supplier' ? 'product' : 'other'
        },
        performedBy: data.performedBy,

        // ✅ НОВЫЕ поля для связи с контрагентом
        counteragentId: payment.counteragentId,
        counteragentName: payment.counteragentName,
        relatedOrderIds: payment.linkedOrders?.map(order => order.orderId) || [],
        relatedPaymentId: payment.id
      }

      await transactionService.createTransaction(transactionData)

      // Обновляем статус платежа
      await paymentService.update(payment.id, {
        status: 'completed',
        assignedToAccount: data.accountId
      })

      // Обновляем локальные данные
      await Promise.all([
        fetchAccounts(true),
        fetchPayments(true),
        state.value.selectedAccountId ? refreshAllTransactions() : Promise.resolve()
      ])

      DebugUtils.info(MODULE_NAME, 'Payment processed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to process payment', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.payments = false
    }
  }

  async getPaymentsByFilters(filters?: PaymentFilters): Promise<PendingPayment[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching payments with filters', { filters })

      let payments = [...this.data]

      // Применяем фильтры
      if (filters?.status) {
        payments = payments.filter(p => p.status === filters.status)
      }

      if (filters?.priority) {
        payments = payments.filter(p => p.priority === filters.priority)
      }

      // Сортируем по приоритету и дате
      payments.sort((a, b) => {
        // Сначала по приоритету (urgent > high > medium > low)
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff

        // Потом по дате (ближайшие сначала)
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })

      DebugUtils.info(MODULE_NAME, 'Payments fetched successfully', {
        count: payments.length
      })

      return Promise.resolve(payments)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch payments', { error })
      throw error
    }
  }

  async getPaymentStatistics(): Promise<PaymentStatistics> {
    try {
      const stats = calculatePaymentStatistics()
      return Promise.resolve(stats)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get payment statistics', { error })
      throw error
    }
  }

  async assignToAccount(paymentId: string, accountId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Assigning payment to account', { paymentId, accountId })

      const payment = await this.getById(paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      const account = await accountService.getById(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      await this.update(paymentId, {
        assignedToAccount: accountId
      })

      DebugUtils.info(MODULE_NAME, 'Payment assigned to account successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to assign payment to account', { error })
      throw error
    }
  }

  async updatePaymentPriority(
    paymentId: string,
    priority: PendingPayment['priority']
  ): Promise<void> {
    try {
      await this.update(paymentId, { priority })
      DebugUtils.info(MODULE_NAME, 'Payment priority updated', { paymentId, priority })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment priority', { error })
      throw error
    }
  }

  async cancelPayment(paymentId: string): Promise<void> {
    try {
      await this.update(paymentId, { status: 'cancelled' })
      DebugUtils.info(MODULE_NAME, 'Payment cancelled', { paymentId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to cancel payment', { error })
      throw error
    }
  }

  // Методы для быстрого доступа
  async getPendingPayments(): Promise<PendingPayment[]> {
    return getPendingPayments()
  }

  async getOverduePayments(): Promise<PendingPayment[]> {
    return getOverduePayments()
  }

  async getUrgentPayments(): Promise<PendingPayment[]> {
    return getUrgentPayments()
  }

  async getPaymentsByCounteragent(counteragentId: string): Promise<PendingPayment[]> {
    return this.data.filter(payment => payment.counteragentId === counteragentId)
  }

  async getPaymentsByAccount(accountId: string): Promise<PendingPayment[]> {
    return this.data.filter(payment => payment.assignedToAccount === accountId)
  }
}

// ============ SERVICE INSTANCES ============
export const accountService = new AccountService()
export const transactionService = new TransactionService()
export const paymentService = new PaymentService()

// ============ UTILITY FUNCTIONS ============

// Функция для сброса данных к начальному состоянию
export function resetMockData(): void {
  accountService.data = [...mockAccounts]
  transactionService.data = [...mockTransactions]
  paymentService.data = [...mockPendingPayments]
  DebugUtils.info(MODULE_NAME, 'Mock data reset to initial state')
}

// Функция для получения статистики
export async function getMockDataStats() {
  const accounts = await accountService.getAll()
  const transactions = await transactionService.getAllTransactions()
  const payments = await paymentService.getAll()
  const paymentStats = await paymentService.getPaymentStatistics()

  const activeAccounts = accounts.filter(a => a.isActive)
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  const income = transactions.filter(t => t.type === 'income')
  const expenses = transactions.filter(t => t.type === 'expense')
  const transfers = transactions.filter(t => t.type === 'transfer')
  const corrections = transactions.filter(t => t.type === 'correction')

  return {
    accounts: {
      total: accounts.length,
      active: activeAccounts.length,
      totalBalance
    },
    transactions: {
      total: transactions.length,
      income: income.length,
      expenses: expenses.length,
      transfers: transfers.length,
      corrections: corrections.length
    },
    payments: {
      total: payments.length,
      pending: paymentStats.totalPending,
      totalAmount: paymentStats.totalAmount,
      urgent: paymentStats.urgentCount,
      overdue: paymentStats.overdueCount
    }
  }
}

// Функция для добавления тестовых данных
export async function addTestData(): Promise<void> {
  // Добавляем тестовый аккаунт
  const testAccount = await accountService.create({
    name: 'Test Account',
    type: 'cash',
    isActive: true,
    balance: 1000000,
    description: 'Account for testing'
  })

  // Добавляем тестовые транзакции
  await transactionService.createTransaction({
    accountId: testAccount.id,
    type: 'income',
    amount: 500000,
    description: 'Test income',
    performedBy: {
      type: 'user',
      id: 'test_user',
      name: 'Test User'
    }
  })

  await transactionService.createTransaction({
    accountId: testAccount.id,
    type: 'expense',
    amount: 200000,
    description: 'Test expense',
    expenseCategory: {
      type: 'daily',
      category: 'other'
    },
    performedBy: {
      type: 'user',
      id: 'test_user',
      name: 'Test User'
    }
  })

  // Добавляем тестовый платеж
  await paymentService.createPayment({
    counteragentId: 'test-counteragent',
    counteragentName: 'Test Supplier',
    amount: 300000,
    description: 'Test payment',
    priority: 'medium',
    category: 'supplier',
    createdBy: {
      type: 'user',
      id: 'test_user',
      name: 'Test User'
    }
  })

  DebugUtils.info(MODULE_NAME, 'Test data added successfully')
}
