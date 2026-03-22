// src/core/watchdog/WatchdogService.ts
// Main watchdog service - coordinates all checkers and creates alerts

import { DebugUtils } from '@/utils'
import { useAlertsStore } from '@/stores/alerts/alertsStore'
import { formatIDR } from '@/utils'
import { checkReceiptPrices } from './checkers/receiptChecker'
import { checkPrepCosts } from './checkers/prepChecker'
import { checkReceiptQuantities, checkPrepQuantities } from './checkers/quantityChecker'
import { generateWeeklyCostReport } from './checkers/weeklyReportChecker'
import {
  checkCancellationThreshold,
  generateShiftCancellationSummary
} from './checkers/cancellationChecker'
import { WATCHDOG_THRESHOLDS } from './types'
import type { PriceCheckResult, PrepCostCheckResult, WeeklyCostReport } from './types'
import type { QuantityCheckResult } from './checkers/quantityChecker'
import type { CancellationShiftSummary } from './checkers/cancellationChecker'

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
    const alertsStore = useAlertsStore()

    // Check price spikes
    const spikes = await checkReceiptPrices(items, context)
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

    // Check quantity anomalies
    const qtyAnomalies = await checkReceiptQuantities(items, context.responsiblePerson)
    for (const anomaly of qtyAnomalies) {
      await alertsStore.createAlert({
        category: 'product',
        type: 'quantity_anomaly',
        severity: anomaly.severity,
        title: `Quantity anomaly: ${anomaly.itemName} ${anomaly.multiplier}x average`,
        description: buildQuantityAnomalyDescription(anomaly),
        metadata: {
          itemId: anomaly.itemId,
          itemName: anomaly.itemName,
          unit: anomaly.unit,
          newQuantity: anomaly.newQuantity,
          averageQuantity: anomaly.averageQuantity,
          maxHistoricalQuantity: anomaly.maxHistoricalQuantity,
          multiplier: anomaly.multiplier,
          reason: anomaly.reason,
          responsiblePerson: anomaly.responsiblePerson,
          source: 'receipt'
        }
      })
    }

    const totalAlerts = spikes.length + qtyAnomalies.length
    if (totalAlerts > 0) {
      DebugUtils.info(MODULE_NAME, `Created ${totalAlerts} receipt alert(s)`, {
        priceSpikes: spikes.length,
        quantityAnomalies: qtyAnomalies.length
      })
    }
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
    const alertsStore = useAlertsStore()

    // Check cost spikes
    const spikes = await checkPrepCosts(items, responsiblePerson)
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

    // Check quantity anomalies
    const qtyAnomalies = await checkPrepQuantities(
      items.map(i => ({
        preparationId: i.preparationId,
        preparationName: i.preparationName,
        quantity: i.quantity,
        unit: i.unit
      })),
      responsiblePerson
    )
    for (const anomaly of qtyAnomalies) {
      await alertsStore.createAlert({
        category: 'product',
        type: 'quantity_anomaly',
        severity: anomaly.severity,
        title: `Quantity anomaly: ${anomaly.itemName} ${anomaly.multiplier}x average`,
        description: buildQuantityAnomalyDescription(anomaly),
        metadata: {
          itemId: anomaly.itemId,
          itemName: anomaly.itemName,
          unit: anomaly.unit,
          newQuantity: anomaly.newQuantity,
          averageQuantity: anomaly.averageQuantity,
          maxHistoricalQuantity: anomaly.maxHistoricalQuantity,
          multiplier: anomaly.multiplier,
          reason: anomaly.reason,
          responsiblePerson: anomaly.responsiblePerson,
          source: 'production'
        }
      })
    }

    const totalAlerts = spikes.length + qtyAnomalies.length
    if (totalAlerts > 0) {
      DebugUtils.info(MODULE_NAME, `Created ${totalAlerts} prep alert(s)`, {
        costSpikes: spikes.length,
        quantityAnomalies: qtyAnomalies.length
      })
    }
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
// CANCELLATION WATCHDOG
// =============================================

