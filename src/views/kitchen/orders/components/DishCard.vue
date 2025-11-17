<!-- src/views/kitchen/orders/components/DishCard.vue -->
<template>
  <v-card
    class="dish-card"
    :class="`status-${dish.status}`"
    :style="{ borderLeftColor: orderColor }"
    elevation="3"
  >
    <!-- Card Header: Order Number + Timer -->
    <div class="dish-header">
      <div class="order-badge" :style="{ backgroundColor: orderColor }">
        {{ dish.orderNumber }}
      </div>

      <div class="timer" :class="{ urgent: isUrgent }">
        <v-icon size="16">mdi-clock-outline</v-icon>
        <span class="timer-value">{{ formattedTime }}</span>
      </div>
    </div>

    <!-- Dish Name (LARGE) -->
    <div class="dish-name">
      {{ dish.name }}
    </div>

    <!-- Order Details -->
    <div class="dish-details">
      <v-chip
        :color="getOrderTypeColor(dish.orderType)"
        size="small"
        variant="flat"
        class="detail-chip"
      >
        {{ getOrderTypeLabel(dish.orderType) }}
      </v-chip>

      <span v-if="dish.tableNumber" class="table-info">
        <v-icon size="16">mdi-table-furniture</v-icon>
        Table {{ dish.tableNumber }}
      </span>
    </div>

    <!-- Kitchen Notes (PROMINENT) -->
    <div v-if="dish.kitchenNotes" class="kitchen-notes">
      <div class="notes-header">
        <v-icon color="warning" size="20">mdi-alert-circle</v-icon>
        <span class="notes-label">SPECIAL REQUEST</span>
      </div>
      <div class="notes-content">
        {{ dish.kitchenNotes }}
      </div>
    </div>

    <!-- Status Action Button -->
    <div class="dish-actions">
      <v-btn
        :color="getNextStatusColor()"
        :variant="dish.status === 'ready' ? 'outlined' : 'flat'"
        :disabled="dish.status === 'ready'"
        block
        size="large"
        :prepend-icon="getNextStatusIcon()"
        @click="handleStatusUpdate"
      >
        {{ getStatusButtonText() }}
      </v-btn>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useKitchenStatus } from '@/stores/kitchen/composables'
import type { KitchenDish } from '@/stores/kitchen/composables'

// =============================================
// PROPS
// =============================================

interface Props {
  dish: KitchenDish
  orderColor: string
}

const props = defineProps<Props>()

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'status-update': [dish: KitchenDish, newStatus: 'waiting' | 'cooking' | 'ready']
}>()

// =============================================
// COMPOSABLES
// =============================================

const { getNextStatus, getStatusColor, getStatusIcon } = useKitchenStatus()

// =============================================
// STATE
// =============================================

const elapsedSeconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null

// =============================================
// COMPUTED PROPERTIES
// =============================================

/**
 * Форматированное время (MM:SS)
 */
const formattedTime = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

/**
 * Проверка на срочность (>10 минут)
 */
const isUrgent = computed(() => {
  return elapsedSeconds.value > 600 // 10 minutes
})

/**
 * Кнопка статуса (department-aware)
 */
const getStatusButtonText = (): string => {
  // Bar items: waiting → ready (skip cooking)
  if (props.dish.department === 'bar') {
    if (props.dish.status === 'waiting') return 'MARK READY'
    return 'READY FOR PICKUP'
  }

  // Kitchen items: waiting → cooking → ready
  if (props.dish.status === 'waiting') return 'START COOKING'
  if (props.dish.status === 'cooking') return 'MARK READY'
  return 'READY FOR PICKUP'
}

const getNextStatusColor = (): string => {
  const nextStatus = getNextStatus(props.dish.status, props.dish.department)
  if (!nextStatus) return 'grey'
  return getStatusColor(nextStatus)
}

const getNextStatusIcon = (): string => {
  const nextStatus = getNextStatus(props.dish.status, props.dish.department)
  if (!nextStatus) return 'mdi-check-circle'
  return getStatusIcon(nextStatus)
}

/**
 * Order type helpers
 */
const getOrderTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    dine_in: 'Dine-in',
    takeaway: 'Takeaway',
    delivery: 'Delivery'
  }
  return labels[type] || type
}

const getOrderTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    dine_in: 'primary',
    takeaway: 'orange',
    delivery: 'purple'
  }
  return colors[type] || 'grey'
}

// =============================================
// METHODS
// =============================================

const handleStatusUpdate = () => {
  const nextStatus = getNextStatus(props.dish.status, props.dish.department)
  if (nextStatus && ['waiting', 'cooking', 'ready'].includes(nextStatus)) {
    emit('status-update', props.dish, nextStatus as 'waiting' | 'cooking' | 'ready')
  }
}

/**
 * Обновить таймер
 */
const updateTimer = () => {
  const createdAt = new Date(props.dish.createdAt)
  const now = new Date()
  const diffMs = now.getTime() - createdAt.getTime()
  elapsedSeconds.value = Math.floor(diffMs / 1000)
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  // Начальное значение
  updateTimer()

  // Обновляем каждую секунду
  timerInterval = setInterval(() => {
    updateTimer()
  }, 1000)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped lang="scss">
.dish-card {
  background-color: var(--v-theme-surface);
  border-radius: 12px;
  overflow: visible;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  border-left: 6px solid transparent;
  height: auto;
  width: 100%;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
  }

  &.status-waiting {
    border-left-color: rgb(var(--v-theme-warning));
  }

  &.status-cooking {
    border-left-color: rgb(var(--v-theme-info));
  }

  &.status-ready {
    border-left-color: rgb(var(--v-theme-success));
  }
}

/* Header */
.dish-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.order-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: var(--text-sm);
  font-weight: 700;
  color: white;
  letter-spacing: 0.5px;
}

.timer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.9);

  &.urgent {
    color: rgb(var(--v-theme-error));
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.timer-value {
  min-width: 48px;
  text-align: right;
}

/* Dish Name (LARGE & PROMINENT) */
.dish-name {
  padding: var(--spacing-lg) var(--spacing-md);
  font-size: var(--text-3xl);
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  color: white;
  word-wrap: break-word;
}

/* Order Details */
.dish-details {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-md) var(--spacing-md);
  flex-wrap: wrap;
}

.detail-chip {
  font-weight: 600;
  letter-spacing: 0.5px;
}

.table-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

/* Kitchen Notes (VERY PROMINENT) */
.kitchen-notes {
  margin: 0 var(--spacing-md) var(--spacing-md);
  padding: var(--spacing-md);
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.15) 0%, rgba(255, 152, 0, 0.15) 100%);
  border: 2px solid rgb(var(--v-theme-warning));
  border-radius: 8px;
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%,
  100% {
    box-shadow: 0 0 5px rgba(255, 193, 7, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 193, 7, 0.8);
  }
}

.notes-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
}

.notes-label {
  font-size: var(--text-sm);
  font-weight: 700;
  color: rgb(var(--v-theme-warning));
  letter-spacing: 0.5px;
}

.notes-content {
  font-size: var(--text-lg);
  font-weight: 600;
  color: white;
  line-height: 1.4;
  font-style: italic;
}

/* Actions */
.dish-actions {
  padding: var(--spacing-md);
  padding-top: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .dish-name {
    font-size: var(--text-2xl);
  }

  .timer {
    font-size: var(--text-lg);
  }

  .notes-content {
    font-size: var(--text-base);
  }
}
</style>
