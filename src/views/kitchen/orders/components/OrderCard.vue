<!-- src/views/kitchen/orders/components/OrderCard.vue -->
<template>
  <v-card class="order-card" :class="`status-${order.status}`" elevation="2">
    <!-- Order Header -->
    <div class="order-header">
      <div class="order-info">
        <div class="order-number">Order #{{ order.orderNumber }}</div>
        <div class="order-meta">
          <v-chip :color="getOrderTypeColor(order.type)" size="x-small" variant="flat">
            {{ getOrderTypeLabel(order.type) }}
          </v-chip>
          <span v-if="tableNumber" class="table-number">Table {{ tableNumber }}</span>
        </div>
      </div>

      <div class="order-time">
        {{ formatTime(order.createdAt) }}
      </div>
    </div>

    <!-- Order Items -->
    <div class="order-items">
      <template v-for="bill in order.bills" :key="bill.id">
        <div v-for="item in bill.items" :key="item.id" class="order-item">
          <div class="item-main">
            <span class="item-quantity">{{ item.quantity }}×</span>
            <span class="item-name">{{ item.menuItemName }}</span>
          </div>
          <div v-if="item.kitchenNotes" class="item-notes">
            <v-icon size="x-small" color="warning">mdi-note-text</v-icon>
            <span>{{ item.kitchenNotes }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- Status Action Button -->
    <div class="order-actions">
      <StatusButton
        :current-status="order.status"
        :disabled="!canUpdateStatus"
        @click="handleStatusUpdate"
      />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useKitchenOrders } from '@/stores/kitchen/composables'
import { useKitchenStatus } from '@/stores/kitchen/composables'
import type { PosOrder, OrderStatus } from '@/stores/pos/types'
import StatusButton from './StatusButton.vue'

const MODULE_NAME = 'OrderCard'

// =============================================
// PROPS
// =============================================

interface Props {
  order: PosOrder
}

const props = defineProps<Props>()

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'status-update': [orderId: string, newStatus: OrderStatus]
}>()

// =============================================
// COMPOSABLES
// =============================================

const { getTableNumber, getOrderTypeLabel, getOrderTypeColor } = useKitchenOrders()
const { getNextStatus, canUpdateStatus: checkCanUpdate } = useKitchenStatus()

// =============================================
// COMPUTED PROPERTIES
// =============================================

const tableNumber = computed(() => getTableNumber(props.order))

const canUpdateStatus = computed(() => checkCanUpdate(props.order.status))

// =============================================
// METHODS
// =============================================

const handleStatusUpdate = () => {
  const nextStatus = getNextStatus(props.order.status)
  if (nextStatus) {
    emit('status-update', props.order.id, nextStatus)
  }
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins === 1) return '1 min ago'
  if (diffMins < 60) return `${diffMins} mins ago`

  const hours = Math.floor(diffMins / 60)
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}
</script>

<style scoped lang="scss">
.order-card {
  background-color: var(--v-theme-surface);
  border-radius: 8px;
  overflow: hidden;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  }

  &.status-waiting {
    border-left: 4px solid rgb(var(--v-theme-warning));
  }

  &.status-cooking {
    border-left: 4px solid rgb(var(--v-theme-info));
  }

  &.status-ready {
    border-left: 4px solid rgb(var(--v-theme-success));
  }
}

/* Order Header */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.order-info {
  flex: 1;
}

.order-number {
  font-size: var(--text-base);
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.order-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.table-number {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.7);
}

.order-time {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}

/* Order Items */
.order-items {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  max-height: 200px;
  overflow-y: auto;
}

.order-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-main {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
  line-height: 1.4;
}

.item-quantity {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  min-width: 32px;
  font-size: var(--text-base);
}

.item-name {
  flex: 1;
  font-weight: 500;
}

.item-notes {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  color: rgb(var(--v-theme-warning));
  padding-left: 40px;
  font-style: italic;
}

/* Scrollbar for items list */
.order-items::-webkit-scrollbar {
  width: 4px;
}

.order-items::-webkit-scrollbar-track {
  background: transparent;
}

.order-items::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.order-items::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Order Actions */
.order-actions {
  padding: var(--spacing-md);
  padding-top: 0;
}
</style>
