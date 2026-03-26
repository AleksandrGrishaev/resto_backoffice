<!-- src/views/kitchen/kpi/components/RitualKpiTab.vue -->
<!-- Ritual KPI tab: completion rate, streak, avg duration, history list -->
<template>
  <div class="ritual-kpi-tab">
    <!-- Period selector -->
    <div class="period-selector">
      <v-chip-group v-model="selectedPeriod" mandatory selected-class="text-primary">
        <v-chip :value="7" variant="outlined" filter size="small">7 days</v-chip>
        <v-chip :value="14" variant="outlined" filter size="small">14 days</v-chip>
        <v-chip :value="30" variant="outlined" filter size="small">30 days</v-chip>
      </v-chip-group>
    </div>

    <!-- Summary Cards -->
    <div v-if="loadingHistory" class="loading-state">
      <v-progress-circular indeterminate size="32" />
    </div>

    <template v-else>
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-value" :class="completionColor">{{ summary.completionRate }}%</div>
          <div class="card-label">Completion Rate</div>
        </div>
        <div class="summary-card">
          <div class="card-value">{{ summary.currentStreak }}d</div>
          <div class="card-label">Streak</div>
        </div>
        <div class="summary-card">
          <div class="card-value">{{ summary.avgDurationMinutes }}min</div>
          <div class="card-label">Avg Duration</div>
        </div>
        <div class="summary-card">
          <div class="card-value" :class="onTimeColor">{{ summary.onTimeRate }}%</div>
          <div class="card-label">Task Completion</div>
        </div>
      </div>

      <!-- Staff breakdown -->
      <div v-if="summary.byStaff.length > 0" class="staff-section">
        <h4 class="section-title">By Staff</h4>
        <div class="staff-list">
          <div v-for="s in summary.byStaff" :key="s.staffName" class="staff-row">
            <span class="staff-name">{{ s.staffName }}</span>
            <span class="staff-count">{{ s.completedCount }} rituals</span>
            <span class="staff-duration">avg {{ s.avgDurationMinutes }}min</span>
          </div>
        </div>
      </div>

      <!-- History list -->
      <div class="history-section">
        <h4 class="section-title">History</h4>
        <div v-if="ritualHistory.length === 0" class="empty-history">
          <v-icon size="40" color="grey">mdi-calendar-blank-outline</v-icon>
          <span class="text-medium-emphasis">No rituals completed in this period</span>
        </div>
        <div v-else class="history-list">
          <div
            v-for="item in ritualHistory"
            :key="item.id"
            class="history-item"
            :class="{ clickable: item.taskDetails && item.taskDetails.length > 0 }"
            @click="openDetail(item)"
          >
            <div class="history-icon">
              <v-icon :color="item.ritualType === 'morning' ? 'info' : 'purple'" size="20">
                {{ item.ritualType === 'morning' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
              </v-icon>
            </div>
            <div class="history-body">
              <div class="history-title">
                {{ item.ritualType === 'morning' ? 'Morning' : 'Evening' }} Ritual
              </div>
              <div class="history-meta">
                {{ formatDate(item.completedAt) }} &middot; {{ item.completedTasks }}/{{
                  item.totalTasks
                }}
                tasks &middot; {{ item.durationMinutes }}min
                <span v-if="item.completedByName">&middot; {{ item.completedByName }}</span>
              </div>
            </div>
            <div class="history-rate" :class="getCompletionClass(item)">
              {{
                item.totalTasks > 0 ? Math.round((item.completedTasks / item.totalTasks) * 100) : 0
              }}%
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Detail Dialog -->
    <v-dialog v-model="showDetail" max-width="500">
      <v-card v-if="detailItem">
        <v-toolbar
          :color="detailItem.ritualType === 'morning' ? 'info' : 'purple'"
          density="compact"
        >
          <v-btn icon @click="showDetail = false"><v-icon>mdi-close</v-icon></v-btn>
          <v-toolbar-title>
            <v-icon class="mr-2">
              {{ detailItem.ritualType === 'morning' ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
            </v-icon>
            {{ detailItem.ritualType === 'morning' ? 'Morning' : 'Evening' }} Ritual
          </v-toolbar-title>
        </v-toolbar>

        <div class="detail-summary">
          <div class="detail-stat">
            <span class="detail-stat-value">{{ formatDate(detailItem.completedAt) }}</span>
          </div>
          <div class="detail-stat">
            <span class="detail-stat-label">Duration</span>
            <span class="detail-stat-value">{{ detailItem.durationMinutes }}min</span>
          </div>
          <div class="detail-stat">
            <span class="detail-stat-label">Completed</span>
            <span class="detail-stat-value">
              {{ detailItem.completedTasks }}/{{ detailItem.totalTasks }}
            </span>
          </div>
          <div v-if="detailItem.completedByName" class="detail-stat">
            <span class="detail-stat-label">Staff</span>
            <span class="detail-stat-value">{{ detailItem.completedByName }}</span>
          </div>
        </div>

        <v-divider />

        <!-- Task list -->
        <div class="detail-tasks">
          <div
            v-for="(task, i) in detailItem.taskDetails"
            :key="i"
            class="detail-task-row"
            :class="{ 'task-incomplete': !task.completed }"
          >
            <v-icon :color="task.completed ? 'success' : 'error'" size="18" class="flex-shrink-0">
              {{ task.completed ? 'mdi-check-circle' : 'mdi-close-circle' }}
            </v-icon>
            <div class="detail-task-body">
              <span class="detail-task-name">{{ task.name }}</span>
              <span v-if="task.type === 'custom'" class="detail-task-chip">custom</span>
            </div>
            <!-- Recommended → Actual for schedule tasks -->
            <div v-if="task.targetQuantity" class="detail-task-qty">
              <span class="qty-target">{{ task.targetQuantity }}{{ task.unit }}</span>
              <template v-if="task.completed">
                <v-icon size="10" class="mx-1">mdi-arrow-right</v-icon>
                <span :class="getQtyClass(task)">
                  {{ task.completedQuantity || task.targetQuantity }}{{ task.unit }}
                </span>
              </template>
            </div>
            <!-- Time -->
            <span v-if="task.completedAt" class="detail-task-time">
              {{ formatTime(task.completedAt) }}
            </span>
          </div>

          <div
            v-if="!detailItem.taskDetails || detailItem.taskDetails.length === 0"
            class="detail-empty"
          >
            No task details recorded
          </div>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRitualKpi } from '@/stores/kitchenKpi/composables'
import type { RitualCompletion } from '@/stores/kitchenKpi/types'

interface Props {
  department?: 'all' | 'kitchen' | 'bar'
}

const props = withDefaults(defineProps<Props>(), {
  department: 'kitchen'
})

const showDetail = ref(false)
const detailItem = ref<RitualCompletion | null>(null)

function openDetail(item: RitualCompletion): void {
  detailItem.value = item
  showDetail.value = true
}

function getQtyClass(task: { targetQuantity?: number; completedQuantity?: number }): string {
  const actual = task.completedQuantity || task.targetQuantity || 0
  const target = task.targetQuantity || 0
  if (actual >= target) return 'qty-done'
  return 'qty-under'
}

function formatTime(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return ''
  }
}

const { ritualHistory, periodDays, loadingHistory, summary, loadHistory, setPeriod } =
  useRitualKpi()

const selectedPeriod = computed({
  get: () => periodDays.value,
  set: (val: number) => {
    const dept = props.department === 'all' ? 'kitchen' : props.department
    setPeriod(val, dept)
  }
})

const completionColor = computed(() => {
  const rate = summary.value.completionRate
  if (rate >= 80) return 'text-success'
  if (rate >= 50) return 'text-warning'
  return 'text-error'
})

const onTimeColor = computed(() => {
  const rate = summary.value.onTimeRate
  if (rate >= 90) return 'text-success'
  if (rate >= 70) return 'text-warning'
  return 'text-error'
})

function getCompletionClass(item: RitualCompletion): string {
  const rate = item.totalTasks > 0 ? (item.completedTasks / item.totalTasks) * 100 : 0
  if (rate >= 90) return 'text-success'
  if (rate >= 60) return 'text-warning'
  return 'text-error'
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  } catch {
    return ''
  }
}

watch(
  () => props.department,
  () => {
    const dept = props.department === 'all' ? 'kitchen' : props.department
    loadHistory(dept)
  }
)

onMounted(() => {
  const dept = props.department === 'all' ? 'kitchen' : props.department
  loadHistory(dept)
})
</script>

<style scoped lang="scss">
.ritual-kpi-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.period-selector {
  display: flex;
  justify-content: center;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 40px;
}

/* Summary Cards */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  background-color: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 12px;
  gap: 4px;
}

