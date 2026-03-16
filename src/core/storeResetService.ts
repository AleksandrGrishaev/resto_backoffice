/**
 * Centralized Store Reset Service
 *
 * Provides utility to reset all Pinia stores to initial state.
 * Used during logout to ensure complete cleanup of all application state.
 *
 * Uses getActivePinia() to only reset stores that were actually created,
 * avoiding unnecessary store instantiation during logout.
 */

import { getActivePinia } from 'pinia'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'StoreResetService'

/**
 * Reset all active Pinia stores to initial state.
 *
 * Only resets stores that have been created during this session.
 * Works with both options stores and setup stores (via piniaResetPlugin).
 */
export async function resetAllStores(): Promise<void> {
  try {
    DebugUtils.info(MODULE_NAME, 'Resetting all active stores...')

    const pinia = getActivePinia()
    if (!pinia) {
      DebugUtils.info(MODULE_NAME, 'No active Pinia instance, nothing to reset')
      return
    }

    let resetCount = 0
    let fallbackCount = 0

    // Iterate only over stores that actually exist in the Pinia instance
    for (const [storeId, _storeState] of Object.entries(pinia.state.value)) {
      try {
        const storeInstance = pinia._s.get(storeId)
        if (!storeInstance) continue

        if (typeof storeInstance.$reset === 'function') {
          storeInstance.$reset()
          resetCount++
          DebugUtils.debug(MODULE_NAME, `Reset ${storeId} store`)
        } else {
          // Fallback for stores without $reset
          if ('initialized' in storeInstance) {
            ;(storeInstance as any).initialized = false
          }
          fallbackCount++
          DebugUtils.debug(MODULE_NAME, `Fallback reset ${storeId} store (no $reset)`)
        }
      } catch (error) {
        DebugUtils.error(MODULE_NAME, `Failed to reset ${storeId} store`, { error })
      }
    }

    DebugUtils.info(
      MODULE_NAME,
      `Store reset complete: ${resetCount} reset, ${fallbackCount} fallback`
    )
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Store reset failed', { error })
    throw error
  }
}

/**
 * Clear all app-specific localStorage keys.
 *
 * Uses prefix-based approach: removes ALL keys EXCEPT those managed by Supabase (sb-*).
 * This ensures no stale data persists across sessions, even if new keys are added later.
 */
export function clearAppLocalStorage(): void {
  // Prefixes to KEEP (managed by external systems)
  const KEEP_PREFIXES = ['sb-']
  // Individual keys to KEEP
  const KEEP_KEYS = new Set(['chunk-reload-time'])

  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key) continue

    // Skip Supabase-managed keys
    if (KEEP_PREFIXES.some(p => key.startsWith(p))) continue
    // Skip explicitly kept keys
    if (KEEP_KEYS.has(key)) continue

    keysToRemove.push(key)
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }

  DebugUtils.info(MODULE_NAME, `Cleared ${keysToRemove.length} app localStorage keys`)
}

/**
 * Check if all stores are properly reset.
 * Useful for debugging.
 */
export function getStoreResetStatus(): Record<string, boolean> {
  const pinia = getActivePinia()
  if (!pinia) return {}

  const status: Record<string, boolean> = {}
  for (const [storeId] of Object.entries(pinia.state.value)) {
    const store = pinia._s.get(storeId)
    if (store && 'initialized' in store) {
      status[storeId] = !(store as any).initialized
    }
  }
  return status
}
