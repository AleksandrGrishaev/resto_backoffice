// src/core/watchdog/checkers/quantityChecker.ts
// Checks receipt/production quantities against historical averages

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { WATCHDOG_THRESHOLDS } from '../types'

const MODULE_NAME = 'WatchdogQuantityChecker'

export interface QuantityCheckResult {
  itemId: string
  itemName: string
  unit: string
  newQuantity: number
  averageQuantity: number
  maxHistoricalQuantity: number
  multiplier: number // how many times bigger than average
  severity: 'warning' | 'critical'
  reason: string
  responsiblePerson?: string
}

interface ReceiptItemForQtyCheck {
  itemId: string
  itemName: string
  quantity: number
  unit: string
}

interface PrepItemForQtyCheck {
  preparationId: string
  preparationName: string
  quantity: number
  unit: string
}

/**
 * Check receipt quantities against historical averages.
 * Flags quantities that are unusually large (e.g. entered package count as base units).
 */
export async function checkReceiptQuantities(
  items: ReceiptItemForQtyCheck[],
  responsiblePerson?: string
): Promise<QuantityCheckResult[]> {
  if (items.length === 0) return []

  const results: QuantityCheckResult[] = []
  const itemIds = items.map(i => i.itemId)

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - WATCHDOG_THRESHOLDS.historyDays)

    const { data: historicalBatches, error } = await supabase
      .from('storage_batches')
      .select('item_id, initial_quantity')
      .in('item_id', itemIds)
      .gte('receipt_date', cutoffDate.toISOString())
      .eq('is_negative', false)
      .eq('source_type', 'purchase')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch historical batches', { error })
      return []
    }

    // Calculate stats per product
    const stats = new Map<
      string,
      { quantities: number[]; total: number; count: number; max: number }
    >()
    for (const batch of historicalBatches || []) {
      const qty = Number(batch.initial_quantity)
      const existing = stats.get(batch.item_id) || { quantities: [], total: 0, count: 0, max: 0 }
      existing.quantities.push(qty)
      existing.total += qty
      existing.count++
      existing.max = Math.max(existing.max, qty)
      stats.set(batch.item_id, existing)
    }

    for (const item of items) {
      const history = stats.get(item.itemId)
      if (!history || history.count < 2) continue // Need at least 2 historical batches

      const avg = history.total / history.count
      if (avg <= 0) continue

      const multiplier = item.quantity / avg

      // Flag if quantity is 3x+ the average OR exceeds 2x the historical max
      if (multiplier >= 5 || item.quantity > history.max * 3) {
        results.push({
          itemId: item.itemId,
          itemName: item.itemName,
          unit: item.unit,
          newQuantity: item.quantity,
          averageQuantity: Math.round(avg),
          maxHistoricalQuantity: history.max,
          multiplier: Math.round(multiplier * 10) / 10,
          severity: 'critical',
          reason: `${Math.round(multiplier)}x average (usual: ${Math.round(avg)}${item.unit}, max: ${history.max}${item.unit})`,
          responsiblePerson
        })
      } else if (multiplier >= 3) {
        results.push({
          itemId: item.itemId,
          itemName: item.itemName,
          unit: item.unit,
          newQuantity: item.quantity,
          averageQuantity: Math.round(avg),
          maxHistoricalQuantity: history.max,
          multiplier: Math.round(multiplier * 10) / 10,
          severity: 'warning',
          reason: `${Math.round(multiplier)}x average (usual: ${Math.round(avg)}${item.unit})`,
          responsiblePerson
        })
      }
    }

    if (results.length > 0) {
      DebugUtils.info(MODULE_NAME, `Found ${results.length} quantity anomaly(ies)`, {
        items: results.map(r => `${r.itemName}: ${r.newQuantity} vs avg ${r.averageQuantity}`)
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Quantity check failed', { error: err })
  }

  return results
}

/**
 * Check preparation production quantities against historical averages.
 */
export async function checkPrepQuantities(
  items: PrepItemForQtyCheck[],
  responsiblePerson?: string
): Promise<QuantityCheckResult[]> {
  if (items.length === 0) return []

  const results: QuantityCheckResult[] = []
  const prepIds = items.map(i => i.preparationId)

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - WATCHDOG_THRESHOLDS.historyDays)

    const { data: historicalBatches, error } = await supabase
      .from('preparation_batches')
      .select('preparation_id, initial_quantity')
      .in('preparation_id', prepIds)
      .gte('production_date', cutoffDate.toISOString())
      .eq('is_negative', false)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch historical prep batches', { error })
      return []
    }

    const stats = new Map<
      string,
      { quantities: number[]; total: number; count: number; max: number }
    >()
    for (const batch of historicalBatches || []) {
      const qty = Number(batch.initial_quantity)
      const existing = stats.get(batch.preparation_id) || {
        quantities: [],
        total: 0,
        count: 0,
        max: 0
      }
      existing.quantities.push(qty)
      existing.total += qty
      existing.count++
      existing.max = Math.max(existing.max, qty)
      stats.set(batch.preparation_id, existing)
    }

    for (const item of items) {
      const history = stats.get(item.preparationId)
      if (!history || history.count < 2) continue

      const avg = history.total / history.count
      if (avg <= 0) continue

      const multiplier = item.quantity / avg

      if (multiplier >= 5 || item.quantity > history.max * 3) {
        results.push({
          itemId: item.preparationId,
          itemName: item.preparationName,
          unit: item.unit,
          newQuantity: item.quantity,
          averageQuantity: Math.round(avg),
          maxHistoricalQuantity: history.max,
          multiplier: Math.round(multiplier * 10) / 10,
          severity: 'critical',
          reason: `${Math.round(multiplier)}x average (usual: ${Math.round(avg)}${item.unit}, max: ${history.max}${item.unit})`,
          responsiblePerson
        })
      } else if (multiplier >= 3) {
        results.push({
          itemId: item.preparationId,
          itemName: item.preparationName,
          unit: item.unit,
          newQuantity: item.quantity,
          averageQuantity: Math.round(avg),
          maxHistoricalQuantity: history.max,
          multiplier: Math.round(multiplier * 10) / 10,
          severity: 'warning',
          reason: `${Math.round(multiplier)}x average (usual: ${Math.round(avg)}${item.unit})`,
          responsiblePerson
        })
      }
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Prep quantity check failed', { error: err })
  }

  return results
}
