<template>
  <v-app>
    <!-- Global loading overlay -->
    <v-overlay v-model="isLoading" class="align-center justify-center" persistent :scrim="true">
      <v-card class="pa-8 text-center" elevation="8" rounded="lg">
        <v-progress-circular indeterminate size="64" width="6" color="primary" class="mb-4" />
        <div class="text-h6 mb-2">{{ loadingMessage }}</div>
        <div class="text-caption text-medium-emphasis">Loading application...</div>
      </v-card>
    </v-overlay>

    <!-- Main app content -->
    <router-view v-if="!isLoading" />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppInitializer } from '@/core/appInitializer'
import { DebugUtils } from '@/utils'
import { useRouter } from 'vue-router'
import { usePosStore } from '@/stores/pos'
import { useKitchenStore } from '@/stores/kitchen'
import { getConnectionHealthMonitor } from '@/core/connection/ConnectionHealthMonitor'
import { useUIScale } from '@/composables/useUIScale'
import { StorageMonitor } from '@/utils/storageMonitor'

const MODULE_NAME = 'App'
const authStore = useAuthStore()
const router = useRouter()
const appInitializer = useAppInitializer()

// Initialize UI scaling (responsive UI based on viewport)
const { scale: uiScale, isEnabled: uiScaleEnabled, currentBreakpoint } = useUIScale()
DebugUtils.info(MODULE_NAME, '📐 UI Scale initialized', {
  scale: uiScale.value,
  enabled: uiScaleEnabled.value,
  breakpoint: currentBreakpoint.value
})

// ✅ FIX: Initialize connection health monitor
console.log('🔍 [App.vue] Initializing connection health monitor...')
const connectionMonitor = getConnectionHealthMonitor()
console.log('✅ [App.vue] Connection health monitor initialized:', connectionMonitor)

// Loading states
const isLoadingAuth = ref(true)
const isLoadingStores = ref(false)
const storesLoaded = ref(false)
const loadingMessage = ref('Checking session...')

/**
 * Early storage cleanup - runs BEFORE auth to ensure localStorage
 * has space for the auth session token.
 * Without this, a full localStorage prevents Supabase from persisting
 * the session, causing login failures on tablets.
 */
async function performEarlyStorageCleanup() {
  try {
    const { needed, level } = StorageMonitor.needsCleanup()
    if (needed) {
      console.log(`🧹 [App] Early storage cleanup needed (level: ${level})`)
      await StorageMonitor.performCleanup(level as 'warning' | 'critical')
    }
  } catch (error) {
    console.error('❌ [App] Early storage cleanup failed:', error)
  }
}

/**
 * Validate session before loading any stores
 * This prevents loading stale data with an invalid session
 */
async function validateSessionAndLoadStores() {
  try {
    isLoadingAuth.value = true
    loadingMessage.value = 'Validating session...'

    // Check if session exists and is valid
    const hasValidSession = await authStore.checkSession()

    if (!hasValidSession) {
      DebugUtils.info(MODULE_NAME, 'No valid session, redirecting to login')
      isLoadingAuth.value = false

      if (!router.currentRoute.value.path.startsWith('/auth')) {
        await router.push('/auth/login')
      }
      return
    }

    // Session is valid, proceed to load stores
    // Note: authStore.isAuthenticated might still be false if auth state hasn't updated yet
    // That's fine since we have a valid Supabase session
    DebugUtils.info(MODULE_NAME, '✅ Session valid, loading stores...')
    await loadStoresAfterAuth()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Session validation failed', { error })
    await router.push('/auth/login')
  } finally {
    isLoadingAuth.value = false
  }
}

/**
 * Load stores based on user roles after authentication
 */
async function loadStoresAfterAuth() {
  if (storesLoaded.value || isLoadingStores.value) {
    DebugUtils.info(MODULE_NAME, 'Stores already loaded or loading')
    return
  }

  try {
    isLoadingStores.value = true
    loadingMessage.value = 'Loading application data...'

    // Wait for user to be loaded in authStore (in case of async auth state changes)
    let user = authStore.currentUser
    let attempts = 0
    const maxAttempts = 10 // Wait up to 1 second (10 * 100ms)

    while (!user && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100))
      user = authStore.currentUser
      attempts++
    }

    if (!user) {
      throw new Error('No authenticated user found after waiting')
    }

    // ✅ Sprint 9: Определяем context по default route пользователя, не по текущему URL
    // Это важно, потому что при login мы ещё на /auth/login, а не на целевом маршруте
    const targetRoute = authStore.getDefaultRoute()

    DebugUtils.info(MODULE_NAME, 'Loading stores for user', {
      userId: user.id,
      roles: user.roles,
      attempts: attempts,
      targetRoute,
      currentPath: router.currentRoute.value.path
    })

    // Initialize stores based on user roles AND target route (context-based loading)
    await appInitializer.initialize(user.roles || [], { initialPath: targetRoute })

    storesLoaded.value = true
    DebugUtils.info(MODULE_NAME, '✅ Stores loaded successfully')

    // Check if we need to redirect after successful store loading
    const redirectPath = router.currentRoute.value.query.redirect as string
    if (redirectPath && !redirectPath.startsWith('/auth') && redirectPath !== '/unauthorized') {
      DebugUtils.info(MODULE_NAME, `Redirecting to saved path: ${redirectPath}`)
      await router.replace(redirectPath)
    } else if (
      router.currentRoute.value.path.startsWith('/auth') ||
      router.currentRoute.value.path === '/unauthorized'
    ) {
      // If on auth page but no redirect specified, go to default route
      const defaultRoute = authStore.getDefaultRoute()
      DebugUtils.info(MODULE_NAME, `Redirecting to default route: ${defaultRoute}`)
      await router.replace(defaultRoute)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load stores', { error })
    throw error
  } finally {
    isLoadingStores.value = false
  }
}

