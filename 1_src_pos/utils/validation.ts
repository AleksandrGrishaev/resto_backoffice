// src/utils/validation.ts

import { Bill, BillItem } from '@/types/bill'
import { Order, DeliveryType } from '@/types/order'
import { Table, TableStatus } from '@/types/table'
import { PaymentData, ValidationResult } from '@/types/payment'
import { MoveItemsPayload, MoveBillPayload } from '@/types/bill'

//#region Payment Validation
export function validatePayment(data: PaymentData, bill: Bill): ValidationResult {
  // Проверяем существование счета
  if (!bill) {
    return {
      isValid: false,
      code: 'INVALID_BILL',
      message: 'Bill not found'
    }
  }

  // Проверяем существование позиций
  const invalidItems = data.items.filter(itemId => !bill.items.find(i => i.id === itemId))
  if (invalidItems.length > 0) {
    return {
      isValid: false,
      code: 'INVALID_ITEMS',
      message: 'Some items not found in bill'
    }
  }

  // Проверяем статусы позиций
  const nonPayableItems = data.items.filter(itemId => {
    const item = bill.items.find(i => i.id === itemId)
    return item?.status === 'cancelled' || item?.paymentStatus === 'paid'
  })

  if (nonPayableItems.length > 0) {
    return {
      isValid: false,
      code: 'INVALID_ITEM_STATUS',
      message: 'Some items cannot be paid'
    }
  }

  return {
    isValid: true,
    code: 'VALID',
    message: 'Payment data is valid'
  }
}
//#endregion

//#region Order Payment Validation
export function validateOrderPayment(bills: Bill[]): ValidationResult {
  // Проверяем наличие неоплаченных позиций
  const hasUnpaidItems = bills.some(bill =>
    bill.items.some(item => item.status !== 'cancelled' && item.paymentStatus !== 'paid')
  )

  if (hasUnpaidItems) {
    return {
      isValid: false,
      code: 'UNPAID_ITEMS',
      message: 'Order has unpaid items'
    }
  }

  // Проверяем незавершенные позиции
  const hasUnfinishedItems = bills.some(bill =>
    bill.items.some(item => item.status !== 'completed' && item.status !== 'cancelled')
  )

  if (hasUnfinishedItems) {
    return {
      isValid: false,
      code: 'UNFINISHED_ITEMS',
      message: 'Order has unfinished items'
    }
  }

  return {
    isValid: true,
    code: 'VALID',
    message: 'Order can be closed'
  }
}

export function validateOrderClose(bills: Bill[]): ValidationResult {
  // Проверяем статусы всех счетов
  const hasActiveBills = bills.some(bill => bill.status === 'active')
  if (hasActiveBills) {
    return {
      isValid: false,
      code: 'ACTIVE_BILLS',
      message: 'Order has active bills'
    }
  }

  // Проверяем все позиции должны быть либо оплачены, либо отменены
  const hasInvalidItems = bills.some(bill =>
    bill.items.some(item => item.status !== 'cancelled' && item.paymentStatus !== 'paid')
  )

  if (hasInvalidItems) {
    return {
      isValid: false,
      code: 'INVALID_ITEMS',
      message: 'Order has unpaid or active items'
    }
  }

  return {
    isValid: true,
    code: 'VALID',
    message: 'Order can be closed'
  }
}
//#endregion

//#region Table Validation
export function validateTableStatus(table: Table, bills: Bill[]): ValidationResult {
  if (table.status === 'free') {
    return {
      isValid: false,
      code: 'INVALID_TABLE_STATUS',
      message: 'Table is already free'
    }
  }

  // Проверяем оплату всех позиций для смены статуса
  const hasUnpaidItems = bills.some(bill =>
    bill.items.some(item => item.status !== 'cancelled' && item.paymentStatus !== 'paid')
  )

  // Определяем возможный статус стола
  const newStatus: TableStatus = hasUnpaidItems ? 'occupied_unpaid' : 'occupied_paid'

  if (table.status === newStatus) {
    return {
      isValid: false,
      code: 'SAME_STATUS',
      message: `Table is already ${newStatus}`
    }
  }

  return {
    isValid: true,
    code: 'VALID',
    message: 'Table status can be updated',
    data: { newStatus }
  }
}
//#endregion

//#region Move Validation

