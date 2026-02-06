// src/stores/analytics/foodCostStore.ts
// ✅ SPRINT 5: Food Cost Dashboard Store

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils } from '@/utils'
import type { FoodCostDashboard } from './types'
import { useSalesStore } from '@/stores/sales/salesStore'
import { getNetRevenue } from '@/stores/sales/composables/useProfitCalculation'
import { getCOGSForPL } from './services/cogsService'

const MODULE_NAME = 'FoodCostStore'

export const useFoodCostStore = defineStore('foodCost', () => {
  // State
  const currentDashboard = ref<FoodCostDashboard | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const includeTaxesInRevenue = ref(false) // Toggle: include taxes in denominator

  /**
   * Generate Food Cost Dashboard for a specific period
   * ✅ SPRINT 5: Main entry point for Food Cost analytics
   */
  async function generateDashboard(
    dateFrom: string,
    dateTo: string,
    targetFoodCostPercentage: number = 30 // Default target: 30%
  ): Promise<FoodCostDashboard> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Generating Food Cost Dashboard', {
        dateFrom,
        dateTo,
        targetFoodCostPercentage
      })

      const salesStore = useSalesStore()

      // 1. Get all sales transactions for the period
      const transactions = await salesStore.getTransactionsByDateRange(dateFrom, dateTo)

      DebugUtils.info(MODULE_NAME, 'Transactions loaded', { count: transactions.length })

      // 2. Calculate summary using unified COGS service
      // ✅ COGS UNIFICATION: Use SQL function for consistent data
      const cogsData = await getCOGSForPL(dateFrom, dateTo, null)

      DebugUtils.info(MODULE_NAME, 'COGS data from SQL function', {
        revenue: cogsData.revenue,
        salesCOGS: cogsData.salesCOGS
      })

      /**
       * Revenue Calculation:
       * - Default: Use SQL function revenue (actual revenue from sales_transactions)
       * - With taxes toggle: Use transaction-level totalCollected (requires manual calculation)
       *
       * For taxes toggle, we still need to process transactions individually
       */
      let revenue: number
      let foodCost: number

      if (includeTaxesInRevenue.value) {
        // With taxes: calculate from transactions manually
        revenue = transactions.reduce((sum, t) => {
          const revenueAmount = t.order?.totalCollected || getNetRevenue(t.profitCalculation)
          return sum + revenueAmount
        }, 0)
        // Use SQL function salesCOGS for consistency
        foodCost = cogsData.salesCOGS
      } else {
        // Without taxes: use unified SQL function data
        revenue = cogsData.revenue
        foodCost = cogsData.salesCOGS
      }

      const foodCostPercentage = revenue > 0 ? (foodCost / revenue) * 100 : 0
      const variance = foodCostPercentage - targetFoodCostPercentage

      const summary = {
        revenue,
        foodCost,
        foodCostPercentage,
        targetFoodCostPercentage,
        variance
      }

      DebugUtils.info(MODULE_NAME, 'Summary calculated (using unified COGS)', summary)

      // 3. Calculate daily breakdown
      const dailyMap = new Map<
        string,
        { date: string; revenue: number; foodCost: number; count: number }
      >()

      for (const tx of transactions) {
        const date = tx.soldAt.split('T')[0] // Extract date part (YYYY-MM-DD)

        if (!dailyMap.has(date)) {
          dailyMap.set(date, { date, revenue: 0, foodCost: 0, count: 0 })
        }

        const day = dailyMap.get(date)!
        const revenueAmount = includeTaxesInRevenue.value
          ? tx.order?.totalCollected || getNetRevenue(tx.profitCalculation)
          : tx.order?.actualRevenue || getNetRevenue(tx.profitCalculation)
        day.revenue += revenueAmount
        day.foodCost += tx.actualCost?.totalCost || 0
        day.count++
      }

      const dailyBreakdown = Array.from(dailyMap.values())
        .map(day => ({
          date: day.date,
          revenue: day.revenue,
          foodCost: day.foodCost,
          foodCostPercentage: day.revenue > 0 ? (day.foodCost / day.revenue) * 100 : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      DebugUtils.info(MODULE_NAME, 'Daily breakdown calculated', {
        days: dailyBreakdown.length
      })

      // 4. Calculate top items by cost
      const itemsMap = new Map<
        string,
        {
          menuItemId: string
          menuItemName: string
          variantName: string
          quantitySold: number
          totalRevenue: number
          totalCost: number
        }
      >()

      for (const tx of transactions) {
        const key = `${tx.menuItemId}-${tx.variantId}`

        if (!itemsMap.has(key)) {
          itemsMap.set(key, {
            menuItemId: tx.menuItemId,
            menuItemName: tx.menuItemName,
            variantName: tx.variantName,
            quantitySold: 0,
            totalRevenue: 0,
            totalCost: 0
          })
        }

        const item = itemsMap.get(key)!
        item.quantitySold += tx.quantity
        const revenueAmount = includeTaxesInRevenue.value
          ? tx.order?.totalCollected || getNetRevenue(tx.profitCalculation)
          : tx.order?.actualRevenue || getNetRevenue(tx.profitCalculation)
        item.totalRevenue += revenueAmount
        item.totalCost += tx.actualCost?.totalCost || 0
      }

      const topItemsByCost = Array.from(itemsMap.values())
        .map(item => ({
          ...item,
          costPercentage: item.totalRevenue > 0 ? (item.totalCost / item.totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 10)

      DebugUtils.info(MODULE_NAME, 'Top items calculated', { count: topItemsByCost.length })

      // 5. Calculate department breakdown
      const kitchenRevenue = transactions
        .filter(t => t.department === 'kitchen')
        .reduce((sum, t) => {
          const revenueAmount = includeTaxesInRevenue.value
            ? t.order?.totalCollected || getNetRevenue(t.profitCalculation)
            : t.order?.actualRevenue || getNetRevenue(t.profitCalculation)
          return sum + revenueAmount
        }, 0)
      const kitchenCost = transactions
        .filter(t => t.department === 'kitchen')
        .reduce((sum, t) => sum + (t.actualCost?.totalCost || 0), 0)

      const barRevenue = transactions
        .filter(t => t.department === 'bar')
        .reduce((sum, t) => {
          const revenueAmount = includeTaxesInRevenue.value
            ? t.order?.totalCollected || getNetRevenue(t.profitCalculation)
            : t.order?.actualRevenue || getNetRevenue(t.profitCalculation)
          return sum + revenueAmount
        }, 0)
      const barCost = transactions
        .filter(t => t.department === 'bar')
        .reduce((sum, t) => sum + (t.actualCost?.totalCost || 0), 0)

      const byDepartment = {
        kitchen: {
          revenue: kitchenRevenue,
          cost: kitchenCost,
          percentage: kitchenRevenue > 0 ? (kitchenCost / kitchenRevenue) * 100 : 0
        },
        bar: {
          revenue: barRevenue,
          cost: barCost,
          percentage: barRevenue > 0 ? (barCost / barRevenue) * 100 : 0
        }
      }

      DebugUtils.info(MODULE_NAME, 'Department breakdown calculated', byDepartment)

      // 6. Create dashboard
      const dashboard: FoodCostDashboard = {
        period: { dateFrom, dateTo },
        summary,
        dailyBreakdown,
        topItemsByCost,
        byDepartment
      }

      currentDashboard.value = dashboard

      DebugUtils.info(MODULE_NAME, 'Food Cost Dashboard generated successfully', {
        revenue: summary.revenue,
        foodCost: summary.foodCost,
        foodCostPercentage: summary.foodCostPercentage.toFixed(2) + '%',
        variance: summary.variance.toFixed(2) + '%'
      })

      return dashboard
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate dashboard'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Export dashboard to JSON
   */
  function exportDashboardToJSON(dashboard: FoodCostDashboard): string {
    return JSON.stringify(dashboard, null, 2)
  }

  /**
   * Clear current dashboard
   */
  function clearDashboard(): void {
    currentDashboard.value = null
    error.value = null
  }

  /**
   * Set whether to include taxes in revenue calculations
   * This affects the food cost percentage denominator
   *
   * @param include - true to include taxes (use totalCollected), false to exclude (use actualRevenue)
   */
  function setIncludeTaxesInRevenue(include: boolean): void {
    includeTaxesInRevenue.value = include
    DebugUtils.info(MODULE_NAME, 'Tax inclusion toggled', {
      include,
      note: include ? 'Using Total Collected (with taxes)' : 'Using Actual Revenue (before tax)'
    })
  }

  return {
    // State
    currentDashboard,
    loading,
    error,
    includeTaxesInRevenue,

    // Actions
    generateDashboard,
    exportDashboardToJSON,
    clearDashboard,
    setIncludeTaxesInRevenue
  }
})
