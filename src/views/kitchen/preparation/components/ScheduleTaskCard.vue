<!-- src/views/kitchen/preparation/components/ScheduleTaskCard.vue -->
<!-- Schedule Task Card - Individual task item with checkbox and Done button -->
<template>
  <div
    class="task-card"
    :class="{ 'task-completed': isCompleted, 'task-in-progress': isInProgress }"
  >
    <!-- Checkbox / Status -->
    <div class="task-checkbox">
      <v-icon v-if="isCompleted" color="success" size="24">mdi-checkbox-marked-circle</v-icon>
      <v-icon v-else-if="isInProgress" color="primary" size="24">mdi-progress-clock</v-icon>
      <v-icon v-else color="grey" size="24">mdi-checkbox-blank-circle-outline</v-icon>
    </div>

    <!-- Task Info -->
    <div class="task-info">
      <div class="task-name">{{ task.preparationName }}</div>
      <div class="task-details">
        <span class="detail-item">
          <v-icon size="14" class="mr-1">mdi-target</v-icon>
          Need: {{ formatDisplayQuantity(task.targetQuantity) }}
        </span>
        <span v-if="task.currentStockAtGeneration !== undefined" class="detail-item">
          <v-icon size="14" class="mr-1">mdi-package-variant</v-icon>
          Stock: {{ formatDisplayQuantity(task.currentStockAtGeneration) }}
        </span>
      </div>

      <!-- Completion Details (if completed) -->
      <div v-if="isCompleted && task.completedAt" class="task-completion">
        <v-icon size="12" class="mr-1">mdi-check</v-icon>
        Completed {{ formatTime(task.completedAt) }}
        <span v-if="task.completedByName">by {{ task.completedByName }}</span>
        <span v-if="task.completedQuantity">
          ({{ formatDisplayQuantity(task.completedQuantity) }})
        </span>
      </div>
    </div>

    <!-- Status Badge -->
    <div class="task-status">
      <v-chip v-if="isCompleted" color="success" size="small" variant="flat">Done</v-chip>
      <v-chip v-else-if="isInProgress" color="primary" size="small" variant="flat">
        In Progress
      </v-chip>
      <v-chip
        v-else-if="task.recommendationReason"
        :color="getReasonColor(task.recommendationReason)"
        size="small"
        variant="tonal"
      >
        {{ getReasonLabel(task.recommendationReason) }}
      </v-chip>
    </div>

    <!-- Actions -->
    <div class="task-actions">
      <v-btn
        v-if="!isCompleted && !isInProgress"
        color="primary"
        variant="outlined"
        size="small"
        @click="handleStart"
      >
        Start
      </v-btn>
      <v-btn
        v-if="!isCompleted"
        color="success"
        variant="flat"
        size="small"
        @click="handleComplete"
      >
        <v-icon start size="small">mdi-check</v-icon>
        Done
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'

// =============================================
// PROPS
// =============================================

interface Props {
  task: ProductionScheduleItem
}

const props = defineProps<Props>()

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  complete: [task: ProductionScheduleItem]
  start: [task: ProductionScheduleItem]
}>()

// =============================================
// COMPUTED
// =============================================

const isCompleted = computed(() => props.task.status === 'completed')
const isInProgress = computed(() => props.task.status === 'in_progress')

// =============================================
// METHODS
// =============================================

function handleComplete(): void {
  emit('complete', props.task)
}

function handleStart(): void {
  emit('start', props.task)
}

/**
 * ⭐ PHASE 2: Format quantity display based on portion type
 * - weight type: shows grams/kg (e.g., "250g", "1.5kg")
 * - portion type: shows portions with total weight (e.g., "10 pcs (300g)")
 */
function formatDisplayQuantity(value: number): string {
  if (value <= 0) return '0'

  // For portion-type preparations, show portions
  if (
    props.task.portionType === 'portion' &&
    props.task.portionSize &&
    props.task.portionSize > 0
  ) {
    const portions = Math.ceil(value / props.task.portionSize)
    const weightDisplay = value >= 1000 ? `${(value / 1000).toFixed(1)}kg` : `${Math.round(value)}g`
    return `${portions} pcs (${weightDisplay})`
  }

  // For weight-type preparations, show grams/kg
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}kg`
  }
  return `${Math.round(value)}${props.task.targetUnit}`
}

function formatQuantity(value: number, unit: string): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}kg`
  }
  return `${value}${unit}`
}

function formatTime(isoDate: string): string {
  try {
    const date = new Date(isoDate)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return ''
  }
}

function getReasonColor(reason: string): string {
  if (reason.toLowerCase().includes('out') || reason.toLowerCase().includes('zero')) {
    return 'error'
  }
  if (reason.toLowerCase().includes('low') || reason.toLowerCase().includes('below')) {
    return 'warning'
  }
  if (reason.toLowerCase().includes('expir')) {
    return 'error'
  }
  return 'info'
}

function getReasonLabel(reason: string): string {
  // Truncate long reasons
  if (reason.length > 20) {
    return reason.substring(0, 20) + '...'
  }
  return reason
}
</script>

<style scoped lang="scss">
.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background-color: var(--v-theme-surface);
  transition: background-color 0.2s;

  &:hover:not(.task-completed) {
    background-color: rgba(var(--v-theme-on-surface), 0.04);
  }

  &.task-completed {
    opacity: 0.7;
    background-color: rgba(var(--v-theme-success), 0.05);
  }

  &.task-in-progress {
    background-color: rgba(var(--v-theme-primary), 0.05);
  }
}

.task-checkbox {
  flex-shrink: 0;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-weight: 500;
  font-size: 14px;
  color: var(--v-theme-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-details {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.detail-item {
  display: flex;
  align-items: center;
}

.task-completion {
  display: flex;
  align-items: center;
  margin-top: 4px;
  font-size: 11px;
  color: rgb(var(--v-theme-success));
}

.task-status {
  flex-shrink: 0;
}

.task-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .task-card {
    flex-wrap: wrap;
    gap: 8px;
  }

  .task-info {
    flex-basis: calc(100% - 50px);
  }

  .task-status {
    order: 2;
    flex-basis: auto;
  }

  .task-actions {
    order: 3;
    flex-basis: 100%;
    justify-content: flex-end;
  }
}
</style>
