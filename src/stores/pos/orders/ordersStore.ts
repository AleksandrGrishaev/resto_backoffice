// src/stores/pos/orders/ordersStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PosOrder,
  PosBill,
  PosBillItem,
  OrderFilters,
  ServiceResponse,
  OrderType,
  OrderStatus,
  PosMenuItem
} from '../types'
import type { MenuItemVariant } from '@/stores/menu'
import { OrdersService } from './services'
import {
  useOrdersComposables,
  recalculateOrderTotals as recalcOrderTotals,
  calculateOrderStatus as calcOrderStatus,
  determineStatusByOrderType as determineStatus
} from './composables'
import { usePosTablesStore } from '../tables/tablesStore'
import {
  discountService,
  discountSupabaseService,
  type ApplyItemDiscountParams,
  type ApplyBillDiscountParams,
  type DiscountResult
} from '@/stores/discounts/services'

export const usePosOrdersStore = defineStore('posOrders', () => {
  // ===== STATE =====
  const orders = ref<PosOrder[]>([])
  const currentOrderId = ref<string | null>(null)
  const activeBillId = ref<string | null>(null)

  // Selection state (SHARED ACROSS ALL COMPONENTS)
  const selectedItems = ref<Set<string>>(new Set())
  const selectedBills = ref<Set<string>>(new Set())

  const loading = ref({
    list: false,
    create: false,
    update: false,
    delete: false
  })
  const error = ref<string | null>(null)
  const filters = ref<OrderFilters>({})

  // ===== SERVICES =====
  const ordersService = new OrdersService()
  const tablesStore = usePosTablesStore()

  // ===== COMPUTED =====
  const currentOrder = computed(() =>
    currentOrderId.value ? orders.value.find(order => order.id === currentOrderId.value) : null
  )

  const activeBill = computed(() => {
    if (!activeBillId.value || !currentOrder.value) return null
    return currentOrder.value.bills.find(bill => bill.id === activeBillId.value) || null
  })

  const activeOrders = computed(() => {
    const finalStatuses = ['served', 'collected', 'delivered', 'cancelled']
    return orders.value.filter(
      order =>
        !finalStatuses.includes(order.status) ||
        (finalStatuses.includes(order.status) && order.paymentStatus !== 'paid')
    )
  })

  const todayOrders = computed(() => {
    const today = new Date().toISOString().split('T')[0]
    return orders.value.filter(order => order.createdAt.startsWith(today))
  })

  const filteredOrders = computed(() => {
    let result = [...orders.value]

    if (filters.value.type) {
      result = result.filter(order => order.type === filters.value.type)
    }

    if (filters.value.status) {
      result = result.filter(order => order.status === filters.value.status)
    }

    if (filters.value.tableId) {
      result = result.filter(order => order.tableId === filters.value.tableId)
    }

    if (filters.value.search) {
      const search = filters.value.search.toLowerCase()
      result = result.filter(
        order =>
          order.orderNumber.toLowerCase().includes(search) ||
          order.customerName?.toLowerCase().includes(search) ||
          order.notes?.toLowerCase().includes(search)
      )
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  const ordersStats = computed(() => ({
    total: orders.value.length,
    active: activeOrders.value.length,
    today: todayOrders.value.length,
    todayRevenue: todayOrders.value.reduce((sum, order) => sum + order.finalAmount, 0),
    averageOrderValue:
      todayOrders.value.length > 0
        ? todayOrders.value.reduce((sum, order) => sum + order.finalAmount, 0) /
          todayOrders.value.length
        : 0
  }))

  // ===== ACTIONS =====
  async function saveAndNotifyOrder(
    orderId: string,
    tableNumber?: string
  ): Promise<ServiceResponse<{ order: PosOrder; notificationsSent: boolean }>> {
    try {
      const response = await ordersService.saveAndNotifyOrder(orderId, tableNumber)

      if (response.success && response.data) {
        // Обновляем заказ в store
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          orders.value[orderIndex] = response.data.order
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save and notify'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }
  /**
   * Загрузить все заказы
   */
  async function loadOrders(): Promise<ServiceResponse<PosOrder[]>> {
    loading.value.list = true
    error.value = null

    try {
      const response = await ordersService.getAllOrders()

      if (response.success && response.data) {
        // Initialize payment fields for existing orders
        response.data.forEach(order => {
          if (!order.paymentIds) order.paymentIds = []
          if (order.paidAmount === undefined) order.paidAmount = 0
        })

        orders.value = response.data
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load orders'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.list = false
    }
  }

  /**
   * Создать новый заказ
   */
  async function createOrder(
    type: OrderType,
    tableId?: string,
    customerName?: string
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      loading.value.create = true
      error.value = null

      // ✅ CRITICAL: Check for active shift before creating order
      const { useShiftsStore } = await import('../shifts/shiftsStore')
      const shiftsStore = useShiftsStore()

      if (!shiftsStore.currentShift || shiftsStore.currentShift.status !== 'active') {
        return {
          success: false,
          error: 'Cannot create order: No active shift. Please start a shift first.'
        }
      }

      const response = await ordersService.createOrder(type, tableId, customerName)

      if (response.success && response.data) {
        // ДОБАВИТЬ: устанавливаем дефолтный paymentStatus если не установлен
        if (!response.data.paymentStatus) {
          response.data.paymentStatus = 'unpaid'
        }

        orders.value.unshift(response.data)

        // Автоматически выбираем новый заказ
        selectOrder(response.data.id)

        // Автоматически создаем первый счет если нужно
        if (response.data.bills.length === 0) {
          const billName =
            type === 'dine_in' ? 'Bill 1' : type === 'takeaway' ? 'Takeaway Bill' : 'Delivery Bill'

          const billResult = await addBillToOrder(response.data.id, billName)

          if (billResult.success) {
            console.log('✅ Auto-created first bill for new order')
          }
        }

        // ДОБАВИТЬ: устанавливаем paymentStatus для всех счетов если не установлен
        response.data.bills.forEach(bill => {
          if (!bill.paymentStatus) {
            bill.paymentStatus = 'unpaid'
          }
          // Также устанавливаем paymentStatus для всех позиций
          bill.items.forEach(item => {
            if (!('paymentStatus' in item)) {
              ;(item as any).paymentStatus = 'unpaid'
            }
          })
        })
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create order'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.create = false
    }
  }

  /**
   * Выбрать текущий заказ - ОБНОВЛЕНО
   */
  function selectOrder(orderId: string): void {
    console.log('📋 OrdersStore - Selecting order:', { orderId })

    currentOrderId.value = orderId
    const order = orders.value.find(o => o.id === orderId)

    if (order && order.bills.length > 0) {
      // Выбираем первый активный счет автоматически
      const activeBill = order.bills.find(b => b.status === 'active')
      const targetBillId = activeBill?.id || order.bills[0].id

      activeBillId.value = targetBillId

      console.log('✅ OrdersStore - Auto-selected first bill:', {
        orderId,
        billId: targetBillId,
        billsCount: order.bills.length
      })
    } else {
      // Если нет счетов, очищаем активный счет
      activeBillId.value = null
    }
  }

  /**
   * Выбрать активный счет - ОБНОВЛЕНО
   */
  function selectBill(billId: string): void {
    activeBillId.value = billId
  }

  /**
   * Добавить новый счет к заказу
   */
  async function addBillToOrder(
    orderId: string,
    billName: string = 'Счет'
  ): Promise<ServiceResponse<PosBill>> {
    try {
      const response = await ordersService.addBillToOrder(orderId, billName)

      if (response.success && response.data) {
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          orders.value[orderIndex].bills.push(response.data)
          activeBillId.value = response.data.id
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add bill'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Rename a bill
   */
  async function renameBill(
    orderId: string,
    billId: string,
    newName: string
  ): Promise<ServiceResponse<PosBill>> {
    try {
      const orderIndex = orders.value.findIndex(o => o.id === orderId)
      if (orderIndex === -1) {
        return { success: false, error: 'Order not found' }
      }

      const order = orders.value[orderIndex]
      const billIndex = order.bills.findIndex(b => b.id === billId)
      if (billIndex === -1) {
        return { success: false, error: 'Bill not found' }
      }

      // Update locally
      order.bills[billIndex].name = newName

      // Save to database
      const saveResponse = await ordersService.updateOrder(order)
      if (!saveResponse.success) {
        console.error(
          '❌ [ordersStore] Failed to save order after bill rename:',
          saveResponse.error
        )
        // Note: local state is already updated, but DB save failed
      } else {
        console.log('✏️ [ordersStore] Bill renamed:', {
          orderId,
          billId,
          newName,
          savedToDb: true
        })
      }

      return { success: true, data: order.bills[billIndex] }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to rename bill'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Remove a bill from order
   */
  async function removeBill(orderId: string, billId: string): Promise<ServiceResponse<void>> {
    try {
      const orderIndex = orders.value.findIndex(o => o.id === orderId)
      if (orderIndex === -1) {
        return { success: false, error: 'Order not found' }
      }

      const order = orders.value[orderIndex]

      // Cannot remove if only one bill left
      if (order.bills.length <= 1) {
        return { success: false, error: 'Cannot remove the last bill' }
      }

      const billIndex = order.bills.findIndex(b => b.id === billId)
      if (billIndex === -1) {
        return { success: false, error: 'Bill not found' }
      }

      const bill = order.bills[billIndex]

      // Cannot remove bill with paid items
      if (bill.paymentStatus === 'paid') {
        return { success: false, error: 'Cannot remove a paid bill' }
      }

      // Cannot remove bill with items (must be empty)
      if (bill.items.length > 0) {
        return {
          success: false,
          error: 'Cannot remove bill with items. Move or remove items first.'
        }
      }

      // Remove the bill locally
      order.bills.splice(billIndex, 1)

      // If active bill was removed, select another one
      if (activeBillId.value === billId) {
        activeBillId.value = order.bills[0]?.id || null
      }

      // Recalculate order totals and status
      recalculateOrderTotals(orderId)

      // Save to database
      const saveResponse = await ordersService.updateOrder(order)
      if (!saveResponse.success) {
        console.error(
          '❌ [ordersStore] Failed to save order after bill removal:',
          saveResponse.error
        )
        // Note: local state is already updated, but DB save failed
      }

      console.log('🗑️ [ordersStore] Bill removed:', {
        orderId,
        billId,
        remainingBills: order.bills.length,
        savedToDb: saveResponse.success
      })

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove bill'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Добавить товар в счет
   */
  async function addItemToBill(
    orderId: string,
    billId: string,
    menuItem: PosMenuItem,
    selectedVariant: MenuItemVariant,
    quantity: number = 1,
    modifications: any[] = [], // DEPRECATED: для обратной совместимости
    selectedModifiers?: import('@/stores/menu/types').SelectedModifier[] // NEW: модификаторы из menu system
  ): Promise<ServiceResponse<PosBillItem>> {
    try {
      // ✅ CRITICAL: Check for active shift before adding items
      const { useShiftsStore } = await import('../shifts/shiftsStore')
      const shiftsStore = useShiftsStore()

      if (!shiftsStore.currentShift || shiftsStore.currentShift.status !== 'active') {
        return {
          success: false,
          error: 'Cannot add items: No active shift. Please start a shift first.'
        }
      }

      const response = await ordersService.addItemToBill(
        orderId,
        billId,
        menuItem,
        selectedVariant,
        quantity,
        modifications,
        selectedModifiers
      )

      if (response.success && response.data) {
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          const billIndex = orders.value[orderIndex].bills.findIndex(b => b.id === billId)
          if (billIndex !== -1) {
            orders.value[orderIndex].bills[billIndex].items.push(response.data)
            // Пересчитать суммы заказа (автоматически обновит статус стола)
            await recalculateOrderTotals(orderId)
          }
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add item'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Обновить количество товара в счете
   */
  async function updateItemQuantity(
    orderId: string,
    billId: string,
    itemId: string,
    quantity: number
  ): Promise<ServiceResponse<PosBillItem>> {
    try {
      // ✅ CRITICAL: Check for active shift before updating items
      const { useShiftsStore } = await import('../shifts/shiftsStore')
      const shiftsStore = useShiftsStore()

      if (!shiftsStore.currentShift || shiftsStore.currentShift.status !== 'active') {
        return {
          success: false,
          error: 'Cannot update items: No active shift. Please start a shift first.'
        }
      }

      // Проверяем минимальное количество
      if (quantity < 1) {
        return {
          success: false,
          error: 'Quantity must be at least 1. Use removeItem to delete.'
        }
      }

      const response = await ordersService.updateItemQuantity(itemId, quantity)

      if (response.success && response.data) {
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          const billIndex = orders.value[orderIndex].bills.findIndex(b => b.id === billId)
          if (billIndex !== -1) {
            const itemIndex = orders.value[orderIndex].bills[billIndex].items.findIndex(
              i => i.id === itemId
            )
            if (itemIndex !== -1) {
              orders.value[orderIndex].bills[billIndex].items[itemIndex] = response.data
              await recalculateOrderTotals(orderId)
            }
          }
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update item quantity'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Обновить заметку к товару в счете
   */
  async function updateItemNote(
    orderId: string,
    billId: string,
    itemId: string,
    note: string
  ): Promise<ServiceResponse<PosBillItem>> {
    try {
      // ✅ CRITICAL: Check for active shift before updating items
      const { useShiftsStore } = await import('../shifts/shiftsStore')
      const shiftsStore = useShiftsStore()

      if (!shiftsStore.currentShift || shiftsStore.currentShift.status !== 'active') {
        return {
          success: false,
          error: 'Cannot update items: No active shift. Please start a shift first.'
        }
      }

      const response = await ordersService.updateItemNote(itemId, note)

      if (response.success && response.data) {
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          const billIndex = orders.value[orderIndex].bills.findIndex(b => b.id === billId)
          if (billIndex !== -1) {
            const itemIndex = orders.value[orderIndex].bills[billIndex].items.findIndex(
              i => i.id === itemId
            )
            if (itemIndex !== -1) {
              orders.value[orderIndex].bills[billIndex].items[itemIndex] = response.data
            }
          }
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update item note'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Удалить товар из счета - ОБНОВЛЕНО
   */
  async function removeItemFromBill(
    orderId: string,
    billId: string,
    itemId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // ✅ CRITICAL: Check for active shift before removing items
      const { useShiftsStore } = await import('../shifts/shiftsStore')
      const shiftsStore = useShiftsStore()

      if (!shiftsStore.currentShift || shiftsStore.currentShift.status !== 'active') {
        return {
          success: false,
          error: 'Cannot remove items: No active shift. Please start a shift first.'
        }
      }

      const response = await ordersService.removeItemFromBill(itemId)

      if (response.success) {
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          const billIndex = orders.value[orderIndex].bills.findIndex(b => b.id === billId)
          if (billIndex !== -1) {
            const itemIndex = orders.value[orderIndex].bills[billIndex].items.findIndex(
              i => i.id === itemId
            )
            if (itemIndex !== -1) {
              orders.value[orderIndex].bills[billIndex].items.splice(itemIndex, 1)

              // Пересчитать суммы заказа (автоматически обновит статус стола)
              await recalculateOrderTotals(orderId)
            }
          }
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove item'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Cancel item (mark as cancelled, keep in order for audit trail)
   * For items that have been sent to kitchen (waiting, cooking, ready)
   */
  async function cancelItem(
    orderId: string,
    billId: string,
    itemId: string,
    cancellationData: {
      reason: string
      notes?: string
      cancelledBy: string
      writeOffOperationId?: string
    }
  ): Promise<ServiceResponse<void>> {
    try {
      // Check for active shift
      const { useShiftsStore } = await import('../shifts/shiftsStore')
      const shiftsStore = useShiftsStore()

      if (!shiftsStore.currentShift || shiftsStore.currentShift.status !== 'active') {
        return {
          success: false,
          error: 'Cannot cancel items: No active shift. Please start a shift first.'
        }
      }

      // Find the item to validate its status
      const order = orders.value.find(o => o.id === orderId)
      if (!order) {
        return { success: false, error: 'Order not found' }
      }

      const bill = order.bills.find(b => b.id === billId)
      if (!bill) {
        return { success: false, error: 'Bill not found' }
      }

      const item = bill.items.find(i => i.id === itemId)
      if (!item) {
        return { success: false, error: 'Item not found' }
      }

      // Validate item status - cannot cancel served or paid items
      if (item.status === 'served') {
        return { success: false, error: 'Cannot cancel served items' }
      }

      if (item.paymentStatus === 'paid') {
        return { success: false, error: 'Cannot cancel paid items' }
      }

      // Call service to update in DB
      const response = await ordersService.cancelItem(itemId, cancellationData)

      if (response.success) {
        // Update local state
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          const billIndex = orders.value[orderIndex].bills.findIndex(b => b.id === billId)
          if (billIndex !== -1) {
            const itemIndex = orders.value[orderIndex].bills[billIndex].items.findIndex(
              i => i.id === itemId
            )
            if (itemIndex !== -1) {
              const cancelledAt = new Date().toISOString()
              orders.value[orderIndex].bills[billIndex].items[itemIndex] = {
                ...orders.value[orderIndex].bills[billIndex].items[itemIndex],
                status: 'cancelled',
                cancelledAt,
                cancelledBy: cancellationData.cancelledBy,
                cancellationReason: cancellationData.reason as any,
                cancellationNotes: cancellationData.notes,
                writeOffOperationId: cancellationData.writeOffOperationId
              }

              // Recalculate order totals
              await recalculateOrderTotals(orderId)
            }
          }
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel item'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Update write-off operation ID on a cancelled item (called after background write-off completes)
   */
  async function updateItemWriteOffId(
    orderId: string,
    billId: string,
    itemId: string,
    writeOffOperationId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Update in database
      const response = await ordersService.updateItemWriteOffId(itemId, writeOffOperationId)

      if (response.success) {
        // Update local state
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          const billIndex = orders.value[orderIndex].bills.findIndex(b => b.id === billId)
          if (billIndex !== -1) {
            const itemIndex = orders.value[orderIndex].bills[billIndex].items.findIndex(
              i => i.id === itemId
            )
            if (itemIndex !== -1) {
              orders.value[orderIndex].bills[billIndex].items[itemIndex].writeOffOperationId =
                writeOffOperationId
            }
          }
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update write-off ID'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Отправить заказ на кухню - ОБНОВЛЕНО для поддержки конкретных элементов
   */
  async function sendOrderToKitchen(
    orderId: string,
    itemIds?: string[]
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      // Если itemIds не указаны, отправляем весь заказ
      const response =
        itemIds && itemIds.length > 0
          ? await ordersService.sendItemsToKitchen(orderId, itemIds)
          : await ordersService.sendOrderToKitchen(orderId)

      if (response.success && response.data) {
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          orders.value[orderIndex] = response.data
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send order to kitchen'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Закрыть заказ (после оплаты)
   */
  async function closeOrder(orderId: string): Promise<ServiceResponse<PosOrder>> {
    try {
      const response = await ordersService.closeOrder(orderId)

      if (response.success && response.data) {
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          orders.value[orderIndex] = response.data

          // Освободить стол если заказ был за столом
          if (response.data.tableId) {
            await tablesStore.freeTable(response.data.tableId)
          }

          // Очистить текущий заказ если это был он
          if (currentOrderId.value === orderId) {
            currentOrderId.value = null
            activeBillId.value = null
          }
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to close order'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Complete order after payment (for delivery/takeaway orders)
   *
   * Workflow:
   * 1. Verify order is paid and is delivery or takeaway
   * 2. Set order status to 'delivered' or 'collected' (final status)
   * 3. Keep order in history with paymentStatus 'paid'
   */
  async function completeOrder(orderId: string): Promise<ServiceResponse<PosOrder>> {
    try {
      const order = orders.value.find(o => o.id === orderId)

      if (!order) {
        return { success: false, error: 'Order not found' }
      }

      if (order.type === 'dine_in') {
        return { success: false, error: 'Use releaseTable for dine-in orders' }
      }

      if (order.paymentStatus !== 'paid') {
        return { success: false, error: 'Order must be fully paid before completing' }
      }

      console.log('📦 [ordersStore] Completing order:', {
        orderId,
        orderType: order.type,
        currentStatus: order.status,
        paymentStatus: order.paymentStatus
      })

      // Update order status to final status based on type
      if (order.type === 'delivery') {
        order.status = 'delivered'
      } else if (order.type === 'takeaway') {
        order.status = 'collected'
      }
      order.updatedAt = new Date().toISOString()

      // Save updated order
      const updateResponse = await updateOrder(order)
      if (!updateResponse.success) {
        return updateResponse
      }

      console.log('✅ [ordersStore] Order completed successfully:', {
        orderId,
        newStatus: order.status
      })

      return {
        success: true,
        data: order
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete order'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Delete an empty order (for takeaway/delivery only)
   *
   * Conditions:
   * 1. Order must be takeaway or delivery (not dine_in)
   * 2. Order must have no items or only draft/cancelled items
   * 3. Order must not have any paid items
   */
  async function deleteOrder(orderId: string): Promise<ServiceResponse<void>> {
    try {
      const order = orders.value.find(o => o.id === orderId)

      if (!order) {
        return { success: false, error: 'Order not found' }
      }

      // Only allow deleting takeaway/delivery orders
      if (order.type === 'dine_in') {
        return {
          success: false,
          error: 'Cannot delete dine-in orders. Use table management instead.'
        }
      }

      // Check if order has any non-deletable items
      const allItems = order.bills.flatMap(bill => bill.items)
      const hasActiveItems = allItems.some(
        item => !['draft', 'cancelled'].includes(item.status) || item.paymentStatus === 'paid'
      )

      if (hasActiveItems) {
        return {
          success: false,
          error: 'Cannot delete order with active or paid items'
        }
      }

      console.log('🗑️ [ordersStore] Deleting order:', {
        orderId,
        orderType: order.type,
        itemsCount: allItems.length
      })

      // Delete from service (Supabase + localStorage)
      const deleteResponse = await ordersService.deleteOrder(orderId)
      if (!deleteResponse.success) {
        return deleteResponse
      }

      // Remove from local state
      const orderIndex = orders.value.findIndex(o => o.id === orderId)
      if (orderIndex !== -1) {
        orders.value.splice(orderIndex, 1)
      }

      // Clear current order if it was deleted
      if (currentOrderId.value === orderId) {
        currentOrderId.value = null
        activeBillId.value = null
      }

      console.log('✅ [ordersStore] Order deleted successfully:', orderId)

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete order'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Release table after order is paid (manual table release)
   *
   * Workflow:
   * 1. Verify order is paid and is dine-in with a table
   * 2. Set order status to 'served' (guests have left)
   * 3. Free the table (set status to 'free', clear currentOrderId)
   * 4. Keep order in history with paymentStatus 'paid'
   */
  async function releaseTable(orderId: string): Promise<ServiceResponse<PosOrder>> {
    try {
      const order = orders.value.find(o => o.id === orderId)

      if (!order) {
        return { success: false, error: 'Order not found' }
      }

      if (order.type !== 'dine_in') {
        return { success: false, error: 'Only dine-in orders can release tables' }
      }

      if (!order.tableId) {
        return { success: false, error: 'Order has no table assigned' }
      }

      if (order.paymentStatus !== 'paid') {
        return { success: false, error: 'Order must be fully paid before releasing table' }
      }

      console.log('🍽️ [ordersStore] Releasing table:', {
        orderId,
        tableId: order.tableId,
        currentStatus: order.status,
        paymentStatus: order.paymentStatus
      })

      // Update order status to 'served' (final status for dine-in)
      order.status = 'served'
      order.updatedAt = new Date().toISOString()

      // Save updated order
      const updateResponse = await updateOrder(order)
      if (!updateResponse.success) {
        return updateResponse
      }

      // Free the table
      const tableResponse = await tablesStore.freeTable(order.tableId)
      if (!tableResponse.success) {
        return {
          success: false,
          error: `Failed to free table: ${tableResponse.error}`
        }
      }

      console.log('✅ [ordersStore] Table released successfully:', {
        orderId,
        tableId: order.tableId,
        newStatus: order.status
      })

      return {
        success: true,
        data: order
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to release table'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Update order in storage
   * Used by payment system to persist order changes
   */
  async function updateOrder(order: PosOrder): Promise<ServiceResponse<PosOrder>> {
    try {
      const response = await ordersService.updateOrder(order)

      if (response.success && response.data) {
        // Update order in store
        const orderIndex = orders.value.findIndex(o => o.id === order.id)
        if (orderIndex !== -1) {
          orders.value[orderIndex] = response.data
        }
      }

      return response
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update order'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Пересчитать суммы заказа (wrapper для composable)
   */
  async function recalculateOrderTotals(orderId: string): Promise<void> {
    const order = orders.value.find(o => o.id === orderId)
    if (!order) return

    // Используем composable версию
    recalcOrderTotals(order)

    // Обновляем timestamp
    order.updatedAt = new Date().toISOString()

    // CRITICAL: Save order to Supabase after recalculation (dual-write)
    await updateOrder(order)

    // Автоматически управлять статусом стола после пересчета
    // (ловит изменения paymentStatus и order.status)
    await updateTableStatusForOrder(orderId)
  }

  /**
   * Check if order has any items
   */
  function hasItemsInOrder(order: PosOrder): boolean {
    return order.bills.some(bill => bill.items.some(item => !['cancelled'].includes(item.status)))
  }

  /**
   * Check if bill has any items
   */
  function hasItemsInBill(bill: PosBill): boolean {
    return bill.items.some(item => !['cancelled'].includes(item.status))
  }

  /**
   * Check if order can be deleted
   * Only takeaway/delivery orders with no active/paid items can be deleted
   */
  function canDeleteOrder(order: PosOrder): boolean {
    // Only takeaway/delivery can be deleted
    if (order.type === 'dine_in') return false

    // Check if order has any non-deletable items
    const allItems = order.bills.flatMap(bill => bill.items)
    const hasActiveItems = allItems.some(
      item => !['draft', 'cancelled'].includes(item.status) || item.paymentStatus === 'paid'
    )

    return !hasActiveItems
  }

  /**
   * Автоматическое управление статусом стола на основе состояния заказа
   *
   * Логика:
   * 1. Если заказ в финальном статусе (served/collected/delivered) → не трогать стол
   * 2. Если есть активные items → стол 'occupied'
   * 3. Если нет items → стол 'free'
   * 4. Если заказ 'served' И 'paid' → стол 'free' (гости ушли)
   */
  async function updateTableStatusForOrder(orderId: string): Promise<void> {
    const order = orders.value.find(o => o.id === orderId)

    // Обрабатываем только dine-in заказы со столами
    if (!order || order.type !== 'dine_in' || !order.tableId) {
      return
    }

    // FIX: Завершенный заказ не должен привязываться обратно к столу после refund
    // Refund меняет paymentStatus, но order.status остается финальным
    const finalStatuses = ['served', 'collected', 'delivered']
    console.log('🔍 TABLE UPDATE DEBUG:', {
      orderId,
      orderStatus: order.status,
      isFinalStatus: finalStatuses.includes(order.status),
      tableId: order.tableId,
      paymentStatus: order.paymentStatus
    })
    if (finalStatuses.includes(order.status)) {
      console.log('⏭️ Skipping table update for completed order:', {
        orderId,
        status: order.status,
        paymentStatus: order.paymentStatus
      })
      return
    }

    const hasItems = hasItemsInOrder(order)
    const isServed = order.status === 'served'
    const isPaid = order.paymentStatus === 'paid'

    // Автоматическое освобождение стола
    if (!hasItems || (isServed && isPaid)) {
      await tablesStore.freeTable(order.tableId)

      // 🆕 Синхронизировать currentOrderId если это текущий заказ
      if (currentOrderId.value === orderId) {
        currentOrderId.value = null
        console.log('🔄 Cleared currentOrderId after table freed:', { orderId })
      }

      console.log('✅ Table auto-freed:', {
        tableId: order.tableId,
        orderId,
        reason: !hasItems ? 'no items' : 'served & paid'
      })
      return
    }

    // Автоматическое занятие стола (если есть items)
    if (hasItems) {
      await tablesStore.occupyTable(order.tableId, orderId)
      console.log('✅ Table auto-occupied:', { tableId: order.tableId, orderId })
    }
  }

  /**
   * Установить фильтры
   */
  function setFilters(newFilters: Partial<OrderFilters>): void {
    filters.value = { ...filters.value, ...newFilters }
  }

  /**
   * Очистить фильтры
   */
  function clearFilters(): void {
    filters.value = {}
  }

  /**
   * Очистить ошибки
   */
  function clearError(): void {
    error.value = null
  }

  // ===== SELECTION METHODS =====

  /**
   * Computed: количество выбранных позиций
   */
  const selectedItemsCount = computed(() => selectedItems.value.size)

  /**
   * Computed: количество выбранных счетов
   */
  const selectedBillsCount = computed(() => selectedBills.value.size)

  /**
   * Computed: есть ли выбранные элементы
   */
  const hasSelection = computed(() => selectedItems.value.size > 0 || selectedBills.value.size > 0)

  /**
   * Computed: ID выбранных позиций (массив)
   */
  const selectedItemIds = computed(() => Array.from(selectedItems.value))

  /**
   * Проверить выбрана ли позиция
   */
  function isItemSelected(itemId: string): boolean {
    return selectedItems.value.has(itemId)
  }

  /**
   * Проверить выбран ли счет (все его позиции выбраны)
   */
  function isBillSelected(bill: PosBill): boolean {
    if (bill.items.length === 0) return false
    return bill.items.every(item => selectedItems.value.has(item.id))
  }

  /**
   * Установить выбор позиции (с явным значением)
   */
  function setItemSelection(itemId: string, selected: boolean): void {
    const wasSelected = selectedItems.value.has(itemId)

    if (selected) {
      selectedItems.value.add(itemId)
    } else {
      selectedItems.value.delete(itemId)
    }

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)

    // Debug log
    if (wasSelected !== selected) {
      console.log('🔍 [ordersStore] Item selection changed:', {
        itemId,
        wasSelected,
        nowSelected: selected,
        totalSelected: selectedItems.value.size
      })
    }
  }

  /**
   * Toggle выбор позиции (item)
   */
  function toggleItemSelection(itemId: string): void {
    if (selectedItems.value.has(itemId)) {
      selectedItems.value.delete(itemId)
    } else {
      selectedItems.value.add(itemId)
    }

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
  }

  /**
   * Toggle выбор счета (bill)
   */
  function toggleBillSelection(bill: PosBill): void {
    const billItemIds = bill.items.map(item => item.id)
    const isBillSelected = billItemIds.every(id => selectedItems.value.has(id))

    console.log('🔍 [ordersStore] Bill selection toggled:', {
      billId: bill.id,
      billName: bill.name,
      itemsInBill: billItemIds.length,
      wasBillSelected: isBillSelected,
      action: isBillSelected ? 'deselecting all' : 'selecting all'
    })

    if (isBillSelected) {
      // Снимаем выбор со всех items
      billItemIds.forEach(id => selectedItems.value.delete(id))
      selectedBills.value.delete(bill.id)
    } else {
      // Выбираем все items
      billItemIds.forEach(id => selectedItems.value.add(id))
      selectedBills.value.add(bill.id)
    }

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
    selectedBills.value = new Set(selectedBills.value)

    console.log('🔍 [ordersStore] After bill toggle:', {
      totalSelectedItems: selectedItems.value.size,
      selectedItemIds: Array.from(selectedItems.value)
    })
  }

  /**
   * Очистить выбор (items и bills)
   */
  function clearSelection(): void {
    selectedItems.value.clear()
    selectedBills.value.clear()

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
    selectedBills.value = new Set(selectedBills.value)
  }

  /**
   * Выбрать все позиции активного счета
   */
  function selectAllItemsInBill(bill: PosBill | null): void {
    if (!bill) return

    bill.items.forEach(item => {
      selectedItems.value.add(item.id)
    })

    selectedBills.value.add(bill.id)

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
    selectedBills.value = new Set(selectedBills.value)
  }

  /**
   * Снять выбор с позиции (если удалена из заказа)
   */
  function deselectItem(itemId: string): void {
    selectedItems.value.delete(itemId)

    // Force reactivity update
    selectedItems.value = new Set(selectedItems.value)
  }

  /**
   * Снять выбор со счета (если удален из заказа)
   */
  function deselectBill(billId: string): void {
    selectedBills.value.delete(billId)

    // Force reactivity update
    selectedBills.value = new Set(selectedBills.value)
  }

  // ===== ORDER MOVEMENT METHODS =====

  /**
   * Move a dine-in order to a different table
   * If target table is occupied, merges the moving order's bills into the existing order
   * If target table is free, assigns the order to the table
   *
   * @param orderId - Order ID to move
   * @param targetTableId - Target table ID
   * @returns Service response with success status
   */
  async function moveOrderToTable(
    orderId: string,
    targetTableId: string
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      // Find the order to move
      const orderIndex = orders.value.findIndex(o => o.id === orderId)
      if (orderIndex === -1) {
        return { success: false, error: 'Order not found' }
      }

      const orderToMove = orders.value[orderIndex]

      // Validate it's a dine-in order
      if (orderToMove.type !== 'dine_in') {
        return {
          success: false,
          error: 'Only dine-in orders can be moved between tables'
        }
      }

      // Validate the order isn't already on this table
      if (orderToMove.tableId === targetTableId) {
        return {
          success: false,
          error: 'Order is already on this table'
        }
      }

      // Get target table to check its status
      const targetTable = await tablesStore.getTableById(targetTableId)
      if (!targetTable) {
        return { success: false, error: 'Target table not found' }
      }

      console.log('🔄 [ordersStore] Moving order to table:', {
        orderId,
        fromTableId: orderToMove.tableId,
        targetTableId,
        targetTableStatus: targetTable.status,
        currentOrderOnTarget: targetTable.currentOrderId
      })

      // Case 1: Target table is occupied → Merge orders
      if (targetTable.status === 'occupied' && targetTable.currentOrderId) {
        const targetOrderIndex = orders.value.findIndex(o => o.id === targetTable.currentOrderId)
        if (targetOrderIndex === -1) {
          return {
            success: false,
            error: 'Target table has an order reference but order not found'
          }
        }

        const targetOrder = orders.value[targetOrderIndex]

        console.log('🔀 [ordersStore] Target table occupied, merging orders:', {
          sourceOrderId: orderId,
          targetOrderId: targetOrder.id,
          billsToMerge: orderToMove.bills.length
        })

        // Merge all bills from moving order into target order
        const mergeResult = await mergeBillsIntoOrder(orderToMove.bills, targetOrder.id)
        if (!mergeResult.success) {
          return mergeResult
        }

        // Release the source table (if any)
        if (orderToMove.tableId) {
          await tablesStore.freeTable(orderToMove.tableId)
        }

        // Delete source order from database (all bills moved to target)
        const deleteResult = await ordersService.deleteOrder(orderId)
        if (!deleteResult.success) {
          console.warn(
            '⚠️ [ordersStore] Failed to delete source order from DB:',
            deleteResult.error
          )
          // Continue anyway - merge already saved, local state will be correct
        }

        // Remove the source order from local state
        orders.value.splice(orderIndex, 1)

        // If current order was removed, select the target order
        if (currentOrderId.value === orderId) {
          selectOrder(targetOrder.id)
        }

        console.log('✅ [ordersStore] Orders merged successfully')

        return {
          success: true,
          data: targetOrder
        }
      }

      // Case 2: Target table is free → Assign order to table
      console.log('📍 [ordersStore] Target table is free, assigning order')

      // Release the current table (if any)
      if (orderToMove.tableId) {
        await tablesStore.freeTable(orderToMove.tableId)
      }

      // Update order with new table
      orderToMove.tableId = targetTableId
      orderToMove.updatedAt = new Date().toISOString()

      // Occupy the target table
      await tablesStore.occupyTable(targetTableId, orderId)

      // Save the order
      const updateResponse = await updateOrder(orderToMove)
      if (!updateResponse.success) {
        return updateResponse
      }

      console.log('✅ [ordersStore] Order moved to table successfully:', {
        orderId,
        newTableId: targetTableId
      })

      return {
        success: true,
        data: orderToMove
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to move order to table'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Convert takeaway/delivery order to dine-in by assigning a table
   * If target table is occupied, merges the order's bills into the existing order
   * If target table is free, assigns the order to the table
   *
   * @param orderId - Order ID to convert
   * @param tableId - Table ID to assign
   * @returns Service response with success status
   */
  async function convertOrderToDineIn(
    orderId: string,
    tableId: string
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      // Find the order to convert
      const orderIndex = orders.value.findIndex(o => o.id === orderId)
      if (orderIndex === -1) {
        return { success: false, error: 'Order not found' }
      }

      const orderToConvert = orders.value[orderIndex]

      // Validate it's a takeaway/delivery order
      if (orderToConvert.type === 'dine_in') {
        return {
          success: false,
          error: 'Order is already dine-in. Use moveOrderToTable instead.'
        }
      }

      // Get target table to check its status
      const targetTable = await tablesStore.getTableById(tableId)
      if (!targetTable) {
        return { success: false, error: 'Target table not found' }
      }

      console.log('🔄 [ordersStore] Converting order to dine-in:', {
        orderId,
        currentType: orderToConvert.type,
        targetTableId: tableId,
        targetTableStatus: targetTable.status,
        currentOrderOnTarget: targetTable.currentOrderId
      })

      // Case 1: Target table is occupied → Merge orders
      if (targetTable.status === 'occupied' && targetTable.currentOrderId) {
        const targetOrderIndex = orders.value.findIndex(o => o.id === targetTable.currentOrderId)
        if (targetOrderIndex === -1) {
          return {
            success: false,
            error: 'Target table has an order reference but order not found'
          }
        }

        const targetOrder = orders.value[targetOrderIndex]

        console.log('🔀 [ordersStore] Target table occupied, merging orders:', {
          sourceOrderId: orderId,
          sourceOrderType: orderToConvert.type,
          targetOrderId: targetOrder.id,
          billsToMerge: orderToConvert.bills.length
        })

        // Merge all bills from converting order into target order
        const mergeResult = await mergeBillsIntoOrder(orderToConvert.bills, targetOrder.id)
        if (!mergeResult.success) {
          return mergeResult
        }

        // Delete source order from database (all bills moved to target)
        const deleteResult = await ordersService.deleteOrder(orderId)
        if (!deleteResult.success) {
          console.warn(
            '⚠️ [ordersStore] Failed to delete source order from DB:',
            deleteResult.error
          )
          // Continue anyway - merge already saved, local state will be correct
        }

        // Remove the source order from local state
        orders.value.splice(orderIndex, 1)

        // If current order was removed, select the target order
        if (currentOrderId.value === orderId) {
          selectOrder(targetOrder.id)
        }

        console.log('✅ [ordersStore] Order converted and merged successfully')

        return {
          success: true,
          data: targetOrder
        }
      }

      // Case 2: Target table is free → Convert order type and assign table
      console.log('📍 [ordersStore] Target table is free, converting order type')

      // Convert order type to dine_in
      orderToConvert.type = 'dine_in'
      orderToConvert.tableId = tableId

      // Update order status if needed (ensure it's valid for dine_in)
      if (orderToConvert.status === 'collected' || orderToConvert.status === 'delivered') {
        orderToConvert.status = 'ready' // Reset to appropriate status for dine-in
      }

      orderToConvert.updatedAt = new Date().toISOString()

      // Occupy the target table
      await tablesStore.occupyTable(tableId, orderId)

      // Save the order
      const updateResponse = await updateOrder(orderToConvert)
      if (!updateResponse.success) {
        return updateResponse
      }

      console.log('✅ [ordersStore] Order converted to dine-in successfully:', {
        orderId,
        newType: 'dine_in',
        tableId
      })

      return {
        success: true,
        data: orderToConvert
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to convert order to dine-in'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Move a single bill to a different table
   * Creates new order on target table or merges into existing order
   *
   * @param billId - Bill ID to move
   * @param targetTableId - Target table ID
   * @returns Service response with success status
   */
  async function moveBillToTable(
    billId: string,
    targetTableId: string
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      // Find the bill and its order
      let sourceBill: PosBill | null = null
      let sourceOrder: PosOrder | null = null

      for (const order of orders.value) {
        const bill = order.bills.find(b => b.id === billId)
        if (bill) {
          sourceBill = bill
          sourceOrder = order
          break
        }
      }

      if (!sourceBill || !sourceOrder) {
        return { success: false, error: 'Bill not found' }
      }

      // Cannot move the last bill from an order
      if (sourceOrder.bills.length === 1) {
        return {
          success: false,
          error: 'Cannot move the last bill. Use "Change Table" to move the entire order instead.'
        }
      }

      console.log('🔄 [ordersStore] Moving bill to table:', {
        billId,
        billName: sourceBill.name,
        sourceOrderId: sourceOrder.id,
        targetTableId
      })

      // Get target table to check its status
      const targetTable = await tablesStore.getTableById(targetTableId)
      if (!targetTable) {
        return { success: false, error: 'Target table not found' }
      }

      // Case 1: Target table is occupied → Merge bill into existing order
      if (targetTable.status === 'occupied' && targetTable.currentOrderId) {
        const targetOrderIndex = orders.value.findIndex(o => o.id === targetTable.currentOrderId)
        if (targetOrderIndex === -1) {
          return {
            success: false,
            error: 'Target table has an order reference but order not found'
          }
        }

        const targetOrder = orders.value[targetOrderIndex]

        console.log('🔀 [ordersStore] Target table occupied, merging bill into existing order')

        // Remove bill from source order
        const billIndex = sourceOrder.bills.findIndex(b => b.id === billId)
        if (billIndex !== -1) {
          sourceOrder.bills.splice(billIndex, 1)
        }

        // Merge bill into target order
        const mergeResult = await mergeBillsIntoOrder([sourceBill], targetOrder.id)
        if (!mergeResult.success) {
          return mergeResult
        }

        // Recalculate source order totals
        await recalculateOrderTotals(sourceOrder.id)

        console.log('✅ [ordersStore] Bill merged successfully')

        return {
          success: true,
          data: targetOrder
        }
      }

      // Case 2: Target table is free → Create new order with this bill
      console.log('📍 [ordersStore] Target table is free, creating new order')

      // Remove bill from source order
      const billIndex = sourceOrder.bills.findIndex(b => b.id === billId)
      if (billIndex !== -1) {
        sourceOrder.bills.splice(billIndex, 1)
      }

      // Create new dine-in order on target table
      const newOrderResponse = await ordersService.createOrder('dine_in', targetTableId)
      if (!newOrderResponse.success || !newOrderResponse.data) {
        return {
          success: false,
          error: newOrderResponse.error || 'Failed to create new order'
        }
      }

      const newOrder = newOrderResponse.data

      // Remove default bill created by createOrder
      if (newOrder.bills.length > 0) {
        newOrder.bills = []
      }

      // Add the moved bill to new order
      sourceBill.orderId = newOrder.id
      sourceBill.updatedAt = new Date().toISOString()
      newOrder.bills.push(sourceBill)

      // Add new order to store
      orders.value.unshift(newOrder)

      // Recalculate both orders
      await recalculateOrderTotals(sourceOrder.id)
      await recalculateOrderTotals(newOrder.id)

      // Occupy the target table
      await tablesStore.occupyTable(targetTableId, newOrder.id)

      console.log('✅ [ordersStore] Bill moved to new table successfully:', {
        newOrderId: newOrder.id,
        billId,
        tableId: targetTableId
      })

      return {
        success: true,
        data: newOrder
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to move bill to table'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  /**
   * Merge bills from one order into another order
   * All bills are transferred to the target order and renamed to avoid conflicts
   *
   * @param billsToMerge - Array of bills to merge
   * @param targetOrderId - Target order ID
   * @returns Service response with success status
   */
  async function mergeBillsIntoOrder(
    billsToMerge: PosBill[],
    targetOrderId: string
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      // Find target order
      const targetOrderIndex = orders.value.findIndex(o => o.id === targetOrderId)
      if (targetOrderIndex === -1) {
        return { success: false, error: 'Target order not found' }
      }

      const targetOrder = orders.value[targetOrderIndex]

      console.log('🔀 [ordersStore] Merging bills into order:', {
        targetOrderId,
        billsToMerge: billsToMerge.length,
        existingBills: targetOrder.bills.length
      })

      // Rename and transfer bills to avoid naming conflicts
      for (let i = 0; i < billsToMerge.length; i++) {
        const billToMerge = { ...billsToMerge[i] }

        // Generate new bill name (e.g., "Bill 5", "Bill 6", etc.)
        const newBillNumber = targetOrder.bills.length + i + 1
        billToMerge.name = `Bill ${newBillNumber}`

        // Update bill's orderId to target order
        billToMerge.orderId = targetOrderId
        billToMerge.updatedAt = new Date().toISOString()

        // Add to target order's bills
        targetOrder.bills.push(billToMerge)

        console.log('  ✅ Merged bill:', {
          originalName: billsToMerge[i].name,
          newName: billToMerge.name,
          itemsCount: billToMerge.items.length
        })
      }

      // Recalculate target order totals
      await recalculateOrderTotals(targetOrderId)

      console.log('✅ [ordersStore] Bills merged successfully:', {
        targetOrderId,
        totalBillsNow: targetOrder.bills.length,
        totalItemsNow: targetOrder.bills.reduce((sum, b) => sum + b.items.length, 0)
      })

      return {
        success: true,
        data: targetOrder
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to merge bills into order'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    }
  }

  // ===== DISCOUNT METHODS (Sprint 7) =====

  /**
   * Apply discount to a single item
   * Creates a discount event and updates the item's discount array
   *
   * @param itemId - Item ID to apply discount to
   * @param discountParams - Discount parameters (type, value, reason, notes)
   * @returns Discount result with success status
   */
  async function applyItemDiscount(
    itemId: string,
    discountParams: Omit<ApplyItemDiscountParams, 'item'>
  ): Promise<DiscountResult> {
    try {
      // Find the item and its order
      let foundItem: PosBillItem | null = null
      let foundOrder: PosOrder | null = null

      for (const order of orders.value) {
        for (const bill of order.bills) {
          const item = bill.items.find(i => i.id === itemId)
          if (item) {
            foundItem = item
            foundOrder = order
            break
          }
        }
        if (foundItem) break
      }

      if (!foundItem || !foundOrder) {
        return {
          success: false,
          error: 'Item not found'
        }
      }

      // Apply discount using discount service
      const result = await discountService.applyItemDiscount(
        {
          item: foundItem,
          ...discountParams
        },
        foundOrder.id
      )

      if (!result.success || !result.discountEvent) {
        return result
      }

      // Update item in state
      if (!foundItem.discounts) {
        foundItem.discounts = []
      }

      // Add discount to item
      foundItem.discounts.push({
        id: result.discountEvent.id,
        type: result.discountEvent.discountType,
        value: result.discountEvent.value,
        reason: result.discountEvent.reason,
        appliedBy: result.discountEvent.appliedBy,
        appliedAt: result.discountEvent.appliedAt
      })

      // Save discount event to Supabase
      const saveResult = await discountSupabaseService.saveDiscountEvent(result.discountEvent)
      if (!saveResult.success) {
        console.warn('⚠️ Failed to save discount event to Supabase:', saveResult.error)
        // Continue anyway - discount is applied in memory and will be in order
      }

      // Recalculate order totals (will populate revenue breakdown)
      await recalculateOrderTotals(foundOrder.id)

      // Save order to persistence
      await updateOrder(foundOrder)

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Apply discount to entire bill (proportionally allocated to items)
   * Creates a discount event with allocation details
   *
   * @param billId - Bill ID to apply discount to
   * @param discountParams - Discount parameters (type, value, reason, notes)
   * @returns Discount result with success status
   */
  async function applyBillDiscount(
    billId: string,
    discountParams: Omit<ApplyBillDiscountParams, 'bill'>
  ): Promise<DiscountResult> {
    try {
      // Find the bill and its order
      let foundBill: PosBill | null = null
      let foundOrder: PosOrder | null = null

      for (const order of orders.value) {
        const bill = order.bills.find(b => b.id === billId)
        if (bill) {
          foundBill = bill
          foundOrder = order
          break
        }
      }

      if (!foundBill || !foundOrder) {
        return {
          success: false,
          error: 'Bill not found'
        }
      }

      // Apply discount using discount service
      const result = await discountService.applyBillDiscount(
        {
          bill: foundBill,
          ...discountParams
        },
        foundOrder.id
      )

      if (!result.success || !result.discountEvent) {
        return result
      }

      // ✅ FIX: Apply proportional allocation to each item
      // Bill-level discounts are distributed proportionally across items
      // This ensures recalculateOrderTotals will pick them up from item.discounts
      const discountEvent = result.discountEvent
      if (discountEvent.allocationDetails) {
        for (const allocation of discountEvent.allocationDetails.itemAllocations) {
          const item = foundBill.items.find(i => i.id === allocation.itemId)
          if (item) {
            if (!item.discounts) {
              item.discounts = []
            }
            // Add allocated bill discount to item's discounts
            // Note: allocated discount is always 'fixed' amount (result of proportional calculation)
            item.discounts.push({
              id: discountEvent.id,
              type: 'fixed', // Always fixed - it's the calculated proportional amount
              value: allocation.allocatedDiscount, // Use allocated amount, not original value
              reason: discountEvent.reason,
              appliedBy: discountEvent.appliedBy,
              appliedAt: discountEvent.appliedAt,
              notes: `Bill discount allocation (${(allocation.proportion * 100).toFixed(1)}% of ${discountEvent.value}${discountEvent.discountType === 'percentage' ? '%' : ''})`
            })
          }
        }
      }

      // Save discount event to Supabase
      const saveResult = await discountSupabaseService.saveDiscountEvent(result.discountEvent)
      if (!saveResult.success) {
        console.warn('⚠️ Failed to save discount event to Supabase:', saveResult.error)
        // Continue anyway - discount is applied in memory and will be in order
      }

      // Recalculate order totals (will populate revenue breakdown and sum up all item discounts including allocated bill discounts)
      await recalculateOrderTotals(foundOrder.id)

      // Save order to persistence
      await updateOrder(foundOrder)

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Save bill discount to order (without applying to items)
   * Used in PaymentDialog to temporarily store bill discount until payment confirmation
   *
   * @param billId - Bill ID to save discount to
   * @param discountAmount - Calculated discount amount (in currency)
   * @param discountReason - Reason for discount
   * @returns Service response with success status
   */
  async function saveBillDiscount(
    billId: string,
    discountAmount: number,
    discountReason: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Find the bill and its order
      let foundBill: PosBill | null = null
      let foundOrder: PosOrder | null = null

      for (const order of orders.value) {
        const bill = order.bills.find(b => b.id === billId)
        if (bill) {
          foundBill = bill
          foundOrder = order
          break
        }
      }

      if (!foundBill || !foundOrder) {
        return {
          success: false,
          error: 'Bill not found'
        }
      }

      // Update bill with discount information (NOT applying to items)
      foundBill.discountAmount = discountAmount
      foundBill.discountReason = discountReason

      console.log('✅ [ordersStore] Bill discount saved to order:', {
        billId,
        discountAmount,
        discountReason,
        note: 'Discount stored in bill, NOT applied to items yet'
      })

      // Save order to persistence
      await updateOrder(foundOrder)

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save bill discount'
      console.error('❌ [ordersStore] Failed to save bill discount:', message)
      return {
        success: false,
        error: message
      }
    }
  }

  /**
   * Remove all discounts from a single item
   *
   * @param billId - Bill ID containing the item
   * @param itemId - Item ID to remove discounts from
   * @returns Service response with success status
   */
  async function removeItemDiscount(
    billId: string,
    itemId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Find the item and its order
      let foundItem: PosBillItem | null = null
      let foundOrder: PosOrder | null = null

      for (const order of orders.value) {
        for (const bill of order.bills) {
          const item = bill.items.find(i => i.id === itemId)
          if (item && bill.id === billId) {
            foundItem = item
            foundOrder = order
            break
          }
        }
        if (foundItem) break
      }

      if (!foundItem || !foundOrder) {
        return {
          success: false,
          error: 'Item not found'
        }
      }

      console.log('✅ [ordersStore] Removing item discount:', {
        billId,
        itemId,
        previousDiscounts: foundItem.discounts?.length || 0
      })

      // Clear all discounts from the item
      foundItem.discounts = []

      // Recalculate order totals
      await recalculateOrderTotals(foundOrder.id)

      // Save order to persistence
      await updateOrder(foundOrder)

      console.log('✅ [ordersStore] Item discount removed successfully')

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove item discount'
      console.error('❌ [ordersStore] Failed to remove item discount:', message)
      return {
        success: false,
        error: message
      }
    }
  }

  /**
   * Remove bill discount
   *
   * @param billId - Bill ID to remove discount from
   * @returns Service response with success status
   */
  async function removeBillDiscount(billId: string): Promise<ServiceResponse<void>> {
    try {
      // Find the bill and its order
      let foundBill: PosBill | null = null
      let foundOrder: PosOrder | null = null

      for (const order of orders.value) {
        const bill = order.bills.find(b => b.id === billId)
        if (bill) {
          foundBill = bill
          foundOrder = order
          break
        }
      }

      if (!foundBill || !foundOrder) {
        return {
          success: false,
          error: 'Bill not found'
        }
      }

      console.log('✅ [ordersStore] Removing bill discount:', {
        billId,
        previousDiscount: foundBill.discountAmount || 0
      })

      // Clear bill discount fields
      foundBill.discountAmount = 0
      foundBill.discountReason = undefined
      foundBill.discountType = undefined

      // Recalculate order totals
      await recalculateOrderTotals(foundOrder.id)

      // Save order to persistence
      await updateOrder(foundOrder)

      console.log('✅ [ordersStore] Bill discount removed successfully')

      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove bill discount'
      console.error('❌ [ordersStore] Failed to remove bill discount:', message)
      return {
        success: false,
        error: message
      }
    }
  }

  // ===== COMPOSABLES =====
  const {
    canAddItemToOrder,
    canSendToKitchen,
    canCloseOrder,
    getOrderDisplayName,
    getOrderStatusColor,
    getOrderStatusIcon,
    formatOrderTotal
  } = useOrdersComposables()

  return {
    // State
    orders,
    currentOrderId,
    activeBillId,
    loading,
    error,
    filters,

    // Computed
    currentOrder,
    activeBill,
    activeOrders,
    todayOrders,
    filteredOrders,
    ordersStats,

    // Selection State
    selectedItems,
    selectedBills,
    selectedItemsCount,
    selectedBillsCount,
    hasSelection,
    selectedItemIds,

    // Actions
    loadOrders,
    createOrder,
    selectOrder,
    selectBill,
    addBillToOrder,
    renameBill,
    removeBill,
    addItemToBill,
    updateItemQuantity,
    updateItemNote,
    removeItemFromBill,
    cancelItem,
    updateItemWriteOffId,
    sendOrderToKitchen,
    closeOrder,
    releaseTable,
    completeOrder,
    deleteOrder,
    updateOrder,
    recalculateOrderTotals,
    setFilters,
    clearFilters,
    clearError,
    saveAndNotifyOrder,

    // Selection Actions
    isItemSelected,
    isBillSelected,
    setItemSelection,
    toggleItemSelection,
    toggleBillSelection,
    clearSelection,
    selectAllItemsInBill,
    deselectItem,
    deselectBill,

    // Utility Functions
    hasItemsInOrder,
    hasItemsInBill,
    canDeleteOrder,
    updateTableStatusForOrder,

    // Order Movement Methods
    moveOrderToTable,
    convertOrderToDineIn,
    moveBillToTable,
    mergeBillsIntoOrder,

    // Discount Methods (Sprint 7)
    applyItemDiscount,
    applyBillDiscount,
    saveBillDiscount,
    removeItemDiscount,
    removeBillDiscount,

    // Composables (существующие)
    canAddItemToOrder,
    canSendToKitchen,
    canCloseOrder,
    getOrderDisplayName,
    getOrderStatusColor,
    getOrderStatusIcon,
    formatOrderTotal
  }
})
