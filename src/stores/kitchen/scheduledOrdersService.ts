// src/stores/kitchen/scheduledOrdersService.ts
// Service that monitors scheduled orders and transitions them to 'waiting'
// when it's time to start cooking (pickup_time - LEAD_TIME_MINUTES)

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ScheduledOrdersService'

// How many minutes before pickup time to send items to kitchen
const LEAD_TIME_MINUTES = 30

// Check interval (every 60 seconds)
const CHECK_INTERVAL_MS = 60_000

// Jakarta timezone for pickup time parsing
const JAKARTA_TZ = 'Asia/Jakarta'

/**
 * Parse 'HH:MM' pickup time string into today's Date in Jakarta timezone.
 * If the parsed time is more than 6 hours in the past, assume it's for tomorrow
 * (handles cross-midnight orders, e.g., created at 23:00 for 01:00 pickup).
 */
function parsePickupTimeToday(pickupTime: string): Date | null {
  const match = pickupTime.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null

  // Get current date/time in Jakarta timezone using Intl for reliability
  const now = getNowJakarta()
  const pickupDate = new Date(now)
  pickupDate.setHours(hours, minutes, 0, 0)

  // Cross-midnight: if pickup time is >6 hours in the past, assume tomorrow
  const diffMs = pickupDate.getTime() - now.getTime()
  if (diffMs < -6 * 60 * 60_000) {
    pickupDate.setDate(pickupDate.getDate() + 1)
  }

  return pickupDate
}

/**
 * Get current time in Jakarta timezone using Intl.DateTimeFormat (reliable cross-browser)
 */
function getNowJakarta(): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: JAKARTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const parts = formatter.formatToParts(new Date())
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0'

  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  )
}

/**
 * Calculate minutes until kitchen should start cooking
 * Returns negative value if overdue
 */
export function getMinutesUntilKitchenStart(pickupTime: string): number | null {
  const pickupDate = parsePickupTimeToday(pickupTime)
  if (!pickupDate) return null

  const kitchenStartTime = new Date(pickupDate.getTime() - LEAD_TIME_MINUTES * 60_000)
  const now = getNowJakarta()

  return Math.round((kitchenStartTime.getTime() - now.getTime()) / 60_000)
}

/**
 * Format countdown for UI display
 */
export function formatCountdown(pickupTime: string): {
  label: string
  minutes: number
  isOverdue: boolean
  isUrgent: boolean
} {
  const minutesUntilStart = getMinutesUntilKitchenStart(pickupTime)

  if (minutesUntilStart === null) {
    return { label: `Pickup: ${pickupTime}`, minutes: 0, isOverdue: false, isUrgent: false }
  }

  if (minutesUntilStart <= 0) {
    return {
      label: `Overdue by ${Math.abs(minutesUntilStart)} min`,
      minutes: minutesUntilStart,
      isOverdue: true,
      isUrgent: true
    }
  }

  if (minutesUntilStart <= 5) {
    return {
      label: `Starts in ${minutesUntilStart} min`,
      minutes: minutesUntilStart,
      isOverdue: false,
      isUrgent: true
    }
  }

  return {
    label: `Starts in ${minutesUntilStart} min`,
    minutes: minutesUntilStart,
    isOverdue: false,
    isUrgent: false
  }
}

// Singleton state
const intervalId = ref<ReturnType<typeof setInterval> | null>(null)
const isRunning = ref(false)
const lastTransitionedOrders = ref<string[]>([])

/**
 * Start the scheduled orders monitoring service
 */
export function startScheduledOrdersService() {
  if (isRunning.value) {
    DebugUtils.debug(MODULE_NAME, 'Service already running')
    return
  }

  DebugUtils.info(MODULE_NAME, 'Starting scheduled orders service', {
    leadTimeMinutes: LEAD_TIME_MINUTES,
    checkIntervalMs: CHECK_INTERVAL_MS
  })

  isRunning.value = true

  // Run immediately on start
  checkAndTransitionScheduledItems()

  // Then check periodically
  intervalId.value = setInterval(() => {
    checkAndTransitionScheduledItems()
  }, CHECK_INTERVAL_MS)
}

