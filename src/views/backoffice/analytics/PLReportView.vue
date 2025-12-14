<!-- src/views/backoffice/analytics/PLReportView.vue -->
<!-- ✅ SPRINT 5: P&L Report UI Component -->

<template>
  <div class="pl-report-view">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-4">Profit & Loss Report</h1>
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
        <v-col cols="12" md="3">
          <v-btn
            v-if="report"
            color="secondary"
            size="large"
            variant="outlined"
            block
            @click="handleExportJSON"
          >
            Export JSON
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
        <v-col cols="12">
          <!-- Period Info -->
          <v-card class="mb-4">
            <v-card-text>
              <div class="text-subtitle-1">
                <strong>Period:</strong>
                {{ formatDate(report.period.dateFrom) }} - {{ formatDate(report.period.dateTo) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                Generated: {{ formatDateTime(report.generatedAt) }}
              </div>
            </v-card-text>
          </v-card>

          <!-- ✅ SPRINT 4: COGS Method Selector -->
          <v-card class="mb-4">
            <v-card-title>
              COGS Calculation Method
              <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-icon v-bind="tooltipProps" size="small" class="ml-2">mdi-information</v-icon>
                </template>
                <div class="text-caption">
                  <strong>Accrual Basis:</strong>
                  FIFO + Spoilage + Adjustments
                  <br />
                  <strong>Cash Basis:</strong>
                  Supplier Payments + Inventory Δ
                </div>
              </v-tooltip>
            </v-card-title>
            <v-card-text>
              <v-radio-group v-model="cogsMethod" inline @update:model-value="handleMethodChange">
                <v-radio value="accrual">
                  <template #label>
                    <div>
                      <strong>Accrual Basis</strong>
                      <div class="text-caption text-medium-emphasis">
                        FIFO + Spoilage + Adjustments
                      </div>
                    </div>
                  </template>
                </v-radio>

                <v-radio value="cash">
                  <template #label>
                    <div>
                      <strong>Cash Basis</strong>
                      <div class="text-caption text-medium-emphasis">Payments + Inventory Δ</div>
                    </div>
                  </template>
                </v-radio>
              </v-radio-group>

              <!-- Method Comparison Alert -->
              <v-alert
                v-if="showMethodComparison"
                type="info"
                variant="tonal"
                density="compact"
                class="mt-4"
              >
                <div class="text-caption">
                  <strong>Methods Comparison:</strong>
                  <br />
                  Accrual: {{ formatIDR(report.cogs.accrual.total) }} | Cash:
                  {{ formatIDR(report.cogs.cash.total) }} | Difference:
                  {{ formatIDR(methodDifference) }}
                  <br />
                  <span class="text-medium-emphasis">
                    Difference may indicate accounts payable, goods in transit, or timing
                    differences.
                  </span>
                </div>
              </v-alert>
            </v-card-text>
          </v-card>

          <!-- Summary Cards -->
          <v-row class="mb-4">
            <v-col cols="12" :md="cogsMethod === 'accrual' ? 3 : 4">
              <v-card color="primary" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Total Revenue</div>
                  <div class="text-h5">{{ formatIDR(report.revenue.total) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" :md="cogsMethod === 'accrual' ? 3 : 4">
              <v-card color="warning" variant="tonal">
                <v-card-text>
                  <div class="text-caption">
                    COGS ({{ cogsMethod === 'accrual' ? 'Accrual' : 'Cash' }})
                  </div>
                  <div class="text-h5">{{ formatIDR(report.cogs.total) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col v-if="cogsMethod === 'accrual'" cols="12" md="3">
              <v-card color="info" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Gross Profit</div>
                  <div class="text-h5">{{ formatIDR(report.grossProfit.amount) }}</div>
                  <div class="text-caption">{{ report.grossProfit.margin.toFixed(1) }}% margin</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" :md="cogsMethod === 'accrual' ? 3 : 4">
              <v-card :color="netProfitColor" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Net Profit</div>
                  <div class="text-h5">{{ formatIDR(report.netProfit.amount) }}</div>
                  <div class="text-caption">{{ report.netProfit.margin.toFixed(1) }}% margin</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Detailed P&L Table -->
          <v-card>
            <v-card-title>Detailed P&L Statement</v-card-title>
            <v-divider />
            <v-card-text>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th class="text-left" style="width: 60%">Item</th>
                    <th class="text-right" style="width: 20%">Amount</th>
                    <th class="text-right" style="width: 20%">% of Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Revenue Section -->
                  <tr class="section-header">
                    <td colspan="3" class="font-weight-bold text-primary">REVENUE</td>
                  </tr>
                  <tr>
                    <td class="pl-8">Kitchen</td>
                    <td class="text-right">{{ formatIDR(report.revenue.byDepartment.kitchen) }}</td>
                    <td class="text-right">
                      {{
                        calculatePercentage(
                          report.revenue.byDepartment.kitchen,
                          report.revenue.total
                        )
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Bar</td>
                    <td class="text-right">{{ formatIDR(report.revenue.byDepartment.bar) }}</td>
                    <td class="text-right">
                      {{
                        calculatePercentage(report.revenue.byDepartment.bar, report.revenue.total)
                      }}
                    </td>
                  </tr>
                  <tr class="font-weight-bold">
                    <td>Total Revenue</td>
                    <td class="text-right">{{ formatIDR(report.revenue.total) }}</td>
                    <td class="text-right">100.0%</td>
                  </tr>

                  <tr><td colspan="3" class="py-2"></td></tr>

                  <!-- ✅ SPRINT 4: COGS Section with Method Breakdown -->
                  <tr class="section-header">
                    <td colspan="3" class="font-weight-bold text-warning">
                      COST OF GOODS SOLD (COGS) -
                      {{ cogsMethod === 'accrual' ? 'Accrual Basis' : 'Cash Basis' }}
                    </td>
                  </tr>

                  <!-- Accrual Method Breakdown -->
                  <template v-if="cogsMethod === 'accrual'">
                    <tr>
                      <td class="pl-8">Sales COGS (FIFO)</td>
                      <td class="text-right">{{ formatIDR(report.cogs.accrual.salesCOGS) }}</td>
                      <td class="text-right">
                        {{
                          calculatePercentage(report.cogs.accrual.salesCOGS, report.revenue.total)
                        }}
                      </td>
                    </tr>
                    <tr>
                      <td class="pl-8">+ Spoilage & Losses</td>
                      <td class="text-right">{{ formatIDR(report.cogs.accrual.spoilage) }}</td>
                      <td class="text-right">
                        {{
                          calculatePercentage(report.cogs.accrual.spoilage, report.revenue.total)
                        }}
                      </td>
                    </tr>
                    <tr>
                      <td class="pl-8">+ Shortage</td>
                      <td class="text-right">{{ formatIDR(report.cogs.accrual.shortage) }}</td>
                      <td class="text-right">
                        {{
                          calculatePercentage(report.cogs.accrual.shortage, report.revenue.total)
                        }}
                      </td>
                    </tr>
                    <tr>
                      <td class="pl-8">- Surplus</td>
                      <td class="text-right text-success">
                        -{{ formatIDR(report.cogs.accrual.surplus) }}
                      </td>
                      <td class="text-right">
                        -{{
                          calculatePercentage(report.cogs.accrual.surplus, report.revenue.total)
                        }}
                      </td>
                    </tr>
                  </template>

                  <!-- Cash Method Breakdown -->
                  <template v-else>
                    <tr>
                      <td class="pl-8">Purchases (Payments to Suppliers)</td>
                      <td class="text-right">{{ formatIDR(report.cogs.cash.purchases) }}</td>
                      <td class="text-right">
                        {{ calculatePercentage(report.cogs.cash.purchases, report.revenue.total) }}
                      </td>
                    </tr>
                    <tr>
                      <td class="pl-8">- Δ Accounts Payable</td>
                      <td class="text-right" :class="apDeltaClass">
                        {{ apDeltaSign
                        }}{{ formatIDR(Math.abs(report.cogs.cash.accountsPayableDelta)) }}
                      </td>
                      <td class="text-right">
                        {{ apDeltaSign
                        }}{{
                          calculatePercentage(
                            Math.abs(report.cogs.cash.accountsPayableDelta),
                            report.revenue.total
                          )
                        }}
                      </td>
                    </tr>
                    <tr class="text-caption">
                      <td colspan="3" class="pl-12 text-medium-emphasis">
                        Opening AP: {{ formatIDR(report.cogs.cash.openingAccountsPayable) }} →
                        Closing AP: {{ formatIDR(report.cogs.cash.closingAccountsPayable) }}
                      </td>
                    </tr>
                    <tr>
                      <td class="pl-8">- Inventory Change</td>
                      <td class="text-right" :class="inventoryChangeClass">
                        {{ inventoryChangeSign
                        }}{{ formatIDR(Math.abs(report.cogs.cash.inventoryChange)) }}
                      </td>
                      <td class="text-right">
                        {{ inventoryChangeSign
                        }}{{
                          calculatePercentage(
                            Math.abs(report.cogs.cash.inventoryChange),
                            report.revenue.total
                          )
                        }}
                      </td>
                    </tr>
                    <tr class="text-caption">
                      <td colspan="3" class="pl-12 text-medium-emphasis">
                        Opening: {{ formatIDR(report.cogs.cash.openingInventory) }} → Closing:
                        {{ formatIDR(report.cogs.cash.closingInventory) }}
                      </td>
                    </tr>
                  </template>

                  <tr class="font-weight-bold">
                    <td>Total COGS</td>
                    <td class="text-right">{{ formatIDR(report.cogs.total) }}</td>
                    <td class="text-right">
                      {{ calculatePercentage(report.cogs.total, report.revenue.total) }}
                    </td>
                  </tr>

                  <tr><td colspan="3" class="py-2"></td></tr>

                  <!-- OPEX Section (Dynamic from transaction_categories) -->
                  <tr class="section-header">
                    <td colspan="3" class="font-weight-bold text-error">
                      OPERATING EXPENSES (OPEX)
                    </td>
                  </tr>
                  <!-- Dynamic loop over OPEX categories -->
                  <tr v-for="(amount, code) in report.opex.byCategory" :key="code">
                    <td class="pl-8">{{ getCategoryName(code as string) }}</td>
                    <td class="text-right">{{ formatIDR(amount) }}</td>
                    <td class="text-right">
                      {{ calculatePercentage(amount, report.revenue.total) }}
                    </td>
                  </tr>
                  <!-- Empty state when no OPEX -->
                  <tr v-if="Object.keys(report.opex.byCategory).length === 0">
                    <td class="pl-8 text-medium-emphasis" colspan="3">No operating expenses</td>
                  </tr>
                  <tr class="font-weight-bold">
                    <td>Total OPEX</td>
                    <td class="text-right">{{ formatIDR(report.opex.total) }}</td>
                    <td class="text-right">
                      {{ calculatePercentage(report.opex.total, report.revenue.total) }}
                    </td>
                  </tr>

                  <tr><td colspan="3" class="py-2"></td></tr>

                  <!-- Net Profit -->
                  <tr class="font-weight-bold">
                    <td class="text-h6">NET PROFIT</td>
                    <td class="text-right text-h6" :class="netProfitClass">
                      {{ formatIDR(report.netProfit.amount) }}
                    </td>
                    <td class="text-right text-h6" :class="netProfitClass">
                      {{ report.netProfit.margin.toFixed(1) }}%
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-if="!report && !loading">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-line</v-icon>
              <div class="text-h6 text-medium-emphasis">No Report Generated</div>
              <div class="text-body-2 text-medium-emphasis">
                Select a date range and click "Generate Report" to view P&L data
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
import { useRouter } from 'vue-router'
import { usePLReportStore } from '@/stores/analytics/plReportStore'
import { useAccountStore, COGS_CATEGORY_LABELS } from '@/stores/account'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'
import type { PLReport, COGSMethod } from '@/stores/analytics/types'

// Router
const router = useRouter()

// Store
const plReportStore = usePLReportStore()
const accountStore = useAccountStore()

// State
const dateFrom = ref('')
const dateTo = ref('')
const report = computed(() => plReportStore.currentReport)
const loading = computed(() => plReportStore.loading)
const error = ref<string | null>(null)

// ✅ SPRINT 4: COGS Method Selection
const cogsMethod = ref<COGSMethod>('accrual')

// Lifecycle
onMounted(() => {
  // Set default date range (current month)
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  dateFrom.value = firstDay.toISOString().split('T')[0]
  dateTo.value = lastDay.toISOString().split('T')[0]
})

// Methods
async function handleGenerateReport() {
  try {
    error.value = null
    await plReportStore.generateReport(dateFrom.value, dateTo.value, cogsMethod.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate report'
  }
}

// ✅ SPRINT 4: Handle COGS method change
async function handleMethodChange(newMethod: COGSMethod) {
  if (!dateFrom.value || !dateTo.value) return

  try {
    error.value = null
    await plReportStore.generateReport(dateFrom.value, dateTo.value, newMethod)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to regenerate report'
  }
}

function handleExportJSON() {
  if (!report.value) return

  const json = plReportStore.exportReportToJSON(report.value)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pl-report-${report.value.period.dateFrom}-${report.value.period.dateTo}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function calculatePercentage(value: number, total: number): string {
  if (total === 0) return '0.0%'
  return ((value / total) * 100).toFixed(1) + '%'
}

function formatDate(dateString: string): string {
  return TimeUtils.formatDateForDisplay(dateString)
}

function formatDateTime(dateString: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateString)
}

/**
 * Get category display name from accountStore or COGS labels
 */
function getCategoryName(code: string): string {
  // Try to find in transaction categories (from DB)
  const category = accountStore.getCategoryByCode(code)
  if (category) return category.name

  // Fallback to COGS labels (hardcoded for P&L calculations)
  if (COGS_CATEGORY_LABELS[code]) {
    return COGS_CATEGORY_LABELS[code]
  }

  // Last resort - capitalize the code
  return code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, ' ')
}

// Computed
const netProfitColor = computed(() => {
  if (!report.value) return 'grey'
  return report.value.netProfit.amount >= 0 ? 'success' : 'error'
})

const netProfitClass = computed(() => {
  if (!report.value) return ''
  return report.value.netProfit.amount >= 0 ? 'text-success' : 'text-error'
})

// ✅ SPRINT 4: COGS Method Comparison computed properties
const methodDifference = computed(() => {
  if (!report.value?.cogs.accrual || !report.value?.cogs.cash) return 0
  return Math.abs(report.value.cogs.accrual.total - report.value.cogs.cash.total)
})

const showMethodComparison = computed(() => {
  return !!report.value?.cogs.accrual && !!report.value?.cogs.cash
})

// ✅ SPRINT 4: Accounts Payable Delta display helpers
const apDeltaSign = computed(() => {
  if (!report.value?.cogs.cash) return ''
  const delta = report.value.cogs.cash.accountsPayableDelta
  if (delta > 0) return '-' // Positive delta = credit increased = reduce COGS
  if (delta < 0) return '+' // Negative delta = credit decreased = increase COGS
  return ''
})

const apDeltaClass = computed(() => {
  if (!report.value?.cogs.cash) return ''
  const delta = report.value.cogs.cash.accountsPayableDelta
  if (delta > 0) return 'text-success' // Credit increased (good for cash flow)
  if (delta < 0) return 'text-error' // Credit decreased (paid off debt)
  return ''
})

// ✅ SPRINT 4: Inventory Change display helpers
const inventoryChangeSign = computed(() => {
  if (!report.value?.cogs.cash) return ''
  const change = report.value.cogs.cash.inventoryChange
  if (change > 0) return '-' // Positive change = inventory increased = reduce COGS
  if (change < 0) return '+' // Negative change = inventory decreased = increase COGS
  return ''
})

const inventoryChangeClass = computed(() => {
  if (!report.value?.cogs.cash) return ''
  const change = report.value.cogs.cash.inventoryChange
  if (change > 0) return 'text-success' // Inventory increased
  if (change < 0) return 'text-error' // Inventory decreased
  return ''
})
</script>

<style scoped lang="scss">
.pl-report-view {
  .v-table {
    tr.section-header td {
      padding-top: 12px;
      padding-bottom: 8px;
    }

    tbody tr:hover {
      background-color: transparent !important;
    }
  }
}
</style>
