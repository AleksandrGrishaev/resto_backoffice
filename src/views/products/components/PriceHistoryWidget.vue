<!-- src/views/products/components/PriceHistoryWidget.vue -->
<template>
  <v-card>
    <v-card-title class="d-flex align-center pb-2">
      <v-icon start color="info">mdi-chart-line</v-icon>
      <span>История цен</span>
      <v-spacer />
      <div class="d-flex align-center ga-2">
        <!-- 🆕 Period selector -->
        <v-btn-toggle
          v-model="selectedPeriod"
          variant="outlined"
          size="small"
          color="primary"
          @update:model-value="updatePeriod"
        >
          <v-btn value="1month" size="small">1М</v-btn>
          <v-btn value="3months" size="small">3М</v-btn>
          <v-btn value="1year" size="small">1Г</v-btn>
        </v-btn-toggle>

        <v-chip
          v-if="priceHistory.length > 0"
          :color="getTrendColor()"
          size="small"
          variant="tonal"
        >
          <v-icon start size="small">{{ getTrendIcon() }}</v-icon>
          {{ getTrendLabel() }}
        </v-chip>
        <v-btn
          size="small"
          variant="outlined"
          color="primary"
          :loading="loading"
          @click="generateMockHistory"
        >
          <v-icon start size="small">mdi-refresh</v-icon>
          Обновить
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <!-- Loading state -->
    <div v-if="loading" class="text-center pa-6">
      <v-progress-circular size="32" color="primary" indeterminate />
      <div class="text-body-2 text-medium-emphasis mt-2">Загрузка истории цен...</div>
    </div>

    <!-- Error state -->
    <v-alert
      v-else-if="error"
      type="error"
      variant="tonal"
      class="ma-4"
      closable
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- Content -->
    <div v-else>
      <!-- Price metrics -->
      <v-card-text class="pb-2">
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <div class="price-metric">
              <div class="price-metric__value text-h6 primary--text">
                {{ formatCurrency(currentPrice) }}
              </div>
              <div class="price-metric__label">Текущая цена</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatDate(latestPriceDate) }}
              </div>
            </div>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <div class="price-metric">
              <div class="price-metric__value text-h6 info--text">
                {{ formatCurrency(averagePrice) }}
              </div>
              <div class="price-metric__label">Средняя ({{ periodLabel }})</div>
              <div class="text-caption text-medium-emphasis">{{ priceHistory.length }} записей</div>
            </div>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <div class="price-metric">
              <div class="price-metric__value text-h6" :class="`${getChangeColor()}--text`">
                {{ changePercent >= 0 ? '+' : '' }}{{ changePercent.toFixed(1) }}%
              </div>
              <div class="price-metric__label">Изменение</div>
              <div class="text-caption text-medium-emphasis">
                За {{ periodLabel.toLowerCase() }}
              </div>
            </div>
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <div class="price-metric">
              <div class="price-metric__value text-h6 warning--text">
                {{ volatility.toFixed(1) }}%
              </div>
              <div class="price-metric__label">Волатильность</div>
              <div class="text-caption text-medium-emphasis">Стандартное отклонение</div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <!-- Chart -->
      <v-card-text class="pa-4">
        <div class="chart-container">
          <div class="chart-header mb-3">
            <div class="text-subtitle-2">Динамика цен за {{ chartPeriodDays }} дней</div>
            <div class="text-caption text-medium-emphasis">По {{ formatUnit(product.unit) }}</div>
          </div>

          <!-- Simple line chart using CSS -->
          <div class="price-chart">
            <div class="chart-y-axis">
              <div v-for="label in yAxisLabels" :key="label" class="y-axis-label">
                {{ formatCurrency(label) }}
              </div>
            </div>

            <div class="chart-area">
              <svg width="100%" height="200" viewBox="0 0 400 200" class="price-line-chart">
                <!-- Grid lines -->
                <g class="grid-lines">
                  <line
                    v-for="(_, index) in 4"
                    :key="`h-${index}`"
                    :x1="0"
                    :y1="index * 50 + 25"
                    :x2="400"
                    :y2="index * 50 + 25"
                    stroke="rgba(var(--v-theme-on-surface), 0.1)"
                    stroke-width="1"
                  />
                  <line
                    v-for="(_, index) in 6"
                    :key="`v-${index}`"
                    :x1="index * 66.67"
                    :y1="0"
                    :x2="index * 66.67"
                    :y2="200"
                    stroke="rgba(var(--v-theme-on-surface), 0.1)"
                    stroke-width="1"
                  />
                </g>

                <!-- Price line -->
                <polyline
                  :points="chartPoints"
                  fill="none"
                  stroke="rgb(var(--v-theme-primary))"
                  stroke-width="2"
                  class="price-line"
                />

                <!-- Data points -->
                <circle
                  v-for="(point, index) in chartData"
                  :key="index"
                  :cx="point.x"
                  :cy="point.y"
                  r="4"
                  :fill="getPointColor(point.price)"
                  class="price-point"
                >
                  <title>{{ formatDate(point.date) }}: {{ formatCurrency(point.price) }}</title>
                </circle>
              </svg>

              <!-- Trend indicator -->
              <div class="trend-indicator">
                <v-icon :color="getTrendColor()" size="small">
                  {{ getTrendIcon() }}
                </v-icon>
                <span class="text-caption">{{ getTrendDescription() }}</span>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>

      <!-- Price records table -->
      <v-divider />
      <v-card-text class="pa-4">
        <div class="d-flex align-center justify-space-between mb-3">
          <div class="text-subtitle-2">Последние изменения цен</div>
          <v-chip size="small" variant="outlined">{{ priceHistory.length }} записей</v-chip>
        </div>

        <div class="price-history-table">
          <div
            v-for="(record, index) in recentPriceHistory"
            :key="record.id"
            class="price-record"
            :class="{ 'price-record--latest': index === 0 }"
          >
            <div class="price-record__date">
              <div class="text-body-2 font-weight-medium">
                {{ formatDate(record.effectiveDate) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ getSourceLabel(record.sourceType) }}
              </div>
            </div>

            <div class="price-record__price">
              <div class="text-body-1 font-weight-medium">
                {{ formatCurrency(record.pricePerUnit) }}
              </div>
              <div
                v-if="index > 0"
                class="text-caption"
                :class="getPriceChangeClass(record, recentPriceHistory[index - 1])"
              >
                {{ getPriceChangeText(record, recentPriceHistory[index - 1]) }}
              </div>
            </div>

            <div class="price-record__source">
              <v-chip :color="getSourceColor(record.sourceType)" size="x-small" variant="tonal">
                {{ getSourceLabel(record.sourceType) }}
              </v-chip>
            </div>
          </div>

          <div v-if="priceHistory.length === 0" class="text-center pa-4">
            <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-chart-line-variant</v-icon>
            <div class="text-body-2 text-medium-emphasis">История цен пока не ведется</div>
            <div class="text-caption text-medium-emphasis">
              Данные появятся после первых поставок
            </div>
          </div>
        </div>
      </v-card-text>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Product } from '@/stores/productsStore'
