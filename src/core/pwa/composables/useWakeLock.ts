// src/core/pwa/composables/useWakeLock.ts

import { ref, readonly, onMounted, onUnmounted } from 'vue'
import type { WakeLockState } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'useWakeLock'

/**
 * Composable for Screen Wake Lock API
 * Prevents the device screen from turning off while the app is active
 *
 * @example
 * ```ts
 * const { isActive, request, release } = useWakeLock()
 *
 * // Request wake lock when POS view is mounted
 * onMounted(() => request())
 *
 * // Release when leaving POS
 * onUnmounted(() => release())
 * ```
 */
export function useWakeLock() {
  // State
  const state = ref<WakeLockState>({
    isSupported: false,
    isActive: false,
    error: null
  })

  // Wake lock sentinel
  let wakeLock: WakeLockSentinel | null = null

  /**
   * Check if Wake Lock API is supported
   */
  const checkSupport = (): boolean => {
    const supported = 'wakeLock' in navigator
    state.value.isSupported = supported

    if (!supported) {
      DebugUtils.warn(MODULE_NAME, 'Wake Lock API is not supported in this browser')
    }

    return supported
  }

  /**
   * Request wake lock to keep screen on
   */
  const request = async (): Promise<boolean> => {
    if (!checkSupport()) {
      return false
    }

    // Already active
    if (wakeLock && !wakeLock.released) {
      DebugUtils.debug(MODULE_NAME, 'Wake lock already active')
      return true
    }

    try {
      wakeLock = await navigator.wakeLock.request('screen')
      state.value.isActive = true
      state.value.error = null

      DebugUtils.info(MODULE_NAME, 'Wake lock acquired - screen will stay on')

      // Handle release event (e.g., when tab becomes hidden)
      wakeLock.addEventListener('release', handleRelease)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to acquire wake lock'
      state.value.error = message
      state.value.isActive = false

      DebugUtils.error(MODULE_NAME, 'Failed to acquire wake lock', { error: message })

      return false
    }
  }

  /**
   * Release wake lock
   */
  const release = async (): Promise<void> => {
    if (!wakeLock) {
      return
    }

    try {
      await wakeLock.release()
      wakeLock = null
      state.value.isActive = false

      DebugUtils.info(MODULE_NAME, 'Wake lock released')
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to release wake lock', { error: err })
    }
  }

  /**
   * Handle wake lock release event
   */
  const handleRelease = (): void => {
    state.value.isActive = false
    DebugUtils.debug(MODULE_NAME, 'Wake lock was released (tab hidden or system override)')
  }

  /**
   * Re-acquire wake lock when page becomes visible again
   */
  const handleVisibilityChange = async (): Promise<void> => {
    if (
      document.visibilityState === 'visible' &&
      state.value.isSupported &&
      !state.value.isActive
    ) {
      DebugUtils.debug(MODULE_NAME, 'Page visible again, re-acquiring wake lock')
      await request()
    }
  }

  // Lifecycle
  onMounted(() => {
    checkSupport()
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    release()
  })

  return {
    // State (readonly)
    isSupported: readonly(ref(state.value.isSupported)),
    isActive: readonly(ref(state.value.isActive)),
    error: readonly(ref(state.value.error)),
    state: readonly(state),

    // Actions
    request,
    release,
    checkSupport
  }
}
