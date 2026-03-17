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
import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'OrdersStore'
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
    typeOrData:
      | OrderType
      | {
          type: OrderType
          tableId?: string
          customerName?: string
          channelId?: string
          channelCode?: string
        },
    tableId?: string,
    customerName?: string
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      // Debounce: if already creating an order, wait for it to finish
      if (loading.value.create) {
        console.warn('⚠️ [ordersStore] createOrder already in progress, skipping')
        return { success: false, error: 'Order creation already in progress' }
      }

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

      // Normalize: support both positional args and object
      const orderData =
        typeof typeOrData === 'string' ? { type: typeOrData, tableId, customerName } : typeOrData

      // ✅ Guard: if a dine_in order already exists for this table, select it instead
      if (orderData.type === 'dine_in' && orderData.tableId) {
        const existingOrder = orders.value.find(
          o =>
            o.tableId === orderData.tableId &&
            !['cancelled', 'served', 'collected', 'delivered'].includes(o.status)
        )
        if (existingOrder) {
          console.log(
            '⚠️ [ordersStore] Order already exists for table, selecting instead of creating',
            {
              tableId: orderData.tableId,
              existingOrderId: existingOrder.id
            }
          )
          selectOrder(existingOrder.id)
          // Fix table status in case it's stale
          await tablesStore.occupyTable(orderData.tableId, existingOrder.id)
          return { success: true, data: existingOrder }
        }
      }

      const response = await ordersService.createOrder(orderData)

      // Handle DB unique violation (another device already created order for this table)
      if (
        !response.success &&
        response.error?.includes('23505') &&
        orderData.type === 'dine_in' &&
        orderData.tableId
      ) {
        console.warn(
          '⚠️ [ordersStore] Duplicate order detected (23505), fetching existing order for table',
          orderData.tableId
        )
        const { data: existingRows } = await supabase
          .from('orders')
          .select('*')
          .eq('table_id', orderData.tableId)
          .not('status', 'in', '("cancelled","served","collected","delivered")')
          .limit(1)
          .single()

        if (existingRows) {
          // Import the order mapper
          const { fromSupabase: orderFromSupabase } = await import('./supabaseMappers')
          const existingOrder = orderFromSupabase(existingRows)

          // Add to local state if not already present
          if (!orders.value.find(o => o.id === existingOrder.id)) {
            orders.value.unshift(existingOrder)
          }
          selectOrder(existingOrder.id)
          await tablesStore.occupyTable(orderData.tableId, existingOrder.id)
          return { success: true, data: existingOrder }
        }
      }

      if (response.success && response.data) {
        // ДОБАВИТЬ: устанавливаем дефолтный paymentStatus если не установлен
        if (!response.data.paymentStatus) {
          response.data.paymentStatus = 'unpaid'
        }

        orders.value.unshift(response.data)

        // ✅ FIX: Occupy table IMMEDIATELY on order creation (not after first item)
        // This prevents "lost orders" where table stays free but order exists
        if (response.data.type === 'dine_in' && response.data.tableId) {
          await tablesStore.occupyTable(response.data.tableId, response.data.id)
        }

        // Автоматически выбираем новый заказ
        selectOrder(response.data.id)

        // Автоматически создаем первый счет если нужно
        if (response.data.bills.length === 0) {
          const billName =
            orderData.type === 'dine_in'
              ? 'Bill 1'
              : orderData.type === 'takeaway'
                ? 'Takeaway Bill'
                : 'Delivery Bill'

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

      // Cannot remove bill with active items (must be empty or only cancelled items)
      const activeItems = bill.items.filter(item => item.status !== 'cancelled')
      if (activeItems.length > 0) {
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

          // Освободить стол если заказ был за столом (conditional: only if table still belongs to this order)
          if (response.data.tableId) {
            await tablesStore.freeTable(response.data.tableId, orderId)
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
   * Delete an empty order
   *
   * Conditions (via canDeleteOrder):
   * - Takeaway/delivery with no active items
   * - Website dine_in with no active items
   * - Any empty draft dine_in order (ghost order cleanup)
   */
  async function deleteOrder(orderId: string): Promise<ServiceResponse<void>> {
    try {
      const order = orders.value.find(o => o.id === orderId)

      if (!order) {
        return { success: false, error: 'Order not found' }
      }

      if (!canDeleteOrder(order)) {
        return {
          success: false,
          error: 'Cannot delete this order. It may have active or paid items.'
        }
      }

      console.log('🗑️ [ordersStore] Deleting order:', {
        orderId,
        orderType: order.type,
        tableId: order.tableId,
        itemsCount: order.bills.flatMap(b => b.items).length
      })

      // Delete from service (Supabase + localStorage)
      const deleteResponse = await ordersService.deleteOrder(orderId)
      if (!deleteResponse.success) {
        return deleteResponse
      }

      // Free the table if this was a dine_in order with a table (conditional: only if table still belongs to this order)
      if (order.type === 'dine_in' && order.tableId) {
        await tablesStore.freeTable(order.tableId, orderId)
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

      // Free the table (conditional: only if table still belongs to this order)
      const tableResponse = await tablesStore.freeTable(order.tableId, orderId)
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
   *
   * @param orderId - Order ID to recalculate
   * @param options.skipTableUpdate - Skip table status update (for discount-only operations)
   */
  async function recalculateOrderTotals(
    orderId: string,
    options?: { skipTableUpdate?: boolean; skipItemUpsert?: boolean }
  ): Promise<void> {
    const order = orders.value.find(o => o.id === orderId)
    if (!order) return

    // Используем composable версию
    recalcOrderTotals(order)

    // Обновляем timestamp
    order.updatedAt = new Date().toISOString()

    // CRITICAL: Save order to Supabase after recalculation (dual-write)
    if (options?.skipItemUpsert) {
      // Only update order-level fields, skip items upsert
      // Used during payment to avoid triggering unnecessary kitchen realtime events
      await ordersService.updateOrderOnly(order)
    } else {
      await updateOrder(order)
    }

    // Автоматически управлять статусом стола после пересчета
    // (ловит изменения paymentStatus и order.status)
    // ✅ EGRESS FIX: Skip for discount-only operations where table status doesn't change
    if (!options?.skipTableUpdate) {
      await updateTableStatusForOrder(orderId)
    }
  }

  /**
   * Update only payment-related fields on specific items (targeted, no full upsert)
   */
  async function updateItemsPaymentStatus(
    items: Array<{ id: string; paymentStatus: string; paidByPaymentIds: string[] }>
  ): Promise<void> {
    await ordersService.updateItemsPaymentStatus(items)
  }

  /**
   * Update only order-level fields without re-upserting items
   */
  async function updateOrderOnly(order: PosOrder): Promise<ServiceResponse<PosOrder>> {
    return await ordersService.updateOrderOnly(order)
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
   * Cancel an entire order via server-side RPC (staff action)
   * Works for any order type including dine_in with no table
   */
  async function cancelOrder(
    orderId: string,
    reason: string,
    notes?: string
  ): Promise<ServiceResponse<void>> {
    try {
      loading.value.update = true
      const order = orders.value.find(o => o.id === orderId)
      if (!order) {
        return { success: false, error: 'Order not found' }
      }

      const finalStatuses = ['cancelled', 'served', 'collected', 'delivered']
      if (finalStatuses.includes(order.status)) {
        return { success: false, error: `Order is already in final status: ${order.status}` }
      }

      console.log('🚫 [ordersStore] Cancelling order:', { orderId, reason, notes })

      const { data, error: rpcError } = await supabase.rpc('staff_cancel_order', {
        p_order_id: orderId,
        p_reason: reason,
        p_notes: notes || null
      })

      if (rpcError) {
        return { success: false, error: rpcError.message }
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'RPC failed' }
      }

      // Update local state
      order.status = 'cancelled'
      order.cancellationReason = reason
      order.updatedAt = new Date().toISOString()
      for (const bill of order.bills) {
        for (const item of bill.items) {
          if (item.status !== 'cancelled') {
            item.status = 'cancelled'
            item.cancelledAt = new Date().toISOString()
            item.cancellationReason = 'staff_cancelled'
            item.cancellationNotes = notes || reason
          }
        }
      }

      // If table was freed by the RPC, sync local state + localStorage (DB already updated)
      if (data.tableFreed && order.tableId) {
        tablesStore.updateTableLocally(order.tableId, {
          status: 'free',
          currentOrderId: undefined,
          updatedAt: new Date().toISOString()
        })
      }

      // Clear current order and selection if this was selected
      if (currentOrderId.value === orderId) {
        currentOrderId.value = null
        activeBillId.value = null
        clearSelection()
      }

      console.log('✅ [ordersStore] Order cancelled:', {
        orderId,
        cancelledItems: data.cancelledItems
      })

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel order'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      loading.value.update = false
    }
  }

  /**
   * Check if order can be deleted
   * - Takeaway/delivery with no active items
   * - Website dine_in with no active items
   * - Any dine_in draft order with zero items (empty ghost order)
   */
  function canDeleteOrder(order: PosOrder): boolean {
    const allItems = order.bills.flatMap(bill => bill.items)
    const hasActiveItems = allItems.some(
      item => !['draft', 'cancelled'].includes(item.status) || item.paymentStatus === 'paid'
    )

    // Empty draft dine_in orders can always be deleted (ghost order cleanup)
    if (order.type === 'dine_in' && order.status === 'draft' && allItems.length === 0) {
      return true
    }

    // Dine_in with all items cancelled — allow cleanup
    if (order.type === 'dine_in' && allItems.length > 0 && !hasActiveItems) {
      return true
    }

    // Regular dine_in with active items — cannot delete (use Cancel Order instead)
    if (order.type === 'dine_in' && hasActiveItems) return false

    return !hasActiveItems
  }

  /**
   * Cleanup stale orders:
   * Phase 1: Delete empty draft orders (no items) older than maxAgeMinutes
   * Phase 2: Evict orders >48h from local state (not DB) — terminal/paid orders
   * Called before shift end and periodically in background.
   * Returns the number of cleaned-up orders.
   */
  async function cleanupStaleOrders(options: { maxAgeMinutes?: number } = {}): Promise<number> {
    const { maxAgeMinutes } = options
    let cleanedCount = 0

    // Phase 1: Delete empty draft orders from DB + local
    const emptyDrafts = orders.value.filter(order => {
      if (order.status !== 'draft') return false
      const allItems = order.bills.flatMap(b => b.items)
      if (allItems.length > 0) return false

      // If maxAgeMinutes specified, only cleanup orders older than threshold
      if (maxAgeMinutes !== undefined) {
        const ageMs = Date.now() - new Date(order.createdAt).getTime()
        if (ageMs < maxAgeMinutes * 60 * 1000) return false
      }

      return true
    })

    if (emptyDrafts.length > 0) {
      DebugUtils.info(MODULE_NAME, `Cleaning up ${emptyDrafts.length} empty draft orders`, {
        maxAgeMinutes,
        orderIds: emptyDrafts.map(o => o.id)
      })

      for (const order of emptyDrafts) {
        try {
          const result = await deleteOrder(order.id)
          if (result.success) {
            cleanedCount++
          }
        } catch (err) {
          DebugUtils.warn(MODULE_NAME, 'Failed to cleanup empty draft order', {
            orderId: order.id,
            error: err instanceof Error ? err.message : String(err)
          })
        }
      }
    }

    // Phase 2: Evict stale orders from local state only (>48h, terminal or paid)
    const EVICT_AGE_MS = 48 * 60 * 60 * 1000
    const now = Date.now()
    const terminalStatuses = ['cancelled', 'served', 'collected', 'delivered']

    const staleToEvict = orders.value.filter(order => {
      const ageMs = now - new Date(order.createdAt).getTime()
      if (ageMs < EVICT_AGE_MS) return false
      // Evict terminal-status orders or paid orders
      return terminalStatuses.includes(order.status) || order.paymentStatus === 'paid'
    })

    if (staleToEvict.length > 0) {
      const staleIds = new Set(staleToEvict.map(o => o.id))

      // Free any tables still held by these stale orders
      for (const order of staleToEvict) {
        if (order.type === 'dine_in' && order.tableId) {
          const table = tablesStore.getTableById(order.tableId)
          if (table && table.currentOrderId === order.id) {
            tablesStore.updateTableLocally(order.tableId, {
              status: 'free',
              currentOrderId: undefined,
              updatedAt: new Date().toISOString()
            })
          }
        }
      }

      orders.value = orders.value.filter(o => !staleIds.has(o.id))

      // Clear current order if it was evicted
      if (currentOrderId.value && staleIds.has(currentOrderId.value)) {
        currentOrderId.value = null
        activeBillId.value = null
      }

      DebugUtils.info(MODULE_NAME, `Evicted ${staleToEvict.length} stale orders from local state`, {
        orderIds: [...staleIds]
      })
      cleanedCount += staleToEvict.length
    }

    if (cleanedCount > 0) {
      DebugUtils.info(MODULE_NAME, `Total cleanup: ${cleanedCount} orders`)
    }

    return cleanedCount
  }

  // Backward-compatible alias
  const cleanupEmptyDraftOrders = cleanupStaleOrders

  // Background cleanup timer
  let _cleanupInterval: ReturnType<typeof setInterval> | null = null
  const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
  const CLEANUP_MAX_AGE_MINUTES = 15

  function startBackgroundCleanup(): void {
    stopBackgroundCleanup()
    _cleanupInterval = setInterval(async () => {
      await cleanupStaleOrders({ maxAgeMinutes: CLEANUP_MAX_AGE_MINUTES })
    }, CLEANUP_INTERVAL)
    DebugUtils.debug(
      MODULE_NAME,
      'Background stale order cleanup started (every 5 min, drafts >15 min, evict >48h)'
    )
  }

  function stopBackgroundCleanup(): void {
    if (_cleanupInterval) {
      clearInterval(_cleanupInterval)
      _cleanupInterval = null
    }
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

    // Defense-in-depth: stale orders (>24h) must not manage table state
    const ORDER_MAX_AGE_MS = 24 * 60 * 60 * 1000
    if (Date.now() - new Date(order.createdAt).getTime() > ORDER_MAX_AGE_MS) {
      console.log('⏭️ Skipping table update for stale order (>24h):', {
        orderId,
        createdAt: order.createdAt
      })
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

    // Автоматическое освобождение стола (conditional: only if table still belongs to this order)
    if (!hasItems || (isServed && isPaid)) {
      await tablesStore.freeTable(order.tableId, orderId)

      // Синхронизировать currentOrderId если это текущий заказ
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

    // Автоматическое занятие стола (conditional: only if table is free or already belongs to this order)
    if (hasItems) {
      const table = tablesStore.getTableById(order.tableId)
      if (table && table.currentOrderId && table.currentOrderId !== orderId) {
        console.log('⏭️ Table already occupied by different order, skipping auto-occupy:', {
          tableId: order.tableId,
          orderId,
          currentOwner: table.currentOrderId
        })
        return
      }
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
        const mergeResult = await mergeBillsIntoOrder(orderToMove.bills, targetOrder.id, {
          channelId: orderToMove.channelId,
          channelCode: orderToMove.channelCode
        })
        if (!mergeResult.success) {
          return mergeResult
        }

        // Release the source table (if any)
        if (orderToMove.tableId) {
          await tablesStore.freeTable(orderToMove.tableId, orderToMove.id)
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
        await tablesStore.freeTable(orderToMove.tableId, orderToMove.id)
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

  /**
   * Re-resolve channel-specific prices for all items in given bills.
   * Called when bills/orders move between channels (e.g., GoJek → dine_in).
   */
  async function repriceItemsForChannel(bills: PosBill[], targetChannelId: string): Promise<void> {
    const { useMenuStore } = await import('@/stores/menu')
    const { useChannelsStore } = await import('@/stores/channels')
    const menuStore = useMenuStore()
    const channelsStore = useChannelsStore()

    for (const bill of bills) {
      for (const item of bill.items) {
        if (item.status === 'cancelled') continue

        const menuItem = menuStore.menuItems.find(m => m.id === item.menuItemId)
        const variant = menuItem?.variants.find(v => v.id === item.variantId)
        if (!variant) continue

        const cp = channelsStore.getChannelPrice(
          targetChannelId,
          item.menuItemId,
          item.variantId || '',
          variant.price
        )

        item.unitPrice = cp.netPrice
        item.totalPrice = (cp.netPrice + (item.modifiersTotal || 0)) * item.quantity
        item.updatedAt = new Date().toISOString()
      }
    }
  }

  async function getUnavailableItemsForChannel(
    bills: PosBill[],
    targetChannelId: string
  ): Promise<{ billId: string; itemName: string; itemId: string }[]> {
    const { useChannelsStore } = await import('@/stores/channels')
    const channelsStore = useChannelsStore()

    const unavailable: { billId: string; itemName: string; itemId: string }[] = []

    for (const bill of bills) {
      for (const item of bill.items) {
        if (item.status === 'cancelled') continue
        if (!channelsStore.isMenuItemAvailable(targetChannelId, item.menuItemId)) {
          unavailable.push({
            billId: bill.id,
            itemName: item.name,
            itemId: item.id
          })
        }
      }
    }

    return unavailable
  }

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

        // Reprice items if moving between different channels (e.g., GoJek → dine_in)
        if (orderToConvert.channelId !== targetOrder.channelId && targetOrder.channelId) {
          await repriceItemsForChannel(orderToConvert.bills, targetOrder.channelId)
        }

        // Merge all bills from converting order into target order
        const mergeResult = await mergeBillsIntoOrder(orderToConvert.bills, targetOrder.id, {
          channelId: orderToConvert.channelId,
          channelCode: orderToConvert.channelCode
        })
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

      // Convert order type to dine_in and update channel
      orderToConvert.type = 'dine_in'
      orderToConvert.tableId = tableId

      // Update channel to dine_in so taxes are recalculated correctly
      const { useChannelsStore } = await import('@/stores/channels')
      const channelsStore = useChannelsStore()
      const dineInChannel = channelsStore.getChannelByCode('dine_in')

      // Check for items unavailable on dine_in channel
      if (dineInChannel) {
        const unavailable = await getUnavailableItemsForChannel(
          orderToConvert.bills,
          dineInChannel.id
        )
        if (unavailable.length > 0) {
          const names = [...new Set(unavailable.map(u => u.itemName))].join(', ')
          return {
            success: false,
            error: `Cannot convert to dine-in: these items are not available on dine-in channel: ${names}`
          }
        }
      }
      if (dineInChannel) {
        orderToConvert.channelId = dineInChannel.id
        orderToConvert.channelCode = 'dine_in'
        // Reprice all items for dine_in channel
        await repriceItemsForChannel(orderToConvert.bills, dineInChannel.id)
      }

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

        // Reprice bill items if moving between different channels
        if (sourceOrder.channelId !== targetOrder.channelId && targetOrder.channelId) {
          await repriceItemsForChannel([sourceBill], targetOrder.channelId)
        }

        // Remove bill from source order
        const billIndex = sourceOrder.bills.findIndex(b => b.id === billId)
        if (billIndex !== -1) {
          sourceOrder.bills.splice(billIndex, 1)
        }

        // Merge bill into target order
        const mergeResult = await mergeBillsIntoOrder([sourceBill], targetOrder.id, {
          channelId: sourceOrder.channelId,
          channelCode: sourceOrder.channelCode
        })
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

      // Create new dine-in order on target table, preserving source channel info
      // Fallback to dine_in channel if source has no channelId
      let moveChannelId = sourceOrder.channelId
      const moveChannelCode = sourceOrder.channelCode || 'dine_in'
      if (!moveChannelId) {
        try {
          const { useChannelsStore } = await import('@/stores/channels')
          const channelsStore = useChannelsStore()
          moveChannelId = channelsStore.getChannelByCode(moveChannelCode)?.id
        } catch {
          /* channels store unavailable */
        }
      }
      const newOrderResponse = await ordersService.createOrder({
        type: 'dine_in',
        tableId: targetTableId,
        channelId: moveChannelId,
        channelCode: moveChannelCode
      })
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
    targetOrderId: string,
    sourceChannelInfo?: { channelId?: string; channelCode?: string }
  ): Promise<ServiceResponse<PosOrder>> {
    try {
      // Find target order
      const targetOrderIndex = orders.value.findIndex(o => o.id === targetOrderId)
      if (targetOrderIndex === -1) {
        return { success: false, error: 'Target order not found' }
      }

      const targetOrder = orders.value[targetOrderIndex]

      // Log cross-channel merge (taxes will be recalculated with target's channel)
      if (
        sourceChannelInfo?.channelId &&
        targetOrder.channelId &&
        sourceChannelInfo.channelId !== targetOrder.channelId
      ) {
        console.warn('⚠️ [ordersStore] Cross-channel bill merge: taxes will be recalculated', {
          sourceChannel: sourceChannelInfo.channelCode,
          targetChannel: targetOrder.channelCode
        })
      }

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
      // ✅ EGRESS FIX: recalculateOrderTotals already calls updateOrder internally
      // Skip table update - discounts don't change table status
      await recalculateOrderTotals(foundOrder.id, { skipTableUpdate: true })

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
      // ✅ EGRESS FIX: recalculateOrderTotals already calls updateOrder internally
      // Skip table update - discounts don't change table status
      await recalculateOrderTotals(foundOrder.id, { skipTableUpdate: true })

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
      // ✅ EGRESS FIX: recalculateOrderTotals already calls updateOrder internally
      // Skip table update - discounts don't change table status
      await recalculateOrderTotals(foundOrder.id, { skipTableUpdate: true })

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
      // ✅ EGRESS FIX: recalculateOrderTotals already calls updateOrder internally
      // Skip table update - discounts don't change table status
      await recalculateOrderTotals(foundOrder.id, { skipTableUpdate: true })

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

  // ===== CANCELLATION =====

  /**
   * Resolve a cancellation request for an order (accept or dismiss)
   * Calls the resolve_cancellation_request RPC
   *
   * @param orderId - Order ID to resolve cancellation for
   * @param action - 'accept' to cancel the order, 'dismiss' to keep it
   * @returns Service response with success status
   */
  async function resolveCancellationRequest(
    orderId: string,
    action: 'accept' | 'dismiss'
  ): Promise<ServiceResponse<void>> {
    try {
      const { data, error: rpcError } = await supabase.rpc('resolve_cancellation_request', {
        p_order_id: orderId,
        p_action: action
      })

      if (rpcError) throw rpcError
      if (data && !(data as any).success) throw new Error((data as any).error)

      DebugUtils.info('ordersStore', `Cancellation ${action}ed`, { orderId })

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resolve cancellation'
      DebugUtils.error('ordersStore', 'Failed to resolve cancellation', { error: message })
      return { success: false, error: message }
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
    cancelOrder,
    deleteOrder,
    updateOrder,
    recalculateOrderTotals,
    updateItemsPaymentStatus,
    updateOrderOnly,
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
    cleanupStaleOrders,
    cleanupEmptyDraftOrders,
    startBackgroundCleanup,
    stopBackgroundCleanup,
    updateTableStatusForOrder,

    // Order Movement Methods
    moveOrderToTable,
    convertOrderToDineIn,
    moveBillToTable,
    mergeBillsIntoOrder,
    repriceItemsForChannel,
    getUnavailableItemsForChannel,

    // Cancellation
    resolveCancellationRequest,

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
