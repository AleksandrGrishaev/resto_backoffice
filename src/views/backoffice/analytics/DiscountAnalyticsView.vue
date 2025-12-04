<!-- src/views/backoffice/analytics/DiscountAnalyticsView.vue -->
<!-- Sprint 7 Phase 3: Discount Analytics Dashboard with Filtering & Transactions -->

<template>
  <div class="discount-analytics-view">
    <v-container fluid>
      <!-- Header with Refresh Button -->
      <v-row class="align-center">
        <v-col cols="12" md="8">
          <h1 class="text-h4 mb-2">Discount Analytics</h1>
          <p class="text-body-2 text-grey mb-0">
            Comprehensive discount tracking with filtering, breakdown by reason, and transaction
            details
          </p>
        </v-col>
        <v-col cols="12" md="4" class="text-right">
          <v-btn
            color="primary"
            size="large"
            :loading="loading"
            prepend-icon="mdi-refresh"
            @click="handleApplyFilters"
          >
            Refresh
          </v-btn>
        </v-col>
      </v-row>

      <!-- Filter Panel -->
      <v-card class="mb-4">
        <v-card-title class="bg-grey-lighten-4">
          <v-icon start>mdi-filter</v-icon>
          Filters
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row>
            <!-- Date Range Preset -->
            <v-col cols="12" md="3">
              <v-select
                v-model="selectedPreset"
                label="Date Range"
                :items="datePresetOptions"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                hide-details
                @update:model-value="handlePresetChange"
              />
            </v-col>

            <!-- Custom Date Range (shown when preset is 'custom') -->
            <v-col v-if="selectedPreset === 'custom'" cols="12" md="2">
              <v-text-field
                v-model="filters.startDate"
                label="From"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>
            <v-col v-if="selectedPreset === 'custom'" cols="12" md="2">
              <v-text-field
                v-model="filters.endDate"
                label="To"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              />
            </v-col>

            <!-- Reason Filter -->
            <v-col cols="12" md="3">
              <v-select
                v-model="filters.reason"
                label="Reason"
                :items="reasonOptions"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>

            <!-- Type Filter -->
            <v-col cols="12" md="2">
              <v-select
                v-model="filters.type"
                label="Type"
                :items="typeOptions"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>

            <!-- Search -->
            <v-col cols="12" md="4">
              <v-text-field
                v-model="searchQuery"
                label="Search"
                placeholder="Order # or notes..."
                variant="outlined"
                density="compact"
                hide-details
                prepend-inner-icon="mdi-magnify"
                clearable
              />
            </v-col>
          </v-row>

          <!-- Action Buttons -->
          <v-row class="mt-2">
            <v-col cols="auto">
              <v-btn color="primary" :loading="loading" @click="handleApplyFilters">
                Apply Filters
              </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn variant="outlined" @click="handleClearFilters">Clear Filters</v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn
                v-if="transactions.length > 0"
                color="secondary"
                variant="outlined"
                @click="handleExportCSV"
              >
                Export CSV
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

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
          <p class="text-body-1 mt-4">Loading discount data...</p>
        </v-col>
      </v-row>

      <!-- Dashboard Content -->
      <template v-if="!loading && summary.length > 0">
        <!-- Summary Cards -->
        <v-row>
          <v-col cols="12" md="6">
            <v-card color="warning" variant="tonal">
              <v-card-text>
                <div class="text-caption">Total Discounts</div>
                <div class="text-h5">{{ formatIDR(totalDiscounts) }}</div>
                <div class="text-caption">{{ totalCount }} discount events</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card color="info" variant="tonal">
              <v-card-text>
                <div class="text-caption">Average Discount</div>
                <div class="text-h5">{{ formatIDR(averageDiscount) }}</div>
                <div class="text-caption">Per event</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Breakdown by Reason -->
        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title class="bg-warning-lighten-4">
                <v-icon start>mdi-chart-pie</v-icon>
                Breakdown by Reason
              </v-card-title>
              <v-card-text class="pa-0">
                <v-table>
                  <thead>
                    <tr>
                      <th>Reason</th>
                      <th class="text-center">Count</th>
                      <th class="text-right">Total Amount</th>
                      <th class="text-center">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in summary" :key="item.reason">
                      <td>
                        <v-chip size="small" :color="getReasonColor(item.reason)">
                          {{ item.reasonLabel }}
                        </v-chip>
                      </td>
                      <td class="text-center">{{ item.count }}</td>
                      <td class="text-right font-weight-bold">
                        {{ formatIDR(item.totalAmount) }}
                      </td>
                      <td class="text-center">
                        <v-chip size="small" variant="outlined">
                          {{ item.percentage.toFixed(1) }}%
                        </v-chip>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Discount Transactions Table -->
        <v-row>
          <v-col cols="12">
            <v-card>
              <v-card-title class="bg-primary-lighten-4 d-flex justify-space-between align-center">
                <div>
                  <v-icon start>mdi-format-list-bulleted</v-icon>
                  Discount Transactions
                </div>
                <div class="text-body-2">
                  {{ filteredTransactions.length }} records, page {{ currentPage }} of
                  {{ totalPages }}
                </div>
              </v-card-title>
              <v-card-text class="pa-0">
                <v-table>
                  <thead>
                    <tr>
                      <th>Date/Time</th>
                      <th>Order #</th>
                      <th>Type</th>
                      <th>Reason</th>
                      <th class="text-right">Amount</th>
                      <th>Applied By</th>
                      <th class="text-center">Details</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="transaction in paginatedTransactions" :key="transaction.id">
                      <td>
                        <div class="text-body-2">
                          {{ formatDateTime(transaction.appliedAt) }}
                        </div>
                      </td>
                      <td>
                        <v-chip size="small" color="primary" variant="outlined">
                          {{ transaction.orderNumber }}
                        </v-chip>
                      </td>
                      <td>
                        <v-chip
                          size="small"
                          :color="transaction.type === 'bill' ? 'secondary' : 'info'"
                        >
                          {{ transaction.type }}
                        </v-chip>
                      </td>
                      <td>
                        <v-chip size="small" :color="getReasonColor(transaction.reason)">
                          {{ DISCOUNT_REASON_LABELS[transaction.reason] }}
                        </v-chip>
                      </td>
                      <td class="text-right">
                        <span class="text-warning font-weight-bold">
                          -{{ formatIDR(transaction.discountAmount) }}
                        </span>
                      </td>
                      <td>{{ transaction.appliedByName }}</td>
                      <td class="text-center">
                        <v-btn
                          v-if="transaction.type === 'bill' && transaction.allocationDetails"
                          icon
                          size="small"
                          variant="text"
                          @click="showAllocationDialog(transaction)"
                        >
                          <v-icon>mdi-information</v-icon>
                        </v-btn>
                      </td>
                      <td>
                        <span class="text-body-2 text-grey">
                          {{ transaction.notes || '-' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </v-table>

                <!-- Pagination -->
                <div class="d-flex justify-center align-center pa-4">
                  <v-btn variant="text" :disabled="currentPage === 1" @click="currentPage--">
                    <v-icon>mdi-chevron-left</v-icon>
                    Previous
                  </v-btn>

                  <div class="mx-4">
                    <v-chip
                      v-for="page in visiblePages"
                      :key="page"
                      :color="page === currentPage ? 'primary' : 'default'"
                      :variant="page === currentPage ? 'flat' : 'outlined'"
                      size="small"
                      class="mx-1"
                      @click="currentPage = page"
                    >
                      {{ page }}
                    </v-chip>
                  </div>

                  <v-btn
                    variant="text"
                    :disabled="currentPage === totalPages"
                    @click="currentPage++"
                  >
                    Next
                    <v-icon>mdi-chevron-right</v-icon>
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </template>

      <!-- Empty State -->
      <v-row v-if="!loading && summary.length === 0">
        <v-col cols="12" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-1">mdi-sale-outline</v-icon>
          <p class="text-h6 mt-4 text-grey">No Discounts Found</p>
          <p class="text-body-2 text-grey">
            No discount events match your current filters. Try adjusting the date range or filters.
          </p>
        </v-col>
      </v-row>
    </v-container>

    <!-- Allocation Details Dialog -->
    <v-dialog v-model="allocationDialog" max-width="600">
      <v-card v-if="selectedTransaction">
        <v-card-title class="bg-secondary-lighten-4">
          <v-icon start>mdi-information</v-icon>
          Bill Discount Allocation Details
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="6">
              <div class="text-caption text-grey">Total Bill Amount</div>
              <div class="text-h6">
                {{ formatIDR(selectedTransaction.allocationDetails?.totalBillAmount || 0) }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-grey">Total Discount</div>
              <div class="text-h6 text-warning">
                -{{ formatIDR(selectedTransaction.discountAmount) }}
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <div class="text-subtitle-2 mb-2">Item Allocations:</div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-right">Amount</th>
                <th class="text-center">Proportion</th>
                <th class="text-right">Allocated Discount</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in selectedTransaction.allocationDetails?.itemAllocations"
                :key="item.itemId"
              >
                <td>{{ item.itemName }}</td>
                <td class="text-right">{{ formatIDR(item.itemAmount) }}</td>
                <td class="text-center">{{ (item.proportion * 100).toFixed(1) }}%</td>
                <td class="text-right text-warning">-{{ formatIDR(item.allocatedDiscount) }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="allocationDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDiscountAnalytics } from '@/stores/discounts'
import { useDiscountsStore } from '@/stores/discounts'
import {
  DISCOUNT_REASON_OPTIONS,
  DATE_RANGE_PRESETS,
  DISCOUNT_REASON_LABELS
} from '@/stores/discounts'
import type {
  DiscountSummary,
  DiscountTransactionView,
  DiscountFilterOptions,
  DateRangePreset,
  DiscountReason
} from '@/stores/discounts'
import { formatIDR, TimeUtils, DebugUtils } from '@/utils'

const MODULE_NAME = 'DiscountAnalyticsView'

// State
const selectedPreset = ref<DateRangePreset>('30days')
const filters = ref<DiscountFilterOptions>({})
const searchQuery = ref<string>('')
const loading = ref(false)
const error = ref<string | null>(null)
const summary = ref<DiscountSummary[]>([])
const transactions = ref<DiscountTransactionView[]>([])
const currentPage = ref(1)
const itemsPerPage = 50
const allocationDialog = ref(false)
const selectedTransaction = ref<DiscountTransactionView | null>(null)

// Composables
const { getDiscountSummary, getDiscountTransactions, getDateRangeFromPreset } =
  useDiscountAnalytics()

// Options for filters
const datePresetOptions = DATE_RANGE_PRESETS
const reasonOptions = DISCOUNT_REASON_OPTIONS // Remove "All Reasons" - use clearable instead
const typeOptions = [
  { label: 'Item Discount', value: 'item' },
  { label: 'Bill Discount', value: 'bill' }
]

// Computed
const totalDiscounts = computed(() => summary.value.reduce((sum, s) => sum + s.totalAmount, 0))
const totalCount = computed(() => summary.value.reduce((sum, s) => sum + s.count, 0))
const averageDiscount = computed(() =>
  totalCount.value > 0 ? totalDiscounts.value / totalCount.value : 0
)

const filteredTransactions = computed(() => {
  if (!searchQuery.value) return transactions.value

  const query = searchQuery.value.toLowerCase()
  return transactions.value.filter(
    t => t.orderNumber?.toLowerCase().includes(query) || t.notes?.toLowerCase().includes(query)
  )
})

const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / itemsPerPage))

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredTransactions.value.slice(start, start + itemsPerPage)
})

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let startPage = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  const endPage = Math.min(totalPages.value, startPage + maxVisible - 1)

  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return pages
})

