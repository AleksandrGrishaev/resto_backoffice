// src/stores/pos/orders/composables/useOrderCalculations.ts
import { computed, type Ref } from 'vue'
import type {
  PosBill,
  PosBillItem,
  PosItemDiscount,
  PosOrder,
  OrderStatus,
  OrderType,
  OrderPaymentStatus
} from '@/stores/pos/types'

/**
 * Composable for order calculations with selection support
 * Calculates only selected items if any are selected, otherwise calculates all items
 */
export function useOrderCalculations(
  bills: PosBill[] | (() => PosBill[]),
  options: {
    serviceTaxRate?: number
    governmentTaxRate?: number
    includeServiceTax?: boolean
    includeGovernmentTax?: boolean
    selectedItemIds?: Ref<string[]> | (() => string[])
    activeBillId?: Ref<string | null> | (() => string | null)
  } = {}
) {
  const {
    serviceTaxRate = 5,
    governmentTaxRate = 10,
    includeServiceTax = true,
    includeGovernmentTax = true,
    selectedItemIds,
    activeBillId
  } = options

  // Normalize inputs to reactive getters
  const getBills = typeof bills === 'function' ? bills : () => bills
  const getSelectedItemIds = selectedItemIds
    ? typeof selectedItemIds === 'function'
      ? selectedItemIds
      : () => selectedItemIds.value
    : () => []
  const getActiveBillId = activeBillId
    ? typeof activeBillId === 'function'
      ? activeBillId
      : () => activeBillId.value
    : () => null

  // =============================================
  // ITEM FILTERING LOGIC
  // =============================================

  /**
   * Get items to calculate based on selection
   * If items are selected -> calculate only selected items
   * If no items selected -> calculate ALL items from ALL bills (entire order)
   */
  const getItemsToCalculate = computed((): PosBillItem[] => {
    const selectedIds = getSelectedItemIds()
    const allBills = getBills()

    // If items are selected, return only selected items
    if (selectedIds.length > 0) {
      const allItems = allBills.flatMap(bill => bill.items)
      return allItems.filter(item => selectedIds.includes(item.id) && item.status !== 'cancelled')
    }

    // If no items selected, return ALL items from ALL bills (entire order)
    return allBills.flatMap(bill => bill.items.filter(item => item.status !== 'cancelled'))
  })

  // =============================================
  // BASIC CALCULATIONS
  // =============================================

  /**
   * Calculate subtotal for selected/active items
   */
  const subtotal = computed((): number => {
    return getItemsToCalculate.value.reduce((sum, item) => {
      return sum + item.totalPrice
    }, 0)
  })

  /**
   * Calculate total item-level discounts for selected/active items
   */
  const itemDiscounts = computed((): number => {
    return getItemsToCalculate.value.reduce((sum, item) => {
      return sum + calculateItemDiscounts(item)
    }, 0)
  })

  /**
   * Calculate bill-level discounts (proportional for selected items)
   */
  const billDiscounts = computed((): number => {
    const selectedIds = getSelectedItemIds()
    const allBills = getBills()

    // If no items selected, include all bill discounts
    if (selectedIds.length === 0) {
      const activeId = getActiveBillId()
      if (activeId) {
        const activeBill = allBills.find(bill => bill.id === activeId)
        return activeBill?.discountAmount || 0
      }
      return allBills.reduce((sum, bill) => sum + (bill.discountAmount || 0), 0)
    }

    // If items are selected, calculate proportional bill discounts
    let totalBillDiscounts = 0

    for (const bill of allBills) {
      const billItems = bill.items.filter(item => item.status !== 'cancelled')
      const selectedBillItems = billItems.filter(item => selectedIds.includes(item.id))

      if (selectedBillItems.length > 0 && bill.discountAmount) {
        const billSubtotal = billItems.reduce((sum, item) => sum + item.totalPrice, 0)
        const selectedSubtotal = selectedBillItems.reduce((sum, item) => sum + item.totalPrice, 0)

        if (billSubtotal > 0) {
          const proportion = selectedSubtotal / billSubtotal
          totalBillDiscounts += bill.discountAmount * proportion
        }
      }
    }

    return totalBillDiscounts
  })

  /**
   * Calculate total discounts (items + bills)
   */
  const totalDiscounts = computed((): number => {
    return itemDiscounts.value + billDiscounts.value
  })

  /**
   * Calculate subtotal after all discounts
   */
  const discountedSubtotal = computed((): number => {
    return Math.max(0, subtotal.value - totalDiscounts.value)
  })

  // =============================================
  // TAX CALCULATIONS
  // =============================================

  /**
   * Calculate service tax
   */
  const serviceTax = computed((): number => {
    if (!includeServiceTax) return 0
    return discountedSubtotal.value * (serviceTaxRate / 100)
  })

  /**
   * Calculate government tax
   */
  const governmentTax = computed((): number => {
    if (!includeGovernmentTax) return 0
    return discountedSubtotal.value * (governmentTaxRate / 100)
  })

  /**
   * Calculate total taxes
   */
  const totalTaxes = computed((): number => {
    return serviceTax.value + governmentTax.value
  })

  /**
   * Calculate final total (subtotal - discounts + taxes)
   */
  const finalTotal = computed((): number => {
    return discountedSubtotal.value + totalTaxes.value
  })

  // =============================================
  // SELECTION INFO
  // =============================================

  /**
   * Check if any items are selected
   */
  const hasSelection = computed((): boolean => {
    return getSelectedItemIds().length > 0
  })

  /**
   * Get count of selected items
   */
  const selectedItemsCount = computed((): number => {
    return getSelectedItemIds().length
  })

  /**
   * Get calculation scope info
   */
  const calculationScope = computed(() => {
    const selectedIds = getSelectedItemIds()
    const activeId = getActiveBillId()

    if (selectedIds.length > 0) {
      return {
        type: 'selected' as const,
        itemsCount: selectedIds.length,
        description: `${selectedIds.length} selected items`
      }
    }

    if (activeId) {
      const activeBill = getBills().find(bill => bill.id === activeId)
      const activeItemsCount =
        activeBill?.items.filter(item => item.status !== 'cancelled').length || 0
      return {
        type: 'bill' as const,
        itemsCount: activeItemsCount,
        description: `All items from ${activeBill?.name || 'current bill'}`
      }
    }

    const allItemsCount = getBills().flatMap(bill =>
      bill.items.filter(item => item.status !== 'cancelled')
    ).length

    return {
      type: 'order' as const,
      itemsCount: allItemsCount,
      description: 'All items from order'
    }
  })

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  /**
   * Calculate discounts for a single item
   */
  function calculateItemDiscounts(item: PosBillItem): number {
    if (!item.discounts?.length) return 0

    return item.discounts.reduce((sum, discount) => {
      if (discount.type === 'percentage') {
        return sum + item.totalPrice * (discount.value / 100)
      } else {
        return sum + discount.value
      }
    }, 0)
  }

  /**
   * Calculate price after discounts for a single item
   */
  function calculateItemFinalPrice(item: PosBillItem): number {
    if (item.status === 'cancelled') return 0
    return Math.max(0, item.totalPrice - calculateItemDiscounts(item))
  }

  /**
   * Format price using Indonesian Rupiah
   */
  function formatPrice(price: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
  }

  // =============================================
  // PAYMENT CALCULATIONS (Legacy - for full order)
  // =============================================

  /**
   * Calculate total paid amount across all bills
   */
  const paidAmount = computed((): number => {
    return getBills().reduce((sum, bill) => sum + (bill.paidAmount || 0), 0)
  })

  /**
   * Calculate remaining amount to be paid
   */
  const remainingAmount = computed((): number => {
    return Math.max(0, finalTotal.value - paidAmount.value)
  })

  // =============================================
  // STATISTICS
  // =============================================

  /**
   * Get calculation statistics
   */
  const calculationStats = computed(() => {
    const items = getItemsToCalculate.value

    return {
      itemsCount: items.length,
      averageItemPrice: items.length > 0 ? subtotal.value / items.length : 0,
      discountPercentage: subtotal.value > 0 ? (totalDiscounts.value / subtotal.value) * 100 : 0,
      taxPercentage:
        discountedSubtotal.value > 0 ? (totalTaxes.value / discountedSubtotal.value) * 100 : 0,
      scope: calculationScope.value
    }
  })

  // =============================================
  // DEBUG UTILITIES
  // =============================================

  /**
   * Get detailed calculation breakdown for debugging
   */
  function getCalculationBreakdown() {
    return {
      scope: calculationScope.value,
      items: getItemsToCalculate.value.map(item => ({
        id: item.id,
        name: item.menuItemName,
        price: item.totalPrice,
        discounts: calculateItemDiscounts(item),
        finalPrice: calculateItemFinalPrice(item)
      })),
      calculations: {
        subtotal: subtotal.value,
        itemDiscounts: itemDiscounts.value,
        billDiscounts: billDiscounts.value,
        totalDiscounts: totalDiscounts.value,
        discountedSubtotal: discountedSubtotal.value,
        serviceTax: serviceTax.value,
        governmentTax: governmentTax.value,
        totalTaxes: totalTaxes.value,
        finalTotal: finalTotal.value
      },
      stats: calculationStats.value
    }
  }

  // =============================================
  // RETURN COMPOSABLE
  // =============================================

  return {
    // Basic calculations
    subtotal,
    itemDiscounts,
    billDiscounts,
    totalDiscounts,
    discountedSubtotal,

    // Tax calculations
    serviceTax,
    governmentTax,
    totalTaxes,
    finalTotal,

    // Selection info
    hasSelection,
    selectedItemsCount,
    calculationScope,

    // Payment (legacy - full order)
    paidAmount,
    remainingAmount,

    // Utilities
    calculateItemDiscounts,
    calculateItemFinalPrice,
    formatPrice,

    // Statistics
    calculationStats,

    // Debug
    getCalculationBreakdown
  }
}

