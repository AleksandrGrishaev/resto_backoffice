/**
 * Centralized Store Reset Service
 *
 * Provides utility to reset all Pinia stores to initial state.
 * Used during logout to ensure complete cleanup of all application state.
 */

import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useMenuStore } from '@/stores/menu'
import { useStorageStore } from '@/stores/storage'
import { useSupplierStore } from '@/stores/supplier_2'
import { useCounteragentsStore } from '@/stores/counteragents'
import { usePreparationStore } from '@/stores/preparation'
import { useAccountStore } from '@/stores/account'
import { usePosStore } from '@/stores/pos'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { useKitchenStore } from '@/stores/kitchen'
import { useSalesStore } from '@/stores/sales'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'StoreResetService'

/**
 * Reset all Pinia stores to initial state
 *
 * IMPORTANT: This should be called during logout to ensure
 * complete cleanup of all application state.
 *
 * @returns Promise<void>
 */
export async function resetAllStores(): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, '🧹 Resetting all stores...')

    // Backoffice stores
    const backofficeStores = [
      { name: 'Products', store: useProductsStore() },
      { name: 'Recipes', store: useRecipesStore() },
      { name: 'Menu', store: useMenuStore() },
      { name: 'Storage', store: useStorageStore() },
      { name: 'Suppliers', store: useSupplierStore() },
      { name: 'Counteragents', store: useCounteragentsStore() },
      { name: 'Preparation', store: usePreparationStore() },
      { name: 'Account', store: useAccountStore() },
      { name: 'Sales', store: useSalesStore() }
    ]

    // POS stores
    const posStores = [
      { name: 'POS', store: usePosStore() },
      { name: 'Orders', store: usePosOrdersStore() },
      { name: 'Tables', store: usePosTablesStore() },
      { name: 'Payments', store: usePosPaymentsStore() },
      { name: 'Shifts', store: useShiftsStore() }
    ]

    // Kitchen stores
    const kitchenStores = [{ name: 'Kitchen', store: useKitchenStore() }]

    // Reset all stores
    const allStores = [...backofficeStores, ...posStores, ...kitchenStores]

    for (const { name, store } of allStores) {
      try {
        // Use $reset() if available (standard Pinia method)
        if ('$reset' in store && typeof store.$reset === 'function') {
          store.$reset()
          DebugUtils.info(MODULE_NAME, `✅ Reset ${name} store`)
        }
        // Fallback: manually reset common properties
        else {
          if ('initialized' in store) {
            ;(store as any).initialized = false
          }
          DebugUtils.info(MODULE_NAME, `⚠️ Manually reset ${name} store (no $reset method)`)
        }
      } catch (error) {
        DebugUtils.error(MODULE_NAME, `❌ Failed to reset ${name} store`, { error })
      }
    }

    DebugUtils.info(MODULE_NAME, '✅ All stores reset complete')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Store reset failed', { error })
    throw error
  }
}

/**
 * Clear all app-specific localStorage keys
 *
 * Removes POS data, caches, sync queues, and session data.
 * Does NOT touch sb-* keys (managed by Supabase signOut).
 */
export function clearAppLocalStorage(): void {
  const MODULE = 'StoreResetService'

  // Hardcoded POS keys
  const posKeys = [
    'pos_orders',
    'pos_bills',
    'pos_order_items',
    'pos_tables',
    'pos_payments',
    'pos_shifts',
    'pos_shift_transactions',
    'pos_current_shift',
    'pos_department_notifications',
    'pos_sync_queue'
  ]

  // Cache keys
  const cacheKeys = [
    'products_cache',
    'products_cache_ts',
    'menu_items_cache',
    'menu_items_cache_ts',
    'menu_categories_cache',
    'recipes_cache',
    'recipes_cache_ts',
    'preparations_cache',
    'preparations_cache_ts'
  ]

  // Other app keys
  const otherKeys = [
    'sales_transactions',
    'recipe_writeoffs',
    'sync_queue_v2',
    'sync_history_v2',
    'pin_session',
    'pin_login_attempts',
    'kitchen_app_login_attempts'
  ]

  const allKeys = [...posKeys, ...cacheKeys, ...otherKeys]
  let removedCount = 0

  for (const key of allKeys) {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key)
      removedCount++
    }
  }

  // Dynamic pattern: remove swr_* keys
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('swr_')) {
      keysToRemove.push(key)
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key)
    removedCount++
  }

  DebugUtils.info(MODULE, `🧹 Cleared ${removedCount} app localStorage keys`)
}

/**
 * Check if all stores are properly reset
 * Useful for debugging and testing
 *
 * @returns Object with store names and their initialization status
 */
export function getStoreResetStatus(): Record<string, boolean> {
  return {
    products: !useProductsStore().initialized,
    recipes: !useRecipesStore().initialized,
    menu: !useMenuStore().initialized,
    storage: !useStorageStore().initialized,
    suppliers: !useSupplierStore().initialized,
    counteragents: !useCounteragentsStore().initialized,
    preparation: !usePreparationStore().initialized,
    account: !useAccountStore().initialized,
    sales: !useSalesStore().initialized,
    pos: !usePosStore().initialized,
    orders: !usePosOrdersStore().initialized,
    tables: !usePosTablesStore().initialized,
    payments: !usePosPaymentsStore().initialized,
    shifts: !useShiftsStore().initialized,
    kitchen: !useKitchenStore().initialized
  }
}
