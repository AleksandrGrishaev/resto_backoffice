// src/stores/debug/composables/useDebugHistory.ts
import { watch, onMounted, onUnmounted } from 'vue'
import { DebugUtils } from '@/utils'
import { useDebugStore } from '../debugStore'
import type { DebugHistoryEntry, DebugChange } from '../types'

// Import all stores for tracking
import { useProductsStore } from '@/stores/productsStore'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useRecipesStore } from '@/stores/recipes'
import { useAccountStore } from '@/stores/account'
import { useMenuStore } from '@/stores/menu'
import { useStorageStore } from '@/stores/storage'
import { useSupplierStore } from '@/stores/supplier_2'
import { useAuthStore } from '@/stores/auth.store'

const MODULE_NAME = 'useDebugHistory'

interface StoreWatcher {
  storeId: string
  storeName: string
  unwatch: (() => void)[]
}

interface StoreSnapshot {
  [storeId: string]: {
    timestamp: string
    data: any
  }
}

/**
 * Composable для отслеживания истории изменений в stores
 * Фокус только на истории - без форматирования и UI логики
 */
export function useDebugHistory() {
  const debugStore = useDebugStore()

  // ✅ Используем синглтон для избежания множественной инициализации
  if (!globalHistoryTracker.isSetup) {
    globalHistoryTracker.setup(debugStore)
  }

  // =============================================
  // HISTORY CONTROL METHODS
  // =============================================

  /**
   * Запустить отслеживание истории
   */
  function startHistoryTracking(): void {
    return globalHistoryTracker.start()
  }

  /**
   * Остановить отслеживание истории
   */
  function stopHistoryTracking(): void {
    return globalHistoryTracker.stop()
  }

  /**
   * Вручную записать действие в историю
   */
  function recordAction(storeId: string, actionName: string, description?: string): void {
    return globalHistoryTracker.recordAction(storeId, actionName, description)
  }

  /**
   * Очистить историю
   */
  function clearHistory(storeId?: string): void {
    return globalHistoryTracker.clearHistory(storeId)
  }

  // =============================================
  // HISTORY STATUS METHODS
  // =============================================

  /**
   * Получить статус отслеживания
   */
  function getTrackingStatus() {
    return globalHistoryTracker.getStatus()
  }

  /**
   * Получить статистику истории
   */
  function getHistoryStatistics() {
    return globalHistoryTracker.getHistoryStatistics()
  }

  /**
   * Проверить, инициализировано ли отслеживание
   */
  function isTrackingInitialized(): boolean {
    return globalHistoryTracker.isInitialized
  }

  /**
   * Получить количество активных watchers
   */
  function getActiveWatchersCount(): number {
    return globalHistoryTracker.activeWatchers
  }

  // =============================================
  // LIFECYCLE
  // =============================================

  onMounted(() => {
    if (import.meta.env.DEV) {
      DebugUtils.debug(MODULE_NAME, 'useDebugHistory mounted')
    }
  })

  onUnmounted(() => {
    if (import.meta.env.DEV) {
      DebugUtils.debug(MODULE_NAME, 'useDebugHistory unmounted')
      // Не останавливаем отслеживание при unmount - история должна работать глобально
    }
  })

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // Control methods
    startHistoryTracking,
    stopHistoryTracking,
    recordAction,
    clearHistory,

    // Status methods
    getTrackingStatus,
    getHistoryStatistics,
    isTrackingInitialized,
    getActiveWatchersCount
  }
}

// =============================================
// ✅ GLOBAL HISTORY TRACKER (Singleton)
// =============================================

class GlobalHistoryTracker {
  private debugStore: any = null
  private storeWatchers: StoreWatcher[] = []
  private storeSnapshots: StoreSnapshot = {}
  public isInitialized = false
  public isSetup = false
  public activeWatchers = 0

