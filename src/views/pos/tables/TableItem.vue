<!-- src/views/pos/tables/TableItem.vue -->
<template>
  <div
    :class="[
      'table-item',
      {
        'table-item--free': table.status === 'free',
        'table-item--occupied-unpaid': table.status === 'occupied_unpaid',
        'table-item--occupied-paid': table.status === 'occupied_paid',
        'table-item--reserved': table.status === 'reserved',
        'table-item--active': isActive
      }
    ]"
    @click="handleClick"
  >
    <!-- Номер стола -->
    <div class="table-number">{{ table.number }}</div>

    <!-- Статус иконка -->
    <div class="status-icon">
      <v-icon :icon="statusIcon" :color="statusColor" size="small" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosTable } from '@/stores/pos/types' // ИЗМЕНЕНИЕ 1

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  table: PosTable // ИЗМЕНЕНИЕ 2
  isActive?: boolean
}

interface Emits {
  (e: 'click', table: PosTable): void
  (e: 'select', table: PosTable): void // ИЗМЕНЕНИЕ 3: передаем объект table
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false
})

const emit = defineEmits<Emits>()

// =============================================
// COMPUTED PROPERTIES - ОСТАВЛЯЕМ ВАШУ ЛОГИКУ
// =============================================

// Конфигурация статусов ОСТАЕТСЯ без изменений
const statusConfig = {
  free: {
    icon: 'mdi-check-circle',
    color: 'success'
  },
  occupied_unpaid: {
    icon: 'mdi-account-multiple',
    color: 'warning'
  },
  occupied_paid: {
    icon: 'mdi-cash',
    color: 'primary'
  },
  reserved: {
    icon: 'mdi-calendar-clock',
    color: 'secondary'
  }
}

const statusIcon = computed(() => statusConfig[props.table.status]?.icon || 'mdi-help')

const statusColor = computed(() => statusConfig[props.table.status]?.color || 'grey')

// =============================================
// METHODS
// =============================================

const handleClick = () => {
  console.log('🍽️ Table selected:', {
    tableId: props.table.id,
    tableNumber: props.table.number,
    status: props.table.status,
    currentOrderId: props.table.currentOrderId, // ИЗМЕНЕНИЕ 4: добавляем orderId
    timestamp: new Date().toLocaleTimeString()
  })

  emit('click', props.table)
  emit('select', props.table) // ИЗМЕНЕНИЕ 5: передаем весь объект
}
</script>

<style scoped>
.table-item {
  /* Touch-friendly размеры */
  min-height: var(--touch-card);
  min-width: var(--touch-min);
  width: 100%;

  /* Отступы */
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-sm);

  /* Внешний вид */
  border-radius: var(--radius-lg);
  border: 3px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);

  /* Интерактивность */
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s ease;

  /* Layout - центрируем содержимое */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  position: relative;
}

/* === HOVER СОСТОЯНИЕ === */
.table-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.table-item:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* === СТАТУСЫ СТОЛА (цветовое кодирование обводкой) === */
.table-item--free {
  border-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 6%, transparent);
}

.table-item--free:hover {
  border-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
  box-shadow: 0 8px 24px rgba(146, 201, 175, 0.3);
}

.table-item--occupied-unpaid {
  border-color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 6%, transparent);
}

.table-item--occupied-unpaid:hover {
  border-color: var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 10%, transparent);
  box-shadow: 0 8px 24px rgba(255, 176, 118, 0.3);
}

.table-item--occupied-paid {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 6%, transparent);
}

.table-item--occupied-paid:hover {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  box-shadow: 0 8px 24px rgba(163, 149, 233, 0.3);
}

.table-item--reserved {
  border-color: var(--color-secondary);
  background: color-mix(in srgb, var(--color-secondary) 6%, transparent);
}

.table-item--reserved:hover {
  border-color: var(--color-secondary);
  background: color-mix(in srgb, var(--color-secondary) 10%, transparent);
  box-shadow: 0 8px 24px rgba(191, 181, 242, 0.3);
}

/* === АКТИВНОЕ СОСТОЯНИЕ (выбранный стол) === */
.table-item--active {
  border-width: 4px;
  border-color: var(--color-primary) !important;
  background: color-mix(in srgb, var(--color-primary) 15%, transparent) !important;
  box-shadow:
    0 0 0 2px rgba(163, 149, 233, 0.4),
    0 8px 24px rgba(163, 149, 233, 0.3);
  transform: scale(1.05);
}

.table-item--active:hover {
  box-shadow:
    0 0 0 2px rgba(163, 149, 233, 0.6),
    0 12px 32px rgba(163, 149, 233, 0.4);
  transform: scale(1.05) translateY(-2px);
}

.table-item--active .table-number {
  color: var(--color-primary);
  text-shadow: 0 2px 8px rgba(163, 149, 233, 0.5);
}

.table-item--active .status-icon {
  background: rgba(163, 149, 233, 0.3);
  border: 2px solid var(--color-primary);
}

/* === СОДЕРЖИМОЕ === */
.table-number {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1;
  text-align: center;
}

.status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-round);
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
}

/* === АДАПТИВНОСТЬ === */
@media (max-width: 1024px) {
  .table-number {
    font-size: var(--text-xl);
  }

  .status-icon {
    width: 28px;
    height: 28px;
  }
}

/* === ДОПОЛНИТЕЛЬНАЯ АНИМАЦИЯ === */
.table-item--occupied-unpaid .status-icon {
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
