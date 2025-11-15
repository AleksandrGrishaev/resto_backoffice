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
        <div class="kitchen-sidebar-content">
          <!-- Placeholder: Will be replaced with KitchenSidebar.vue -->
          <div class="pa-4">
            <h4>Kitchen</h4>
            <p class="text-caption">{{ currentScreen }}</p>
          </div>
        </div>
      </template>

      <!-- Content: Active Screen -->
      <template #content>
        <div class="kitchen-screen-content">
          <!-- Placeholder: Will be replaced with OrdersScreen.vue / PreparationScreen.vue -->
          <v-container fluid>
            <h2 class="mb-4">{{ currentScreen }} Screen</h2>
            <p class="text-medium-emphasis">{{ ordersStats.total }} active orders</p>

            <v-row class="mt-4">
              <v-col v-for="status in ['waiting', 'cooking', 'ready']" :key="status" cols="4">
                <v-card>
                  <v-card-title>{{ capitalize(status) }}</v-card-title>
                  <v-card-text>
                    <div class="text-h3">{{ ordersStats[status] }}</div>
                    <div class="text-caption">orders</div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-container>
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
import { ref, computed, onMounted } from 'vue'
import { useKitchenStore } from '@/stores/kitchen'
import { useKitchenOrders } from '@/stores/kitchen/composables'
import { useAuthStore } from '@/stores/auth'
import { DebugUtils } from '@/utils'
import KitchenLayout from '@/layouts/KitchenLayout.vue'

const MODULE_NAME = 'KitchenMainView'

// =============================================
// STORES
// =============================================

const kitchenStore = useKitchenStore()
const authStore = useAuthStore()
const { ordersStats } = useKitchenOrders()

// =============================================
// STATE
// =============================================

const isLoading = ref(false)
const initError = ref<string | null>(null)
const isInitialized = ref(false)
const currentScreen = ref<'Orders' | 'Preparation'>('Orders')

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
 * Switch screen
 */
const switchScreen = (screen: 'Orders' | 'Preparation'): void => {
  currentScreen.value = screen
  DebugUtils.debug(MODULE_NAME, 'Switched to screen', { screen })
}

/**
 * Capitalize string
 */
const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  await initializeKitchen()
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
