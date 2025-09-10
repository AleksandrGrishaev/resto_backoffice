// src/stores/order.store.ts

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { Order, OrderType, OrderStatus, OrderData, DeliveryType } from '@/types/order'
import { PaymentStatus } from '@/types/payment'
import {
  Bill,
  BillItem,
  BillHistoryType,
  BillHistoryChange,
  ValidationResult,
  SelectableState,
  MoveItemsPayload,
  MoveBillPayload
} from '@/types/bill'
import { validateMoveItems, validateMoveBill } from '@/utils/validation'

import { MenuItem, MenuItemVariant } from '@/types/menu'
import { useTablesStore } from '@/stores/tables.store'
import { useBillStore } from '@/stores/bill.store'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'orderStore'

export const useOrderStore = defineStore('order', () => {
  const tablesStore = useTablesStore()
  const billStore = useBillStore()

  //#region State
  const bills = ref<Bill[]>([])
  const activeBillId = ref<string | null>(null)
  const hasUnsavedChanges = ref(false)
  const lastSavedState = ref<{
    bills: Bill[]
    timestamp: string
  } | null>(null)
  //#endregion

  //#region Computed Properties
  const activeBill = computed(() => bills.value.find(bill => bill.id === activeBillId.value))

  const orderDiscountedTotal = computed(() => orderSubtotal.value - orderDiscount.value)

  const orderSubtotal = computed(() =>
    bills.value.reduce(
      (sum, bill) =>
        sum +
        bill.items.reduce((itemSum, item) => {
          if (item.status === 'cancelled') return itemSum
          const activeQuantity = item.quantity - (item.activeCancellations || 0)
          return itemSum + item.price * activeQuantity
        }, 0),
      0
    )
  )

  const orderTaxes = computed(() => ({
    serviceTax: orderDiscountedTotal.value * 0.05,
    governmentTax: orderDiscountedTotal.value * 0.1
  }))

  const orderTotal = computed(
    () => orderSubtotal.value + orderTaxes.value.serviceTax + orderTaxes.value.governmentTax
  )

  const canSave = computed(() => hasUnsavedChanges.value)

  const orderDiscount = computed(() => {
    return bills.value.reduce((sum, bill) => {
      return (
        sum +
        bill.items.reduce((billSum, item) => {
          if (!item.discounts?.[0]) return billSum
          const basePrice = item.price * (item.quantity - (item.activeCancellations || 0))
          const discountAmount = basePrice * (item.discounts[0].value / 100)
          return billSum + discountAmount
        }, 0)
      )
    }, 0)
  })

  const orderPaymentStatus = computed((): PaymentStatus => {
    if (!bills.value.length) return 'unpaid'

    // Проверяем все счета
    const allBillsPaid = bills.value.every(bill => {
      // Для каждого счета проверяем все позиции
      return bill.items.every(item => item.paymentStatus === 'paid' || item.status === 'cancelled')
    })

    // Проверяем есть ли частично оплаченные счета
    const hasPartiallyPaidBills = bills.value.some(bill => {
      const hasPaidItems = bill.items.some(item => item.paymentStatus === 'paid')
      const hasUnpaidItems = bill.items.some(
        item => !item.paymentStatus && item.status !== 'cancelled'
      )
      return hasPaidItems && hasUnpaidItems
    })

    if (allBillsPaid) return 'paid'
    if (hasPartiallyPaidBills) return 'partially_paid'
    return 'unpaid'
  })
  //#endregion

  //#region Initialization
  const initialize = (orderId: string) => {
    DebugUtils.debug(MODULE_NAME, 'Initializing bills for order', {
      orderId,
      savedData: tablesStore.getOrderData(orderId)
    })

    const savedData = tablesStore.getOrderData(orderId)
    if (savedData) {
      DebugUtils.debug(MODULE_NAME, 'Restoring saved bills')
      bills.value = savedData.bills
      activeBillId.value = savedData.bills[0]?.id || null

      lastSavedState.value = {
        bills: JSON.parse(JSON.stringify(savedData.bills)),
        timestamp: savedData.timestamp
      }
      hasUnsavedChanges.value = false

      // Устанавливаем активный счет в BillStore
      if (activeBill.value) {
        billStore.setActiveBill(activeBill.value)
      }
      return
    }

    // Создаем новый счет
    createInitialBill(orderId)
  }

  const reset = () => {
    bills.value = []
    activeBillId.value = null
    billStore.setActiveBill(null)
    hasUnsavedChanges.value = false
    lastSavedState.value = null
  }
  //#endregion

  //#region Bill Management
  const createInitialBill = (orderId: string) => {
    DebugUtils.debug(MODULE_NAME, 'Creating initial bill')
    const newBill: Bill = {
      id: `bill_${Date.now()}`,
      name: 'Bill 1',
      status: 'active',
      items: []
    }

    bills.value = [newBill]
    activeBillId.value = newBill.id
    billStore.setActiveBill(newBill)

    lastSavedState.value = {
      bills: JSON.parse(JSON.stringify([newBill])),
      timestamp: new Date().toISOString()
    }

    const order = tablesStore.getOrderById(orderId)
    if (order) {
      order.bills = [newBill.id]
    }
  }

  const addBill = async (orderId: string): Promise<ValidationResult> => {
    const order = tablesStore.getOrderById(orderId)
    if (!order || !tablesStore.isMultipleBillsAllowed(orderId)) {
      return {
        isValid: false,
        code: 'BILL_NOT_ALLOWED',
        message: 'Cannot add bill to this order type'
      }
    }

    const billNumber = bills.value.length + 1
    const newBill: Bill = {
      id: `bill_${Date.now()}`,
      name: `Bill ${billNumber}`,
      status: 'active',
      items: []
    }

    bills.value.push(newBill)
    activeBillId.value = newBill.id
    billStore.setActiveBill(newBill)
    order.bills.push(newBill.id)

    await billStore.setActiveBill(newBill)
    await tablesStore.saveOrderData(orderId, bills.value)

    return {
      isValid: true,
      code: 'BILL_ADDED',
      message: 'Bill added successfully'
    }
  }

  const removeBill = async (billId: string): Promise<void> => {
    const billIndex = bills.value.findIndex(b => b.id === billId)
    if (billIndex === -1) return

    // Проверяем возможность удаления
    const bill = bills.value[billIndex]
    if (bill.items.length > 0) {
      throw new Error('Cannot remove bill with items')
    }

    // Удаляем счет из массива
    bills.value.splice(billIndex, 1)

    // Если это был активный счет, очищаем его
    if (activeBillId.value === billId) {
      activeBillId.value = bills.value[0]?.id || null
      if (activeBillId.value) {
        const newActiveBill = bills.value.find(b => b.id === activeBillId.value)
        if (newActiveBill) {
          billStore.setActiveBill(newActiveBill)
        }
      } else {
        billStore.setActiveBill(null)
      }
    }

    hasUnsavedChanges.value = true

    // Удаляем ID счета из заказа если он есть
    const order = tablesStore.activeOrder
    if (order) {
      order.bills = order.bills.filter(id => id !== billId)
    }
  }

  const setActiveBill = (billId: string) => {
    DebugUtils.debug(MODULE_NAME, 'Setting active bill', { billId })

    const bill = bills.value.find(b => b.id === billId)
    if (!bill) return

    activeBillId.value = billId
    billStore.setActiveBill(bill)
  }

  const mergeBills = () => {
    if (bills.value.length <= 1) return

    DebugUtils.debug(MODULE_NAME, 'Merging all bills into one')

    const mainBill = bills.value[0]
    const otherBills = bills.value.slice(1)

    otherBills.forEach(bill => {
      mainBill.items.push(...bill.items)
    })

    bills.value = [mainBill]
    activeBillId.value = mainBill.id
    billStore.setActiveBill(mainBill)

    const order = tablesStore.activeOrder
    if (order) {
      order.bills = [mainBill.id]
    }
  }
  //#endregion

  //#region Bill Operations
  const moveBillToTable = async (billId: string, tableId: string) => {
    const bill = bills.value.find(b => b.id === billId)
    if (!bill) {
      throw new Error('Bill not found')
    }

    // Добавляем активность стола
    if (!bill.tableActivity) {
      bill.tableActivity = []
    }

    // Закрываем предыдущую активность если есть
    const lastActivity = bill.tableActivity[bill.tableActivity.length - 1]
    if (lastActivity && !lastActivity.endTime) {
      lastActivity.endTime = new Date().toISOString()
    }

    // Добавляем новую активность
    bill.tableActivity.push({
      tableId,
      startTime: new Date().toISOString()
    })

    hasUnsavedChanges.value = true
  }

  const updateBillType = async (billId: string, type: DeliveryType) => {
    const bill = bills.value.find(b => b.id === billId)
    if (!bill) {
      throw new Error('Bill not found')
    }

    // Если меняем тип, сбрасываем активность стола
    if (type !== 'dine-in') {
      const lastActivity = bill.tableActivity?.[bill.tableActivity.length - 1]
      if (lastActivity && !lastActivity.endTime) {
        lastActivity.endTime = new Date().toISOString()
      }
    }

    bill.deliveryType = type
    hasUnsavedChanges.value = true
  }
  //#endregion

  //#region Validation and Confirmation
  const confirmOrder = async (): Promise<ValidationResult> => {
    DebugUtils.debug(MODULE_NAME, 'Starting order confirmation')

    const validation = validateOrder()
    if (!validation.isValid) {
      return validation
    }

    const order = tablesStore.activeOrder
    if (!order) {
      return {
        isValid: false,
        code: 'NO_ACTIVE_ORDER',
        message: 'No active order found'
      }
    }

    // Обновляем статусы позиций
    bills.value.forEach(bill => {
      bill.items.forEach(item => {
        if (item.status === 'pending') {
          item.status = 'ordered'
        }
      })
    })

    // Сохраняем данные
    tablesStore.saveOrderData(order.id, bills.value)
    lastSavedState.value = {
      bills: JSON.parse(JSON.stringify(bills.value)),
      timestamp: new Date().toISOString()
    }
    hasUnsavedChanges.value = false

    return {
      isValid: true,
      code: 'ORDER_CONFIRMED',
      message: 'Order confirmed successfully'
    }
  }

  const validateOrder = (): ValidationResult => {
    const order = tablesStore.activeOrder
    if (!order) {
      return {
        isValid: false,
        code: 'NO_ACTIVE_ORDER',
        message: 'No active order found'
      }
    }

    // Проверяем каждый счет
    for (const bill of bills.value) {
      // Используем валидацию из BillStore
      billStore.setActiveBill(bill)
      const validation = billStore.validateBill()
      if (!validation.isValid) {
        return validation
      }
    }

    // Восстанавливаем активный счет
    if (activeBill.value) {
      billStore.setActiveBill(activeBill.value)
    }

    return {
      isValid: true,
      code: 'ORDER_VALID',
      message: 'Order is valid'
    }
  }
  //#endregion

  //#region Watchers
  watch(
    () => bills.value,
    newBills => {
      if (!lastSavedState.value) {
        hasUnsavedChanges.value = newBills.some(bill =>
          bill.items.some(item => item.status === 'pending')
        )
        return
      }

      hasUnsavedChanges.value = newBills.some(bill => {
        const savedBill = lastSavedState.value?.bills.find(b => b.id === bill.id)
        if (!savedBill) return true

        if (bill.name !== savedBill.name) return true

        return bill.items.some(
          item =>
            item.status === 'pending' ||
            JSON.stringify(item) !== JSON.stringify(savedBill.items.find(i => i.id === item.id))
        )
      })
    },
    { deep: true }
  )
  //#endregion

  //#region Movement Operations

  const initializeNewOrder = async (
    tableId: string
  ): Promise<{ orderId: string; billId: string }> => {
    // 1. Создаем заказ
    const orderId = tablesStore.createOrder('dine-in', tableId)

    // 2. Инициализируем с первым счетом
    await initialize(orderId)
    const firstBillId = bills.value[0].id

    // 3. Сохраняем данные
    await tablesStore.saveOrderData(orderId, bills.value)

    return {
      orderId,
      billId: firstBillId
    }
  }

  const moveItemsInside = async (
    sourceId: string,
    targetId: string,
    items: string[]
  ): Promise<ValidationResult> => {
    const sourceBill = bills.value.find(b => b.id === sourceId)
    const targetBill = bills.value.find(b => b.id === targetId)

    // Проводим валидацию
    const validation = validateMoveItems({ sourceId, targetId, items }, sourceBill!, targetBill!)
    if (!validation.isValid) {
      return validation
    }

    try {
      // Перемещаем позиции
      const movedItems: BillItem[] = []
      for (const itemId of items) {
        const itemIndex = sourceBill!.items.findIndex(item => item.id === itemId)
        if (itemIndex !== -1) {
          const [item] = sourceBill!.items.splice(itemIndex, 1)
          movedItems.push(item)
        }
      }

      // Добавляем в целевой счет
      targetBill!.items.push(...movedItems)

      // Добавляем запись в историю
      billStore.addHistoryRecord('items_moved', {
        before: { billId: sourceId, items: movedItems },
        after: { billId: targetId, items: movedItems }
      })

      hasUnsavedChanges.value = true

      return {
        isValid: true,
        code: 'ITEMS_MOVED_INSIDE',
        message: `Successfully moved ${items.length} items`
      }
    } catch (error) {
      return {
        isValid: false,
        code: 'MOVE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to move items'
      }
    }
  }

  const moveItemsOutside = async (
    sourceId: string,
    targetId: string,
    items: string[],
    targetOrderId: string
  ): Promise<ValidationResult> => {
    // Сохраняем ID исходного заказа до каких-либо изменений
    const sourceOrderId = tablesStore.activeOrder?.id

    DebugUtils.debug(MODULE_NAME, 'Starting moveItemsOutside', {
      sourceOrderId,
      sourceId,
      targetId,
      targetOrderId,
      itemCount: items.length
    })

    const sourceBill = bills.value.find(b => b.id === sourceId)
    const targetOrderData = await tablesStore.getOrderData(targetOrderId)
    const targetBill = targetOrderData?.bills.find(b => b.id === targetId)

    // Проводим валидацию
    const validation = validateMoveItems({ sourceId, targetId, items }, sourceBill!, targetBill!)
    if (!validation.isValid) {
      return validation
    }

    try {
      // Перемещаем позиции
      const movedItems: BillItem[] = []
      for (const itemId of items) {
        const itemIndex = sourceBill!.items.findIndex(item => item.id === itemId)
        if (itemIndex !== -1) {
          const [item] = sourceBill!.items.splice(itemIndex, 1)
          movedItems.push(item)
        }
      }

      // Добавляем в целевой заказ
      const targetBillInOrder = targetOrderData?.bills.find(b => b.id === targetId)
      if (targetBillInOrder) {
        targetBillInOrder.items.push(...movedItems)
        await tablesStore.saveOrderData(targetOrderId, targetOrderData!.bills)
      }

      // Сохраняем изменения исходного заказа
      if (sourceOrderId) {
        await tablesStore.saveOrderData(sourceOrderId, bills.value)
      }

      // Добавляем запись в историю
      billStore.addHistoryRecord('items_moved', {
        before: { billId: sourceId, items: movedItems },
        after: { billId: targetId, items: movedItems, orderId: targetOrderId }
      })

      hasUnsavedChanges.value = true

      // После перемещения проверяем исходный счет и заказ
      if (sourceBill!.items.length === 0) {
        DebugUtils.debug(MODULE_NAME, 'Source bill is empty, checking for cleanup', {
          sourceOrderId,
          sourceBillId: sourceId
        })

        // Проверяем остались ли другие счета с позициями
        const hasOtherBillsWithItems = bills.value.some(
          bill => bill.id !== sourceId && bill.items.length > 0
        )

        if (!hasOtherBillsWithItems && sourceOrderId) {
          DebugUtils.debug(MODULE_NAME, 'No other bills with items, performing cleanup', {
            sourceOrderId
          })

          // Явно вызываем очистку для исходного заказа
          await tablesStore.checkAndCleanupOrder(sourceOrderId)
        }

        // Удаляем пустой счет
        await removeBill(sourceId)
      }

      return {
        isValid: true,
        code: 'ITEMS_MOVED_OUTSIDE',
        message: `Successfully moved ${items.length} items to different order`
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Move failed', {
        error,
        sourceOrderId,
        targetOrderId
      })
      return {
        isValid: false,
        code: 'MOVE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to move items'
      }
    }
  }

  // Обновим основной метод moveItems
  const moveItems = async ({
    sourceId,
    targetId,
    items,
    targetOrderId
  }: MoveItemsPayload): Promise<ValidationResult> => {
    const sourceOrder = tablesStore.activeOrder
    const targetOrder = targetOrderId ? tablesStore.getOrderById(targetOrderId) : sourceOrder

    if (!sourceOrder || (targetOrderId && !targetOrder)) {
      return {
        isValid: false,
        code: 'ORDER_NOT_FOUND',
        message: 'Source or target order not found'
      }
    }

    // Выбираем подходящий метод перемещения
    return targetOrderId
      ? moveItemsOutside(sourceId, targetId, items, targetOrderId)
      : moveItemsInside(sourceId, targetId, items)
  }

  const moveBill = async (payload: MoveBillPayload): Promise<ValidationResult> => {
    const sourceBill = bills.value.find(b => b.id === payload.billId)
    if (!sourceBill) {
      return {
        isValid: false,
        code: 'BILL_NOT_FOUND',
        message: 'Source bill not found'
      }
    }

    // Создаем новый счет в целевом заказе если нужно
    let targetBillId: string
    if (payload.targetOrderId) {
      const result = await addBill(payload.targetOrderId)
      if (!result.isValid) {
        return result
      }
      targetBillId = bills.value[bills.value.length - 1].id
    }

    // Перемещаем все позиции счета
    const itemIds = sourceBill.items.map(item => item.id)
    const moveResult = await moveItems({
      sourceId: payload.billId,
      targetId: targetBillId!,
      items: itemIds,
      targetOrderId: payload.targetOrderId
    })

    if (!moveResult.isValid) {
      return moveResult
    }

    // Обновляем тип доставки если требуется
    if (payload.newType) {
      await updateBillType(targetBillId!, payload.newType)
    }

    // Обновляем привязку к столу если требуется
    if (payload.targetTableId) {
      await moveBillToTable(targetBillId!, payload.targetTableId)
    }

    return {
      isValid: true,
      code: 'BILL_MOVED',
      message: 'Bill moved successfully'
    }
  }
  //#endregion

  return {
    // State
    bills,
    activeBillId,
    hasUnsavedChanges,

    // Computed
    activeBill,
    orderSubtotal,
    orderTaxes,
    orderTotal,
    canSave,
    orderDiscount,
    orderDiscountedTotal,
    orderPaymentStatus,

    // Initialization
    initialize,
    reset,

    // Bill Management
    addBill,
    setActiveBill,
    mergeBills,
    moveBillToTable,
    updateBillType,
    moveItems,
    removeBill,
    moveBill,

    // Order Management
    confirmOrder,
    validateOrder,

    // Movement Operations
    initializeNewOrder
  }
})
