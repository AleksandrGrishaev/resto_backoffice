<!-- src/views/kitchen/kpi/components/TimeKpiCard.vue -->
<template>
  <v-card class="time-kpi-card" :loading="loading">
    <v-card-title class="d-flex align-center">
      <v-icon start>mdi-clock-fast</v-icon>
      Time KPI - Today
      <v-chip v-if="department !== 'all'" class="ml-2" size="small" color="primary" variant="tonal">
        {{ departmentLabel }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <div class="metrics-grid">
        <!-- Items Completed -->
        <div class="metric-item">
          <div class="metric-value">{{ metrics.itemsCompleted }}</div>
          <div class="metric-label">Items Completed</div>
        </div>

        <!-- Average Total Time -->
        <div class="metric-item">
          <div class="metric-value" :class="totalTimeClass">
            {{ formatTime(metrics.avgTotalSeconds) }}
          </div>
          <div class="metric-label">
            Avg Total Time
            <span class="metric-plan">(plan: {{ formatTime(planTime) }})</span>
          </div>
        </div>

        <!-- Average Waiting Time -->
        <div class="metric-item">
          <div class="metric-value">{{ formatTime(metrics.avgWaitingSeconds) }}</div>
          <div class="metric-label">Avg Waiting</div>
        </div>

        <!-- Average Cooking Time -->
        <div class="metric-item">
          <div class="metric-value">{{ formatTime(metrics.avgCookingSeconds) }}</div>
          <div class="metric-label">Avg Cooking</div>
        </div>

        <!-- Exceeded Plan -->
        <div class="metric-item">
          <div class="metric-value" :class="exceededClass">
            {{ metrics.itemsExceededPlan }}
            <span class="metric-rate">({{ metrics.exceededRate }}%)</span>
          </div>
          <div class="metric-label">Exceeded Plan</div>
        </div>

        <!-- Deviation -->
        <div class="metric-item">
          <div class="metric-value" :class="deviationClass">
            {{ deviationDisplay }}
          </div>
          <div class="metric-label">Deviation from Plan</div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PLAN_TIMES } from '@/stores/kitchenKpi/composables'
import type { TimeKpiMetrics } from '@/stores/kitchenKpi/types'

// =============================================
// PROPS
// =============================================

interface Props {
  metrics: TimeKpiMetrics
  department?: 'all' | 'kitchen' | 'bar'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  department: 'all',
  loading: false
})

// =============================================
// COMPUTED
// =============================================

const departmentLabel = computed(() => {
  const labels: Record<string, string> = {
    kitchen: 'Kitchen',
    bar: 'Bar',
    all: 'All'
  }
  return labels[props.department] || 'All'
})

const planTime = computed(() => {
  if (props.department === 'bar') return PLAN_TIMES.bar
  if (props.department === 'kitchen') return PLAN_TIMES.kitchen
  // For 'all', use kitchen plan as default reference
  return PLAN_TIMES.kitchen
})

const deviation = computed(() => {
  if (planTime.value === 0) return 0
  return Math.round(((props.metrics.avgTotalSeconds - planTime.value) / planTime.value) * 100)
})

const deviationDisplay = computed(() => {
  const value = deviation.value
  if (value > 0) return `+${value}%`
  return `${value}%`
})

const totalTimeClass = computed(() => {
  if (props.metrics.avgTotalSeconds <= planTime.value) return 'text-success'
  if (props.metrics.avgTotalSeconds <= planTime.value * 1.2) return 'text-warning'
  return 'text-error'
})

const exceededClass = computed(() => {
  if (props.metrics.exceededRate === 0) return 'text-success'
  if (props.metrics.exceededRate <= 20) return 'text-warning'
  return 'text-error'
})

const deviationClass = computed(() => {
  if (deviation.value <= 0) return 'text-success'
  if (deviation.value <= 20) return 'text-warning'
  return 'text-error'
})

// =============================================
// METHODS
// =============================================

const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.time-kpi-card {
  background-color: rgba(var(--v-theme-surface), 1);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
}

.metric-item {
  text-align: center;
  padding: var(--spacing-sm);
  border-radius: 8px;
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}

.metric-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  font-feature-settings: 'tnum';
}

.metric-rate {
  font-size: var(--text-sm);
  font-weight: 500;
  opacity: 0.8;
}

.metric-label {
  font-size: var(--text-xs);
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-top: var(--spacing-xs);
}

.metric-plan {
  font-size: var(--text-xs);
  opacity: 0.6;
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-warning {
  color: rgb(var(--v-theme-warning));
}

.text-error {
  color: rgb(var(--v-theme-error));
}

/* Responsive */
@media (max-width: 600px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
  }

  .metric-value {
    font-size: var(--text-xl);
  }
}
</style>
