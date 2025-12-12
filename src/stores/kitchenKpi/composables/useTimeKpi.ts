// src/stores/kitchenKpi/composables/useTimeKpi.ts
// Time KPI Composable - Reactive time tracking KPI data

import { ref, computed, type Ref, type ComputedRef } from 'vue'
import { useKitchenDishes } from '@/stores/kitchen/composables'
import {
  timeKpiService,
  formatTimeSeconds,
  calculateDeviation,
  isTimeExceeded
} from '../services/timeKpiService'
import { DebugUtils, TimeUtils } from '@/utils'
import type { TimeKpiMetrics, TimeKpiSummaryEntry, TimeKpiDetailEntry } from '../types'

const MODULE_NAME = 'useTimeKpi'

// Plan times exported for UI display
export const PLAN_TIMES = {
  kitchen: 900, // 15 minutes
  bar: 300 // 5 minutes
} as const

/**
 * Time KPI Composable
 * Provides both realtime KPI (from in-memory dishes) and historical KPI (from database)
 *
 * @param selectedDepartment - Optional ref for department selection ('all' | 'kitchen' | 'bar')
 */
export function useTimeKpi(selectedDepartment?: Ref<'all' | 'kitchen' | 'bar' | undefined>) {
  // Get kitchen dishes for realtime calculations
  const { kitchenDishes } = useKitchenDishes(selectedDepartment)

  // ===============================================
  // State
  // ===============================================

  // Historical data from database
  const historicalSummary = ref<TimeKpiSummaryEntry[]>([])
  const historicalDetail = ref<TimeKpiDetailEntry[]>([])
  const todayKpi = ref<TimeKpiMetrics | null>(null)

  // Loading states
  const loading = ref({
    today: false,
    summary: false,
    detail: false
  })

  // Error state
  const error = ref<string | null>(null)

  // Filters
  const filters = ref({
    dateFrom: TimeUtils.getCurrentLocalDate(),
    dateTo: TimeUtils.getCurrentLocalDate(),
    department: (selectedDepartment?.value || 'all') as 'all' | 'kitchen' | 'bar'
  })

  // ===============================================
  // Realtime KPI (computed from in-memory dishes)
  // ===============================================

  /**
   * Realtime KPI for kitchen department
   */
  const kitchenRealtimeKpi: ComputedRef<TimeKpiMetrics> = computed(() => {
    return timeKpiService.calculateRealtimeKpi(kitchenDishes.value, 'kitchen')
  })

  /**
   * Realtime KPI for bar department
   */
  const barRealtimeKpi: ComputedRef<TimeKpiMetrics> = computed(() => {
    return timeKpiService.calculateRealtimeKpi(kitchenDishes.value, 'bar')
  })

  /**
   * Realtime KPI for current department selection
   */
  const currentRealtimeKpi: ComputedRef<TimeKpiMetrics> = computed(() => {
    const dept = selectedDepartment?.value || 'all'
    return timeKpiService.calculateRealtimeKpi(kitchenDishes.value, dept)
  })

  /**
   * Combined realtime KPI (all departments)
   */
  const allRealtimeKpi: ComputedRef<TimeKpiMetrics> = computed(() => {
    return timeKpiService.calculateRealtimeKpi(kitchenDishes.value, 'all')
  })

  // ===============================================
  // Actions - Load from Database
  // ===============================================

  /**
   * Load today's KPI from database
   */
  async function loadTodayKpi(department?: 'kitchen' | 'bar' | null): Promise<void> {
    loading.value.today = true
    error.value = null

    try {
      const result = await timeKpiService.getTimeKpiToday(department)

      if (result.success && result.data) {
        // Combine all department metrics into one if multiple returned
        if (result.data.length === 0) {
          todayKpi.value = {
            avgWaitingSeconds: 0,
            avgCookingSeconds: 0,
            avgTotalSeconds: 0,
            itemsCompleted: 0,
            itemsExceededPlan: 0,
            exceededRate: 0
          }
        } else if (result.data.length === 1) {
          todayKpi.value = result.data[0]
        } else {
          // Aggregate multiple departments
          const total = result.data.reduce(
            (acc, m) => ({
              avgWaitingSeconds: acc.avgWaitingSeconds + m.avgWaitingSeconds * m.itemsCompleted,
              avgCookingSeconds: acc.avgCookingSeconds + m.avgCookingSeconds * m.itemsCompleted,
              avgTotalSeconds: acc.avgTotalSeconds + m.avgTotalSeconds * m.itemsCompleted,
              itemsCompleted: acc.itemsCompleted + m.itemsCompleted,
              itemsExceededPlan: acc.itemsExceededPlan + m.itemsExceededPlan,
              exceededRate: 0
            }),
            {
              avgWaitingSeconds: 0,
              avgCookingSeconds: 0,
              avgTotalSeconds: 0,
              itemsCompleted: 0,
              itemsExceededPlan: 0,
              exceededRate: 0
            }
          )

          const count = total.itemsCompleted || 1
          todayKpi.value = {
            avgWaitingSeconds: Math.round(total.avgWaitingSeconds / count),
            avgCookingSeconds: Math.round(total.avgCookingSeconds / count),
            avgTotalSeconds: Math.round(total.avgTotalSeconds / count),
            itemsCompleted: total.itemsCompleted,
            itemsExceededPlan: total.itemsExceededPlan,
            exceededRate: Math.round((total.itemsExceededPlan / count) * 100)
          }
        }
        DebugUtils.info(MODULE_NAME, 'Loaded today KPI', { todayKpi: todayKpi.value })
      } else {
        error.value = result.error || 'Failed to load today KPI'
      }
    } finally {
      loading.value.today = false
    }
  }

  /**
   * Load historical KPI summary from database
   */
  async function loadHistoricalSummary(
    dateFrom?: string,
    dateTo?: string,
    department?: 'kitchen' | 'bar' | null
  ): Promise<void> {
    loading.value.summary = true
    error.value = null

    const from = dateFrom || filters.value.dateFrom
    const to = dateTo || filters.value.dateTo
    const dept = department === 'all' ? null : department || null

    try {
      const result = await timeKpiService.getTimeKpiSummary(from, to, dept)

      if (result.success && result.data) {
        historicalSummary.value = result.data
        DebugUtils.info(MODULE_NAME, 'Loaded historical summary', { count: result.data.length })
      } else {
        error.value = result.error || 'Failed to load historical summary'
      }
    } finally {
      loading.value.summary = false
    }
  }

  /**
   * Load historical KPI detail from database
   */
  async function loadHistoricalDetail(
    dateFrom?: string,
    dateTo?: string,
    department?: 'kitchen' | 'bar' | null,
    limit: number = 100,
    offset: number = 0
  ): Promise<void> {
    loading.value.detail = true
    error.value = null

    const from = dateFrom || filters.value.dateFrom
    const to = dateTo || filters.value.dateTo
    const dept = department === 'all' ? null : department || null

    try {
      const result = await timeKpiService.getTimeKpiDetail(from, to, dept, limit, offset)

      if (result.success && result.data) {
        if (offset === 0) {
          historicalDetail.value = result.data
        } else {
          // Append for pagination
          historicalDetail.value = [...historicalDetail.value, ...result.data]
        }
        DebugUtils.info(MODULE_NAME, 'Loaded historical detail', { count: result.data.length })
      } else {
        error.value = result.error || 'Failed to load historical detail'
      }
    } finally {
      loading.value.detail = false
    }
  }

  /**
   * Refresh all KPI data
   */
  async function refreshAll(department?: 'kitchen' | 'bar' | null): Promise<void> {
    const dept = department === 'all' ? null : department
    await Promise.all([
      loadTodayKpi(dept),
      loadHistoricalSummary(undefined, undefined, dept),
      loadHistoricalDetail(undefined, undefined, dept)
    ])
  }

  // ===============================================
  // Utility Functions
  // ===============================================

  /**
   * Format seconds to MM:SS string
   */
  function formatTime(seconds: number): string {
    return formatTimeSeconds(seconds)
  }

  /**
   * Calculate deviation from plan (percentage)
   */
  function getDeviation(actualSeconds: number, department: 'kitchen' | 'bar'): number {
    return calculateDeviation(actualSeconds, department)
  }

  /**
   * Check if time exceeded plan
   */
  function isExceeded(totalSeconds: number, department: 'kitchen' | 'bar'): boolean {
    return isTimeExceeded(totalSeconds, department)
  }

  /**
   * Get plan time for department
   */
  function getPlanTime(department: 'kitchen' | 'bar'): number {
    return PLAN_TIMES[department]
  }

  /**
   * Get deviation color class
   */
  function getDeviationColor(deviation: number): string {
    if (deviation <= 0) return 'success'
    if (deviation <= 20) return 'warning'
    return 'error'
  }

  // ===============================================
  // Return
  // ===============================================

  return {
    // Realtime KPI (computed from in-memory dishes)
    kitchenRealtimeKpi,
    barRealtimeKpi,
    currentRealtimeKpi,
    allRealtimeKpi,

    // Historical KPI (from database)
    historicalSummary,
    historicalDetail,
    todayKpi,

    // State
    loading,
    error,
    filters,

    // Actions
    loadTodayKpi,
    loadHistoricalSummary,
    loadHistoricalDetail,
    refreshAll,

    // Utilities
    formatTime,
    getDeviation,
    isExceeded,
    getPlanTime,
    getDeviationColor,

    // Constants
    PLAN_TIMES
  }
}
