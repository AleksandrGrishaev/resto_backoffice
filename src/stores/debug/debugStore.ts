// src/stores/debug/debugStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { debugService } from './debugService'
import type {
  DebugState,
  DebugStoreInfo,
  DebugStoreData,
  DebugHistoryEntry,
  DebugTabId,
  StoreId,
  CopyOperation
} from './types'
import { STORE_CONFIGURATIONS } from './types'

const MODULE_NAME = 'DebugStore'

/**
 * Основной Debug Store - фокус на данных и состоянии
 * Логика форматирования и истории делегирована composables
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
    history: [],
    loading: false,
    error: null,
    settings: {
      maxHistoryEntries: 200, // Увеличено для лучшего отслеживания
      autoRefresh: false,
      refreshInterval: 10000, // 10 секунд
      enableHistory: true
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

  const selectedStoreHistory = computed(() => {
    if (!state.value.selectedStoreId) return []
    return state.value.history
      .filter(entry => entry.storeId === state.value.selectedStoreId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50) // Показываем только последние 50 записей для производительности
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

  const historyStatistics = computed(() => {
    const stats = {
      totalEntries: state.value.history.length,
      storesWithHistory: new Set(state.value.history.map(h => h.storeId)).size,
      recentActivity: 0,
      entriesByStore: {} as Record<string, number>
    }

    // Подсчитываем активность за последний час
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    stats.recentActivity = state.value.history.filter(h => {
      const entryTime = new Date(h.timestamp).getTime()
      return entryTime > oneHourAgo
    }).length

    // Подсчитываем записи по stores
    state.value.history.forEach(entry => {
      stats.entriesByStore[entry.storeId] = (stats.entriesByStore[entry.storeId] || 0) + 1
    })

    return stats
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

      DebugUtils.info(MODULE_NAME, '🔧 Initializing Debug Store')

      // Обнаруживаем доступные stores
      await discoverStores()

      // Выбираем первый store по умолчанию
      if (state.value.availableStores.length > 0) {
        const firstStore = storesSortedByPriority.value[0]
        await selectStore(firstStore.id, false) // false = не записывать в историю при инициализации
      }

      // Настраиваем автообновление если включено
      if (state.value.settings.autoRefresh) {
        setupAutoRefresh()
      }

      DebugUtils.info(MODULE_NAME, '✅ Debug Store initialized', {
        availableStores: state.value.availableStores.length,
        selectedStore: state.value.selectedStoreId,
        historyEnabled: state.value.settings.enableHistory
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
  async function selectStore(storeId: string, recordHistory: boolean = true): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, `Selecting store: ${storeId}`)

      const previousStoreId = state.value.selectedStoreId
      state.value.selectedStoreId = storeId

      // Загружаем данные store если они не закэшированы
      if (!state.value.storeData[storeId]) {
        await refreshStoreData(storeId, recordHistory)
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
  async function refreshStoreData(storeId?: string, recordHistory: boolean = true): Promise<void> {
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

      // Добавляем запись в историю (только если не инициализация)
      if (recordHistory && state.value.settings.enableHistory) {
        addHistoryEntry({
          id: generateId(),
          storeId: targetStoreId,
          timestamp: new Date().toISOString(),
          action: 'data_refreshed',
          changeType: 'data',
          changes: [],
          snapshot: {
            totalItems: storeData.analysis.totalItems,
            healthStatus: storeData.analysis.health.status
          }
        })
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
          await refreshStoreData(storeId, false) // false = не записываем каждое обновление в историю
        } catch (error) {
          DebugUtils.warn(MODULE_NAME, `Failed to refresh store ${storeId}`, { error })
          // Продолжаем с другими stores даже если один failed
        }
      }

      // Записываем общее действие в историю
      if (state.value.settings.enableHistory) {
        addHistoryEntry({
          id: generateId(),
          storeId: 'debug',
          timestamp: new Date().toISOString(),
          action: 'refresh_all_stores',
          changeType: 'data',
          changes: [],
          snapshot: {
            refreshedStores: loadedStoreIds.length,
            totalStores: state.value.availableStores.length
          }
        })
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

      // Записываем в историю
      if (state.value.settings.enableHistory) {
        addHistoryEntry({
          id: generateId(),
          storeId: state.value.selectedStoreId || 'debug',
          timestamp: new Date().toISOString(),
          action: `copy_${type}_data`,
          changeType: 'data',
          changes: [],
          snapshot: {
            contentSize: content.length,
            copyType: type
          }
        })
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
  // HISTORY MANAGEMENT
  // =============================================

  /**
   * Добавить запись в историю
   */
  function addHistoryEntry(entry: DebugHistoryEntry): void {
    if (!state.value.settings.enableHistory) return

    state.value.history.unshift(entry)

    // Поддерживаем максимальное количество записей
    if (state.value.history.length > state.value.settings.maxHistoryEntries) {
      state.value.history = state.value.history.slice(0, state.value.settings.maxHistoryEntries)
    }

    DebugUtils.debug(MODULE_NAME, 'History entry added', {
      storeId: entry.storeId,
      action: entry.action,
      changeType: entry.changeType,
      totalEntries: state.value.history.length
    })
  }

  /**
   * Очистить историю
   */
  function clearHistory(storeId?: string): void {
    if (storeId) {
      const beforeCount = state.value.history.length
      state.value.history = state.value.history.filter(entry => entry.storeId !== storeId)
      const afterCount = state.value.history.length

      DebugUtils.debug(MODULE_NAME, `History cleared for store: ${storeId}`, {
        removedEntries: beforeCount - afterCount
      })
    } else {
      const clearedCount = state.value.history.length
      state.value.history = []

      DebugUtils.debug(MODULE_NAME, 'All history cleared', {
        clearedEntries: clearedCount
      })
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
          await refreshStoreData(state.value.selectedStoreId, false) // false = не спамим историю
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
   * Генерировать уникальный ID
   */
  function generateId(): string {
    return `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // =============================================
  // CLEANUP
  // =============================================

  // Очистка при уничтожении store
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
      window.__DEBUG_STORE_INTERNALS__ = () => {
        console.log('=== DEBUG STORE INTERNALS ===')
        console.log('State:', state.value)
        console.log('Available stores:', state.value.availableStores)
        console.log('Store data cache:', Object.keys(state.value.storeData))
        console.log('History entries:', state.value.history.length)
        console.log('Settings:', state.value.settings)
        return {
          state: state.value,
          computedValues: {
            selectedStore: selectedStore.value,
            totalStoresLoaded: totalStoresLoaded.value,
            historyStatistics: historyStatistics.value
          }
        }
      }

      window.__DEBUG_STORE_CLEAR_CACHE__ = () => {
        state.value.storeData = {}
        console.log('Store data cache cleared')
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
    selectedStoreHistory,
    storesSortedByPriority,
    totalStoresLoaded,
    historyStatistics,

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

    // History Management
    addHistoryEntry,
    clearHistory,

    // Settings
    updateSettings,

    // Utilities
    clearError,
    cleanup
  }
})
