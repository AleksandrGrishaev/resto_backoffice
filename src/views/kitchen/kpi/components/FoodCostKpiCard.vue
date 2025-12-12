<!-- src/views/kitchen/kpi/components/FoodCostKpiCard.vue -->
<template>
  <v-card class="food-cost-kpi-card" :loading="loading">
    <v-card-title class="d-flex align-center">
      <v-icon start>mdi-currency-usd</v-icon>
      Food Cost KPI
      <v-chip v-if="metrics" class="ml-2" size="small" color="primary" variant="tonal">
        {{ monthName }}
      </v-chip>
      <v-chip
        v-if="department !== 'all'"
        class="ml-2"
        size="small"
        :color="department === 'kitchen' ? 'orange' : 'blue'"
        variant="tonal"
      >
        {{ departmentLabel }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <!-- Loading state -->
      <div v-if="loading && !metrics" class="loading-placeholder">
        <v-progress-circular indeterminate color="primary" />
        <p class="text-body-2 mt-2">Loading...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="error-placeholder">
        <v-icon size="48" color="error">mdi-alert-circle</v-icon>
        <p class="text-body-2 mt-2 text-error">{{ error }}</p>
      </div>

      <!-- No data state -->
      <div v-else-if="!metrics" class="no-data-placeholder">
        <v-icon size="48" color="grey-lighten-1">mdi-chart-pie</v-icon>
        <p class="text-body-2 mt-2 text-medium-emphasis">No data for this month</p>
      </div>

      <!-- Metrics grid -->
      <div v-else class="metrics-grid">
        <!-- Revenue -->
        <div class="metric-item">
          <div class="metric-value">{{ formatCurrency(metrics.revenue) }}</div>
          <div class="metric-label">Revenue</div>
        </div>

        <!-- Total COGS % -->
        <div class="metric-item metric-highlight">
          <div class="metric-value" :class="totalCogsClass">
            {{ metrics.totalCOGSPercent.toFixed(1) }}%
          </div>
          <div class="metric-label">
            Total COGS
            <span class="metric-target">(target: {{ targetPercent }}%)</span>
          </div>
        </div>

        <!-- Sales COGS -->
        <div class="metric-item">
          <div class="metric-value metric-sm">{{ formatCurrency(metrics.salesCOGS) }}</div>
          <div class="metric-label">Sales COGS</div>
          <div class="metric-percent">{{ salesCogsPercent }}%</div>
        </div>

        <!-- Spoilage -->
        <div class="metric-item">
          <div class="metric-value metric-sm" :class="metrics.spoilage > 0 ? 'text-warning' : ''">
            {{ formatCurrency(metrics.spoilage) }}
          </div>
          <div class="metric-label">Spoilage & Losses</div>
          <div class="metric-percent">{{ spoilagePercent }}%</div>
        </div>

        <!-- Shortage -->
        <div class="metric-item">
          <div class="metric-value metric-sm" :class="metrics.shortage > 0 ? 'text-error' : ''">
            {{ formatCurrency(metrics.shortage) }}
          </div>
          <div class="metric-label">Shortage</div>
          <div class="metric-percent">{{ shortagePercent }}%</div>
        </div>

        <!-- Surplus -->
        <div class="metric-item">
          <div class="metric-value metric-sm" :class="metrics.surplus > 0 ? 'text-success' : ''">
            {{ metrics.surplus > 0 ? '-' : '' }}{{ formatCurrency(metrics.surplus) }}
          </div>
          <div class="metric-label">Surplus</div>
          <div class="metric-percent">
            {{ metrics.surplus > 0 ? '-' : '' }}{{ surplusPercent }}%
          </div>
        </div>

        <!-- Total COGS Amount -->
        <div class="metric-item">
          <div class="metric-value metric-sm">{{ formatCurrency(metrics.totalCOGS) }}</div>
          <div class="metric-label">Total COGS</div>
        </div>

        <!-- Variance -->
        <div class="metric-item">
          <div class="metric-value" :class="varianceClass">
            {{ varianceDisplay }}
          </div>
          <div class="metric-label">Variance from Target</div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatIDR } from '@/utils/currency'
