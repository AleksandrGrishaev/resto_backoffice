<!-- src/views/products/components/ProductDetailsDialog.vue - Enhanced с Stock Recommendations -->
<template>
  <v-dialog v-model="localModelValue" max-width="800px" scrollable>
    <v-card v-if="product">
      <!-- Header -->
      <v-card-title class="d-flex align-center">
        <v-icon start color="info">mdi-information</v-icon>
        <span>Product Details</span>
        <v-spacer />

        <!-- 🆕 Stock Status Indicator -->
        <div v-if="stockRecommendation" class="d-flex align-center ga-2 me-3">
          <v-chip
            :color="getUrgencyColor(stockRecommendation.urgencyLevel)"
            variant="tonal"
            size="small"
          >
            <v-icon start size="small">
              {{ getUrgencyIcon(stockRecommendation.urgencyLevel) }}
            </v-icon>
            {{ getUrgencyLabel(stockRecommendation.urgencyLevel) }}
          </v-chip>
        </div>

        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
      </v-card-title>

      <v-divider />

      <!-- Basic Information -->
      <v-card-text class="pa-0">
        <!-- Product Header -->
        <div class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <h2 class="text-h5 mb-2">{{ product.name }}</h2>
              <div class="d-flex align-center ga-2">
                <v-chip :color="getCategoryColor(product.category)" variant="tonal">
                  {{ getCategoryLabel(product.category) }}
                </v-chip>
                <v-chip
                  v-for="dept in product.usedInDepartments"
                  :key="dept"
                  :color="getDepartmentColor(dept)"
                  :prepend-icon="getDepartmentIcon(dept)"
                  variant="tonal"
                  size="small"
                >
                  {{ dept === 'kitchen' ? 'Kitchen' : 'Bar' }}
                </v-chip>

                <v-chip :color="product.canBeSold ? 'success' : 'orange'" variant="outlined">
                  {{ product.canBeSold ? 'For Sale' : 'Raw Material' }}
                </v-chip>
                <v-chip :color="product.isActive ? 'success' : 'error'" variant="tonal">
                  {{ product.isActive ? 'Active' : 'Inactive' }}
                </v-chip>
                <v-chip :color="getYieldColor(product.yieldPercentage)" variant="tonal">
                  Yield: {{ product.yieldPercentage }}%
                </v-chip>
              </div>
            </div>
          </div>

          <div v-if="product.description" class="mb-4">
            <h3 class="text-h6 mb-2">Description</h3>
            <p class="text-body-1">{{ product.description }}</p>
          </div>
        </div>

        <!-- 🆕 Stock Recommendations Section -->
        <div v-if="stockRecommendation" class="pa-6 pt-0">
          <v-card
            variant="outlined"
            :class="`stock-recommendations-card stock-recommendations-card--${stockRecommendation.urgencyLevel}`"
          >
            <v-card-title class="text-subtitle-1 pb-2">
              <v-icon start :color="getUrgencyColor(stockRecommendation.urgencyLevel)">
                mdi-chart-timeline-variant
              </v-icon>
              Order Recommendations
              <v-spacer />
              <v-chip
                :color="getUrgencyColor(stockRecommendation.urgencyLevel)"
                size="small"
                variant="tonal"
              >
                {{ getUrgencyLabel(stockRecommendation.urgencyLevel) }}
              </v-chip>
            </v-card-title>

            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <div class="recommendation-stat">
                    <div
                      class="recommendation-stat__value text-h6"
                      :class="`${getUrgencyColor(stockRecommendation.urgencyLevel)}--text`"
                    >
                      {{ Math.max(0, Math.round(stockRecommendation.daysUntilReorder)) }}
                    </div>
                    <div class="recommendation-stat__label">Days to reorder</div>
                    <div class="text-caption text-medium-emphasis">
                      {{
                        stockRecommendation.daysUntilReorder <= 0
                          ? 'Order urgently'
                          : 'Can be planned'
                      }}
                    </div>
                  </div>
                </v-col>

                <v-col cols="12" md="4">
                  <div class="recommendation-stat">
                    <div class="recommendation-stat__value text-h6 info--text">
                      {{ Math.round(stockRecommendation.recommendedOrderQuantity * 10) / 10 }}
                    </div>
                    <div class="recommendation-stat__label">
                      Order {{ formatUnit(product.unit) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      For {{ stockRecommendation.factors.leadTimeDays + 14 }} days
                    </div>
                  </div>
                </v-col>

                <v-col cols="12" md="4">
                  <div class="recommendation-stat">
                    <div class="recommendation-stat__value text-h6 orange--text">
                      {{ stockRecommendation.factors.averageDailyUsage }}
                    </div>
                    <div class="recommendation-stat__label">
                      Daily usage ({{ formatUnit(product.unit) }})
                    </div>
                    <div class="text-caption text-medium-emphasis">Average consumption</div>
                  </div>
                </v-col>
              </v-row>

              <!-- Additional recommendations details -->
              <v-divider class="my-4" />
              <v-row>
                <v-col cols="6">
                  <div class="text-body-2 mb-1">
                    <strong>Minimum stock:</strong>
                    {{ Math.round(stockRecommendation.recommendedMinStock * 10) / 10 }}
                    {{ formatUnit(product.unit) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ stockRecommendation.factors.safetyDays }} safety days +
                    {{ stockRecommendation.factors.leadTimeDays }} days delivery
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="text-body-2 mb-1">
                    <strong>Maximum stock:</strong>
                    {{ Math.round(stockRecommendation.recommendedMaxStock * 10) / 10 }}
                    {{ formatUnit(product.unit) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Optimal level for purchasing</div>
                </v-col>
              </v-row>

              <!-- Action button -->
              <div v-if="needsAttention" class="mt-4 text-center">
                <v-btn
                  :color="getUrgencyColor(stockRecommendation.urgencyLevel)"
                  variant="elevated"
                  prepend-icon="mdi-cart-plus"
                  @click="$emit('create-order', product, stockRecommendation)"
                >
                  Create Order
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <v-divider />

        <!-- Detailed Information -->
        <div class="pa-6">
          <h3 class="text-h6 mb-4">Specifications</h3>

          <v-row>
            <!-- Basic Parameters -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="h-100">
                <v-card-title class="text-subtitle-1">
                  <v-icon start color="primary">mdi-information-outline</v-icon>
                  Basic Parameters
                </v-card-title>
                <v-card-text>
                  <div class="detail-items">
                    <div class="detail-item">
                      <span class="detail-label">Measurement Unit:</span>
                      <v-chip size="small" variant="outlined">
                        {{ formatUnit(product.unit) }}
                      </v-chip>
                    </div>

                    <div class="detail-item">
                      <span class="detail-label">Unit Cost:</span>
                      <v-chip color="success" size="small" variant="tonal">
                        {{ formatCurrency(product.costPerUnit) }}
                      </v-chip>
                    </div>

                    <div class="detail-item">
                      <span class="detail-label">Yield Percentage:</span>
                      <v-chip
                        :color="getYieldColor(product.yieldPercentage)"
                        size="small"
                        variant="tonal"
                      >
                        {{ product.yieldPercentage }}%
                      </v-chip>
                    </div>

                    <div class="detail-item">
                      <span class="detail-label">Product Type:</span>
                      <v-chip
                        :color="product.canBeSold ? 'success' : 'orange'"
                        size="small"
                        variant="tonal"
                      >
                        {{ product.canBeSold ? 'For Sale' : 'Raw Material' }}
                      </v-chip>
                    </div>

                    <div class="detail-item">
                      <span class="detail-label">Status:</span>
                      <v-chip
                        :color="product.isActive ? 'success' : 'error'"
                        size="small"
                        variant="tonal"
                      >
                        {{ product.isActive ? 'Active' : 'Inactive' }}
                      </v-chip>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Storage & Accounting -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="h-100">
                <v-card-title class="text-subtitle-1">
                  <v-icon start color="warning">mdi-package-variant</v-icon>
                  Storage & Accounting
                </v-card-title>
                <v-card-text>
                  <div class="detail-items">
                    <div v-if="product.storageConditions" class="detail-item">
                      <span class="detail-label">Storage Conditions:</span>
                      <span class="detail-value">{{ product.storageConditions }}</span>
                    </div>

                    <div v-if="product.shelfLife" class="detail-item">
                      <span class="detail-label">Shelf Life:</span>
                      <span class="detail-value">{{ product.shelfLife }} days</span>
                    </div>

                    <div v-if="product.minStock" class="detail-item">
                      <span class="detail-label">Minimum Stock:</span>
                      <span class="detail-value">
                        {{ product.minStock }} {{ formatUnit(product.unit) }}
                      </span>
                    </div>

                    <!-- 🆕 Enhanced fields if available -->
                    <div v-if="(product as any).leadTimeDays" class="detail-item">
                      <span class="detail-label">Delivery Time:</span>
                      <span class="detail-value">{{ (product as any).leadTimeDays }} days</span>
                    </div>

                    <div v-if="(product as any).tags?.length" class="detail-item">
                      <span class="detail-label">Tags:</span>
                      <div class="d-flex flex-wrap ga-1">
                        <v-chip
                          v-for="tag in (product as any).tags"
                          :key="tag"
                          size="x-small"
                          variant="outlined"
                        >
                          {{ tag }}
                        </v-chip>
                      </div>
                    </div>

                    <div
                      v-if="!product.storageConditions && !product.shelfLife && !product.minStock"
                      class="text-center text-medium-emphasis"
                    >
                      <v-icon>mdi-information-outline</v-icon>
                      <div class="text-caption mt-2">No additional information provided</div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Cost Analysis -->
          <v-row class="mt-4">
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-subtitle-1">
                  <v-icon start color="info">mdi-calculator</v-icon>
                  Cost Analysis
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="4">
                      <div class="text-center">
                        <div class="text-h6 success--text">
                          {{ formatCurrency(product.costPerUnit) }}
                        </div>
                        <div class="text-caption">Price per {{ formatUnit(product.unit) }}</div>
                      </div>
                    </v-col>
                    <v-col cols="12" md="4">
                      <div class="text-center">
                        <div class="text-h6 info--text">
                          {{ formatCurrency(calculateEffectiveCost()) }}
                        </div>
                        <div class="text-caption">Effective Cost*</div>
                      </div>
                    </v-col>
                    <v-col cols="12" md="4">
                      <div class="text-center">
                        <div class="text-h6 warning--text">{{ product.yieldPercentage }}%</div>
                        <div class="text-caption">Product Yield</div>
                      </div>
                    </v-col>
                  </v-row>
                  <v-divider class="my-3" />
                  <div class="text-caption text-medium-emphasis">
                    * Effective cost considers the product yield percentage after processing
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Packages продукта -->
        <div v-if="product.packageOptions?.length" class="pa-6">
          <h3 class="text-h6 mb-4">Packages</h3>

          <v-row>
            <v-col v-for="pkg in product.packageOptions" :key="pkg.id" cols="12" md="6">
              <v-card
                variant="outlined"
                :color="pkg.id === product.recommendedPackageId ? 'primary' : undefined"
              >
                <v-card-text>
                  <div class="d-flex justify-space-between align-center mb-2">
                    <strong>{{ pkg.packageName }}</strong>
                    <v-chip
                      v-if="pkg.id === product.recommendedPackageId"
                      size="small"
                      color="success"
                      variant="tonal"
                    >
                      Recommended
                    </v-chip>
                  </div>

                  <div class="text-body-2">
                    {{ pkg.packageSize }} {{ product.baseUnit }}
                    <span v-if="pkg.brandName">• {{ pkg.brandName }}</span>
                  </div>

                  <div class="text-body-2 mt-1">
                    <span v-if="pkg.packagePrice">
                      {{ formatCurrency(pkg.packagePrice) }} за упаковку •
                    </span>
                    {{ formatCurrency(pkg.baseCostPerUnit) }}/{{ product.baseUnit }}
                  </div>

                  <div v-if="pkg.notes" class="text-caption text-grey-darken-2 mt-1">
                    {{ pkg.notes }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- 🆕 Enhanced Analytics Sections -->
        <v-divider />
        <div class="pa-6">
          <h3 class="text-h6 mb-4">Analytics & Usage</h3>

          <!-- Tabs for different analytics -->
          <v-tabs v-model="activeTab" color="primary" class="mb-4">
            <v-tab value="usage">
              <v-icon start>mdi-sitemap</v-icon>
              Usage
            </v-tab>
            <v-tab value="price-history">
              <v-icon start>mdi-chart-line</v-icon>
              Price History
            </v-tab>
          </v-tabs>

          <v-tabs-window v-model="activeTab">
            <!-- Usage Tracking Tab -->
            <v-tabs-window-item value="usage">
              <usage-tracking-widget
                :product="product"
                @view-recipe="handleViewRecipe"
                @view-preparation="handleViewPreparation"
                @view-menu-item="handleViewMenuItem"
                @add-to-menu="handleAddToMenu"
                @add-to-recipe="handleAddToRecipe"
              />
            </v-tabs-window-item>

            <!-- Price History Tab -->
            <v-tabs-window-item value="price-history">
              <price-history-widget :product="product" />
            </v-tabs-window-item>
          </v-tabs-window>
        </div>

        <v-divider />

        <!-- Timestamps -->
        <div class="pa-6">
          <h3 class="text-h6 mb-4">History</h3>

          <v-row>
            <v-col cols="12" md="6">
              <div class="d-flex align-center">
                <v-icon color="success" class="me-3">mdi-calendar-plus</v-icon>
                <div>
                  <div class="text-body-2 font-weight-medium">Created</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatDateTime(product.createdAt) }}
                  </div>
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="d-flex align-center">
                <v-icon color="info" class="me-3">mdi-calendar-edit</v-icon>
                <div>
                  <div class="text-body-2 font-weight-medium">Last Modified</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatDateTime(product.updatedAt) }}
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-divider />
      <v-card-actions class="px-6 py-4">
        <v-btn
          v-if="stockRecommendation && needsAttention"
          :color="getUrgencyColor(stockRecommendation.urgencyLevel)"
          variant="elevated"
          prepend-icon="mdi-cart-plus"
          @click="$emit('create-order', product, stockRecommendation)"
        >
          Create Order
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Product, Department } from '@/stores/productsStore/types'
import type { StockRecommendation } from '@/stores/productsStore/types'
import { useProductsStore } from '@/stores/productsStore'
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'
import { Formatter } from '@/utils'

