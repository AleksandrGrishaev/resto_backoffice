// src/components/shift/PaymentHistoryItem.vue
<template>
  <div class="history-item">
    <div class="history-icon">
      <v-icon :icon="getPaymentMethodIcon(payment.method as AccountType)" :color="getStatusColor" />
    </div>
    <div class="history-content">
      <div class="history-header">
        <span class="history-type">{{ payment.method }}</span>
        <span class="history-time">{{ formatAmount(payment.amount) }}</span>
      </div>
      <div class="history-details d-flex justify-space-between">
        <span>{{ formatDateTime(payment.createdAt) }}</span>
        <v-chip :color="getStatusColor" size="small" variant="tonal">
          {{ payment.status }}
        </v-chip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Payment } from '@/types/payment'
import { formatDateTime, formatAmount } from '@/utils/formatter'
import type { AccountType } from '@/types/account'

const props = defineProps<{
  payment: Payment
}>()

// Типизированная функция для получения иконки
function getPaymentMethodIcon(type: AccountType): string {
  const icons: Record<AccountType, string> = {
    cash: 'mdi-cash',
    card: 'mdi-credit-card',
    bank: 'mdi-bank',
    gojeck: 'mdi-wallet',
    grab: 'mdi-wallet'
  }
  return icons[type] || 'mdi-help-circle'
}

const getStatusColor = computed(() => {
  switch (props.payment.status) {
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'error'
    case 'pending':
      return 'warning'
    default:
      return 'error'
  }
})
</script>
