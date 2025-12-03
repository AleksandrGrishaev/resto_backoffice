// src/stores/discounts/services/discountService.ts
import type {
  DiscountEvent,
  DiscountType,
  DiscountValueType,
  DiscountReason,
  AllocationDetails
} from '../types'
import type { PosBillItem, PosBill, PosOrder, PosItemDiscount } from '@/stores/pos/types'
import { generateId, TimeUtils, DebugUtils } from '@/utils'
import { useAuthStore } from '@/stores/auth/authStore'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'

const MODULE_NAME = 'DiscountService'

/**
 * Parameters for applying an item discount
 */
export interface ApplyItemDiscountParams {
  item: PosBillItem
  discountType: DiscountValueType
  value: number
  reason: DiscountReason
  notes?: string
}

/**
 * Parameters for applying a bill discount
 */
export interface ApplyBillDiscountParams {
  bill: PosBill
  discountType: DiscountValueType
  value: number
  reason: DiscountReason
  notes?: string
}

/**
 * Result of applying a discount
 */
export interface DiscountResult {
  success: boolean
  discountEvent?: DiscountEvent
  error?: string
}

/**
 * Validation result for discount
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Discount Service
 *
 * Core business logic for applying discounts with proportional allocation.
 * This service handles:
 * - Item-level discounts (applied to single items)
 * - Bill-level discounts (proportionally allocated across all items in bill)
 * - Discount validation
 * - Calculation of discount amounts and final prices
 */