// =============================================
// ORDER-LEVEL CALCULATIONS (for ordersStore)
// =============================================

/**
 * Пересчитать totals для заказа (модифицирует order in-place)
 * Переносится из ordersStore
 */
export function recalculateOrderTotals(order: PosOrder): void {
  let totalAmount = 0
  let discountAmount = 0

  // Пересчитать каждый счет
  order.bills.forEach(bill => {
    let billSubtotal = 0
    let billDiscountAmount = 0

    bill.items.forEach(item => {
      if (item.status === 'cancelled') return

      // Subtotal позиции (цена * количество)
      const itemSubtotal = item.totalPrice
      billSubtotal += itemSubtotal

      // Скидки на позицию
      if (item.discounts && item.discounts.length > 0) {
        const itemDiscounts = item.discounts.reduce((sum, discount) => {
          if (discount.type === 'percentage') {
            return sum + itemSubtotal * (discount.value / 100)
          } else {
            return sum + discount.value
          }
        }, 0)
        billDiscountAmount += itemDiscounts
      }
    })

    // Скидка на весь счет
    if (bill.discountAmount) {
      billDiscountAmount += bill.discountAmount
    }

    // Обновляем суммы счета
    bill.subtotal = billSubtotal
    bill.discountAmount = billDiscountAmount
    bill.total = Math.max(0, billSubtotal - billDiscountAmount)

    // Пересчитать статус оплаты счета на основе статусов позиций
    const activeItems = bill.items.filter(item => item.status !== 'cancelled')
    if (activeItems.length > 0) {
      const paidItems = activeItems.filter(item => item.paymentStatus === 'paid')
      if (paidItems.length === 0) {
        bill.paymentStatus = 'unpaid'
      } else if (paidItems.length === activeItems.length) {
        bill.paymentStatus = 'paid'

        // 🆕 Автоматически закрываем счет при полной оплате
        if (bill.status === 'draft' || bill.status === 'active') {
          bill.status = 'closed'
        }
      } else {
        bill.paymentStatus = 'partial'
      }
    }

    // Добавляем к общей сумме заказа (только активные счета)
    if (bill.status !== 'cancelled') {
      totalAmount += bill.total
      discountAmount += billDiscountAmount
    }
  })

  // Обновляем суммы заказа
  order.totalAmount = totalAmount
  order.discountAmount = discountAmount
  order.taxAmount = 0 // TODO: Add tax calculation if needed
  order.finalAmount = totalAmount

  // Пересчитать payment status
  const calculateOrderPaymentStatus = (bills: PosBill[]): OrderPaymentStatus => {
    const activeBills = bills.filter(bill => bill.status !== 'cancelled')

    if (activeBills.length === 0) return 'unpaid'

    const paidBills = activeBills.filter(bill => bill.paymentStatus === 'paid')
    const partialBills = activeBills.filter(bill => bill.paymentStatus === 'partial')

    if (paidBills.length === activeBills.length) return 'paid'
    if (paidBills.length > 0 || partialBills.length > 0) return 'partial'

    return 'unpaid'
  }

  const newPaymentStatus = calculateOrderPaymentStatus(order.bills)
  if (order.paymentStatus !== newPaymentStatus) {
    order.paymentStatus = newPaymentStatus
  }

  // Пересчитать order status
  const newStatus = calculateOrderStatus(order)
  if (order.status !== newStatus) {
    order.status = newStatus
  }
}

