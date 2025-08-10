<template>
  <div class="account-list-container">
    <!-- Виджет ожидающих платежей -->
    <PendingPaymentsWidget @view-payment="handleViewPayment" />

    <!-- Диалог подтверждения платежа -->
    <PaymentConfirmationDialog
      v-model="showPaymentDialog"
      :payment="selectedPayment"
      @success="handlePaymentSuccess"
    />

    <!-- Основная таблица счетов -->
    <v-card>
      <v-card-title>
        <span class="text-h6">Счета</span>
      </v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th>Тип</th>
              <th>Название</th>
              <th>Описание</th>
              <th>Баланс</th>
              <th>Последняя операция</th>
              <th>Статус</th>
              <th v-if="canEdit">Действия</th>
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
                  {{ formatAmount(account.balance) }}
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
                  {{ account.isActive ? 'Активен' : 'Неактивен' }}
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
                {{ loading ? 'Загрузка...' : 'Нет счетов' }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useAccountStore } from '@/stores/account'
import { formatDate, formatAmount } from '@/utils/formatter'
import type { Account, PendingPayment } from '@/stores/account'
import PendingPaymentsWidget from './PendingPaymentsWidget.vue'
import PaymentConfirmationDialog from './PaymentConfirmationDialog.vue'

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
const accountStore = useAccountStore()
const canEdit = computed(() => authStore.isAdmin)

// State for payment dialog
const showPaymentDialog = ref(false)
const selectedPayment = ref<PendingPayment | null>(null)

// Methods
function handleViewPayment(payment: PendingPayment) {
  selectedPayment.value = payment
  showPaymentDialog.value = true
}

function handlePaymentSuccess() {
  // Обновляем список платежей после успешной оплаты
  accountStore.fetchPayments(true)
  console.log('Payment processed successfully')
}

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
    cash: 'Наличные',
    bank: 'Банковский счет',
    card: 'Карта',
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
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.875rem;
}

.account-balance {
  font-weight: 600;
}

.last-transaction {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.account-actions {
  display: flex;
  gap: 4px;
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-error {
  color: rgb(var(--v-theme-error));
}

.text-medium-emphasis {
  color: rgb(var(--v-theme-on-surface-variant));
}

tbody tr {
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgb(var(--v-theme-surface-variant));
  }
}
</style>
