<!-- src/views/supplier_2/components/orders/basket/RecommendationCard.vue -->
<template>
  <v-card
    variant="outlined"
    class="recommendation-card"
    :class="{ selected }"
    @click="$emit('toggle')"
  >
    <v-card-text class="pa-3">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="flex-grow-1">
          <div class="font-weight-bold text-body-1">{{ item.itemName }}</div>
          <v-chip :color="getUrgencyColor(item.urgency)" size="x-small" class="mt-1" label>
            <v-icon :icon="getUrgencyIcon(item.urgency)" size="12" class="mr-1" />
            {{ getUrgencyLabel(item.urgency) }}
          </v-chip>
        </div>

        <v-checkbox
          :model-value="selected"
          hide-details
          density="compact"
          @click.stop
          @update:model-value="$emit('toggle')"
        />
      </div>

      <!-- Stock Information -->
      <div
        class="stock-info mb-3 pa-2 rounded"
        :class="`bg-${getUrgencyColor(item.urgency)}-lighten`"
      >
        <div class="d-flex justify-space-between mb-1">
          <span class="text-caption text-medium-emphasis">Current Stock:</span>
          <span class="text-caption font-weight-bold">
            {{ formatQuantity(item.currentStock) }} {{ getUnit(item.itemId) }}
          </span>
        </div>

        <div
          v-if="item.transitStock && item.transitStock > 0"
          class="d-flex justify-space-between mb-1"
        >
          <span class="text-caption text-medium-emphasis">
            <v-icon size="12" class="mr-1">mdi-truck-fast</v-icon>
            In Transit:
          </span>
          <span class="text-caption">
            {{ formatQuantity(item.transitStock) }} {{ getUnit(item.itemId) }}
          </span>
        </div>

        <div
          v-if="item.pendingOrderStock && item.pendingOrderStock > 0"
          class="d-flex justify-space-between mb-1"
        >
          <span class="text-caption text-medium-emphasis">
            <v-icon size="12" class="mr-1">mdi-clock-outline</v-icon>
            Pending Orders:
          </span>
          <span class="text-caption">
            {{ formatQuantity(item.pendingOrderStock) }} {{ getUnit(item.itemId) }}
          </span>
        </div>

        <v-divider class="my-1" />

        <div class="d-flex justify-space-between">
          <span class="text-caption font-weight-bold">Effective Stock:</span>
          <span class="text-caption font-weight-bold">
            {{ formatQuantity(item.effectiveStock || item.currentStock) }}
            {{ getUnit(item.itemId) }}
          </span>
        </div>

        <div class="d-flex justify-space-between">
          <span class="text-caption text-medium-emphasis">Min Stock:</span>
          <span class="text-caption">
            {{ formatQuantity(item.minStock) }} {{ getUnit(item.itemId) }}
          </span>
        </div>
      </div>

      <!-- Recommendation -->
      <div class="recommendation-section pa-2 mb-3 bg-success-lighten rounded">
        <div class="d-flex align-center justify-space-between mb-2">
          <div class="d-flex align-center">
            <v-icon icon="mdi-lightbulb" color="success" size="18" class="mr-1" />
            <span class="text-caption font-weight-bold">Recommended Order:</span>
          </div>
          <span class="text-body-1 font-weight-bold text-success">
            {{ formatQuantity(item.suggestedQuantity) }} {{ getUnit(item.itemId) }}
          </span>
        </div>

        <!-- Reason -->
        <div class="text-caption text-medium-emphasis">
          <v-icon size="12" class="mr-1">mdi-information</v-icon>
          {{ getReasonLabel(item.reason) }}
        </div>
      </div>

      <!-- Calculation Details (Expandable) -->
      <v-expand-transition>
        <div v-if="showDetails">
          <v-divider class="mb-2" />

          <div class="calculation-details text-caption">
            <div class="text-caption font-weight-bold mb-2">
              <v-icon size="14" class="mr-1">mdi-calculator</v-icon>
              Calculation Details:
            </div>

            <div v-if="consumptionData" class="mb-2">
              <div class="d-flex justify-space-between">
                <span class="text-medium-emphasis">Avg. Daily Consumption:</span>
                <span>{{ consumptionData.avgDaily }} {{ getUnit(item.itemId) }}/day</span>
              </div>

              <div v-if="consumptionData.leadTime" class="d-flex justify-space-between">
                <span class="text-medium-emphasis">Lead Time:</span>
                <span>{{ consumptionData.leadTime }} days</span>
              </div>

              <div v-if="consumptionData.daysUntilStockout" class="d-flex justify-space-between">
                <span class="text-medium-emphasis">Days Until Stockout:</span>
                <span :class="consumptionData.daysUntilStockout < 7 ? 'text-error' : ''">
                  {{ consumptionData.daysUntilStockout }} days
                </span>
              </div>
            </div>

            <div class="formula-info pa-2 bg-surface rounded">
              <div class="text-caption font-weight-bold mb-1">Formula:</div>
              <div class="text-caption text-medium-emphasis font-mono">
                Reorder Point = (Avg Daily × Lead Time) + Safety Stock
              </div>
              <div class="text-caption text-medium-emphasis font-mono">
                Order Qty = (Avg Daily × 7 days) + Safety Stock - Effective Stock
              </div>
            </div>
          </div>
        </div>
      </v-expand-transition>

      <!-- Actions -->
      <div class="d-flex align-center justify-space-between mt-3">
        <v-btn
          size="x-small"
          variant="text"
          :prepend-icon="showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          @click.stop="showDetails = !showDetails"
        >
          {{ showDetails ? 'Hide' : 'Show' }} Details
        </v-btn>

        <v-btn
          color="primary"
          size="small"
          variant="flat"
          prepend-icon="mdi-cart-plus"
          @click.stop="$emit('add-to-request', item)"
        >
          Add to Request
        </v-btn>
      </div>

      <!-- Estimated Cost -->
      <v-divider class="my-2" />
      <div class="d-flex align-center justify-space-between">
        <span class="text-caption text-medium-emphasis">Est. Total Cost:</span>
        <span class="text-body-2 font-weight-bold text-success">
          {{ formatCurrency(estimatedCost) }}
        </span>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import type { OrderSuggestion } from '@/stores/supplier_2/types'