import type { ProductPriceHistory } from '@/stores/productsStore/types'
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'
import { Formatter } from '@/utils'

// Props
interface Props {
  product: Product
}

const props = defineProps<Props>()

// Composables
const { getUnitName } = useMeasurementUnits()

// State
const loading = ref(false)
const error = ref<string | null>(null)
const priceHistory = ref<ProductPriceHistory[]>([])
const allPriceHistory = ref<ProductPriceHistory[]>([]) // 🆕 Store all data
const selectedPeriod = ref<'1month' | '3months' | '1year'>('1month') // 🆕 Period selector

// 🆕 Period configuration
const periodConfig = {
  '1month': { days: 30, label: '1 месяц', dataPoints: 6 },
  '3months': { days: 90, label: '3 месяца', dataPoints: 12 },
  '1year': { days: 365, label: '1 год', dataPoints: 24 }
}
// Mock data generation
const generateMockHistory = async (): Promise<void> => {
  loading.value = true
  error.value = null

  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))

    const now = new Date()
    const fullHistory: ProductPriceHistory[] = []
    let currentPrice = props.product.costPerUnit

    // Generate full year of price history
    const totalDays = 365

    for (let i = totalDays; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      // Add some seasonal variation for long-term trends
      const seasonalFactor = Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.1

      // Add some realistic price variation
      const variation = (Math.random() - 0.5) * 0.08 // ±4% short-term variation
      const longTermTrend = seasonalFactor + (Math.random() - 0.5) * 0.05 // ±2.5% long-term

      currentPrice = Math.max(
        props.product.costPerUnit * 0.7, // Min 70% of base price
        Math.min(
          props.product.costPerUnit * 1.3, // Max 130% of base price
          currentPrice * (1 + variation + longTermTrend)
        )
      )

      // Different frequency of price changes for different periods
      const shouldAddRecord =
        i === 0 || // Always add latest
        i % getPriceChangeFrequency(i) === 0 || // Periodic changes
        Math.random() < 0.02 // Random 2% chance

      if (shouldAddRecord) {
        fullHistory.push({
          id: `price-${props.product.id}-${i}`,
          productId: props.product.id,
          pricePerUnit: Math.round(currentPrice),
          effectiveDate: date.toISOString(),
          sourceType: i === 0 ? 'manual_update' : i % 30 === 0 ? 'purchase_order' : 'receipt',
          sourceId: `source-${i}`,
          supplierId: 'sup-mock-supplier',
          notes:
            i === 0
              ? 'Текущая цена'
              : i % 30 === 0
                ? 'Плановый заказ'
                : i % 7 === 0
                  ? 'Поставка от поставщика'
                  : undefined,
          createdAt: date.toISOString(),
          updatedAt: date.toISOString()
        })
      }
    }

    allPriceHistory.value = fullHistory.reverse() // Latest first
    updatePeriod() // Apply current period filter
  } catch (err) {
    error.value = 'Ошибка загрузки истории цен'
  } finally {
    loading.value = false
  }
}

