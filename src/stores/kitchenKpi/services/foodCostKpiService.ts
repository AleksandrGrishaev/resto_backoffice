// src/stores/kitchenKpi/services/foodCostKpiService.ts
// Food Cost KPI Service - Database operations for food cost KPIs

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import type { FoodCostKpiMetrics, FoodCostKpiRow } from '../types'
import { FOOD_COST_TARGETS, VARIANCE_THRESHOLD } from '../types'

const MODULE_NAME = 'FoodCostKpiService'

/**
 * Get Food Cost KPI metrics for a specific month
 * @param month - Date within the target month (defaults to current date)
 * @param department - Filter by department ('kitchen', 'bar', or null for all)
 */
export async function getFoodCostKpiMonth(
  month?: Date,
  department?: 'kitchen' | 'bar' | null
): Promise<{ success: boolean; data?: FoodCostKpiMetrics; error?: string }> {
  try {
    const targetDate = month || new Date()
    const dateParam = targetDate.toISOString().split('T')[0] // YYYY-MM-DD

    DebugUtils.info(MODULE_NAME, 'Getting Food Cost KPI', { month: dateParam, department })

    const { data, error } = await supabase.rpc('get_food_cost_kpi_month', {
      p_month: dateParam,
      p_department: department || null
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get Food Cost KPI', { error })
      return { success: false, error: error.message }
    }

    const row = data as FoodCostKpiRow

    if (!row) {
      DebugUtils.warn(MODULE_NAME, 'No data returned from RPC')
      return { success: false, error: 'No data returned' }
    }

    // Calculate target based on department
    const targetPercent = getTargetPercent(department)
    const variance = Number(row.totalCOGSPercent) - targetPercent

    const metrics: FoodCostKpiMetrics = {
      period: {
        startDate: row.period.startDate,
        endDate: row.period.endDate
      },
      revenue: Number(row.revenue) || 0,
      revenueByDepartment: {
        kitchen: Number(row.revenueByDepartment?.kitchen) || 0,
        bar: Number(row.revenueByDepartment?.bar) || 0
      },
      salesCOGS: Number(row.salesCOGS) || 0,
      spoilage: Number(row.spoilage) || 0,
      shortage: Number(row.shortage) || 0,
      surplus: Number(row.surplus) || 0,
      totalCOGS: Number(row.totalCOGS) || 0,
      totalCOGSPercent: Number(row.totalCOGSPercent) || 0,
      targetPercent,
      variance: Math.round(variance * 100) / 100
    }

    DebugUtils.info(MODULE_NAME, 'Got Food Cost KPI', {
      month: dateParam,
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
