<!-- src/views/kitchen/preparation/components/ScheduleTaskCard.vue -->
<!-- Schedule Task Card - Checklist-style task with one-tap Done and optional Edit -->
<template>
  <div
    class="task-card"
    :class="{
      'task-completed': isCompleted,
      'task-writeoff': isWriteOff && !isCompleted
    }"
  >
    <!-- Checkbox / Status (large touch target) -->
    <div class="task-checkbox" @click="!isCompleted && handleQuickComplete()">
      <v-icon v-if="isCompleted" color="success" size="28">mdi-checkbox-marked-circle</v-icon>
      <v-icon v-else-if="isWriteOff" color="error" size="28">mdi-delete-circle-outline</v-icon>
      <v-icon v-else color="grey-lighten-1" size="28">mdi-checkbox-blank-circle-outline</v-icon>
    </div>

    <!-- Task Info -->
    <div class="task-info">
      <div class="task-name" :class="{ 'text-decoration-line-through': isCompleted }">
        <v-chip
          v-if="isWriteOff && !isCompleted"
          color="error"
          size="x-small"
          class="mr-1"
          variant="flat"
        >
          WRITE-OFF
        </v-chip>
        {{ task.preparationName }}
      </div>
      <div class="task-details">
        <span class="detail-item detail-target">
          {{ formatDisplayQuantity(task.targetQuantity) }}
        </span>
        <span
          v-if="task.recommendationReason && !isCompleted"
          class="detail-item detail-reason"
          :class="`text-${isWriteOff ? 'error' : getReasonColor(task.recommendationReason)}`"
        >
          {{ getReasonLabel(task.recommendationReason) }}
        </span>
      </div>

      <!-- Completion Details (if completed) -->
      <div v-if="isCompleted && task.completedAt" class="task-completion">
        <v-icon size="12" class="mr-1">mdi-check</v-icon>
        {{ formatTime(task.completedAt) }}
        <span v-if="task.completedByName" class="ml-1">{{ task.completedByName }}</span>
        <span v-if="task.completedQuantity" class="ml-1">
          ({{ formatDisplayQuantity(task.completedQuantity) }})
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div v-if="!isCompleted" class="task-actions">
      <v-btn
        color="default"
        variant="text"
        size="small"
        icon="mdi-pencil"
        @click.stop="handleEditComplete"
      />
      <v-btn
        :color="isWriteOff ? 'error' : 'success'"
        variant="flat"
        class="done-btn"
        @click.stop="handleQuickComplete"
      >
        <v-icon start size="20">{{ isWriteOff ? 'mdi-delete' : 'mdi-check' }}</v-icon>
        {{ isWriteOff ? 'Write-off' : 'Done' }}
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
  'quick-complete': [task: ProductionScheduleItem]
  'edit-complete': [task: ProductionScheduleItem]
}>()

// =============================================
// COMPUTED
// =============================================

const isCompleted = computed(() => props.task.status === 'completed')
const isWriteOff = computed(() => props.task.taskType === 'write_off')

// =============================================
// METHODS
// =============================================

function handleQuickComplete(): void {
  emit('quick-complete', props.task)
}

function handleEditComplete(): void {
  emit('edit-complete', props.task)
}

/**
 * ⭐ PHASE 2: Format quantity display based on portion type
 * - weight type: shows grams/kg (e.g., "250g", "1.5kg")
 * - portion type: shows portions with total weight (e.g., "10 pcs (300g)")
 */
function formatDisplayQuantity(value: number): string {
  if (value <= 0) return `0${props.task.targetUnit || 'g'}`

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
  if (reason.length > 50) {
    return reason.substring(0, 50) + '...'
  }
  return reason
}
</script>

<style scoped lang="scss">
.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  min-height: 56px;
  background-color: var(--v-theme-surface);
  transition:
    background-color 0.2s,
    opacity 0.3s;

  &:hover:not(.task-completed) {
    background-color: rgba(var(--v-theme-on-surface), 0.04);
  }

  &.task-completed {
    opacity: 0.55;
    background-color: rgba(var(--v-theme-success), 0.04);
  }

  &.task-writeoff {
    border-left: 3px solid rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.03);
  }
}

.task-checkbox {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background-color: rgba(var(--v-theme-success), 0.12);
  }
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--v-theme-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-details {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 3px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.detail-target {
  font-weight: 500;
}

.detail-reason {
  font-size: 12px;
}

.task-completion {
  display: flex;
  align-items: center;
  margin-top: 3px;
  font-size: 12px;
  color: rgb(var(--v-theme-success));
}

.task-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  align-items: center;
}

.done-btn {
  min-width: 88px;
  height: 40px !important;
  font-weight: 600;
  font-size: 14px;
  text-transform: none;
  letter-spacing: 0;
}

@media (max-width: 600px) {
  .task-card {
    flex-wrap: wrap;
    gap: 8px;
  }

  .task-info {
    flex-basis: calc(100% - 60px);
  }

  .task-actions {
    order: 3;
    flex-basis: 100%;
    justify-content: flex-end;
  }
}
</style>
