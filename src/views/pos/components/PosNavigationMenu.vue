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

    <!-- Shift Management Dialogs -->
    <StartShiftDialog v-model="showStartShiftDialog" @shift-started="handleShiftStarted" />
    <EndShiftDialog v-model="showEndShiftDialog" @shift-ended="handleShiftEnded" />

    <!-- Printer Settings Dialog -->
    <PrinterSettingsDialog v-model="showPrinterSettingsDialog" />
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

// Import shift dialogs
import StartShiftDialog from '@/views/pos/shifts/dialogs/StartShiftDialog.vue'
import EndShiftDialog from '@/views/pos/shifts/dialogs/EndShiftDialog.vue'

// Import printer settings dialog
import PrinterSettingsDialog from '@/views/pos/settings/PrinterSettingsDialog.vue'

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

// Dialog states
const showStartShiftDialog = ref(false)
const showEndShiftDialog = ref(false)
const showPrinterSettingsDialog = ref(false)

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
      // View Shift Management - Always available
      {
        id: POS_ACTIONS.VIEW_SHIFT,
        icon: 'mdi-cash-register',
        label: 'Shift Management',
        disabled: loading.value,
        color: 'primary' as const
      },
      // Start Shift (only when no shift)
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
      // End Shift (only when shift is active)
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
        id: POS_ACTIONS.GOODS_RECEIPT,
        icon: 'mdi-package-variant-closed-check',
        label: 'Goods Receipt',
        disabled: loading.value || !currentShift.value,
        color: 'info' as const
      },
      {
        id: POS_ACTIONS.SYNC_DATA,
        icon: 'mdi-refresh',
        label: 'Sync Data',
        loading: syncing.value,
        disabled: loading.value
      }
    ]
  },

  // Settings Section
  {
    title: 'SETTINGS',
    actions: [
      {
        id: POS_ACTIONS.PRINTER_SETTINGS,
        icon: 'mdi-printer-settings',
        label: 'Printer',
        disabled: loading.value
      }
    ]
  },

  // System Section
  {
    title: 'SYSTEM',
    actions: [
      {
        id: 'help',
        icon: 'mdi-help-circle-outline',
        label: 'Help',
        disabled: loading.value
      },
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
        handleStartShift()
        break

      case POS_ACTIONS.END_SHIFT:
        handleEndShift()
        break

      case POS_ACTIONS.VIEW_SHIFT:
        handleViewShift()
        break

      case POS_ACTIONS.NEW_ORDER:
        handleNewOrder()
        break

      case POS_ACTIONS.SYNC_DATA:
        await handleSyncData()
        break

      case POS_ACTIONS.GOODS_RECEIPT:
        handleGoodsReceipt()
        break

      case POS_ACTIONS.PRINTER_SETTINGS:
        handlePrinterSettings()
        break

      case POS_ACTIONS.LOGOUT:
        await handleLogout()
        break

      case 'help':
        router.push('/help/pos')
        break

      default:
        DebugUtils.warn(MODULE_NAME, 'Unknown action', { actionId })
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Action failed', { actionId, error })
  }
}

const handleStartShift = () => {
  DebugUtils.debug(MODULE_NAME, 'Opening start shift dialog')
  showStartShiftDialog.value = true
}

const handleEndShift = () => {
  DebugUtils.debug(MODULE_NAME, 'Opening end shift dialog')
  showEndShiftDialog.value = true
}

const handleViewShift = () => {
  DebugUtils.debug(MODULE_NAME, 'Navigating to shift management view')
  router.push('/pos/shift-management')
}

const handleGoodsReceipt = () => {
  DebugUtils.debug(MODULE_NAME, 'Navigating to goods receipt view')
  router.push('/pos/receipts')
}

const handlePrinterSettings = () => {
  DebugUtils.debug(MODULE_NAME, 'Opening printer settings dialog')
  showPrinterSettingsDialog.value = true
}

const handleShiftStarted = (data: { shift: unknown; startTime: string }) => {
  DebugUtils.info(MODULE_NAME, 'Shift started successfully', { shift: data.shift })
  showStartShiftDialog.value = false
}

const handleShiftEnded = (data: { shift: unknown; endTime: string; discrepancy?: number }) => {
  DebugUtils.info(MODULE_NAME, 'Shift ended successfully', { shift: data.shift })
  showEndShiftDialog.value = false
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
