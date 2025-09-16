<!-- src/views/pos/tables/components/SidebarItem.vue -->
<template>
  <div :class="itemClasses" @click="handleClick">
    <!-- Основная информация -->
    <div class="item-main">
      <div class="item-number">{{ displayNumber }}</div>
      <div v-if="showSubtitle" class="item-subtitle">{{ displaySubtitle }}</div>
    </div>

    <!-- Статус иконка -->
    <div class="status-icon">
      <v-icon :icon="statusIcon" :color="statusColor" size="small" />
    </div>

    <!-- Индикатор времени для заказов -->
    <div v-if="showTimeIndicator" class="time-indicator">
      {{ displayTime }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosTable, PosOrder, TableStatus, OrderStatus, OrderType } from '@/stores/pos/types'

// =============================================
// TYPES
// =============================================

type ItemType = 'table' | 'order'

interface Props {
  // Общие свойства
  type: ItemType
  isSelected?: boolean

  // Для столов
  table?: PosTable

  // Для заказов
  order?: PosOrder
}

const props = withDefaults(defineProps<Props>(), {
  isSelected: false
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  select: [item: PosTable | PosOrder]
  click: [item: PosTable | PosOrder]
}>()

// =============================================
// COMPUTED - ОБЩИЕ СВОЙСТВА
// =============================================

/**
 * CSS классы элемента
 */
const itemClasses = computed((): string[] => {
  const classes = ['sidebar-item']

  // Тип элемента
  classes.push(`sidebar-item--${props.type}`)

  // Состояние выбора
  if (props.isSelected) {
    classes.push('sidebar-item--selected')
  }

  // Специфичные классы для типов
  if (props.type === 'table' && props.table) {
    const status = props.table.status
    classes.push(`sidebar-item--${status.replace('_', '-')}`)
  } else if (props.type === 'order' && props.order) {
    const status = props.order.status
    classes.push(`sidebar-item--order-${status}`)
    classes.push(`sidebar-item--${props.order.type}`)
  }

  return classes
})

/**
 * Отображаемый номер/название
 */
const displayNumber = computed((): string => {
  if (props.type === 'table' && props.table) {
    return props.table.number
  } else if (props.type === 'order' && props.order) {
    return props.order.orderNumber
  }
  return '?'
})

/**
 * Подзаголовок
 */
const displaySubtitle = computed((): string => {
  if (props.type === 'table' && props.table) {
    return `${props.table.capacity} мест`
  } else if (props.type === 'order' && props.order) {
    return getOrderTypeText(props.order.type)
  }
  return ''
})

/**
 * Показывать ли подзаголовок
 */
const showSubtitle = computed((): boolean => {
  return !!displaySubtitle.value
})

/**
 * Показывать ли индикатор времени
 */
const showTimeIndicator = computed((): boolean => {
  return props.type === 'order' && !!props.order
})

/**
 * Отображаемое время
 */
const displayTime = computed((): string => {
  if (props.type === 'order' && props.order) {
    const date = new Date(props.order.createdAt)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }
  return ''
})

// =============================================
// COMPUTED - СТАТУСЫ
// =============================================

/**
 * Иконка статуса
 */
const statusIcon = computed((): string => {
  if (props.type === 'table' && props.table) {
    return getTableStatusIcon(props.table.status)
  } else if (props.type === 'order' && props.order) {
    return getOrderStatusIcon(props.order.status)
  }
  return 'mdi-help'
})

/**
 * Цвет статуса
 */
const statusColor = computed((): string => {
  if (props.type === 'table' && props.table) {
    return getTableStatusColor(props.table.status)
  } else if (props.type === 'order' && props.order) {
    return getOrderStatusColor(props.order.status)
  }
  return 'grey'
})

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Получить иконку статуса стола
 */
function getTableStatusIcon(status: TableStatus): string {
  const icons = {
    free: 'mdi-check-circle',
    occupied_unpaid: 'mdi-account-multiple',
    occupied_paid: 'mdi-cash',
    reserved: 'mdi-calendar-clock'
  }
  return icons[status] || 'mdi-help'
}

/**
 * Получить цвет статуса стола
 */
function getTableStatusColor(status: TableStatus): string {
  const colors = {
    free: 'success',
    occupied_unpaid: 'warning',
    occupied_paid: 'primary',
    reserved: 'secondary'
  }
  return colors[status] || 'grey'
}

/**
 * Получить иконку статуса заказа
 */
function getOrderStatusIcon(status: OrderStatus): string {
  const icons = {
    draft: 'mdi-clock-outline',
    confirmed: 'mdi-check',
    preparing: 'mdi-chef-hat',
    ready: 'mdi-bell',
    served: 'mdi-silverware',
    paid: 'mdi-cash',
    cancelled: 'mdi-cancel'
  }
  return icons[status] || 'mdi-help'
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
  gap: var(--spacing-xs, 4px);
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

.item-main {
  text-align: center;
  z-index: 1;
}

.item-number {
  font-size: var(--text-lg, 1.125rem);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.2;
}

.item-subtitle {
  font-size: var(--text-xs, 0.75rem);
  color: rgba(255, 255, 255, 0.7);
  line-height: 1;
  margin-top: 2px;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
}

.time-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: var(--text-xs, 0.75rem);
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 4px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

/* =============================================
   SELECTED STATE OVERRIDES
   ============================================= */

.sidebar-item--selected .item-number {
  color: var(--color-primary, #a395e9);
}

.sidebar-item--selected .status-icon {
  background: rgba(163, 149, 233, 0.3);
  border: 1px solid var(--color-primary, #a395e9);
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
   RESPONSIVE
   ============================================= */

@media (max-width: 768px) {
  .sidebar-item {
    min-height: 56px;
    padding: 6px;
  }

  .item-number {
    font-size: var(--text-base, 1rem);
  }

  .item-subtitle {
    font-size: 0.6875rem;
  }

  .status-icon {
    width: 20px;
    height: 20px;
  }
}
</style>
