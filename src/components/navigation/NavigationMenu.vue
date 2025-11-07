<!-- src/components/navigation/NavigationMenu.vue - UPDATED with Debug -->
<template>
  <div class="d-flex flex-column fill-height">
    <!-- Header -->
    <v-toolbar flat density="compact" class="navigation-header px-4">
      <v-toolbar-title :class="{ 'text-center': rail }">
        {{ rail ? 'BO' : 'BackOffice' }}
        <!-- ✅ НОВЫЙ: Dev indicator -->
        <v-chip v-if="isDev && !rail" size="x-small" color="warning" variant="tonal" class="ms-2">
          DEV
        </v-chip>
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

      <!-- Preparations -->
      <v-list-item
        to="/preparations"
        prepend-icon="mdi-chef-hat"
        color="primary"
        class="mb-2"
        :active-color="variables.colorPrimary"
      >
        <template #title>
          <span>Preparations</span>
        </template>
        <template #append>
          <alerts-badge type="preparation" />
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
          <alerts-badge type="storage" />
        </template>
      </v-list-item>

      <!-- Suppliers & Procurement -->
      <v-list-item
        to="/suppliers"
        prepend-icon="mdi-truck"
        color="primary"
        class="mb-2"
        :active-color="variables.colorPrimary"
      >
        <template #title>
          <span>Suppliers</span>
        </template>
        <template #append>
          <alerts-badge type="supplier" />
        </template>
      </v-list-item>

      <!-- Accounts with active accounts -->
      <navigation-accounts />

      <!-- Sales Section (Sprint 2) -->
      <v-list-group value="sales" class="mb-2">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-cash-multiple"
            color="primary"
            :active-color="variables.colorPrimary"
          >
            <template #title>
              <span>Sales</span>
            </template>
          </v-list-item>
        </template>

        <!-- Sales Analytics -->
        <v-list-item
          to="/sales/analytics"
          prepend-icon="mdi-chart-line"
          color="primary"
          class="ps-8"
          :active-color="variables.colorPrimary"
        >
          <template #title>
            <span>Analytics</span>
          </template>
        </v-list-item>

        <!-- Sales Transactions -->
        <v-list-item
          to="/sales/transactions"
          prepend-icon="mdi-receipt-text"
          color="primary"
          class="ps-8"
          :active-color="variables.colorPrimary"
        >
          <template #title>
            <span>Transactions</span>
          </template>
        </v-list-item>

        <!-- Write-off History -->
        <v-list-item
          to="/inventory/write-offs"
          prepend-icon="mdi-file-document-remove"
          color="primary"
          class="ps-8"
          :active-color="variables.colorPrimary"
        >
          <template #title>
            <span>Write-off History</span>
          </template>
        </v-list-item>
      </v-list-group>

      <!-- Catalogs Section -->
      <v-list-group value="catalogs" class="mb-2">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-folder-open"
            color="primary"
            :active-color="variables.colorPrimary"
          >
            <template #title>
              <span>Catalogs</span>
            </template>
          </v-list-item>
        </template>

        <!-- Recipes -->
        <v-list-item
          to="/recipes"
          prepend-icon="mdi-book-open-page-variant"
          color="primary"
          class="ps-8"
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
          class="ps-8"
          :active-color="variables.colorPrimary"
        >
          <template #title>
            <span>Products</span>
          </template>
        </v-list-item>

        <!-- Counteragents -->
        <v-list-item
          to="/counteragents"
          prepend-icon="mdi-store"
          color="primary"
          class="ps-8"
          :active-color="variables.colorPrimary"
        >
          <template #title>
            <span>Counteragents</span>
          </template>
        </v-list-item>

        <!-- Payment Settings -->
        <v-list-item
          to="/payment-settings"
          prepend-icon="mdi-cash-register"
          color="primary"
          class="ps-8"
          :active-color="variables.colorPrimary"
        >
          <template #title>
            <span>Payment</span>
          </template>
        </v-list-item>
      </v-list-group>

      <!-- ✅ НОВЫЙ: Developer Tools Section (только в dev режиме) -->
      <v-list-group v-if="isDev" value="developer" class="mb-2">
        <template #activator="{ props }">
          <v-list-item
            v-bind="props"
            prepend-icon="mdi-developer-board"
            color="warning"
            :active-color="variables.colorWarning"
          >
            <template #title>
              <span>Developer</span>
            </template>
            <template #append>
              <v-chip size="x-small" color="warning" variant="tonal">DEV</v-chip>
            </template>
          </v-list-item>
        </template>

        <!-- Debug Stores -->
        <v-list-item
          to="/debug/stores"
          prepend-icon="mdi-bug"
          color="warning"
          class="ps-8"
          :active-color="variables.colorWarning"
        >
          <template #title>
            <span>Debug Stores</span>
          </template>
          <template #append>
            <debug-stores-badge />
          </template>
        </v-list-item>

        <!-- :TODO Future debug tools -->
        <!--
        <v-list-item
          to="/debug/performance"
          prepend-icon="mdi-speedometer"
          color="warning"
          class="ps-8"
          :active-color="variables.colorWarning"
          disabled
        >
          <template #title>
            <span>Performance</span>
          </template>
        </v-list-item>

        <v-list-item
          to="/debug/network"
          prepend-icon="mdi-lan"
          color="warning"
          class="ps-8"
          :active-color="variables.colorWarning"
          disabled
        >
          <template #title>
            <span>Network</span>
          </template>
        </v-list-item>
        -->
      </v-list-group>
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
import { useAuthStore } from '@/stores/auth'
import { DebugUtils } from '@/utils'
import NavigationAccounts from './NavigationAccounts.vue'
import AlertsBadge from './AlertsBadge.vue'
// ✅ НОВЫЙ: Импорт Debug Stores Badge
import DebugStoresBadge from './DebugStoresBadge.vue'
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

// ✅ НОВЫЙ: Dev mode detection
const isDev = computed(() => import.meta.env.DEV)

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

// Styling for grouped items
:deep(.v-list-group) {
  .v-list-item {
    border-radius: 8px;
    margin-bottom: 4px;
  }

  .v-list-group__items {
    .v-list-item {
      margin-bottom: 2px;
      border-radius: 6px;
    }
  }
}

// Active state styling for nested items
:deep(.v-list-item--active) {
  background-color: rgba(25, 118, 210, 0.12);

  &.ps-8 {
    border-left: 3px solid var(--v-theme-primary);
    margin-left: 8px;
    padding-left: calc(2rem - 3px) !important;
  }
}

// ✅ НОВЫЙ: Developer section styling
:deep(.v-list-group[value='developer']) {
  .v-list-item--active {
    background-color: rgba(255, 152, 0, 0.12);

    &.ps-8 {
      border-left: 3px solid var(--v-theme-warning);
    }
  }
}
</style>
