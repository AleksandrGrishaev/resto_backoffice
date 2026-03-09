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
const DashboardScreen = defineAsyncComponent(() => import('./dashboard/DashboardScreen.vue'))

const authStore = useAuthStore()
const { state: snackbarState } = useSnackbar()

const currentScreen = ref<AdminScreenName>('menu')
const loading = ref(true)

const canAccess = computed(() => {
  const roles = authStore.userRoles
  return roles.includes('admin') || roles.includes('manager')
})

onMounted(async () => {
  // Ensure menuCollections store is loaded
  try {
    const { useMenuCollectionsStore } = await import('@/stores/menuCollections')
    const store = useMenuCollectionsStore()
    if (!store.initialized) {
      await store.initialize()
    }

    // Ensure channels store is loaded (Gap #18)
    const { useChannelsStore } = await import('@/stores/channels')
    const channelsStore = useChannelsStore()
    if (!channelsStore.initialized) {
      await channelsStore.initialize()
    }
  } catch (error) {
    console.error('Admin initialization error:', error)
  } finally {
    loading.value = false
  }
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
