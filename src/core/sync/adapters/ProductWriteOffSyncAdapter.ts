/**
 * Sprint 3: ProductWriteOffSyncAdapter
 *
 * Adapter for synchronizing offline product write-offs to Supabase.
 * Implements ISyncAdapter pattern for product_writeoff entity type.
 *
 * Flow:
 * 1. Kitchen staff writes off product (raw material) offline
 * 2. Write-off is queued in SyncService
 * 3. When online, this adapter syncs to Supabase
 * 4. Updates KPI store with write-off metrics (affects staff KPI)
 *
 * Note: This is for RAW PRODUCT write-offs, NOT preparation write-offs.
 * Kitchen staff can write off products without seeing stock levels.
 */

import type { ISyncAdapter, SyncQueueItem, SyncResult, ConflictResolution } from '../types'
import type { WriteOffOperation } from '@/stores/storage/types'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { supabase } from '@/supabase'

export interface ProductWriteOffSyncData {
  operation: WriteOffOperation
  staffId: string
  staffName: string
  department: 'kitchen' | 'bar'
}

export class ProductWriteOffSyncAdapter implements ISyncAdapter<ProductWriteOffSyncData> {
  entityType = 'product_writeoff' as const

  async sync(item: SyncQueueItem<ProductWriteOffSyncData>): Promise<SyncResult> {
    const { operation, staffId, staffName, department } = item.data

    try {
      console.log(`🔄 Syncing product write-off ${operation.documentNumber} to Supabase...`)

      // Check if operation already exists
      const { data: existing } = await supabase
        .from('storage_operations')
        .select('id')
        .eq('id', operation.id)
        .single()

      if (existing) {
        console.log(`✅ Write-off ${operation.documentNumber} already exists in Supabase, skipping`)
        return { success: true }
      }

      // Sync operation to Supabase
      const { error } = await supabase.from('storage_operations').insert({
        id: operation.id,
        operation_type: operation.operationType,
        document_number: operation.documentNumber,
        operation_date: operation.operationDate,
        warehouse_id: operation.warehouseId,
        responsible_person: operation.responsiblePerson,
        items: operation.items,
        total_value: operation.totalValue,
        write_off_reason: operation.writeOffReason,
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
            const { error: batchError } = await supabase.rpc('decrement_storage_batch_quantity', {
              p_batch_id: allocation.batchId,
              p_quantity: allocation.quantity
            })

            if (batchError) {
              console.warn(
                `⚠️ Failed to update storage batch ${allocation.batchId} quantity:`,
                batchError.message
              )
            }
          }
        }
      }

      // Update KPI with write-off metrics
      await this.updateKpi(operation, staffId, staffName, department)

      console.log(
        `✅ Product write-off ${operation.documentNumber} synced to Supabase and KPI updated`
      )

      return { success: true }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Failed to sync product write-off ${operation.documentNumber}:`, errorMsg)

      return { success: false, error: errorMsg }
    }
  }

  /**
   * Update KPI store with write-off metrics
   */
  private async updateKpi(
    operation: WriteOffOperation,
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar'
  ): Promise<void> {
    try {
      const kpiStore = useKitchenKpiStore()

      // Product write-offs from kitchen always affect KPI (staff error)
      const affectsKpi = this.doesWriteOffAffectKpi(operation.writeOffReason)

      // Calculate total write-off value
      const totalValue = operation.items.reduce((sum, item) => {
        const itemCost =
          item.batchAllocations?.reduce((s, a) => s + a.quantity * a.costPerUnit, 0) || 0
        return sum + itemCost
      }, 0)

      const totalQuantity = operation.items.reduce((sum, item) => sum + item.quantity, 0)

      await kpiStore.recordWriteoff(staffId, staffName, department, {
        operationId: operation.id,
        type: 'product',
        reason: operation.writeOffReason || 'other',
        quantity: totalQuantity,
        value: totalValue,
        timestamp: operation.operationDate,
        affectsKpi
      })

      console.log(
        `📊 KPI updated for product write-off ${operation.documentNumber} (affects KPI: ${affectsKpi})`
      )
    } catch (error) {
      console.warn(
        `⚠️ Failed to update KPI for product write-off ${operation.documentNumber}:`,
        error
      )
      // Don't fail the sync if KPI update fails
    }
  }

  /**
   * Determine if write-off reason affects KPI
   */
  private doesWriteOffAffectKpi(reason?: string): boolean {
    // Non-KPI affecting reasons for products
    const nonKpiReasons = ['expired', 'quality_issue', 'supplier_return', 'inventory_adjustment']
    return !reason || !nonKpiReasons.includes(reason)
  }

  async validate(data: ProductWriteOffSyncData): Promise<boolean> {
    const { operation } = data

    // Check required fields
    if (!operation.id || !operation.documentNumber) {
      console.warn('⚠️ Product write-off validation failed: missing required fields')
      return false
    }

    // Check has items
    if (!operation.items || operation.items.length === 0) {
      console.warn('⚠️ Product write-off validation failed: no items')
      return false
    }

    // Check operation type
    if (operation.operationType !== 'write_off') {
      console.warn('⚠️ Product write-off validation failed: incorrect operation type')
      return false
    }

    console.log(`✅ Product write-off ${operation.documentNumber} validation passed`)
    return true
  }

  async onConflict(
    _local: ProductWriteOffSyncData,
    remote: ProductWriteOffSyncData
  ): Promise<ConflictResolution<ProductWriteOffSyncData>> {
    // Strategy: append - write-offs are additive, no conflict
    return {
      strategy: 'local-wins',
      data: _local,
      reason: 'Write-offs are additive operations - keep local data'
    }
  }

  async beforeSync(item: SyncQueueItem<ProductWriteOffSyncData>): Promise<void> {
    console.log(
      `🔄 Preparing to sync product write-off ${item.data.operation.documentNumber} (attempt ${item.attempts + 1})`
    )
  }

  async afterSync(item: SyncQueueItem<ProductWriteOffSyncData>, result: SyncResult): Promise<void> {
    if (result.success) {
      console.log(`✅ Product write-off ${item.data.operation.documentNumber} successfully synced`)
    }
  }

  async onError(item: SyncQueueItem<ProductWriteOffSyncData>, error: Error): Promise<void> {
    console.error(
      `❌ Error syncing product write-off ${item.data.operation.documentNumber}:`,
      error.message
    )
  }
}