const productsStore = useProductsStore()

// 🆕 Import new widgets
import UsageTrackingWidget from './UsageTrackingWidget.vue'
import PriceHistoryWidget from './PriceHistoryWidget.vue'

// Props
interface Props {
  modelValue: boolean
  product?: Product | null
  stockRecommendation?: StockRecommendation | null
}

const props = withDefaults(defineProps<Props>(), {
  product: null,
  stockRecommendation: null
})

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'create-order', product: Product, recommendation: StockRecommendation): void
}

const emit = defineEmits<Emits>()

// Composables
const { getUnitName } = useMeasurementUnits()

// 🆕 Local state for tabs
const activeTab = ref('usage')

// Computed
const localModelValue = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Stock Recommendations Computed
const needsAttention = computed(() => {
  if (!props.stockRecommendation) return false
  return ['critical', 'high'].includes(props.stockRecommendation.urgencyLevel)
})

// Stock Recommendations Methods
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

const getUrgencyLabel = (urgency: string): string => {
  const labels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  }
  return labels[urgency] || urgency
}

// 🆕 Widget event handlers
const handleViewRecipe = (recipeId: string): void => {
  console.log('🧑‍🍳 View recipe:', recipeId)
  // TODO: Navigate to recipe details
}

const handleViewPreparation = (preparationId: string): void => {
  console.log('🥘 View preparation:', preparationId)
  // TODO: Navigate to preparation details
}

