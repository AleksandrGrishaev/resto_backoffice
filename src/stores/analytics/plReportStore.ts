// src/stores/analytics/plReportStore.ts
// ✅ SPRINT 5: P&L Report Store

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import type { PLReport } from './types'
import { useSalesStore } from '@/stores/sales/salesStore'
import { useAccountStore } from '@/stores/account'
import type { DailyExpenseCategory } from '@/stores/account/types'

const MODULE_NAME = 'PLReportStore'

export const usePLReportStore = defineStore('plReport', () => {
  // State
  const currentReport = ref<PLReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Generate P&L Report for a specific period
   * ✅ SPRINT 5: Main entry point for P&L calculation
   */
  async function generateReport(dateFrom: string, dateTo: string): Promise<PLReport> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Generating P&L report', { dateFrom, dateTo })

      const salesStore = useSalesStore()
      const accountStore = useAccountStore()

      // 1. Calculate Revenue from sales_transactions
      DebugUtils.info(MODULE_NAME, 'Calculating revenue from sales transactions')
      const salesTransactions = await salesStore.getTransactionsByDateRange(dateFrom, dateTo)

      DebugUtils.info(MODULE_NAME, 'Sales transactions loaded', {
        count: salesTransactions.length,
        totalRevenue: salesTransactions.reduce(
          (sum, t) => sum + t.profitCalculation.finalRevenue,
          0
        )
      })

      const revenue = {
        total: salesTransactions.reduce((sum, t) => sum + t.profitCalculation.finalRevenue, 0),
        byDepartment: {
          kitchen: salesTransactions
            .filter(t => t.department === 'kitchen')
            .reduce((sum, t) => sum + t.profitCalculation.finalRevenue, 0),
          bar: salesTransactions
            .filter(t => t.department === 'bar')
            .reduce((sum, t) => sum + t.profitCalculation.finalRevenue, 0)
        },
        byCategory: {} as Record<string, number> // TODO: Group by menu category if needed
      }

      // 2. Calculate COGS from actualCost
      DebugUtils.info(MODULE_NAME, 'Calculating COGS from actual costs')
      const cogs = {
        foodCost: salesTransactions
          .filter(t => t.department === 'kitchen')
          .reduce((sum, t) => sum + (t.actualCost?.totalCost || 0), 0),
        beverageCost: salesTransactions
          .filter(t => t.department === 'bar')
          .reduce((sum, t) => sum + (t.actualCost?.totalCost || 0), 0),
        total: 0
      }
      cogs.total = cogs.foodCost + cogs.beverageCost

      DebugUtils.info(MODULE_NAME, 'COGS calculated', {
        foodCost: cogs.foodCost,
        beverageCost: cogs.beverageCost,
        total: cogs.total
      })

      // 3. Calculate Gross Profit
      const grossProfit = {
        amount: revenue.total - cogs.total,
        margin: revenue.total > 0 ? ((revenue.total - cogs.total) / revenue.total) * 100 : 0
      }

      DebugUtils.info(MODULE_NAME, 'Gross profit calculated', {
        amount: grossProfit.amount,
        margin: grossProfit.margin
      })

      // 4. Get all transactions (expenses and income) for inventory adjustments
      DebugUtils.info(MODULE_NAME, 'Loading all account transactions')
      const allTransactions = await accountStore.getTransactionsByDateRange(dateFrom, dateTo)

      DebugUtils.info(MODULE_NAME, 'All transactions loaded', {
        count: allTransactions.length
      })

      // ============================================
      // ✅ SPRINT 3: INVENTORY ADJUSTMENTS SECTION
      // ============================================

      // 4a. Filter inventory adjustment transactions
      const inventoryAdjustmentCategories = [
        'food_cost',
        'inventory_variance',
        'inventory_adjustment'
      ]
      const inventoryTransactions = allTransactions.filter(t => {
        if (!t.expenseCategory) return false
        const category = t.expenseCategory.category
        return inventoryAdjustmentCategories.includes(category)
      })

      DebugUtils.info(MODULE_NAME, 'Inventory adjustment transactions filtered', {
        count: inventoryTransactions.length,
        totalAmount: inventoryTransactions.reduce((sum, t) => sum + t.amount, 0)
      })

      // 4b. Calculate losses (expenses - negative amounts)
      const lossTransactions = inventoryTransactions.filter(t => t.amount < 0)
      const inventoryLosses = lossTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

      // 4c. Calculate gains (income - positive amounts)
      const gainTransactions = inventoryTransactions.filter(t => t.amount > 0)
      const inventoryGains = gainTransactions.reduce((sum, t) => sum + t.amount, 0)

      // 4d. Calculate net impact (negative = more losses, positive = more gains)
      const totalAdjustments = -inventoryLosses + inventoryGains

      // 4e. Calculate breakdown by category
      const spoilage = inventoryTransactions
        .filter(
          t =>
            (t.description?.toLowerCase().includes('spoilage') ||
              t.description?.toLowerCase().includes('expired')) &&
            t.amount < 0
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const shortage = inventoryTransactions
        .filter(
          t =>
            t.expenseCategory?.category === 'inventory_adjustment' &&
            t.amount < 0 &&
            !t.description?.toLowerCase().includes('spoilage') &&
            !t.description?.toLowerCase().includes('expired')
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const negativeBatch = inventoryTransactions
        .filter(t => t.expenseCategory?.category === 'food_cost')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const surplus = inventoryTransactions
        .filter(t => t.expenseCategory?.category === 'inventory_adjustment' && t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)

      const reconciliation = inventoryTransactions
        .filter(t => t.expenseCategory?.category === 'inventory_variance')
        .reduce((sum, t) => sum + t.amount, 0)

      const inventoryAdjustments = {
        losses: inventoryLosses,
        gains: inventoryGains,
        total: totalAdjustments,
        byCategory: {
          spoilage,
          shortage,
          negativeBatch,
          surplus,
          reconciliation
        }
      }

      DebugUtils.info(MODULE_NAME, 'Inventory adjustments calculated', {
        losses: inventoryLosses,
        gains: inventoryGains,
        total: totalAdjustments,
        byCategory: inventoryAdjustments.byCategory
      })

      // 4f. Calculate Real Food Cost
      const realFoodCost = cogs.total + totalAdjustments

      DebugUtils.info(MODULE_NAME, 'Real food cost calculated', {
        salesCOGS: cogs.total,
        adjustments: totalAdjustments,
        realFoodCost
      })

      // ============================================
      // 5. Calculate OPEX (excluding inventory adjustments)
      // ============================================
      DebugUtils.info(MODULE_NAME, 'Calculating OPEX (excluding inventory adjustments)')

      const opexTransactions = allTransactions.filter(t => {
        if (!t.expenseCategory) return false
        const category = t.expenseCategory.category
        // Exclude inventory adjustment categories
        return !inventoryAdjustmentCategories.includes(category) && t.amount < 0
      })

      DebugUtils.info(MODULE_NAME, 'OPEX transactions filtered', {
        count: opexTransactions.length,
        totalExpenses: opexTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      })

      const opex = {
        byCategory: {
          suppliersPayments: sumByExpenseCategory(opexTransactions, 'product'),
          utilities: sumByExpenseCategory(opexTransactions, 'utilities'),
          salary: sumByExpenseCategory(opexTransactions, 'salary'),
          rent: sumByExpenseCategory(opexTransactions, 'rent'),
          transport: sumByExpenseCategory(opexTransactions, 'transport'),
          cleaning: sumByExpenseCategory(opexTransactions, 'cleaning'),
          security: sumByExpenseCategory(opexTransactions, 'security'),
          renovation: sumByExpenseCategory(opexTransactions, 'renovation'),
          other: sumByExpenseCategory(opexTransactions, 'other')
        },
        total: 0
      }
      opex.total = Object.values(opex.byCategory).reduce((sum, v) => sum + v, 0)

      DebugUtils.info(MODULE_NAME, 'OPEX calculated', {
        total: opex.total,
        byCategory: opex.byCategory
      })

      // 6. Calculate Net Profit (using Real Food Cost)
      const netProfit = {
        amount: revenue.total - realFoodCost - opex.total,
        margin:
          revenue.total > 0
            ? ((revenue.total - realFoodCost - opex.total) / revenue.total) * 100
            : 0
      }

      DebugUtils.info(MODULE_NAME, 'Net profit calculated', {
        amount: netProfit.amount,
        margin: netProfit.margin
      })

      // 7. Create report
      const report: PLReport = {
        period: { dateFrom, dateTo },
        revenue,
        cogs,
        grossProfit,
        inventoryAdjustments,
        realFoodCost,
        opex,
        netProfit,
        generatedAt: TimeUtils.getCurrentLocalISO()
      }

      currentReport.value = report

      DebugUtils.info(MODULE_NAME, 'P&L report generated successfully', {
        revenue: revenue.total,
        cogs: cogs.total,
        grossProfit: grossProfit.amount,
        opex: opex.total,
        netProfit: netProfit.amount
      })

      return report
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate report'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Sum transactions by expense category
   */
  function sumByExpenseCategory(transactions: any[], category: DailyExpenseCategory): number {
    return transactions
      .filter((t: any) => {
        // Handle both direct category and expenseCategory.category
        const txCategory = t.expenseCategory?.category || t.category
        return txCategory === category
      })
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0)
  }

  /**
   * Export report to JSON
   */
  function exportReportToJSON(report: PLReport): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Clear current report
   */
  function clearReport(): void {
    currentReport.value = null
    error.value = null
  }

  return {
    // State
    currentReport,
    loading,
    error,

    // Actions
    generateReport,
    exportReportToJSON,
    clearReport
  }
})