/**
 * Stop the scheduled orders monitoring service
 */
export function stopScheduledOrdersService() {
  if (intervalId.value) {
    clearInterval(intervalId.value)
    intervalId.value = null
  }
  isRunning.value = false
  lastTransitionedOrders.value = []
  DebugUtils.info(MODULE_NAME, 'Scheduled orders service stopped')
}

/**
 * Check all scheduled items and transition to 'waiting' if it's time
 */
async function checkAndTransitionScheduledItems() {
  const posOrdersStore = usePosOrdersStore()
  const now = getNowJakarta()
  const transitioned: string[] = []

  for (const order of posOrdersStore.orders) {
    // Only process orders with scheduled pickup time
    if (!order.pickupTime || order.pickupTime === 'asap') continue

    const pickupDate = parsePickupTimeToday(order.pickupTime)
    if (!pickupDate) continue

    const kitchenStartTime = new Date(pickupDate.getTime() - LEAD_TIME_MINUTES * 60_000)

    // Check if it's time to send to kitchen
    if (now.getTime() >= kitchenStartTime.getTime()) {
      // Find all scheduled items in this order
      for (const bill of order.bills) {
        for (const item of bill.items) {
          if (item.status === 'scheduled') {
            const success = await transitionItemToWaiting(order.id, item.id, order.orderNumber)
            if (success) {
              transitioned.push(`${order.orderNumber}:${item.menuItemName}`)
            }
          }
        }
      }
    }
  }

  if (transitioned.length > 0) {
    lastTransitionedOrders.value = transitioned
    DebugUtils.info(MODULE_NAME, 'Transitioned scheduled items to waiting', {
      count: transitioned.length,
      items: transitioned
    })
  }
}

/**
 * Transition a single item from 'scheduled' to 'waiting'
 * Updates both DB and local state for immediate UI response
 */
async function transitionItemToWaiting(
  orderId: string,
  itemId: string,
  orderNumber: string
): Promise<boolean> {
  try {
    const nowISO = new Date().toISOString()

    const { error } = await supabase
      .from('order_items')
      .update({
        status: 'waiting',
        sent_to_kitchen_at: nowISO,
        updated_at: nowISO
      })
      .eq('id', itemId)
      .eq('status', 'scheduled') // Safety: only transition if still scheduled

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to transition item', {
        orderId,
        itemId,
        error: error.message
      })
      return false
    }

    // Update local state immediately (don't wait for realtime)
    const posOrdersStore = usePosOrdersStore()
    const order = posOrdersStore.orders.find(o => o.id === orderId)
    if (order) {
      for (const bill of order.bills) {
        const item = bill.items.find(i => i.id === itemId)
        if (item && item.status === 'scheduled') {
          item.status = 'waiting'
          item.sentToKitchenAt = nowISO
          break
        }
      }
    }

    DebugUtils.info(MODULE_NAME, 'Item transitioned to waiting', {
      orderNumber,
      itemId
    })
    return true
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Exception transitioning item', { orderId, itemId, err })
    return false
  }
}

/**
 * Manually send all scheduled items in an order to kitchen immediately
 */
export async function sendOrderNow(orderId: string): Promise<{
  success: boolean
  count: number
  error?: string
}> {
  const posOrdersStore = usePosOrdersStore()
  const order = posOrdersStore.orders.find(o => o.id === orderId)

  if (!order) {
    return { success: false, count: 0, error: 'Order not found' }
  }

  let successCount = 0
  let lastError: string | undefined

  for (const bill of order.bills) {
    for (const item of bill.items) {
      if (item.status === 'scheduled') {
        const success = await transitionItemToWaiting(orderId, item.id, order.orderNumber)
        if (success) {
          successCount++
        } else {
          lastError = `Failed to transition item ${item.menuItemName}`
        }
      }
    }
  }

  if (successCount > 0) {
    DebugUtils.info(MODULE_NAME, 'Order manually sent to kitchen', {
      orderNumber: order.orderNumber,
      itemsTransitioned: successCount
    })
  }

  return {
    success: successCount > 0,
    count: successCount,
    error: lastError
  }
}

export { isRunning, lastTransitionedOrders }
