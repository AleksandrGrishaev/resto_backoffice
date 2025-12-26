<script setup lang="ts">
// src/views/backoffice/accounts/payments/dialogs/ExpenseDetailsDialog.vue
// View details of linked expense including linked orders

import { computed } from 'vue'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'
import type { PendingPayment } from '@/stores/account/types'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  modelValue: boolean
  expense: ShiftExpenseOperation | null
  payment: PendingPayment | null // The related PendingPayment with linkedOrders
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const linkedOrders = computed(() => {
  if (!props.payment?.linkedOrders) return []
  return props.payment.linkedOrders.filter(o => o.isActive)
})

const totalLinkedAmount = computed(() => {
  return linkedOrders.value.reduce((sum, o) => sum + o.linkedAmount, 0)
})

const availableAmount = computed(() => {
  if (!props.payment) return 0
  return props.payment.amount - (props.payment.usedAmount || 0)
})

// =============================================
// METHODS
// =============================================

function formatDate(dateStr: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateStr)
}

function handleClose() {
  isOpen.value = false
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="600">
    <v-card v-if="expense">
      <v-card-title class="d-flex align-center">
        <v-icon start color="success">mdi-link-variant</v-icon>
        Payment Details
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Expense Info -->
        <div class="mb-4">
          <div class="text-subtitle-2 text-grey mb-2">Expense Information</div>
          <v-card variant="outlined" class="pa-3">
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="font-weight-medium">
                {{ expense.counteragentName || 'Unknown Supplier' }}
              </span>
              <v-chip color="success" variant="flat" size="small">
                {{ formatIDR(expense.amount) }}
              </v-chip>
            </div>
            <div class="text-body-2 text-grey">
              <div v-if="expense.description">{{ expense.description }}</div>
              <div class="mt-1">
                <v-icon size="x-small" class="mr-1">mdi-calendar</v-icon>
                {{ formatDate(expense.createdAt) }}
              </div>
              <div v-if="expense.performedBy" class="mt-1">
                <v-icon size="x-small" class="mr-1">mdi-account</v-icon>
                {{ expense.performedBy.name }}
              </div>
            </div>
          </v-card>
        </div>

        <!-- Payment Status -->
        <div v-if="payment" class="mb-4">
          <div class="text-subtitle-2 text-grey mb-2">Payment Status</div>
          <v-card variant="outlined" class="pa-3">
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>Total Amount:</span>
              <span class="font-weight-medium">{{ formatIDR(payment.amount) }}</span>
            </div>
            <div class="d-flex justify-space-between text-body-2 mb-1">
              <span>Used Amount:</span>
              <span class="text-success">{{ formatIDR(payment.usedAmount || 0) }}</span>
            </div>
            <div class="d-flex justify-space-between text-body-2">
              <span>Available:</span>
              <span :class="availableAmount > 0 ? 'text-warning' : 'text-grey'">
                {{ formatIDR(availableAmount) }}
              </span>
            </div>
          </v-card>
        </div>

        <!-- Linked Orders -->
        <div>
          <div class="text-subtitle-2 text-grey mb-2">
            Linked Orders ({{ linkedOrders.length }})
          </div>

          <v-alert v-if="linkedOrders.length === 0" type="info" variant="tonal" density="compact">
            No orders linked to this payment yet.
          </v-alert>

          <v-list v-else density="compact" class="border rounded">
            <v-list-item
              v-for="(order, index) in linkedOrders"
              :key="order.orderId"
              :class="{ 'border-t': index > 0 }"
            >
              <template #prepend>
                <v-avatar color="primary" variant="tonal" size="32">
                  <v-icon size="small">mdi-file-document</v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ order.orderNumber || order.orderId.slice(0, 8) }}
              </v-list-item-title>

              <v-list-item-subtitle>
                <span class="text-success">{{ formatIDR(order.linkedAmount) }}</span>
                <span v-if="order.linkedAt" class="ml-2 text-grey">
                  linked {{ formatDate(order.linkedAt) }}
                </span>
              </v-list-item-subtitle>

              <template #append>
                <v-chip color="success" variant="tonal" size="x-small">Active</v-chip>
              </template>
            </v-list-item>
          </v-list>

          <!-- Total -->
          <div v-if="linkedOrders.length > 0" class="d-flex justify-end mt-2">
            <span class="text-body-2 text-grey mr-2">Total Linked:</span>
            <span class="font-weight-bold text-success">{{ formatIDR(totalLinkedAmount) }}</span>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="flat" color="primary" @click="handleClose">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
