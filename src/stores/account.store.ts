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

interface LoadingState {
  accounts: boolean
  transactions: boolean
  operation: boolean
  transfer: boolean
  correction: boolean
}

interface State {
  accounts: Account[]
  transactions: Transaction[]
  filters: TransactionFilters
  selectedAccountId: string | null
  loading: LoadingState
  error: Error | null
  lastFetch: {
    accounts: string | null
    transactions: Record<string, string> // accountId -> timestamp
  }
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
    loading: {
      accounts: false,
      transactions: false,
      operation: false,
      transfer: false,
      correction: false
    },
    error: null,
    lastFetch: {
      accounts: null,
      transactions: {}
    }
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

    totalBalance: state => state.accounts.reduce((sum, account) => sum + account.balance, 0),

    isLoading: state => Object.values(state.loading).some(loading => loading)
  },

  actions: {
    // Helper methods
    clearError() {
      this.error = null
    },

    setError(error: unknown) {
      this.error = error instanceof Error ? error : new Error(String(error))
    },

    shouldRefetchAccounts(): boolean {
      if (!this.lastFetch.accounts) return true
      const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
      return Date.now() - new Date(this.lastFetch.accounts).getTime() > CACHE_DURATION
    },

    // Account actions
    async fetchAccounts(force = false) {
      if (!force && !this.shouldRefetchAccounts()) {
        DebugUtils.info(MODULE_NAME, 'Using cached accounts data')
        return
      }

      try {
        this.clearError()
        this.loading.accounts = true
        DebugUtils.info(MODULE_NAME, 'Fetching accounts')

        this.accounts = await accountService.getAll()
        this.lastFetch.accounts = new Date().toISOString()

        DebugUtils.info(MODULE_NAME, 'Accounts fetched successfully', {
          count: this.accounts.length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch accounts', { error })
        this.setError(error)
        throw error
      } finally {
        this.loading.accounts = false
      }
    },

    // Transaction actions
    async createOperation(data: CreateOperationDto) {
      try {
        this.clearError()
        this.loading.operation = true
        DebugUtils.info(MODULE_NAME, 'Creating operation', { data })

        const transaction = await transactionService.createTransaction(data)

        // Оптимистическое обновление
        this.transactions.unshift(transaction)

        // Обновляем баланс в кэше
        const account = this.accounts.find(a => a.id === data.accountId)
        if (account) {
          account.balance += data.type === 'income' ? data.amount : -data.amount
        }

        // Фоновое обновление данных
        this.fetchAccounts(true).catch(console.error)

        DebugUtils.info(MODULE_NAME, 'Operation created successfully')
        return transaction
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create operation', { error })
        this.setError(error)
        throw error
      } finally {
        this.loading.operation = false
      }
    },

    async transferBetweenAccounts(data: CreateTransferDto) {
      try {
        this.clearError()
        this.loading.transfer = true
        DebugUtils.info(MODULE_NAME, 'Creating transfer', { data })

        await transactionService.createTransfer(data)
        await Promise.all([
          this.fetchAccounts(true),
          this.selectedAccountId
            ? this.fetchTransactions(this.selectedAccountId)
            : Promise.resolve()
        ])

        DebugUtils.info(MODULE_NAME, 'Transfer created successfully')
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create transfer', { error })
        this.setError(error)
        throw error
      } finally {
        this.loading.transfer = false
      }
    },

    async correctBalance(data: CreateCorrectionDto) {
      try {
        this.clearError()
        this.loading.correction = true
        DebugUtils.info(MODULE_NAME, 'Creating correction', { data })

        await transactionService.createCorrection(data)
        await Promise.all([
          this.fetchAccounts(true),
          this.selectedAccountId
            ? this.fetchTransactions(this.selectedAccountId)
            : Promise.resolve()
        ])

        DebugUtils.info(MODULE_NAME, 'Correction created successfully')
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create correction', { error })
        this.setError(error)
        throw error
      } finally {
        this.loading.correction = false
      }
    },

    async fetchTransactions(accountId: string) {
      try {
        this.clearError()
        this.loading.transactions = true
        this.selectedAccountId = accountId

        this.transactions = await transactionService.getAccountTransactions(accountId, this.filters)
        this.lastFetch.transactions[accountId] = new Date().toISOString()
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch transactions', { error })
        this.setError(error)
        throw error
      } finally {
        this.loading.transactions = false
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
