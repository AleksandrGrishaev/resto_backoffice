// src/stores/discounts/composables/useDiscountAnalytics.ts
import { useDiscountsStore } from '../discountsStore'
import { useSalesStore } from '@/stores/sales'
import type {
  DailyRevenueReport,
  DiscountSummary,
  DiscountTransactionView,
  DiscountFilterOptions,
  DateRangePreset,
  TaxBreakdown
} from '../types'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'DiscountAnalytics'

/**
 * Composable for discount analytics and reporting
 *
 * Provides methods for generating revenue reports, discount summaries,
 * and transaction lists with filtering capabilities.
 *
 * Key features:
 * - Daily revenue reports with planned/actual/collected metrics
 * - Discount summary grouped by reason
 * - Transaction lists with order context
 * - Date range helpers (today, yesterday, 7 days, 30 days, custom)
 *
 * @example
 * ```typescript
 * const { getDailyRevenueReport, getDiscountSummary } = useDiscountAnalytics()
 *
 * // Generate revenue report for date range
 * const report = await getDailyRevenueReport('2025-01-01', '2025-01-31')
 *
 * // Get discount summary by reason
 * const summary = await getDiscountSummary({ reason: 'loyalty_card' })
 * ```
 */
export function useDiscountAnalytics() {
  const discountsStore = useDiscountsStore()
  const salesStore = useSalesStore()

  /**
   * Ensure stores are initialized before using them
   */
  async function ensureStoresInitialized(): Promise<void> {
    // Ensure discounts store is initialized
    if (!discountsStore.initialized) {
      DebugUtils.info(MODULE_NAME, '🔄 Initializing discounts store on demand')
      await discountsStore.initialize()
    }

    // Ensure sales store is initialized
    if (!salesStore.initialized) {
      DebugUtils.info(MODULE_NAME, '🔄 Initializing sales store on demand')
      await salesStore.initialize()
    }
  }

  /**
   * Generate daily revenue report for a date range
   *
   * Aggregates all completed orders in the date range and calculates:
   * - Planned revenue (before discounts)
   * - Actual revenue (after discounts, before tax)
   * - Total collected (with taxes)
   * - Discount statistics (count, total, average)
   * - Tax breakdown by tax type
   * - Order statistics (count, average value)
   *
   * @param startDate - ISO date string (YYYY-MM-DD)
   * @param endDate - ISO date string (YYYY-MM-DD)
   * @returns Daily revenue report with comprehensive metrics
   */
  async function getDailyRevenueReport(
    startDate: string,
    endDate: string
  ): Promise<DailyRevenueReport> {
    DebugUtils.info(MODULE_NAME, '📊 Generating daily revenue report', { startDate, endDate })

    // Ensure stores are initialized before accessing data
    await ensureStoresInitialized()

    // 1. Filter sales_transactions by date range
    const transactions = salesStore.transactions.filter(tx => {
      const txDate = tx.soldAt.split('T')[0]
      return txDate >= startDate && txDate <= endDate
    })

    DebugUtils.info(MODULE_NAME, '📦 Transactions filtered', {
      total: salesStore.transactions.length,
      filtered: transactions.length
    })

    // 2. Calculate Planned Revenue (before discounts)
    const plannedRevenue = transactions.reduce((sum, tx) => sum + tx.unitPrice * tx.quantity, 0)

    // 3. Calculate Actual Revenue (after item discounts, before tax)
    // Use finalRevenue from profitCalculation (after all discounts)
    const actualRevenue = transactions.reduce(
      (sum, tx) => sum + tx.profitCalculation.finalRevenue,
      0
    )

    // 4. Calculate Total Collected (with taxes)
    // Total Collected = finalRevenue (after discounts) + taxes
    const totalCollected = transactions.reduce(
      (sum, tx) =>
        sum +
        tx.profitCalculation.finalRevenue +
        (tx.serviceTaxAmount || 0) +
        (tx.governmentTaxAmount || 0),
      0
    )

    // 5. Calculate Total Discounts from profit_calculation
    const totalDiscounts = transactions.reduce((sum, tx) => {
      const itemDiscount = tx.profitCalculation?.itemOwnDiscount || 0
      const billDiscount = tx.profitCalculation?.allocatedBillDiscount || 0
      return sum + itemDiscount + billDiscount
    }, 0)

    // 6. Get discount events count (from DiscountsStore)
    const discountEvents = discountsStore.discountEvents.filter(event => {
      const eventDate = event.appliedAt.split('T')[0]
      return eventDate >= startDate && eventDate <= endDate
    })
    const discountCount = discountEvents.length

    // 6b. Calculate unique orders with discounts
    const uniqueOrdersWithDiscounts = new Set(discountEvents.map(event => event.orderId))
    const ordersWithDiscountCount = uniqueOrdersWithDiscounts.size

    // 7. Calculate tax breakdown
    const taxBreakdown = transactions.reduce((acc, tx) => {
      // Service tax
      if (tx.serviceTaxAmount && tx.serviceTaxRate) {
        const serviceTax = acc.find(t => t.name === 'Service Tax')
        if (serviceTax) {
          serviceTax.amount += tx.serviceTaxAmount
        } else {
          acc.push({
            taxId: 'service_tax',
            name: 'Service Tax',
            percentage: tx.serviceTaxRate * 100, // Convert to percentage
            amount: tx.serviceTaxAmount
          })
        }
      }

      // Government tax
      if (tx.governmentTaxAmount && tx.governmentTaxRate) {
        const govTax = acc.find(t => t.name === 'Government Tax')
        if (govTax) {
          govTax.amount += tx.governmentTaxAmount
        } else {
          acc.push({
            taxId: 'government_tax',
            name: 'Government Tax',
            percentage: tx.governmentTaxRate * 100, // Convert to percentage
            amount: tx.governmentTaxAmount
          })
        }
      }

      return acc
    }, [] as TaxBreakdown[])

    const totalTaxes = taxBreakdown.reduce((sum, t) => sum + t.amount, 0)

    // 8. Calculate order-level statistics
    // Group transactions by payment_id to count unique orders
    const uniquePayments = new Set(transactions.map(tx => tx.paymentId))
    const orderCount = uniquePayments.size
    const averageOrderValue = orderCount > 0 ? totalCollected / orderCount : 0

    const report: DailyRevenueReport = {
      date: `${startDate} to ${endDate}`,
      plannedRevenue,
      actualRevenue,
      totalCollected,
      totalDiscounts,
      discountCount,
      ordersWithDiscountCount,
      totalTaxes,
      taxBreakdown,
      orderCount,
      averageOrderValue
    }

    DebugUtils.store(MODULE_NAME, '✅ Daily revenue report generated from sales_transactions', {
      plannedRevenue,
      actualRevenue,
      totalCollected,
      discountCount,
      orderCount,
      transactionsProcessed: transactions.length
    })

    return report
  }

  /**
   * Get discount summary grouped by reason
   *
   * Aggregates discount events by reason and calculates:
   * - Total count per reason
   * - Total amount per reason
   * - Percentage of total discounts
   *
   * Results are sorted by total amount (descending).
   *
   * @param filterOptions - Optional filters (date range, type, shift)
   * @returns Array of discount summaries sorted by amount
   */
  async function getDiscountSummary(
    filterOptions?: DiscountFilterOptions
  ): Promise<DiscountSummary[]> {
    DebugUtils.info(MODULE_NAME, 'Getting discount summary', { filterOptions })

    // Ensure stores are initialized before accessing data
    await ensureStoresInitialized()

    const summary = discountsStore.getDiscountSummaryByReason(filterOptions)

    DebugUtils.store(MODULE_NAME, 'Discount summary retrieved', {
      reasonCount: summary.length,
      totalAmount: summary.reduce((sum, s) => sum + s.totalAmount, 0)
    })

    return summary
  }

  /**
   * Get discount transactions with order context
   *
   * Returns a list of discount events enriched with:
   * - Order number
   * - Table name (for dine-in orders)
   * - Order type (dine-in, takeaway, delivery)
   * - User names (appliedBy, approvedBy)
   * - Discount percentage
   *
   * Supports filtering and pagination.
   *
   * @param filterOptions - Optional filters and pagination
   * @returns Array of discount transaction views
   */
  async function getDiscountTransactions(
    filterOptions?: DiscountFilterOptions
  ): Promise<DiscountTransactionView[]> {
    DebugUtils.info(MODULE_NAME, 'Getting discount transactions', { filterOptions })

    // Ensure stores are initialized before accessing data
    await ensureStoresInitialized()

    const events = discountsStore.getFilteredDiscounts(filterOptions)

    // Enrich with sales_transactions context
    const transactions: DiscountTransactionView[] = events.map(event => {
      // Find related sales transaction
      const salesTx = salesStore.transactions.find(
        tx => tx.orderId === event.orderId && tx.billId === event.billId
      )

      return {
        ...event,
        orderNumber: salesTx?.orderId
          ? `ORD-${salesTx.orderId.substring(0, 8)}`
          : `ORD-${event.orderId.substring(0, 8)}`,
        tableName: undefined, // Not available in sales_transactions
        orderType: undefined, // Not available in sales_transactions
        appliedByName: event.appliedBy || 'System',
        approvedByName: event.approvedBy || undefined
      }
    })

    DebugUtils.store(MODULE_NAME, 'Discount transactions retrieved', {
      count: transactions.length
    })

    return transactions
  }

  /**
   * Convert date range preset to actual dates
   *
   * Converts preset strings to actual date ranges:
   * - 'today': Today only
   * - 'yesterday': Yesterday only
   * - '7days': Last 7 days (inclusive)
   * - '30days': Last 30 days (inclusive)
   * - 'custom': Returns today (should be overridden by user input)
   *
   * @param preset - Date range preset
   * @returns Object with startDate and endDate (ISO format YYYY-MM-DD)
   */
  function getDateRangeFromPreset(preset: DateRangePreset): {
    startDate: string
    endDate: string
  } {
    const today = TimeUtils.getCurrentLocalISO().split('T')[0]

    switch (preset) {
      case 'today':
        return { startDate: today, endDate: today }

      case 'yesterday': {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        return { startDate: yesterdayStr, endDate: yesterdayStr }
      }

      case '7days': {
        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 6) // 7 days including today
        return { startDate: startDate.toISOString().split('T')[0], endDate: today }
      }

      case '30days': {
        const startDate = new Date(today)
        startDate.setDate(startDate.getDate() - 29) // 30 days including today
        return { startDate: startDate.toISOString().split('T')[0], endDate: today }
      }

      case 'custom':
      default:
        // Return today as default, should be overridden by user input
        return { startDate: today, endDate: today }
    }
  }

  return {
    getDailyRevenueReport,
    getDiscountSummary,
    getDiscountTransactions,
    getDateRangeFromPreset
  }
}
