/**
 * ShiftUpdateAdapter
 *
 * Adapter for synchronizing shift data updates to Supabase.
 * This is DIFFERENT from ShiftSyncAdapter which handles account sync for CLOSED shifts.
 *
 * This adapter handles:
 * - Active shift updates (expenses, corrections, etc.) that failed to sync to Supabase
 * - Simply retries the Supabase update when network is restored
 */

import type { ISyncAdapter, SyncQueueItem, SyncResult, ConflictResolution } from '../types'
import type { PosShift } from '@/stores/pos/shifts/types'
import { supabase } from '@/supabase'
import { getSupabaseErrorMessage } from '@/supabase/config'
import { toSupabaseUpdate } from '@/stores/pos/shifts/supabaseMappers'
import { ENV } from '@/config/environment'

export class ShiftUpdateAdapter implements ISyncAdapter<PosShift> {
  entityType = 'shift_update' as const

  async sync(item: SyncQueueItem<PosShift>): Promise<SyncResult> {
    const shift = item.data

    try {
      // Check if Supabase is available
      if (!this.isSupabaseAvailable()) {
        return { success: false, error: 'Supabase not available (offline)' }
      }

      // Update shift in Supabase
      const supabaseUpdate = toSupabaseUpdate(shift)
      const { error } = await supabase.from('shifts').update(supabaseUpdate).eq('id', shift.id)

      if (error) {
        console.error(`❌ Failed to sync shift update ${shift.id}:`, getSupabaseErrorMessage(error))
        return { success: false, error: getSupabaseErrorMessage(error) }
      }

      // Update local shift to mark as synced
      shift.syncStatus = 'synced'
      shift.pendingSync = false
      this.saveShiftToLocalStorage(shift)

      console.log(`✅ Shift ${shift.shiftNumber} data synced to Supabase`)
      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Error syncing shift update ${shift.id}:`, errorMsg)
      return { success: false, error: errorMsg }
    }
  }

  async validate(shift: PosShift): Promise<boolean> {
    // Any shift can be updated (active or completed)
    // Just check if we have a valid shift ID
    if (!shift.id) {
      console.warn('⚠️ Shift update validation failed: no shift ID')
      return false
    }

    return true
  }

  async onConflict(_local: PosShift, remote: PosShift): Promise<ConflictResolution<PosShift>> {
    // For updates, use local data (user's changes should be preserved)
    // But in practice, conflicts are rare for active shifts
    return {
      strategy: 'local-wins',
      data: _local,
      reason: 'User changes on active shift should be preserved'
    }
  }

  async beforeSync(item: SyncQueueItem<PosShift>): Promise<void> {
    console.log(
      `🔄 Preparing to sync shift update ${item.data.shiftNumber} (attempt ${item.attempts + 1})`
    )
  }

  async afterSync(item: SyncQueueItem<PosShift>, result: SyncResult): Promise<void> {
    if (result.success) {
      console.log(`✅ Shift ${item.data.shiftNumber} update successfully synced`)
    }
  }

  async onError(item: SyncQueueItem<PosShift>, error: Error): Promise<void> {
    console.error(`❌ Error syncing shift update ${item.data.shiftNumber}:`, error.message)
  }

  private isSupabaseAvailable(): boolean {
    return ENV.supabase.enabled && navigator.onLine
  }

  private saveShiftToLocalStorage(shift: PosShift): void {
    try {
      const storedShifts = localStorage.getItem('pos_shifts')
      const allShifts: PosShift[] = storedShifts ? JSON.parse(storedShifts) : []
      const shiftIndex = allShifts.findIndex(s => s.id === shift.id)

      if (shiftIndex !== -1) {
        allShifts[shiftIndex] = shift
        localStorage.setItem('pos_shifts', JSON.stringify(allShifts))
      }
    } catch (error) {
      console.error('❌ Failed to save shift to localStorage:', error)
    }
  }
}
