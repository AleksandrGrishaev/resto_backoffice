<!-- src/components/storage/widgets/WriteOffStatsWidget.vue -->
<template>
  <v-card>
    <!-- Header -->
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center gap-3">
        <v-icon icon="mdi-chart-line" color="primary" />
        <div>
          <h3>Write-off Statistics</h3>
          <div class="text-body-2 text-medium-emphasis">
            {{ periodText }} - {{ departmentText }}
          </div>
        </div>
      </div>

      <!-- Quick filters -->
      <div class="d-flex align-center gap-2">
        <v-select
          v-model="selectedDepartment"
          :items="departmentOptions"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 120px"
        />
        <v-select
          v-model="selectedPeriod"
          :items="periodOptions"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 100px"
        />
        <v-btn icon="mdi-refresh" variant="text" size="small" @click="refreshData" />
      </div>
    </v-card-title>

    <v-divider />

    <!-- Loading State -->
    <div v-if="loading" class="pa-8 text-center">
      <v-progress-circular indeterminate color="primary" />
      <div class="mt-2 text-medium-emphasis">Loading statistics...</div>
    </div>

    <!-- Content -->
    <div v-else-if="stats" class="pa-6">
      <!-- Overview Cards -->
      <v-row class="mb-6">
        <!-- Total Write-offs -->
        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal" color="info">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h4 font-weight-bold">{{ stats.total.count }}</div>
                  <div class="text-body-2">Total Write-offs</div>
                </div>
                <v-icon icon="mdi-clipboard-list" size="32" />
              </div>
              <div class="text-h6 mt-2">{{ formatIDR(stats.total.value) }}</div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- KPI Affecting (Bad) -->
        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal" color="error">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h4 font-weight-bold">{{ stats.kpiAffecting.count }}</div>
                  <div class="text-body-2">Affects KPI</div>
                </div>
                <v-icon icon="mdi-alert-triangle" size="32" />
              </div>
              <div class="text-h6 mt-2">{{ formatIDR(stats.kpiAffecting.value) }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ getPercentage(stats.kpiAffecting.value, stats.total.value) }}% of total
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Non-KPI Affecting (Good) -->
        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal" color="success">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h4 font-weight-bold">{{ stats.nonKpiAffecting.count }}</div>
                  <div class="text-body-2">Investment</div>
                </div>
                <v-icon icon="mdi-school" size="32" />
              </div>
              <div class="text-h6 mt-2">{{ formatIDR(stats.nonKpiAffecting.value) }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ getPercentage(stats.nonKpiAffecting.value, stats.total.value) }}% of total
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- KPI Score -->
        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal" :color="kpiScoreColor">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h4 font-weight-bold">{{ kpiScore }}%</div>
                  <div class="text-body-2">KPI Score</div>
                </div>
                <v-icon :icon="kpiScoreIcon" size="32" />
              </div>
              <div class="text-body-2 mt-2">{{ kpiScoreText }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Detailed Breakdown -->
      <v-row>
        <!-- KPI Affecting Reasons -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="d-flex align-center gap-2">
              <v-icon icon="mdi-alert" color="error" />
              KPI Affecting Write-offs
            </v-card-title>
            <v-card-text>
              <div
                v-if="stats.kpiAffecting.count === 0"
                class="text-center py-4 text-medium-emphasis"
              >
                <v-icon icon="mdi-check-circle" size="48" class="mb-2" color="success" />
                <div>No negative write-offs!</div>
                <div class="text-body-2">Great job maintaining quality</div>
              </div>
              <div v-else>
                <!-- Expired -->
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="d-flex align-center gap-3">
                    <v-icon icon="mdi-clock-alert" color="error" />
                    <div>
                      <div class="font-weight-medium">Expired Products</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ stats.kpiAffecting.reasons.expired.count }} operations
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-bold">
                      {{ formatIDR(stats.kpiAffecting.reasons.expired.value) }}
                    </div>
                  </div>
                </div>

                <!-- Spoiled -->
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="d-flex align-center gap-3">
                    <v-icon icon="mdi-delete-variant" color="error" />
                    <div>
                      <div class="font-weight-medium">Spoiled Products</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ stats.kpiAffecting.reasons.spoiled.count }} operations
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-bold">
                      {{ formatIDR(stats.kpiAffecting.reasons.spoiled.value) }}
                    </div>
                  </div>
                </div>

                <!-- Other -->
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center gap-3">
                    <v-icon icon="mdi-help-circle" color="warning" />
                    <div>
                      <div class="font-weight-medium">Other Losses</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ stats.kpiAffecting.reasons.other.count }} operations
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-bold">
                      {{ formatIDR(stats.kpiAffecting.reasons.other.value) }}
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Non-KPI Affecting Reasons -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="d-flex align-center gap-2">
              <v-icon icon="mdi-school" color="success" />
              Investment Write-offs
            </v-card-title>
            <v-card-text>
              <div
                v-if="stats.nonKpiAffecting.count === 0"
                class="text-center py-4 text-medium-emphasis"
              >
                <v-icon icon="mdi-school-outline" size="48" class="mb-2" />
                <div>No training activities</div>
                <div class="text-body-2">Consider scheduling education or testing</div>
              </div>
              <div v-else>
                <!-- Education -->
                <div class="d-flex align-center justify-space-between mb-3">
                  <div class="d-flex align-center gap-3">
                    <v-icon icon="mdi-account-school" color="info" />
                    <div>
                      <div class="font-weight-medium">Staff Education</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ stats.nonKpiAffecting.reasons.education.count }} operations
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-bold">
                      {{ formatIDR(stats.nonKpiAffecting.reasons.education.value) }}
                    </div>
                  </div>
                </div>

                <!-- Recipe Testing -->
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center gap-3">
                    <v-icon icon="mdi-test-tube" color="success" />
                    <div>
                      <div class="font-weight-medium">Recipe Testing</div>
                      <div class="text-caption text-medium-emphasis">
                        {{ stats.nonKpiAffecting.reasons.test.count }} operations
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-bold">
                      {{ formatIDR(stats.nonKpiAffecting.reasons.test.value) }}
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Department Comparison (if all departments selected) -->
      <v-row v-if="selectedDepartment === 'all'" class="mt-4">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-title class="d-flex align-center gap-2">
              <v-icon icon="mdi-compare" color="primary" />
              Department Comparison
            </v-card-title>
            <v-card-text>
              <v-row>
                <!-- Kitchen -->
                <v-col cols="12" md="6">
                  <div class="text-center">
                    <v-icon icon="mdi-chef-hat" size="32" class="mb-2" />
                    <h4>Kitchen</h4>
                    <div class="mt-3">
                      <div class="d-flex justify-space-between mb-2">
                        <span>Total:</span>
                        <strong>{{ formatIDR(stats.byDepartment.kitchen.total) }}</strong>
                      </div>
                      <div class="d-flex justify-space-between mb-2">
                        <span class="text-error">KPI Affecting:</span>
                        <strong class="text-error">
                          {{ formatIDR(stats.byDepartment.kitchen.kpiAffecting) }}
                        </strong>
                      </div>
                      <div class="d-flex justify-space-between">
                        <span class="text-success">Investment:</span>
                        <strong class="text-success">
                          {{ formatIDR(stats.byDepartment.kitchen.nonKpiAffecting) }}
                        </strong>
                      </div>
                    </div>
                  </div>
                </v-col>

                <!-- Bar -->
                <v-col cols="12" md="6">
                  <div class="text-center">
                    <v-icon icon="mdi-glass-cocktail" size="32" class="mb-2" />
                    <h4>Bar</h4>
                    <div class="mt-3">
                      <div class="d-flex justify-space-between mb-2">
                        <span>Total:</span>
                        <strong>{{ formatIDR(stats.byDepartment.bar.total) }}</strong>
                      </div>
                      <div class="d-flex justify-space-between mb-2">
                        <span class="text-error">KPI Affecting:</span>
                        <strong class="text-error">
                          {{ formatIDR(stats.byDepartment.bar.kpiAffecting) }}
                        </strong>
                      </div>
                      <div class="d-flex justify-space-between">
                        <span class="text-success">Investment:</span>
                        <strong class="text-success">
                          {{ formatIDR(stats.byDepartment.bar.nonKpiAffecting) }}
                        </strong>
                      </div>
                    </div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Empty State -->
    <div v-else class="pa-8 text-center">
      <v-icon icon="mdi-chart-line" size="64" class="mb-4 text-medium-emphasis" />
      <h3 class="text-medium-emphasis mb-2">No Write-off Data</h3>
      <p class="text-body-2 text-medium-emphasis">
        No write-offs found for the selected period and department.
      </p>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useWriteOff } from '@/stores/storage'
