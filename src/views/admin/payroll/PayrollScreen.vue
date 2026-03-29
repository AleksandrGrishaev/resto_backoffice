<!-- src/views/admin/payroll/PayrollScreen.vue -->
<template>
  <div class="payroll-screen">
    <!-- Header -->
    <div class="payroll-header">
      <h2>Payroll</h2>
      <div class="d-flex align-center gap-sm">
        <v-select
          v-model="selectedYear"
          :items="years"
          label="Year"
          density="compact"
          hide-details
          style="max-width: 100px"
        />
        <v-select
          v-model="selectedMonth"
          :items="months"
          item-title="label"
          item-value="value"
          label="Month"
          density="compact"
          hide-details
          style="max-width: 130px"
        />
        <v-progress-circular v-if="store.loading" indeterminate size="20" width="2" class="ml-2" />
      </div>
    </div>

    <!-- Period info -->
    <div v-if="payrollMonth" class="period-info">
      Salary: {{ payrollMonth.salaryStart }} — {{ payrollMonth.salaryEnd }} | Service 1:
      {{ payrollMonth.service1Start }} — {{ payrollMonth.service1End }} | Service 2:
      {{ payrollMonth.service2Start }} — {{ payrollMonth.service2End }} | Payment:
      {{ payrollMonth.paymentDate }}
    </div>

    <!-- Content area (scrollable) -->
    <div v-if="result" class="payroll-content">
      <!-- ==================== SPREADSHEET TABLE ==================== -->
      <div class="table-legend">
        <span class="legend-item">
          <span class="legend-edited-mark" />
          Corrected by admin (hover for reason)
        </span>
        <span class="legend-item legend-muted">Click day number to edit hours</span>
      </div>
      <div class="payroll-table-wrapper">
        <table class="payroll-table">
          <thead>
            <tr class="header-labels">
              <th class="sticky-col name-col">Name</th>
              <th
                v-for="date in result.month.allDates"
                :key="date"
                class="day-col day-header"
                :class="{ 'period-boundary': date === result.month.service1End }"
                @click="openDayDialog(date)"
              >
                {{ dayLabel(date) }}
              </th>
              <th class="subtotal-col">P1</th>
              <th class="subtotal-col">P2</th>
              <th class="subtotal-col">hrs</th>
              <th class="summary-col service-col">Service 1</th>
              <th class="summary-col salary-col">Salary</th>
              <th class="summary-col service-col">Service 2</th>
              <th class="summary-col bonus-col">Bonus</th>
              <th class="summary-col kpi-col">KPI</th>
              <th class="summary-col grand-col">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in result.rows" :key="row.staffId" class="data-row">
              <td class="sticky-col name-col">
                {{ row.staffName }}
                <span v-if="row.isTrainee" class="trainee-badge">T</span>
              </td>
              <td
                v-for="date in result.month.allDates"
                :key="date"
                class="day-col"
                :class="{
                  'period-boundary': date === result.month.service1End,
                  'zero-hours': row.dailyHours[date] === 0,
                  'edited-cell': row.editedDates.has(date)
                }"
                @click="openDayDialog(date)"
              >
                {{ row.dailyHours[date] || 0 }}
                <v-tooltip
                  v-if="
                    row.editedDates.has(date) ||
                    (row.dailyTimeSlots[date] && row.dailyTimeSlots[date]!.length > 0)
                  "
                  activator="parent"
                  location="top"
                >
                  <div v-if="row.dailyTimeSlots[date]?.length">
                    <div v-for="(slot, si) in row.dailyTimeSlots[date]!" :key="si">
                      {{ formatHour(slot.start) }} — {{ formatHour(slot.end) }}
                    </div>
                  </div>
                  <div
                    v-if="row.editedDates.has(date)"
                    class="mt-1"
                    style="font-style: italic; opacity: 0.7"
                  >
                    {{ row.editedDates.get(date) }}
                  </div>
                </v-tooltip>
              </td>
              <td class="subtotal-col">{{ row.totalHoursP1 }}</td>
              <td class="subtotal-col">{{ row.totalHoursP2 }}</td>
              <td class="subtotal-col total-hours">{{ row.totalHours }}</td>
              <td class="summary-col service-col">{{ fmtNum(row.service1) }}</td>
              <td class="summary-col salary-col">{{ fmtNum(row.salary) }}</td>
              <td class="summary-col service-col">{{ fmtNum(row.service2) }}</td>
              <td class="summary-col bonus-col">{{ fmtNum(row.bonusesTotal) }}</td>
              <td class="summary-col kpi-col">{{ fmtNum(row.kpiBonus) }}</td>
              <td class="summary-col grand-col">{{ fmtNum(row.grandTotal) }}</td>
            </tr>
            <!-- Totals row -->
            <tr class="totals-row">
              <td class="sticky-col name-col">TOTAL</td>
              <td
                v-for="date in result.month.allDates"
                :key="date"
                class="day-col"
                :class="{ 'period-boundary': date === result.month.service1End }"
              />
              <td class="subtotal-col">{{ result.totals.totalHoursP1 }}</td>
              <td class="subtotal-col">{{ result.totals.totalHoursP2 }}</td>
              <td class="subtotal-col total-hours">{{ result.totals.totalHours }}</td>
              <td class="summary-col service-col">{{ fmtNum(result.totals.service1) }}</td>
              <td class="summary-col salary-col">{{ fmtNum(result.totals.salary) }}</td>
              <td class="summary-col service-col">{{ fmtNum(result.totals.service2) }}</td>
              <td class="summary-col bonus-col">{{ fmtNum(result.totals.bonuses) }}</td>
              <td class="summary-col kpi-col">{{ fmtNum(result.totals.kpiBonuses) }}</td>
              <td class="summary-col grand-col">{{ fmtNum(result.totals.grandTotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Day edit dialog -->
      <DayEditDialog
        v-model="showDayDialog"
        :date="editingDate"
        :staff-rows="result.rows"
        :shift-presets="store.activeShiftPresets"
        @saved="calculate"
      />

      <!-- ==================== SUMMARY SECTION ==================== -->
      <div class="summary-section">
        <h3>Summary</h3>

        <!-- Row 1: Main payroll numbers -->
        <div class="summary-cards mb-3">
          <div class="summary-card grand-card">
            <div class="card-label">Grand Total</div>
            <div class="card-value">{{ formatIDR(result.totals.grandTotal) }}</div>
          </div>
          <div class="summary-card salary-card">
            <div class="card-label">Salaries</div>
            <div class="card-value">{{ formatIDR(result.totals.salary) }}</div>
          </div>
          <div class="summary-card service-card">
            <div class="card-label">Service Tax (5%)</div>
            <div class="card-value">
              {{ formatIDR(result.totalServiceTaxP1 + result.totalServiceTaxP2) }}
            </div>
            <div class="card-detail">
              P1: {{ formatIDR(result.totalServiceTaxP1) }} | P2:
              {{ formatIDR(result.totalServiceTaxP2) }}
            </div>
          </div>
          <div v-if="result.totals.bonuses > 0" class="summary-card bonus-card">
            <div class="card-label">Bonuses</div>
            <div class="card-value">{{ formatIDR(result.totals.bonuses) }}</div>
          </div>
        </div>

        <!-- Row 2: Hours + KPI per department -->
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-label">Hours Worked</div>
            <div class="card-value">{{ result.totals.totalHours }}h</div>
            <div class="card-detail">
              P1: {{ result.totals.totalHoursP1 }}h | P2: {{ result.totals.totalHoursP2 }}h
            </div>
          </div>
          <template v-for="kpi in kpiResults" :key="kpi.department">
            <div class="summary-card kpi-card">
              <div class="card-label">
                {{ kpi.department === 'kitchen' ? 'Kitchen' : 'Bar' }} KPI
              </div>
              <div class="card-value d-flex align-center gap-2">
                {{ formatIDR(kpi.unlockedAmount) }}
                <span
                  class="kpi-score-badge"
                  :class="{
                    'badge-green': kpi.departmentScore >= 80,
                    'badge-yellow': kpi.departmentScore >= 50 && kpi.departmentScore < 80,
                    'badge-red': kpi.departmentScore < 50
                  }"
                >
                  {{ kpi.departmentScore.toFixed(0) }}
                </span>
              </div>
              <div class="card-detail">
                Pool: {{ formatIDR(kpi.poolAmount) }}
                <template v-if="kpi.poolType === 'percent_revenue'">
                  ({{ formatIDR(kpi.departmentRevenue) }} rev)
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- ==================== GENERAL CALCULATION ==================== -->
      <div class="general-calc-section">
        <h3>Calculation Basis</h3>

        <!-- Rank hourly rates -->
        <div class="calc-block">
          <div class="calc-block-title">Hourly Rates by Rank</div>
          <table class="breakdown-table">
            <thead>
              <tr>
                <td class="detail-label" style="font-weight: 600">Rank</td>
                <td class="detail-formula" style="font-weight: 600">
                  Monthly salary / {{ BASE_MONTHLY_HOURS }}h (6 days x 8h x 26 days)
                </td>
                <td class="detail-value" style="font-weight: 600">Rate per hour</td>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rank in uniqueRanks" :key="rank.name">
                <td class="detail-label">{{ rank.name }}</td>
                <td class="detail-formula">
                  {{ formatIDR(rank.baseSalaryMonthly) }} / {{ BASE_MONTHLY_HOURS }}h
                </td>
                <td class="detail-value">= {{ formatIDR(rank.hourlyRate) }}/hr</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Service tax distribution -->
        <div class="calc-block">
          <div class="calc-block-title">Service Tax Distribution</div>
          <table class="breakdown-table">
            <tbody>
              <tr>
                <td class="detail-label">Service P1</td>
                <td class="detail-formula">
                  Total collected
                  {{ shortPeriodLabel(result.month.service1Start, result.month.service1End) }}
                </td>
                <td class="detail-value">{{ formatIDR(result.totalServiceTaxP1) }}</td>
              </tr>
              <tr>
                <td class="detail-label">Team hours P1</td>
                <td class="detail-formula">All staff combined</td>
                <td class="detail-value">{{ result.totals.totalHoursP1 }}h</td>
              </tr>
              <tr class="detail-highlight">
                <td class="detail-label">Service/hour P1</td>
                <td class="detail-formula">
                  {{ formatIDR(result.totalServiceTaxP1) }} / {{ result.totals.totalHoursP1 }}h
                </td>
                <td class="detail-value">= {{ formatIDR(servicePerHourP1) }}/hr</td>
              </tr>
              <tr><td colspan="3" style="height: 8px; border: none" /></tr>
              <tr>
                <td class="detail-label">Service P2</td>
                <td class="detail-formula">
                  Total collected
                  {{ shortPeriodLabel(result.month.service2Start, result.month.service2End) }}
                </td>
                <td class="detail-value">{{ formatIDR(result.totalServiceTaxP2) }}</td>
              </tr>
              <tr>
                <td class="detail-label">Team hours P2</td>
                <td class="detail-formula">All staff combined</td>
                <td class="detail-value">{{ result.totals.totalHoursP2 }}h</td>
              </tr>
              <tr class="detail-highlight">
                <td class="detail-label">Service/hour P2</td>
                <td class="detail-formula">
                  {{ formatIDR(result.totalServiceTaxP2) }} / {{ result.totals.totalHoursP2 }}h
                </td>
                <td class="detail-value">= {{ formatIDR(servicePerHourP2) }}/hr</td>
              </tr>
              <tr><td colspan="3" style="height: 8px; border: none" /></tr>
              <tr class="detail-total">
                <td class="detail-label">Total service</td>
                <td class="detail-formula">P1 + P2</td>
                <td class="detail-value">
                  = {{ formatIDR(result.totalServiceTaxP1 + result.totalServiceTaxP2) }}
                </td>
              </tr>
              <tr class="detail-total">
                <td class="detail-label">Total team hours</td>
                <td class="detail-formula">P1 + P2</td>
                <td class="detail-value">= {{ result.totals.totalHours }}h</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ==================== KPI BONUS CALCULATION ==================== -->
      <div v-if="kpiResults.length" class="general-calc-section">
        <h3>KPI Bonus Calculation</h3>

        <div v-for="kpi in kpiResults" :key="kpi.department" class="calc-block">
          <div class="calc-block-title">
            {{ kpi.department === 'kitchen' ? 'Kitchen' : 'Bar' }} Department — Score:
            {{ kpi.departmentScore.toFixed(1) }} / 100
          </div>
          <!-- Metrics with visual bars -->
          <div class="kpi-metrics-list">
            <div
              v-for="m in getKpiMetrics(kpi)"
              :key="m.key"
              class="kpi-metric-row"
              :class="{
                'kpi-metric-failed': kpiMetricDisplay(m.score, m.weight, m.threshold).failed
              }"
            >
              <div class="kpi-metric-header">
                <span class="kpi-metric-name">{{ m.label }}</span>
                <span class="kpi-metric-weight">{{ m.weight }}%</span>
              </div>
              <div class="kpi-metric-body">
                <div
                  v-if="kpiMetricDisplay(m.score, m.weight, m.threshold).noData"
                  class="kpi-metric-nodata"
                >
                  No data — excluded
                </div>
                <template v-else>
                  <div class="kpi-bar-track">
                    <div
                      class="kpi-bar-fill"
                      :class="{
                        'bar-green':
                          !kpiMetricDisplay(m.score, m.weight, m.threshold).failed && m.score >= 80,
                        'bar-yellow':
                          !kpiMetricDisplay(m.score, m.weight, m.threshold).failed &&
                          m.score >= 50 &&
                          m.score < 80,
                        'bar-red':
                          kpiMetricDisplay(m.score, m.weight, m.threshold).failed || m.score < 50
                      }"
                      :style="{ width: Math.min(100, m.score) + '%' }"
                    />
                    <span
                      v-if="m.threshold > 0"
                      class="kpi-threshold-mark"
                      :style="{ left: m.threshold + '%' }"
                    />
                  </div>
                  <div class="kpi-metric-score-line">
                    <span class="kpi-metric-detail">{{ m.detail }}</span>
                    <span
                      v-if="kpiMetricDisplay(m.score, m.weight, m.threshold).failed"
                      class="kpi-metric-score kpi-score-failed"
                    >
                      {{ m.score.toFixed(0) }} &lt; min {{ m.threshold }} → 0
                    </span>
                    <span v-else class="kpi-metric-score">
                      {{ m.score.toFixed(0) }}
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="kpi-summary-block">
            <div class="kpi-summary-row kpi-summary-score">
              <span>Department Score</span>
              <span
                class="kpi-summary-value"
                :class="{
                  'text-success': kpi.departmentScore >= 80,
                  'text-warning': kpi.departmentScore >= 50 && kpi.departmentScore < 80,
                  'text-error': kpi.departmentScore < 50
                }"
              >
                {{ kpi.departmentScore.toFixed(1) }} / 100
              </span>
            </div>
            <div class="kpi-summary-row">
              <span>
                Pool
                <span class="text-medium-emphasis">
                  <template v-if="kpi.poolType === 'percent_revenue'">
                    ({{ formatIDR(kpi.departmentRevenue) }} rev × %)
                  </template>
                  <template v-else>(fixed)</template>
                </span>
              </span>
              <span>{{ formatIDR(kpi.poolAmount) }}</span>
            </div>
            <div class="kpi-summary-row kpi-summary-unlocked">
              <span>
                Unlocked
                <span class="text-medium-emphasis">
                  (pool × {{ kpi.departmentScore.toFixed(0) }}%)
                </span>
              </span>
              <span class="kpi-summary-value">{{ formatIDR(kpi.unlockedAmount) }}</span>
            </div>
          </div>

          <!-- Distribution -->
          <div v-if="kpi.staffDistribution.length" class="mt-3">
            <div class="calc-block-title" style="font-size: 12px">Distribution by hours × rank</div>
            <table class="breakdown-table">
              <thead>
                <tr>
                  <td class="detail-label" style="font-weight: 600">Staff</td>
                  <td class="detail-formula" style="font-weight: 600">Hours × multiplier</td>
                  <td class="detail-value" style="font-weight: 600">KPI Bonus</td>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in kpi.staffDistribution" :key="item.staffId">
                  <td class="detail-label">{{ item.staffName }}</td>
                  <td class="detail-formula">
                    {{ item.hoursWorked }}h × {{ (item.hoursWeight * 100).toFixed(1) }}%
                  </td>
                  <td class="detail-value">{{ formatIDR(item.kpiBonus) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================== PER-PERSON BREAKDOWN ==================== -->
      <div class="breakdown-section">
        <h3>Per-Person Breakdown</h3>
        <div v-for="row in result.rows" :key="row.staffId" class="person-card">
          <div class="person-header">
            <div class="person-name">
              {{ row.staffName }}
              <span v-if="row.isTrainee" class="trainee-badge">Trainee</span>
            </div>
            <div class="person-rank">{{ row.rankName }} — {{ row.department }}</div>
            <div class="person-total">{{ formatIDR(row.grandTotal) }}</div>
          </div>
          <div class="person-details">
            <table class="breakdown-table">
              <tbody>
                <tr>
                  <td class="detail-label">Base monthly rate</td>
                  <td class="detail-formula">
                    {{ row.rankName }}: {{ formatIDR(row.baseSalaryMonthly) }} /
                    {{ BASE_MONTHLY_HOURS }}h
                  </td>
                  <td class="detail-value">= {{ formatIDR(row.hourlyRate) }}/hr</td>
                </tr>
                <tr>
                  <td class="detail-label">Hours worked</td>
                  <td class="detail-formula">
                    P1: {{ row.totalHoursP1 }}h + P2: {{ row.totalHoursP2 }}h
                  </td>
                  <td class="detail-value">= {{ row.totalHours }}h</td>
                </tr>
                <tr class="detail-highlight">
                  <td class="detail-label">Salary</td>
                  <td class="detail-formula">
                    {{ formatIDR(row.hourlyRate) }} x {{ row.totalHours }}h
                  </td>
                  <td class="detail-value">= {{ formatIDR(row.salary) }}</td>
                </tr>
                <tr>
                  <td class="detail-label">Service 1</td>
                  <td class="detail-formula">
                    {{ formatIDR(result.totalServiceTaxP1) }} x {{ row.totalHoursP1 }}h /
                    {{ result.totals.totalHoursP1 }}h
                  </td>
                  <td class="detail-value">= {{ formatIDR(row.service1) }}</td>
                </tr>
                <tr>
                  <td class="detail-label">Service 2</td>
                  <td class="detail-formula">
                    {{ formatIDR(result.totalServiceTaxP2) }} x {{ row.totalHoursP2 }}h /
                    {{ result.totals.totalHoursP2 }}h
                  </td>
                  <td class="detail-value">= {{ formatIDR(row.service2) }}</td>
                </tr>
                <tr v-for="(bonus, bi) in row.bonusDetails" :key="bi">
                  <td class="detail-label">Bonus</td>
                  <td class="detail-formula">
                    {{ bonus.reason }} ({{ bonus.type === 'monthly' ? 'monthly' : 'one-time' }})
                  </td>
                  <td class="detail-value">+ {{ formatIDR(bonus.amount) }}</td>
                </tr>
                <tr v-if="row.bonusDetails.length === 0 && row.bonusesTotal === 0">
                  <td class="detail-label">Bonuses</td>
                  <td class="detail-formula">—</td>
                  <td class="detail-value">0</td>
                </tr>
                <tr v-if="row.kpiBonus > 0" class="detail-kpi">
                  <td class="detail-label">KPI Bonus</td>
                  <td class="detail-formula">
                    <template v-if="row.kpiDetails">
                      {{ row.kpiDetails.department === 'kitchen' ? 'Kitchen' : 'Bar' }}: score
                      {{ row.kpiDetails.departmentScore.toFixed(0) }}
                      <template v-if="row.kpiDetails.poolType === 'percent_revenue'">
                        ({{ formatIDR(row.kpiDetails.departmentRevenue) }} rev)
                      </template>
                      — pool {{ formatIDR(row.kpiDetails.unlockedAmount) }} x {{ row.totalHours }}h
                      / dept hours
                    </template>
                  </td>
                  <td class="detail-value">+ {{ formatIDR(row.kpiBonus) }}</td>
                </tr>
                <tr class="detail-total">
                  <td class="detail-label">TOTAL</td>
                  <td class="detail-formula">
                    {{ formatIDR(row.salary) }} + {{ formatIDR(row.service1) }} +
                    {{ formatIDR(row.service2) }}
                    <span v-if="row.bonusesTotal > 0">+ {{ formatIDR(row.bonusesTotal) }}</span>
                    <span v-if="row.kpiBonus > 0">+ {{ formatIDR(row.kpiBonus) }}</span>
                  </td>
                  <td class="detail-value">= {{ formatIDR(row.grandTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">Select month and click "Calculate" to generate payroll</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useStaffStore, BASE_MONTHLY_HOURS, formatHour } from '@/stores/staff'
import type { PayrollResult, DepartmentKpiResult } from '@/stores/staff'
import { formatIDR } from '@/utils'
import DayEditDialog from './components/DayEditDialog.vue'

const store = useStaffStore()

const now = new Date()
const selectedYear = ref(now.getFullYear())
const selectedMonth = ref(now.getMonth() + 1)
const result = ref<PayrollResult | null>(null)
const kpiResults = computed<DepartmentKpiResult[]>(() => store.lastKpiResults)

function getKpiMetrics(kpi: DepartmentKpiResult) {
  const t = kpi.thresholds || { foodCost: 0, time: 0, production: 0, ritual: 0, avgCheck: 0 }
  const s = kpi.scores
  const w = kpi.weights
  const all = [
    {
      key: 'foodCost',
      label: 'Food Cost',
      score: s.foodCost.score,
      weight: w.foodCost,
      threshold: t.foodCost,
      detail:
        s.foodCost.score >= 0
          ? 'COGS ' +
            s.foodCost.actualPercent.toFixed(1) +
            '% (target ' +
            s.foodCost.targetPercent +
            '%)'
          : ''
    },
    {
      key: 'lossRate',
      label: 'Real Food Cost',
      score: s.lossRate.score,
      weight: w.production,
      threshold: t.production,
      detail:
        s.lossRate.score >= 0
          ? 'Losses ' +
            s.lossRate.lossPercent.toFixed(1) +
            '% (target ' +
            s.lossRate.targetPercent +
            '%)'
          : ''
    },
    {
      key: 'time',
      label: 'Time KPI',
      score: s.time.score,
      weight: w.time,
      threshold: t.time,
      detail:
        s.time.score >= 0
          ? s.time.itemsCompleted + ' items, ' + s.time.exceededRate.toFixed(0) + '% exceeded'
          : ''
    },
    {
      key: 'ritual',
      label: 'Rituals',
      score: s.ritual.score,
      weight: w.ritual,
      threshold: t.ritual,
      detail:
        s.ritual.score >= 0 ? s.ritual.completedDays + ' / ' + s.ritual.totalDays + ' days' : ''
    },
    {
      key: 'avgCheck',
      label: 'Avg Check',
      score: s.avgCheck.score,
      weight: w.avgCheck,
      threshold: t.avgCheck,
      detail:
        s.avgCheck.score >= 0
          ? formatIDR(s.avgCheck.actualAvg) +
            '/guest (target ' +
            formatIDR(s.avgCheck.targetAvg) +
            ') — ' +
            s.avgCheck.totalGuests +
            ' guests'
          : ''
    }
  ]
  return all.filter(m => m.weight > 0)
}

/** Returns effective score after threshold and display info */
function kpiMetricDisplay(
  score: number,
  weight: number,
  threshold: number
): { effective: number; raw: number; failed: boolean; noData: boolean } {
  if (score < 0) return { effective: -1, raw: -1, failed: false, noData: true }
  const failed = threshold > 0 && score < threshold
  return { effective: failed ? 0 : score, raw: score, failed, noData: false }
}

// Auto-calculate on month/year change
watch([selectedYear, selectedMonth], () => calculate(), { flush: 'post' })
onMounted(() => calculate())

// Day edit dialog state
const showDayDialog = ref(false)
const editingDate = ref('')

const years = computed(() => {
  const y = now.getFullYear()
  return [y - 1, y, y + 1]
})

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
]

const payrollMonth = computed(() => {
  return store.getPayrollMonth(selectedYear.value, selectedMonth.value)
})

function dayLabel(date: string): string {
  return String(parseInt(date.split('-')[2], 10))
}

function shortPeriodLabel(start: string, end: string): string {
  const sd = start.split('-')
  const ed = end.split('-')
  const sMonth = months[parseInt(sd[1], 10) - 1]?.label?.slice(0, 3) || sd[1]
  const eMonth = months[parseInt(ed[1], 10) - 1]?.label?.slice(0, 3) || ed[1]
  const sDay = parseInt(sd[2], 10)
  const eDay = parseInt(ed[2], 10)
  if (sMonth === eMonth) return `(${sMonth} ${sDay}–${eDay})`
  return `(${sMonth} ${sDay} – ${eMonth} ${eDay})`
}

const uniqueRanks = computed(() => {
  if (!result.value) return []
  const seen = new Map<string, { name: string; baseSalaryMonthly: number; hourlyRate: number }>()
  for (const row of result.value.rows) {
    if (!seen.has(row.rankName)) {
      seen.set(row.rankName, {
        name: row.rankName,
        baseSalaryMonthly: row.baseSalaryMonthly,
        hourlyRate: row.hourlyRate
      })
    }
  }
  return Array.from(seen.values())
})

const servicePerHourP1 = computed(() => {
  if (!result.value || result.value.totals.totalHoursP1 === 0) return 0
  return Math.round(result.value.totalServiceTaxP1 / result.value.totals.totalHoursP1)
})

const servicePerHourP2 = computed(() => {
  if (!result.value || result.value.totals.totalHoursP2 === 0) return 0
  return Math.round(result.value.totalServiceTaxP2 / result.value.totals.totalHoursP2)
})

function fmtNum(n: number): string {
  if (n === 0) return ''
  return new Intl.NumberFormat('id-ID').format(n)
}

// =====================================================
// DAY EDIT DIALOG
// =====================================================

function openDayDialog(date: string) {
  editingDate.value = date
  showDayDialog.value = true
}

// =====================================================
// ACTIONS
// =====================================================

async function calculate() {
  try {
    result.value = await store.runPayrollCalculation(selectedYear.value, selectedMonth.value)
  } catch (e: any) {
    console.error('Payroll calculation failed:', e)
  }
}
</script>

<style scoped lang="scss">
.payroll-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.payroll-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  flex-shrink: 0;
}

.period-info {
  padding: 0 16px 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.payroll-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 32px;
}

// ==================== SPREADSHEET TABLE ====================

.table-legend {
  display: flex;
  gap: 16px;
  padding: 0 16px 6px;
  font-size: 11px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.5);
}

.legend-muted {
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

.legend-edited-mark {
  display: inline-block;
  width: 14px;
  height: 14px;
  background: rgba(255, 152, 0, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-top: 5px solid rgba(255, 152, 0, 0.7);
  }
}

.payroll-table-wrapper {
  overflow-x: auto;
  padding: 0 8px 8px;
}

.payroll-table {
  border-collapse: collapse;
  font-size: 15px;
  white-space: nowrap;
  min-width: 100%;

  th,
  td {
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 8px;
    text-align: center;
  }

  thead th {
    background: rgba(255, 255, 255, 0.06);
    font-weight: 600;
    font-size: 13px;
    position: sticky;
    top: 0;
    z-index: 2;
  }
}

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 3;
  background: rgba(0, 0, 0, 0.6);
}

thead .sticky-col {
  z-index: 4;
}

.name-col {
  text-align: left !important;
  min-width: 100px;
  max-width: 140px;
  font-weight: 600;
  font-size: 14px;
}

.trainee-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 152, 0, 0.2);
  color: rgba(255, 152, 0, 0.9);
  vertical-align: middle;
  margin-left: 4px;
}

