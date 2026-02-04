/**
 * Sprint 6: Centralized SyncService
 *
 * Universal synchronization service that manages sync queue for all entity types.
 * Features:
 * - Generic sync queue with priority sorting
 * - Exponential backoff retry strategy
 * - Storage abstraction (localStorage/API)
 * - Adapter pattern for entity-specific logic
 */

import { generateId } from '@/utils'
import type {
  SyncQueueItem,
  SyncResult,
  SyncReport,
  SyncStats,
  SyncServiceStatus,
  QueueFilters,
  ISyncAdapter,
  ISyncStorage,
  SyncEntityType,
  SyncPriority,
  SyncOperation,
  SyncHistoryItem,
  HistoryFilters,
  HistoryStats
} from './types'
import { LocalStorageSyncStorage } from './storage'

const MAX_BATCH_SIZE = 10 // Process 10 items at a time

export class SyncService {
  // Storage injection для легкого перехода на API
  private storage: ISyncStorage
  private adapters: Map<SyncEntityType, ISyncAdapter> = new Map()
  private isRunning = false
  private isPaused = false
  private processingItemId: string | null = null

  constructor(storage?: ISyncStorage) {
    this.storage = storage || new LocalStorageSyncStorage()
  }

  // ===== ADAPTER REGISTRATION =====

  registerAdapter<T>(adapter: ISyncAdapter<T>): void {
    this.adapters.set(adapter.entityType, adapter)
    console.log(`✅ Registered sync adapter for ${adapter.entityType}`)
  }

  getAdapter(entityType: SyncEntityType): ISyncAdapter | undefined {
    return this.adapters.get(entityType)
  }

  // ===== QUEUE MANAGEMENT =====

  async addToQueue<T>(params: {
    entityType: SyncEntityType
    entityId: string
    operation: SyncOperation
    priority: SyncPriority
    data: T
    maxAttempts?: number
  }): Promise<string> {
    const item: SyncQueueItem<T> = {
      id: generateId(),
      entityType: params.entityType,
      entityId: params.entityId,
      operation: params.operation,
      priority: params.priority,
      data: params.data,
      attempts: 0,
      maxAttempts: params.maxAttempts || 10,
      createdAt: new Date().toISOString(),
      status: 'pending',
      backoffMultiplier: 2
    }

    // ✅ FIX: await the storage operation to avoid race condition
    const queue = await this.storage.getQueue()
    queue.push(item)
    await this.storage.saveQueue(queue)

    console.log(`📥 Added ${params.entityType} to sync queue (ID: ${item.id})`)
    return item.id
  }

  removeFromQueue(itemId: string): void {
    this.storage.getQueue().then(queue => {
      const filtered = queue.filter(item => item.id !== itemId)

      if (filtered.length < queue.length) {
        this.storage.saveQueue(filtered)
        console.log(`✅ Removed item ${itemId} from sync queue`)
      }
    })
  }

  async getQueue(filters?: QueueFilters): Promise<SyncQueueItem[]> {
    const queue = await this.storage.getQueue()

    if (!filters) return queue

    return queue.filter(item => {
      if (filters.entityType && item.entityType !== filters.entityType) return false
      if (filters.status && item.status !== filters.status) return false
      if (filters.priority && item.priority !== filters.priority) return false
      if (filters.entityId && item.entityId !== filters.entityId) return false
      return true
    })
  }

  async clearQueue(entityType?: SyncEntityType): Promise<void> {
    if (entityType) {
      const queue = await this.storage.getQueue()
      const filtered = queue.filter(item => item.entityType !== entityType)
      await this.storage.saveQueue(filtered)
      console.log(`🗑️ Cleared ${entityType} items from sync queue`)
    } else {
      await this.storage.clear()
      console.log(`🗑️ Cleared entire sync queue`)
    }
  }

  // ===== PROCESSING =====

  /**
   * Recover items stuck in 'processing' state (e.g., app was backgrounded/closed mid-sync).
   * Resets them to 'pending' so they can be retried.
   */
  async recoverStuckItems(): Promise<number> {
    const queue = await this.storage.getQueue()
    let recovered = 0

    for (const item of queue) {
      if (item.status === 'processing') {
        item.status = 'pending'
        recovered++
        console.warn(
          `🔄 Recovered stuck sync item: ${item.entityType} ${item.entityId} (was processing, attempt ${item.attempts})`
        )
      }
    }

    if (recovered > 0) {
      await this.storage.saveQueue(queue)
      console.log(`✅ Recovered ${recovered} stuck sync items`)
    }

    return recovered
  }

  async processQueue(): Promise<SyncReport> {
    const startTime = Date.now()
    const report: SyncReport = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: []
    }