import { formatIDR } from '@/utils'
import type { StorageDepartment, WriteOffStatistics } from '@/stores/storage/types'

interface Props {
  department?: StorageDepartment | 'all'
  period?: 'week' | 'month' | 'quarter' | 'year'
  autoRefresh?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  department: 'all',
  period: 'month',
  autoRefresh: false
})

// Composables
const writeOff = useWriteOff()

// State
const loading = ref(false)
const stats = ref<WriteOffStatistics | null>(null)
const selectedDepartment = ref<StorageDepartment | 'all'>(props.department)
const selectedPeriod = ref(props.period)

// Options
const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const periodOptions = [
  { title: 'Week', value: 'week' },
  { title: 'Month', value: 'month' },
  { title: 'Quarter', value: 'quarter' },
  { title: 'Year', value: 'year' }
]

// Computed
const periodText = computed(() => {
  const option = periodOptions.find(p => p.value === selectedPeriod.value)
  return `Last ${option?.title.toLowerCase() || 'month'}`
})

const departmentText = computed(() => {
  const option = departmentOptions.find(d => d.value === selectedDepartment.value)
  return option?.title || 'All Departments'
})

const kpiScore = computed(() => {
  if (!stats.value || stats.value.total.value === 0) return 100

  const badPercentage = (stats.value.kpiAffecting.value / stats.value.total.value) * 100
  return Math.round(100 - badPercentage)
})

