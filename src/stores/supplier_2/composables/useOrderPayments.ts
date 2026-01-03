// src/stores/supplier_2/composables/useOrderPayments.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ

import { reactive, computed, readonly, ref, watch } from 'vue'
import { DebugUtils, amountsEqual, isPaymentComplete, getTolerancePaymentStatus } from '@/utils'
import { usePaymentTolerance } from '@/composables/usePaymentTolerance'
import type { PurchaseOrder } from '../types'
import type { PendingPayment, CreatePaymentDto } from '@/stores/account'
const MODULE_NAME = 'useOrderPayments'

/**
 * ✅ ИСПРАВЛЕННАЯ ВЕРСИЯ: Composable для управления платежами заказов
 * - Убраны async computed properties
 * - Реактивные данные загружаются в ref переменные
 * - Централизованная логика для диалогов
 */
export function useOrderPayments() {
  // =============================================
  // PAYMENT TOLERANCE
  // =============================================

  const { tolerance } = usePaymentTolerance()

  // =============================================
  // CENTRALIZED STATE
  // =============================================

  const paymentState = reactive({
    // Dialog management
    showPaymentDialog: false,
    paymentDialogMode: 'create' as 'create' | 'attach' | 'view',

    // Current selection
    selectedOrderId: null as string | null,
    selectedOrder: null as PurchaseOrder | null,

    // UI state
    showShortfallAlert: false,
    shortfallData: null as { order: PurchaseOrder; amount: number } | null,

    // Loading & error
    loading: false,
    error: null as string | null
  })

  // =============================================
  // REACTIVE DATA - Non-computed, loaded explicitly
  // =============================================

  const orderBills = ref<PendingPayment[]>([])
  const availableBills = ref<PendingPayment[]>([])

  // =============================================
  // STORE INTEGRATIONS
  // =============================================

  async function getStores() {
    const [{ useAccountStore }, { useSupplierStore }, { useAuthStore }] = await Promise.all([
      import('@/stores/account'),
      import('@/stores/supplier_2'),
      import('@/stores/auth')
    ])

    return {
      accountStore: useAccountStore(),
      supplierStore: useSupplierStore(),
      authStore: useAuthStore()
    }
  }

  async function getAccountIntegration() {
    const { supplierAccountIntegration } = await import('../integrations/accountIntegration')
    return supplierAccountIntegration
  }

  // =============================================
  // COMPUTED PROPERTIES - Now fully reactive
  // =============================================

  const selectedOrderBills = computed(() => orderBills.value)

  const availableBillsForSupplier = computed(() => availableBills.value)

  const paymentCalculations = computed(() => {
    const bills = orderBills.value
    const order = paymentState.selectedOrder

    if (!order || !bills) {
      return {
        totalBilled: 0,
        orderTotal: 0,
        amountDifference: 0,
        hasAmountMismatch: false,
        amountDifferenceClass: '',
        shortfallAmount: 0,
        paymentStatus: 'not_billed' as const
      }
    }

    const totalBilled = bills
      .filter(bill => bill.status !== 'cancelled')
      .reduce((sum, bill) => {
        const link = bill.linkedOrders?.find(o => o.orderId === order.id && o.isActive)
        return sum + (link?.linkedAmount || 0)
      }, 0)
    const orderTotal = order.totalAmount
    const amountDifference = totalBilled - orderTotal

    // ✅ Use configurable tolerance for amount comparison
    const hasAmountMismatch = !amountsEqual(totalBilled, orderTotal, tolerance.value)

    const amountDifferenceClass = hasAmountMismatch
      ? amountDifference > 0
        ? 'text-warning'
        : 'text-error'
      : ''

    const paidAmount = bills
      .filter(bill => bill.status === 'completed')
      .reduce((sum, bill) => {
        const link = bill.linkedOrders?.find(o => o.orderId === order.id && o.isActive)
        return sum + (link?.linkedAmount || bill.usedAmount || 0)
      }, 0)

    const deliveredAmount = order.actualDeliveredAmount || 0
    const shortfallAmount = paidAmount - deliveredAmount

    // ✅ Use tolerance-aware payment status calculation
    let paymentStatus: 'not_billed' | 'billed' | 'partially_paid' | 'fully_paid' | 'overpaid' =
      'not_billed'

    const activeBills = bills.filter(bill => bill.status !== 'cancelled')

    if (activeBills.length === 0 || totalBilled === 0) {
      paymentStatus = 'not_billed'
    } else {
      // Use tolerance-aware status: overpaid if > tolerance above, fully_paid if within tolerance
      const toleranceStatus = getTolerancePaymentStatus(totalBilled, orderTotal, tolerance.value)
      if (toleranceStatus === 'not_paid') {
        paymentStatus = 'billed'
      } else if (toleranceStatus === 'overpaid') {
        paymentStatus = 'overpaid'
      } else if (toleranceStatus === 'fully_paid') {
        paymentStatus = 'fully_paid'
      } else {
        paymentStatus = 'partially_paid'
      }
    }

    return {
      totalBilled,
      orderTotal,
      amountDifference,
      hasAmountMismatch,
      amountDifferenceClass,
      shortfallAmount,
      paymentStatus,
      paidAmount
    }
  })

  // =============================================
  // DATA LOADING FUNCTIONS
  // =============================================

  // ✅ НОВЫЙ метод loadOrderBills с getPaymentsByOrder
  async function loadOrderBills(orderId: string): Promise<void> {
    try {
      paymentState.loading = true
      DebugUtils.info(MODULE_NAME, 'Loading bills for order', { orderId })

      const { accountStore } = await getStores()

      // Обеспечиваем свежие данные платежей (force refresh to ensure data is fresh)
      await accountStore.fetchPayments(true)

      // ✅ НОВОЕ: Используем getPaymentsByOrder вместо фильтрации по purchaseOrderId
      const bills = await accountStore.getPaymentsByOrder(orderId)

      orderBills.value = bills

      DebugUtils.info(MODULE_NAME, 'Order bills loaded', {
        orderId,
        billsCount: bills.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load order bills', { error, orderId })
      orderBills.value = []
    } finally {
      paymentState.loading = false
    }
  }

  // ✅ НОВЫЙ метод loadAvailableBills с фильтрацией по availableAmount
  async function loadAvailableBills(supplierId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading available bills for supplier', { supplierId })

      const { accountStore } = await getStores()

      // Обеспечиваем свежие данные (force refresh)
      await accountStore.fetchPayments(true)

      // ✅ ИСПРАВЛЕНО: Фильтруем платежи с доступной суммой
      const bills = accountStore.state.pendingPayments.filter(payment => {
        // Базовые условия
        if (payment.counteragentId !== supplierId) return false

        // ✅ ИСПРАВЛЕНО: Для completed платежей проверяем availableAmount даже без linkedOrders
        // Это важно для случаев с кредиторкой после приёмки
        if (payment.status === 'completed') {
          // Completed платёж может иметь доступную сумму если:
          // amount > usedAmount (кредиторка)
          const availableAmount = getAvailableAmount(payment)
          DebugUtils.debug(MODULE_NAME, 'Checking completed payment', {
            paymentId: payment.id,
            amount: payment.amount,
            usedAmount: payment.usedAmount,
            availableAmount
          })
          if (availableAmount <= 0) return false
        } else {
          // Для pending/processing - проверяем linkedOrders
          if (!payment.linkedOrders) return false
          const availableAmount = getAvailableAmount(payment)
          if (availableAmount <= 0) return false
        }

        // ✅ Исключаем счета, уже привязанные к текущему заказу
        const currentOrderId = paymentState.selectedOrder?.id
        if (currentOrderId && payment.linkedOrders) {
          const alreadyLinkedToCurrentOrder = payment.linkedOrders.some(
            link => link.orderId === currentOrderId && link.isActive
          )
          if (alreadyLinkedToCurrentOrder) return false
        }

        return true
      })

      availableBills.value = bills

      DebugUtils.info(MODULE_NAME, 'Available bills loaded', {
        supplierId,
        billsCount: bills.length,
        availableAmounts: bills.map(b => getAvailableAmount(b))
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load available bills', { error, supplierId })
      availableBills.value = []
    }
  }

  // =============================================
  // MAIN ACTIONS
  // =============================================

  const actions = {
    /**
     * ✅ Выбрать заказ для управления платежами
     */
    async selectOrder(order: PurchaseOrder): Promise<void> {
      try {
        paymentState.loading = true
        paymentState.error = null

        DebugUtils.info(MODULE_NAME, 'Selecting order for payment management', {
          orderId: order.id,
          orderNumber: order.orderNumber
        })

        // Устанавливаем выбранный заказ
        paymentState.selectedOrderId = order.id
        paymentState.selectedOrder = order

        // Загружаем данные параллельно
        await Promise.all([loadOrderBills(order.id), loadAvailableBills(order.supplierId)])

        DebugUtils.info(MODULE_NAME, 'Order selected successfully', {
          orderId: order.id,
          linkedBills: orderBills.value.length,
          availableBills: availableBills.value.length
        })
      } catch (error) {
        paymentState.error = 'Failed to load order payment data'
        DebugUtils.error(MODULE_NAME, 'Failed to select order', { error })
        throw error
      } finally {
        paymentState.loading = false
      }
    },

    /**
     * ✅ Создать новый счет из заказа
     */
    async createBill(data: {
      amount: number
      priority: 'low' | 'medium' | 'high' | 'urgent'
      description: string
    }): Promise<PendingPayment> {
      if (!paymentState.selectedOrder) {
        throw new Error('No order selected')
      }

      try {
        paymentState.loading = true
        paymentState.error = null

        const order = paymentState.selectedOrder
        const { authStore, accountStore } = await getStores()

        DebugUtils.info(MODULE_NAME, 'Creating bill for order', {
          orderId: order.id,
          amount: data.amount,
          priority: data.priority
        })

        const createDto: CreatePaymentDto = {
          counteragentId: order.supplierId, // ✅ ДОБАВИТЬ
          counteragentName: order.supplierName, // ✅ ДОБАВИТЬ
          amount: data.amount, // ✅ ДОБАВИТЬ
          description: data.description, // ✅ ДОБАВИТЬ
          priority: data.priority, // ✅ ДОБАВИТЬ
          category: 'supplier', // ✅ ДОБАВИТЬ
          usedAmount: 0,
          linkedOrders: [
            {
              orderId: order.id,
              orderNumber: order.orderNumber,
              linkedAmount: data.amount,
              linkedAt: new Date().toISOString(),
              isActive: true
            }
          ],

          sourceOrderId: order.id,
          autoSyncEnabled: true,
          createdBy: {
            type: 'user',
            id: authStore.currentUser?.id || 'system',
            name: authStore.currentUser?.name || 'System'
          }
        }

        const bill = await accountStore.createPayment(createDto)

        DebugUtils.info(MODULE_NAME, 'Bill created successfully', {
          billId: bill.id,
          orderId: order.id
        })

        // Обновляем локальные данные
        await loadOrderBills(order.id)

        return bill
      } catch (error) {
        const errorMsg = 'Failed to create bill'
        paymentState.error = errorMsg
        DebugUtils.error(MODULE_NAME, errorMsg, { error })
        throw error
      } finally {
        paymentState.loading = false
      }
    },

    /**
     * ✅ Привязать существующий счет к заказу
     * Auto-adjusts existing pending payments for the same order to prevent double-payment
     */
    // ✅ НОВЫЙ метод attachBill с linkPaymentToOrder
    async attachBill(billId: string): Promise<{
      success: boolean
      adjustedPendingPayments?: Array<{
        paymentId: string
        action: string
        oldAmount: number
        newAmount: number
      }>
    }> {
      if (!paymentState.selectedOrder) {
        throw new Error('No order selected')
      }

      try {
        paymentState.loading = true
        paymentState.error = null

        const order = paymentState.selectedOrder
        const { accountStore } = await getStores()

        DebugUtils.info(MODULE_NAME, 'Attaching bill to order', {
          billId,
          orderId: order.id
        })

        // ✅ НОВЫЙ: Используем linkPaymentToOrder вместо attachPaymentToOrder
        const payment = accountStore.state.pendingPayments.find(p => p.id === billId)
        if (!payment) throw new Error('Payment not found')

        // Вычисляем сумму для привязки
        const availableAmount = getAvailableAmount(payment)
        const linkAmount = Math.min(availableAmount, order.totalAmount)

        // ✅ linkPaymentToOrder now auto-adjusts pending payments
        const result = await accountStore.linkPaymentToOrder(
          {
            paymentId: billId,
            orderId: order.id,
            linkAmount: linkAmount,
            orderNumber: order.orderNumber
          },
          { autoAdjustPending: true, tolerance: tolerance.value }
        )

        // Log adjusted pending payments if any
        if (result.adjustedPayments && result.adjustedPayments.length > 0) {
          DebugUtils.info(MODULE_NAME, '📝 Pending payments adjusted after attaching bill', {
            orderId: order.id,
            adjustedPayments: result.adjustedPayments
          })
        }

        // ✅ FIX: Update the supplier order with bill reference and status
        const { supplierStore } = await getStores()

        // Calculate bill_status based on payment status and amount
        const billStatus =
          payment.status === 'completed'
            ? linkAmount >= order.totalAmount
              ? 'fully_paid'
              : 'partially_paid'
            : 'billed'

        await supplierStore.updateOrder(order.id, {
          billId: billId,
          billStatus: billStatus
        })

        DebugUtils.info(MODULE_NAME, 'Bill attached successfully', {
          billId,
          orderId: order.id,
          linkedAmount: linkAmount,
          billStatus,
          adjustedPendingPaymentsCount: result.adjustedPayments?.length || 0
        })

        // Обновляем данные
        await Promise.all([loadOrderBills(order.id), loadAvailableBills(order.supplierId)])

        return {
          success: true,
          adjustedPendingPayments: result.adjustedPayments
        }
      } catch (error) {
        const errorMsg = 'Failed to attach bill'
        paymentState.error = errorMsg
        DebugUtils.error(MODULE_NAME, errorMsg, { error })
        throw error
      } finally {
        paymentState.loading = false
      }
    },

    /**
     * ✅ Отвязать счет от заказа
     */
    // ✅ НОВЫЙ метод detachBill с unlinkPaymentFromOrder
    async detachBill(billId: string): Promise<void> {
      if (!paymentState.selectedOrder) {
        throw new Error('No order selected')
      }

      try {
        paymentState.loading = true
        paymentState.error = null

        const order = paymentState.selectedOrder
        const { accountStore } = await getStores()

        DebugUtils.info(MODULE_NAME, 'Detaching bill from order', {
          billId,
          orderId: order.id
        })

        // ✅ НОВЫЙ: Используем unlinkPaymentFromOrder
        await accountStore.unlinkPaymentFromOrder(billId, order.id)

        // ✅ FIX: Recalculate bill_status after unlinking
        // First reload bills to get fresh data
        await loadOrderBills(order.id)

        const { supplierStore } = await getStores()
        const remainingBills = orderBills.value.filter(
          b =>
            b.status !== 'cancelled' &&
            b.linkedOrders?.some(o => o.orderId === order.id && o.isActive)
        )

        let newBillStatus: string
        if (remainingBills.length === 0) {
          newBillStatus = 'not_billed'
        } else {
          // Calculate total paid amount from remaining bills
          const totalPaid = remainingBills
            .filter(b => b.status === 'completed')
            .reduce((sum, b) => {
              const link = b.linkedOrders?.find(o => o.orderId === order.id && o.isActive)
              return sum + (link?.linkedAmount || 0)
            }, 0)

          if (totalPaid >= order.totalAmount) {
            newBillStatus = 'fully_paid'
          } else if (totalPaid > 0) {
            newBillStatus = 'partially_paid'
          } else {
            newBillStatus = 'billed'
          }
        }

        await supplierStore.updateOrder(order.id, {
          billId: remainingBills.length > 0 ? remainingBills[0].id : null,
          billStatus: newBillStatus
        })

        DebugUtils.info(MODULE_NAME, 'Bill detached successfully', {
          billId,
          newBillStatus,
          remainingBillsCount: remainingBills.length
        })

        // Reload available bills
        await loadAvailableBills(order.supplierId)
      } catch (error) {
        const errorMsg = 'Failed to detach bill'
        paymentState.error = errorMsg
        DebugUtils.error(MODULE_NAME, errorMsg, { error })
        throw error
      } finally {
        paymentState.loading = false
      }
    },

    /**
     * ✅ Отменить счет
     */
    async cancelBill(billId: string): Promise<void> {
      try {
        paymentState.loading = true
        paymentState.error = null

        const { accountStore } = await getStores()

        DebugUtils.info(MODULE_NAME, 'Cancelling bill', { billId })

        await accountStore.cancelPayment(billId)

        DebugUtils.info(MODULE_NAME, 'Bill cancelled successfully', { billId })

        // Обновляем данные если есть выбранный заказ
        if (paymentState.selectedOrder) {
          await loadOrderBills(paymentState.selectedOrder.id)
        }
      } catch (error) {
        const errorMsg = 'Failed to cancel bill'
        paymentState.error = errorMsg
        DebugUtils.error(MODULE_NAME, errorMsg, { error })
        throw error
      } finally {
        paymentState.loading = false
      }
    },

    /**
     * ✅ Показать алерт недопоставки
     */
    showShortfall(): void {
      if (!paymentState.selectedOrder) return

      const order = paymentState.selectedOrder
      const calculations = paymentCalculations.value

      DebugUtils.info(MODULE_NAME, 'Showing shortfall alert', {
        orderId: order.id,
        shortfallAmount: calculations.shortfallAmount
      })

      paymentState.shortfallData = {
        order,
        amount: calculations.shortfallAmount
      }
      paymentState.showShortfallAlert = true
    },

    /**
     * ✅ Dialog management
     */
    openPaymentDialog(mode: 'create' | 'attach' | 'view' = 'create'): void {
      paymentState.paymentDialogMode = mode
      paymentState.showPaymentDialog = true
    },

    closePaymentDialog(): void {
      paymentState.showPaymentDialog = false
      paymentState.error = null
    },

    closeShortfallAlert(): void {
      paymentState.showShortfallAlert = false
      paymentState.shortfallData = null
    },

    /**
     * ✅ Навигация к счету
     */
    async navigateToPayment(billId: string): Promise<void> {
      const { useRouter } = await import('vue-router')
      const router = useRouter()
      router.push(`/accounts/payments/${billId}`)
    },

    /**
     * ✅ Навигация в модуль Accounts
     */
    async navigateToAccounts(): Promise<void> {
      if (!paymentState.selectedOrder) return

      const { useRouter } = await import('vue-router')
      const router = useRouter()
      const order = paymentState.selectedOrder

      router.push({
        path: '/accounts',
        query: {
          tab: 'payments',
          filter: `order:${order.orderNumber}`,
          supplierId: order.supplierId
        }
      })
    },

    /**
     * ✅ Очистка выбора
     */
    clearSelection(): void {
      paymentState.selectedOrderId = null
      paymentState.selectedOrder = null
      paymentState.error = null
      orderBills.value = []
      availableBills.value = []
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function getPaymentStatusColor(status: PendingPayment['status']): string {
    const colors = {
      pending: 'warning',
      processing: 'info',
      completed: 'success',
      failed: 'error',
      cancelled: 'grey'
    }
    return colors[status] || 'grey'
  }

  /**
   * Синхронизация всех платежей заказа после завершения приемки
   * Вызывается из useReceipts
   */
  async function syncOrderPaymentsAfterReceipt(
    order: PurchaseOrder,
    amountDifference: number
  ): Promise<void> {
    try {
      console.log(`OrderPayments: Syncing payments for order ${order.orderNumber}`, {
        orderId: order.id,
        newOrderAmount: order.totalAmount,
        actualDeliveredAmount: order.actualDeliveredAmount, // Добавь эту строку
        amountDifference,
        originalAmount: order.originalTotalAmount
      })

      const { accountStore } = await getStores()
      await accountStore.fetchPayments()
      const orderPayments = await accountStore.getPaymentsByOrder(order.id)

      console.log(`OrderPayments: Found ${orderPayments.length} payments for order`, {
        orderId: order.id,
        payments: orderPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          autoSyncEnabled: p.autoSyncEnabled,
          hasLinkedOrders: !!p.linkedOrders?.length
        }))
      })

      const actualDeliveredAmount = order.actualDeliveredAmount || order.totalAmount

      // ✅ СЛУЧАЙ 1: Нет платежей
      // НО: Если статус delivered - автоматизация (automatedPayments.ts) уже создаёт платёж
      // Не создаём дубликат, пропускаем и ждём автоматизацию
      if (orderPayments.length === 0) {
        if (order.status === 'delivered') {
          console.log(
            `OrderPayments: No payments found but status is delivered - skipping creation (automatedPayments will handle it)`,
            { orderId: order.id, orderNumber: order.orderNumber }
          )
          // Автоматизация из supplierStore.updateOrder создаст платёж через AutomatedPayments.onOrderStatusChanged
          return
        }

        console.log(
          `OrderPayments: No payments found, creating new pending payment for order ${order.orderNumber}`
        )
        await createPendingPaymentForOrder(order, actualDeliveredAmount)
        return
      }

      // ✅ СЛУЧАЙ 2: COMPLETED платежи - обновляем usedAmount
      const completedPayments = orderPayments.filter(p => p.status === 'completed')
      for (const payment of completedPayments) {
        await updatePaymentUsedAmount(payment, order)
      }

      // ✅ СЛУЧАЙ 3: PENDING платежи с автосинхронизацией - обновляем сумму
      const pendingAutoSyncPayments = orderPayments.filter(
        p => p.status === 'pending' && p.autoSyncEnabled && p.sourceOrderId === order.id
      )

      if (pendingAutoSyncPayments.length > 0) {
        console.log(
          `OrderPayments: Auto-syncing ${pendingAutoSyncPayments.length} pending payments`
        )

        for (const payment of pendingAutoSyncPayments) {
          await autoSyncPendingPaymentAmount(payment, order)
        }
      }

      // ✅ СЛУЧАЙ 4: Проверяем есть ли недоплата и создаём pending payment на остаток
      await createOveragePaymentIfNeeded(order, orderPayments, actualDeliveredAmount)

      console.log(`OrderPayments: Payment sync completed for order ${order.orderNumber}`)
    } catch (error) {
      console.error(`OrderPayments: Failed to sync order payments:`, error)
      throw error
    }
  }

  // ✅ НОВАЯ ФУНКЦИЯ: Автосинхронизация суммы pending платежа
  async function autoSyncPendingPaymentAmount(
    payment: PendingPayment,
    order: PurchaseOrder
  ): Promise<void> {
    try {
      const { accountStore } = await getStores()

      const newAmount = order.actualDeliveredAmount || order.totalAmount
      const oldAmount = payment.amount

      if (Math.abs(newAmount - oldAmount) < 1) {
        console.log(`OrderPayments: No significant amount change for payment ${payment.id}`)
        return
      }

      console.log(`OrderPayments: Auto-syncing payment amount`, {
        paymentId: payment.id,
        oldAmount,
        newAmount,
        difference: newAmount - oldAmount
      })

      // Обновляем сумму платежа через accountStore (включая linkedAmount)
      await accountStore.updatePaymentAmount({
        paymentId: payment.id,
        newAmount,
        reason: 'receipt_discrepancy',
        notes: `Auto-sync after receipt completion for order ${order.orderNumber}`,
        updateLinkedOrderId: order.id // ✅ Обновить linkedAmount для этого заказа
      })
    } catch (error) {
      console.error(`OrderPayments: Failed to auto-sync payment amount:`, error)
      throw error
    }
  }

  /**
   * ✅ НОВАЯ ФУНКЦИЯ: Обновляет usedAmount для completed платежей
   */
  /**
   * ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ: Обновляет usedAmount для completed платежей
   */
  async function updatePaymentUsedAmount(
    payment: PendingPayment,
    order: PurchaseOrder
  ): Promise<void> {
    try {
      const { accountStore } = await getStores()

      if (payment.status !== 'completed') {
        console.warn(`Payment ${payment.id} is not completed, skipping usedAmount update`)
        return
      }

      // Находим привязку к текущему заказу
      const orderLink = payment.linkedOrders?.find(o => o.orderId === order.id && o.isActive)
      if (!orderLink) {
        console.warn(`No active link found for payment ${payment.id} and order ${order.id}`)
        return
      }

      // Вычисляем фактически использованную сумму
      const actualDeliveredAmount = order.actualDeliveredAmount || order.totalAmount

      // Если это единственная привязка, просто обновляем usedAmount
      const activeLinks = payment.linkedOrders?.filter(o => o.isActive) || []

      let newUsedAmount: number

      if (activeLinks.length === 1) {
        // Простой случай: один платеж - один заказ
        // ✅ FIX: usedAmount не может превышать сумму счёта (payment.amount)
        // Если заказ стоит больше чем счёт - используем всю сумму счёта
        newUsedAmount = Math.min(actualDeliveredAmount, payment.amount)
      } else {
        // Сложный случай: один платеж на несколько заказов
        // Обновляем пропорционально
        const otherLinkedAmount = activeLinks
          .filter(o => o.orderId !== order.id)
          .reduce((sum, o) => sum + o.linkedAmount, 0)

        // ✅ FIX: Ограничиваем суммой счёта
        const thisOrderUsed = Math.min(actualDeliveredAmount, payment.amount - otherLinkedAmount)
        newUsedAmount = Math.min(thisOrderUsed + otherLinkedAmount, payment.amount)
      }

      // ✅ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Обновляем через новый метод accountStore.updatePaymentUsedAmount
      await accountStore.updatePaymentUsedAmount(payment.id, newUsedAmount)

      console.log(`OrderPayments: Updated usedAmount for payment ${payment.id}`, {
        orderId: order.id,
        oldUsedAmount: payment.usedAmount,
        newUsedAmount,
        availableAmount: payment.amount - newUsedAmount,
        actualDeliveredAmount
      })
    } catch (error) {
      console.error(`OrderPayments: Failed to update payment usedAmount:`, error)
      throw error
    }
  }

  /**
   * ✅ НОВОЕ: Создаёт pending payment для заказа на указанную сумму
   */
  async function createPendingPaymentForOrder(
    order: PurchaseOrder,
    amount: number,
    isOverage: boolean = false
  ): Promise<void> {
    try {
      const { accountStore, authStore } = await getStores()

      // Получаем имя поставщика из counteragents store
      let counteragentName = order.supplierName || 'Unknown Supplier'
      try {
        const { useCounteragentsStore } = await import('@/stores/counteragents')
        const counteragentsStore = useCounteragentsStore()
        const counteragent = counteragentsStore.counteragents?.find(c => c.id === order.supplierId)
        if (counteragent?.name) {
          counteragentName = counteragent.name
        }
      } catch {
        // Fallback to order.supplierName if counteragents store not available
        console.warn('OrderPayments: Could not load counteragents store, using order.supplierName')
      }

      const newPayment: CreatePaymentDto = {
        counteragentId: order.supplierId,
        counteragentName,
        amount,
        description: isOverage
          ? `Payment for order ${order.orderNumber} (overage)`
          : `Payment for order ${order.orderNumber}`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 дней
        priority: 'medium',
        category: 'supplier',
        linkedOrders: [
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            linkedAmount: amount,
            linkedAt: new Date().toISOString(),
            isActive: true
          }
        ],
        sourceOrderId: order.id,
        autoSyncEnabled: !isOverage, // Не синхронизировать overage автоматически
        createdBy: {
          id: authStore.currentUser?.id || 'system',
          name: authStore.currentUser?.name || 'System',
          type: 'user'
        }
      }

      await accountStore.createPayment(newPayment)

      console.log(`OrderPayments: Created pending payment for order ${order.orderNumber}`, {
        orderId: order.id,
        amount,
        isOverage
      })
    } catch (error) {
      console.error(`OrderPayments: Failed to create pending payment:`, error)
      throw error
    }
  }

  /**
   * ✅ НОВОЕ: Создаёт pending payment на остаток если фактическая сумма > оплаченной
   */
  async function createOveragePaymentIfNeeded(
    order: PurchaseOrder,
    orderPayments: PendingPayment[],
    actualDeliveredAmount: number
  ): Promise<void> {
    try {
      // Считаем сколько уже оплачено/выставлено к оплате
      const totalPaid = orderPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)

      const totalPending = orderPayments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.amount, 0)

      const totalCovered = totalPaid + totalPending

      // Есть ли недопокрытая сумма?
      const overage = actualDeliveredAmount - totalCovered

      if (overage <= 0) {
        console.log(`OrderPayments: No overage detected for order ${order.orderNumber}`, {
          actualDeliveredAmount,
          totalPaid,
          totalPending,
          totalCovered
        })
        return
      }

      console.log(`OrderPayments: Overage detected, creating pending payment`, {
        orderId: order.id,
        actualDeliveredAmount,
        totalCovered,
        overage
      })

      // Создаём pending payment на остаток (isOverage = true)
      await createPendingPaymentForOrder(order, overage, true)
    } catch (error) {
      console.error(`OrderPayments: Failed to create overage payment:`, error)
      throw error
    }
  }

  // =============================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =============================================

  /**
   * Синхронизация одного платежа
   */
  async function syncSinglePayment(
    payment: PendingPayment,
    order: PurchaseOrder,
    amountChange: number
  ): Promise<void> {
    try {
      const accountIntegration = await getAccountIntegration()

      // Создаем временный заказ с данными платежа для существующего API
      const orderForSync: PurchaseOrder = {
        ...order,
        billId: payment.id,
        totalAmount: payment.amount + amountChange
      }

      await accountIntegration.syncBillAmount(orderForSync)

      console.log(`OrderPayments: Synced payment ${payment.id} with amount change ${amountChange}`)
    } catch (error) {
      console.error(`OrderPayments: Failed to sync single payment:`, error)
      throw error
    }
  }

  // =============================================
  // WATCHER - Auto refresh when order changes
  // =============================================

  watch(
    () => paymentState.selectedOrderId,
    (newOrderId, oldOrderId) => {
      if (newOrderId && newOrderId !== oldOrderId) {
        DebugUtils.info(MODULE_NAME, 'Selected order changed, refreshing data', {
          newOrderId,
          oldOrderId
        })
      }
    }
  )

  // Getters

  function getAvailableAmount(payment: PendingPayment): number {
    // ✅ ИСПРАВЛЕНО: Для completed платежей используем usedAmount как основной показатель
    if (payment.status === 'completed') {
      // Для оплаченных платежей: available = amount - usedAmount
      // usedAmount показывает сколько реально использовано после приёмки
      const usedAmount = payment.usedAmount || 0
      const availableAmount = payment.amount - usedAmount
      return Math.max(0, availableAmount)
    }

    // Для pending/processing платежей: проверяем linkedOrders
    if (!payment.linkedOrders) return 0 // Операционные платежи без привязок = 0

    const linkedAmount = payment.linkedOrders
      .filter(o => o.isActive)
      .reduce((sum, o) => sum + o.linkedAmount, 0)

    // Для pending платежей: available = amount - linkedAmount
    const availableAmount = payment.amount - linkedAmount
    return Math.max(0, availableAmount)
  }

  // =============================================
  // RETURN INTERFACE
  // =============================================

  return {
    // Reactive state (readonly to prevent external mutations)
    paymentState: readonly(paymentState),

    // Computed properties
    selectedOrderBills,
    availableBillsForSupplier,
    paymentCalculations,

    // Actions (centralized)
    actions,

    // Utilities
    formatCurrency,
    getPaymentStatusColor,
    getAvailableAmount,

    //Other
    syncOrderPaymentsAfterReceipt
  }
}

export type PaymentActions = ReturnType<typeof useOrderPayments>['actions']
export type PaymentState = ReturnType<typeof useOrderPayments>['paymentState']
