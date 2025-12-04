<!-- src/views/backoffice/analytics/RevenueDashboardView.vue -->
<!-- Sprint 7 Phase 3: Revenue Dashboard with Discount & Tax Analytics -->

<template>
  <div class="revenue-dashboard-view">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-4">Revenue Dashboard</h1>
          <p class="text-body-2 text-grey">
            Comprehensive revenue analysis with planned vs actual revenue, discounts, and taxes
          </p>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row>
        <v-col cols="12" md="3">
          <v-text-field
            v-model="dateFrom"
            label="Date From"
            type="date"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
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
          <v-btn
            color="primary"
            size="large"
            :loading="loading"
            :disabled="!dateFrom || !dateTo"
            block
            @click="handleGenerateReport"
          >
            Generate
          </v-btn>
        </v-col>
        <v-col cols="12" md="2">
          <v-btn
            v-if="report"
            color="secondary"
            size="large"
            variant="outlined"
            block
            @click="handleExportCSV"
          >
            Export CSV
          </v-btn>
        </v-col>
      </v-row>

      <!-- Error Message -->
      <v-row v-if="error">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable @click:close="error = null">
            {{ error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <v-row v-if="loading">
        <v-col cols="12" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p class="text-body-1 mt-4">Generating revenue report...</p>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-if="!report && !loading && !error">
        <v-col cols="12" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-1">mdi-chart-line</v-icon>
          <p class="text-h6 mt-4 text-grey">No Report Generated</p>
          <p class="text-body-2 text-grey">
            Select a date range and click "Generate" to view revenue analytics
          </p>
        </v-col>
      </v-row>

      <!-- Dashboard Content -->
      <template v-if="report && !loading">
        <!-- Revenue Metrics Cards -->
        <v-row>
          <v-col cols="12" md="3">
            <v-card color="info" variant="tonal">
              <v-card-text>
                <div class="text-caption">Planned Revenue</div>
                <div class="text-h5">{{ formatIDR(report.plannedRevenue) }}</div>
                <div class="text-caption">Before discounts</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="3">
            <v-card color="primary" variant="tonal">
              <v-card-text>
                <div class="text-caption">Actual Revenue</div>
                <div class="text-h5">{{ formatIDR(report.actualRevenue) }}</div>
                <div class="text-caption">After discounts, before tax</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="3">
            <v-card color="success" variant="tonal">
              <v-card-text>
                <div class="text-caption">Total Collected</div>
                <div class="text-h5">{{ formatIDR(report.totalCollected) }}</div>
                <div class="text-caption">With taxes included</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="3">
            <v-card color="warning" variant="tonal">
              <v-card-text>
                <div class="text-caption">Total Discounts</div>
                <div class="text-h5">{{ formatIDR(report.totalDiscounts) }}</div>
                <div class="text-caption">{{ discountRate.toFixed(1) }}% of planned revenue</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Discount & Tax Breakdown -->
        <v-row>
          <!-- Discount Breakdown Card -->
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="bg-warning-lighten-4">
                <v-icon start>mdi-sale</v-icon>
                Discount Breakdown
              </v-card-title>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="6">
                    <div class="text-caption text-grey">Total Discounts</div>
                    <div class="text-h6">{{ formatIDR(report.totalDiscounts) }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-caption text-grey">Discount Count</div>
                    <div class="text-h6">{{ report.discountCount }} events</div>
                  </v-col>
                </v-row>
                <v-divider class="my-3" />
                <v-row>
                  <v-col cols="6">
                    <div class="text-caption text-grey">Average Discount</div>
                    <div class="text-body-1">
                      {{ formatIDR(averageDiscount) }}
                    </div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-caption text-grey">Discount Rate</div>
                    <div class="text-body-1">
                      {{ ordersWithDiscountRate.toFixed(1) }}% of orders
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Tax Collection Card -->
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="bg-success-lighten-4">
                <v-icon start>mdi-receipt-text</v-icon>
                Tax Collection
              </v-card-title>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12">
                    <div class="text-caption text-grey">Total Taxes Collected</div>
                    <div class="text-h6">{{ formatIDR(report.totalTaxes) }}</div>
                  </v-col>
                </v-row>
                <v-divider class="my-3" />
                <v-list density="compact">
                  <v-list-item v-for="tax in report.taxBreakdown" :key="tax.taxId" class="px-0">
                    <template #prepend>
                      <v-icon size="small">mdi-checkbox-marked-circle</v-icon>
                    </template>
                    <v-list-item-title>{{ tax.name }} ({{ tax.percentage }}%)</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ formatIDR(tax.amount) }}
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-if="report.taxBreakdown.length === 0" class="px-0">
                    <v-list-item-title class="text-grey">
                      No taxes collected in this period
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Order Statistics -->
        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title class="bg-primary-lighten-4">
                <v-icon start>mdi-chart-bar</v-icon>
                Order Statistics
              </v-card-title>
              <v-card-text class="pa-4">
                <v-row>
                  <v-col cols="12" md="4">
                    <div class="text-caption text-grey">Total Orders</div>
                    <div class="text-h6">{{ report.orderCount }}</div>
                    <div class="text-caption">Completed orders in period</div>
                  </v-col>
                  <v-col cols="12" md="4">
                    <div class="text-caption text-grey">Average Order Value</div>
                    <div class="text-h6">{{ formatIDR(report.averageOrderValue) }}</div>
                    <div class="text-caption">Total collected per order</div>
                  </v-col>
                  <v-col cols="12" md="4">
                    <div class="text-caption text-grey">Discount Rate</div>
                    <div class="text-h6">{{ discountRate.toFixed(1) }}%</div>
                    <div class="text-caption">Of planned revenue</div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDiscountAnalytics } from '@/stores/discounts'
