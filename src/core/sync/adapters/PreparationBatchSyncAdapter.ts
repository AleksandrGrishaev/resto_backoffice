/**
 * Sprint 3: PreparationBatchSyncAdapter
 *
 * Adapter for synchronizing offline preparation batches (production) to Supabase.
 * Implements ISyncAdapter pattern for preparation_batch entity type.
 *
 * Flow:
 * 1. Kitchen staff creates production batch offline
 * 2. Batch is queued in SyncService
 * 3. When online, this adapter syncs to Supabase
 * 4. Updates KPI store with production metrics
 */

import type { ISyncAdapter, SyncQueueItem, SyncResult, ConflictResolution } from '../types'
import type { PreparationBatch } from '@/stores/preparation/types'
import { preparationService } from '@/stores/preparation'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { supabase } from '@/supabase'
import { ENV } from '@/config/environment'

export interface PreparationBatchSyncData {
  batch: PreparationBatch
  staffId: string
  staffName: string
  department: 'kitchen' | 'bar'
}

export class PreparationBatchSyncAdapter implements ISyncAdapter<PreparationBatchSyncData> {
  entityType = 'preparation_batch' as const

  async sync(item: SyncQueueItem<PreparationBatchSyncData>): Promise<SyncResult> {
    const { batch, staffId, staffName, department } = item.data

    try {
      console.log(`🔄 Syncing preparation batch ${batch.batchNumber} to Supabase...`)

      // Check if batch already exists in Supabase (avoid duplicates)
      const { data: existing } = await supabase
        .from('preparation_batches')
        .select('id')
        .eq('id', batch.id)
        .single()

      if (existing) {
        console.log(`✅ Batch ${batch.batchNumber} already exists in Supabase, skipping`)
        return { success: true }
      }

      // Sync batch to Supabase via preparation service
      // Note: preparationService.createReceipt handles all the business logic
      // For offline sync, we just need to ensure the batch exists in Supabase

      const { error } = await supabase.from('preparation_batches').insert({
        id: batch.id,
        batch_number: batch.batchNumber,
        preparation_id: batch.preparationId,
        department: batch.department,
        initial_quantity: batch.initialQuantity,
        current_quantity: batch.currentQuantity,
        unit: batch.unit,
        cost_per_unit: batch.costPerUnit,
        total_value: batch.totalValue,
        production_date: batch.productionDate,
        expiry_date: batch.expiryDate,
        source_type: batch.sourceType,
        notes: batch.notes,
        status: batch.status,
        is_active: batch.isActive,
        portion_type: batch.portionType,
        portion_size: batch.portionSize,
        portion_quantity: batch.portionQuantity,
        created_at: batch.createdAt,
        updated_at: batch.updatedAt
      })

      if (error) {
        throw new Error(`Supabase insert failed: ${error.message}`)
      }

      // Update KPI with production metrics
      await this.updateKpi(batch, staffId, staffName, department)

      console.log(`✅ Batch ${batch.batchNumber} synced to Supabase and KPI updated`)

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to sync batch ${batch.batchNumber}:`, errorMsg)

      return { success: false, error: errorMsg }
    }
  }

  /**
   * Update KPI store with production metrics
   */
  private async updateKpi(
    batch: PreparationBatch,
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar'
  ): Promise<void> {
    try {
      const kpiStore = useKitchenKpiStore()

      await kpiStore.recordProduction(staffId, staffName, department, {
        batchId: batch.id,
        preparationName: batch.batchNumber.split('-')[2] || 'Unknown', // Extract name from batch number
        quantity: batch.initialQuantity,
        value: batch.totalValue,
        timestamp: batch.productionDate
      })

      console.log(`📊 KPI updated for production batch ${batch.batchNumber}`)
    } catch (error) {
      console.warn(`⚠️ Failed to update KPI for batch ${batch.batchNumber}:`, error)
      // Don't fail the sync if KPI update fails
    }
  }

  async validate(data: PreparationBatchSyncData): Promise<boolean> {
    const { batch } = data

    // Check required fields
    if (!batch.id || !batch.batchNumber || !batch.preparationId) {
      console.warn('⚠️ Batch validation failed: missing required fields')
      return false
    }

    // Check quantity is positive
    if (batch.initialQuantity <= 0) {
      console.warn('⚠️ Batch validation failed: quantity must be positive')
      return false
    }

    console.log(`✅ Batch ${batch.batchNumber} validation passed`)
    return true
  }

  async onConflict(
    _local: PreparationBatchSyncData,
    remote: PreparationBatchSyncData
  ): Promise<ConflictResolution<PreparationBatchSyncData>> {
    // Strategy: server-wins for production data
    return {
      strategy: 'server-wins',
      data: remote,
      reason: 'Production data integrity - server data takes precedence'
    }
  }

  async beforeSync(item: SyncQueueItem<PreparationBatchSyncData>): Promise<void> {
    console.log(
      `🔄 Preparing to sync batch ${item.data.batch.batchNumber} (attempt ${item.attempts + 1})`
    )
  }

  async afterSync(
    item: SyncQueueItem<PreparationBatchSyncData>,
    result: SyncResult
  ): Promise<void> {
    if (result.success) {
      console.log(`✅ Batch ${item.data.batch.batchNumber} successfully synced`)
    }
  }

  async onError(item: SyncQueueItem<PreparationBatchSyncData>, error: Error): Promise<void> {
    console.error(`❌ Error syncing batch ${item.data.batch.batchNumber}:`, error.message)
  }
}