    // Recover items stuck in 'processing' state (app was closed mid-sync)
    await this.recoverStuckItems()

    // Get pending items, sorted by priority
    const queue = await this.getQueue({ status: 'pending' })
    const sortedQueue = this.sortByPriority(queue)

    // Process in batches
    const batch = sortedQueue.slice(0, MAX_BATCH_SIZE)

    if (batch.length === 0) {
      console.log('✅ Sync queue is empty')
      return report
    }

    console.log(`🔄 Processing sync queue: ${batch.length} items`)

    for (const item of batch) {
      // Check if should retry (exponential backoff)
      if (item.nextRetryAt && new Date(item.nextRetryAt) > new Date()) {
        console.log(
          `⏸️ Skipping ${item.entityType} ${item.entityId} (retry scheduled for ${item.nextRetryAt})`
        )
        report.skipped++
        continue
      }

      // Check max attempts
      if (item.attempts >= item.maxAttempts) {
        console.warn(`❌ ${item.entityType} ${item.entityId} exceeded max attempts`)
        const queue = await this.storage.getQueue()
        const itemInQueue = queue.find(i => i.id === item.id)
        if (itemInQueue) {
          itemInQueue.status = 'failed'
          await this.storage.saveQueue(queue)
        }
        report.failed++
        continue
      }

      // Process item
      const result = await this.processItem(item.id)
      report.processed++

      if (result.success) {
        report.succeeded++
      } else {
        report.failed++
        report.errors.push({ itemId: item.id, error: result.error || 'Unknown error' })
      }
    }

    report.duration = Date.now() - startTime

    console.log(
      `✅ Sync queue processed: ${report.succeeded} succeeded, ${report.failed} failed, ${report.skipped} skipped (${report.duration}ms)`
    )