import { useDiscountsStore } from '@/stores/discounts'
import { useSalesStore } from '@/stores/sales'
import type { DailyRevenueReport } from '@/stores/discounts'
import { formatIDR } from '@/utils'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'RevenueDashboardView'

// State
const dateFrom = ref<string>('')
const dateTo = ref<string>('')
const loading = ref(false)
const error = ref<string | null>(null)
const report = ref<DailyRevenueReport | null>(null)

// Composables
const { getDailyRevenueReport } = useDiscountAnalytics()

// Computed
const discountRate = computed(() => {
  if (!report.value || report.value.plannedRevenue === 0) return 0
  return (report.value.totalDiscounts / report.value.plannedRevenue) * 100
})

const averageDiscount = computed(() => {
  if (!report.value || report.value.discountCount === 0) return 0
  return report.value.totalDiscounts / report.value.discountCount
})

const ordersWithDiscountRate = computed(() => {
  if (!report.value || report.value.orderCount === 0) return 0
  return (report.value.ordersWithDiscountCount / report.value.orderCount) * 100
})

// Methods
async function handleGenerateReport() {
  if (!dateFrom.value || !dateTo.value) {
    error.value = 'Please select both start and end dates'
    return
  }

  try {
    loading.value = true
    error.value = null

    DebugUtils.info(MODULE_NAME, '🚀 Starting revenue report generation', {
      dateFrom: dateFrom.value,
      dateTo: dateTo.value
    })

    // DEBUG: Check if discountsStore is available
    const discountsStore = useDiscountsStore()
    DebugUtils.info(MODULE_NAME, '💰 DiscountsStore check', {
      storeExists: !!discountsStore,
      initialized: discountsStore?.initialized,
      eventsCount: discountsStore?.discountEvents?.length || 0
    })

    // DEBUG: Check if salesStore is available
    const salesStore = useSalesStore()
    DebugUtils.info(MODULE_NAME, '📦 SalesStore check', {
      storeExists: !!salesStore,
      initialized: salesStore?.initialized,
      transactionsCount: salesStore?.transactions?.length || 0
    })

    report.value = await getDailyRevenueReport(dateFrom.value, dateTo.value)

    DebugUtils.store(MODULE_NAME, '✅ Revenue report generated successfully', {
      plannedRevenue: report.value.plannedRevenue,
      actualRevenue: report.value.actualRevenue,
      totalCollected: report.value.totalCollected,
      orderCount: report.value.orderCount,
      discountCount: report.value.discountCount,
      totalDiscounts: report.value.totalDiscounts,
      reportObject: report.value
    })

    if (report.value.orderCount === 0) {
      DebugUtils.error(MODULE_NAME, '⚠️ REPORT HAS ZERO ORDERS!', {
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
        report: report.value
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to generate revenue report', { error: err })
    error.value = err instanceof Error ? err.message : 'Failed to generate report'
  } finally {
    loading.value = false
  }
}

function handleExportCSV() {
  if (!report.value) return

  try {
    DebugUtils.info(MODULE_NAME, 'Exporting revenue report to CSV')

    // Create CSV content
    const rows: string[] = []

    // Header
    rows.push('Revenue Dashboard Report')
    rows.push(`Date Range,${dateFrom.value} to ${dateTo.value}`)
    rows.push('')

    // Revenue Metrics
    rows.push('Revenue Metrics')
    rows.push('Metric,Amount')
    rows.push(`Planned Revenue,${report.value.plannedRevenue}`)
    rows.push(`Actual Revenue,${report.value.actualRevenue}`)
    rows.push(`Total Collected,${report.value.totalCollected}`)
    rows.push(`Total Discounts,${report.value.totalDiscounts}`)
    rows.push(`Discount Rate,${discountRate.value.toFixed(2)}%`)
    rows.push('')

    // Tax Breakdown
    rows.push('Tax Breakdown')
    rows.push('Tax Type,Percentage,Amount')
    report.value.taxBreakdown.forEach(tax => {
      rows.push(`${tax.name},${tax.percentage}%,${tax.amount}`)
    })
    rows.push(`Total Taxes,,${report.value.totalTaxes}`)
    rows.push('')

    // Order Statistics
    rows.push('Order Statistics')
    rows.push('Metric,Value')
    rows.push(`Total Orders,${report.value.orderCount}`)
    rows.push(`Average Order Value,${report.value.averageOrderValue.toFixed(0)}`)
    rows.push(`Discount Count,${report.value.discountCount}`)
    rows.push(`Average Discount,${averageDiscount.value.toFixed(0)}`)
    rows.push(`Orders with Discounts Rate,${ordersWithDiscountRate.value.toFixed(2)}%`)

    const csvContent = rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `revenue-report-${dateFrom.value}-to-${dateTo.value}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    DebugUtils.store(MODULE_NAME, 'Revenue report exported to CSV')
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to export CSV', { error: err })
    error.value = 'Failed to export report'
  }
}

function initializeDates() {
  // Initialize with last 7 days
  const today = TimeUtils.getCurrentLocalISO().split('T')[0]
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  dateFrom.value = sevenDaysAgo.toISOString().split('T')[0]
  dateTo.value = today

  DebugUtils.info(MODULE_NAME, 'Initialized with last 7 days', {
    dateFrom: dateFrom.value,
    dateTo: dateTo.value
  })
}

// Lifecycle
onMounted(() => {
  initializeDates()
})
</script>

<style scoped lang="scss">
.revenue-dashboard-view {
  min-height: 100vh;
}

.v-card-title {
  font-weight: 600;
}

.v-list-item {
  min-height: 36px;
}
</style>
