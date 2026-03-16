<!-- src/views/pos/tables/components/SidebarItem.vue -->
<template>
  <div class="sidebar-item" :class="itemClasses" @click="handleClick">
    <!-- Icon Section -->
    <div class="item-icon">
      <v-icon :icon="displayIcon" :color="iconColor" size="20" />
    </div>

    <!-- Main Content -->
    <div class="item-main">
      <!-- Main Number/Text -->
      <div class="item-number">{{ displayNumber }}</div>
    </div>

    <!-- Cancellation Request Indicator -->
    <div v-if="hasCancellationRequest" class="cancellation-dot" />

    <!-- Status Badge (если нужен) -->
    <div v-if="shouldShowStatusBadge" class="status-badge">
      <v-chip :color="statusBadgeColor" size="x-small" variant="flat">
        {{ statusBadgeText }}
      </v-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosTable, PosOrder, TableStatus, OrderStatus } from '@/stores/pos/types'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { getOrderVisual } from '@/stores/channels'

// Get ordersStore for checking payment status
const ordersStore = usePosOrdersStore()

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  type: 'table' | 'order'
  table?: PosTable
  order?: PosOrder
  isSelected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false
})

const emit = defineEmits<{
  click: [item: PosTable | PosOrder]
  select: [item: PosTable | PosOrder]
}>()

// =============================================
// COMPUTED PROPERTIES
// =============================================

/**
 * Является ли элемент заказом
 */
const isOrder = computed((): boolean => {
  return props.type === 'order'
})

/**
 * Является ли элемент столом
 */
const isTable = computed((): boolean => {
  return props.type === 'table'
})

/**
 * Основной номер для отображения
 */
const displayNumber = computed((): string => {
  if (isTable.value && props.table) {
    return props.table.number
  }

  if (isOrder.value && props.order) {
    // Для заказов показываем короткий номер или ID
    const order = props.order

    // Если есть orderNumber, извлекаем последние цифры
    if (order.orderNumber) {
      const match = order.orderNumber.match(/(\d+)$/)
      if (match) {
        return `#${match[1]}`
      }
      return order.orderNumber
    }

    // Иначе используем последние символы ID
    return `#${order.id.slice(-4).toUpperCase()}`
  }

  return '?'
})

/**
 * Check if a table's order has 0 items (just opened, nothing added yet)
 * For display purposes, empty orders = free table
 */
const isEmptyOrder = computed((): boolean => {
  if (!props.table || props.table.status !== 'occupied' || !props.table.currentOrderId) return false
  const order = ordersStore.orders.find(o => o.id === props.table?.currentOrderId)
  if (!order) return false
  return order.bills.every(bill => bill.items.length === 0)
})

/**
 * Иконка для отображения
 */
const displayIcon = computed((): string => {
  if (isTable.value && props.table) {
    // Empty order looks like a free table
    if (isEmptyOrder.value) return getTableStatusIcon('free')
    return getTableStatusIcon(props.table.status)
  }

  if (isOrder.value && props.order) {
    // Online dine-in without table — needs table assignment
    if (props.order.source === 'website' && props.order.type === 'dine_in' && !props.order.tableId)
      return 'mdi-table-alert'
    // Other online orders (takeaway, delivery)
    if (props.order.source === 'website') return 'mdi-web'
    return getOrderVisual(props.order.type, props.order.channelCode).icon
  }

  return 'mdi-help'
})

/**
 * Display status for table (with payment status check)
 */
const tableDisplayStatus = computed(
  (): 'free' | 'occupied_unpaid' | 'occupied_paid' | 'reserved' => {
    if (!props.table) return 'free'

    if (props.table.status === 'free') return 'free'
    if (props.table.status === 'reserved') return 'reserved'

    // For occupied tables, check payment status of associated order
    if (props.table.status === 'occupied' && props.table.currentOrderId) {
      const order = ordersStore.orders.find(o => o.id === props.table?.currentOrderId)

      if (order?.paymentStatus === 'paid') {
        return 'occupied_paid'
      }

      return 'occupied_unpaid'
    }

    return 'free'
  }
)