  // Store definitions
  private storeDefinitions = [
    {
      id: 'products',
      name: 'Products Store',
      getInstance: () => this.safeGetStore(() => useProductsStore())
    },
    {
      id: 'counteragents',
      name: 'Counteragents Store',
      getInstance: () => this.safeGetStore(() => useCounteragentsStore())
    },
    {
      id: 'recipes',
      name: 'Recipes Store',
      getInstance: () => this.safeGetStore(() => useRecipesStore())
    },
    {
      id: 'account',
      name: 'Account Store',
      getInstance: () => this.safeGetStore(() => useAccountStore())
    },
    {
      id: 'menu',
      name: 'Menu Store',
      getInstance: () => this.safeGetStore(() => useMenuStore())
    },
    {
      id: 'storage',
      name: 'Storage Store',
      getInstance: () => this.safeGetStore(() => useStorageStore())
    },
    {
      id: 'supplier',
      name: 'Supplier Store',
      getInstance: () => this.safeGetStore(() => useSupplierStore())
    },
    {
      id: 'auth',
      name: 'Auth Store',
      getInstance: () => this.safeGetStore(() => useAuthStore())
    }
  ]

  setup(debugStore: any): void {
    if (this.isSetup) return

    this.debugStore = debugStore
    this.isSetup = true

    DebugUtils.debug(MODULE_NAME, 'Global history tracker setup completed')
  }

