// src/core/watchdog/checkers/weeklyReportChecker.ts
// Weekly cost change analysis - compares current week vs previous week

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { WATCHDOG_THRESHOLDS } from '../types'
import type { WeeklyCostReport, WeeklyCostChangeItem } from '../types'

const MODULE_NAME = 'WatchdogWeeklyReport'

/**
 * Generate a weekly cost change report.
 * Compares average costs from current week vs previous week.
 */
export async function generateWeeklyCostReport(): Promise<WeeklyCostReport> {
  const now = new Date()
  const currentWeekStart = getWeekStart(now)
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)

  const report: WeeklyCostReport = {
    periodStart: previousWeekStart.toISOString(),
    periodEnd: currentWeekStart.toISOString(),
    products: [],
    preparations: [],
    menuItems: [],
    totalItemsAffected: 0,
    criticalCount: 0,
    warningCount: 0
  }

  try {
    // --- Product cost changes ---
    report.products = await compareProductCosts(previousWeekStart, currentWeekStart, now)

    // --- Preparation cost changes ---
    report.preparations = await comparePreparationCosts(previousWeekStart, currentWeekStart, now)

    // --- Menu item food cost changes (from sales_transactions) ---
    report.menuItems = await compareMenuItemCosts(previousWeekStart, currentWeekStart, now)

    // Totals
    const allItems = [...report.products, ...report.preparations, ...report.menuItems]
    report.totalItemsAffected = allItems.length
    report.criticalCount = allItems.filter(i => i.severity === 'critical').length
    report.warningCount = allItems.filter(i => i.severity === 'warning').length

    DebugUtils.info(MODULE_NAME, 'Weekly report generated', {
      products: report.products.length,
      preparations: report.preparations.length,
      menuItems: report.menuItems.length,
      total: report.totalItemsAffected
    })
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to generate weekly report', { error: err })
  }

  return report
}

// =============================================
// PRODUCT COST COMPARISON
// =============================================

