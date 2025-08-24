// src/stores/debug/debugStore.ts - SIMPLIFIED: Удалена функциональность History
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { debugService } from './debugService'
import type {
  DebugState,
  DebugStoreInfo,
  DebugStoreData,
  DebugTabId,
  StoreId,
  CopyOperation
} from './types'
import { STORE_CONFIGURATIONS } from './types'

const MODULE_NAME = 'DebugStore'

/**
 * Упрощенный Debug Store - без истории, фокус на анализе данных stores
 */
export const useDebugStore = defineStore('debug', () => {
  // =============================================
  // STATE
  // =============================================

  const state = ref<DebugState>({
    availableStores: [],
    selectedStoreId: null,
    selectedTab: 'raw',
    storeData: {},
    loading: false,
    error: null,
    settings: {
      autoRefresh: false,
      refreshInterval: 10000 // 10 секунд
    }
  })

  // =============================================
  // COMPUTED PROPERTIES
  // =============================================

  const selectedStore = computed(() => {
    if (!state.value.selectedStoreId) return null
    return (
      state.value.availableStores.find(store => store.id === state.value.selectedStoreId) || null
    )
  })

  const selectedStoreData = computed(() => {
    if (!state.value.selectedStoreId) return null
    return state.value.storeData[state.value.selectedStoreId] || null
  })

  const storesSortedByPriority = computed(() => {
    return [...state.value.availableStores].sort((a, b) => {
      const aPriority = STORE_CONFIGURATIONS[a.id as StoreId]?.priority || 999
      const bPriority = STORE_CONFIGURATIONS[b.id as StoreId]?.priority || 999
      return aPriority - bPriority
    })
  })

  const totalStoresLoaded = computed(() => {
    return state.value.availableStores.filter(store => store.isLoaded).length
  })

  const globalStatistics = computed(() => {
    const stores = state.value.availableStores

    return {
      totalStores: stores.length,
      loadedStores: stores.filter(s => s.isLoaded).length,
      totalRecords: stores.reduce((sum, s) => sum + s.recordCount, 0),
      healthyStores: Object.values(state.value.storeData).filter(
        data => data.analysis.health.status === 'healthy'
      ).length,
      storesWithIssues: Object.values(state.value.storeData).filter(
        data => data.analysis.health.status === 'error'
      ).length,
      storesWithWarnings: Object.values(state.value.storeData).filter(
        data => data.analysis.health.status === 'warning'
      ).length,
      lastUpdate: new Date().toISOString()
    }
  })

  // =============================================
  // INITIALIZATION ACTIONS
  // =============================================

  /**
   * Инициализация Debug Store
   */
  async function initialize(): Promise<void> {
    try {
      state.value.loading = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, '🔧 Initializing Debug Store (simplified)')

      // Обнаруживаем доступные stores
      await discoverStores()

      // Выбираем первый store по умолчанию
      if (state.value.availableStores.length > 0) {
        const firstStore = storesSortedByPriority.value[0]
        await selectStore(firstStore.id)
      }

      // Настраиваем автообновление если включено
      if (state.value.settings.autoRefresh) {
        setupAutoRefresh()
      }

      DebugUtils.info(MODULE_NAME, '✅ Debug Store initialized (simplified)', {
        availableStores: state.value.availableStores.length,
        selectedStore: state.value.selectedStoreId
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize debug store'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Обнаружение доступных stores
   */
  async function discoverStores(): Promise<void> {
    try {
      const stores = await debugService.discoverAvailableStores()
      state.value.availableStores = stores

      DebugUtils.debug(MODULE_NAME, 'Stores discovered', {
        count: stores.length,
        storeIds: stores.map(s => s.id)
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to discover stores', { error })
      throw error
    }
  }

  // =============================================
  // STORE SELECTION & DATA LOADING
  // =============================================

  /**
   * Выбрать store для отладки
   */
  async function selectStore(storeId: string): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, `Selecting store: ${storeId}`)

      const previousStoreId = state.value.selectedStoreId
      state.value.selectedStoreId = storeId

      // Загружаем данные store если они не закэшированы
      if (!state.value.storeData[storeId]) {
        await refreshStoreData(storeId)
      }

      DebugUtils.debug(MODULE_NAME, `Store selected: ${storeId}`, {
        previous: previousStoreId,
        hasData: !!state.value.storeData[storeId]
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to select store ${storeId}`, { error })
      throw error
    }
  }

  /**
   * Обновить данные store
   */
  async function refreshStoreData(storeId?: string): Promise<void> {
    try {
      state.value.loading = true
      state.value.error = null

      const targetStoreId = storeId || state.value.selectedStoreId
      if (!targetStoreId) {
        throw new Error('No store selected for refresh')
      }

      DebugUtils.debug(MODULE_NAME, `Refreshing store data: ${targetStoreId}`)

      const storeData = await debugService.getStoreData(targetStoreId)
      state.value.storeData[targetStoreId] = storeData

      // Обновляем информацию о store
      const storeInfo = state.value.availableStores.find(s => s.id === targetStoreId)
      if (storeInfo) {
        storeInfo.lastUpdated = storeData.timestamp
        storeInfo.isLoaded = true
        storeInfo.recordCount = storeData.analysis.totalItems
        storeInfo.size = debugService.formatDataSize(JSON.stringify(storeData).length)
      }

      DebugUtils.debug(MODULE_NAME, `Store data refreshed: ${targetStoreId}`, {
        totalItems: storeData.analysis.totalItems,
        size: storeInfo?.size,
        healthStatus: storeData.analysis.health.status
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh store data'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message, { error })
      throw error
    } finally {
      state.value.loading = false
    }
  }

  /**
   * Обновить все stores
   */
  async function refreshAllStores(): Promise<void> {
    try {
      state.value.loading = true
      DebugUtils.info(MODULE_NAME, 'Refreshing all stores')

      // Переобнаружение stores
      await discoverStores()

      // Обновляем данные для загруженных stores
      const loadedStoreIds = state.value.availableStores
        .filter(store => store.isLoaded)
        .map(store => store.id)

      for (const storeId of loadedStoreIds) {
        try {
          await refreshStoreData(storeId)
        } catch (error) {
          DebugUtils.warn(MODULE_NAME, `Failed to refresh store ${storeId}`, { error })
          // Продолжаем с другими stores даже если один failed
        }
      }

      DebugUtils.info(MODULE_NAME, 'All stores refreshed', {
        total: state.value.availableStores.length,
        refreshed: loadedStoreIds.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh all stores', { error })
      throw error
    } finally {
      state.value.loading = false
    }
  }

  // =============================================
  // TAB MANAGEMENT
  // =============================================

  /**
   * Выбрать вкладку
   */
  function selectTab(tab: DebugTabId): void {
    const previousTab = state.value.selectedTab
    state.value.selectedTab = tab

    DebugUtils.debug(MODULE_NAME, `Tab selected: ${tab}`, { previous: previousTab })
  }

  // =============================================
  // COPY OPERATIONS
  // =============================================

  /**
   * Копировать данные store
   */
  async function copyStoreData(
    type: 'full' | 'raw' | 'structured' = 'full'
  ): Promise<CopyOperation> {
    try {
      if (!selectedStoreData.value) {
        throw new Error('No store data available to copy')
      }

      let content: string

      switch (type) {
        case 'raw':
          content = JSON.stringify(selectedStoreData.value.state, null, 2)
          break
        case 'structured':
          content = JSON.stringify(
            {
              analysis: selectedStoreData.value.analysis,
              summary: debugService.generateStoreSummary(selectedStoreData.value)
            },
            null,
            2
          )
          break
        case 'full':
        default:
          content = JSON.stringify(selectedStoreData.value, null, 2)
          break
      }

      await navigator.clipboard.writeText(content)

      const operation: CopyOperation = {
        type,
        content,
        timestamp: new Date().toISOString(),
        success: true
      }

      DebugUtils.info(MODULE_NAME, `Store data copied (${type})`, {
        storeId: state.value.selectedStoreId,
        size: content.length
      })

      return operation
    } catch (error) {
      const operation: CopyOperation = {
        type,
        content: '',
        timestamp: new Date().toISOString(),
        success: false
      }

      DebugUtils.error(MODULE_NAME, 'Failed to copy store data', { error })
      throw error
    }
  }

  // =============================================
  // SETTINGS MANAGEMENT
  // =============================================

  /**
   * Обновить настройки
   */
  function updateSettings(newSettings: Partial<DebugState['settings']>): void {
    const oldSettings = { ...state.value.settings }
    state.value.settings = { ...state.value.settings, ...newSettings }

    // Перенастраиваем автообновление если изменились соответствующие настройки
    if (newSettings.autoRefresh !== undefined || newSettings.refreshInterval !== undefined) {
      if (state.value.settings.autoRefresh) {
        setupAutoRefresh()
      } else {
        clearAutoRefresh()
      }
    }

    DebugUtils.debug(MODULE_NAME, 'Settings updated', {
      oldSettings,
      newSettings,
      currentSettings: state.value.settings
    })
  }

  // =============================================
  // AUTO REFRESH
  // =============================================

  let autoRefreshInterval: any = null

  function setupAutoRefresh(): void {
    clearAutoRefresh() // Очищаем предыдущий интервал если есть

    if (!state.value.settings.autoRefresh) return

    autoRefreshInterval = setInterval(async () => {
      if (state.value.selectedStoreId && !state.value.loading) {
        try {
          await refreshStoreData(state.value.selectedStoreId)
        } catch (error) {
          DebugUtils.warn(MODULE_NAME, 'Auto refresh failed', { error })
        }
      }
    }, state.value.settings.refreshInterval)

    DebugUtils.debug(MODULE_NAME, 'Auto refresh enabled', {
      interval: state.value.settings.refreshInterval
    })
  }

  function clearAutoRefresh(): void {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
      autoRefreshInterval = null
      DebugUtils.debug(MODULE_NAME, 'Auto refresh disabled')
    }
  }

  // =============================================
  // UTILITIES
  // =============================================

  /**
   * Очистить текущую ошибку
   */
  function clearError(): void {
    state.value.error = null
  }

  /**
   * Получить сводку по выбранному store
   */
  function getStoreSummary() {
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
  }

  // =============================================
  // CLEANUP
  // =============================================

  function cleanup(): void {
    clearAutoRefresh()
    DebugUtils.debug(MODULE_NAME, 'Debug store cleanup completed')
  }

  // =============================================
  // DEV HELPERS
  // =============================================

  if (import.meta.env.DEV) {
    // Expose store internals for debugging
    setTimeout(() => {
      window.__DEBUG_STORE_SIMPLIFIED__ = () => {
        console.log('=== DEBUG STORE SIMPLIFIED ===')
        console.log('State:', state.value)
        console.log('Available stores:', state.value.availableStores)
        console.log('Store data cache:', Object.keys(state.value.storeData))
        console.log('Settings:', state.value.settings)
        console.log('Global statistics:', globalStatistics.value)
        return {
          state: state.value,
          computedValues: {
            selectedStore: selectedStore.value,
            totalStoresLoaded: totalStoresLoaded.value,
            globalStatistics: globalStatistics.value
          }
        }
      }

      window.__DEBUG_STORE_CLEAR_CACHE__ = () => {
        state.value.storeData = {}
        console.log('Store data cache cleared')
      }

      window.__DEBUG_STORE_HEALTH_CHECK__ = () => {
        const healthSummary = Object.entries(state.value.storeData).map(([id, data]) => ({
          id,
          status: data.analysis.health.status,
          issues: data.analysis.health.issues.length,
          warnings: data.analysis.health.warnings.length,
          totalItems: data.analysis.totalItems
        }))

        console.log('=== STORES HEALTH SUMMARY ===')
        console.table(healthSummary)
        return healthSummary
      }
    }, 500)
  }

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // State (readonly)
    state: computed(() => state.value),

    // Computed
    selectedStore,
    selectedStoreData,
    storesSortedByPriority,
    totalStoresLoaded,
    globalStatistics,

    // Initialization
    initialize,
    discoverStores,

    // Store Selection & Data
    selectStore,
    refreshStoreData,
    refreshAllStores,

    // Tab Management
    selectTab,

    // Copy Operations
    copyStoreData,

    // Settings
    updateSettings,

    // Utilities
    clearError,
    getStoreSummary,
    cleanup
  }
})
