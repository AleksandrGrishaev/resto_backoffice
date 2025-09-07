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

    const totalBilled = bills.reduce((sum, bill) => sum + bill.amount, 0)
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

  async function loadOrderBills(orderId: string): Promise<void> {
    try {
      paymentState.loading = true
      DebugUtils.info(MODULE_NAME, 'Loading bills for order', { orderId })

      const { accountStore } = await getStores()

      // Обеспечиваем свежие данные платежей
      await accountStore.fetchPayments()

      // Фильтруем счета для этого заказа
      const bills = accountStore.state.pendingPayments.filter(
        payment => payment.purchaseOrderId === orderId
      )

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

  async function loadAvailableBills(supplierId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading available bills for supplier', { supplierId })

      const { accountStore } = await getStores()

      // Обеспечиваем свежие данные
      await accountStore.fetchPayments()

      // Фильтруем доступные счета поставщика
      const bills = accountStore.state.pendingPayments.filter(
        payment =>
          payment.counteragentId === supplierId &&
          payment.status === 'pending' &&
          !payment.purchaseOrderId // Только неприкрепленные
      )

      availableBills.value = bills

      DebugUtils.info(MODULE_NAME, 'Available bills loaded', {
        supplierId,
        billsCount: bills.length
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
          counteragentId: order.supplierId,
          counteragentName: order.supplierName,
          amount: data.amount,
          description: data.description,
          category: 'supplier',
          priority: data.priority,
          invoiceNumber: order.orderNumber,
          purchaseOrderId: order.id,
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

        await accountStore.attachPaymentToOrder(billId, order.id)

        DebugUtils.info(MODULE_NAME, 'Bill attached successfully', { billId, orderId: order.id })

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

        await accountStore.detachPaymentFromOrder(billId)

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
        amountDifference,
        originalAmount: order.originalTotalAmount
      })

      const { accountStore } = await getStores()

      // Обеспечиваем свежие данные платежей
      await accountStore.fetchPayments()

      // Получаем все связанные платежи этого заказа
      const orderPayments = accountStore.state.pendingPayments.filter(
        payment => payment.purchaseOrderId === order.id
      )

      console.log(`OrderPayments: Found ${orderPayments.length} payments for order`, {
        orderId: order.id,
        payments: orderPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          autoSyncEnabled: p.autoSyncEnabled
        }))
      })

      if (orderPayments.length === 0) {
        console.warn(`OrderPayments: No payments found for order ${order.orderNumber}`)
        return
      }

      // Находим основной счет для автосинхронизации
      const mainPayment = orderPayments.find(
        p => p.status === 'pending' && p.autoSyncEnabled !== false && p.purchaseOrderId === order.id
      )

      if (!mainPayment) {
        console.warn(
          `OrderPayments: No main payment found for auto-sync for order ${order.orderNumber}`
        )

        // Если нет основного платежа с автосинхронизацией, используем первый pending
        const fallbackPayment = orderPayments.find(p => p.status === 'pending')
        if (fallbackPayment) {
          console.log(`OrderPayments: Using fallback payment for sync:`, fallbackPayment.id)
          await syncSinglePayment(
            fallbackPayment,
            order,
            order.totalAmount - fallbackPayment.amount
          )
        }
        return
      }

      // ✅ УМНОЕ РАСПРЕДЕЛЕНИЕ: используем новую логику
      const distributionResult = await distributeAmountChanges(
        orderPayments,
        order.totalAmount,
        mainPayment.id
      )

      // Применяем изменения только к pending платежам
      for (const change of distributionResult.changes) {
        if (Math.abs(change.amountChange) > 0.01) {
          // Специальная обработка для обнуленных платежей
          if (change.reason === 'payment_cancellation') {
            await handleZeroedPayment(change.payment, order)
          } else {
            await syncSinglePayment(change.payment, order, change.amountChange)
          }

          console.log(`OrderPayments: Payment ${change.payment.id} processed`, {
            oldAmount: change.payment.amount,
            change: change.amountChange,
            reason: change.reason,
            finalAmount:
              change.reason === 'payment_cancellation'
                ? 0
                : change.payment.amount + change.amountChange
          })
        }
      }

      // Если появилась переплата, создаем кредит
      if (amountDifference < 0) {
        // отрицательная разница = переплата
        const overpaymentAmount = Math.abs(amountDifference)
        await createSupplierCredit(order, overpaymentAmount)
      }
    } catch (error) {
      console.error(`OrderPayments: Failed to sync order payments:`, error)
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

  /**
   * Умное распределение изменений суммы между платежами
   */
  async function distributeAmountChanges(
    orderPayments: PendingPayment[],
    newOrderTotal: number,
    mainPaymentId: string
  ): Promise<{
    changes: Array<{
      payment: PendingPayment
      amountChange: number
      reason: string
    }>
  }> {
    const changes: Array<{
      payment: PendingPayment
      amountChange: number
      reason: string
    }> = []

    // Разделяем платежи по категориям
    const completedPayments = orderPayments.filter(p => p.status === 'completed')
    const mainPayment = orderPayments.find(p => p.id === mainPaymentId)
    const otherPendingPayments = orderPayments.filter(
      p => p.status === 'pending' && p.id !== mainPaymentId && p.purchaseOrderId // только те, что привязаны к заказу
    )

    console.log(`OrderPayments: Analyzing payment distribution`, {
      newOrderTotal,
      completedCount: completedPayments.length,
      hasMainPayment: !!mainPayment,
      otherPendingCount: otherPendingPayments.length
    })

    // Считаем "неприкасаемую" сумму (уже оплаченные)
    const lockedAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0)
    const availableForDistribution = newOrderTotal - lockedAmount

    console.log(`OrderPayments: Payment distribution calculation`, {
      lockedAmount,
      availableForDistribution,
      currentPendingTotal:
        (mainPayment?.amount || 0) + otherPendingPayments.reduce((sum, p) => sum + p.amount, 0)
    })

    if (availableForDistribution < 0) {
      // ПЕРЕПЛАТА: создается кредит, платежи не меняются
      console.log(`OrderPayments: Overpayment detected: ${Math.abs(availableForDistribution)}`)
      return { changes: [] }
    }

    if (availableForDistribution === 0) {
      // ВСЕ ОПЛАЧЕНО: обнуляем все pending платежи
      if (mainPayment && mainPayment.amount > 0) {
        changes.push({
          payment: mainPayment,
          amountChange: -mainPayment.amount,
          reason: 'payment_cancellation'
        })
      }

      for (const payment of otherPendingPayments) {
        if (payment.amount > 0) {
          changes.push({
            payment,
            amountChange: -payment.amount,
            reason: 'payment_cancellation'
          })
        }
      }

      return { changes }
    }

    // НОРМАЛЬНОЕ РАСПРЕДЕЛЕНИЕ
    const currentPendingTotal =
      (mainPayment?.amount || 0) + otherPendingPayments.reduce((sum, p) => sum + p.amount, 0)

    if (currentPendingTotal === 0) {
      // Нет pending платежей - создаем в основном
      if (mainPayment) {
        changes.push({
          payment: mainPayment,
          amountChange: availableForDistribution,
          reason: 'order_amount_adjustment'
        })
      }
      return { changes }
    }

    // Если нужно УМЕНЬШИТЬ pending платежи
    if (availableForDistribution < currentPendingTotal) {
      const reductionNeeded = currentPendingTotal - availableForDistribution
      console.log(`OrderPayments: Need to reduce pending payments by ${reductionNeeded}`)

      // СТРАТЕГИЯ: Сначала уменьшаем дополнительные платежи, потом основной
      let remainingReduction = reductionNeeded

      // 1. Уменьшаем дополнительные платежи пропорционально
      if (otherPendingPayments.length > 0 && remainingReduction > 0) {
        const otherTotal = otherPendingPayments.reduce((sum, p) => sum + p.amount, 0)

        for (const payment of otherPendingPayments) {
          if (remainingReduction <= 0) break

          const proportion = payment.amount / otherTotal
          const paymentReduction = Math.min(
            remainingReduction * proportion,
            payment.amount // не можем уменьшить больше чем есть
          )

          if (paymentReduction > 0.01) {
            // Проверяем: если платеж обнуляется полностью
            if (paymentReduction >= payment.amount - 0.01) {
              changes.push({
                payment,
                amountChange: -payment.amount, // обнуляем полностью
                reason: 'payment_cancellation' // специальная причина для обнуления
              })
            } else {
              changes.push({
                payment,
                amountChange: -paymentReduction,
                reason: 'proportional_reduction'
              })
            }
            remainingReduction -= paymentReduction
          }
        }
      }

      // 2. Оставшуюся сумму списываем с основного платежа
      if (remainingReduction > 0.01 && mainPayment) {
        const mainReduction = Math.min(remainingReduction, mainPayment.amount)
        if (mainReduction >= mainPayment.amount - 0.01) {
          changes.push({
            payment: mainPayment,
            amountChange: -mainPayment.amount,
            reason: 'payment_cancellation'
          })
        } else {
          changes.push({
            payment: mainPayment,
            amountChange: -mainReduction,
            reason: 'main_payment_adjustment'
          })
        }
      }
    }
    // Если нужно УВЕЛИЧИТЬ pending платежи
    else if (availableForDistribution > currentPendingTotal) {
      const increaseNeeded = availableForDistribution - currentPendingTotal
      console.log(`OrderPayments: Need to increase pending payments by ${increaseNeeded}`)

      // Увеличиваем основной платеж
      if (mainPayment) {
        changes.push({
          payment: mainPayment,
          amountChange: increaseNeeded,
          reason: 'order_amount_increase'
        })
      }
    }

    console.log(`OrderPayments: Distribution completed`, {
      changesCount: changes.length,
      totalChange: changes.reduce((sum, c) => sum + c.amountChange, 0)
    })

    return { changes }
  }

  /**
   * Обработка платежей, которые должны быть обнулены
   */
  /**
   * Обработка платежей, которые должны быть обнулены
   */
  async function handleZeroedPayment(payment: PendingPayment, order: PurchaseOrder): Promise<void> {
    try {
      const { accountStore, authStore } = await getStores()

      console.log(`OrderPayments: Cancelling zeroed payment`, {
        paymentId: payment.id,
        originalAmount: payment.amount,
        orderNumber: order.orderNumber,
        description: payment.description
      })

      // ✅ ИСПРАВЛЕНИЕ: Используем правильный метод cancelPayment
      await accountStore.cancelPayment(payment.id)

      // ✅ ИСПРАВЛЕНИЕ: Добавляем запись в историю изменений суммы
      await accountStore.updatePaymentAmount({
        paymentId: payment.id,
        newAmount: 0,
        reason: 'order_cancellation',
        userId: authStore.currentUser?.id,
        notes: `Payment cancelled due to order amount reduction after receipt completion`
      })

      console.log(`OrderPayments: Payment ${payment.id} cancelled successfully`)
    } catch (error) {
      console.error(`OrderPayments: Failed to cancel zeroed payment:`, error)
      // Не прерываем основной процесс, только логируем ошибку
    }
  }

  /**
   * Создание кредита поставщика при переплате
   */
  async function createSupplierCredit(
    order: PurchaseOrder,
    overpaymentAmount: number
  ): Promise<void> {
    try {
      const { accountStore, authStore } = await getStores()

      console.log(`OrderPayments: Creating supplier credit for overpayment`, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        overpaymentAmount
      })

      // Создаем кредит как отдельный платеж
      const creditPayment = await accountStore.createPayment({
        counteragentId: order.supplierId,
        counteragentName: order.supplierName,
        amount: overpaymentAmount,
        description: `Supplier credit from overpayment ${order.orderNumber}`,
        priority: 'medium',
        status: 'pending',
        category: 'supplier',

        // НЕ привязываем к заказу - делаем доступным для использования
        sourceOrderId: order.id, // указываем источник
        autoSyncEnabled: false, // кредит не синхронизируется автоматически

        notes: `Available credit from previous order overpayment. Can be used for new orders.`,
        createdBy: {
          type: 'system',
          id: 'receipt-system',
          name: 'Receipt Processing System'
        }
      })

      console.log(`OrderPayments: Supplier credit created`, {
        creditId: creditPayment.id,
        amount: overpaymentAmount,
        sourceOrder: order.orderNumber
      })
    } catch (error) {
      console.error(`OrderPayments: Failed to create supplier credit:`, error)
      // Не прерываем основной процесс из-за ошибки создания кредита
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
