// src/composables/usePlatform.ts - Platform detection and capabilities

import { computed, ref, onMounted } from 'vue'
import { ENV, EnvUtils } from '@/config/environment'
import type { PlatformType, StorageType } from '@/config/environment'

interface PlatformCapabilities {
  // Platform detection
  platform: PlatformType
  isMobile: boolean
  isWeb: boolean

  // Offline capabilities
  offlineEnabled: boolean
  offlineFirst: boolean

  // Storage capabilities
  storageType: StorageType
  hasLocalStorage: boolean
  hasCapacitor: boolean

  // Network status
  isOnline: boolean

  // Features
  canSync: boolean
  shouldUseMock: boolean
  debugEnabled: boolean
}

/**
 * Composable for platform detection and capabilities
 */
export function usePlatform() {
  // ===== REACTIVE STATE =====
  const isOnline = ref(navigator.onLine)

  // ===== COMPUTED PROPERTIES =====

  const capabilities = computed<PlatformCapabilities>(() => ({
    // Platform detection
    platform: ENV.platform,
    isMobile: ENV.isMobile,
    isWeb: ENV.isWeb,

    // Offline capabilities
    offlineEnabled: ENV.enableOffline,
    offlineFirst: EnvUtils.shouldUseOfflineFirst(),

    // Storage capabilities
    storageType: ENV.storageType,
    hasLocalStorage: typeof localStorage !== 'undefined',
    hasCapacitor: window.Capacitor !== undefined,

    // Network status
    isOnline: isOnline.value,

    // Features
    canSync: ENV.enableSync && (ENV.useAPI || ENV.useFirebase),
    shouldUseMock: ENV.useMockData,
    debugEnabled: ENV.debugEnabled
  }))

  // ===== INDIVIDUAL COMPUTED =====

  const platform = computed(() => ENV.platform)
  const isMobile = computed(() => ENV.isMobile)
  const isWeb = computed(() => ENV.isWeb)
  const offlineEnabled = computed(() => ENV.enableOffline)
  const debugEnabled = computed(() => ENV.debugEnabled)

  // ===== METHODS =====

  /**
   * Get optimal persistence strategy based on current conditions
   */
  function getPersistenceStrategy() {
    // If offline or no API configured, use local
    if (!isOnline.value || !ENV.useAPI) {
      return 'local'
    }

    // If mobile and offline-first enabled, use hybrid
    if (ENV.isMobile && ENV.offlineFirst) {
      return 'hybrid'
    }

    // Default to what environment suggests
    return EnvUtils.getPersistenceStrategy()
  }

  /**
   * Check if a specific feature is available
   */
  function hasFeature(feature: string): boolean {
    switch (feature) {
      case 'offline':
        return ENV.enableOffline
      case 'sync':
        return ENV.enableSync && isOnline.value
      case 'push_notifications':
        return ENV.isMobile && window.Capacitor?.Plugins?.PushNotifications !== undefined
      case 'camera':
        return ENV.isMobile && window.Capacitor?.Plugins?.Camera !== undefined
      case 'storage':
        return capabilities.value.hasLocalStorage || capabilities.value.hasCapacitor
      default:
        return false
    }
  }

  /**
   * Get storage interface based on platform
   */
  function getStorageInterface() {
    if (ENV.isMobile && capabilities.value.hasCapacitor) {
      // TODO: Return Capacitor storage when mobile app is ready
      return localStorage
    }
    return localStorage
  }

  /**
   * Debug log with platform context
   */
  function debugLog(module: string, message: string, data?: any) {
    if (ENV.debugEnabled) {
      const platformInfo = `[${ENV.platform}${ENV.enableOffline ? ':offline' : ':online'}]`
      console.log(`${platformInfo}[${module}] ${message}`, data)
    }
  }

  // ===== LIFECYCLE (упрощено - без onMounted) =====

  // Инициализируем слушатели событий сразу, а не в onMounted
  const initializeNetworkListeners = (() => {
    let initialized = false

    return () => {
      if (initialized || typeof window === 'undefined') return
      initialized = true

      const handleOnline = () => {
        isOnline.value = true
        debugLog('Platform', 'Network status: ONLINE')
      }

      const handleOffline = () => {
        isOnline.value = false
        debugLog('Platform', 'Network status: OFFLINE')
      }

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }
  })()

  // Инициализируем при первом вызове composable
  initializeNetworkListeners()

  // ===== RETURN =====

  return {
    // Individual properties
    platform,
    isMobile,
    isWeb,
    offlineEnabled,
    debugEnabled,
    isOnline,

    // Combined capabilities
    capabilities,

    // Methods
    getPersistenceStrategy,
    hasFeature,
    getStorageInterface,
    debugLog
  }
}

// ===== TYPE EXPORTS =====
export type { PlatformCapabilities }
