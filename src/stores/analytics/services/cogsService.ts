/**
 * COGS Service - Unified Cost of Goods Sold calculation
 *
 * Single source of truth for COGS data across all reports:
 * - P&L Report: uses getCOGSForPL (includes ALL write-offs)
 * - Food Cost Dashboard: uses getCOGSForPL (salesCOGS only)
 * - Food Cost KPI: uses getCOGSForKPI (with configurable exclusions)
 */

import { supabase } from '@/supabase/client'

export interface SpoilageBreakdown {
  total: number
  expired: number
  spoiled: number
  other: number
}

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

export interface ExcludedReasons {
  storage?: string[]
  preparation?: string[]
}

/**
 * Get COGS breakdown for a date range
 *
 * @param startDate - Start of period (ISO string)
 * @param endDate - End of period (ISO string)
 * @param department - Filter by department (null for all)
 * @param excludedReasons - Reasons to exclude (null for P&L, settings for KPI)
 * @returns COGSBreakdown with detailed breakdown
 */
export async function getCOGSByDateRange(
  startDate: string,
  endDate: string,
  department: 'kitchen' | 'bar' | null = null,
  excludedReasons: ExcludedReasons | null = null
): Promise<COGSBreakdown> {
  const { data, error } = await supabase.rpc('get_cogs_by_date_range', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_department: department,
    p_excluded_reasons: excludedReasons
  })

  if (error) {
    throw new Error(`Failed to get COGS: ${error.message}`)
  }

  return data as COGSBreakdown
}

/**
 * Get COGS for P&L Report
 *
 * Includes ALL write-offs except production/sales consumption
 * (which are already included in Sales COGS via FIFO)
 *
 * @param startDate - Start of period (ISO string)
 * @param endDate - End of period (ISO string)
 * @param department - Filter by department (null for all)
 */
export async function getCOGSForPL(
  startDate: string,
  endDate: string,
  department: 'kitchen' | 'bar' | null = null
): Promise<COGSBreakdown> {
  return getCOGSByDateRange(startDate, endDate, department, null)
}

/**
 * Get COGS for KPI
 *
 * Uses configurable exclusions from KPI settings
 * (e.g., excludes education/test write-offs from COGS calculation)
 *
 * @param startDate - Start of period (ISO string)
 * @param endDate - End of period (ISO string)
 * @param department - Filter by department (null for all)
 * @param excludedReasons - Reasons to exclude from COGS
 */
export async function getCOGSForKPI(
  startDate: string,
  endDate: string,
  department: 'kitchen' | 'bar' | null = null,
  excludedReasons: ExcludedReasons
): Promise<COGSBreakdown> {
  return getCOGSByDateRange(startDate, endDate, department, excludedReasons)
}
