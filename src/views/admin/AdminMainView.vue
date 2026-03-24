<!-- src/views/admin/AdminMainView.vue -->
<template>
  <div class="admin-main-container">
    <!-- Loading -->
    <div v-if="loading" class="admin-loading">
      <v-progress-circular indeterminate size="64" color="primary" />
      <h3 class="mt-4">Loading Admin Panel...</h3>
    </div>

    <!-- No Permission -->
    <div v-else-if="!canAccess" class="admin-loading">
      <v-icon size="64" color="error">mdi-shield-off</v-icon>
      <h3 class="mt-4">Access Denied</h3>
      <p class="text-medium-emphasis">Admin/Manager role required</p>
    </div>

    <!-- Main -->
    <KitchenLayout v-else>
      <template #sidebar>
        <AdminSidebar :current-screen="currentScreen" @screen-select="currentScreen = $event" />
      </template>

      <template #content>
        <div class="admin-screen-content">
          <MenuScreen v-if="currentScreen === 'menu'" />
          <ChannelsScreen v-else-if="currentScreen === 'channels'" />
          <LoyaltySettingsScreen
            v-else-if="currentScreen === 'loyalty' || currentScreen === 'customers'"
          />
          <StaffScreen v-else-if="currentScreen === 'staff'" />
          <PayrollScreen v-else-if="currentScreen === 'payroll'" />
          <DashboardScreen v-else-if="currentScreen === 'dashboard'" />
        </div>
      </template>
    </KitchenLayout>

    <!-- Global snackbar -->
    <v-snackbar
      v-model="snackbarState.show"
      :color="snackbarState.color"
      :timeout="snackbarState.timeout"
      location="top right"
    >
      {{ snackbarState.message }}
      <template #actions>
        <v-btn variant="text" icon="mdi-close" @click="snackbarState.show = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'
import KitchenLayout from '@/layouts/KitchenLayout.vue'
import AdminSidebar from './components/AdminSidebar.vue'
import type { AdminScreenName } from './types'

// Lazy load screens
import { defineAsyncComponent } from 'vue'
const MenuScreen = defineAsyncComponent(() => import('./menu/MenuScreen.vue'))
const ChannelsScreen = defineAsyncComponent(() => import('./channels/ChannelsScreen.vue'))
const LoyaltySettingsScreen = defineAsyncComponent(
  () => import('./loyalty/LoyaltySettingsScreen.vue')
)
const DashboardScreen = defineAsyncComponent(() => import('./dashboard/DashboardScreen.vue'))
const StaffScreen = defineAsyncComponent(() => import('./staff/StaffScreen.vue'))
const PayrollScreen = defineAsyncComponent(() => import('./payroll/PayrollScreen.vue'))

const authStore = useAuthStore()
const { state: snackbarState } = useSnackbar()

const currentScreen = ref<AdminScreenName>('menu')
const loading = ref(true)

const canAccess = computed(() => {
  const roles = authStore.userRoles
  return roles.includes('admin') || roles.includes('manager')
})

onMounted(async () => {
  // M7 FIX: Independent try-catch per store so one failure doesn't block others
  const inits = [
    async () => {
      const { useMenuCollectionsStore } = await import('@/stores/menuCollections')
      const s = useMenuCollectionsStore()
      if (!s.initialized) await s.initialize()
    },
    async () => {
      const { useChannelsStore } = await import('@/stores/channels')
      const s = useChannelsStore()
      if (!s.initialized) await s.initialize()
    },
    async () => {
      const { useCustomersStore } = await import('@/stores/customers')
      const s = useCustomersStore()
      if (!s.initialized) await s.initialize()
    },
    async () => {
      const { useLoyaltyStore } = await import('@/stores/loyalty')
      const s = useLoyaltyStore()
      if (!s.initialized) await s.initialize()
    },
    async () => {
      const { useStaffStore } = await import('@/stores/staff')
      const s = useStaffStore()
      if (!s.initialized) await s.initialize()
    }
  ]

  await Promise.allSettled(
    inits.map(async fn => {
      try {
        await fn()
      } catch (e) {
        console.error('Admin store init error:', e)
      }
    })
  )

  loading.value = false
})
</script>

<style scoped lang="scss">
.admin-main-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.admin-loading {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.admin-screen-content {
  height: 100%;
  overflow-y: auto;
  background-color: var(--v-theme-background);
}
</style>
