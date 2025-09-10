import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { Table, TableStatus, TableSection } from '@/types/table'
import { Order, OrderType, OrderStatus, OrderData } from '@/types/order'
import { Bill } from '@/types/bill'
import { DebugUtils } from '@/utils'
import { ValidationResult } from '@/types/payment'

const MODULE_NAME = 'tablesStore'

export const useTablesStore = defineStore('tables', () => {
  //#region State
  const tables = ref<Table[]>([
    // Tables (T1-T5)
    {
      id: 'T1',
      number: 'T1',
      status: 'free',
      capacity: 4,
      floor: 1,
      section: 'main',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'T2',
      number: 'T2',
      status: 'free',
      capacity: 4,
      floor: 1,
      section: 'main',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'T3',
      number: 'T3',
      status: 'free',
      capacity: 4,
      floor: 1,
      section: 'main',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'T4',
      number: 'T4',
      status: 'free',
      capacity: 4,
      floor: 1,
      section: 'main',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'T5',
      number: 'T5',
      status: 'free',
      capacity: 4,
      floor: 1,
      section: 'main',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },

    // Islands (I1-I5)
    {
      id: 'I1',
      number: 'I1',
      status: 'free',
      capacity: 6,
      floor: 1,
      section: 'island',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'I2',
      number: 'I2',
      status: 'free',
      capacity: 6,
      floor: 1,
      section: 'island',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'I3',
      number: 'I3',
      status: 'free',
      capacity: 6,
      floor: 1,
      section: 'island',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'I4',
      number: 'I4',
      status: 'free',
      capacity: 6,
      floor: 1,
      section: 'island',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    {
      id: 'I5',
      number: 'I5',
      status: 'free',
      capacity: 6,
      floor: 1,
      section: 'island',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  ])
  const orders = ref<Order[]>([])
  const ordersData = ref<Map<string, OrderData>>(new Map())
  const activeOrderId = ref<string | null>(null)
  //#endregion

  //#region Getters
  const getTablePaymentStatus = computed(() => (tableId: string): boolean => {
    const table = tables.value.find(t => t.id === tableId)
    if (!table?.currentOrderId) return false

    const orderData = ordersData.value.get(table.currentOrderId)
    if (!orderData?.bills.length) return false

    // Проверяем все счета в заказе
    return orderData.bills.every(bill =>
      bill.items.every(item => item.paymentStatus === 'paid' || item.status === 'cancelled')
    )
  })

  const activeOrder = computed(() => orders.value.find(order => order.id === activeOrderId.value))

  const getTableById = computed(() => (id: string) => tables.value.find(t => t.id === id))

  const getOrderById = computed(() => (id: string) => orders.value.find(o => o.id === id))

  const activeOrders = computed(() => orders.value.filter(o => o.status === 'active'))

  const isMultipleBillsAllowed = computed(() => (orderId: string) => {
    const order = getOrderById.value(orderId)
    return order?.type === 'dine-in'
  })

  const getOrderBills = computed(() => (orderId: string) => {
    const order = getOrderById.value(orderId)
    return order?.bills || []
  })
  //#endregion

  //#region Table Actions

  const updateTableStatus = async (tableId: string, orderId?: string) => {
    const table = tables.value.find(t => t.id === tableId)
    if (!table) return

    if (!orderId) {
      table.status = 'free'
      table.currentOrderId = undefined
    } else {
      table.currentOrderId = orderId
      // Используем getTablePaymentStatus вместо дублирования логики
      table.status = getTablePaymentStatus.value(tableId) ? 'occupied_paid' : 'occupied_unpaid'
    }
    table.updatedAt = new Date().toISOString()
  }

  const moveOrderToTable = async (
    orderId: string,
    targetTableId: string
  ): Promise<ValidationResult> => {
    try {
      const order = orders.value.find(o => o.id === orderId)
      const targetTable = tables.value.find(t => t.id === targetTableId)

      if (!order || !targetTable) {
        return {
          isValid: false,
          code: 'NOT_FOUND',
          message: 'Order or table not found'
        }
      }

      // Освобождаем текущий стол
      if (order.tableId && order.tableId !== 'delivery') {
        updateTableStatus(order.tableId) // Освобождаем стол
      }

      // Занимаем новый стол
      updateTableStatus(targetTableId, orderId)
      order.tableId = targetTableId

      return {
        isValid: true,
        code: 'ORDER_MOVED',
        message: 'Order moved successfully'
      }
    } catch (error) {
      return {
        isValid: false,
        code: 'MOVE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to move order'
      }
    }
  }

  //#endregion

  //#region Order Actions
  const createOrder = (type: OrderType, tableId: string, setActive: boolean = true) => {
    const now = new Date().toISOString()
    const orderId = `order_${Date.now()}`
    const orderNumber =
      type === 'delivery' ? `D${orders.value.length + 1}` : `T${orders.value.length + 1}`

    const newOrder: Order = {
      id: orderId,
      tableId,
      orderNumber,
      status: 'active',
      type,
      bills: [],
      createdAt: now,
      updatedAt: now
    }

    orders.value.push(newOrder)

    if (tableId !== 'delivery') {
      updateTableStatus(tableId, orderId)
    }

    if (setActive) {
      setActiveOrder(orderId)
    }

    return orderId
  }

  const setActiveOrder = (orderId: string | null) => {
    DebugUtils.debug(MODULE_NAME, 'Setting active order', { orderId })
    activeOrderId.value = orderId
  }

  const completeOrder = async (orderId: string) => {
    DebugUtils.debug(MODULE_NAME, 'Completing order', { orderId })
    const order = orders.value.find(o => o.id === orderId)
    if (order) {
      order.status = 'completed'
      order.updatedAt = new Date().toISOString()

      // Если заказ был привязан к столу, освобождаем стол
      if (order.tableId !== 'delivery') {
        await updateTableStatus(order.tableId)
      }

      DebugUtils.debug(MODULE_NAME, 'Order completed', { orderId })
    }
  }

  // В TablesStore

  const checkAndCleanupOrder = async (orderId: string): Promise<void> => {
    DebugUtils.debug(MODULE_NAME, 'Starting order cleanup check', { orderId })

    const order = orders.value.find(o => o.id === orderId)
    if (!order) {
      DebugUtils.debug(MODULE_NAME, 'Order not found for cleanup', { orderId })
      return
    }

    const orderData = ordersData.value.get(orderId)
    if (!orderData) {
      DebugUtils.debug(MODULE_NAME, 'Order data not found for cleanup', { orderId })
      return
    }

    // Проверяем, есть ли активные позиции в заказе
    const hasActiveItems = orderData.bills.some(bill =>
      bill.items.some(item => item.status !== 'cancelled' && item.status !== 'completed')
    )

    // Проверяем, есть ли вообще позиции в заказе
    const hasAnyItems = orderData.bills.some(bill => bill.items.length > 0)

    DebugUtils.debug(MODULE_NAME, 'Order status check result', {
      orderId,
      tableId: order.tableId,
      hasActiveItems,
      hasAnyItems,
      billsCount: orderData.bills.length,
      itemsCount: orderData.bills.reduce((sum, bill) => sum + bill.items.length, 0)
    })

    if (!hasAnyItems || !hasActiveItems) {
      // Если у заказа есть стол и это не доставка
      if (order.tableId && order.tableId !== 'delivery') {
        DebugUtils.debug(MODULE_NAME, 'Clearing table status', {
          tableId: order.tableId,
          orderId
        })

        // Обновляем статус стола
        await updateTableStatus(order.tableId)
      }

      // Завершаем заказ
      order.status = 'completed'
      order.updatedAt = new Date().toISOString()

      // Очищаем данные заказа
      ordersData.value.delete(orderId)

      DebugUtils.debug(MODULE_NAME, 'Order cleanup completed', {
        orderId,
        tableId: order.tableId,
        newStatus: order.status
      })
    }
  }

  const changeOrderTable = async (orderId: string, newTableId: string) => {
    DebugUtils.debug(MODULE_NAME, 'Changing order table', { orderId, newTableId })

    const order = getOrderById.value(orderId)
    if (!order) return

    const oldTableId = order.tableId

    if (oldTableId !== 'delivery') {
      updateTableStatus(oldTableId) // Освобождаем стол (без orderId - делает стол свободным)
    }

    updateTableStatus(newTableId, orderId) // Занимаем новый стол
    order.tableId = newTableId
    order.updatedAt = new Date().toISOString()
  }

  const changeOrderType = async (orderId: string, newType: OrderType, tableId?: string) => {
    DebugUtils.debug(MODULE_NAME, 'Changing order type', { orderId, newType, tableId })

    if (!validateOrderTypeChange(orderId, newType)) {
      throw new Error('Invalid order type change')
    }

    const order = getOrderById.value(orderId)
    if (!order) return

    const oldTableId = order.tableId

    order.type = newType
    order.updatedAt = new Date().toISOString()

    if (newType === 'dine-in' && tableId) {
      if (oldTableId !== 'delivery' && oldTableId !== tableId) {
        updateTableStatus(oldTableId) // Освобождаем старый стол
      }
      updateTableStatus(tableId, orderId) // Занимаем новый стол
      order.tableId = tableId
    } else if (newType === 'takeaway' || newType === 'delivery') {
      if (oldTableId !== 'delivery') {
        updateTableStatus(oldTableId) // Освобождаем стол
      }
      order.tableId = 'delivery'
    }
  }

  const validateOrderTypeChange = (orderId: string, newType: OrderType): boolean => {
    DebugUtils.debug(MODULE_NAME, 'Validating order type change', { orderId, newType })

    const order = getOrderById.value(orderId)
    if (!order) return false

    return !((newType === 'takeaway' || newType === 'delivery') && order.bills.length > 1)
  }
  //#endregion

  //#region Data Management
  const saveOrderData = (orderId: string, bills: Bill[]) => {
    DebugUtils.debug(MODULE_NAME, 'Saving order data', {
      orderId,
      billsCount: bills.length,
      bills
    })

    ordersData.value.set(orderId, {
      orderId,
      bills: JSON.parse(JSON.stringify(bills)),
      timestamp: new Date().toISOString()
    })

    DebugUtils.debug(MODULE_NAME, 'Order data saved successfully')
  }

  const getOrderData = (orderId: string): OrderData | undefined => {
    const data = ordersData.value.get(orderId)
    DebugUtils.debug(MODULE_NAME, 'Getting order data', {
      orderId,
      hasData: !!data,
      data
    })
    return data
  }
  //#endregion

  //#region Watchers

  watch(
    ordersData,
    () => {
      // При любом изменении в ordersData проверяем и обновляем статусы столов
      tables.value.forEach(table => {
        if (table.currentOrderId) {
          updateTableStatus(table.id, table.currentOrderId)
        }
      })
    },
    { deep: true }
  )
  //#endregion
  return {
    // State
    tables,
    orders,
    activeOrderId,

    // Getters
    activeOrder,
    getTableById,
    getOrderById,
    activeOrders,
    isMultipleBillsAllowed,
    getOrderBills,
    getTablePaymentStatus,

    // Actions
    setActiveOrder,
    updateTableStatus,
    changeOrderTable,
    createOrder,
    completeOrder,
    changeOrderType,
    validateOrderTypeChange,
    saveOrderData,
    getOrderData,
    moveOrderToTable,
    checkAndCleanupOrder
  }
})