.day-col {
  min-width: 38px;
  font-variant-numeric: tabular-nums;
  position: relative;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.06) !important;
  }
}

.day-header {
  cursor: pointer;
  user-select: none;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.15) !important;
    color: rgb(var(--v-theme-primary));
  }
}

.zero-hours {
  color: rgba(255, 255, 255, 0.2);
}

.edited-cell {
  background: rgba(255, 152, 0, 0.12) !important;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 1px;
    right: 1px;
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-top: 5px solid rgba(255, 152, 0, 0.7);
  }
}

.period-boundary {
  border-right: 2px solid rgba(var(--v-theme-primary), 0.6) !important;
}

.subtotal-col {
  min-width: 48px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.03);
  font-variant-numeric: tabular-nums;
  font-size: 14px;
}

.total-hours {
  font-weight: 700;
}

.summary-col {
  font-variant-numeric: tabular-nums;
  min-width: 90px;
  font-size: 13px;
}

.service-col {
  background: rgba(76, 175, 80, 0.06);
}
.salary-col {
  background: rgba(33, 150, 243, 0.06);
  font-weight: 600;
}
.bonus-col {
  background: rgba(255, 152, 0, 0.06);
}
.kpi-col {
  background: rgba(0, 188, 212, 0.06);
}
.grand-col {
  background: rgba(255, 193, 7, 0.08);
  font-weight: 700;
}

