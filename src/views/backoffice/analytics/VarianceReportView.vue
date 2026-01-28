<!-- src/views/backoffice/analytics/VarianceReportView.vue -->
<!-- Product Variance Report V2 - With preparation traceability -->

<template>
  <div class="variance-report-view">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-2">Product Variance Report</h1>
          <p class="text-body-2 text-medium-emphasis mb-4">
            <strong>Sales</strong>
            = theoretical usage from orders (decomposed through recipes).
            <strong>Write-offs</strong>
            = actual write-offs from storage.
            <strong>In Preps</strong>
            = products frozen in active preparations.
            <strong>Variance</strong>
            = Opening + Received - Sales - Loss - (Stock + In Preps).
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
          <v-col cols="6" md="2">
            <v-card variant="tonal" color="primary">
              <v-card-text class="pa-3">
                <div class="text-caption">Products</div>
                <div class="text-h6">{{ report.summary.totalProducts }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ report.summary.productsWithActivity }} active
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="2">
            <v-card variant="tonal" color="success">
              <v-card-text class="pa-3">
                <div class="text-caption">Sales</div>
                <div class="text-h6">{{ formatIDR(report.summary.totalSalesAmount) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="2">
            <v-card variant="tonal" color="error">
              <v-card-text class="pa-3">
                <div class="text-caption">Loss</div>
                <div class="text-h6">{{ formatIDR(report.summary.totalLossAmount) }}</div>
                <div class="text-caption text-error">
                  {{ (report.summary.overallLossPercent ?? 0).toFixed(1) }}%
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="2">
            <v-card variant="tonal" color="info">
              <v-card-text class="pa-3">
                <div class="text-caption">In Preps</div>
                <div class="text-h6">{{ formatIDR(report.summary.totalInPrepsAmount ?? 0) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card
              variant="tonal"
              :color="(report.summary.totalVarianceAmount ?? 0) > 0 ? 'warning' : 'error'"
            >
              <v-card-text class="pa-3">
                <div class="text-caption">Total Variance</div>
                <div class="text-h6">
                  {{ (report.summary.totalVarianceAmount ?? 0) > 0 ? '+' : ''
                  }}{{ formatIDR(report.summary.totalVarianceAmount ?? 0) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{
                    (report.summary.totalVarianceAmount ?? 0) > 0
                      ? 'Product surplus'
                      : 'Product shortage'
                  }}
                </div>
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
                  <div class="text-body-2">
                    Sales: {{ formatIDR(report.byDepartment.kitchen.salesAmount) }}
                  </div>
                  <div class="text-body-1 font-weight-medium text-error">
                    Loss: {{ formatIDR(report.byDepartment.kitchen.lossAmount) }} ({{
                      (report.byDepartment.kitchen.lossPercent ?? 0).toFixed(1)
                    }}%)
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
                  <div class="text-body-2">
                    Sales: {{ formatIDR(report.byDepartment.bar.salesAmount) }}
                  </div>
                  <div class="text-body-1 font-weight-medium text-error">
                    Loss: {{ formatIDR(report.byDepartment.bar.lossAmount) }} ({{
                      (report.byDepartment.bar.lossPercent ?? 0).toFixed(1)
                    }}%)
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
              <v-card-title class="d-flex justify-space-between align-center flex-wrap ga-2">
                <span>Product Variance Details</span>
                <div class="d-flex align-center ga-3">
                  <v-checkbox
                    v-model="showOnlyWithVariance"
                    label="Show only with variance"
                    density="compact"
                    hide-details
                    class="flex-grow-0"
                  />
                  <v-text-field
                    v-model="searchQuery"
                    prepend-inner-icon="mdi-magnify"
                    placeholder="Search products..."
                    variant="outlined"
                    density="compact"
                    hide-details
                    clearable
                    style="min-width: 300px"
                  />
                </div>
              </v-card-title>
              <v-divider />
              <v-data-table
                :headers="tableHeaders"
                :items="filteredItems"
                :items-per-page="50"
                :search="searchQuery"
                :sort-by="[{ key: 'variance.amount', order: 'desc' }]"
                density="comfortable"
                class="elevation-0 clickable-rows sticky-header-table"
                :row-props="getRowProps"
                fixed-header
                height="600"
                @click:row="handleRowClick"
              >
                <!-- Product Name Column -->
                <template #[`item.productName`]="{ item }">
                  <div class="d-flex align-center">
                    <v-icon
                      v-if="item.hasPreparations"
                      size="small"
                      color="primary"
                      class="mr-1"
                      title="Used in preparations"
                    >
                      mdi-food-variant
                    </v-icon>
                    <div>
                      <span class="font-weight-medium">{{ item.productName }}</span>
                      <div v-if="item.productCode" class="text-caption text-medium-emphasis">
                        {{ item.productCode }}
                      </div>
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

                <!-- Opening Stock Column -->
                <template #[`item.opening.amount`]="{ item }">
                  <div v-if="item.opening.quantity > 0" class="stacked-cell">
                    <div class="text-body-2">
                      {{ formatQty(item.opening.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.opening.amount) }}
                    </div>
                  </div>
                  <span v-else class="text-medium-emphasis">—</span>
                </template>

                <!-- Received Column -->
                <template #[`item.received.amount`]="{ item }">
                  <div v-if="item.received.quantity > 0" class="stacked-cell">
                    <div class="text-body-2 text-success">
                      +{{ formatQty(item.received.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.received.amount) }}
                    </div>
                  </div>
                  <span v-else class="text-medium-emphasis">—</span>
                </template>

                <!-- Sales Column (Theoretical from orders) -->
                <template #[`item.sales.amount`]="{ item }">
                  <div v-if="item.sales.quantity > 0" class="stacked-cell">
                    <div class="text-body-2">
                      {{ formatQty(item.sales.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.sales.amount) }}
                    </div>
                  </div>
                  <span v-else class="text-medium-emphasis">—</span>
                </template>

                <!-- Write-offs Column (Actual from storage_operations) -->
                <template #[`item.writeoffs.amount`]="{ item }">
                  <div v-if="(item.writeoffs?.quantity ?? 0) > 0" class="stacked-cell">
                    <div class="text-body-2">
                      {{ formatQty(item.writeoffs?.quantity ?? 0, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.writeoffs?.amount ?? 0) }}
                    </div>
                    <!-- Show difference only if both Sales and Write-offs have values -->
                    <div
                      v-if="
                        item.sales.amount > 0 && Math.abs(item.salesWriteoffDiff?.amount ?? 0) > 100
                      "
                      class="text-caption"
                      :class="
                        (item.salesWriteoffDiff?.amount ?? 0) > 0 ? 'text-warning' : 'text-info'
                      "
                    >
                      {{ (item.salesWriteoffDiff?.amount ?? 0) > 0 ? '+' : ''
                      }}{{ formatIDR(item.salesWriteoffDiff?.amount ?? 0) }}
                    </div>
                  </div>
                  <span v-else class="text-medium-emphasis">—</span>
                </template>

                <!-- Loss Column (Stacked: Direct + Traced) -->
                <template #[`item.loss.amount`]="{ item }">
                  <div class="stacked-cell">
                    <div class="text-body-2" :class="{ 'text-error': item.loss.quantity > 0 }">
                      {{ formatQty(item.loss.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.loss.amount) }}
                    </div>
                    <div
                      v-if="item.hasPreparations && item.tracedLoss.amount > 0"
                      class="text-caption text-error"
                    >
                      ({{ formatIDR(item.tracedLoss.amount) }} traced)
                    </div>
                  </div>
                </template>

                <!-- Stock (Closing) Column -->
                <template #[`item.closing.amount`]="{ item }">
                  <div v-if="item.closing.quantity > 0" class="stacked-cell">
                    <div class="text-body-2 font-weight-medium">
                      {{ formatQty(item.closing.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.closing.amount) }}
                    </div>
                  </div>
                  <span v-else class="text-medium-emphasis">—</span>
                </template>

                <!-- In Preps Column (products frozen in preparation batches) -->
                <template #[`item.inPreps.amount`]="{ item }">
                  <div v-if="(item.inPreps?.quantity ?? 0) > 0" class="stacked-cell">
                    <div class="text-body-2 text-info">
                      {{ formatQty(item.inPreps?.quantity ?? 0, item.unit) }} {{ item.unit }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.inPreps?.amount ?? 0) }}
                    </div>
                  </div>
                  <span v-else class="text-medium-emphasis">—</span>
                </template>

                <!-- Variance Column (positive = surplus, negative = shortage) -->
                <template #[`item.variance.amount`]="{ item }">
                  <div v-if="Math.abs(item.variance.amount) > 0.01" class="stacked-cell">
                    <div
                      class="text-body-2 font-weight-bold"
                      :class="item.variance.amount > 0 ? 'text-warning' : 'text-error'"
                    >
                      {{ item.variance.amount > 0 ? '+' : ''
                      }}{{ formatQty(item.variance.quantity, item.unit) }} {{ item.unit }}
                    </div>
                    <div
                      class="text-caption"
                      :class="item.variance.amount > 0 ? 'text-warning' : 'text-error'"
                    >
                      {{ item.variance.amount > 0 ? '+' : '' }}{{ formatIDR(item.variance.amount) }}
                    </div>
                  </div>
                  <span v-else class="text-success font-weight-medium">OK</span>
                </template>

                <!-- Loss Percent Column -->
                <template #[`item.lossPercent`]="{ item }">
                  <span
                    v-if="(item.lossPercent ?? 0) > 0"
                    class="font-weight-medium"
                    :class="getLossPercentClass(item.lossPercent ?? 0)"
                  >
                    {{ (item.lossPercent ?? 0).toFixed(1) }}%
                  </span>
                  <span v-else class="text-medium-emphasis">—</span>
                </template>

                <!-- Actions Column -->
                <template #[`item.actions`]="{ item }">
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="primary"
                    @click.stop="openDetailDialog(item)"
                  >
                    <v-icon>mdi-information-outline</v-icon>
                    <v-tooltip activator="parent" location="top">View variance breakdown</v-tooltip>
                  </v-btn>
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

    <!-- Product Detail Dialog V2 -->
    <ProductVarianceDetailDialogV2
      v-model="showDetailDialog"
      :product-id="selectedProductId"
      :date-from="dateFrom"
      :date-to="dateTo"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useVarianceReportStore } from '@/stores/analytics/varianceReportStore'
import { formatIDR } from '@/utils/currency'
import type { ProductVarianceRowV2 } from '@/stores/analytics/types'
import ProductVarianceDetailDialogV2 from './ProductVarianceDetailDialogV2.vue'

// Store
const store = useVarianceReportStore()

// State
const dateFrom = ref('')
const dateTo = ref('')
const departmentFilter = ref<'all' | 'kitchen' | 'bar'>('all')
const searchQuery = ref('')
const showOnlyWithVariance = ref(false)
const error = ref<string | null>(null)
const showDetailDialog = ref(false)
const selectedProductId = ref<string | null>(null)

// Computed
const loading = computed(() => store.loading)
const report = computed(() => store.currentReportV2)

const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const tableHeaders = [
  { title: 'Product', key: 'productName', sortable: true, width: '140px' },
  { title: 'Dept', key: 'department', sortable: true, width: '65px' },
  { title: 'Opening', key: 'opening.amount', sortable: true, width: '85px' },
  { title: 'Received', key: 'received.amount', sortable: true, width: '85px' },
  { title: 'Sales', key: 'sales.amount', sortable: true, width: '85px' },
  { title: 'Write-offs', key: 'writeoffs.amount', sortable: true, width: '85px' },
  { title: 'Loss', key: 'loss.amount', sortable: true, width: '80px' },
  { title: 'Stock', key: 'closing.amount', sortable: true, width: '80px' },
  { title: 'In Preps', key: 'inPreps.amount', sortable: true, width: '80px' },
  { title: 'Variance', key: 'variance.amount', sortable: true, width: '90px' },
  { title: 'Loss %', key: 'lossPercent', sortable: true, width: '60px' },
  { title: '', key: 'actions', sortable: false, width: '40px' }
]

const filteredItems = computed(() => {
  if (!report.value) return []

  let items = report.value.items

  // Filter by department (client-side, no reload)
  if (departmentFilter.value !== 'all') {
    items = items.filter(item => item.department === departmentFilter.value)
  }

  // Filter only items with variance
  if (showOnlyWithVariance.value) {
    items = items.filter(item => Math.abs(item.variance.amount) > 0.01)
  }

  return items
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

function getLossPercentClass(percent: number): string {
  if (percent <= 5) return 'text-success'
  if (percent <= 15) return 'text-warning'
  return 'text-error'
}

/**
 * Get row styling based on variance severity
 * Positive variance = surplus (more product than expected)
 * Negative variance = shortage (less product than expected - theft, unrecorded usage)
 */
function getRowProps({ item }: { item: ProductVarianceRowV2 }) {
  const varianceAmount = Math.abs(item.variance?.amount ?? 0)

  if (varianceAmount < 0.01) {
    return {} // No variance - normal row
  }

  // Critical: variance > 100,000 IDR
  if (varianceAmount > 100000) {
    return { class: 'row-critical' }
  }

  // Warning: variance > 10,000 IDR
  if (varianceAmount > 10000) {
    return { class: 'row-warning' }
  }

  // Minor variance
  return { class: 'row-minor' }
}

async function handleGenerateReport() {
  try {
    error.value = null
    // Always load all departments, filter on client side
    await store.generateReportV2(dateFrom.value, dateTo.value, null)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate report'
  }
}

function handleExportCSV() {
  if (report.value) {
    store.downloadCSVV2(report.value)
  }
}

function handleRowClick(_event: Event, { item }: { item: ProductVarianceRowV2 }) {
  // V2 dialog works for all products, not just those with preparations
  openDetailDialog(item)
}

function openDetailDialog(item: ProductVarianceRowV2) {
  selectedProductId.value = item.productId
  showDetailDialog.value = true
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

  // Sticky header table - header stays fixed when scrolling inside table
  .sticky-header-table {
    :deep(thead th) {
      background-color: rgb(var(--v-theme-surface)) !important;
    }
  }

  .clickable-rows :deep(tbody tr) {
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
      background-color: rgba(var(--v-theme-primary), 0.04);
    }

    // Row highlighting based on variance severity
    &.row-critical {
      background-color: rgba(var(--v-theme-error), 0.12);

      &:hover {
        background-color: rgba(var(--v-theme-error), 0.18);
      }
    }

    &.row-warning {
      background-color: rgba(var(--v-theme-warning), 0.1);

      &:hover {
        background-color: rgba(var(--v-theme-warning), 0.16);
      }
    }

    &.row-minor {
      background-color: rgba(var(--v-theme-warning), 0.04);

      &:hover {
        background-color: rgba(var(--v-theme-warning), 0.08);
      }
    }
  }
}
</style>
