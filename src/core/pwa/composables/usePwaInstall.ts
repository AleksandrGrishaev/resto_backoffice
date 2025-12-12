// src/core/pwa/composables/usePwaInstall.ts

import { ref, readonly, computed, onMounted, onUnmounted } from 'vue'
import type { PwaInstallState, BeforeInstallPromptEvent } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'usePwaInstall'

/**
 * Composable for PWA installation prompt
 * Handles "Add to Home Screen" functionality
 *
 * @example
 * ```ts
 * const { isInstallable, isInstalled, install } = usePwaInstall()
 *
 * // Show install button if installable
 * <v-btn v-if="isInstallable" @click="install">
 *   Install App
 * </v-btn>
 * ```
 */
export function usePwaInstall() {
  // State
  const state = ref<PwaInstallState>({
    isInstallable: false,
    isInstalled: false,
    platform: 'unknown'
  })

  // Store the deferred prompt
  let deferredPrompt: BeforeInstallPromptEvent | null = null

  /**
   * Detect platform
   */
  const detectPlatform = (): 'ios' | 'android' | 'desktop' | 'unknown' => {
    const userAgent = navigator.userAgent.toLowerCase()

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios'
    }
    if (/android/.test(userAgent)) {
      return 'android'
    }
    if (/windows|macintosh|linux/.test(userAgent) && !/mobile/.test(userAgent)) {
      return 'desktop'
    }

    return 'unknown'
  }

  /**
   * Check if running in standalone mode (already installed)
   */
  const checkIfInstalled = (): boolean => {
    // Check display-mode media query
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches

    // iOS Safari specific check
    const isIOSStandalone = (navigator as any).standalone === true

    return isStandalone || isIOSStandalone
  }

  /**
   * Handle beforeinstallprompt event
   */
  const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent): void => {
    // Prevent Chrome 67+ from automatically showing the prompt
    event.preventDefault()

    // Store the event for later use
    deferredPrompt = event
    state.value.isInstallable = true

    DebugUtils.info(MODULE_NAME, 'App is installable', {
      platforms: event.platforms
    })
  }

  /**
   * Handle app installed event
   */
  const handleAppInstalled = (): void => {
    state.value.isInstalled = true
    state.value.isInstallable = false
    deferredPrompt = null

    DebugUtils.info(MODULE_NAME, 'App was installed successfully')
  }

  /**
   * Trigger the install prompt
   */
  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) {
      DebugUtils.warn(MODULE_NAME, 'Install prompt not available')

      // For iOS, show manual instructions
      if (state.value.platform === 'ios') {
        return 'unavailable'
      }

      return 'unavailable'
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt()

      // Wait for the user choice
      const { outcome } = await deferredPrompt.userChoice

      DebugUtils.info(MODULE_NAME, 'Install prompt result', { outcome })

      // Clear the deferred prompt
      deferredPrompt = null
      state.value.isInstallable = false

      if (outcome === 'accepted') {
        state.value.isInstalled = true
      }

      return outcome
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to show install prompt', { error: err })
      return 'unavailable'
    }
  }

  /**
   * Get iOS installation instructions
   */
  const getIOSInstructions = (): string[] => {
    return [
      'Tap the Share button in Safari',
      'Scroll down and tap "Add to Home Screen"',
      'Tap "Add" to confirm'
    ]
  }

  /**
   * Check if should show iOS install hint
   */
  const shouldShowIOSHint = computed(() => {
    return state.value.platform === 'ios' && !state.value.isInstalled
  })

  // Lifecycle
  onMounted(() => {
    // Detect platform
    state.value.platform = detectPlatform()

    // Check if already installed
    state.value.isInstalled = checkIfInstalled()

    DebugUtils.debug(MODULE_NAME, 'PWA install state initialized', {
      platform: state.value.platform,
      isInstalled: state.value.isInstalled
    })

    // Listen for install prompt (Chrome, Edge, etc.)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)

    // Listen for successful installation
    window.addEventListener('appinstalled', handleAppInstalled)

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', e => {
      state.value.isInstalled = e.matches
    })
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return {
    // State (readonly)
    state: readonly(state),
    isInstallable: computed(() => state.value.isInstallable),
    isInstalled: computed(() => state.value.isInstalled),
    platform: computed(() => state.value.platform),

    // Actions
    install,
    getIOSInstructions,

    // Computed
    shouldShowIOSHint
  }
}
