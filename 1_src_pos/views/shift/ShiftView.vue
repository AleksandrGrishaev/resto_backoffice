// src/views/shift/ShiftView.vue
<template>
  <ShiftLayout>
    <div class="shift-view">
      <!-- Сводка по смене -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title>Shift Summary</v-card-title>
        <v-card-text>
          <div class="d-flex justify-space-between align-center">
            <span class="text-h6">Total Amount:</span>
            <span class="text-h6">{{ formatAmount(paymentStore.getTotalShiftAmount) }}</span>
          </div>
        </v-card-text>
      </v-card>

      <!-- История платежей -->
      <div class="history-list app-scrollbar">
        <div class="text-subtitle-1 mb-2">Payment History</div>
        <PaymentHistoryItem
          v-for="payment in paymentStore.getShiftPayments"
          :key="payment.id"
          :payment="payment"
        />
      </div>
    </div>
  </ShiftLayout>
</template>

<script setup lang="ts">
import { usePaymentStore } from '@/stores/payment/payment.store'
import { formatAmount } from '@/utils/formatter'
import ShiftLayout from '@/layouts/ShiftLayout.vue'
import PaymentHistoryItem from '@/components/shift/PaymentHistoryItem.vue'

const paymentStore = usePaymentStore()
</script>

<style scoped>
.shift-view {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.history-list {
  flex: 1;
  overflow-y: auto;
}
</style>
