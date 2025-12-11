/**
 * Sprint 3: PreparationWriteOffSyncAdapter
 *
 * Adapter for synchronizing offline preparation write-offs to Supabase.
 * Implements ISyncAdapter pattern for preparation_writeoff entity type.
 *
 * Flow:
 * 1. Kitchen staff writes off preparation offline
 * 2. Write-off is queued in SyncService
 * 3. When online, this adapter syncs to Supabase
 * 4. Updates KPI store with write-off metrics (affects staff KPI)
 */

import type { ISyncAdapter, SyncQueueItem, SyncResult, ConflictResolution } from '../types'
import type { PreparationOperation, PreparationWriteOffReason } from '@/stores/preparation/types'
import { doesPreparationWriteOffAffectKPI } from '@/stores/preparation/types'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { supabase } from '@/supabase'

export interface PreparationWriteOffSyncData {
  operation: PreparationOperation
  staffId: string
  staffName: string
  department: 'kitchen' | 'bar'
}

export class PreparationWriteOffSyncAdapter implements ISyncAdapter<PreparationWriteOffSyncData> {
  entityType = 'preparation_writeoff' as const

  async sync(item: SyncQueueItem<PreparationWriteOffSyncData>): Promise<SyncResult> {
    const { operation, staffId, staffName, department } = item.data

    try {
      console.log(`🔄 Syncing preparation write-off ${operation.documentNumber} to Supabase...`)

      // Check if operation already exists
      const { data: existing } = await supabase
        .from('preparation_operations')
        .select('id')
        .eq('id', operation.id)
        .single()

      if (existing) {
        console.log(`✅ Write-off ${operation.documentNumber} already exists in Supabase, skipping`)
        return { success: true }
      }

      // Sync operation to Supabase
      const { error } = await supabase.from('preparation_operations').insert({
        id: operation.id,
        operation_type: operation.operationType,
        document_number: operation.documentNumber,
        operation_date: operation.operationDate,
        department: operation.department,
        responsible_person: operation.responsiblePerson,
        items: operation.items,
        total_value: operation.totalValue,
        write_off_details: operation.writeOffDetails,
        status: operation.status,
        notes: operation.notes,
        created_at: operation.createdAt,
        updated_at: operation.updatedAt
      })

      if (error) {
        throw new Error(`Supabase insert failed: ${error.message}`)
      }

      // Update batch quantities in Supabase
      for (const opItem of operation.items) {
        if (opItem.batchAllocations) {
          for (const allocation of opItem.batchAllocations) {
            // Decrement batch quantity
            const { error: batchError } = await supabase.rpc('decrement_batch_quantity', {
              p_batch_id: allocation.batchId,
              p_quantity: allocation.quantity
            })

            if (batchError) {
              console.warn(
                `⚠️ Failed to update batch ${allocation.batchId} quantity:`,
                batchError.message
              )
            }
          }
        }
      }

      // Update KPI with write-off metrics
      await this.updateKpi(operation, staffId, staffName, department)

      console.log(`✅ Write-off ${operation.documentNumber} synced to Supabase and KPI updated`)

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to sync write-off ${operation.documentNumber}:`, errorMsg)

      return { success: false, error: errorMsg }
    }
  }

  /**
   * Update KPI store with write-off metrics
   */
  private async updateKpi(
    operation: PreparationOperation,
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar'
  ): Promise<void> {
    try {
      const kpiStore = useKitchenKpiStore()

      const reason = operation.writeOffDetails?.reason as PreparationWriteOffReason
      const affectsKpi = reason ? doesPreparationWriteOffAffectKPI(reason) : true

      // Calculate total write-off value
      const totalValue = operation.items.reduce((sum, item) => {
        const itemCost =
          item.batchAllocations?.reduce((s, a) => s + a.quantity * a.costPerUnit, 0) || 0
        return sum + itemCost
      }, 0)

      const totalQuantity = operation.items.reduce((sum, item) => sum + item.quantity, 0)

      await kpiStore.recordWriteoff(staffId, staffName, department, {
        operationId: operation.id,
        type: 'preparation',
        reason: reason || 'other',
        quantity: totalQuantity,
        value: totalValue,
        timestamp: operation.operationDate,
        affectsKpi
      })

      console.log(
        `📊 KPI updated for write-off ${operation.documentNumber} (affects KPI: ${affectsKpi})`
      )
    } catch (error) {
      console.warn(`⚠️ Failed to update KPI for write-off ${operation.documentNumber}:`, error)
      // Don't fail the sync if KPI update fails
    }
  }

  async validate(data: PreparationWriteOffSyncData): Promise<boolean> {
    const { operation } = data

    // Check required fields
    if (!operation.id || !operation.documentNumber) {
      console.warn('⚠️ Write-off validation failed: missing required fields')
      return false
    }

    // Check has items
    if (!operation.items || operation.items.length === 0) {
      console.warn('⚠️ Write-off validation failed: no items')
      return false
    }

    // Check operation type
    if (operation.operationType !== 'write_off') {
      console.warn('⚠️ Write-off validation failed: incorrect operation type')
      return false
    }

    console.log(`✅ Write-off ${operation.documentNumber} validation passed`)
    return true
  }

  async onConflict(
    _local: PreparationWriteOffSyncData,
    remote: PreparationWriteOffSyncData
  ): Promise<ConflictResolution<PreparationWriteOffSyncData>> {
    // Strategy: append - write-offs are additive, no conflict
    return {
      strategy: 'local-wins',
      data: _local,
      reason: 'Write-offs are additive operations - keep local data'
    }
  }

  async beforeSync(item: SyncQueueItem<PreparationWriteOffSyncData>): Promise<void> {
    console.log(
      `🔄 Preparing to sync write-off ${item.data.operation.documentNumber} (attempt ${item.attempts + 1})`
    )
  }

  async afterSync(
    item: SyncQueueItem<PreparationWriteOffSyncData>,
    result: SyncResult
  ): Promise<void> {
    if (result.success) {
      console.log(`✅ Write-off ${item.data.operation.documentNumber} successfully synced`)
    }
  }

  async onError(item: SyncQueueItem<PreparationWriteOffSyncData>, error: Error): Promise<void> {
    console.error(
      `❌ Error syncing write-off ${item.data.operation.documentNumber}:`,
      error.message
    )
  }
}