    return report
  }

  async processItem(itemId: string): Promise<SyncResult> {
    const queue = await this.storage.getQueue()
    const item = queue.find(i => i.id === itemId)

    if (!item) {
      return { success: false, error: 'Item not found in queue' }
    }

    const adapter = this.getAdapter(item.entityType)
    if (!adapter) {
      return { success: false, error: `No adapter registered for ${item.entityType}` }
    }

    const startTime = Date.now()

    try {
      this.processingItemId = itemId
      item.status = 'processing'
      item.attempts++
      item.lastAttempt = new Date().toISOString()
      await this.storage.saveQueue(queue)

      // Validate data
      const isValid = await adapter.validate(item.data)
      if (!isValid) {
        throw new Error('Data validation failed')
      }

      // Before hook
      if (adapter.beforeSync) {
        await adapter.beforeSync(item)
      }

      // Sync
      const result = await adapter.sync(item)

      if (result.success) {
        // Success → remove from queue and add to history
        item.status = 'success'
        this.removeFromQueue(itemId)

        // Add to history
        await this.addSyncToHistory(item, 'success', Date.now() - startTime, result)

        // After hook
        if (adapter.afterSync) {
          await adapter.afterSync(item, result)
        }

        console.log(`✅ Successfully synced ${item.entityType} ${item.entityId}`)
      } else {
        throw new Error(result.error || 'Sync failed')
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      // Check if max attempts reached
      if (item.attempts >= item.maxAttempts) {
        // Max attempts reached → remove from queue and add to history as failed
        item.status = 'failed'
        this.removeFromQueue(itemId)

        await this.addSyncToHistory(item, 'failed', Date.now() - startTime, undefined, errorMsg)

        console.error(
          `❌ ${item.entityType} ${item.entityId} failed permanently after ${item.attempts} attempts`
        )
      } else {
        // Update item with error for retry
        item.status = 'pending' // Reset to pending for retry
        item.lastError = errorMsg
        item.nextRetryAt = this.calculateNextRetry(item.attempts, item.backoffMultiplier)
        await this.storage.saveQueue(queue)
      }

      // Error hook
      if (adapter.onError) {
        await adapter.onError(item, error as Error)
      }

      console.error(`❌ Failed to sync ${item.entityType} ${item.entityId}:`, errorMsg)

      return { success: false, error: errorMsg }
    } finally {
      this.processingItemId = null
    }
  }

  private async addSyncToHistory(
    item: SyncQueueItem,
    status: 'success' | 'failed',
    duration: number,
    result?: SyncResult,
    error?: string
  ): Promise<void> {
    const historyItem: SyncHistoryItem = {
      id: item.id,
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      priority: item.priority,
      data: item.data,
      createdAt: item.createdAt,
      completedAt: new Date().toISOString(),
      duration,
      status,
      attempts: item.attempts,
      error,
      conflictResolution: result?.conflictResolution
    }

    await this.storage.addToHistory(historyItem)
  }

  async retryFailed(maxAttempts?: number): Promise<SyncReport> {
    const failedItems = await this.getQueue({ status: 'failed' })

    // Reset failed items to pending
    const queue = await this.storage.getQueue()
    failedItems.forEach(item => {
      const index = queue.findIndex(i => i.id === item.id)
      if (index !== -1 && (!maxAttempts || queue[index].attempts < maxAttempts)) {
        queue[index].status = 'pending'
        queue[index].nextRetryAt = undefined // Retry immediately
      }
    })
    await this.storage.saveQueue(queue)

    // Process queue
    return this.processQueue()
  }

  private sortByPriority(items: SyncQueueItem[]): SyncQueueItem[] {
    const priorityOrder: Record<SyncPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3
    }

    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  private calculateNextRetry(attempts: number, multiplier: number): string {
    const backoffSeconds = Math.min(multiplier ** attempts, 3600) // Max 1 hour
    const nextRetry = new Date(Date.now() + backoffSeconds * 1000)
    return nextRetry.toISOString()
  }

  // ===== STATUS & STATS =====

  getStatus(): SyncServiceStatus {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentlyProcessing: this.processingItemId || undefined,
      lastProcessedAt: undefined // TODO: track last processed time
    }
  }

  async getStats(): Promise<SyncStats> {
    const queue = await this.storage.getQueue()

    const stats: SyncStats = {
      totalItems: queue.length,
      pendingItems: queue.filter(i => i.status === 'pending').length,
      failedItems: queue.filter(i => i.status === 'failed').length,
      processingItems: queue.filter(i => i.status === 'processing').length,
      byEntityType: {} as Record<SyncEntityType, number>,
      byPriority: {} as Record<SyncPriority, number>
    }

    // Count by entity type
    queue.forEach(item => {
      stats.byEntityType[item.entityType] = (stats.byEntityType[item.entityType] || 0) + 1
      stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1
    })

    return stats
  }

  // ===== HISTORY =====

  async getHistory(filters?: HistoryFilters): Promise<SyncHistoryItem[]> {
    return this.storage.getHistory(filters)
  }

  async getHistoryStats(): Promise<HistoryStats> {
    const history = await this.storage.getHistory()

    const stats: HistoryStats = {
      totalSyncs: history.length,
      successfulSyncs: history.filter(h => h.status === 'success').length,
      failedSyncs: history.filter(h => h.status === 'failed').length,
      averageDuration:
        history.length > 0 ? history.reduce((sum, h) => sum + h.duration, 0) / history.length : 0,
      byEntityType: {} as Record<
        SyncEntityType,
        { total: number; success: number; failed: number }
      >,
      byPriority: {} as Record<SyncPriority, { total: number; success: number; failed: number }>,
      last24Hours: {
        total: 0,
        success: 0,
        failed: 0
      }
    }

    // Count by entity type and priority
    history.forEach(item => {
      // By entity type
      if (!stats.byEntityType[item.entityType]) {
        stats.byEntityType[item.entityType] = { total: 0, success: 0, failed: 0 }
      }
      stats.byEntityType[item.entityType].total++
      if (item.status === 'success') {
        stats.byEntityType[item.entityType].success++
      } else {
        stats.byEntityType[item.entityType].failed++
      }

      // By priority
      if (!stats.byPriority[item.priority]) {
        stats.byPriority[item.priority] = { total: 0, success: 0, failed: 0 }
      }
      stats.byPriority[item.priority].total++
      if (item.status === 'success') {
        stats.byPriority[item.priority].success++
      } else {
        stats.byPriority[item.priority].failed++
      }

      // Last 24 hours
      const completedAt = new Date(item.completedAt)
      const now = new Date()
      const hoursDiff = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60)
      if (hoursDiff <= 24) {
        stats.last24Hours.total++
        if (item.status === 'success') {
          stats.last24Hours.success++
        } else {
          stats.last24Hours.failed++
        }
      }
    })

    return stats
  }

  async clearHistory(): Promise<void> {
    await this.storage.clearHistory()
    console.log('🗑️ Sync history cleared')
  }

  // ===== LIFECYCLE =====

  start(): void {
    if (this.isRunning) return

    this.isRunning = true
    console.log('▶️ SyncService started')

    // Auto-process on network restore (handled by posStore watcher)
  }

  stop(): void {
    this.isRunning = false
    console.log('⏹️ SyncService stopped')
  }

  pause(): void {
    this.isPaused = true
    console.log('⏸️ SyncService paused')
  }

  resume(): void {
    this.isPaused = false
    console.log('▶️ SyncService resumed')
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null

export function useSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService()
  }
  return syncServiceInstance
}
