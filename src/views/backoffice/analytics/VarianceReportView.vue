<!-- src/views/backoffice/analytics/VarianceReportView.vue -->
<!-- Product Variance Report - Analyzes discrepancies between purchases and usage -->

<template>
  <div class="variance-report-view">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-2">Product Variance Report</h1>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Analyze discrepancies between purchases and product usage. Helps identify recipe errors
            during menu actualization.
          </p>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row class="mb-4">
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
          <v-select
            v-model="departmentFilter"
            label="Department"
            :items="departmentOptions"
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
            variant="outlined"
            size="large"
            block
            prepend-icon="mdi-download"
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
        <v-col cols="12" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p class="mt-4 text-medium-emphasis">Generating report...</p>
        </v-col>
      </v-row>

      <!-- Report Content -->
      <template v-if="report && !loading">
        <!-- Summary Cards -->
        <v-row class="mb-4">
          <v-col cols="12" md="3">
            <v-card variant="tonal" color="primary">
              <v-card-text>
                <div class="text-caption">Total Products</div>
                <div class="text-h5">{{ report.summary.totalProducts }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card variant="tonal" color="warning">
              <v-card-text>
                <div class="text-caption">Products with Variance</div>
                <div class="text-h5">{{ report.summary.productsWithVariance }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card
              variant="tonal"
              :color="report.summary.totalVarianceAmount < 0 ? 'error' : 'success'"
            >
              <v-card-text>
                <div class="text-caption">Total Variance</div>
                <div class="text-h5">{{ formatIDR(report.summary.totalVarianceAmount) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="3">
            <v-card variant="tonal" color="info">
              <v-card-text>
                <div class="text-caption">Total Received</div>
                <div class="text-h5">{{ formatIDR(report.summary.totalReceivedAmount) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Department Breakdown -->
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-text class="d-flex align-center justify-space-between">
                <div>
                  <v-icon color="orange" class="mr-2">mdi-chef-hat</v-icon>
                  <span class="font-weight-medium">Kitchen</span>
                </div>
                <div class="text-right">
                  <div class="text-body-2 text-medium-emphasis">
                    {{ report.byDepartment.kitchen.count }} products
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    Variance: {{ formatIDR(report.byDepartment.kitchen.varianceAmount) }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-text class="d-flex align-center justify-space-between">
                <div>
                  <v-icon color="purple" class="mr-2">mdi-glass-cocktail</v-icon>
                  <span class="font-weight-medium">Bar</span>
                </div>
                <div class="text-right">
                  <div class="text-body-2 text-medium-emphasis">
                    {{ report.byDepartment.bar.count }} products
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    Variance: {{ formatIDR(report.byDepartment.bar.varianceAmount) }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Data Table -->
        <v-row>
          <v-col cols="12">
            <v-card variant="outlined">
              <v-card-title class="d-flex justify-space-between align-center">
                <span>Product Variance Details</span>
                <v-text-field
                  v-model="searchQuery"
                  prepend-inner-icon="mdi-magnify"
                  label="Search products"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                  style="max-width: 300px"
                />
              </v-card-title>
              <v-divider />
              <v-data-table
                :headers="tableHeaders"
                :items="filteredItems"
                :items-per-page="50"
                :search="searchQuery"
                :sort-by="[{ key: 'variance.amount', order: 'desc' }]"
                density="comfortable"
                class="elevation-0"
              >
                <!-- Product Name Column -->
                <template #[`item.productName`]="{ item }">
                  <div>
                    <span class="font-weight-medium">{{ item.productName }}</span>
                    <div v-if="item.productCode" class="text-caption text-medium-emphasis">
                      {{ item.productCode }}
                    </div>
                  </div>
                </template>

                <!-- Department Column -->
                <template #[`item.department`]="{ item }">
                  <v-chip
                    :color="item.department === 'kitchen' ? 'orange' : 'purple'"
                    size="small"
                    variant="tonal"
                  >
                    {{ item.department === 'kitchen' ? 'Kitchen' : 'Bar' }}
                  </v-chip>
                </template>

                <!-- Opening Stock Column (Stacked) -->
                <template #[`item.openingStock.amount`]="{ item }">
                  <div class="stacked-cell">
                    <div class="text-body-2">
                      {{ formatQty(item.openingStock.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.openingStock.amount) }}
                    </div>
                  </div>
                </template>

                <!-- Received Column (Stacked) -->
                <template #[`item.received.amount`]="{ item }">
                  <div class="stacked-cell">
                    <div class="text-body-2 text-success">
                      {{ formatQty(item.received.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.received.amount) }}
                    </div>
                  </div>
                </template>

                <!-- Sales Write-off Column (Stacked) -->
                <template #[`item.salesWriteOff.amount`]="{ item }">
                  <div class="stacked-cell">
                    <div class="text-body-2">
                      {{ formatQty(item.salesWriteOff.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.salesWriteOff.amount) }}
                    </div>
                  </div>
                </template>

                <!-- Prep Write-off Column (Stacked) -->
                <template #[`item.prepWriteOff.amount`]="{ item }">
                  <div class="stacked-cell">
                    <div class="text-body-2">
                      {{ formatQty(item.prepWriteOff.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.prepWriteOff.amount) }}
                    </div>
                  </div>
                </template>

                <!-- Loss Write-off Column (Stacked) -->
                <template #[`item.lossWriteOff.amount`]="{ item }">
                  <div class="stacked-cell">
                    <div
                      class="text-body-2"
                      :class="{ 'text-error': item.lossWriteOff.quantity > 0 }"
                    >
                      {{ formatQty(item.lossWriteOff.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.lossWriteOff.amount) }}
                    </div>
                  </div>
                </template>

                <!-- Loss Percent Column -->
                <template #[`item.lossPercent`]="{ item }">
                  <span
                    v-if="item.lossPercent !== null"
                    class="font-weight-medium"
                    :class="getLossPercentClass(item.lossPercent)"
                  >
                    {{ Math.round(item.lossPercent) }}%
                  </span>
                  <span v-else class="text-medium-emphasis">—</span>
                </template>

                <!-- Closing Stock Column (Stacked) -->
                <template #[`item.closingStock.amount`]="{ item }">
                  <div class="stacked-cell">
                    <div class="text-body-2">
                      {{ formatQty(item.closingStock.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.closingStock.amount) }}
                    </div>
                  </div>
                </template>

                <!-- Variance Column (Stacked) -->
                <template #[`item.variance.amount`]="{ item }">
                  <div class="stacked-cell">
                    <div
                      class="text-body-2 font-weight-bold"
                      :class="getVarianceClass(item.variance.amount)"
                    >
                      {{ formatQty(item.variance.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div
                      class="text-caption font-weight-medium"
                      :class="getVarianceClass(item.variance.amount)"
                    >
                      {{ formatIDR(item.variance.amount) }}
                    </div>
                  </div>
                </template>
              </v-data-table>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <!-- Empty State -->
      <v-row v-if="!report && !loading && !error">
        <v-col cols="12" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-bar-stacked</v-icon>
          <h3 class="text-h6 text-grey">No Report Generated</h3>
          <p class="text-body-2 text-grey">
            Select a date range and click "Generate" to create a variance report
          </p>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVarianceReportStore } from '@/stores/analytics/varianceReportStore'
import { formatIDR } from '@/utils/currency'
import type { VarianceReport, ProductVarianceRow } from '@/stores/analytics/types'

// Store
const store = useVarianceReportStore()

// State
const dateFrom = ref('')
const dateTo = ref('')
const departmentFilter = ref<'all' | 'kitchen' | 'bar'>('all')
const searchQuery = ref('')
const error = ref<string | null>(null)

// Computed
const loading = computed(() => store.loading)
const report = computed(() => store.currentReport)

const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const tableHeaders = [
  { title: 'Product', key: 'productName', sortable: true, width: '180px' },
  { title: 'Dept', key: 'department', sortable: true, width: '90px' },
  { title: 'Opening', key: 'openingStock.amount', sortable: true, width: '110px' },
  { title: 'Received', key: 'received.amount', sortable: true, width: '110px' },
  { title: 'Sales W/O', key: 'salesWriteOff.amount', sortable: true, width: '110px' },
  { title: 'Prep W/O', key: 'prepWriteOff.amount', sortable: true, width: '110px' },
  { title: 'Loss W/O', key: 'lossWriteOff.amount', sortable: true, width: '110px' },
  { title: 'Loss %', key: 'lossPercent', sortable: true, width: '80px' },
  { title: 'Closing', key: 'closingStock.amount', sortable: true, width: '110px' },
  { title: 'Variance', key: 'variance.amount', sortable: true, width: '120px' }
]

const filteredItems = computed(() => {
  if (!report.value) return []

  // Filter by department (client-side, no reload)
  let items = report.value.items
  if (departmentFilter.value !== 'all') {
    items = items.filter(item => item.department === departmentFilter.value)
  }

  // Add lossPercent calculation to each item
  return items.map(item => ({
    ...item,
    // Loss % = (Prep W/O + Loss W/O) / Sales W/O × 100
    lossPercent:
      item.salesWriteOff.amount > 0
        ? ((item.prepWriteOff.amount + item.lossWriteOff.amount) / item.salesWriteOff.amount) * 100
        : null
  }))
})

// Methods
function formatQty(value: number, unit: string): string {
  if (Math.abs(value) < 0.001) return '0'

  // gram, ml - целые числа
  // ps (pieces) - максимум 1 знак после запятой
  const isWholeUnit = ['gram', 'g', 'ml', 'kg', 'l', 'liter'].includes(unit.toLowerCase())
  const maxDecimals = isWholeUnit ? 0 : 1

  return value.toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0
  })
}

function getVarianceClass(amount: number): string {
  if (Math.abs(amount) < 0.01) return 'text-success'
  if (amount < 0) return 'text-error'
  return 'text-warning'
}

function getLossPercentClass(percent: number): string {
  if (percent <= 5) return 'text-success'
  if (percent <= 15) return 'text-warning'
  return 'text-error'
}

async function handleGenerateReport() {
  try {
    error.value = null
    // Always load all departments, filter on client side
    await store.generateReport(dateFrom.value, dateTo.value, null)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate report'
  }
}

function handleExportCSV() {
  if (report.value) {
    store.downloadCSV(report.value)
  }
}

// Initialize with current month
onMounted(() => {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  dateFrom.value = firstDay.toISOString().split('T')[0]
  dateTo.value = lastDay.toISOString().split('T')[0]
})
</script>

<style scoped lang="scss">
.variance-report-view {
  .stacked-cell {
    line-height: 1.3;
    padding: 4px 0;
  }
}
</style>