async function compareProductCosts(
  prevStart: Date,
  currStart: Date,
  currEnd: Date
): Promise<WeeklyCostChangeItem[]> {
  const results: WeeklyCostChangeItem[] = []

  try {
    // Previous week batches
    const { data: prevBatches } = await supabase
      .from('storage_batches')
      .select('item_id, cost_per_unit, initial_quantity')
      .gte('receipt_date', prevStart.toISOString())
      .lt('receipt_date', currStart.toISOString())
      .eq('is_negative', false)

    // Current week batches
    const { data: currBatches } = await supabase
      .from('storage_batches')
      .select('item_id, cost_per_unit, initial_quantity')
      .gte('receipt_date', currStart.toISOString())
      .lte('receipt_date', currEnd.toISOString())
      .eq('is_negative', false)

    if (!prevBatches?.length || !currBatches?.length) return results

    // Get product names
    const allItemIds = [
      ...new Set([...prevBatches.map(b => b.item_id), ...currBatches.map(b => b.item_id)])
    ]
    const { data: products } = await supabase
      .from('products')
      .select('id, name, base_unit')
      .in('id', allItemIds)

    const productMap = new Map(products?.map(p => [p.id, p]) || [])

    const prevAvg = calcWeightedAverage(prevBatches, 'item_id')
    const currAvg = calcWeightedAverage(currBatches, 'item_id')

    // Compare items that exist in both weeks
    for (const [itemId, currCost] of currAvg) {
      const prevCost = prevAvg.get(itemId)
      if (!prevCost || prevCost <= 0) continue

      const percentChange = ((currCost - prevCost) / prevCost) * 100
      if (percentChange < WATCHDOG_THRESHOLDS.foodCost.warningPercent) continue

      const product = productMap.get(itemId)
      results.push({
        itemId,
        itemName: product?.name || itemId,
        itemType: 'product',
        unit: product?.base_unit || '',
        previousCost: Math.round(prevCost * 100) / 100,
        currentCost: Math.round(currCost * 100) / 100,
        percentChange: Math.round(percentChange),
        severity:
          percentChange >= WATCHDOG_THRESHOLDS.foodCost.criticalPercent ? 'critical' : 'warning'
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Product cost comparison failed', { error: err })
  }

  return results.sort((a, b) => b.percentChange - a.percentChange)
}

// =============================================
// PREPARATION COST COMPARISON
// =============================================

async function comparePreparationCosts(
  prevStart: Date,
  currStart: Date,
  currEnd: Date
): Promise<WeeklyCostChangeItem[]> {
  const results: WeeklyCostChangeItem[] = []

  try {
    const { data: prevBatches } = await supabase
      .from('preparation_batches')
      .select('preparation_id, cost_per_unit, initial_quantity')
      .gte('production_date', prevStart.toISOString())
      .lt('production_date', currStart.toISOString())
      .eq('is_negative', false)

    const { data: currBatches } = await supabase
      .from('preparation_batches')
      .select('preparation_id, cost_per_unit, initial_quantity')
      .gte('production_date', currStart.toISOString())
      .lte('production_date', currEnd.toISOString())
      .eq('is_negative', false)

    if (!prevBatches?.length || !currBatches?.length) return results

    const allPrepIds = [
      ...new Set([
        ...prevBatches.map(b => b.preparation_id),
        ...currBatches.map(b => b.preparation_id)
      ])
    ]
    const { data: preps } = await supabase
      .from('preparations')
      .select('id, name, unit')
      .in('id', allPrepIds)

    const prepMap = new Map(preps?.map(p => [p.id, p]) || [])

    const prevAvg = calcWeightedAverage(prevBatches, 'preparation_id')
    const currAvg = calcWeightedAverage(currBatches, 'preparation_id')

    for (const [prepId, currCost] of currAvg) {
      const prevCost = prevAvg.get(prepId)
      if (!prevCost || prevCost <= 0) continue

      const percentChange = ((currCost - prevCost) / prevCost) * 100
      if (percentChange < WATCHDOG_THRESHOLDS.foodCost.warningPercent) continue

      const prep = prepMap.get(prepId)
      results.push({
        itemId: prepId,
        itemName: prep?.name || prepId,
        itemType: 'preparation',
        unit: prep?.unit || '',
        previousCost: Math.round(prevCost * 100) / 100,
        currentCost: Math.round(currCost * 100) / 100,
        percentChange: Math.round(percentChange),
        severity:
          percentChange >= WATCHDOG_THRESHOLDS.foodCost.criticalPercent ? 'critical' : 'warning'
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Preparation cost comparison failed', { error: err })
  }

  return results.sort((a, b) => b.percentChange - a.percentChange)
}

// =============================================
// MENU ITEM FOOD COST COMPARISON
// =============================================

async function compareMenuItemCosts(
  prevStart: Date,
  currStart: Date,
  currEnd: Date
): Promise<WeeklyCostChangeItem[]> {
  const results: WeeklyCostChangeItem[] = []

  try {
    // Get average food cost per menu item from sales_transactions
    // actual_cost is JSONB with totalCost field
    const { data: prevSales } = await supabase
      .from('sales_transactions')
      .select('menu_item_id, menu_item_name, actual_cost')
      .gte('created_at', prevStart.toISOString())
      .lt('created_at', currStart.toISOString())
      .not('actual_cost', 'is', null)

    const { data: currSales } = await supabase
      .from('sales_transactions')
      .select('menu_item_id, menu_item_name, actual_cost')
      .gte('created_at', currStart.toISOString())
      .lte('created_at', currEnd.toISOString())
      .not('actual_cost', 'is', null)

    if (!prevSales?.length || !currSales?.length) return results

    const prevAvg = calcMenuItemAvgCost(prevSales)
    const currAvg = calcMenuItemAvgCost(currSales)

    // Get menu item names from current sales
    const nameMap = new Map<string, string>()
    for (const s of [...(prevSales || []), ...(currSales || [])]) {
      if (s.menu_item_id && s.menu_item_name) {
        nameMap.set(s.menu_item_id, s.menu_item_name)
      }
    }

    for (const [itemId, currCost] of currAvg) {
      const prevCost = prevAvg.get(itemId)
      if (!prevCost || prevCost <= 0) continue

      const percentChange = ((currCost - prevCost) / prevCost) * 100
      if (percentChange < WATCHDOG_THRESHOLDS.foodCost.warningPercent) continue

      results.push({
        itemId,
        itemName: nameMap.get(itemId) || itemId,
        itemType: 'menu_item',
        previousCost: Math.round(prevCost),
        currentCost: Math.round(currCost),
        percentChange: Math.round(percentChange),
        severity:
          percentChange >= WATCHDOG_THRESHOLDS.foodCost.criticalPercent ? 'critical' : 'warning'
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Menu item cost comparison failed', { error: err })
  }

  return results.sort((a, b) => b.percentChange - a.percentChange)
}

// =============================================
// HELPERS
// =============================================

function calcWeightedAverage(
  batches: Array<{ cost_per_unit: number; initial_quantity: number; [key: string]: any }>,
  groupKey: string
): Map<string, number> {
  const groups = new Map<string, { totalCost: number; totalQty: number }>()

  for (const batch of batches) {
    const id = batch[groupKey]
    const existing = groups.get(id) || { totalCost: 0, totalQty: 0 }
    const qty = Number(batch.initial_quantity)
    const cost = Number(batch.cost_per_unit)
    existing.totalCost += cost * qty
    existing.totalQty += qty
    groups.set(id, existing)
  }

  const result = new Map<string, number>()
  for (const [id, data] of groups) {
    if (data.totalQty > 0) {
      result.set(id, data.totalCost / data.totalQty)
    }
  }
  return result
}

function calcMenuItemAvgCost(
  sales: Array<{ menu_item_id: string; actual_cost: any }>
): Map<string, number> {
  const groups = new Map<string, { totalCost: number; count: number }>()

  for (const sale of sales) {
    if (!sale.menu_item_id || !sale.actual_cost) continue

    const totalCost = typeof sale.actual_cost === 'object' ? sale.actual_cost.totalCost || 0 : 0

    if (totalCost <= 0) continue

    const existing = groups.get(sale.menu_item_id) || { totalCost: 0, count: 0 }
    existing.totalCost += Number(totalCost)
    existing.count++
    groups.set(sale.menu_item_id, existing)
  }

  const result = new Map<string, number>()
  for (const [id, data] of groups) {
    if (data.count > 0) {
      result.set(id, data.totalCost / data.count)
    }
  }
  return result
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Monday as start of week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