export class DiscountService {
  /**
   * Apply discount to a single item
   *
   * Creates a DiscountEvent and calculates the final price after discount.
   * Updates the item's discount array and total price.
   *
   * @param params - Item discount parameters
   * @param orderId - Order ID this item belongs to
   * @returns Discount result with event or error
   */
  async applyItemDiscount(
    params: ApplyItemDiscountParams,
    orderId: string
  ): Promise<DiscountResult> {
    try {
      const { item, discountType, value, reason, notes } = params

      DebugUtils.info(MODULE_NAME, 'Applying item discount', {
        itemId: item.id,
        discountType,
        value,
        reason
      })

      // Validate discount
      const validation = this.validateItemDiscount(item, discountType, value)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      // Calculate discount amount
      const originalAmount = item.totalPrice
      const discountAmount = this.calculateDiscountAmount(originalAmount, discountType, value)
      const finalAmount = originalAmount - discountAmount

      // Get current user and shift
      const authStore = useAuthStore()
      const shiftsStore = useShiftsStore()
      const appliedBy = authStore.userId || 'unknown'
      const shiftId = shiftsStore.currentShift?.id

      // Create discount event
      const discountEvent: DiscountEvent = {
        id: generateId(),
        type: 'item' as DiscountType,
        discountType,
        value,
        reason,
        orderId,
        billId: item.billId,
        itemId: item.id,
        shiftId,
        originalAmount,
        discountAmount,
        finalAmount,
        appliedBy,
        appliedAt: TimeUtils.getCurrentLocalISO(),
        notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      DebugUtils.store(MODULE_NAME, 'Item discount created', {
        discountId: discountEvent.id,
        originalAmount,
        discountAmount,
        finalAmount
      })

      return {
        success: true,
        discountEvent
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply item discount', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Apply discount to entire bill with proportional allocation
   *
   * Distributes the discount across all items in the bill based on their proportion
   * of the total bill amount. Creates a single DiscountEvent with allocationDetails.
   *
   * Algorithm:
   * 1. Calculate bill subtotal (sum of all item prices)
   * 2. For each item, calculate proportion = item.totalPrice / billSubtotal
   * 3. Allocate discount: allocatedDiscount = discountAmount × proportion
   * 4. Store allocation details in DiscountEvent
   *
   * @param params - Bill discount parameters
   * @param orderId - Order ID this bill belongs to
   * @returns Discount result with event or error
   */
  async applyBillDiscount(
    params: ApplyBillDiscountParams,
    orderId: string
  ): Promise<DiscountResult> {
    try {
      const { bill, discountType, value, reason, notes } = params

      DebugUtils.info(MODULE_NAME, 'Applying bill discount', {
        billId: bill.id,
        discountType,
        value,
        reason,
        itemCount: bill.items.length
      })

      // Validate bill has items
      if (bill.items.length === 0) {
        return {
          success: false,
          error: 'Bill has no items to apply discount'
        }
      }

      // Calculate bill subtotal (original prices without existing discounts)
      const billSubtotal = bill.items.reduce((sum, item) => sum + item.totalPrice, 0)

      if (billSubtotal <= 0) {
        return {
          success: false,
          error: 'Bill subtotal is zero or negative'
        }
      }

      // Validate discount
      const validation = this.validateBillDiscount(billSubtotal, discountType, value)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        }
      }

      // Calculate total discount amount
      const discountAmount = this.calculateDiscountAmount(billSubtotal, discountType, value)
      const finalAmount = billSubtotal - discountAmount

      // Calculate proportional allocation for each item
      const itemAllocations = this.calculateProportionalAllocation(bill.items, discountAmount)

      // Create allocation details
      const allocationDetails: AllocationDetails = {
        totalBillAmount: billSubtotal,
        itemAllocations
      }

      // Get current user and shift
      const authStore = useAuthStore()
      const shiftsStore = useShiftsStore()
      const appliedBy = authStore.userId || 'unknown'
      const shiftId = shiftsStore.currentShift?.id

      // Create discount event
      const discountEvent: DiscountEvent = {
        id: generateId(),
        type: 'bill' as DiscountType,
        discountType,
        value,
        reason,
        orderId,
        billId: bill.id,
        shiftId,
        originalAmount: billSubtotal,
        discountAmount,
        finalAmount,
        allocationDetails,
        appliedBy,
        appliedAt: TimeUtils.getCurrentLocalISO(),
        notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      DebugUtils.store(MODULE_NAME, 'Bill discount created with proportional allocation', {
        discountId: discountEvent.id,
        billSubtotal,
        discountAmount,
        finalAmount,
        itemCount: itemAllocations.length,
        allocationSum: itemAllocations.reduce((sum, a) => sum + a.allocatedDiscount, 0)
      })

      return {
        success: true,
        discountEvent
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply bill discount', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Calculate proportional allocation of discount across items
   *
   * Example:
   * Item 1: 50,000 IDR  → 30.30% → discount 4,545 IDR
   * Item 2: 100,000 IDR → 60.61% → discount 9,091 IDR
   * Item 3: 15,000 IDR  → 9.09%  → discount 1,364 IDR
   * Total:  165,000 IDR           → 15,000 IDR
   *
   * @param items - Bill items to allocate discount across
   * @param totalDiscount - Total discount amount to distribute
   * @returns Array of item allocations
   */
  private calculateProportionalAllocation(
    items: PosBillItem[],
    totalDiscount: number
  ): AllocationDetails['itemAllocations'] {
    const billSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)

    // Calculate allocation for each item
    const allocations = items.map(item => {
      const proportion = item.totalPrice / billSubtotal
      const allocatedDiscount = Math.round(totalDiscount * proportion) // Round to avoid cents

      return {
        itemId: item.id,
        itemName: item.menuItemName,
        itemAmount: item.totalPrice,
        proportion,
        allocatedDiscount
      }
    })

    // Verify sum equals total (handle rounding errors)
    const allocationSum = allocations.reduce((sum, a) => sum + a.allocatedDiscount, 0)
    const roundingDiff = totalDiscount - allocationSum

    // If there's a rounding difference, add it to the largest item
    if (roundingDiff !== 0) {
      const largestItemIndex = allocations.reduce(
        (maxIdx, current, idx, arr) => (current.itemAmount > arr[maxIdx].itemAmount ? idx : maxIdx),
        0
      )
      allocations[largestItemIndex].allocatedDiscount += roundingDiff

      DebugUtils.info(MODULE_NAME, 'Adjusted for rounding difference', {
        roundingDiff,
        adjustedItem: allocations[largestItemIndex].itemId
      })
    }

    return allocations
  }

  /**
   * Calculate discount amount based on type and value
   *
   * @param originalAmount - Original price before discount
   * @param discountType - 'percentage' or 'fixed'
   * @param value - Discount value (0-100 for percentage, IDR amount for fixed)
   * @returns Calculated discount amount
   */
  private calculateDiscountAmount(
    originalAmount: number,
    discountType: DiscountValueType,
    value: number
  ): number {
    if (discountType === 'percentage') {
      return Math.round((originalAmount * value) / 100)
    } else {
      return value
    }
  }

  /**
   * Validate item discount
   *
   * Checks:
   * - Percentage is between 0-100
   * - Fixed amount is not greater than item price
   * - Values are positive numbers
   *
   * @param item - Item to apply discount to
   * @param discountType - Type of discount
   * @param value - Discount value
   * @returns Validation result
   */
  private validateItemDiscount(
    item: PosBillItem,
    discountType: DiscountValueType,
    value: number
  ): ValidationResult {
    const errors: string[] = []

    // Validate value is positive
    if (value <= 0) {
      errors.push('Discount value must be positive')
    }

    // Validate percentage
    if (discountType === 'percentage') {
      if (value > 100) {
        errors.push('Percentage discount cannot exceed 100%')
      }
    }

    // Validate fixed amount
    if (discountType === 'fixed') {
      if (value > item.totalPrice) {
        errors.push('Fixed discount cannot exceed item price')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate bill discount
   *
   * Checks:
   * - Percentage is between 0-100
   * - Fixed amount is not greater than bill total
   * - Values are positive numbers
   *
   * @param billTotal - Total bill amount
   * @param discountType - Type of discount
   * @param value - Discount value
   * @returns Validation result
   */
  private validateBillDiscount(
    billTotal: number,
    discountType: DiscountValueType,
    value: number
  ): ValidationResult {
    const errors: string[] = []

    // Validate value is positive
    if (value <= 0) {
      errors.push('Discount value must be positive')
    }

    // Validate percentage
    if (discountType === 'percentage') {
      if (value > 100) {
        errors.push('Percentage discount cannot exceed 100%')
      }
    }

    // Validate fixed amount
    if (discountType === 'fixed') {
      if (value > billTotal) {
        errors.push('Fixed discount cannot exceed bill total')
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Validate discount application (check user permissions)
   *
   * In Phase 1, this is a simple implementation.
   * Future phases can add role-based validation:
   * - Cashiers can apply discounts up to X%
   * - Managers can apply any discount
   * - Some discount reasons require manager approval
   *
   * @param reason - Discount reason
   * @param value - Discount value
   * @param discountType - Type of discount
   * @returns Validation result
   */
  validateDiscount(
    reason: DiscountReason,
    value: number,
    discountType: DiscountValueType
  ): ValidationResult {
    const errors: string[] = []

    // Phase 1: Basic validation
    if (!reason) {
      errors.push('Discount reason is required')
    }

    if (value <= 0) {
      errors.push('Discount value must be positive')
    }

    if (discountType === 'percentage' && value > 100) {
      errors.push('Percentage discount cannot exceed 100%')
    }

    // Future: Add role-based validation
    // const authStore = useAuthStore()
    // if (value > 50 && !authStore.isManager) {
    //   errors.push('Only managers can apply discounts over 50%')
    // }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Remove discount (soft delete)
   *
   * In Phase 1, this returns the discount event ID to remove.
   * Future phases will implement soft delete in database.
   *
   * @param discountEventId - ID of discount event to remove
   * @returns Success result
   */
  async removeDiscount(discountEventId: string): Promise<DiscountResult> {
    try {
      DebugUtils.info(MODULE_NAME, 'Removing discount', { discountEventId })

      // Phase 1: Return success
      // Phase 2+: Implement soft delete in database
      // await supabaseService.updateDiscountEvent(discountEventId, { deletedAt: new Date().toISOString() })

      DebugUtils.store(MODULE_NAME, 'Discount removed', { discountEventId })

      return {
        success: true
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove discount', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Convert DiscountEvent to PosItemDiscount format
   *
   * Helper method to convert our new DiscountEvent structure
   * to the existing PosItemDiscount format used in orders.
   *
   * @param event - Discount event
   * @returns PosItemDiscount object
   */
  toPosItemDiscount(event: DiscountEvent): PosItemDiscount {
    return {
      id: event.id,
      type: event.discountType,
      value: event.value,
      reason: event.reason,
      appliedBy: event.appliedBy,
      appliedAt: event.appliedAt
    }
  }
}

// Singleton instance
export const discountService = new DiscountService()
