<!-- src/views/kitchen/kpi/components/TimeKpiTab.vue -->
<template>
  <v-card class="time-kpi-tab" flat>
    <!-- Inner Tabs -->
    <v-card-title class="pa-0">
      <v-tabs v-model="innerTab" density="compact" color="primary">
        <v-tab value="details">
          <v-icon start size="18">mdi-format-list-bulleted</v-icon>
          Item Details
        </v-tab>
        <v-tab value="totals">
          <v-icon start size="18">mdi-chart-bar</v-icon>
          Total Items
        </v-tab>
      </v-tabs>
      <v-spacer />
      <v-btn
        v-if="innerTab === 'details' && historicalDetail.length > 0"
        size="small"
        variant="text"
        class="mr-2"
        :loading="loading"
        @click="emit('load-more')"
      >
        Load More
      </v-btn>
    </v-card-title>

    <v-card-text class="pa-0">
      <!-- Item Details Tab -->
      <template v-if="innerTab === 'details'">
        <!-- Empty State -->
        <div v-if="historicalDetail.length === 0 && !loading" class="empty-state">
          <v-icon size="48" color="grey">mdi-clock-check-outline</v-icon>
          <p class="text-medium-emphasis mt-2">No completed items today</p>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading && historicalDetail.length === 0" class="loading-state">
          <v-progress-circular indeterminate size="32" />
          <p class="text-medium-emphasis mt-2">Loading items...</p>
        </div>

        <!-- Items Table -->
        <v-table v-else class="kpi-table" density="compact">
          <thead>
            <tr>
              <th class="text-left">Order</th>
              <th class="text-left">Item</th>
              <th class="text-center">Dept</th>
              <th class="text-right">Wait</th>
              <th class="text-right">Cook</th>
              <th class="text-right">Total</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in historicalDetail"
              :key="item.itemId"
              :class="{ exceeded: item.exceededPlan }"
            >
              <td class="order-cell">
                <span class="order-number">{{ item.orderNumber }}</span>
              </td>
              <td class="product-cell">{{ item.productName }}</td>
              <td class="text-center">
                <v-chip
                  size="x-small"
                  :color="item.department === 'bar' ? 'purple' : 'orange'"
                  variant="tonal"
                >
                  {{ item.department === 'bar' ? 'Bar' : 'Kitchen' }}
                </v-chip>
              </td>
              <td class="text-right time-cell">{{ formatTime(item.waitingSeconds) }}</td>
              <td class="text-right time-cell">{{ formatTime(item.cookingSeconds) }}</td>
              <td class="text-right time-cell" :class="getTotalTimeClass(item)">
                {{ formatTime(item.totalSeconds) }}
              </td>
              <td class="text-center">
                <v-icon :color="item.exceededPlan ? 'error' : 'success'" size="18">
                  {{ item.exceededPlan ? 'mdi-clock-alert-outline' : 'mdi-check-circle-outline' }}
                </v-icon>
              </td>
            </tr>
          </tbody>
        </v-table>
      </template>

      <!-- Total Items Tab (Aggregated by Product) -->
      <template v-else-if="innerTab === 'totals'">
        <!-- Empty State -->
        <div v-if="productStats.length === 0 && !loading" class="empty-state">
          <v-icon size="48" color="grey">mdi-chart-bar</v-icon>
          <p class="text-medium-emphasis mt-2">No data to aggregate</p>
        </div>

        <!-- Loading State -->
        <div v-else-if="loading && productStats.length === 0" class="loading-state">
          <v-progress-circular indeterminate size="32" />
          <p class="text-medium-emphasis mt-2">Loading data...</p>
        </div>

        <!-- Aggregated Table -->
        <v-table v-else class="kpi-table" density="compact">
          <thead>
            <tr>
              <th class="text-left">Product</th>
              <th class="text-center">Dept</th>
              <th class="text-right">Count</th>
              <th class="text-right">Avg Wait</th>
              <th class="text-right">Avg Cook</th>
              <th class="text-right">Avg Total</th>
              <th class="text-right">Exceeded</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stat in productStats" :key="stat.productName + stat.department">
              <td class="product-cell">
                <span class="font-weight-medium">{{ stat.productName }}</span>
              </td>
              <td class="text-center">
                <v-chip
                  size="x-small"
                  :color="stat.department === 'bar' ? 'purple' : 'orange'"
                  variant="tonal"
                >
                  {{ stat.department === 'bar' ? 'Bar' : 'Kitchen' }}
                </v-chip>
              </td>
              <td class="text-right">{{ stat.count }}</td>
              <td class="text-right time-cell">{{ formatTime(stat.avgWaitingSeconds) }}</td>
              <td class="text-right time-cell">{{ formatTime(stat.avgCookingSeconds) }}</td>
              <td class="text-right time-cell" :class="getProductTotalTimeClass(stat)">
                {{ formatTime(stat.avgTotalSeconds) }}
              </td>
              <td class="text-right">
                <span :class="getExceededRateClass(stat.exceededRate)">
                  {{ stat.exceededCount }} ({{ stat.exceededRate }}%)
                </span>
              </td>
            </tr>
          </tbody>
        </v-table>
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { PLAN_TIMES } from '@/stores/kitchenKpi/composables'
import type { TimeKpiMetrics, TimeKpiDetailEntry } from '@/stores/kitchenKpi/types'

