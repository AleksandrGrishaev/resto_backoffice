// src/stores/supplier_2/composables/usePurchaseOrders.ts

import { ref, computed } from 'vue'
import { useSupplierStore } from '../supplierStore'
import type {
  PurchaseOrder,
  OrderFilters,
  CreateOrderData,
  UpdateOrderData,
  SupplierBasket,
  UnassignedItem,
  OrderStatus,
  PaymentStatus
} from '../types'
import { usePlannedDeliveryIntegration } from '@/stores/supplier_2/integrations/plannedDeliveryIntegration'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'usePurchaseOrders'

// =============================================
// COMPOSABLE DEFINITION
// =============================================

export function usePurchaseOrders() {
  // =============================================
  // DEPENDENCIES
  // =============================================

  const supplierStore = useSupplierStore()
  const plannedDeliveryIntegration = usePlannedDeliveryIntegration()

  // =============================================
  // STATE
  // =============================================

  const filters = ref<OrderFilters>({
    status: 'all',
    paymentStatus: 'all',
    supplier: 'all',
    dateFrom: null,
    dateTo: null
  })

  // =============================================
  // COMPUTED - Data
  // =============================================

  const orders = computed(() => supplierStore.state.orders || [])

  const currentOrder = computed(() => supplierStore.state.currentOrder)

  const filteredOrders = computed(() => {
    let filtered = orders.value

    if (filters.value.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.value.status)
    }

    if (filters.value.paymentStatus !== 'all') {
      filtered = filtered.filter(order => order.paymentStatus === filters.value.paymentStatus)
    }

    if (filters.value.supplier !== 'all') {
      filtered = filtered.filter(order => order.supplierId === filters.value.supplier)
    }

    if (filters.value.dateFrom) {
      filtered = filtered.filter(order => order.orderDate >= filters.value.dateFrom!)
    }

    if (filters.value.dateTo) {
      filtered = filtered.filter(order => order.orderDate <= filters.value.dateTo!)
    }

    return filtered
  })

  // =============================================
  // COMPUTED - Filtered Lists
  // =============================================

  const draftOrders = computed(() => orders.value.filter(order => order.status === 'draft'))

  const pendingOrders = computed(
    () => orders.value.filter(order => order.status === 'sent') // ✅ НОВОЕ - только 'sent'
  )

  const unpaidOrders = computed(() =>
    orders.value.filter(order => order.paymentStatus === 'pending')
  )

  const ordersAwaitingDelivery = computed(() =>
    orders.value.filter(
      order => order.status === 'sent' && order.paymentStatus === 'paid' // ✅ НОВОЕ - только 'sent'
    )
  )

  const ordersForReceipt = computed(() => {
    const receipts = supplierStore.state.receipts || []
    return orders.value.filter(
      order =>
        order.status === 'sent' && // ✅ НОВОЕ - только 'sent'
        !receipts.some(
          receipt => receipt.purchaseOrderId === order.id && receipt.status === 'completed'
        )
    )
  })

  // =============================================
  // COMPUTED - Statistics
  // =============================================

  const orderStatistics = computed(() => ({
    total: orders.value.length,
    draft: draftOrders.value.length,
    pending: pendingOrders.value.length,
    unpaid: unpaidOrders.value.length,
    awaitingDelivery: ordersAwaitingDelivery.value.length
  }))

  const ordersWithPaymentInfo = computed(() => {
    return orders.value.map(order => ({
      ...order,
      paymentInfo: getPaymentInfo(order.billId)
    }))
  })

  const isLoading = computed(() => supplierStore.state.loading.orders)

  // =============================================
  // ACTIONS - CRUD Operations
  // =============================================

  /**
   * Fetch all orders
   */
  async function fetchOrders() {
    try {
      console.log('PurchaseOrders: Fetching orders')
      await supplierStore.fetchOrders()
      console.log(`PurchaseOrders: Fetched ${orders.value.length} orders`)
    } catch (error) {
      console.error('PurchaseOrders: Error fetching orders:', error)
      throw error
    }
  }

  /**
   * Create order from supplier basket - ИСПРАВЛЕННАЯ ВЕРСИЯ
   */
  // ✅ ИСПРАВЛЕНИЕ 1: Убираем автоматическое создание счетов
  // Файл: src/stores/supplier_2/composables/usePurchaseOrders.ts

  // ЗАМЕНИТЬ функцию createOrder:
  async function createOrder(data: CreateOrderData): Promise<PurchaseOrder> {
    try {
      console.log('PurchaseOrders: Creating order', data)
      const newOrder = await supplierStore.createOrder(data)

      // ✅ ОСТАВЛЯЕМ: Создаем планируемую поставку в StorageStore
      try {
        await plannedDeliveryIntegration.createPlannedDelivery(newOrder)
        console.log(`PurchaseOrders: Planned delivery created for order ${newOrder.orderNumber}`)
      } catch (error) {
        console.warn('PurchaseOrders: Failed to create planned delivery (non-critical):', error)
        // Не прерываем создание заказа из-за ошибки интеграции
      }

      // ❌ УБИРАЕМ: await createBillInAccountStore(newOrder)
      // Теперь счета создаются только вручную через UI

      console.log(`PurchaseOrders: Created order ${newOrder.orderNumber}`)
      console.log(`PurchaseOrders: Bill can be created manually via UI`)
      return newOrder
    } catch (error) {
      console.error('PurchaseOrders: Error creating order:', error)
      throw error
    }
  }

  // ТАКЖЕ ЗАМЕНИТЬ функцию sendOrderToSupplier:
  async function sendOrderToSupplier(id: string): Promise<PurchaseOrder> {
    try {
      console.log(`PurchaseOrders: Sending order to supplier ${id}`)

      // Обновляем статус на 'sent'
      const updatedOrder = await updateOrder(id, { status: 'sent' })

      // ❌ УБИРАЕМ автоматическое создание счета при отправке
      // Теперь счета создаются только через UI диалог
      console.log(`PurchaseOrders: Order sent. Bill can be created via manage payment dialog`)

      return updatedOrder
    } catch (error) {
      console.error('PurchaseOrders: Error sending order to supplier:', error)
      throw error
    }
  }

  // ЗАМЕНИТЬ функцию createOrderFromBasket:
  async function createOrderFromBasket(basket: SupplierBasket): Promise<PurchaseOrder> {
    if (!basket.supplierId) {
      throw new Error('Supplier not selected')
    }

    if (basket.items.length === 0) {
      throw new Error('Cannot create order with no items')
    }

    try {
      console.log(`PurchaseOrders: Creating order from basket for ${basket.supplierName}`)

      // Get unique request IDs for this basket
      const requestIds = getUniqueRequestIds(basket)

      // Prepare order data
      const orderData: CreateOrderData = {
        supplierId: basket.supplierId,
        requestIds,
        items: basket.items.map(item => ({
          itemId: item.itemId,
          quantity: item.totalQuantity,
          pricePerUnit: item.estimatedPrice
        })),
        notes: `Order created from ${requestIds.length} procurement request(s)`
      }

      const newOrder = await supplierStore.createOrder(orderData)

      // ИСПРАВЛЕНИЕ 1: Убираем товары из рекомендаций после создания заказа
      removeItemsFromSuggestions(basket.items)

      // ИСПРАВЛЕНИЕ 2: Проверяем - нужно ли обновлять статус заявок
      await updateRequestsStatusConditionally(requestIds, basket.items)

      // ❌ УБИРАЕМ автоматическое создание счета
      console.log(`PurchaseOrders: Order created successfully`, newOrder.orderNumber)
      console.log(`PurchaseOrders: Payment can be managed via UI after order creation`)

      return newOrder
    } catch (error) {
      console.error('PurchaseOrders: Error creating order from basket:', error)
      throw error
    }
  }

  /**
   * НОВЫЙ МЕТОД: Условное обновление статуса запросов
   * Меняет статус на 'converted' только если все товары из заявки заказаны
   */
  async function updateRequestsStatusConditionally(
    requestIds: string[],
    orderedItems: UnassignedItem[]
  ) {
    try {
      for (const requestId of requestIds) {
        const request = supplierStore.state.requests.find(req => req.id === requestId)
        if (!request) continue

        // Проверяем, все ли товары из заявки были заказаны
        const allItemsOrdered = request.items.every(requestItem => {
          return orderedItems.some(
            orderedItem =>
              orderedItem.itemId === requestItem.itemId &&
              orderedItem.totalQuantity >= requestItem.requestedQuantity
          )
        })

        if (allItemsOrdered) {
          // Все товары заказаны - меняем статус на 'converted'
          await supplierStore.updateRequest(requestId, { status: 'converted' })
          console.log(`PurchaseOrders: Request ${requestId} fully converted (all items ordered)`)
        } else {
          // Частично заказаны - оставляем статус 'submitted'
          console.log(
            `PurchaseOrders: Request ${requestId} partially ordered, keeping status 'submitted'`
          )
        }
      }
    } catch (error) {
      console.error('PurchaseOrders: Error updating request statuses conditionally:', error)
    }
  }

  /**
   * Update order
   */
  async function updateOrder(id: string, data: UpdateOrderData): Promise<PurchaseOrder> {
    try {
      console.log(`PurchaseOrders: Updating order ${id}`, data)

      // Получаем старую версию для сравнения
      const oldOrder = supplierStore.state.orders.find(o => o.id === id)
      const oldTotalAmount = oldOrder?.totalAmount || 0

      const updatedOrder = await supplierStore.updateOrder(id, data)

      // ✅ НОВОЕ: Автосинхронизация суммы счета при изменении
      if (updatedOrder.billId && updatedOrder.totalAmount !== oldTotalAmount) {
        try {
          const { supplierAccountIntegration } = await import('../integrations/accountIntegration')
          await supplierAccountIntegration.syncBillAmount(updatedOrder)
          console.log(`PurchaseOrders: Bill amount synced for order ${id}`)
        } catch (syncError) {
          console.warn(`PurchaseOrders: Bill sync failed for order ${id}:`, syncError)
          // Не прерываем обновление заказа из-за ошибки синхронизации
        }
      }

      console.log(`PurchaseOrders: Updated order ${id}`)
      return updatedOrder
    } catch (error) {
      console.error('PurchaseOrders: Error updating order:', error)
      throw error
    }
  }

  async function getOrderPaymentStatus(orderId: string) {
    try {
      const { supplierAccountIntegration } = await import('../integrations/accountIntegration')
      return await supplierAccountIntegration.getOrderPaymentStatus(orderId)
    } catch (error) {
      console.error('PurchaseOrders: Error getting payment status:', error)
      return {
        hasBills: false,
        totalBilled: 0,
        totalPaid: 0,
        pendingAmount: 0,
        status: 'not_billed' as const
      }
    }
  }

  async function cancelOrderBills(orderId: string): Promise<void> {
    try {
      const { supplierAccountIntegration } = await import('../integrations/accountIntegration')
      await supplierAccountIntegration.cancelBillForOrder(orderId)
      console.log(`PurchaseOrders: Bills cancelled for order ${orderId}`)
    } catch (error) {
      console.error('PurchaseOrders: Error cancelling bills:', error)
      throw error
    }
  }

  /**
   * Delete order
   */
  async function deleteOrder(id: string): Promise<void> {
    try {
      console.log(`PurchaseOrders: Deleting order ${id}`)
      await supplierStore.deleteOrder(id)
      console.log(`PurchaseOrders: Deleted order ${id}`)
    } catch (error) {
      console.error('PurchaseOrders: Error deleting order:', error)
      throw error
    }
  }

  // =============================================
  // ACTIONS - Status Management
  // =============================================

  /**
   * Send order to supplier
   */
  async function sendOrder(id: string): Promise<PurchaseOrder> {
    try {
      console.log(`PurchaseOrders: Sending order ${id}`)

      // Отправляем заказ
      const sentOrder = await updateOrder(id, {
        status: 'sent',
        sentDate: new Date().toISOString()
      })

      // ✅ НОВОЕ: Создаем транзитные batch-и при отправке заказа
      try {
        const batchIds = await plannedDeliveryIntegration.createTransitBatchesFromOrder(sentOrder)
        console.log(`PurchaseOrders: Transit batches created successfully`, {
          orderId: sentOrder.id,
          batchesCreated: batchIds.length,
          batchIds
        })
      } catch (transitError) {
        // НЕ останавливаем отправку заказа из-за ошибки создания batch-ей
        console.warn(
          'PurchaseOrders: Failed to create transit batches (order sent successfully):',
          transitError
        )
      }

      console.log(
        `PurchaseOrders: Order ${sentOrder.orderNumber} sent to supplier and transit batches created`
      )
      return sentOrder
    } catch (error) {
      console.error('PurchaseOrders: Error sending order:', error)
      throw error
    }
  }

  /**
   * Mark order as delivered
   */
  async function markOrderDelivered(id: string): Promise<PurchaseOrder> {
    try {
      console.log(`PurchaseOrders: Marking order ${id} as delivered`)
      return await updateOrder(id, {
        status: 'delivered',
        deliveredDate: new Date().toISOString()
      })
    } catch (error) {
      console.error('PurchaseOrders: Error marking order as delivered:', error)
      throw error
    }
  }

  /**
   * Cancel order
   */
  async function cancelOrder(id: string): Promise<PurchaseOrder> {
    try {
      console.log(`PurchaseOrders: Cancelling order ${id}`)

      // Отменяем заказ
      const cancelledOrder = await updateOrder(id, {
        status: 'cancelled',
        cancelledDate: new Date().toISOString()
      })

      // ✅ НОВОЕ: Удаляем транзитные batch-и при отмене заказа
      try {
        await plannedDeliveryIntegration.removeTransitBatchesOnOrderCancel(id)
        console.log(
          `PurchaseOrders: Transit batches removed for cancelled order ${cancelledOrder.orderNumber}`
        )
      } catch (transitError) {
        // НЕ критично, если не удалось удалить batch-и
        console.warn(
          'PurchaseOrders: Failed to remove transit batches (non-critical):',
          transitError
        )
      }

      console.log(
        `PurchaseOrders: Order ${cancelledOrder.orderNumber} cancelled and transit batches removed`
      )
      return cancelledOrder
    } catch (error) {
      console.error('PurchaseOrders: Error cancelling order:', error)
      throw error
    }
  }

  /**
   * Update payment status
   */
  async function updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus
  ): Promise<PurchaseOrder> {
    return updateOrder(id, { paymentStatus })
  }

  // =============================================
  // ACTIONS - AccountStore Integration
  // =============================================

  /**
   * Create bill in AccountStore for order
   */
  async function createBillInAccountStore(order: PurchaseOrder): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating bill in account store', { orderId: order.id })

      // ✅ НОВОЕ: Используем интеграционный сервис
      const { supplierAccountIntegration } = await import('../integrations/accountIntegration')
      const bill = await supplierAccountIntegration.createBillFromOrder(order)

      // ✅ НОВОЕ: Обновляем заказ с billId
      const updatedOrder = await supplierStore.updateOrder(order.id, {
        billId: bill.id,
        paymentStatus: 'pending'
      })

      // Обновляем в state
      const index = state.value.orders.findIndex(o => o.id === order.id)
      if (index !== -1) {
        state.value.orders[index] = updatedOrder
      }

      DebugUtils.info(MODULE_NAME, 'Bill created and linked to order', {
        orderId: order.id,
        billId: bill.id
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create bill in account store', { error })
      throw error
    }
  }

  /**
   * Get payment info from AccountStore
   */
  function getPaymentInfo(billId?: string) {
    if (!billId) return null

    // TODO: Интеграция с AccountStore
    // const accountStore = useAccountStore()
    // return accountStore.getBillById(billId)

    return {
      billId,
      status: 'pending',
      amount: 0,
      paidAmount: 0,
      dueDate: null
    }
  }

  // =============================================
  // HELPER METHODS - НОВЫЕ ИСПРАВЛЕНИЯ
  // =============================================

  /**
   * НОВЫЙ МЕТОД: Удаление товаров из рекомендаций
   */
  function removeItemsFromSuggestions(items: UnassignedItem[]) {
    try {
      const itemIds = items.map(item => item.itemId)

      const originalCount = supplierStore.state.orderSuggestions.length

      supplierStore.state.orderSuggestions = supplierStore.state.orderSuggestions.filter(
        suggestion => !itemIds.includes(suggestion.itemId)
      )

      const removedCount = originalCount - supplierStore.state.orderSuggestions.length

      console.log(`PurchaseOrders: Removed ${removedCount} items from order suggestions`, {
        itemIds,
        remainingSuggestions: supplierStore.state.orderSuggestions.length
      })
    } catch (error) {
      console.error('PurchaseOrders: Error removing items from suggestions:', error)
    }
  }

  /**
   * НОВЫЙ МЕТОД: Обновление статуса запросов
   */
  async function updateRequestsStatus(requestIds: string[], status: 'converted' | 'cancelled') {
    try {
      const updatePromises = requestIds.map(requestId =>
        supplierStore.updateRequest(requestId, { status })
      )

      await Promise.all(updatePromises)

      console.log(`PurchaseOrders: Updated ${requestIds.length} requests to status: ${status}`)
    } catch (error) {
      console.error('PurchaseOrders: Error updating request statuses:', error)
    }
  }

  /**
   * Get unique request IDs from basket
   */
  function getUniqueRequestIds(basket: SupplierBasket): string[] {
    const requestIds = new Set<string>()

    basket.items.forEach(item => {
      item.sources.forEach(source => {
        requestIds.add(source.requestId)
      })
    })

    return Array.from(requestIds)
  }

  // =============================================
  // FILTERING & SELECTION
  // =============================================

  /**
   * Set current order
   */
  function setCurrentOrder(order: PurchaseOrder | undefined) {
    supplierStore.setCurrentOrder(order)
  }

  /**
   * Update filters
   */
  function updateFilters(newFilters: Partial<OrderFilters>) {
    filters.value = { ...filters.value, ...newFilters }
    console.log('PurchaseOrders: Updated filters', filters.value)
  }

  /**
   * Clear all filters
   */
  function clearFilters() {
    filters.value = {
      status: 'all',
      paymentStatus: 'all',
      supplier: 'all',
      dateFrom: null,
      dateTo: null
    }
    console.log('PurchaseOrders: Cleared all filters')
  }

  // =============================================
  // HELPER FUNCTIONS
  // =============================================

  /**
   * Get order by ID
   */
  function getOrderById(id: string): PurchaseOrder | undefined {
    return orders.value.find(order => order.id === id)
  }

  /**
   * Get orders by status
   */
  function getOrdersByStatus(status: OrderStatus): PurchaseOrder[] {
    return orders.value.filter(order => order.status === status)
  }

  /**
   * Get orders by payment status
   */
  function getOrdersByPaymentStatus(paymentStatus: PaymentStatus): PurchaseOrder[] {
    return orders.value.filter(order => order.paymentStatus === paymentStatus)
  }

  /**
   * Get orders by supplier
   */
  function getOrdersBySupplier(supplierId: string): PurchaseOrder[] {
    return orders.value.filter(order => order.supplierId === supplierId)
  }

  // =============================================
  // VALIDATION FUNCTIONS
  // =============================================

  /**
   * Check if order can be edited
   */
  function canEditOrder(order: PurchaseOrder): boolean {
    return ['draft', 'sent'].includes(order.status)
  }

  /**
   * Check if order can be deleted
   */
  function canDeleteOrder(order: PurchaseOrder): boolean {
    return order.status === 'draft'
  }

  /**
   * Check if order can be sent
   */
  function canSendOrder(order: PurchaseOrder): boolean {
    return order.status === 'draft' && order.items.length > 0
  }

  /**
   * Check if order can be received
   */
  function canReceiveOrder(order: PurchaseOrder): boolean {
    return order.status === 'sent'
  }

  /**
   * Check if order is ready for receipt
   */
  function isReadyForReceipt(order: PurchaseOrder): boolean {
    const isValidStatus = order.status === 'sent'
    const hasNoActiveReceipt = !hasActiveReceipt(order.id)

    console.log(`PurchaseOrders: isReadyForReceipt check`, {
      orderId: order.id,
      status: order.status,
      isValidStatus,
      hasNoActiveReceipt,
      isReady: isValidStatus && hasNoActiveReceipt
    })

    return isValidStatus && hasNoActiveReceipt
  }

  /**
   * Check if order has active receipt
   */
  function hasActiveReceipt(orderId: string): boolean {
    const receipts = supplierStore.state.receipts || []
    return receipts.some(
      receipt => receipt.purchaseOrderId === orderId && receipt.status !== 'completed'
    )
  }

  // =============================================
  // CALCULATION FUNCTIONS
  // =============================================

  /**
   * Calculate order totals
   */
  function calculateOrderTotals(order: PurchaseOrder) {
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.orderedQuantity * item.pricePerUnit,
      0
    )

    // TODO: Add tax calculation
    const tax = 0
    const shipping = 0
    const total = subtotal + tax + shipping

    return {
      subtotal,
      tax,
      shipping,
      total
    }
  }

  // =============================================
  // UI HELPER FUNCTIONS
  // =============================================

  /**
   * Get status color for UI
   */
  function getStatusColor(status: OrderStatus): string {
    switch (status) {
      case 'draft':
        return 'grey'
      case 'sent':
        return 'info'
      case 'delivered':
        return 'success'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  /**
   * Get payment status color for UI
   */
  function getPaymentStatusColor(status: PaymentStatus): string {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'paid':
        return 'success'
      case 'overdue':
        return 'error'
      default:
        return 'default'
    }
  }

  /**
   * Format currency
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Format date
   */
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  /**
   * Get order age in days
   */
  function getOrderAge(order: PurchaseOrder): number {
    const orderDate = new Date(order.orderDate)
    const now = new Date()
    const diffTime = now.getTime() - orderDate.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Check if order is overdue for delivery
   */
  function isOverdueForDelivery(order: PurchaseOrder): boolean {
    if (!order.expectedDeliveryDate || order.status === 'delivered') {
      return false
    }

    const expectedDate = new Date(order.expectedDeliveryDate)
    const now = new Date()
    return now > expectedDate
  }

  /**
   * Получить планируемую дату поставки из StorageStore
   */
  async function getPlannedDeliveryDate(orderId: string): Promise<string | null> {
    try {
      const delivery = await storageStore.getPlannedDeliveryByOrderId(orderId)
      return delivery?.plannedDate || null
    } catch (error) {
      console.warn('Failed to get planned delivery date:', error)
      return null
    }
  }

  /**
   * Проверить статус планируемой поставки
   */
  async function getDeliveryStatus(orderId: string): Promise<string | null> {
    try {
      const delivery = await storageStore.getPlannedDeliveryByOrderId(orderId)
      return delivery?.status || null
    } catch (error) {
      console.warn('Failed to get delivery status:', error)
      return null
    }
  }

  /**
   * Получить информацию о созданных батчах для заказа
   */
  async function getOrderBatches(orderId: string): Promise<any[]> {
    try {
      const delivery = await storageStore.getPlannedDeliveryByOrderId(orderId)
      if (!delivery?.batchIds) return []

      const batches = await Promise.all(delivery.batchIds.map(id => storageStore.getBatchById(id)))

      return batches.filter(batch => batch !== null)
    } catch (error) {
      console.warn('Failed to get order batches:', error)
      return []
    }
  }

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // State
    filters,

    // Computed
    orders,
    currentOrder,
    filteredOrders,
    draftOrders,
    pendingOrders,
    unpaidOrders,
    ordersAwaitingDelivery,
    ordersForReceipt,
    orderStatistics,
    ordersWithPaymentInfo,
    isLoading,

    // CRUD Actions
    fetchOrders,
    createOrderFromBasket,
    createOrder,
    updateOrder,
    deleteOrder,

    // Status Management
    sendOrder,
    markOrderDelivered,
    cancelOrder,
    updatePaymentStatus,

    // AccountStore Integration
    createBillInAccountStore,
    getPaymentInfo,

    // Filtering & Selection
    setCurrentOrder,
    updateFilters,
    clearFilters,

    // Helpers
    getOrderById,
    getOrdersByStatus,
    getOrdersByPaymentStatus,
    getOrdersBySupplier,
    getUniqueRequestIds,
    canEditOrder,
    canDeleteOrder,
    canSendOrder,
    canReceiveOrder,
    isReadyForReceipt,
    hasActiveReceipt,
    calculateOrderTotals,
    getStatusColor,
    getPaymentStatusColor,
    formatCurrency,
    formatDate,
    getOrderAge,
    isOverdueForDelivery,

    // NEW: Исправления для Create Orders
    removeItemsFromSuggestions,
    updateRequestsStatus,
    // ✅ НОВЫЕ exports для интеграции:
    getPlannedDeliveryDate,
    getDeliveryStatus,
    getOrderBatches,
    sendOrderToSupplier,
    getOrderPaymentStatus,
    cancelOrderBills
  }
}
