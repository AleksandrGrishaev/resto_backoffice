<!-- src/views/kitchen/components/KitchenNavigationMenu.vue -->
<template>
  <div class="kitchen-navigation-menu">
    <div class="menu-container">
      <ActionMenu :sections="menuSections" :loading="loading" @action="handleAction">
        <template #header>
          <div class="menu-header">
            <div class="kitchen-info">
              <div class="kitchen-name">{{ kitchenStaffName }}</div>
              <div class="status-details">{{ statusDetails }}</div>
            </div>
            <StatusChip :status="systemStatusDisplay" :label="systemStatusLabel" size="sm" />
          </div>
        </template>
      </ActionMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { DebugUtils } from '@/utils'

// Import molecules and atoms
import ActionMenu from '@/components/molecules/navigation/ActionMenu.vue'
import StatusChip from '@/components/atoms/indicators/StatusChip.vue'

// Import stores
import { useKitchenStore } from '@/stores/kitchen'
import { useAuthStore } from '@/stores/auth'
import { useKitchenOrders } from '@/stores/kitchen/composables'
import { useNotifications } from '@/core/pwa'

const MODULE_NAME = 'KitchenNavigationMenu'

// Kitchen action IDs
const KITCHEN_ACTIONS = {
  LOGOUT: 'logout',
  REFRESH: 'refresh',
  ACTIVATE_SOUND: 'activate_sound'
} as const

// =============================================
// SETUP
// =============================================

const router = useRouter()

// Stores
const kitchenStore = useKitchenStore()
const authStore = useAuthStore()
const { ordersStats } = useKitchenOrders()
const notifications = useNotifications()

// =============================================
// STATE
// =============================================

const loading = ref(false)
const refreshing = ref(false)
const soundActivated = ref(false)

// =============================================
// COMPUTED PROPERTIES
// =============================================

const kitchenStaffName = computed(() => {
  const user = authStore.currentUser
  return user ? user.name : 'Kitchen Staff'
})

const statusDetails = computed(() => {
  const total = ordersStats.value.total
  if (total === 0) return 'No active orders'
  if (total === 1) return '1 active order'
  return `${total} active orders`
})

const systemStatusDisplay = computed(() => {
  if (!kitchenStore.initialized) return 'error'
  if (ordersStats.value.waiting > 5) return 'warning'
  return 'success'
})

const systemStatusLabel = computed(() => {
  if (!kitchenStore.initialized) return 'Not Ready'
  if (ordersStats.value.waiting > 5) return 'Busy'
  return 'Ready'
})

const menuSections = computed(() => [
  // Actions Section
  {
    title: 'ACTIONS',
    actions: [
      {
        id: KITCHEN_ACTIONS.ACTIVATE_SOUND,
        icon: soundActivated.value ? 'mdi-volume-high' : 'mdi-volume-off',
        label: soundActivated.value ? 'Sound Active' : 'Activate Sound',
        disabled: loading.value,
        color: soundActivated.value ? ('success' as const) : undefined
      },
      {
        id: KITCHEN_ACTIONS.REFRESH,
        icon: 'mdi-refresh',
        label: 'Refresh Orders',
        loading: refreshing.value,
        disabled: loading.value
      }
    ]
  },

  // System Section
  {
    title: 'SYSTEM',
    actions: [
      {
        id: KITCHEN_ACTIONS.LOGOUT,
        icon: 'mdi-logout',
        label: 'Logout',
        disabled: loading.value,
        color: 'error' as const
      }
    ]
  }
])

// =============================================
// METHODS
// =============================================

const handleAction = async (actionId: string) => {
  DebugUtils.debug(MODULE_NAME, 'Action clicked', { actionId })

  try {
    switch (actionId) {
      case KITCHEN_ACTIONS.ACTIVATE_SOUND:
        await handleActivateSound()
        break

      case KITCHEN_ACTIONS.REFRESH:
        await handleRefresh()
        break

      case KITCHEN_ACTIONS.LOGOUT:
        await handleLogout()
        break

      default:
        DebugUtils.warn(MODULE_NAME, 'Unknown action', { actionId })
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Action failed', { actionId, error })
  }
}

const handleActivateSound = async () => {
  try {
    // Unlock audio for browser autoplay policy
    const unlocked = await notifications.unlockAudio()

    if (unlocked) {
      // Play test sound to confirm it works
      await notifications.playSound()
      soundActivated.value = true
      DebugUtils.info(MODULE_NAME, 'Sound activated - browser autoplay unlocked')
    } else {
      DebugUtils.warn(MODULE_NAME, 'Failed to unlock audio')
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to activate sound', error)
  }
}

const handleRefresh = async () => {
  refreshing.value = true

  try {
    // Re-initialize Kitchen to reload orders
    await kitchenStore.initialize()
    DebugUtils.info(MODULE_NAME, 'Orders refreshed successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Refresh failed', error)
  } finally {
    refreshing.value = false
  }
}

const handleLogout = async () => {
  loading.value = true

  try {
    await authStore.logout()
    await router.push('/auth/login')

    DebugUtils.info(MODULE_NAME, 'Logged out successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Logout failed', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.kitchen-navigation-menu {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 0 var(--spacing-sm);
  padding-bottom: var(--spacing-md);
  padding-top: var(--spacing-sm);
}

.kitchen-navigation-menu :deep(.menu-button) {
  width: 100%;
  justify-content: center;
  margin: 0;
}

/* Menu Header */
.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.menu-container {
  position: relative;
  width: 100%;
}

.kitchen-info {
  flex: 1;
  min-width: 0;
}

.kitchen-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2px;
}

.status-details {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.2;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .kitchen-name {
    font-size: var(--text-xs);
  }

  .status-details {
    font-size: 10px;
  }
}
</style>
