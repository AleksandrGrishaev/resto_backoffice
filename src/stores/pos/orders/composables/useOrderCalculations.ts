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
import type { RevenueBreakdown, TaxBreakdown } from '@/stores/discounts/types'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'

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
   *
   * ✅ FIX: bill.discountAmount is now just a SUM of item.discounts[]
   * So we should NOT use it here - it would double-count discounts!
   * All discounts are already counted in itemDiscounts computed above.
   */
  const billDiscounts = computed((): number => {
    // Always return 0 - all discounts are in item.discounts[] now
    // bill.discountAmount is just a cached sum for convenience
    return 0
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
  let orderSubtotal = 0 // Sum of all bill subtotals (BEFORE discounts)
  let orderDiscountAmount = 0 // Sum of all discounts

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

    // ✅ NEW ARCHITECTURE (Sprint 7, Phase 2):
    // bill.discountAmount = bill-level discount (applied to entire bill) - NOT overwritten
    // billDiscountAmount = sum of item-level discounts (from item.discounts[])
    // Total discount = item discounts + bill discount

    const itemLevelDiscounts = billDiscountAmount
    const billLevelDiscount = bill.discountAmount || 0 // Preserve existing bill discount
    const totalDiscount = itemLevelDiscounts + billLevelDiscount

    // Обновляем суммы счета
    bill.subtotal = billSubtotal
    // DON'T overwrite bill.discountAmount - it stores bill-level discount
    // bill.discountAmount is set manually via saveBillDiscount()
    bill.total = Math.max(0, billSubtotal - totalDiscount)

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
    } else {
      // 🆕 FIX: All items cancelled - reset bill to unpaid with zero totals
      // This ensures table can be freed when all items are cancelled
      bill.paymentStatus = 'unpaid'
      bill.subtotal = 0
      bill.total = 0
      // Reset bill-level discount since there's nothing to discount
      bill.discountAmount = 0
    }

    // ✅ FIX: Sum subtotals (BEFORE discounts), not bill.total (AFTER discounts)
    // This ensures order.totalAmount represents the original price
    if (bill.status !== 'cancelled') {
      orderSubtotal += billSubtotal // Subtotal BEFORE discounts
      orderDiscountAmount += totalDiscount // Item discounts + bill discount
    }
  })

  // ✅ FIX: totalAmount = subtotal BEFORE discounts, not after
  // This is the original amount before any discounts
  order.totalAmount = orderSubtotal // Changed from totalAmount to orderSubtotal
  order.discountAmount = orderDiscountAmount

  // =============================================
  // CALCULATE REVENUE BREAKDOWN (Sprint 7)
  // =============================================
  const revenueBreakdown = calculateRevenueBreakdown(order)

  // Populate revenue fields
  order.plannedRevenue = revenueBreakdown.plannedRevenue
  order.actualRevenue = revenueBreakdown.actualRevenue
  order.totalCollected = revenueBreakdown.totalCollected
  order.revenueBreakdown = revenueBreakdown

  // Update tax and final amounts
  order.taxAmount = revenueBreakdown.totalTaxes
  order.finalAmount = revenueBreakdown.totalCollected // IMPORTANT: finalAmount now includes taxes!

  // ✅ SPRINT 8: Validate revenue breakdown for consistency
  if (import.meta.env.DEV) {
    const rbValidation = validateRevenueBreakdown(revenueBreakdown)
    if (!rbValidation.valid) {
      console.error('❌ [useOrderCalculations] Revenue breakdown validation failed:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        errors: rbValidation.errors,
        warnings: rbValidation.warnings,
        revenueBreakdown
      })
    } else if (rbValidation.warnings.length > 0) {
      console.warn('⚠️ [useOrderCalculations] Revenue breakdown warnings:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        warnings: rbValidation.warnings
      })
    }

    const orderValidation = validateOrderAmounts(order)
    if (!orderValidation.valid) {
      console.error('❌ [useOrderCalculations] Order amounts validation failed:', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        errors: orderValidation.errors,
        order: {
          totalAmount: order.totalAmount,
          discountAmount: order.discountAmount,
          taxAmount: order.taxAmount,
          finalAmount: order.finalAmount
        }
      })
    }
  }

  // Пересчитать payment status
  const calculateOrderPaymentStatus = (bills: PosBill[]): OrderPaymentStatus => {
    // Only consider active bills WITH non-cancelled items (empty/cancelled bills don't affect payment status)
    // 🆕 FIX: Check for non-cancelled items, not just any items
    const activeBillsWithItems = bills.filter(
      bill => bill.status !== 'cancelled' && bill.items.some(item => item.status !== 'cancelled')
    )

    // If no bills have items, order is unpaid (nothing to pay)
    if (activeBillsWithItems.length === 0) return 'unpaid'

    const paidBills = activeBillsWithItems.filter(bill => bill.paymentStatus === 'paid')
    const partialBills = activeBillsWithItems.filter(bill => bill.paymentStatus === 'partial')

    // All bills with items are paid
    if (paidBills.length === activeBillsWithItems.length) return 'paid'
    // Some bills are paid or partially paid
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

/**
 * Calculate revenue breakdown for an order
 * Provides three views of revenue:
 * - Planned: Original prices before discounts
 * - Actual: After discounts, before taxes
 * - Total: With taxes included (final collected amount)
 *
 * IMPORTANT: Bill discounts are proportionally allocated to items.
 * Each item's discount = (item price / bill subtotal) × bill discount
 *
 * @param order - The order to calculate revenue breakdown for
 * @returns RevenueBreakdown object with all revenue metrics
 */
export function calculateRevenueBreakdown(order: PosOrder): RevenueBreakdown {
  // =============================================
  // 1. CALCULATE PLANNED REVENUE (original prices)
  // =============================================
  let plannedRevenue = 0

  for (const bill of order.bills) {
    if (bill.status === 'cancelled') continue

    for (const item of bill.items) {
      if (item.status === 'cancelled') continue
      plannedRevenue += item.totalPrice
    }
  }

  // =============================================
  // 2. CALCULATE ITEM-LEVEL DISCOUNTS
  // =============================================
  let itemDiscounts = 0

  for (const bill of order.bills) {
    if (bill.status === 'cancelled') continue

    for (const item of bill.items) {
      if (item.status === 'cancelled') continue

      // Sum up all item-level discounts
      if (item.discounts && item.discounts.length > 0) {
        for (const discount of item.discounts) {
          if (discount.type === 'percentage') {
            itemDiscounts += item.totalPrice * (discount.value / 100)
          } else {
            itemDiscounts += discount.value
          }
        }
      }
    }
  }

  // =============================================
  // 3. CALCULATE BILL-LEVEL DISCOUNTS
  // =============================================
  // ✅ SPRINT 8 FIX: Get actual bill discount amounts from bills
  // Bill discounts are stored separately from item discounts for tracking/analytics
  let billDiscounts = 0

  for (const bill of order.bills) {
    if (bill.status === 'cancelled') continue

    // Add bill discount amount (this is the total discount applied to the bill)
    if (bill.discountAmount) {
      billDiscounts += bill.discountAmount
    }
  }

  // =============================================
  // 4. CALCULATE TOTALS
  // =============================================
  const totalDiscounts = itemDiscounts + billDiscounts
  const actualRevenue = Math.max(0, plannedRevenue - totalDiscounts)

  // =============================================
  // 5. CALCULATE TAXES FROM PAYMENT SETTINGS
  // =============================================
  const paymentSettingsStore = usePaymentSettingsStore()
  const activeTaxes = paymentSettingsStore.activeTaxes

  let totalTaxes = 0
  const taxBreakdown: TaxBreakdown[] = activeTaxes.map(tax => {
    const amount = actualRevenue * (tax.percentage / 100)
    totalTaxes += amount

    return {
      taxId: tax.id,
      name: tax.name,
      percentage: tax.percentage,
      amount
    }
  })

  // =============================================
  // 6. CALCULATE TOTAL COLLECTED
  // =============================================
  const totalCollected = actualRevenue + totalTaxes

  // =============================================
  // 7. RETURN REVENUE BREAKDOWN
  // =============================================
  return {
    plannedRevenue,
    itemDiscounts,
    billDiscounts,
    totalDiscounts,
    actualRevenue,
    taxes: taxBreakdown,
    totalTaxes,
    totalCollected
  }
}

// =============================================
// VALIDATION FUNCTIONS (Sprint 8)
// =============================================

export interface RevenueBreakdownValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate revenue breakdown for mathematical consistency
 * ✅ SPRINT 8: Validation function to catch calculation errors
 *
 * Checks:
 * 1. plannedRevenue = actualRevenue + totalDiscounts
 * 2. totalDiscounts = itemDiscounts + billDiscounts
 * 3. totalCollected = actualRevenue + totalTaxes
 * 4. All values >= 0
 * 5. Tax breakdown sum matches totalTaxes
 */
export function validateRevenueBreakdown(
  rb: import('@/stores/discounts/types').RevenueBreakdown
): RevenueBreakdownValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  // Use configurable tolerance from payment settings
  const paymentSettingsStore = usePaymentSettingsStore()
  const tolerance = paymentSettingsStore.paymentTolerance

  // =============================================
  // Rule 1: Non-negative values
  // =============================================
  if (rb.plannedRevenue < 0) {
    errors.push(`plannedRevenue is negative: ${rb.plannedRevenue}`)
  }
  if (rb.itemDiscounts < 0) {
    errors.push(`itemDiscounts is negative: ${rb.itemDiscounts}`)
  }
  if (rb.billDiscounts < 0) {
    errors.push(`billDiscounts is negative: ${rb.billDiscounts}`)
  }
  if (rb.actualRevenue < 0) {
    errors.push(`actualRevenue is negative: ${rb.actualRevenue}`)
  }
  if (rb.totalTaxes < 0) {
    errors.push(`totalTaxes is negative: ${rb.totalTaxes}`)
  }
  if (rb.totalCollected < 0) {
    errors.push(`totalCollected is negative: ${rb.totalCollected}`)
  }

  // =============================================
  // Rule 2: totalDiscounts = itemDiscounts + billDiscounts
  // =============================================
  const expectedTotalDiscounts = rb.itemDiscounts + rb.billDiscounts
  if (Math.abs(rb.totalDiscounts - expectedTotalDiscounts) > tolerance) {
    errors.push(
      `totalDiscounts mismatch: ${rb.totalDiscounts} !== ${rb.itemDiscounts} + ${rb.billDiscounts} (${expectedTotalDiscounts})`
    )
  }

  // =============================================
  // Rule 3: plannedRevenue = actualRevenue + totalDiscounts
  // =============================================
  const expectedPlannedRevenue = rb.actualRevenue + rb.totalDiscounts
  if (Math.abs(rb.plannedRevenue - expectedPlannedRevenue) > tolerance) {
    errors.push(
      `plannedRevenue mismatch: ${rb.plannedRevenue} !== ${rb.actualRevenue} + ${rb.totalDiscounts} (${expectedPlannedRevenue})`
    )
  }

  // =============================================
  // Rule 4: totalCollected = actualRevenue + totalTaxes
  // =============================================
  const expectedTotalCollected = rb.actualRevenue + rb.totalTaxes
  if (Math.abs(rb.totalCollected - expectedTotalCollected) > tolerance) {
    errors.push(
      `totalCollected mismatch: ${rb.totalCollected} !== ${rb.actualRevenue} + ${rb.totalTaxes} (${expectedTotalCollected})`
    )
  }

  // =============================================
  // Rule 5: Tax breakdown sum matches totalTaxes
  // =============================================
  if (rb.taxes && rb.taxes.length > 0) {
    const taxSum = rb.taxes.reduce((sum, tax) => sum + tax.amount, 0)
    if (Math.abs(taxSum - rb.totalTaxes) > tolerance) {
      errors.push(`Tax breakdown sum mismatch: ${taxSum} !== ${rb.totalTaxes}`)
    }
  }

  // =============================================
  // Warnings (non-critical)
  // =============================================
  if (rb.totalDiscounts > rb.plannedRevenue) {
    warnings.push(`Discounts (${rb.totalDiscounts}) exceed planned revenue (${rb.plannedRevenue})`)
  }

  if (rb.actualRevenue === 0 && rb.plannedRevenue > 0) {
    warnings.push(
      `Actual revenue is 0 but planned revenue is ${rb.plannedRevenue} (100% discount?)`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate order amounts consistency with revenue breakdown
 * ✅ SPRINT 8: Ensure order.totalAmount, taxAmount, etc. match revenueBreakdown
 */
export function validateOrderAmounts(order: PosOrder): RevenueBreakdownValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  // Use configurable tolerance from payment settings
  const paymentSettingsStore = usePaymentSettingsStore()
  const tolerance = paymentSettingsStore.paymentTolerance

  if (!order.revenueBreakdown) {
    errors.push('Order has no revenueBreakdown')
    return { valid: false, errors, warnings }
  }

  const rb = order.revenueBreakdown

  // =============================================
  // Check order fields match revenueBreakdown
  // =============================================

  // totalAmount should equal plannedRevenue
  if (
    order.totalAmount !== undefined &&
    Math.abs(order.totalAmount - rb.plannedRevenue) > tolerance
  ) {
    errors.push(
      `order.totalAmount (${order.totalAmount}) !== plannedRevenue (${rb.plannedRevenue})`
    )
  }

  // discountAmount should equal totalDiscounts
  if (
    order.discountAmount !== undefined &&
    Math.abs(order.discountAmount - rb.totalDiscounts) > tolerance
  ) {
    errors.push(
      `order.discountAmount (${order.discountAmount}) !== totalDiscounts (${rb.totalDiscounts})`
    )
  }

  // taxAmount should equal totalTaxes
  if (order.taxAmount !== undefined && Math.abs(order.taxAmount - rb.totalTaxes) > tolerance) {
    errors.push(`order.taxAmount (${order.taxAmount}) !== totalTaxes (${rb.totalTaxes})`)
  }

  // finalAmount should equal totalCollected
  if (
    order.finalAmount !== undefined &&
    Math.abs(order.finalAmount - rb.totalCollected) > tolerance
  ) {
    errors.push(
      `order.finalAmount (${order.finalAmount}) !== totalCollected (${rb.totalCollected})`
    )
  }

  // plannedRevenue field
  if (
    order.plannedRevenue !== undefined &&
    Math.abs(order.plannedRevenue - rb.plannedRevenue) > tolerance
  ) {
    errors.push(
      `order.plannedRevenue (${order.plannedRevenue}) !== revenueBreakdown.plannedRevenue (${rb.plannedRevenue})`
    )
  }

  // actualRevenue field
  if (
    order.actualRevenue !== undefined &&
    Math.abs(order.actualRevenue - rb.actualRevenue) > tolerance
  ) {
    errors.push(
      `order.actualRevenue (${order.actualRevenue}) !== revenueBreakdown.actualRevenue (${rb.actualRevenue})`
    )
  }

  // totalCollected field
  if (
    order.totalCollected !== undefined &&
    Math.abs(order.totalCollected - rb.totalCollected) > tolerance
  ) {
    errors.push(
      `order.totalCollected (${order.totalCollected}) !== revenueBreakdown.totalCollected (${rb.totalCollected})`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}
