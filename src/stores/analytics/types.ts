// src/stores/analytics/types.ts
// ✅ SPRINT 5: Analytics types for P&L Report and Food Cost Dashboard

/**
 * ✅ SPRINT 4: COGS Calculation Methods
 */
export type COGSMethod = 'accrual' | 'cash'

/**
 * ✅ SPRINT 4: COGS Calculation with multiple methods
 */
export interface COGSCalculation {
  method: COGSMethod

  // Accrual method details (current implementation)
  accrual?: {
    salesCOGS: number // From sales transactions (actualCost)
    spoilage: number // Spoilage/loss write-offs
    shortage: number // Inventory adjustment write-offs
    surplus: number // Inventory adjustment additions
    total: number // salesCOGS + spoilage + shortage - surplus
  }

  // Cash method details (new in Sprint 4)
  cash?: {
    openingInventory: number // Start of period (for internal calculation)
    closingInventory: number // End of period (for internal calculation)
    inventoryChange: number // Closing - Opening (shown in report)
    purchases: number // Payments to suppliers
    openingAccountsPayable: number // AP at start of period
    closingAccountsPayable: number // AP at end of period
    accountsPayableDelta: number // Closing AP - Opening AP (increase = more credit)
    total: number // openingInventory + purchases - apDelta - closingInventory
  }

  total: number // Final COGS value (based on selected method)
}

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

  // ✅ SPRINT 4: Cost of Goods Sold with multiple calculation methods
  cogs: COGSCalculation
  cogsMethod: COGSMethod // Selected method for P&L calculations

  // Gross Profit
  grossProfit: {
    amount: number
    margin: number // Percentage
  }

  // ✅ SPRINT 3: Inventory Adjustments Section
  // NOTE: Only manual adjustments (inventory_adjustment category)
  // Negative batches do NOT create account transactions
  inventoryAdjustments: {
    losses: number // Total losses (always positive number for display)
    gains: number // Total gains (always positive number for display)
    total: number // Net impact (negative = losses > gains, positive = gains > losses)
    byCategory: {
      spoilage: number // Manual write-offs (reason: spoilage/loss/theft)
      shortage: number // Manual write-offs (reason: inventory_adjustment)
      surplus: number // Manual additions (reason: inventory_adjustment)
    }
  }

  // Real Food Cost (Sales COGS + Inventory Adjustments)
  realFoodCost: number

  // Operating Expenses (OPEX) - dynamic categories from database
  opex: {
    total: number
    byCategory: Record<string, number> // Dynamic: only categories with transactions
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
    kitchenAndBar: number // Items used in both departments
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

  // All inventory items sorted by value (not limited to top N)
  topItems: Array<{
    itemId: string
    itemName: string
    itemType: 'product' | 'preparation'
    department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown' // Department classification
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
    string,
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
    category: string
    amount: number
    description?: string
    counteragentName?: string
  }>
}

/**
 * ✅ SPRINT 3: Negative Inventory Report
 * Shows all negative batch events and their financial impact
 */
export interface NegativeInventoryReport {
  period: {
    dateFrom: string
    dateTo: string
  }

  // Summary metrics
  summary: {
    totalItems: number // Unique items with negative batches
    totalEvents: number // Total negative batch events
    totalCostImpact: number // Total cost from negative batches
    unreconciledBatches: number // Batches still negative (not reconciled)
  }

  // Detailed breakdown
  items: Array<{
    itemId: string
    itemName: string
    itemType: 'product' | 'preparation'
    category: string // Product category or preparation type
    department: 'kitchen' | 'bar' | 'kitchenAndBar' | 'unknown'

    // Batch information
    batchId: string
    batchNumber: string
    batchDate: string // When batch was created

    // Negative event details
    eventDate: string // When it went negative
    negativeQuantity: number // How much negative (absolute value)
    unit: string
    costPerUnit: number
    totalCost: number // negativeQuantity * costPerUnit

    // Status
    status: 'unreconciled' | 'reconciled' | 'written_off'
    reconciledAt?: string
    reconciledBy?: string

    // Context
    reason: string // Why it went negative (sales, production, etc.)
    notes?: string
  }>

  // Aggregations
  byDepartment: {
    kitchen: { count: number; cost: number }
    bar: { count: number; cost: number }
    kitchenAndBar: { count: number; cost: number }
  }

  byStatus: {
    unreconciled: { count: number; cost: number }
    reconciled: { count: number; cost: number }
    written_off: { count: number; cost: number }
  }

  byItemType: {
    products: { count: number; cost: number }
    preparations: { count: number; cost: number }
  }

  // Metadata
  generatedAt: string
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

/**
 * ✅ COGS Unification: Spoilage breakdown by reason
 */
export interface SpoilageBreakdown {
  total: number
  expired: number
  spoiled: number
  other: number
}

/**
 * ✅ COGS Unification: Complete COGS breakdown from unified SQL function
 *
 * Used by:
 * - P&L Report (getCOGSForPL - no exclusions)
 * - Food Cost Dashboard (getCOGSForPL - salesCOGS only)
 * - Food Cost KPI (getCOGSForKPI - with exclusions)
 */
export interface COGSBreakdown {
  period: {
    startDate: string
    endDate: string
  }
  revenue: number
  salesCOGS: number
  spoilage: SpoilageBreakdown
  shortage: number
  surplus: number
  totalCOGS: number
  totalCOGSPercent: number
  metadata: {
    generatedAt: string
    excludedReasons: ExcludedReasons | null
  }
}

/**
 * ✅ COGS Unification: Excluded write-off reasons for KPI
 */
export interface ExcludedReasons {
  storage?: string[]
  preparation?: string[]
}
