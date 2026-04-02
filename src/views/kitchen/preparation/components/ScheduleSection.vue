<!-- src/views/kitchen/preparation/components/ScheduleSection.vue -->
<!-- Schedule Section - Groups tasks by time slot with progress bar -->
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
      <v-chip size="small" :color="allCompleted ? 'success' : color" variant="tonal">
        {{ completedCount }}/{{ items.length }}
      </v-chip>
    </div>

    <!-- Progress Bar -->
    <v-progress-linear
      :model-value="progressPercent"
      :color="allCompleted ? 'success' : color"
      height="3"
      bg-color="transparent"
    />

    <!-- Tasks List (pending first, then completed) -->
    <div class="section-tasks">
      <ScheduleTaskCard
        v-for="task in sortedItems"
        :key="task.id"
        :task="task"
        @quick-complete="handleQuickComplete"
        @edit-complete="handleEditComplete"
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
  'quick-complete': [task: ProductionScheduleItem]
  'edit-complete': [task: ProductionScheduleItem]
}>()

// =============================================
// COMPUTED
// =============================================

const completedCount = computed(() => {
  return props.items.filter(t => t.status === 'completed').length
})

const progressPercent = computed(() => {
  if (props.items.length === 0) return 0
  return (completedCount.value / props.items.length) * 100
})

const allCompleted = computed(() => {
  return props.items.length > 0 && completedCount.value === props.items.length
})

/** Sort: pending items first, completed at bottom */
const sortedItems = computed(() => {
  return [...props.items].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1
    if (a.status !== 'completed' && b.status === 'completed') return -1
    return 0
  })
})

// =============================================
// METHODS
// =============================================

function handleQuickComplete(task: ProductionScheduleItem): void {
  emit('quick-complete', task)
}

function handleEditComplete(task: ProductionScheduleItem): void {
  emit('edit-complete', task)
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
  &.border-success {
    border-left-color: rgb(var(--v-theme-success));
  }
  &.border-teal {
    border-left-color: #009688;
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
