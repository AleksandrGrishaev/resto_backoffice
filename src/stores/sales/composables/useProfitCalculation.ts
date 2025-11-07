import type { ProfitCalculation, ItemWithAllocatedDiscount, DecomposedItem } from '../types'
import type { PosBillItem, PosItemDiscount, PosBill } from '@/stores/pos/types'

const MODULE_NAME = 'ProfitCalculation'

/**
 * useProfitCalculation
 * Расчет прибыли с учетом всех типов скидок
 */
export function useProfitCalculation() {
  /**
   * Calculate item-level discounts
   * Рассчитывает собственные скидки позиции
   */
  function calculateItemDiscounts(discounts: PosItemDiscount[], itemTotal: number): number {
    return discounts.reduce((sum, discount) => {
      if (discount.type === 'percentage') {
        return sum + (itemTotal * discount.value) / 100
      } else {
        // fixed amount
        return sum + discount.value
      }
    }, 0)
  }

  /**
   * Allocate bill discount proportionally
   * Распределяет скидку на счет пропорционально стоимости позиций
   */
  function allocateBillDiscount(
    items: PosBillItem[],
    billDiscountAmount: number
  ): ItemWithAllocatedDiscount[] {
    console.log(`💰 [${MODULE_NAME}] Allocating bill discount:`, {
      totalDiscount: billDiscountAmount,
      itemsCount: items.length
    })

    if (billDiscountAmount === 0 || items.length === 0) {
      // No bill discount to allocate
      return items.map(item => ({
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemOwnDiscount: calculateItemDiscounts(item.discounts, item.totalPrice),
        allocatedBillDiscount: 0,
        totalDiscount: calculateItemDiscounts(item.discounts, item.totalPrice),
        finalPrice: item.totalPrice - calculateItemDiscounts(item.discounts, item.totalPrice)
      }))
    }

    // 1. Calculate subtotal (sum of items after their own discounts)
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.totalPrice
      const itemDiscount = calculateItemDiscounts(item.discounts, itemTotal)
      return sum + (itemTotal - itemDiscount)
    }, 0)

    console.log(`  📊 [${MODULE_NAME}] Subtotal (after item discounts):`, subtotal)

    if (subtotal === 0) {
      console.warn(`⚠️ [${MODULE_NAME}] Subtotal is 0, cannot allocate bill discount`)
      return items.map(item => ({
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemOwnDiscount: calculateItemDiscounts(item.discounts, item.totalPrice),
        allocatedBillDiscount: 0,
        totalDiscount: calculateItemDiscounts(item.discounts, item.totalPrice),
        finalPrice: 0
      }))
    }

    // 2. Calculate proportion for each item
    const itemsWithDiscount: ItemWithAllocatedDiscount[] = items.map(item => {
      const itemTotal = item.totalPrice
      const itemDiscount = calculateItemDiscounts(item.discounts, itemTotal)
      const itemAfterOwnDiscount = itemTotal - itemDiscount

      // Proportion = (item price after own discount) / (subtotal)
      const proportion = itemAfterOwnDiscount / subtotal

      // Allocated discount = total bill discount × proportion
      const allocatedDiscount = billDiscountAmount * proportion

      const totalDiscount = itemDiscount + allocatedDiscount
      const finalPrice = itemTotal - totalDiscount

      console.log(`  📦 [${MODULE_NAME}] Item allocation:`, {
        name: item.menuItemName,
        itemTotal,
        itemDiscount,
        proportion: (proportion * 100).toFixed(2) + '%',
        allocatedDiscount,
        finalPrice
      })

      return {
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemOwnDiscount: itemDiscount,
        allocatedBillDiscount: allocatedDiscount,
        totalDiscount,
        finalPrice: Math.max(0, finalPrice) // Не может быть отрицательной
      }
    })

    return itemsWithDiscount
  }

  /**
   * Calculate profit for a single item
   * Рассчитывает прибыль для одной позиции
   */
  function calculateItemProfit(
    billItem: PosBillItem,
    decomposedItems: DecomposedItem[],
    allocatedBillDiscount: number
  ): ProfitCalculation {
    // 1. Revenue calculation
    const originalPrice = billItem.totalPrice
    const itemOwnDiscount = calculateItemDiscounts(billItem.discounts, originalPrice)
    const finalRevenue = originalPrice - itemOwnDiscount - allocatedBillDiscount

    // 2. Cost calculation
    const ingredientsCost = decomposedItems.reduce((sum, item) => sum + item.totalCost, 0)

    // 3. Profit calculation
    const profit = finalRevenue - ingredientsCost
    const profitMargin = finalRevenue > 0 ? (profit / finalRevenue) * 100 : 0

    console.log(`💸 [${MODULE_NAME}] Item profit:`, {
      name: billItem.menuItemName,
      originalPrice,
      itemOwnDiscount,
      allocatedBillDiscount,
      finalRevenue,
      ingredientsCost,
      profit,
      profitMargin: profitMargin.toFixed(2) + '%'
    })

    return {
      originalPrice,
      itemOwnDiscount,
      allocatedBillDiscount,
      finalRevenue,
      ingredientsCost,
      profit,
      profitMargin
    }
  }

  /**
   * Calculate profit for entire bill
   * Рассчитывает прибыль для всего счета
   */
  function calculateBillProfit(
    bill: PosBill,
    itemsWithDecomposition: Map<string, DecomposedItem[]>
  ): BillProfitCalculation {
    console.log(`📋 [${MODULE_NAME}] Calculating bill profit:`, {
      billNumber: bill.billNumber,
      itemsCount: bill.items.length,
      billDiscount: bill.discountAmount
    })

    // 1. Allocate bill discount
    const itemsWithDiscount = allocateBillDiscount(bill.items, bill.discountAmount)

    // 2. Calculate profit for each item
    const itemProfits: ItemProfitCalculation[] = itemsWithDiscount.map(itemWithDiscount => {
      const billItem = bill.items.find(i => i.id === itemWithDiscount.id)!
      const decomposed = itemsWithDecomposition.get(billItem.id) || []

      const profitCalc = calculateItemProfit(
        billItem,
        decomposed,
        itemWithDiscount.allocatedBillDiscount
      )

      return {
        itemId: billItem.id,
        menuItemName: billItem.menuItemName,
        quantity: billItem.quantity,
        profitCalculation: profitCalc
      }
    })

    // 3. Aggregate totals
    const totalRevenue = itemProfits.reduce((sum, p) => sum + p.profitCalculation.finalRevenue, 0)
    const totalCost = itemProfits.reduce((sum, p) => sum + p.profitCalculation.ingredientsCost, 0)
    const totalProfit = totalRevenue - totalCost
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    console.log(`✅ [${MODULE_NAME}] Bill profit summary:`, {
      totalRevenue,
      totalCost,
      totalProfit,
      averageMargin: averageMargin.toFixed(2) + '%'
    })

    return {
      billId: bill.id,
      billNumber: bill.billNumber,
      items: itemProfits,
      totalRevenue,
      totalCost,
      totalProfit,
      averageMargin
    }
  }

  /**
   * Validate profit calculation
   * Проверяет корректность расчетов
   */
  function validateProfitCalculation(profitCalc: ProfitCalculation): boolean {
    // Check that finalRevenue = originalPrice - itemOwnDiscount - allocatedBillDiscount
    const calculatedRevenue =
      profitCalc.originalPrice - profitCalc.itemOwnDiscount - profitCalc.allocatedBillDiscount
    if (Math.abs(calculatedRevenue - profitCalc.finalRevenue) > 0.01) {
      console.error(`❌ [${MODULE_NAME}] Revenue calculation mismatch:`, {
        expected: calculatedRevenue,
        actual: profitCalc.finalRevenue
      })
      return false
    }

    // Check that profit = finalRevenue - ingredientsCost
    const calculatedProfit = profitCalc.finalRevenue - profitCalc.ingredientsCost
    if (Math.abs(calculatedProfit - profitCalc.profit) > 0.01) {
      console.error(`❌ [${MODULE_NAME}] Profit calculation mismatch:`, {
        expected: calculatedProfit,
        actual: profitCalc.profit
      })
      return false
    }

    return true
  }

  return {
    calculateItemDiscounts,
    allocateBillDiscount,
    calculateItemProfit,
    calculateBillProfit,
    validateProfitCalculation
  }
}

/**
 * Item Profit Calculation
 * Прибыль для одной позиции
 */
export interface ItemProfitCalculation {
  itemId: string
  menuItemName: string
  quantity: number
  profitCalculation: ProfitCalculation
}

/**
 * Bill Profit Calculation
 * Прибыль для всего счета
 */
export interface BillProfitCalculation {
  billId: string
  billNumber: string
  items: ItemProfitCalculation[]
  totalRevenue: number
  totalCost: number
  totalProfit: number
  averageMargin: number // %
}
