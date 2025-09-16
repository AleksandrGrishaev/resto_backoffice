<!-- src/views/pos/order/components/OrderInfo.vue -->
<template>
  <div class="order-info">
    <div class="order-info-content d-flex align-center justify-space-between">
      <!-- Order Type & Details -->
      <div class="order-details d-flex align-center">
        <div class="order-type-icon mr-3">
          <v-icon :icon="orderTypeIcon" :color="orderTypeColor" size="24" />
        </div>

        <div class="order-text">
          <div class="order-type text-subtitle-1 font-weight-medium">
            {{ orderTypeLabel }}
          </div>
          <div class="order-subtitle text-caption text-medium-emphasis">
            {{ orderSubtitle }}
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="order-actions d-flex align-center">
        <!-- Order Status Chip -->
        <v-chip :color="statusColor" variant="flat" size="small" class="mr-2">
          <v-icon start size="16">{{ statusIcon }}</v-icon>
          {{ statusLabel }}
        </v-chip>

        <!-- Edit Button -->
        <v-btn icon variant="text" size="small" :disabled="!canEdit" @click="handleEdit">
          <v-icon>mdi-pencil</v-icon>
          <v-tooltip activator="parent" location="bottom">Edit Order Type</v-tooltip>
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosOrder, OrderType, OrderStatus } from '@/stores/pos/types'

// Props
interface Props {
  order: PosOrder | null
  tableNumber?: string
  canEdit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: true
})

// Emits
const emit = defineEmits<{
  edit: [order: PosOrder]
}>()

// Computed - Order Type
const orderTypeIcon = computed((): string => {
  if (!props.order) return 'mdi-help'

  switch (props.order.type) {
    case 'dine_in':
      return 'mdi-table-chair'
    case 'takeaway':
      return 'mdi-shopping'
    case 'delivery':
      return 'mdi-bike-fast'
    default:
      return 'mdi-help'
  }
})

const orderTypeColor = computed((): string => {
  if (!props.order) return 'grey'

  switch (props.order.type) {
    case 'dine_in':
      return 'primary'
    case 'takeaway':
      return 'warning'
    case 'delivery':
      return 'info'
    default:
      return 'grey'
  }
})

const orderTypeLabel = computed((): string => {
  if (!props.order) return 'No Order'

  switch (props.order.type) {
    case 'dine_in':
      return 'Dine In'
    case 'takeaway':
      return 'Take Away'
    case 'delivery':
      return 'Delivery'
    default:
      return 'Unknown'
  }
})

const orderSubtitle = computed((): string => {
  if (!props.order) return 'Select or create an order'

  switch (props.order.type) {
    case 'dine_in':
      return props.tableNumber ? `Table ${props.tableNumber}` : 'No table assigned'
    case 'takeaway':
    case 'delivery':
      return `Order #${props.order.orderNumber}`
    default:
      return `Order #${props.order.orderNumber}`
  }
})

// Computed - Order Status
const statusColor = computed((): string => {
  if (!props.order) return 'grey'

  switch (props.order.status) {
    case 'draft':
      return 'grey'
    case 'confirmed':
      return 'info'
    case 'preparing':
      return 'warning'
    case 'ready':
      return 'success'
    case 'served':
      return 'primary'
    case 'paid':
      return 'success'
    case 'cancelled':
      return 'error'
    default:
      return 'grey'
  }
})

const statusIcon = computed((): string => {
  if (!props.order) return 'mdi-help'

  switch (props.order.status) {
    case 'draft':
      return 'mdi-file-edit'
    case 'confirmed':
      return 'mdi-check-circle'
    case 'preparing':
      return 'mdi-chef-hat'
    case 'ready':
      return 'mdi-bell'
    case 'served':
      return 'mdi-silverware'
    case 'paid':
      return 'mdi-cash'
    case 'cancelled':
      return 'mdi-cancel'
    default:
      return 'mdi-help'
  }
})

const statusLabel = computed((): string => {
  if (!props.order) return 'No Status'

  switch (props.order.status) {
    case 'draft':
      return 'Draft'
    case 'confirmed':
      return 'Confirmed'
    case 'preparing':
      return 'Preparing'
    case 'ready':
      return 'Ready'
    case 'served':
      return 'Served'
    case 'paid':
      return 'Paid'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Unknown'
  }
})

// Methods
const handleEdit = (): void => {
  if (!props.order || !props.canEdit) return

  console.log('🔧 Edit order clicked:', {
    orderId: props.order.id,
    orderNumber: props.order.orderNumber,
    type: props.order.type,
    status: props.order.status
  })

  emit('edit', props.order)
}
</script>

<style scoped>
/* =============================================
   ORDER INFO LAYOUT
   ============================================= */

.order-info {
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.order-info-content {
  padding: var(--spacing-md);
  min-height: 64px;
}

/* =============================================
   ORDER DETAILS
   ============================================= */

.order-details {
  flex: 1;
  min-width: 0; /* Prevent flex item from overflowing */
}

.order-type-icon {
  flex-shrink: 0;
}

.order-text {
  min-width: 0; /* Allow text to be truncated */
}

.order-type {
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface));
}

.order-subtitle {
  line-height: 1.2;
  margin-top: 2px;
}

/* =============================================
   ORDER ACTIONS
   ============================================= */

.order-actions {
  flex-shrink: 0;
}

.order-actions .v-chip {
  border-radius: var(--v-border-radius-lg);
}

.order-actions .v-btn {
  margin-left: var(--spacing-xs);
}

/* =============================================
   RESPONSIVE ADJUSTMENTS
   ============================================= */

@media (max-width: 768px) {
  .order-info-content {
    padding: var(--spacing-sm);
    min-height: 56px;
  }

  .order-type-icon {
    margin-right: var(--spacing-sm) !important;
  }

  .order-type {
    font-size: 0.95rem;
  }

  .order-subtitle {
    font-size: 0.75rem;
  }

  .order-actions .v-chip {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .order-info-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .order-actions {
    align-self: flex-end;
  }
}

/* =============================================
   STATES
   ============================================= */

.order-info.loading {
  opacity: 0.7;
  pointer-events: none;
}

.order-info.error {
  border-bottom-color: rgb(var(--v-theme-error));
}

/* =============================================
   ACCESSIBILITY
   ============================================= */

.order-info:focus-within {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

/* =============================================
   HOVER EFFECTS
   ============================================= */

@media (hover: hover) {
  .order-info-content {
    transition: background-color 0.2s ease;
  }

  .order-info:hover {
    background: rgba(var(--v-theme-on-surface), 0.02);
  }
}
</style>
