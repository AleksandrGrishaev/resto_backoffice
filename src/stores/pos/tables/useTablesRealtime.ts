// src/stores/pos/tables/useTablesRealtime.ts
// POS Tables Realtime Composable - Subscribe to table status changes

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import { usePosTablesStore } from './tablesStore'
import { mapStatusFromSupabase } from './supabaseMappers'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'POSTablesRealtime'

/**
 * POS Tables Realtime Subscription
 *
 * Listens for table updates (status, currentOrderId changes)
 * This ensures UI stays in sync when:
 * - Table is occupied/freed by another session
 * - current_order_id changes from another tab/device
 *
 * IMPORTANT: This composable is used in Pinia stores, not Vue components.
 * DO NOT use onUnmounted() here - it won't work in stores!
 * Cleanup must be handled manually via unsubscribe() method.
 */
export function useTablesRealtime() {
  const tablesChannel = ref<RealtimeChannel | null>(null)
  const isConnected = ref(false)
  const tablesStore = usePosTablesStore()

  // Reconnect state
  let isUnsubscribing = false
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryCount = 0
  const MAX_RETRY_DELAY_MS = 30_000

  function getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), MAX_RETRY_DELAY_MS)
  }

  function scheduleReconnect() {
    if (isUnsubscribing) return
    if (retryTimer) clearTimeout(retryTimer)
    const delay = getRetryDelay(retryCount)
    retryCount++
    DebugUtils.warn(
      MODULE_NAME,
      `Scheduling tables reconnect in ${delay}ms (attempt ${retryCount})`
    )
    retryTimer = setTimeout(() => {
      retryTimer = null
      if (!isUnsubscribing) subscribeChannel()
    }, delay)
  }

  function subscribeChannel() {
    if (tablesChannel.value) {
      supabase.removeChannel(tablesChannel.value)
      tablesChannel.value = null
    }

    tablesChannel.value = supabase
      .channel('pos-tables')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tables'
        },
        payload => {
          handleTableUpdate(payload)
        }
      )
      .subscribe((status, err) => {
        isConnected.value = status === 'SUBSCRIBED'

        if (status === 'SUBSCRIBED') {
          retryCount = 0
          DebugUtils.info(MODULE_NAME, '📡 POS tables Realtime connected')
        } else if (status === 'CHANNEL_ERROR') {
          DebugUtils.warn(MODULE_NAME, '⚠️ POS tables Realtime channel error', {
            error: err?.message || 'WebSocket disconnected'
          })
          scheduleReconnect()
        } else if (status === 'TIMED_OUT') {
          DebugUtils.warn(MODULE_NAME, '⏰ POS tables Realtime TIMED_OUT')
          scheduleReconnect()
        } else if (status === 'CLOSED') {
          DebugUtils.warn(MODULE_NAME, '🔌 POS tables Realtime CLOSED')
          if (!isUnsubscribing) scheduleReconnect()
        }
      })
  }

  /**
   * Subscribe to tables table changes
   */
  function subscribe() {
    isUnsubscribing = false
    retryCount = 0

    if (tablesChannel.value) {
      DebugUtils.debug(MODULE_NAME, 'Already subscribed, unsubscribing first')
      unsubscribe()
      isUnsubscribing = false
    }

    DebugUtils.info(MODULE_NAME, 'Subscribing to POS tables...')
    subscribeChannel()
  }

  /**
   * Handle table updates from Supabase
   */
  function handleTableUpdate(payload: any) {
    const updatedTable = payload.new

    DebugUtils.info(MODULE_NAME, '🔄 POS table update received', {
      tableNumber: updatedTable?.table_number,
      status: updatedTable?.status,
      currentOrderId: updatedTable?.current_order_id
    })

    // Update local state via store method
    tablesStore.updateTableFromRealtime({
      id: updatedTable.id,
      number: updatedTable.table_number,
      status: mapStatusFromSupabase(updatedTable.status),
      currentOrderId: updatedTable.current_order_id || undefined,
      updatedAt: updatedTable.updated_at
    })
  }

  /**
   * Unsubscribe from realtime updates
   * IMPORTANT: Must be called manually by the parent store (e.g., posStore.cleanup())
   */
  function unsubscribe() {
    isUnsubscribing = true
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    if (tablesChannel.value) {
      DebugUtils.info(MODULE_NAME, 'Unsubscribing from POS tables')
      supabase.removeChannel(tablesChannel.value)
      tablesChannel.value = null
    }
    isConnected.value = false
  }

  return {
    subscribe,
    unsubscribe,
    isConnected
  }
}
