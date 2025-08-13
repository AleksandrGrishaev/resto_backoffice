<!-- src/views/storage/components/tabs/StorageAnalyticsTab.vue - CLEANED -->
<template>
  <div class="storage-analytics-tab">
    <!-- Overview Cards -->
    <v-row class="mb-6">
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center pa-4">
            <v-icon icon="mdi-package-variant" size="40" color="primary" class="mb-2" />
            <div class="text-h4 font-weight-bold">{{ totalProducts }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Products</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center pa-4">
            <v-icon icon="mdi-currency-usd" size="40" color="success" class="mb-2" />
            <div class="text-h4 font-weight-bold">{{ formatIDR(totalValue) }}</div>
            <div class="text-body-2 text-medium-emphasis">Total Value</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center pa-4">
            <v-icon
              icon="mdi-alert-circle"
              size="40"
              :color="alertsCount > 0 ? 'warning' : 'success'"
              class="mb-2"
            />
            <div class="text-h4 font-weight-bold">{{ alertsCount }}</div>
            <div class="text-body-2 text-medium-emphasis">Active Alerts</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text class="text-center pa-4">
            <v-icon icon="mdi-chart-line" size="40" color="info" class="mb-2" />
            <div class="text-h4 font-weight-bold">{{ averageCost }}</div>
            <div class="text-body-2 text-medium-emphasis">Avg Cost/Unit</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Analytics Charts Row -->
    <v-row class="mb-6">
      <!-- Inventory Value Trend -->
      <v-col cols="12" lg="8">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            <span>Inventory Value Trend</span>
            <v-btn-toggle v-model="valueChartPeriod" density="compact" size="small">
              <v-btn value="7d">7D</v-btn>
              <v-btn value="30d">30D</v-btn>
              <v-btn value="90d">90D</v-btn>
            </v-btn-toggle>
          </v-card-title>
          <v-card-text>
            <div class="chart-container" style="height: 300px">
              <!-- Mock chart placeholder -->
              <div class="d-flex align-center justify-center h-100 text-medium-emphasis">
                <div class="text-center">
                  <v-icon icon="mdi-chart-line" size="64" class="mb-2" />
                  <div>Inventory Value Chart</div>
                  <div class="text-caption">{{ valueChartPeriod }} period</div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Stock Alerts Breakdown -->
      <v-col cols="12" lg="4">
        <v-card>
          <v-card-title>Stock Alerts</v-card-title>
          <v-card-text>
            <div class="alerts-breakdown">
              <!-- Expired Items -->
              <div class="alert-item mb-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-clock-alert" color="error" class="mr-2" />
                    <span>Expired</span>
                  </div>
                  <v-chip color="error" size="small" variant="flat">
                    {{ expiredCount }}
                  </v-chip>
                </div>
                <v-progress-linear
                  :model-value="getAlertPercentage('expired')"
                  color="error"
                  height="4"
                  rounded
                  class="mt-1"
                />
              </div>

              <!-- Expiring Soon -->
              <div class="alert-item mb-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-clock-outline" color="warning" class="mr-2" />
                    <span>Expiring Soon</span>
                  </div>
                  <v-chip color="warning" size="small" variant="flat">
                    {{ expiringCount }}
                  </v-chip>
                </div>
                <v-progress-linear
                  :model-value="getAlertPercentage('expiring')"
                  color="warning"
                  height="4"
                  rounded
                  class="mt-1"
                />
              </div>

              <!-- Low Stock -->
              <div class="alert-item">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-package-down" color="info" class="mr-2" />
                    <span>Low Stock</span>
                  </div>
                  <v-chip color="info" size="small" variant="flat">
                    {{ lowStockCount }}
                  </v-chip>
                </div>
                <v-progress-linear
                  :model-value="getAlertPercentage('lowStock')"
                  color="info"
                  height="4"
                  rounded
                  class="mt-1"
                />
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Detailed Analytics Row -->
    <v-row class="mb-6">
      <!-- Top Products by Value -->
      <v-col cols="12" lg="6">
        <v-card>
          <v-card-title>Top Products by Value</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item
                v-for="(product, index) in topProductsByValue"
                :key="product.itemId"
                class="px-0"
              >
                <template #prepend>
                  <v-chip :text="String(index + 1)" size="small" variant="tonal" class="mr-3" />
                </template>
                <v-list-item-title>{{ product.itemName }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ product.totalQuantity }} {{ product.unit }}
                </v-list-item-subtitle>
                <template #append>
                  <div class="text-right">
                    <div class="font-weight-medium">{{ formatIDR(product.totalValue) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(product.averageCost) }}/{{ product.unit }}
                    </div>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Recent Operations Summary -->
      <v-col cols="12" lg="6">
        <v-card>
          <v-card-title>Recent Activity</v-card-title>
          <v-card-text>
            <div class="operations-summary">
              <div class="summary-item mb-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-plus-circle" color="success" class="mr-2" />
                    <span>Receipts (7d)</span>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-medium">{{ recentReceipts.length }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(recentReceiptsValue) }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="summary-item mb-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-minus-circle" color="error" class="mr-2" />
                    <span>Write-offs (7d)</span>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-medium">{{ recentWriteOffs.length }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(recentWriteOffsValue) }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="summary-item">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-clipboard-list" color="primary" class="mr-2" />
                    <span>Inventories (30d)</span>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-medium">{{ recentInventories.length }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ recentInventoriesDiscrepancies }} discrepancies
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Cost Trends -->
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Cost Trends Analysis</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <div class="trend-item text-center">
                  <v-icon
                    :icon="
                      costTrend === 'up'
                        ? 'mdi-trending-up'
                        : costTrend === 'down'
                          ? 'mdi-trending-down'
                          : 'mdi-trending-neutral'
                    "
                    :color="
                      costTrend === 'up' ? 'error' : costTrend === 'down' ? 'success' : 'warning'
                    "
                    size="40"
                    class="mb-2"
                  />
                  <div class="text-h6 font-weight-bold">{{ costTrendText }}</div>
                  <div class="text-body-2 text-medium-emphasis">Average Cost Trend</div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="trend-item text-center">
                  <v-icon icon="mdi-chart-box-outline" color="info" size="40" class="mb-2" />
                  <div class="text-h6 font-weight-bold">{{ priceVolatilityProducts }}</div>
                  <div class="text-body-2 text-medium-emphasis">High Price Volatility</div>
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <div class="trend-item text-center">
                  <v-icon icon="mdi-speedometer" color="primary" size="40" class="mb-2" />
                  <div class="text-h6 font-weight-bold">{{ stockTurnover }}</div>
                  <div class="text-body-2 text-medium-emphasis">Avg Stock Turnover</div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { formatIDR } from '@/utils/currency'
