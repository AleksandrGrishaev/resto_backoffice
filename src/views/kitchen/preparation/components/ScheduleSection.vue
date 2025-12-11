<!-- src/views/kitchen/preparation/components/ScheduleSection.vue -->
<!-- Schedule Section - Groups tasks by time slot -->
<template>
  <div class="schedule-section">
    <!-- Section Header -->
    <div class="section-header" :class="`border-${color}`">
      <div class="header-info">
        <v-icon :color="color" class="mr-2">{{ icon }}</v-icon>
        <div>
          <h3 class="text-subtitle-1 font-weight-bold">{{ title }}</h3>
          <span class="text-caption text-medium-emphasis">{{ subtitle }}</span>
        </div>
      </div>
      <v-chip size="small" :color="color" variant="tonal">
        {{ completedCount }}/{{ items.length }}
      </v-chip>
    </div>

    <!-- Tasks List -->
    <div class="section-tasks">
      <ScheduleTaskCard
        v-for="task in items"
        :key="task.id"
        :task="task"
        @complete="handleComplete"
        @start="handleStart"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ScheduleTaskCard from './ScheduleTaskCard.vue'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'

// =============================================
// PROPS
// =============================================

interface Props {
  title: string
  subtitle: string
  color: string
  icon: string
  items: ProductionScheduleItem[]
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

const completedCount = computed(() => {
  return props.items.filter(t => t.status === 'completed').length
})

// =============================================
// METHODS
// =============================================

function handleComplete(task: ProductionScheduleItem): void {
  emit('complete', task)
}

function handleStart(task: ProductionScheduleItem): void {
  emit('start', task)
}
</script>

<style scoped lang="scss">
.schedule-section {
  background-color: var(--v-theme-surface);
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: rgba(var(--v-theme-on-surface), 0.02);
  border-left: 4px solid;

  &.border-error {
    border-left-color: rgb(var(--v-theme-error));
  }
  &.border-warning {
    border-left-color: rgb(var(--v-theme-warning));
  }
  &.border-info {
    border-left-color: rgb(var(--v-theme-info));
  }
  &.border-purple {
    border-left-color: #9c27b0;
  }
}

.header-info {
  display: flex;
  align-items: center;
}

.section-tasks {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background-color: rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
