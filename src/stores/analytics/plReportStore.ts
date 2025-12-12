// src/stores/analytics/plReportStore.ts
// ✅ SPRINT 5: P&L Report Store

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import type { PLReport, COGSMethod, COGSCalculation } from './types'
import { useSalesStore } from '@/stores/sales/salesStore'
import { useAccountStore } from '@/stores/account'
import type { DailyExpenseCategory } from '@/stores/account/types'
import { getCOGSForPL } from './services/cogsService'

const MODULE_NAME = 'PLReportStore'

export const usePLReportStore = defineStore('plReport', () => {
  // State
  const currentReport = ref<PLReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Generate P&L Report for a specific period
   * ✅ SPRINT 5: Main entry point for P&L calculation
   * ✅ SPRINT 4: Supports multiple COGS calculation methods
   */
  async function generateReport(
    dateFrom: string,
    dateTo: string,
    method: COGSMethod = 'accrual'
  ): Promise<PLReport> {
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

      // 3. Calculate Gross Profit (will be updated after COGS calculation)
      // NOTE: This is a preliminary calculation, will be updated after selecting COGS method
      const grossProfit = {
        amount: revenue.total - cogs.total,
        margin: revenue.total > 0 ? ((revenue.total - cogs.total) / revenue.total) * 100 : 0
      }

      DebugUtils.info(MODULE_NAME, 'Gross profit calculated', {
        amount: grossProfit.amount,
        margin: grossProfit.margin
      })

      // ============================================
      // ✅ COGS UNIFICATION: Use unified SQL function for COGS
      // ============================================
      // 4. Get COGS data from unified SQL function (includes storage + preparation write-offs)
      DebugUtils.info(MODULE_NAME, 'Getting COGS data from unified SQL function')

      const cogsData = await getCOGSForPL(dateFrom, dateTo, null)

      DebugUtils.info(MODULE_NAME, 'COGS data received from SQL function', {
        revenue: cogsData.revenue,
        salesCOGS: cogsData.salesCOGS,
        spoilageTotal: cogsData.spoilage.total,
        spoilageExpired: cogsData.spoilage.expired,
        spoilageSpoiled: cogsData.spoilage.spoiled,
        spoilageOther: cogsData.spoilage.other,
        shortage: cogsData.shortage,
        surplus: cogsData.surplus,
        totalCOGS: cogsData.totalCOGS
      })

      // Map SQL function results to inventoryAdjustments structure
      const inventoryLosses = cogsData.spoilage.total + cogsData.shortage
      const inventoryGains = cogsData.surplus
      const totalAdjustments = inventoryLosses - inventoryGains

      const inventoryAdjustments = {
        losses: inventoryLosses,
        gains: inventoryGains,
        total: totalAdjustments,
        byCategory: {
          spoilage: cogsData.spoilage.total,
          shortage: cogsData.shortage,
          surplus: cogsData.surplus
        }
      }

      DebugUtils.info(MODULE_NAME, 'Inventory adjustments mapped from SQL function', {
        spoilageBreakdown: cogsData.spoilage,
        shortage: cogsData.shortage,
        surplus: cogsData.surplus,
        totalLosses: inventoryLosses,
        totalGains: inventoryGains,
        netAdjustment: totalAdjustments
      })

      // 4h. Calculate Real Food Cost (Sales COGS + Adjustments)
      const realFoodCost = cogsData.totalCOGS

      DebugUtils.info(MODULE_NAME, 'Real food cost from SQL function', {
        salesCOGS: cogsData.salesCOGS,
        spoilage: cogsData.spoilage.total,
        shortage: cogsData.shortage,
        surplus: cogsData.surplus,
        realFoodCost
      })

      // ============================================
      // ✅ SPRINT 4: Calculate COGS using both methods
      // ============================================
      DebugUtils.info(MODULE_NAME, 'Calculating COGS using both Accrual and Cash Basis methods')

      // Accrual method - use unified SQL function data
      const accrualCOGS = {
        salesCOGS: cogsData.salesCOGS,
        spoilage: cogsData.spoilage.total,
        shortage: cogsData.shortage,
        surplus: cogsData.surplus,
        total: cogsData.totalCOGS
      }

      // Cash method (new)
      const cashCOGS = await calculateCOGSCashBasis(dateFrom, dateTo)

      // Create COGSCalculation with both methods
      const cogsCalculation: COGSCalculation = {
        method,
        accrual: accrualCOGS,
        cash: cashCOGS,
        total: method === 'accrual' ? accrualCOGS.total : cashCOGS.total
      }

      DebugUtils.info(MODULE_NAME, 'Both COGS methods calculated', {
        accrualTotal: accrualCOGS.total,
        cashTotal: cashCOGS.total,
        selectedMethod: method,
        selectedTotal: cogsCalculation.total,
        difference: Math.abs(accrualCOGS.total - cashCOGS.total)
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

      // ============================================
      // 6. Recalculate Gross and Net Profit using selected COGS method
      // ============================================
      const selectedCOGS = cogsCalculation.total

      // Update Gross Profit based on selected method
      grossProfit.amount = revenue.total - selectedCOGS
      grossProfit.margin =
        revenue.total > 0 ? ((revenue.total - selectedCOGS) / revenue.total) * 100 : 0

      DebugUtils.info(MODULE_NAME, 'Gross profit recalculated with selected COGS method', {
        method,
        selectedCOGS,
        amount: grossProfit.amount,
        margin: grossProfit.margin
      })

      // Calculate Net Profit using selected COGS method
      const netProfit = {
        amount: revenue.total - selectedCOGS - opex.total,
        margin:
          revenue.total > 0
            ? ((revenue.total - selectedCOGS - opex.total) / revenue.total) * 100
            : 0
      }

      DebugUtils.info(MODULE_NAME, 'Net profit calculated', {
        revenue: revenue.total,
        selectedCOGS,
        opex: opex.total,
        calculation: `${revenue.total} - ${selectedCOGS} - ${opex.total}`,
        amount: netProfit.amount,
        margin: netProfit.margin
      })

      // 7. Create report with new COGS structure
      const report: PLReport = {
        period: { dateFrom, dateTo },
        revenue,
        cogs: cogsCalculation, // ✅ SPRINT 4: New COGSCalculation structure
        cogsMethod: method, // ✅ SPRINT 4: Selected method
        grossProfit,
        inventoryAdjustments,
        realFoodCost, // Keep for backward compatibility (Accrual method)
        opex,
        netProfit,
        generatedAt: TimeUtils.getCurrentLocalISO()
      }

      currentReport.value = report

      DebugUtils.info(MODULE_NAME, 'P&L report generated successfully', {
        revenue: revenue.total,
        cogsMethod: method,
        cogs: cogsCalculation.total,
        cogsAccrual: accrualCOGS.total,
        cogsCash: cashCOGS.total,
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
   * ✅ SPRINT 4: Calculate COGS using Cash Basis method
   * Formula: Opening Inventory + Purchases - Δ Accounts Payable - Closing Inventory
   *
   * NOTE: For now, uses current inventory value (not historical)
   * TODO: Implement historical inventory valuation for accurate opening/closing inventory
   */
  async function calculateCOGSCashBasis(
    dateFrom: string,
    dateTo: string
  ): Promise<COGSCalculation['cash']> {
    DebugUtils.info(MODULE_NAME, 'Calculating Cash Basis COGS', { dateFrom, dateTo })

    const accountStore = useAccountStore()
    const { useInventoryValuationStore } = await import('./inventoryValuationStore')
    const inventoryValuationStore = useInventoryValuationStore()

    // 1. Opening inventory (start of period)
    // NOTE: Using current valuation as proxy
    // TODO: Calculate historical inventory value at dateFrom
    const openingValuation = await inventoryValuationStore.calculateValuation()
    const openingInventory = openingValuation.totalValue

    DebugUtils.info(MODULE_NAME, 'Opening inventory (current value used)', {
      openingInventory,
      note: 'Using current inventory as proxy for opening inventory'
    })

    // 2. Payments to suppliers (real cash)
    const supplierTransactions = await accountStore.getTransactionsByDateRange(dateFrom, dateTo)
    const purchases = supplierTransactions
      .filter(t => t.type === 'expense' && t.expenseCategory?.category === 'product')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    DebugUtils.info(MODULE_NAME, 'Supplier payments calculated', {
      transactionsCount: supplierTransactions.filter(
        t => t.type === 'expense' && t.expenseCategory?.category === 'product'
      ).length,
      purchases
    })

    // 3. Accounts Payable (кредиторская задолженность)
    // Opening AP (at start of period)
    // NOTE: Using current account balance as proxy
    // TODO: Calculate historical AP at dateFrom
    const openingAccountsPayable = await calculateAccountsPayable(dateFrom)

    DebugUtils.info(MODULE_NAME, 'Opening Accounts Payable calculated', {
      openingAccountsPayable,
      note: 'Using current supplier balances as proxy for opening AP'
    })

    // Closing AP (at end of period)
    // NOTE: Using current account balance
    const closingAccountsPayable = await calculateAccountsPayable(dateTo)

    DebugUtils.info(MODULE_NAME, 'Closing Accounts Payable calculated', {
      closingAccountsPayable
    })

    // Δ AP = Closing AP - Opening AP
    // Positive delta means credit increased (we received goods but didn't pay yet)
    // This should REDUCE cash-based COGS (we didn't pay cash yet)
    const accountsPayableDelta = closingAccountsPayable - openingAccountsPayable

    DebugUtils.info(MODULE_NAME, 'Accounts Payable delta calculated', {
      openingAP: openingAccountsPayable,
      closingAP: closingAccountsPayable,
      delta: accountsPayableDelta,
      interpretation:
        accountsPayableDelta > 0
          ? 'Credit increased - received goods without payment'
          : 'Credit decreased - paid more than received'
    })

    // 4. Closing inventory (end of period)
    // NOTE: Using current valuation (same as opening for now)
    // TODO: Calculate historical inventory value at dateTo
    const closingInventory = openingInventory

    DebugUtils.info(MODULE_NAME, 'Closing inventory (current value used)', {
      closingInventory,
      note: 'Using current inventory as proxy for closing inventory'
    })

    // 5. Calculate inventory change (Closing - Opening)
    const inventoryChange = closingInventory - openingInventory

    DebugUtils.info(MODULE_NAME, 'Inventory change calculated', {
      openingInventory,
      closingInventory,
      inventoryChange,
      interpretation:
        inventoryChange > 0
          ? 'Inventory increased - purchased more than consumed'
          : inventoryChange < 0
            ? 'Inventory decreased - consumed more than purchased'
            : 'No inventory change'
    })

    // Formula: COGS = Opening Inventory + Purchases - Δ AP - Closing Inventory
    const total = openingInventory + purchases - accountsPayableDelta - closingInventory

    DebugUtils.info(MODULE_NAME, 'Cash basis COGS calculated', {
      openingInventory,
      purchases,
      openingAccountsPayable,
      closingAccountsPayable,
      accountsPayableDelta,
      closingInventory,
      inventoryChange,
      total,
      formula: `${openingInventory} + ${purchases} - ${accountsPayableDelta} - ${closingInventory} = ${total}`,
      warning: 'Opening and closing inventory/AP use current values, not historical'
    })

    return {
      openingInventory,
      closingInventory,
      inventoryChange,
      purchases,
      openingAccountsPayable,
      closingAccountsPayable,
      accountsPayableDelta,
      total
    }
  }

  /**
   * Calculate Accounts Payable (кредиторская задолженность) at a specific date
   * Returns net balance with suppliers (positive = we owe, negative = they owe us)
   *
   * Formula: Sum of all currentBalance for supplier counteragents
   * Positive balance = we owe the supplier (Accounts Payable)
   * Negative balance = supplier owes us (prepayment/overpayment)
   * Net result = total AP minus total prepayments
   *
   * NOTE: Currently uses current balances (not historical)
   * TODO: Implement historical balance tracking at specific dates
   */
  async function calculateAccountsPayable(date: string): Promise<number> {
    try {
      const { useCounteragentsStore } = await import('@/stores/counteragents/counteragentsStore')
      const counteragentsStore = useCounteragentsStore()

      // Get all supplier counteragents
      const suppliers = counteragentsStore.supplierCounterAgents

      // Sum ALL balances (positive and negative)
      const totalAP = suppliers.reduce((sum, supplier) => {
        const balance = supplier.currentBalance || 0
        return sum + balance
      }, 0)

      const positiveBalances = suppliers.filter(s => (s.currentBalance || 0) > 0)
      const negativeBalances = suppliers.filter(s => (s.currentBalance || 0) < 0)

      const totalDebt = positiveBalances.reduce((sum, s) => sum + (s.currentBalance || 0), 0)
      const totalPrepayment = Math.abs(
        negativeBalances.reduce((sum, s) => sum + (s.currentBalance || 0), 0)
      )

      DebugUtils.info(MODULE_NAME, 'Accounts Payable calculated', {
        date,
        suppliersCount: suppliers.length,
        suppliersWithDebt: positiveBalances.length,
        suppliersWithPrepayment: negativeBalances.length,
        totalDebt,
        totalPrepayment,
        netAP: totalAP,
        note: 'Using current balances as proxy for historical AP'
      })

      return totalAP
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate Accounts Payable', { error, date })
      return 0
    }
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
