// src/stores/debug/composables/useDebugStores.ts - SIMPLIFIED: Без History
import { computed, onMounted, onUnmounted } from 'vue'
import { useDebugStore } from '../debugStore'
import { useDebugFormatting } from './useDebugFormatting'
import { DebugUtils } from '@/utils'
import type { DebugTabId } from '../types'

const MODULE_NAME = 'useDebugStores'

/**
 * Упрощенный composable для работы с Debug системой (без истории)
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
    return debugStore.getStoreSummary()
  })

  /**
   * Глобальная сводка по всем stores
   */
  const globalSummary = computed(() => {
    try {
      const stats = debugStore.globalStatistics
      return {
        ...stats,
        formattedTotalRecords: formatting.formatNumber(stats.totalRecords),
        formattedLastUpdate: formatting.formatTimestamp(stats.lastUpdate),
        healthSummary: {
          healthy: stats.healthyStores,
          warnings: stats.storesWithWarnings,
          errors: stats.storesWithIssues
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate global summary', { error })
      return {
        totalStores: 0,
        loadedStores: 0,
        totalRecords: 0,
        healthyStores: 0,
        storesWithIssues: 0,
        storesWithWarnings: 0,
        lastUpdate: 'Error',
        formattedTotalRecords: '0',
        formattedLastUpdate: 'Error',
        healthSummary: { healthy: 0, warnings: 0, errors: 0 }
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
      DebugUtils.info(MODULE_NAME, 'useDebugStores mounted (simplified)')
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
  // SETTINGS
  // =============================================

  /**
   * Обновить настройки
   */
  function updateSettings(
    newSettings: Partial<{ autoRefresh: boolean; refreshInterval: number }>
  ): void {
    debugStore.updateSettings(newSettings)
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
    DebugUtils.debug(MODULE_NAME, 'useDebugStores mounted (simplified)')
  })

  onUnmounted(() => {
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

    // Formatted data
    formattedStructuredData,
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

    // Settings
    updateSettings,

    // Utilities
    getHealthColor,
    formatTimestamp,
    formatNumber,
    clearError
  }
}
