// src/stores/pos/shifts/composables/useCancellationStats.ts
import { computed } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { CANCELLATION_REASON_OPTIONS } from '@/stores/pos/types'
import type { PosOrder } from '@/stores/pos/types'
import type { PosShift } from '@/stores/pos/shifts/types'
import type { ShiftCancellationStats, ShiftCancellationDetail } from '@/stores/pos/shifts/types'

/**
 * Get label for a cancellation reason value
 */
function getReasonLabel(reason: string): string {
  const option = CANCELLATION_REASON_OPTIONS.find(o => o.value === reason)
  return option?.label || reason
}

/**
 * Build cancellation stats from orders in a shift period
 */
function buildCancellationStats(
  orders: PosOrder[],
  shiftStartTime: string,
  shiftEndTime?: string
): ShiftCancellationStats {
  const details: ShiftCancellationDetail[] = []
  const reasonMap = new Map<string, { count: number; amount: number }>()

  const shiftStart = new Date(shiftStartTime).getTime()
  const shiftEnd = shiftEndTime ? new Date(shiftEndTime).getTime() : Date.now()

  // Filter orders created during this shift
  const shiftOrders = orders.filter(order => {
    const orderTime = new Date(order.createdAt).getTime()
    return orderTime >= shiftStart && orderTime <= shiftEnd
  })

  let cancelledOrdersCount = 0
  let cancelledItemsCount = 0
  let totalCancelledAmount = 0

  for (const order of shiftOrders) {
    const allItems = order.bills.flatMap(b => b.items)

    if (order.status === 'cancelled') {
      // Fully cancelled order
      cancelledOrdersCount++
      const orderAmount = order.finalAmount || order.totalAmount || 0
      totalCancelledAmount += orderAmount

      const reason = order.cancellationReason || 'other'

      details.push({
        type: 'order',
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderType: order.type,
        reason,
        reasonLabel: getReasonLabel(reason),
        notes: order.cancellationReason,
        cancelledAt: order.updatedAt,
        cancelledBy: order.cancellationResolvedBy,
        statusBeforeCancel: 'order',
        hadWriteOff: allItems.some(i => !!i.writeOffOperationId || !!i.recipeWriteOffId),
        totalAmount: orderAmount
      })

      // Aggregate reason
      const existing = reasonMap.get(reason) || { count: 0, amount: 0 }
      existing.count++
      existing.amount += orderAmount
      reasonMap.set(reason, existing)
    } else {
      // Check for individually cancelled items in non-cancelled orders
      for (const item of allItems) {
        if (item.status === 'cancelled') {
          cancelledItemsCount++
          const itemAmount = item.totalPrice // totalPrice already includes quantity
          totalCancelledAmount += itemAmount

          const reason = item.cancellationReason || 'other'

          details.push({
            type: 'item',
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderType: order.type,
            itemName: item.menuItemName,
            quantity: item.quantity,
            itemPrice: item.totalPrice,
            reason,
            reasonLabel: getReasonLabel(reason),
            notes: item.cancellationNotes,
            cancelledAt: item.cancelledAt || order.updatedAt,
            cancelledBy: item.cancelledBy,
            statusBeforeCancel: 'item',
            hadWriteOff: !!item.writeOffOperationId || !!item.recipeWriteOffId,
            totalAmount: itemAmount
          })

          // Aggregate reason
          const existing = reasonMap.get(reason) || { count: 0, amount: 0 }
          existing.count++
          existing.amount += itemAmount
          reasonMap.set(reason, existing)
        }
      }
    }
  }

  // Build reason breakdown sorted by count
  const reasonBreakdown = Array.from(reasonMap.entries())
    .map(([reason, data]) => ({
      reason,
      label: getReasonLabel(reason),
      count: data.count,
      amount: data.amount
    }))
    .sort((a, b) => b.count - a.count)

  // Sort details by time (newest first)
  details.sort((a, b) => new Date(b.cancelledAt).getTime() - new Date(a.cancelledAt).getTime())

  return {
    cancelledOrdersCount,
    cancelledItemsCount,
    totalCancelledAmount,
    reasonBreakdown,
    details
  }
}

/**
 * Composable to compute cancellation stats for a shift
 */
export function useCancellationStats(shift: () => PosShift | null) {
  const ordersStore = usePosOrdersStore()

  const cancellationStats = computed<ShiftCancellationStats>(() => {
    const currentShift = shift()
    if (!currentShift) {
      return {
        cancelledOrdersCount: 0,
        cancelledItemsCount: 0,
        totalCancelledAmount: 0,
        reasonBreakdown: [],
        details: []
      }
    }

    return buildCancellationStats(ordersStore.orders, currentShift.startTime, currentShift.endTime)
  })

  const hasCancellations = computed(() => cancellationStats.value.totalCancelledAmount > 0)

  return {
    cancellationStats,
    hasCancellations
  }
}
