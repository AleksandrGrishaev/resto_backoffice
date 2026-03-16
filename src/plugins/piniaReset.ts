// src/plugins/piniaReset.ts
// Pinia plugin to support $reset() for setup stores (Composition API)
// By default, Pinia only supports $reset() for option stores.
// This plugin captures initial state on store creation and restores it on $reset().

import type { PiniaPlugin } from 'pinia'

export const piniaResetPlugin: PiniaPlugin = ({ store }) => {
  // Capture initial state snapshot right after store creation
  const initialState = JSON.parse(JSON.stringify(store.$state))

  store.$reset = () => {
    store.$patch(JSON.parse(JSON.stringify(initialState)))
  }
}
