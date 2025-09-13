<!-- src/views/pos/components/PosNavigationMenu.vue -->
<!--
  POS Navigation Menu - Business Logic Component
  - Uses StatusBar and ActionMenu molecules for UI
  - Integrates with POS stores for shift management
  - Handles all POS-specific actions and logic
-->
<template>
  <div class="pos-navigation-menu">
    <div class="menu-container">
      <NotificationBadge :show="hasNotifications" :variant="notificationVariant" size="sm">
        <ActionMenu :sections="menuSections" :loading="loading" @action="handleAction">
          <template #header>
            <div class="menu-header">
              <div class="cashier-info">
                <div class="cashier-name">{{ cashierName }}</div>
                <div class="shift-details">{{ shiftDetails }}</div>
              </div>
              <StatusChip :status="systemStatusDisplay" :label="systemStatusLabel" size="sm" />
            </div>
          </template>
        </ActionMenu>
      </NotificationBadge>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { DebugUtils } from '@/utils'

// Import molecules and atoms
import StatusBar from '@/components/molecules/navigation/StatusBar.vue'
import ActionMenu from '@/components/molecules/navigation/ActionMenu.vue'
import StatusChip from '@/components/atoms/indicators/StatusChip.vue'
import NotificationBadge from '../../../components/atoms/indicators/NotificationBadge.vue'

// Import stores
import { usePosStore } from '@/stores/pos'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { useAuthStore } from '@/stores/auth'

// Import POS system utilities
import {
  calculatePosSystemStatus,
  calculateShiftStatus,
  getPosStatusColor,
  getPosStatusLabel,
  formatShiftTime,
  formatCashierName,
  POS_ACTIONS,
  type PosSystemStatus
} from '@/stores/pos/core/posSystem'

const MODULE_NAME = 'PosNavigationMenu'

// =============================================
// SETUP
// =============================================

const router = useRouter()

// Stores
const posStore = usePosStore()
const shiftsStore = useShiftsStore()
const authStore = useAuthStore()

// =============================================
// STATE
// =============================================

const loading = ref(false)
const syncing = ref(false)
const currentTime = ref('')

// Time update interval
let timeInterval: NodeJS.Timeout | null = null

// =============================================
// COMPUTED PROPERTIES
// =============================================
const hasNotifications = computed(() => {
  return !posStore.isOnline || !currentShift.value
})

const notificationVariant = computed(() => {
  if (!posStore.isOnline) return 'error'
  if (!currentShift.value) return 'warning'
  return 'info'
})
const currentShift = computed(() => shiftsStore.currentShift)

const cashierName = computed(() => {
  const user = authStore.currentUser
  return user ? formatCashierName(user.name) : 'Unknown'
})

const systemStatus = computed((): PosSystemStatus => {
  return calculatePosSystemStatus({
    isOnline: posStore.isOnline,
    hasShift: !!currentShift.value,
    hasErrors: !!posStore.error,
    isSyncing: syncing.value
  })
})

const systemStatusDisplay = computed(() => getPosStatusColor(systemStatus.value))
const systemStatusLabel = computed(() => getPosStatusLabel(systemStatus.value))

const shiftStatusDisplay = computed(() => {
  if (!currentShift.value) return undefined
  return 'success' as const
})

const shiftLabel = computed(() => {
  if (!currentShift.value) return undefined
  return `Shift ${formatShiftTime(currentShift.value.startTime)}`
})

const connectionStatus = computed(() => {
  return posStore.isOnline ? ('success' as const) : ('error' as const)
})

const shiftDetails = computed(() => {
  if (!currentShift.value) {
    return 'No active shift'
  }

  const startTime = formatShiftTime(currentShift.value.startTime)
  const shiftNumber = currentShift.value.shiftNumber || 'N/A'
  return `Shift ${shiftNumber} started at ${startTime}`
})