/**
 * Цвет иконки
 */
const iconColor = computed((): string | undefined => {
  if (isTable.value && props.table) {
    if (isEmptyOrder.value) return getTableStatusColor('free')
    return getTableStatusColor(tableDisplayStatus.value)
  }

  if (isOrder.value && props.order) {
    // Online dine-in without table — orange to indicate needs assignment
    if (props.order.source === 'website' && props.order.type === 'dine_in' && !props.order.tableId)
      return 'orange'
    if (props.order.source === 'website') return 'teal'
    return getOrderVisual(props.order.type, props.order.channelCode).color
  }

  return undefined
})

/**
 * CSS классы для элемента
 */
const itemClasses = computed((): Record<string, boolean> => {
  const classes: Record<string, boolean> = {
    'sidebar-item--selected': props.isSelected
  }

  if (isTable.value && props.table) {
    classes['sidebar-item--table'] = true
    // Empty order (0 items) looks like a free table to the cashier
    if (isEmptyOrder.value) {
      classes['sidebar-item--free'] = true
    } else {
      classes[`sidebar-item--${tableDisplayStatus.value}`] = true
    }
  }

  if (isOrder.value && props.order) {
    classes['sidebar-item--order'] = true
    classes[`sidebar-item--${props.order.type}`] = true
    classes[`sidebar-item--order-${props.order.status}`] = true
    if (props.order.channelCode) {
      classes[`sidebar-item--channel-${props.order.channelCode}`] = true
    }
  }

  return classes
})

/**
 * Has pending cancellation request from website customer
 */
const hasCancellationRequest = computed((): boolean => {
  if (!isOrder.value || !props.order) return false
  return !!props.order.cancellationRequestedAt && !props.order.cancellationResolvedAt
})

/**
 * Нужно ли показывать статусный бейдж
 */
const shouldShowStatusBadge = computed((): boolean => {
  if (isOrder.value && props.order) {
    // Показываем статус если заказ готовится или готов
    return ['cooking', 'ready'].includes(props.order.status)
  }
  return false
})

/**
 * Цвет статусного бейджа
 */
const statusBadgeColor = computed((): string => {
  if (isOrder.value && props.order) {
    return getOrderStatusColor(props.order.status)
  }
  return 'grey'
})

/**
 * Текст статусного бейджа
 */
const statusBadgeText = computed((): string => {
  if (isOrder.value && props.order) {
    const statusTexts = {
      preparing: 'In Progress',
      ready: 'Ready'
    }
    return statusTexts[props.order.status as keyof typeof statusTexts] || ''
  }
  return ''
})

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Получить иконку статуса стола
 */
function getTableStatusIcon(status: TableStatus): string {
  const icons = {
    free: 'mdi-table',
    occupied_unpaid: 'mdi-table-chair',
    occupied_paid: 'mdi-table-check',
    reserved: 'mdi-table-clock'
  }
  return icons[status] || 'mdi-table'
}

/**
 * Получить цвет статуса стола
 */
