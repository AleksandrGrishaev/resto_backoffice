<!-- src/views/admin/components/AdminSidebar.vue -->
<template>
  <div class="admin-sidebar">
    <div class="sidebar-header">
      <v-icon size="28" color="primary">mdi-shield-crown-outline</v-icon>
      <span class="sidebar-title">Admin</span>
    </div>

    <div class="screens-section">
      <v-btn
        v-for="screen in screens"
        :key="screen.id"
        :class="['screen-btn', { active: currentScreen === screen.id }]"
        :color="currentScreen === screen.id ? 'primary' : undefined"
        :variant="currentScreen === screen.id ? 'flat' : 'text'"
        block
        height="56"
        @click="emit('screen-select', screen.id)"
      >
        <div class="screen-btn-content">
          <v-icon size="24">{{ screen.icon }}</v-icon>
          <span class="screen-btn-label">{{ screen.label }}</span>
        </div>
      </v-btn>
    </div>

    <div class="spacer" />

    <!-- Action Menu (hamburger popup) -->
    <div class="menu-section">
      <ActionMenu :sections="menuSections" :loading="loading" @action="handleAction">
        <template #header>
          <div class="menu-header">
            <div class="admin-info">
              <div class="admin-name">{{ userName }}</div>
              <div class="admin-role">{{ userRoleLabel }}</div>
            </div>
          </div>
        </template>
      </ActionMenu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ActionMenu from '@/components/molecules/navigation/ActionMenu.vue'
import type { AdminScreenName } from '../types'

defineProps<{
  currentScreen: AdminScreenName
}>()

const emit = defineEmits<{
  'screen-select': [screen: AdminScreenName]
}>()

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)

const screens = [
  { id: 'dashboard' as AdminScreenName, label: 'Dashboard', icon: 'mdi-chart-box-outline' },
  { id: 'channels' as AdminScreenName, label: 'Channels', icon: 'mdi-store' },
  { id: 'loyalty' as AdminScreenName, label: 'Loyalty', icon: 'mdi-star-circle' },
  { id: 'staff' as AdminScreenName, label: 'Staff', icon: 'mdi-account-group' },
  { id: 'payroll' as AdminScreenName, label: 'Payroll', icon: 'mdi-cash-multiple' }
]

const userName = computed(() => {
  const user = authStore.currentUser
  return user ? user.name : 'Admin'
})

const userRoleLabel = computed(() => {
  const roles = authStore.userRoles
  if (roles.includes('admin')) return 'Administrator'
  if (roles.includes('manager')) return 'Manager'
  return 'Staff'
})

const menuSections = computed(() => [
  {
    title: 'NAVIGATE',
    actions: [
      {
        id: 'nav_kitchen',
        icon: 'mdi-chef-hat',
        label: 'Kitchen',
        disabled: loading.value
      },
      {
        id: 'nav_desktop',
        icon: 'mdi-view-dashboard',
        label: 'Desktop',
        disabled: loading.value
      }
    ]
  },
  {
    title: 'SYSTEM',
    actions: [
      {
        id: 'logout',
        icon: 'mdi-logout',
        label: 'Logout',
        disabled: loading.value,
        color: 'error' as const
      }
    ]
  }
])

const handleAction = async (actionId: string) => {
  switch (actionId) {
    case 'nav_kitchen':
      router.push('/kitchen')
      break
    case 'nav_desktop':
      router.push('/')
      break
    case 'logout':
      await handleLogout()
      break
  }
}

const handleLogout = async () => {
  loading.value = true
  try {
    await authStore.logout()
    await router.push('/auth/login')
  } catch (error) {
    console.error('Logout failed:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.admin-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--v-theme-surface);
}

.sidebar-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.sidebar-title {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.screens-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
}

.screen-btn {
  text-transform: none;
  font-weight: 500;
  letter-spacing: normal;
  border-radius: 8px;

  &:not(.active) {
    opacity: 0.7;
  }

  &:hover,
  &.active {
    opacity: 1;
  }
}

.screen-btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  width: 100%;
}

.screen-btn-label {
  font-size: var(--text-sm);
  font-weight: 600;
}

.spacer {
  flex: 1;
}

.menu-section {
  padding: 0 var(--spacing-sm);
  padding-bottom: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.menu-section :deep(.menu-button) {
  width: 100%;
  justify-content: center;
  margin: 0;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.admin-info {
  flex: 1;
  min-width: 0;
}

.admin-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2px;
}

.admin-role {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.2;
}
</style>