/**
 * Watch for authentication changes
 * Only load stores when authenticated (no immediate execution)
 */
watch(
  () => authStore.isAuthenticated,
  async isAuthenticated => {
    if (isAuthenticated && !isLoadingStores.value && !storesLoaded.value) {
      DebugUtils.info(MODULE_NAME, 'User authenticated, loading stores...')
      await loadStoresAfterAuth()
    } else if (!isAuthenticated && storesLoaded.value) {
      // User logged out, reset loaded flag
      storesLoaded.value = false
      DebugUtils.info(MODULE_NAME, 'User logged out, reset stores loaded flag')
    }
  }
  // ✅ REMOVED: { immediate: true }
  // This prevents loading stores before session validation
)

/**
 * App initialization on mount
 */
onMounted(async () => {
  console.log('🚀 [App.vue] onMounted() called')
  DebugUtils.info(MODULE_NAME, '🚀 App mounted, starting initialization...')

  // ✅ FIX: Start connection health monitoring
  try {
    console.log('🏥 [App] Starting connection health monitoring...')
    console.log('🔍 [App] connectionMonitor =', connectionMonitor)

    if (connectionMonitor && typeof connectionMonitor.start === 'function') {
      connectionMonitor.start()
      console.log('✅ [App] Connection health monitoring started')
    } else {
      console.error('❌ [App] connectionMonitor is invalid:', connectionMonitor)
    }
  } catch (error) {
    console.error('❌ [App] Failed to start connection health monitoring:', error)
  }

  // ✅ FIX: Clean up localStorage BEFORE auth to prevent quota errors
  await performEarlyStorageCleanup()

  // Validate session and load stores if authenticated
  await validateSessionAndLoadStores()
})

// Loading state computed property
const isLoading = computed(() => isLoadingAuth.value || isLoadingStores.value)

/**
 * ✅ FIX: Cleanup Realtime subscriptions on unmount
 * This prevents subscription leaks during HMR and when app is destroyed
 */
onUnmounted(() => {
  DebugUtils.info(MODULE_NAME, '🧹 App unmounting, cleaning up Realtime subscriptions...')

  try {
    // Stop connection health monitoring
    console.log('🛑 [App] Stopping connection health monitoring...')
    connectionMonitor.stop()

    // Cleanup POS store (if initialized)
    const posStore = usePosStore()
    if (posStore.isInitialized) {
      DebugUtils.info(MODULE_NAME, 'Cleaning up POS store...')
      posStore.cleanup()
    }

    // Cleanup Kitchen store (if initialized)
    const kitchenStore = useKitchenStore()
    if (kitchenStore.initialized) {
      DebugUtils.info(MODULE_NAME, 'Cleaning up Kitchen store...')
      kitchenStore.cleanup()
    }

    DebugUtils.info(MODULE_NAME, '✅ Cleanup complete')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Cleanup failed', { error })
  }
})

/**
 * ✅ FIX: HMR cleanup for development
 * Prevents Realtime subscription leaks during hot module replacement
 */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    DebugUtils.info(MODULE_NAME, '🔄 HMR dispose, cleaning up Realtime subscriptions...')

    try {
      // Cleanup POS store
      const posStore = usePosStore()
      if (posStore.isInitialized) {
        posStore.cleanup()
      }

      // Cleanup Kitchen store
      const kitchenStore = useKitchenStore()
      if (kitchenStore.initialized) {
        kitchenStore.cleanup()
      }

      DebugUtils.info(MODULE_NAME, '✅ HMR cleanup complete')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'HMR cleanup failed', { error })
    }
  })
}
</script>

<style lang="scss" scoped>
.app-loading {
  background: var(--black-primary);
  min-height: 100vh;

  h3 {
    color: rgba(255, 255, 255, 0.87);
  }

  p {
    color: rgba(255, 255, 255, 0.6);
  }
}

// Анимация появления
.v-progress-circular {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}
</style>