// Methods
async function handleApplyFilters() {
  try {
    loading.value = true
    error.value = null

    // Clean up undefined/null values from filters (from clearable selects)
    const cleanedFilters: DiscountFilterOptions = {}
    Object.entries(filters.value).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanedFilters[key as keyof DiscountFilterOptions] = value
      }
    })

    DebugUtils.info(MODULE_NAME, '🚀 Applying filters', {
      originalFilters: filters.value,
      cleanedFilters
    })

    // DEBUG: Check stores availability
    const discountsStore = useDiscountsStore()

    DebugUtils.info(MODULE_NAME, '📦 Stores check', {
      discountsStoreExists: !!discountsStore,
      discountsInitialized: discountsStore?.initialized,
      discountEventsCount: discountsStore?.discountEvents?.length || 0
    })

    summary.value = await getDiscountSummary(cleanedFilters)
    transactions.value = await getDiscountTransactions(cleanedFilters)

    currentPage.value = 1

    DebugUtils.store(MODULE_NAME, '✅ Filters applied successfully', {
      summaryCount: summary.value.length,
      transactionCount: transactions.value.length,
      summary: summary.value,
      transactions: transactions.value.slice(0, 5) // First 5 for debugging
    })

    if (summary.value.length === 0 && transactions.value.length === 0) {
      DebugUtils.error(MODULE_NAME, '⚠️ NO DATA RETURNED!', {
        filters: filters.value,
        discountEventsInStore: discountsStore?.discountEvents?.length || 0
      })
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to apply filters', { error: err })
    error.value = err instanceof Error ? err.message : 'Failed to load discount data'
  } finally {
    loading.value = false
  }
}