/**
 * Определить статус заказа на основе статусов позиций
 * Переносится из ordersStore
 */
export function calculateOrderStatus(order: PosOrder): OrderStatus {
  const allItems = order.bills.flatMap(bill =>
    bill.items.filter(item => item.status !== 'cancelled')
  )

  // Если нет позиций - заказ в draft
  if (allItems.length === 0) {
    return 'draft'
  }

  // Определяем статус на основе типа заказа и статусов позиций
  return determineStatusByOrderType(order.type, allItems)
}

/**
 * Определить статус заказа по типу и статусам позиций
 * Переносится из ordersStore
 */
export function determineStatusByOrderType(
  orderType: OrderType,
  items: PosBillItem[]
): OrderStatus {
  const hasAnyDraft = items.some(item => item.status === 'draft')
  const hasAnyCooking = items.some(item => item.status === 'cooking')
  const hasAnyWaiting = items.some(item => item.status === 'waiting')

  // Финальный статус зависит от типа заказа
  const getFinalStatus = (orderType: OrderType): OrderStatus => {
    switch (orderType) {
      case 'dine_in':
        return 'served'
      case 'takeaway':
        return 'collected'
      case 'delivery':
        return 'delivered'
      default:
        return 'served'
    }
  }

  const finalStatus = getFinalStatus(orderType)
  const allInFinalStatus = items.every(item => {
    // Маппинг item status → order status
    const itemStatusMap: Record<string, OrderStatus> = {
      served: finalStatus
    }
    return itemStatusMap[item.status] === finalStatus
  })

  const allReady = items.every(item =>
    ['ready', 'served', 'collected', 'delivered'].includes(item.status)
  )

  // Логика определения статуса:
  if (hasAnyDraft) return 'draft'
  if (hasAnyWaiting) return 'waiting'
  if (hasAnyCooking) return 'cooking'
  if (allReady && !allInFinalStatus) return 'ready'
  if (allInFinalStatus) return finalStatus

  return 'draft'
}
