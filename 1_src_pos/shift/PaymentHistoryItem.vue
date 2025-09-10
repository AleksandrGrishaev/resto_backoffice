// src/components/shift/PaymentHistoryItem.vue

<script setup lang="ts">
import { Payment } from '@/types/payment'
import { formatAmount } from '@/utils/formatter'

defineProps<{
  payment: Payment
}>()
</script>

<template>
  <v-card variant="outlined" class="mb-2 payment-history-item">
    <v-card-text>
      <div class="d-flex justify-space-between align-center">
        <div class="d-flex flex-column">
          <span class="text-subtitle-2">Payment #{{ payment.id }}</span>
          <span class="text-caption">{{ payment.method }}</span>
          <span class="text-caption">{{ new Date(payment.createdAt).toLocaleTimeString() }}</span>
        </div>
        <div class="d-flex flex-column align-end">
          <span class="text-h6">{{ formatAmount(payment.amount) }}</span>
          <v-chip
            :color="payment.status === 'completed' ? 'success' : 'warning'"
            size="small"
            class="mt-1"
          >
            {{ payment.status }}
          </v-chip>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.payment-history-item {
  transition: all 0.2s ease;
}
.payment-history-item:hover {
  background-color: var(--v-theme-surface);
}
</style>
