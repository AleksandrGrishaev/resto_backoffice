// src/stores/pos/orders/composables/useOnlineOrderAlerts.ts
// Manages persistent alerts for online orders that need POS attention:
// - New online orders (source='website', not yet acknowledged)
// - Existing orders where customer added new items (draft items on non-draft order)
// Provides: repeating sound every 20s, blinking order IDs for sidebar UI

import { ref, computed, watch } from 'vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'OnlineOrderAlerts'
const SOUND_INTERVAL_MS = 20_000 // 20 seconds

// Singleton state (shared across all users of this composable)
const unacknowledgedOrderIds = ref<Set<string>>(new Set())
const ordersWithPendingItems = ref<Set<string>>(new Set())
let soundInterval: ReturnType<typeof setInterval> | null = null
let playSound: (() => void) | null = null

/**
 * Combined set of order IDs that need attention (blinking + sound)
 */
const alertOrderIds = computed<Set<string>>(() => {
  const combined = new Set<string>()
  unacknowledgedOrderIds.value.forEach(id => combined.add(id))
  ordersWithPendingItems.value.forEach(id => combined.add(id))
  return combined
})

const hasActiveAlerts = computed(() => alertOrderIds.value.size > 0)

/**
 * Register the sound player function (called from useOrdersRealtime)
 */
function registerSoundPlayer(fn: () => void) {
  playSound = fn
}

/**
 * Start the repeating sound loop
 */
function startSoundLoop() {
  if (soundInterval) return
  DebugUtils.info(MODULE_NAME, '🔊 Starting 20s alert sound loop')
  soundInterval = setInterval(() => {
    if (hasActiveAlerts.value && playSound) {
      playSound()
    }
  }, SOUND_INTERVAL_MS)
}

/**
 * Stop the repeating sound loop
 */
function stopSoundLoop() {
  if (soundInterval) {
    clearInterval(soundInterval)
    soundInterval = null
    DebugUtils.info(MODULE_NAME, '🔇 Stopped alert sound loop')
  }
}

// Auto-start/stop sound loop based on active alerts
watch(hasActiveAlerts, has => {
  if (has) {
    startSoundLoop()
  } else {
    stopSoundLoop()
  }
})

/**
 * Mark an order as needing attention (new online order or items changed)
 */
function markOrderUnacknowledged(orderId: string) {
  const newSet = new Set(unacknowledgedOrderIds.value)
  newSet.add(orderId)
  unacknowledgedOrderIds.value = newSet
  DebugUtils.info(MODULE_NAME, '🔔 Order marked as unacknowledged', {
    orderId,
    totalAlerts: newSet.size
  })
}

/**
 * Mark an order as having new pending items (customer added items to active order)
 */
function markOrderHasPendingItems(orderId: string) {
  const newSet = new Set(ordersWithPendingItems.value)
  newSet.add(orderId)
  ordersWithPendingItems.value = newSet
  DebugUtils.info(MODULE_NAME, '🔔 Order has pending new items', { orderId })
}

/**
 * Acknowledge an order — clears both unacknowledged and pending-items alerts.
 * Called when POS staff selects/opens the order.
 */
function acknowledgeOrder(orderId: string) {
  let changed = false

  if (unacknowledgedOrderIds.value.has(orderId)) {
    const newSet = new Set(unacknowledgedOrderIds.value)
    newSet.delete(orderId)
    unacknowledgedOrderIds.value = newSet
    changed = true
  }

  if (ordersWithPendingItems.value.has(orderId)) {
    const newSet = new Set(ordersWithPendingItems.value)
    newSet.delete(orderId)
    ordersWithPendingItems.value = newSet
    changed = true
  }

  if (changed) {
    DebugUtils.info(MODULE_NAME, '✅ Order acknowledged', {
      orderId,
      remainingAlerts: alertOrderIds.value.size
    })
  }
}

/**
 * Check if an order is currently alerting
 */
function isOrderAlerting(orderId: string): boolean {
  return alertOrderIds.value.has(orderId)
}

/**
 * Cleanup — stop sound loop and clear all state
 */
function destroy() {
  stopSoundLoop()
  unacknowledgedOrderIds.value = new Set()
  ordersWithPendingItems.value = new Set()
  playSound = null
}

export function useOnlineOrderAlerts() {
  return {
    alertOrderIds,
    hasActiveAlerts,
    markOrderUnacknowledged,
    markOrderHasPendingItems,
    acknowledgeOrder,
    isOrderAlerting,
    registerSoundPlayer,
    destroy
  }
}
