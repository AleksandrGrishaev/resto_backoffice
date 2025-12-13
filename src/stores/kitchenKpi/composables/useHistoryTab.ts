// src/stores/kitchenKpi/composables/useHistoryTab.ts
// Composable for History Tab with unified operations view

import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { fetchTodayHistory } from '../services/historyService'
import type { UnifiedHistoryItem, HistorySummary, HistoryFilterType } from '../types'

const MODULE_NAME = 'useHistoryTab'

/**
 * Composable for managing unified history tab state
 * Shows productions and write-offs for current day
 */
export function useHistoryTab(department: 'kitchen' | 'bar' | 'all' = 'all') {
  // =============================================
  // STATE
  // =============================================

  const items = ref<UnifiedHistoryItem[]>([])
  const summary = ref<HistorySummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filter = ref<HistoryFilterType>('all')

  // =============================================
  // COMPUTED
  // =============================================

  /**
   * Filtered items based on filter selection
   */
  const filteredItems = computed(() => {
    if (filter.value === 'all') {
      return items.value
    }

    if (filter.value === 'production') {
      return items.value.filter(i => i.type === 'production')
    }

    // 'writeoff' - both preparation and product write-offs
    return items.value.filter(i => i.type !== 'production')
  })

  /**
   * Total count for badge
   */
  const totalCount = computed(() => items.value.length)

  /**
   * Production count
   */
  const productionCount = computed(() => items.value.filter(i => i.type === 'production').length)

  /**
   * Write-off count
   */
  const writeOffCount = computed(() => items.value.filter(i => i.type !== 'production').length)

  /**
   * Total produced quantity (in grams)
   */
  const totalProducedQuantity = computed(() => {
    return items.value.filter(i => i.type === 'production').reduce((sum, i) => sum + i.quantity, 0)
  })

  /**
   * Formatted total produced (with kg conversion)
   */
  const formattedTotalProduced = computed(() => {
    const total = totalProducedQuantity.value
    if (total >= 1000) {
      return `${(total / 1000).toFixed(1)}kg`
    }
    return `${total}g`
  })

  /**
   * Total write-off value (IDR)
   */
  const totalWriteOffValue = computed(() => {
    return items.value
      .filter(i => i.type !== 'production')
      .reduce((sum, i) => sum + (i.totalValue || 0), 0)
  })

  // =============================================
  // ACTIONS
  // =============================================

  /**
   * Load history data for today
   */
  async function loadHistory(): Promise<void> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Loading history', { department })

      const result = await fetchTodayHistory({ department })

      items.value = result.items
      summary.value = result.summary

      DebugUtils.info(MODULE_NAME, 'History loaded', {
        totalItems: result.items.length,
        summary: result.summary
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history'
      error.value = errorMessage
      DebugUtils.error(MODULE_NAME, 'Failed to load history', { error: errorMessage })
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh history (for pull-to-refresh or after operations)
   */
  async function refreshHistory(): Promise<void> {
    await loadHistory()
  }

  /**
   * Set filter type
   */
  function setFilter(newFilter: HistoryFilterType): void {
    filter.value = newFilter
  }

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    items,
    filteredItems,
    summary,
    loading,
    error,
    filter,

    // Computed
    totalCount,
    productionCount,
    writeOffCount,
    totalProducedQuantity,
    formattedTotalProduced,
    totalWriteOffValue,

    // Actions
    loadHistory,
    refreshHistory,
    setFilter
  }
}