.data-row:hover td {
  background: rgba(255, 255, 255, 0.04);
}
.data-row:hover .sticky-col {
  background: rgba(var(--v-theme-primary), 0.08);
}

.totals-row td {
  font-weight: 700;
  border-top: 2px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.03);
}
.totals-row .sticky-col {
  background: rgba(255, 255, 255, 0.05);
}

// ==================== SUMMARY ====================

.summary-section {
  padding: 16px;

  h3 {
    margin-bottom: 12px;
    font-size: 16px;
  }
}

.summary-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 160px;
  flex: 1;

  .card-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 4px;
  }
  .card-value {
    font-size: 18px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .card-detail {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    margin-top: 4px;
  }
}

.service-card {
  border-left: 3px solid rgba(76, 175, 80, 0.6);
}
.salary-card {
  border-left: 3px solid rgba(33, 150, 243, 0.6);
}
.bonus-card {
  border-left: 3px solid rgba(255, 152, 0, 0.6);
}
.kpi-card {
  border-left: 3px solid rgba(0, 188, 212, 0.6);
}

.kpi-score-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  min-width: 28px;
  height: 20px;
  border-radius: 10px;
  padding: 0 6px;
  color: #fff;

  &.badge-green {
    background: rgba(76, 175, 80, 0.8);
  }
  &.badge-yellow {
    background: rgba(255, 193, 7, 0.8);
    color: #111;
  }
  &.badge-red {
    background: rgba(244, 67, 54, 0.7);
  }
}
.grand-card {
  border-left: 3px solid rgba(255, 193, 7, 0.8);
}

