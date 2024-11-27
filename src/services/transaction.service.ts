// src/services/transaction.service.ts
import type {
  Transaction,
  CreateOperationDto,
  CreateTransferDto,
  CreateCorrectionDto,
  TransactionFilters
} from '../types/transaction'
import { accountService } from './account.service'
import { BaseService } from '@/firebase/services/base.service'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'TransactionService'

export class TransactionService extends BaseService<Transaction> {
  constructor() {
    super('transactions')
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

      const transaction: Omit<Transaction, 'id'> = {
        ...data,
        balanceAfter: newBalance,
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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

      const transferDetails = {
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        fromBalanceAfter,
        toBalanceAfter
      }

      // Create outgoing transaction
      const outgoingTransaction: Omit<Transaction, 'id'> = {
        accountId: data.fromAccountId,
        type: 'transfer',
        amount: data.amount,
        balanceAfter: fromBalanceAfter,
        description: data.description,
        performedBy: data.performedBy,
        status: 'completed',
        transferDetails,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Create incoming transaction
      const incomingTransaction: Omit<Transaction, 'id'> = {
        accountId: data.toAccountId,
        type: 'transfer',
        amount: data.amount,
        balanceAfter: toBalanceAfter,
        description: data.description,
        performedBy: data.performedBy,
        status: 'completed',
        transferDetails,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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

      const transaction: Omit<Transaction, 'id'> = {
        accountId: data.accountId,
        type: 'correction',
        amount: Math.abs(data.amount - account.balance),
        balanceAfter: data.amount,
        description: data.description,
        performedBy: data.performedBy,
        status: 'completed',
        isCorrection: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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

      let query = this.collection.where('accountId', '==', accountId)

      if (filters?.type) {
        query = query.where('type', '==', filters.type)
      }

      if (filters?.dateFrom) {
        query = query.where('createdAt', '>=', filters.dateFrom)
      }

      if (filters?.dateTo) {
        query = query.where('createdAt', '<=', filters.dateTo)
      }

      const transactions = await this.getByQuery(query)

      DebugUtils.info(MODULE_NAME, 'Transactions fetched successfully', {
        count: transactions.length
      })

      return transactions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch transactions', { error })
      throw error
    }
  }
}

export const transactionService = new TransactionService()