const kpiScoreColor = computed(() => {
  const score = kpiScore.value
  if (score >= 90) return 'success'
  if (score >= 70) return 'warning'
  return 'error'
})

const kpiScoreIcon = computed(() => {
  const score = kpiScore.value
  if (score >= 90) return 'mdi-trophy'
  if (score >= 70) return 'mdi-thumb-up'
  return 'mdi-alert-circle'
})

const kpiScoreText = computed(() => {
  const score = kpiScore.value
  if (score >= 95) return 'Excellent!'
  if (score >= 90) return 'Very Good'
  if (score >= 80) return 'Good'
  if (score >= 70) return 'Needs Attention'
  return 'Critical'
})

// Methods
function getPercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

function getPeriodDates() {
  const now = new Date()
  const period = selectedPeriod.value

  let dateFrom: string

  switch (period) {
    case 'week':
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      break
    case 'quarter':
      dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
      break
    case 'year':
      dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
      break
    default: // month
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }

  return { dateFrom, dateTo: now.toISOString() }
}

async function loadStats() {
  try {
    loading.value = true

    const { dateFrom, dateTo } = getPeriodDates()
    const department = selectedDepartment.value === 'all' ? undefined : selectedDepartment.value

    stats.value = writeOff.getWriteOffStatistics(department, dateFrom, dateTo)
  } catch (error) {
    console.error('Failed to load write-off statistics:', error)
    stats.value = null
  } finally {
    loading.value = false
  }
}

function refreshData() {
  loadStats()
}

// Watch for changes
watch([selectedDepartment, selectedPeriod], () => {
  loadStats()
})

// Lifecycle
onMounted(() => {
  loadStats()
})

// Auto-refresh if enabled
if (props.autoRefresh) {
  setInterval(() => {
    loadStats()
  }, 60000) // Refresh every minute
}
</script>

<style scoped>
.v-card {
  height: 100%;
}
</style>
