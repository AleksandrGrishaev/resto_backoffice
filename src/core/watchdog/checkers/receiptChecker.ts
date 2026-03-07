// src/core/watchdog/checkers/receiptChecker.ts
// Checks receipt prices against historical averages

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { WATCHDOG_THRESHOLDS } from '../types'
import type { PriceCheckResult } from '../types'

const MODULE_NAME = 'WatchdogReceiptChecker'

interface ReceiptItemForCheck {
  itemId: string
  itemName: string
  costPerUnit: number
  unit: string
  quantity: number
}

interface ReceiptContext {
  responsiblePerson?: string
  supplierId?: string
  supplierName?: string
}

/**
 * Check receipt items against historical price averages.
 * Returns items that have suspicious price spikes.
 */
export async function checkReceiptPrices(
  items: ReceiptItemForCheck[],
  context: ReceiptContext
): Promise<PriceCheckResult[]> {
  if (items.length === 0) return []

  const results: PriceCheckResult[] = []
  const itemIds = items.map(i => i.itemId)

  try {
    // Get historical average cost_per_unit for each product
    // from the last N days of batches
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - WATCHDOG_THRESHOLDS.historyDays)

    const { data: historicalBatches, error } = await supabase
      .from('storage_batches')
      .select('item_id, cost_per_unit, initial_quantity')
      .in('item_id', itemIds)
      .gte('receipt_date', cutoffDate.toISOString())
      .eq('is_negative', false)
      .order('receipt_date', { ascending: false })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch historical batches', { error })
      return []
    }

    // Calculate weighted average cost per product
    const avgCosts = new Map<string, { totalCost: number; totalQty: number; batchCount: number }>()
    for (const batch of historicalBatches || []) {
      const existing = avgCosts.get(batch.item_id) || { totalCost: 0, totalQty: 0, batchCount: 0 }
      const qty = Number(batch.initial_quantity)
      const cost = Number(batch.cost_per_unit)
      existing.totalCost += cost * qty
      existing.totalQty += qty
      existing.batchCount++
      avgCosts.set(batch.item_id, existing)
    }

    // Compare each receipt item against its average
    for (const item of items) {
      const history = avgCosts.get(item.itemId)
      if (!history || history.batchCount === 0 || history.totalQty === 0) {
        // No history — first receipt, skip check
        continue
      }

      const avgCost = history.totalCost / history.totalQty
      if (avgCost <= 0) continue

      const percentChange = ((item.costPerUnit - avgCost) / avgCost) * 100

      // Only flag increases
      if (percentChange >= WATCHDOG_THRESHOLDS.priceSpike.criticalPercent) {
        results.push({
          itemId: item.itemId,
          itemName: item.itemName,
          unit: item.unit,
          newCostPerUnit: item.costPerUnit,
          averageCostPerUnit: Math.round(avgCost * 100) / 100,
          percentChange: Math.round(percentChange),
          severity: 'critical',
          batchCount: history.batchCount,
          responsiblePerson: context.responsiblePerson,
          supplierId: context.supplierId,
          supplierName: context.supplierName
        })
      } else if (percentChange >= WATCHDOG_THRESHOLDS.priceSpike.warningPercent) {
        results.push({
          itemId: item.itemId,
          itemName: item.itemName,
          unit: item.unit,
          newCostPerUnit: item.costPerUnit,
          averageCostPerUnit: Math.round(avgCost * 100) / 100,
          percentChange: Math.round(percentChange),
          severity: 'warning',
          batchCount: history.batchCount,
          responsiblePerson: context.responsiblePerson,
          supplierId: context.supplierId,
          supplierName: context.supplierName
        })
      }
    }

    if (results.length > 0) {
      DebugUtils.info(MODULE_NAME, `Found ${results.length} price spike(s)`, {
        items: results.map(r => `${r.itemName}: +${r.percentChange}%`)
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Price check failed', { error: err })
  }

  return results
}
