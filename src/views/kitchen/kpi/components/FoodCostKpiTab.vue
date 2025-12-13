<!-- src/views/kitchen/kpi/components/FoodCostKpiTab.vue -->
<template>
  <v-card class="food-cost-kpi-tab" flat>
    <v-card-title class="d-flex align-center">
      <v-icon start>mdi-table</v-icon>
      COGS Breakdown
    </v-card-title>

    <v-card-text>
      <!-- Loading state -->
      <div v-if="loading && !metrics" class="loading-placeholder">
        <v-progress-circular indeterminate color="primary" />
        <p class="text-body-2 mt-2">Loading...</p>
      </div>

      <!-- No data state -->
      <div v-else-if="!metrics" class="no-data-placeholder">
        <v-icon size="48" color="grey-lighten-1">mdi-table-large</v-icon>
        <p class="text-body-2 mt-2 text-medium-emphasis">No COGS data for this month</p>
      </div>

      <!-- COGS Table -->
      <v-table v-else class="cogs-table" density="comfortable">
        <thead>
          <tr>
            <th class="text-left">Component</th>
            <th class="text-right">Amount (Rp)</th>
            <th class="text-right">% of Revenue</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          <!-- Theoretical COGS (recipe cost without losses) -->
          <tr>
            <td>
              <div class="d-flex align-center">
                <v-icon size="18" class="mr-2" color="blue">mdi-calculator</v-icon>
                Theoretical COGS
              </div>
              <div class="text-caption text-medium-emphasis">Recipe cost (FIFO) without losses</div>
            </td>
            <td class="text-right mono">{{ formatCurrency(metrics.salesCOGS) }}</td>
            <td class="text-right mono">{{ salesCogsPercent }}%</td>
            <td class="text-center">
              <v-icon size="18" color="info">mdi-information</v-icon>
            </td>
          </tr>

          <!-- Spoilage -->
          <tr>
            <td>
              <div class="d-flex align-center">
                <v-icon size="18" class="mr-2" color="orange">mdi-trash-can</v-icon>
                Spoilage & Losses
              </div>
              <div class="text-caption text-medium-emphasis">
                Write-offs (expired, damaged, waste)
              </div>
            </td>
            <td class="text-right mono" :class="metrics.spoilage > 0 ? 'text-warning' : ''">
              {{ formatCurrency(metrics.spoilage) }}
            </td>
            <td class="text-right mono" :class="metrics.spoilage > 0 ? 'text-warning' : ''">
              {{ spoilagePercent }}%
            </td>
            <td class="text-center">
              <v-icon v-if="metrics.spoilage > 0" size="18" color="warning">mdi-alert</v-icon>
              <v-icon v-else size="18" color="success">mdi-check-circle</v-icon>
            </td>
          </tr>

          <!-- Shortage -->
          <tr>
            <td>
              <div class="d-flex align-center">
                <v-icon size="18" class="mr-2" color="red">mdi-minus-circle</v-icon>
                Shortage
              </div>
              <div class="text-caption text-medium-emphasis">
                Inventory deficit (actual &lt; expected)
              </div>
            </td>
            <td class="text-right mono" :class="metrics.shortage > 0 ? 'text-error' : ''">
              {{ formatCurrency(metrics.shortage) }}
            </td>
            <td class="text-right mono" :class="metrics.shortage > 0 ? 'text-error' : ''">
              {{ shortagePercent }}%
            </td>
            <td class="text-center">
              <v-icon v-if="metrics.shortage > 0" size="18" color="error">mdi-alert-circle</v-icon>
              <v-icon v-else size="18" color="success">mdi-check-circle</v-icon>
            </td>
          </tr>

          <!-- Surplus -->
          <tr>
            <td>
              <div class="d-flex align-center">
                <v-icon size="18" class="mr-2" color="green">mdi-plus-circle</v-icon>
                Surplus
              </div>
              <div class="text-caption text-medium-emphasis">
                Inventory excess (actual &gt; expected)
              </div>
            </td>
            <td class="text-right mono text-success">
              {{ metrics.surplus > 0 ? '-' : '' }}{{ formatCurrency(metrics.surplus) }}
            </td>
            <td class="text-right mono text-success">
              {{ metrics.surplus > 0 ? '-' : '' }}{{ surplusPercent }}%
            </td>
            <td class="text-center">
              <v-icon v-if="metrics.surplus > 0" size="18" color="success">mdi-arrow-down</v-icon>
              <v-icon v-else size="18" color="grey">mdi-minus</v-icon>
            </td>
          </tr>

          <!-- Actual COGS (with losses) -->
          <tr class="total-row">
            <td>
              <div class="d-flex align-center font-weight-bold">
                <v-icon size="18" class="mr-2" color="primary">mdi-sigma</v-icon>
                Actual COGS
              </div>
              <div class="text-caption text-medium-emphasis">
                = Theoretical + Spoilage + Shortage - Surplus
              </div>
            </td>
            <td class="text-right mono font-weight-bold">
              {{ formatCurrency(metrics.totalCOGS) }}
            </td>
            <td class="text-right mono font-weight-bold" :class="totalCogsClass">
              {{ metrics.totalCOGSPercent.toFixed(1) }}%
            </td>
            <td class="text-center">
              <v-chip size="small" :color="totalCogsColor" variant="tonal">
                {{ metrics.totalCOGSPercent <= targetPercent ? 'OK' : 'HIGH' }}
              </v-chip>
            </td>
          </tr>

          <!-- Target -->
          <tr class="target-row">
            <td>
              <div class="d-flex align-center text-medium-emphasis">
                <v-icon size="18" class="mr-2">mdi-target</v-icon>
                Target
              </div>
            </td>
            <td class="text-right mono text-medium-emphasis">-</td>
            <td class="text-right mono text-medium-emphasis">{{ targetPercent }}%</td>
            <td></td>
          </tr>

          <!-- Loss Impact -->
          <tr class="variance-row">
            <td>
              <div class="d-flex align-center" :class="lossImpactClass">
                <v-icon size="18" class="mr-2">mdi-alert-decagram</v-icon>
                Loss Impact
              </div>
              <div class="text-caption text-medium-emphasis">
                Actual - Theoretical = cost of losses
              </div>
            </td>
            <td class="text-right mono font-weight-bold" :class="lossImpactClass">
              {{ formatCurrency(lossAmount) }}
            </td>
            <td class="text-right mono font-weight-bold" :class="lossImpactClass">
              {{ lossImpactDisplay }}
            </td>
            <td class="text-center">
              <v-icon size="18" :color="lossImpactIcon.color">{{ lossImpactIcon.icon }}</v-icon>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatIDR } from '@/utils/currency'
