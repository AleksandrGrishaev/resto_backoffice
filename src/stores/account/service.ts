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
import { mockAccountTransactions } from './accountBasedMock'

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
  private accountTransactions: Record<string, Transaction[]> = {}
  private allTransactionsCache: Transaction[] | null = null
  private cacheTimestamp: string | null = null

  constructor() {
    super([]) // Пустой массив, так как используем раздельные массивы
    this.accountTransactions = {}
    this.accountTransactions = { ...mockAccountTransactions }
  }
  // ✅ ДОБАВИТЬ метод инициализации:
  async initialize() {
    if (Object.keys(this.accountTransactions).length === 0) {
      const { mockAccountTransactions } = await import('./accountBasedMock')
      this.accountTransactions = { ...mockAccountTransactions }
    }
  }

  async getAccountTransactions(accountId: string): Promise<Transaction[]> {
    await this.initialize()
    return this.accountTransactions[accountId] || []
  }

  async getAllTransactions(): Promise<Transaction[]> {
    await this.initialize()
    if (!this.allTransactionsCache || this.isCacheStale()) {
      this.rebuildAllTransactionsCache()
    }
    return [...this.allTransactionsCache!]
  }

  private rebuildAllTransactionsCache(): void {
    const all: Transaction[] = []
    Object.values(this.accountTransactions).forEach(accTxns => all.push(...accTxns))
    this.allTransactionsCache = all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    this.cacheTimestamp = new Date().toISOString()
  }

  private invalidateCache(): void {
    this.allTransactionsCache = null
    this.cacheTimestamp = null
  }

  private isCacheStale(): boolean {
    if (!this.cacheTimestamp) return true
    const cacheAge = Date.now() - new Date(this.cacheTimestamp).getTime()
    return cacheAge > 5 * 60 * 1000 // 5 минут
  }

  // ✅ ОБНОВЛЕНИЕ createTransaction с валидацией
  async createTransaction(data: CreateOperationDto): Promise<Transaction> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating transaction', { data })

      const account = await accountService.getById(data.accountId)
      if (!account) throw new Error('Account not found')

      // Проверка средств для expense
      if (data.type === 'expense' && account.balance < data.amount) {
        throw new Error('Insufficient funds')
      }

      // Получаем текущие транзакции аккаунта
      const accountTxns = this.accountTransactions[data.accountId] || []

      // Рассчитываем новый баланс
      const currentBalance = accountTxns.length > 0 ? accountTxns[0].balanceAfter : account.balance
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
          break // amount содержит знак
        case 'correction':
          newBalance += data.amount
          break
      }

      // Создаем транзакцию с balanceAfter
      const transaction: Transaction = {
        id: generateId(),
        ...data,
        balanceAfter: newBalance, // ✅ ДОБАВЛЯЕМ
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // ✅ НОВОЕ: Добавляем в соответствующий массив
      if (!this.accountTransactions[data.accountId]) {
        this.accountTransactions[data.accountId] = []
      }
      this.accountTransactions[data.accountId].unshift(transaction) // В начало (новые первые)

      // Обновляем баланс аккаунта
      await accountService.updateBalance(data.accountId, newBalance)

      // Инвалидируем кеш
      this.invalidateCache()

      return transaction
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transaction', { error })
      throw error
    }
  }

  async createTransfer(data: CreateTransferDto): Promise<Transaction[]> {
    try {
      const transferId = generateId()
      const timestamp = new Date().toISOString()

      // Получаем аккаунты
      const fromAccount = await accountService.getById(data.fromAccountId)
      const toAccount = await accountService.getById(data.toAccountId)

      if (!fromAccount || !toAccount) throw new Error('Account not found')
      if (fromAccount.balance < data.amount) throw new Error('Insufficient funds')

      // Получаем текущие транзакции для расчета балансов
      const fromTxns = this.accountTransactions[data.fromAccountId] || []
      const toTxns = this.accountTransactions[data.toAccountId] || []

      const fromCurrentBalance =
        fromTxns.length > 0 ? fromTxns[0].balanceAfter : fromAccount.balance
      const toCurrentBalance = toTxns.length > 0 ? toTxns[0].balanceAfter : toAccount.balance

      // Создаем транзакции
      const fromTransaction: Transaction = {
        id: `${transferId}_from`,
        accountId: data.fromAccountId,
        type: 'transfer',
        amount: -data.amount,
        balanceAfter: fromCurrentBalance - data.amount,
        description: `Transfer to ${toAccount.name}: ${data.description}`,
        performedBy: data.performedBy,
        status: 'completed',
        transferDetails: { fromAccountId: data.fromAccountId, toAccountId: data.toAccountId },
        createdAt: timestamp,
        updatedAt: timestamp
      }

      const toTransaction: Transaction = {
        id: `${transferId}_to`,
        accountId: data.toAccountId,
        type: 'transfer',
        amount: data.amount,
        balanceAfter: toCurrentBalance + data.amount,
        description: `Transfer from ${fromAccount.name}: ${data.description}`,
        performedBy: data.performedBy,
        status: 'completed',
        transferDetails: { fromAccountId: data.fromAccountId, toAccountId: data.toAccountId },
        createdAt: timestamp,
        updatedAt: timestamp
      }

      // Добавляем в массивы
      if (!this.accountTransactions[data.fromAccountId])
        this.accountTransactions[data.fromAccountId] = []
      if (!this.accountTransactions[data.toAccountId])
        this.accountTransactions[data.toAccountId] = []

      this.accountTransactions[data.fromAccountId].unshift(fromTransaction)
      this.accountTransactions[data.toAccountId].unshift(toTransaction)

      // Обновляем балансы аккаунтов
      await accountService.updateBalance(data.fromAccountId, fromTransaction.balanceAfter)
      await accountService.updateBalance(data.toAccountId, toTransaction.balanceAfter)

      this.invalidateCache()
      return [fromTransaction, toTransaction]
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transfer', { error })
      throw error
    }
  }

  async createCorrection(data: CreateCorrectionDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating correction', { data })

      const account = await accountService.getById(data.accountId)
      if (!account) throw new Error('Account not found')

      // ✅ ИСПРАВИТЬ: Используем новую логику расчета
      const accountTxns = this.accountTransactions[data.accountId] || []
      const currentBalance = accountTxns.length > 0 ? accountTxns[0].balanceAfter : account.balance
      const correctionAmount = data.amount - currentBalance

      const transaction: Transaction = {
        id: generateId(),
        accountId: data.accountId,
        type: 'correction',
        amount: correctionAmount,
        balanceAfter: data.amount, // Целевой баланс
        description: data.description,
        performedBy: data.performedBy,
        status: 'completed',
        isCorrection: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // ✅ ДОБАВИТЬ в правильный массив:
      if (!this.accountTransactions[data.accountId]) {
        this.accountTransactions[data.accountId] = []
      }
      this.accountTransactions[data.accountId].unshift(transaction)

      await accountService.updateBalance(data.accountId, data.amount)
      this.invalidateCache()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create correction', { error })
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
      DebugUtils.info(MODULE_NAME, 'Processing payment', { data })

      const payment = await this.getById(data.paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      const account = await accountService.getById(data.accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      const actualAmount = data.actualAmount || payment.amount

      if (account.balance < actualAmount) {
        throw new Error('Insufficient funds')
      }

      // Обновляем статус платежа
      await this.update(data.paymentId, {
        status: 'processing',
        assignedToAccount: data.accountId,
        notes: data.notes || payment.notes
      })

      // Создаем транзакцию расхода
      await transactionService.createTransaction({
        accountId: data.accountId,
        type: 'expense',
        amount: actualAmount,
        description: `Платеж: ${payment.description} (${payment.counteragentName})`,
        expenseCategory: {
          type: 'daily',
          category: payment.category === 'supplier' ? 'product' : 'other'
        },
        performedBy: data.performedBy
      })

      // Помечаем платеж как выполненный
      await this.update(data.paymentId, {
        status: 'completed'
      })

      DebugUtils.info(MODULE_NAME, 'Payment processed successfully')
    } catch (error) {
      // В случае ошибки возвращаем статус обратно
      await this.update(data.paymentId, { status: 'failed' })
      DebugUtils.error(MODULE_NAME, 'Failed to process payment', { error })
      throw error
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
  console.log('addTestData is disabled during refactoring')
  // Временно отключаем во время рефакторинга
  return
}
