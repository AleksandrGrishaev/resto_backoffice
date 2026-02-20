<!-- src/views/backoffice/analytics/DailyWriteOffReportView.vue -->
<!-- Daily Write-Off Report - day-by-day breakdown of write-off trends -->

<template>
  <div class="write-off-report">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-2">Daily Write-Off Report</h1>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Analyze write-off trends by day, reason, and item type
          </p>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="dateFrom"
            label="Date From"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model="dateTo"
            label="Date To"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="department"
            label="Department"
            :items="departmentOptions"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="typeFilter"
            label="Type"
            :items="typeOptions"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-btn
            color="primary"
            size="large"
            :loading="loading"
            :disabled="!dateFrom || !dateTo"
            block
            @click="handleGenerate"
          >
            Generate Report
          </v-btn>
        </v-col>
      </v-row>

      <!-- Error -->
      <v-row v-if="error">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable @click:close="error = null">
            {{ error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Report Content -->
      <template v-if="hasLoaded && !loading">
        <template v-if="dailyRows.length > 0">
          <!-- Summary Cards -->
          <v-row class="mt-4">
            <v-col cols="12" md="3">
              <v-card color="error" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Total Write-Off Value</div>
                  <div class="text-h5">{{ formatIDR(summary.totalValue) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="info" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Total Operations</div>
                  <div class="text-h5">{{ summary.operationsCount }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="warning" variant="tonal">
                <v-card-text>
                  <div class="text-caption">KPI-Affecting Value</div>
                  <div class="text-h5">
                    {{ formatIDR(summary.kpiValue) }}
                    <span class="text-body-2">({{ summary.kpiPercent.toFixed(1) }}%)</span>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="secondary" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Average Daily Write-Off</div>
                  <div class="text-h5">{{ formatIDR(summary.avgDaily) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Daily Breakdown Table -->
          <v-row class="mt-2">
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Daily Breakdown ({{ dailyRows.length }} days)</span>
                  <v-btn
                    color="secondary"
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-download"
                    @click="exportCSV"
                  >
                    Export CSV
                  </v-btn>
                </v-card-title>
                <v-divider />
                <v-data-table
                  v-model:expanded="expandedRows"
                  :headers="dailyHeaders"
                  :items="dailyRows"
                  :items-per-page="31"
                  :sort-by="[{ key: 'date', order: 'desc' }]"
                  density="comfortable"
                  show-expand
                  item-value="date"
                  class="elevation-0"
                >
                  <template #[`item.date`]="{ item }">
                    <span class="font-weight-medium">{{ formatDate(item.date) }}</span>
                  </template>
                  <template #[`item.productsValue`]="{ item }">
                    {{ formatIDR(item.productsValue) }}
                  </template>
                  <template #[`item.preparationsValue`]="{ item }">
                    {{ formatIDR(item.preparationsValue) }}
                  </template>
                  <template #[`item.totalValue`]="{ item }">
                    <span
                      :class="{
                        'text-error font-weight-bold': item.totalValue > avgDailyValue
                      }"
                    >
                      {{ formatIDR(item.totalValue) }}
                    </span>
                  </template>
                  <template #[`item.topReason`]="{ item }">
                    <v-chip size="small" variant="tonal">
                      {{ item.topReason }}
                    </v-chip>
                  </template>

                  <!-- Expanded row: grouped by department → source -->
                  <template #expanded-row="{ columns, item }">
                    <tr>
                      <td :colspan="columns.length" class="pa-0">
                        <div class="expanded-details pa-4 bg-grey-darken-4">
                          <template
                            v-for="group in groupOperations(item.operations)"
                            :key="group.department"
                          >
                            <div class="text-subtitle-2 font-weight-bold text-capitalize mb-2">
                              {{ group.department }}
                              <span class="text-caption text-medium-emphasis ml-2">
                                {{ formatIDR(group.totalValue) }}
                              </span>
                            </div>
                            <v-table density="compact" class="mb-4 bg-transparent">
                              <thead>
                                <tr>
                                  <th class="text-caption">Item</th>
                                  <th class="text-caption">Source</th>
                                  <th class="text-caption">Reason</th>
                                  <th class="text-caption text-right">Qty</th>
                                  <th class="text-caption text-right">Cost</th>
                                </tr>
                              </thead>
                              <tbody>
                                <template v-for="section in group.sections" :key="section.source">
                                  <tr class="section-header">
                                    <td colspan="5" class="text-caption font-weight-bold pa-1 ps-2">
                                      <v-chip
                                        :color="
                                          section.source === 'preparation' ? 'purple' : 'blue'
                                        "
                                        size="x-small"
                                        variant="flat"
                                        class="mr-2"
                                      >
                                        {{
                                          section.source === 'preparation'
                                            ? 'Preparations'
                                            : 'Products'
                                        }}
                                      </v-chip>
                                      <span class="text-medium-emphasis">
                                        {{ section.items.length }} items —
                                        {{ formatIDR(section.totalValue) }}
                                      </span>
                                    </td>
                                  </tr>
                                  <tr v-for="(itm, idx) in section.items" :key="idx">
                                    <td class="text-body-2 ps-4">{{ itm.itemName }}</td>
                                    <td>
                                      <span class="text-caption text-medium-emphasis">
                                        {{ itm.time }}
                                      </span>
                                    </td>
                                    <td>
                                      <v-chip size="x-small" variant="tonal">
                                        {{ itm.reasonLabel }}
                                      </v-chip>
                                    </td>
                                    <td class="text-right text-body-2">
                                      {{ itm.quantity.toFixed(1) }} {{ itm.unit }}
                                    </td>
                                    <td class="text-right text-body-2 text-error">
                                      {{ formatIDR(itm.totalCost) }}
                                    </td>
                                  </tr>
                                </template>
                              </tbody>
                            </v-table>
                          </template>
                        </div>
                      </td>
                    </tr>
                  </template>
                </v-data-table>
              </v-card>
            </v-col>
          </v-row>

          <!-- Reason Breakdown + Top Items -->
          <v-row class="mt-2">
            <!-- Reason Breakdown -->
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Reason Breakdown</v-card-title>
                <v-divider />
                <v-table density="comfortable">
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th class="text-right">Count</th>
                      <th class="text-right">Total Value</th>
                      <th class="text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    <!-- KPI-Affecting group -->
                    <tr v-if="kpiReasons.length > 0">
                      <td colspan="4" class="text-caption font-weight-bold bg-red-lighten-5 pa-2">
                        KPI-Affecting
                      </td>
                    </tr>
                    <tr v-for="row in kpiReasons" :key="row.reason">
                      <td>
                        <v-chip :color="row.color" size="small" variant="tonal">
                          {{ row.reasonLabel }}
                        </v-chip>
                      </td>
                      <td class="text-right">{{ row.count }}</td>
                      <td class="text-right">{{ formatIDR(row.totalValue) }}</td>
                      <td class="text-right">{{ row.percent.toFixed(1) }}%</td>
                    </tr>
                    <!-- Non-KPI group -->
                    <tr v-if="nonKpiReasons.length > 0">
                      <td colspan="4" class="text-caption font-weight-bold bg-grey-lighten-4 pa-2">
                        Non-KPI
                      </td>
                    </tr>
                    <tr v-for="row in nonKpiReasons" :key="row.reason">
                      <td>
                        <v-chip :color="row.color" size="small" variant="tonal">
                          {{ row.reasonLabel }}
                        </v-chip>
                      </td>
                      <td class="text-right">{{ row.count }}</td>
                      <td class="text-right">{{ formatIDR(row.totalValue) }}</td>
                      <td class="text-right">{{ row.percent.toFixed(1) }}%</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-col>

            <!-- Top 5 Items -->
            <v-col cols="12" md="6">
              <v-card variant="outlined">
                <v-card-title>Top 5 Most Expensive Write-Offs</v-card-title>
                <v-divider />
                <v-table density="comfortable">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Type</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Cost</th>
                      <th>Reason</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in topItems" :key="idx">
                      <td class="font-weight-medium">{{ item.itemName }}</td>
                      <td>
                        <v-chip
                          :color="item.itemType === 'preparation' ? 'purple' : 'blue'"
                          size="x-small"
                          variant="tonal"
                        >
                          {{ item.itemType === 'preparation' ? 'Prep' : 'Product' }}
                        </v-chip>
                      </td>
                      <td class="text-right">{{ item.quantity.toFixed(1) }} {{ item.unit }}</td>
                      <td class="text-right text-error">{{ formatIDR(item.totalCost) }}</td>
                      <td>{{ item.reasonLabel }}</td>
                      <td>{{ formatDate(item.date) }}</td>
                    </tr>
                    <tr v-if="topItems.length === 0">
                      <td colspan="6" class="text-center text-medium-emphasis pa-4">No items</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-col>
          </v-row>
        </template>

        <!-- Empty State -->
        <v-row v-else>
          <v-col cols="12">
            <v-card variant="outlined">
              <v-card-text class="text-center py-8">
                <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
                <div class="text-h6 text-medium-emphasis">No Write-Offs Found</div>
                <div class="text-body-2 text-medium-emphasis">
                  No write-off operations found for the selected filters
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <!-- Initial State -->
      <v-row v-if="!hasLoaded && !loading">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-delete-variant</v-icon>
              <div class="text-h6 text-medium-emphasis">No Report Generated</div>
              <div class="text-body-2 text-medium-emphasis">
                Select a date range and click "Generate Report" to view daily write-off trends
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'
import { useWriteOffReport, type OperationDetail } from './composables/useWriteOffReport'

const {
  loading,
  error,
  hasLoaded,
  dailyRows,
  reasonBreakdown,
  topItems,
  summary,
  avgDailyValue,
  generateReport
} = useWriteOffReport()

// Filters
const dateFrom = ref('')
const dateTo = ref('')
const department = ref<'kitchen' | 'bar' | 'all'>('all')
const typeFilter = ref<'waste' | 'training' | 'auto' | 'all'>('waste')

// Expanded rows (by date key)
const expandedRows = ref<string[]>([])

const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const typeOptions = [
  { title: 'Waste (Expired, Spoiled, Other)', value: 'waste' },
  { title: 'Training / Test', value: 'training' },
  { title: 'Auto (Production/Sales)', value: 'auto' },
  { title: 'All', value: 'all' }
]

// Table headers
const dailyHeaders = [
  { title: 'Date', key: 'date', sortable: true },
  { title: 'Operations', key: 'operationsCount', sortable: true, width: '100px' },
  { title: 'Products (Rp)', key: 'productsValue', sortable: true },
  { title: 'Preparations (Rp)', key: 'preparationsValue', sortable: true },
  { title: 'Total (Rp)', key: 'totalValue', sortable: true },
  { title: 'Top Reason', key: 'topReason', sortable: false }
]

// Computed: split reasons into KPI / non-KPI groups
const kpiReasons = computed(() => reasonBreakdown.value.filter(r => r.affectsKPI))
const nonKpiReasons = computed(() => reasonBreakdown.value.filter(r => !r.affectsKPI))

// Lifecycle
onMounted(() => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  dateFrom.value = firstDay.toISOString().split('T')[0]
  dateTo.value = lastDay.toISOString().split('T')[0]
})

// Actions
function handleGenerate() {
  expandedRows.value = []
  generateReport({
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    department: department.value,
    type: typeFilter.value
  })
}

interface GroupedSection {
  source: 'storage' | 'preparation'
  totalValue: number
  items: Array<{
    itemName: string
    time: string
    reasonLabel: string
    quantity: number
    unit: string
    totalCost: number
  }>
}

interface GroupedDepartment {
  department: string
  totalValue: number
  sections: GroupedSection[]
}

function groupOperations(operations: OperationDetail[]): GroupedDepartment[] {
  const deptMap = new Map<string, Map<'storage' | 'preparation', GroupedSection['items']>>()

  for (const op of operations) {
    const dept = op.department || 'unknown'
    if (!deptMap.has(dept)) {
      deptMap.set(dept, new Map())
    }
    const sourceMap = deptMap.get(dept)!

    if (!sourceMap.has(op.source)) {
      sourceMap.set(op.source, [])
    }
    const items = sourceMap.get(op.source)!

    for (const itm of op.items) {
      items.push({
        itemName: itm.itemName,
        time: op.time,
        reasonLabel: op.reasonLabel,
        quantity: itm.quantity,
        unit: itm.unit,
        totalCost: itm.totalCost
      })
    }
  }

  const result: GroupedDepartment[] = []
  for (const [dept, sourceMap] of deptMap) {
    const sections: GroupedSection[] = []
    // Show storage first, then preparations
    for (const source of ['storage', 'preparation'] as const) {
      const items = sourceMap.get(source)
      if (items && items.length > 0) {
        sections.push({
          source,
          totalValue: items.reduce((sum, i) => sum + i.totalCost, 0),
          items: items.sort((a, b) => b.totalCost - a.totalCost)
        })
      }
    }
    if (sections.length > 0) {
      result.push({
        department: dept,
        totalValue: sections.reduce((sum, s) => sum + s.totalValue, 0),
        sections
      })
    }
  }

  return result.sort((a, b) => b.totalValue - a.totalValue)
}

function formatDate(dateStr: string): string {
  return TimeUtils.formatDateForDisplay(dateStr)
}

function exportCSV() {
  if (dailyRows.value.length === 0) return

  const headers = [
    'Date',
    'Operations',
    'Products Value',
    'Preparations Value',
    'Total Value',
    'Top Reason'
  ]
  const rows = dailyRows.value.map(row => [
    row.date,
    row.operationsCount,
    row.productsValue.toFixed(0),
    row.preparationsValue.toFixed(0),
    row.totalValue.toFixed(0),
    row.topReason
  ])

  const csv = [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `write-off-report-${dateFrom.value}-to-${dateTo.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function escapeCSV(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
</script>

<style scoped lang="scss">
.write-off-report {
  .v-data-table {
    tbody tr:hover {
      background-color: rgba(var(--v-theme-surface-variant), 0.5);
    }
  }

  // Fix native date input calendar icon visibility in dark theme
  :deep(input[type='date'])::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
  }
}
</style>
