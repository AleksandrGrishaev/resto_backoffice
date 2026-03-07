// src/core/watchdog/WatchdogService.ts
// Main watchdog service - coordinates all checkers and creates alerts

import { DebugUtils } from '@/utils'
import { useAlertsStore } from '@/stores/alerts/alertsStore'
import { formatIDR } from '@/utils'
import { checkReceiptPrices } from './checkers/receiptChecker'
import { checkPrepCosts } from './checkers/prepChecker'
import { generateWeeklyCostReport } from './checkers/weeklyReportChecker'
import type { PriceCheckResult, PrepCostCheckResult, WeeklyCostReport } from './types'

const MODULE_NAME = 'WatchdogService'

// =============================================
// RECEIPT WATCHDOG
// =============================================

interface WatchdogReceiptItem {
  itemId: string
  itemName: string
  costPerUnit: number
  unit: string
  quantity: number
}

interface WatchdogReceiptContext {
  responsiblePerson?: string
  supplierId?: string
  supplierName?: string
}

/**
 * Run after a product receipt is created.
 * Checks all items for price spikes and creates alerts.
 * Non-blocking — errors are logged but don't affect the receipt.
 */
export async function onReceiptCreated(
  items: WatchdogReceiptItem[],
  context: WatchdogReceiptContext
): Promise<void> {
  try {
    const spikes = await checkReceiptPrices(items, context)
    if (spikes.length === 0) return

    const alertsStore = useAlertsStore()

    for (const spike of spikes) {
      await alertsStore.createAlert({
        category: 'product',
        type: 'price_spike',
        severity: spike.severity,
        title: `Price spike: ${spike.itemName} +${spike.percentChange}%`,
        description: buildPriceSpikeDescription(spike),
        metadata: {
          itemId: spike.itemId,
          itemName: spike.itemName,
          unit: spike.unit,
          newCostPerUnit: spike.newCostPerUnit,
          averageCostPerUnit: spike.averageCostPerUnit,
          percentChange: spike.percentChange,
          batchCount: spike.batchCount,
          responsiblePerson: spike.responsiblePerson,
          supplierId: spike.supplierId,
          supplierName: spike.supplierName
        }
      })
    }

    DebugUtils.info(MODULE_NAME, `Created ${spikes.length} price spike alert(s)`)
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'onReceiptCreated watchdog failed', { error: err })
  }
}

// =============================================
// PREPARATION WATCHDOG
// =============================================

interface WatchdogPrepItem {
  preparationId: string
  preparationName: string
  costPerUnit: number
  unit: string
  quantity: number
}

/**
 * Run after preparation batches are created.
 * Checks for cost spikes in semi-finished products.
 */
export async function onPreparationCreated(
  items: WatchdogPrepItem[],
  responsiblePerson?: string
): Promise<void> {
  try {
    const spikes = await checkPrepCosts(items, responsiblePerson)
    if (spikes.length === 0) return

    const alertsStore = useAlertsStore()

    for (const spike of spikes) {
      await alertsStore.createAlert({
        category: 'product',
        type: 'prep_cost_spike',
        severity: spike.severity,
        title: `Prep cost spike: ${spike.preparationName} +${spike.percentChange}%`,
        description: buildPrepCostDescription(spike),
        metadata: {
          preparationId: spike.preparationId,
          preparationName: spike.preparationName,
          unit: spike.unit,
          newCostPerUnit: spike.newCostPerUnit,
          previousCostPerUnit: spike.previousCostPerUnit,
          percentChange: spike.percentChange,
          responsiblePerson: spike.responsiblePerson
        }
      })
    }

    DebugUtils.info(MODULE_NAME, `Created ${spikes.length} prep cost spike alert(s)`)
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'onPreparationCreated watchdog failed', { error: err })
  }
}

// =============================================
// WEEKLY REPORT
// =============================================

/**
 * Generate and create a weekly cost report alert.
 * Should be called once per week (e.g., on Monday or manually).
 */
