// src/stores/account/store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { accountService, transactionService, paymentService } from './service'
import { DebugUtils } from '@/utils'
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
  AccountStoreState,
  UpdatePaymentAmountDto,
  AmountChange
} from './types'

const MODULE_NAME = 'AccountStore'

export const useAccountStore = defineStore('account', () => {
  // ============ STATE ============
  const state = ref<AccountStoreState>({
    accounts: [],
    transactions: [],
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
      transactions: {},
      payments: null
    }
  })

  // ============ EXISTING GETTERS ============
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

      DebugUtils.info(MODULE_NAME, 'Payment amount updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment amount', { error })
      setError(error)
      throw error
    }
  }

  async function getPaymentById(paymentId: string) {
    try {
      return await paymentService.getPaymentById(paymentId)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get payment by ID', { error })
      setError(error)
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

  // ============ PAYMENT ACTIONS ============
  async function fetchPayments(force = false) {
    if (!force && !shouldRefetchPayments()) {
      DebugUtils.info(MODULE_NAME, 'Using cached payments data')
      return
    }

    try {
      clearError()
      state.value.loading.payments = true
      DebugUtils.info(MODULE_NAME, 'Fetching payments')

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

  async function createPayment(data: CreatePaymentDto) {
    try {
      clearError()
      state.value.loading.payments = true
      DebugUtils.info(MODULE_NAME, 'Creating payment', { data })

      const payment = await paymentService.createPayment(data)

      // Оптимистическое обновление
      state.value.pendingPayments.unshift(payment)

      // ✅ ДОБАВИТЬ: Уведомляем о изменении статуса заказа
      if (data.purchaseOrderId) {
        await notifyOrderStatusChange(data.purchaseOrderId)
      }

      DebugUtils.info(MODULE_NAME, 'Payment created successfully', { paymentId: payment.id })
      return payment
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create payment', { error })
      setError(error)
      throw error
    } finally {
      state.value.loading.payments = false
    }
  }

  async function processPayment(data: ProcessPaymentDto) {
    try {
      clearError()
      state.value.loading.payments = true
      DebugUtils.info(MODULE_NAME, 'Processing payment', { data })

      await paymentService.processPayment(data)

      // Обновляем данные
      await Promise.all([
        fetchPayments(true),
        fetchAccounts(true),
        state.value.selectedAccountId
          ? fetchTransactions(state.value.selectedAccountId)
          : Promise.resolve()
      ])

      // ✅ ДОБАВИТЬ: Уведомляем о изменении статуса заказа
      if (data.purchaseOrderId) {
        await notifyOrderStatusChange(data.purchaseOrderId)
      }

      DebugUtils.info(MODULE_NAME, 'Payment processed successfully')
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

      // Оптимистическое обновление
      const payment = state.value.pendingPayments.find(p => p.id === paymentId)
      if (payment) {
        payment.assignedToAccount = accountId
        payment.updatedAt = new Date().toISOString()
      }

      DebugUtils.info(MODULE_NAME, 'Payment assigned successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to assign payment', { error })
      setError(error)
      throw error
    }
  }

  // 1. Добавить новый метод getPaymentsByPurchaseOrder:
  async function getPaymentsByPurchaseOrder(purchaseOrderId: string): Promise<PendingPayment[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting payments by purchase order', { purchaseOrderId })

      // Обеспечиваем актуальные данные
      await fetchPayments()

      const payments = state.value.pendingPayments.filter(
        payment => payment.purchaseOrderId === purchaseOrderId
      )

      DebugUtils.info(MODULE_NAME, 'Found payments for purchase order', {
        purchaseOrderId,
        count: payments.length
      })

      return payments
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get payments by purchase order', { error })
      return []
    }
  }

  // 2. Добавить метод для обновления привязки к заказу:
  async function updatePaymentOrderLink(paymentId: string, purchaseOrderId: string | null) {
    try {
      clearError()
      DebugUtils.info(MODULE_NAME, 'Updating payment order link', { paymentId, purchaseOrderId })

      // Находим платеж в state
      const payment = state.value.pendingPayments.find(p => p.id === paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      // Оптимистическое обновление
      payment.purchaseOrderId = purchaseOrderId || undefined
      payment.updatedAt = new Date().toISOString()

      // TODO: Добавить вызов API для обновления на сервере
      // await paymentService.updatePaymentOrderLink(paymentId, purchaseOrderId)

      DebugUtils.info(MODULE_NAME, 'Payment order link updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment order link', { error })
      setError(error)
      throw error
    }
  }

  // 3. Добавить метод для отвязки счета от заказа:
  async function detachPaymentFromOrder(paymentId: string) {
    try {
      await updatePaymentOrderLink(paymentId, null)
      DebugUtils.info(MODULE_NAME, 'Payment detached from order successfully', { paymentId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to detach payment from order', { error })
      throw error
    }
  }

  // 4. Добавить метод для привязки счета к заказу:
  async function attachPaymentToOrder(paymentId: string, purchaseOrderId: string) {
    try {
      await updatePaymentOrderLink(paymentId, purchaseOrderId)
      DebugUtils.info(MODULE_NAME, 'Payment attached to order successfully', {
        paymentId,
        purchaseOrderId
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to attach payment to order', { error })
      throw error
    }
  }

  // 5. Добавить computed для платежей без привязки к заказам:
  const unlinkedPayments = computed(() =>
    state.value.pendingPayments.filter(payment => !payment.purchaseOrderId)
  )

  async function updatePaymentPriority(paymentId: string, priority: PendingPayment['priority']) {
    try {
      clearError()
      DebugUtils.info(MODULE_NAME, 'Updating payment priority', { paymentId, priority })

      await paymentService.updatePaymentPriority(paymentId, priority)

      // Оптимистическое обновление
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

      // Оптимистическое обновление
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

  // ============ RETURN ============
  return {
    // State
    state,

    // Existing getters
    activeAccounts,
    getAccountById,
    getAccountOperations,
    totalBalance,
    isLoading,

    // New payment getters
    pendingPayments,
    filteredPayments,
    urgentPayments,
    overduePayments,
    totalPendingAmount,
    paymentStatistics,
    getPaymentsByAccount,

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
    setFilters,

    // Payment actions
    fetchPayments,
    createPayment,
    processPayment,
    assignPaymentToAccount,
    updatePaymentPriority,
    cancelPayment,
    setPaymentFilters,

    // Other
    updatePaymentAmount,
    getPaymentsByPurchaseOrder,
    getPaymentById,
    // ✅ НОВЫЕ методы для работы с заказами:
    getPaymentsByPurchaseOrder,
    updatePaymentOrderLink,
    detachPaymentFromOrder,
    attachPaymentToOrder,

    // ✅ НОВЫЕ computed:
    unlinkedPayments
  }
})
