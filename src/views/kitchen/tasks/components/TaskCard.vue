<!-- src/views/kitchen/tasks/components/TaskCard.vue -->
<!-- Kanban task card — tap to open ProductionCard dialog -->
<template>
  <!-- Collapsed: compact row -->
  <div
    class="task-card"
    :class="{
      'task-completed': isCompleted,
      [`task-${taskColor}`]: !isCompleted,
      'task-tappable': !isCompleted
    }"
    @click="handleTap"
  >
    <!-- Left: name + chip -->
    <div class="task-left">
      <div class="task-header">
        <span class="task-name" :class="{ 'text-decoration-line-through': isCompleted }">
          {{ task.preparationName }}
        </span>
        <v-chip v-if="isWriteOff && !isCompleted" color="error" size="x-small" variant="flat">
          WRITE-OFF
        </v-chip>
        <v-chip v-if="isDefrost && !isCompleted" color="cyan" size="x-small" variant="flat">
          DEFROST
        </v-chip>
      </div>

      <!-- Completion info (only for completed) -->
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
        <v-icon v-if="task.photoUrl" size="10" color="primary">mdi-camera</v-icon>
        <span v-if="task.completedAt" class="done-time">{{ formatTime(task.completedAt) }}</span>
      </div>
    </div>

    <!-- Right: stat badges (pending only) -->
    <div v-if="!isCompleted" class="task-badges">
      <!-- Defrost badges: FROZEN + DEFROST -->
      <template v-if="isDefrost">
        <div v-if="task.currentStockAtGeneration != null" class="badge badge-frozen">
          <span class="badge-qty">
            {{ Math.round(task.currentStockAtGeneration) }}{{ task.targetUnit }}
          </span>
          <span class="badge-label">frozen</span>
        </div>
        <div class="badge badge-defrost">
          <span class="badge-qty">{{ task.targetQuantity }}{{ task.targetUnit }}</span>
          <span class="badge-label">defrost</span>
        </div>
      </template>
      <!-- Standard badges (production/write-off) -->
      <template v-else>
        <div v-if="task.currentStockAtGeneration != null" class="badge badge-stock">
          <span class="badge-qty">
            {{ Math.round(task.currentStockAtGeneration) }}{{ task.targetUnit }}
          </span>
          <span class="badge-label">stock</span>
        </div>
        <div class="badge badge-target">
          <span class="badge-qty">{{ task.targetQuantity }}{{ task.targetUnit }}</span>
          <span class="badge-label">target</span>
        </div>
        <div v-if="task.avgDailyConsumption && !isWriteOff" class="badge badge-avg">
          <span class="badge-qty">{{ Math.round(task.avgDailyConsumption) }}</span>
          <span class="badge-label">avg/d</span>
        </div>
        <div v-if="task.maxDailyConsumption && !isWriteOff" class="badge badge-max">
          <span class="badge-qty">{{ Math.round(task.maxDailyConsumption) }}</span>
          <span class="badge-label">max/d</span>
        </div>
      </template>
    </div>

    <!-- Chevron -->
    <v-icon v-if="!isCompleted" size="18" class="task-chevron">mdi-chevron-right</v-icon>
  </div>

  <!-- Production Card Dialog -->
  <ProductionCard
    v-if="showDialog"
    v-model="showDialog"
    :task="task"
    @complete="handleProductionComplete"
    @write-off="handleProductionWriteOff"
    @defrost="handleProductionDefrost"
  />
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
    startedAt?: string,
    photoUrl?: string
  ]
  'write-off': [
    task: ProductionScheduleItem,
    quantity: number,
    staffMemberId?: string,
    staffMemberName?: string
  ]
  defrost: [
    task: ProductionScheduleItem,
    quantity: number,
    staffMemberId?: string,
    staffMemberName?: string
  ]
}>()

const showDialog = ref(false)

const isCompleted = computed(() => props.task.status === 'completed')
const isWriteOff = computed(() => props.task.taskType === 'write_off')
const isDefrost = computed(() => props.task.taskType === 'defrost')
const isPremade = computed(() => props.task.isPremade === true)

const doneQtyClass = computed(() => {
  const actual = props.task.completedQuantity || props.task.targetQuantity
  if (actual < props.task.targetQuantity) return 'text-warning'
  return 'text-success'
})

const taskColor = computed(() => {
  if (isWriteOff.value) return 'writeoff'
  if (isDefrost.value) return 'defrost'
  if (isPremade.value) return 'premade'
  return 'production'
})

function handleTap(): void {
  if (!isCompleted.value) {
    showDialog.value = true
  }
}

function handleProductionComplete(
  task: ProductionScheduleItem,
  qty: number,
  staffMemberId?: string,
  staffMemberName?: string,
  startedAt?: string,
  photoUrl?: string
): void {
  showDialog.value = false
  emit('complete', task, qty, staffMemberId, staffMemberName, startedAt, photoUrl)
}

function handleProductionWriteOff(
  task: ProductionScheduleItem,
  qty: number,
  staffMemberId?: string,
  staffMemberName?: string
): void {
  showDialog.value = false
  emit('write-off', task, qty, staffMemberId, staffMemberName)
}

function handleProductionDefrost(
  task: ProductionScheduleItem,
  qty: number,
  staffMemberId?: string,
  staffMemberName?: string
): void {
  showDialog.value = false
  emit('defrost', task, qty, staffMemberId, staffMemberName)
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
  gap: 10px;
  padding: 12px 12px 12px 16px;
  min-height: 68px;
  background-color: var(--v-theme-surface);
  border-radius: 10px;
  border-left: 5px solid transparent;
  transition: opacity 0.3s;

  &.task-premade {
    border-left-color: #009688;
  }

  &.task-production {
    border-left-color: rgb(var(--v-theme-info));
  }

  &.task-writeoff {
    border-left-color: rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.03);
  }

  &.task-defrost {
    border-left-color: #00bcd4;
    background-color: rgba(0, 188, 212, 0.03);
  }

  &.task-completed {
    opacity: 0.5;
    border-left-color: rgb(var(--v-theme-success));
    min-height: 48px;
    padding: 8px 12px 8px 16px;
  }

  &.task-tappable {
    cursor: pointer;

    &:active {
      background-color: rgba(var(--v-theme-primary), 0.04);
    }
  }
}

/* Left: name + chip */
.task-left {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-name {
  font-weight: 700;
  font-size: 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Right: stat badges (like StockItemCard batch-qty style) */
.task-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  min-width: 52px;

  .badge-qty {
    font-size: 15px;
    font-weight: 700;
    line-height: 1.1;
  }

  .badge-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-top: 2px;
    opacity: 0.8;
  }
}

.badge-stock {
  background-color: rgba(var(--v-theme-warning), 0.15);
  color: rgb(var(--v-theme-warning));
}

.badge-target {
  background-color: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
}

.badge-avg {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.badge-max {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.badge-frozen {
  background-color: rgba(0, 188, 212, 0.15);
  color: #00838f;
}

.badge-defrost {
  background-color: rgba(76, 175, 80, 0.15);
  color: #2e7d32;
}

.task-chevron {
  flex-shrink: 0;
  color: rgba(var(--v-theme-on-surface), 0.2);
}

/* Completed state */
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