// 🆕 Helper function for price change frequency
const getPriceChangeFrequency = (daysAgo: number): number => {
  if (daysAgo <= 30) return 3 // Every 3 days for last month
  if (daysAgo <= 90) return 7 // Every week for last 3 months
  return 14 // Every 2 weeks for older data
}

// 🆕 Update displayed data based on selected period
const updatePeriod = (): void => {
  if (allPriceHistory.value.length === 0) return

  const config = periodConfig[selectedPeriod.value]
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - config.days)

  // Filter data by period
  const filteredHistory = allPriceHistory.value.filter(record => {
    const recordDate = new Date(record.effectiveDate)
    return recordDate >= cutoffDate
  })

  // Limit number of data points for better visualization
  if (filteredHistory.length > config.dataPoints) {
    const step = Math.floor(filteredHistory.length / config.dataPoints)
    const sampledHistory = []

    for (let i = 0; i < filteredHistory.length; i += step) {
      sampledHistory.push(filteredHistory[i])
    }

    // Always include the latest record
    if (sampledHistory[sampledHistory.length - 1]?.id !== filteredHistory[0]?.id) {
      sampledHistory.unshift(filteredHistory[0])
    }

    priceHistory.value = sampledHistory
  } else {
    priceHistory.value = filteredHistory
  }
}

// Computed properties
const currentPrice = computed(() => {
  return priceHistory.value.length > 0
    ? priceHistory.value[0].pricePerUnit
    : props.product.costPerUnit
})

const latestPriceDate = computed(() => {
  return priceHistory.value.length > 0
    ? priceHistory.value[0].effectiveDate
    : props.product.updatedAt
})

const averagePrice = computed(() => {
  if (priceHistory.value.length === 0) return props.product.costPerUnit

  const sum = priceHistory.value.reduce((acc, record) => acc + record.pricePerUnit, 0)
  return Math.round(sum / priceHistory.value.length)
})

const changePercent = computed(() => {
  if (priceHistory.value.length < 2) return 0

  const latest = priceHistory.value[0].pricePerUnit
  const oldest = priceHistory.value[priceHistory.value.length - 1].pricePerUnit

  return ((latest - oldest) / oldest) * 100
})

const volatility = computed(() => {
  if (priceHistory.value.length < 2) return 0

  const prices = priceHistory.value.map(h => h.pricePerUnit)
  const avg = averagePrice.value
  const variance = prices.reduce((acc, price) => acc + Math.pow(price - avg, 2), 0) / prices.length

  return (Math.sqrt(variance) / avg) * 100 // CV as percentage
})

const chartPeriodDays = computed(() => {
  return periodConfig[selectedPeriod.value].days
})

// 🆕 Enhanced period label
const periodLabel = computed(() => {
  return periodConfig[selectedPeriod.value].label
})

const recentPriceHistory = computed(() => {
  return priceHistory.value.slice(0, 10) // Show last 10 records
})

// Chart data
const chartData = computed(() => {
  if (priceHistory.value.length === 0) return []

  const prices = priceHistory.value.map(h => h.pricePerUnit)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1

  return priceHistory.value.map((record, index) => ({
    x: (index / (priceHistory.value.length - 1)) * 400,
    y: 200 - ((record.pricePerUnit - minPrice) / priceRange) * 180 + 10,
    price: record.pricePerUnit,
    date: record.effectiveDate
  }))
})

