<!-- src/views/kitchen/kpi/components/KpiBonusWidget.vue -->
<!-- Always-visible widget showing current month KPI bonus status for the department -->
<template>
  <v-card class="kpi-bonus-widget" :loading="loading">
    <div class="widget-header">
      <div class="widget-title">
        <v-icon start size="20">mdi-trophy-award</v-icon>
        KPI Bonus — {{ monthLabel }}
      </div>
      <v-chip
        v-if="departmentLabel"
        size="small"
        :color="department === 'kitchen' ? 'orange' : 'purple'"
        variant="tonal"
      >
        {{ departmentLabel }}
      </v-chip>
    </div>

    <!-- No scheme -->
    <div v-if="!loading && !result" class="widget-empty">
      <span class="text-medium-emphasis">No KPI bonus scheme configured</span>
    </div>

    <!-- Content -->
    <div v-else-if="result" class="widget-body">
      <!-- Top row: Score + Pool -->
      <div class="top-row">
        <div class="score-circle" :class="scoreColor">
          <span class="score-value">{{ result.departmentScore.toFixed(0) }}</span>
          <span class="score-label">score</span>
        </div>
        <div class="pool-info">
          <div class="pool-line">
            Pool:
            <strong>{{ formatIDR(result.poolAmount) }}</strong>
            <template v-if="result.poolType === 'percent_revenue'">
              <span class="text-medium-emphasis">
                ({{ formatIDR(result.departmentRevenue) }} rev)
              </span>
            </template>
          </div>
          <div class="unlocked-line">
            Unlocked:
            <strong :class="result.unlockedAmount > 0 ? 'text-success' : 'text-error'">
              {{ formatIDR(result.unlockedAmount) }}
            </strong>
          </div>
          <div v-if="result.cancellationPenalty.penaltyAmount > 0" class="penalty-line">
            Cancellations:
            <strong class="text-error">
              -{{ formatIDR(result.cancellationPenalty.penaltyAmount) }}
            </strong>
            <span class="text-medium-emphasis">({{ result.cancellationPenalty.count }} items)</span>
          </div>
          <div v-if="result.cancellationPenalty.penaltyAmount > 0" class="final-line">
            Final:
            <strong :class="result.finalAmount > 0 ? 'text-success' : 'text-error'">
              {{ formatIDR(result.finalAmount) }}
            </strong>
          </div>
        </div>
      </div>

      <!-- Metrics with visual bars + thresholds -->
      <div class="metrics-list">
        <div
          v-for="m in metrics"
          :key="m.key"
          class="metric-row"
          :class="{ 'metric-failed': m.failed }"
        >
          <div class="metric-header">
            <span class="metric-name">{{ m.label }}</span>
            <span class="metric-weight">{{ m.weight }}%</span>
          </div>
          <div v-if="m.noData" class="metric-nodata">No data — excluded</div>
          <template v-else>
            <div class="metric-bar-track">
              <div
                class="metric-bar-fill"
                :class="m.barClass"
                :style="{ width: Math.min(100, m.score) + '%' }"
              />
              <span
                v-if="m.threshold > 0"
                class="metric-threshold-mark"
                :style="{ left: m.threshold + '%' }"
              />
            </div>
            <div class="metric-detail-line">
              <span class="metric-detail">{{ m.detail }}</span>
              <span v-if="m.failed" class="metric-score metric-score-failed">
                {{ m.score.toFixed(0) }} &lt; min {{ m.threshold }} → 0
              </span>
              <span v-else class="metric-score">{{ m.score.toFixed(0) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { calculateDepartmentKpiBonus } from '@/stores/staff/kpiBonusService'
import type { DepartmentKpiResult, KpiDepartment } from '@/stores/staff'
import { formatIDR } from '@/utils'

const props = defineProps<{
  department: 'all' | 'kitchen' | 'bar'
}>()

const loading = ref(false)
const result = ref<DepartmentKpiResult | null>(null)

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1

const kpiDepartment = computed((): KpiDepartment | null => {
  if (props.department === 'all') return null
  return props.department
})

const departmentLabel = computed(() => {
  if (props.department === 'kitchen') return 'Kitchen'
  if (props.department === 'bar') return 'Bar'
  return ''
})

const monthLabel = computed(() => {
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const scoreColor = computed(() => {
  if (!result.value) return ''
  const s = result.value.departmentScore
  if (s >= 80) return 'score-green'
  if (s >= 50) return 'score-yellow'
  return 'score-red'
})

interface MetricDisplay {
  key: string
  label: string
  score: number
  weight: number
  threshold: number
  detail: string
  noData: boolean
  failed: boolean
  barClass: string
}

const metrics = computed((): MetricDisplay[] => {
  if (!result.value) return []
  const r = result.value
  const t = r.thresholds || { foodCost: 0, time: 0, production: 0, ritual: 0, avgCheck: 0 }
  const s = r.scores
  const w = r.weights

  function build(
    key: string,
    label: string,
    score: number,
    weight: number,
    threshold: number,
    detail: string
  ): MetricDisplay {
    const noData = score < 0
    const failed = !noData && threshold > 0 && score < threshold
    let barClass = 'bar-grey'
    if (!noData) {
      if (failed || score < 50) barClass = 'bar-red'
      else if (score < 80) barClass = 'bar-yellow'
      else barClass = 'bar-green'
    }
    return { key, label, score, weight, threshold, detail, noData, failed, barClass }
  }

  const all = [
    build(
      'foodCost',
      'Food Cost',
      s.foodCost.score,
      w.foodCost,
      t.foodCost,
      s.foodCost.score >= 0
        ? 'COGS ' +
            s.foodCost.actualPercent.toFixed(1) +
            '% (target ' +
            s.foodCost.targetPercent +
            '%)'
        : ''
    ),
    build(
      'lossRate',
      'Real Food Cost',
      s.lossRate.score,
      w.production,
      t.production,
      s.lossRate.score >= 0
        ? 'Losses ' +
            s.lossRate.lossPercent.toFixed(1) +
            '% (target ' +
            s.lossRate.targetPercent +
            '%)'
        : ''
    ),
    build(
      'time',
      'Time',
      s.time.score,
      w.time,
      t.time,
      s.time.score >= 0
        ? s.time.itemsCompleted + ' items, ' + s.time.exceededRate.toFixed(0) + '% exceeded'
        : ''
    ),
    build(
      'ritual',
      'Rituals',
      s.ritual.score,
      w.ritual,
      t.ritual,
      s.ritual.score >= 0 ? s.ritual.completedDays + ' / ' + s.ritual.totalDays + ' days' : ''
    ),
    build(
      'avgCheck',
      'Avg Check',
      s.avgCheck.score,
      w.avgCheck,
      t.avgCheck,
      s.avgCheck.score >= 0
        ? formatIDR(s.avgCheck.actualAvg) +
            '/guest (target ' +
            formatIDR(s.avgCheck.targetAvg) +
            ')'
        : ''
    )
  ]
  return all.filter(m => m.weight > 0)
})

async function loadKpiBonus() {
  const dept = kpiDepartment.value
  if (!dept) return

  loading.value = true
  try {
    result.value = await calculateDepartmentKpiBonus(dept, year, month, [])
  } catch {
    result.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.department,
  () => {
    result.value = null
    loadKpiBonus()
  }
)

onMounted(() => loadKpiBonus())
</script>

<style scoped lang="scss">
.kpi-bonus-widget {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 18px;
  overflow: visible !important;
  flex-shrink: 0;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.widget-title {
  font-weight: 600;
  font-size: 15px;
  display: flex;
  align-items: center;
}

.widget-empty {
  text-align: center;
  padding: 12px 0;
  font-size: 13px;
}

.widget-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

// Top row: score circle + pool info
.top-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.score-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;

  &.score-green {
    border-color: rgba(76, 175, 80, 0.8);
  }
  &.score-yellow {
    border-color: rgba(255, 193, 7, 0.8);
  }
  &.score-red {
    border-color: rgba(244, 67, 54, 0.8);
  }
}

.score-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.score-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.pool-info {
  font-size: 12px;
  line-height: 1.6;
}

.pool-line,
.unlocked-line,
.penalty-line,
.final-line {
  white-space: nowrap;
}

.penalty-line {
  color: rgba(244, 67, 54, 0.9);
}

.final-line {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 2px;
  margin-top: 2px;
}

// Metrics list
.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-row {
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid rgba(76, 175, 80, 0.5);

  &.metric-failed {
    border-left-color: rgba(244, 67, 54, 0.6);
    opacity: 0.6;
  }
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.metric-name {
  font-size: 13px;
  font-weight: 600;
}

.metric-weight {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.metric-bar-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  position: relative;
  overflow: visible;
  margin-bottom: 4px;
}

.metric-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;

  &.bar-green {
    background: rgba(76, 175, 80, 0.8);
  }
  &.bar-yellow {
    background: rgba(255, 193, 7, 0.8);
  }
  &.bar-red {
    background: rgba(244, 67, 54, 0.7);
  }
  &.bar-grey {
    background: rgba(255, 255, 255, 0.15);
  }
}

.metric-threshold-mark {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 12px;
  background: rgba(255, 255, 255, 0.4);
  transform: translateX(-1px);
}

.metric-detail-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-detail {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.metric-nodata {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  padding: 2px 0;
}

.metric-score {
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.metric-score-failed {
  color: rgba(244, 67, 54, 0.8);
  font-weight: 500;
  font-size: 11px;
}
</style>