.card-value {
  font-size: 24px;
  font-weight: 700;
}

.card-label {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-align: center;
}

/* Staff */
.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.staff-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.staff-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 8px;
  font-size: 14px;
}

.staff-name {
  font-weight: 600;
  flex: 1;
}

.staff-count,
.staff-duration {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 13px;
}

/* History */
.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px;
  opacity: 0.5;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background-color: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 8px;
}

.history-icon {
  flex-shrink: 0;
}

.history-body {
  flex: 1;
  min-width: 0;
}

.history-title {
  font-weight: 600;
  font-size: 14px;
}

.history-meta {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin-top: 2px;
}

.history-rate {
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.history-item.clickable {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background-color: rgba(var(--v-theme-primary), 0.08);
  }
}

/* Detail Dialog */
.detail-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px;
}

.detail-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-stat-label {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  text-transform: uppercase;
}

.detail-stat-value {
  font-size: 14px;
  font-weight: 600;
}

.detail-tasks {
  padding: 8px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.detail-task-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  min-height: 36px;

  &.task-incomplete {
    opacity: 0.5;
  }
}

.detail-task-body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-task-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-task-chip {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background-color: rgba(var(--v-theme-secondary), 0.15);
  color: rgb(var(--v-theme-secondary));
  flex-shrink: 0;
}

.detail-task-qty {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
}

.qty-done {
  color: rgb(var(--v-theme-success));
}

.qty-target {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.qty-under {
  color: rgb(var(--v-theme-warning));
  font-weight: 600;
}

.detail-task-time {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  flex-shrink: 0;
  min-width: 36px;
  text-align: right;
}

.detail-empty {
  text-align: center;
  padding: 24px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-size: 13px;
}

.flex-shrink-0 {
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
