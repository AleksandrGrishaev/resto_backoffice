<!-- src/views/pos/tables/OrderItem.vue -->
<template>
  <div
    :class="[
      'order-item',
      {
        'order-item--active': isActive,
        'order-item--paid': order.paymentStatus === 'paid',
        'order-item--pending': order.paymentStatus === 'pending'
      }
    ]"
    @click="handleClick"
  >
    <!-- Заголовок заказа -->
    <div class="order-item__header">
      <div class="order-item__main">
        <div class="order-number">#{{ order.orderNumber }}</div>
        <div class="order-type">{{ orderTypeText }}</div>
      </div>

      <!-- Статус заказа -->
      <div class="order-item__status">
        <div class="status-badge" :class="statusClass">
          <v-icon :icon="statusIcon" size="small" />
        </div>
      </div>
    </div>

    <!-- Информация о клиенте (для доставки) -->
    <div v-if="order.type === 'delivery'" class="order-item__customer">
      <div class="customer-info">
        <v-icon icon="mdi-account" size="small" class="customer-icon" />
        <span class="customer-name">{{ order.customerName || 'Гость' }}</span>
      </div>
      <div v-if="order.deliveryAddress" class="delivery-address">
        <v-icon icon="mdi-map-marker" size="small" class="address-icon" />
        <span class="address-text">{{ truncatedAddress }}</span>
      </div>
    </div>

    <!-- Детали заказа -->
    <div class="order-item__details">
      <div class="order-summary">
        <span class="items-count">{{ order.itemsCount }} позиций</span>
        <span class="order-time">{{ formattedTime }}</span>
      </div>
      <div class="order-total">{{ formattedTotal }}</div>
    </div>

    <!-- Прогресс заказа (если есть) -->
    <div v-if="showProgress" class="order-item__progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progressPercentage}%` }"></div>
      </div>
      <div class="progress-text">{{ progressText }}</div>
    </div>

    <!-- Быстрые действия -->
    <div v-if="showActions" class="order-item__actions" @click.stop>
      <v-btn
        v-if="order.paymentStatus === 'pending'"
        icon
        size="small"
        variant="text"
        @click="handlePayment"
      >
        <v-icon icon="mdi-cash" />
      </v-btn>

      <v-btn icon size="small" variant="text" @click="handleEdit">
        <v-icon icon="mdi-pencil" />
      </v-btn>

      <v-btn
        v-if="order.type === 'delivery'"
        icon
        size="small"
        variant="text"
        @click="handleViewLocation"
      >
        <v-icon icon="mdi-map" />
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatIDR } from '@/utils/currency'
import { formatTime } from '@/utils/dateTime'

// TODO: Типы заказов (когда создадим stores)
interface Order {
  id: string
  orderNumber: string
  type: 'delivery' | 'takeaway'
  paymentStatus: 'pending' | 'paid' | 'cancelled'
  status: 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  itemsCount: number
  total: number
  createdAt: string
  customerName?: string
  customerPhone?: string
  deliveryAddress?: string
  estimatedTime?: string
}

interface Props {
  order: Order
  isActive?: boolean
  showActions?: boolean
  showProgress?: boolean
}

interface Emits {
  (e: 'click', order: Order): void
  (e: 'payment', order: Order): void
  (e: 'edit', order: Order): void
  (e: 'view-location', order: Order): void
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  showActions: true,
  showProgress: false
})

const emit = defineEmits<Emits>()

// Computed свойства
const orderTypeText = computed(() => {
  return props.order.type === 'delivery' ? 'Доставка' : 'Самовывоз'
})

// Статус конфигурация
const statusConfig = {
  new: {
    text: 'Новый',
    icon: 'mdi-clock-outline',
    class: 'status--new'
  },
  preparing: {
    text: 'Готовится',
    icon: 'mdi-chef-hat',
    class: 'status--preparing'
  },
  ready: {
    text: 'Готов',
    icon: 'mdi-check-circle',
    class: 'status--ready'
  },
  delivered: {
    text: 'Доставлен',
    icon: 'mdi-truck-check',
    class: 'status--delivered'
  },
  cancelled: {
    text: 'Отменён',
    icon: 'mdi-cancel',
    class: 'status--cancelled'
  }
}

