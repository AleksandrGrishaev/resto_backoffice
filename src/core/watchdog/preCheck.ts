// src/core/watchdog/preCheck.ts
// Pre-save validation: checks quantities against historical data
// Returns warnings that should be shown to user BEFORE saving

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { WATCHDOG_THRESHOLDS } from './types'

const MODULE_NAME = 'WatchdogPreCheck'

// =============================================
// TYPES
// =============================================

export interface QuantityWarning {
  itemId: string
  itemName: string
  unit: string
  enteredQuantity: number
  averageQuantity: number
  maxHistoricalQuantity: number
  multiplier: number
  severity: 'warning' | 'critical'
  message: string
}

export interface PriceWarning {
  itemId: string
  itemName: string
  unit: string
  enteredCostPerUnit: number
  averageCostPerUnit: number
  percentChange: number
  severity: 'warning' | 'critical'
  message: string
}

export interface PreCheckResult {
  quantityWarnings: QuantityWarning[]
  priceWarnings: PriceWarning[]
  hasWarnings: boolean
  hasCritical: boolean
}

// =============================================
// RECEIPT PRE-CHECK
// =============================================

interface ReceiptPreCheckItem {
  itemId: string
  itemName: string
  quantity: number
  costPerUnit: number
  unit: string
}

/**
 * Pre-check receipt items BEFORE saving.
 * Returns warnings for unusual quantities or prices.
 */
export async function preCheckReceiptItems(items: ReceiptPreCheckItem[]): Promise<PreCheckResult> {
  const result: PreCheckResult = {
    quantityWarnings: [],
    priceWarnings: [],
    hasWarnings: false,
    hasCritical: false
  }

  if (items.length === 0) return result

  try {
    const itemIds = items.map(i => i.itemId)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - WATCHDOG_THRESHOLDS.historyDays)

    // Fetch historical batches for quantity + price comparison
    const { data: historicalBatches, error } = await supabase
      .from('storage_batches')
      .select('item_id, initial_quantity, cost_per_unit')
      .in('item_id', itemIds)
      .gte('receipt_date', cutoffDate.toISOString())
      .eq('is_negative', false)
      .eq('source_type', 'purchase')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch historical data', { error })
      return result
    }

    // Build stats per item
    const stats = new Map<
      string,
      {
        quantities: number[]
        costs: number[]
        totalQty: number
        totalCost: number
        count: number
        maxQty: number
      }
    >()

    for (const batch of historicalBatches || []) {
      const qty = Number(batch.initial_quantity)
      const cost = Number(batch.cost_per_unit)
      const existing = stats.get(batch.item_id) || {
        quantities: [],
        costs: [],
        totalQty: 0,
        totalCost: 0,
        count: 0,
        maxQty: 0
      }
      existing.quantities.push(qty)
      existing.costs.push(cost)
      existing.totalQty += qty
      existing.totalCost += cost
      existing.count++
      existing.maxQty = Math.max(existing.maxQty, qty)
      stats.set(batch.item_id, existing)
    }

    for (const item of items) {
      const history = stats.get(item.itemId)
      if (!history || history.count < 2) continue

      const avgQty = history.totalQty / history.count
      const avgCost = history.totalCost / history.count

      // Quantity check
      if (avgQty > 0) {
        const multiplier = item.quantity / avgQty
        if (multiplier >= 5 || item.quantity > history.maxQty * 3) {
          result.quantityWarnings.push({
            itemId: item.itemId,
            itemName: item.itemName,
            unit: item.unit,
            enteredQuantity: item.quantity,
            averageQuantity: Math.round(avgQty),
            maxHistoricalQuantity: history.maxQty,
            multiplier: Math.round(multiplier * 10) / 10,
            severity: 'critical',
            message: `${Math.round(multiplier)}x the usual amount (avg: ${Math.round(avgQty)}${item.unit}, max: ${history.maxQty}${item.unit})`
          })
        } else if (multiplier >= 3) {
          result.quantityWarnings.push({
            itemId: item.itemId,
            itemName: item.itemName,
            unit: item.unit,
            enteredQuantity: item.quantity,
            averageQuantity: Math.round(avgQty),
            maxHistoricalQuantity: history.maxQty,
            multiplier: Math.round(multiplier * 10) / 10,
            severity: 'warning',
            message: `${Math.round(multiplier)}x the usual amount (avg: ${Math.round(avgQty)}${item.unit})`
          })
        }
      }

      // Price check
      if (avgCost > 0 && item.costPerUnit > 0) {
        const percentChange = ((item.costPerUnit - avgCost) / avgCost) * 100
        if (percentChange >= WATCHDOG_THRESHOLDS.priceSpikePercent.critical) {
          result.priceWarnings.push({
            itemId: item.itemId,
            itemName: item.itemName,
            unit: item.unit,
            enteredCostPerUnit: item.costPerUnit,
            averageCostPerUnit: Math.round(avgCost * 100) / 100,
            percentChange: Math.round(percentChange),
            severity: 'critical',
            message: `Price +${Math.round(percentChange)}% vs average (${Math.round(avgCost)}/${item.unit})`
          })
        } else if (percentChange >= WATCHDOG_THRESHOLDS.priceSpikePercent.warning) {
          result.priceWarnings.push({
            itemId: item.itemId,
            itemName: item.itemName,
            unit: item.unit,
            enteredCostPerUnit: item.costPerUnit,
            averageCostPerUnit: Math.round(avgCost * 100) / 100,
            percentChange: Math.round(percentChange),
            severity: 'warning',
            message: `Price +${Math.round(percentChange)}% vs average (${Math.round(avgCost)}/${item.unit})`
          })
        }
      }
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Receipt pre-check failed', { error: err })
  }

  result.hasWarnings = result.quantityWarnings.length > 0 || result.priceWarnings.length > 0
  result.hasCritical =
    result.quantityWarnings.some(w => w.severity === 'critical') ||
    result.priceWarnings.some(w => w.severity === 'critical')
  return result
}

