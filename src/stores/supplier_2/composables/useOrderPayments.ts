// src/stores/supplier_2/composables/useOrderPayments.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ

import { reactive, computed, readonly, ref, watch } from 'vue'
import { DebugUtils } from '@/utils'
import type { PurchaseOrder } from '../types'
import type { PendingPayment, CreatePaymentDto } from '@/stores/account'
import type { UpdatePaymentAmountDto } from '@/stores/account/types'
const MODULE_NAME = 'useOrderPayments'

/**
 * ✅ ИСПРАВЛЕННАЯ ВЕРСИЯ: Composable для управления платежами заказов
 * - Убраны async computed properties
 * - Реактивные данные загружаются в ref переменные
 * - Централизованная логика для диалогов
 */
export function useOrderPayments() {
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
      import('@/stores/auth.store')
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

    const totalBilled = bills.reduce((sum, bill) => {
      const link = bill.linkedOrders?.find(o => o.orderId === order.id && o.isActive)
      return sum + (link?.linkedAmount || 0)
    }, 0)
    const orderTotal = order.totalAmount
    const amountDifference = totalBilled - orderTotal
    const hasAmountMismatch = Math.abs(amountDifference) > 1

    const amountDifferenceClass = hasAmountMismatch
      ? amountDifference > 0
        ? 'text-warning'
        : 'text-error'
      : ''

    const paidAmount = bills
      .filter(bill => bill.status === 'completed')
      .reduce((sum, bill) => sum + bill.amount, 0)

    const deliveredAmount = order.actualDeliveredAmount || 0
    const shortfallAmount = paidAmount - deliveredAmount

    let paymentStatus: 'not_billed' | 'pending' | 'partial' | 'paid'
    if (bills.length === 0) {
      paymentStatus = 'not_billed'
    } else if (paidAmount === 0) {
      paymentStatus = 'pending'
    } else if (paidAmount < totalBilled) {
      paymentStatus = 'partial'
    } else {
      paymentStatus = 'paid'
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

      // Обеспечиваем свежие данные платежей
      await accountStore.fetchPayments()

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

      // Обеспечиваем свежие данные
      await accountStore.fetchPayments()

      // ✅ НОВОЕ: Фильтруем платежи с доступной суммой
      const bills = accountStore.state.pendingPayments.filter(payment => {
        // Базовые условия
        if (payment.counteragentId !== supplierId) return false
        if (!payment.linkedOrders) return false // Только связанные с заказами

        const availableAmount = getAvailableAmount(payment)
        if (availableAmount <= 0) return false // Нет доступной суммы

        // ✅ НОВОЕ: Исключаем счета, уже привязанные к текущему заказу
        const currentOrderId = paymentState.selectedOrder?.id
        if (currentOrderId) {
          const alreadyLinkedToCurrentOrder = payment.linkedOrders?.some(
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
     */
    // ✅ НОВЫЙ метод attachBill с linkPaymentToOrder
    async attachBill(billId: string): Promise<void> {
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

        await accountStore.linkPaymentToOrder({
          paymentId: billId,
          orderId: order.id,
          linkAmount: linkAmount,
          orderNumber: order.orderNumber
        })

        DebugUtils.info(MODULE_NAME, 'Bill attached successfully', {
          billId,
          orderId: order.id,
          linkedAmount: linkAmount
        })

        // Обновляем данные
        await Promise.all([loadOrderBills(order.id), loadAvailableBills(order.supplierId)])
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

        DebugUtils.info(MODULE_NAME, 'Bill detached successfully', { billId })

        // Обновляем данные
        await Promise.all([loadOrderBills(order.id), loadAvailableBills(order.supplierId)])
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

      if (orderPayments.length === 0) {
        console.warn(`OrderPayments: No payments found for order ${order.orderNumber}`)
        return
      }

      // ✅ COMPLETED платежи - обновляем usedAmount
      const completedPayments = orderPayments.filter(p => p.status === 'completed')
      for (const payment of completedPayments) {
        await updatePaymentUsedAmount(payment, order)
      }

      // ✅ НОВОЕ: PENDING платежи с автосинхронизацией - обновляем сумму
      const pendingPayments = orderPayments.filter(
        p => p.status === 'pending' && p.autoSyncEnabled && p.sourceOrderId === order.id // Только для исходного заказа
      )

      if (pendingPayments.length > 0) {
        console.log(`OrderPayments: Auto-syncing ${pendingPayments.length} pending payments`)

        for (const payment of pendingPayments) {
          await autoSyncPendingPaymentAmount(payment, order)
        }
      }

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

      // Обновляем сумму платежа через accountStore
      await accountStore.updatePaymentAmount({
        paymentId: payment.id,
        newAmount,
        reason: 'receipt_discrepancy',
        notes: `Auto-sync after receipt completion for order ${order.orderNumber}`
      })

      // Обновляем linkedAmount тоже
      const orderLink = payment.linkedOrders?.find(o => o.orderId === order.id && o.isActive)
      if (orderLink) {
        orderLink.linkedAmount = newAmount
      }
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
        newUsedAmount = actualDeliveredAmount
      } else {
        // Сложный случай: один платеж на несколько заказов
        // Обновляем пропорционально
        const otherLinkedAmount = activeLinks
          .filter(o => o.orderId !== order.id)
          .reduce((sum, o) => sum + o.linkedAmount, 0)

        newUsedAmount = actualDeliveredAmount + otherLinkedAmount
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
    if (!payment.linkedOrders) return 0 // Операционные платежи = 0

    const linkedAmount = payment.linkedOrders
      .filter(o => o.isActive)
      .reduce((sum, o) => sum + o.linkedAmount, 0)

    if (payment.status === 'completed') {
      // ✅ НОВАЯ ЛОГИКА: Для completed платежей используем usedAmount
      const usedAmount = payment.usedAmount || linkedAmount // fallback на linkedAmount
      return payment.amount - usedAmount
    } else {
      // ✅ Для pending платежей: available = amount - linkedAmount (зарезервировано)
      return payment.amount - linkedAmount
    }
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

    //Other
    syncOrderPaymentsAfterReceipt
  }
}

export type PaymentActions = ReturnType<typeof useOrderPayments>['actions']
export type PaymentState = ReturnType<typeof useOrderPayments>['paymentState']
