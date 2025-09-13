<!-- src/views/pos/components/PosNavigationMenu.vue -->
<template>
  <div class="pos-navigation-menu">
    <v-menu location="top end" offset="8">
      <template #activator="{ props }">
        <v-btn variant="text" block v-bind="props" class="menu-btn" height="44">
          <v-icon icon="mdi-menu" size="20" />
        </v-btn>
      </template>

      <v-list class="navigation-list">
        <!-- Shift Management -->
        <v-list-subheader>Shift</v-list-subheader>

        <v-list-item
          v-if="!isShiftOpen"
          prepend-icon="mdi-play"
          title="Open Shift"
          @click="handleOpenShift"
        />

        <v-list-item v-else prepend-icon="mdi-stop" title="Close Shift" @click="handleCloseShift" />

        <v-divider class="my-2" />

        <!-- Navigation -->
        <v-list-subheader>Navigation</v-list-subheader>

        <v-list-item prepend-icon="mdi-history" title="Shift History" to="/shift" />

        <v-list-item prepend-icon="mdi-account-group" title="Customers" to="/customers" />

        <v-list-item prepend-icon="mdi-cog" title="Settings" @click="handleSettings" />

        <v-divider class="my-2" />

        <!-- Debug (только в development) -->
        <template v-if="isDevelopment">
          <v-list-subheader>Debug</v-list-subheader>

          <v-list-item prepend-icon="mdi-code-json" title="Debug Stores" to="/debug/stores" />
        </template>

        <!-- Logout -->
        <v-list-item
          prepend-icon="mdi-logout"
          title="Logout"
          :loading="logoutLoading"
          @click="handleLogout"
        />
      </v-list>
    </v-menu>

    <!-- Shift Confirmation Dialog -->
    <v-dialog v-model="showShiftDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">
          {{ isShiftOpen ? 'Close Shift' : 'Open Shift' }}
        </v-card-title>

        <v-card-text>
          <p v-if="!isShiftOpen">Are you sure you want to open a new shift?</p>
          <p v-else>
            Are you sure you want to close the current shift? This will finalize all transactions
            and generate reports.
          </p>

          <v-alert
            v-if="isShiftOpen && hasActiveOrders"
            type="warning"
            variant="tonal"
            class="mt-3"
            density="compact"
          >
            You have active orders. Please complete them before closing the shift.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showShiftDialog = false">Cancel</v-btn>
          <v-btn
            :color="isShiftOpen ? 'error' : 'primary'"
            :disabled="isShiftOpen && hasActiveOrders"
            :loading="shiftLoading"
            @click="confirmShiftAction"
          >
            {{ isShiftOpen ? 'Close Shift' : 'Open Shift' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PosNavigationMenu'

// Router
const router = useRouter()

// State
const showShiftDialog = ref(false)
const shiftLoading = ref(false)
const logoutLoading = ref(false)
const isShiftOpen = ref(false) // TODO: заменить на реальные данные из store
const hasActiveOrders = ref(false) // TODO: заменить на реальные данные из store

// Computed
const isDevelopment = computed(() => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development'
})

// Methods
const handleOpenShift = () => {
  DebugUtils.debug(MODULE_NAME, 'Open shift requested')
  showShiftDialog.value = true
}

const handleCloseShift = () => {
  DebugUtils.debug(MODULE_NAME, 'Close shift requested')
  showShiftDialog.value = true
}

const confirmShiftAction = async () => {
  try {
    shiftLoading.value = true

    if (isShiftOpen.value) {
      // Close shift logic
      DebugUtils.debug(MODULE_NAME, 'Closing shift')
      console.log('Closing current shift...')
      // TODO: Интеграция с реальным shift store
      isShiftOpen.value = false
    } else {
      // Open shift logic
      DebugUtils.debug(MODULE_NAME, 'Opening shift')
      console.log('Opening new shift...')
      // TODO: Интеграция с реальным shift store
      isShiftOpen.value = true
    }

    showShiftDialog.value = false
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Shift action failed', error)
    console.error('Shift action failed:', error)
  } finally {
    shiftLoading.value = false
  }
}

const handleSettings = () => {
  DebugUtils.debug(MODULE_NAME, 'Settings requested')
  console.log('Opening settings...')
  // TODO: Навигация к настройкам или открытие диалога настроек
}

const handleLogout = async () => {
  try {
    logoutLoading.value = true
    DebugUtils.debug(MODULE_NAME, 'Logout requested')

    console.log('Logging out...')
    // TODO: Интеграция с реальным auth store
    // await authStore.logout()
    // router.push('/auth/login')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Logout failed', error)
    console.error('Logout failed:', error)
  } finally {
    logoutLoading.value = false
  }
}
</script>

<style scoped>
.pos-navigation-menu {
  padding: var(--pos-padding, 4px);
}

.menu-btn {
  border-radius: var(--pos-border-radius, 4px);
  color: rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
  height: var(--pos-button-height, 44px);
  min-width: calc(var(--pos-sidebar-width, 64px) - var(--pos-padding, 4px) * 2);
}

.menu-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.navigation-list {
  min-width: 200px;
  background-color: var(--v-theme-surface);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
}

:deep(.v-list-subheader) {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.0625em;
  color: rgba(255, 255, 255, 0.6);
  padding: 8px 16px 4px 16px;
}

:deep(.v-list-item) {
  border-radius: 6px;
  margin: 2px 8px;
  min-height: 40px;
}

:deep(.v-list-item:hover) {
  background-color: rgba(255, 255, 255, 0.08);
}

:deep(.v-list-item-title) {
  font-size: 0.875rem;
  font-weight: 400;
}

:deep(.v-divider) {
  margin: 8px 16px;
  opacity: 0.12;
}
</style>