const statusIcon = computed(() => statusConfig[props.order.status]?.icon || 'mdi-help')
const statusClass = computed(() => statusConfig[props.order.status]?.class || '')

// Форматирование
const formattedTime = computed(() => {
  return formatTime(props.order.createdAt)
})

const formattedTotal = computed(() => {
  return formatIDR(props.order.total, { compact: true })
})

// Адрес (сокращённый для экономии места)
const truncatedAddress = computed(() => {
  if (!props.order.deliveryAddress) return ''
  return props.order.deliveryAddress.length > 30
    ? props.order.deliveryAddress.substring(0, 30) + '...'
    : props.order.deliveryAddress
})

// Прогресс заказа
const progressPercentage = computed(() => {
  const statusProgress = {
    new: 0,
    preparing: 30,
    ready: 80,
    delivered: 100,
    cancelled: 0
  }
  return statusProgress[props.order.status] || 0
})

const progressText = computed(() => {
  if (props.order.estimatedTime) {
    return `Готов через ${props.order.estimatedTime}`
  }
  return statusConfig[props.order.status]?.text || ''
})

// Обработчики событий
const handleClick = () => {
  emit('click', props.order)
}

const handlePayment = () => {
  emit('payment', props.order)
}

const handleEdit = () => {
  emit('edit', props.order)
}

const handleViewLocation = () => {
  emit('view-location', props.order)
}
</script>

<style scoped>
/* === БАЗОВЫЙ ЭЛЕМЕНТ ЗАКАЗА === */
.order-item {
  /* Touch-friendly размеры */
  min-height: var(--touch-card);
  min-width: var(--touch-min);
  width: 100%;

  /* Отступы */
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);

  /* Внешний вид */
  border-radius: var(--radius-lg);
  border: 2px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);

  /* Интерактивность */
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s ease;

  /* Layout */
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  position: relative;
}

/* === HOVER И АКТИВНЫЕ СОСТОЯНИЯ === */
.order-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.24);
  border-color: rgba(255, 255, 255, 0.16);
}

.order-item:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.order-item--active {
  border-color: var(--color-primary);
  border-width: 3px;
  box-shadow: 0 0 0 1px rgba(163, 149, 233, 0.3);
}

.order-item--active:hover {
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.24),
    0 0 0 1px rgba(163, 149, 233, 0.4);
}

/* === СТАТУСЫ ОПЛАТЫ === */
.order-item--pending {
  border-left: 4px solid var(--color-warning);
}

.order-item--paid {
  border-left: 4px solid var(--color-success);
}

/* === ЗАГОЛОВОК ЗАКАЗА === */
.order-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.order-item__main {
  flex: 1;
}

.order-number {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.2;
}

.order-type {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* === СТАТУС БЭДЖ === */
.order-item__status {
  flex-shrink: 0;
}

.status-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-round);

  &.status--new {
    background: var(--color-warning);
  }

  &.status--preparing {
    background: #ff9800;
  }

  &.status--ready {
    background: var(--color-success);
  }

  &.status--delivered {
    background: var(--color-primary);
  }

  &.status--cancelled {
    background: var(--color-error);
  }
}

/* === ИНФОРМАЦИЯ О КЛИЕНТЕ === */
.order-item__customer {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--spacing-sm);
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-md);
}

.customer-info,
.delivery-address {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.customer-icon,
.address-icon {
  color: rgba(255, 255, 255, 0.6);
}

.customer-name,
.address-text {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.3;
}

.address-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* === ДЕТАЛИ ЗАКАЗА === */
.order-item__details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.items-count {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
}

.order-time {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
}

.order-total {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-primary);
}

/* === ПРОГРЕСС БАР === */
.order-item__progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  border-radius: var(--radius-sm);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
}

/* === БЫСТРЫЕ ДЕЙСТВИЯ === */
.order-item__actions {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.order-item:hover .order-item__actions {
  opacity: 1;
}

.order-item__actions .v-btn {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
}

/* === АДАПТИВНОСТЬ === */
@media (max-width: 1024px) {
  .order-number {
    font-size: var(--text-base);
  }

  .order-type {
    font-size: var(--text-xs);
  }

  .status-badge {
    width: 24px;
    height: 24px;
  }

  .customer-name,
  .address-text {
    font-size: var(--text-xs);
  }
}

/* === АНИМАЦИИ СТАТУСА === */
.status-badge.status--preparing {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
