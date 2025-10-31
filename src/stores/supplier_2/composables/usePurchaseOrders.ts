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
  BillStatus // ДОБАВИТЬ
} from '../types'
import type { Department } from '@/stores/productsStore/types'
import { BILL_STATUSES, getBillStatusColor } from '../types'
import { DebugUtils } from '@/utils'
import { useStorageStore } from '@/stores/storage/storageStore'
import { StorageDepartment } from '@/stores/storage'
const MODULE_NAME = 'usePurchaseOrders'

// =============================================
// COMPOSABLE DEFINITION
// =============================================

export function usePurchaseOrders() {
  // =============================================
  // DEPENDENCIES
  // =============================================

  const supplierStore = useSupplierStore()
  const storageStore = useStorageStore()

  // =============================================
  // STATE
  // =============================================

  const filters = ref<OrderFilters>({
    status: 'all',
    billStatus: 'all', // ИЗМЕНЕНО с paymentStatus
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

    if (filters.value.billStatus !== 'all') {
      filtered = filtered.filter(order => {
        const orderBillStatus = getBillStatus(order)
        return orderBillStatus === filters.value.billStatus
      })
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

  const ordersNeedingBills = computed(() =>
    orders.value.filter(order => ['not_billed', 'billed', 'overdue'].includes(getBillStatus(order)))
  )

  const ordersAwaitingDelivery = computed(() =>
    orders.value.filter(order => order.status === 'sent' && getBillStatus(order) === 'fully_paid')
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

  /**
   * Получить статус счетов для заказа
   */
  function getBillStatus(order: PurchaseOrder): BillStatus {
    // Если billStatus уже установлен, используем его
    if (order.billStatus) {
      return order.billStatus
    }

    // Иначе возвращаем дефолт (позже можно вызвать calculateBillStatus для точного расчета)
    return 'not_billed'
  }

  /**
   * Получить цвет статуса счетов для UI
   */
  function getBillStatusColorForOrder(status: BillStatus): string {
    return getBillStatusColor(status)
  }

  /**
   * Получить текст статуса счетов для UI
   */
  function getBillStatusText(status: BillStatus): string {
    return BILL_STATUSES[status] || status
  }

  // =============================================
  // COMPUTED - Statistics
  // =============================================

  const orderStatistics = computed(() => ({
    total: orders.value.length,
    draft: draftOrders.value.length,
    pending: pendingOrders.value.length,
    needingBills: ordersNeedingBills.value.length, // ИЗМЕНЕНО с unpaid
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

      // ✅ НЕ создаем transit batches при создании draft заказа
      // Они будут созданы при отправке (sendOrder)

      console.log(`PurchaseOrders: Created order ${newOrder.orderNumber}`)
      console.log(`PurchaseOrders: Transit batches will be created when order is sent`)
      return newOrder
    } catch (error) {
      console.error('PurchaseOrders: Error creating order:', error)
      throw error
    }
  }

  /**
   * Асинхронно вычислить статус счетов на основе платежей из AccountStore
   */
  async function calculateBillStatus(order: PurchaseOrder): Promise<BillStatus> {
    try {
      const { useAccountStore } = await import('@/stores/account')
      const accountStore = useAccountStore()

      // ✅ НОВАЯ ЛОГИКА: Проверка инициализации accountStore
      if (!accountStore.state.pendingPayments || accountStore.state.pendingPayments.length === 0) {
        console.warn(
          `AccountStore not initialized, fetching payments for order ${order.orderNumber}`
        )
        await accountStore.fetchPayments()
      }

      // ✅ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Используем новый метод getPaymentsByOrder вместо фильтрации по purchaseOrderId
      const bills = await accountStore.getPaymentsByOrder(order.id)

      if (bills.length === 0) return 'not_billed'

      // ✅ НОВАЯ ЛОГИКА: Подсчет оплаченной суммы через linkedOrders
      const totalPaid = bills
        .filter(bill => bill.status === 'completed')
        .reduce((sum, bill) => {
          // Для каждого completed платежа находим активную привязку к данному заказу
          const orderLink = bill.linkedOrders?.find(
            link => link.orderId === order.id && link.isActive
          )
          return sum + (orderLink?.linkedAmount || 0)
        }, 0)

      // ✅ НОВАЯ ЛОГИКА: Подсчет общей суммы выставленных счетов через linkedOrders
      const totalBilled = bills.reduce((sum, bill) => {
        const orderLink = bill.linkedOrders?.find(
          link => link.orderId === order.id && link.isActive
        )
        return sum + (orderLink?.linkedAmount || 0)
      }, 0)

      // ✅ НОВАЯ ЛОГИКА: Проверка просроченных счетов
      const now = new Date()
      const hasOverdueBills = bills.some(bill => {
        // Проверяем только pending платежи, привязанные к этому заказу
        if (bill.status !== 'pending') return false
        if (!bill.dueDate) return false

        const hasActiveLink = bill.linkedOrders?.some(
          link => link.orderId === order.id && link.isActive
        )

        return hasActiveLink && new Date(bill.dueDate) < now
      })

      // ✅ ПРАВИЛЬНАЯ ЛОГИКА: сравниваем с actualDeliveredAmount или totalAmount заказа
      const orderAmount = order.actualDeliveredAmount || order.totalAmount

      console.log(`Bill status calculation for order ${order.orderNumber}:`, {
        orderId: order.id,
        orderAmount,
        totalBilled,
        totalPaid,
        billsCount: bills.length,
        hasOverdueBills
      })

      // Определяем статус по приоритету
      if (hasOverdueBills) return 'overdue'
      if (totalPaid === 0 && totalBilled > 0) return 'billed'
      if (totalPaid > orderAmount) return 'overpaid'
      if (totalPaid > 0 && totalPaid < orderAmount) return 'partially_paid'
      if (totalPaid >= orderAmount) return 'fully_paid'

      // Если нет счетов или все обнулены
      return 'not_billed'
    } catch (error) {
      console.error('Failed to calculate bill status:', error)
      // ✅ FALLBACK: возвращаем статус из заказа или дефолт
      return order.billStatus || 'not_billed'
    }
  }

  /**
   * ✅ НОВАЯ ФУНКЦИЯ: Получить детальную информацию о платежах заказа для отладки
   */
  async function getOrderPaymentDetails(order: PurchaseOrder): Promise<{
    bills: any[]
    totalBilled: number
    totalPaid: number
    orderAmount: number
    billsBreakdown: Array<{
      billId: string
      billAmount: number
      linkedAmount: number
      status: string
      isOverdue: boolean
    }>
  }> {
    try {
      const { useAccountStore } = await import('@/stores/account')
      const accountStore = useAccountStore()

      await accountStore.fetchPayments()
      const bills = await accountStore.getPaymentsByOrder(order.id)

      const now = new Date()
      const orderAmount = order.actualDeliveredAmount || order.totalAmount

      let totalBilled = 0
      let totalPaid = 0

      const billsBreakdown = bills.map(bill => {
        const orderLink = bill.linkedOrders?.find(
          link => link.orderId === order.id && link.isActive
        )
        const linkedAmount = orderLink?.linkedAmount || 0

        totalBilled += linkedAmount

        if (bill.status === 'completed') {
          totalPaid += linkedAmount
        }

        const isOverdue =
          bill.status === 'pending' && bill.dueDate && new Date(bill.dueDate) < now && !!orderLink

        return {
          billId: bill.id,
          billAmount: bill.amount,
          linkedAmount,
          status: bill.status,
          isOverdue
        }
      })

      return {
        bills,
        totalBilled,
        totalPaid,
        orderAmount,
        billsBreakdown
      }
    } catch (error) {
      console.error('Failed to get order payment details:', error)
      throw error
    }
  }

  /**
   * Обновление статуса заказа в store
   */
  async function updateOrderBillStatus(orderId: string): Promise<void> {
    const order = getOrderById(orderId)
    if (!order) {
      console.warn(`Order not found for bill status update: ${orderId}`)
      return
    }

    try {
      // ✅ ИСПРАВИТЬ: функция теперь async
      const newStatus = await calculateBillStatus(order)

      if (order.billStatus !== newStatus) {
        order.billStatus = newStatus
        order.billStatusCalculatedAt = new Date().toISOString()

        console.log(
          `Bill status updated for ${order.orderNumber}: ${order.billStatus} -> ${newStatus}`
        )

        // ✅ ОПЦИОНАЛЬНО: Сохраняем изменения в supplierStore если нужно
        try {
          await supplierStore.updateOrder(orderId, {
            billStatus: newStatus,
            billStatusCalculatedAt: order.billStatusCalculatedAt
          })
        } catch (error) {
          console.warn('Failed to persist bill status update:', error)
          // Не критично, статус обновлен в локальном состоянии
        }
      }
    } catch (error) {
      console.error(`Failed to update bill status for order ${order.orderNumber}:`, error)
      // Не выбрасываем ошибку, чтобы не блокировать UI
    }
  }

  /**
   * ✅ НОВАЯ функция: Массовое обновление статусов для списка заказов
   */
  async function updateMultipleOrderBillStatuses(orderIds: string[]): Promise<void> {
    console.log(`Updating bill statuses for ${orderIds.length} orders`)

    // Обновляем параллельно, но ограничиваем количество одновременных запросов
    const batchSize = 5
    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batch = orderIds.slice(i, i + batchSize)

      await Promise.allSettled(batch.map(orderId => updateOrderBillStatus(orderId)))

      // Небольшая пауза между батчами для избежания перегрузки
      if (i + batchSize < orderIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    console.log(`Finished updating bill statuses for ${orderIds.length} orders`)
  }

  /**
   * ✅ НОВАЯ функция: Принудительное обновление всех статусов
   */
  async function refreshAllBillStatuses(): Promise<void> {
    try {
      console.log('Starting full bill status refresh...')

      // Получаем все заказы со статусом 'sent' (которые могут иметь счета)
      const ordersToUpdate = orders.value
        .filter(order => order.status === 'sent')
        .map(order => order.id)

      if (ordersToUpdate.length === 0) {
        console.log('No orders to update')
        return
      }

      await updateMultipleOrderBillStatuses(ordersToUpdate)
      console.log('Bill status refresh completed')
    } catch (error) {
      console.error('Failed to refresh all bill statuses:', error)
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

      const itemsWithoutPackages = basket.items.filter(item => !item.packageId)
      if (itemsWithoutPackages.length > 0) {
        throw new Error(
          `Cannot create order: ${itemsWithoutPackages.length} items missing package selection. ` +
            `Please select packages for all items before creating order.`
        )
      }
      const requestIds = getUniqueRequestIds(basket)

      const orderData: CreateOrderData = {
        supplierId: basket.supplierId,
        requestIds,
        items: basket.items.map(item => ({
          itemId: item.itemId,
          quantity: item.totalQuantity,
          packageId: item.packageId!,
          // ❌ УДАЛИТЬ: department
          pricePerUnit: item.estimatedBaseCost
        })),
        notes: `Order created from ${requestIds.length} procurement request(s)`
      }

      const newOrder = await supplierStore.createOrder(orderData)

      removeItemsFromSuggestions(basket.items)
      await updateRequestsStatusConditionally(requestIds, basket.items)

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
      const sentOrder = await updateOrder(id, {
        status: 'sent',
        sentDate: new Date().toISOString()
      })

      // ✅ УПРОЩЕННАЯ ВЕРСИЯ: без department
      try {
        const transitBatchData = sentOrder.items.map(item => ({
          itemId: item.itemId,
          itemName: item.itemName,
          quantity: item.orderedQuantity,
          unit: item.unit,
          estimatedCostPerUnit: item.pricePerUnit,
          // ❌ УДАЛИТЬ: department
          purchaseOrderId: sentOrder.id,
          supplierId: sentOrder.supplierId,
          supplierName: sentOrder.supplierName,
          plannedDeliveryDate:
            sentOrder.expectedDeliveryDate || calculateDefaultDeliveryDate(sentOrder),
          notes: `Transit batch from order ${sentOrder.orderNumber}`
        }))

        const batchIds = await storageStore.createTransitBatches(transitBatchData)

        console.log(`PurchaseOrders: Transit batches created successfully`, {
          orderId: sentOrder.id,
          batchesCreated: batchIds.length,
          batchIds
        })
      } catch (transitError) {
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
        await storageStore.removeTransitBatchesOnOrderCancel(id)
        console.log(`PurchaseOrders: Transit batches removed for cancelled order`)
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
   * Определяет департамент из заказа
   */
  function getDepartmentFromOrder(order: PurchaseOrder): StorageDepartment {
    // TODO: Можно улучшить логику определения департамента
    return 'kitchen'
  }

  /**
   * Вычисляет дату поставки по умолчанию (через 5 дней)
   */
  function calculateDefaultDeliveryDate(order: PurchaseOrder): string {
    const orderDate = new Date(order.orderDate)
    const deliveryDate = new Date(orderDate)
    deliveryDate.setDate(deliveryDate.getDate() + 5)
    return deliveryDate.toISOString()
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
        billStatus: 'billed' // ВМЕСТО paymentStatus: 'pending'
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
      billStatus: 'all',
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
   * Get orders by bill status
   */
  function getOrdersByBillStatus(billStatus: BillStatus): PurchaseOrder[] {
    return orders.value.filter(order => getBillStatus(order) === billStatus)
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
  function getBillStatusColorWrapper(status: string): string {
    // Для обратной совместимости
    if (status === 'pending') return 'warning'
    if (status === 'paid') return 'success'

    return getBillStatusColor(status as BillStatus)
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
    ordersNeedingBills,
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
    getOrdersByBillStatus,
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
    formatCurrency,
    formatDate,
    getOrderAge,
    isOverdueForDelivery,

    // ✅ ДОБАВИТЬ эти три метода:
    getBillStatus,
    getBillStatusColorForOrder,
    getBillStatusText,
    calculateBillStatus,
    updateOrderBillStatus,
    updateMultipleOrderBillStatuses,
    refreshAllBillStatuses,
    getOrderPaymentDetails,

    // Integration helpers
    getOrderPaymentStatus,
    cancelOrderBills,
    sendOrderToSupplier,

    // Storage integration
    getPlannedDeliveryDate,
    getDeliveryStatus,
    getOrderBatches,

    // Request management
    removeItemsFromSuggestions,
    updateRequestsStatus
  }
}
