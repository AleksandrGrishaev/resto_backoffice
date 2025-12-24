// src/stores/pos/tables/useTablesRealtime.ts
// POS Tables Realtime Composable - Subscribe to table status changes

import { ref } from 'vue'
import { supabase } from '@/supabase/client'
import { usePosTablesStore } from './tablesStore'
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

  /**
   * Subscribe to tables table changes
   */
  function subscribe() {
    if (tablesChannel.value) {
      DebugUtils.debug(MODULE_NAME, 'Already subscribed, unsubscribing first')
      unsubscribe()
    }

    DebugUtils.info(MODULE_NAME, 'Subscribing to POS tables...')

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
      .subscribe(status => {
        DebugUtils.info(MODULE_NAME, 'Tables channel status', { status })
        isConnected.value = status === 'SUBSCRIBED'

        if (status === 'SUBSCRIBED') {
          DebugUtils.info(MODULE_NAME, '📡 POS tables Realtime connected')
        } else if (status === 'CHANNEL_ERROR') {
          DebugUtils.error(MODULE_NAME, '❌ POS tables Realtime error')
        }
      })
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
      status: updatedTable.status,
      currentOrderId: updatedTable.current_order_id || undefined,
      updatedAt: updatedTable.updated_at
    })
  }

  /**
   * Unsubscribe from realtime updates
   * IMPORTANT: Must be called manually by the parent store (e.g., posStore.cleanup())
   */
  function unsubscribe() {
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
