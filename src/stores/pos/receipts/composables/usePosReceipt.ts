// src/stores/pos/receipts/composables/usePosReceipt.ts
// Sprint 6: POS Receipt Module (ONLINE ONLY)

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useReceipts } from '@/stores/supplier_2/composables/useReceipts'
import { useShiftsStore } from '@/stores/pos/shifts'
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
    // Get effective base cost (actual if set, otherwise ordered)
    const effectiveBaseCost = item.actualBaseCost ?? item.orderedBaseCost

    // Calculate actual total: receivedQuantity (base units) × baseCost
    // Unless user has manually set actualLineTotal (for market rounding)
    if (item.actualLineTotal !== undefined) {
      item.actualTotal = item.actualLineTotal
    } else {
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
        pendingOrders.value = result.data
        DebugUtils.info(MODULE_NAME, `Loaded ${result.data.length} pending orders`)
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
      // Start receipt via supplier_2
      await receiptsComposable.startReceipt(selectedOrder.value.id, {
        receivedBy: options?.performedBy?.name || 'Cashier'
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
    const scenario = determinePaymentScenario(order.id)

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
   */
  async function confirmPendingPayment(
    order: PendingOrderForReceipt,
    amount: number,
    performedBy?: { id: string; name: string; role?: string }
  ): Promise<PaymentScenarioResult> {
    DebugUtils.info(MODULE_NAME, 'Confirming pending payment', { orderId: order.id, amount })

    // Get the pending payment and confirm it
    const pendingPayments = shiftsStore.currentShift?.pendingPayments || []
    // Find the payment for this order (would need account store integration)
    // For now, we confirm via shiftsStore.confirmExpense

    // This scenario requires finding the pending payment ID
    // For MVP, we'll treat it as creating a linked expense
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
      scenario: 'confirm_pending',
      amount,
      linkedOrderId: order.id,
      expenseId: result.data?.id,
      success: result.success,
      error: result.error
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
   */
  async function createUnlinkedExpenseForOrder(
    order: PendingOrderForReceipt,
    amount: number,
    performedBy?: { id: string; name: string; role?: string }
  ): Promise<PaymentScenarioResult> {
    DebugUtils.info(MODULE_NAME, 'Creating unlinked expense', {
      supplierId: order.supplierId,
      amount
    })

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
    setPaymentAmount,
    completeReceipt,
    completeReceiptWithPayment
  }
}
