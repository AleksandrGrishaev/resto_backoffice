/**
 * Sprint 7: Sync Status Composable
 *
 * Provides reactive sync status information for UI components.
 * Tracks sync queue status, last sync time, and online/offline state.
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSyncService } from '@/core/sync/SyncService'
import { kitchenOfflineCache } from '../offlineCache'
import type { SyncStats, SyncReport, SyncEntityType } from '@/core/sync/types'

const POLL_INTERVAL_MS = 5000 // Check sync status every 5 seconds

export function useSyncStatus() {
  const syncService = useSyncService()

  // Reactive state
  const isOnline = ref(navigator.onLine)
  const syncStats = ref<SyncStats | null>(null)
  const lastSyncTime = ref<string | null>(null)
  const timeSinceLastSync = ref<string | null>(null)
  const isSyncing = ref(false)
  const lastSyncReport = ref<SyncReport | null>(null)
  const hasError = ref(false)

  // Poll interval reference
  let pollIntervalId: ReturnType<typeof setInterval> | null = null

  // ===== COMPUTED =====

  /**
   * Number of pending items in sync queue
   */
  const pendingCount = computed(() => syncStats.value?.pendingItems || 0)

  /**
   * Number of failed items in sync queue
   */
  const failedCount = computed(() => syncStats.value?.failedItems || 0)

  /**
   * Total items in sync queue
   */
  const totalQueueSize = computed(() => syncStats.value?.totalItems || 0)

  /**
   * Whether there are pending items to sync
   */
  const hasPendingSync = computed(() => pendingCount.value > 0)

  /**
   * Whether there are failed items
   */
  const hasFailedSync = computed(() => failedCount.value > 0)

  /**
   * Overall sync health status
   */
  const syncHealth = computed<'good' | 'warning' | 'error'>(() => {
    if (hasFailedSync.value) return 'error'
    if (!isOnline.value && hasPendingSync.value) return 'warning'
    if (hasPendingSync.value) return 'warning'
    return 'good'
  })

  /**
   * Human-readable sync status message
   */
  const statusMessage = computed(() => {
    if (isSyncing.value) {
      return 'Syncing...'
    }

    if (!isOnline.value) {
      if (hasPendingSync.value) {
        return `Offline (${pendingCount.value} pending)`
      }
      return 'Offline'
    }

    if (hasFailedSync.value) {
      return `${failedCount.value} failed items`
    }

    if (hasPendingSync.value) {
      return `${pendingCount.value} pending`
    }

    if (timeSinceLastSync.value) {
      return `Last sync: ${timeSinceLastSync.value}`
    }

    return 'Up to date'
  })

  /**
   * Icon for current status
   */
  const statusIcon = computed(() => {
    if (isSyncing.value) return 'mdi-sync'
    if (!isOnline.value) return 'mdi-cloud-off-outline'
    if (hasFailedSync.value) return 'mdi-alert-circle-outline'
    if (hasPendingSync.value) return 'mdi-cloud-upload-outline'
    return 'mdi-cloud-check-outline'
  })

  /**
   * Color for current status
   */
  const statusColor = computed(() => {
    if (syncHealth.value === 'error') return 'error'
    if (syncHealth.value === 'warning') return 'warning'
    return 'success'
  })

  // ===== METHODS =====

  /**
   * Refresh sync statistics
   */
  async function refreshStats(): Promise<void> {
    try {
      syncStats.value = await syncService.getStats()

      // Update last sync info from cache
      lastSyncTime.value = kitchenOfflineCache.getLastSyncTime()
      timeSinceLastSync.value = kitchenOfflineCache.getTimeSinceLastSync()
    } catch (error) {
      console.error('Failed to refresh sync stats:', error)
    }
  }

  /**
   * Trigger manual sync
   */
  async function triggerSync(): Promise<SyncReport | null> {
    if (!isOnline.value) {
      console.warn('Cannot sync while offline')
      return null
    }

    if (isSyncing.value) {
      console.warn('Sync already in progress')
      return null
    }

    try {
      isSyncing.value = true
      hasError.value = false

      const report = await syncService.processQueue()
      lastSyncReport.value = report

      // Record successful sync
      if (report.succeeded > 0 || report.processed === 0) {
        kitchenOfflineCache.recordLastSync()
      }

      // Check for errors
      if (report.failed > 0) {
        hasError.value = true
      }

      await refreshStats()

      return report
    } catch (error) {
      console.error('Sync failed:', error)
      hasError.value = true
      return null
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Retry failed sync items
   */
  async function retryFailed(): Promise<SyncReport | null> {
    if (!isOnline.value) {
      console.warn('Cannot retry while offline')
      return null
    }

    try {
      isSyncing.value = true
      const report = await syncService.retryFailed()
      lastSyncReport.value = report
      await refreshStats()
      return report
    } catch (error) {
      console.error('Retry failed:', error)
      return null
    } finally {
      isSyncing.value = false
    }
  }

  /**
   * Clear all failed items from queue
   */
  async function clearFailedItems(entityType?: SyncEntityType): Promise<void> {
    await syncService.clearQueue(entityType)
    await refreshStats()
  }

  /**
   * Handle online/offline status change
   */
  function handleOnlineStatus(): void {
    const wasOffline = !isOnline.value
    isOnline.value = navigator.onLine

    // If coming back online and have pending items, trigger sync
    if (wasOffline && isOnline.value && hasPendingSync.value) {
      console.log('Back online, triggering sync...')
      setTimeout(() => triggerSync(), 1000) // Small delay to ensure connection is stable
    }
  }

  /**
   * Start polling for sync status updates
   */
  function startPolling(): void {
    if (pollIntervalId) return

    refreshStats() // Initial refresh
    pollIntervalId = setInterval(refreshStats, POLL_INTERVAL_MS)
  }

  /**
   * Stop polling
   */
  function stopPolling(): void {
    if (pollIntervalId) {
      clearInterval(pollIntervalId)
      pollIntervalId = null
    }
  }

  // ===== LIFECYCLE =====

  onMounted(() => {
    window.addEventListener('online', handleOnlineStatus)
    window.addEventListener('offline', handleOnlineStatus)
    startPolling()
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnlineStatus)
    window.removeEventListener('offline', handleOnlineStatus)
    stopPolling()
  })

  // ===== RETURN =====

  return {
    // State
    isOnline,
    isSyncing,
    syncStats,
    lastSyncTime,
    timeSinceLastSync,
    lastSyncReport,
    hasError,

    // Computed
    pendingCount,
    failedCount,
    totalQueueSize,
    hasPendingSync,
    hasFailedSync,
    syncHealth,
    statusMessage,
    statusIcon,
    statusColor,

    // Methods
    refreshStats,
    triggerSync,
    retryFailed,
    clearFailedItems,
    startPolling,
    stopPolling
  }
}
