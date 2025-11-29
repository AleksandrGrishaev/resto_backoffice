// src/stores/pos/payments/paymentsStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PaymentsService } from './services'
import type { PosPayment, ServiceResponse, PaymentMethod } from '../types'
import { usePosOrdersStore } from '../orders/ordersStore'

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
   * 4. Add shiftId from current shift
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
      // Get current shift from shiftsStore
      const { useShiftsStore } = await import('../shifts/shiftsStore')
      const shiftsStore = useShiftsStore()
      const currentShift = shiftsStore.currentShift

      // ✅ CRITICAL: BLOCK payment if no active shift
      if (!currentShift || currentShift.status !== 'active') {
        return {
          success: false,
          error: 'Cannot process payment: No active shift. Please start a shift first.'
        }
      }

      // ✅ Sprint: Get payment method mapping to find accountId
      const { paymentMethodService } = await import('@/services/payment-method.service')
      const paymentMethodMapping = await paymentMethodService.getByCode(method)

      if (!paymentMethodMapping) {
        return {
          success: false,
          error: `Payment method '${method}' not configured. Please contact administrator.`
        }
      }

      if (!paymentMethodMapping.accountId) {
        return {
          success: false,
          error: `Payment method '${method}' is not mapped to an account. Please contact administrator.`
        }
      }

      const accountId = paymentMethodMapping.accountId

      // 1. Create payment with shiftId
      const paymentData = {
        orderId,
        billIds,
        itemIds,
        method,
        amount,
        receivedAmount,
        processedBy: 'Current User', // TODO: Get from authStore
        shiftId: currentShift.id // ✅ Now guaranteed to exist
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

      // 4. Add transaction to shift with correct accountId
      await shiftsStore.addShiftTransaction(
        orderId,
        payment.id,
        accountId, // ✅ Use accountId from payment method mapping
        amount,
        `Payment ${payment.paymentNumber} - ${method}`
      )

      // ✅ Update payment methods in shift (now guaranteed to work)
      await shiftsStore.updatePaymentMethods(payment.method, amount)

      // 5. 🆕 Record sales transaction (Sprint 2)
      try {
        const { useSalesStore } = await import('@/stores/sales')

        const salesStore = useSalesStore()
        const ordersStore = usePosOrdersStore()

        // Ensure sales store is initialized
        if (!salesStore.initialized) {
          await salesStore.initialize()
        }

        // Get order to access bills and items
        const order = ordersStore.orders.find(o => o.id === orderId)
        if (order && order.bills.length > 0) {
          // Get bill items from paid bills
          const billItems = order.bills
            .filter(bill => billIds.includes(bill.id))
            .flatMap(bill => bill.items.filter(item => itemIds.includes(item.id)))

          // Get bill discount (if any)
          const billDiscountAmount = order.bills
            .filter(bill => billIds.includes(bill.id))
            .reduce((sum, bill) => sum + (bill.discountAmount || 0), 0)

          if (billItems.length > 0) {
            console.log('📊 [paymentsStore] Recording sales transaction:', {
              itemsCount: billItems.length,
              billDiscount: billDiscountAmount
            })

            await salesStore.recordSalesTransaction(payment, billItems, billDiscountAmount)
            console.log('✅ [paymentsStore] Sales transaction recorded successfully')
          }
        }
      } catch (salesErr) {
        // Don't fail the payment if sales recording fails
        console.error('⚠️ [paymentsStore] Failed to record sales transaction:', salesErr)
      }

      console.log('💳 Payment processed:', payment.paymentNumber, {
        shiftId: payment.shiftId,
        accountId,
        amount,
        method
      })

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
      // ✅ CRITICAL: Check for active shift before processing refund
      const { useShiftsStore } = await import('../shifts/shiftsStore')
      const shiftsStore = useShiftsStore()
      const currentShift = shiftsStore.currentShift

      if (!currentShift || currentShift.status !== 'active') {
        return {
          success: false,
          error: 'Cannot process refund: No active shift. Please start a shift first.'
        }
      }

      // Find original payment
      const originalPayment = payments.value.find(p => p.id === originalPaymentId)
      if (!originalPayment) {
        throw new Error('Original payment not found')
      }

      if (originalPayment.status !== 'completed') {
        throw new Error('Can only refund completed payments')
      }

      // Get current user for refundedBy field
      const { useAuthStore } = await import('@/stores/auth')
      const authStore = useAuthStore()
      const refundedBy = authStore.currentUser?.name || 'Unknown'

      // Process refund via service
      const result = await paymentsService.refundPayment(
        originalPaymentId,
        reason,
        amount,
        refundedBy
      )

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

      // Add refund transaction to shift (if shift exists)
      if (refundPayment.shiftId) {
        const { useShiftsStore } = await import('../shifts/shiftsStore')
        const shiftsStore = useShiftsStore()

        await shiftsStore.addShiftTransaction(
          originalPayment.orderId,
          refundPayment.id,
          'account_cash', // TODO: Get accountId from payment method
          refundPayment.amount, // Negative amount
          `Refund ${refundPayment.paymentNumber} - ${refundPayment.method}`
        )
      }

      // Update items: paid → refunded
      await unlinkPaymentFromOrder(
        originalPayment.orderId,
        originalPaymentId,
        originalPayment.itemIds
      )

      console.log('💳 Refund processed:', refundPayment.paymentNumber, {
        shiftId: refundPayment.shiftId,
        amount: refundPayment.amount,
        method: refundPayment.method
      })
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

  /**
   * Create refund (alias for processRefund)
   * More intuitive API for UI components
   */
  async function createRefund(
    paymentId: string,
    reason: string
  ): Promise<ServiceResponse<PosPayment>> {
    return await processRefund(paymentId, reason)
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
    // Use already imported ordersStore
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

        // 🆕 Автоматически закрываем счет при полной оплате
        if (bill.status === 'draft' || bill.status === 'active') {
          bill.status = 'closed'
        }
      } else {
        bill.paymentStatus = 'partial'
      }
    }

    // 🆕 Recalculate order totals and statuses (includes order.paymentStatus)
    await ordersStore.recalculateOrderTotals(orderId)

    console.log('💳 Order payment status updated:', {
      orderId,
      orderPaymentStatus: order.paymentStatus,
      billsPaymentStatus: order.bills.map(b => ({ id: b.id, status: b.paymentStatus }))
    })
  }

  /**
   * Unlink payment from order (for refunds)
   */
  async function unlinkPaymentFromOrder(
    orderId: string,
    paymentId: string,
    itemIds: string[]
  ): Promise<void> {
    // Use already imported ordersStore
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

        // 🆕 Автоматически закрываем счет при полной оплате
        if (bill.status === 'draft' || bill.status === 'active') {
          bill.status = 'closed'
        }
      } else {
        bill.paymentStatus = 'partial'
      }
    }

    // 🆕 Recalculate order totals and statuses (includes order.paymentStatus)
    await ordersStore.recalculateOrderTotals(orderId)

    console.log('💳 Order payment status updated after refund:', {
      orderId,
      orderPaymentStatus: order.paymentStatus,
      billsPaymentStatus: order.bills.map(b => ({ id: b.id, status: b.paymentStatus }))
    })
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
    createRefund,
    printReceipt,

    // Queries (Read - Both POS and Backoffice)
    getOrderPayments,
    getPaymentsByDateRange,
    getPaymentStats,
    getCashierPerformance,
    getShiftPayments
  }
})
