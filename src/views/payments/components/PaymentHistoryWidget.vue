<template>
  <v-card class="payment-history-widget">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-cash-register</v-icon>
      Payment History
      <v-spacer />
      <v-chip v-if="payments.length > 0" size="small" color="primary">
        {{ payments.length }}
      </v-chip>
    </v-card-title>

    <v-divider />

    <!-- No payments -->
    <v-card-text v-if="payments.length === 0" class="text-center text-disabled">
      <v-icon size="64" color="disabled">mdi-cash-off</v-icon>
      <div class="mt-2">No payments yet</div>
    </v-card-text>

    <!-- Payment list -->
    <v-list v-else lines="two">
      <v-list-item
        v-for="payment in payments"
        :key="payment.id"
        class="payment-item"
        :class="{
          'payment-refunded': payment.status === 'refunded',
          'payment-failed': payment.status === 'failed'
        }"
      >
        <!-- Payment icon and method -->
        <template #prepend>
          <v-avatar :color="getPaymentStatusColor(payment.status)">
            <v-icon :icon="getPaymentMethodIcon(payment.method)" color="white" />
          </v-avatar>
        </template>

        <!-- Payment details -->
        <v-list-item-title>
          <strong>{{ formatPaymentMethod(payment.method) }}</strong>
          <v-chip
            class="ml-2"
            size="x-small"
            :color="getPaymentStatusColor(payment.status)"
            variant="flat"
          >
            {{ payment.status }}
          </v-chip>
        </v-list-item-title>

        <v-list-item-subtitle>
          {{ payment.paymentNumber }}
          <span class="text-caption mx-2">•</span>
          {{ formatDateTime(payment.processedAt) }}
          <span v-if="payment.processedBy" class="text-caption mx-2">•</span>
          <span v-if="payment.processedBy">{{ payment.processedBy }}</span>
        </v-list-item-subtitle>

        <!-- Payment amount -->
        <template #append>
          <div class="text-right">
            <div
              class="text-h6 font-weight-bold"
              :class="{
                'text-success': payment.amount > 0 && payment.status === 'completed',
                'text-error': payment.amount < 0
              }"
            >
              {{ formatPrice(payment.amount) }}
            </div>

            <!-- Cash details -->
            <div v-if="payment.method === 'cash' && payment.receivedAmount" class="text-caption">
              Received: {{ formatPrice(payment.receivedAmount) }}
              <br />
              Change: {{ formatPrice(payment.changeAmount || 0) }}
            </div>

            <!-- Refund details -->
            <div v-if="payment.refundReason" class="text-caption text-error mt-1">
              Refund: {{ payment.refundReason }}
            </div>
          </div>
        </template>

        <!-- Actions -->
        <template #default>
          <div class="payment-actions mt-2">
            <!-- Print receipt -->
            <v-btn
              v-if="payment.status === 'completed'"
              size="small"
              variant="text"
              color="primary"
              prepend-icon="mdi-printer"
              @click="handlePrintReceipt(payment)"
            >
              {{ payment.receiptPrinted ? 'Reprint' : 'Print' }}
            </v-btn>

            <!-- Refund -->
            <v-btn
              v-if="canRefund(payment)"
              size="small"
              variant="text"
              color="warning"
              prepend-icon="mdi-undo"
              @click="handleRefund(payment)"
            >
              Refund
            </v-btn>
          </div>
        </template>
      </v-list-item>
    </v-list>

    <!-- Summary -->
    <v-divider v-if="payments.length > 0" />
    <v-card-text v-if="payments.length > 0" class="payment-summary">
      <div class="d-flex justify-space-between align-center">
        <span class="text-subtitle-1">Total Paid:</span>
        <span class="text-h6 font-weight-bold text-success">
          {{ formatPrice(totalPaid) }}
        </span>
      </div>
      <div v-if="totalRefunded > 0" class="d-flex justify-space-between align-center mt-1">
        <span class="text-subtitle-2">Total Refunded:</span>
        <span class="text-body-2 text-error">
          {{ formatPrice(totalRefunded) }}
        </span>
      </div>
      <v-divider class="my-2" />
      <div class="d-flex justify-space-between align-center">
        <span class="text-subtitle-1 font-weight-bold">Net Amount:</span>
        <span class="text-h6 font-weight-bold text-primary">
          {{ formatPrice(netAmount) }}
        </span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import type { PosPayment, PaymentStatus } from '@/stores/pos/types'

interface Props {
  orderId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  refund: [payment: PosPayment]
  printReceipt: [payment: PosPayment]
}>()

const paymentsStore = usePosPaymentsStore()

// ===== COMPUTED =====

const payments = computed(() => {
  return paymentsStore.getOrderPayments(props.orderId).sort((a, b) => {
    return new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
  })
})

const totalPaid = computed(() => {
  return payments.value
    .filter(p => p.status === 'completed' && p.amount > 0)
    .reduce((sum, p) => sum + p.amount, 0)
})

const totalRefunded = computed(() => {
  return Math.abs(
    payments.value
      .filter(p => p.status === 'refunded' && p.amount < 0)
      .reduce((sum, p) => sum + p.amount, 0)
  )
})

const netAmount = computed(() => {
  return totalPaid.value - totalRefunded.value
})

// ===== METHODS =====

function canRefund(payment: PosPayment): boolean {
  return payment.status === 'completed' && payment.amount > 0
}

function handleRefund(payment: PosPayment): void {
  emit('refund', payment)
}

function handlePrintReceipt(payment: PosPayment): void {
  emit('printReceipt', payment)
}

function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    cash: 'mdi-cash',
    card: 'mdi-credit-card',
    qr: 'mdi-qrcode'
  }
  return icons[method] || 'mdi-cash'
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    qr: 'QR Code'
  }
  return methods[method] || method
}

function getPaymentStatusColor(status: PaymentStatus): string {
  const colors: Record<PaymentStatus, string> = {
    pending: 'warning',
    completed: 'success',
    failed: 'error',
    refunded: 'grey'
  }
  return colors[status] || 'grey'
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<style scoped>
.payment-history-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.payment-item {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.payment-item:last-child {
  border-bottom: none;
}

.payment-refunded {
  opacity: 0.7;
  background-color: rgba(var(--v-theme-error), 0.05);
}

.payment-failed {
  opacity: 0.6;
  background-color: rgba(var(--v-theme-error), 0.08);
}

.payment-actions {
  display: flex;
  gap: 8px;
}

.payment-summary {
  background-color: rgba(var(--v-theme-surface), 0.5);
}
</style>
