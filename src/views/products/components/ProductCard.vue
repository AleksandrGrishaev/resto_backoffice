<!-- src/views/products/components/ProductCard.vue - Enhanced с Stock Recommendations -->
<template>
  <v-card
    class="product-card"
    :class="{
      'product-card--inactive': !product.isActive,
      'product-card--critical': stockRecommendation?.urgencyLevel === 'critical',
      'product-card--high': stockRecommendation?.urgencyLevel === 'high'
    }"
    elevation="2"
    hover
  >
    <!-- 🆕 Stock Alert Banner -->
    <div
      v-if="stockRecommendation && needsAttention"
      class="stock-alert-banner"
      :class="`stock-alert-banner--${stockRecommendation.urgencyLevel}`"
    >
      <v-icon size="small" class="me-1">
        {{ getUrgencyIcon(stockRecommendation.urgencyLevel) }}
      </v-icon>
      <span class="text-caption font-weight-medium">
        {{ getUrgencyMessage(stockRecommendation.urgencyLevel) }}
      </span>
    </div>

    <!-- Card Header -->
    <v-card-title class="pb-2">
      <div class="d-flex align-center justify-space-between w-100">
        <div class="flex-grow-1">
          <div class="product-name">{{ product.name }}</div>
          <div class="d-flex align-center ga-2 mt-1">
            <v-chip :color="getCategoryColor(product.category)" size="x-small" variant="tonal">
              {{ getCategoryLabel(product.category) }}
            </v-chip>

            <!-- 🆕 Product Type Indicator -->
            <v-chip
              :color="product.canBeSold ? 'success' : 'orange'"
              size="x-small"
              variant="outlined"
            >
              {{ product.canBeSold ? 'For Sale' : 'Raw Material' }}
            </v-chip>

            <v-chip :color="product.isActive ? 'success' : 'error'" size="x-small" variant="tonal">
              {{ product.isActive ? 'Active' : 'Inactive' }}
            </v-chip>
          </div>
        </div>

        <!-- 🆕 Stock Status Icon -->
        <div v-if="stockRecommendation" class="stock-status-icon">
          <v-icon
            :color="getUrgencyColor(stockRecommendation.urgencyLevel)"
            :size="getUrgencyIconSize(stockRecommendation.urgencyLevel)"
          >
            {{ getUrgencyIcon(stockRecommendation.urgencyLevel) }}
          </v-icon>
        </div>
      </div>
    </v-card-title>

    <!-- Basic Information -->
    <v-card-text class="py-2">
      <div v-if="product.description" class="text-body-2 text-medium-emphasis mb-3">
        {{ product.description }}
      </div>

      <!-- Basic Information -->
      <div class="product-info">
        <v-row dense>
          <v-col cols="6">
            <div class="info-item">
              <v-icon size="small" color="primary" class="me-2">mdi-scale</v-icon>
              <span class="text-caption">Unit:</span>
              <span class="font-weight-medium ms-1">
                {{ formatUnit(product.unit) }}
              </span>
            </div>
          </v-col>
          <v-col cols="6">
            <div class="info-item">
              <v-icon size="small" color="success" class="me-2">mdi-currency-usd</v-icon>
              <span class="text-caption">Price:</span>
              <span class="font-weight-medium ms-1">
                {{ formatCurrency(product.costPerUnit) }}
              </span>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mt-1">
          <v-col cols="6">
            <div class="info-item">
              <v-icon size="small" color="primary" class="me-2">mdi-percent</v-icon>
              <span class="text-caption">Yield:</span>
              <v-chip
                :color="getYieldColor(product.yieldPercentage)"
                size="x-small"
                variant="tonal"
                class="ms-1"
              >
                {{ product.yieldPercentage }}%
              </v-chip>
            </div>
          </v-col>
          <v-col cols="6">
            <div class="info-item">
              <v-icon size="small" color="info" class="me-2">mdi-information</v-icon>
              <span class="text-caption">ID:</span>
              <span class="font-weight-medium ms-1 text-caption">
                {{ product.id.split('-')[0] }}...
              </span>
            </div>
          </v-col>
        </v-row>

        <!-- 🆕 Stock Recommendations Info -->
        <div v-if="stockRecommendation" class="stock-recommendations-info mt-3">
          <v-divider class="mb-2" />
          <div class="text-caption text-medium-emphasis mb-2">
            <v-icon size="small" class="me-1">mdi-chart-timeline-variant</v-icon>
            Order Recommendations:
          </div>

          <v-row dense>
            <v-col cols="6">
              <div class="info-item">
                <v-icon size="small" color="warning" class="me-2">mdi-clock-outline</v-icon>
                <span class="text-caption">Days to reorder:</span>
                <v-chip
                  :color="stockRecommendation.daysUntilReorder <= 0 ? 'error' : 'success'"
                  size="x-small"
                  variant="tonal"
                  class="ms-1"
                >
                  {{ Math.max(0, Math.round(stockRecommendation.daysUntilReorder)) }}
                </v-chip>
              </div>
            </v-col>
            <v-col cols="6">
              <div class="info-item">
                <v-icon size="small" color="info" class="me-2">mdi-package-variant</v-icon>
                <span class="text-caption">Order amount:</span>
                <span class="font-weight-medium ms-1 text-caption">
                  {{ Math.round(stockRecommendation.recommendedOrderQuantity * 10) / 10 }}
                  {{ formatUnit(product.unit) }}
                </span>
              </div>
            </v-col>
          </v-row>

          <v-row dense class="mt-1">
            <v-col cols="12">
              <div class="info-item">
                <v-icon size="small" color="orange" class="me-2">mdi-trending-up</v-icon>
                <span class="text-caption">Daily usage:</span>
                <span class="font-weight-medium ms-1 text-caption">
                  {{ stockRecommendation.factors.averageDailyUsage }}
                  {{ formatUnit(product.unit) }}
                </span>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Additional Information (only if no recommendations) -->
        <v-row v-else-if="product.shelfLife || product.minStock" dense class="mt-1">
          <v-col v-if="product.shelfLife" cols="6">
            <div class="info-item">
              <v-icon size="small" color="warning" class="me-2">mdi-calendar-clock</v-icon>
              <span class="text-caption">Shelf life:</span>
              <span class="font-weight-medium ms-1">{{ product.shelfLife }} days</span>
            </div>
          </v-col>
          <v-col v-if="product.minStock" cols="6">
            <div class="info-item">
              <v-icon size="small" color="info" class="me-2">mdi-package-down</v-icon>
              <span class="text-caption">Min. stock:</span>
              <span class="font-weight-medium ms-1">
                {{ product.minStock }} {{ formatUnit(product.unit) }}
              </span>
            </div>
          </v-col>
        </v-row>

        <!-- Storage Conditions (shortened) -->
        <div v-if="product.storageConditions && !stockRecommendation" class="mt-3">
          <div class="d-flex align-start">
            <v-icon size="small" color="info" class="me-2 mt-1">mdi-thermometer</v-icon>
            <div>
              <div class="text-caption text-medium-emphasis">Storage:</div>
              <div class="text-caption">{{ truncateText(product.storageConditions, 40) }}</div>
            </div>
          </div>
        </div>
      </div>
    </v-card-text>

    <!-- Actions -->
    <v-card-actions>
      <!-- 🆕 Stock Action Button -->
      <v-btn
        v-if="stockRecommendation && needsAttention"
        variant="tonal"
        size="small"
        :color="getUrgencyColor(stockRecommendation.urgencyLevel)"
        prepend-icon="mdi-cart-plus"
        @click="$emit('create-order', product, stockRecommendation)"
      >
        Order
      </v-btn>

      <v-btn
        v-else
        variant="text"
        size="small"
        color="info"
        prepend-icon="mdi-eye"
        @click="$emit('view-details', product)"
      >
        View Details
      </v-btn>

      <v-spacer />

      <v-btn
        variant="text"
        size="small"
        color="primary"
        icon="mdi-pencil"
        @click="$emit('edit', product)"
      >
        <v-icon>mdi-pencil</v-icon>
        <v-tooltip activator="parent">Edit</v-tooltip>
      </v-btn>

      <v-btn
        variant="text"
        size="small"
        :color="product.isActive ? 'warning' : 'success'"
        :icon="product.isActive ? 'mdi-pause' : 'mdi-play'"
        :loading="loading"
        @click="$emit('toggle-active', product)"
      >
        <v-icon>{{ product.isActive ? 'mdi-pause' : 'mdi-play' }}</v-icon>
        <v-tooltip activator="parent">
          {{ product.isActive ? 'Deactivate' : 'Activate' }}
        </v-tooltip>
      </v-btn>
    </v-card-actions>

    <!-- Creation date in footer -->
    <v-divider />
    <div class="text-caption text-center pa-2 text-medium-emphasis">
      Created: {{ formatDate(product.createdAt) }}
    </div>
  </v-card>
