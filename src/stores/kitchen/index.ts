// src/stores/kitchen/index.ts - Minimal Kitchen Coordinator
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { DebugUtils } from '@/utils'
import { ENV } from '@/config/environment'
import { MOCK_KITCHEN_ORDERS } from './mocks/kitchenMockData'

const MODULE_NAME = 'KitchenStore'

export const useKitchenStore = defineStore('kitchen', () => {
  const initialized = ref(false)
  const error = ref<string | null>(null)

  /**
   * Initialize Kitchen System
   * Проверяет что POS orders store готов к использованию
   */
  async function initialize() {
    if (initialized.value) {
      DebugUtils.debug(MODULE_NAME, 'Already initialized')
      return { success: true }
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing Kitchen system...')

      // Проверяем что POS orders store готов
      const posOrdersStore = usePosOrdersStore()

      // В dev mode или с mock данными загружаем тестовые заказы
      if (ENV.useMockData || import.meta.env.DEV) {
        DebugUtils.info(MODULE_NAME, 'Loading mock kitchen orders...', {
          count: MOCK_KITCHEN_ORDERS.length
        })

        // Загружаем mock данные напрямую в POS orders store
        posOrdersStore.orders = [...MOCK_KITCHEN_ORDERS]

        DebugUtils.info(MODULE_NAME, 'Mock orders loaded', {
          waiting: MOCK_KITCHEN_ORDERS.filter(o => o.status === 'waiting').length,
          cooking: MOCK_KITCHEN_ORDERS.filter(o => o.status === 'cooking').length,
          ready: MOCK_KITCHEN_ORDERS.filter(o => o.status === 'ready').length
        })
      } else {
        // В production загружаем реальные данные
        if (!posOrdersStore.orders || posOrdersStore.orders.length === 0) {
          DebugUtils.debug(MODULE_NAME, 'Loading POS orders...')
          await posOrdersStore.loadOrders()
        }
      }

      initialized.value = true

      DebugUtils.info(MODULE_NAME, 'Kitchen initialized successfully', {
        ordersCount: posOrdersStore.orders.length
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

  return {
    initialized,
    error,
    initialize
  }
})
