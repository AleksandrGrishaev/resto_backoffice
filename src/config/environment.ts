// src/config/environment.ts - Centralized environment configuration

export type PlatformType = 'web' | 'mobile'
export type StorageType = 'localStorage' | 'capacitor' | 'api'
export type DebugLevel = 'silent' | 'standard' | 'verbose'

interface EnvironmentConfig {
  // App
  appTitle: string
  apiUrl: string
  enableLogs: boolean

  // Platform
  platform: PlatformType
  isMobile: boolean
  isWeb: boolean

  // Data sources
  useAPI: boolean
  useFirebase: boolean
  useSupabase: boolean // Alias for supabase.enabled

  // Offline capabilities
  enableOffline: boolean
  offlineFirst: boolean
  enableSync: boolean

  // Storage
  storageType: StorageType
  storagePrefix: string

  // Debug
  debugEnabled: boolean
  debugStores: boolean
  debugRouting: boolean
  debugPersistence: boolean

  // Debug control (новые поля из ENV)
  debugLevel: DebugLevel
  showStoreDetails: boolean
  showInitSummary: boolean
  showDeviceInfo: boolean
  useBlacklist: boolean

  // Capacitor features (из .env.mobile)
  enablePushNotifications: boolean
  enableCamera: boolean
  enableBiometricAuth: boolean

  // POS specific
  pos: {
    offlineFirst: boolean
    cacheTTL: number
    autoSyncInterval: number
  }

  // Development
  dev: {
    showDevTools: boolean
    mockNetworkDelay: number
    enableHotReload: boolean
  }

  // Firebase
  firebase: {
    projectId: string
    apiKey: string
    authDomain: string
    storageBucket: string
    messagingSenderId: string
    appId: string
  }

  // Supabase
  supabase: {
    url: string
    anonKey: string
    serviceKey: string
    enabled: boolean
    useServiceKey: boolean
  }

  // Supabase Request Configuration
  supabaseRequest: {
    timeout: number // Request timeout in milliseconds
    maxRetries: number // Max retry attempts on failure
    retryDelay: number // Base delay between retries (exponential backoff)
  }

  // UI Scaling
  ui: {
    autoScale: boolean // Auto-scale UI on smaller screens
  }
}

/**
 * Parse environment variables into typed configuration
 */
function createEnvironmentConfig(): EnvironmentConfig {
  const platform = (import.meta.env.VITE_PLATFORM as PlatformType) || 'web'

  return {
    // App
    appTitle: import.meta.env.VITE_APP_TITLE || 'Kitchen App',
    apiUrl: import.meta.env.VITE_API_URL || '',
    enableLogs: import.meta.env.VITE_ENABLE_LOGS === 'true',

    // Platform
    platform,
    isMobile: platform === 'mobile',
    isWeb: platform === 'web',

    // Data sources
    useAPI: import.meta.env.VITE_USE_API === 'true',
    useFirebase: import.meta.env.VITE_USE_FIREBASE === 'true',
    useSupabase: import.meta.env.VITE_USE_SUPABASE === 'true',

    // Offline capabilities
    enableOffline: import.meta.env.VITE_ENABLE_OFFLINE === 'true',
    offlineFirst: import.meta.env.VITE_POS_OFFLINE_FIRST === 'true',
    enableSync: import.meta.env.VITE_ENABLE_SYNC === 'true',

    // Storage
    storageType: (import.meta.env.VITE_STORAGE_TYPE as StorageType) || 'localStorage',
    storagePrefix: import.meta.env.VITE_STORAGE_PREFIX || 'kitchen-app',

    // Debug
    debugEnabled: import.meta.env.VITE_DEBUG_ENABLED === 'true',
    debugStores: import.meta.env.VITE_DEBUG_STORES === 'true',
    debugRouting: import.meta.env.VITE_DEBUG_ROUTING === 'true',
    debugPersistence: import.meta.env.VITE_DEBUG_PERSISTENCE === 'true',

    // Debug control
    debugLevel: (import.meta.env.VITE_DEBUG_LEVEL as DebugLevel) || 'standard',
    showStoreDetails: import.meta.env.VITE_SHOW_STORE_DETAILS !== 'false',
    showInitSummary: import.meta.env.VITE_SHOW_INIT_SUMMARY !== 'false',
    showDeviceInfo: import.meta.env.VITE_SHOW_DEVICE_INFO !== 'false',
    useBlacklist: import.meta.env.VITE_USE_BLACKLIST !== 'false',

    // Mobile features
    enablePushNotifications: import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true',
    enableCamera: import.meta.env.VITE_ENABLE_CAMERA === 'true',
    enableBiometricAuth: import.meta.env.VITE_ENABLE_BIOMETRIC_AUTH === 'true',
    // POS specific
    pos: {
      offlineFirst: import.meta.env.VITE_POS_OFFLINE_FIRST === 'true',
      cacheTTL: Number(import.meta.env.VITE_POS_CACHE_TTL) || 300,
      autoSyncInterval: Number(import.meta.env.VITE_POS_AUTO_SYNC_INTERVAL) || 30000
    },

    // Development
    dev: {
      showDevTools: import.meta.env.VITE_SHOW_DEV_TOOLS === 'true',
      mockNetworkDelay: Number(import.meta.env.VITE_MOCK_NETWORK_DELAY) || 0,
      enableHotReload: import.meta.env.VITE_ENABLE_HOT_RELOAD === 'true'
    },

    // Firebase
    firebase: {
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
    },

    // Supabase
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL || '',
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      serviceKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY || '',
      enabled: import.meta.env.VITE_USE_SUPABASE === 'true',
      useServiceKey: import.meta.env.VITE_SUPABASE_USE_SERVICE_KEY === 'true'
    },

    // Supabase Request Configuration
    supabaseRequest: {
      timeout: Number(import.meta.env.VITE_SUPABASE_TIMEOUT) || 15000, // 15 seconds default
      maxRetries: Number(import.meta.env.VITE_SUPABASE_MAX_RETRIES) || 3, // 3 retries default
      retryDelay: Number(import.meta.env.VITE_SUPABASE_RETRY_DELAY) || 1000 // 1 second default
    },

    // UI Scaling
    ui: {
      autoScale: import.meta.env.VITE_UI_AUTO_SCALE === 'true'
    }
  }
}

