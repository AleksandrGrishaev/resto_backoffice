// src/stores/kitchenKpi/composables/useFoodCostKpi.ts
// Food Cost KPI Composable - Reactive food cost KPI data

import { ref, type Ref } from 'vue'
import {
  foodCostKpiService,
  getVarianceColor,
  formatPercent,
  formatMonthName
} from '../services/foodCostKpiService'
import { DebugUtils } from '@/utils'
import { formatIDR } from '@/utils/currency'
import type { FoodCostKpiMetrics } from '../types'
import { FOOD_COST_TARGETS } from '../types'

const MODULE_NAME = 'useFoodCostKpi'

/**
 * Food Cost KPI Composable
 * Provides monthly COGS metrics for Kitchen Monitor
 *
 * @param selectedDepartment - Optional ref for department selection ('all' | 'kitchen' | 'bar')
 */
export function useFoodCostKpi(selectedDepartment?: Ref<'all' | 'kitchen' | 'bar' | undefined>) {
  // ===============================================
  // State
  // ===============================================

  // Monthly KPI data
  const monthKpi = ref<FoodCostKpiMetrics | null>(null)

  // Loading state
  const loading = ref(false)

  // Error state
  const error = ref<string | null>(null)

  // ===============================================
  // Actions
  // ===============================================

  /**
   * Load Food Cost KPI for a specific month
   * @param month - Date within the target month (defaults to current month)
   */
  async function loadMonthKpi(month?: Date): Promise<void> {
    loading.value = true
    error.value = null

    // Convert 'all' or undefined to null for API
    const dept = selectedDepartment?.value
    const apiDepartment = !dept || dept === 'all' ? null : dept

    try {
      DebugUtils.info(MODULE_NAME, 'Loading Food Cost KPI', {
        month: month?.toISOString(),
        department: apiDepartment
      })

      const result = await foodCostKpiService.getFoodCostKpiMonth(month, apiDepartment)

      if (result.success && result.data) {
        monthKpi.value = result.data
        DebugUtils.info(MODULE_NAME, 'Loaded Food Cost KPI', {
          revenue: result.data.revenue,
          totalCOGS: result.data.totalCOGS,
          percent: result.data.totalCOGSPercent
        })
      } else {
        error.value = result.error || 'Failed to load Food Cost KPI'
        DebugUtils.error(MODULE_NAME, 'Failed to load Food Cost KPI', { error: error.value })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      DebugUtils.error(MODULE_NAME, 'Exception loading Food Cost KPI', { error: message })
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh current month data
   */
  async function refresh(): Promise<void> {
    await loadMonthKpi()
  }

  // ===============================================
  // Utility Functions
  // ===============================================

  /**
   * Get variance color based on deviation from target
   */
  function getKpiColor(variance: number): 'success' | 'warning' | 'error' {
    return getVarianceColor(variance)
  }

  /**
   * Format percentage for display
   */
  function formatKpiPercent(value: number): string {
    return formatPercent(value)
  }

  /**
   * Format currency for display
   */
  function formatKpiCurrency(value: number): string {
    return formatIDR(value)
  }

  /**
   * Format month name from metrics
   */
  function getMonthName(): string {
    if (!monthKpi.value) return ''
    return formatMonthName(monthKpi.value.period.startDate)
  }

  /**
   * Get target percent for current department
   */
  function getTargetPercent(): number {
    const dept = selectedDepartment?.value
    if (dept === 'bar') return FOOD_COST_TARGETS.bar
    return FOOD_COST_TARGETS.kitchen
  }

  // ===============================================
  // Return
  // ===============================================

  return {
    // State
    monthKpi,
    loading,
    error,

    // Actions
    loadMonthKpi,
    refresh,

    // Utilities
    getKpiColor,
    formatKpiPercent,
    formatKpiCurrency,
    getMonthName,
    getTargetPercent,

    // Constants
    FOOD_COST_TARGETS
  }
}
