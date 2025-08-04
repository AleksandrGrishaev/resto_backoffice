<!-- src/components/navigation/NavigationMenu.vue -->
<template>
  <div class="d-flex flex-column fill-height">
    <!-- Header -->
    <v-toolbar flat density="compact" class="navigation-header px-4">
      <v-toolbar-title :class="{ 'text-center': rail }">
        {{ rail ? 'BO' : 'BackOffice' }}
      </v-toolbar-title>
    </v-toolbar>

    <!-- Navigation -->
    <v-list nav class="px-2 flex-grow-1 overflow-y-auto">
      <!-- Menu -->
      <v-list-item
        to="/menu"
        prepend-icon="mdi-silverware-fork-knife"
        color="primary"
        class="mb-2"
        :active-color="variables.colorPrimary"
      >
        <template #title>
          <span>Menu</span>
        </template>
      </v-list-item>

      <!-- Recipes -->
      <v-list-item
        to="/recipes"
        prepend-icon="mdi-book-open-page-variant"
        color="primary"
        class="mb-2"
        :active-color="variables.colorPrimary"
      >
        <template #title>
          <span>Recipes</span>
        </template>
      </v-list-item>

      <!-- Products -->
      <v-list-item
        to="/products"
        prepend-icon="mdi-package-variant"
        color="primary"
        class="mb-2"
        :active-color="variables.colorPrimary"
      >
        <template #title>
          <span>Products</span>
        </template>
      </v-list-item>

      <!-- Storage -->
      <v-list-item
        to="/storage"
        prepend-icon="mdi-warehouse"
        color="primary"
        class="mb-2"
        :active-color="variables.colorPrimary"
      >
        <template #title>
          <span>Storage</span>
        </template>
        <template #append>
          <storage-alerts-badge />
        </template>
      </v-list-item>

      <!-- Accounts with active accounts -->
      <navigation-accounts />

      <!-- Payment -->
      <v-list-item
        to="/payment-settings"
        prepend-icon="mdi-cash-register"
        color="primary"
        class="mb-2"
        :active-color="variables.colorPrimary"
      >
        <template #title>
          <span>Payment</span>
        </template>
      </v-list-item>
    </v-list>

    <!-- User Info & Actions -->
    <div class="navigation-footer pa-4">
      <v-list density="compact" class="pa-0 mb-4">
        <v-list-item
          prepend-icon="mdi-account"
          :title="authStore.state.currentUser?.name"
          :subtitle="getUserRole"
        />
      </v-list>

      <div class="d-flex flex-column gap-2">
        <v-btn block color="error" variant="text" prepend-icon="mdi-logout" @click="handleLogout">
          {{ rail ? '' : 'LOGOUT' }}
        </v-btn>
        <v-btn
          block
          variant="text"
          :prepend-icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          @click="$emit('update:rail', !rail)"
        >
          {{ rail ? '' : 'COLLAPSE' }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { DebugUtils } from '@/utils'
import NavigationAccounts from './NavigationAccounts.vue'
import StorageAlertsBadge from './StorageAlertsBadge.vue'
import * as variables from '@/styles/variables.scss'

const MODULE_NAME = 'NavigationMenu'

defineProps<{
  rail?: boolean
}>()

defineEmits<{
  'update:rail': [boolean]
}>()

const router = useRouter()
const authStore = useAuthStore()

const getUserRole = computed(() => {
  const roles = authStore.state.currentUser?.roles || []
  return roles.join(', ').toUpperCase()
})

async function handleLogout() {
  try {
    await authStore.logout()
    router.push({ name: 'login' })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Logout error', { error })
  }
}
</script>

<style lang="scss" scoped>
.navigation-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.navigation-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

:deep(.v-list) {
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
}
</style>
