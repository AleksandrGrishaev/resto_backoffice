// src/stores/kitchen/index.ts - Minimal Kitchen Coordinator
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { DebugUtils } from '@/utils'

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

      if (!posOrdersStore.orders || posOrdersStore.orders.length === 0) {
        DebugUtils.debug(MODULE_NAME, 'Loading POS orders...')
        await posOrdersStore.loadOrders()
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