</template>

<script setup lang="ts">
import type { Product } from '@/stores/productsStore'
import type { StockRecommendation } from '@/stores/productsStore/types'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore'
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'
import { Formatter } from '@/utils'
import { computed } from 'vue'

// Props
interface Props {
  product: Product
  loading?: boolean
  stockRecommendation?: StockRecommendation | null // 🆕 NEW
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  stockRecommendation: null
})

// Emits
interface Emits {
  (e: 'edit', product: Product): void
  (e: 'toggle-active', product: Product): void
  (e: 'view-details', product: Product): void
  (e: 'create-order', product: Product, recommendation: StockRecommendation): void // 🆕 NEW
}

defineEmits<Emits>()

// Composables
const { getUnitName } = useMeasurementUnits()

// 🆕 Stock Recommendations Computed
const needsAttention = computed(() => {
  if (!props.stockRecommendation) return false
  return ['critical', 'high'].includes(props.stockRecommendation.urgencyLevel)
})

// 🆕 Stock Recommendations Methods
const getUrgencyColor = (urgency: string): string => {
  const colors = {
    critical: 'error',
    high: 'warning',
    medium: 'orange',
    low: 'success'
  }
  return colors[urgency] || 'grey'
}

const getUrgencyIcon = (urgency: string): string => {
  const icons = {
    critical: 'mdi-alert-circle',
    high: 'mdi-alert',
    medium: 'mdi-clock-alert-outline',
    low: 'mdi-check-circle'
  }
  return icons[urgency] || 'mdi-information'
}

