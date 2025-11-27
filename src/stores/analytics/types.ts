// src/stores/analytics/types.ts
// ✅ SPRINT 5: Analytics types for P&L Report and Food Cost Dashboard

import type { DailyExpenseCategory } from '@/stores/account/types'

/**
 * P&L Report
 * Profit and Loss statement for a specific period
 */
export interface PLReport {
  period: {
    dateFrom: string
    dateTo: string
  }

  // Revenue section
  revenue: {
    total: number
    byDepartment: {
      kitchen: number
      bar: number
    }
    byCategory: Record<string, number> // Group by menu category
  }

  // Cost of Goods Sold (COGS)
  cogs: {
    total: number
    foodCost: number // Kitchen department actual costs
    beverageCost: number // Bar department actual costs
  }

  // Gross Profit
  grossProfit: {
    amount: number
    margin: number // Percentage
  }

  // Operating Expenses (OPEX)
  opex: {
    total: number
    byCategory: {
      suppliersPayments: number // Payments to suppliers (category: 'product')
      utilities: number
      salary: number
      rent: number
      transport: number
      cleaning: number
      security: number
      renovation: number
      other: number
    }
  }

  // Net Profit
  netProfit: {
    amount: number
    margin: number // Percentage
  }

  // Metadata
  generatedAt: string
  generatedBy?: string
}

/**
 * Food Cost Dashboard Data
 * Shows food cost percentage and trends
 */
export interface FoodCostDashboard {
  period: {
    dateFrom: string
    dateTo: string
  }

  // Summary
  summary: {
    revenue: number
    foodCost: number
    foodCostPercentage: number // (foodCost / revenue) * 100
    targetFoodCostPercentage: number // Target from settings
    variance: number // Actual vs Target
  }

  // Daily breakdown for charts
  dailyBreakdown: Array<{
    date: string
    revenue: number
    foodCost: number
    foodCostPercentage: number
  }>

  // Top items by cost
  topItemsByCost: Array<{
    menuItemId: string
    menuItemName: string
    variantName: string
    quantitySold: number
    totalRevenue: number
    totalCost: number
    costPercentage: number
  }>

  // Department breakdown
  byDepartment: {
    kitchen: {
      revenue: number
      cost: number
      percentage: number
    }
    bar: {
      revenue: number
      cost: number
      percentage: number
    }
  }
}

/**
 * Inventory Valuation
 * Total value of inventory at a specific point in time
 */
export interface InventoryValuation {
  calculatedAt: string
  calculatedBy?: string

  // Total inventory value (FIFO)
  totalValue: number

  // Breakdown by type
  byType: {
    products: {
      value: number
      batchCount: number
      itemCount: number
    }
    preparations: {
      value: number
      batchCount: number
      itemCount: number
    }
  }

  // Breakdown by department
  byDepartment: {
    kitchen: number
    bar: number
  }

  // Breakdown by warehouse (for products)
  byWarehouse: Record<
    string,
    {
      warehouseName: string
      value: number
      batchCount: number
    }
  >

  // Top items by value
  topItems: Array<{
    itemId: string
    itemName: string
    itemType: 'product' | 'preparation'
    quantity: number
    unit: string
    averageCostPerUnit: number
    totalValue: number
  }>
}

/**
 * Expense Summary
 * Summarizes expenses by category
 */
export interface ExpenseSummary {
  period: {
    dateFrom: string
    dateTo: string
  }

  total: number

  byCategory: Record<
    DailyExpenseCategory,
    {
      amount: number
      percentage: number
      transactionCount: number
    }
  >

  // Top expenses
  topExpenses: Array<{
    transactionId: string
    date: string
    category: DailyExpenseCategory
    amount: number
    description?: string
    counteragentName?: string
  }>
}

/**
 * Analytics store state
 */
export interface AnalyticsState {
  currentPLReport: PLReport | null
  currentFoodCostDashboard: FoodCostDashboard | null
  currentInventoryValuation: InventoryValuation | null
  loading: boolean
  error: string | null
}