function handlePresetChange() {
  if (selectedPreset.value !== 'custom') {
    const { startDate, endDate } = getDateRangeFromPreset(selectedPreset.value)
    filters.value.startDate = startDate
    filters.value.endDate = endDate
    handleApplyFilters()
  }
}

function handleClearFilters() {
  selectedPreset.value = '30days'
  filters.value = {}
  searchQuery.value = ''
  handlePresetChange()
}

function showAllocationDialog(transaction: DiscountTransactionView) {
  selectedTransaction.value = transaction
  allocationDialog.value = true
}

function handleExportCSV() {
  try {
    DebugUtils.info(MODULE_NAME, 'Exporting discount analytics to CSV')

    const rows: string[] = []

    // Header
    rows.push('Discount Analytics Report')
    rows.push(`Date Range,${filters.value.startDate || 'All'} to ${filters.value.endDate || 'All'}`)
    rows.push(`Generated,${new Date().toISOString()}`)
    rows.push('')

    // Summary
    rows.push('Summary')
    rows.push('Metric,Value')
    rows.push(`Total Discounts,${totalDiscounts.value}`)
    rows.push(`Discount Count,${totalCount.value}`)
    rows.push(`Average Discount,${averageDiscount.value.toFixed(0)}`)
    rows.push('')

    // Breakdown by Reason
    rows.push('Breakdown by Reason')
    rows.push('Reason,Count,Total Amount,Percentage')
    summary.value.forEach(
      (item: { reasonLabel: string; count: number; totalAmount: number; percentage: number }) => {
        rows.push(
          `${item.reasonLabel},${item.count},${item.totalAmount},${item.percentage.toFixed(2)}%`
        )
      }
    )
    rows.push('')

    // Transactions
    rows.push('Discount Transactions')
    rows.push('Date/Time,Order #,Type,Reason,Amount,Applied By,Notes')
    filteredTransactions.value.forEach(
      (t: {
        appliedAt: string
        orderNumber: string
        type: string
        reason: string
        discountAmount: number
        appliedByName: string
        notes?: string
      }) => {
        rows.push(
          `${t.appliedAt},${t.orderNumber},${t.type},${DISCOUNT_REASON_LABELS[t.reason]},${t.discountAmount},${t.appliedByName},"${t.notes || ''}"`
        )
      }
    )

    const csvContent = rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `discount-analytics-${filters.value.startDate || 'all'}-to-${filters.value.endDate || 'all'}.csv`
    )
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    DebugUtils.store(MODULE_NAME, 'Discount analytics exported to CSV')
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to export CSV', { error: err })
    error.value = 'Failed to export report'
  }
}

function formatDateTime(isoString: string): string {
  return TimeUtils.formatDateTimeForDisplay(isoString)
}

function getReasonColor(reason: DiscountReason): string {
  const colorMap: Record<DiscountReason, string> = {
    customer_complaint: 'error',
    service_issue: 'warning',
    food_quality: 'orange',
    promotion: 'success',
    loyalty: 'primary',
    staff_error: 'error',
    compensation: 'warning',
    manager_decision: 'info',
    other: 'grey'
  }
  return colorMap[reason] || 'grey'
}

// Lifecycle
onMounted(() => {
  handlePresetChange()
})
</script>

<style scoped lang="scss">
.discount-analytics-view {
  min-height: 100vh;
}

.v-table {
  th {
    font-weight: 600;
    white-space: nowrap;
  }

  td {
    white-space: nowrap;
  }
}
</style>
