// src/components/accounts/list/AccountList.vue
<template>
  <v-card>
    <v-card-title class="d-flex align-center py-3 px-4">
      <span class="text-h6">Счета</span>
      <v-spacer />
      <slot name="actions" />
    </v-card-title>

    <v-card-text class="pa-0">
      <v-table hover>
        <thead>
          <tr>
            <th class="text-left">Название</th>
            <th class="text-left">Тип</th>
            <th class="text-right">Баланс</th>
            <th class="text-left">Последняя операция</th>
            <th class="text-center">Статус</th>
            <th class="text-center">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="account in accounts" :key="account.id">
            <td>{{ account.name }}</td>
            <td>
              <v-icon :icon="getAccountTypeIcon(account.type)" class="mr-2" />
              {{ getAccountTypeLabel(account.type) }}
            </td>
            <td class="text-right">{{ formatAmount(account.balance) }}</td>
            <td>{{ formatDate(account.lastTransactionDate) }}</td>
            <td class="text-center">
              <v-chip :color="account.isActive ? 'success' : 'warning'" size="small" variant="flat">
                {{ account.isActive ? 'Активен' : 'Неактивен' }}
              </v-chip>
            </td>
            <td class="text-center">
              <v-btn
                icon
                size="small"
                variant="text"
                color="primary"
                @click="emit('view-details', account.id)"
              >
                <v-icon icon="mdi-eye" size="20" />
              </v-btn>
              <v-btn
                v-if="canEdit"
                icon
                size="small"
                variant="text"
                color="primary"
                @click="emit('edit', account)"
              >
                <v-icon icon="mdi-pencil" size="20" />
              </v-btn>
            </td>
          </tr>
          <tr v-if="accounts.length === 0">
            <td colspan="6" class="text-center text-medium-emphasis py-4">
              {{ loading ? 'Загрузка...' : 'Нет счетов' }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user.store'
import { formatDate } from '@/utils/formatter'
import type { Account } from '@/types/account'

const emit = defineEmits<{
  edit: [account: Account]
  'view-details': [id: string]
}>()

// Права доступа
const userStore = useUserStore()
const canEdit = computed(() => userStore.isAdmin)

// Вспомогательные функции
function getAccountTypeIcon(type: Account['type']): string {
  const icons = {
    cash: 'mdi-cash',
    bank: 'mdi-bank',
    card: 'mdi-credit-card',
    gojeck: 'mdi-wallet',
    grab: 'mdi-wallet'
  }
  return icons[type] || 'mdi-help-circle'
}

function getAccountTypeLabel(type: Account['type']): string {
  const labels = {
    cash: 'Наличные',
    bank: 'Банковский счет',
    card: 'Карта',
    gojeck: 'Gojek',
    grab: 'Grab'
  }
  return labels[type] || type
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'IDR'
  }).format(amount)
}
</script>
