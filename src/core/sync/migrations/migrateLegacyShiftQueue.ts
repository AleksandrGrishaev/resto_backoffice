/**
 * Sprint 6: Legacy Shift Queue Migration
 *
 * Migrates shift sync queue from Sprint 5 format to SyncService format.
 * This is OPTIONAL and only needed for development continuity.
 * In production deployments with no legacy data, this will auto-skip.
 */

import { useSyncService } from '../SyncService'
import type { PosShift } from '@/stores/pos/shifts/types'

/**
 * Legacy sync queue item format (Sprint 5)
 */
interface LegacySyncQueueItem {
  shiftId: string
  addedAt: string
  attempts: number
  lastAttempt?: string
  lastError?: string
}

const LEGACY_QUEUE_KEY = 'pos_sync_queue'

export async function migrateLegacyShiftQueue(): Promise<void> {
  const legacyQueueRaw = localStorage.getItem(LEGACY_QUEUE_KEY)

  // ✅ No legacy data → skip (production scenario)
  if (!legacyQueueRaw) {
    console.log('✅ No legacy shift queue to migrate (clean start)')
    return
  }

  try {
    const legacyQueue: LegacySyncQueueItem[] = JSON.parse(legacyQueueRaw)

    if (legacyQueue.length === 0) {
      localStorage.removeItem(LEGACY_QUEUE_KEY)
      console.log('✅ Legacy shift queue is empty, removed')
      return
    }

    console.log(`🔄 Migrating ${legacyQueue.length} legacy shift queue items...`)

    const syncService = useSyncService()
    let migratedCount = 0
    let skippedCount = 0

    // Load shifts from localStorage
    const storedShifts = localStorage.getItem('pos_shifts')
    const allShifts: PosShift[] = storedShifts ? JSON.parse(storedShifts) : []

    for (const item of legacyQueue) {
      // Find shift by ID
      const shift = allShifts.find(s => s.id === item.shiftId)

      if (!shift) {
        console.warn(`⚠️ Shift ${item.shiftId} not found, skipping migration`)
        skippedCount++
        continue
      }

      // Skip if already synced
      if (shift.syncedToAccount) {
        console.log(`⏭️ Shift ${shift.shiftNumber} already synced, skipping`)
        skippedCount++
        continue
      }

      // Add to new sync queue with remaining attempts
      const remainingAttempts = Math.max(10 - item.attempts, 1) // At least 1 attempt
      syncService.addToQueue({
        entityType: 'shift',
        entityId: shift.id,
        operation: 'update',
        priority: 'critical',
        data: shift,
        maxAttempts: remainingAttempts
      })

      migratedCount++
      console.log(
        `✅ Migrated shift ${shift.shiftNumber} (${remainingAttempts} attempts remaining)`
      )
    }

    // Remove legacy queue
    localStorage.removeItem(LEGACY_QUEUE_KEY)

    console.log(`✅ Migration complete: ${migratedCount} shifts migrated, ${skippedCount} skipped`)
  } catch (error) {
    console.error('❌ Failed to migrate legacy shift queue:', error)
    // Don't throw - allow app to continue even if migration fails
  }
}
