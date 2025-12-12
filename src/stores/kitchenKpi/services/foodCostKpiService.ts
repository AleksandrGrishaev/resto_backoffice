// src/stores/kitchenKpi/services/foodCostKpiService.ts
// Food Cost KPI Service - Database operations for food cost KPIs
// ✅ COGS UNIFICATION: Uses unified get_cogs_by_date_range with KPI settings

import { DebugUtils } from '@/utils'
import type { FoodCostKpiMetrics } from '../types'
import { FOOD_COST_TARGETS, VARIANCE_THRESHOLD } from '../types'
import { getCOGSForKPI } from '@/stores/analytics/services/cogsService'
import { getKPISettings, getDefaultExcludedReasons } from './kpiSettingsService'

const MODULE_NAME = 'FoodCostKpiService'

/**
 * Get Food Cost KPI metrics for a specific month
 * ✅ COGS UNIFICATION: Uses unified SQL function with KPI settings
 *
 * @param month - Date within the target month (defaults to current date)
 * @param department - Filter by department ('kitchen', 'bar', or null for all)
 */
export async function getFoodCostKpiMonth(
  month?: Date,
  department?: 'kitchen' | 'bar' | null
): Promise<{ success: boolean; data?: FoodCostKpiMetrics; error?: string }> {
  try {
    const targetDate = month || new Date()

    // Calculate month boundaries
    const year = targetDate.getFullYear()
    const monthIndex = targetDate.getMonth()
    const startDate = new Date(year, monthIndex, 1)
    const endDate = new Date(year, monthIndex + 1, 1) // First day of next month

    const startDateStr = startDate.toISOString()
    const endDateStr = endDate.toISOString()

    DebugUtils.info(MODULE_NAME, 'Getting Food Cost KPI (unified COGS)', {
      month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      department,
      startDate: startDateStr,
      endDate: endDateStr
    })

    // Get KPI settings (excluded reasons)
    let excludedReasons
    try {
      const settings = await getKPISettings()
      excludedReasons = settings.excludedReasons
      DebugUtils.info(MODULE_NAME, 'Using KPI settings from database', { excludedReasons })
    } catch {
      // Fallback to defaults if settings unavailable
      excludedReasons = getDefaultExcludedReasons()
      DebugUtils.warn(MODULE_NAME, 'Using default excluded reasons', { excludedReasons })
    }

    // Get COGS data using unified function with KPI exclusions
    const cogsData = await getCOGSForKPI(
      startDateStr,
      endDateStr,
      department || null,
      excludedReasons
    )

    DebugUtils.info(MODULE_NAME, 'COGS data received from unified function', {
      revenue: cogsData.revenue,
      salesCOGS: cogsData.salesCOGS,
      spoilage: cogsData.spoilage.total,
      shortage: cogsData.shortage,
      surplus: cogsData.surplus,
      totalCOGS: cogsData.totalCOGS,
      totalCOGSPercent: cogsData.totalCOGSPercent
    })

    // Calculate target based on department
    const targetPercent = getTargetPercent(department)
    const variance = cogsData.totalCOGSPercent - targetPercent

    const metrics: FoodCostKpiMetrics = {
      period: {
        // Use locally calculated ISO dates (with time) for proper timezone conversion
        // SQL function returns only date part without time, causing timezone issues
        startDate: startDateStr,
        endDate: endDateStr
      },
      revenue: cogsData.revenue,
      revenueByDepartment: {
        kitchen: 0, // Not available from unified function - need separate query if needed
        bar: 0
      },
      salesCOGS: cogsData.salesCOGS,
      spoilage: cogsData.spoilage.total,
      shortage: cogsData.shortage,
      surplus: cogsData.surplus,
      totalCOGS: cogsData.totalCOGS,
      totalCOGSPercent: cogsData.totalCOGSPercent,
      targetPercent,
      variance: Math.round(variance * 100) / 100
    }

    DebugUtils.info(MODULE_NAME, 'Got Food Cost KPI (unified)', {
      month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      department,
      revenue: metrics.revenue,
      totalCOGS: metrics.totalCOGS,
      percent: metrics.totalCOGSPercent
    })

    return { success: true, data: metrics }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    DebugUtils.error(MODULE_NAME, 'Exception getting Food Cost KPI', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Get target COGS percentage based on department
 */
export function getTargetPercent(department?: 'kitchen' | 'bar' | null): number {
  if (department === 'bar') {
    return FOOD_COST_TARGETS.bar
  }
  if (department === 'kitchen') {
    return FOOD_COST_TARGETS.kitchen
  }
  // For 'all' departments, use kitchen target as default
  return FOOD_COST_TARGETS.kitchen
}

/**
 * Get variance color based on deviation from target
 * @returns 'success' (green), 'warning' (yellow), or 'error' (red)
 */
export function getVarianceColor(variance: number): 'success' | 'warning' | 'error' {
  if (variance <= 0) {
    return 'success' // At or below target
  }
  if (variance <= VARIANCE_THRESHOLD.warning) {
    return 'warning' // Up to threshold% over target
  }
  return 'error' // More than threshold% over target
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Format month name from date string
 */
export function formatMonthName(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// Export all service functions
export const foodCostKpiService = {
  getFoodCostKpiMonth,
  getTargetPercent,
  getVarianceColor,
  formatPercent,
  formatMonthName
}
