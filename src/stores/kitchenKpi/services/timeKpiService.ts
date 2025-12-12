// src/stores/kitchenKpi/services/timeKpiService.ts
// Time KPI Service - Database operations for time tracking KPIs

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import type {
  TimeKpiMetrics,
  TimeKpiSummaryEntry,
  TimeKpiDetailEntry,
  TimeKpiSummaryRow,
  TimeKpiDetailRow,
  TimeKpiTodayRow
} from '../types'
import type { KitchenDish } from '@/stores/kitchen/composables'

const MODULE_NAME = 'TimeKpiService'

// Plan times (in seconds)
const PLAN_KITCHEN = 900 // 15 minutes
const PLAN_BAR = 300 // 5 minutes

/**
 * Get today's time KPI summary by department
 */
export async function getTimeKpiToday(
  department?: 'kitchen' | 'bar' | null
): Promise<{ success: boolean; data?: TimeKpiMetrics[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('get_kitchen_time_kpi_today', {
      p_department: department || null
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get today KPI', { error })
      return { success: false, error: error.message }
    }

    const rows = (data as TimeKpiTodayRow[]) || []
    const metrics: TimeKpiMetrics[] = rows.map(row => ({
      avgWaitingSeconds: Number(row.avg_waiting_seconds) || 0,
      avgCookingSeconds: Number(row.avg_cooking_seconds) || 0,
      avgTotalSeconds: Number(row.avg_total_seconds) || 0,
      itemsCompleted: row.items_completed || 0,
      itemsExceededPlan: row.items_exceeded_plan || 0,
      exceededRate: Number(row.exceeded_rate) || 0
    }))

    DebugUtils.info(MODULE_NAME, 'Got today KPI', { department, count: metrics.length })
    return { success: true, data: metrics }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    DebugUtils.error(MODULE_NAME, 'Exception getting today KPI', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Get historical time KPI summary (aggregated by date and department)
 */
export async function getTimeKpiSummary(
  dateFrom: string,
  dateTo: string,
  department?: 'kitchen' | 'bar' | null
): Promise<{ success: boolean; data?: TimeKpiSummaryEntry[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('get_kitchen_time_kpi_summary', {
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_department: department || null
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get KPI summary', { error })
      return { success: false, error: error.message }
    }

    const rows = (data as TimeKpiSummaryRow[]) || []
    const entries: TimeKpiSummaryEntry[] = rows.map(row => ({
      periodDate: row.period_date,
      department: row.department,
      avgWaitingSeconds: Number(row.avg_waiting_seconds) || 0,
      avgCookingSeconds: Number(row.avg_cooking_seconds) || 0,
      avgTotalSeconds: Number(row.avg_total_seconds) || 0,
      itemsCompleted: row.items_completed || 0,
      itemsExceededPlan: row.items_exceeded_plan || 0
    }))

    DebugUtils.info(MODULE_NAME, 'Got KPI summary', {
      dateFrom,
      dateTo,
      department,
      count: entries.length
    })
    return { success: true, data: entries }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    DebugUtils.error(MODULE_NAME, 'Exception getting KPI summary', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Get time KPI detail (individual dish timings)
 */
export async function getTimeKpiDetail(
  dateFrom: string,
  dateTo: string,
  department?: 'kitchen' | 'bar' | null,
  limit: number = 100,
  offset: number = 0
): Promise<{ success: boolean; data?: TimeKpiDetailEntry[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('get_kitchen_time_kpi_detail', {
      p_date_from: dateFrom,
      p_date_to: dateTo,
      p_department: department || null,
      p_limit: limit,
      p_offset: offset
    })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get KPI detail', { error })
      return { success: false, error: error.message }
    }

    const rows = (data as TimeKpiDetailRow[]) || []
    const entries: TimeKpiDetailEntry[] = rows.map(row => ({
      itemId: row.item_id,
      orderId: row.order_id,
      orderNumber: row.order_number,
      productName: row.product_name,
      department: row.department,
      draftSeconds: row.draft_seconds || 0,
      waitingSeconds: row.waiting_seconds || 0,
      cookingSeconds: row.cooking_seconds || 0,
      totalSeconds: row.total_seconds || 0,
      exceededPlan: row.exceeded_plan || false,
      readyAt: row.ready_at
    }))

    DebugUtils.info(MODULE_NAME, 'Got KPI detail', {
      dateFrom,
      dateTo,
      department,
      count: entries.length
    })
    return { success: true, data: entries }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    DebugUtils.error(MODULE_NAME, 'Exception getting KPI detail', { error: message })
    return { success: false, error: message }
  }
}

/**
 * Calculate realtime KPI metrics from in-memory dishes
 * Used for live dashboard display without database queries
 */
export function calculateRealtimeKpi(
  dishes: KitchenDish[],
  department?: 'kitchen' | 'bar' | 'all'
): TimeKpiMetrics {
  // Filter dishes by department if specified
  const filteredDishes =
    department && department !== 'all' ? dishes.filter(d => d.department === department) : dishes

  // Only count completed dishes (status = 'ready')
  const completedDishes = filteredDishes.filter(d => d.status === 'ready' && d.readyAt)

  if (completedDishes.length === 0) {
    return {
      avgWaitingSeconds: 0,
      avgCookingSeconds: 0,
      avgTotalSeconds: 0,
      itemsCompleted: 0,
      itemsExceededPlan: 0,
      exceededRate: 0
    }
  }

  let totalWaiting = 0
  let totalCooking = 0
  let totalTime = 0
  let exceededCount = 0

  for (const dish of completedDishes) {
    const sentAt = dish.sentToKitchenAt
      ? new Date(dish.sentToKitchenAt).getTime()
      : new Date(dish.createdAt).getTime()
    const cookingStartedAt = dish.cookingStartedAt
      ? new Date(dish.cookingStartedAt).getTime()
      : sentAt
    const readyAt = new Date(dish.readyAt!).getTime()

    const waitingSeconds = Math.max(0, (cookingStartedAt - sentAt) / 1000)
    const cookingSeconds = Math.max(0, (readyAt - cookingStartedAt) / 1000)
    const totalSeconds = Math.max(0, (readyAt - sentAt) / 1000)

    totalWaiting += waitingSeconds
    totalCooking += cookingSeconds
    totalTime += totalSeconds

    // Check if exceeded plan
    const planTime = dish.department === 'bar' ? PLAN_BAR : PLAN_KITCHEN
    if (totalSeconds > planTime) {
      exceededCount++
    }
  }

  const count = completedDishes.length
  return {
    avgWaitingSeconds: Math.round(totalWaiting / count),
    avgCookingSeconds: Math.round(totalCooking / count),
    avgTotalSeconds: Math.round(totalTime / count),
    itemsCompleted: count,
    itemsExceededPlan: exceededCount,
    exceededRate: Math.round((exceededCount / count) * 100)
  }
}

/**
 * Format seconds to MM:SS string
 */
export function formatTimeSeconds(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Calculate deviation percentage from plan
 * Positive = over plan (bad), Negative = under plan (good)
 */
export function calculateDeviation(actualSeconds: number, department: 'kitchen' | 'bar'): number {
  const planTime = department === 'bar' ? PLAN_BAR : PLAN_KITCHEN
  if (planTime === 0) return 0
  return Math.round(((actualSeconds - planTime) / planTime) * 100)
}

/**
 * Check if time exceeds plan
 */
export function isTimeExceeded(totalSeconds: number, department: 'kitchen' | 'bar'): boolean {
  const planTime = department === 'bar' ? PLAN_BAR : PLAN_KITCHEN
  return totalSeconds > planTime
}

// Export all service functions
export const timeKpiService = {
  getTimeKpiToday,
  getTimeKpiSummary,
  getTimeKpiDetail,
  calculateRealtimeKpi,
  formatTimeSeconds,
  calculateDeviation,
  isTimeExceeded
}
