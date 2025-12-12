// src/core/pwa/index.ts

/**
 * PWA (Progressive Web App) Module
 *
 * Provides PWA capabilities for the Kitchen App:
 * - Screen Wake Lock (keep screen on)
 * - Web Notifications with sound
 * - PWA Installation prompt
 * - Order alerts via Supabase Realtime
 *
 * @example
 * ```ts
 * import { useWakeLock, useNotifications, usePwaInstall, useOrderAlertService } from '@/core/pwa'
 *
 * // In POS view
 * const wakeLock = useWakeLock()
 * const notifications = useNotifications()
 * const pwaInstall = usePwaInstall()
 * const orderAlerts = useOrderAlertService()
 *
 * onMounted(async () => {
 *   // Keep screen on
 *   await wakeLock.request()
 *
 *   // Initialize order alerts
 *   await orderAlerts.initialize()
 *   orderAlerts.subscribe()
 * })
 * ```
 */

// Types
export type {
  WakeLockState,
  NotificationPermission,
  NotificationState,
  OrderNotificationOptions,
  PwaInstallState,
  OrderAlertConfig,
  OrderAlertEvent,
  BeforeInstallPromptEvent
} from './types'

// Composables
export { useWakeLock } from './composables/useWakeLock'
export { useNotifications } from './composables/useNotifications'
export { usePwaInstall } from './composables/usePwaInstall'

// Services
export { useOrderAlertService, resetOrderAlertService } from './services/OrderAlertService'
