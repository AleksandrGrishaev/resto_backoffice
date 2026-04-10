<script setup lang="ts">
// Production KPI Dashboard — per-staff production metrics for managers
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductionKpiScreen'

// Types
interface StaffMetric {
  staffMemberId: string
  staffMemberName: string
  totalTasks: number
  completedTasks: number
  completionRate: number
  productionTasks: number
  writeOffTasks: number
  totalCompletedQty: number
  photosUploaded: number
  photoRate: number
  quickCompletions: number
  avgDurationMinutes: number
  activeDays: number
}

interface KpiSummary {
  totalTasks: number
  completedTasks: number
  completionRate: number
  totalProductionTasks: number
  totalWriteOffTasks: number
  totalTargetQty: number
  totalCompletedQty: number
  photosUploaded: number
  photoRate: number
  quickCompletions: number
  avgDurationMinutes: number
}

interface RitualSummary {
  totalRituals: number
  avgDurationMinutes: number
  avgCompletionRate: number
  byType: { morning: number; afternoon: number; evening: number }
}

interface KpiData {
  summary: KpiSummary
  staffMetrics: StaffMetric[]
  ritualSummary: RitualSummary
}

// State
const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<KpiData | null>(null)

// Date range
type DateRange = 'today' | '7d' | '30d'
const dateRange = ref<DateRange>('7d')

const dateRangeOptions = [
  { value: 'today' as DateRange, label: 'Today' },
  { value: '7d' as DateRange, label: '7 Days' },
  { value: '30d' as DateRange, label: '30 Days' }
]

// Use Bali timezone (Asia/Makassar, WITA UTC+8) for consistent date calculation
function toBaliDate(date: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(date)
}

const dateFrom = computed(() => {
  const now = new Date()
  switch (dateRange.value) {
    case 'today':
      return toBaliDate(now)
    case '7d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return toBaliDate(d)
    }
    case '30d':
    default: {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      return toBaliDate(d)
    }
  }
})

const dateTo = computed(() => toBaliDate(new Date()))

// Staff table sort
const sortBy = ref<string>('completedTasks')
const sortDesc = ref(true)

const sortedStaffMetrics = computed(() => {
  if (!data.value?.staffMetrics?.length) return []
  const key = sortBy.value as keyof StaffMetric
  return [...data.value.staffMetrics].sort((a, b) => {
    const va = a[key] as number
    const vb = b[key] as number
    return sortDesc.value ? vb - va : va - vb
  })
})