interface Props {
  item: OrderSuggestion
  selected?: boolean
}

interface Emits {
  (e: 'toggle'): void
  (e: 'add-to-request', item: OrderSuggestion): void
}

const props = withDefaults(defineProps<Props>(), {
  selected: false
})

const emits = defineEmits<Emits>()

const productsStore = useProductsStore()
const showDetails = ref(false)

// Computed
const estimatedCost = computed(() => {
  const baseCost = props.item.estimatedBaseCost || 0
  return baseCost * props.item.suggestedQuantity
})

const consumptionData = computed(() => {
  const product = productsStore.products.find(p => p.id === props.item.itemId)
  if (!product) return null

  const effectiveStock = props.item.effectiveStock || props.item.currentStock
  const avgDaily = (props.item.suggestedQuantity - (props.item.minStock * 1.5 - effectiveStock)) / 7

  return {
    avgDaily: Math.max(0, avgDaily).toFixed(2),
    leadTime: product.leadTimeDays || 3,
    daysUntilStockout: avgDaily > 0 ? Math.floor(effectiveStock / avgDaily) : 999
  }
})

// Methods
function getUnit(productId: string): string {
  const product = productsStore.products.find(p => p.id === productId)
  if (!product) return 'units'

  const unitMap: Record<string, string> = {
    piece: 'pcs',
    kg: 'kg',
    liter: 'L',
    gram: 'g',
    ml: 'ml'
  }

  return unitMap[product.baseUnit] || product.baseUnit
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function getUrgencyColor(urgency: string): string {
  const colors: Record<string, string> = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'success'
  }
  return colors[urgency] || 'grey'
}

function getUrgencyIcon(urgency: string): string {
  const icons: Record<string, string> = {
    critical: 'mdi-alert-circle',
    high: 'mdi-alert',
    medium: 'mdi-information',
    low: 'mdi-check-circle'
  }
  return icons[urgency] || 'mdi-help-circle'
}

function getUrgencyLabel(urgency: string): string {
  const labels: Record<string, string> = {
    critical: 'CRITICAL',
    high: 'HIGH PRIORITY',
    medium: 'MEDIUM',
    low: 'LOW'
  }
  return labels[urgency] || urgency.toUpperCase()
}

function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    out_of_stock: 'Out of stock - urgent reorder needed',
    will_stockout_before_delivery: 'Will run out before next delivery arrives',
    approaching_stockout: 'Approaching stockout - order soon',
    critically_low: 'Stock critically low',
    below_minimum: 'Below minimum stock threshold'
  }
  return labels[reason] || reason
}
</script>

<style scoped lang="scss">
.recommendation-card {
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.selected {
    border-color: rgb(var(--v-theme-primary));
    background-color: rgba(var(--v-theme-primary), 0.05);
  }
}

.bg-error-lighten {
  background-color: rgba(var(--v-theme-error), 0.1);
}

.bg-warning-lighten {
  background-color: rgba(var(--v-theme-warning), 0.1);
}

.bg-info-lighten {
  background-color: rgba(var(--v-theme-info), 0.1);
}

.bg-success-lighten {
  background-color: rgba(var(--v-theme-success), 0.1);
}

.font-mono {
  font-family: 'Courier New', monospace;
  font-size: 10px;
  line-height: 1.4;
}
</style>
