<template>
  <v-list-group value="accounts">
    <template #activator="{ props }">
      <v-list-item v-bind="props" prepend-icon="mdi-wallet" title="Accounts" color="primary" />
    </template>
    <v-list-item
      to="/accounts"
      :exact="true"
      prepend-icon="mdi-format-list-bulleted"
      color="primary"
      class="mb-2"
    >
      <template #title>
        <span>All Accounts</span>
      </template>
    </v-list-item>

    <!-- Payments Management -->
    <v-list-item to="/accounts/payments" prepend-icon="mdi-cash-sync" color="primary" class="mb-2">
      <template #title>
        <span>Payments</span>
      </template>
    </v-list-item>

    <!-- Активные счета -->
    <v-divider class="my-2" />
    <template v-if="loading">
      <v-list-item>
        <template #prepend>
          <v-progress-circular indeterminate size="20" />
        </template>
        <v-list-item-title>Loading accounts...</v-list-item-title>
      </v-list-item>
    </template>
    <template v-else>
      <v-list-item
        v-for="account in activeAccounts"
        :key="account.id"
        :to="`/accounts/${account.id}`"
        :prepend-icon="getAccountIcon(account.type)"
        color="primary"
        class="mb-2"
      >
        <template #title>
          <div class="d-flex align-center justify-space-between">
            <span class="text-truncate">{{ account.name }}</span>
          </div>
        </template>
      </v-list-item>
    </template>
  </v-list-group>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import { formatIDR } from '@/utils/currency'

const accountStore = useAccountStore()
const loading = ref(true)

// Используем computed свойство из store
const activeAccounts = computed(() => accountStore.activeAccounts)

function getAccountIcon(type: string) {
  const icons = {
    bank: 'mdi-bank',
    cash: 'mdi-cash',
    card: 'mdi-credit-card',
    gojeck: 'mdi-wallet',
    grab: 'mdi-wallet',
    default: 'mdi-wallet'
  }
  return icons[type] || icons.default
}

onMounted(async () => {
  try {
    await accountStore.fetchAccounts()
  } finally {
    loading.value = false
  }
})
</script>
