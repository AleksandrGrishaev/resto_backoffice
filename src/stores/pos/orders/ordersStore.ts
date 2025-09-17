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
import { OrdersService } from './services'
import { useOrdersComposables } from './composables'
import { usePosTablesStore } from '../tables/tablesStore'

export const usePosOrdersStore = defineStore('posOrders', () => {
  // ===== STATE =====
  const orders = ref<PosOrder[]>([])
  const currentOrderId = ref<string | null>(null)
  const activeBillId = ref<string | null>(null)

  // 🆕 SELECTION STATE
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

  const activeOrders = computed(() =>
    orders.value.filter(order => !['paid', 'cancelled'].includes(order.status))
  )

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

  // 🆕 SELECTION COMPUTED
  const isFullBillSelected = computed(() => {
    return activeBillId.value ? selectedBills.value.has(activeBillId.value) : false
  })

  const selectedItemIds = computed(() => {
    if (isFullBillSelected.value && activeBill.value) {
      return activeBill.value.items.map(item => item.id)
    }
    return Array.from(selectedItems.value)
  })

  const selectedItemsCount = computed(() => selectedItems.value.size)
  const selectedBillsCount = computed(() => selectedBills.value.size)
  const hasSelection = computed(() => selectedItems.value.size > 0 || selectedBills.value.size > 0)

  // ===== ACTIONS =====

  /**
   * Загрузить все заказы
   */
  async function loadOrders(): Promise<ServiceResponse<PosOrder[]>> {
    loading.value.list = true
    error.value = null

    try {
      const response = await ordersService.getAllOrders()

      if (response.success && response.data) {
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

      const response = await ordersService.createOrder(type, tableId, customerName)

      if (response.success && response.data) {
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
    // Очищаем selection при смене заказа
    clearSelection()

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
      console.log('⚠️ OrdersStore - No bills in order, cleared active bill')
    }
  }

  /**
   * Выбрать активный счет - ОБНОВЛЕНО
   */
  function selectBill(billId: string): void {
    // Очищаем selection при смене счета
    clearSelection()

    activeBillId.value = billId
  }

  // 🆕 SELECTION ACTIONS

  /**
   * Выбрать/снять выбор элемента
   */
  function toggleItemSelection(itemId: string): void {
    if (selectedItems.value.has(itemId)) {
      selectedItems.value.delete(itemId)
    } else {
      selectedItems.value.add(itemId)
    }

    // Автоматически выбираем счет если выбраны все его элементы
    if (activeBill.value && activeBillId.value) {
      const billItemIds = activeBill.value.items.map(item => item.id)
      const selectedBillItems = billItemIds.filter(id => selectedItems.value.has(id))

      if (selectedBillItems.length === billItemIds.length && billItemIds.length > 0) {
        selectedBills.value.add(activeBillId.value)
      } else {
        selectedBills.value.delete(activeBillId.value)
      }
    }
  }

  /**
   * Выбрать/снять выбор счета
   */
  function toggleBillSelection(billId: string): void {
    if (!currentOrder.value) return

    const bill = currentOrder.value.bills.find(b => b.id === billId)
    if (!bill) return

    if (selectedBills.value.has(billId)) {
      // Снимаем выделение со счета и всех его позиций
      selectedBills.value.delete(billId)
      bill.items.forEach(item => {
        selectedItems.value.delete(item.id)
      })
    } else {
      // Выделяем счет и все его позиции
      selectedBills.value.add(billId)
      bill.items.forEach(item => {
        selectedItems.value.add(item.id)
      })
    }
  }

  /**
   * Проверить, выбран ли элемент
   */
  function isItemSelected(itemId: string): boolean {
    return selectedItems.value.has(itemId)
  }

  /**
   * Проверить, выбран ли счет
   */
  function isBillSelected(billId: string): boolean {
    return selectedBills.value.has(billId)
  }

  /**
   * Очистить все выделения
   */
  function clearSelection(): void {
    selectedItems.value.clear()
    selectedBills.value.clear()
  }

  /**
   * Выбрать все элементы в активном счете
   */
  function selectAllItemsInActiveBill(): void {
    if (activeBill.value) {
      activeBill.value.items.forEach(item => {
        selectedItems.value.add(item.id)
      })
      if (activeBillId.value) {
        selectedBills.value.add(activeBillId.value)
      }
    }
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
    quantity: number = 1,
    modifications: any[] = []
  ): Promise<ServiceResponse<PosBillItem>> {
    try {
      const response = await ordersService.addItemToBill(
        orderId,
        billId,
        menuItem,
        quantity,
        modifications
      )

      if (response.success && response.data) {
        const orderIndex = orders.value.findIndex(o => o.id === orderId)
        if (orderIndex !== -1) {
          const billIndex = orders.value[orderIndex].bills.findIndex(b => b.id === billId)
          if (billIndex !== -1) {
            orders.value[orderIndex].bills[billIndex].items.push(response.data)
            // Пересчитать суммы заказа
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
      if (quantity <= 0) {
        return removeItemFromBill(orderId, billId, itemId)
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
   * Удалить товар из счета - ОБНОВЛЕНО
   */
  async function removeItemFromBill(
    orderId: string,
    billId: string,
    itemId: string
  ): Promise<ServiceResponse<void>> {
    try {
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

              // Убираем элемент из selection если он был выбран
              if (selectedItems.value.has(itemId)) {
                selectedItems.value.delete(itemId)
              }

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
            clearSelection()
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
   * Пересчитать суммы заказа
   */
  async function recalculateOrderTotals(orderId: string): Promise<void> {
    const orderIndex = orders.value.findIndex(o => o.id === orderId)
    if (orderIndex === -1) return

    const order = orders.value[orderIndex]
    let totalAmount = 0
    let discountAmount = 0

    // Пересчитать каждый счет
    order.bills.forEach(bill => {
      let billSubtotal = 0
      let billDiscountAmount = 0

      bill.items.forEach(item => {
        if (item.status === 'active') {
          billSubtotal += item.totalPrice
          billDiscountAmount += item.discounts.reduce((sum, discount) => {
            return (
              sum +
              (discount.type === 'percentage'
                ? item.totalPrice * (discount.value / 100)
                : discount.value)
            )
          }, 0)
        }
      })

      bill.subtotal = billSubtotal
      bill.discountAmount = billDiscountAmount
      bill.total = billSubtotal - billDiscountAmount

      totalAmount += bill.subtotal
      discountAmount += bill.discountAmount
    })

    // Обновить общие суммы заказа
    order.totalAmount = totalAmount
    order.discountAmount = discountAmount
    order.taxAmount = Math.round((totalAmount - discountAmount) * 0.1) // 10% налог
    order.finalAmount = totalAmount - discountAmount + order.taxAmount
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

    // 🆕 Selection State
    selectedItems,
    selectedBills,

    // Computed
    currentOrder,
    activeBill,
    activeOrders,
    todayOrders,
    filteredOrders,
    ordersStats,

    // 🆕 Selection Computed
    isFullBillSelected,
    selectedItemIds,
    selectedItemsCount,
    selectedBillsCount,
    hasSelection,

    // Actions
    loadOrders,
    createOrder,
    selectOrder,
    selectBill,
    addBillToOrder,
    addItemToBill,
    updateItemQuantity,
    removeItemFromBill,
    sendOrderToKitchen,
    closeOrder,
    recalculateOrderTotals,
    setFilters,
    clearFilters,
    clearError,

    // 🆕 Selection Actions
    toggleItemSelection,
    toggleBillSelection,
    isItemSelected,
    isBillSelected,
    clearSelection,
    selectAllItemsInActiveBill,

    // Composables
    canAddItemToOrder,
    canSendToKitchen,
    canCloseOrder,
    getOrderDisplayName,
    getOrderStatusColor,
    getOrderStatusIcon,
    formatOrderTotal
  }
})
