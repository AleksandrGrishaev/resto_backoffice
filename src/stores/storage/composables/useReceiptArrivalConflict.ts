/**
 * useReceiptArrivalConflict — detects and resolves inventory conflicts
 * when a receipt's arrival time predates an inventory count that already
 * recorded the delivered goods as surplus corrections.
 */

import { ref } from 'vue'
import { supabase } from '@/supabase'
import { DebugUtils } from '@/utils'
import { TimeUtils } from '@/utils/time'

const MODULE_NAME = 'ReceiptArrivalConflict'

// =============================================
// TYPES
// =============================================

export interface ArrivalConflictItem {
  itemId: string
  itemName: string
  receiptQuantity: number
  inventorySurplus: number
  adjustableAmount: number
  surplusBatchId: string
  surplusBatchCurrentQty: number
  surplusBatchCostPerUnit: number
  surplusBatchNotes: string
  unit: string
}

export interface ArrivalConflict {
  inventoryDocId: string
  inventoryDocNumber: string
  inventoryDate: string
  items: ArrivalConflictItem[]
}

export interface ConflictCheckResult {
  hasConflicts: boolean
  conflicts: ArrivalConflict[]
  totalAdjustableItems: number
}

interface ReceiptItemForCheck {
  itemId: string
  itemName?: string
  quantity: number
  unit?: string
}

// =============================================
// COMPOSABLE
// =============================================