// Fetch data
async function fetchKpi() {
  loading.value = true
  error.value = null

  try {
    const { data: result, error: rpcError } = await supabase.rpc('get_staff_production_kpi', {
      p_date_from: dateFrom.value,
      p_date_to: dateTo.value,
      p_department: null
    })

    if (rpcError) throw new Error(rpcError.message)

    const parsed = result as { success: boolean; error?: string } & KpiData
    if (!parsed.success) throw new Error(parsed.error || 'RPC failed')

    data.value = {
      summary: parsed.summary,
      staffMetrics: parsed.staffMetrics || [],
      ritualSummary: parsed.ritualSummary
    }

    DebugUtils.info(MODULE_NAME, 'KPI data loaded', {
      staff: data.value.staffMetrics.length,
      tasks: data.value.summary.totalTasks
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load KPI data'
    error.value = msg
    DebugUtils.error(MODULE_NAME, msg, err)
  } finally {
    loading.value = false
  }
}

watch(dateRange, () => fetchKpi())
onMounted(fetchKpi)

// Helpers
function toggleSort(column: string) {
  if (sortBy.value === column) {
    sortDesc.value = !sortDesc.value
  } else {
    sortBy.value = column
    sortDesc.value = true
  }
}

function sortIcon(column: string): string {
  if (sortBy.value !== column) return 'mdi-unfold-more-horizontal'
  return sortDesc.value ? 'mdi-chevron-down' : 'mdi-chevron-up'
}
</script>

<template>
  <div class="kpi-dashboard">
    <!-- Header -->
    <div class="kpi-header">
      <div>
        <h2 class="kpi-title">Production KPI</h2>
        <p class="text-caption text-medium-emphasis">Per-staff production performance</p>
      </div>
      <div class="kpi-controls">
        <v-btn-toggle v-model="dateRange" mandatory density="compact" variant="outlined">
          <v-btn v-for="opt in dateRangeOptions" :key="opt.value" :value="opt.value" size="small">
            {{ opt.label }}
          </v-btn>
        </v-btn-toggle>
        <v-btn icon size="small" variant="text" :loading="loading" @click="fetchKpi">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !data" class="kpi-loading">
      <v-progress-circular indeterminate size="48" color="primary" />
    </div>

    <!-- Error -->
    <v-alert v-if="error" type="error" variant="tonal" class="mx-4 mt-4" closable>
      {{ error }}
    </v-alert>

    <template v-if="data">
      <!-- Summary Cards -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-value">
            {{ data.summary.completedTasks }}/{{ data.summary.totalTasks }}
          </div>
          <div class="card-label">Tasks Completed</div>
          <div class="card-sub">{{ data.summary.completionRate }}% rate</div>
        </div>
        <div class="summary-card">
          <div class="card-value">{{ Math.round(data.summary.totalCompletedQty) }}</div>
          <div class="card-label">Total Produced</div>
          <div class="card-sub">target {{ Math.round(data.summary.totalTargetQty) }}</div>
        </div>
        <div class="summary-card">
          <div class="card-value">{{ data.summary.photoRate }}%</div>
          <div class="card-label">Photo Rate</div>
          <div class="card-sub">{{ data.summary.photosUploaded }} photos</div>
        </div>
        <div class="summary-card" :class="{ 'card-warning': data.summary.quickCompletions > 0 }">
          <div class="card-value">{{ data.summary.quickCompletions }}</div>
          <div class="card-label">Quick Completions</div>
          <div class="card-sub">{{ data.summary.avgDurationMinutes }}min avg</div>
        </div>
        <div class="summary-card">
          <div class="card-value">{{ data.ritualSummary.totalRituals }}</div>
          <div class="card-label">Rituals</div>
          <div class="card-sub">{{ data.ritualSummary.avgCompletionRate }}% avg completion</div>
        </div>
        <div class="summary-card">
          <div class="card-value">
            {{ data.ritualSummary.byType.morning }}/{{ data.ritualSummary.byType.afternoon }}/{{
              data.ritualSummary.byType.evening
            }}
          </div>
          <div class="card-label">M / A / E Rituals</div>
          <div class="card-sub">{{ data.ritualSummary.avgDurationMinutes }}min avg</div>
        </div>
      </div>

      <!-- Staff Performance Table -->
      <div class="staff-section">
        <h3 class="section-title">
          <v-icon size="20" class="mr-1">mdi-account-group</v-icon>
          Staff Performance
          <v-chip size="x-small" variant="tonal" class="ml-2">
            {{ sortedStaffMetrics.length }} staff
          </v-chip>
        </h3>

        <div v-if="sortedStaffMetrics.length === 0" class="staff-empty">
          <v-icon size="48" color="grey">mdi-account-question</v-icon>
          <p class="text-medium-emphasis mt-2">
            No staff-assigned tasks in this period.
            <br />
            Tasks need a staff member selected to appear here.
          </p>
        </div>

        <div v-else class="staff-table-wrapper">
          <table class="staff-table">
            <thead>
              <tr>
                <th class="th-rank">#</th>
                <th class="th-name">Staff</th>
                <th class="th-sortable" @click="toggleSort('completedTasks')">
                  Done
                  <v-icon size="14">{{ sortIcon('completedTasks') }}</v-icon>
                </th>
                <th class="th-sortable" @click="toggleSort('totalCompletedQty')">
                  Qty
                  <v-icon size="14">{{ sortIcon('totalCompletedQty') }}</v-icon>
                </th>
                <th class="th-sortable" @click="toggleSort('completionRate')">
                  Rate
                  <v-icon size="14">{{ sortIcon('completionRate') }}</v-icon>
                </th>
                <th class="th-sortable" @click="toggleSort('photoRate')">
                  Photo
                  <v-icon size="14">{{ sortIcon('photoRate') }}</v-icon>
                </th>
                <th class="th-sortable" @click="toggleSort('quickCompletions')">
                  Quick
                  <v-icon size="14">{{ sortIcon('quickCompletions') }}</v-icon>
                </th>
                <th class="th-sortable" @click="toggleSort('avgDurationMinutes')">
                  Avg min
                  <v-icon size="14">{{ sortIcon('avgDurationMinutes') }}</v-icon>
                </th>
                <th class="th-sortable" @click="toggleSort('activeDays')">
                  Days
                  <v-icon size="14">{{ sortIcon('activeDays') }}</v-icon>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(staff, i) in sortedStaffMetrics" :key="staff.staffMemberId">
                <td class="td-rank">{{ i + 1 }}</td>
                <td class="td-name">
                  <div class="staff-avatar">{{ staff.staffMemberName?.charAt(0) || '?' }}</div>
                  {{ staff.staffMemberName }}
                </td>
                <td>
                  <strong>{{ staff.completedTasks }}</strong>
                  <span class="text-disabled">/{{ staff.totalTasks }}</span>
                </td>
                <td>{{ Math.round(staff.totalCompletedQty) }}</td>
                <td>
                  <v-chip
                    :color="
                      staff.completionRate >= 80
                        ? 'success'
                        : staff.completionRate >= 50
                          ? 'warning'
                          : 'error'
                    "
                    size="x-small"
                    variant="flat"
                  >
                    {{ staff.completionRate }}%
                  </v-chip>
                </td>
                <td>
                  <v-chip
                    :color="
                      staff.photoRate >= 80 ? 'success' : staff.photoRate >= 50 ? 'warning' : 'grey'
                    "
                    size="x-small"
                    variant="tonal"
                  >
                    {{ staff.photoRate }}%
                  </v-chip>
                </td>
                <td :class="{ 'text-error font-weight-bold': staff.quickCompletions > 0 }">
                  {{ staff.quickCompletions }}
                </td>
                <td>{{ staff.avgDurationMinutes }}</td>
                <td>{{ staff.activeDays }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.kpi-dashboard {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.kpi-title {
  font-size: 20px;
  font-weight: 700;
}

.kpi-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kpi-loading {
  display: flex;
  justify-content: center;
  padding: 48px;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.summary-card {
  background-color: var(--v-theme-surface);
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);

  &.card-warning {
    border-color: rgba(var(--v-theme-warning), 0.3);
    background-color: rgba(var(--v-theme-warning), 0.04);
  }
}

.card-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.1;
}

.card-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 4px;
}

.card-sub {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  margin-top: 2px;
}

/* Staff Section */
.staff-section {
  margin-top: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
}

.staff-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  background-color: var(--v-theme-surface);
  border-radius: 10px;
}

/* Staff Table */
.staff-table-wrapper {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.staff-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--v-theme-surface);
  font-size: 13px;

  th,
  td {
    padding: 10px 12px;
    text-align: left;
    white-space: nowrap;
  }

  thead {
    background-color: rgba(var(--v-theme-on-surface), 0.04);

    th {
      font-size: 12px;
      font-weight: 600;
      color: rgba(var(--v-theme-on-surface), 0.6);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
  }

  tbody tr {
    border-top: 1px solid rgba(var(--v-theme-on-surface), 0.04);

    &:hover {
      background-color: rgba(var(--v-theme-primary), 0.03);
    }
  }
}

.th-rank {
  width: 32px;
}

.th-name {
  min-width: 120px;
}

.th-sortable {
  cursor: pointer;
  user-select: none;

  &:hover {
    color: rgb(var(--v-theme-primary));
  }
}

.td-rank {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.td-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.staff-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
</style>