export function validateMoveItems(
  payload: MoveItemsPayload,
  sourceBill: Bill,
  targetBill: Bill
): ValidationResult {
  // 1. Проверяем существование счетов
  if (!sourceBill || !targetBill) {
    return {
      isValid: false,
      code: 'INVALID_BILLS',
      message: 'Source or target bill not found'
    }
  }

  // 2. Проверяем что счета активны
  if (sourceBill.status !== 'active' || targetBill.status !== 'active') {
    return {
      isValid: false,
      code: 'INVALID_BILL_STATUS',
      message: 'Can only move items between active bills'
    }
  }

  // 3. Проверяем оплату целевого счета
  if (targetBill.paymentStatus === 'paid') {
    return {
      isValid: false,
      code: 'TARGET_BILL_PAID',
      message: 'Cannot move items to paid bill'
    }
  }

  // 4. Проверяем позиции
  const items = payload.items.map(id => sourceBill.items.find(item => item.id === id))

  // Все позиции существуют
  if (items.some(item => !item)) {
    return {
      isValid: false,
      code: 'ITEMS_NOT_FOUND',
      message: 'Some items not found in source bill'
    }
  }

  // Проверяем оплаченные позиции
  const hasPaidItems = items.some(item => item?.paymentStatus === 'paid')
  if (hasPaidItems) {
    return {
      isValid: false,
      code: 'ITEMS_PAID',
      message: 'Cannot move paid items to another bill'
    }
  }

  // Проверяем статусы позиций
  const invalidItems = items.filter(
    item => item?.status !== 'pending' && item?.status !== 'ordered'
  )
  if (invalidItems.length > 0) {
    return {
      isValid: false,
      code: 'INVALID_ITEM_STATUS',
      message: 'Can only move pending or ordered items'
    }
  }

  return {
    isValid: true,
    code: 'VALID',
    message: 'Items can be moved'
  }
}

export function validateMoveBill(
  payload: MoveBillPayload,
  bill: Bill,
  sourceOrder: Order,
  targetOrder?: Order
): ValidationResult {
  // 1. Проверяем существование счета
  if (!bill) {
    return {
      isValid: false,
      code: 'BILL_NOT_FOUND',
      message: 'Bill not found'
    }
  }

  // 2. Проверяем статус счета
  if (bill.status !== 'active') {
    return {
      isValid: false,
      code: 'INVALID_BILL_STATUS',
      message: 'Can only move active bills'
    }
  }

  // 3. Проверяем смену типа
  if (payload.newType) {
    const validation = validateDeliveryTypeChange(bill, payload.newType)
    if (!validation.isValid) {
      return validation
    }
  }

  // 4. Проверяем перемещение между заказами
  if (payload.targetOrderId) {
    if (!targetOrder) {
      return {
        isValid: false,
        code: 'TARGET_ORDER_NOT_FOUND',
        message: 'Target order not found'
      }
    }

    // Проверяем совместимость типов заказов
    if (sourceOrder.type === 'dine-in' && targetOrder.type !== 'dine-in') {
      return {
        isValid: false,
        code: 'INCOMPATIBLE_ORDER_TYPES',
        message: 'Cannot move dine-in bill to non dine-in order'
      }
    }
  }

  return {
    isValid: true,
    code: 'VALID',
    message: 'Bill can be moved'
  }
}

export function validateDiscountAdd(billItem: BillItem): ValidationResult {
  if (billItem.paymentStatus === 'paid') {
    return {
      isValid: false,
      code: 'PAID_ITEM',
      message: 'Cannot add discount to paid item'
    }
  }
  return {
    isValid: true,
    code: 'VALID',
    message: 'Can add discount'
  }
}

function validateDeliveryTypeChange(bill: Bill, newType: DeliveryType): ValidationResult {
  // Проверяем возможность смены типа с учетом статусов позиций
  const hasLockedItems = bill.items.some(
    item => item.status !== 'pending' && item.status !== 'ordered'
  )

  if (hasLockedItems) {
    return {
      isValid: false,
      code: 'ITEMS_LOCKED',
      message: 'Cannot change delivery type when items are cooking or completed'
    }
  }

  // Для takeaway/delivery должен быть только один счет
  if (newType !== 'dine-in' && bill.items.length > 0) {
    return {
      isValid: false,
      code: 'MULTIPLE_ITEMS_NOT_ALLOWED',
      message: 'Takeaway/delivery orders can only have one bill'
    }
  }

  return {
    isValid: true,
    code: 'VALID',
    message: 'Delivery type can be changed'
  }
}
//#endregion
