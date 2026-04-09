// src/plugins/piniaReset.ts
// Pinia plugin to support $reset() for setup stores (Composition API)
// By default, Pinia only supports $reset() for option stores.
// This plugin captures initial state on store creation and restores it on $reset().

import type { PiniaPlugin } from 'pinia'
import { toRaw } from 'vue'

function deepCloneState(state: Record<string, unknown>): Record<string, unknown> {
  const raw = toRaw(state)
  const clone: Record<string, unknown> = {}
  for (const key of Object.keys(raw)) {
    const value = toRaw(raw[key])
    if (value === null || value === undefined) {
      clone[key] = value
    } else if (Array.isArray(value)) {
      clone[key] = []
    } else if (typeof value === 'object') {
      try {
        clone[key] = JSON.parse(JSON.stringify(value))
      } catch {
        // Skip non-serializable state (components, vnodes, etc.)
        clone[key] = value instanceof Map ? new Map() : value instanceof Set ? new Set() : {}
      }
    } else {
      clone[key] = value
    }
  }
  return clone
}

export const piniaResetPlugin: PiniaPlugin = ({ store }) => {
  // Capture initial state snapshot right after store creation
  const initialState = deepCloneState(store.$state)

  store.$reset = () => {
    store.$patch(deepCloneState(initialState))
  }
}