const chartPoints = computed(() => {
  return chartData.value.map(point => `${point.x},${point.y}`).join(' ')
})

const yAxisLabels = computed(() => {
  if (priceHistory.value.length === 0) return []

  const prices = priceHistory.value.map(h => h.pricePerUnit)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  return [
    maxPrice,
    minPrice + (maxPrice - minPrice) * 0.75,
    minPrice + (maxPrice - minPrice) * 0.5,
    minPrice + (maxPrice - minPrice) * 0.25,
    minPrice
  ].map(price => Math.round(price))
})

// Helper methods
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return Formatter.formatDate(dateString)
}

const formatUnit = (unit: string): string => {
  return getUnitName(unit as any)
}

const getTrendColor = (): string => {
  if (changePercent.value > 5) return 'error'
  if (changePercent.value < -5) return 'success'
  return 'warning'
}

const getTrendIcon = (): string => {
  if (changePercent.value > 5) return 'mdi-trending-up'
  if (changePercent.value < -5) return 'mdi-trending-down'
  return 'mdi-trending-neutral'
}

const getTrendLabel = (): string => {
  if (changePercent.value > 5) return 'Растет'
  if (changePercent.value < -5) return 'Снижается'
  return 'Стабильно'
}

const getTrendDescription = (): string => {
  const abs = Math.abs(changePercent.value)
  if (abs > 10) return `Сильное изменение (${abs.toFixed(1)}%)`
  if (abs > 5) return `Умеренное изменение (${abs.toFixed(1)}%)`
  return `Стабильная цена (${abs.toFixed(1)}%)`
}

const getChangeColor = (): string => {
  return changePercent.value >= 0 ? 'error' : 'success'
}

const getPointColor = (price: number): string => {
  const avg = averagePrice.value
  if (price > avg * 1.05) return 'rgb(var(--v-theme-error))'
  if (price < avg * 0.95) return 'rgb(var(--v-theme-success))'
  return 'rgb(var(--v-theme-primary))'
}

const getSourceLabel = (sourceType: string): string => {
  const labels = {
    purchase_order: 'Заказ',
    receipt: 'Поставка',
    manual_update: 'Ручное обновление'
  }
  return labels[sourceType] || sourceType
}

const getSourceColor = (sourceType: string): string => {
  const colors = {
    purchase_order: 'primary',
    receipt: 'success',
    manual_update: 'warning'
  }
  return colors[sourceType] || 'default'
}

const getPriceChangeText = (
  current: ProductPriceHistory,
  previous: ProductPriceHistory
): string => {
  const change = current.pricePerUnit - previous.pricePerUnit
  const percent = (change / previous.pricePerUnit) * 100
  const sign = change >= 0 ? '+' : ''
  return `${sign}${formatCurrency(change)} (${sign}${percent.toFixed(1)}%)`
}

const getPriceChangeClass = (
  current: ProductPriceHistory,
  previous: ProductPriceHistory
): string => {
  const change = current.pricePerUnit - previous.pricePerUnit
  return change >= 0 ? 'success--text' : 'error--text'
}

// Mount
onMounted(() => {
  generateMockHistory()
})
</script>

<style scoped>
.price-metric {
  text-align: center;
  padding: 8px;
}

.price-metric__value {
  font-weight: 600;
  margin-bottom: 4px;
}

.price-metric__label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 2px;
}

.chart-container {
  width: 100%;
}

.chart-header {
  text-align: center;
}

.price-chart {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-top: 16px;
}

.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  height: 200px;
  min-width: 80px;
}

.y-axis-label {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.chart-area {
  flex: 1;
  position: relative;
}

.price-line-chart {
  width: 100%;
  height: 200px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 4px;
}

.price-line {
  filter: drop-shadow(0 2px 4px rgba(var(--v-theme-primary), 0.3));
}

.price-point {
  cursor: pointer;
  transition: r 0.2s ease;
}

.price-point:hover {
  r: 6;
}

.trend-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(var(--v-theme-surface), 0.9);
  padding: 4px 8px;
  border-radius: 12px;
  backdrop-filter: blur(4px);
}

.price-history-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.price-record {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.price-record:hover {
  background: rgba(var(--v-theme-primary), 0.02);
}

.price-record--latest {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.05);
}

.price-record__date {
  flex: 1;
}

.price-record__price {
  flex: 1;
  text-align: center;
}

.price-record__source {
  flex: 1;
  text-align: right;
}
</style>