import type { FoodCostKpiMetrics } from '@/stores/kitchenKpi/types'
import { FOOD_COST_TARGETS, VARIANCE_THRESHOLD } from '@/stores/kitchenKpi/types'

// =============================================
// PROPS
// =============================================

interface Props {
  metrics: FoodCostKpiMetrics | null
  department?: 'all' | 'kitchen' | 'bar'
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  department: 'all',
  loading: false,
  error: null
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

const monthName = computed(() => {
  if (!props.metrics) return ''
  const date = new Date(props.metrics.period.startDate)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const targetPercent = computed(() => {
  if (props.department === 'bar') return FOOD_COST_TARGETS.bar
  return FOOD_COST_TARGETS.kitchen
})

// Percentage calculations
const salesCogsPercent = computed(() => {
  if (!props.metrics || props.metrics.revenue === 0) return '0.0'
  return ((props.metrics.salesCOGS / props.metrics.revenue) * 100).toFixed(1)
})

const spoilagePercent = computed(() => {
  if (!props.metrics || props.metrics.revenue === 0) return '0.0'
  return ((props.metrics.spoilage / props.metrics.revenue) * 100).toFixed(1)
})

const shortagePercent = computed(() => {
  if (!props.metrics || props.metrics.revenue === 0) return '0.0'
  return ((props.metrics.shortage / props.metrics.revenue) * 100).toFixed(1)
})

const surplusPercent = computed(() => {
  if (!props.metrics || props.metrics.revenue === 0) return '0.0'
  return ((props.metrics.surplus / props.metrics.revenue) * 100).toFixed(1)
})

const variance = computed(() => {
  if (!props.metrics) return 0
  return props.metrics.totalCOGSPercent - targetPercent.value
})

const varianceDisplay = computed(() => {
  const value = variance.value
  if (value > 0) return `+${value.toFixed(1)}%`
  return `${value.toFixed(1)}%`
})

// CSS classes
const totalCogsClass = computed(() => {
  if (!props.metrics) return ''
  const percent = props.metrics.totalCOGSPercent
  if (percent <= targetPercent.value) return 'text-success'
  if (percent <= targetPercent.value + VARIANCE_THRESHOLD.warning) return 'text-warning'
  return 'text-error'
})

const varianceClass = computed(() => {
  if (variance.value <= 0) return 'text-success'
  if (variance.value <= VARIANCE_THRESHOLD.warning) return 'text-warning'
  return 'text-error'
})

// =============================================
// METHODS
// =============================================

const formatCurrency = (value: number): string => {
  return formatIDR(value, { compact: value > 1000000 })
}
</script>

<style scoped lang="scss">
.food-cost-kpi-card {
  background-color: rgba(var(--v-theme-surface), 1);
}

.loading-placeholder,
.no-data-placeholder,
.error-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  min-height: 200px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-md);
}

.metric-item {
  text-align: center;
  padding: var(--spacing-sm);
  border-radius: 8px;
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}

.metric-highlight {
  background-color: rgba(var(--v-theme-primary), 0.1);
  grid-column: span 1;
}

.metric-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  font-feature-settings: 'tnum';
}

.metric-value.metric-sm {
  font-size: var(--text-lg);
}

.metric-label {
  font-size: var(--text-xs);
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-top: var(--spacing-xs);
}

.metric-target {
  font-size: var(--text-xs);
  opacity: 0.6;
}

.metric-percent {
  font-size: var(--text-sm);
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-top: 2px;
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
@media (max-width: 900px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-sm);
  }
}

@media (max-width: 600px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .metric-value {
    font-size: var(--text-xl);
  }

  .metric-value.metric-sm {
    font-size: var(--text-base);
  }
}
</style>
