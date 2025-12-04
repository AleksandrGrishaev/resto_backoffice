// src/stores/discounts/composables/useDiscountAnalytics.ts
import { useDiscountsStore } from '../discountsStore'
// TODO: Replace with useSalesStore for sales_transactions data
// import { useSalesStore } from '@/stores/sales'
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
 * const summary = await getDiscountSummary({ reason: 'customer_complaint' })
 * ```
 */
export function useDiscountAnalytics() {
  const discountsStore = useDiscountsStore()
  // TODO: Add salesStore when implementing sales_transactions integration
  // const salesStore = useSalesStore()

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

    // TODO: Replace with sales_transactions data source
    // Current implementation uses empty orders array (placeholder)
    const orders: any[] = []

    DebugUtils.error(
      MODULE_NAME,
      '⚠️ DEPRECATED: Using orders as data source. Should use sales_transactions!'
    )

    // 2. Aggregate revenue metrics
    const plannedRevenue = orders.reduce((sum, o) => sum + (o.plannedRevenue || 0), 0)
    const actualRevenue = orders.reduce((sum, o) => sum + (o.actualRevenue || 0), 0)
    const totalCollected = orders.reduce((sum, o) => sum + (o.totalCollected || 0), 0)

    // 3. Get discount events for period
    const discountEvents = discountsStore.discountEvents.filter(event => {
      const eventDate = event.appliedAt.split('T')[0]
      return eventDate >= startDate && eventDate <= endDate
    })

    const totalDiscounts = discountEvents.reduce((sum, e) => sum + e.discountAmount, 0)
    const discountCount = discountEvents.length

    // 4. Calculate taxes from orders
    const taxBreakdown = orders.reduce((acc, order) => {
      const breakdown = order.revenueBreakdown
      if (breakdown && breakdown.taxes) {
        breakdown.taxes.forEach(tax => {
          const existing = acc.find(t => t.taxId === tax.taxId)
          if (existing) {
            existing.amount += tax.amount
          } else {
            acc.push({ ...tax })
          }
        })
      }
      return acc
    }, [] as TaxBreakdown[])

    const totalTaxes = taxBreakdown.reduce((sum, t) => sum + t.amount, 0)

    // 5. Calculate statistics
    const orderCount = orders.length
    const averageOrderValue = orderCount > 0 ? totalCollected / orderCount : 0

    const report: DailyRevenueReport = {
      date: `${startDate} to ${endDate}`,
      plannedRevenue,
      actualRevenue,
      totalCollected,
      totalDiscounts,
      discountCount,
      totalTaxes,
      taxBreakdown,
      orderCount,
      averageOrderValue
    }

    DebugUtils.store(MODULE_NAME, 'Daily revenue report generated', {
      plannedRevenue,
      actualRevenue,
      totalCollected,
      discountCount,
      orderCount
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

    const events = discountsStore.getFilteredDiscounts(filterOptions)

    // TODO: Enrich with sales_transactions context instead of orders
    // For now, use basic discount event data without order enrichment
    const transactions: DiscountTransactionView[] = events.map(event => {
      return {
        ...event,
        orderNumber: `ORD-${event.orderId.substring(0, 8)}`, // Fallback order number
        tableName: undefined,
        orderType: undefined,
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
