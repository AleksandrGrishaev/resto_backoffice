<!-- src/views/kitchen/preparation/components/HistoryTaskCard.vue -->
<!-- History Task Card - Shows completed task details -->
<template>
  <v-card variant="outlined" class="history-card">
    <v-card-text class="d-flex align-center py-3 px-4">
      <!-- Status Icon -->
      <v-icon color="success" size="24" class="mr-3">mdi-check-circle</v-icon>

      <!-- Task Info -->
      <div class="task-info flex-grow-1">
        <div class="task-name">{{ task.preparationName }}</div>
        <div class="task-details d-flex flex-wrap gap-3">
          <span class="detail-item">
            <v-icon size="14" class="mr-1">mdi-scale</v-icon>
            {{ formatQuantity(task.completedQuantity || task.targetQuantity, task.targetUnit) }}
          </span>
          <span v-if="task.completedAt" class="detail-item">
            <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
            {{ formatTime(task.completedAt) }}
          </span>
          <span v-if="task.completedByName" class="detail-item">
            <v-icon size="14" class="mr-1">mdi-account</v-icon>
            {{ task.completedByName }}
          </span>
        </div>
      </div>

      <!-- Slot Badge -->
      <v-chip :color="slotColor" size="small" variant="tonal" class="ml-2">
        {{ slotLabel }}
      </v-chip>
    </v-card-text>
  </v-card>
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
// COMPUTED
// =============================================

const slotLabel = computed(() => {
  const slots: Record<string, string> = {
    urgent: 'Urgent',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening'
  }
  return slots[props.task.productionSlot] || props.task.productionSlot
})

const slotColor = computed(() => {
  const colors: Record<string, string> = {
    urgent: 'error',
    morning: 'info',
    afternoon: 'warning',
    evening: 'purple'
  }
  return colors[props.task.productionSlot] || 'grey'
})

// =============================================
// METHODS
// =============================================

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
</script>

<style scoped lang="scss">
.history-card {
  background-color: rgba(var(--v-theme-success), 0.05);
  border-color: rgba(var(--v-theme-success), 0.2);
  transition: all 0.2s;

  &:hover {
    background-color: rgba(var(--v-theme-success), 0.08);
  }
}

.task-info {
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
  margin-top: 4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.detail-item {
  display: flex;
  align-items: center;
}

.gap-3 {
  gap: 12px;
}
</style>
