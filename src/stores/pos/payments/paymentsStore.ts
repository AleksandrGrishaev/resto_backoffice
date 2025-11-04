// src/stores/pos/payments/paymentsStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PosPayment,
  PaymentFilters,
  ServiceResponse,
  PaymentMethod,
  PaymentStatus,
  PaymentSplit,
  PosBill
} from '../types'
import { PaymentsService } from './services'
import { usePaymentsComposables } from './composables'
import { usePosOrdersStore } from '../orders/ordersStore'
import { useAccountStore } from '@/stores/account'

export const usePosPaymentsStore = defineStore('posPayments', () => {
  // ===== STATE =====
  const payments = ref<PosPayment[]>([])
  const loading = ref({
    list: false,
    process: false,
    refund: false
  })
  const error = ref<string | null>(null)
  const filters = ref<PaymentFilters>({})

  // Payment processing state
  const processingPayment = ref<{
    orderId: string
    billIds: string[]
    amount: number
    splits: PaymentSplit[]
  } | null>(null)

  // ===== SERVICES =====
  const paymentsService = new PaymentsService()
  const ordersStore = usePosOrdersStore()
  const accountStore = useAccountStore()

  // ===== COMPUTED =====
  const todayPayments = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return payments.value.filter(payment => payment.createdAt.startsWith(today))
  })

  const filteredPayments = computed(() => {
    let result = [...payments.value]

    if (filters.value.method) {
      result = result.filter(payment => payment.method === filters.value.method)
    }

    if (filters.value.status) {
      result = result.filter(payment => payment.status === filters.value.status)
    }

    if (filters.value.dateFrom) {
      result = result.filter(payment => payment.createdAt >= filters.value.dateFrom!)
    }

    if (filters.value.dateTo) {
      result = result.filter(payment => payment.createdAt <= filters.value.dateTo!)
    }

    if (filters.value.amountFrom) {
      result = result.filter(payment => payment.amount >= filters.value.amountFrom!)
    }

    if (filters.value.amountTo) {
      result = result.filter(payment => payment.amount <= filters.value.amountTo!)
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  const paymentsStats = computed(() => {
    const todayPaymentsFiltered = todayPayments.value.filter(p => p.status === 'completed')

    const stats = {
      todayTotal: todayPaymentsFiltered.reduce((sum, payment) => sum + payment.amount, 0),
      todayCount: todayPaymentsFiltered.length,
      byMethod: {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        qr: { count: 0, amount: 0 },
        mixed: { count: 0, amount: 0 }
      },
      averageTransaction: 0
    }

    todayPaymentsFiltered.forEach(payment => {
      stats.byMethod[payment.method].count += 1
      stats.byMethod[payment.method].amount += payment.amount
    })

    stats.averageTransaction = stats.todayCount > 0 ? stats.todayTotal / stats.todayCount : 0

    return stats
  })

  // ===== ACTIONS =====

  /**
   * Загрузить все платежи
   */
  async function loadPayments(): Promise<ServiceResponse<PosPayment[]>> {
    loading.value.list = true
    error.value = null

    try {
      const response = await paymentsService.getAllPayments()

      if (response.success && response.data) {
        payments.value = response.data
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load payments'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.list = false
    }
  }

  /**
   * Начать процесс оплаты
   */
  function startPaymentProcess(orderId: string, billIds: string[], amount: number): void {
    processingPayment.value = {
      orderId,
      billIds,
      amount,
      splits: []
    }
  }

  /**
   * Добавить способ оплаты к текущему платежу
   */
  function addPaymentSplit(method: PaymentMethod, amount: number): void {
    if (!processingPayment.value) return

    processingPayment.value.splits.push({ method, amount })
  }

  /**
   * Удалить способ оплаты из текущего платежа
   */
  function removePaymentSplit(index: number): void {
    if (!processingPayment.value) return

    processingPayment.value.splits.splice(index, 1)
  }

  /**
   * Очистить процесс оплаты
   */
  function clearPaymentProcess(): void {
    processingPayment.value = null
  }

  /**
   * Обработать простую оплату (один способ)
   */
  async function processSimplePayment(
    orderId: string,
    billIds: string[],
    method: PaymentMethod,
    amount: number,
    receivedAmount?: number,
    itemIds?: string[] // НОВОЕ: опциональный список оплачиваемых items
  ): Promise<ServiceResponse<PosPayment>> {
    loading.value.process = true
    error.value = null

    try {
      const paymentData = {
        orderId,
        billIds,
        method,
        amount,
        receivedAmount,
        processedBy: 'Current User' // TODO: Получать из authStore
      }

      const response = await paymentsService.processPayment(paymentData)

      if (response.success && response.data) {
        payments.value.push(response.data)

        // Обновить статус оплаты позиций и пересчитать статус счетов
        await updateItemsAndBillsPaymentStatus(orderId, billIds, itemIds)

        // Записать в финансы
        await recordFinancialTransaction(response.data)

        // Если все счета заказа оплачены, закрыть заказ
        await checkAndCloseOrder(orderId)
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process payment'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.process = false
    }
  }

  /**
   * Обработать составную оплату (несколько способов)
   */
  async function processMultiplePayment(
    orderId: string,
    billIds: string[],
    splits: PaymentSplit[]
  ): Promise<ServiceResponse<PosPayment[]>> {
    loading.value.process = true
    error.value = null

    try {
      const responses: PosPayment[] = []

      // Обрабатываем каждый способ оплаты отдельно
      for (const split of splits) {
        const paymentData = {
          orderId,
          billIds,
          method: split.method,
          amount: split.amount,
          processedBy: 'Current User' // TODO: Получать из authStore
        }

        const response = await paymentsService.processPayment(paymentData)

        if (response.success && response.data) {
          payments.value.push(response.data)
          responses.push(response.data)

          // Записать в финансы
          await recordFinancialTransaction(response.data)
        } else {
          throw new Error(response.error || 'Payment processing failed')
        }
      }

      // Обновить статус оплаты счетов
      await updateBillsPaymentStatus(billIds, 'paid')

      // Если все счета заказа оплачены, закрыть заказ
      await checkAndCloseOrder(orderId)

      return {
        success: true,
        data: responses
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process multiple payment'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.process = false
    }
  }

  /**
   * Возврат платежа
   */
  async function refundPayment(
    paymentId: string,
    reason: string,
    amount?: number
  ): Promise<ServiceResponse<PosPayment>> {
    loading.value.refund = true
    error.value = null

    try {
      const response = await paymentsService.refundPayment(paymentId, reason, amount)

      if (response.success && response.data) {
        const paymentIndex = payments.value.findIndex(p => p.id === paymentId)
        if (paymentIndex !== -1) {
          payments.value[paymentIndex] = response.data
        }

        // Записать возврат в финансы
        await recordRefundTransaction(response.data, amount || response.data.amount)
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refund payment'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.refund = false
    }
  }

  /**
   * Печать чека
   */
  async function printReceipt(paymentId: string): Promise<ServiceResponse<void>> {
    try {
      const payment = payments.value.find(p => p.id === paymentId)
      if (!payment) {
        return { success: false, error: 'Payment not found' }
      }

      const response = await paymentsService.printReceipt(payment)

      if (response.success) {
        // Обновить статус печати чека
        const paymentIndex = payments.value.findIndex(p => p.id === paymentId)
        if (paymentIndex !== -1) {
          payments.value[paymentIndex].receiptPrinted = true
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to print receipt'
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Обновить статус оплаты позиций и пересчитать статус счетов
   */
  async function updateItemsAndBillsPaymentStatus(
    orderId: string,
    billIds: string[],
    itemIds?: string[]
  ): Promise<void> {
    const order = ordersStore.orders.find(o => o.id === orderId)
    if (!order) return

    console.log('💳 [paymentsStore] Updating payment status:', {
      orderId,
      billIds,
      itemIds: itemIds || 'all items'
    })

    const paidItemIds: string[] = []

    // Обновить paymentStatus для оплаченных items
    for (const bill of order.bills) {
      if (!billIds.includes(bill.id)) continue

      for (const item of bill.items) {
        // Если указаны конкретные items - помечаем только их
        // Если itemIds не указаны - помечаем все items в этих bills
        if (!itemIds || itemIds.includes(item.id)) {
          if (item.paymentStatus !== 'paid' && item.status !== 'cancelled') {
            item.paymentStatus = 'paid'
            paidItemIds.push(item.id)
            console.log('💳 Item marked as paid:', item.id)
          }
        }
      }

      // Пересчитать статус счета на основе статусов всех items
      const billPaymentStatus = calculateBillPaymentStatus(bill)
      bill.paymentStatus = billPaymentStatus

      console.log('💳 Bill status updated:', {
        billId: bill.id,
        paymentStatus: billPaymentStatus,
        totalItems: bill.items.length,
        paidItems: bill.items.filter(i => i.paymentStatus === 'paid').length
      })
    }

    // Автоматически снять выделение с оплаченных позиций
    if (paidItemIds.length > 0) {
      console.log('🔍 [paymentsStore] Auto-deselecting paid items:', paidItemIds)
      paidItemIds.forEach(itemId => {
        ordersStore.deselectItem(itemId)
      })
    }

    // Пересчитать заказ (автоматически обновит статус стола)
    await ordersStore.recalculateOrderTotals(orderId)
  }

  /**
   * Вычислить статус оплаты счета на основе статусов позиций
   */
  function calculateBillPaymentStatus(bill: PosBill): 'unpaid' | 'partial' | 'paid' {
    const activeItems = bill.items.filter(item => item.status !== 'cancelled')

    if (activeItems.length === 0) return 'unpaid'

    const paidItems = activeItems.filter(item => item.paymentStatus === 'paid')

    if (paidItems.length === 0) return 'unpaid'
    if (paidItems.length === activeItems.length) return 'paid'
    return 'partial'
  }

  /**
   * Обновить статус оплаты счетов (LEGACY - используется в multiple payment)
   */
  async function updateBillsPaymentStatus(
    billIds: string[],
    paymentStatus: 'unpaid' | 'partial' | 'paid'
  ): Promise<void> {
    // Обновить статус оплаты счетов и пересчитать заказ
    const updatedOrderIds = new Set<string>()

    for (const billId of billIds) {
      // Найти заказ с этим счетом и обновить его
      const order = ordersStore.orders.find(o => o.bills.some(b => b.id === billId))

      if (order) {
        const bill = order.bills.find(b => b.id === billId)
        if (bill) {
          bill.paymentStatus = paymentStatus
          updatedOrderIds.add(order.id)
        }
      }
    }

    // Пересчитать все затронутые заказы (автоматически обновит статус стола)
    for (const orderId of updatedOrderIds) {
      await ordersStore.recalculateOrderTotals(orderId)
    }
  }

  /**
   * Записать финансовую транзакцию
   */
  async function recordFinancialTransaction(payment: PosPayment): Promise<void> {
    try {
      // TODO: Интеграция с accountStore для записи транзакции
      // Пока просто логируем
      console.log('Recording financial transaction:', {
        amount: payment.amount,
        method: payment.method,
        paymentId: payment.id
      })

      // В будущем здесь будет:
      // await accountStore.createTransaction({
      //   type: 'income',
      //   amount: payment.amount,
      //   source: 'pos_payment',
      //   reference: payment.id,
      //   method: payment.method
      // })
    } catch (err) {
      console.error('Failed to record financial transaction:', err)
    }
  }

  /**
   * Записать возврат в финансы
   */
  async function recordRefundTransaction(payment: PosPayment, refundAmount: number): Promise<void> {
    try {
      // TODO: Интеграция с accountStore для записи возврата
      console.log('Recording refund transaction:', {
        amount: refundAmount,
        method: payment.method,
        originalPaymentId: payment.id
      })
    } catch (err) {
      console.error('Failed to record refund transaction:', err)
    }
  }

  /**
   * Проверить и закрыть заказ если все счета оплачены
   */
  async function checkAndCloseOrder(orderId: string): Promise<void> {
    const order = ordersStore.orders.find(o => o.id === orderId)
    if (!order) return

    // Проверить все ли счета оплачены
    const allBillsPaid = order.bills.every(
      bill => bill.paymentStatus === 'paid' || bill.status === 'cancelled'
    )

    if (allBillsPaid) {
      await ordersStore.closeOrder(orderId)
    }
  }

  /**
   * Установить фильтры
   */
  function setFilters(newFilters: Partial<PaymentFilters>): void {
    filters.value = { ...filters.value, ...newFilters }
  }

  /**
   * Очистить фильтры
   */
  function clearFilters(): void {
    filters.value = {}
  }

  /**
   * Очистить ошибки
   */
  function clearError(): void {
    error.value = null
  }

  // ===== COMPOSABLES =====
  const {
    canProcessPayment,
    canRefundPayment,
    calculateChange,
    formatPaymentAmount,
    getPaymentMethodIcon,
    getPaymentMethodName,
    getPaymentStatusColor
  } = usePaymentsComposables()

  return {
    // State
    payments,
    loading,
    error,
    filters,
    processingPayment,

    // Computed
    todayPayments,
    filteredPayments,
    paymentsStats,

    // Actions
    loadPayments,
    startPaymentProcess,
    addPaymentSplit,
    removePaymentSplit,
    clearPaymentProcess,
    processSimplePayment,
    processMultiplePayment,
    refundPayment,
    printReceipt,
    setFilters,
    clearFilters,
    clearError,

    // Composables
    canProcessPayment,
    canRefundPayment,
    calculateChange,
    formatPaymentAmount,
    getPaymentMethodIcon,
    getPaymentMethodName,
    getPaymentStatusColor
  }
})
