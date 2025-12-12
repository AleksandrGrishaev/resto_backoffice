<!-- src/views/kitchen/KitchenMainView.vue -->
<template>
  <div class="kitchen-main-container">
    <!-- Loading State -->
    <div v-if="showLoadingState" class="kitchen-loading">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate size="64" color="primary" />
            <h3 class="mt-4">Initializing Kitchen Display...</h3>
            <p class="text-medium-emphasis">Preparing kitchen workspace</p>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Error State -->
    <div v-else-if="showErrorState" class="kitchen-error">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" sm="6" class="text-center">
            <v-icon size="64" color="error" class="mb-4">mdi-chef-hat</v-icon>
            <h3 class="mb-4">Kitchen System Error</h3>
            <p class="text-medium-emphasis mb-6">
              {{ initError }}
            </p>

            <div class="d-flex gap-4 justify-center">
              <v-btn
                color="primary"
                variant="outlined"
                :loading="isLoading"
                @click="retryInitialization"
              >
                Retry
              </v-btn>

              <v-btn v-if="authStore.isAdmin" color="secondary" variant="text" to="/menu">
                Go to Admin Panel
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <!-- Main Kitchen Interface -->
    <KitchenLayout v-else-if="showMainInterface">
      <!-- Sidebar: Navigation -->
      <template #sidebar>
        <KitchenSidebar
          :current-screen="currentScreen"
          @screen-select="handleScreenSelect"
          @department-change="handleDepartmentChange"
        />
      </template>

      <!-- Content: Active Screen -->
      <template #content>
        <div class="kitchen-screen-content">
          <!-- Orders Screen -->
          <OrdersScreen
            v-if="currentScreen === 'orders'"
            :selected-department="selectedDepartment"
          />

          <!-- Preparation Screen (Stub) -->
          <PreparationScreen
            v-else-if="currentScreen === 'preparation'"
            @navigate-to-orders="handleScreenSelect('orders')"
          />
        </div>
      </template>
    </KitchenLayout>

    <!-- Fallback State -->
    <div v-else class="kitchen-fallback">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" class="text-center">
            <v-progress-circular indeterminate size="32" />
            <p class="mt-2">Preparing Kitchen Display...</p>
          </v-col>
        </v-row>
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useKitchenStore } from '@/stores/kitchen'
import { useKitchenDishes } from '@/stores/kitchen/composables'
import { useAuthStore } from '@/stores/auth'
import { useWakeLock, useOrderAlertService } from '@/core/pwa'
import { DebugUtils } from '@/utils'
import KitchenLayout from '@/layouts/KitchenLayout.vue'
import KitchenSidebar from './components/KitchenSidebar.vue'
import OrdersScreen from './orders/OrdersScreen.vue'
import PreparationScreen from './preparation/PreparationScreen.vue'

const MODULE_NAME = 'KitchenMainView'

// =============================================
// STORES
// =============================================

const kitchenStore = useKitchenStore()
const authStore = useAuthStore()
const { userDepartment } = useKitchenDishes()

// PWA: Wake Lock to keep screen on
const wakeLock = useWakeLock()

// PWA: Order alerts with sound
const orderAlerts = useOrderAlertService()

// =============================================
// STATE
// =============================================

const isLoading = ref(false)
const initError = ref<string | null>(null)
const isInitialized = ref(false)
const currentScreen = ref<'orders' | 'preparation'>('orders')
const selectedDepartment = ref<'all' | 'kitchen' | 'bar'>('all')

// =============================================
// COMPUTED PROPERTIES
// =============================================

/**
 * Can user access Kitchen system
 */
const canUseKitchen = computed(() => {
  const roles = authStore.userRoles
  return roles.includes('admin') || roles.includes('kitchen') || roles.includes('bar')
})

/**
 * Show error state
 */
const showErrorState = computed(() => {
  return !!initError.value || !canUseKitchen.value
})

/**
 * Show loading state
 */
const showLoadingState = computed(() => {
  return isLoading.value && !initError.value
})

/**
 * Show main interface
 */
const showMainInterface = computed(() => {
  return isInitialized.value && !showErrorState.value && !showLoadingState.value
})

// =============================================
// METHODS
// =============================================

/**
 * Initialize Kitchen system
 */
const initializeKitchen = async (): Promise<void> => {
  if (!canUseKitchen.value) {
    initError.value = 'You do not have permission to access the Kitchen system'
    return
  }

  try {
    isLoading.value = true
    initError.value = null

    DebugUtils.debug(MODULE_NAME, 'Starting Kitchen initialization...')

    const result = await kitchenStore.initialize()

    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize Kitchen system')
    }

    isInitialized.value = true
    DebugUtils.debug(MODULE_NAME, 'Kitchen system initialized successfully')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    initError.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'Kitchen initialization failed', { error: errorMessage })
  } finally {
    isLoading.value = false
  }
}

/**
 * Retry initialization
 */
const retryInitialization = async (): Promise<void> => {
  await initializeKitchen()
}

/**
 * Handle screen selection from sidebar
 */
const handleScreenSelect = (screen: 'orders' | 'preparation'): void => {
  currentScreen.value = screen
  DebugUtils.debug(MODULE_NAME, 'Screen selected', { screen })
}

/**
 * Handle department selection from sidebar (admin only)
 */
const handleDepartmentChange = (department: 'all' | 'kitchen' | 'bar'): void => {
  selectedDepartment.value = department
  DebugUtils.debug(MODULE_NAME, 'Department filter changed', { department })
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  await initializeKitchen()

  // PWA: Request wake lock to keep screen on during kitchen operations
  const wakeLockAcquired = await wakeLock.request()
  if (wakeLockAcquired) {
    DebugUtils.info(MODULE_NAME, 'Screen will stay on during kitchen session')
  }

  // PWA: Initialize order alerts with sound for new orders
  // Sound plays for all kitchen/bar staff, but filtered by department
  // Each department only hears alerts for orders with items in their department
  await orderAlerts.initialize({
    soundEnabled: true,
    soundUrl: '/sounds/new-order.mp3',
    soundVolume: 0.8,
    notificationEnabled: true,
    vibrationEnabled: true,
    userDepartment: userDepartment.value // Filter alerts by user's department
  })
  orderAlerts.subscribe()
  DebugUtils.info(MODULE_NAME, 'Order alerts initialized', {
    department: userDepartment.value,
    soundEnabled: true
  })
})

/**
 * Cleanup on unmount
 * Unsubscribe from Realtime to prevent memory leaks
 */
onUnmounted(async () => {
  DebugUtils.debug(MODULE_NAME, 'Component unmounting, cleaning up Kitchen store')

  // PWA: Release wake lock
  await wakeLock.release()

  // PWA: Unsubscribe from order alerts
  await orderAlerts.unsubscribe()

  kitchenStore.cleanup()
})
</script>

<style scoped lang="scss">
.kitchen-main-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.kitchen-loading,
.kitchen-error,
.kitchen-fallback {
  height: 100vh;
  width: 100vw;
  background-color: var(--v-theme-background);
}

.kitchen-sidebar-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.kitchen-screen-content {
  height: 100%;
  overflow-y: auto;
  background-color: var(--v-theme-background);
}
</style>
