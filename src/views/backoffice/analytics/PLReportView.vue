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
          <v-card class="mb-4" variant="outlined">
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

          <!-- Summary Cards -->
          <v-row class="mb-4">
            <v-col cols="12" md="3">
              <v-card color="primary" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Total Revenue</div>
                  <div class="text-h5">{{ formatIDR(report.revenue.total) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="warning" variant="tonal">
                <v-card-text>
                  <div class="text-caption">COGS</div>
                  <div class="text-h5">{{ formatIDR(report.cogs.total) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="info" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Gross Profit</div>
                  <div class="text-h5">{{ formatIDR(report.grossProfit.amount) }}</div>
                  <div class="text-caption">{{ report.grossProfit.margin.toFixed(1) }}% margin</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
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
          <v-card variant="outlined">
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

                  <!-- COGS Section -->
                  <tr class="section-header">
                    <td colspan="3" class="font-weight-bold text-warning">
                      COST OF GOODS SOLD (COGS)
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Food Cost</td>
                    <td class="text-right">{{ formatIDR(report.cogs.foodCost) }}</td>
                    <td class="text-right">
                      {{ calculatePercentage(report.cogs.foodCost, report.revenue.total) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Beverage Cost</td>
                    <td class="text-right">{{ formatIDR(report.cogs.beverageCost) }}</td>
                    <td class="text-right">
                      {{ calculatePercentage(report.cogs.beverageCost, report.revenue.total) }}
                    </td>
                  </tr>
                  <tr class="font-weight-bold">
                    <td>Total COGS</td>
                    <td class="text-right">{{ formatIDR(report.cogs.total) }}</td>
                    <td class="text-right">
                      {{ calculatePercentage(report.cogs.total, report.revenue.total) }}
                    </td>
                  </tr>

                  <tr><td colspan="3" class="py-2"></td></tr>

                  <!-- Gross Profit -->
                  <tr class="font-weight-bold bg-surface-variant">
                    <td>GROSS PROFIT</td>
                    <td class="text-right">{{ formatIDR(report.grossProfit.amount) }}</td>
                    <td class="text-right">{{ report.grossProfit.margin.toFixed(1) }}%</td>
                  </tr>

                  <tr><td colspan="3" class="py-2"></td></tr>

                  <!-- OPEX Section -->
                  <tr class="section-header">
                    <td colspan="3" class="font-weight-bold text-error">
                      OPERATING EXPENSES (OPEX)
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Supplier Payments</td>
                    <td class="text-right">
                      {{ formatIDR(report.opex.byCategory.suppliersPayments) }}
                    </td>
                    <td class="text-right">
                      {{
                        calculatePercentage(
                          report.opex.byCategory.suppliersPayments,
                          report.revenue.total
                        )
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Utilities</td>
                    <td class="text-right">{{ formatIDR(report.opex.byCategory.utilities) }}</td>
                    <td class="text-right">
                      {{
                        calculatePercentage(report.opex.byCategory.utilities, report.revenue.total)
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Salary</td>
                    <td class="text-right">{{ formatIDR(report.opex.byCategory.salary) }}</td>
                    <td class="text-right">
                      {{ calculatePercentage(report.opex.byCategory.salary, report.revenue.total) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Rent</td>
                    <td class="text-right">{{ formatIDR(report.opex.byCategory.rent) }}</td>
                    <td class="text-right">
                      {{ calculatePercentage(report.opex.byCategory.rent, report.revenue.total) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Transport</td>
                    <td class="text-right">{{ formatIDR(report.opex.byCategory.transport) }}</td>
                    <td class="text-right">
                      {{
                        calculatePercentage(report.opex.byCategory.transport, report.revenue.total)
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Cleaning</td>
                    <td class="text-right">{{ formatIDR(report.opex.byCategory.cleaning) }}</td>
                    <td class="text-right">
                      {{
                        calculatePercentage(report.opex.byCategory.cleaning, report.revenue.total)
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Security</td>
                    <td class="text-right">{{ formatIDR(report.opex.byCategory.security) }}</td>
                    <td class="text-right">
                      {{
                        calculatePercentage(report.opex.byCategory.security, report.revenue.total)
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Renovation</td>
                    <td class="text-right">{{ formatIDR(report.opex.byCategory.renovation) }}</td>
                    <td class="text-right">
                      {{
                        calculatePercentage(report.opex.byCategory.renovation, report.revenue.total)
                      }}
                    </td>
                  </tr>
                  <tr>
                    <td class="pl-8">Other</td>
                    <td class="text-right">{{ formatIDR(report.opex.byCategory.other) }}</td>
                    <td class="text-right">
                      {{ calculatePercentage(report.opex.byCategory.other, report.revenue.total) }}
                    </td>
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
                  <tr class="font-weight-bold bg-surface-variant">
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
import { usePLReportStore } from '@/stores/analytics/plReportStore'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'
import type { PLReport } from '@/stores/analytics/types'

// Store
const plReportStore = usePLReportStore()

// State
const dateFrom = ref('')
const dateTo = ref('')
const report = computed(() => plReportStore.currentReport)
const loading = computed(() => plReportStore.loading)
const error = ref<string | null>(null)

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
    await plReportStore.generateReport(dateFrom.value, dateTo.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate report'
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

// Computed
const netProfitColor = computed(() => {
  if (!report.value) return 'grey'
  return report.value.netProfit.amount >= 0 ? 'success' : 'error'
})

const netProfitClass = computed(() => {
  if (!report.value) return ''
  return report.value.netProfit.amount >= 0 ? 'text-success' : 'text-error'
})
</script>

<style scoped lang="scss">
.pl-report-view {
  .section-header {
    background-color: rgba(var(--v-theme-surface-variant), 0.5);
  }

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
