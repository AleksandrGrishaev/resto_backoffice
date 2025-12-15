<script setup lang="ts">
// src/views/pos/receipts/components/PendingOrdersList.vue
// Sprint 6: POS Receipt Module - Pending Orders List

import type { PendingOrderForReceipt } from '@/stores/pos/receipts'
import { formatIDR } from '@/utils'

interface Props {
  orders: PendingOrderForReceipt[]
  selectedOrderId?: string
  loading?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'select', orderId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedOrderId: undefined,
  loading: false,
  disabled: false
})

const emit = defineEmits<Emits>()

function handleSelect(orderId: string) {
  if (!props.disabled) {
    emit('select', orderId)
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="pending-orders-list">
    <!-- Loading State -->
    <div v-if="loading" class="pa-4 text-center">
      <v-progress-circular indeterminate color="primary" />
      <p class="text-body-2 text-grey mt-2">Loading orders...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="orders.length === 0" class="pa-4 text-center">
      <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-package-variant-closed</v-icon>
      <p class="text-body-2 text-grey">No pending orders</p>
      <p class="text-caption text-grey">
        Orders with status "Sent" and payment "On Delivery" will appear here
      </p>
    </div>

    <!-- Orders List -->
    <v-list v-else density="compact" class="pa-0">
      <v-list-item
        v-for="order in orders"
        :key="order.id"
        :value="order.id"
        :active="selectedOrderId === order.id"
        :disabled="disabled"
        class="order-item"
        @click="handleSelect(order.id)"
      >
        <template #prepend>
          <v-avatar color="primary" variant="tonal" size="40">
            <v-icon>mdi-package-variant</v-icon>
          </v-avatar>
        </template>

        <v-list-item-title class="font-weight-medium">
          {{ order.orderNumber }}
        </v-list-item-title>

        <v-list-item-subtitle>
          {{ order.supplierName }}
        </v-list-item-subtitle>

        <template #append>
          <div class="text-right">
            <div class="text-body-2 font-weight-medium">
              {{ formatIDR(order.totalAmount) }}
            </div>
            <div class="text-caption text-grey">
              {{ formatDate(order.createdAt) }}
            </div>
            <v-chip
              v-if="order.isEstimatedTotal"
              size="x-small"
              color="warning"
              variant="flat"
              class="mt-1"
            >
              Estimated
            </v-chip>
          </div>
        </template>
      </v-list-item>
    </v-list>

    <!-- Items count summary -->
    <v-divider v-if="orders.length > 0" />
    <div v-if="orders.length > 0" class="pa-2 text-center text-caption text-grey">
      {{ orders.length }} order{{ orders.length !== 1 ? 's' : '' }} pending
    </div>
  </div>
</template>

<style scoped lang="scss">
.pending-orders-list {
  max-height: calc(100vh - 250px);
  overflow-y: auto;
}

.order-item {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));

  &:last-child {
    border-bottom: none;
  }

  &:hover:not(.v-list-item--disabled) {
    background: rgba(var(--v-theme-primary), 0.04);
  }
}
</style>
