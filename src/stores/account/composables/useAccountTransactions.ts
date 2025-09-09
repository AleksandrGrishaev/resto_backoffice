// src/stores/account/composables/useAccountTransactions.ts - ПРАВИЛЬНОЕ ИСПРАВЛЕНИЕ
import { computed, ref, watch } from 'vue'
import { useLazyLoading } from '@/composables/useLazyLoading'
import { useAccountStore } from '../store'
import type { Transaction, OperationType, ExpenseCategory } from '../types'
import type { LazyLoadRequest, LazyLoadResponse } from '@/composables/useLazyLoading'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AccountTransactions'

// ============ TYPES ============

export interface TransactionFilters {
  dateFrom?: string | null
  dateTo?: string | null
  type?: OperationType | null
  accountId?: string | null
  search?: string | null
  category?: ExpenseCategory['type'] | null
}

export interface TransactionWithBalance extends Transaction {
  balanceAfter: number
}

export interface DateRange {
  dateFrom: string | null
  dateTo: string | null
}

// ============ MAIN COMPOSABLE ============

export function useAccountTransactions(accountId?: string, pageSize = 20) {
  const store = useAccountStore()

  // ============ LAZY LOADING SETUP ============

  const fetchTransactions = async (
    request: LazyLoadRequest<TransactionFilters>
  ): Promise<LazyLoadResponse<Transaction>> => {
    const { page, limit, filters } = request

    try {
      DebugUtils.info(MODULE_NAME, 'Fetching transactions', { page, limit, filters })

      const targetAccountId = filters?.accountId || accountId

      if (targetAccountId) {
        // ✅ ИСПРАВЛЕНИЕ: Применяем фильтры через store
        store.setFilters({
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
          type: filters?.type,
          category: filters?.category
        })

        // Загружаем транзакции для конкретного аккаунта
        await store.fetchTransactions(targetAccountId)

        // Получаем отфильтрованные транзакции из store
        let transactions = store.accountTransactions

        // ✅ ИСПРАВЛЕНИЕ: Дополнительная фильтрация по поиску локально
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase()
          transactions = transactions.filter(
            t =>
              t.description.toLowerCase().includes(searchLower) ||
              t.counteragentName?.toLowerCase().includes(searchLower)
          )
        }

        // ✅ ИСПРАВЛЕНИЕ: Store уже сортирует, но убеждаемся
        transactions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        // ✅ ИСПРАВЛЕНИЕ: Правильная пагинация
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedTransactions = transactions.slice(startIndex, endIndex)

        DebugUtils.info(MODULE_NAME, 'Transactions fetched successfully', {
          total: transactions.length,
          page,
          returned: paginatedTransactions.length,
          hasMore: endIndex < transactions.length
        })

        return {
          data: paginatedTransactions,
          total: transactions.length,
          hasMore: endIndex < transactions.length,
          meta: {
            page,
            pageSize: limit,
            totalCount: transactions.length,
            totalPages: Math.ceil(transactions.length / limit)
          }
        }
      } else {
        // Для случая всех транзакций - если нужно
        await store.refreshAllTransactions?.()
        const allTransactions = store.state.transactions

        // Применяем фильтры локально
        let filteredTransactions = allTransactions

        if (filters?.type) {
          filteredTransactions = filteredTransactions.filter(t => t.type === filters.type)
        }

        if (filters?.dateFrom) {
          filteredTransactions = filteredTransactions.filter(t => t.createdAt >= filters.dateFrom!)
        }

        if (filters?.dateTo) {
          filteredTransactions = filteredTransactions.filter(t => t.createdAt <= filters.dateTo!)
        }

        if (filters?.search) {
          const searchLower = filters.search.toLowerCase()
          filteredTransactions = filteredTransactions.filter(
            t =>
              t.description.toLowerCase().includes(searchLower) ||
              t.counteragentName?.toLowerCase().includes(searchLower)
          )
        }

        // Сортируем по дате (новые первые)
        filteredTransactions.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )

        // Пагинация
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

        return {
          data: paginatedTransactions,
          total: filteredTransactions.length,
          hasMore: endIndex < filteredTransactions.length,
          meta: {
            page,
            pageSize: limit,
            totalCount: filteredTransactions.length,
            totalPages: Math.ceil(filteredTransactions.length / limit)
          }
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch transactions', { error })
      throw error
    }
  }

  // Инициализируем lazy loading
  const lazyLoading = useLazyLoading<Transaction, TransactionFilters>(fetchTransactions, {
    pageSize,
    autoLoad: true,
    enableFilters: true,
    debounceMs: 300
  })

  // Устанавливаем начальные фильтры
  if (accountId) {
    lazyLoading.updateFilters({ accountId })
  }

  // ============ COMPUTED PROPERTIES ============

  // Транзакции с расчетом баланса
  const transactionsWithBalance = computed<TransactionWithBalance[]>(() => {
    if (!accountId) return lazyLoading.items.value as TransactionWithBalance[]

    const account = store.getAccountById(accountId)
    if (!account) return []

    const transactions = lazyLoading.items.value
    if (transactions.length === 0) return []

    // ✅ ИСПРАВЛЕНИЕ: Правильный расчет баланса
    let runningBalance = account.balance

    // Берем транзакции, которые УЖЕ отсортированы по дате (новые первые)
    const sortedTransactions = [...transactions]

    // Рассчитываем балансы назад от текущего баланса аккаунта
    return sortedTransactions.map((transaction, index) => {
      const balanceAfter = runningBalance

      // Применяем транзакцию назад во времени для следующей итерации
      if (transaction.type === 'income') {
        runningBalance -= transaction.amount
      } else if (transaction.type === 'expense') {
        runningBalance += transaction.amount
      } else if (transaction.type === 'transfer') {
        runningBalance -= transaction.amount
      } else if (transaction.type === 'correction') {
        runningBalance -= transaction.amount
      }

      return {
        ...transaction,
        balanceAfter
      }
    })
  })

  // Текущий аккаунт
  const currentAccount = computed(() => (accountId ? store.getAccountById(accountId) : null))

  // Статистика по фильтрам
  const filterStats = computed(() => {
    const transactions = lazyLoading.items.value

    return {
      totalCount: transactions.length,
      incomeCount: transactions.filter(t => t.type === 'income').length,
      expenseCount: transactions.filter(t => t.type === 'expense').length,
      transferCount: transactions.filter(t => t.type === 'transfer').length,
      correctionCount: transactions.filter(t => t.type === 'correction').length,
      totalIncome: transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      totalExpense: transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    }
  })

  // ============ FILTER METHODS ============

  const setDateRange = (dateFrom: string | null, dateTo: string | null) => {
    lazyLoading.updateFilters({ dateFrom, dateTo })
  }

  const setOperationType = (type: OperationType | null) => {
    lazyLoading.updateFilters({ type })
  }

  const setSearch = (search: string | null) => {
    lazyLoading.updateFilters({ search })
  }

  const setAccountId = (newAccountId: string | null) => {
    lazyLoading.updateFilters({ accountId: newAccountId })
  }

  const setCategory = (category: ExpenseCategory['type'] | null) => {
    lazyLoading.updateFilters({ category })
  }

  const setDateRangeFromObject = (range: DateRange) => {
    setDateRange(range.dateFrom, range.dateTo)
  }

  const clearFilters = () => {
    lazyLoading.setFilters({
      accountId: accountId || null,
      dateFrom: null,
      dateTo: null,
      type: null,
      search: null,
      category: null
    })
  }

  // ============ TRANSACTION OPERATIONS ============

  const refreshAfterTransaction = async () => {
    try {
      // Обновляем аккаунты для получения нового баланса
      await store.fetchAccounts()
      // Обновляем список транзакций
      await lazyLoading.refresh()

      DebugUtils.info(MODULE_NAME, 'Data refreshed after transaction')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh after transaction', { error })
      throw error
    }
  }

  // ============ UTILITY METHODS ============

  const getTransactionById = (id: string) => {
    return lazyLoading.items.value.find(t => t.id === id)
  }

  const getTransactionsByType = (type: OperationType) => {
    return lazyLoading.items.value.filter(t => t.type === type)
  }

  const getTransactionsByDateRange = (dateFrom: string, dateTo: string) => {
    return lazyLoading.items.value.filter(t => t.createdAt >= dateFrom && t.createdAt <= dateTo)
  }

  // ============ RETURN ============

  return {
    // Lazy loading properties
    ...lazyLoading,

    // Enhanced data
    transactionsWithBalance,
    currentAccount,
    filterStats,

    // Filter methods
    setDateRange,
    setDateRangeFromObject,
    setOperationType,
    setSearch,
    setAccountId,
    setCategory,
    clearFilters,

    // Transaction operations
    refreshAfterTransaction,

    // Utility methods
    getTransactionById,
    getTransactionsByType,
    getTransactionsByDateRange
  }
}

// ============ SPECIALIZED HOOKS ============

/**
 * Hook для работы со всеми транзакциями (без привязки к аккаунту)
 */
export function useAllTransactions(pageSize = 50) {
  return useAccountTransactions(undefined, pageSize)
}

/**
 * Hook только для чтения транзакций (без операций)
 */
export function useTransactionsReadonly(accountId?: string, pageSize = 20) {
  const {
    state,
    items,
    filters,
    meta,
    isInitialLoading,
    isLoadingMore,
    isEmpty,
    hasData,
    loadMore,
    refresh,
    transactionsWithBalance,
    currentAccount,
    filterStats,
    setDateRange,
    setOperationType,
    setSearch,
    clearFilters
  } = useAccountTransactions(accountId, pageSize)

  return {
    // Read-only state
    state,
    transactions: items,
    filters,
    meta,
    isInitialLoading,
    isLoadingMore,
    isEmpty,
    hasData,
    transactionsWithBalance,
    currentAccount,
    filterStats,

    // Read-only operations
    loadMore,
    refresh,

    // Filters (read-only context)
    setDateRange,
    setOperationType,
    setSearch,
    clearFilters
  }
}

// ============ EXPORT TYPES ============

export type { TransactionFilters, TransactionWithBalance, DateRange }
