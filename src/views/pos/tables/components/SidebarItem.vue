<!-- src/views/pos/tables/components/SidebarItem.vue -->
<template>
  <div class="sidebar-item" :class="itemClasses" @click="handleClick">
    <!-- Icon Section -->
    <div class="item-icon">
      <v-icon :icon="displayIcon" :color="iconColor" size="24" />
    </div>

    <!-- Main Content -->
    <div class="item-main">
      <!-- Main Number/Text -->
      <div class="item-number">{{ displayNumber }}</div>
    </div>

    <!-- Status Badge (если нужен) -->
    <div v-if="shouldShowStatusBadge" class="status-badge">
      <v-chip :color="statusBadgeColor" size="x-small" variant="flat">
        {{ statusBadgeText }}
      </v-chip>
    </div>

    <!-- Action Menu (for orders only) -->
    <div v-if="isOrder && order" class="item-actions" @click.stop>
      <v-menu location="right">
        <template #activator="{ props: menuProps }">
          <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="menuProps" />
        </template>

        <v-list density="compact">
          <!-- Move to Table (for takeaway/delivery orders) -->
          <v-list-item
            v-if="order.type !== 'dine_in'"
            prepend-icon="mdi-table-chair"
            @click="handleMoveToTable"
          >
            <v-list-item-title>Move to Table</v-list-item-title>
          </v-list-item>

          <!-- Change Table (for dine-in orders) -->
          <v-list-item
            v-if="order.type === 'dine_in'"
            prepend-icon="mdi-table-arrow-right"
            @click="handleChangeTable"
          >
            <v-list-item-title>Change Table</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosTable, PosOrder, TableStatus, OrderStatus, OrderType } from '@/stores/pos/types'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'

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
  moveToTable: [order: PosOrder]
  changeTable: [order: PosOrder]
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
 * Иконка для отображения
 */
const displayIcon = computed((): string => {
  if (isTable.value && props.table) {
    return getTableStatusIcon(props.table.status)
  }

  if (isOrder.value && props.order) {
    return getOrderTypeIcon(props.order.type)
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
    return getTableStatusColor(tableDisplayStatus.value)
  }

  if (isOrder.value && props.order) {
    return getOrderTypeColor(props.order.type)
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
    classes[`sidebar-item--${props.table.status}`] = true
  }

  if (isOrder.value && props.order) {
    classes['sidebar-item--order'] = true
    classes[`sidebar-item--${props.order.type}`] = true
    classes[`sidebar-item--order-${props.order.status}`] = true
  }

  return classes
})

/**
 * Нужно ли показывать статусный бейдж
 */
const shouldShowStatusBadge = computed((): boolean => {
  if (isOrder.value && props.order) {
    // Показываем статус если заказ готовится или готов
    return ['preparing', 'ready'].includes(props.order.status)
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
 * Получить иконку типа заказа
 */
function getOrderTypeIcon(type: OrderType): string {
  const icons = {
    dine_in: 'mdi-table-chair',
    takeaway: 'mdi-shopping',
    delivery: 'mdi-bike-fast'
  }
  return icons[type] || 'mdi-help'
}

/**
 * Получить цвет типа заказа
 */
function getOrderTypeColor(type: OrderType): string {
  const colors = {
    dine_in: 'primary',
    takeaway: 'warning',
    delivery: 'info'
  }
  return colors[type] || 'grey'
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

/**
 * Получить текст типа заказа
 */
function getOrderTypeText(type: OrderType): string {
  const texts = {
    dine_in: 'В зале',
    takeaway: 'Самовывоз',
    delivery: 'Доставка'
  }
  return texts[type] || 'Неизвестно'
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

/**
 * Handle "Move to Table" action for takeaway/delivery orders
 */
const handleMoveToTable = (): void => {
  if (!props.order) return
  console.log('🔄 Move to table clicked:', props.order.id)
  emit('moveToTable', props.order)
}

/**
 * Handle "Change Table" action for dine-in orders
 */
const handleChangeTable = (): void => {
  if (!props.order) return
  console.log('🔄 Change table clicked:', props.order.id)
  emit('changeTable', props.order)
}
</script>

<style scoped>
/* =============================================
   BASE STYLES
   ============================================= */

.sidebar-item {
  /* Touch-friendly размеры */
  min-height: var(--touch-card, 64px);
  min-width: var(--touch-min, 44px);
  width: 100%;

  /* Отступы */
  padding: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-xs, 4px);

  /* Внешний вид */
  border-radius: var(--radius-lg, 12px);
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

.sidebar-item--table.sidebar-item--occupied-unpaid {
  border-color: var(--color-warning, #ffb076);
  background: color-mix(in srgb, var(--color-warning, #ffb076) 6%, transparent);
}

.sidebar-item--table.sidebar-item--occupied-paid {
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
  font-size: 0.875rem;
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
    font-size: 0.8rem;
  }

  .item-subtitle {
    font-size: 0.65rem;
  }
}

@media (max-width: 768px) {
  .sidebar-item {
    min-height: var(--touch-button, 48px);
    padding: 6px;
  }

  .item-number {
    font-size: 0.75rem;
  }

  .item-subtitle {
    font-size: 0.6rem;
  }
}

/* =============================================
   ACTION MENU
   ============================================= */

.item-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.sidebar-item:hover .item-actions {
  opacity: 1;
}

.item-actions .v-btn {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.item-actions .v-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}
</style>
