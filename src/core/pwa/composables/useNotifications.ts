// src/core/pwa/composables/useNotifications.ts

import { ref, readonly, computed } from 'vue'
import type { NotificationState, OrderNotificationOptions } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'useNotifications'

// Default notification sound
const DEFAULT_SOUND_URL = '/sounds/new-order.mp3'
const DEFAULT_VIBRATION_PATTERN = [200, 100, 200, 100, 200]

/**
 * Composable for Web Notifications API with sound and vibration support
 *
 * @example
 * ```ts
 * const { requestPermission, notify, playSound } = useNotifications()
 *
 * // Request permission on app start
 * await requestPermission()
 *
 * // Show notification with sound
 * notify({
 *   title: 'New Order',
 *   body: 'Table #5 - 3 items'
 * })
 * ```
 */
export function useNotifications() {
  // State
  const state = ref<NotificationState>({
    isSupported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'denied',
    soundEnabled: true,
    vibrationEnabled: true
  })

  // Audio unlock state (for browser autoplay policy)
  const audioUnlocked = ref(false)

  // Audio element for notification sound
  let audioElement: HTMLAudioElement | null = null
  let audioContext: AudioContext | null = null
  let soundUrl = DEFAULT_SOUND_URL
  let soundVolume = 0.7

  /**
   * Check if notifications are supported
   */
  const isSupported = computed(() => state.value.isSupported)

  /**
   * Check if permission is granted
   */
  const isGranted = computed(() => state.value.permission === 'granted')

  /**
   * Request notification permission
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!state.value.isSupported) {
      DebugUtils.warn(MODULE_NAME, 'Notifications are not supported in this browser')
      return false
    }

    if (state.value.permission === 'granted') {
      return true
    }

    try {
      const permission = await Notification.requestPermission()
      state.value.permission = permission

      DebugUtils.info(MODULE_NAME, 'Notification permission result', { permission })

      return permission === 'granted'
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to request notification permission', { error: err })
      return false
    }
  }

  /**
   * Unlock audio for browser autoplay policy
   * MUST be called from user interaction (click, touch)
   * This creates an AudioContext and plays a silent buffer to unlock audio playback
   */
  const unlockAudio = async (): Promise<boolean> => {
    if (audioUnlocked.value) {
      DebugUtils.debug(MODULE_NAME, 'Audio already unlocked')
      return true
    }

    try {
      // Create AudioContext on user interaction
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) {
        DebugUtils.warn(MODULE_NAME, 'AudioContext not supported')
        return false
      }

      audioContext = new AudioContextClass()

      // Resume context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      // Play silent buffer to unlock audio
      const buffer = audioContext.createBuffer(1, 1, 22050)
      const source = audioContext.createBufferSource()
      source.buffer = buffer
      source.connect(audioContext.destination)
      source.start(0)

      // Pre-load the notification sound
      if (!audioElement) {
        audioElement = new Audio(soundUrl)
        audioElement.volume = soundVolume
      }

      // Load and prepare the audio element
      audioElement.load()

      // Try to play and immediately pause to unlock
      try {
        await audioElement.play()
        audioElement.pause()
        audioElement.currentTime = 0
      } catch {
        // Ignore play error during unlock - some browsers may still block
        DebugUtils.debug(MODULE_NAME, 'Play during unlock blocked, continuing...')
      }

      audioUnlocked.value = true
      DebugUtils.info(MODULE_NAME, 'Audio unlocked successfully')
      return true
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to unlock audio', { error: err })
      return false
    }
  }

  /**
   * Show a notification
   */
  const notify = async (options: OrderNotificationOptions): Promise<Notification | null> => {
    if (!state.value.isSupported) {
      DebugUtils.warn(MODULE_NAME, 'Notifications not supported')
      return null
    }

    if (state.value.permission !== 'granted') {
      DebugUtils.warn(MODULE_NAME, 'Notification permission not granted')
      return null
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192.png',
        badge: options.badge || '/icons/icon-192.png',
        tag: options.tag,
        vibrate:
          options.vibrate || (state.value.vibrationEnabled ? DEFAULT_VIBRATION_PATTERN : undefined),
        silent: options.silent ?? !state.value.soundEnabled,
        requireInteraction: options.requireInteraction ?? true,
        data: options.data
      })

      // Play sound if enabled and not silent
      if (state.value.soundEnabled && !options.silent) {
        await playSound()
      }

      // Vibrate if enabled
      if (state.value.vibrationEnabled && options.vibrate !== undefined) {
        vibrate(options.vibrate || DEFAULT_VIBRATION_PATTERN)
      }

      DebugUtils.debug(MODULE_NAME, 'Notification shown', { title: options.title })

      return notification
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to show notification', { error: err })
      return null
    }
  }

  /**
   * Play notification sound
   */
  const playSound = async (url?: string): Promise<void> => {
    if (!state.value.soundEnabled) {
      return
    }

    try {
      // Create audio element if not exists or URL changed
      if (!audioElement || (url && url !== soundUrl)) {
        soundUrl = url || soundUrl
        audioElement = new Audio(soundUrl)
        audioElement.volume = soundVolume
      }

      // Reset to start if already playing
      audioElement.currentTime = 0

      await audioElement.play()
      DebugUtils.debug(MODULE_NAME, 'Notification sound played')
    } catch (err) {
      // Often fails due to autoplay policy - user interaction required
      DebugUtils.warn(MODULE_NAME, 'Failed to play sound (autoplay blocked?)', { error: err })
    }
  }

  /**
   * Vibrate the device
   */
  const vibrate = (pattern: number[]): boolean => {
    if (!state.value.vibrationEnabled) {
      return false
    }

    if (!('vibrate' in navigator)) {
      DebugUtils.debug(MODULE_NAME, 'Vibration API not supported')
      return false
    }

    try {
      navigator.vibrate(pattern)
      return true
    } catch (err) {
      DebugUtils.warn(MODULE_NAME, 'Failed to vibrate', { error: err })
      return false
    }
  }

  /**
   * Configure sound settings
   */
  const configureSound = (config: { url?: string; volume?: number; enabled?: boolean }): void => {
    if (config.url !== undefined) {
      soundUrl = config.url
      audioElement = null // Will be recreated on next play
    }
    if (config.volume !== undefined) {
      soundVolume = Math.max(0, Math.min(1, config.volume))
      if (audioElement) {
        audioElement.volume = soundVolume
      }
    }
    if (config.enabled !== undefined) {
      state.value.soundEnabled = config.enabled
    }
  }

  /**
   * Configure vibration settings
   */
  const configureVibration = (enabled: boolean): void => {
    state.value.vibrationEnabled = enabled
  }

  /**
   * Test notification (useful for settings page)
   */
  const testNotification = async (): Promise<void> => {
    await notify({
      title: 'Test Notification',
      body: 'Notifications are working correctly!',
      tag: 'test-notification'
    })
  }

  /**
   * Test sound only
   */
  const testSound = async (): Promise<void> => {
    await playSound()
  }

  return {
    // State (readonly)
    state: readonly(state),
    isSupported,
    isGranted,
    audioUnlocked: readonly(audioUnlocked),

    // Actions
    requestPermission,
    unlockAudio,
    notify,
    playSound,
    vibrate,

    // Configuration
    configureSound,
    configureVibration,

    // Testing
    testNotification,
    testSound
  }
}
