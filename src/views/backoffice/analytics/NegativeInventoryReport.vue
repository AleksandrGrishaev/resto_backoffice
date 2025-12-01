<!-- src/views/backoffice/analytics/NegativeInventoryReport.vue -->
<!-- ✅ SPRINT 3: Negative Inventory Report UI Component -->

<template>
  <div class="negative-inventory-report">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-4">Negative Inventory Report</h1>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Track negative batch events and their financial impact from sales and production
            operations
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
          <v-select
            v-model="statusFilter"
            label="Status"
            :items="statusOptions"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-select
            v-model="typeFilter"
            label="Item Type"
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
            @click="handleGenerateReport"
          >
            Generate Report
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

      <!-- Report Content -->
      <v-row v-if="report && !loading">
        <!-- Summary Cards -->
        <v-col cols="12">
          <v-row class="mb-4">
            <v-col cols="12" md="3">
              <v-card color="warning" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Total Items Affected</div>
                  <div class="text-h5">{{ report.summary.totalItems }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="error" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Total Events</div>
                  <div class="text-h5">{{ report.summary.totalEvents }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="error" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Cost Impact</div>
                  <div class="text-h5">{{ formatIDR(report.summary.totalCostImpact) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="warning" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Unreconciled Batches</div>
                  <div class="text-h5">{{ report.summary.unreconciledBatches }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>

        <!-- Data Table -->
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-title class="d-flex justify-space-between align-center">
              <span>Negative Inventory Events</span>
              <div>
                <v-btn
                  color="secondary"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-download"
                  @click="handleExportCSV"
                >
                  Export CSV
                </v-btn>
              </div>
            </v-card-title>
            <v-divider />
            <v-data-table
              :headers="tableHeaders"
              :items="filteredItems"
              :items-per-page="20"
              :sort-by="[{ key: 'eventDate', order: 'desc' }]"
              density="comfortable"
              class="elevation-0"
            >
              <!-- Item Name Column -->
              <template #[`item.itemName`]="{ item }">
                <div class="d-flex align-center">
                  <v-chip
                    :color="item.itemType === 'product' ? 'primary' : 'secondary'"
                    size="x-small"
                    class="mr-2"
                  >
                    {{ item.itemType === 'product' ? 'P' : 'R' }}
                  </v-chip>
                  <span class="font-weight-medium">{{ item.itemName }}</span>
                </div>
              </template>

              <!-- Department Column -->
              <template #[`item.department`]="{ item }">
                <v-chip :color="getDepartmentColor(item.department)" size="small" variant="tonal">
                  {{ getDepartmentLabel(item.department) }}
                </v-chip>
              </template>

              <!-- Event Date Column -->
              <template #[`item.eventDate`]="{ item }">
                {{ formatDate(item.eventDate) }}
              </template>

              <!-- Negative Quantity Column -->
              <template #[`item.negativeQuantity`]="{ item }">
                <span class="text-error font-weight-medium">
                  -{{ item.negativeQuantity.toFixed(2) }} {{ item.unit }}
                </span>
              </template>

              <!-- Cost Column -->
              <template #[`item.totalCost`]="{ item }">
                <span class="text-error font-weight-medium">
                  {{ formatIDR(item.totalCost) }}
                </span>
              </template>

              <!-- Status Column -->
              <template #[`item.status`]="{ item }">
                <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
                  {{ getStatusLabel(item.status) }}
                </v-chip>
              </template>

              <!-- Actions Column -->
              <template #[`item.actions`]="{ item }">
                <div class="d-flex align-center">
                  <v-btn
                    icon="mdi-information"
                    size="x-small"
                    variant="text"
                    @click="showItemDetails(item)"
                  />
                </div>
              </template>
            </v-data-table>
          </v-card>
        </v-col>

        <!-- Aggregations -->
        <v-col cols="12" md="4">
          <v-card variant="outlined">
            <v-card-title>By Department</v-card-title>
            <v-divider />
            <v-card-text>
              <div v-for="(value, key) in report.byDepartment" :key="key" class="mb-2">
                <div class="d-flex justify-space-between">
                  <span class="text-capitalize">{{ getDepartmentLabel(key) }}</span>
                  <span class="font-weight-medium">{{ value.count }} events</span>
                </div>
                <div class="text-caption text-error">{{ formatIDR(value.cost) }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card variant="outlined">
            <v-card-title>By Status</v-card-title>
            <v-divider />
            <v-card-text>
              <div v-for="(value, key) in report.byStatus" :key="key" class="mb-2">
                <div class="d-flex justify-space-between">
                  <span class="text-capitalize">{{ getStatusLabel(key) }}</span>
                  <span class="font-weight-medium">{{ value.count }} events</span>
                </div>
                <div class="text-caption text-error">{{ formatIDR(value.cost) }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card variant="outlined">
            <v-card-title>By Item Type</v-card-title>
            <v-divider />
            <v-card-text>
              <div v-for="(value, key) in report.byItemType" :key="key" class="mb-2">
                <div class="d-flex justify-space-between">
                  <span class="text-capitalize">{{ key }}</span>
                  <span class="font-weight-medium">{{ value.count }} events</span>
                </div>
                <div class="text-caption text-error">{{ formatIDR(value.cost) }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-if="!report && !loading">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-alert-circle</v-icon>
              <div class="text-h6 text-medium-emphasis">No Report Generated</div>
              <div class="text-body-2 text-medium-emphasis">
                Select a date range and click "Generate Report" to view negative inventory events
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>

    <!-- Item Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="600">
      <v-card v-if="selectedItem">
        <v-card-title>Negative Inventory Event Details</v-card-title>
        <v-divider />
        <v-card-text>
          <v-list density="compact">
            <v-list-item>
              <v-list-item-title>Item Name</v-list-item-title>
              <v-list-item-subtitle>{{ selectedItem.itemName }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Item Type</v-list-item-title>
              <v-list-item-subtitle>{{ selectedItem.itemType }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Category</v-list-item-title>
              <v-list-item-subtitle>{{ selectedItem.category }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Department</v-list-item-title>
              <v-list-item-subtitle>
                {{ getDepartmentLabel(selectedItem.department) }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Batch Number</v-list-item-title>
              <v-list-item-subtitle>{{ selectedItem.batchNumber }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Event Date</v-list-item-title>
              <v-list-item-subtitle>
                {{ formatDateTime(selectedItem.eventDate) }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Negative Quantity</v-list-item-title>
              <v-list-item-subtitle class="text-error">
                -{{ selectedItem.negativeQuantity.toFixed(2) }} {{ selectedItem.unit }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Cost Impact</v-list-item-title>
              <v-list-item-subtitle class="text-error">
                {{ formatIDR(selectedItem.totalCost) }}
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Status</v-list-item-title>
              <v-list-item-subtitle>{{ getStatusLabel(selectedItem.status) }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>Reason</v-list-item-title>
              <v-list-item-subtitle>{{ selectedItem.reason }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item v-if="selectedItem.notes">
              <v-list-item-title>Notes</v-list-item-title>
              <v-list-item-subtitle>{{ selectedItem.notes }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-divider />
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="detailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNegativeInventoryReportStore } from '@/stores/analytics/negativeInventoryReportStore'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'
import type { NegativeInventoryReport } from '@/stores/analytics/types'

// Stores
const reportStore = useNegativeInventoryReportStore()

// State
const dateFrom = ref('')
const dateTo = ref('')
const statusFilter = ref('all')
const typeFilter = ref('all')
const report = computed(() => reportStore.currentReport)
const loading = computed(() => reportStore.loading)
const error = ref<string | null>(null)
const detailsDialog = ref(false)
const selectedItem = ref<NegativeInventoryReport['items'][0] | null>(null)

// Options
const statusOptions = [
  { title: 'All Status', value: 'all' },
  { title: 'Unreconciled', value: 'unreconciled' },
  { title: 'Reconciled', value: 'reconciled' },
  { title: 'Written Off', value: 'written_off' }
]

const typeOptions = [
  { title: 'All Types', value: 'all' },
  { title: 'Products', value: 'product' },
  { title: 'Preparations', value: 'preparation' }
]

// Table headers
const tableHeaders = [
  { title: 'Item Name', key: 'itemName', sortable: true },
  { title: 'Category', key: 'category', sortable: true },
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Batch #', key: 'batchNumber', sortable: true },
  { title: 'Event Date', key: 'eventDate', sortable: true },
  { title: 'Negative Qty', key: 'negativeQuantity', sortable: true },
  { title: 'Cost Impact', key: 'totalCost', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

// Lifecycle
onMounted(() => {
  // Set default date range (current month)
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  dateFrom.value = firstDay.toISOString().split('T')[0]
  dateTo.value = lastDay.toISOString().split('T')[0]
})

// Computed
const filteredItems = computed(() => {
  if (!report.value) return []

  let items = report.value.items

  // Filter by status
  if (statusFilter.value !== 'all') {
    items = items.filter(item => item.status === statusFilter.value)
  }

  // Filter by type
  if (typeFilter.value !== 'all') {
    items = items.filter(item => item.itemType === typeFilter.value)
  }

  return items
})

// Methods
async function handleGenerateReport() {
  try {
    error.value = null
    await reportStore.generateReport(dateFrom.value, dateTo.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate report'
  }
}

function handleExportCSV() {
  if (!report.value) return

  const csv = reportStore.exportReportToCSV(report.value)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `negative-inventory-report-${report.value.period.dateFrom}-${report.value.period.dateTo}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function showItemDetails(item: NegativeInventoryReport['items'][0]) {
  selectedItem.value = item
  detailsDialog.value = true
}

function formatDate(dateString: string): string {
  return TimeUtils.formatDateForDisplay(dateString)
}

function formatDateTime(dateString: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateString)
}

function getDepartmentLabel(department: string): string {
  const labels: Record<string, string> = {
    kitchen: 'Kitchen',
    bar: 'Bar',
    kitchenAndBar: 'Kitchen & Bar',
    unknown: 'Unknown'
  }
  return labels[department] || department
}

function getDepartmentColor(department: string): string {
  const colors: Record<string, string> = {
    kitchen: 'orange',
    bar: 'blue',
    kitchenAndBar: 'purple',
    unknown: 'grey'
  }
  return colors[department] || 'grey'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    unreconciled: 'Unreconciled',
    reconciled: 'Reconciled',
    written_off: 'Written Off'
  }
  return labels[status] || status
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    unreconciled: 'error',
    reconciled: 'success',
    written_off: 'warning'
  }
  return colors[status] || 'grey'
}
</script>

<style scoped lang="scss">
.negative-inventory-report {
  .v-data-table {
    tbody tr:hover {
      background-color: rgba(var(--v-theme-surface-variant), 0.5);
    }
  }
}
</style>
