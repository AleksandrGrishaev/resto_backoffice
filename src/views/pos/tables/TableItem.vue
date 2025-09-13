<!-- src/views/pos/tables/TableItem.vue -->
<template>
  <v-card
    class="table-item"
    :class="tableItemClasses"
    :color="cardColor"
    :variant="cardVariant"
    :style="cardStyles"
    @click="handleSelect"
  >
    <v-card-text class="table-card-content">
      <!-- Table Icon -->
      <div class="table-icon">
        <v-icon :icon="tableIcon" :size="iconSize" :color="iconColor" />
      </div>

      <!-- Table Info -->
      <div class="table-info">
        <div class="table-number">{{ table.number }}</div>
        <div v-if="showCapacity && table.capacity" class="table-capacity">
          {{ table.capacity }}p
        </div>
      </div>

      <!-- Status Indicator -->
      <div v-if="showStatusIndicator" class="status-indicator">
        <div class="status-dot" :class="`status-${table.status}`" />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PosTable } from '@/stores/pos/types'
import { useTables } from '@/stores/pos/tables/composables/useTables'

// =============================================
// CONSTANTS
// =============================================

const SIZE_CONFIG = {
  compact: {
    height: 44,
    iconSize: 20,
    fontSize: '0.8125rem',
    capacityFontSize: '0.6875rem',
    padding: '4px 6px'
  },
  standard: {
    height: 48,
    iconSize: 22,
    fontSize: '0.875rem',
    capacityFontSize: '0.75rem',
    padding: '6px 8px'
  },
  comfortable: {
    height: 52,
    iconSize: 24,
    fontSize: '0.9375rem',
    capacityFontSize: '0.8125rem',
    padding: '8px 10px'
  }
} as const

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  table: PosTable
  isActive?: boolean
  showCapacity?: boolean
  size?: keyof typeof SIZE_CONFIG
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  showCapacity: true,
  size: 'standard'
})

const emit = defineEmits<{
  select: [tableId: string]
}>()

// =============================================
// COMPOSABLES
// =============================================

const { getTableStatusColor, getTableStatusIcon, isTableOccupied, isTableFree } = useTables()

// =============================================
// COMPUTED PROPERTIES
// =============================================

const sizeConfig = computed(() => SIZE_CONFIG[props.size])

const tableItemClasses = computed(() => ({
  'table-item--active': props.isActive,
  'table-item--occupied': isTableOccupied(props.table.status),
  'table-item--free': isTableFree(props.table.status),
  'table-item--reserved': props.table.status === 'reserved',
  'table-item--cleaning': props.table.status === 'cleaning',
  [`table-item--${props.size}`]: true
}))

const cardColor = computed(() => {
  if (props.isActive) return 'primary'
  return undefined
})

const cardVariant = computed(() => {
  if (props.isActive) return 'flat'
  if (isTableOccupied(props.table.status)) return 'outlined'
  return 'outlined'
})

const cardStyles = computed(() => ({
  height: `${sizeConfig.value.height}px`,
  minHeight: `${sizeConfig.value.height}px`,
  '--table-item-padding': sizeConfig.value.padding,
  '--table-number-font-size': sizeConfig.value.fontSize,
  '--table-capacity-font-size': sizeConfig.value.capacityFontSize
}))

const tableIcon = computed(() => getTableStatusIcon(props.table.status))

const iconSize = computed(() => sizeConfig.value.iconSize)

const iconColor = computed(() => {
  if (props.isActive) return 'white'
  return getTableStatusColor(props.table.status)
})

const showStatusIndicator = computed(() => isTableOccupied(props.table.status) && !props.isActive)

// =============================================
// METHODS
// =============================================

function handleSelect(): void {
  emit('select', props.table.id)
}
</script>

<style scoped>
/* =============================================
   BASE STYLES
   ============================================= */

.table-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  position: relative;
  flex-shrink: 0; /* Предотвращаем сжатие элемента */
}

.table-item:hover:not(.table-item--active) {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.table-card-content {
  padding: var(--table-item-padding, 6px 8px) !important;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  min-height: inherit;
}

/* =============================================
   TABLE ICON
   ============================================= */

.table-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
}

