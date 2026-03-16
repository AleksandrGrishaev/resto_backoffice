// src/core/watchdog/checkers/cancellationChecker.ts
// Tracks cancellations of non-draft items within a shift
// These represent real food cost losses — ingredients used but not sold

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { WATCHDOG_THRESHOLDS } from '../types'

const MODULE_NAME = 'WatchdogCancellationChecker'

export interface CancelledItemRecord {
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  reason: string
  cancelledBy: string
  orderId: string
  orderNumber: string
}

export interface CancellationShiftSummary {
  shiftId: string
  totalCancelled: number
  estimatedLoss: number
  items: CancelledItemRecord[]
  byCancelledBy: Record<string, { count: number; loss: number }>
  byReason: Record<string, { count: number; loss: number }>
}

/**
 * Check cancellation thresholds for a shift.
 * All cancelled items in DB are non-draft (draft items are deleted, not cancelled).
 */
export async function checkCancellationThreshold(
  shiftId: string,
  previousCount?: number
): Promise<{ shouldAlert: boolean; summary: CancellationShiftSummary | null }> {
  try {
    const { data: shift } = await supabase
      .from('shifts')
      .select('id, started_at, ended_at')
      .eq('id', shiftId)
      .single()

    if (!shift) {
      return { shouldAlert: false, summary: null }
    }

    const startTime = shift.started_at
    const endTime = shift.ended_at || new Date().toISOString()

    const { data: cancelledItems, error } = await supabase
      .from('order_items')
      .select(
        `
        id, menu_item_name, quantity, unit_price, total_price,
        cancellation_reason, cancelled_by, cancelled_at,
        order_id,
        orders!inner(order_number)
      `
      )
      .eq('status', 'cancelled')
      .not('cancelled_at', 'is', null)
      .gte('cancelled_at', startTime)
      .lte('cancelled_at', endTime)
      .order('total_price', { ascending: false })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to query cancelled items', { error })
      return { shouldAlert: false, summary: null }
    }

    if (!cancelledItems || cancelledItems.length === 0) {
      return { shouldAlert: false, summary: null }
    }

    const items: CancelledItemRecord[] = cancelledItems.map((item: any) => ({
      itemName: item.menu_item_name,
      quantity: item.quantity,
      unitPrice: item.unit_price || 0,
      totalPrice: item.total_price || 0,
      reason: item.cancellation_reason || 'unknown',
      cancelledBy: item.cancelled_by || 'unknown',
      orderId: item.order_id,
      orderNumber: item.orders?.order_number || ''
    }))

    const estimatedLoss = items.reduce((sum, i) => sum + i.totalPrice, 0)

    // Group by person
    const byCancelledBy: Record<string, { count: number; loss: number }> = {}
    for (const item of items) {
      if (!byCancelledBy[item.cancelledBy]) {
        byCancelledBy[item.cancelledBy] = { count: 0, loss: 0 }
      }
      byCancelledBy[item.cancelledBy].count++
      byCancelledBy[item.cancelledBy].loss += item.totalPrice
    }

    // Group by reason
    const byReason: Record<string, { count: number; loss: number }> = {}
    for (const item of items) {
      if (!byReason[item.reason]) {
        byReason[item.reason] = { count: 0, loss: 0 }
      }
      byReason[item.reason].count++
      byReason[item.reason].loss += item.totalPrice
    }

    const summary: CancellationShiftSummary = {
      shiftId,
      totalCancelled: items.length,
      estimatedLoss,
      items,
      byCancelledBy,
      byReason
    }

    const { warningCount, criticalLoss } = WATCHDOG_THRESHOLDS.cancellation

    // Dedup: only alert when crossing a threshold for the first time
    const prev = previousCount ?? 0
    const crossedCountThreshold = prev < warningCount && items.length >= warningCount
    const crossedLossThreshold = estimatedLoss >= criticalLoss

    const shouldAlert = crossedCountThreshold || crossedLossThreshold

    return { shouldAlert, summary }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Cancellation check failed', { error: err })
    return { shouldAlert: false, summary: null }
  }
}

/**
 * Generate cancellation summary for shift report.
 */
export async function generateShiftCancellationSummary(
  shiftId: string
): Promise<CancellationShiftSummary | null> {
  const { summary } = await checkCancellationThreshold(shiftId)
  return summary
}
