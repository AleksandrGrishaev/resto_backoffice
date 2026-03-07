// src/core/watchdog/types.ts
// Watchdog System - Types and Thresholds

// =============================================
// THRESHOLDS (hardcoded for now)
// =============================================

export const WATCHDOG_THRESHOLDS = {
  // Receipt price checks
  priceSpike: {
    warningPercent: 20, // >20% increase from average = warning
    criticalPercent: 50 // >50% increase = critical
  },

  // Preparation cost checks
  prepCostSpike: {
    warningPercent: 20,
    criticalPercent: 50
  },

  // Food cost checks (for weekly report)
  foodCost: {
    warningPercent: 15, // cost increased >15% from previous week
    criticalPercent: 30
  },

  // Write-off checks
  writeOff: {
    dailyWarningPercent: 5, // >5% of stock written off in a day
    dailyCriticalPercent: 10
  },

  // History lookback
  historyDays: 30, // Compare against last 30 days average
  weeklyReportDay: 1 // Monday (0=Sunday, 1=Monday, ...)
}

// =============================================
// CHECKER RESULTS
// =============================================

export interface PriceCheckResult {
  itemId: string
  itemName: string
  unit: string
  newCostPerUnit: number
  averageCostPerUnit: number
  percentChange: number // positive = increase
  severity: 'warning' | 'critical'
  batchCount: number // how many historical batches compared against
  responsiblePerson?: string
  supplierId?: string
  supplierName?: string
}

export interface PrepCostCheckResult {
  preparationId: string
  preparationName: string
  unit: string
  newCostPerUnit: number
  previousCostPerUnit: number
  percentChange: number
  severity: 'warning' | 'critical'
  responsiblePerson?: string
}

export interface WeeklyCostChangeItem {
  itemId: string
  itemName: string
  itemType: 'product' | 'preparation' | 'menu_item'
  unit?: string
  previousCost: number
  currentCost: number
  percentChange: number
  severity: 'warning' | 'critical'
}

export interface WeeklyCostReport {
  periodStart: string
  periodEnd: string
  products: WeeklyCostChangeItem[]
  preparations: WeeklyCostChangeItem[]
  menuItems: WeeklyCostChangeItem[]
  totalItemsAffected: number
  criticalCount: number
  warningCount: number
}
