<template>
  <v-app>
    <!-- Global loading overlay -->
    <v-overlay v-model="isLoading" class="align-center justify-center" persistent :scrim="true">
      <v-card class="pa-8 text-center" elevation="8" rounded="lg">
        <v-progress-circular indeterminate size="64" width="6" color="primary" class="mb-4" />
        <div class="text-h6 mb-2">{{ loadingMessage }}</div>
        <div class="text-caption text-medium-emphasis">Please wait...</div>
      </v-card>
    </v-overlay>

    <!-- Main app content -->
    <router-view v-if="!isLoading" />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppInitializer } from '@/core/appInitializer'
import { DebugUtils } from '@/utils'
import { useRouter } from 'vue-router'

const MODULE_NAME = 'App'
const authStore = useAuthStore()
const router = useRouter()
const appInitializer = useAppInitializer()

// Loading states
const isLoadingAuth = ref(true)
const isLoadingStores = ref(false)
const storesLoaded = ref(false)
const loadingMessage = ref('Checking session...')

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

    DebugUtils.info(MODULE_NAME, 'Loading stores for user', {
      userId: user.id,
      roles: user.roles,
      attempts: attempts
    })

    // Initialize stores based on user roles
    await appInitializer.initialize(user.roles || [])

    storesLoaded.value = true
    DebugUtils.info(MODULE_NAME, '✅ Stores loaded successfully')

    // Check if we need to redirect after successful store loading
    const redirectPath = router.currentRoute.value.query.redirect as string
    if (redirectPath && !redirectPath.startsWith('/auth')) {
      DebugUtils.info(MODULE_NAME, `Redirecting to saved path: ${redirectPath}`)
      await router.replace(redirectPath)
    } else if (router.currentRoute.value.path.startsWith('/auth')) {
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
  DebugUtils.info(MODULE_NAME, '🚀 App mounted, starting initialization...')

  // Validate session and load stores if authenticated
  await validateSessionAndLoadStores()
})

// Loading state computed property
const isLoading = computed(() => isLoadingAuth.value || isLoadingStores.value)
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
