<template>
  <div class="account-list-container">
    <!-- Основная таблица счетов -->
    <v-card>
      <v-card-title>
        <span class="text-h6">Accounts</span>
      </v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Description</th>
              <th>Balance</th>
              <th>Last Transaction</th>
              <th>Status</th>
              <th v-if="canEdit">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="account in accounts"
              :key="account.id"
              :class="{ 'account-inactive': !account.isActive }"
              @click="$emit('view-details', account.id)"
            >
              <td>
                <v-tooltip :text="getAccountTypeLabel(account.type)">
                  <template #activator="{ props }">
                    <v-icon v-bind="props" :icon="getAccountTypeIcon(account.type)" size="small" />
                  </template>
                </v-tooltip>
              </td>
              <td>
                <div class="account-name">
                  {{ account.name }}
                </div>
              </td>
              <td>
                <div class="account-description">
                  {{ account.description || '—' }}
                </div>
              </td>
              <td>
                <div class="account-balance" :class="getBalanceClass(account.balance)">
                  {{ formatIDR(account.balance) }}
                </div>
              </td>
              <td>
                <div class="last-transaction">
                  {{ account.lastTransactionDate ? formatDate(account.lastTransactionDate) : '—' }}
                </div>
              </td>
              <td>
                <v-chip
                  :color="account.isActive ? 'success' : 'error'"
                  size="small"
                  variant="tonal"
                >
                  {{ account.isActive ? 'Active' : 'Inactive' }}
                </v-chip>
              </td>
              <td v-if="canEdit">
                <div class="account-actions">
                  <v-btn
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click.stop="$emit('edit', account)"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="loading || accounts.length === 0">
              <td :colspan="canEdit ? 7 : 6" class="text-center py-4">
                {{ loading ? 'Loading...' : 'No accounts' }}
              </td>
            </tr>
          </tbody>
          <tfoot v-if="accounts.length > 0">
            <tr class="total-row">
              <td colspan="3" class="total-label">Total:</td>
              <td class="total-balance" :class="getBalanceClass(totalBalance)">
                {{ formatIDR(totalBalance) }}
              </td>
              <td :colspan="canEdit ? 3 : 2"></td>
            </tr>
          </tfoot>
        </v-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { formatIDR } from '@/utils/currency'
import { formatDate } from '@/utils/formatter'
import type { Account } from '@/stores/account'

const props = defineProps<{
  accounts: Account[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [account: Account]
  'view-details': [id: string]
}>()

// Stores
const authStore = useAuthStore()
const canEdit = computed(() => authStore.isAdmin)

// Computed total balance
const totalBalance = computed(() => {
  return props.accounts.reduce((sum, account) => sum + account.balance, 0)
})

// Utility functions
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
    cash: 'Cash',
    bank: 'Bank Account',
    card: 'Card',
    gojeck: 'Gojek',
    grab: 'Grab'
  }
  return labels[type] || type
}

function getBalanceClass(balance: number): string {
  if (balance > 0) return 'text-success'
  if (balance < 0) return 'text-error'
  return 'text-medium-emphasis'
}
</script>

<style lang="scss" scoped>
.account-list-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.account-inactive {
  opacity: 0.6;
}

.account-name {
  font-weight: 500;
}

.account-description {
  font-size: 0.875rem;
  opacity: 0.7;
}

.account-balance {
  font-weight: 600;
}

.last-transaction {
  font-size: 0.875rem;
  opacity: 0.7;
}

.account-actions {
  display: flex;
  gap: 4px;
}

.text-success {
  color: rgb(var(--v-theme-success)) !important;
}

.text-error {
  color: rgb(var(--v-theme-error)) !important;
}

.text-medium-emphasis {
  opacity: 0.6;
}

tbody tr {
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgb(var(--v-theme-surface-variant));
  }
}

tfoot tr.total-row {
  border-top: 2px solid rgb(var(--v-theme-outline));

  td {
    padding-top: 16px;
    padding-bottom: 16px;
    color: rgb(var(--v-theme-on-surface)) !important;
  }

  td.total-label {
    text-align: right;
    font-weight: 700;
  }

  td.total-balance {
    font-weight: 700;
    font-size: 1.1rem;
  }
}
</style>
