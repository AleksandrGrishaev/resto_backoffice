// src/stores/supplier_2/composables/useReceiptCorrections.ts

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { useSupplierStore } from '../supplierStore'
import { useStorageStore } from '@/stores/storage'
import { mapCorrectionFromDB } from '../supabaseMappers'
import type { ReceiptCorrection, CorrectionType } from '../types'

const MODULE_NAME = 'ReceiptCorrections'

export function useReceiptCorrections() {
  const supplierStore = useSupplierStore()
  const storageStore = useStorageStore()

  const isApplying = ref(false)
  const correctionHistory = ref<ReceiptCorrection[]>([])
  const isLoadingHistory = ref(false)

  /**
   * Apply item quantity or price correction
   */
  async function applyItemCorrection(
    receiptId: string,
    orderId: string,
    correctionType: 'item_quantity' | 'item_price',
    items: Array<{
      receiptItemId: string
      itemId: string
      newQuantity?: number
      newBaseCost?: number
    }>,
    reason: string,
    correctedBy?: string
  ): Promise<ReceiptCorrection | null> {
    isApplying.value = true
    try {
      DebugUtils.info(MODULE_NAME, 'Applying item correction', {
        receiptId,
        correctionType,
        itemCount: items.length
      })

      const { data, error } = await supabase.rpc('apply_receipt_correction', {
        p_receipt_id: receiptId,
        p_order_id: orderId,
        p_correction_type: correctionType,
        p_reason: reason,
        p_corrected_by: correctedBy ?? null,
        p_item_corrections: items,
        p_new_supplier_id: null,
        p_new_supplier_name: null
      })

      if (error || !data?.success) {
        const errorMsg = data?.error || error?.message || 'Unknown error'
        DebugUtils.error(MODULE_NAME, 'Correction failed', { error: errorMsg, code: data?.code })
        throw new Error(errorMsg)
      }

      DebugUtils.info(MODULE_NAME, 'Correction applied', {
        correctionNumber: data.correctionNumber,
        financialImpact: data.financialImpact
      })

      // Refresh local state
      await refreshAfterCorrection()

      return {
        id: data.correctionId,
        correctionNumber: data.correctionNumber,
        receiptId,
        orderId,
        correctionType,
        reason,
        correctedBy,
        itemCorrections: data.itemCorrections ?? [],
        batchAdjustments: data.batchAdjustments ?? [],
        oldTotalAmount: data.oldTotal,
        newTotalAmount: data.newTotal,
        financialImpact: data.financialImpact,
        storageOperationId: data.operationId,
        status: 'applied',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply correction', { error })
      throw error
    } finally {
      isApplying.value = false
    }
  }

  /**
   * Apply supplier change correction
   */
  async function applySupplierChange(
    receiptId: string,
    orderId: string,
    newSupplierId: string,
    newSupplierName: string,
    reason: string,
    correctedBy?: string
  ): Promise<ReceiptCorrection | null> {
    isApplying.value = true
    try {
      const { data, error } = await supabase.rpc('apply_receipt_correction', {
        p_receipt_id: receiptId,
        p_order_id: orderId,
        p_correction_type: 'supplier_change' as CorrectionType,
        p_reason: reason,
        p_corrected_by: correctedBy ?? null,
        p_item_corrections: [],
        p_new_supplier_id: newSupplierId,
        p_new_supplier_name: newSupplierName
      })

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Unknown error')
      }

      await refreshAfterCorrection()
      return {
        id: data.correctionId,
        correctionNumber: data.correctionNumber,
        receiptId,
        orderId,
        correctionType: 'supplier_change',
        reason,
        correctedBy,
        newSupplierId,
        newSupplierName,
        itemCorrections: [],
        batchAdjustments: [],
        financialImpact: 0,
        storageOperationId: data.operationId,
        status: 'applied',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply supplier change', { error })
      throw error
    } finally {
      isApplying.value = false
    }
  }

  /**
   * Apply full reversal - reverts receipt to draft, order to sent, batches to in_transit
   */
  async function applyFullReversal(
    receiptId: string,
    orderId: string,
    reason: string,
    correctedBy?: string
  ): Promise<ReceiptCorrection | null> {
    isApplying.value = true
    try {
      const { data, error } = await supabase.rpc('apply_receipt_correction', {
        p_receipt_id: receiptId,
        p_order_id: orderId,
        p_correction_type: 'full_reversal' as CorrectionType,
        p_reason: reason,
        p_corrected_by: correctedBy ?? null,
        p_item_corrections: [],
        p_new_supplier_id: null,
        p_new_supplier_name: null
      })

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Unknown error')
      }

      DebugUtils.info(MODULE_NAME, 'Full reversal applied', {
        correctionNumber: data.correctionNumber,
        batchesReverted: data.batchAdjustments?.length
      })

      await refreshAfterCorrection()
      return {
        id: data.correctionId,
        correctionNumber: data.correctionNumber,
        receiptId,
        orderId,
        correctionType: 'full_reversal',
        reason,
        correctedBy,
        itemCorrections: [],
        batchAdjustments: data.batchAdjustments ?? [],
        oldTotalAmount: data.oldTotal,
        newTotalAmount: 0,
        financialImpact: data.financialImpact,
        storageOperationId: data.operationId,
        status: 'applied',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to apply full reversal', { error })
      throw error
    } finally {
      isApplying.value = false
    }
  }

  /**
   * Fetch correction history for a receipt
   */
  async function getCorrectionHistory(receiptId: string): Promise<ReceiptCorrection[]> {
    isLoadingHistory.value = true
    try {
      const { data, error } = await supabase
        .from('supplierstore_receipt_corrections')
        .select('*')
        .eq('receipt_id', receiptId)
        .order('created_at', { ascending: false })

      if (error) throw error

      correctionHistory.value = (data || []).map(mapCorrectionFromDB)
      return correctionHistory.value
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch correction history', { receiptId, error })
      return []
    } finally {
      isLoadingHistory.value = false
    }
  }

  /**
   * Check batch consumption status for an order's batches
   */
  async function getBatchConsumptionStatus(orderId: string): Promise<{
    safe: boolean
    batches: Array<{
      batchId: string
      itemId: string
      initialQuantity: number
      currentQuantity: number
      consumed: number
    }>
  }> {
    try {
      const { data, error } = await supabase
        .from('storage_batches')
        .select('id, item_id, initial_quantity, current_quantity')
        .eq('purchase_order_id', orderId)
        .eq('status', 'active')

      if (error) throw error

      const batches = (data || []).map(b => ({
        batchId: b.id,
        itemId: b.item_id,
        initialQuantity: Number(b.initial_quantity),
        currentQuantity: Number(b.current_quantity),
        consumed: Number(b.initial_quantity) - Number(b.current_quantity)
      }))

      const safe = batches.every(b => b.consumed === 0)

      return { safe, batches }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to check batch consumption', { orderId, error })
      return { safe: false, batches: [] }
    }
  }

  /**
   * Refresh stores after correction
   */
  async function refreshAfterCorrection(): Promise<void> {
    try {
      await Promise.all([
        supplierStore.getReceipts(),
        supplierStore.getOrders(),
        storageStore.fetchBalances('kitchen')
      ])
    } catch (err) {
      console.warn('ReceiptCorrections: Background refresh failed:', err)
    }
  }

  return {
    isApplying,
    correctionHistory,
    isLoadingHistory,

    applyItemCorrection,
    applySupplierChange,
    applyFullReversal,
    getCorrectionHistory,
    getBatchConsumptionStatus
  }
}
