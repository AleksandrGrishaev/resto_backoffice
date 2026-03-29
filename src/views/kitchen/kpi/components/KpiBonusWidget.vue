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
      <!-- Score gauge -->
      <div class="score-section">
        <div class="score-circle" :class="scoreColor">
          <span class="score-value">{{ result.departmentScore.toFixed(0) }}</span>
          <span class="score-label">score</span>
        </div>
        <div class="score-details">
          <div class="pool-line">
            Pool:
            <strong>{{ formatIDR(result.poolAmount) }}</strong>
            <template v-if="result.poolType === 'percent_revenue'">
              <span class="text-medium-emphasis">
                (from {{ formatIDR(result.departmentRevenue) }} rev)
              </span>
            </template>
          </div>
          <div class="unlocked-line">
            Unlocked:
            <strong :class="result.unlockedAmount > 0 ? 'text-success' : ''">
              {{ formatIDR(result.unlockedAmount) }}
            </strong>
          </div>
        </div>
      </div>

      <!-- Metrics bars -->
      <div class="metrics-bars">
        <div class="metric-bar-row">
          <span class="bar-label">Food Cost</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :class="barColor(result.scores.foodCost.score)"
              :style="{ width: barWidth(result.scores.foodCost.score) }"
            />
          </div>
          <span class="bar-score">{{ scoreText(result.scores.foodCost.score) }}</span>
        </div>
        <div class="metric-bar-row">
          <span class="bar-label">Real Food Cost</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :class="barColor(result.scores.lossRate.score)"
              :style="{ width: barWidth(result.scores.lossRate.score) }"
            />
          </div>
          <span class="bar-score">{{ scoreText(result.scores.lossRate.score) }}</span>
        </div>
        <div class="metric-bar-row">
          <span class="bar-label">Time</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :class="barColor(result.scores.time.score)"
              :style="{ width: barWidth(result.scores.time.score) }"
            />
          </div>
          <span class="bar-score">{{ scoreText(result.scores.time.score) }}</span>
        </div>
        <div class="metric-bar-row">
          <span class="bar-label">Rituals</span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :class="barColor(result.scores.ritual.score)"
              :style="{ width: barWidth(result.scores.ritual.score) }"
            />
          </div>
          <span class="bar-score">{{ scoreText(result.scores.ritual.score) }}</span>
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

function barWidth(score: number): string {
  if (score < 0) return '0%'
  return `${Math.min(100, score)}%`
}

function barColor(score: number): string {
  if (score < 0) return 'bar-grey'
  if (score >= 80) return 'bar-green'
  if (score >= 50) return 'bar-yellow'
  return 'bar-red'
}

function scoreText(score: number): string {
  if (score < 0) return '—'
  return score.toFixed(0)
}

async function loadKpiBonus() {
  const dept = kpiDepartment.value
  if (!dept) return

  loading.value = true
  try {
    // Pass empty staffRows — we only need scores, not distribution
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
  padding: 12px 16px;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.widget-title {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.widget-empty {
  text-align: center;
  padding: 8px 0;
  font-size: 13px;
}

.widget-body {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

// Score circle
.score-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 80px;
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

.score-details {
  font-size: 11px;
  text-align: center;
  line-height: 1.5;
}

.pool-line,
.unlocked-line {
  white-space: nowrap;
}

// Metric bars
.metrics-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-label {
  font-size: 12px;
  width: 100px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;

  &.bar-green {
    background: rgba(76, 175, 80, 0.8);
  }
  &.bar-yellow {
    background: rgba(255, 193, 7, 0.8);
  }
  &.bar-red {
    background: rgba(244, 67, 54, 0.8);
  }
  &.bar-grey {
    background: rgba(255, 255, 255, 0.15);
  }
}

.bar-score {
  font-size: 12px;
  font-weight: 600;
  width: 28px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 480px) {
  .widget-body {
    flex-direction: column;
    align-items: stretch;
  }
  .score-section {
    flex-direction: row;
    gap: 12px;
  }
  .bar-label {
    width: 80px;
  }
}
</style>