import type { StorageDepartment } from '@/stores/storage/types'

interface Props {
  department: StorageDepartment
}

const props = defineProps<Props>()

// Store
const storageStore = useStorageStore()

// State
const valueChartPeriod = ref('30d')

// Computed
const departmentBalances = computed(() => {
  return storageStore.departmentBalances(props.department)
})

const departmentOperations = computed(() => {
  return storageStore.state.operations.filter(op => op.department === props.department)
})

// Basic Stats
const totalProducts = computed(() => departmentBalances.value.length)

const totalValue = computed(() => {
  return departmentBalances.value.reduce((sum, balance) => sum + balance.totalValue, 0)
})

const averageCost = computed(() => {
  if (departmentBalances.value.length === 0) return 0
  const totalCost = departmentBalances.value.reduce((sum, balance) => sum + balance.averageCost, 0)
  return Math.round(totalCost / departmentBalances.value.length)
})

// Alert Counts
const expiredCount = computed(() => {
  return departmentBalances.value.filter(b => b.hasExpired).length
})

const expiringCount = computed(() => {
  return departmentBalances.value.filter(b => b.hasNearExpiry).length
})

const lowStockCount = computed(() => {
  return departmentBalances.value.filter(b => b.belowMinStock).length
})

const alertsCount = computed(() => {
  return expiredCount.value + expiringCount.value + lowStockCount.value
})

// Top Products
const topProductsByValue = computed(() => {
  return [...departmentBalances.value].sort((a, b) => b.totalValue - a.totalValue).slice(0, 5)
})

// Recent Operations
const recentReceipts = computed(() => {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  return departmentOperations.value.filter(
    op => op.operationType === 'receipt' && new Date(op.operationDate) >= sevenDaysAgo
  )
})

const recentWriteOffs = computed(() => {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  return departmentOperations.value.filter(
    op => op.operationType === 'write_off' && new Date(op.operationDate) >= sevenDaysAgo
  )
})

const recentInventories = computed(() => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return storageStore.state.inventories.filter(
    inv => inv.department === props.department && new Date(inv.inventoryDate) >= thirtyDaysAgo
  )
})

// Values
const recentReceiptsValue = computed(() => {
  return recentReceipts.value.reduce((sum, op) => sum + (op.totalValue || 0), 0)
})

const recentWriteOffsValue = computed(() => {
  return recentWriteOffs.value.reduce((sum, op) => sum + (op.totalValue || 0), 0)
})

const recentInventoriesDiscrepancies = computed(() => {
  return recentInventories.value.reduce((sum, inv) => sum + (inv.totalDiscrepancies || 0), 0)
})

// Cost Trends
const costTrend = computed(() => {
  const productsWithTrend = departmentBalances.value.filter(b => b.costTrend)
  if (productsWithTrend.length === 0) return 'stable'

  const upCount = productsWithTrend.filter(b => b.costTrend === 'up').length
  const downCount = productsWithTrend.filter(b => b.costTrend === 'down').length

  if (upCount > downCount) return 'up'
  if (downCount > upCount) return 'down'
  return 'stable'
})

const costTrendText = computed(() => {
  switch (costTrend.value) {
    case 'up':
      return 'Rising'
    case 'down':
      return 'Falling'
    default:
      return 'Stable'
  }
})

const priceVolatilityProducts = computed(() => {
  return departmentBalances.value.filter(b => b.costTrend === 'up' || b.costTrend === 'down').length
})

const stockTurnover = computed(() => {
  // Mock calculation - in real app would be based on usage patterns
  return '2.3x'
})

// Methods
function getAlertPercentage(type: 'expired' | 'expiring' | 'lowStock'): number {
  if (totalProducts.value === 0) return 0

  let count = 0
  switch (type) {
    case 'expired':
      count = expiredCount.value
      break
    case 'expiring':
      count = expiringCount.value
      break
    case 'lowStock':
      count = lowStockCount.value
      break
  }

  return (count / totalProducts.value) * 100
}
</script>

<style lang="scss" scoped>
.storage-analytics-tab {
  .chart-container {
    border: 1px solid rgba(var(--v-theme-outline), 0.2);
    border-radius: 8px;
    background: rgba(var(--v-theme-surface-variant), 0.3);
  }

  .alerts-breakdown {
    .alert-item {
      padding: 12px 0;
      border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);

      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
    }
  }

  .operations-summary {
    .summary-item {
      padding: 12px 0;
      border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);

      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
    }
  }

  .trend-item {
    padding: 16px;
    border-radius: 8px;
    background: rgba(var(--v-theme-surface-variant), 0.3);
  }
}

.v-card {
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.v-list-item {
  &:hover {
    background: rgba(var(--v-theme-primary), 0.04);
  }
}
</style>