const getUrgencyIconSize = (urgency: string): string => {
  return urgency === 'critical' ? '24' : '20'
}

const getUrgencyMessage = (urgency: string): string => {
  const messages = {
    critical: 'Order urgently!',
    high: 'Order needed',
    medium: 'Plan order',
    low: 'Sufficient stock'
  }
  return messages[urgency] || ''
}

// Existing methods
const getCategoryLabel = (category: string): string => {
  return PRODUCT_CATEGORIES[category as keyof typeof PRODUCT_CATEGORIES] || category
}

const formatUnit = (unit: string): string => {
  return getUnitName(unit as any)
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    meat: 'red',
    vegetables: 'green',
    fruits: 'orange',
    dairy: 'blue',
    cereals: 'amber',
    spices: 'purple',
    seafood: 'cyan',
    beverages: 'indigo',
    other: 'grey'
  }
  return colors[category] || 'grey'
}

const getYieldColor = (percentage: number): string => {
  if (percentage >= 90) return 'success'
  if (percentage >= 75) return 'warning'
  return 'error'
}

const formatDate = (dateString: string): string => {
  return Formatter.formatDate(dateString)
}

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}
</script>

<style scoped>
.product-card {
  height: 100%;
  transition: all 0.3s ease;
  position: relative;
}

.product-card--inactive {
  opacity: 0.7;
}

.product-card:hover {
  transform: translateY(-2px);
}

/* 🆕 Stock alert styling */
.product-card--critical {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.product-card--high {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.stock-alert-banner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 4px 12px;
  display: flex;
  align-items: center;
  z-index: 1;
}

.stock-alert-banner--critical {
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-error), 0.1),
    rgba(var(--v-theme-error), 0.05)
  );
  color: rgb(var(--v-theme-error));
}

.stock-alert-banner--high {
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-warning), 0.1),
    rgba(var(--v-theme-warning), 0.05)
  );
  color: rgb(var(--v-theme-warning));
}

.stock-status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-name {
  font-weight: 500;
  font-size: 1.1rem;
  line-height: 1.2;
}

.product-info {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 12px;
}

.stock-recommendations-info {
  background: rgba(var(--v-theme-warning), 0.05);
  border-radius: 6px;
  padding: 8px;
  border: 1px solid rgba(var(--v-theme-warning), 0.2);
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}
</style>
