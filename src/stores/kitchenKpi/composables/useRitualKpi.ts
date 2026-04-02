// src/stores/kitchenKpi/composables/useRitualKpi.ts
// Composable for ritual KPI calculations

import { computed, ref } from 'vue'
import { useKitchenKpiStore } from '../kitchenKpiStore'
import type { RitualCompletion, RitualKpiSummary, RitualStaffKpi } from '../types'

export function useRitualKpi() {
  const store = useKitchenKpiStore()

  const ritualHistory = ref<RitualCompletion[]>([])
  const periodDays = ref(7)
  const loadingHistory = ref(false)

  /** Load ritual history for the selected period */
  async function loadHistory(department = 'kitchen'): Promise<void> {
    loadingHistory.value = true
    try {
      const dateTo = new Date()
      const dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - periodDays.value)

      ritualHistory.value = await store.loadRitualHistory(
        dateFrom.toISOString().split('T')[0],
        dateTo.toISOString().split('T')[0],
        department
      )
    } finally {
      loadingHistory.value = false
    }
  }

  /** Set period and reload */
  async function setPeriod(days: number, department = 'kitchen'): Promise<void> {
    periodDays.value = days
    await loadHistory(department)
  }

  /** Computed KPI summary from loaded history */
  const summary = computed<RitualKpiSummary>(() => {
    const completions = ritualHistory.value
    const totalCompleted = completions.length

    if (totalCompleted === 0) {
      return {
        completionRate: 0,
        avgDurationMinutes: 0,
        onTimeRate: 0,
        currentStreak: 0,
        totalCompleted: 0,
        byStaff: []
      }
    }

    // Completion rate: completed rituals / expected rituals
    // Expected = periodDays * 2 (morning + evening)
    const expectedRituals = periodDays.value * 2
    const completionRate = Math.min(100, (totalCompleted / expectedRituals) * 100)

    // Average duration
    const totalDuration = completions.reduce((sum, c) => sum + c.durationMinutes, 0)
    const avgDurationMinutes = Math.round(totalDuration / totalCompleted)

    // On-time rate: tasks completed / total tasks within each ritual
    const totalTasks = completions.reduce((sum, c) => sum + c.totalTasks, 0)
    const totalCompletedTasks = completions.reduce((sum, c) => sum + c.completedTasks, 0)
    const onTimeRate = totalTasks > 0 ? (totalCompletedTasks / totalTasks) * 100 : 100

    // Current streak: consecutive days (from today backwards) with at least one completion
    const streak = calculateStreak(completions)

    // Per-staff breakdown
    const staffMap = new Map<string, { count: number; totalDuration: number }>()
    for (const c of completions) {
      const name = c.completedByName || 'Unknown'
      const existing = staffMap.get(name) || { count: 0, totalDuration: 0 }
      existing.count++
      existing.totalDuration += c.durationMinutes
      staffMap.set(name, existing)
    }

    const byStaff: RitualStaffKpi[] = Array.from(staffMap.entries()).map(([staffName, data]) => ({
      staffName,
      completedCount: data.count,
      avgDurationMinutes: Math.round(data.totalDuration / data.count)
    }))

    return {
      completionRate: Math.round(completionRate),
      avgDurationMinutes,
      onTimeRate: Math.round(onTimeRate),
      currentStreak: streak,
      totalCompleted,
      byStaff
    }
  })

  return {
    ritualHistory,
    periodDays,
    loadingHistory,
    summary,
    loadHistory,
    setPeriod
  }
}

/**
 * Calculate streak of consecutive days with completions (going backwards from today)
 */
function calculateStreak(completions: RitualCompletion[]): number {
  if (completions.length === 0) return 0

  // Get unique dates with completions
  const datesWithCompletions = new Set(completions.map(c => c.completedAt.split('T')[0]))

  let streak = 0
  const today = new Date()

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    if (datesWithCompletions.has(dateStr)) {
      streak++
    } else {
      // Allow skipping today if it's not done yet
      if (i === 0) continue
      break
    }
  }

  return streak
}
