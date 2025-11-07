<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Sales Analytics</h1>
      </v-col>
    </v-row>

    <!-- Date Range Filter -->
    <v-row>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="dateFrom"
          label="Date From"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="dateTo"
          label="Date To"
          type="date"
          variant="outlined"
          density="compact"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-btn color="primary" :loading="loading" block @click="loadStatistics">Apply Filter</v-btn>
      </v-col>
    </v-row>

    <!-- Summary Cards -->
    <v-row class="mt-4">
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Total Revenue</div>
            <div class="text-h5 mt-2">{{ formatCurrency(statistics?.totalRevenue || 0) }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Total Cost</div>
            <div class="text-h5 mt-2">{{ formatCurrency(statistics?.totalCost || 0) }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Total Profit</div>
            <div class="text-h5 mt-2 text-success">
              {{ formatCurrency(statistics?.totalProfit || 0) }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Profit Margin</div>
            <div class="text-h5 mt-2">{{ formatPercent(statistics?.averageMargin || 0) }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Additional Stats -->
    <v-row class="mt-2">
      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Total Transactions</div>
            <div class="text-h6 mt-2">{{ statistics?.totalTransactions || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Items Sold</div>
            <div class="text-h6 mt-2">{{ statistics?.totalItemsSold || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Average Order Value</div>
            <div class="text-h6 mt-2">
              {{
                formatCurrency(
                  statistics?.totalTransactions
                    ? statistics.totalRevenue / statistics.totalTransactions
                    : 0
                )
              }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Top Selling Items -->
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card>
          <v-card-title>Top Selling Items</v-card-title>
          <v-card-text>
            <v-data-table
              :headers="itemHeaders"
              :items="statistics?.topSellingItems || []"
              :items-per-page="10"
              density="compact"
            >
              <template #[`item.quantitySold`]="{ item }">
                <span class="font-weight-bold">{{ item.quantitySold }}</span>
              </template>

              <template #[`item.totalRevenue`]="{ item }">
                {{ formatCurrency(item.totalRevenue) }}
              </template>

              <template #[`item.totalCost`]="{ item }">
                {{ formatCurrency(item.totalCost) }}
              </template>

              <template #[`item.totalProfit`]="{ item }">
                <span class="text-success font-weight-bold">
                  {{ formatCurrency(item.totalProfit) }}
                </span>
              </template>

              <template #[`item.averageMargin`]="{ item }">
                <v-chip :color="getMarginColor(item.averageMargin)" size="small">
                  {{ formatPercent(item.averageMargin) }}
                </v-chip>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Payment Methods & Departments -->
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Revenue by Payment Method</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                v-for="(value, method) in statistics?.revenueByPaymentMethod"
                :key="method"
              >
                <v-list-item-title>
                  <span class="text-capitalize">{{ method }}</span>
                </v-list-item-title>
                <template #append>
                  <span class="font-weight-bold">{{ formatCurrency(value) }}</span>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Revenue by Department</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item>
                <v-list-item-title>Kitchen</v-list-item-title>
                <template #append>
                  <span class="font-weight-bold">
                    {{ formatCurrency(statistics?.revenueByDepartment?.kitchen || 0) }}
                  </span>
                </template>
              </v-list-item>
              <v-list-item>
                <v-list-item-title>Bar</v-list-item-title>
                <template #append>
                  <span class="font-weight-bold">
                    {{ formatCurrency(statistics?.revenueByDepartment?.bar || 0) }}
                  </span>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading Overlay -->
    <v-overlay :model-value="loading" class="align-center justify-center">
      <v-progress-circular indeterminate size="64" />
    </v-overlay>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" :timeout="5000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSalesStore } from '@/stores/sales'
import type { SalesStatistics } from '@/stores/sales'

const salesStore = useSalesStore()

// State
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const statistics = ref<SalesStatistics | null>(null)

// Filters
const dateFrom = ref(getDefaultDateFrom())
const dateTo = ref(getDefaultDateTo())

// Table headers
const itemHeaders = [
  { title: 'Item Name', key: 'menuItemName', sortable: true },
  { title: 'Qty Sold', key: 'quantitySold', sortable: true },
  { title: 'Revenue', key: 'totalRevenue', sortable: true },
  { title: 'Cost', key: 'totalCost', sortable: true },
  { title: 'Profit', key: 'totalProfit', sortable: true },
  { title: 'Margin', key: 'averageMargin', sortable: true }
]

// Methods
function getDefaultDateFrom(): string {
  const date = new Date()
  date.setDate(date.getDate() - 7) // Last 7 days
  return date.toISOString().split('T')[0]
}

function getDefaultDateTo(): string {
  return new Date().toISOString().split('T')[0]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value)
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function getMarginColor(margin: number): string {
  if (margin >= 70) return 'success'
  if (margin >= 50) return 'info'
  if (margin >= 30) return 'warning'
  return 'error'
}

async function loadStatistics() {
  loading.value = true
  showError.value = false

  try {
    const filters = {
      dateFrom: dateFrom.value ? new Date(dateFrom.value).toISOString() : undefined,
      dateTo: dateTo.value ? new Date(dateTo.value + 'T23:59:59').toISOString() : undefined
    }

    const result = await salesStore.getStatistics(filters)
    if (result) {
      statistics.value = result
    } else {
      throw new Error('Failed to load statistics')
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load statistics'
    showError.value = true
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(async () => {
  await loadStatistics()
})
</script>

<style scoped>
.text-success {
  color: rgb(var(--v-theme-success));
}
</style>
