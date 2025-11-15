// src/stores/kitchen/index.ts - Kitchen Coordinator with Supabase + Realtime
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { kitchenService } from './kitchenService'
import { useKitchenRealtime } from './useKitchenRealtime'
import { fromSupabase as orderFromSupabase } from '@/stores/pos/orders/supabaseMappers'
import { DebugUtils } from '@/utils'
import { ENV } from '@/config/environment'
import { MOCK_KITCHEN_ORDERS } from './mocks/kitchenMockData'

const MODULE_NAME = 'KitchenStore'

export const useKitchenStore = defineStore('kitchen', () => {
  const initialized = ref(false)
  const error = ref<string | null>(null)
  const realtimeConnected = ref(false)

  const posOrdersStore = usePosOrdersStore()
  const { subscribe, unsubscribe, isConnected } = useKitchenRealtime()

  /**
   * Initialize Kitchen System with Supabase
   * Загружает активные заказы из Supabase и подписывается на обновления
   */
  async function initialize() {
    if (initialized.value) {
      DebugUtils.debug(MODULE_NAME, 'Already initialized')
      return { success: true }
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing Kitchen system...')

      // Load active orders from Supabase (if enabled)
      if (ENV.useSupabase) {
        DebugUtils.info(MODULE_NAME, 'Loading orders from Supabase...')

        const orders = await kitchenService.getActiveKitchenOrders()
        posOrdersStore.orders = orders

        DebugUtils.info(MODULE_NAME, 'Kitchen orders loaded from Supabase', {
          count: orders.length,
          waiting: orders.filter(o => o.status === 'waiting').length,
          cooking: orders.filter(o => o.status === 'cooking').length,
          ready: orders.filter(o => o.status === 'ready').length
        })

        // Subscribe to realtime updates
        subscribe((updatedOrder, eventType) => {
          handleRealtimeUpdate(updatedOrder, eventType)
        })

        realtimeConnected.value = isConnected.value
      } else {
        // Mock data fallback (dev mode)
        DebugUtils.info(MODULE_NAME, 'Loading mock kitchen orders...', {
          count: MOCK_KITCHEN_ORDERS.length
        })

        posOrdersStore.orders = [...MOCK_KITCHEN_ORDERS]

        DebugUtils.info(MODULE_NAME, 'Mock orders loaded', {
          waiting: MOCK_KITCHEN_ORDERS.filter(o => o.status === 'waiting').length,
          cooking: MOCK_KITCHEN_ORDERS.filter(o => o.status === 'cooking').length,
          ready: MOCK_KITCHEN_ORDERS.filter(o => o.status === 'ready').length
        })
      }

      initialized.value = true

      DebugUtils.info(MODULE_NAME, 'Kitchen initialized successfully', {
        ordersCount: posOrdersStore.orders.length,
        realtimeEnabled: ENV.useSupabase
      })

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage

      DebugUtils.error(MODULE_NAME, 'Kitchen initialization failed', {
        error: errorMessage
      })

      return { success: false, error: errorMessage }
    }
  }

  /**
   * Handle realtime order updates from POS
   */
  function handleRealtimeUpdate(updatedOrder: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE') {
    try {
      if (eventType === 'INSERT') {
        // New order from POS
        const order = orderFromSupabase(updatedOrder)
        posOrdersStore.orders.push(order)

        DebugUtils.info(MODULE_NAME, '🔄 New order received from POS', {
          orderNumber: order.orderNumber,
          status: order.status
        })
      } else if (eventType === 'UPDATE') {
        // Order updated by POS or Kitchen
        const order = orderFromSupabase(updatedOrder)
        const index = posOrdersStore.orders.findIndex(o => o.id === order.id)

        if (index !== -1) {
          posOrdersStore.orders[index] = order
          DebugUtils.info(MODULE_NAME, '🔄 Order updated', {
            orderNumber: order.orderNumber,
            status: order.status
          })
        } else {
          // Order not in local state, add it
          posOrdersStore.orders.push(order)
          DebugUtils.info(MODULE_NAME, '🔄 Order added to kitchen', {
            orderNumber: order.orderNumber
          })
        }
      } else if (eventType === 'DELETE') {
        // Order removed (cancelled or completed)
        const index = posOrdersStore.orders.findIndex(o => o.id === updatedOrder.id)

        if (index !== -1) {
          const order = posOrdersStore.orders[index]
          posOrdersStore.orders.splice(index, 1)

          DebugUtils.info(MODULE_NAME, '🔄 Order removed from kitchen', {
            orderNumber: order.orderNumber
          })
        }
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to handle realtime update', { err, eventType })
    }
  }

  /**
   * Cleanup - unsubscribe from realtime
   */
  function cleanup() {
    unsubscribe()
    initialized.value = false
    realtimeConnected.value = false
    DebugUtils.info(MODULE_NAME, 'Kitchen store cleaned up')
  }

  return {
    initialized,
    error,
    realtimeConnected,
    initialize,
    cleanup
  }
})
