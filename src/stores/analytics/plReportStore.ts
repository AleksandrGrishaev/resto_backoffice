// src/stores/analytics/plReportStore.ts
// ✅ SPRINT 5: P&L Report Store

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import type { PLReport } from './types'
import { useSalesStore } from '@/stores/sales/salesStore'
import { useAccountStore } from '@/stores/account'
import type { DailyExpenseCategory } from '@/stores/account/types'
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'

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

      // ============================================
      // ✅ SPRINT 4: INVENTORY ADJUSTMENTS FROM OPERATIONS
      // ============================================
      // 4. Calculate inventory adjustments from storage/preparation operations
      // NOT from accountStore transactions (Sprint 4 fix)
      DebugUtils.info(MODULE_NAME, 'Calculating inventory adjustments from operations')

      const storageStore = useStorageStore()
      const preparationStore = usePreparationStore()

      const dateRange = { start: dateFrom, end: dateTo }

      // 4a. Product spoilage (storage write-offs)
      const productSpoilageOps = await storageStore.getOperationsByFilter({
        type: 'write_off',
        reasons: ['expired', 'spoiled', 'other'],
        dateRange
      })
      const productSpoilage = productSpoilageOps.reduce((sum, op) => sum + (op.totalValue || 0), 0)

      // 4b. Product shortage (inventory adjustment write-offs)
      const productShortageOps = await storageStore.getOperationsByFilter({
        type: 'write_off',
        reasons: ['inventory_adjustment'],
        dateRange
      })
      const productShortage = productShortageOps.reduce((sum, op) => sum + (op.totalValue || 0), 0)

      // 4c. Product surplus (inventory adjustment corrections)
      const productSurplusOps = await storageStore.getOperationsByFilter({
        type: 'correction',
        correctionReason: 'other', // inventory adjustments are stored as 'other' corrections
        dateRange
      })
      const productSurplus = productSurplusOps.reduce((sum, op) => sum + (op.totalValue || 0), 0)

      // 4d. Preparation spoilage (preparation write-offs)
      const prepSpoilageOps = await preparationStore.getOperationsByFilter({
        type: 'write_off',
        reasons: ['expired', 'spoiled', 'contaminated', 'quality_control'],
        dateRange
      })
      const prepSpoilage = prepSpoilageOps.reduce((sum, op) => sum + (op.totalValue || 0), 0)

      // 4e. Preparation shortage (inventory adjustment write-offs)
      // Note: Preparations don't have 'inventory_adjustment' reason yet, skip for now
      const prepShortage = 0

      // 4f. Preparation surplus (inventory adjustment corrections)
      const prepSurplusOps = await preparationStore.getOperationsByFilter({
        type: 'correction',
        correctionReason: 'other', // inventory adjustments
        dateRange
      })
      const prepSurplus = prepSurplusOps.reduce((sum, op) => sum + (op.totalValue || 0), 0)

      // 4g. Calculate totals
      const spoilage = productSpoilage + prepSpoilage
      const shortage = productShortage + prepShortage
      const surplus = productSurplus + prepSurplus

      const inventoryLosses = spoilage + shortage
      const inventoryGains = surplus
      const totalAdjustments = inventoryLosses - inventoryGains // Losses are positive, gains reduce cost

      const inventoryAdjustments = {
        losses: inventoryLosses,
        gains: inventoryGains,
        total: totalAdjustments,
        byCategory: {
          spoilage, // Spoilage from storage + preparation operations
          shortage, // Shortage from inventory adjustments
          surplus // Surplus from inventory adjustments
        }
      }

      DebugUtils.info(MODULE_NAME, 'Inventory adjustments calculated from operations', {
        productSpoilage,
        productShortage,
        productSurplus,
        prepSpoilage,
        prepShortage,
        prepSurplus,
        totalLosses: inventoryLosses,
        totalGains: inventoryGains,
        netAdjustment: totalAdjustments
      })

      // 4h. Calculate Real Food Cost
      const realFoodCost = cogs.total + totalAdjustments

      DebugUtils.info(MODULE_NAME, 'Real food cost calculated', {
        salesCOGS: cogs.total,
        adjustments: totalAdjustments,
        realFoodCost
      })

      // ============================================
      // 5. Calculate OPEX from accountStore (real expenses only)
      // ============================================
      DebugUtils.info(MODULE_NAME, 'Calculating OPEX from account transactions')

      // Load all account transactions for OPEX
      const allTransactions = await accountStore.getTransactionsByDateRange(dateFrom, dateTo)

      DebugUtils.info(MODULE_NAME, 'Account transactions loaded for OPEX', {
        count: allTransactions.length
      })

      // Filter OPEX transactions (exclude inventory_adjustment - those are now in COGS)
      const opexTransactions = allTransactions.filter(t => {
        if (!t.expenseCategory) return false
        const category = t.expenseCategory.category
        // ✅ SPRINT 4: Exclude inventory_adjustment - it's now calculated from operations
        // Only include real expenses (supplier payments, rent, salaries, etc.)
        return category !== 'inventory_adjustment' && t.type === 'expense'
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
          trainingEducation: sumByExpenseCategory(opexTransactions, 'training_education'),
          recipeDevelopment: sumByExpenseCategory(opexTransactions, 'recipe_development'),
          marketing: sumByExpenseCategory(opexTransactions, 'marketing'),
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
        revenue: revenue.total,
        realFoodCost,
        opex: opex.total,
        calculation: `${revenue.total} - ${realFoodCost} - ${opex.total}`,
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
   * Calculate inventory additions (излишки) from surplus receipts
   * Used in Accrual COGS calculation
   *
   * @param startDate - Start date (ISO string)
   * @param endDate - End date (ISO string)
   * @returns Total value of inventory additions from physical counts
   */
  async function calculateInventoryAdditions(startDate: string, endDate: string): Promise<number> {
    const { useStorageStore } = await import('@/stores/storage')
    const storageStore = useStorageStore()

    // Get all receipts with reason='inventory_adjustment' (surplus from physical count)
    const receipts = storageStore.receipts.filter(r => {
      if (r.reason !== 'inventory_adjustment') return false
      if (!r.receiptDate) return false

      const receiptDate = new Date(r.receiptDate)
      return receiptDate >= new Date(startDate) && receiptDate <= new Date(endDate)
    })

    const total = receipts.reduce((sum, r) => sum + (r.totalCost || 0), 0)

    DebugUtils.info(MODULE_NAME, 'Inventory additions calculated', {
      startDate,
      endDate,
      receiptsCount: receipts.length,
      totalValue: total
    })

    return total
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
    clearReport,
    calculateInventoryAdditions
  }
})
