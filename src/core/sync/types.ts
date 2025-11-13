/**
 * Sprint 6: Centralized SyncService Types
 *
 * Defines types for the universal sync service that manages
 * synchronization of all entity types in the application.
 */

// ===== ENTITY & OPERATION TYPES =====

export type SyncEntityType = 'shift' | 'transaction' | 'discount' | 'customer' | 'product' | 'order'

export type SyncOperation = 'create' | 'update' | 'delete'

export type SyncPriority = 'critical' | 'high' | 'normal' | 'low'

export type SyncItemStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled'

export type ConflictStrategy = 'local-wins' | 'server-wins' | 'merge' | 'manual'

// ===== SYNC QUEUE ITEM =====

export interface SyncQueueItem<T = any> {
  id: string // Unique queue item ID
  entityType: SyncEntityType // Type of entity being synced
  entityId: string // ID of the entity (shiftId, transactionId, etc.)
  operation: SyncOperation // Operation to perform
  priority: SyncPriority // Sync priority
  data: T // Data to synchronize

  // Tracking
  attempts: number // Number of sync attempts
  maxAttempts: number // Maximum attempts before giving up
  createdAt: string // ISO timestamp when added to queue
  lastAttempt?: string // ISO timestamp of last attempt
  lastError?: string // Last error message
  status: SyncItemStatus // Current status

  // Retry strategy
  nextRetryAt?: string // ISO timestamp for next retry (exponential backoff)
  backoffMultiplier: number // Backoff multiplier (2 = exponential)
}

// ===== STORAGE ABSTRACTION =====

/**
 * Storage abstraction interface for sync queue persistence.
 * Enables easy transition from localStorage (development) to API (production).
 */
export interface ISyncStorage {
  /**
   * Get all items from the sync queue
   */
  getQueue(): Promise<SyncQueueItem[]>

  /**
   * Save the entire sync queue
   */
  saveQueue(queue: SyncQueueItem[]): Promise<void>

  /**
   * Clear the entire sync queue
   */
  clear(): Promise<void>

  /**
   * Get sync history
   */
  getHistory(filters?: HistoryFilters): Promise<SyncHistoryItem[]>

  /**
   * Add item to history
   */
  addToHistory(item: SyncHistoryItem): Promise<void>

  /**
   * Clear sync history
   */
  clearHistory(): Promise<void>
}

// ===== SYNC ADAPTER PATTERN =====

export interface SyncResult {
  success: boolean
  data?: any
  error?: string
  conflictResolution?: ConflictResolution
}

export interface ConflictResolution<T = any> {
  strategy: ConflictStrategy
  data?: T
  reason?: string
}

/**
 * Adapter interface for entity-specific sync logic.
 * Each entity type (shift, transaction, etc.) implements this interface.
 */
export interface ISyncAdapter<T = any> {
  entityType: SyncEntityType

  /**
   * Perform the actual synchronization
   */
  sync(item: SyncQueueItem<T>): Promise<SyncResult>

  /**
   * Validate data before syncing
   */
  validate(data: T): Promise<boolean>

  /**
   * Handle conflicts between local and remote data
   */
  onConflict(local: T, remote: T): Promise<ConflictResolution<T>>

  /**
   * Optional: Hook called before sync
   */
  beforeSync?(item: SyncQueueItem<T>): Promise<void>

  /**
   * Optional: Hook called after successful sync
   */
  afterSync?(item: SyncQueueItem<T>, result: SyncResult): Promise<void>

  /**
   * Optional: Hook called when sync fails
   */
  onError?(item: SyncQueueItem<T>, error: Error): Promise<void>
}

// ===== REPORTS & STATISTICS =====

export interface SyncReport {
  processed: number // Number of items processed
  succeeded: number // Number of successful syncs
  failed: number // Number of failed syncs
  skipped: number // Number of skipped items (not ready for retry)
  duration: number // Processing duration in ms
  errors: Array<{ itemId: string; error: string }>
}

export interface SyncStats {
  totalItems: number
  pendingItems: number
  failedItems: number
  processingItems: number
  byEntityType: Record<SyncEntityType, number>
  byPriority: Record<SyncPriority, number>
}

export interface SyncServiceStatus {
  isRunning: boolean
  isPaused: boolean
  lastProcessedAt?: string
  currentlyProcessing?: string
}

// ===== FILTERS =====

export interface QueueFilters {
  entityType?: SyncEntityType
  status?: SyncItemStatus
  priority?: SyncPriority
  entityId?: string
}

// ===== SYNC HISTORY =====

/**
 * History record for completed sync operations
 */
export interface SyncHistoryItem<T = any> {
  id: string // Original queue item ID
  entityType: SyncEntityType
  entityId: string
  operation: SyncOperation
  priority: SyncPriority
  data: T

  // Timing
  createdAt: string // When added to queue
  completedAt: string // When sync completed (success or failed)
  duration: number // Sync duration in ms

  // Result
  status: 'success' | 'failed' // Final status
  attempts: number // Total attempts made
  error?: string // Error message if failed

  // Metadata
  syncedBy?: string // User/service that triggered sync
  conflictResolution?: ConflictResolution
}

/**
 * Filters for sync history
 */
export interface HistoryFilters {
  entityType?: SyncEntityType
  status?: 'success' | 'failed'
  priority?: SyncPriority
  entityId?: string
  dateFrom?: string // ISO timestamp
  dateTo?: string // ISO timestamp
}

/**
 * History statistics
 */
export interface HistoryStats {
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  averageDuration: number // in ms
  byEntityType: Record<SyncEntityType, { total: number; success: number; failed: number }>
  byPriority: Record<SyncPriority, { total: number; success: number; failed: number }>
  last24Hours: {
    total: number
    success: number
    failed: number
  }
}
