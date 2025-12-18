// src/stores/pos/receipts/composables/usePosReceipt.ts
// Sprint 6: POS Receipt Module (ONLINE ONLY)

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useReceipts } from '@/stores/supplier_2/composables/useReceipts'
import { useShiftsStore } from '@/stores/pos/shifts'
import { useAccountStore } from '@/stores/account'
import { useProductsStore } from '@/stores/productsStore'
import { getPOSCashAccountId } from '@/stores/account/accountConfig'
import {
  loadPendingOrdersForReceipt,
  getOrderForReceipt,
  isOnline as checkOnline,
  addNetworkListener
} from '../services'
import type {
  PendingOrderForReceipt,
  ReceiptFormData,
  ReceiptFormItem,
  CompleteReceiptOptions,
  PaymentScenario,
  PaymentScenarioResult
} from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'usePosReceipt'

export function usePosReceipt() {
  // =============================================
  // DEPENDENCIES
  // =============================================

  const receiptsComposable = useReceipts()
  const shiftsStore = useShiftsStore()
  const accountStore = useAccountStore()
  const productsStore = useProductsStore()

  // =============================================
  // STATE
  // =============================================

  const pendingOrders = ref<PendingOrderForReceipt[]>([])
  const selectedOrder = ref<PendingOrderForReceipt | null>(null)
  const formData = ref<ReceiptFormData | null>(null)

  const isOnline = ref(checkOnline())
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)

  // =============================================
  // COMPUTED
  // =============================================

  const hasSelectedOrder = computed(() => selectedOrder.value !== null)
  const hasDiscrepancies = computed(() => formData.value?.hasDiscrepancies ?? false)
  const actualTotal = computed(() => formData.value?.actualTotal ?? 0)
  const expectedTotal = computed(() => formData.value?.expectedTotal ?? 0)
  const totalDifference = computed(() => actualTotal.value - expectedTotal.value)

  const canComplete = computed(() => {
    if (!isOnline.value) return false
    if (!selectedOrder.value) return false
    if (!formData.value) return false
    if (isSubmitting.value) return false
    return true
  })

  // =============================================
  // FORM HELPERS
  // =============================================

  /**
   * Create form data from selected order
   * Pre-fills all values from order (quantity and price)
   * Enhanced with package support
   */
  function createFormFromOrder(order: PendingOrderForReceipt): ReceiptFormData {
    const items: ReceiptFormItem[] = order.items.map(item => {
      // Calculate package size from ordered quantity and package quantity
      const packageSize =
        item.packageQuantity && item.packageQuantity > 0
          ? item.quantity / item.packageQuantity
          : undefined

      return {
        orderItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,

        // Package info
        packageId: item.packageId,
        packageName: item.packageName,
        packageUnit: item.packageUnit,
        packageSize,

        // Ordered values (readonly)
        orderedQuantity: item.quantity,
        orderedPackageQuantity: item.packageQuantity,
        orderedPrice: item.packagePrice || item.price, // price per package
        orderedBaseCost: item.pricePerUnit || item.price, // price per base unit
        orderedTotal: item.total,

        // Actual values (pre-filled from order, editable)
        receivedQuantity: item.quantity,
        receivedPackageQuantity: item.packageQuantity,
        actualPrice: undefined, // undefined means "same as ordered"
        actualBaseCost: undefined,
        actualTotal: item.total,
        actualLineTotal: undefined, // undefined means "calculated, not manual"

        // Discrepancy
        hasDiscrepancy: false,
        discrepancyType: 'none'
      }
    })

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      items,
      expectedTotal: order.totalAmount,
      actualTotal: order.totalAmount,
      hasDiscrepancies: false
    }
  }

  /**
   * Recalculate item totals and discrepancies
   * Uses baseCost (per unit) for calculations, not packagePrice
   */
  function recalculateItem(item: ReceiptFormItem): void {
    // Calculate actual total and recalculate price if lineTotal was manually set
    if (item.actualLineTotal !== undefined) {
      // User manually set the line total (e.g., for market rounding)
      item.actualTotal = item.actualLineTotal

      // Recalculate actualBaseCost from the manual line total
      // This ensures the formula is correct: lineTotal = quantity × price
      if (item.receivedQuantity > 0) {
        item.actualBaseCost = item.actualLineTotal / item.receivedQuantity

        // If item has package, also update actualPrice (price per package)
        if (item.packageSize && item.receivedPackageQuantity && item.receivedPackageQuantity > 0) {
          item.actualPrice = item.actualLineTotal / item.receivedPackageQuantity
        }
      }
    } else {
      // No manual override - calculate from price
      // Get effective base cost (actual if set, otherwise ordered)
      const effectiveBaseCost = item.actualBaseCost ?? item.orderedBaseCost
      item.actualTotal = item.receivedQuantity * effectiveBaseCost
    }

    // Determine discrepancy type
    const qtyChanged = Math.abs(item.receivedQuantity - item.orderedQuantity) > 0.001
    const priceChanged =
      item.actualBaseCost !== undefined &&
      Math.abs(item.actualBaseCost - item.orderedBaseCost) > 0.01

    if (qtyChanged && priceChanged) {
      item.discrepancyType = 'both'
      item.hasDiscrepancy = true
    } else if (qtyChanged) {
      item.discrepancyType = 'quantity'
      item.hasDiscrepancy = true
    } else if (priceChanged) {
      item.discrepancyType = 'price'
      item.hasDiscrepancy = true
    } else {
      item.discrepancyType = 'none'
      item.hasDiscrepancy = false
    }
  }

  /**
   * Recalculate form totals
   */
  function recalculateFormTotals(): void {
    if (!formData.value) return

    formData.value.actualTotal = formData.value.items.reduce(
      (sum, item) => sum + item.actualTotal,
      0
    )
    formData.value.hasDiscrepancies = formData.value.items.some(item => item.hasDiscrepancy)
  }

  // =============================================
  // ACTIONS
  // =============================================

  /**
   * Load pending orders from API
   * REQUIRES ONLINE MODE
   * Enriches orders with pending payment info
   */
  async function loadOrders(): Promise<void> {
    if (!isOnline.value) {
      error.value = 'Internet connection required for goods receipt'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const result = await loadPendingOrdersForReceipt()

      if (result.success && result.data) {
        // Enrich orders with pending payment info
        const enrichedOrders = await enrichOrdersWithPaymentInfo(result.data)
        pendingOrders.value = enrichedOrders
        DebugUtils.info(MODULE_NAME, `Loaded ${enrichedOrders.length} pending orders`, {
          withPendingPayments: enrichedOrders.filter(o => o.hasPendingPayment).length
        })
      } else {
        error.value = result.error || 'Failed to load orders'
        DebugUtils.error(MODULE_NAME, 'Failed to load orders', { error: result.error })
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      DebugUtils.error(MODULE_NAME, 'Error loading orders', { error: err })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Enrich orders with pending payment information
   * Checks both linkedOrders AND sourceOrderId for payment linkage
   * ВАЖНО: Показываем "Payment Ready" только для платежей со статусом 'pending'
   */
  async function enrichOrdersWithPaymentInfo(
    orders: PendingOrderForReceipt[]
  ): Promise<PendingOrderForReceipt[]> {
    try {
      // Force refresh pending payments to get current state
      await accountStore.fetchPayments(true)

      // Get ALL pending payments (status === 'pending')
      const allPendingPayments = accountStore.pendingPayments

      DebugUtils.info(MODULE_NAME, 'Enriching orders with payment info', {
        ordersCount: orders.length,
        pendingPaymentsCount: allPendingPayments.length,
        pendingPaymentIds: allPendingPayments.map(p => ({
          id: p.id,
          status: p.status,
          linkedOrders: p.linkedOrders?.length,
          sourceOrderId: p.sourceOrderId
        }))
      })

      return Promise.all(
        orders.map(async order => {
          // Check for payment linked via linkedOrders OR sourceOrderId
          // КРИТИЧНО: Проверяем status === 'pending' явно, чтобы избежать показа
          // "Payment Ready" для уже оплаченных или отменённых платежей
          const payment = allPendingPayments.find(
            p =>
              p.status === 'pending' && // ЯВНАЯ ПРОВЕРКА статуса
              // Check linkedOrders array with active status
              (p.linkedOrders?.some(lo => lo.orderId === order.id && lo.isActive) ||
                // Check sourceOrderId (direct link)
                p.sourceOrderId === order.id)
          )

          // Get total paid amount for this order
          const paidAmount = await accountStore.getTotalPaidForOrder(order.id)

          if (payment) {
            DebugUtils.info(MODULE_NAME, 'Found pending payment for order', {
              orderId: order.id,
              orderNumber: order.orderNumber,
              paymentId: payment.id,
              paymentStatus: payment.status,
              paymentAmount: payment.amount,
              linkedOrders: payment.linkedOrders,
              sourceOrderId: payment.sourceOrderId,
              orderBillStatus: order.billStatus,
              paidAmount
            })

            return {
              ...order,
              hasPendingPayment: true,
              pendingPaymentId: payment.id,
              pendingPaymentAmount: payment.amount,
              paidAmount
              // Сохраняем billStatus из заказа - он уже загружен из DB
            }
          }

          // Нет pending payment - billStatus уже загружен из DB
          DebugUtils.info(MODULE_NAME, 'No pending payment for order', {
            orderId: order.id,
            orderNumber: order.orderNumber,
            billStatus: order.billStatus,
            paidAmount
          })

          return {
            ...order,
            paidAmount
          }
        })
      )
    } catch (err) {
      DebugUtils.warn(MODULE_NAME, 'Failed to enrich orders with payment info', { error: err })
      return orders
    }
  }

  /**
   * Select an order and populate the form
   */
  async function selectOrder(orderId: string): Promise<void> {
    // Try to find in already loaded orders
    let order = pendingOrders.value.find(o => o.id === orderId)

    // If not found, load from API
    if (!order) {
      const result = await getOrderForReceipt(orderId)
      if (result.success && result.data) {
        order = result.data
      } else {
        error.value = result.error || 'Order not found'
        return
      }
    }

    selectedOrder.value = order
    formData.value = createFormFromOrder(order)
    DebugUtils.info(MODULE_NAME, `Selected order ${order.orderNumber}`)
  }

  /**
   * Clear selected order and form
   */
  function clearSelection(): void {
    selectedOrder.value = null
    formData.value = null
  }

  /**
   * Update item quantity
   */
  function updateItemQuantity(itemId: string, quantity: number): void {
    if (!formData.value) return

    const item = formData.value.items.find(i => i.orderItemId === itemId)
    if (!item) return

    item.receivedQuantity = quantity
    recalculateItem(item)
    recalculateFormTotals()
  }

  /**
   * Update item price (base cost per unit)
   */
  function updateItemPrice(itemId: string, price: number): void {
    if (!formData.value) return

    const item = formData.value.items.find(i => i.orderItemId === itemId)
    if (!item) return

    item.actualBaseCost = price
    // Recalculate package price if applicable
    if (item.packageSize && item.packageSize > 0) {
      item.actualPrice = price * item.packageSize
    } else {
      item.actualPrice = price
    }
    recalculateItem(item)
    recalculateFormTotals()
  }

  /**
   * Update item package price (price per package)
   * Calculates base cost from package price
   */
  function updateItemPackagePrice(itemId: string, packagePrice: number): void {
    if (!formData.value) return

    const item = formData.value.items.find(i => i.orderItemId === itemId)
    if (!item) return

    item.actualPrice = packagePrice
    // Calculate base cost from package price
    if (item.packageSize && item.packageSize > 0) {
      item.actualBaseCost = packagePrice / item.packageSize
    } else {
      item.actualBaseCost = packagePrice
    }
    recalculateItem(item)
    recalculateFormTotals()
  }

  /**
   * Update item package quantity (number of packages received)
   * Recalculates base quantity from package quantity
   */
  function updateItemPackageQuantity(itemId: string, packageQuantity: number): void {
    if (!formData.value) return

    const item = formData.value.items.find(i => i.orderItemId === itemId)
    if (!item) return

    item.receivedPackageQuantity = packageQuantity
    // Calculate base quantity from packages
    if (item.packageSize && item.packageSize > 0) {
      item.receivedQuantity = packageQuantity * item.packageSize
    } else {
      item.receivedQuantity = packageQuantity
    }
    recalculateItem(item)
    recalculateFormTotals()
  }

  /**
   * Update item line total (manual override for market rounding)
   * When set, this value overrides the calculated total
   */
  function updateItemLineTotal(itemId: string, lineTotal: number | undefined): void {
    if (!formData.value) return

    const item = formData.value.items.find(i => i.orderItemId === itemId)
    if (!item) return

    item.actualLineTotal = lineTotal
    recalculateItem(item)
    recalculateFormTotals()
  }

  /**
   * Clear manual line total (return to calculated value)
   */
  function clearItemLineTotal(itemId: string): void {
    updateItemLineTotal(itemId, undefined)
  }

  /**
   * Change item package (select different package type)
   * Recalculates quantities and prices based on new package
   */
  function changeItemPackage(
    itemId: string,
    newPackageId: string,
    newPackageQuantity: number
  ): void {
    if (!formData.value) return

    const item = formData.value.items.find(i => i.orderItemId === itemId)
    if (!item) return

    // Get new package info from products store
    const newPackage = productsStore.getPackageById(newPackageId)
    if (!newPackage) {
      DebugUtils.error(MODULE_NAME, 'Package not found', { packageId: newPackageId })
      return
    }

    DebugUtils.info(MODULE_NAME, 'Changing item package', {
      itemId,
      oldPackageId: item.packageId,
      newPackageId,
      newPackageQuantity,
      newPackageName: newPackage.packageName
    })

    // Update package info
    item.packageId = newPackageId
    item.packageName = newPackage.packageName
    item.packageUnit = newPackage.packageUnit
    item.packageSize = newPackage.packageSize

    // Update quantities
    item.receivedPackageQuantity = newPackageQuantity
    item.receivedQuantity = newPackageQuantity * newPackage.packageSize

    // Update prices
    const packagePrice =
      newPackage.packagePrice || newPackage.baseCostPerUnit * newPackage.packageSize
    item.actualPrice = packagePrice
    item.actualBaseCost = newPackage.baseCostPerUnit

    // Clear manual line total override (will recalculate from new package)
    item.actualLineTotal = undefined

    // Recalculate
    recalculateItem(item)
    recalculateFormTotals()

    DebugUtils.info(MODULE_NAME, 'Package changed successfully', {
      itemId,
      newPackageName: newPackage.packageName,
      receivedQuantity: item.receivedQuantity,
      actualTotal: item.actualTotal
    })
  }

  /**
   * Update payment amount
   */
  function setPaymentAmount(amount: number): void {
    if (!formData.value) return
    formData.value.paymentAmount = amount
  }

  /**
   * Complete receipt using supplier_2 store
   * REQUIRES ONLINE MODE
   */
  async function completeReceipt(options?: CompleteReceiptOptions): Promise<boolean> {
    if (!canComplete.value) {
      error.value = 'Cannot complete receipt'
      return false
    }

    if (!selectedOrder.value || !formData.value) {
      error.value = 'No order selected'
      return false
    }

    isSubmitting.value = true
    error.value = null

    try {
      // Build items data from form
      const itemsData = formData.value.items.map(item => ({
        orderItemId: item.orderItemId,
        receivedQuantity: item.receivedQuantity,
        receivedPackageQuantity: item.receivedPackageQuantity,
        actualPackagePrice: item.actualPrice,
        packageId: item.packageId,
        notes: ''
      }))

      // Start receipt via supplier_2
      await receiptsComposable.startReceipt(selectedOrder.value.id, {
        purchaseOrderId: selectedOrder.value.id,
        receivedBy: options?.performedBy?.name || 'Cashier',
        items: itemsData
      })

      // Update each item
      const currentReceipt = receiptsComposable.currentReceipt.value
      if (currentReceipt) {
        for (const formItem of formData.value.items) {
          const receiptItem = currentReceipt.items?.find(
            i => i.orderItemId === formItem.orderItemId
          )
          if (receiptItem) {
            await receiptsComposable.updateReceiptItem(currentReceipt.id, receiptItem.id, {
              receivedQuantity: formItem.receivedQuantity,
              actualPrice: formItem.actualPrice
            })
          }
        }

        // Complete receipt
        await receiptsComposable.completeReceipt(currentReceipt.id)
      }

      DebugUtils.info(MODULE_NAME, `Receipt completed for order ${selectedOrder.value.orderNumber}`)

      // Clear selection and reload orders
      clearSelection()
      await loadOrders()

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to complete receipt'
      DebugUtils.error(MODULE_NAME, 'Error completing receipt', { error: err })
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  /**
   * Complete receipt with payment
   * Creates expense in shift after receipt completion
   * После успешной оплаты обновляет billStatus заказа
   */
  async function completeReceiptWithPayment(
    paymentAmount: number,
    options?: CompleteReceiptOptions
  ): Promise<PaymentScenarioResult> {
    if (!selectedOrder.value) {
      return {
        scenario: 'create_unlinked',
        amount: paymentAmount,
        success: false,
        error: 'No order selected'
      }
    }

    const order = selectedOrder.value
    const orderId = order.id

    // First complete the receipt
    const receiptSuccess = await completeReceipt(options)
    if (!receiptSuccess) {
      return {
        scenario: 'create_unlinked',
        amount: paymentAmount,
        success: false,
        error: error.value || 'Failed to complete receipt'
      }
    }

    // Determine payment scenario
    const scenario = determinePaymentScenario(orderId)

    try {
      let result: PaymentScenarioResult

      switch (scenario) {
        case 'confirm_pending':
          // Scenario A1: Confirm existing pending payment
          result = await confirmPendingPayment(order, paymentAmount, options?.performedBy)
          break

        case 'create_linked':
          // Scenario A2: Create linked expense (online)
          result = await createLinkedExpenseForOrder(order, paymentAmount, options?.performedBy)
          break

        case 'create_unlinked':
        default:
          // Scenario B: Create unlinked expense (offline fallback)
          result = await createUnlinkedExpenseForOrder(order, paymentAmount, options?.performedBy)
          break
      }

      // После успешной оплаты - обновляем billStatus заказа
      if (result.success && isOnline.value) {
        try {
          const { usePurchaseOrders } = await import(
            '@/stores/supplier_2/composables/usePurchaseOrders'
          )
          const purchaseOrdersComposable = usePurchaseOrders()
          await purchaseOrdersComposable.updateOrderBillStatus(orderId)
          DebugUtils.info(MODULE_NAME, 'Updated bill status after payment', { orderId })
        } catch (err) {
          // Не критичная ошибка - billStatus обновится при следующей загрузке
          DebugUtils.warn(MODULE_NAME, 'Failed to update bill status (non-critical)', {
            error: err,
            orderId
          })
        }
      }

      return result
    } catch (err) {
      return {
        scenario,
        amount: paymentAmount,
        success: false,
        error: err instanceof Error ? err.message : 'Payment failed'
      }
    }
  }

  // =============================================
  // PAYMENT SCENARIO HELPERS
  // =============================================

  /**
   * Determine which payment scenario to use
   */
  function determinePaymentScenario(orderId: string): PaymentScenario {
    // Check for existing pending payment
    const hasPendingPayment = shiftsStore.hasPendingPaymentForOrder?.(orderId) ?? false

    DebugUtils.info(MODULE_NAME, 'Determining payment scenario', {
      orderId,
      hasPendingPayment,
      isOnline: isOnline.value,
      hasMethod: !!shiftsStore.hasPendingPaymentForOrder
    })

    if (hasPendingPayment) {
      return 'confirm_pending'
    }

    if (isOnline.value) {
      return 'create_linked'
    }

    return 'create_unlinked'
  }

  /**
   * Scenario A1: Confirm existing pending payment
   * Finds pending payment linked to order and processes it
   * Also records payment in current shift as account_payment expense
   */
  async function confirmPendingPayment(
    order: PendingOrderForReceipt,
    amount: number,
    performedBy?: { id: string; name: string; role?: string }
  ): Promise<PaymentScenarioResult> {
    DebugUtils.info(MODULE_NAME, 'Confirming pending payment', { orderId: order.id, amount })

    try {
      // Find pending payment for this order
      const payments = await accountStore.getPaymentsByOrder(order.id)
      const pendingPayment = payments.find(p => p.status === 'pending')

      if (!pendingPayment) {
        DebugUtils.warn(MODULE_NAME, 'No pending payment found, falling back to create_linked', {
          orderId: order.id
        })
        // Fallback to creating linked expense if no pending payment found
        return createLinkedExpenseForOrder(order, amount, performedBy)
      }

      DebugUtils.info(MODULE_NAME, 'Found pending payment to confirm', {
        paymentId: pendingPayment.id,
        paymentAmount: pendingPayment.amount,
        actualAmount: amount
      })

      const performer = performedBy
        ? { type: 'user' as const, id: performedBy.id, name: performedBy.name }
        : { type: 'api' as const, id: 'pos-receipt', name: 'POS Receipt' }

      // Determine account ID with fallback to POS cash account
      const accountId = pendingPayment.assignedToAccount || getPOSCashAccountId()

      let transactionId: string

      // Check if payment requires cashier confirmation
      if (pendingPayment.requiresCashierConfirmation) {
        // Use confirmPayment flow for cashier confirmation
        const confirmPerformer = performedBy
          ? { type: 'user' as const, id: performedBy.id, name: performedBy.name }
          : { type: 'system' as const, id: 'pos-receipt', name: 'POS Receipt' }

        transactionId = await accountStore.confirmPayment(
          pendingPayment.id,
          confirmPerformer,
          amount
        )
      } else {
        // Use processPayment for regular pending payments
        transactionId = await accountStore.processPayment({
          paymentId: pendingPayment.id,
          accountId,
          actualAmount: amount,
          notes: `Receipt payment for ${order.orderNumber}`,
          performedBy: performer
        })
      }

      // Record payment in shift as account_payment expense
      // This expense is for reporting only - won't create transaction on shift close
      if (shiftsStore.currentShift) {
        const expenseResult = await shiftsStore.createAccountPaymentExpense({
          shiftId: shiftsStore.currentShift.id,
          accountId,
          amount,
          counteragentId: order.supplierId,
          counteragentName: order.supplierName,
          linkedOrderId: order.id,
          linkedInvoiceNumber: order.orderNumber,
          transactionId,
          paymentId: pendingPayment.id,
          notes: `Payment via account for order ${order.orderNumber}`,
          performedBy: performer
        })

        if (expenseResult.success) {
          DebugUtils.info(MODULE_NAME, 'Account payment expense recorded in shift', {
            expenseId: expenseResult.data?.id,
            orderId: order.id
          })
        } else {
          DebugUtils.warn(MODULE_NAME, 'Failed to record account payment in shift (non-critical)', {
            error: expenseResult.error
          })
        }
      }

      return {
        scenario: 'confirm_pending',
        amount,
        linkedOrderId: order.id,
        pendingPaymentId: pendingPayment.id,
        expenseId: transactionId,
        success: true
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Error confirming pending payment', { error: err })
      return {
        scenario: 'confirm_pending',
        amount,
        linkedOrderId: order.id,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to confirm pending payment'
      }
    }
  }

  /**
   * Scenario A2: Create linked expense (online, no pending payment)
   */
  async function createLinkedExpenseForOrder(
    order: PendingOrderForReceipt,
    amount: number,
    performedBy?: { id: string; name: string; role?: string }
  ): Promise<PaymentScenarioResult> {
    DebugUtils.info(MODULE_NAME, 'Creating linked expense', { orderId: order.id, amount })

    const result = await shiftsStore.createLinkedExpense({
      shiftId: shiftsStore.currentShift?.id || '',
      accountId: '', // Will use default POS cash register
      amount,
      counteragentId: order.supplierId,
      counteragentName: order.supplierName,
      linkedOrderId: order.id,
      linkedInvoiceNumber: order.orderNumber,
      performedBy: performedBy
        ? { type: 'user', id: performedBy.id, name: performedBy.name }
        : { type: 'system', name: 'POS Receipt' }
    })

    return {
      scenario: 'create_linked',
      amount,
      linkedOrderId: order.id,
      expenseId: result.data?.id,
      success: result.success,
      error: result.error
    }
  }

  /**
   * Scenario B: Create unlinked expense (offline mode)
   * При offline + есть pending payment - сначала отвязываем payment, затем создаём unlinked expense
   */
  async function createUnlinkedExpenseForOrder(
    order: PendingOrderForReceipt,
    amount: number,
    performedBy?: { id: string; name: string; role?: string }
  ): Promise<PaymentScenarioResult> {
    DebugUtils.info(MODULE_NAME, 'Creating unlinked expense', {
      supplierId: order.supplierId,
      amount,
      hasPendingPayment: order.hasPendingPayment,
      pendingPaymentId: order.pendingPaymentId
    })

    // Если есть pending payment - отвязываем его от заказа
    // Это предотвращает дублирование: unlinked expense + pending payment
    if (order.pendingPaymentId) {
      try {
        await accountStore.unlinkPaymentFromOrder(order.pendingPaymentId, order.id)
        DebugUtils.info(MODULE_NAME, 'Unlinked pending payment before creating unlinked expense', {
          paymentId: order.pendingPaymentId,
          orderId: order.id
        })
      } catch (err) {
        // Не блокируем создание expense если unlink не удался (offline)
        DebugUtils.warn(MODULE_NAME, 'Failed to unlink pending payment (will retry on sync)', {
          error: err,
          paymentId: order.pendingPaymentId,
          orderId: order.id
        })
      }
    }

    const result = await shiftsStore.createUnlinkedExpense({
      shiftId: shiftsStore.currentShift?.id || '',
      accountId: '', // Will use default POS cash register
      amount,
      counteragentId: order.supplierId,
      counteragentName: order.supplierName,
      description: `Payment for ${order.supplierName} - ${order.orderNumber}`,
      performedBy: performedBy
        ? { type: 'user', id: performedBy.id, name: performedBy.name }
        : { type: 'system', name: 'POS Receipt' }
    })

    return {
      scenario: 'create_unlinked',
      amount,
      expenseId: result.data?.id,
      success: result.success,
      error: result.error
    }
  }

  // =============================================
  // LIFECYCLE
  // =============================================

  let cleanupNetworkListener: (() => void) | null = null

  onMounted(() => {
    // Set up network status listener
    cleanupNetworkListener = addNetworkListener(online => {
      isOnline.value = online
      if (online) {
        DebugUtils.info(MODULE_NAME, 'Network restored, can proceed with receipt')
      } else {
        DebugUtils.info(MODULE_NAME, 'Network lost, receipt functionality limited')
      }
    })
  })

  onUnmounted(() => {
    // Clean up network listener
    if (cleanupNetworkListener) {
      cleanupNetworkListener()
    }
  })

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    pendingOrders,
    selectedOrder,
    formData,
    isOnline,
    isLoading,
    isSubmitting,
    error,

    // Computed
    hasSelectedOrder,
    hasDiscrepancies,
    actualTotal,
    expectedTotal,
    totalDifference,
    canComplete,

    // Actions
    loadOrders,
    selectOrder,
    clearSelection,
    updateItemQuantity,
    updateItemPrice,
    updateItemPackagePrice,
    updateItemPackageQuantity,
    updateItemLineTotal,
    clearItemLineTotal,
    changeItemPackage,
    setPaymentAmount,
    completeReceipt,
    completeReceiptWithPayment
  }
}
