<script setup lang="ts">
// src/views/pos/receipts/components/PaymentInfoWidget.vue
// Sprint 6: Payment Info Widget for Receipt Dialog
// Uses getPaymentStatusDisplay from types.ts as Single Source of Truth

import { computed } from 'vue'
import { getPaymentStatusDisplay } from '@/stores/pos/receipts'
import type { PendingOrderForReceipt } from '@/stores/pos/receipts'
import { formatIDR } from '@/utils'
import { usePaymentTolerance } from '@/composables/usePaymentTolerance'

interface Props {
  order: PendingOrderForReceipt
}

const props = defineProps<Props>()

// =============================================
// TOLERANCE
// =============================================

const { amountsMatch, tolerance } = usePaymentTolerance()

// =============================================
// COMPUTED
// =============================================

const hasPayment = computed(() => props.order.hasPendingPayment)

// Use single source of truth for payment status
const paymentStatus = computed(() => getPaymentStatusDisplay(props.order))

const paymentAmount = computed(() => props.order.pendingPaymentAmount ?? 0)

const amountDifference = computed(() => {
  if (!hasPayment.value) return 0
  return paymentAmount.value - props.order.totalAmount
})

const amountStatus = computed(() => {
  if (!hasPayment.value) return null
  const diff = amountDifference.value
  // Use configurable tolerance for amount comparison
  if (amountsMatch(paymentAmount.value, props.order.totalAmount)) {
    return { type: 'exact', color: 'success', text: 'Matches order amount' }
  }
  if (diff > 0) return { type: 'over', color: 'warning', text: `Overpayment: ${formatIDR(diff)}` }
  return { type: 'under', color: 'error', text: `Underpayment: ${formatIDR(Math.abs(diff))}` }
})
</script>

<template>
  <v-card variant="outlined" class="payment-info-widget">
    <v-card-text class="pa-3">
      <!-- Header -->
      <div class="d-flex align-center mb-2">
        <v-icon :color="paymentStatus.color" size="20" class="mr-2">
          {{ paymentStatus.icon }}
        </v-icon>
        <span class="text-subtitle-2">Payment Status</span>
        <v-spacer />
        <v-chip :color="paymentStatus.color" size="x-small" variant="flat">
          {{ paymentStatus.label }}
        </v-chip>
      </div>

      <!-- Payment Details (if has payment) -->
      <template v-if="hasPayment">
        <v-divider class="my-2" />

        <div class="payment-details">
          <div class="d-flex justify-space-between mb-1">
            <span class="text-body-2 text-grey">Payment Amount:</span>
            <span class="text-body-2 font-weight-bold text-success">
              {{ formatIDR(paymentAmount) }}
            </span>
          </div>

          <div class="d-flex justify-space-between mb-2">
            <span class="text-body-2 text-grey">Order Amount:</span>
            <span class="text-body-2">{{ formatIDR(order.totalAmount) }}</span>
          </div>

          <!-- Amount Status -->
          <v-alert
            v-if="amountStatus"
            :color="amountStatus.color"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            <v-icon size="small" start>
              {{ amountStatus.type === 'exact' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
            </v-icon>
            {{ amountStatus.text }}
          </v-alert>
        </div>

        <!-- Info -->
        <div class="text-caption text-grey mt-3">
          <v-icon size="x-small" class="mr-1">mdi-information</v-icon>
          Payment will be confirmed when receipt is completed with payment.
        </div>
      </template>

      <!-- No Payment Info -->
      <template v-else>
        <div class="text-body-2 text-grey">
          {{ paymentStatus.description }}
        </div>
        <div v-if="paymentStatus.status !== 'fully_paid'" class="text-caption text-grey mt-2">
          <v-icon size="x-small" class="mr-1">mdi-lightbulb-outline</v-icon>
          Click "Add Payment" to record payment during receipt.
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<style scoped lang="scss">
.payment-info-widget {
  background: rgba(var(--v-theme-surface), 0.5);

  .payment-details {
    background: rgba(var(--v-theme-surface-variant), 0.3);
    padding: 8px;
    border-radius: 4px;
  }
}
</style>
