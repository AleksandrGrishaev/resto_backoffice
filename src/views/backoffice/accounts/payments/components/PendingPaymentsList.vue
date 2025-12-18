<script setup lang="ts">
// src/views/backoffice/accounts/payments/components/PendingPaymentsList.vue
// Sprint 5: Pending Payments List Component (Tab 1)

import { computed } from 'vue'
import type { PendingPayment } from '@/stores/account/types'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  payments: PendingPayment[]
  loading?: boolean
}

interface Emits {
  (e: 'confirm', payment: PendingPayment): void
  (e: 'reject', payment: PendingPayment): void
  (e: 'view', payment: PendingPayment): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// =============================================
// COMPUTED
// =============================================

const sortedPayments = computed(() => {
  return [...props.payments].sort((a, b) => {
    // Sort by date descending (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const totalPendingAmount = computed(() => {
  return props.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
})

// =============================================
// METHODS
// =============================================

function handleConfirm(payment: PendingPayment) {
  emit('confirm', payment)
}

function handleReject(payment: PendingPayment) {
  emit('reject', payment)
}

function handleView(payment: PendingPayment) {
  emit('view', payment)
}

function formatDate(dateStr: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateStr)
}

function getPaymentIcon(type?: string): string {
  switch (type) {
    case 'supplier_payment':
      return 'mdi-truck-delivery'
    case 'transfer':
      return 'mdi-bank-transfer'
    default:
      return 'mdi-cash-clock'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'error'
    default:
      return 'grey'
  }
}

function getConfirmationStatusColor(confirmationStatus?: string): string {
  switch (confirmationStatus) {
    case 'pending':
      return 'info'
    case 'confirmed':
      return 'success'
    case 'rejected':
      return 'error'
    default:
      return 'grey'
  }
}

function getConfirmationStatusText(payment: PendingPayment): string {
  if (!payment.requiresCashierConfirmation) return ''

  switch (payment.confirmationStatus) {
    case 'pending':
      return 'Awaiting Cashier'
    case 'confirmed':
      return 'Confirmed by Cashier'
    case 'rejected':
      return 'Rejected by Cashier'
    default:
      return 'Awaiting Cashier'
  }
}
</script>

<template>
  <v-card-text>
    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty State -->
    <v-alert v-else-if="payments.length === 0" type="success" variant="tonal">
      <v-icon start>mdi-check-circle</v-icon>
      No pending payments requiring confirmation.
    </v-alert>

    <!-- Payments List -->
    <template v-else>
      <!-- Summary -->
      <v-alert type="warning" variant="tonal" class="mb-4">
        <div class="d-flex align-center justify-space-between">
          <span>
            <v-icon start size="small">mdi-clock-outline</v-icon>
            {{ payments.length }} payment(s) awaiting confirmation
          </span>
          <span class="font-weight-bold">Total: {{ formatIDR(totalPendingAmount) }}</span>
        </div>
      </v-alert>

      <!-- List -->
      <v-list lines="two">
        <v-list-item
          v-for="payment in sortedPayments"
          :key="payment.id"
          class="mb-2 border rounded payment-item"
        >
          <template #prepend>
            <v-avatar color="warning" variant="tonal">
              <v-icon>{{ getPaymentIcon(payment.type) }}</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ payment.counteragentName || payment.description || 'Unknown Payment' }}
          </v-list-item-title>

          <v-list-item-subtitle>
            <div class="d-flex flex-wrap gap-2 mt-1">
              <!-- Amount -->
              <v-chip size="small" color="warning" variant="tonal">
                {{ formatIDR(payment.amount || 0) }}
              </v-chip>

              <!-- Status -->
              <v-chip
                size="x-small"
                :color="getStatusColor(payment.status || 'pending')"
                variant="flat"
              >
                {{ payment.status || 'pending' }}
              </v-chip>

              <!-- Cashier Confirmation Status -->
              <v-chip
                v-if="payment.requiresCashierConfirmation"
                size="x-small"
                :color="getConfirmationStatusColor(payment.confirmationStatus)"
                variant="flat"
              >
                <v-icon start size="x-small">mdi-cash-register</v-icon>
                {{ getConfirmationStatusText(payment) }}
              </v-chip>

              <!-- Order Number if exists -->
              <v-chip v-if="payment.orderId" size="x-small" color="info" variant="outlined">
                <v-icon start size="x-small">mdi-file-document</v-icon>
                Order: {{ payment.orderId.slice(0, 8) }}...
              </v-chip>

              <!-- Date -->
              <v-chip size="x-small" variant="outlined">
                <v-icon start size="x-small">mdi-calendar</v-icon>
                {{ formatDate(payment.createdAt) }}
              </v-chip>
            </div>
          </v-list-item-subtitle>

          <!-- Notes -->
          <div v-if="payment.notes" class="text-caption text-grey mt-2">
            {{ payment.notes }}
          </div>

          <template #append>
            <div class="d-flex gap-2">
              <!-- Show Confirm button only if NOT awaiting cashier confirmation -->
              <v-btn
                v-if="
                  !payment.requiresCashierConfirmation || payment.confirmationStatus === 'confirmed'
                "
                color="success"
                variant="flat"
                size="small"
                @click="handleConfirm(payment)"
              >
                <v-icon start>mdi-check</v-icon>
                Confirm
              </v-btn>

              <!-- Show "View" button for payments awaiting cashier -->
              <v-btn
                v-else-if="
                  payment.requiresCashierConfirmation && payment.confirmationStatus === 'pending'
                "
                color="info"
                variant="outlined"
                size="small"
                @click="handleView(payment)"
              >
                <v-icon start>mdi-eye</v-icon>
                View
              </v-btn>

              <v-btn
                color="error"
                variant="text"
                icon="mdi-close"
                size="small"
                @click="handleReject(payment)"
              />
            </div>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-card-text>
</template>

<style scoped lang="scss">
.payment-item {
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-warning), 0.04);
  }
}
</style>
