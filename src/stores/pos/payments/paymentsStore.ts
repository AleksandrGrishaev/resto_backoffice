// src/stores/pos/payments/paymentsStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PaymentsService } from './services'
import type { PosPayment, ServiceResponse, PaymentMethod } from '../types'

export const usePosPaymentsStore = defineStore('posPayments', () => {
  // ===== STATE =====
  const payments = ref<PosPayment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // ===== SERVICES =====
  const paymentsService = new PaymentsService()

  // ===== COMPUTED =====
  const todayPayments = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return payments.value.filter(p => p.processedAt.startsWith(today))
  })

  const completedPayments = computed(() => {
    return payments.value.filter(p => p.status === 'completed')
  })

  const totalRevenue = computed(() => {
    return completedPayments.value.reduce((sum, p) => sum + p.amount, 0)
  })

  // ===== INITIALIZATION =====

  /**
   * Initialize payments store
   * Loads all payments from storage
   */
  async function initialize(): Promise<ServiceResponse<void>> {
    if (initialized.value) {
      return { success: true }
    }

    loading.value = true
    error.value = null

    try {
      console.log('💳 [paymentsStore] Initializing...')

      // Load all payments from storage
      const result = await paymentsService.getAllPayments()

      if (result.success && result.data) {
        payments.value = result.data
        console.log(`💳 Loaded ${payments.value.length} payments from storage`)
      } else {
        throw new Error(result.error || 'Failed to load payments')
      }

      initialized.value = true
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize payments'
      error.value = message
      console.error('❌ [paymentsStore] Initialization failed:', message)
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  // ===== ACTIONS (POS Operations) =====

  /**
   * Process payment (POS only)
   * 1. Save payment to storage
   * 2. Link to order/items
   * 3. Update item payment status
   */
  async function processSimplePayment(
    orderId: string,
    billIds: string[],
    itemIds: string[],
    method: PaymentMethod,
    amount: number,
    receivedAmount?: number
  ): Promise<ServiceResponse<PosPayment>> {
    loading.value = true

    try {
      // 1. Create payment
      const paymentData = {
        orderId,
        billIds,
        itemIds,
        method,
        amount,
        receivedAmount,
        processedBy: 'Current User' // TODO: Get from authStore
      }

      const result = await paymentsService.processPayment(paymentData)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Payment processing failed')
      }

      const payment = result.data

      // 2. Add to in-memory store
      payments.value.push(payment)

      // 3. Link payment to order and items
      await linkPaymentToOrder(orderId, payment.id, itemIds)

      console.log('💳 Payment processed:', payment.paymentNumber)
      return { success: true, data: payment }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment processing failed'
      error.value = message
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Process refund (POS only)
   * Customer returns item, cashier issues refund
   */
  async function processRefund(
    originalPaymentId: string,
    reason: string,
    amount?: number
  ): Promise<ServiceResponse<PosPayment>> {
    try {
      // Find original payment
      const originalPayment = payments.value.find(p => p.id === originalPaymentId)
      if (!originalPayment) {
        throw new Error('Original payment not found')
      }

      if (originalPayment.status !== 'completed') {
        throw new Error('Can only refund completed payments')
      }

      // Process refund via service
      const result = await paymentsService.refundPayment(originalPaymentId, reason, amount)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Refund processing failed')
      }

      const refundPayment = result.data

      // Add refund to store
      payments.value.push(refundPayment)

      // Update original payment
      const originalIndex = payments.value.findIndex(p => p.id === originalPaymentId)
      if (originalIndex !== -1) {
        payments.value[originalIndex].status = 'refunded'
      }

      // Update items: paid → refunded
      await unlinkPaymentFromOrder(
        originalPayment.orderId,
        originalPaymentId,
        originalPayment.itemIds
      )

      console.log('💳 Refund processed:', refundPayment.paymentNumber)
      return { success: true, data: refundPayment }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refund failed'
      error.value = message
      return { success: false, error: message }
    }
  }

  /**
   * Print receipt (POS only)
   */
  async function printReceipt(paymentId: string): Promise<ServiceResponse<void>> {
    try {
      const payment = payments.value.find(p => p.id === paymentId)
      if (!payment) {
        throw new Error('Payment not found')
      }

      const result = await paymentsService.printReceipt(payment)

      if (result.success) {
        // Mark as printed
        payment.receiptPrinted = true
        await paymentsService.updatePayment(payment)
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to print receipt'
      return { success: false, error: message }
    }
  }

  // ===== QUERIES (Read Operations - Both POS and Backoffice) =====

  /**
   * Get payments for specific order
   */
  function getOrderPayments(orderId: string): PosPayment[] {
    return payments.value.filter(p => p.orderId === orderId)
  }

  /**
   * Get payments by date range
   */
  function getPaymentsByDateRange(startDate: string, endDate: string): PosPayment[] {
    return payments.value.filter(p => p.processedAt >= startDate && p.processedAt <= endDate)
  }

  /**
   * Get payment statistics
   * Used by backoffice analytics
   */
  function getPaymentStats(dateRange?: { start: string; end: string }) {
    let paymentsToAnalyze = completedPayments.value

    if (dateRange) {
      paymentsToAnalyze = paymentsToAnalyze.filter(
        p => p.processedAt >= dateRange.start && p.processedAt <= dateRange.end
      )
    }

    const byMethod = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      qr: { count: 0, amount: 0 }
    }

    paymentsToAnalyze.forEach(p => {
      byMethod[p.method].count++
      byMethod[p.method].amount += p.amount
    })

    const refunds = payments.value.filter(p => p.status === 'refunded')
    const refundedAmount = refunds.reduce((sum, p) => sum + Math.abs(p.amount), 0)

    return {
      totalRevenue: paymentsToAnalyze.reduce((sum, p) => sum + p.amount, 0),
      totalCount: paymentsToAnalyze.length,
      byMethod,
      refundedCount: refunds.length,
      refundedAmount,
      averageTransaction:
        paymentsToAnalyze.length > 0
          ? paymentsToAnalyze.reduce((sum, p) => sum + p.amount, 0) / paymentsToAnalyze.length
          : 0
    }
  }

  /**
   * Get cashier performance (Backoffice analytics)
   */
  function getCashierPerformance(cashierName: string, dateRange: { start: string; end: string }) {
    const cashierPayments = completedPayments.value.filter(
      p =>
        p.processedBy === cashierName &&
        p.processedAt >= dateRange.start &&
        p.processedAt <= dateRange.end
    )

    return {
      totalTransactions: cashierPayments.length,
      totalAmount: cashierPayments.reduce((sum, p) => sum + p.amount, 0),
      byMethod: {
        cash: cashierPayments.filter(p => p.method === 'cash').length,
        card: cashierPayments.filter(p => p.method === 'card').length,
        qr: cashierPayments.filter(p => p.method === 'qr').length
      }
    }
  }

  /**
   * Get payments for specific shift
   */
  function getShiftPayments(shiftId: string): PosPayment[] {
    return payments.value.filter(p => p.shiftId === shiftId)
  }

  // ===== HELPERS =====

  /**
   * Link payment to order and items
   */
  async function linkPaymentToOrder(
    orderId: string,
    paymentId: string,
    itemIds: string[]
  ): Promise<void> {
    // Import ordersStore dynamically to avoid circular dependency
    const { usePosOrdersStore } = await import('../orders/ordersStore')
    const ordersStore = usePosOrdersStore()

    const order = ordersStore.orders.find(o => o.id === orderId)
    if (!order) return

    // Add payment reference to order
    if (!order.paymentIds) order.paymentIds = []
    order.paymentIds.push(paymentId)

    // Update paidAmount
    order.paidAmount =
      (order.paidAmount || 0) + payments.value.find(p => p.id === paymentId)!.amount

    // Link items to payment and mark as paid
    for (const bill of order.bills) {
      for (const item of bill.items) {
        if (itemIds.includes(item.id)) {
          item.paymentStatus = 'paid'
          if (!item.paidByPaymentIds) item.paidByPaymentIds = []
          item.paidByPaymentIds.push(paymentId)
        }
      }

      // Recalculate bill payment status
      const activeItems = bill.items.filter(i => i.status !== 'cancelled')
      const paidItems = activeItems.filter(i => i.paymentStatus === 'paid')

      if (paidItems.length === 0) {
        bill.paymentStatus = 'unpaid'
      } else if (paidItems.length === activeItems.length) {
        bill.paymentStatus = 'paid'
      } else {
        bill.paymentStatus = 'partial'
      }
    }

    // Save order
    await ordersStore.updateOrder(order)
  }

  /**
   * Unlink payment from order (for refunds)
   */
  async function unlinkPaymentFromOrder(
    orderId: string,
    paymentId: string,
    itemIds: string[]
  ): Promise<void> {
    const { usePosOrdersStore } = await import('../orders/ordersStore')
    const ordersStore = usePosOrdersStore()

    const order = ordersStore.orders.find(o => o.id === orderId)
    if (!order) return

    // Update items: paid → refunded
    for (const bill of order.bills) {
      for (const item of bill.items) {
        if (itemIds.includes(item.id)) {
          item.paymentStatus = 'refunded'
          // Remove payment ID from paidByPaymentIds
          if (item.paidByPaymentIds) {
            item.paidByPaymentIds = item.paidByPaymentIds.filter(id => id !== paymentId)
          }
        }
      }

      // Recalculate bill payment status
      const activeItems = bill.items.filter(i => i.status !== 'cancelled')
      const paidItems = activeItems.filter(i => i.paymentStatus === 'paid')

      if (paidItems.length === 0) {
        bill.paymentStatus = 'unpaid'
      } else if (paidItems.length === activeItems.length) {
        bill.paymentStatus = 'paid'
      } else {
        bill.paymentStatus = 'partial'
      }
    }

    await ordersStore.updateOrder(order)
  }

  return {
    // State
    payments,
    loading,
    error,
    initialized,

    // Computed
    todayPayments,
    completedPayments,
    totalRevenue,

    // Initialization
    initialize,

    // POS Operations (Write)
    processSimplePayment,
    processRefund,
    printReceipt,

    // Queries (Read - Both POS and Backoffice)
    getOrderPayments,
    getPaymentsByDateRange,
    getPaymentStats,
    getCashierPerformance,
    getShiftPayments
  }
})