// ==================== GENERAL CALCULATION ====================

.general-calc-section {
  padding: 16px;

  h3 {
    margin-bottom: 12px;
    font-size: 16px;
  }
}

.calc-block {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.calc-block-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.7);
}

// ==================== KPI METRICS VISUAL ====================

.kpi-metrics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.kpi-metric-row {
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
  border-left: 3px solid rgba(76, 175, 80, 0.5);

  &.kpi-metric-failed {
    border-left-color: rgba(244, 67, 54, 0.6);
    opacity: 0.7;
  }
}

.kpi-metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.kpi-metric-name {
  font-size: 12px;
  font-weight: 600;
}

.kpi-metric-weight {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}

.kpi-bar-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  position: relative;
  overflow: visible;
  margin-bottom: 4px;
}

.kpi-bar-fill {
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
}

.kpi-threshold-mark {
  position: absolute;
  top: -3px;
  width: 2px;
  height: 12px;
  background: rgba(255, 255, 255, 0.35);
  transform: translateX(-1px);
}

.kpi-metric-score-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-metric-detail {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.kpi-metric-nodata {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

.kpi-metric-score {
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.kpi-score-failed {
  color: rgba(244, 67, 54, 0.8);
  font-weight: 500;
  font-size: 11px;
}

// KPI Summary
.kpi-summary-block {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
}

.kpi-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 12px;
}

.kpi-summary-score {
  font-size: 13px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 6px;
  margin-bottom: 2px;
}

.kpi-summary-unlocked {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 6px;
  margin-top: 2px;
}

.kpi-summary-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

// ==================== PER-PERSON BREAKDOWN ====================

.breakdown-section {
  padding: 16px;

  h3 {
    margin-bottom: 12px;
    font-size: 16px;
  }
}

.person-card {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
}

.person-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.04);
}

.person-name {
  font-weight: 600;
  font-size: 14px;
  min-width: 100px;
}

.person-rank {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  flex: 1;
}

.person-total {
  font-weight: 700;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-primary));
}

.person-details {
  padding: 8px 16px 12px;
}

.breakdown-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;

  td {
    padding: 3px 8px;
    border: none;
  }
}

.detail-label {
  width: 100px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.detail-formula {
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}

.detail-value {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  width: 120px;
}

.detail-highlight td {
  background: rgba(33, 150, 243, 0.06);
  font-weight: 600;
}

.detail-kpi td {
  background: rgba(0, 188, 212, 0.06);
  font-weight: 500;
}

.detail-total td {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-weight: 700;
  padding-top: 6px;
}

// ==================== EMPTY STATE ====================

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
}
</style>
