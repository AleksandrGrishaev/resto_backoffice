/**
 * Tax Calculation Helper
 *
 * Calculates tax breakdown from total amount (reverse calculation).
 * Used by ShiftSyncAdapter to split income into revenue + taxes.
 *
 * Tax rates are hardcoded as per business requirements:
 * - Service Tax: 5%
 * - Local Tax (Tourist Tax): 10%
 */

export interface TaxBreakdownResult {
  pureRevenue: number // Revenue without taxes
  serviceTaxAmount: number // Service tax (5%)
  localTaxAmount: number // Local tax (10%)
  totalAmount: number // Original total (should equal pureRevenue + taxes)
}

// Tax rates (hardcoded as per requirements)
const SERVICE_TAX_RATE = 0.05 // 5%
const LOCAL_TAX_RATE = 0.1 // 10%
const TOTAL_TAX_RATE = SERVICE_TAX_RATE + LOCAL_TAX_RATE // 15%

/**
 * Calculate tax breakdown from total amount
 *
 * Formula: totalAmount = pureRevenue * (1 + TOTAL_TAX_RATE)
 * Reverse: pureRevenue = totalAmount / (1 + TOTAL_TAX_RATE)
 *
 * @param totalAmount - Total collected amount (including taxes)
 * @returns Tax breakdown with pure revenue and tax amounts
 */
export function calculateTaxBreakdown(totalAmount: number): TaxBreakdownResult {
  if (totalAmount <= 0) {
    return {
      pureRevenue: 0,
      serviceTaxAmount: 0,
      localTaxAmount: 0,
      totalAmount: 0
    }
  }

  // Reverse calculation to get pure revenue
  const pureRevenue = totalAmount / (1 + TOTAL_TAX_RATE)

  // Calculate tax amounts
  const serviceTaxAmount = pureRevenue * SERVICE_TAX_RATE
  const localTaxAmount = pureRevenue * LOCAL_TAX_RATE

  return {
    pureRevenue: Math.round(pureRevenue),
    serviceTaxAmount: Math.round(serviceTaxAmount),
    localTaxAmount: Math.round(localTaxAmount),
    totalAmount
  }
}

/**
 * Export tax rates for reference (e.g., in descriptions)
 */
export const TAX_RATES = {
  SERVICE_TAX: SERVICE_TAX_RATE * 100, // 5
  LOCAL_TAX: LOCAL_TAX_RATE * 100, // 10
  TOTAL: TOTAL_TAX_RATE * 100 // 15
} as const
