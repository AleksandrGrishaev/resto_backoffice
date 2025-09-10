// src/stores/bill.store.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  Bill,
  BillItem,
  BillDiscount,
  DiscountReason,
  SelectableState,
  SelectionMode,
  BillHistoryType,
  BillHistoryChange,
  ValidationResult,
  CancellationReason,
  AddItemData,
  STATUS_TRANSITIONS
} from '@/types/bill'
import { Discount } from '@/types/discount'
import { MenuItem, MenuItemVariant } from '@/types/menu'
import { DebugUtils } from '@/utils'
import { PaymentStatus } from '@/types/payment'
import { usePaymentStore } from '@/stores/payment/payment.store'
import { useOrderStore } from '@/stores/order.store'
import { useDiscountStore } from '@/stores/discount.store'

const MODULE_NAME = 'billStore'

export const useBillStore = defineStore('bill', () => {
  //#region State
  const activeBill = ref<Bill | null>(null)
  const hasUnsavedChanges = ref(false)
  const selection = ref<SelectableState>({
    selectedItems: new Set<string>(),
    selectedBills: new Set<string>(),
    selectionMode: 'none'
  })
  const paymentStore = usePaymentStore()
  const orderStore = useOrderStore()
  const discountStore = useDiscountStore()

  const billHistory = ref<BillHistoryChange[]>([])
  //#endregion

  //#region Computed
  const billSubtotal = computed(() => {
    if (!activeBill.value) return 0

    return activeBill.value.items.reduce((sum, item) => {
      if (item.status === 'cancelled') return sum
      const quantity = item.quantity - (item.activeCancellations || 0)
      const itemTotal = item.price * quantity

      // Учитываем скидку на позицию если есть
      if (item.discount) {
        return sum + (itemTotal - item.discount.discountedAmount)
      }

      return sum + itemTotal
    }, 0)
  })

  const billDiscountedTotal = computed(() => {
    const subtotal = billSubtotal.value
    const activeDiscount = activeBill.value?.discount

    if (activeDiscount) {
      return subtotal * (1 - activeDiscount.value / 100)
    }

    return subtotal
  })

  const billTaxes = computed(() => ({
    serviceTax: billSubtotal.value * 0.05,
    governmentTax: billSubtotal.value * 0.1
  }))

  const billTotal = computed(() => {
    const subtotal = billSubtotal.value
    const customerDiscount = activeBill.value?.customerDiscount

    // Применяем скидку клиента если есть
    const afterDiscount = customerDiscount ? subtotal - customerDiscount.discountedAmount : subtotal

    // Добавляем налоги
    const taxAmount = afterDiscount * 0.15 // 5% + 10% налоги
    return afterDiscount + taxAmount
  })

  const hasSelection = computed(() => {
    const items = selection.value.selectedItems
    const bills = selection.value.selectedBills

    // Проверяем что это действительно Set
    if (!(items instanceof Set) || !(bills instanceof Set)) {
      return false
    }

    return items.size > 0 || bills.size > 0
  })

  const billDiscount = computed(() => {
    if (!activeBill.value) return 0
    return activeBill.value.items.reduce((sum, item) => {
      if (!item.discounts?.[0]) return sum
      const basePrice = item.price * (item.quantity - (item.activeCancellations || 0))
      const discountAmount = basePrice * (item.discounts[0].value / 100)
      return sum + discountAmount
    }, 0)
  })

  const getBillPaymentStatus = computed(() => (billId: string): PaymentStatus => {
    const bill = orderStore.bills.find(b => b.id === billId)
    if (!bill) return 'unpaid'

    // Новый счет без позиций
    if (bill.items.length === 0) return 'new'

    const totalPaid = paymentStore.getTotalPaidAmount(billId)

    // Вычисляем общую сумму счета
    const billItemsTotal = bill.items.reduce((sum: number, item: BillItem) => {
      if (item.status === 'cancelled') return sum
      const activeQuantity = item.quantity - (item.activeCancellations || 0)
      const priceToUse = item.discountedPrice || item.price
      return sum + priceToUse * activeQuantity
    }, 0)

    // Добавляем налоги
    const withTaxes = billItemsTotal + billItemsTotal * 0.05 + billItemsTotal * 0.1

    return totalPaid >= withTaxes ? 'paid' : 'unpaid'
  })
  //#endregion

  //#region Selection Methods

  const clearSelection = () => {
    DebugUtils.debug(MODULE_NAME, 'Clearing selection')
    selection.value.selectedItems.clear()
    selection.value.selectedBills.clear()
    selection.value.selectionMode = 'none'
  }

  const isItemSelected = (itemId: string) => selection.value.selectedItems.has(itemId)

  const toggleItemSelection = (itemId: string) => {
    DebugUtils.debug(MODULE_NAME, 'Toggling item selection', { itemId })
    if (!activeBill.value) return

    if (selection.value.selectedItems.size === 0 && selection.value.selectionMode === 'none') {
      selection.value.selectionMode = 'items'
    }

    if (selection.value.selectedItems.has(itemId)) {
      selection.value.selectedItems.delete(itemId)
      if (selection.value.selectedItems.size === 0) {
        selection.value.selectionMode = 'none'
      }
    } else {
      selection.value.selectedItems.add(itemId)
    }

    DebugUtils.debug(MODULE_NAME, 'Selection after toggle', {
      selectedItems: Array.from(selection.value.selectedItems),
      mode: selection.value.selectionMode
    })
  }

  const toggleBillSelection = (billId: string) => {
    DebugUtils.debug(MODULE_NAME, 'Toggling bill selection', { billId })

    // Если это первый выбор и нет текущего режима
    if (selection.value.selectedBills.size === 0 && selection.value.selectionMode === 'none') {
      selection.value.selectionMode = 'bills'
    }

    if (selection.value.selectedBills.has(billId)) {
      selection.value.selectedBills.delete(billId)
      // Если удалили последний выбранный счет
      if (selection.value.selectedBills.size === 0) {
        selection.value.selectionMode = 'none'
      }
    } else {
      selection.value.selectedBills.add(billId)
    }

    DebugUtils.debug(MODULE_NAME, 'Bills selection after toggle', {
      selectedBills: Array.from(selection.value.selectedBills),
      mode: selection.value.selectionMode
    })
  }

  const selectBillItems = (bill: Bill) => {
    selection.value.selectionMode = 'items'
    bill.items.forEach(item => {
      if (!selection.value.selectedItems.has(item.id)) {
        selection.value.selectedItems.add(item.id)
      }
    })
  }
  const unselectBillItems = (bill: Bill) => {
    bill.items.forEach(item => {
      selection.value.selectedItems.delete(item.id)
    })
  }
  //#endregion

  //#region Discount Methods
  const applyItemDiscount = async (
    itemId: string,
    discount: Discount
  ): Promise<ValidationResult> => {
    if (!activeBill.value) {
      return {
        isValid: false,
        code: 'NO_BILL',
        message: 'No active bill'
      }
    }

    const item = activeBill.value.items.find(i => i.id === itemId)
    if (!item) {
      return {
        isValid: false,
        code: 'NO_ITEM',
        message: 'Item not found'
      }
    }

    // Проверяем что позиция еще не оплачена
    if (item.paymentStatus === 'paid') {
      return {
        isValid: false,
        code: 'ITEM_PAID',
        message: 'Cannot apply discount to paid item'
      }
    }

    // Считаем общую сумму позиции
    const itemTotal = item.price * (item.quantity - (item.activeCancellations || 0))

    // Проверяем возможность применения скидки
    const validation = discountStore.validateDiscount(itemTotal, discount)
    if (!validation.isValid) return validation

    // Рассчитываем и применяем скидку
    const discountAmount = discountStore.calculateDiscountAmount(itemTotal, discount.value)

    // Сохраняем оригинальную цену
    item.priceBeforeDiscount = itemTotal

    // Применяем скидку
    item.discount = {
      id: `discount_${Date.now()}`,
      discountId: discount.id,
      value: discount.value,
      appliedAt: new Date().toISOString(),
      appliedBy: 'current_user', // TODO: Get from auth store
      discountedAmount: discountAmount
    }

    // Добавляем запись в историю
    addHistoryRecord(
      'discount_added',
      {
        before: { price: itemTotal },
        after: {
          price: itemTotal - discountAmount,
          discount: item.discount
        }
      },
      itemId
    )

    hasUnsavedChanges.value = true

    return {
      isValid: true,
      code: 'DISCOUNT_APPLIED',
      message: 'Discount applied successfully'
    }
  }

  const applyCustomerDiscount = async (discount: Discount): Promise<ValidationResult> => {
    if (!activeBill.value) {
      return {
        isValid: false,
        code: 'NO_BILL',
        message: 'No active bill'
      }
    }

    // Проверяем возможность применения скидки
    const validation = discountStore.validateDiscount(billSubtotal.value, discount)
    if (!validation.isValid) return validation

    // Рассчитываем и применяем скидку
    const discountAmount = discountStore.calculateDiscountAmount(billSubtotal.value, discount.value)

    // Сохраняем сумму до скидки
    activeBill.value.priceBeforeDiscount = billSubtotal.value

    // Применяем скидку клиента
    activeBill.value.customerDiscount = {
      id: `discount_${Date.now()}`,
      discountId: discount.id,
      value: discount.value,
      appliedAt: new Date().toISOString(),
      appliedBy: 'current_user', // TODO: Get from auth store
      discountedAmount: discountAmount
    }

    // Добавляем запись в историю
    addHistoryRecord('discount_added', {
      before: { total: billSubtotal.value },
      after: {
        total: billSubtotal.value - discountAmount,
        discount: activeBill.value.customerDiscount
      }
    })

    hasUnsavedChanges.value = true

    return {
      isValid: true,
      code: 'DISCOUNT_APPLIED',
      message: 'Customer discount applied successfully'
    }
  }

  const removeItemDiscount = async (itemId: string): Promise<ValidationResult> => {
    if (!activeBill.value) {
      return {
        isValid: false,
        code: 'NO_BILL',
        message: 'No active bill'
      }
    }

    const item = activeBill.value.items.find(i => i.id === itemId)
    if (!item) {
      return {
        isValid: false,
        code: 'NO_ITEM',
        message: 'Item not found'
      }
    }

    if (!item.discount) {
      return {
        isValid: false,
        code: 'NO_DISCOUNT',
        message: 'Item has no discount to remove'
      }
    }

    const oldDiscount = { ...item.discount }
    item.discount = undefined

    addHistoryRecord(
      'discount_removed',
      {
        before: { discount: oldDiscount },
        after: { discount: null }
      },
      itemId
    )

    hasUnsavedChanges.value = true

    return {
      isValid: true,
      code: 'DISCOUNT_REMOVED',
      message: 'Item discount removed successfully'
    }
  }

  const removeCustomerDiscount = async (): Promise<ValidationResult> => {
    if (!activeBill.value?.customerDiscount) {
      return {
        isValid: false,
        code: 'NO_DISCOUNT',
        message: 'Bill has no customer discount to remove'
      }
    }

    const oldDiscount = { ...activeBill.value.customerDiscount }
    activeBill.value.customerDiscount = undefined

    addHistoryRecord('discount_removed', {
      before: { discount: oldDiscount },
      after: { discount: null }
    })

    hasUnsavedChanges.value = true

    return {
      isValid: true,
      code: 'DISCOUNT_REMOVED',
      message: 'Customer discount removed successfully'
    }
  }
  //#endregion

  //#region Item Management
  const addItem = async (data: AddItemData): Promise<void> => {
    if (!activeBill.value) {
      throw new Error('No active bill')
    }

    const newItem: BillItem = {
      id: `item_${Date.now()}`,
      dishId: data.dishId,
      variantId: data.variantId,
      quantity: data.quantity,
      price: data.price, // базовая цена из меню
      discountedPrice: data.price, // изначально равна базовой цене
      status: data.status,
      notes: data.notes,
      history: []
    }

    activeBill.value.items.push(newItem)
    hasUnsavedChanges.value = true

    // Обновляем запись в истории, добавляя информацию о ценах
    addHistoryRecord(
      'item_added',
      {
        after: {
          ...newItem,
          pricing: {
            basePrice: data.price,
            discountedPrice: data.price,
            totalPrice: data.price * data.quantity
          }
        }
      },
      newItem.id
    )
  }

  const updateBillItem = async (
    itemId: string,
    changes: {
      quantity?: number
      notes?: string
      variantId?: string
    }
  ) => {
    if (!activeBill.value) return

    const item = activeBill.value.items.find(i => i.id === itemId)
    if (!item) return

    DebugUtils.debug(MODULE_NAME, 'Updating bill item', { itemId, changes })

    const oldItem = { ...item }

    if (changes.quantity) item.quantity = changes.quantity
    if (changes.notes !== undefined) item.notes = changes.notes
    if (changes.variantId) item.variantId = changes.variantId

    hasUnsavedChanges.value = true

    addHistoryRecord(
      'item_modified',
      {
        before: oldItem,
        after: item
      },
      itemId
    )
  }

  const removeItem = async (itemId: string) => {
    if (!activeBill.value) return

    DebugUtils.debug(MODULE_NAME, 'Removing item from bill', { itemId })

    const itemIndex = activeBill.value.items.findIndex(i => i.id === itemId)
    if (itemIndex === -1) return

    const [removedItem] = activeBill.value.items.splice(itemIndex, 1)
    hasUnsavedChanges.value = true

    addHistoryRecord(
      'item_removed',
      {
        before: removedItem
      },
      itemId
    )
  }

  const cancelItem = async (
    itemId: string,
    cancellation: {
      reason: CancellationReason
      note: string
      quantity: number
      userId: string
    }
  ) => {
    if (!activeBill.value) return

    DebugUtils.debug(MODULE_NAME, 'Cancelling item', { itemId, cancellation })

    const item = activeBill.value.items.find(i => i.id === itemId)
    if (!item) return

    const oldItem = { ...item }

    if (!item.cancellations) {
      item.cancellations = []
    }

    item.cancellations.push({
      ...cancellation,
      timestamp: new Date().toISOString()
    })

    item.activeCancellations = (item.activeCancellations || 0) + cancellation.quantity

    if (item.activeCancellations >= item.quantity) {
      item.status = 'cancelled'
    }

    hasUnsavedChanges.value = true

    addHistoryRecord(
      'item_cancelled',
      {
        before: oldItem,
        after: item,
        notes: cancellation.note
      },
      itemId
    )
  }

  const addItemDiscount = async (
    itemId: string,
    discount: { value: number; reason: DiscountReason }
  ) => {
    if (!activeBill.value) return

    const item = activeBill.value.items.find(i => i.id === itemId)
    if (!item) return

    DebugUtils.debug(MODULE_NAME, 'Adding discount to item', { itemId, discount })

    const oldItem = { ...item }
    const oldPricing = {
      basePrice: item.price,
      discountedPrice: item.discountedPrice || item.price,
      totalPrice: calculateItemPrice(item)
    }

    const newDiscount: BillDiscount = {
      id: `discount_${Date.now()}`,
      value: discount.value,
      reason: discount.reason,
      timestamp: new Date().toISOString()
    }

    item.discounts = [newDiscount] // Заменяем существующую скидку новой
    item.discountedPrice = item.price * (1 - discount.value / 100)

    hasUnsavedChanges.value = true

    // Обновляем историю с информацией о ценах
    addHistoryRecord(
      'discount_added',
      {
        before: {
          ...oldItem,
          pricing: oldPricing
        },
        after: {
          ...item,
          pricing: {
            basePrice: item.price,
            discountedPrice: item.discountedPrice,
            totalPrice: calculateItemPrice(item)
          }
        }
      },
      itemId
    )
  }

  const calculateItemPrice = (item: BillItem): number => {
    if (item.status === 'cancelled') return 0

    const activeQuantity = item.quantity - (item.activeCancellations || 0)
    const priceToUse = item.discountedPrice || item.price

    return priceToUse * activeQuantity
  }

  //#endregion

  //#region Bill Management
  const setActiveBill = (bill: Bill | null) => {
    DebugUtils.debug(MODULE_NAME, 'Setting active bill', { billId: bill?.id })
    activeBill.value = bill

    // Пересоздаем selection с правильными типами
    selection.value = {
      selectedItems: new Set<string>(),
      selectedBills: new Set<string>(),
      selectionMode: 'none'
    }

    hasUnsavedChanges.value = false
  }

  const removeBill = async (billId: string): Promise<void> => {
    if (!activeBill.value || activeBill.value.id !== billId) return

    if (activeBill.value.items.length > 0) {
      throw new Error('Cannot remove bill with items')
    }

    // Очищаем состояние
    activeBill.value = null
    clearSelection()
    hasUnsavedChanges.value = true

    // Добавляем запись в историю
    addHistoryRecord({
      type: 'bill_removed',
      changes: {
        before: { id: billId },
        after: null
      }
    })
  }

  const updateBillName = async (billId: string, newName: string): Promise<void> => {
    if (!activeBill.value || activeBill.value.id !== billId) return

    const oldName = activeBill.value.name
    activeBill.value.name = newName
    hasUnsavedChanges.value = true

    // Добавляем запись в историю
    addHistoryRecord({
      type: 'bill_renamed',
      changes: {
        before: { name: oldName },
        after: { name: newName }
      }
    })
  }

  const validateBill = (): ValidationResult => {
    if (!activeBill.value) {
      return {
        isValid: false,
        code: 'NO_ACTIVE_BILL',
        message: 'No active bill'
      }
    }

    // Проверяем только валидность существующих позиций, если они есть
    const invalidItems = activeBill.value.items.filter(
      item => !item.dishId || item.quantity <= 0 || item.price <= 0
    )

    if (invalidItems.length > 0) {
      return {
        isValid: false,
        code: 'INVALID_ITEMS',
        message: 'Bill contains invalid items'
      }
    }

    return {
      isValid: true,
      code: 'VALID',
      message: 'Bill is valid'
    }
  }
  const validateStatus = (status: string): ValidationResult => {
    if (!activeBill.value) {
      return {
        isValid: false,
        code: 'NO_ACTIVE_BILL',
        message: 'No active bill'
      }
    }

    const hasValidTransitions = activeBill.value.items.every(item => {
      if (item.status === 'cancelled' || item.status === 'completed') return true
      return STATUS_TRANSITIONS[item.status].length > 0
    })

    if (!hasValidTransitions) {
      return {
        isValid: false,
        code: 'INVALID_ITEM_STATUS',
        message: 'Invalid item status transitions'
      }
    }

    return {
      isValid: true,
      code: 'VALID',
      message: 'Status transitions are valid'
    }
  }

  const isBillEditable = (): boolean => {
    if (!activeBill.value) return false
    if (activeBill.value.status !== 'active') return false

    return (
      activeBill.value.items.length === 0 ||
      activeBill.value.items.some(
        item => item.status !== 'completed' && item.status !== 'cancelled'
      )
    )
  }

  //#endregion

  //#region History Management
  const addHistoryRecord = (type: BillHistoryType, changes: BillHistoryChange, itemId?: string) => {
    if (!activeBill.value) return

    const record = {
      id: `hist_${Date.now()}`,
      billId: activeBill.value.id,
      itemId,
      type,
      changes,
      timestamp: new Date().toISOString(),
      userId: 'current_user' // TODO: Get from auth store
    }

    billHistory.value.push(record)
  }
  //#endregion

  return {
    // State
    activeBill,
    selection,
    hasUnsavedChanges,
    billHistory,

    // Computed
    billSubtotal,
    billTaxes,
    billTotal,
    hasSelection,
    billDiscountedTotal,
    billDiscount,
    getBillPaymentStatus,

    // Selection Methods
    clearSelection,
    toggleItemSelection,
    isItemSelected,
    toggleBillSelection,
    selectBillItems,
    unselectBillItems,

    // Discount Getters
    applyItemDiscount,
    applyCustomerDiscount,
    removeItemDiscount,
    removeCustomerDiscount,

    // Item Management
    addItem,
    updateBillItem,
    removeItem,
    cancelItem,
    addItemDiscount,
    calculateItemPrice,

    // Bill Management
    setActiveBill,
    updateBillName,
    validateBill,
    validateStatus,
    isBillEditable,
    removeBill,

    // History Management
    addHistoryRecord
  }
})
