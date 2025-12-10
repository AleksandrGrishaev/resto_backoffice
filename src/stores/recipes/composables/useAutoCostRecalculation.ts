// src/stores/recipes/composables/useAutoCostRecalculation.ts
// Automatic daily cost recalculation for preparations and recipes

import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'useAutoCostRecalculation'

// Local storage key for tracking last recalculation
const STORAGE_KEY = 'recipes_last_cost_recalculation'
const RECALCULATION_INTERVAL_HOURS = 24 // Recalculate if more than 24 hours passed

// State
const lastRecalculationDate = ref<Date | null>(null)
const isScheduled = ref(false)
const scheduledTimerId = ref<number | null>(null)

export function useAutoCostRecalculation() {
  /**
   * Load last recalculation date from localStorage
   */
  function loadLastRecalculationDate(): Date | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const date = new Date(stored)
        if (!isNaN(date.getTime())) {
          lastRecalculationDate.value = date
          return date
        }
      }
    } catch (err) {
      DebugUtils.warn(MODULE_NAME, 'Failed to load last recalculation date', { err })
    }
    return null
  }

  /**
   * Save last recalculation date to localStorage
   */
  function saveLastRecalculationDate(date: Date): void {
    try {
      localStorage.setItem(STORAGE_KEY, date.toISOString())
      lastRecalculationDate.value = date
      DebugUtils.info(MODULE_NAME, 'Saved last recalculation date', {
        date: date.toISOString()
      })
    } catch (err) {
      DebugUtils.warn(MODULE_NAME, 'Failed to save last recalculation date', { err })
    }
  }

  /**
   * Check if recalculation is needed (more than 24 hours since last recalculation)
   */
  function isRecalculationNeeded(): boolean {
    const lastDate = loadLastRecalculationDate()
    if (!lastDate) {
      DebugUtils.info(MODULE_NAME, 'No previous recalculation found - recalculation needed')
      return true
    }

    const now = new Date()
    const hoursSinceLastRecalculation = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60)

    DebugUtils.info(MODULE_NAME, 'Checking recalculation status', {
      lastRecalculation: lastDate.toISOString(),
      hoursSince: hoursSinceLastRecalculation.toFixed(1),
      threshold: RECALCULATION_INTERVAL_HOURS
    })

    return hoursSinceLastRecalculation >= RECALCULATION_INTERVAL_HOURS
  }

  /**
   * Get time until next recalculation (in milliseconds)
   */
  function getTimeUntilNextRecalculation(): number {
    const lastDate = loadLastRecalculationDate()
    if (!lastDate) return 0

    const nextRecalculation = new Date(
      lastDate.getTime() + RECALCULATION_INTERVAL_HOURS * 60 * 60 * 1000
    )
    const now = new Date()

    return Math.max(0, nextRecalculation.getTime() - now.getTime())
  }

  /**
   * Perform automatic cost recalculation if needed
   * @param recalculateAllCostsFn - Function from recipesStore to recalculate all costs
   * @param updateDatabaseCostsFn - Optional function to update database with new costs
   * @returns true if recalculation was performed
   */
  async function checkAndRecalculateIfNeeded(
    recalculateAllCostsFn: () => Promise<void>,
    updateDatabaseCostsFn?: () => Promise<void>
  ): Promise<boolean> {
    if (!isRecalculationNeeded()) {
      DebugUtils.info(MODULE_NAME, 'Cost recalculation not needed yet')
      return false
    }

    try {
      DebugUtils.info(MODULE_NAME, '🔄 Starting automatic cost recalculation...')

      // Recalculate all costs
      await recalculateAllCostsFn()

      // Optionally update database with new costs
      if (updateDatabaseCostsFn) {
        await updateDatabaseCostsFn()
      }

      // Save new recalculation date
      saveLastRecalculationDate(new Date())

      DebugUtils.info(MODULE_NAME, '✅ Automatic cost recalculation completed')
      return true
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to perform automatic cost recalculation', { err })
      throw err
    }
  }

  /**
   * Schedule periodic recalculation (for long-running sessions)
   * @param recalculateAllCostsFn - Function from recipesStore to recalculate all costs
   * @param updateDatabaseCostsFn - Optional function to update database with new costs
   */
  function schedulePeriodicRecalculation(
    recalculateAllCostsFn: () => Promise<void>,
    updateDatabaseCostsFn?: () => Promise<void>
  ): void {
    // Clear any existing scheduled timer
    cancelScheduledRecalculation()

    const timeUntilNext = getTimeUntilNextRecalculation()

    if (timeUntilNext > 0) {
      DebugUtils.info(MODULE_NAME, 'Scheduling next cost recalculation', {
        inHours: (timeUntilNext / (1000 * 60 * 60)).toFixed(1)
      })

      scheduledTimerId.value = window.setTimeout(async () => {
        try {
          await checkAndRecalculateIfNeeded(recalculateAllCostsFn, updateDatabaseCostsFn)
          // Schedule the next recalculation
          schedulePeriodicRecalculation(recalculateAllCostsFn, updateDatabaseCostsFn)
        } catch (err) {
          DebugUtils.error(MODULE_NAME, 'Scheduled recalculation failed', { err })
        }
      }, timeUntilNext)

      isScheduled.value = true
    }
  }

  /**
   * Cancel any scheduled recalculation
   */
  function cancelScheduledRecalculation(): void {
    if (scheduledTimerId.value !== null) {
      window.clearTimeout(scheduledTimerId.value)
      scheduledTimerId.value = null
      isScheduled.value = false
      DebugUtils.info(MODULE_NAME, 'Cancelled scheduled recalculation')
    }
  }

  /**
   * Force recalculation now (manual trigger)
   */
  async function forceRecalculationNow(
    recalculateAllCostsFn: () => Promise<void>,
    updateDatabaseCostsFn?: () => Promise<void>
  ): Promise<void> {
    DebugUtils.info(MODULE_NAME, '🔄 Force recalculation triggered')

    await recalculateAllCostsFn()

    if (updateDatabaseCostsFn) {
      await updateDatabaseCostsFn()
    }

    saveLastRecalculationDate(new Date())

    DebugUtils.info(MODULE_NAME, '✅ Force recalculation completed')
  }

  // Computed
  const recalculationStatus = computed(() => ({
    lastRecalculation: lastRecalculationDate.value,
    isScheduled: isScheduled.value,
    hoursUntilNext: getTimeUntilNextRecalculation() / (1000 * 60 * 60),
    needsRecalculation: isRecalculationNeeded()
  }))

  return {
    // State
    lastRecalculationDate,
    isScheduled,

    // Computed
    recalculationStatus,

    // Methods
    loadLastRecalculationDate,
    saveLastRecalculationDate,
    isRecalculationNeeded,
    getTimeUntilNextRecalculation,
    checkAndRecalculateIfNeeded,
    schedulePeriodicRecalculation,
    cancelScheduledRecalculation,
    forceRecalculationNow
  }
}