export function useReceiptArrivalConflict() {
  const isChecking = ref(false)
  const isApplying = ref(false)

  /**
   * Check if any confirmed inventory documents between arrivalTime and now
   * contain surplus corrections for items in the receipt.
   */
  async function checkForConflicts(
    arrivalTime: string,
    receiptItems: ReceiptItemForCheck[]
  ): Promise<ConflictCheckResult> {
    const emptyResult: ConflictCheckResult = {
      hasConflicts: false,
      conflicts: [],
      totalAdjustableItems: 0
    }

    if (!arrivalTime || receiptItems.length === 0) return emptyResult

    // Convert HTML input to ISO if needed
    const arrivalISO =
      arrivalTime.includes('T') && !arrivalTime.includes('Z')
        ? TimeUtils.htmlInputToISO(arrivalTime)
        : arrivalTime

    isChecking.value = true

    try {
      DebugUtils.info(MODULE_NAME, 'Checking for arrival conflicts', {
        arrivalTime: arrivalISO,
        receiptItemCount: receiptItems.length
      })

      // 1. Find confirmed inventory documents after arrival time
      const { data: inventoryDocs, error: invError } = await supabase
        .from('inventory_documents')
        .select('id, document_number, updated_at, items')
        .eq('status', 'confirmed')
        .gt('updated_at', arrivalISO)
        .order('updated_at', { ascending: true })

      if (invError) {
        DebugUtils.error(MODULE_NAME, 'Failed to query inventory docs', { error: invError })
        return emptyResult
      }

      if (!inventoryDocs || inventoryDocs.length === 0) return emptyResult

      // Build a map of receipt items by itemId
      const receiptItemMap = new Map<string, ReceiptItemForCheck>()
      for (const item of receiptItems) {
        if (item.itemId && item.quantity > 0) {
          receiptItemMap.set(item.itemId, item)
        }
      }

      const conflicts: ArrivalConflict[] = []

      // 2. For each inventory doc, find surplus items matching receipt items
      for (const doc of inventoryDocs) {
        const items = doc.items as any[]
        if (!Array.isArray(items)) continue

        const matchingItems: Array<{
          itemId: string
          itemName: string
          surplus: number
          unit: string
          receiptQty: number
        }> = []

        for (const invItem of items) {
          const itemId = invItem.itemId || invItem.item_id
          const difference = invItem.difference ?? 0
          if (difference <= 0) continue // Only surplus (positive difference)

          const receiptItem = receiptItemMap.get(itemId)
          if (!receiptItem) continue

          matchingItems.push({
            itemId,
            itemName: invItem.itemName || invItem.item_name || receiptItem.itemName || 'Unknown',
            surplus: difference,
            unit: invItem.unit || receiptItem.unit || 'gram',
            receiptQty: receiptItem.quantity
          })
        }

        if (matchingItems.length === 0) continue

        // 3. Find correction operations linked to this inventory document
        //    via correction_details.relatedId (set by finalizeInventory)
        const { data: operations, error: opsError } = await supabase
          .from('storage_operations')
          .select('id, items')
          .eq('operation_type', 'correction')
          .eq('status', 'confirmed')
          .contains('correction_details', { relatedId: doc.id })

        if (opsError) {
          DebugUtils.warn(MODULE_NAME, 'Failed to query correction operations', {
            inventoryDocId: doc.id,
            error: opsError
          })
          continue
        }

        if (!operations || operations.length === 0) continue

        // Collect all operation IDs to find batches linked to them
        const operationIds = operations.map(op => op.id)

        // Build a set of itemIds that had positive corrections in these operations
        const surplusItemIds = new Set<string>()
        for (const op of operations) {
          const opItems = op.items as any[]
          if (!Array.isArray(opItems)) continue
          for (const opItem of opItems) {
            const opItemId = opItem.itemId || opItem.item_id
            if ((opItem.quantity ?? 0) > 0) {
              surplusItemIds.add(opItemId)
            }
          }
        }

        // 4. Find active correction batches linked to these operations
        const matchItemIds = matchingItems
          .filter(m => surplusItemIds.has(m.itemId))
          .map(m => m.itemId)

        if (matchItemIds.length === 0) continue

        // Primary: find batches via storage_operation_id FK
        const { data: linkedBatches, error: batchError } = await supabase
          .from('storage_batches')
          .select(
            'id, item_id, current_quantity, cost_per_unit, status, is_active, notes, storage_operation_id'
          )
          .in('storage_operation_id', operationIds)
          .in('item_id', matchItemIds)
          .eq('source_type', 'correction')
          .eq('status', 'active')
          .gt('current_quantity', 0)

        if (batchError) {
          DebugUtils.warn(MODULE_NAME, 'Failed to query linked batches', { error: batchError })
          continue
        }

        // Fallback: for batches created before migration 201 (no storage_operation_id),
        // use time-window + notes pattern matching
        let fallbackBatches: any[] = []
        const matchItemIdsWithoutLinked = matchItemIds.filter(
          id => !linkedBatches?.some(b => b.item_id === id)
        )

        if (matchItemIdsWithoutLinked.length > 0) {
          const docUpdatedAt = new Date(doc.updated_at)
          const windowStart = new Date(docUpdatedAt.getTime() - 15 * 60 * 1000).toISOString()
          const windowEnd = new Date(docUpdatedAt.getTime() + 15 * 60 * 1000).toISOString()

          const { data: fbBatches } = await supabase
            .from('storage_batches')
            .select('id, item_id, current_quantity, cost_per_unit, status, is_active, notes')
            .in('item_id', matchItemIdsWithoutLinked)
            .eq('source_type', 'correction')
            .eq('status', 'active')
            .gt('current_quantity', 0)
            .gte('created_at', windowStart)
            .lte('created_at', windowEnd)
            .ilike('notes', `%Inventory adjustment: ${doc.document_number}%`)

          fallbackBatches = fbBatches || []
        }

        // Merge results: indexed by item_id
        const batchByItemId = new Map<string, any>()
        for (const b of [...(linkedBatches || []), ...fallbackBatches]) {
          if (!batchByItemId.has(b.item_id)) {
            batchByItemId.set(b.item_id, b)
          }
        }

        // 5. Build conflict items
        const conflictItems: ArrivalConflictItem[] = []

        for (const match of matchingItems) {
          const batch = batchByItemId.get(match.itemId)
          if (!batch) continue

          const adjustableAmount = Math.min(match.receiptQty, batch.current_quantity, match.surplus)
          if (adjustableAmount <= 0) continue

          conflictItems.push({
            itemId: match.itemId,
            itemName: match.itemName,
            receiptQuantity: match.receiptQty,
            inventorySurplus: match.surplus,
            adjustableAmount,
            surplusBatchId: batch.id,
            surplusBatchCurrentQty: batch.current_quantity,
            surplusBatchCostPerUnit: batch.cost_per_unit || 0,
            surplusBatchNotes: batch.notes || '',
            unit: match.unit
          })
        }

        if (conflictItems.length > 0) {
          conflicts.push({
            inventoryDocId: doc.id,
            inventoryDocNumber: doc.document_number,
            inventoryDate: doc.updated_at,
            items: conflictItems
          })
        }
      }

      const totalAdjustableItems = conflicts.reduce((sum, c) => sum + c.items.length, 0)

      DebugUtils.info(MODULE_NAME, 'Conflict check complete', {
        inventoryDocsChecked: inventoryDocs.length,
        conflictsFound: conflicts.length,
        totalAdjustableItems
      })

      return {
        hasConflicts: conflicts.length > 0,
        conflicts,
        totalAdjustableItems
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Conflict check failed', { error })
      return emptyResult
    } finally {
      isChecking.value = false
    }
  }

  /**
   * Apply adjustments: reduce surplus correction batches and create audit records.
   */
  async function applyAdjustments(
    conflicts: ArrivalConflict[],
    receiptId: string
  ): Promise<{ success: boolean; error?: string }> {
    isApplying.value = true

    try {
      DebugUtils.info(MODULE_NAME, 'Applying arrival adjustments', {
        conflictCount: conflicts.length,
        receiptId
      })

      const adjustmentDetails: any[] = []

      for (const conflict of conflicts) {
        const succeededItems: ArrivalConflictItem[] = []

        for (const item of conflict.items) {
          // 1. Reduce surplus batch quantity (single update with preserved notes)
          const newQty = item.surplusBatchCurrentQty - item.adjustableAmount
          const isConsumed = newQty <= 0.001
          const finalQty = Math.max(0, newQty)
          const newTotalValue = isConsumed ? 0 : finalQty * item.surplusBatchCostPerUnit
          const appendedNotes = `${item.surplusBatchNotes}\n[Arrival Adj] -${item.adjustableAmount} for receipt ${receiptId}`

          const { error: batchError } = await supabase
            .from('storage_batches')
            .update({
              current_quantity: finalQty,
              total_value: newTotalValue,
              status: isConsumed ? 'consumed' : 'active',
              is_active: !isConsumed,
              notes: appendedNotes.trim()
            })
            .eq('id', item.surplusBatchId)

          if (batchError) {
            DebugUtils.error(MODULE_NAME, 'Failed to update batch', {
              batchId: item.surplusBatchId,
              error: batchError
            })
            continue
          }

          succeededItems.push(item)

          adjustmentDetails.push({
            itemId: item.itemId,
            itemName: item.itemName,
            adjustedAmount: item.adjustableAmount,
            surplusBatchId: item.surplusBatchId,
            inventoryDocId: conflict.inventoryDocId,
            inventoryDocNumber: conflict.inventoryDocNumber,
            batchConsumed: isConsumed
          })

          DebugUtils.info(MODULE_NAME, 'Batch adjusted', {
            batchId: item.surplusBatchId,
            itemName: item.itemName,
            reducedBy: item.adjustableAmount,
            newQty: Math.max(0, newQty),
            consumed: isConsumed
          })
        }

        if (succeededItems.length === 0) continue

        // 2. Create audit storage_operation record (only for successfully adjusted items)
        const operationItems = succeededItems.map(item => ({
          id: crypto.randomUUID(),
          itemId: item.itemId,
          itemType: 'product',
          itemName: item.itemName,
          quantity: -item.adjustableAmount, // Negative = removing surplus
          unit: item.unit
        }))

        const docNum = `ARA-${Date.now().toString().slice(-6)}`

        const { error: opError } = await supabase.from('storage_operations').insert({
          id: crypto.randomUUID(),
          operation_type: 'correction',
          document_number: docNum,
          operation_date: new Date().toISOString(),
          department: 'kitchen',
          responsible_person: 'System (Arrival Adjustment)',
          items: operationItems,
          total_value: 0,
          correction_details: {
            reason: 'receipt_arrival_adjustment',
            relatedId: conflict.inventoryDocId,
            relatedName: conflict.inventoryDocNumber,
            receiptId
          },
          status: 'confirmed',
          notes: `Receipt arrival adjustment: reversed surplus from inventory ${conflict.inventoryDocNumber} due to late receipt entry (${receiptId})`
        })

        if (opError) {
          DebugUtils.error(MODULE_NAME, 'Failed to create operation record', { error: opError })
        }
      }

      // 3. Update receipt with adjustment tracking columns
      try {
        const { data: receipt } = await supabase
          .from('supplierstore_receipts')
          .select('notes')
          .eq('id', receiptId)
          .single()

        const existingNotes = receipt?.notes || ''
        const adjustmentNote = `\n[Arrival Adjustment] Reversed surplus from ${conflicts.map(c => c.inventoryDocNumber).join(', ')}`

        await supabase
          .from('supplierstore_receipts')
          .update({
            notes: existingNotes + adjustmentNote,
            arrival_adjustment_applied: true,
            arrival_adjustment_details: adjustmentDetails
          } as any) // 'as any' until types.gen.ts is regenerated
          .eq('id', receiptId)
      } catch {
        // Non-critical — adjustment already applied to batches
        DebugUtils.warn(MODULE_NAME, 'Failed to update receipt tracking columns')
      }

      DebugUtils.info(MODULE_NAME, 'All adjustments applied', {
        adjustments: adjustmentDetails.length,
        receiptId
      })

      return { success: true }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply adjustments', { error })
      return { success: false, error: String(error) }
    } finally {
      isApplying.value = false
    }
  }

  return {
    isChecking,
    isApplying,
    checkForConflicts,
    applyAdjustments
  }
}
