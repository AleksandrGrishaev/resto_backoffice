// src/stores/pos/payments/paymentsStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { PaymentsService } from './services'
import type { PosPayment, ServiceResponse, PaymentMethod } from '../types'
import { usePosOrdersStore } from '../orders/ordersStore'
import { usePosTablesStore } from '../tables/tablesStore'
import { useAlertsStore } from '@/stores/alerts'
import { formatIDR } from '@/utils'

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
   * Loads payments for active shift (if exists) or today's payments
   */
  async function initialize(): Promise<ServiceResponse<void>> {
    if (initialized.value) {
      return { success: true }
    }

    loading.value = true
    error.value = null

    try {
      console.log('💳 [paymentsStore] Initializing...')

      // ✅ Check if there's an active shift
      const { useShiftsStore } = await import('../shifts/shiftsStore')
      const shiftsStore = useShiftsStore()
      const currentShift = shiftsStore.currentShift

      let result: ServiceResponse<PosPayment[]>

      if (currentShift) {
        // Load payments for active shift
        console.log('💳 Loading payments for active shift:', currentShift.shiftNumber)
        result = await paymentsService.getAllPayments({ shiftId: currentShift.id })
      } else {
        // Load today's payments (fallback when no active shift)
        console.log("💳 Loading today's payments (no active shift)")
        result = await paymentsService.getAllPayments()
      }

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
   * Process payment (POS only) - OPTIMISTIC UI VERSION
   *
   * **Optimizations:**
   * - Critical operations (payment save, order update) run synchronously
   * - Heavy operations (sales transaction, decomposition, write-off) run in background
   * - Returns immediately after critical operations complete (~500ms instead of 6s)
   *
   * **Flow:**
   * 1. Validate shift and payment method
   * 2. Save payment + update order/shift (CRITICAL - fast)
   * 3. Queue background tasks (sales recording, write-offs) (BACKGROUND - slow)
   * 4. Return success immediately
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
      // ===== VALIDATION (Pre-flight checks) =====

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
      const { paymentMethodService } = await import('@/stores/catalog/payment-methods.service')
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

      // ===== CRITICAL OPERATIONS (Fast, synchronous) =====

      // Get order for tax calculations (✅ SPRINT 8)
      const ordersStore = usePosOrdersStore()
      const order = ordersStore.orders.find(o => o.id === orderId)

      // ✅ PRE-CHECK: Verify items are not already paid (prevent double payment)
      if (order) {
        const alreadyPaidItems = order.bills
          .flatMap(b => b.items)
          .filter(item => itemIds.includes(item.id) && item.paymentStatus === 'paid')

        if (alreadyPaidItems.length > 0) {
          console.error('❌ [paymentsStore] Attempted to pay already paid items:', {
            orderId,
            alreadyPaidItemIds: alreadyPaidItems.map(i => i.id),
            alreadyPaidItemNames: alreadyPaidItems.map(i => i.menuItemName)
          })
          return {
            success: false,
            error: `Some items are already paid: ${alreadyPaidItems.map(i => i.menuItemName).join(', ')}`
          }
        }
      }

      // 1. Create payment with shiftId
      const paymentData = {
        orderId,
        billIds,
        itemIds,
        method,
        amount,
        receivedAmount,
        processedBy: 'Current User', // TODO: Get from authStore
        shiftId: currentShift.id, // ✅ Now guaranteed to exist
        order // ✅ SPRINT 8: Pass order for tax calculations
      }

      const result = await paymentsService.processPayment(paymentData)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Payment processing failed')
      }

      const payment = result.data

      // 2. Add to in-memory store
      payments.value.push(payment)

      // ===== CRITICAL SECTION WITH ROLLBACK =====
      // If any step fails after payment creation, we MUST delete the payment
      try {
        // 3. Link payment to order and items (updates UI immediately)
        await linkPaymentToOrder(orderId, payment.id, itemIds)

        // 4. Add transaction to shift with correct accountId
        await shiftsStore.addShiftTransaction(
          orderId,
          payment.id,
          accountId,
          amount,
          `Payment ${payment.paymentNumber} - ${method}`
        )

        // 5. Update payment methods in shift (for shift totals)
        await shiftsStore.updatePaymentMethods(payment.method, amount)
      } catch (linkError) {
        // ❌ ROLLBACK: Delete payment from DB and memory if linking fails
        console.error('❌ [paymentsStore] Error after payment creation, rolling back:', linkError)

        // Remove from memory
        const paymentIndex = payments.value.findIndex(p => p.id === payment.id)
        if (paymentIndex !== -1) {
          payments.value.splice(paymentIndex, 1)
        }

        // Delete from database
        try {
          await paymentsService.deletePayment(payment.id)
          console.log('🔄 [paymentsStore] Payment rolled back successfully:', payment.paymentNumber)
        } catch (deleteError) {
          console.error('❌ [paymentsStore] Failed to rollback payment:', deleteError)
          // Log for manual cleanup
          console.error('⚠️ ORPHANED PAYMENT:', {
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            amount: payment.amount,
            orderId
          })
        }

        throw linkError // Re-throw to return error to caller
      }

      console.log('💳 Payment processed (critical operations):', payment.paymentNumber, {
        shiftId: payment.shiftId,
        accountId,
        amount,
        method
      })

      // ===== BACKGROUND OPERATIONS (Heavy, asynchronous) =====
      // Run in background without blocking UI

      // 🔄 Queue background task for sales recording + write-offs
      queueBackgroundSalesRecording(payment, orderId, billIds, itemIds).catch(err => {
        console.error('⚠️ [paymentsStore] Background sales recording failed:', err)
      })

      // ✅ Return immediately after critical operations
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
   * Background task: Record sales transaction + decomposition + write-offs
   * Runs asynchronously without blocking the payment confirmation
   */
  async function queueBackgroundSalesRecording(
    payment: PosPayment,
    orderId: string,
    billIds: string[],
    itemIds: string[]
  ): Promise<void> {
    try {
      console.log('🔄 [paymentsStore] Starting background sales recording...')

      // ✅ CRITICAL: Verify auth session before background operations
      // Background operations may lose JWT token context, causing RLS policy failures
      const { ensureAuthSession } = await import('@/supabase')
      const hasAuth = await ensureAuthSession()

      if (!hasAuth) {
        console.error(
          '❌ [paymentsStore] No auth session in background operation - discount events may fail to save'
        )
        console.error(
          '⚠️ [paymentsStore] This is a known issue with background operations losing JWT context'
        )
        // Continue anyway - payment was already processed successfully
        // Discount events will fail but won't block the payment
      } else {
        console.log('✅ [paymentsStore] Auth session verified for background operations')
      }

      const { useSalesStore } = await import('@/stores/sales')
      const salesStore = useSalesStore()
      const ordersStore = usePosOrdersStore()

      // ✅ OPTIMIZATION: Don't require full history initialization for recording
      // recordSalesTransaction only WRITES data, doesn't need to READ all history
      // This saves ~9MB per payment (was loading 2783 records every time)
      // The store will be initialized lazily when someone actually needs to READ history

      // Get order to access bills and items
      const order = ordersStore.orders.find(o => o.id === orderId)
      if (!order || order.bills.length === 0) {
        console.warn('⚠️ [paymentsStore] Order not found or has no bills')
        return
      }

      // Get paid bills
      const paidBills = order.bills.filter(bill => billIds.includes(bill.id))

      // Get bill items from paid bills
      const billItems = paidBills.flatMap(bill =>
        bill.items.filter(item => itemIds.includes(item.id))
      )

      // Get bill discount information from order bills (stored in bill.discountAmount)
      // This discount will be allocated proportionally in useProfitCalculation
      const billDiscountAmount = paidBills.reduce(
        (sum, bill) => sum + (bill.discountAmount || 0),
        0
      )

      // Get bill discount metadata (for discount_events creation)
      const billDiscountInfo = paidBills
        .filter(bill => bill.discountAmount && bill.discountAmount > 0)
        .map(bill => ({
          billId: bill.id,
          billNumber: bill.billNumber,
          amount: bill.discountAmount || 0,
          reason: bill.discountReason || 'other'
        }))

      console.log('💰 [paymentsStore] Bill discount for payment:', {
        billIds,
        billDiscountAmount,
        billDiscountInfo,
        itemsCount: billItems.length,
        note: 'Bill discount will be allocated proportionally in profit calculation'
      })

      if (billItems.length === 0) {
        console.warn('⚠️ [paymentsStore] No bill items found for recording')
        return
      }

      console.log('📊 [paymentsStore] Recording sales transaction:', {
        itemsCount: billItems.length,
        billDiscount: billDiscountAmount,
        billDiscountInfo
      })

      // 🔄 This triggers the heavy operations:
      // - Decomposition (2 times in logs)
      // - FIFO allocation
      // - Write-off creation
      // - Batch updates
      // - Discount event creation (for bill discounts)
      await salesStore.recordSalesTransaction(
        payment,
        billItems,
        billDiscountAmount,
        billDiscountInfo
      )

      console.log('✅ [paymentsStore] Background sales recording completed successfully')
    } catch (salesErr) {
      // Don't fail silently - log the error for debugging
      console.error('❌ [paymentsStore] Background sales recording failed:', salesErr)
      throw salesErr
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

        // ✅ FIX: Update payment methods in shift for refund (negative amount)
        // Without this, shift.paymentMethods becomes stale after refunds
        await shiftsStore.updatePaymentMethods(refundPayment.method, refundPayment.amount)
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

      // Create alert for refund
      try {
        const alertsStore = useAlertsStore()
        await alertsStore.createAlert({
          category: 'shift',
          type: 'large_refund', // Using existing type for all refunds
          severity: 'warning',
          title: 'Payment refunded',
          description: `${formatIDR(Math.abs(refundPayment.amount))} via ${refundPayment.method}. Reason: ${reason}`,
          metadata: {
            paymentNumber: refundPayment.paymentNumber,
            originalPaymentId,
            refundAmount: Math.abs(refundPayment.amount),
            method: refundPayment.method,
            reason,
            refundedBy
          },
          shiftId: refundPayment.shiftId,
          orderId: originalPayment.orderId,
          userId: authStore.currentUser?.id
        })
        console.log('🚨 Refund alert created')
      } catch (alertError) {
        // Don't fail refund if alert creation fails
        console.error('Failed to create refund alert:', alertError)
      }

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
    // ✅ BUG FIX: Safe payment lookup instead of ! assertion
    const payment = payments.value.find(p => p.id === paymentId)
    if (!payment) {
      console.error(
        `❌ [paymentsStore] Payment ${paymentId} not found in store during linkPaymentToOrder`
      )
      return
    }
    order.paidAmount = (order.paidAmount || 0) + payment.amount

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

    // Recalculate order totals and statuses (includes order.paymentStatus)
    // skipItemUpsert: only update order-level fields, don't re-upsert all items
    // This prevents unnecessary realtime events that cause kitchen display issues
    await ordersStore.recalculateOrderTotals(orderId, { skipItemUpsert: true })

    // Targeted update: only payment fields on affected items
    const paidItems: Array<{ id: string; paymentStatus: string; paidByPaymentIds: string[] }> = []
    for (const bill of order.bills) {
      for (const item of bill.items) {
        if (itemIds.includes(item.id)) {
          paidItems.push({
            id: item.id,
            paymentStatus: item.paymentStatus,
            paidByPaymentIds: item.paidByPaymentIds || []
          })
        }
      }
    }
    await ordersStore.updateItemsPaymentStatus(paidItems)

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

        // 🆕 Переоткрыть bill после refund для добавления новых позиций
        if (bill.status === 'closed') {
          bill.status = 'open'
          console.log('📋 Bill reopened after refund:', { billId: bill.id })
        }
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

    // CRITICAL: Save order status BEFORE recalculation
    // Refund is a FINANCIAL operation - order status should NOT change
    const statusBeforeRefund = order.status
    const finalStatuses = ['served', 'collected', 'delivered']
    const wasCompleted = finalStatuses.includes(statusBeforeRefund)

    console.log('🔍 REFUND: Order state before recalculate:', {
      orderId,
      statusBeforeRefund,
      wasCompleted,
      tableId: order.tableId
    })

    // Recalculate order totals (but we'll restore status if it was completed)
    // skipItemUpsert: avoid triggering kitchen realtime events
    await ordersStore.recalculateOrderTotals(orderId, { skipItemUpsert: true })

    // Targeted update: only payment fields on affected items
    const refundedItems: Array<{ id: string; paymentStatus: string; paidByPaymentIds: string[] }> =
      []
    for (const bill of order.bills) {
      for (const item of bill.items) {
        if (itemIds.includes(item.id)) {
          refundedItems.push({
            id: item.id,
            paymentStatus: item.paymentStatus,
            paidByPaymentIds: item.paidByPaymentIds || []
          })
        }
      }
    }
    await ordersStore.updateItemsPaymentStatus(refundedItems)

    // FIX: If order was completed, RESTORE its status and clear table link
    // Refund should not reopen a closed order onto a table
    if (wasCompleted && order.status !== statusBeforeRefund) {
      console.log('🔒 REFUND: Restoring completed order status (refund is financial only):', {
        from: order.status,
        to: statusBeforeRefund
      })
      order.status = statusBeforeRefund

      // Clear table association for refunded completed orders
      // The order stays in history but doesn't occupy the table
      if (order.tableId) {
        const tableIdToFree = order.tableId
        console.log('🪑 REFUND: Clearing table association for completed order')

        // Free the table ONLY if it's still occupied by this refunded order
        // If table has a new order, don't touch it
        const tablesStore = usePosTablesStore()
        const table = tablesStore.tables.find(t => t.id === tableIdToFree)
        if (table && table.currentOrderId === orderId) {
          await tablesStore.freeTable(tableIdToFree, orderId)
          console.log('✅ REFUND: Table freed (was occupied by refunded order):', {
            tableId: tableIdToFree
          })
        } else if (table && table.currentOrderId && table.currentOrderId !== orderId) {
          console.log('ℹ️ REFUND: Table has new order, not freeing:', {
            tableId: tableIdToFree,
            currentOrderId: table.currentOrderId,
            refundedOrderId: orderId
          })
        }

        order.tableId = undefined
      }

      // Save the corrected order state (order-level only)
      await ordersStore.updateOrderOnly(order)
    }

    console.log('🔍 REFUND: Order state after fix:', {
      orderId,
      statusBefore: statusBeforeRefund,
      statusAfter: order.status,
      tableId: order.tableId
    })

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