function getTableStatusColor(status: TableStatus | 'occupied_unpaid' | 'occupied_paid'): string {
  const colors = {
    free: 'success',
    occupied: 'warning',
    occupied_unpaid: 'warning',
    occupied_paid: 'info',
    reserved: 'secondary'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

/**
 * Получить цвет статуса заказа
 */
function getOrderStatusColor(status: OrderStatus): string {
  const colors = {
    draft: 'grey',
    confirmed: 'primary',
    preparing: 'warning',
    ready: 'success',
    served: 'info',
    paid: 'success',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

// =============================================
// METHODS
// =============================================

/**
 * Обработка клика
 */
const handleClick = (): void => {
  const item = props.table || props.order

  if (!item) return

  console.log(`🔲 ${props.type} selected:`, {
    type: props.type,
    id: item.id,
    displayNumber: displayNumber.value,
    status: props.type === 'table' ? props.table?.status : props.order?.status,
    timestamp: new Date().toLocaleTimeString()
  })

  emit('click', item)
  emit('select', item)
}
</script>

<style scoped>
/* =============================================
   BASE STYLES
   ============================================= */

.sidebar-item {
  /* Compact touch-friendly размеры */
  min-height: 52px;
  min-width: var(--touch-min, 44px);
  width: 100%;

  /* Отступы - уменьшены для компактности */
  padding: 6px;
  margin-bottom: var(--spacing-xs, 4px);

  /* Внешний вид */
  border-radius: var(--radius-md, 8px);
  border: 2px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);

  /* Интерактивность */
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s ease;

  /* Layout */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  position: relative;
}

/* =============================================
   HOVER & ACTIVE STATES
   ============================================= */

.sidebar-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.16);
}

.sidebar-item:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.sidebar-item--selected {
  border-color: var(--color-primary, #a395e9) !important;
  border-width: 3px;
  background: color-mix(in srgb, var(--color-primary, #a395e9) 10%, transparent);
  box-shadow: 0 0 0 1px rgba(163, 149, 233, 0.3);
}

.sidebar-item--selected:hover {
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(163, 149, 233, 0.4);
}

/* =============================================
   TABLE SPECIFIC STYLES
   ============================================= */

.sidebar-item--table.sidebar-item--free {
  border-color: var(--color-success, #92c9af);
  background: color-mix(in srgb, var(--color-success, #92c9af) 6%, transparent);
}

.sidebar-item--table.sidebar-item--occupied_unpaid {
  border-color: var(--color-warning, #ffb076);
  background: color-mix(in srgb, var(--color-warning, #ffb076) 6%, transparent);
}

.sidebar-item--table.sidebar-item--occupied_paid {
  border-color: var(--color-primary, #a395e9);
  background: color-mix(in srgb, var(--color-primary, #a395e9) 6%, transparent);
}

.sidebar-item--table.sidebar-item--reserved {
  border-color: var(--color-secondary, #bfb5f2);
  background: color-mix(in srgb, var(--color-secondary, #bfb5f2) 6%, transparent);
}

/* =============================================
   ORDER SPECIFIC STYLES
   ============================================= */

.sidebar-item--order {
  border-style: dashed;
}

.sidebar-item--order.sidebar-item--takeaway {
  border-color: var(--color-warning, #ffb076);
  background: color-mix(in srgb, var(--color-warning, #ffb076) 4%, transparent);
}

.sidebar-item--order.sidebar-item--delivery {
  border-color: var(--color-info, #64b5f6);
  background: color-mix(in srgb, var(--color-info, #64b5f6) 4%, transparent);
}

.sidebar-item--order.sidebar-item--channel-gobiz {
  border-color: #00aa13;
  background: color-mix(in srgb, #00aa13 6%, transparent);
}

.sidebar-item--order.sidebar-item--channel-grab {
  border-color: #00b14f;
  background: color-mix(in srgb, #00b14f 6%, transparent);
}

/* Online orders (source = website) - handled via inline color from teal */

.sidebar-item--order.sidebar-item--order-preparing {
  animation: pulse 2s infinite;
}

/* =============================================
   CONTENT STYLES
   ============================================= */

.item-icon {
  flex-shrink: 0;
}

.item-main {
  text-align: center;
  flex: 1;
  min-height: 0;
}

.item-number {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.9);
}

.item-subtitle {
  font-size: 0.7rem;
  font-weight: 400;
  line-height: 1.2;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
  white-space: pre-line;
  text-align: center;
}

.cancellation-dot {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgb(var(--v-theme-error));
  z-index: 3;
  animation: cancel-pulse 1.5s ease-in-out infinite;
}

@keyframes cancel-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.7;
  }
}

.status-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
}

/* =============================================
   ANIMATIONS
   ============================================= */

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* =============================================
   RESPONSIVE ADJUSTMENTS
   ============================================= */

@media (max-width: 1200px) {
  .item-number {
    font-size: 0.75rem;
  }

  .item-subtitle {
    font-size: 0.6rem;
  }
}

@media (max-width: 768px) {
  .sidebar-item {
    min-height: 48px;
    padding: 5px;
  }

  .item-number {
    font-size: 0.7rem;
  }

  .item-subtitle {
    font-size: 0.55rem;
  }
}
</style>
