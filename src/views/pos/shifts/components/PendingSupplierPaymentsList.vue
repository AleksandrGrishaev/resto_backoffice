<!-- src/views/pos/shifts/components/PendingSupplierPaymentsList.vue -->
<template>
  <v-card>
    <v-card-title class="d-flex align-center bg-warning">
      <v-icon icon="mdi-clock-alert" color="white" class="me-3" />
      <span class="text-white">Pending Confirmations</span>
      <v-spacer />
      <v-chip color="white" variant="flat">{{ pendingPayments.length }} payments</v-chip>
    </v-card-title>

    <v-divider />

    <v-card-text v-if="pendingPayments.length === 0" class="text-center py-8">
      <v-icon icon="mdi-check-circle" size="64" color="success-lighten-2" />
      <div class="text-h6 mt-4 text-success">No pending confirmations</div>
      <div class="text-caption text-grey">All supplier payments are processed</div>
    </v-card-text>

    <v-list v-else>
      <v-list-item
        v-for="payment in sortedPayments"
        :key="payment.id"
        prepend-icon="mdi-truck-delivery"
        :subtitle="payment.description"
        class="cursor-pointer"
        @click="$emit('confirm-payment', payment)"
      >
        <template #title>
          <div class="d-flex align-center justify-space-between">
            <div>
              <span class="font-weight-medium">{{ payment.counteragentName }}</span>
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
              @click.stop="$emit('confirm-payment', payment)"
            />
            <v-btn
              icon="mdi-close-circle"
              size="small"
              color="error"
              variant="text"
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
}>()

const emit = defineEmits<{
  'confirm-payment': [payment: PendingPayment]
  'reject-payment': [payment: PendingPayment]
}>()

const sortedPayments = computed(() => {
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
  return [...props.pendingPayments].sort((a, b) => {
    return (
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 999) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] || 999)
    )
  })
})

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