// =============================================
// PREPARATION PRE-CHECK
// =============================================

interface PrepPreCheckItem {
  preparationId: string
  preparationName: string
  quantity: number
  unit: string
}

/**
 * Pre-check preparation production quantities BEFORE saving.
 */
export async function preCheckPrepQuantity(items: PrepPreCheckItem[]): Promise<PreCheckResult> {
  const result: PreCheckResult = {
    quantityWarnings: [],
    priceWarnings: [],
    hasWarnings: false,
    hasCritical: false
  }

  if (items.length === 0) return result

  try {
    const prepIds = items.map(i => i.preparationId)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - WATCHDOG_THRESHOLDS.historyDays)

    const { data: historicalBatches, error } = await supabase
      .from('preparation_batches')
      .select('preparation_id, initial_quantity')
      .in('preparation_id', prepIds)
      .gte('production_date', cutoffDate.toISOString())
      .eq('is_negative', false)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch historical prep data', { error })
      return result
    }

    const stats = new Map<
      string,
      {
        total: number
        count: number
        max: number
      }
    >()

    for (const batch of historicalBatches || []) {
      const qty = Number(batch.initial_quantity)
      const existing = stats.get(batch.preparation_id) || { total: 0, count: 0, max: 0 }
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
        result.quantityWarnings.push({
          itemId: item.preparationId,
          itemName: item.preparationName,
          unit: item.unit,
          enteredQuantity: item.quantity,
          averageQuantity: Math.round(avg),
          maxHistoricalQuantity: history.max,
          multiplier: Math.round(multiplier * 10) / 10,
          severity: 'critical',
          message: `${Math.round(multiplier)}x the usual batch (avg: ${Math.round(avg)}${item.unit}, max: ${history.max}${item.unit})`
        })
      } else if (multiplier >= 3) {
        result.quantityWarnings.push({
          itemId: item.preparationId,
          itemName: item.preparationName,
          unit: item.unit,
          enteredQuantity: item.quantity,
          averageQuantity: Math.round(avg),
          maxHistoricalQuantity: history.max,
          multiplier: Math.round(multiplier * 10) / 10,
          severity: 'warning',
          message: `${Math.round(multiplier)}x the usual batch (avg: ${Math.round(avg)}${item.unit})`
        })
      }
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Prep pre-check failed', { error: err })
  }

  result.hasWarnings = result.quantityWarnings.length > 0 || result.priceWarnings.length > 0
  result.hasCritical =
    result.quantityWarnings.some(w => w.severity === 'critical') ||
    result.priceWarnings.some(w => w.severity === 'critical')
  return result
}
