<!-- src/views/pos/shifts/components/PendingSupplierPaymentsList.vue -->
<template>
  <v-card>
    <v-card-title class="d-flex align-center bg-warning">
      <v-icon icon="mdi-clock-alert" color="white" class="me-3" />
      <span class="text-white">Pending Confirmations</span>
      <v-spacer />
      <div class="d-flex align-center gap-2">
        <!-- Category breakdown chips -->
        <v-chip v-if="productPaymentsCount > 0" color="purple" size="small" variant="flat">
          Product: {{ productPaymentsCount }}
        </v-chip>
        <v-chip v-if="otherPaymentsCount > 0" color="blue" size="small" variant="flat">
          Other: {{ otherPaymentsCount }}
        </v-chip>
        <v-chip color="white" variant="flat">Total: {{ pendingPayments.length }}</v-chip>

        <!-- ✅ NEW: Refresh button -->
        <v-btn
          icon="mdi-refresh"
          size="small"
          color="white"
          variant="text"
          :loading="loading"
          @click="$emit('refresh')"
        >
          <v-icon>mdi-refresh</v-icon>
          <v-tooltip activator="parent" location="bottom">Refresh pending payments</v-tooltip>
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <!-- ✅ Sprint 8: No active shift warning -->
    <v-alert v-if="!hasActiveShift" type="info" variant="tonal" class="ma-4">
      <div class="d-flex align-center">
        <v-icon start>mdi-information</v-icon>
        <div>
          <div class="font-weight-bold">No Active Shift</div>
          <div class="text-caption">Start a shift to confirm these payments</div>
        </div>
      </div>
    </v-alert>

    <v-card-text v-if="pendingPayments.length === 0" class="text-center py-8">
      <v-icon icon="mdi-check-circle" size="64" color="success-lighten-2" />
      <div class="text-h6 mt-4 text-success">No pending confirmations</div>
      <div class="text-caption text-grey">All supplier payments are processed</div>
    </v-card-text>

    <v-list v-else>
      <v-list-item
        v-for="payment in sortedPayments"
        :key="payment.id"
        :prepend-icon="getCategoryIcon(payment.category)"
        :subtitle="payment.description"
        class="cursor-pointer"
        @click="hasActiveShift && $emit('confirm-payment', payment)"
      >
        <template #title>
          <div class="d-flex align-center justify-space-between">
            <div>
              <span class="font-weight-medium">{{ payment.counteragentName }}</span>
              <!-- ✅ Sprint 8: Category chip -->
              <v-chip
                size="x-small"
                :color="payment.category === 'supplier' ? 'purple' : 'blue'"
                variant="tonal"
                class="ml-2"
              >
                {{ payment.category === 'supplier' ? 'Product' : 'Other' }}
              </v-chip>
              <v-chip size="x-small" :color="getPriorityColor(payment.priority)" class="ml-2">
                {{ payment.priority }}
              </v-chip>
            </div>
            <span class="text-h6 text-warning">Rp {{ formatCurrency(payment.amount) }}</span>
          </div>
        </template>

        <template #append>
          <div class="d-flex flex-column align-end">
            <v-btn
              icon="mdi-check-circle"
              size="small"
              color="success"
              variant="text"
              :disabled="!hasActiveShift"
              @click.stop="$emit('confirm-payment', payment)"
            />
            <v-btn
              icon="mdi-close-circle"
              size="small"
              color="error"
              variant="text"
              :disabled="!hasActiveShift"
              @click.stop="$emit('reject-payment', payment)"
            />
          </div>
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PendingPayment } from '@/stores/account/types'

const props = defineProps<{
  pendingPayments: PendingPayment[]
  hasActiveShift?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  'confirm-payment': [payment: PendingPayment]
  'reject-payment': [payment: PendingPayment]
  refresh: []
}>()

// ✅ Sprint 8: Category breakdown
const productPaymentsCount = computed(() => {
  return props.pendingPayments.filter(p => p.category === 'supplier').length
})

const otherPaymentsCount = computed(() => {
  return props.pendingPayments.filter(p => p.category !== 'supplier').length
})

const sortedPayments = computed(() => {
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  return [...props.pendingPayments].sort((a, b) => {
    return (
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 999) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] || 999)
    )
  })
})

function getCategoryIcon(category: string): string {
  return category === 'supplier' ? 'mdi-truck-delivery' : 'mdi-cash-minus'
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: 'error',
    high: 'warning',
    medium: 'info',
    low: 'success'
  }
  return colors[priority] || 'default'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
