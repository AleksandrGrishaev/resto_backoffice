// src/views/pos/order/composables/useOrderCalculations.ts
import { computed } from 'vue'
import type { PosBill, PosBillItem, PosItemDiscount } from '@/stores/pos/types'

/**
 * Composable for order calculations
 * Handles complex multi-bill calculations with discounts and taxes
 */
export function useOrderCalculations(
  bills: PosBill[] | (() => PosBill[]),
  options: {
    serviceTaxRate?: number
    governmentTaxRate?: number
    includeServiceTax?: boolean
    includeGovernmentTax?: boolean
  } = {}
) {
  const {
    serviceTaxRate = 5,
    governmentTaxRate = 10,
    includeServiceTax = true,
    includeGovernmentTax = true
  } = options

  // Normalize bills to reactive getter
  const getBills = typeof bills === 'function' ? bills : () => bills

  // =============================================
  // BASIC CALCULATIONS
  // =============================================

  /**
   * Calculate subtotal for all active items across all bills
   */
  const subtotal = computed((): number => {
    return getBills().reduce((sum, bill) => {
      return (
        sum +
        bill.items.reduce((billSum, item) => {
          if (item.status === 'cancelled') return billSum
          return billSum + item.totalPrice
        }, 0)
      )
    }, 0)
  })

  /**
   * Calculate total item-level discounts
   */
  const itemDiscounts = computed((): number => {
    return getBills().reduce((sum, bill) => {
      return (
        sum +
        bill.items.reduce((billSum, item) => {
          if (item.status === 'cancelled') return billSum
          return billSum + calculateItemDiscounts(item)
        }, 0)
      )
    }, 0)
  })

  /**
   * Calculate total bill-level discounts
   */
  const billDiscounts = computed((): number => {
    return getBills().reduce((sum, bill) => sum + (bill.discountAmount || 0), 0)
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
  // PAYMENT CALCULATIONS
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

  /**
   * Check if order is fully paid
   */
  const isFullyPaid = computed((): boolean => {
    return remainingAmount.value === 0
  })

  /**
   * Check if order has partial payment
   */
  const hasPartialPayment = computed((): boolean => {
    return paidAmount.value > 0 && !isFullyPaid.value
  })

  // =============================================
  // BILL-SPECIFIC CALCULATIONS
  // =============================================

  /**
   * Calculate totals for a specific bill
   */
  function calculateBillTotals(billId: string) {
    const bill = getBills().find(b => b.id === billId)
    if (!bill) return null

    const billSubtotal = bill.items.reduce((sum, item) => {
      if (item.status === 'cancelled') return sum
      return sum + item.totalPrice
    }, 0)

    const billItemDiscounts = bill.items.reduce((sum, item) => {
      if (item.status === 'cancelled') return sum
      return sum + calculateItemDiscounts(item)
    }, 0)

    const billDiscountAmount = bill.discountAmount || 0
    const billTotalDiscounts = billItemDiscounts + billDiscountAmount
    const billDiscountedSubtotal = Math.max(0, billSubtotal - billTotalDiscounts)

    // Calculate bill's share of taxes (proportional)
    const taxRatio = finalTotal.value > 0 ? billDiscountedSubtotal / discountedSubtotal.value : 0
    const billServiceTax = serviceTax.value * taxRatio
    const billGovernmentTax = governmentTax.value * taxRatio
    const billTotalTaxes = billServiceTax + billGovernmentTax

    const billFinalTotal = billDiscountedSubtotal + billTotalTaxes

    return {
      subtotal: billSubtotal,
      itemDiscounts: billItemDiscounts,
      billDiscounts: billDiscountAmount,
      totalDiscounts: billTotalDiscounts,
      discountedSubtotal: billDiscountedSubtotal,
      serviceTax: billServiceTax,
      governmentTax: billGovernmentTax,
      totalTaxes: billTotalTaxes,
      finalTotal: billFinalTotal,
      paidAmount: bill.paidAmount || 0,
      remainingAmount: Math.max(0, billFinalTotal - (bill.paidAmount || 0))
    }
  }

  /**
   * Get breakdown of all bills with calculations
   */
  const billsBreakdown = computed(() => {
    return getBills().map(bill => ({
      id: bill.id,
      name: bill.name,
      itemsCount: bill.items.filter(item => item.status !== 'cancelled').length,
      paymentStatus: bill.paymentStatus,
      ...calculateBillTotals(bill.id)
    }))
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

  /**
   * Get payment status color
   */
  function getPaymentStatusColor(status: string): string {
    switch (status) {
      case 'paid':
        return 'success'
      case 'partial':
        return 'warning'
      default:
        return 'grey'
    }
  }

  /**
   * Get payment status label
   */
  function getPaymentStatusLabel(status: string): string {
    switch (status) {
      case 'paid':
        return 'PAID'
      case 'partial':
        return 'PARTIAL'
      default:
        return 'UNPAID'
    }
  }

  // =============================================
  // VALIDATION FUNCTIONS
  // =============================================

  /**
   * Validate discount application
   */
  function canApplyDiscount(
    discountValue: number,
    discountType: 'percentage' | 'fixed',
    currentPrice: number
  ): { canApply: boolean; reason?: string } {
    if (discountValue <= 0) {
      return { canApply: false, reason: 'Discount value must be positive' }
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return { canApply: false, reason: 'Percentage discount cannot exceed 100%' }
    }

    if (discountType === 'fixed' && discountValue > currentPrice) {
      return { canApply: false, reason: 'Fixed discount cannot exceed item price' }
    }

    return { canApply: true }
  }

  /**
   * Calculate suggested tip amounts
   */
  function calculateTipSuggestions(baseAmount: number = finalTotal.value): number[] {
    const suggestions = [10, 15, 20] // percentages
    return suggestions.map(percentage => baseAmount * (percentage / 100))
  }

  // =============================================
  // STATISTICS
  // =============================================

  /**
   * Get order statistics
   */
  const orderStats = computed(() => {
    const bills = getBills()
    const allItems = bills.flatMap(bill => bill.items)
    const activeItems = allItems.filter(item => item.status !== 'cancelled')

    return {
      totalBills: bills.length,
      totalItems: allItems.length,
      activeItems: activeItems.length,
      cancelledItems: allItems.length - activeItems.length,
      averageItemPrice: activeItems.length > 0 ? subtotal.value / activeItems.length : 0,
      discountPercentage: subtotal.value > 0 ? (totalDiscounts.value / subtotal.value) * 100 : 0,
      taxPercentage:
        discountedSubtotal.value > 0 ? (totalTaxes.value / discountedSubtotal.value) * 100 : 0
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
      subtotal: subtotal.value,
      itemDiscounts: itemDiscounts.value,
      billDiscounts: billDiscounts.value,
      totalDiscounts: totalDiscounts.value,
      discountedSubtotal: discountedSubtotal.value,
      serviceTax: serviceTax.value,
      governmentTax: governmentTax.value,
      totalTaxes: totalTaxes.value,
      finalTotal: finalTotal.value,
      paidAmount: paidAmount.value,
      remainingAmount: remainingAmount.value,
      isFullyPaid: isFullyPaid.value,
      hasPartialPayment: hasPartialPayment.value,
      stats: orderStats.value,
      bills: billsBreakdown.value
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

    // Payment calculations
    paidAmount,
    remainingAmount,
    isFullyPaid,
    hasPartialPayment,

    // Bill-specific
    billsBreakdown,
    calculateBillTotals,

    // Utilities
    calculateItemDiscounts,
    calculateItemFinalPrice,
    formatPrice,
    getPaymentStatusColor,
    getPaymentStatusLabel,

    // Validation
    canApplyDiscount,
    calculateTipSuggestions,

    // Statistics
    orderStats,

    // Debug
    getCalculationBreakdown
  }
}
