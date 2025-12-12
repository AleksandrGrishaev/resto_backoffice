<!-- src/views/backoffice/salary/kpi/KitchenTimeKpiView.vue -->
<template>
  <v-container fluid class="kitchen-time-kpi">
    <!-- Header -->
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex align-center gap-4">
        <v-btn icon variant="text" @click="router.back()">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div>
          <h1 class="text-h5 mb-1">Kitchen Time KPI</h1>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Historical order processing time analysis
          </p>
        </div>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          v-model="filters.dateFrom"
          label="Date From"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-text-field
          v-model="filters.dateTo"
          label="Date To"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-select
          v-model="filters.department"
          :items="departmentOptions"
          label="Department"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="3" class="d-flex align-center">
        <v-btn color="primary" :loading="loading.summary" @click="loadData">
          <v-icon start>mdi-magnify</v-icon>
          Search
        </v-btn>
      </v-col>
    </v-row>

    <!-- Summary Cards -->
    <v-row class="mb-4">
      <v-col v-for="(stat, index) in summaryStats" :key="index" cols="6" md="3">
        <v-card class="summary-card">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold" :class="stat.colorClass">
              {{ stat.value }}
            </div>
            <div class="text-body-2 text-medium-emphasis">{{ stat.label }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Summary Table -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon start>mdi-table</v-icon>
            Daily Summary
          </v-card-title>

          <v-data-table
            :headers="summaryHeaders"
            :items="historicalSummary"
            :loading="loading.summary"
            :items-per-page="10"
            class="elevation-0"
          >
            <template #[`item.periodDate`]="{ item }">
              {{ formatDate(item.periodDate) }}
            </template>
            <template #[`item.department`]="{ item }">
              <v-chip
                size="small"
                :color="item.department === 'bar' ? 'purple' : 'orange'"
                variant="tonal"
              >
                {{ item.department === 'bar' ? 'Bar' : 'Kitchen' }}
              </v-chip>
            </template>
            <template #[`item.avgWaitingSeconds`]="{ item }">
              {{ formatTime(item.avgWaitingSeconds) }}
            </template>
            <template #[`item.avgCookingSeconds`]="{ item }">
              {{ formatTime(item.avgCookingSeconds) }}
            </template>
            <template #[`item.avgTotalSeconds`]="{ item }">
              <span :class="getTotalTimeClass(item)">
                {{ formatTime(item.avgTotalSeconds) }}
              </span>
            </template>
            <template #[`item.exceededRate`]="{ item }">
              <span :class="getExceededClass(item)">{{ getExceededRate(item) }}%</span>
            </template>

            <template #no-data>
              <div class="text-center py-8">
                <v-icon size="48" color="grey">mdi-database-off</v-icon>
                <p class="text-medium-emphasis mt-2">No data for selected period</p>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Detail Section with Tabs -->
    <v-row class="mt-4">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center pa-0">
            <v-tabs v-model="innerTab" density="compact" color="primary">
              <v-tab value="details">
                <v-icon start size="18">mdi-format-list-bulleted</v-icon>
                Item Details
              </v-tab>
              <v-tab value="totals">
                <v-icon start size="18">mdi-chart-bar</v-icon>
                Total Items
              </v-tab>
            </v-tabs>
            <v-spacer />
            <!-- Draft Toggle (for both tabs) -->
            <v-btn
              :variant="showDraft ? 'flat' : 'outlined'"
              :color="showDraft ? 'warning' : 'default'"
              size="small"
              class="mr-2"
              @click="showDraft = !showDraft"
            >
              <v-icon start size="16">
                {{ showDraft ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
              </v-icon>
              Draft
            </v-btn>
            <v-btn
              v-if="innerTab === 'details' && historicalDetail.length > 0"
              size="small"
              variant="text"
              class="mr-2"
              :loading="loading.detail"
              @click="loadMoreDetail"
            >
              Load More
            </v-btn>
          </v-card-title>

          <!-- Item Details Tab -->
          <template v-if="innerTab === 'details'">
            <v-data-table
              :key="`details-${showDraft}`"
              :headers="detailHeaders"
              :items="historicalDetail"
              :loading="loading.detail"
              :items-per-page="20"
              class="elevation-0"
            >
              <template #[`item.orderNumber`]="{ item }">
                <span class="font-weight-medium">{{ item.orderNumber }}</span>
              </template>
              <template #[`item.department`]="{ item }">
                <v-chip
                  size="x-small"
                  :color="item.department === 'bar' ? 'purple' : 'orange'"
                  variant="tonal"
                >
                  {{ item.department === 'bar' ? 'Bar' : 'Kitchen' }}
                </v-chip>
              </template>
              <template #[`item.draftSeconds`]="{ item }">
                <span :class="getDraftTimeClass(item.draftSeconds)">
                  {{ formatTime(item.draftSeconds) }}
                </span>
              </template>
              <template #[`item.waitingSeconds`]="{ item }">
                {{ formatTime(item.waitingSeconds) }}
              </template>
              <template #[`item.cookingSeconds`]="{ item }">
                {{ formatTime(item.cookingSeconds) }}
              </template>
              <template #[`item.totalSeconds`]="{ item }">
                <span :class="getDetailTotalTimeClass(item)">
                  {{ formatTime(getDisplayTotal(item)) }}
                </span>
              </template>
              <template #[`item.exceededPlan`]="{ item }">
                <v-icon :color="item.exceededPlan ? 'error' : 'success'" size="18">
                  {{ item.exceededPlan ? 'mdi-clock-alert-outline' : 'mdi-check-circle-outline' }}
                </v-icon>
              </template>
              <template #[`item.readyAt`]="{ item }">
                {{ formatDateTime(item.readyAt) }}
              </template>

              <template #no-data>
                <div class="text-center py-8">
                  <v-icon size="48" color="grey">mdi-database-off</v-icon>
                  <p class="text-medium-emphasis mt-2">No data for selected period</p>
                </div>
              </template>
            </v-data-table>
          </template>

          <!-- Total Items Tab (Aggregated by Product) -->
          <template v-else-if="innerTab === 'totals'">
            <v-data-table
              :key="`totals-${showDraft}`"
              :headers="totalsHeaders"
              :items="productStats"
              :loading="loading.detail"
              :items-per-page="20"
              class="elevation-0"
            >
              <template #[`item.department`]="{ item }">
                <v-chip
                  size="x-small"
                  :color="item.department === 'bar' ? 'purple' : 'orange'"
                  variant="tonal"
                >
                  {{ item.department === 'bar' ? 'Bar' : 'Kitchen' }}
                </v-chip>
              </template>
              <template #[`item.avgDraftSeconds`]="{ item }">
                <span v-if="showDraft" :class="getDraftTimeClass(item.avgDraftSeconds)">
                  {{ formatTime(item.avgDraftSeconds) }}
                </span>
                <span v-else class="text-medium-emphasis">--</span>
              </template>
              <template #[`item.avgWaitingSeconds`]="{ item }">
                {{ formatTime(item.avgWaitingSeconds) }}
              </template>
              <template #[`item.avgCookingSeconds`]="{ item }">
                {{ formatTime(item.avgCookingSeconds) }}
              </template>
              <template #[`item.avgTotalSeconds`]="{ item }">
                <span :class="getProductTotalTimeClass(item)">
                  {{ formatTime(item.avgTotalSeconds) }}
                </span>
              </template>
              <template #[`item.exceededRate`]="{ item }">
                <span :class="getExceededRateClass(item.exceededRate)">
                  {{ item.exceededCount }} ({{ item.exceededRate }}%)
                </span>
              </template>

              <template #no-data>
                <div class="text-center py-8">
                  <v-icon size="48" color="grey">mdi-chart-bar</v-icon>
                  <p class="text-medium-emphasis mt-2">No data to aggregate</p>
                </div>
              </template>
            </v-data-table>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTimeKpi, PLAN_TIMES } from '@/stores/kitchenKpi/composables'
import { TimeUtils } from '@/utils'
import type { TimeKpiSummaryEntry, TimeKpiDetailEntry } from '@/stores/kitchenKpi/types'

const router = useRouter()

// =============================================
// STATE
// =============================================

const filters = ref({
  dateFrom: TimeUtils.getCurrentLocalDate(),
  dateTo: TimeUtils.getCurrentLocalDate(),
  department: 'all' as 'all' | 'kitchen' | 'bar'
})

const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const detailOffset = ref(0)
const DETAIL_LIMIT = 50

const innerTab = ref<'details' | 'totals'>('details')
const showDraft = ref(false)

// DEBUG: watch showDraft changes
watch(showDraft, newVal => {
  console.log('🔄 showDraft changed:', newVal)
})

// =============================================
// TYPES
// =============================================

interface ProductStat {
  productName: string
  department: string
  count: number
  avgDraftSeconds: number
  avgWaitingSeconds: number
  avgCookingSeconds: number
  avgTotalSeconds: number
  exceededCount: number
  exceededRate: number
}

// =============================================
// COMPOSABLES
// =============================================

const {
  historicalSummary,
  historicalDetail,
  loading,
  loadHistoricalSummary,
  loadHistoricalDetail
} = useTimeKpi()

// =============================================
// COMPUTED
// =============================================

const apiDepartment = computed(() => {
  return filters.value.department === 'all' ? null : filters.value.department
})

const summaryStats = computed(() => {
  if (historicalSummary.value.length === 0) {
    return [
      { label: 'Total Items', value: '0', colorClass: '' },
      { label: 'Avg Total Time', value: '0:00', colorClass: '' },
      { label: 'Exceeded Plan', value: '0', colorClass: '' },
      { label: 'Exceeded Rate', value: '0%', colorClass: '' }
    ]
  }

  const totals = historicalSummary.value.reduce(
    (acc, row) => ({
      itemsCompleted: acc.itemsCompleted + row.itemsCompleted,
      itemsExceededPlan: acc.itemsExceededPlan + row.itemsExceededPlan,
      totalTime: acc.totalTime + row.avgTotalSeconds * row.itemsCompleted
    }),
    { itemsCompleted: 0, itemsExceededPlan: 0, totalTime: 0 }
  )

  const avgTotalSeconds = totals.itemsCompleted > 0 ? totals.totalTime / totals.itemsCompleted : 0
  const exceededRate =
    totals.itemsCompleted > 0
      ? Math.round((totals.itemsExceededPlan / totals.itemsCompleted) * 100)
      : 0

  return [
    { label: 'Total Items', value: totals.itemsCompleted.toString(), colorClass: '' },
    { label: 'Avg Total Time', value: formatTime(avgTotalSeconds), colorClass: '' },
    {
      label: 'Exceeded Plan',
      value: totals.itemsExceededPlan.toString(),
      colorClass: 'text-error'
    },
    {
      label: 'Exceeded Rate',
      value: `${exceededRate}%`,
      colorClass:
        exceededRate > 20 ? 'text-error' : exceededRate > 10 ? 'text-warning' : 'text-success'
    }
  ]
})

/**
 * Get display total for an item (includes draft when showDraft is ON)
 */
const getDisplayTotal = (item: TimeKpiDetailEntry): number => {
  return showDraft.value ? (item.draftSeconds || 0) + item.totalSeconds : item.totalSeconds
}

/**
 * Aggregate statistics by product name + department
 */
const productStats = computed<ProductStat[]>(() => {
  if (historicalDetail.value.length === 0) return []

  const grouped = new Map<
    string,
    {
      productName: string
      department: string
      totalDraft: number
      totalWaiting: number
      totalCooking: number
      totalTime: number
      totalTimeWithDraft: number
      count: number
      exceededCount: number
    }
  >()

  for (const item of historicalDetail.value) {
    const key = `${item.productName}|${item.department}`
    const existing = grouped.get(key)
    const draftSec = item.draftSeconds || 0

    if (existing) {
      existing.totalDraft += draftSec
      existing.totalWaiting += item.waitingSeconds
      existing.totalCooking += item.cookingSeconds
      existing.totalTime += item.totalSeconds
      existing.totalTimeWithDraft += draftSec + item.totalSeconds
      existing.count += 1
      if (item.exceededPlan) existing.exceededCount += 1
    } else {
      grouped.set(key, {
        productName: item.productName,
        department: item.department,
        totalDraft: draftSec,
        totalWaiting: item.waitingSeconds,
        totalCooking: item.cookingSeconds,
        totalTime: item.totalSeconds,
        totalTimeWithDraft: draftSec + item.totalSeconds,
        count: 1,
        exceededCount: item.exceededPlan ? 1 : 0
      })
    }
  }

  const result = Array.from(grouped.values())
    .map(g => ({
      productName: g.productName,
      department: g.department,
      count: g.count,
      avgDraftSeconds: Math.round(g.totalDraft / g.count),
      avgWaitingSeconds: Math.round(g.totalWaiting / g.count),
      avgCookingSeconds: Math.round(g.totalCooking / g.count),
      // Use totalTimeWithDraft when showDraft is ON
      avgTotalSeconds: showDraft.value
        ? Math.round(g.totalTimeWithDraft / g.count)
        : Math.round(g.totalTime / g.count),
      exceededCount: g.exceededCount,
      exceededRate: Math.round((g.exceededCount / g.count) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  console.log(
    '📈 productStats computed:',
    showDraft.value,
    result.length,
    'products',
    result[0]?.avgTotalSeconds
  )
  return result
})

const summaryHeaders = [
  { title: 'Date', key: 'periodDate', sortable: true },
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Items', key: 'itemsCompleted', sortable: true, align: 'end' as const },
  { title: 'Avg Wait', key: 'avgWaitingSeconds', sortable: true, align: 'end' as const },
  { title: 'Avg Cook', key: 'avgCookingSeconds', sortable: true, align: 'end' as const },
  { title: 'Avg Total', key: 'avgTotalSeconds', sortable: true, align: 'end' as const },
  { title: 'Exceeded', key: 'itemsExceededPlan', sortable: true, align: 'end' as const },
  { title: 'Rate', key: 'exceededRate', sortable: false, align: 'end' as const }
]

const detailHeaders = computed(() => {
  const base = [
    { title: 'Order', key: 'orderNumber', sortable: true },
    { title: 'Product', key: 'productName', sortable: true },
    { title: 'Dept', key: 'department', sortable: true }
  ]

  const draftCol = showDraft.value
    ? [{ title: 'Draft', key: 'draftSeconds', sortable: true, align: 'end' as const }]
    : []

  const rest = [
    { title: 'Wait', key: 'waitingSeconds', sortable: true, align: 'end' as const },
    { title: 'Cook', key: 'cookingSeconds', sortable: true, align: 'end' as const },
    { title: 'Total', key: 'totalSeconds', sortable: true, align: 'end' as const },
    { title: 'Status', key: 'exceededPlan', sortable: true, align: 'center' as const },
    { title: 'Ready At', key: 'readyAt', sortable: true }
  ]

  const result = [...base, ...draftCol, ...rest]
  console.log(
    '📊 detailHeaders computed:',
    showDraft.value,
    'columns:',
    result.map(h => h.key)
  )
  return result
})

const totalsHeaders = computed(() => {
  const base = [
    { title: 'Product', key: 'productName', sortable: true },
    { title: 'Dept', key: 'department', sortable: true },
    { title: 'Count', key: 'count', sortable: true, align: 'end' as const }
  ]

  const draftCol = showDraft.value
    ? [{ title: 'Avg Draft', key: 'avgDraftSeconds', sortable: true, align: 'end' as const }]
    : []

  const rest = [
    { title: 'Avg Wait', key: 'avgWaitingSeconds', sortable: true, align: 'end' as const },
    { title: 'Avg Cook', key: 'avgCookingSeconds', sortable: true, align: 'end' as const },
    { title: 'Avg Total', key: 'avgTotalSeconds', sortable: true, align: 'end' as const },
    { title: 'Exceeded', key: 'exceededRate', sortable: false, align: 'end' as const }
  ]

  const result = [...base, ...draftCol, ...rest]
  console.log(
    '📊 totalsHeaders computed:',
    showDraft.value,
    'columns:',
    result.map(h => h.key)
  )
  return result
})

// =============================================
// METHODS
// =============================================

const loadData = async () => {
  detailOffset.value = 0
  await Promise.all([
    loadHistoricalSummary(filters.value.dateFrom, filters.value.dateTo, apiDepartment.value),
    loadHistoricalDetail(
      filters.value.dateFrom,
      filters.value.dateTo,
      apiDepartment.value,
      DETAIL_LIMIT,
      0
    )
  ])
  detailOffset.value = DETAIL_LIMIT
}

const loadMoreDetail = async () => {
  await loadHistoricalDetail(
    filters.value.dateFrom,
    filters.value.dateTo,
    apiDepartment.value,
    DETAIL_LIMIT,
    detailOffset.value
  )
  detailOffset.value += DETAIL_LIMIT
}

const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const formatDate = (dateString: string): string => {
  return TimeUtils.formatDateForDisplay(dateString)
}

const formatDateTime = (dateString: string): string => {
  return TimeUtils.formatDateTimeForDisplay(dateString)
}

const getTotalTimeClass = (item: TimeKpiSummaryEntry): string => {
  const planTime = item.department === 'bar' ? PLAN_TIMES.bar : PLAN_TIMES.kitchen
  if (item.avgTotalSeconds <= planTime) return 'text-success'
  if (item.avgTotalSeconds <= planTime * 1.2) return 'text-warning'
  return 'text-error'
}

const getDetailTotalTimeClass = (item: TimeKpiDetailEntry): string => {
  const planTime = item.department === 'bar' ? PLAN_TIMES.bar : PLAN_TIMES.kitchen
  const displayTotal = getDisplayTotal(item)
  if (displayTotal <= planTime) return 'text-success'
  if (displayTotal <= planTime * 1.2) return 'text-warning'
  return 'text-error'
}

const getProductTotalTimeClass = (stat: ProductStat): string => {
  const planTime = stat.department === 'bar' ? PLAN_TIMES.bar : PLAN_TIMES.kitchen
  if (stat.avgTotalSeconds <= planTime) return 'text-success'
  if (stat.avgTotalSeconds <= planTime * 1.2) return 'text-warning'
  return 'text-error'
}

const getDraftTimeClass = (seconds: number): string => {
  // Draft time thresholds: < 1min OK, 1-3min warning, > 3min error
  if (seconds < 60) return 'text-success'
  if (seconds < 180) return 'text-warning'
  return 'text-error'
}

const getExceededClass = (item: TimeKpiSummaryEntry): string => {
  const rate = item.itemsCompleted > 0 ? (item.itemsExceededPlan / item.itemsCompleted) * 100 : 0
  if (rate === 0) return 'text-success'
  if (rate <= 20) return 'text-warning'
  return 'text-error'
}

const getExceededRate = (item: TimeKpiSummaryEntry): number => {
  return item.itemsCompleted > 0
    ? Math.round((item.itemsExceededPlan / item.itemsCompleted) * 100)
    : 0
}

const getExceededRateClass = (rate: number): string => {
  if (rate === 0) return 'text-success'
  if (rate <= 20) return 'text-warning'
  return 'text-error'
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.kitchen-time-kpi {
  padding: var(--spacing-lg);
}

.summary-card {
  height: 100%;
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
</style>