// Global environment instance
export const ENV = createEnvironmentConfig()

// Environment utilities
export const EnvUtils = {
  /**
   * Check if we're in development mode
   */
  isDev(): boolean {
    return import.meta.env.DEV
  },

  /**
   * Check if we're in production mode
   */
  isProd(): boolean {
    return import.meta.env.PROD
  },

  /**
   * Get current mode string
   */
  getMode(): string {
    return import.meta.env.MODE
  },

  /**
   * Check if Firebase is properly configured
   */
  isFirebaseConfigured(): boolean {
    return (
      ENV.useFirebase &&
      ENV.firebase.projectId.length > 0 &&
      ENV.firebase.apiKey.length > 0 &&
      ENV.firebase.authDomain.length > 0
    )
  },

  /**
   * Check if Supabase is properly configured
   */
  isSupabaseConfigured(): boolean {
    return ENV.supabase.enabled && ENV.supabase.url.length > 0 && ENV.supabase.anonKey.length > 0
  },

  /**
   * Should use offline-first strategy
   */
  shouldUseOfflineFirst(): boolean {
    return ENV.enableOffline && (ENV.pos.offlineFirst || ENV.isMobile)
  },

  /**
   * Get persistence strategy based on environment
   */
  getPersistenceStrategy(): 'local' | 'api' | 'hybrid' {
    if (!ENV.useAPI) return 'local'
    if (ENV.enableOffline) return 'hybrid'
    return 'api'
  },

  /**
   * Get mock network delay for development
   */
  getMockDelay(): number {
    return EnvUtils.isDev() ? ENV.dev.mockNetworkDelay : 0
  },

  /**
   * Should show dev tools
   */
  shouldShowDevTools(): boolean {
    return EnvUtils.isDev() || ENV.dev.showDevTools
  },

  /**
   * Debug logging utility with persistence-specific logging
   */
  debugLog(module: string, message: string, data?: any) {
    if (ENV.debugEnabled) {
      console.log(`[${module}] ${message}`, data)
    }
  },

  /**
   * Persistence-specific debug logging
   */
  debugPersistence(module: string, message: string, data?: any) {
    if (ENV.debugPersistence) {
      console.log(`[PERSIST:${module}] ${message}`, data)
    }
  },

  /**
   * Store-specific debug logging
   */
  debugStore(storeName: string, message: string, data?: any) {
    if (ENV.debugStores) {
      console.log(`[STORE:${storeName}] ${message}`, data)
    }
  }
}

// Type exports
export type { EnvironmentConfig }
