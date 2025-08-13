// src/stores/debug/composables/useDebugStores.ts
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useDebugStore } from '../debugStore'
import { useDebugHistory } from './useDebugHistory'
import { useDebugFormatting } from './useDebugFormatting'
import { DebugUtils } from '@/utils'
import type { DebugTabId, StoreId, CopyOperation } from '../types'

const MODULE_NAME = 'useDebugStores'

/**
 * Главный composable для работы с debug stores
 * Координирует работу между debugStore, history и formatting
 */
export function useDebugStores() {
  const debugStore = useDebugStore()
  const debugHistory = useDebugHistory()
  const debugFormatting = useDebugFormatting()

  // =============================================
  // REACTIVE STATE
  // =============================================

  const state = computed(() => debugStore.state)
  const isLoading = computed(() => debugStore.state.loading)
  const error = computed(() => debugStore.state.error)
  const selectedStoreId = computed(() => debugStore.state.selectedStoreId)
  const selectedTab = computed(() => debugStore.state.selectedTab)

  // =============================================
  // STORE DATA
  // =============================================

  const availableStores = computed(() => debugStore.storesSortedByPriority)
  const selectedStore = computed(() => debugStore.selectedStore)
  const selectedStoreData = computed(() => debugStore.selectedStoreData)
  const selectedStoreHistory = computed(() => debugStore.selectedStoreHistory)

  // =============================================
  // FORMATTED DATA FOR UI (using useDebugFormatting)
  // =============================================

  const formattedRawJson = computed(() => {
    return debugFormatting.formatRawJson(selectedStoreData.value)
  })

  const formattedStructuredData = computed(() => {
    return debugFormatting.formatStructuredData(selectedStoreData.value)
  })

  const formattedHistory = computed(() => {
    return debugFormatting.formatHistory(selectedStoreHistory.value)
  })

  const formattedStoresList = computed(() => {
    return availableStores.value.map(store => debugFormatting.formatStoreInfo(store))
  })

  // =============================================
  // STATISTICS & SUMMARIES
  // =============================================

  const storeSummary = computed(() => {
    if (!selectedStoreData.value) return null

    const data = selectedStoreData.value
    const analysis = data.analysis

    return {
      name: data.name,
      lastUpdated: data.timestamp,
      totalItems: analysis.totalItems,
      activeItems: analysis.activeItems,
      healthStatus: analysis.health.status,
      dataTypes: {
        arrays: analysis.breakdown.arrays,
        objects: analysis.breakdown.objects,
        primitives: analysis.breakdown.primitives
      },
      issues: analysis.health.issues.length,
      warnings: analysis.health.warnings.length
    }
  })

  const globalSummary = computed(() => {
    const stores = availableStores.value
    const loaded = stores.filter(s => s.isLoaded)
    const totalRecords = loaded.reduce((sum, s) => sum + s.recordCount, 0)

    return {
      totalStores: stores.length,
      loadedStores: loaded.length,
      totalRecords,
      historyEntries: debugStore.historyStatistics.totalEntries,
      recentActivity: debugStore.historyStatistics.recentActivity
    }
  })

  // =============================================
  // HISTORY STATUS (using useDebugHistory)
  // =============================================

  const historyTrackingStatus = computed(() => debugHistory.getTrackingStatus())
  const historyStatistics = computed(() => debugHistory.getHistoryStatistics())

  // =============================================
  // MAIN ACTIONS
  // =============================================

  /**
   * Инициализация debug системы
   */
  async function initialize() {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing debug stores system')

      // Инициализируем основной debug store
      await debugStore.initialize()

      // Запускаем отслеживание истории в dev режиме
      if (import.meta.env.DEV) {
        debugHistory.startHistoryTracking()
      }

      DebugUtils.info(MODULE_NAME, 'Debug stores system initialized successfully', {
        availableStores: availableStores.value.length,
        historyTracking: debugHistory.isTrackingInitialized()
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize debug stores system', { error })
      throw error
    }
  }

  /**
   * Выбрать store для отладки
   */
  async function selectStore(storeId: string) {
    try {
      await debugStore.selectStore(storeId)

      // Записываем действие в историю
      debugHistory.recordAction('debug', 'store_selected', `Selected store: ${storeId}`)

      DebugUtils.debug(MODULE_NAME, `Store selected: ${storeId}`)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to select store: ${storeId}`, { error })
      throw error
    }
  }

  /**
   * Выбрать вкладку
   */
  function selectTab(tab: DebugTabId) {
    debugStore.selectTab(tab)
    debugHistory.recordAction('debug', 'tab_selected', `Selected tab: ${tab}`)
  }

  /**
   * Обновить данные текущего store
   */
  async function refreshCurrentStore() {
    if (!selectedStoreId.value) {
      throw new Error('No store selected')
    }

    try {
      await debugStore.refreshStoreData(selectedStoreId.value)

      // Записываем действие в историю
      debugHistory.recordAction(
        selectedStoreId.value,
        'manual_refresh',
        'Manual refresh triggered by user'
      )

      DebugUtils.info(MODULE_NAME, `Store refreshed: ${selectedStoreId.value}`)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh current store', { error })
      throw error
    }
  }

  /**
   * Обновить все stores
   */
  async function refreshAllStores() {
    try {
      await debugStore.refreshAllStores()

      // Записываем действие в историю
      debugHistory.recordAction('debug', 'refresh_all_stores', 'Refreshed all stores')

      DebugUtils.info(MODULE_NAME, 'All stores refreshed')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh all stores', { error })
      throw error
    }
  }

  // =============================================
  // COPY OPERATIONS
  // =============================================

  /**
   * Копировать raw JSON данные
   */
  async function copyRawData(): Promise<CopyOperation> {
    try {
      const operation = await debugStore.copyStoreData('raw')

      // Записываем действие в историю
      debugHistory.recordAction(
        selectedStoreId.value || 'debug',
        'copy_raw_data',
        'Raw JSON data copied to clipboard'
      )

      DebugUtils.info(MODULE_NAME, 'Raw data copied to clipboard')
      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to copy raw data', { error })
      throw error
    }
  }

  /**
   * Копировать структурированные данные
   */
  async function copyStructuredData(): Promise<CopyOperation> {
    try {
      const operation = await debugStore.copyStoreData('structured')

      // Записываем действие в историю
      debugHistory.recordAction(
        selectedStoreId.value || 'debug',
        'copy_structured_data',
        'Structured data copied to clipboard'
      )

      DebugUtils.info(MODULE_NAME, 'Structured data copied to clipboard')
      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to copy structured data', { error })
      throw error
    }
  }

  /**
   * Копировать полные данные store
   */
  async function copyFullData(): Promise<CopyOperation> {
    try {
      const operation = await debugStore.copyStoreData('full')

      // Записываем действие в историю
      debugHistory.recordAction(
        selectedStoreId.value || 'debug',
        'copy_full_data',
        'Full store data copied to clipboard'
      )

      DebugUtils.info(MODULE_NAME, 'Full store data copied to clipboard')
      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to copy full data', { error })
      throw error
    }
  }

  /**
   * Копировать произвольный контент
   */
  async function copyCustomContent(content: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content)

      // Записываем действие в историю
      debugHistory.recordAction(
        'debug',
        'copy_custom_content',
        `Custom content copied (${content.length} chars)`
      )

      DebugUtils.debug(MODULE_NAME, 'Custom content copied to clipboard')
      return true
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to copy custom content', { error })
      return false
    }
  }

  // =============================================
  // HISTORY MANAGEMENT
  // =============================================

  /**
   * Очистить историю для текущего store
   */
  function clearCurrentStoreHistory() {
    if (selectedStoreId.value) {
      debugHistory.clearHistory(selectedStoreId.value)
      DebugUtils.info(MODULE_NAME, `History cleared for store: ${selectedStoreId.value}`)
    }
  }

  /**
   * Очистить всю историю
   */
  function clearAllHistory() {
    debugHistory.clearHistory()
    DebugUtils.info(MODULE_NAME, 'All history cleared')
  }

  /**
   * Запустить отслеживание истории
   */
  function startHistoryTracking() {
    debugHistory.startHistoryTracking()
    DebugUtils.info(MODULE_NAME, 'History tracking started')
  }

  /**
   * Остановить отслеживание истории
   */
  function stopHistoryTracking() {
    debugHistory.stopHistoryTracking()
    DebugUtils.info(MODULE_NAME, 'History tracking stopped')
  }

  /**
   * Записать действие в историю вручную
   */
  function recordAction(storeId: string, actionName: string, description?: string) {
    debugHistory.recordAction(storeId, actionName, description)
  }

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  /**
   * Получить цвет для статуса здоровья
   */
  function getHealthColor(status: string): string {
    return debugFormatting.getHealthColor(status)
  }

  /**
   * Форматировать timestamp
   */
  function formatTimestamp(timestamp: string): string {
    return debugFormatting.formatTimestamp(timestamp)
  }

  /**
   * Форматировать число
   */
  function formatNumber(num: number): string {
    return debugFormatting.formatNumber(num)
  }

  /**
   * Получить иконку store
   */
  function getStoreIcon(storeId: string): string {
    const config = debugStore.state.availableStores.find(s => s.id === storeId)
    return config?.icon || 'mdi-database'
  }

  /**
   * Проверить, загружен ли store
   */
  function isStoreLoaded(storeId: string): boolean {
    const store = availableStores.value.find(s => s.id === storeId)
    return store?.isLoaded || false
  }

  /**
   * Очистить текущую ошибку
   */
  function clearError() {
    debugStore.clearError()
  }

  // =============================================
  // SEARCH & FILTER (TODO: Future implementation)
  // =============================================

  /**
   * Поиск в данных текущего store
   * :TODO Implement search functionality
   */
  function searchInStore(query: string): any[] {
    // TODO: Implement search in store data
    DebugUtils.debug(MODULE_NAME, 'Search not implemented yet', { query })
    return []
  }

  /**
   * Фильтрация stores по критериям
   * :TODO Implement store filtering
   */
  function filterStores(criteria: any): any[] {
    // TODO: Implement store filtering
    DebugUtils.debug(MODULE_NAME, 'Store filtering not implemented yet', { criteria })
    return availableStores.value
  }

  // =============================================
  // WATCHERS & LIFECYCLE
  // =============================================

  // Отслеживаем ошибки и логируем их
  watch(error, newError => {
    if (newError) {
      DebugUtils.error(MODULE_NAME, 'Debug store error detected', { error: newError })

      // Записываем ошибку в историю
      debugHistory.recordAction('debug', 'error_occurred', newError)
    }
  })

  // Отслеживаем изменения выбранного store
  watch(selectedStoreId, (newStoreId, oldStoreId) => {
    if (newStoreId !== oldStoreId) {
      DebugUtils.debug(MODULE_NAME, 'Selected store changed', {
        from: oldStoreId,
        to: newStoreId
      })
    }
  })

  // Lifecycle
  onMounted(() => {
    if (import.meta.env.DEV) {
      DebugUtils.debug(MODULE_NAME, 'useDebugStores mounted')
    }
  })

  onUnmounted(() => {
    if (import.meta.env.DEV) {
      DebugUtils.debug(MODULE_NAME, 'useDebugStores unmounted')
      // Не останавливаем отслеживание при unmount - debug должен работать глобально
    }
  })

  // =============================================
  // DEV HELPERS
  // =============================================

  if (import.meta.env.DEV) {
    // Expose debug helpers to global scope
    setTimeout(() => {
      window.__DEBUG_STORES_STATUS__ = () => {
        console.log('=== DEBUG STORES STATUS ===')
        console.log('Available stores:', availableStores.value.length)
        console.log('Selected store:', selectedStoreId.value)
        console.log('History tracking:', debugHistory.isTrackingInitialized())
        console.log('History entries:', historyStatistics.value.totalEntries)
        console.log('Global summary:', globalSummary.value)
        return {
          availableStores: availableStores.value,
          selectedStore: selectedStore.value,
          historyStats: historyStatistics.value,
          globalSummary: globalSummary.value
        }
      }

      window.__DEBUG_STORES_REFRESH_ALL__ = async () => {
        await refreshAllStores()
        console.log('All stores refreshed')
      }

      window.__DEBUG_STORES_COPY_CURRENT__ = async () => {
        try {
          await copyFullData()
          console.log('Current store data copied to clipboard')
        } catch (error) {
          console.error('Failed to copy data:', error)
        }
      }
    }, 1000)
  }

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // Reactive state
    state,
    isLoading,
    error,
    selectedStoreId,
    selectedTab,

    // Store data
    availableStores,
    selectedStore,
    selectedStoreData,
    selectedStoreHistory,

    // Formatted data (from useDebugFormatting)
    formattedRawJson,
    formattedStructuredData,
    formattedHistory,
    formattedStoresList,

    // Summaries
    storeSummary,
    globalSummary,

    // History status (from useDebugHistory)
    historyTrackingStatus,
    historyStatistics,

    // Main actions
    initialize,
    selectStore,
    selectTab,
    refreshCurrentStore,
    refreshAllStores,

    // Copy operations
    copyRawData,
    copyStructuredData,
    copyFullData,
    copyCustomContent,

    // History management (from useDebugHistory)
    clearCurrentStoreHistory,
    clearAllHistory,
    startHistoryTracking,
    stopHistoryTracking,
    recordAction,

    // Utilities (mixed from formatters and local)
    getHealthColor,
    formatTimestamp,
    formatNumber,
    getStoreIcon,
    isStoreLoaded,
    clearError,

    // Future features (TODO)
    searchInStore,
    filterStores,

    // Direct access to composables for advanced usage
    debugHistory,
    debugFormatting
  }
}
