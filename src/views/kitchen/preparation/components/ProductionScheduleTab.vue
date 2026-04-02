<!-- src/views/kitchen/preparation/components/ProductionScheduleTab.vue -->
<!-- Production Schedule Tab - TODO-style task list grouped by time slots -->
<template>
  <div class="schedule-tab">
    <!-- Loading State -->
    <div v-if="loading" class="schedule-loading">
      <v-progress-circular indeterminate size="32" />
      <span class="ml-2">Loading schedule...</span>
    </div>

    <!-- Empty State with Recommendations -->
    <div v-else-if="isEmpty && !hasRecommendations" class="schedule-empty">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-clipboard-check-outline</v-icon>
      <h3 class="text-h6 mb-2">No Tasks Scheduled</h3>
      <p class="text-body-2 text-medium-emphasis">
        Production schedule is empty for today.
        <br />
        Tasks will appear here based on stock levels and consumption.
      </p>
      <v-btn
        color="primary"
        variant="outlined"
        class="mt-4"
        :loading="recommendationsLoading"
        @click="$emit('generate-recommendations')"
      >
        <v-icon start>mdi-lightbulb-outline</v-icon>
        Generate Recommendations
      </v-btn>
    </div>

    <!-- Recommendations Only (empty schedule but has recommendations) -->
    <div v-else-if="isEmpty && hasRecommendations" class="schedule-with-recommendations">
      <RecommendationsList
        :recommendations="recommendations"
        :loading="recommendationsLoading"
        @apply="handleApplyRecommendation"
        @apply-all="handleApplyAllRecommendations"
        @dismiss="handleDismissRecommendation"
      />
    </div>

    <!-- Schedule Content -->
    <div v-else class="schedule-content">
      <!-- Daily Progress Summary -->
      <div v-if="totalTasks > 0" class="daily-progress">
        <div class="progress-header">
          <span class="progress-label">Today's Progress</span>
          <span class="progress-count" :class="{ 'text-success': allDone }">
            {{ completedTasks }}/{{ totalTasks }} tasks
          </span>
        </div>
        <v-progress-linear
          :model-value="completionPercent"
          :color="allDone ? 'success' : 'primary'"
          height="6"
          rounded
        />
      </div>

      <!-- Recommendations Panel (collapsed when schedule has items) -->
      <div v-if="hasRecommendations" class="recommendations-panel">
        <v-expansion-panels variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-lightbulb-outline</v-icon>
                <span>Suggestions</span>
                <v-chip size="x-small" color="primary" class="ml-2">
                  {{ recommendations.length }}
                </v-chip>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <RecommendationsList
                :recommendations="recommendations"
                :loading="recommendationsLoading"
                @apply="handleApplyRecommendation"
                @apply-all="handleApplyAllRecommendations"
                @dismiss="handleDismissRecommendation"
              />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
      <!-- Morning Prep Section (pre-made items) -->
      <ScheduleSection
        v-if="scheduleItems.premade?.length"
        title="Morning Prep"
        subtitle="Pre-made items to prepare before opening"
        color="teal"
        icon="mdi-chef-hat"
        :items="scheduleItems.premade"
        @quick-complete="handleQuickComplete"
        @edit-complete="handleEditComplete"
      />

      <!-- Urgent Section -->
      <ScheduleSection
        v-if="scheduleItems.urgent?.length"
        title="Urgent"
        subtitle="Out of stock or expiring today"
        color="error"
        icon="mdi-alert-circle"
        :items="scheduleItems.urgent"
        @quick-complete="handleQuickComplete"
        @edit-complete="handleEditComplete"
      />

      <!-- Morning Section -->
      <ScheduleSection
        v-if="scheduleItems.morning?.length"
        title="Morning"
        subtitle="6:00 - 12:00"
        color="info"
        icon="mdi-weather-sunny"
        :items="scheduleItems.morning"
        @quick-complete="handleQuickComplete"
        @edit-complete="handleEditComplete"
      />

      <!-- Afternoon Section -->
      <ScheduleSection
        v-if="scheduleItems.afternoon?.length"
        title="Afternoon"
        subtitle="12:00 - 18:00"
        color="warning"
        icon="mdi-weather-partly-cloudy"
        :items="scheduleItems.afternoon"
        @quick-complete="handleQuickComplete"
        @edit-complete="handleEditComplete"
      />

      <!-- Evening Section -->
      <ScheduleSection
        v-if="scheduleItems.evening?.length"
        title="Evening"
        subtitle="18:00 - 22:00"
        color="purple"
        icon="mdi-weather-night"
        :items="scheduleItems.evening"
        @quick-complete="handleQuickComplete"
        @edit-complete="handleEditComplete"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ScheduleSection from './ScheduleSection.vue'
