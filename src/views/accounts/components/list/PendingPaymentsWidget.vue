<template>
  <v-card class="pending-payments-widget mb-6" elevation="2">
    <!-- Header -->
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-items-center">
        <v-icon icon="mdi-clock-alert" color="warning" class="mr-2" />
        <span>Ожидающие платежи</span>
        <v-chip v-if="paymentStatistics.totalPending > 0" color="primary" size="small" class="ml-2">
          {{ paymentStatistics.totalPending }}
        </v-chip>
      </div>

      <v-btn
        icon="mdi-refresh"
        size="small"
        variant="text"
        :loading="loading"
        @click="refreshPayments"
      />
    </v-card-title>

    <v-divider />

    <!-- Statistics Row -->
    <v-card-text class="py-2">
      <div class="d-flex align-center gap-6">
        <div class="stat-item">
          <span class="stat-label">Общая сумма:</span>
          <span class="stat-value text-h6 font-weight-bold">
            {{ formatIDR(paymentStatistics.totalAmount) }}
          </span>
        </div>

        <div class="stat-item">
          <span class="stat-label">Всего платежей:</span>
          <span class="stat-value font-weight-bold">
            {{ paymentStatistics.totalPending }}
          </span>
        </div>
      </div>
    </v-card-text>

    <v-divider v-if="displayedPayments.length > 0" />

    <!-- Payments List -->
    <v-card-text v-if="displayedPayments.length > 0" class="py-0">
      <v-table>
        <thead>
          <tr>
            <th class="text-left" style="width: 300px">Поставщик</th>
            <th class="text-left" style="width: 350px">Описание</th>
            <th class="text-right" style="width: 150px">Сумма</th>
            <th class="text-center" style="width: 100px">Статус</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="payment in displayedPayments"
            :key="payment.id"
            class="payment-row cursor-pointer"
            :class="getPaymentItemClass(payment)"
            @click="$emit('view-payment', payment)"
          >
            <td>
              <div class="payment-counteragent">
                <div class="font-weight-medium">
                  {{ payment.counteragentName }}
                </div>
                <div v-if="payment.invoiceNumber" class="text-caption text-medium-emphasis">
                  № {{ payment.invoiceNumber }}
                </div>
              </div>
            </td>
            <td>
              <div class="payment-description">
                {{ payment.description }}
              </div>
            </td>
            <td class="text-right">
              <div class="payment-amount text-h6 font-weight-bold">
                {{ formatIDR(payment.amount) }}
              </div>
            </td>
            <td class="text-center">
              <v-chip
                v-if="payment.status === 'processing'"
                color="info"
                size="small"
                variant="tonal"
              >
                В обработке
              </v-chip>
              <v-icon v-else icon="mdi-chevron-right" size="small" class="text-medium-emphasis" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>

    <!-- Empty state -->
    <v-card-text v-else-if="!loading" class="text-center py-6">
      <v-icon icon="mdi-check-circle" size="48" color="success" class="mb-2" />
      <div class="text-h6 text-medium-emphasis">Нет ожидающих платежей</div>
      <div class="text-caption text-medium-emphasis">Все платежи обработаны</div>
    </v-card-text>

    <!-- Loading state -->
    <v-card-text v-else class="text-center py-6">
      <v-progress-circular indeterminate color="primary" />
      <div class="mt-2 text-medium-emphasis">Загрузка платежей...</div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAccountStore } from '@/stores/account'
import { formatIDR } from '@/utils/currency'
import type { PendingPayment } from '@/stores/account'

const emit = defineEmits<{
  'view-payment': [payment: PendingPayment]
}>()

// Stores
const accountStore = useAccountStore()

// Computed
const loading = computed(() => accountStore.state.loading.payments)
const paymentStatistics = computed(() => accountStore.paymentStatistics)

const displayedPayments = computed(() => {
  // Показываем только pending платежи, максимум 10
  const pendingPayments = accountStore.pendingPayments
  return pendingPayments.slice(0, 10)
})

// Methods
function getPaymentItemClass(payment: PendingPayment) {
  return {
    'payment-processing': payment.status === 'processing'
  }
}

async function refreshPayments() {
  try {
    await accountStore.fetchPayments(true)
  } catch (error) {
    console.error('Failed to refresh payments:', error)
  }
}

// Lifecycle
onMounted(async () => {
  await Promise.all([accountStore.fetchPayments(), accountStore.fetchAccounts()])
})
</script>

<style lang="scss" scoped>
.pending-payments-widget {
  // Убираем оранжевую полоску
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.stat-value {
  line-height: 1.2;
}

.payment-counteragent {
  min-width: 0; // Позволяет тексту обрезаться
}

.payment-description {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.875rem;
  max-width: 350px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.payment-amount {
  color: rgb(var(--v-theme-primary));
}

.payment-row {
  transition: background-color 0.2s;

  &.cursor-pointer {
    cursor: pointer;
  }

  &:hover {
    background-color: rgb(var(--v-theme-surface-variant));
  }

  &.payment-processing {
    background-color: rgba(var(--v-theme-info), 0.05);
  }
}

.text-medium-emphasis {
  color: rgb(var(--v-theme-on-surface-variant));
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.gap-6 {
  gap: 24px;
}
</style>