const handleViewMenuItem = (menuItemId: string, variantId: string): void => {
  console.log('🍽️ View menu item:', { menuItemId, variantId })
  // TODO: Navigate to menu item details
}

const handleAddToMenu = (product: Product): void => {
  console.log('➕ Add to menu:', product.name)
  // TODO: Open add to menu dialog
}

const handleAddToRecipe = (product: Product): void => {
  console.log('➕ Add to recipe:', product.name)
  // TODO: Open add to recipe dialog
}

// Methods
const closeDialog = (): void => {
  emit('update:modelValue', false)
}

// ✅ UPDATED: Get category from store
const getCategoryLabel = (categoryId: string): string => {
  return productsStore.getCategoryName(categoryId)
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

const formatDateTime = (dateString: string): string => {
  return Formatter.formatFullDateTime(dateString)
}

const calculateEffectiveCost = (): number => {
  if (!props.product) return 0
  return props.product.costPerUnit / (props.product.yieldPercentage / 100)
}

// ✅ ADD: Department helper functions
const getDepartmentColor = (dept: Department): string => {
  return dept === 'kitchen' ? 'success' : 'primary'
}

const getDepartmentIcon = (dept: Department): string => {
  return dept === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'
}
</script>

<style scoped>
.detail-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-label {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  min-width: 120px;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: right;
}

/* 🆕 Stock Recommendations Styling */
.stock-recommendations-card {
  margin-bottom: 16px;
}

.stock-recommendations-card--critical {
  border-color: rgb(var(--v-theme-error));
  background: rgba(var(--v-theme-error), 0.02);
}

.stock-recommendations-card--high {
  border-color: rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.02);
}

.recommendation-stat {
  text-align: center;
  padding: 8px;
}

.recommendation-stat__value {
  font-weight: 600;
  margin-bottom: 4px;
}

.recommendation-stat__label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 2px;
}
</style>