// =============================================
// PROPS
// =============================================

interface Props {
  metrics: TimeKpiMetrics
  historicalDetail: TimeKpiDetailEntry[]
  loading?: boolean
  department?: 'all' | 'kitchen' | 'bar'
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  department: 'all'
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'load-more': []
}>()

// =============================================
// STATE
// =============================================

const innerTab = ref<'details' | 'totals'>('details')

// =============================================
// TYPES
// =============================================

interface ProductStat {
  productName: string
  department: string
  count: number
  avgWaitingSeconds: number
  avgCookingSeconds: number
  avgTotalSeconds: number
  exceededCount: number
  exceededRate: number
}

// =============================================
// COMPUTED
// =============================================

/**
 * Aggregate statistics by product name + department
 */
const productStats = computed<ProductStat[]>(() => {
  if (props.historicalDetail.length === 0) return []

  // Group by product + department
  const grouped = new Map<
    string,
    {
      productName: string
      department: string
      totalWaiting: number
      totalCooking: number
      totalTime: number
      count: number
      exceededCount: number
    }
  >()

  for (const item of props.historicalDetail) {
    const key = `${item.productName}|${item.department}`
    const existing = grouped.get(key)

    if (existing) {
      existing.totalWaiting += item.waitingSeconds
      existing.totalCooking += item.cookingSeconds
      existing.totalTime += item.totalSeconds
      existing.count += 1
      if (item.exceededPlan) existing.exceededCount += 1
    } else {
      grouped.set(key, {
        productName: item.productName,
        department: item.department,
        totalWaiting: item.waitingSeconds,
        totalCooking: item.cookingSeconds,
        totalTime: item.totalSeconds,
        count: 1,
        exceededCount: item.exceededPlan ? 1 : 0
      })
    }
  }

  // Calculate averages and sort by count desc
  return Array.from(grouped.values())
    .map(g => ({
      productName: g.productName,
      department: g.department,
      count: g.count,
      avgWaitingSeconds: Math.round(g.totalWaiting / g.count),
      avgCookingSeconds: Math.round(g.totalCooking / g.count),
      avgTotalSeconds: Math.round(g.totalTime / g.count),
      exceededCount: g.exceededCount,
      exceededRate: Math.round((g.exceededCount / g.count) * 100)
    }))
    .sort((a, b) => b.count - a.count)
})

// =============================================
// METHODS
// =============================================

const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const getTotalTimeClass = (item: TimeKpiDetailEntry): string => {
  const planTime = item.department === 'bar' ? PLAN_TIMES.bar : PLAN_TIMES.kitchen
  if (item.totalSeconds <= planTime) return 'text-success'
  if (item.totalSeconds <= planTime * 1.2) return 'text-warning'
  return 'text-error'
}

const getProductTotalTimeClass = (stat: ProductStat): string => {
  const planTime = stat.department === 'bar' ? PLAN_TIMES.bar : PLAN_TIMES.kitchen
  if (stat.avgTotalSeconds <= planTime) return 'text-success'
  if (stat.avgTotalSeconds <= planTime * 1.2) return 'text-warning'
  return 'text-error'
}

const getExceededRateClass = (rate: number): string => {
  if (rate === 0) return 'text-success'
  if (rate <= 20) return 'text-warning'
  return 'text-error'
}
</script>

<style scoped lang="scss">
.time-kpi-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: transparent;
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  min-height: 200px;
}

.kpi-table {
  background-color: transparent;

  th {
    font-weight: 600;
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(var(--v-theme-on-surface), 0.6);
    white-space: nowrap;
  }

  td {
    font-size: var(--text-sm);
  }

  tr.exceeded {
    background-color: rgba(var(--v-theme-error), 0.08);
  }
}

.order-cell {
  min-width: 70px;
}

.order-number {
  font-weight: 600;
  font-feature-settings: 'tnum';
}

.product-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.time-cell {
  font-feature-settings: 'tnum';
  font-weight: 500;
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-warning {
  color: rgb(var(--v-theme-warning));
}

.text-error {
  color: rgb(var(--v-theme-error));
}

/* Responsive */
@media (max-width: 768px) {
  .kpi-table {
    font-size: var(--text-xs);

    th,
    td {
      padding: 6px 8px;
    }
  }

  .product-cell {
    max-width: 120px;
  }
}
</style>