// Track last alerted count per shift for deduplication
const _lastAlertedCount: Record<string, number> = {}

/**
 * Run after a prepared item (cooking/ready) is cancelled.
 * Checks if cancellation thresholds are exceeded for the current shift.
 * Non-blocking — errors are logged but don't affect the cancellation.
 */
export async function onItemCancelled(
  shiftId: string,
  itemName: string,
  cancelledBy: string
): Promise<void> {
  try {
    const previousCount = _lastAlertedCount[shiftId] ?? 0
    const { shouldAlert, summary } = await checkCancellationThreshold(shiftId, previousCount)

    if (shouldAlert && summary) {
      _lastAlertedCount[shiftId] = summary.totalCancelled

      const alertsStore = useAlertsStore()
      const { criticalLoss } = WATCHDOG_THRESHOLDS.cancellation
      const severity = summary.estimatedLoss >= criticalLoss ? 'critical' : 'warning'

      await alertsStore.createAlert({
        category: 'product',
        type: 'high_cancellation',
        severity,
        title: `High cancellations: ${summary.totalCancelled} items (${formatIDR(summary.estimatedLoss)} loss)`,
        description: buildCancellationAlertDescription(summary),
        metadata: {
          shiftId,
          totalCancelled: summary.totalCancelled,
          estimatedLoss: summary.estimatedLoss,
          byCancelledBy: summary.byCancelledBy,
          byReason: summary.byReason,
          lastItem: itemName,
          lastCancelledBy: cancelledBy
        }
      })

      DebugUtils.info(MODULE_NAME, 'Cancellation alert created', {
        totalCancelled: summary.totalCancelled,
        estimatedLoss: summary.estimatedLoss
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'onItemCancelled watchdog failed', { error: err })
  }
}

/**
 * Get cancellation summary for shift report.
 * Returns null if no cancellations in this shift.
 */
export async function getShiftCancellationSummary(
  shiftId: string
): Promise<CancellationShiftSummary | null> {
  return generateShiftCancellationSummary(shiftId)
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

function buildQuantityAnomalyDescription(anomaly: QuantityCheckResult): string {
  const lines = [
    `"${anomaly.itemName}" quantity: ${anomaly.newQuantity}${anomaly.unit}`,
    `Average: ${anomaly.averageQuantity}${anomaly.unit} | Max seen: ${anomaly.maxHistoricalQuantity}${anomaly.unit}`,
    `${anomaly.multiplier}x the average quantity`
  ]
  if (anomaly.responsiblePerson) {
    lines.push(`Responsible: ${anomaly.responsiblePerson}`)
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

function buildCancellationAlertDescription(summary: CancellationShiftSummary): string {
  const lines = [
    `Prepared items cancelled: ${summary.preparedCancelled}`,
    `Estimated loss: ${formatIDR(summary.estimatedLoss)}`,
    `Total cancellations (incl. draft): ${summary.totalCancelled}`
  ]

  // By person
  const people = Object.entries(summary.byCancelledBy)
  if (people.length > 0) {
    lines.push('--- By Staff ---')
    for (const [person, stats] of people) {
      lines.push(`  ${person}: ${stats.count} items, ${formatIDR(stats.loss)} loss`)
    }
  }

  // By reason
  const reasons = Object.entries(summary.byReason)
  if (reasons.length > 0) {
    lines.push('--- By Reason ---')
    for (const [reason, stats] of reasons) {
      lines.push(`  ${reason}: ${stats.count} items, ${formatIDR(stats.loss)}`)
    }
  }

  // Top items
  const topItems = summary.items.slice(0, 5)
  if (topItems.length > 0) {
    lines.push('--- Recent Items ---')
    for (const item of topItems) {
      lines.push(
        `  ${item.itemName} x${item.quantity} (${formatIDR(item.totalPrice)}) — ${item.reason}`
      )
    }
  }

  return lines.join('\n')
}
