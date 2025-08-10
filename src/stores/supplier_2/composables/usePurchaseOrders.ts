// src/stores/supplier_2/composables/usePurchaseOrders.ts

import { ref, computed } from 'vue'
import { useSupplierStore } from '../supplierStore'
import type {
  PurchaseOrder,
  CreateOrderData,
  UpdateOrderData,
  OrderFilters,
  SupplierBasket
} from '../types'

export function usePurchaseOrders() {
  const supplierStore = useSupplierStore()

  // =============================================
  // STATE
  // =============================================

  const filters = ref<OrderFilters>({
    status: 'all',
    paymentStatus: 'all',
    supplier: 'all'
  })

  // =============================================
  // COMPUTED
  // =============================================

  // ИСПРАВЛЕНИЕ: Безопасный доступ к данным store
  const orders = computed(() => {
    return Array.isArray(supplierStore.state.orders) ? supplierStore.state.orders : []
  })

  const currentOrder = computed(() => supplierStore.state.currentOrder)
  const isLoading = computed(() => supplierStore.state.loading.orders)

  const filteredOrders = computed(() => {
    return orders.value.filter(order => {
      if (
        filters.value.status &&
        filters.value.status !== 'all' &&
        order.status !== filters.value.status
      ) {
        return false
      }
      if (
        filters.value.paymentStatus &&
        filters.value.paymentStatus !== 'all' &&
        order.paymentStatus !== filters.value.paymentStatus
      ) {
        return false
      }
      if (
        filters.value.supplier &&
        filters.value.supplier !== 'all' &&
        order.supplierId !== filters.value.supplier
      ) {
        return false
      }
      return true
    })
  })

  const draftOrders = computed(() => orders.value.filter(order => order.status === 'draft'))
  const pendingOrders = computed(() =>
    orders.value.filter(order => order.paymentStatus === 'pending')
  )
  const unpaidOrders = computed(() =>
    orders.value.filter(order => order.paymentStatus === 'pending')
  )

  const ordersAwaitingDelivery = computed(() =>
    orders.value.filter(
      order => ['sent', 'confirmed'].includes(order.status) && order.paymentStatus === 'paid'
    )
  )

  const ordersForReceipt = computed(() =>
    orders.value.filter(
      order =>
        ['sent', 'confirmed'].includes(order.status) &&
        !supplierStore.state.receipts.some(
          receipt => receipt.purchaseOrderId === order.id && receipt.status === 'completed'
        )
    )
  )

  const orderStatistics = computed(() => ({
    total: orders.value.length,
    draft: draftOrders.value.length,
    sent: orders.value.filter(o => o.status === 'sent').length,
    confirmed: orders.value.filter(o => o.status === 'confirmed').length,
    delivered: orders.value.filter(o => o.status === 'delivered').length,
    cancelled: orders.value.filter(o => o.status === 'cancelled').length,
    unpaid: unpaidOrders.value.length,
    awaitingDelivery: ordersAwaitingDelivery.value.length
  }))

  // Orders with payment status (integrated with AccountStore)
  const ordersWithPaymentInfo = computed(() => {
    return orders.value.map(order => ({
      ...order,
      paymentInfo: getPaymentInfo(order.billId) // This would come from AccountStore integration
    }))
  })

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
   * Create order from supplier basket
   */
  async function createOrderFromBasket(basket: SupplierBasket): Promise<PurchaseOrder> {
    if (!basket.supplierId) {
      throw new Error('Cannot create order from unassigned basket')
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

      // Auto-create bill in AccountStore
      await createBillInAccountStore(newOrder)

      console.log(`PurchaseOrders: Created order ${newOrder.orderNumber}`)
      return newOrder
    } catch (error) {
      console.error('PurchaseOrders: Error creating order from basket:', error)
      throw error
    }
  }

  /**
   * Create order manually
   */
  async function createOrder(data: CreateOrderData): Promise<PurchaseOrder> {
    try {
      console.log('PurchaseOrders: Creating order', data)
      const newOrder = await supplierStore.createOrder(data)

      // Auto-create bill in AccountStore
      await createBillInAccountStore(newOrder)

      console.log(`PurchaseOrders: Created order ${newOrder.orderNumber}`)
      return newOrder
    } catch (error) {
      console.error('PurchaseOrders: Error creating order:', error)
      throw error
    }
  }

  /**
   * Update order
   */
  async function updateOrder(id: string, data: UpdateOrderData): Promise<PurchaseOrder> {
    try {
      console.log(`PurchaseOrders: Updating order ${id}`, data)
      const updatedOrder = await supplierStore.updateOrder(id, data)
      console.log(`PurchaseOrders: Updated order ${id}`)
      return updatedOrder
    } catch (error) {
      console.error('PurchaseOrders: Error updating order:', error)
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
    return updateOrder(id, { status: 'sent' })
  }

  /**
   * Mark order as confirmed by supplier
   */
  async function confirmOrder(id: string): Promise<PurchaseOrder> {
    return updateOrder(id, { status: 'confirmed' })
  }

  /**
   * Mark order as delivered
   */
  async function markOrderDelivered(id: string): Promise<PurchaseOrder> {
    return updateOrder(id, { status: 'delivered' })
  }

  /**
   * Cancel order
   */
  async function cancelOrder(id: string): Promise<PurchaseOrder> {
    return updateOrder(id, { status: 'cancelled' })
  }

  /**
   * Update payment status
   */
  async function updatePaymentStatus(
    id: string,
    paymentStatus: PurchaseOrder['paymentStatus']
  ): Promise<PurchaseOrder> {
    return updateOrder(id, { paymentStatus })
  }

  // =============================================
  // ACTIONS - AccountStore Integration
  // =============================================

  /**
   * Create bill in AccountStore (auto-called when order is created)
   */
  async function createBillInAccountStore(order: PurchaseOrder) {
    try {
      console.log(`PurchaseOrders: Creating bill for order ${order.orderNumber}`)

      // This would be the actual integration with AccountStore
      // const billData: CreateBillInAccountStore = {
      //   counteragentId: order.supplierId,
      //   counteragentName: order.supplierName,
      //   amount: order.totalAmount,
      //   description: `Заказ ${order.orderNumber}`,
      //   category: 'supplier',
      //   invoiceNumber: order.orderNumber,
      //   purchaseOrderId: order.id,
      //   priority: 'medium',
      //   createdBy: getCurrentUser()
      // }
      //
      // const bill = await accountStore.createPayment(billData)
      // order.billId = bill.id

      // For now, simulate bill creation
      const mockBillId = `bill-${Date.now()}`
      await updateOrder(order.id, { billId: mockBillId })

      console.log(`PurchaseOrders: Created bill ${mockBillId} for order ${order.orderNumber}`)
    } catch (error) {
      console.error('PurchaseOrders: Error creating bill:', error)
      throw error
    }
  }

  /**
   * Get payment info from AccountStore
   */
  function getPaymentInfo(billId?: string) {
    if (!billId) return null

    // This would come from AccountStore integration
    // return accountStore.getPaymentById(billId)

    // Mock payment info for now
    return {
      id: billId,
      status: Math.random() > 0.5 ? 'pending' : 'completed',
      amount: Math.floor(Math.random() * 1000000),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  // =============================================
  // ACTIONS - Filtering & Selection
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
      supplier: 'all'
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
  function getOrdersByStatus(status: PurchaseOrder['status']): PurchaseOrder[] {
    return orders.value.filter(order => order.status === status)
  }

  /**
   * Get orders by payment status
   */
  function getOrdersByPaymentStatus(
    paymentStatus: PurchaseOrder['paymentStatus']
  ): PurchaseOrder[] {
    return orders.value.filter(order => order.paymentStatus === paymentStatus)
  }

  /**
   * Get orders by supplier
   */
  function getOrdersBySupplier(supplierId: string): PurchaseOrder[] {
    return orders.value.filter(order => order.supplierId === supplierId)
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
    return ['sent', 'confirmed'].includes(order.status) && order.paymentStatus === 'paid'
  }

  /**
   * Check if order is ready for receipt
   */
  function isReadyForReceipt(order: PurchaseOrder): boolean {
    return canReceiveOrder(order) && !hasActiveReceipt(order.id)
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

  /**
   * Calculate order totals
   */
  function calculateOrderTotals(order: PurchaseOrder) {
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.orderedQuantity * item.pricePerUnit,
      0
    )

    // Could add tax, discount logic here
    const tax = 0 // No tax for now
    const discount = 0 // No discount for now
    const total = subtotal + tax - discount

    return {
      subtotal,
      tax,
      discount,
      total,
      isEstimated: order.isEstimatedTotal
    }
  }

  /**
   * Get status color for UI
   */
  function getStatusColor(status: PurchaseOrder['status']): string {
    switch (status) {
      case 'draft':
        return 'grey'
      case 'sent':
        return 'blue'
      case 'confirmed':
        return 'orange'
      case 'delivered':
        return 'green'
      case 'cancelled':
        return 'red'
      default:
        return 'default'
    }
  }

  /**
   * Get payment status color for UI
   */
  function getPaymentStatusColor(paymentStatus: PurchaseOrder['paymentStatus']): string {
    switch (paymentStatus) {
      case 'pending':
        return 'orange'
      case 'paid':
        return 'green'
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
    return Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
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

  // =============================================
  // INITIALIZATION - УБИРАЕМ АВТОЗАГРУЗКУ
  // =============================================

  // ИСПРАВЛЕНИЕ: Убираем автозагрузку из синхронного кода

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
    confirmOrder,
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
    isOverdueForDelivery
  }
}
