/**
 * Sprint 3: ScheduleCompletionSyncAdapter
 *
 * Adapter for synchronizing offline schedule task completions to Supabase.
 * Implements ISyncAdapter pattern for schedule_completion entity type.
 *
 * Flow:
 * 1. Kitchen/bar staff completes a production task offline
 * 2. Completion is queued in SyncService
 * 3. When online, this adapter syncs to Supabase
 * 4. Updates KPI store with on-time/late completion metrics
 */

import type { ISyncAdapter, SyncQueueItem, SyncResult, ConflictResolution } from '../types'
import type { ProductionScheduleItem } from '@/stores/preparation/types'
import type { ScheduleCompletionKpiDetail } from '@/stores/kitchenKpi'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { supabase } from '@/supabase'

export interface ScheduleCompletionSyncData {
  scheduleItem: ProductionScheduleItem
  staffId: string
  staffName: string
  department: 'kitchen' | 'bar'
  isOnTime: boolean
}

export class ScheduleCompletionSyncAdapter implements ISyncAdapter<ScheduleCompletionSyncData> {
  entityType = 'schedule_completion' as const

  async sync(item: SyncQueueItem<ScheduleCompletionSyncData>): Promise<SyncResult> {
    const { scheduleItem, staffId, staffName, department, isOnTime } = item.data

    try {
      console.log(`Syncing schedule completion ${scheduleItem.id} to Supabase...`)

      // Update the schedule item in Supabase
      const { error } = await supabase
        .from('production_schedule')
        .update({
          status: scheduleItem.status,
          completed_at: scheduleItem.completedAt,
          completed_by: scheduleItem.completedBy,
          completed_by_name: scheduleItem.completedByName,
          completed_quantity: scheduleItem.completedQuantity,
          preparation_batch_id: scheduleItem.preparationBatchId,
          sync_status: 'synced',
          synced_at: new Date().toISOString(),
          updated_at: scheduleItem.updatedAt
        })
        .eq('id', scheduleItem.id)

      if (error) {
        throw new Error(`Supabase update failed: ${error.message}`)
      }

      // Update KPI with completion metrics
      await this.updateKpi(scheduleItem, staffId, staffName, department, isOnTime)

      console.log(`Schedule completion ${scheduleItem.id} synced to Supabase and KPI updated`)

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to sync schedule completion ${scheduleItem.id}:`, errorMsg)

      // Mark as failed in Supabase if possible
      try {
        await supabase
          .from('production_schedule')
          .update({
            sync_status: 'failed',
            sync_error: errorMsg,
            updated_at: new Date().toISOString()
          })
          .eq('id', scheduleItem.id)
      } catch {
        // Ignore secondary error
      }

      return { success: false, error: errorMsg }
    }
  }

  /**
   * Update KPI store with schedule completion metrics
   */
  private async updateKpi(
    scheduleItem: ProductionScheduleItem,
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar',
    isOnTime: boolean
  ): Promise<void> {
    try {
      const kpiStore = useKitchenKpiStore()

      await kpiStore.recordScheduleCompletion(staffId, staffName, department, {
        scheduleItemId: scheduleItem.id,
        preparationName: scheduleItem.preparationName,
        targetQuantity: scheduleItem.targetQuantity,
        completedQuantity: scheduleItem.completedQuantity || scheduleItem.targetQuantity,
        productionSlot: scheduleItem.productionSlot,
        isOnTime,
        timestamp: scheduleItem.completedAt || new Date().toISOString()
      })

      console.log(`KPI updated for schedule completion ${scheduleItem.id} (on-time: ${isOnTime})`)
    } catch (error) {
      console.warn(`Failed to update KPI for schedule completion ${scheduleItem.id}:`, error)
      // Don't fail the sync if KPI update fails
    }
  }

  /**
   * Determine if completion was on-time based on production slot
   */
  static isOnTimeCompletion(scheduleItem: ProductionScheduleItem): boolean {
    if (!scheduleItem.completedAt) return false

    const completedDate = new Date(scheduleItem.completedAt)
    const completedHour = completedDate.getHours()
    const slot = scheduleItem.productionSlot

    // Slot time ranges
    const slotRanges = {
      urgent: { start: 0, end: 24 }, // Any time is OK for urgent
      morning: { start: 6, end: 12 },
      afternoon: { start: 12, end: 18 },
      evening: { start: 18, end: 22 }
    }

    const range = slotRanges[slot]
    if (!range) return true // Unknown slot = on-time

    // Check if completion hour is within the slot range (or up to 2 hours after)
    return completedHour >= range.start && completedHour <= range.end + 2
  }

  async validate(data: ScheduleCompletionSyncData): Promise<boolean> {
    const { scheduleItem } = data

    // Check required fields
    if (!scheduleItem.id) {
      console.warn('Schedule completion validation failed: missing id')
      return false
    }

    // Check status is completed
    if (scheduleItem.status !== 'completed') {
      console.warn('Schedule completion validation failed: status not completed')
      return false
    }

    // Check completion details
    if (!scheduleItem.completedAt || !scheduleItem.completedBy) {
      console.warn('Schedule completion validation failed: missing completion details')
      return false
    }

    console.log(`Schedule completion ${scheduleItem.id} validation passed`)
    return true
  }

  async onConflict(
    _local: ScheduleCompletionSyncData,
    remote: ScheduleCompletionSyncData
  ): Promise<ConflictResolution<ScheduleCompletionSyncData>> {
    // If server already has completion, keep server data
    if (remote.scheduleItem.status === 'completed') {
      return {
        strategy: 'server-wins',
        data: remote,
        reason: 'Server already has completion - keep server data to avoid duplicates'
      }
    }

    // Otherwise, local completion wins
    return {
      strategy: 'local-wins',
      data: _local,
      reason: 'Local completion takes precedence over pending server state'
    }
  }

  async beforeSync(item: SyncQueueItem<ScheduleCompletionSyncData>): Promise<void> {
    console.log(
      `Preparing to sync schedule completion ${item.data.scheduleItem.id} (attempt ${item.attempts + 1})`
    )
  }

  async afterSync(
    item: SyncQueueItem<ScheduleCompletionSyncData>,
    result: SyncResult
  ): Promise<void> {
    if (result.success) {
      console.log(`Schedule completion ${item.data.scheduleItem.id} successfully synced`)
    }
  }

  async onError(item: SyncQueueItem<ScheduleCompletionSyncData>, error: Error): Promise<void> {
    console.error(`Error syncing schedule completion ${item.data.scheduleItem.id}:`, error.message)
  }
}