import RecommendationsList from './RecommendationsList.vue'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'
import type { ProductionRecommendation } from '@/stores/preparation/types'

// =============================================
// PROPS
// =============================================

interface Props {
  scheduleItems: Record<string, ProductionScheduleItem[]>
  recommendations?: ProductionRecommendation[]
  loading?: boolean
  recommendationsLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  recommendationsLoading: false,
  recommendations: () => []
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'quick-complete-task': [task: ProductionScheduleItem]
  'edit-complete-task': [task: ProductionScheduleItem]
  'generate-recommendations': []
  'apply-recommendation': [recommendation: ProductionRecommendation]
  'apply-all-recommendations': []
  'dismiss-recommendation': [id: string]
}>()

// =============================================
// COMPUTED
// =============================================

/**
 * Check if schedule is empty
 */
const isEmpty = computed(() => {
  const items = props.scheduleItems
  return (
    (!items.premade || items.premade.length === 0) &&
    (!items.urgent || items.urgent.length === 0) &&
    (!items.morning || items.morning.length === 0) &&
    (!items.afternoon || items.afternoon.length === 0) &&
    (!items.evening || items.evening.length === 0)
  )
})

/**
 * Check if there are recommendations available
 */
const hasRecommendations = computed(() => props.recommendations.length > 0)

/** Total tasks across all slots */
const totalTasks = computed(() => {
  const items = props.scheduleItems
  return (
    (items.premade?.length || 0) +
    (items.urgent?.length || 0) +
    (items.morning?.length || 0) +
    (items.afternoon?.length || 0) +
    (items.evening?.length || 0)
  )
})

/** Completed tasks count */
const completedTasks = computed(() => {
  const items = props.scheduleItems
  const all = [
    ...(items.premade || []),
    ...(items.urgent || []),
    ...(items.morning || []),
    ...(items.afternoon || []),
    ...(items.evening || [])
  ]
  return all.filter(t => t.status === 'completed').length
})

/** Completion percentage */
const completionPercent = computed(() => {
  if (totalTasks.value === 0) return 0
  return (completedTasks.value / totalTasks.value) * 100
})

/** All tasks done */
const allDone = computed(() => {
  return totalTasks.value > 0 && completedTasks.value === totalTasks.value
})

// =============================================
// METHODS
// =============================================

function handleQuickComplete(task: ProductionScheduleItem): void {
  emit('quick-complete-task', task)
}

function handleEditComplete(task: ProductionScheduleItem): void {
  emit('edit-complete-task', task)
}

function handleApplyRecommendation(recommendation: ProductionRecommendation): void {
  emit('apply-recommendation', recommendation)
}

function handleApplyAllRecommendations(): void {
  emit('apply-all-recommendations')
}

function handleDismissRecommendation(id: string): void {
  emit('dismiss-recommendation', id)
}
</script>

<style scoped lang="scss">
.schedule-tab {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  -webkit-overflow-scrolling: touch; /* Smooth scroll on iOS */
  overscroll-behavior: contain; /* Prevent scroll chaining */
}

.schedule-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--v-theme-on-surface);
}

.schedule-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  text-align: center;
  padding: 24px;
}

.schedule-with-recommendations {
  padding: 0;
}

.schedule-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.daily-progress {
  background-color: var(--v-theme-surface);
  border-radius: 8px;
  padding: 12px 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-weight: 600;
  font-size: 14px;
}

.progress-count {
  font-weight: 500;
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.recommendations-panel {
  margin-bottom: 8px;

  :deep(.v-expansion-panel-text__wrapper) {
    padding: 0;
  }
}
</style>
