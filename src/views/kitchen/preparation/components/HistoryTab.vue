<!-- src/views/kitchen/preparation/components/HistoryTab.vue -->
<!-- History Tab - Shows completed production tasks -->
<template>
  <div class="history-tab">
    <!-- Loading State -->
    <div v-if="loading" class="history-loading">
      <v-progress-circular indeterminate size="32" />
      <span class="ml-2">Loading history...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="completedTasks.length === 0" class="history-empty">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-history</v-icon>
      <h3 class="text-h6 mb-2">No Completed Tasks</h3>
      <p class="text-body-2 text-medium-emphasis">Completed production tasks will appear here.</p>
    </div>

    <!-- History List -->
    <div v-else class="history-content">
      <!-- Summary Card -->
      <v-card variant="tonal" color="success" class="mb-4">
        <v-card-text class="d-flex align-center justify-space-between py-3">
          <div class="d-flex align-center">
            <v-icon size="24" class="mr-3">mdi-check-circle</v-icon>
            <div>
              <div class="text-h6 font-weight-bold">{{ completedTasks.length }} Completed</div>
              <div class="text-caption">Today's production</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-h6">{{ totalQuantityProduced }}</div>
            <div class="text-caption">Total produced</div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Completed Tasks List -->
      <div class="history-list">
        <HistoryTaskCard v-for="task in sortedTasks" :key="task.id" :task="task" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HistoryTaskCard from './HistoryTaskCard.vue'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'

// =============================================
// PROPS
// =============================================

interface Props {
  completedTasks: ProductionScheduleItem[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// =============================================
// COMPUTED
// =============================================

/**
 * Tasks sorted by completion time (newest first)
 */
const sortedTasks = computed(() => {
  return [...props.completedTasks].sort((a, b) => {
    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0
    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0
    return dateB - dateA // Newest first
  })
})

/**
 * Total quantity produced today
 */
const totalQuantityProduced = computed(() => {
  const total = props.completedTasks.reduce((sum, task) => {
    return sum + (task.completedQuantity || task.targetQuantity || 0)
  }, 0)

  if (total >= 1000) {
    return `${(total / 1000).toFixed(1)}kg`
  }
  return `${total}g`
})
</script>

<style scoped lang="scss">
.history-tab {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.history-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--v-theme-on-surface);
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  text-align: center;
  padding: 24px;
}

.history-content {
  display: flex;
  flex-direction: column;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
