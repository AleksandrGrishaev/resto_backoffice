// src/stores/debug/composables/useDebugStores.ts - ИСПРАВЛЕНО
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useDebugStore } from '../debugStore'
import { useDebugFormatting } from './useDebugFormatting'
import { DebugUtils } from '@/utils'
import type { DebugTabId } from '../types'

const MODULE_NAME = 'useDebugStores'

/**
 * Главный composable для работы с Debug системой
 * Объединяет Debug Store и форматирование данных
 */
export function useDebugStores() {
  const debugStore = useDebugStore()
  const formatting = useDebugFormatting()

  // =============================================
  // STATE
  // =============================================

  const isLoading = computed(() => debugStore.state.loading)
  const error = computed(() => debugStore.state.error)
  const selectedStoreId = computed(() => debugStore.state.selectedStoreId)
  const selectedTab = computed(() => debugStore.state.selectedTab)

  // =============================================
  // DATA
  // =============================================

  const availableStores = computed(() => debugStore.storesSortedByPriority)
  const selectedStore = computed(() => debugStore.selectedStore)
  const selectedStoreData = computed(() => debugStore.selectedStoreData)
  const selectedStoreHistory = computed(() => debugStore.selectedStoreHistory)

  // =============================================
  // FORMATTED DATA
  // =============================================

  /**
   * Форматированные данные для структурированного просмотра
   */
  const formattedStructuredData = computed(() => {
    return formatting.formatStructuredData(selectedStoreData.value)
  })

  /**
   * Форматированная история для UI (ИСПРАВЛЕНИЕ ОШИБКИ)
   */
  const formattedHistory = computed(() => {
    if (!selectedStoreHistory.value || selectedStoreHistory.value.length === 0) {
      return []
    }

    try {
      return formatting.formatHistory(selectedStoreHistory.value)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to format history', { error })
      return []
    }
  })

  /**
   * Форматированная информация о stores
   */
  const formattedStores = computed(() => {
    return availableStores.value.map(store => formatting.formatStoreInfo(store))
  })

  // =============================================
  // SUMMARIES
  // =============================================

  /**
   * Сводка по выбранному store
   */
  const storeSummary = computed(() => {
    if (!selectedStoreData.value) return null

    try {
      const data = selectedStoreData.value
      const analysis = data.analysis

      return {
        name: data.name,
        totalItems: analysis.totalItems,
        activeItems: analysis.activeItems,
        inactiveItems: analysis.inactiveItems,
        healthStatus: analysis.health.status,
        lastUpdated: data.timestamp,
        dataBreakdown: analysis.breakdown,
        issuesCount: analysis.health.issues.length,
        warningsCount: analysis.health.warnings.length
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate store summary', { error })
      return null
    }
  })

  /**
   * Глобальная сводка по всем stores
   */
  const globalSummary = computed(() => {
    try {
      const stores = availableStores.value
      const history = selectedStoreHistory.value
      const statistics = debugStore.historyStatistics

      return {
        totalStores: stores.length,
        loadedStores: stores.filter(s => s.isLoaded).length,
        totalRecords: stores.reduce((sum, s) => sum + s.recordCount, 0),
        historyEntries: statistics.totalEntries,
        recentActivity: statistics.recentActivity,
        storesWithHistory: statistics.storesWithHistory,
        healthyStores: 0, // TODO: Implement when health tracking is added
        lastUpdate: formatting.formatTimestamp(new Date().toISOString())
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate global summary', { error })
      return {
        totalStores: 0,
        loadedStores: 0,
        totalRecords: 0,
        historyEntries: 0,
        recentActivity: 0,
        storesWithHistory: 0,
        healthyStores: 0,
        lastUpdate: 'Error'
      }
    }
  })

  // =============================================
  // ACTIONS
  // =============================================

  /**
   * Инициализация debug системы
   */
  async function initialize(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'useDebugStores mounted')
      await debugStore.initialize()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize debug stores', { error })
      throw error
    }
  }

  /**
   * Выбрать store
   */
  async function selectStore(storeId: string): Promise<void> {
    try {
      await debugStore.selectStore(storeId)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to select store: ${storeId}`, { error })
      throw error
    }
  }

  /**
   * Выбрать вкладку
   */
  function selectTab(tab: DebugTabId): void {
    debugStore.selectTab(tab)
  }

  /**
   * Обновить текущий store
   */
  async function refreshCurrentStore(): Promise<void> {
    try {
      await debugStore.refreshStoreData()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh current store', { error })
      throw error
    }
  }

  /**
   * Обновить все stores
   */
  async function refreshAllStores(): Promise<void> {
    try {
      await debugStore.refreshAllStores()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh all stores', { error })
      throw error
    }
  }

  // =============================================
  // COPY OPERATIONS
  // =============================================

  /**
   * Копировать структурированные данные
   */
  async function copyStructuredData(): Promise<void> {
    try {
      await debugStore.copyStoreData('structured')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to copy structured data', { error })
      throw error
    }
  }

  /**
   * Копировать полные данные store
   */
  async function copyFullData(): Promise<void> {
    try {
      await debugStore.copyStoreData('full')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to copy full data', { error })
      throw error
    }
  }

  /**
   * Копировать сырые данные
   */
  async function copyRawData(): Promise<void> {
    try {
      await debugStore.copyStoreData('raw')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to copy raw data', { error })
      throw error
    }
  }

  // =============================================
  // HISTORY MANAGEMENT
  // =============================================

  /**
   * Очистить историю текущего store
   */
  function clearCurrentStoreHistory(): void {
    if (selectedStoreId.value) {
      debugStore.clearHistory(selectedStoreId.value)
    }
  }

  /**
   * Очистить всю историю
   */
  function clearAllHistory(): void {
    debugStore.clearHistory()
  }

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  /**
   * Получить цвет для статуса здоровья
   */
  function getHealthColor(status: string): string {
    return formatting.getHealthColor(status)
  }

  /**
   * Форматировать timestamp
   */
  function formatTimestamp(timestamp: string): string {
    return formatting.formatTimestamp(timestamp)
  }

  /**
   * Форматировать число
   */
  function formatNumber(num: number): string {
    return formatting.formatNumber(num)
  }

  /**
   * Очистить ошибку
   */
  function clearError(): void {
    debugStore.clearError()
  }

  // =============================================
  // LIFECYCLE
  // =============================================

  onMounted(() => {
    DebugUtils.debug(MODULE_NAME, 'useDebugStores mounted')
  })

  onUnmounted(() => {
    // Cleanup если необходимо
    debugStore.cleanup()
  })

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // State
    isLoading,
    error,
    selectedStoreId,
    selectedTab,

    // Data
    availableStores,
    selectedStore,
    selectedStoreData,
    selectedStoreHistory,

    // Formatted data (ИСПРАВЛЕНО - добавлен formattedHistory)
    formattedStructuredData,
    formattedHistory, // ← ЭТО ИСПРАВЛЯЕТ ОШИБКУ
    formattedStores,

    // Summaries
    storeSummary,
    globalSummary,

    // Actions
    initialize,
    selectStore,
    selectTab,
    refreshCurrentStore,
    refreshAllStores,

    // Copy operations
    copyStructuredData,
    copyFullData,
    copyRawData,

    // History management
    clearCurrentStoreHistory,
    clearAllHistory,

    // Utilities
    getHealthColor,
    formatTimestamp,
    formatNumber,
    clearError
  }
}

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  // Expose debug functions globally for development
  setTimeout(() => {
    window.__USE_DEBUG_STORES__ = () => {
      console.log('=== useDebugStores composable ===')
      console.log('Available for testing debug stores functionality')

      const debugStores = useDebugStores()
      console.log('Debug stores instance:', debugStores)

      return debugStores
    }

    console.log('\n💡 useDebugStores loaded! Try:')
    console.log('  • window.__USE_DEBUG_STORES__()')
  }, 1000)
}
