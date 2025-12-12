<!-- src/views/backoffice/analytics/CancelledItemsReport.vue -->
<!-- Cancelled Items Report - View all cancelled order items with reasons -->

<template>
  <div class="cancelled-items-report">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-2">Cancelled Items Report</h1>
          <p class="text-body-2 text-medium-emphasis mb-4">
            View cancelled order items with their reasons and stages
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
        <v-col cols="12" md="3">
          <v-select
            v-model="reasonFilter"
            label="Reason"
            :items="reasonOptions"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-btn
            color="primary"
            size="large"
            :loading="loading"
            :disabled="!dateFrom || !dateTo"
            block
            @click="loadReport"
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
      <v-row v-if="items.length > 0 && !loading">
        <!-- Summary Cards -->
        <v-col cols="12">
          <v-row class="mb-4">
            <v-col cols="12" md="3">
              <v-card color="error" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Total Cancelled</div>
                  <div class="text-h5">{{ summary.totalItems }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="warning" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Total Value</div>
                  <div class="text-h5">{{ formatIDR(summary.totalValue) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="info" variant="tonal">
                <v-card-text>
                  <div class="text-caption">With Write-off</div>
                  <div class="text-h5">{{ summary.withWriteOff }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="secondary" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Top Reason</div>
                  <div class="text-h6">{{ summary.topReason || '-' }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>

        <!-- Data Table -->
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-title class="d-flex justify-space-between align-center">
              <span>Cancelled Items ({{ filteredItems.length }})</span>
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
              :headers="tableHeaders"
              :items="filteredItems"
              :items-per-page="20"
              :sort-by="[{ key: 'cancelledAt', order: 'desc' }]"
              density="comfortable"
              class="elevation-0"
            >
              <!-- Item Name Column -->
              <template #[`item.menuItemName`]="{ item }">
                <span class="font-weight-medium">{{ item.menuItemName }}</span>
                <span v-if="item.variantName" class="text-caption text-medium-emphasis ml-1">
                  ({{ item.variantName }})
                </span>
              </template>

              <!-- Quantity Column -->
              <template #[`item.quantity`]="{ item }">
                <span>{{ item.quantity }}</span>
              </template>

              <!-- Price Column -->
              <template #[`item.unitPrice`]="{ item }">
                {{ formatIDR(item.unitPrice) }}
              </template>

              <!-- Stage Column -->
              <template #[`item.stageWhenCancelled`]="{ item }">
                <v-chip
                  :color="getStageColor(item.stageWhenCancelled)"
                  size="small"
                  variant="tonal"
                >
                  {{ getStageLabel(item.stageWhenCancelled) }}
                </v-chip>
              </template>

              <!-- Reason Column -->
              <template #[`item.cancellationReason`]="{ item }">
                <v-chip
                  :color="getReasonColor(item.cancellationReason)"
                  size="small"
                  variant="flat"
                >
                  {{ getReasonLabel(item.cancellationReason) }}
                </v-chip>
              </template>

              <!-- Cancelled By Column -->
              <template #[`item.cancelledBy`]="{ item }">
                <span class="text-body-2">{{ item.cancelledBy || '-' }}</span>
              </template>

              <!-- Cancelled At Column -->
              <template #[`item.cancelledAt`]="{ item }">
                {{ formatDateTime(item.cancelledAt) }}
              </template>

              <!-- Notes Column -->
              <template #[`item.cancellationNotes`]="{ item }">
                <span v-if="item.cancellationNotes" class="text-body-2">
                  {{ item.cancellationNotes }}
                </span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>

              <!-- Write-off Column -->
              <template #[`item.writeOffOperationId`]="{ item }">
                <v-icon v-if="item.writeOffOperationId" color="success" size="small">
                  mdi-check-circle
                </v-icon>
                <span v-else class="text-medium-emphasis">-</span>
              </template>
            </v-data-table>
          </v-card>
        </v-col>

        <!-- Aggregations -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title>By Reason</v-card-title>
            <v-divider />
            <v-card-text>
              <div v-for="(value, key) in summary.byReason" :key="key" class="mb-2">
                <div class="d-flex justify-space-between align-center">
                  <v-chip :color="getReasonColor(key)" size="small" variant="tonal">
                    {{ getReasonLabel(key) }}
                  </v-chip>
                  <span class="font-weight-medium">{{ value.count }} items</span>
                </div>
                <div class="text-caption text-error">{{ formatIDR(value.value) }}</div>
              </div>
              <div v-if="Object.keys(summary.byReason).length === 0" class="text-medium-emphasis">
                No data
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title>By Stage</v-card-title>
            <v-divider />
            <v-card-text>
              <div v-for="(value, key) in summary.byStage" :key="key" class="mb-2">
                <div class="d-flex justify-space-between align-center">
                  <v-chip :color="getStageColor(key)" size="small" variant="tonal">
                    {{ getStageLabel(key) }}
                  </v-chip>
                  <span class="font-weight-medium">{{ value.count }} items</span>
                </div>
                <div class="text-caption text-error">{{ formatIDR(value.value) }}</div>
              </div>
              <div v-if="Object.keys(summary.byStage).length === 0" class="text-medium-emphasis">
                No data
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-if="items.length === 0 && !loading && hasLoaded">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text class="text-center py-8">
              <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
              <div class="text-h6 text-medium-emphasis">No Cancelled Items</div>
              <div class="text-body-2 text-medium-emphasis">
                No items were cancelled in the selected period
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Initial State -->
      <v-row v-if="!hasLoaded && !loading">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-cancel</v-icon>
              <div class="text-h6 text-medium-emphasis">No Report Generated</div>
              <div class="text-body-2 text-medium-emphasis">
                Select a date range and click "Generate Report" to view cancelled items
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
import { supabase } from '@/supabase/client'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'
import { CANCELLATION_REASON_OPTIONS, type CancellationReason } from '@/stores/pos/types'

// Types
interface CancelledItem {
  id: string
  orderId: string
  menuItemName: string
  variantName: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  stageWhenCancelled: string
  cancelledAt: string
  cancelledBy: string | null
  cancellationReason: CancellationReason | null
  cancellationNotes: string | null
  writeOffOperationId: string | null
}

interface Summary {
  totalItems: number
  totalValue: number
  withWriteOff: number
  topReason: string | null
  byReason: Record<string, { count: number; value: number }>
  byStage: Record<string, { count: number; value: number }>
}

// State
const dateFrom = ref('')
const dateTo = ref('')
const reasonFilter = ref('all')
const items = ref<CancelledItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const hasLoaded = ref(false)

// Options
const reasonOptions = computed(() => [
  { title: 'All Reasons', value: 'all' },
  ...CANCELLATION_REASON_OPTIONS.map(opt => ({
    title: opt.label,
    value: opt.value
  }))
])

// Table headers
const tableHeaders = [
  { title: 'Item', key: 'menuItemName', sortable: true },
  { title: 'Qty', key: 'quantity', sortable: true, width: '60px' },
  { title: 'Price', key: 'unitPrice', sortable: true },
  { title: 'Stage', key: 'stageWhenCancelled', sortable: true },
  { title: 'Reason', key: 'cancellationReason', sortable: true },
  { title: 'Cancelled By', key: 'cancelledBy', sortable: true },
  { title: 'Cancelled At', key: 'cancelledAt', sortable: true },
  { title: 'Notes', key: 'cancellationNotes', sortable: false },
  { title: 'W/O', key: 'writeOffOperationId', sortable: false, width: '50px' }
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
  if (reasonFilter.value === 'all') {
    return items.value
  }
  return items.value.filter(item => item.cancellationReason === reasonFilter.value)
})

const summary = computed<Summary>(() => {
  const data = filteredItems.value

  // Calculate totals
  const totalItems = data.length
  const totalValue = data.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const withWriteOff = data.filter(item => item.writeOffOperationId).length

  // Group by reason
  const byReason: Record<string, { count: number; value: number }> = {}
  data.forEach(item => {
    const reason = item.cancellationReason || 'unknown'
    if (!byReason[reason]) {
      byReason[reason] = { count: 0, value: 0 }
    }
    byReason[reason].count++
    byReason[reason].value += item.unitPrice * item.quantity
  })

  // Group by stage
  const byStage: Record<string, { count: number; value: number }> = {}
  data.forEach(item => {
    const stage = item.stageWhenCancelled || 'unknown'
    if (!byStage[stage]) {
      byStage[stage] = { count: 0, value: 0 }
    }
    byStage[stage].count++
    byStage[stage].value += item.unitPrice * item.quantity
  })

  // Find top reason
  let topReason: string | null = null
  let maxCount = 0
  Object.entries(byReason).forEach(([reason, stats]) => {
    if (stats.count > maxCount) {
      maxCount = stats.count
      topReason = getReasonLabel(reason)
    }
  })

  return {
    totalItems,
    totalValue,
    withWriteOff,
    topReason,
    byReason,
    byStage
  }
})

// Methods
async function loadReport() {
  loading.value = true
  error.value = null
  hasLoaded.value = true

  try {
    // Query cancelled items with stage calculation
    const { data, error: queryError } = await supabase
      .from('order_items')
      .select(
        `
        id,
        order_id,
        menu_item_name,
        variant_name,
        quantity,
        unit_price,
        total_price,
        cancelled_at,
        cancelled_by,
        cancellation_reason,
        cancellation_notes,
        write_off_operation_id,
        served_at,
        ready_at,
        cooking_started_at,
        sent_to_kitchen_at
      `
      )
      .eq('status', 'cancelled')
      .gte('cancelled_at', `${dateFrom.value}T00:00:00`)
      .lte('cancelled_at', `${dateTo.value}T23:59:59`)
      .order('cancelled_at', { ascending: false })

    if (queryError) {
      throw queryError
    }

    // Transform data
    items.value = (data || []).map(row => ({
      id: row.id,
      orderId: row.order_id,
      menuItemName: row.menu_item_name,
      variantName: row.variant_name,
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      totalPrice: Number(row.total_price),
      stageWhenCancelled: determineStage(row),
      cancelledAt: row.cancelled_at,
      cancelledBy: row.cancelled_by,
      cancellationReason: row.cancellation_reason as CancellationReason | null,
      cancellationNotes: row.cancellation_notes,
      writeOffOperationId: row.write_off_operation_id
    }))
  } catch (err) {
    console.error('Failed to load cancelled items:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load report'
    items.value = []
  } finally {
    loading.value = false
  }
}

function determineStage(row: {
  served_at: string | null
  ready_at: string | null
  cooking_started_at: string | null
  sent_to_kitchen_at: string | null
}): string {
  if (row.served_at) return 'served'
  if (row.ready_at) return 'ready'
  if (row.cooking_started_at) return 'cooking'
  if (row.sent_to_kitchen_at) return 'waiting'
  return 'draft'
}

function exportCSV() {
  if (filteredItems.value.length === 0) return

  const headers = [
    'Item Name',
    'Variant',
    'Quantity',
    'Unit Price',
    'Stage',
    'Reason',
    'Cancelled By',
    'Cancelled At',
    'Notes',
    'Write-off'
  ]

  const rows = filteredItems.value.map(item => [
    item.menuItemName,
    item.variantName || '',
    item.quantity,
    item.unitPrice,
    getStageLabel(item.stageWhenCancelled),
    getReasonLabel(item.cancellationReason || ''),
    item.cancelledBy || '',
    item.cancelledAt,
    item.cancellationNotes || '',
    item.writeOffOperationId ? 'Yes' : 'No'
  ])

  const csv = [headers.join(','), ...rows.map(row => row.map(escapeCSV).join(','))].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cancelled-items-${dateFrom.value}-to-${dateTo.value}.csv`
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

function formatDateTime(dateString: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateString)
}

function getReasonLabel(reason: string): string {
  const option = CANCELLATION_REASON_OPTIONS.find(opt => opt.value === reason)
  return option?.label || reason || '-'
}

function getReasonColor(reason: string): string {
  const option = CANCELLATION_REASON_OPTIONS.find(opt => opt.value === reason)
  return option?.color || 'grey'
}

function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    waiting: 'Waiting',
    cooking: 'Cooking',
    ready: 'Ready',
    served: 'Served'
  }
  return labels[stage] || stage
}

function getStageColor(stage: string): string {
  const colors: Record<string, string> = {
    draft: 'grey',
    waiting: 'info',
    cooking: 'warning',
    ready: 'success',
    served: 'primary'
  }
  return colors[stage] || 'grey'
}
</script>

<style scoped lang="scss">
.cancelled-items-report {
  .v-data-table {
    tbody tr:hover {
      background-color: rgba(var(--v-theme-surface-variant), 0.5);
    }
  }
}
</style>
