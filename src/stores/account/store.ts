// src/stores/account/store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { accountService, transactionService } from './service'
import { DebugUtils } from '@/utils'
import type {
  Account,
  Transaction,
  CreateOperationDto,
  CreateTransferDto,
  CreateCorrectionDto,
  TransactionFilters,
  AccountStoreState
} from './types'

const MODULE_NAME = 'AccountStore'

export const useAccountStore = defineStore('account', () => {
  // ============ STATE ============
  const state = ref<AccountStoreState>({
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
  })

  // ============ GETTERS ============
  const activeAccounts = computed(() => state.value.accounts.filter(account => account.isActive))

  const getAccountById = computed(
    () => (id: string) => state.value.accounts.find(account => account.id === id)
  )

  const getAccountOperations = computed(() => (accountId: string) => {
    return state.value.transactions
      .filter(t => t.accountId === accountId)
      .filter(t => {
        if (!state.value.filters.type) return true
        return t.type === state.value.filters.type
      })
      .filter(t => {
        if (!state.value.filters.dateFrom || !state.value.filters.dateTo) return true
        return (
          t.createdAt >= state.value.filters.dateFrom && t.createdAt <= state.value.filters.dateTo
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  const totalBalance = computed(() =>
    state.value.accounts.reduce((sum, account) => sum + account.balance, 0)
  )

  const isLoading = computed(() => Object.values(state.value.loading).some(loading => loading))

  // ============ HELPER METHODS ============
  function clearError() {
    state.value.error = null
  }

  function setError(error: unknown) {
    state.value.error = error instanceof Error ? error : new Error(String(error))
  }

  function shouldRefetchAccounts(): boolean {
    if (!state.value.lastFetch.accounts) return true
    const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
    return Date.now() - new Date(state.value.lastFetch.accounts).getTime() > CACHE_DURATION
  }

  // ============ ACCOUNT ACTIONS ============
  async function fetchAccounts(force = false) {
    if (!force && !shouldRefetchAccounts()) {
      DebugUtils.info(MODULE_NAME, 'Using cached accounts data')
      return
    }

    try {
      clearError()
      state.value.loading.accounts = true
      DebugUtils.info(MODULE_NAME, 'Fetching accounts')

      state.value.accounts = await accountService.getAll()
      state.value.lastFetch.accounts = new Date().toISOString()

      DebugUtils.info(MODULE_NAME, 'Accounts fetched successfully', {
        count: state.value.accounts.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch accounts', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.accounts = false
    }
  }

  async function createAccount(
    data: Omit<Account, 'id' | 'lastTransactionDate' | 'createdAt' | 'updatedAt'>
  ) {
    try {
      clearError()
      state.value.loading.accounts = true
      DebugUtils.info(MODULE_NAME, 'Creating account', { data })

      const account = await accountService.create(data)

      // Оптимистическое обновление
      state.value.accounts.push(account)

      DebugUtils.info(MODULE_NAME, 'Account created successfully', { accountId: account.id })
      return account
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create account', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.accounts = false
    }
  }

  async function updateAccount(id: string, data: Partial<Account>) {
    try {
      clearError()
      state.value.loading.accounts = true
      DebugUtils.info(MODULE_NAME, 'Updating account', { id, data })

      await accountService.update(id, data)

      // Оптимистическое обновление
      const index = state.value.accounts.findIndex(acc => acc.id === id)
      if (index !== -1) {
        state.value.accounts[index] = {
          ...state.value.accounts[index],
          ...data,
          updatedAt: new Date().toISOString()
        }
      }

      DebugUtils.info(MODULE_NAME, 'Account updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update account', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.accounts = false
    }
  }

  // ============ TRANSACTION ACTIONS ============
  async function createOperation(data: CreateOperationDto) {
    try {
      clearError()
      state.value.loading.operation = true
      DebugUtils.info(MODULE_NAME, 'Creating operation', { data })

      const transaction = await transactionService.createTransaction(data)

      // Оптимистическое обновление
      state.value.transactions.unshift(transaction)

      // Обновляем баланс в кэше
      const account = state.value.accounts.find(a => a.id === data.accountId)
      if (account) {
        account.balance += data.type === 'income' ? data.amount : -data.amount
      }

      // Фоновое обновление данных
      fetchAccounts(true).catch(console.error)

      DebugUtils.info(MODULE_NAME, 'Operation created successfully')
      return transaction
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create operation', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.operation = false
    }
  }

  async function transferBetweenAccounts(data: CreateTransferDto) {
    try {
      clearError()
      state.value.loading.transfer = true
      DebugUtils.info(MODULE_NAME, 'Creating transfer', { data })

      await transactionService.createTransfer(data)
      await Promise.all([
        fetchAccounts(true),
        state.value.selectedAccountId
          ? fetchTransactions(state.value.selectedAccountId)
          : Promise.resolve()
      ])

      DebugUtils.info(MODULE_NAME, 'Transfer created successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create transfer', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.transfer = false
    }
  }

  async function correctBalance(data: CreateCorrectionDto) {
    try {
      clearError()
      state.value.loading.correction = true
      DebugUtils.info(MODULE_NAME, 'Creating correction', { data })

      await transactionService.createCorrection(data)
      await Promise.all([
        fetchAccounts(true),
        state.value.selectedAccountId
          ? fetchTransactions(state.value.selectedAccountId)
          : Promise.resolve()
      ])

      DebugUtils.info(MODULE_NAME, 'Correction created successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create correction', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.correction = false
    }
  }

  async function fetchTransactions(accountId: string) {
    try {
      clearError()
      state.value.loading.transactions = true
      state.value.selectedAccountId = accountId

      // Очищаем предыдущие транзакции при переходе на новый аккаунт
      state.value.transactions = []

      state.value.transactions = await transactionService.getAccountTransactions(
        accountId,
        state.value.filters
      )
      state.value.lastFetch.transactions[accountId] = new Date().toISOString()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch transactions', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.transactions = false
    }
  }

  function setFilters(filters: TransactionFilters) {
    state.value.filters = filters
    if (state.value.selectedAccountId) {
      fetchTransactions(state.value.selectedAccountId)
    }
  }

  // ============ RETURN ============
  return {
    // State
    state,

    // Getters
    activeAccounts,
    getAccountById,
    getAccountOperations,
    totalBalance,
    isLoading,

    // Helper methods
    clearError,
    setError,

    // Account actions
    fetchAccounts,
    createAccount,
    updateAccount,

    // Transaction actions
    createOperation,
    transferBetweenAccounts,
    correctBalance,
    fetchTransactions,
    setFilters
  }
})
