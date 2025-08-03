// src/stores/account/service.ts
import type {
  Account,
  Transaction,
  CreateOperationDto,
  CreateTransferDto,
  CreateCorrectionDto,
  TransactionFilters
} from './types'
import { mockAccounts, mockTransactions } from './mock'
import { DebugUtils } from '@/utils'

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

  async createTransaction(data: CreateOperationDto): Promise<Transaction> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating transaction', { data })

      const account = await accountService.getById(data.accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      const newBalance =
        data.type === 'income' ? account.balance + data.amount : account.balance - data.amount

      if (data.type === 'expense' && newBalance < 0) {
        throw new Error('Insufficient funds')
      }

      // Создаем базовую транзакцию
      const transaction: Omit<Transaction, 'id'> = {
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        balanceAfter: newBalance,
        description: data.description,
        performedBy: data.performedBy,
        status: 'completed'
      }

      // Добавляем expenseCategory только если он определен
      if (data.type === 'expense' && data.expenseCategory) {
        transaction.expenseCategory = data.expenseCategory
      }

      const createdTransaction = await this.create(transaction)
      await accountService.updateBalance(data.accountId, newBalance)

      DebugUtils.info(MODULE_NAME, 'Transaction created successfully', {
        id: createdTransaction.id
      })
      return createdTransaction
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transaction', { error })
      throw error
    }
  }

  async createTransfer(data: CreateTransferDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating transfer', { data })

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

      const fromBalanceAfter = fromAccount.balance - data.amount
      const toBalanceAfter = toAccount.balance + data.amount

      // Создаем транзакции для обоих аккаунтов
      const outgoingTransaction: Omit<Transaction, 'id'> = {
        accountId: data.fromAccountId,
        type: 'transfer',
        amount: -data.amount,
        balanceAfter: fromBalanceAfter,
        description: `Transfer to ${toAccount.name}: ${data.description}`,
        performedBy: data.performedBy,
        status: 'completed',
        transferDetails: {
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          fromBalanceAfter,
          toBalanceAfter
        }
      }

      const incomingTransaction: Omit<Transaction, 'id'> = {
        accountId: data.toAccountId,
        type: 'transfer',
        amount: data.amount,
        balanceAfter: toBalanceAfter,
        description: `Transfer from ${fromAccount.name}: ${data.description}`,
        performedBy: data.performedBy,
        status: 'completed',
        transferDetails: {
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          fromBalanceAfter,
          toBalanceAfter
        }
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

      const transaction: Omit<Transaction, 'id'> = {
        accountId: data.accountId,
        type: 'correction',
        amount: Math.abs(correctionAmount),
        balanceAfter: data.amount,
        description: data.description,
        performedBy: data.performedBy,
        status: 'completed',
        isCorrection: true
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
    return Promise.resolve([...this.data])
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

// ============ SERVICE INSTANCES ============
export const accountService = new AccountService()
export const transactionService = new TransactionService()

// ============ UTILITY FUNCTIONS ============

// Функция для сброса данных к начальному состоянию
export function resetMockData(): void {
  accountService.data = [...mockAccounts]
  transactionService.data = [...mockTransactions]
  DebugUtils.info(MODULE_NAME, 'Mock data reset to initial state')
}

// Функция для получения статистики
export async function getMockDataStats() {
  const accounts = await accountService.getAll()
  const transactions = await transactionService.getAllTransactions()

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

  DebugUtils.info(MODULE_NAME, 'Test data added successfully')
}
