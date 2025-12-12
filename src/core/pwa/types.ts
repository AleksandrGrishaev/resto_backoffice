// src/core/pwa/types.ts

/**
 * Wake Lock state
 */
export interface WakeLockState {
  isSupported: boolean
  isActive: boolean
  error: string | null
}

/**
 * Notification permission state
 */
export type NotificationPermission = 'default' | 'granted' | 'denied'

/**
 * Notification options for order alerts
 */
export interface OrderNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  vibrate?: number[]
  silent?: boolean
  requireInteraction?: boolean
  data?: Record<string, unknown>
}

/**
 * Notification state
 */
export interface NotificationState {
  isSupported: boolean
  permission: NotificationPermission
  soundEnabled: boolean
  vibrationEnabled: boolean
}

/**
 * PWA install state
 */
export interface PwaInstallState {
  isInstallable: boolean
  isInstalled: boolean
  platform: 'ios' | 'android' | 'desktop' | 'unknown'
}

/**
 * Order alert configuration
 */
export interface OrderAlertConfig {
  soundEnabled: boolean
  soundUrl: string
  soundVolume: number
  notificationEnabled: boolean
  vibrationEnabled: boolean
  vibrationPattern: number[]
}

/**
 * Order alert event data
 */
export interface OrderAlertEvent {
  orderId: string
  orderNumber?: string
  tableNumber?: string
  itemCount: number
  type: 'new_order' | 'order_update' | 'order_ready'
  timestamp: string
}

/**
 * BeforeInstallPromptEvent for PWA install
 */
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}
