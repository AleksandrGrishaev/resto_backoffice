<template>
  <v-list-group value="accounts">
    <template #activator="{ props }">
      <v-list-item
        v-bind="props"
        prepend-icon="mdi-wallet"
        title="Счета"
        color="primary"
        :active-color="variables.colorPrimary"
      />
    </template>

    <v-list-item
      to="/accounts"
      prepend-icon="mdi-format-list-bulleted"
      color="primary"
      class="mb-2"
      :active-color="variables.colorPrimary"
    >
      <template #title>
        <span>Список счетов</span>
      </template>
    </v-list-item>

    <!-- Активные счета -->
    <v-divider class="my-2" />

    <template v-if="loading">
      <v-list-item>
        <template #prepend>
          <v-progress-circular indeterminate size="20" />
        </template>
        <v-list-item-title>Загрузка счетов...</v-list-item-title>
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
        :active-color="variables.colorPrimary"
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
import { useAccountStore } from '@/stores/account.store'
import { formatAmount } from '@/utils/formatter'
import * as variables from '@/styles/variables.scss'

const accountStore = useAccountStore()
const loading = ref(true)

const activeAccounts = computed(() => accountStore.accounts.filter(account => account.isActive))

function getAccountIcon(type: string) {
  const icons = {
    bank: 'mdi-bank',
    cash: 'mdi-cash',
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
