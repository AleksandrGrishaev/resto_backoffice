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
