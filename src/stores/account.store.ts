// src/stores/account.store.ts
import { defineStore } from 'pinia'
import type {
  Account,
  Transaction,
  CreateOperationDto,
  CreateTransferDto,
  CreateCorrectionDto,
  TransactionFilters
} from '@/types'
import { accountService } from '@/services/account.service'
import { transactionService } from '@/services/transaction.service'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AccountStore'

interface State {
  accounts: Account[]
  transactions: Transaction[]
  filters: TransactionFilters
  selectedAccountId: string | null
  isLoading: boolean
  error: Error | null
}

export const useAccountStore = defineStore('account', {
  state: (): State => ({
    accounts: [],
    transactions: [],
    filters: {
      dateFrom: null,
      dateTo: null,
      type: null,
      category: null
    },
    selectedAccountId: null,
    isLoading: false,
    error: null
  }),

  getters: {
    activeAccounts: state => state.accounts.filter(account => account.isActive),

    getAccountById: state => (id: string) => state.accounts.find(account => account.id === id),

    getAccountOperations: state => (accountId: string) => {
      return state.transactions
        .filter(t => t.accountId === accountId)
        .filter(t => {
          if (!state.filters.type) return true
          return t.type === state.filters.type
        })
        .filter(t => {
          if (!state.filters.dateFrom || !state.filters.dateTo) return true
          return t.createdAt >= state.filters.dateFrom && t.createdAt <= state.filters.dateTo
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },

    totalBalance: state => state.accounts.reduce((sum, account) => sum + account.balance, 0)
  },

  actions: {
    // Account actions
    async fetchAccounts() {
      try {
        this.isLoading = true
        DebugUtils.info(MODULE_NAME, 'Fetching accounts')

        this.accounts = await accountService.getAll()

        DebugUtils.info(MODULE_NAME, 'Accounts fetched successfully', {
          count: this.accounts.length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch accounts', { error })
        this.error = error as Error
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // Transaction actions
    async createOperation(data: CreateOperationDto) {
      try {
        DebugUtils.info(MODULE_NAME, 'Creating operation', { data })

        const transaction = await transactionService.createTransaction(data)
        this.transactions.unshift(transaction)
        await this.fetchAccounts() // Обновляем балансы

        DebugUtils.info(MODULE_NAME, 'Operation created successfully')
        return transaction
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create operation', { error })
        throw error
      }
    },

    async transferBetweenAccounts(data: CreateTransferDto) {
      try {
        DebugUtils.info(MODULE_NAME, 'Creating transfer', { data })

        await transactionService.createTransfer(data)
        await this.fetchAccounts() // Обновляем балансы
        await this.fetchTransactions(this.selectedAccountId!)

        DebugUtils.info(MODULE_NAME, 'Transfer created successfully')
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create transfer', { error })
        throw error
      }
    },

    async correctBalance(data: CreateCorrectionDto) {
      try {
        DebugUtils.info(MODULE_NAME, 'Creating correction', { data })

        await transactionService.createCorrection(data)
        await this.fetchAccounts() // Обновляем балансы
        await this.fetchTransactions(this.selectedAccountId!)

        DebugUtils.info(MODULE_NAME, 'Correction created successfully')
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create correction', { error })
        throw error
      }
    },

    async fetchTransactions(accountId: string) {
      try {
        this.isLoading = true
        this.selectedAccountId = accountId

        this.transactions = await transactionService.getAccountTransactions(accountId, this.filters)
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch transactions', { error })
        throw error
      } finally {
        this.isLoading = false
      }
    },

    setFilters(filters: TransactionFilters) {
      this.filters = filters
      if (this.selectedAccountId) {
        this.fetchTransactions(this.selectedAccountId)
      }
    }
  }
})