export async function createWeeklyReport(): Promise<WeeklyCostReport | null> {
  try {
    const report = await generateWeeklyCostReport()

    if (report.totalItemsAffected === 0) {
      DebugUtils.info(MODULE_NAME, 'Weekly report: no cost changes detected')
      return report
    }

    const alertsStore = useAlertsStore()

    const severity = report.criticalCount > 0 ? 'critical' : 'warning'

    await alertsStore.createAlert({
      category: 'product',
      type: 'weekly_cost_report',
      severity,
      title: `Weekly Cost Report: ${report.totalItemsAffected} items changed`,
      description: buildWeeklyReportDescription(report),
      metadata: {
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        totalItemsAffected: report.totalItemsAffected,
        criticalCount: report.criticalCount,
        warningCount: report.warningCount,
        products: report.products,
        preparations: report.preparations,
        menuItems: report.menuItems
      }
    })

    DebugUtils.info(MODULE_NAME, 'Weekly cost report alert created', {
      total: report.totalItemsAffected,
      critical: report.criticalCount
    })

    return report
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Weekly report generation failed', { error: err })
    return null
  }
}

// =============================================
// DESCRIPTION BUILDERS
// =============================================

function buildPriceSpikeDescription(spike: PriceCheckResult): string {
  const lines = [
    `Product "${spike.itemName}" received at ${formatIDR(spike.newCostPerUnit)}/${spike.unit}`,
    `Average price (last ${spike.batchCount} batches): ${formatIDR(spike.averageCostPerUnit)}/${spike.unit}`,
    `Change: +${spike.percentChange}%`
  ]
  if (spike.responsiblePerson) {
    lines.push(`Responsible: ${spike.responsiblePerson}`)
  }
  if (spike.supplierName) {
    lines.push(`Supplier: ${spike.supplierName}`)
  }
  return lines.join('\n')
}

function buildPrepCostDescription(spike: PrepCostCheckResult): string {
  const lines = [
    `Preparation "${spike.preparationName}" produced at ${formatIDR(spike.newCostPerUnit)}/${spike.unit}`,
    `Previous average: ${formatIDR(spike.previousCostPerUnit)}/${spike.unit}`,
    `Change: +${spike.percentChange}%`
  ]
  if (spike.responsiblePerson) {
    lines.push(`Responsible: ${spike.responsiblePerson}`)
  }
  return lines.join('\n')
}

function buildWeeklyReportDescription(report: WeeklyCostReport): string {
  const lines: string[] = []

  if (report.products.length > 0) {
    lines.push(`--- Products (${report.products.length}) ---`)
    for (const item of report.products.slice(0, 10)) {
      lines.push(
        `  ${item.itemName}: ${formatIDR(item.previousCost)} -> ${formatIDR(item.currentCost)} (+${item.percentChange}%)`
      )
    }
    if (report.products.length > 10) {
      lines.push(`  ... and ${report.products.length - 10} more`)
    }
  }

  if (report.preparations.length > 0) {
    lines.push(`--- Preparations (${report.preparations.length}) ---`)
    for (const item of report.preparations.slice(0, 10)) {
      lines.push(
        `  ${item.itemName}: ${formatIDR(item.previousCost)} -> ${formatIDR(item.currentCost)} (+${item.percentChange}%)`
      )
    }
    if (report.preparations.length > 10) {
      lines.push(`  ... and ${report.preparations.length - 10} more`)
    }
  }

  if (report.menuItems.length > 0) {
    lines.push(`--- Menu Items (${report.menuItems.length}) ---`)
    for (const item of report.menuItems.slice(0, 10)) {
      lines.push(
        `  ${item.itemName}: ${formatIDR(item.previousCost)} -> ${formatIDR(item.currentCost)} (+${item.percentChange}%)`
      )
    }
    if (report.menuItems.length > 10) {
      lines.push(`  ... and ${report.menuItems.length - 10} more`)
    }
  }

  return lines.join('\n')
}
