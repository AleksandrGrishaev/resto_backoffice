// src/composables/usePaymentTolerance.ts
/**
 * Composable for payment tolerance operations
 * Provides reactive access to tolerance settings and utility functions
 *
 * Two-level system:
 * 1. Amount Rounding (always active) - all amounts rounded to whole IDR
 * 2. Payment Tolerance (configurable) - allows small differences when comparing payments
 */

import { computed } from 'vue'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import {
  DEFAULT_PAYMENT_TOLERANCE,
  isAmountNegligible,
  isPaymentComplete,
  amountsEqual,
  getTolerancePaymentStatus,
  getEffectiveRemaining,
  roundToWholeIDR
} from '@/utils/currency'

/**
 * Payment tolerance settings interface
 */
export interface PaymentToleranceSettings {
  /** Maximum amount difference to consider as "fully paid" (default: 1000 IDR) */
  paymentTolerance: number
  /** Whether to round all amounts to whole IDR before comparison (default: true) */
  roundToWholeUnits: boolean
}

/**
 * Default tolerance settings
 */
export const DEFAULT_TOLERANCE_SETTINGS: PaymentToleranceSettings = {
  paymentTolerance: DEFAULT_PAYMENT_TOLERANCE,
  roundToWholeUnits: true
}

/**
 * Composable for payment tolerance operations
 * Uses store settings when available, falls back to defaults
 *
 * @example
 * const { tolerance, isFullyPaid, amountsMatch } = usePaymentTolerance()
 *
 * // Check if payment is complete (within tolerance)
 * if (isFullyPaid(paidAmount, requiredAmount)) {
 *   // Mark as fully_paid
 * }
 *
 * // Compare amounts
 * if (amountsMatch(totalBilled, orderTotal)) {
 *   // No amount mismatch
 * }
 */
export function usePaymentTolerance() {
  const store = usePaymentSettingsStore()

  // Reactive tolerance value from store (with fallback)
  const tolerance = computed(
    () => store.toleranceSettings?.paymentTolerance ?? DEFAULT_PAYMENT_TOLERANCE
  )

  // Full settings object
  const toleranceSettings = computed<PaymentToleranceSettings>(
    () => store.toleranceSettings ?? DEFAULT_TOLERANCE_SETTINGS
  )

  // =============================================
  // BOUND UTILITY FUNCTIONS
  // These use the reactive tolerance from store
  // =============================================

  /**
   * Check if an amount difference is negligible (within tolerance)
   * @param amount - The difference amount to check
   */
  const isNegligible = (amount: number): boolean => {
    return isAmountNegligible(amount, tolerance.value)
  }

  /**
   * Check if payment is considered fully paid (within tolerance)
   * @param paid - Amount paid
   * @param required - Amount required
   */
  const isFullyPaid = (paid: number, required: number): boolean => {
    return isPaymentComplete(paid, required, tolerance.value)
  }

  /**
   * Check if two amounts are equal within tolerance
   * @param a - First amount
   * @param b - Second amount
   */
  const amountsMatch = (a: number, b: number): boolean => {
    return amountsEqual(a, b, tolerance.value)
  }

  /**
   * Get payment status considering tolerance
   * @param paid - Amount paid
   * @param required - Amount required
   */
  const getPaymentStatus = (
    paid: number,
    required: number
  ): 'not_paid' | 'partially_paid' | 'fully_paid' | 'overpaid' => {
    return getTolerancePaymentStatus(paid, required, tolerance.value)
  }

  /**
   * Get remaining amount (0 if within tolerance)
   * @param paid - Amount paid
   * @param required - Amount required
   */
  const getRemainingAmount = (paid: number, required: number): number => {
    return getEffectiveRemaining(paid, required, tolerance.value)
  }

  return {
    // Reactive values
    tolerance,
    toleranceSettings,

    // Bound utility functions (use store tolerance)
    isNegligible,
    isFullyPaid,
    amountsMatch,
    getPaymentStatus,
    getRemainingAmount,

    // Static utility (always available, no store dependency)
    roundToWholeIDR
  }
}
