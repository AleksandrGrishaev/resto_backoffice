// src/stores/kitchenKpi/composables/useRecommendations.ts
// Production Recommendations Composable

import { ref, computed } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import { useRecipesStore } from '@/stores/recipes'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { DebugUtils, TimeUtils } from '@/utils'
import {
  generateRecommendations as generateRecs,
  recommendationsToScheduleData
} from '../services/recommendationsService'
import type { ProductionRecommendation } from '@/stores/preparation/types'
import type { CreateScheduleItemData } from '../types'

const MODULE_NAME = 'useRecommendations'

export function useRecommendations() {
  // =============================================
  // State
  // =============================================

  const recommendations = ref<ProductionRecommendation[]>([])
  const loading = ref(false)
  const lastGenerated = ref<string | null>(null)
  const dismissedIds = ref<Set<string>>(new Set())

  // =============================================
  // Stores
  // =============================================

  const preparationStore = usePreparationStore()
  const recipesStore = useRecipesStore()
  const kpiStore = useKitchenKpiStore()

  // =============================================
  // Computed
  // =============================================

  /**
   * Active recommendations (excluding dismissed)
   */
  const activeRecommendations = computed(() => {
    return recommendations.value.filter(rec => !dismissedIds.value.has(rec.id))
  })

  /**
   * Summary of recommendations by urgency
   */
  const summary = computed(() => {
    const active = activeRecommendations.value
    return {
      total: active.length,
      urgent: active.filter(r => r.urgency === 'urgent').length,
      morning: active.filter(r => r.urgency === 'morning').length,
      afternoon: active.filter(r => r.urgency === 'afternoon').length,
      evening: active.filter(r => r.urgency === 'evening').length
    }
  })

  /**
   * Check if there are any recommendations
   */
  const hasRecommendations = computed(() => activeRecommendations.value.length > 0)

  // =============================================
  // Actions
  // =============================================

  /**
   * Generate recommendations for a department
   */
  async function generateRecommendations(department: 'kitchen' | 'bar'): Promise<void> {
    try {
      loading.value = true

      DebugUtils.info(MODULE_NAME, 'Generating recommendations', { department })

      // Ensure we have fresh data
      await Promise.all([
        preparationStore.fetchBalances(department),
        recipesStore.initialized || recipesStore.initialize()
      ])

      // Generate recommendations
      const balances = preparationStore.state.balances || []
      const preparations = recipesStore.preparations || []

      recommendations.value = generateRecs(department, balances, preparations)
      lastGenerated.value = TimeUtils.getCurrentLocalISO()

      // Clear dismissed IDs when regenerating
      dismissedIds.value.clear()

      DebugUtils.info(MODULE_NAME, 'Recommendations generated', {
        count: recommendations.value.length,
        summary: summary.value
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate recommendations', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Apply all recommendations to schedule
   */
  async function applyAllToSchedule(
    department: 'kitchen' | 'bar',
    scheduleDate?: string
  ): Promise<void> {
    const date = scheduleDate || TimeUtils.getCurrentLocalISO().split('T')[0]

    try {
      loading.value = true

      const active = activeRecommendations.value
      if (active.length === 0) {
        DebugUtils.info(MODULE_NAME, 'No recommendations to apply')
        return
      }

      DebugUtils.info(MODULE_NAME, 'Applying recommendations to schedule', {
        count: active.length,
        date
      })

      // Convert to schedule items
      const scheduleData = recommendationsToScheduleData(active, department, date)

      // Create schedule items (upsert)
      await kpiStore.createScheduleItems(scheduleData as CreateScheduleItemData[])

      // Mark recommendations as completed
      for (const rec of active) {
        const index = recommendations.value.findIndex(r => r.id === rec.id)
        if (index !== -1) {
          recommendations.value[index].isCompleted = true
        }
      }

      DebugUtils.info(MODULE_NAME, 'Recommendations applied to schedule')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply recommendations', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Apply a single recommendation to schedule
   */
  async function applySingleToSchedule(
    recommendation: ProductionRecommendation,
    department: 'kitchen' | 'bar',
    scheduleDate?: string
  ): Promise<void> {
    const date = scheduleDate || TimeUtils.getCurrentLocalISO().split('T')[0]

    try {
      loading.value = true

      const scheduleData = recommendationsToScheduleData([recommendation], department, date)

      await kpiStore.createScheduleItems(scheduleData as CreateScheduleItemData[])

      // Mark as completed
      const index = recommendations.value.findIndex(r => r.id === recommendation.id)
      if (index !== -1) {
        recommendations.value[index].isCompleted = true
      }

      DebugUtils.info(MODULE_NAME, 'Single recommendation applied', {
        preparationName: recommendation.preparationName
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply recommendation', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Dismiss a recommendation (hide from list)
   */
  function dismissRecommendation(id: string): void {
    dismissedIds.value.add(id)
    DebugUtils.debug(MODULE_NAME, 'Recommendation dismissed', { id })
  }

  /**
   * Clear all dismissed recommendations
   */
  function clearDismissed(): void {
    dismissedIds.value.clear()
    DebugUtils.debug(MODULE_NAME, 'Dismissed recommendations cleared')
  }

  /**
   * Reset all state
   */
  function reset(): void {
    recommendations.value = []
    dismissedIds.value.clear()
    lastGenerated.value = null
  }

  // =============================================
  // Return API
  // =============================================

  return {
    // State
    recommendations,
    loading,
    lastGenerated,

    // Computed
    activeRecommendations,
    summary,
    hasRecommendations,

    // Actions
    generateRecommendations,
    applyAllToSchedule,
    applySingleToSchedule,
    dismissRecommendation,
    clearDismissed,
    reset
  }
}