  start(): void {
    if (this.isInitialized) {
      DebugUtils.warn(MODULE_NAME, 'History tracking already started')
      return
    }

    if (!this.debugStore) {
      DebugUtils.error(MODULE_NAME, 'Debug store not available for history tracking')
      return
    }

    try {
      DebugUtils.info(MODULE_NAME, '🕐 Starting debug history tracking')

      // Setup watchers for all stores
      this.storeWatchers = this.storeDefinitions
        .map(storeDef => this.setupStoreWatcher(storeDef))
        .filter(watcher => watcher.unwatch.length > 0)

      this.activeWatchers = this.storeWatchers.length

      DebugUtils.info(MODULE_NAME, '✅ Debug history tracking started', {
        totalStores: this.storeDefinitions.length,
        activeWatchers: this.activeWatchers,
        watchingStores: this.storeWatchers.map(w => w.storeId)
      })

      this.isInitialized = true

      // Record start event
      this.recordHistoryEvent('debug', 'history_tracking_started', {
        activeWatchers: this.activeWatchers,
        trackedStores: this.storeWatchers.map(w => w.storeId)
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to start history tracking', { error })
    }
  }

  stop(): void {
    try {
      DebugUtils.info(MODULE_NAME, '🛑 Stopping debug history tracking')

      // Unwatch all stores
      this.storeWatchers.forEach(watcher => {
        watcher.unwatch.forEach(unwatch => {
          try {
            unwatch()
          } catch (error) {
            DebugUtils.error(MODULE_NAME, `Error unwatching ${watcher.storeId}`, { error })
          }
        })
      })

      // Record stop event before clearing
      this.recordHistoryEvent('debug', 'history_tracking_stopped', {
        wasTracking: this.activeWatchers,
        totalEntries: this.getHistoryStatistics().totalEntries
      })

      // Clear data
      this.storeWatchers = []
      this.storeSnapshots = {}
      this.activeWatchers = 0
      this.isInitialized = false

      DebugUtils.info(MODULE_NAME, '✅ Debug history tracking stopped')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error stopping history tracking', { error })
    }
  }

  recordAction(storeId: string, actionName: string, description?: string): void {
    this.recordHistoryEvent(storeId, actionName, { description })
    DebugUtils.debug(MODULE_NAME, `Manual action recorded: ${storeId}.${actionName}`, {
      description
    })
  }

  clearHistory(storeId?: string): void {
    if (!this.debugStore) return

    try {
      if (storeId) {
        this.debugStore.clearHistory(storeId)
        DebugUtils.debug(MODULE_NAME, `History cleared for store: ${storeId}`)
      } else {
        this.debugStore.clearHistory()
        DebugUtils.debug(MODULE_NAME, 'All history cleared')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to clear history', { error })
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeWatchers: this.activeWatchers,
      trackedStores: this.storeWatchers.map(w => w.storeId),
      snapshotCount: Object.keys(this.storeSnapshots).length,
      lastSnapshot: Object.values(this.storeSnapshots).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]?.timestamp
    }
  }

  getHistoryStatistics() {
    if (!this.debugStore) {
      return {
        totalEntries: 0,
        entriesByStore: {},
        recentActivity: 0,
        oldestEntry: null,
        newestEntry: null
      }
    }

    const history = this.debugStore.state.history || []

    const entriesByStore = history.reduce((acc: any, entry: any) => {
      acc[entry.storeId] = (acc[entry.storeId] || 0) + 1
      return acc
    }, {})

    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const recentActivity = history.filter((entry: any) => {
      return new Date(entry.timestamp).getTime() > oneHourAgo
    }).length

    return {
      totalEntries: history.length,
      entriesByStore,
      recentActivity,
      oldestEntry: history[history.length - 1]?.timestamp || null,
      newestEntry: history[0]?.timestamp || null
    }
  }

  // =============================================
  // PRIVATE METHODS
  // =============================================

  private safeGetStore(getStoreFunc: () => any): any {
    try {
      return getStoreFunc()
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to get store instance', { error })
      return null
    }
  }

  private setupStoreWatcher(storeDef: (typeof this.storeDefinitions)[0]): StoreWatcher {
    const unwatchFunctions: (() => void)[] = []

    try {
      const storeInstance = storeDef.getInstance()

      if (!storeInstance) {
        return {
          storeId: storeDef.id,
          storeName: storeDef.name,
          unwatch: []
        }
      }

      // Create initial snapshot
      const initialData = this.extractStoreData(storeInstance, storeDef.id)
      this.storeSnapshots[storeDef.id] = {
        timestamp: new Date().toISOString(),
        data: this.createSnapshot(initialData)
      }

      // Setup debounced watcher
      let timeoutId: any = null
      const debouncedWatcher = (newData: any, oldData: any) => {
        if (timeoutId) clearTimeout(timeoutId)

        timeoutId = setTimeout(() => {
          try {
            const changes = this.detectChanges(oldData, newData)

            if (changes.length > 0) {
              this.recordHistoryEvent(storeDef.id, 'state_change', null, changes)

              // Update snapshot
              this.storeSnapshots[storeDef.id] = {
                timestamp: new Date().toISOString(),
                data: this.createSnapshot(newData)
              }

              DebugUtils.debug(MODULE_NAME, `Store change detected: ${storeDef.id}`, {
                changesCount: changes.length
              })
            }
          } catch (error) {
            DebugUtils.error(MODULE_NAME, `Error watching store ${storeDef.id}`, { error })
          }
        }, 150) // 150ms debounce
      }

      // Setup Vue watcher
      const unwatch = watch(
        () => this.extractStoreData(storeInstance, storeDef.id),
        debouncedWatcher,
        {
          deep: true,
          flush: 'post'
        }
      )

      unwatchFunctions.push(unwatch)
      unwatchFunctions.push(() => {
        if (timeoutId) clearTimeout(timeoutId)
      })

      return {
        storeId: storeDef.id,
        storeName: storeDef.name,
        unwatch: unwatchFunctions
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to setup watcher for ${storeDef.id}`, { error })
      return {
        storeId: storeDef.id,
        storeName: storeDef.name,
        unwatch: unwatchFunctions
      }
    }
  }

  private recordHistoryEvent(
    storeId: string,
    action: string,
    snapshot?: any,
    changes?: DebugChange[]
  ): void {
    if (!this.debugStore) return

    try {
      const historyEntry: DebugHistoryEntry = {
        id: this.generateHistoryId(),
        storeId,
        timestamp: new Date().toISOString(),
        action,
        changeType: changes ? 'state' : 'data',
        changes: changes || [],
        snapshot
      }

      this.debugStore.addHistoryEntry(historyEntry)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to record history event', { error })
    }
  }

  // =============================================
  // DATA EXTRACTION & ANALYSIS
  // =============================================

  private extractStoreData(storeInstance: any, storeId: string): any {
    try {
      switch (storeId) {
        case 'products':
          return {
            productsCount: storeInstance.products?.length || 0,
            loading: storeInstance.loading,
            error: storeInstance.error,
            selectedProduct: storeInstance.selectedProduct?.id
          }

        case 'counteragents':
          return {
            counteragentsCount: storeInstance.counteragents?.length || 0,
            loading: storeInstance.loading?.counteragents,
            error: storeInstance.error,
            selectedIds: storeInstance.selectedIds?.length || 0
          }

        case 'recipes':
          return {
            preparationsCount: storeInstance.preparations?.value?.length || 0,
            recipesCount: storeInstance.recipes?.value?.length || 0,
            loading: storeInstance.loading?.value,
            error: storeInstance.error?.value
          }

        case 'account':
          const accountState = storeInstance.state?.value || storeInstance.state || {}
          return {
            accountsCount: accountState.accounts?.length || 0,
            transactionsCount: accountState.transactions?.length || 0,
            loading: storeInstance.isLoading?.value,
            error: accountState.error
          }

        case 'menu':
          const menuState = storeInstance.state?.value || storeInstance.state || {}
          return {
            categoriesCount: storeInstance.categories?.value?.length || 0,
            menuItemsCount: storeInstance.menuItems?.value?.length || 0,
            loading: menuState.loading,
            error: menuState.error
          }

        case 'storage':
          const storageState = storeInstance.state?.value || storeInstance.state || {}
          return {
            balancesCount: storageState.balances?.length || 0,
            operationsCount: storageState.operations?.length || 0,
            loading: Object.values(storageState.loading || {}).some(Boolean),
            error: storageState.error
          }

        case 'supplier':
          const supplierState = storeInstance.state?.value || storeInstance.state || {}
          return {
            requestsCount: supplierState.requests?.length || 0,
            ordersCount: supplierState.orders?.length || 0,
            receiptsCount: supplierState.receipts?.length || 0,
            loading: storeInstance.isLoading?.() || false
          }

        case 'auth':
          const authState = storeInstance.state?.value || storeInstance.state || {}
          return {
            isAuthenticated: authState.isAuthenticated,
            loading: authState.isLoading,
            userId: authState.currentUser?.id,
            error: authState.error
          }

        default:
          return {
            loading: storeInstance.loading || false,
            error: storeInstance.error
          }
      }
    } catch (error) {
      return {
        extractionError: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private detectChanges(oldData: any, newData: any): DebugChange[] {
    const changes: DebugChange[] = []

    try {
      if (!oldData || !newData) return changes

      // Only track important keys for performance
      const importantKeys = [
        'productsCount',
        'counteragentsCount',
        'preparationsCount',
        'recipesCount',
        'accountsCount',
        'transactionsCount',
        'categoriesCount',
        'menuItemsCount',
        'balancesCount',
        'operationsCount',
        'requestsCount',
        'ordersCount',
        'receiptsCount',
        'loading',
        'error',
        'isAuthenticated',
        'selectedIds'
      ]

      for (const key of importantKeys) {
        if (key in oldData && key in newData && oldData[key] !== newData[key]) {
          changes.push({
            path: key,
            oldValue: oldData[key],
            newValue: newData[key],
            type: 'modified'
          })
        }
      }

      return changes
    } catch (error) {
      return []
    }
  }

  private createSnapshot(data: any): any {
    try {
      return JSON.parse(JSON.stringify(data))
    } catch (error) {
      return {
        snapshotError: 'Failed to create snapshot',
        timestamp: new Date().toISOString()
      }
    }
  }

  private generateHistoryId(): string {
    return `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// ✅ Global singleton instance
const globalHistoryTracker = new GlobalHistoryTracker()

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  window.__DEBUG_HISTORY_STATUS__ = () => {
    console.log('=== DEBUG HISTORY STATUS ===')
    console.log('Tracker status:', globalHistoryTracker.getStatus())
    console.log('History stats:', globalHistoryTracker.getHistoryStatistics())
    return globalHistoryTracker
  }

  window.__DEBUG_HISTORY_START__ = () => {
    globalHistoryTracker.start()
    console.log('History tracking started manually')
  }

  window.__DEBUG_HISTORY_STOP__ = () => {
    globalHistoryTracker.stop()
    console.log('History tracking stopped manually')
  }
}
