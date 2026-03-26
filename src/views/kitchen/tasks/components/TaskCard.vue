<!-- src/views/kitchen/tasks/components/TaskCard.vue -->
<!-- Kanban task card with color-coded border, quantity input, Done/Write-off button -->
<template>
  <div
    class="task-card"
    :class="{
      'task-completed': isCompleted,
      [`task-${taskColor}`]: !isCompleted
    }"
  >
    <!-- Left color border is handled by CSS class -->

    <!-- Main content -->
    <div class="task-body">
      <!-- Header: name + type chip -->
      <div class="task-header">
        <span class="task-name" :class="{ 'text-decoration-line-through': isCompleted }">
          {{ task.preparationName }}
        </span>
        <v-chip v-if="isWriteOff && !isCompleted" color="error" size="x-small" variant="flat">
          WRITE-OFF
        </v-chip>
      </div>

      <!-- Meta: avg consumption + reason -->
      <div v-if="!isCompleted" class="task-meta">
        <span v-if="task.avgDailyConsumption" class="meta-avg">
          avg {{ Math.round(task.avgDailyConsumption) }}{{ task.targetUnit }}/day
        </span>
        <span v-if="task.recommendationReason" class="meta-reason">
          {{ task.recommendationReason }}
        </span>
      </div>

      <!-- Completion info: recommended → actual -->
      <div v-if="isCompleted" class="task-completed-info">
        <v-icon size="14" color="success">mdi-check</v-icon>
        <span class="done-recommended">{{ task.targetQuantity }}{{ task.targetUnit }}</span>
        <v-icon size="10">mdi-arrow-right</v-icon>
        <span class="done-actual" :class="doneQtyClass">
          {{ task.completedQuantity || task.targetQuantity }}{{ task.targetUnit }}
        </span>
        <span v-if="task.completedAt" class="done-time">{{ formatTime(task.completedAt) }}</span>
      </div>
    </div>

    <!-- Right: quantity + action -->
    <div v-if="!isCompleted" class="task-action">
      <!-- Quantity input -->
      <div class="quantity-field">
        <input
          v-model.number="quantity"
          type="number"
          inputmode="numeric"
          pattern="[0-9]*"
          class="qty-input"
          :min="1"
          @focus="($event.target as HTMLInputElement).select()"
        />
        <span class="qty-unit">{{ task.targetUnit }}</span>
      </div>

      <!-- Action button -->
      <v-btn
        :color="isWriteOff ? 'error' : 'success'"
        variant="flat"
        class="action-btn"
        :loading="processing"
        @click="handleAction"
      >
        <v-icon size="20">{{ isWriteOff ? 'mdi-delete' : 'mdi-check' }}</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'

interface Props {
  task: ProductionScheduleItem
  processing?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  processing: false
})

const emit = defineEmits<{
  complete: [task: ProductionScheduleItem, quantity: number]
  'write-off': [task: ProductionScheduleItem, quantity: number]
}>()

// Pre-fill with target quantity
const quantity = ref(props.task.targetQuantity)

watch(
  () => props.task.targetQuantity,
  val => {
    quantity.value = val
  },
  { immediate: true }
)

const isCompleted = computed(() => props.task.status === 'completed')
const isWriteOff = computed(() => props.task.taskType === 'write_off')
const isPremade = computed(() => props.task.isPremade === true)

const doneQtyClass = computed(() => {
  const actual = props.task.completedQuantity || props.task.targetQuantity
  if (actual < props.task.targetQuantity) return 'text-warning'
  return 'text-success'
})

const taskColor = computed(() => {
  if (isWriteOff.value) return 'writeoff'
  if (isPremade.value) return 'premade'
  return 'production'
})

function handleAction(): void {
  const qty = Math.max(1, quantity.value || props.task.targetQuantity)
  if (isWriteOff.value) {
    emit('write-off', props.task, qty)
  } else {
    emit('complete', props.task, qty)
  }
}

function formatTime(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return ''
  }
}
</script>

<style scoped lang="scss">
.task-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  min-height: 56px;
  background-color: var(--v-theme-surface);
  border-radius: 8px;
  border-left: 4px solid transparent;
  transition: opacity 0.3s;

  &.task-premade {
    border-left-color: #009688; // teal
  }

  &.task-production {
    border-left-color: rgb(var(--v-theme-info));
  }

  &.task-writeoff {
    border-left-color: rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.03);
  }

  &.task-completed {
    opacity: 0.5;
    border-left-color: rgb(var(--v-theme-success));
  }
}

.task-body {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-name {
  font-weight: 600;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
  font-size: 12px;
}

.meta-avg {
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.meta-reason {
  color: rgba(var(--v-theme-on-surface), 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-completed-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-top: 2px;
}

.done-recommended {
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.done-actual {
  font-weight: 600;
}

.done-time {
  color: rgba(var(--v-theme-on-surface), 0.4);
  margin-left: 4px;
}

.task-action {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.quantity-field {
  display: flex;
  align-items: center;
  background-color: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 6px;
  padding: 4px 8px;
  gap: 2px;
}

.qty-input {
  width: 56px;
  text-align: right;
  font-size: 15px;
  font-weight: 600;
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus {
    background-color: rgba(var(--v-theme-primary), 0.08);
    border-radius: 4px;
  }
}

.qty-unit {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  min-width: 12px;
}

.action-btn {
  width: 48px !important;
  height: 48px !important;
  min-width: 48px !important;
  border-radius: 8px;
}
</style>
