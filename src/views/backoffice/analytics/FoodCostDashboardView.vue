<!-- src/views/backoffice/analytics/FoodCostDashboardView.vue -->
<!-- ✅ SPRINT 5: Food Cost Dashboard UI Component -->

<template>
  <div class="food-cost-dashboard-view">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-4">Food Cost Dashboard</h1>
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
          <v-text-field
            v-model.number="targetPercentage"
            label="Target %"
            type="number"
            variant="outlined"
            density="compact"
            suffix="%"
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
            @click="handleGenerateDashboard"
          >
            Generate
          </v-btn>
        </v-col>
        <v-col cols="12" md="2">
          <v-btn
            v-if="dashboard"
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

      <!-- Dashboard Content -->
      <v-row v-if="dashboard && !loading">
        <!-- Summary Cards -->
        <v-col cols="12">
          <v-row>
            <v-col cols="12" md="3">
              <v-card color="primary" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Total Revenue</div>
                  <div class="text-h5">{{ formatIDR(dashboard.summary.revenue) }}</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="warning" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Food Cost</div>
                  <div class="text-h5">{{ formatIDR(dashboard.summary.foodCost) }}</div>
                  <div class="text-caption">
                    {{ dashboard.summary.foodCostPercentage.toFixed(1) }}% of revenue
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card color="info" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Target Food Cost %</div>
                  <div class="text-h5">
                    {{ dashboard.summary.targetFoodCostPercentage.toFixed(1) }}%
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card :color="varianceColor" variant="tonal">
                <v-card-text>
                  <div class="text-caption">Variance</div>
                  <div class="text-h5">
                    {{ dashboard.summary.variance > 0 ? '+' : ''
                    }}{{ dashboard.summary.variance.toFixed(1) }}%
                  </div>
                  <div class="text-caption">{{ varianceLabel }}</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>

        <!-- Department Breakdown -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title>Department Breakdown</v-card-title>
            <v-divider />
            <v-card-text>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th class="text-left">Department</th>
                    <th class="text-right">Revenue</th>
                    <th class="text-right">Cost</th>
                    <th class="text-right">Cost %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="font-weight-medium">Kitchen</td>
                    <td class="text-right">
                      {{ formatIDR(dashboard.byDepartment.kitchen.revenue) }}
                    </td>
                    <td class="text-right">{{ formatIDR(dashboard.byDepartment.kitchen.cost) }}</td>
                    <td class="text-right">
                      <v-chip
                        size="small"
                        :color="getCostPercentageColor(dashboard.byDepartment.kitchen.percentage)"
                      >
                        {{ dashboard.byDepartment.kitchen.percentage.toFixed(1) }}%
                      </v-chip>
                    </td>
                  </tr>
                  <tr>
                    <td class="font-weight-medium">Bar</td>
                    <td class="text-right">{{ formatIDR(dashboard.byDepartment.bar.revenue) }}</td>
                    <td class="text-right">{{ formatIDR(dashboard.byDepartment.bar.cost) }}</td>
                    <td class="text-right">
                      <v-chip
                        size="small"
                        :color="getCostPercentageColor(dashboard.byDepartment.bar.percentage)"
                      >
                        {{ dashboard.byDepartment.bar.percentage.toFixed(1) }}%
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Daily Trend (Simple Table) -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title>Daily Trend</v-card-title>
            <v-divider />
            <v-card-text style="max-height: 300px; overflow-y: auto">
              <v-table density="compact">
                <thead>
                  <tr>
                    <th class="text-left">Date</th>
                    <th class="text-right">Revenue</th>
                    <th class="text-right">Cost</th>
                    <th class="text-right">Cost %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="day in dashboard.dailyBreakdown" :key="day.date">
                    <td>{{ formatDate(day.date) }}</td>
                    <td class="text-right">{{ formatIDR(day.revenue) }}</td>
                    <td class="text-right">{{ formatIDR(day.foodCost) }}</td>
                    <td class="text-right">
                      <v-chip size="small" :color="getCostPercentageColor(day.foodCostPercentage)">
                        {{ day.foodCostPercentage.toFixed(1) }}%
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Top 10 Items by Cost -->
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-title>Top 10 Items by Cost</v-card-title>
            <v-divider />
            <v-card-text>
              <v-table density="comfortable">
                <thead>
                  <tr>
                    <th class="text-left">#</th>
                    <th class="text-left">Item</th>
                    <th class="text-left">Variant</th>
                    <th class="text-right">Qty Sold</th>
                    <th class="text-right">Revenue</th>
                    <th class="text-right">Cost</th>
                    <th class="text-right">Cost %</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in dashboard.topItemsByCost" :key="item.menuItemId">
                    <td>{{ index + 1 }}</td>
                    <td class="font-weight-medium">{{ item.menuItemName }}</td>
                    <td>{{ item.variantName }}</td>
                    <td class="text-right">{{ item.quantitySold }}</td>
                    <td class="text-right">{{ formatIDR(item.totalRevenue) }}</td>
                    <td class="text-right">{{ formatIDR(item.totalCost) }}</td>
                    <td class="text-right">
                      <v-chip size="small" :color="getCostPercentageColor(item.costPercentage)">
                        {{ item.costPercentage.toFixed(1) }}%
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-if="!dashboard && !loading">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-pie</v-icon>
              <div class="text-h6 text-medium-emphasis">No Dashboard Generated</div>
              <div class="text-body-2 text-medium-emphasis">
                Select a date range and click "Generate" to view Food Cost analytics
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
import { useFoodCostStore } from '@/stores/analytics/foodCostStore'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

// Store
const foodCostStore = useFoodCostStore()

// State
const dateFrom = ref('')
const dateTo = ref('')
const targetPercentage = ref(30) // Default target: 30%
const dashboard = computed(() => foodCostStore.currentDashboard)
const loading = computed(() => foodCostStore.loading)
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
async function handleGenerateDashboard() {
  try {
    error.value = null
    await foodCostStore.generateDashboard(dateFrom.value, dateTo.value, targetPercentage.value)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate dashboard'
  }
}

function handleExportJSON() {
  if (!dashboard.value) return

  const json = foodCostStore.exportDashboardToJSON(dashboard.value)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `food-cost-dashboard-${dashboard.value.period.dateFrom}-${dashboard.value.period.dateTo}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function formatDate(dateString: string): string {
  return TimeUtils.formatDateForDisplay(dateString)
}

function getCostPercentageColor(percentage: number): string {
  if (percentage > targetPercentage.value + 5) return 'error'
  if (percentage > targetPercentage.value) return 'warning'
  return 'success'
}

// Computed
const varianceColor = computed(() => {
  if (!dashboard.value) return 'grey'
  const variance = dashboard.value.summary.variance
  if (variance > 5) return 'error'
  if (variance > 0) return 'warning'
  return 'success'
})

const varianceLabel = computed(() => {
  if (!dashboard.value) return ''
  const variance = dashboard.value.summary.variance
  if (variance > 5) return 'Significantly over target'
  if (variance > 0) return 'Over target'
  if (variance < -5) return 'Significantly under target'
  if (variance < 0) return 'Under target'
  return 'On target'
})
</script>

<style scoped lang="scss">
.food-cost-dashboard-view {
  .v-table {
    tbody tr:hover {
      background-color: transparent !important;
    }
  }
}
</style>
