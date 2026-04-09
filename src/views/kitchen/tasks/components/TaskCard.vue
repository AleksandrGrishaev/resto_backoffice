<!-- src/views/kitchen/tasks/components/TaskCard.vue -->
<!-- Kanban task card — tap to expand into full ProductionCard -->
<template>
  <!-- Expanded: show ProductionCard -->
  <ProductionCard
    v-if="expanded && !isCompleted"
    :task="task"
    @complete="handleProductionComplete"
    @write-off="handleProductionWriteOff"
    @close="expanded = false"
  />

  <!-- Collapsed: compact row -->
  <div
    v-else
    class="task-card"
    :class="{
      'task-completed': isCompleted,
      [`task-${taskColor}`]: !isCompleted,
      'task-tappable': !isCompleted
    }"
    @click="handleTap"
  >
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

      <!-- Meta: stock + target -->
      <div v-if="!isCompleted" class="task-meta">
        <span v-if="task.currentStockAtGeneration != null" class="meta-stock">
          stock {{ Math.round(task.currentStockAtGeneration) }}{{ task.targetUnit }}
        </span>
        <span class="meta-target">
          <v-icon size="10">mdi-arrow-right</v-icon>
          {{ task.targetQuantity }}{{ task.targetUnit }}
        </span>
        <span v-if="!isCompleted" class="meta-expand">
          <v-icon size="14" color="primary">mdi-chevron-down</v-icon>
        </span>
      </div>

      <!-- Completion info: recommended → actual + staff -->
      <div v-if="isCompleted" class="task-completed-info">
        <v-icon size="14" color="success">mdi-check</v-icon>
        <span class="done-recommended">{{ task.targetQuantity }}{{ task.targetUnit }}</span>
        <v-icon size="10">mdi-arrow-right</v-icon>
        <span class="done-actual" :class="doneQtyClass">
          {{ task.completedQuantity || task.targetQuantity }}{{ task.targetUnit }}
        </span>
        <span v-if="task.staffMemberName" class="done-staff">
          <v-icon size="10">mdi-account</v-icon>
          {{ task.staffMemberName }}
        </span>
        <span v-if="task.completedAt" class="done-time">{{ formatTime(task.completedAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import ProductionCard from './ProductionCard.vue'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'

const props = defineProps<{
  task: ProductionScheduleItem
}>()

const emit = defineEmits<{
  complete: [
    task: ProductionScheduleItem,
    quantity: number,
    staffMemberId?: string,
    staffMemberName?: string,
    startedAt?: string
  ]
  'write-off': [
    task: ProductionScheduleItem,
    quantity: number,
    staffMemberId?: string,
    staffMemberName?: string
  ]
}>()

const expanded = ref(false)

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

function handleTap(): void {
  if (!isCompleted.value) {
    expanded.value = true
  }
}

function handleProductionComplete(
  task: ProductionScheduleItem,
  qty: number,
  staffMemberId?: string,
  staffMemberName?: string,
  startedAt?: string
): void {
  expanded.value = false
  emit('complete', task, qty, staffMemberId, staffMemberName, startedAt)
}

function handleProductionWriteOff(
  task: ProductionScheduleItem,
  qty: number,
  staffMemberId?: string,
  staffMemberName?: string
): void {
  expanded.value = false
  emit('write-off', task, qty, staffMemberId, staffMemberName)
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

  &.task-tappable {
    cursor: pointer;

    &:active {
      background-color: rgba(var(--v-theme-primary), 0.04);
    }
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
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 12px;
}

.meta-stock {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-weight: 500;
}

.meta-target {
  display: flex;
  align-items: center;
  gap: 2px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.meta-expand {
  margin-left: auto;
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

.done-staff {
  display: flex;
  align-items: center;
  gap: 2px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-left: 4px;
}

.done-time {
  color: rgba(var(--v-theme-on-surface), 0.4);
  margin-left: 4px;
}
</style>
