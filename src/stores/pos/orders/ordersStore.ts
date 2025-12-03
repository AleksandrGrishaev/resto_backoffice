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
   * Автоматическое управление статусом стола на основе состояния заказа
   *
   * Логика:
   * 1. Если есть активные items → стол 'occupied'
   * 2. Если нет items → стол 'free'
   * 3. Если заказ 'served' И 'paid' → стол 'free' (гости ушли)
   */
  async function updateTableStatusForOrder(orderId: string): Promise<void> {
    const order = orders.value.find(o => o.id === orderId)

    // Обрабатываем только dine-in заказы со столами
    if (!order || order.type !== 'dine_in' || !order.tableId) {
      return
    }

    const hasItems = hasItemsInOrder(order)
    const isServed = order.status === 'served'
    const isPaid = order.paymentStatus === 'paid'

    // Автоматическое освобождение стола
    if (!hasItems || (isServed && isPaid)) {
      await tablesStore.freeTable(order.tableId)
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
    addItemToBill,
    updateItemQuantity,
    updateItemNote,
    removeItemFromBill,
    sendOrderToKitchen,
    closeOrder,
    releaseTable,
    completeOrder,
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
    updateTableStatusForOrder,

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