/* =============================================
   TABLE INFO
   ============================================= */

.table-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
}

.table-number {
  font-size: var(--table-number-font-size, 0.875rem);
  font-weight: 600;
  line-height: 1.2;
  color: inherit;
}

.table-capacity {
  font-size: var(--table-capacity-font-size, 0.75rem);
  opacity: 0.8;
  line-height: 1;
  color: inherit;
}

/* =============================================
   STATUS INDICATOR
   ============================================= */

.status-indicator {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.status-dot.status-free {
  background-color: rgb(var(--v-theme-success));
}

.status-dot.status-occupied {
  background-color: rgb(var(--v-theme-warning));
}

.status-dot.status-reserved {
  background-color: rgb(var(--v-theme-info));
}

.status-dot.status-cleaning {
  background-color: rgb(var(--v-theme-secondary));
}

/* =============================================
   STATE VARIANTS
   ============================================= */

.table-item--active {
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
}

.table-item--active .table-number,
.table-item--active .table-capacity {
  color: white;
}

.table-item--occupied:not(.table-item--active) {
  border-color: rgb(var(--v-theme-warning));
  background-color: rgba(var(--v-theme-warning), 0.05);
}

.table-item--reserved:not(.table-item--active) {
  border-color: rgb(var(--v-theme-info));
  background-color: rgba(var(--v-theme-info), 0.05);
}

.table-item--cleaning:not(.table-item--active) {
  border-color: rgb(var(--v-theme-secondary));
  background-color: rgba(var(--v-theme-secondary), 0.05);
}

.table-item--free:not(.table-item--active) {
  border-color: rgba(255, 255, 255, 0.12);
}

/* =============================================
   SIZE VARIANTS (fallback если CSS переменные не работают)
   ============================================= */

.table-item--compact .table-card-content {
  padding: 4px 6px !important;
  gap: 6px;
}

.table-item--compact .table-number {
  font-size: 0.8125rem;
}

.table-item--compact .table-capacity {
  font-size: 0.6875rem;
}

.table-item--comfortable .table-card-content {
  padding: 8px 10px !important;
  gap: 10px;
}

.table-item--comfortable .table-number {
  font-size: 0.9375rem;
}

.table-item--comfortable .table-capacity {
  font-size: 0.8125rem;
}

/* =============================================
   RESPONSIVE ADJUSTMENTS
   ============================================= */

@media (max-width: 768px) {
  .table-card-content {
    padding: 4px 6px !important;
    gap: 4px;
  }

  .table-number {
    font-size: 0.8125rem !important;
  }

  .table-capacity {
    display: none; /* Скрываем вместимость на маленьких экранах */
  }

  .table-icon {
    min-width: 20px;
  }
}

@media (max-width: 480px) {
  .table-card-content {
    padding: 3px 5px !important;
    gap: 3px;
  }

  .table-number {
    font-size: 0.75rem !important;
  }
}

/* =============================================
   ACCESSIBILITY
   ============================================= */

.table-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* Увеличиваем размер touch-области для мобильных устройств */
@media (pointer: coarse) {
  .table-card-content {
    min-height: 44px; /* Минимум для удобного нажатия пальцем */
  }
}

/* =============================================
   LOADING STATE
   ============================================= */

.table-item--loading {
  opacity: 0.6;
  pointer-events: none;
}

.table-item--loading .table-card-content {
  position: relative;
}

.table-item--loading .table-card-content::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* =============================================
   HIGH CONTRAST MODE
   ============================================= */

@media (prefers-contrast: high) {
  .table-item {
    border-width: 2px;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border: 1px solid currentColor;
  }
}

/* =============================================
   DARK MODE ADJUSTMENTS
   ============================================= */

@media (prefers-color-scheme: dark) {
  .table-item--occupied:not(.table-item--active) {
    background-color: rgba(var(--v-theme-warning), 0.08);
  }

  .table-item--reserved:not(.table-item--active) {
    background-color: rgba(var(--v-theme-info), 0.08);
  }

  .table-item--cleaning:not(.table-item--active) {
    background-color: rgba(var(--v-theme-secondary), 0.08);
  }
}
</style>
