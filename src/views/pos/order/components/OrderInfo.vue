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
        <!-- Order Readiness Status Chip -->
        <v-chip :color="readinessStatusColor" variant="flat" size="small" class="mr-1">
          <v-icon start size="16">{{ readinessStatusIcon }}</v-icon>
          {{ readinessStatusLabel }}
        </v-chip>

        <!-- Order Payment Status Chip - ТОЛЬКО если есть позиции -->
        <v-chip
          v-if="hasItemsInOrder"
          :color="paymentStatusColor"
          variant="flat"
          size="small"
          class="mr-2"
        >
          {{ paymentStatusLabel }}
        </v-chip>

        <!-- Discount Summary Chip (if discounts exist) -->
        <v-chip
          v-if="hasDiscounts"
          color="error"
          variant="flat"
          size="small"
          class="mr-2"
          @click="showDiscountDetails = !showDiscountDetails"
        >
          <v-icon start size="16">mdi-tag-percent</v-icon>
          {{ totalDiscountCount }} discount{{ totalDiscountCount > 1 ? 's' : '' }}
          <v-tooltip activator="parent" location="bottom">
            Total: -{{ formatPrice(totalDiscountAmount) }}
          </v-tooltip>
        </v-chip>

        <!-- Edit Button -->
        <v-btn icon variant="text" size="small" :disabled="!canEdit" @click="handleEdit">
          <v-icon>mdi-pencil</v-icon>
          <v-tooltip activator="parent" location="bottom">Edit Order Type</v-tooltip>
        </v-btn>
      </div>
    </div>

    <!-- Discount Details (Expandable) -->
    <v-expand-transition>
      <div v-if="showDiscountDetails && hasDiscounts" class="discount-details pa-3">
        <div class="text-caption font-weight-bold mb-2">Discount Breakdown</div>

        <!-- Item Discounts -->
        <div v-if="itemDiscountCount > 0" class="discount-row">
          <div class="d-flex align-center">
            <v-icon size="14" class="mr-1" color="error">mdi-tag</v-icon>
            <span class="text-caption">Item Discounts ({{ itemDiscountCount }})</span>
          </div>
          <span class="text-caption font-weight-medium text-error">
            -{{ formatPrice(itemDiscountAmount) }}
          </span>
        </div>

        <!-- Bill Discounts -->
        <div v-if="billDiscountCount > 0" class="discount-row">
          <div class="d-flex align-center">
            <v-icon size="14" class="mr-1" color="error">mdi-tag-multiple</v-icon>
            <span class="text-caption">Bill Discounts ({{ billDiscountCount }})</span>
          </div>
          <span class="text-caption font-weight-medium text-error">
            -{{ formatPrice(billDiscountAmount) }}
          </span>
        </div>

        <!-- Total -->
        <div class="discount-row discount-total">
          <span class="text-caption font-weight-bold">Total Discounts</span>
          <span class="text-caption font-weight-bold text-error">
            -{{ formatPrice(totalDiscountAmount) }}
          </span>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PosOrder } from '@/stores/pos/types'
import { useOrdersComposables } from '@/stores/pos/orders/composables'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { formatIDR } from '@/utils/currency'

const ordersStore = usePosOrdersStore()
const formatPrice = formatIDR

// Получить функции из composables:
const {
  getOrderStatusColor,
  getOrderStatusIcon,
  getOrderStatusText,
  getOrderPaymentStatusColor,
  getOrderPaymentStatusText
} = useOrdersComposables()

// Local state
const showDiscountDetails = ref(false)

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

const hasItemsInOrder = computed((): boolean => {
  if (!props.order) return false
  return ordersStore.hasItemsInOrder(props.order)
})

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

// Computed - Order Readiness Status (новая система статусов)
const readinessStatusColor = computed((): string => {
  if (!props.order) return 'grey'
  return getOrderStatusColor(props.order.status)
})

const readinessStatusIcon = computed((): string => {
  if (!props.order) return 'mdi-help'
  return getOrderStatusIcon(props.order.status)
})

