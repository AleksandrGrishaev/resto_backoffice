// src/stores/account/store.ts
import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { accountService, transactionService, paymentService } from './service'
import { categoryService } from './categoryService'
import { DebugUtils, generateId } from '@/utils'
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
  AccountStoreState,
  UpdatePaymentAmountDto,
  AmountChange,
  LinkPaymentToOrderDto,
  TransactionCategory,
  CreateCategoryDto,
  UpdateCategoryDto
} from './types'
import { COGS_CATEGORY_LABELS } from './constants'

const MODULE_NAME = 'AccountStore'

export const useAccountStore = defineStore('account', () => {
  // ============ STATE ============
  const state = ref<AccountStoreState>({
    accounts: [],
    transactionCategories: [],
    accountTransactions: {},
    allTransactionsCache: undefined,
    cacheTimestamp: undefined,
    pendingPayments: [],
    filters: {
      dateFrom: null,
      dateTo: null,
      type: null,
      category: null
    },
    paymentFilters: {
      status: null,
      priority: null
    },
    selectedAccountId: null,
    loading: {
      accounts: false,
      transactions: false,
      operation: false,
      transfer: false,
      correction: false,
      payments: false
    },
    error: null,
    lastFetch: {
      accounts: null,
      categories: null,
      transactions: {},
      payments: null
    }
  })

  // Computed
  const getAccountTransactions = computed(() => (accountId: string) => {
    // ✅ ИСПОЛЬЗУЕМ данные из state (синхронно)
    const transactions = state.value.accountTransactions[accountId] || []

    // Применяем фильтры
    return transactions.filter(t => applyFilters(t, state.value.filters))
  })

  const getAllTransactions = computed(() => {
    // ✅ ИСПОЛЬЗУЕМ кеш из state (синхронно)
    if (state.value.allTransactionsCache) {
      return state.value.allTransactionsCache.filter(t => applyFilters(t, state.value.filters))
    }

    // Если кеша нет, собираем из accountTransactions
    const allTransactions: Transaction[] = []
    Object.values(state.value.accountTransactions).forEach(accTxns => {
      allTransactions.push(...accTxns)
    })

    // Сортируем по дате
    allTransactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    return allTransactions.filter(t => applyFilters(t, state.value.filters))
  })

  // ============ EXISTING GETTERS ============
  const activeAccounts = computed(() => state.value.accounts.filter(account => account.isActive))

  const getAccountById = computed(
    () => (id: string) => state.value.accounts.find(account => account.id === id)
  )

  const totalBalance = computed(() =>
    state.value.accounts.reduce((sum, account) => sum + account.balance, 0)
  )

  const isLoading = computed(() => Object.values(state.value.loading).some(loading => loading))

  // ✅ ПОМОЩНИК для применения фильтров
  function applyFilters(transaction: Transaction, filters: TransactionFilters): boolean {
    if (filters.type && transaction.type !== filters.type) return false

    if (filters.dateFrom && transaction.createdAt < filters.dateFrom) return false

    if (filters.dateTo && transaction.createdAt > filters.dateTo) return false

    if (filters.category && transaction.expenseCategory?.category !== filters.category) return false

    return true
  }

  // ============ CATEGORY GETTERS ============

  /**
   * All expense categories (for dropdowns)
   * Excludes system categories (supplier, sales) - they are used automatically by the system
   */
  const expenseCategories = computed(() =>
    state.value.transactionCategories
      .filter(c => c.type === 'expense' && c.isActive && !c.isSystem)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )

  /**
   * All income categories
   * Excludes system categories (sales) - they are used automatically by the system
   */
  const incomeCategories = computed(() =>
    state.value.transactionCategories
      .filter(c => c.type === 'income' && c.isActive && !c.isSystem)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )

  /**
   * OPEX categories (for P&L report)
   */
  const opexCategories = computed(() =>
    state.value.transactionCategories
      .filter(c => c.isOpex && c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )

  /**
   * Get category by code
   * Returns category from DB or null if not found
   * For COGS categories (product, food_cost, etc.) returns null - use COGS_CATEGORY_LABELS
   */
  const getCategoryByCode = computed(() => (code: string): TransactionCategory | null => {
    return state.value.transactionCategories.find(c => c.code === code) || null
  })

  /**
   * Get category label by code
   * First checks DB categories, then COGS_CATEGORY_LABELS, then returns code as fallback
   */
  const getCategoryLabel = computed(() => (code: string): string => {
    const category = state.value.transactionCategories.find(c => c.code === code)
    if (category) return category.name
    if (COGS_CATEGORY_LABELS[code]) return COGS_CATEGORY_LABELS[code]
    return code
  })

  // ============ NEW PAYMENT GETTERS ============
  const pendingPayments = computed(() =>
    state.value.pendingPayments.filter(payment => payment.status === 'pending')
  )

  const filteredPayments = computed(() => {
    let payments = [...state.value.pendingPayments]

    // Применяем фильтры
    if (state.value.paymentFilters.status) {
      payments = payments.filter(p => p.status === state.value.paymentFilters.status)
    }

    if (state.value.paymentFilters.priority) {
      payments = payments.filter(p => p.priority === state.value.paymentFilters.priority)
    }

    // Сортируем по приоритету и дате
    payments.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff

      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    })

    return payments
  })

  const urgentPayments = computed(() =>
    state.value.pendingPayments.filter(p => p.priority === 'urgent' && p.status === 'pending')
  )

  const overduePayments = computed(() => {
    const now = new Date()
    return state.value.pendingPayments.filter(payment => {
      if (!payment.dueDate || payment.status !== 'pending') return false
      return new Date(payment.dueDate) < now
    })
  })

  const totalPendingAmount = computed(() =>
    pendingPayments.value.reduce((sum, payment) => sum + payment.amount, 0)
  )

  const paymentStatistics = computed(() => ({
    totalPending: pendingPayments.value.length,
    totalAmount: totalPendingAmount.value,
    urgentCount: urgentPayments.value.length,
    overdueCount: overduePayments.value.length
  }))

  const getPaymentsByAccount = computed(
    () => (accountId: string) =>
      state.value.pendingPayments.filter(payment => payment.assignedToAccount === accountId)
  )

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

  function shouldRefetchPayments(): boolean {
    if (!state.value.lastFetch.payments) return true
    const CACHE_DURATION = 2 * 60 * 1000 // 2 minutes для платежей
    return Date.now() - new Date(state.value.lastFetch.payments).getTime() > CACHE_DURATION
  }

  // ============ ACCOUNT ACTIONS ===========

  async function initializeStore() {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing account store')

      // Загружаем аккаунты и категории параллельно
      await Promise.all([fetchAccounts(), fetchCategories()])

      // Загружаем транзакции для активных аккаунтов
      const activeAccs = state.value.accounts.filter(acc => acc.isActive)
      if (activeAccs.length > 0) {
        await fetchAllAccountsTransactions()
      }

      DebugUtils.info(MODULE_NAME, 'Account store initialized successfully', {
        accounts: state.value.accounts.length,
        categories: state.value.transactionCategories.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize store', { error })
      setError(error)
    }
  }

  // ============ CATEGORY ACTIONS ============

  async function fetchCategories(force = false) {
    const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
    if (
      !force &&
      state.value.lastFetch.categories &&
      Date.now() - new Date(state.value.lastFetch.categories).getTime() < CACHE_DURATION
    ) {
      DebugUtils.info(MODULE_NAME, 'Using cached categories data')
      return
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Fetching categories')
      state.value.transactionCategories = await categoryService.getAll()
      state.value.lastFetch.categories = new Date().toISOString()

      DebugUtils.info(MODULE_NAME, 'Categories fetched successfully', {
        count: state.value.transactionCategories.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch categories', { error })
      throw error
    }
  }

  async function createCategory(dto: CreateCategoryDto): Promise<TransactionCategory> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating category', { dto })
      const category = await categoryService.create(dto)
      state.value.transactionCategories.push(category)
      return category
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create category', { error })
      throw error
    }
  }

  async function updateCategory(id: string, dto: UpdateCategoryDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating category', { id, dto })
      await categoryService.update(id, dto)
      await fetchCategories(true) // Refresh cache
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update category', { error })
      throw error
    }
  }

  async function deleteCategory(id: string): Promise<void> {
    try {
      const category = state.value.transactionCategories.find(c => c.id === id)
      if (category?.isSystem) {
        throw new Error('Cannot delete system category')
      }

      DebugUtils.info(MODULE_NAME, 'Deleting category', { id })
      await categoryService.delete(id)
      state.value.transactionCategories = state.value.transactionCategories.filter(c => c.id !== id)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete category', { error })
      throw error
    }
  }

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

  async function updatePaymentAmount(data: UpdatePaymentAmountDto) {
    try {
      clearError()
      DebugUtils.info(MODULE_NAME, 'Updating payment amount', { data })

      await paymentService.updatePaymentAmount(data)

      // Оптимистическое обновление
      const payment = state.value.pendingPayments.find(p => p.id === data.paymentId)
      if (payment) {
        const amountChange: AmountChange = {
          oldAmount: payment.amount,
          newAmount: data.newAmount,
          reason: data.reason,
          timestamp: new Date().toISOString(),
          userId: data.userId,
          notes: data.notes
        }

        payment.amount = data.newAmount
        payment.lastAmountUpdate = new Date().toISOString()
        payment.amountHistory = [...(payment.amountHistory || []), amountChange]
        payment.updatedAt = new Date().toISOString()
      }

      // ❌ УБРАТЬ ВСЮ АВТОМАТИЗАЦИЮ ОТСЮДА - это не подходящая функция

      DebugUtils.info(MODULE_NAME, 'Payment amount updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment amount', { error })
      setError(error)
      throw error
    }
  }

  async function getPaymentById(paymentId: string): Promise<PendingPayment | null> {
    try {
      // ✅ ИСПРАВЛЕНИЕ: Ищем в service (единственный источник истины)
      return await paymentService.getById(paymentId)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get payment by ID', { error })
      return null
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

  async function fetchAllAccountsTransactions() {
    try {
      const activeAccounts = state.value.accounts.filter(acc => acc.isActive)

      // Загружаем транзакции для всех аккаунтов
      await Promise.all(activeAccounts.map(acc => fetchTransactions(acc.id)))

      // Обновляем кеш всех транзакций
      const allTransactions: Transaction[] = []
      Object.values(state.value.accountTransactions).forEach(accTxns => {
        allTransactions.push(...accTxns)
      })

      allTransactions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      state.value.allTransactionsCache = allTransactions
      state.value.cacheTimestamp = new Date().toISOString()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch all transactions', { error })
      throw error
    }
  }

  async function createOperation(data: CreateOperationDto) {
    try {
      clearError()
      state.value.loading.operation = true

      if (data.type === 'expense' && !data.expenseCategory) {
        throw new Error('Expense category is required for expense operations')
      }

      const transaction = await transactionService.createTransaction(data)

      // ✅ НЕ добавляем в state - будет загружено при следующем fetchTransactions
      // Только обновляем баланс аккаунта для немедленного отображения
      const account = state.value.accounts.find(a => a.id === data.accountId)
      if (account) {
        account.balance = transaction.balanceAfter
        account.lastTransactionDate = transaction.createdAt
      }

      // ✅ Принудительно перезагружаем транзакции аккаунта
      await fetchTransactions(data.accountId)

      // Инвалидируем общий кеш
      state.value.allTransactionsCache = undefined
      state.value.cacheTimestamp = undefined

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

      const [fromTx, toTx] = await transactionService.createTransfer(data)

      // ❌ УБРАТЬ ЭТИ СТРОКИ - транзакции уже добавлены в service:
      // if (!state.value.accountTransactions[data.fromAccountId]) {
      //   state.value.accountTransactions[data.fromAccountId] = []
      // }
      // if (!state.value.accountTransactions[data.toAccountId]) {
      //   state.value.accountTransactions[data.toAccountId] = []
      // }
      // state.value.accountTransactions[data.fromAccountId].unshift(fromTx)
      // state.value.accountTransactions[data.toAccountId].unshift(toTx)

      // ✅ ОСТАВИТЬ ТОЛЬКО обновление балансов аккаунтов в кеше
      const fromAccount = state.value.accounts.find(a => a.id === data.fromAccountId)
      const toAccount = state.value.accounts.find(a => a.id === data.toAccountId)

      if (fromAccount) {
        fromAccount.balance = fromTx.balanceAfter
        fromAccount.lastTransactionDate = fromTx.createdAt
      }
      if (toAccount) {
        toAccount.balance = toTx.balanceAfter
        toAccount.lastTransactionDate = toTx.createdAt
      }

      // Инвалидируем кеш
      state.value.allTransactionsCache = undefined
      state.value.cacheTimestamp = undefined
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

      // ✅ ДОСТАТОЧНО только обновить аккаунты - транзакция уже добавлена в service
      await fetchAccounts(true)

      // Инвалидируем кеш транзакций
      state.value.allTransactionsCache = undefined
      state.value.cacheTimestamp = undefined

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

      // ✅ Загружаем транзакции из service
      const transactions = await transactionService.getAccountTransactions(accountId)

      // ✅ Сохраняем в state для computed
      state.value.accountTransactions[accountId] = transactions
      state.value.lastFetch.transactions[accountId] = new Date().toISOString()

      DebugUtils.info(MODULE_NAME, 'Transactions fetched successfully', {
        accountId,
        count: transactions.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch transactions', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.transactions = false
    }
  }

  // ✅ НОВЫЙ метод для принудительного обновления всех транзакций
  async function refreshAllTransactions(): Promise<void> {
    try {
      clearError()
      state.value.loading.transactions = true

      // ✅ ИСПРАВИТЬ: Обновляем кеш, а не несуществующее поле
      state.value.allTransactionsCache = await transactionService.getAllTransactions()
      state.value.cacheTimestamp = new Date().toISOString()

      DebugUtils.info(MODULE_NAME, 'All transactions refreshed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh all transactions', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.transactions = false
    }
  }

  function shouldRefetchTransactions(): boolean {
    // Логика определения необходимости обновления
    // Пока просто обновляем всегда для простоты
    return true
  }

  function setFilters(filters: TransactionFilters) {
    state.value.filters = filters
    if (state.value.selectedAccountId) {
      fetchTransactions(state.value.selectedAccountId)
    }
  }

  // ============ PAYMENT ACTIONS ============
  async function fetchPayments(force = false) {
    if (!force && !shouldRefetchPayments()) {
      DebugUtils.info(MODULE_NAME, 'Using cached payments data')
      return
    }

    try {
      clearError()
      state.value.loading.payments = true
      DebugUtils.info(MODULE_NAME, 'Fetching payments from service')

      // ✅ ИСПРАВЛЕНИЕ: Получаем данные из service (единственный источник истины)
      state.value.pendingPayments = await paymentService.getPaymentsByFilters(
        state.value.paymentFilters
      )
      state.value.lastFetch.payments = new Date().toISOString()

      DebugUtils.info(MODULE_NAME, 'Payments fetched successfully', {
        count: state.value.pendingPayments.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch payments', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.payments = false
    }
  }

  // ✅ ПОЛНОСТЬЮ ЗАМЕНИТЬ метод createPayment
  async function createPayment(data: CreatePaymentDto): Promise<PendingPayment> {
    try {
      clearError()
      state.value.loading.payments = true
      DebugUtils.info(MODULE_NAME, 'Creating payment via service', {
        amount: data.amount,
        counteragentId: data.counteragentId,
        hasLinkedOrders: !!data.linkedOrders?.length
      })

      // ✅ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Создаем через service (как в Supplier)
      const payment = await paymentService.createPayment(data)

      // ✅ Обновляем кеш в store
      state.value.pendingPayments.push(payment)

      DebugUtils.info(MODULE_NAME, 'Payment created successfully', {
        paymentId: payment.id,
        linkedOrdersCount: payment.linkedOrders?.length || 0
      })

      return payment
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create payment', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.payments = false
    }
  }

  /**
   * ✅ Sprint 8: Process payment and return transaction ID
   * ⚠️ FIX: Update payment status to 'completed' after processing
   */
  async function processPayment(data: ProcessPaymentDto): Promise<string> {
    try {
      clearError()
      state.value.loading.payments = true
      DebugUtils.info(MODULE_NAME, 'Processing payment', { data })

      // ✅ FIX: Get payment before processing to check status
      const payment = state.value.pendingPayments.find(p => p.id === data.paymentId)
      if (!payment) {
        throw new Error(`Payment not found: ${data.paymentId}`)
      }

      const transactionId = await paymentService.processPayment(data)

      // ✅ FIX: If actualAmount differs from payment.amount, update payment amount
      // This handles cases where payment was created with order amount but paid with different amount
      if (data.actualAmount !== undefined && data.actualAmount !== payment.amount) {
        DebugUtils.info(MODULE_NAME, 'Payment amount differs from actual payment, updating', {
          paymentId: data.paymentId,
          originalAmount: payment.amount,
          actualAmount: data.actualAmount
        })

        await paymentService.updatePaymentAmount({
          paymentId: data.paymentId,
          newAmount: data.actualAmount,
          reason: 'receipt_discrepancy', // Корректировка после приемки
          userId: undefined,
          notes: `Actual payment amount ${data.actualAmount} differs from bill amount ${payment.amount}`
        })
      }

      // ✅ FIX: Update payment status to 'completed' in service BEFORE fetching
      await paymentService.update(data.paymentId, {
        status: 'completed',
        paidAmount: data.actualAmount !== undefined ? data.actualAmount : payment.amount,
        paidDate: new Date().toISOString()
      })

      DebugUtils.info(MODULE_NAME, 'Payment status updated to completed', {
        paymentId: data.paymentId
      })

      // ✅ FIX: Update usedAmount to match linkedOrders for completed payment
      // This prevents completed payments from being counted as "free prepayment"
      if (payment.linkedOrders && payment.linkedOrders.length > 0) {
        const totalLinkedAmount = payment.linkedOrders
          .filter(o => o.isActive)
          .reduce((sum, o) => sum + o.linkedAmount, 0)

        if (totalLinkedAmount > 0) {
          await paymentService.updatePaymentUsedAmount(data.paymentId, totalLinkedAmount)
          DebugUtils.info(MODULE_NAME, 'Payment usedAmount set on completion', {
            paymentId: data.paymentId,
            usedAmount: totalLinkedAmount
          })
        }
      }

      // Обновляем локальное состояние
      await Promise.all([
        fetchPayments(true),
        state.value.selectedAccountId
          ? fetchTransactions(state.value.selectedAccountId)
          : Promise.resolve()
      ])

      // ✅ ДОБАВИТЬ АВТОМАТИЗАЦИЮ СЮДА:
      try {
        // Получаем обновленный платеж
        const updatedPayment = state.value.pendingPayments.find(p => p.id === data.paymentId)

        if (updatedPayment && updatedPayment.status === 'completed') {
          const { AutomatedPayments } = await import(
            '@/stores/counteragents/integrations/automatedPayments'
          )

          AutomatedPayments.onPaymentStatusChanged(updatedPayment, 'pending').catch(error => {
            console.warn('Payment processing automation failed:', error)
          })
        }
      } catch (error) {
        console.warn('Failed to trigger payment processing automation:', error)
      }

      DebugUtils.info(MODULE_NAME, 'Payment processed successfully', { transactionId })
      return transactionId
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to process payment', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.payments = false
    }
  }

  async function assignPaymentToAccount(paymentId: string, accountId: string) {
    try {
      clearError()
      DebugUtils.info(MODULE_NAME, 'Assigning payment to account', { paymentId, accountId })

      await paymentService.assignToAccount(paymentId, accountId)

      // ✅ ИСПРАВЛЕНИЕ: Синхронизируем кеш с service
      const payment = state.value.pendingPayments.find(p => p.id === paymentId)
      if (payment) {
        payment.assignedToAccount = accountId
        payment.updatedAt = new Date().toISOString()

        // ✅ Sprint 3 FIX: Check by account type instead of hardcoded ID
        // Проверяем по типу счёта, а не по ID (более надёжно для разных окружений)
        const targetAccount = state.value.accounts.find(a => a.id === accountId)
        const isCashAccount = targetAccount?.type === 'cash'

        if (isCashAccount) {
          payment.requiresCashierConfirmation = true
          payment.confirmationStatus = 'pending'
          // Сохранить обновленный платеж через метод update базового сервиса
          await paymentService.update(payment.id, {
            requiresCashierConfirmation: true,
            confirmationStatus: 'pending'
          })
          DebugUtils.info(MODULE_NAME, 'Payment requires cashier confirmation (cash account)', {
            paymentId,
            accountId,
            accountType: targetAccount?.type,
            accountName: targetAccount?.name
          })
        }
      }

      DebugUtils.info(MODULE_NAME, 'Payment assigned successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to assign payment', { error })
      setError(error)
      throw error
    }
  }

  async function updatePaymentPriority(paymentId: string, priority: PendingPayment['priority']) {
    try {
      clearError()
      DebugUtils.info(MODULE_NAME, 'Updating payment priority', { paymentId, priority })

      await paymentService.updatePaymentPriority(paymentId, priority)

      // ✅ ИСПРАВЛЕНИЕ: Синхронизируем кеш с service
      const payment = state.value.pendingPayments.find(p => p.id === paymentId)
      if (payment) {
        payment.priority = priority
        payment.updatedAt = new Date().toISOString()
      }

      DebugUtils.info(MODULE_NAME, 'Payment priority updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment priority', { error })
      setError(error)
      throw error
    }
  }

  // ✅ НОВЫЙ МЕТОД: Обновление usedAmount для completed платежей
  async function updatePaymentUsedAmount(paymentId: string, usedAmount: number): Promise<void> {
    try {
      clearError()
      DebugUtils.info(MODULE_NAME, 'Updating payment usedAmount', { paymentId, usedAmount })

      // Обновляем в service
      await paymentService.updatePaymentUsedAmount(paymentId, usedAmount)

      // Оптимистическое обновление в state
      const payment = state.value.pendingPayments.find(p => p.id === paymentId)
      if (payment) {
        payment.usedAmount = usedAmount
        payment.updatedAt = new Date().toISOString()
      }

      DebugUtils.info(MODULE_NAME, 'Payment usedAmount updated successfully', {
        paymentId,
        usedAmount
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment usedAmount', { error })
      setError(error)
      throw error
    }
  }

  /**
   * Уведомить supplier store об изменении статуса заказа
   */
  async function notifyOrderStatusChange(orderId: string): Promise<void> {
    const { usePurchaseOrders } = await import('@/stores/supplier_2/composables/usePurchaseOrders')
    const { updateOrderBillStatus } = usePurchaseOrders()
    await updateOrderBillStatus(orderId)
  }

  async function cancelPayment(paymentId: string) {
    try {
      clearError()
      DebugUtils.info(MODULE_NAME, 'Cancelling payment', { paymentId })

      await paymentService.cancelPayment(paymentId)

      // ✅ ИСПРАВЛЕНИЕ: Синхронизируем кеш с service
      const payment = state.value.pendingPayments.find(p => p.id === paymentId)
      if (payment) {
        payment.status = 'cancelled'
        payment.updatedAt = new Date().toISOString()
      }

      DebugUtils.info(MODULE_NAME, 'Payment cancelled successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to cancel payment', { error })
      setError(error)
      throw error
    }
  }

  function setPaymentFilters(filters: PaymentFilters) {
    state.value.paymentFilters = filters
    fetchPayments(true)
  }

  /**
   * ✅ SPRINT 5: Get expense transactions by date range
   * Returns all expense transactions (negative amount) for P&L report
   */
  async function getExpensesByDateRange(dateFrom: string, dateTo: string): Promise<Transaction[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching expenses by date range', { dateFrom, dateTo })

      // Get all transactions from cache or fetch
      const allTransactions = getAllTransactions.value

      // Filter by date range and expense transactions (negative amount)
      const expenses = allTransactions.filter(t => {
        const transactionDate = t.createdAt.split('T')[0] // Extract date part
        const isInRange = transactionDate >= dateFrom && transactionDate <= dateTo
        const isExpense = t.amount < 0 // Expenses are negative

        return isInRange && isExpense
      })

      DebugUtils.info(MODULE_NAME, 'Expenses filtered', {
        total: expenses.length,
        totalAmount: expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      })

      return expenses
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get expenses by date range', { error })
      return []
    }
  }

  /**
   * ✅ SPRINT 3: Get all transactions (expenses and income) by date range
   * Returns all transactions (both positive and negative amounts) for inventory adjustments
   */
  async function getTransactionsByDateRange(
    dateFrom: string,
    dateTo: string
  ): Promise<Transaction[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching all transactions by date range', { dateFrom, dateTo })

      // ✅ FIX: Refresh cache if empty to ensure we have latest data from DB
      if (!state.value.allTransactionsCache || state.value.allTransactionsCache.length === 0) {
        DebugUtils.info(MODULE_NAME, 'Cache empty, refreshing transactions from DB')
        await refreshAllTransactions()
      }

      // Get all transactions from cache
      const allTransactions = getAllTransactions.value

      // Filter by date range only (include both income and expenses)
      const transactions = allTransactions.filter(t => {
        const transactionDate = t.createdAt.split('T')[0] // Extract date part
        return transactionDate >= dateFrom && transactionDate <= dateTo
      })

      DebugUtils.info(MODULE_NAME, 'Transactions filtered', {
        total: transactions.length,
        expenseCount: transactions.filter(t => t.type === 'expense').length,
        incomeCount: transactions.filter(t => t.type === 'income').length,
        categories: [...new Set(transactions.map(t => t.expenseCategory?.category).filter(Boolean))]
      })

      return transactions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get transactions by date range', { error })
      return []
    }
  }

  // Payment link
  // ✅ НОВЫЙ метод: привязка платежа к заказу с указанием суммы

  async function linkPaymentToOrder(data: LinkPaymentToOrderDto): Promise<void> {
    try {
      clearError()
      DebugUtils.info(MODULE_NAME, 'Linking payment to order', data)

      const payment = state.value.pendingPayments.find(p => p.id === data.paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      // ✅ ИСПРАВЛЕНИЕ: Безопасная проверка linkedOrders
      const linkedAmount =
        payment.linkedOrders?.filter(o => o.isActive).reduce((sum, o) => sum + o.linkedAmount, 0) ||
        0

      const availableAmount =
        payment.status === 'completed'
          ? payment.amount - (payment.usedAmount || 0)
          : payment.amount - linkedAmount

      if (availableAmount < data.linkAmount) {
        throw new Error(
          `Insufficient available amount. Available: ${availableAmount}, Requested: ${data.linkAmount}`
        )
      }

      // ✅ ИСПРАВЛЕНИЕ: Инициализируем массив если undefined
      if (!payment.linkedOrders) {
        payment.linkedOrders = []
      }

      // ✅ ИСПРАВЛЕНИЕ: Проверяем существование массива перед поиском
      const existingLink = payment.linkedOrders.find(o => o.orderId === data.orderId && o.isActive)
      if (existingLink) {
        throw new Error('Order already linked to this payment')
      }

      // Добавляем привязку (теперь массив точно существует)
      payment.linkedOrders.push({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        linkedAmount: data.linkAmount,
        linkedAt: new Date().toISOString(),
        isActive: true
      })

      payment.updatedAt = new Date().toISOString()

      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем linkedOrders в базу данных
      await paymentService.update(payment.id, {
        linkedOrders: payment.linkedOrders,
        updatedAt: payment.updatedAt
      })

      DebugUtils.info(MODULE_NAME, 'Payment linkedOrders saved to database', {
        paymentId: payment.id,
        linkedOrdersCount: payment.linkedOrders.length
      })

      // ✅ НОВОЕ: Обновляем usedAmount для completed платежей
      if (payment.status === 'completed') {
        // Вычисляем общую сумму всех активных привязок после добавления новой
        const totalLinkedAmount = payment.linkedOrders
          .filter(o => o.isActive)
          .reduce((sum, o) => sum + o.linkedAmount, 0)

        // Обновляем usedAmount
        await updatePaymentUsedAmount(payment.id, totalLinkedAmount)

        DebugUtils.info(MODULE_NAME, 'Updated usedAmount for completed payment', {
          paymentId: payment.id,
          oldUsedAmount: payment.usedAmount,
          newUsedAmount: totalLinkedAmount,
          availableAmount: payment.amount - totalLinkedAmount
        })
      }

      DebugUtils.info(MODULE_NAME, 'Payment linked to order successfully', {
        paymentId: data.paymentId,
        orderId: data.orderId,
        linkedAmount: data.linkAmount,
        paymentStatus: payment.status
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to link payment to order', { error })
      setError(error)
      throw error
    }
  }
  // ✅ НОВЫЙ метод: отвязка платежа от заказа

  async function unlinkPaymentFromOrder(paymentId: string, orderId: string): Promise<void> {
    try {
      clearError()
      DebugUtils.info(MODULE_NAME, 'Unlinking payment from order', { paymentId, orderId })

      const payment = state.value.pendingPayments.find(p => p.id === paymentId)
      if (!payment) {
        DebugUtils.warn(MODULE_NAME, 'Payment not found', { paymentId })
        return
      }

      // ✅ ИСПРАВЛЕНИЕ: Проверяем существование linkedOrders
      if (!payment.linkedOrders || payment.linkedOrders.length === 0) {
        DebugUtils.warn(MODULE_NAME, 'No linked orders found for payment', { paymentId })
        return
      }

      const linkIndex = payment.linkedOrders.findIndex(o => o.orderId === orderId && o.isActive)
      if (linkIndex === -1) {
        DebugUtils.warn(MODULE_NAME, 'Active link not found', { paymentId, orderId })
        return
      }

      const link = payment.linkedOrders[linkIndex]
      const unlinkedAmount = link.linkedAmount

      // Деактивируем привязку (сохраняем для истории)
      link.isActive = false
      link.unlinkedAt = new Date().toISOString()

      payment.updatedAt = new Date().toISOString()

      // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем linkedOrders в базу данных
      await paymentService.update(payment.id, {
        linkedOrders: payment.linkedOrders,
        updatedAt: payment.updatedAt
      })

      DebugUtils.info(MODULE_NAME, 'Payment linkedOrders saved to database after unlink', {
        paymentId: payment.id,
        linkedOrdersCount: payment.linkedOrders.filter(o => o.isActive).length
      })

      // ✅ НОВОЕ: Обновляем usedAmount для completed платежей после отвязки
      if (payment.status === 'completed') {
        // Пересчитываем usedAmount после отвязки (исключаем отвязанный заказ)
        const remainingLinkedAmount = payment.linkedOrders
          .filter(o => o.isActive)
          .reduce((sum, o) => sum + o.linkedAmount, 0)

        // Обновляем usedAmount
        await updatePaymentUsedAmount(payment.id, remainingLinkedAmount)

        DebugUtils.info(MODULE_NAME, 'Updated usedAmount after unlinking', {
          paymentId,
          orderId,
          unlinkedAmount,
          oldUsedAmount: payment.usedAmount,
          newUsedAmount: remainingLinkedAmount,
          availableAmount: payment.amount - remainingLinkedAmount
        })
      }

      DebugUtils.info(MODULE_NAME, 'Payment unlinked from order successfully', {
        paymentId,
        orderId,
        unlinkedAmount,
        paymentStatus: payment.status
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to unlink payment from order', { error })
      setError(error)
      throw error
    }
  }

  // ✅ НОВЫЙ метод: получение платежей по заказу
  async function getPaymentsByOrder(orderId: string): Promise<PendingPayment[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting payments by order', { orderId })

      // Обеспечиваем актуальные данные
      await fetchPayments()

      const payments = state.value.pendingPayments.filter(payment => {
        // Check sourceOrderId (primary link)
        if (payment.sourceOrderId === orderId) return true
        // Check linkedOrders array
        if (payment.linkedOrders?.some(o => o.orderId === orderId && o.isActive)) return true
        return false
      })

      DebugUtils.info(MODULE_NAME, 'Found payments for order', {
        orderId,
        count: payments.length
      })

      return payments
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get payments by order', { error })
      return []
    }
  }

  async function getPaymentsByCounteragent(counteragentId: string): Promise<PendingPayment[]> {
    try {
      await fetchPayments()
      return state.value.pendingPayments.filter(
        payment => payment.counteragentId === counteragentId
      )
    } catch (error) {
      console.error('Failed to get payments by counteragent:', error)
      return []
    }
  }

  /**
   * Get total paid amount for an order
   * Considers linkedAmount from completed payments only
   * Used for calculating unpaid balance in receipts
   */
  async function getTotalPaidForOrder(orderId: string): Promise<number> {
    try {
      const payments = await getPaymentsByOrder(orderId)

      const totalPaid = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => {
          // Get linked amount for this specific order
          const link = p.linkedOrders?.find(o => o.orderId === orderId && o.isActive)
          return sum + (link?.linkedAmount || p.usedAmount || 0)
        }, 0)

      DebugUtils.info(MODULE_NAME, 'Calculated total paid for order', {
        orderId,
        totalPaid,
        paymentsCount: payments.filter(p => p.status === 'completed').length
      })

      return totalPaid
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get total paid for order', { error })
      return 0
    }
  }

  // ============ SPRINT 3: POS CASHIER CONFIRMATION ============

  /**
   * Получить платежи, ожидающие подтверждения кассиром
   * @param shiftId - ID смены (опционально, для фильтрации по смене)
   * @param accountId - ID счета (опционально, обычно счет "касса")
   */
  async function getPendingPaymentsForConfirmation(
    shiftId?: string,
    accountId?: string
  ): Promise<PendingPayment[]> {
    try {
      await fetchPayments()

      let payments = state.value.pendingPayments.filter(
        payment =>
          payment.requiresCashierConfirmation === true && payment.confirmationStatus === 'pending'
      )

      // Фильтр по счету (если указан)
      if (accountId) {
        payments = payments.filter(payment => payment.assignedToAccount === accountId)
      }

      // Фильтр по смене (если указан)
      if (shiftId) {
        payments = payments.filter(payment => payment.assignedShiftId === shiftId)
      }

      DebugUtils.info(MODULE_NAME, 'Found payments for confirmation', {
        total: payments.length,
        shiftId,
        accountId
      })

      return payments
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get pending payments for confirmation', { error })
      return []
    }
  }

  /**
   * Подтвердить платеж кассиром
   * @param paymentId - ID платежа
   * @param performer - Кто подтверждает (кассир)
   * @param actualAmount - Фактическая сумма (если отличается от запланированной)
   */
  /**
   * ✅ Sprint 8: Confirm payment and return transaction ID
   */
  async function confirmPayment(
    paymentId: string,
    performer: TransactionPerformer,
    actualAmount?: number
  ): Promise<string> {
    try {
      clearError()
      state.value.loading.payments = true

      const payment = state.value.pendingPayments.find(p => p.id === paymentId)
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`)
      }

      if (!payment.requiresCashierConfirmation) {
        throw new Error('Payment does not require cashier confirmation')
      }

      if (payment.confirmationStatus !== 'pending') {
        throw new Error(`Payment already ${payment.confirmationStatus}`)
      }

      DebugUtils.info(MODULE_NAME, 'Confirming payment', {
        paymentId,
        performer: performer.name,
        actualAmount
      })

      const confirmedAt = new Date().toISOString()

      // ✅ ВАЖНО: Сначала обновляем статус подтверждения в service
      await paymentService.update(payment.id, {
        confirmationStatus: 'confirmed',
        confirmedBy: performer,
        confirmedAt
      })

      // Обновляем локальный кеш
      payment.confirmationStatus = 'confirmed'
      payment.confirmedBy = performer
      payment.confirmedAt = confirmedAt

      // Обрабатываем платеж (создаем транзакцию)
      // Теперь processPayment увидит confirmationStatus='confirmed' и создаст транзакцию

      // ✅ ENHANCEMENT: Get current shift info for description
      let shiftInfo = ''
      try {
        const { useShiftsStore } = await import('@/stores/pos/shifts')
        const shiftsStore = useShiftsStore()
        if (shiftsStore.currentShift) {
          shiftInfo = ` | Shift: ${shiftsStore.currentShift.shiftNumber}`
        }
      } catch (error) {
        // Shifts store not available (backoffice mode) - skip shift info
      }

      const processData: ProcessPaymentDto = {
        paymentId,
        accountId: payment.assignedToAccount!,
        actualAmount,
        notes: `Confirmed by cashier: ${performer.name}${shiftInfo}`,
        performedBy: performer
      }

      const transactionId = await processPayment(processData)

      DebugUtils.info(MODULE_NAME, 'Payment confirmed successfully', { paymentId, transactionId })
      return transactionId
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to confirm payment', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.payments = false
    }
  }

  /**
   * Отклонить платеж кассиром
   * @param paymentId - ID платежа
   * @param performer - Кто отклоняет (кассир)
   * @param reason - Причина отклонения
   */
  async function rejectPayment(
    paymentId: string,
    performer: TransactionPerformer,
    reason: string
  ): Promise<void> {
    try {
      clearError()
      state.value.loading.payments = true

      const payment = state.value.pendingPayments.find(p => p.id === paymentId)
      if (!payment) {
        throw new Error(`Payment not found: ${paymentId}`)
      }

      if (!payment.requiresCashierConfirmation) {
        throw new Error('Payment does not require cashier confirmation')
      }

      if (payment.confirmationStatus !== 'pending') {
        throw new Error(`Payment already ${payment.confirmationStatus}`)
      }

      DebugUtils.info(MODULE_NAME, 'Rejecting payment', {
        paymentId,
        performer: performer.name,
        reason
      })

      // Обновляем статус
      payment.confirmationStatus = 'rejected'
      payment.confirmedBy = performer
      payment.confirmedAt = new Date().toISOString()
      payment.rejectionReason = reason

      // Сохраняем обновленный платеж через метод update базового сервиса
      await paymentService.update(payment.id, {
        confirmationStatus: 'rejected',
        confirmedBy: performer,
        confirmedAt: payment.confirmedAt,
        rejectionReason: reason
      })

      DebugUtils.info(MODULE_NAME, 'Payment rejected successfully', { paymentId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to reject payment', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.payments = false
    }
  }

  // ============ RETURN ============
  return {
    // State
    state: readonly(state),

    // Getters
    accounts: computed(() => state.value.accounts),
    getAccountById,

    // Existing getters
    activeAccounts,
    totalBalance,
    isLoading,

    // Category getters
    transactionCategories: computed(() => state.value.transactionCategories),
    expenseCategories,
    incomeCategories,
    opexCategories,
    getCategoryByCode,
    getCategoryLabel,

    // Payment getters
    pendingPayments,
    filteredPayments,
    urgentPayments,
    overduePayments,
    totalPendingAmount,
    paymentStatistics,
    getPaymentsByAccount,
    getAccountTransactions,
    getAllTransactions,
    getPaymentsByCounteragent,
    getTotalPaidForOrder,

    // Helper methods
    clearError,
    setError,

    // Account actions
    fetchAccounts,
    createAccount,
    updateAccount,

    // Category actions
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,

    // Transaction actions
    createOperation,
    transferBetweenAccounts,
    correctBalance,
    fetchTransactions,
    setFilters,
    fetchAllAccountsTransactions,

    // Payment actions
    fetchPayments,
    createPayment,
    processPayment,
    assignPaymentToAccount,
    updatePaymentPriority,
    cancelPayment,
    setPaymentFilters,
    getExpensesByDateRange, // ✅ SPRINT 5
    getTransactionsByDateRange, // ✅ SPRINT 3
    linkPaymentToOrder,
    unlinkPaymentFromOrder,
    getPaymentsByOrder,

    // Sprint 3: POS Cashier Confirmation
    getPendingPaymentsForConfirmation,
    confirmPayment,
    rejectPayment,

    // Other
    updatePaymentAmount,
    getPaymentById,
    refreshAllTransactions,
    applyFilters,
    updatePaymentUsedAmount,

    // init
    initializeStore
  }
})
