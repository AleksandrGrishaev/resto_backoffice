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

    <!-- Navigation to other sections -->
    <div class="nav-section">
      <v-btn variant="text" block height="48" to="/kitchen" class="nav-btn">
        <v-icon start>mdi-chef-hat</v-icon>
        Kitchen
      </v-btn>
      <v-btn variant="text" block height="48" to="/" class="nav-btn">
        <v-icon start>mdi-view-dashboard</v-icon>
        Desktop
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminScreenName } from '../types'

defineProps<{
  currentScreen: AdminScreenName
}>()

const emit = defineEmits<{
  'screen-select': [screen: AdminScreenName]
}>()

const screens = [
  { id: 'menu' as AdminScreenName, label: 'Menu', icon: 'mdi-book-open-variant' },
  { id: 'channels' as AdminScreenName, label: 'Channels', icon: 'mdi-store' },
  { id: 'loyalty' as AdminScreenName, label: 'Loyalty', icon: 'mdi-star-circle' },
  { id: 'staff' as AdminScreenName, label: 'Staff', icon: 'mdi-account-group' },
  { id: 'payroll' as AdminScreenName, label: 'Payroll', icon: 'mdi-cash-multiple' },
  { id: 'dashboard' as AdminScreenName, label: 'Dashboard', icon: 'mdi-chart-box-outline' }
]
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

.nav-section {
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.nav-btn {
  text-transform: none;
  font-size: 0.8rem;
  opacity: 0.6;
  justify-content: flex-start;

  &:hover {
    opacity: 1;
  }
}
</style>