const menuSections = computed(() => [
  // Shift Management Section
  {
    title: 'SHIFT',
    actions: [
      ...(currentShift.value
        ? []
        : [
            {
              id: POS_ACTIONS.START_SHIFT,
              icon: 'mdi-play',
              label: 'Start Shift',
              disabled: loading.value,
              color: 'success' as const
            }
          ]),
      ...(currentShift.value
        ? [
            {
              id: POS_ACTIONS.END_SHIFT,
              icon: 'mdi-stop',
              label: 'End Shift',
              disabled: loading.value,
              color: 'warning' as const
            }
          ]
        : [])
    ]
  },

  // Actions Section
  {
    title: 'ACTIONS',
    actions: [
      {
        id: POS_ACTIONS.SYNC_DATA,
        icon: 'mdi-refresh',
        label: 'Sync Data',
        loading: syncing.value,
        disabled: loading.value
      }
    ]
  },

  // System Section
  {
    title: 'SYSTEM',
    actions: [
      {
        id: POS_ACTIONS.LOGOUT,
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

const updateTime = () => {
  currentTime.value = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleAction = async (actionId: string) => {
  DebugUtils.debug(MODULE_NAME, 'Action clicked', { actionId })

  try {
    switch (actionId) {
      case POS_ACTIONS.START_SHIFT:
        await handleStartShift()
        break

      case POS_ACTIONS.END_SHIFT:
        await handleEndShift()
        break

      case POS_ACTIONS.NEW_ORDER:
        handleNewOrder()
        break

      case POS_ACTIONS.SYNC_DATA:
        await handleSyncData()
        break

      case POS_ACTIONS.LOGOUT:
        await handleLogout()
        break

      default:
        DebugUtils.warn(MODULE_NAME, 'Unknown action', { actionId })
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Action failed', { actionId, error })
  }
}

const handleStartShift = async () => {
  loading.value = true

  try {
    const user = authStore.currentUser
    if (!user) throw new Error('No authenticated user')

    // TODO: Open start shift dialog for cash amount input
    // For now, start with 0 cash
    await shiftsStore.startShift(user.id, user.name, 0)

    DebugUtils.info(MODULE_NAME, 'Shift started successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to start shift', error)
  } finally {
    loading.value = false
  }
}

const handleEndShift = async () => {
  loading.value = true

  try {
    if (!currentShift.value) return

    // TODO: Open end shift dialog for cash count and corrections
    // For now, end with basic data
    await shiftsStore.endShift(currentShift.value.id, {
      endingCash: 0,
      actualAccountBalances: {},
      corrections: [],
      performedBy: {
        id: authStore.currentUser?.id || '',
        name: authStore.currentUser?.name || '',
        role: 'cashier'
      }
    })

    DebugUtils.info(MODULE_NAME, 'Shift ended successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to end shift', error)
  } finally {
    loading.value = false
  }
}

const handleNewOrder = () => {
  DebugUtils.debug(MODULE_NAME, 'Creating new order')
  // TODO: Implement new order creation
  // This should probably emit an event or call a method in parent component
}

const handleSyncData = async () => {
  syncing.value = true

  try {
    await posStore.syncData()
    DebugUtils.info(MODULE_NAME, 'Data synced successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Sync failed', error)
  } finally {
    syncing.value = false
  }
}

const handleLogout = async () => {
  loading.value = true

  try {
    // Warn if shift is active
    if (currentShift.value) {
      DebugUtils.warn(MODULE_NAME, 'Logging out with active shift')
      // TODO: Show warning dialog
    }

    await authStore.logout()
    await router.push('/auth/login')

    DebugUtils.info(MODULE_NAME, 'Logged out successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Logout failed', error)
  } finally {
    loading.value = false
  }
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  DebugUtils.debug(MODULE_NAME, 'PosNavigationMenu mounted')
  updateTime()
  timeInterval = setInterval(updateTime, 60000) // Update every minute
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.pos-navigation-menu {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 0 var(--spacing-sm);
  padding-bottom: var(--spacing-md);
  padding-top: var(--spacing-sm);
}
.pos-navigation-menu :deep(.notification-badge) {
  width: 100%;
}

.pos-navigation-menu :deep(.menu-button) {
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

.cashier-info {
  flex: 1;
  min-width: 0;
}

.cashier-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2px;
}

.shift-details {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.2;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .cashier-name {
    font-size: var(--text-xs);
  }

  .shift-details {
    font-size: 10px;
  }
}
</style>
