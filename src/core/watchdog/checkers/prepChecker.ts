// src/core/watchdog/checkers/prepChecker.ts
// Checks preparation batch costs against historical values

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { WATCHDOG_THRESHOLDS } from '../types'
import type { PrepCostCheckResult } from '../types'

const MODULE_NAME = 'WatchdogPrepChecker'

interface PrepItemForCheck {
  preparationId: string
  preparationName: string
  costPerUnit: number
  unit: string
  quantity: number
}

/**
 * Check preparation batch costs against historical averages.
 * Detects cost spikes from wrong ingredient quantities or packaging errors.
 */
export async function checkPrepCosts(
  items: PrepItemForCheck[],
  responsiblePerson?: string
): Promise<PrepCostCheckResult[]> {
  if (items.length === 0) return []

  const results: PrepCostCheckResult[] = []
  const prepIds = items.map(i => i.preparationId)

  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - WATCHDOG_THRESHOLDS.historyDays)

    const { data: historicalBatches, error } = await supabase
      .from('preparation_batches')
      .select('preparation_id, cost_per_unit, initial_quantity')
      .in('preparation_id', prepIds)
      .gte('production_date', cutoffDate.toISOString())
      .eq('is_negative', false)
      .order('production_date', { ascending: false })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch historical prep batches', { error })
      return []
    }

    // Calculate weighted average cost per preparation
    const avgCosts = new Map<string, { totalCost: number; totalQty: number; batchCount: number }>()
    for (const batch of historicalBatches || []) {
      const existing = avgCosts.get(batch.preparation_id) || {
        totalCost: 0,
        totalQty: 0,
        batchCount: 0
      }
      const qty = Number(batch.initial_quantity)
      const cost = Number(batch.cost_per_unit)
      existing.totalCost += cost * qty
      existing.totalQty += qty
      existing.batchCount++
      avgCosts.set(batch.preparation_id, existing)
    }

    for (const item of items) {
      const history = avgCosts.get(item.preparationId)
      if (!history || history.batchCount === 0 || history.totalQty === 0) continue

      const avgCost = history.totalCost / history.totalQty
      if (avgCost <= 0) continue

      const percentChange = ((item.costPerUnit - avgCost) / avgCost) * 100

      if (percentChange >= WATCHDOG_THRESHOLDS.prepCostSpike.criticalPercent) {
        results.push({
          preparationId: item.preparationId,
          preparationName: item.preparationName,
          unit: item.unit,
          newCostPerUnit: item.costPerUnit,
          previousCostPerUnit: Math.round(avgCost * 100) / 100,
          percentChange: Math.round(percentChange),
          severity: 'critical',
          responsiblePerson
        })
      } else if (percentChange >= WATCHDOG_THRESHOLDS.prepCostSpike.warningPercent) {
        results.push({
          preparationId: item.preparationId,
          preparationName: item.preparationName,
          unit: item.unit,
          newCostPerUnit: item.costPerUnit,
          previousCostPerUnit: Math.round(avgCost * 100) / 100,
          percentChange: Math.round(percentChange),
          severity: 'warning',
          responsiblePerson
        })
      }
    }

    if (results.length > 0) {
      DebugUtils.info(MODULE_NAME, `Found ${results.length} prep cost spike(s)`, {
        items: results.map(r => `${r.preparationName}: +${r.percentChange}%`)
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Prep cost check failed', { error: err })
  }

  return results
}