import type { FoodCostKpiMetrics } from '@/stores/kitchenKpi/types'
import {
  FOOD_COST_TARGETS,
  VARIANCE_THRESHOLD,
  LOSS_VARIANCE_THRESHOLD
} from '@/stores/kitchenKpi/types'

// =============================================
// PROPS
// =============================================

interface Props {
  metrics: FoodCostKpiMetrics | null
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

// Loss Impact = Spoilage + Shortage - Surplus (cost of losses)
const lossAmount = computed(() => {
  if (!props.metrics) return 0
  return props.metrics.spoilage + props.metrics.shortage - props.metrics.surplus
})

const lossImpactPercent = computed(() => {
  if (!props.metrics || props.metrics.revenue === 0) return 0
  return (lossAmount.value / props.metrics.revenue) * 100
})

const lossImpactDisplay = computed(() => {
  const value = lossImpactPercent.value
  return `+${value.toFixed(1)}%`
})

// CSS classes
const totalCogsClass = computed(() => {
  if (!props.metrics) return ''
  const percent = props.metrics.totalCOGSPercent
  if (percent <= targetPercent.value) return 'text-success'
  if (percent <= targetPercent.value + VARIANCE_THRESHOLD.warning) return 'text-warning'
  return 'text-error'
})

const totalCogsColor = computed(() => {
  if (!props.metrics) return 'grey'
  const percent = props.metrics.totalCOGSPercent
  if (percent <= targetPercent.value) return 'success'
  if (percent <= targetPercent.value + VARIANCE_THRESHOLD.warning) return 'warning'
  return 'error'
})

const lossImpactClass = computed(() => {
  const percent = lossImpactPercent.value
  if (percent <= LOSS_VARIANCE_THRESHOLD.ok) return 'text-success'
  if (percent <= LOSS_VARIANCE_THRESHOLD.warning) return 'text-warning'
  if (percent <= LOSS_VARIANCE_THRESHOLD.high) return 'text-orange'
  return 'text-error'
})

// Loss Impact icon info for template
const lossImpactIcon = computed(() => {
  const percent = lossImpactPercent.value
  if (percent <= LOSS_VARIANCE_THRESHOLD.ok) {
    return { icon: 'mdi-check-circle', color: 'success' }
  }
  if (percent <= LOSS_VARIANCE_THRESHOLD.warning) {
    return { icon: 'mdi-alert', color: 'warning' }
  }
  if (percent <= LOSS_VARIANCE_THRESHOLD.high) {
    return { icon: 'mdi-alert-circle', color: 'orange' }
  }
  return { icon: 'mdi-alert-octagon', color: 'error' }
})

// =============================================
// METHODS
// =============================================

const formatCurrency = (value: number): string => {
  return formatIDR(value)
}
</script>

<style scoped lang="scss">
.food-cost-kpi-tab {
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.loading-placeholder,
.no-data-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  min-height: 300px;
  text-align: center;
}

.cogs-table {
  background: transparent;

  th {
    font-weight: 600;
    text-transform: uppercase;
    font-size: var(--text-xs);
    letter-spacing: 0.05em;
  }

  td {
    vertical-align: middle;
    padding: var(--spacing-sm) var(--spacing-md);
  }
}

.mono {
  font-family: monospace;
  font-feature-settings: 'tnum';
}

.total-row {
  background-color: rgba(var(--v-theme-primary), 0.05);

  td {
    border-top: 2px solid rgba(var(--v-theme-primary), 0.3);
  }
}

.target-row {
  td {
    border-top: 1px dashed rgba(var(--v-theme-on-surface), 0.2);
  }
}

.variance-row {
  td {
    border-bottom: none;
  }
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-warning {
  color: rgb(var(--v-theme-warning));
}

.text-orange {
  color: #ff9800;
}

.text-error {
  color: rgb(var(--v-theme-error));
}
</style>
