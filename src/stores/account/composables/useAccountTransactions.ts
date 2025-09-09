// src/stores/account/composables/useAccountTransactions.ts

// ============ РЕАКТИВНАЯ ВЕРСИЯ ============

import { computed, watch, readonly } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useAccountStore } from '../store'
import { useLazyLoading } from '@/composables/useLazyLoading'
import type { LazyLoadRequest } from '@/composables/useLazyLoading'
import { DebugUtils } from '@/utils'
import type { Transaction, OperationType, ExpenseCategory, Account } from '../types'

const MODULE_NAME = 'useAccountTransactions'

// ============ INTERFACES ============

interface TransactionFilters {
  dateFrom?: string | null
  dateTo?: string | null
  type?: OperationType | null
  accountId?: string | null
  search?: string | null
  category?: ExpenseCategory['type'] | null
}

export interface TransactionWithBalance extends Transaction {
  // Это просто alias - balanceAfter уже включен в Transaction
}

interface DateRange {
  dateFrom: string | null
  dateTo: string | null
}

// ============ MAIN COMPOSABLE ============

// ✅ ИЗМЕНЕНИЕ: Принимаем как Ref<string> | ComputedRef<string> | string
export function useAccountTransactions(
  accountId?: string | Ref<string> | ComputedRef<string>,
  pageSize = 20
) {
  const store = useAccountStore()

  // ✅ НОВОЕ: Создаем реактивную ссылку
  const reactiveAccountId = computed(() => {
    if (typeof accountId === 'string') {
      return accountId
    }
    if (accountId && 'value' in accountId) {
      return accountId.value
    }
    return undefined
  })

  // ============ LAZY LOADING SETUP ============

  const fetchTransactions = async (request: LazyLoadRequest<TransactionFilters>) => {
    const { page, limit, filters } = request

    try {
      DebugUtils.info(MODULE_NAME, 'Fetching transactions', {
        page,
        limit,
        filters,
        reactiveAccountId: reactiveAccountId.value
      })

      // ✅ ИЗМЕНЕНИЕ: Используем реактивный accountId
      const targetAccountId = filters?.accountId || reactiveAccountId.value

      if (targetAccountId) {
        // Устанавливаем фильтры и загружаем
        store.setFilters({
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
          type: filters?.type,
          category: filters?.category
        })

        await store.fetchTransactions(targetAccountId)

        // Получаем отфильтрованные данные напрямую из store
        let transactions = store.getAccountTransactions(targetAccountId)

        // Дополнительная фильтрация по поиску
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase()
          transactions = transactions.filter(
            t =>
              t.description.toLowerCase().includes(searchLower) ||
              t.counteragentName?.toLowerCase().includes(searchLower)
          )
        }

        // Пагинация
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedTransactions = transactions.slice(startIndex, endIndex)

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
        // Для всех транзакций
        await store.fetchAllAccountsTransactions()

        let allTransactions = store.getAllTransactions

        // Применяем фильтры к глобальному списку
        if (filters?.type) {
          allTransactions = allTransactions.filter(t => t.type === filters.type)
        }
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase()
          allTransactions = allTransactions.filter(
            t =>
              t.description.toLowerCase().includes(searchLower) ||
              t.counteragentName?.toLowerCase().includes(searchLower)
          )
        }

        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedTransactions = allTransactions.slice(startIndex, endIndex)

        return {
          data: paginatedTransactions,
          total: allTransactions.length,
          hasMore: endIndex < allTransactions.length,
          meta: {
            page,
            pageSize: limit,
            totalCount: allTransactions.length,
            totalPages: Math.ceil(allTransactions.length / limit)
          }
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch transactions', { error })
      throw error
    }
  }

  // Настраиваем lazy loading
  const lazyLoading = useLazyLoading(fetchTransactions, {
    pageSize,
    autoLoad: true,
    enableFilters: true
  })

  // ✅ НОВОЕ: Отслеживаем изменения accountId и перезагружаем данные
  watch(
    reactiveAccountId,
    async (newAccountId, oldAccountId) => {
      if (newAccountId && newAccountId !== oldAccountId) {
        DebugUtils.info(MODULE_NAME, 'Account changed, refreshing data', {
          from: oldAccountId,
          to: newAccountId
        })

        // Обновляем фильтры с новым accountId и перезагружаем
        await lazyLoading.updateFilters({ accountId: newAccountId })
        await lazyLoading.refresh()
      }
    },
    { immediate: false } // Не выполняем при первой инициализации
  )

  // ============ COMPUTED PROPERTIES ============

  const transactionsWithBalance = computed<TransactionWithBalance[]>(() => {
    return lazyLoading.items.value as TransactionWithBalance[]
  })

  // ✅ ИЗМЕНЕНИЕ: Используем реактивный accountId
  const currentAccount = computed<Account | undefined>(() => {
    const currentAccountId = reactiveAccountId.value
    if (!currentAccountId) return undefined
    return store.getAccountById(currentAccountId)
  })

  const filterStats = computed(() => {
    const transactions = lazyLoading.items.value
    const total = transactions.length

    return {
      total,
      income: transactions.filter(t => t.type === 'income').length,
      expense: transactions.filter(t => t.type === 'expense').length,
      transfer: transactions.filter(t => t.type === 'transfer').length,
      correction: transactions.filter(t => t.type === 'correction').length
    }
  })

  // ============ FILTER METHODS ============

  const setDateRange = (dateFrom: string | null, dateTo: string | null) => {
    lazyLoading.updateFilters({ dateFrom, dateTo })
  }

  const setDateRangeFromObject = (range: DateRange) => {
    setDateRange(range.dateFrom, range.dateTo)
  }

  const setOperationType = (type: OperationType | null) => {
    lazyLoading.updateFilters({ type })
  }

  const setSearch = (search: string | null) => {
    lazyLoading.updateFilters({ search })
  }

  const setAccountId = (accountId: string | null) => {
    lazyLoading.updateFilters({ accountId })
  }

  const setCategory = (category: ExpenseCategory['type'] | null) => {
    lazyLoading.updateFilters({ category })
  }

  const clearFilters = () => {
    lazyLoading.setFilters({} as TransactionFilters)
  }

  // ============ TRANSACTION OPERATIONS ============

  const refreshAfterTransaction = async () => {
    await lazyLoading.refresh()
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

    // Данные
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
    getTransactionsByDateRange,

    // ✅ НОВОЕ: Экспортируем реактивный accountId для дебага
    reactiveAccountId: readonly(reactiveAccountId)
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
export function useTransactionsReadonly(
  accountId?: string | Ref<string> | ComputedRef<string>,
  pageSize = 20
) {
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