const readinessStatusLabel = computed((): string => {
  if (!props.order) return 'No Status'
  return getOrderStatusText(props.order.status, props.order.type) // Передаем тип заказа
})

// Computed - Order Payment Status (новое)
const paymentStatusColor = computed((): string => {
  if (!props.order) return 'grey'
  return getOrderPaymentStatusColor(props.order.paymentStatus || 'unpaid')
})

const paymentStatusLabel = computed((): string => {
  if (!props.order) return 'Unpaid'
  return getOrderPaymentStatusText(props.order.paymentStatus || 'unpaid')
})

// Computed - Discount Summary
const hasDiscounts = computed((): boolean => {
  if (!props.order) return false
  return props.order.bills.some(bill =>
    bill.items.some(item => item.discounts && item.discounts.length > 0)
  )
})

const itemDiscountCount = computed((): number => {
  if (!props.order) return 0
  let count = 0
  props.order.bills.forEach(bill => {
    bill.items.forEach(item => {
      if (item.discounts && item.discounts.length > 0) {
        count += item.discounts.length
      }
    })
  })
  return count
})

const billDiscountCount = computed((): number => {
  // TODO: Count bill-level discounts when implemented
  // For now return 0
  return 0
})

const itemDiscountAmount = computed((): number => {
  if (!props.order) return 0
  let total = 0
  props.order.bills.forEach(bill => {
    bill.items.forEach(item => {
      if (item.discounts && item.discounts.length > 0) {
        item.discounts.forEach(discount => {
          if (discount.type === 'percentage') {
            total += (item.totalPrice * discount.value) / 100
          } else {
            total += discount.value
          }
        })
      }
    })
  })
  return total
})

const billDiscountAmount = computed((): number => {
  // TODO: Calculate bill-level discount amounts when implemented
  return 0
})

const totalDiscountCount = computed((): number => {
  return itemDiscountCount.value + billDiscountCount.value
})

const totalDiscountAmount = computed((): number => {
  return itemDiscountAmount.value + billDiscountAmount.value
})

// Methods
const handleEdit = (): void => {
  if (!props.order || !props.canEdit) return

  console.log('Edit order clicked:', {
    orderId: props.order.id,
    orderNumber: props.order.orderNumber,
    type: props.order.type,
    status: props.order.status,
    paymentStatus: props.order.paymentStatus,
    hasItems: hasItemsInOrder.value
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
   ORDER ACTIONS - DUAL STATUS CHIPS
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

/* Специальные стили для двух чипов */
.order-actions .v-chip:first-of-type {
  margin-right: 4px;
}

.order-actions .v-chip:nth-of-type(2) {
  margin-right: 8px;
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

  /* На мобильных устройствах можно стекировать чипы */
  .order-actions {
    flex-wrap: wrap;
    gap: 4px;
  }

  .order-actions .v-chip {
    margin: 0;
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

/* =============================================
   STATUS CHIP VISUAL ENHANCEMENTS
   ============================================= */

/* Готовность чип */
.order-actions .v-chip:first-of-type {
  position: relative;
}

/* Оплата чип */
.order-actions .v-chip:nth-of-type(2) {
  position: relative;
}

/* Индикаторы успешного состояния */
.order-actions .v-chip.v-chip--variant-flat[style*='success'] {
  box-shadow: 0 0 0 1px rgba(var(--v-theme-success), 0.2);
}

/* Индикаторы ожидания */
.order-actions .v-chip.v-chip--variant-flat[style*='warning'] {
  box-shadow: 0 0 0 1px rgba(var(--v-theme-warning), 0.2);
}

/* =============================================
   DISCOUNT DETAILS
   ============================================= */

.discount-details {
  background: rgba(var(--v-theme-error), 0.05);
  border-top: 1px solid rgba(var(--v-theme-error), 0.12);
}

.discount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.discount-total {
  border-top: 1px solid rgba(var(--v-theme-error), 0.12);
  padding-top: 8px;
  margin-top: 4px;
}
</style>
