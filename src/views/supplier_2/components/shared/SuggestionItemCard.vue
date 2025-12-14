<!-- src/views/supplier_2/components/shared/SuggestionItemCard.vue -->
<!-- ✅ NEW: Compact, informative suggestion card component -->
<template>
  <div class="suggestion-card pa-3" :class="{ 'border-b': !isLast }">
    <div class="d-flex align-start">
      <!-- Left: Product Info -->
      <div class="flex-grow-1 mr-3">
        <!-- Header with name and urgency -->
        <div class="d-flex align-center mb-2">
          <span class="font-weight-bold text-subtitle-2 mr-2">
            {{ suggestion.itemName }}
          </span>
          <v-chip
            size="small"
            :color="getUrgencyColor(suggestion.urgency)"
            :prepend-icon="getUrgencyIcon(suggestion.urgency)"
          >
            {{ suggestion.urgency }}
          </v-chip>
        </div>

        <!-- Stock Status in compact format -->
        <div class="stock-info mb-2">
          <div class="d-flex align-center gap-2 text-body-2">
            <span class="text-medium-emphasis">Current:</span>
            <span :class="getCurrentStockColor(suggestion)">
              {{ formatQuantityInBestUnit(suggestion.currentStock) }}
            </span>
            <span class="text-medium-emphasis">•</span>
            <span class="text-medium-emphasis">Min:</span>
            <span>{{ formatQuantityInBestUnit(suggestion.minStock) }}</span>
            <span class="text-medium-emphasis">•</span>
            <span class="text-medium-emphasis">Suggested:</span>
            <span class="text-success font-weight-bold">
              {{ formatQuantityInBestUnit(suggestion.suggestedQuantity) }}
            </span>
          </div>
        </div>

        <!-- Usage Statistics Grid -->
        <div class="usage-grid text-caption">
          <div class="usage-row">
            <span class="usage-label">Daily:</span>
            <span class="usage-value">{{ formatDailyUsage(suggestion) }}</span>
            <span class="usage-label">Weekly:</span>
            <span class="usage-value">{{ formatWeeklyUsage(suggestion) }}</span>
          </div>
          <div class="usage-row mt-1">
            <span class="usage-label">Stock lasts:</span>
            <span class="usage-value" :class="getStockDurationColor(suggestion)">
              {{ formatStockDuration(suggestion) }}
            </span>
            <span class="usage-label">Shelf life:</span>
            <span class="usage-value">{{ getShelfLife(suggestion) }}</span>
          </div>
        </div>

        <!-- Reason (if needed) -->
        <div v-if="suggestion.reason" class="text-caption text-medium-emphasis mt-1">
          <v-icon size="12" class="mr-1">mdi-information-outline</v-icon>
          {{ formatReason(suggestion.reason) }}
        </div>
      </div>

      <!-- Right: Actions -->
      <div class="action-section">
        <!-- If not added -->
        <div v-if="!isAdded" class="text-center">
          <v-btn
            color="success"
            size="small"
            prepend-icon="mdi-plus"
            @click="$emit('add-suggestion', suggestion)"
          >
            Add {{ formatQuantityInBestUnit(suggestion.suggestedQuantity) }}
          </v-btn>
        </div>

        <!-- If added - compact editor -->
        <div v-else class="added-section">
          <v-chip color="success" size="small" prepend-icon="mdi-check" class="mb-2">Added</v-chip>

          <!-- Quantity Editor with Unit Toggle -->
          <div class="quantity-editor">
            <!-- Unit Toggle - only show if conversion is available -->
            <v-btn-toggle
              v-if="hasUnitConversion"
              v-model="currentDisplayUnit"
              size="x-small"
              density="compact"
              mandatory
              class="mb-2"
            >
              <v-btn :value="baseUnit" size="x-small">{{ baseUnit.toUpperCase() }}</v-btn>
              <v-btn :value="purchaseUnit" size="x-small">
                {{ purchaseUnit.toUpperCase() }}
              </v-btn>
            </v-btn-toggle>

            <!-- Quantity Input -->
            <div class="d-flex align-center gap-1">
              <v-text-field
                :model-value="getCurrentQuantityForDisplay()"
                type="number"
                :min="getMinQuantity()"
                :step="getQuantityStep()"
                hide-details
                density="compact"
                variant="outlined"
                style="width: 70px"
                class="text-center"
                @update:model-value="updateQuantity"
              />
              <span class="text-caption">{{ currentDisplayUnit }}</span>
            </div>

            <!-- Days supply -->
            <div class="text-caption text-center mt-1 text-medium-emphasis">
              ~{{ calculateDaysSupply() }} days
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OrderSuggestion } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  suggestion: OrderSuggestion
  isAdded: boolean
  selectedQuantity?: number
  isLast?: boolean
  productsStore: any
  orderAssistant: any
}

interface Emits {
  (e: 'add-suggestion', suggestion: OrderSuggestion): void
  (e: 'update-quantity', itemId: string, quantity: number): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPUTED PROPERTIES
// =============================================

const product = computed(() =>
  props.productsStore.products.find((p: any) => p.id === props.suggestion.itemId)
)

const baseUnit = computed(() => {
  if (!product.value) return 'g'

  const baseUnits: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pcs'
  }
  return baseUnits[product.value.baseUnit] || 'g'
})

const purchaseUnit = computed(() => {
  if (!product.value) return 'kg'

  // For piece-based products, purchase unit is same as base unit
  if (product.value.baseUnit === 'piece') {
    return 'pcs'
  }

  const purchaseUnits: Record<string, string> = {
    kg: 'kg',
    liter: 'L',
    piece: 'pcs',
    pack: 'pack'
  }
  return purchaseUnits[product.value.purchaseUnit] || 'kg'
})

// Check if unit conversion is available (gram↔kg, ml↔L)
const hasUnitConversion = computed(() => {
  if (!product.value) return false
  // Only gram↔kg and ml↔L conversions are supported
  return (
    (product.value.baseUnit === 'gram' && product.value.purchaseToBaseRatio) ||
    (product.value.baseUnit === 'ml' && product.value.purchaseToBaseRatio)
  )
})

const currentDisplayUnit = ref(baseUnit.value)

// =============================================
// REACTIVE INITIALIZATION
// =============================================

// Initialize display unit based on suggestion quantity
watch(
  () => props.suggestion,
  newSuggestion => {
    if (newSuggestion && product.value && newSuggestion.suggestedQuantity >= 1000) {
      if (
        (product.value.baseUnit === 'gram' && product.value.purchaseUnit === 'kg') ||
        (product.value.baseUnit === 'ml' && product.value.purchaseUnit === 'liter')
      ) {
        currentDisplayUnit.value = purchaseUnit.value
      }
    }
  },
  { immediate: true }
)

// Watch product changes to update display unit
watch(
  product,
  newProduct => {
    if (newProduct) {
      currentDisplayUnit.value = baseUnit.value
    }
  },
  { immediate: true }
)

// =============================================
// QUANTITY FORMATTING & CONVERSION
// =============================================

function formatQuantityInBestUnit(quantity: number): string {
  if (!product.value) return `${Math.round(quantity)}g`

  const productBaseUnit = product.value.baseUnit

  // Auto-convert to purchase units if quantity is large enough
  if (productBaseUnit === 'gram' && quantity >= 1000) {
    return `${(quantity / 1000).toFixed(1)}kg`
  }

  if (productBaseUnit === 'ml' && quantity >= 1000) {
    return `${(quantity / 1000).toFixed(1)}L`
  }

  // Otherwise show in base units
  const units: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pcs'
  }

  return `${Math.round(quantity)}${units[productBaseUnit] || 'units'}`
}

function getCurrentQuantityForDisplay(): number {
  if (!props.selectedQuantity || !product.value) return 0

  if (currentDisplayUnit.value === baseUnit.value) {
    return Math.round(props.selectedQuantity)
  }

  // Convert to purchase units (only if ratio is available)
  if (currentDisplayUnit.value === purchaseUnit.value && product.value.purchaseToBaseRatio) {
    return Math.round((props.selectedQuantity / product.value.purchaseToBaseRatio) * 10) / 10
  }

  return Math.round(props.selectedQuantity)
}

function getMinQuantity(): number {
  if (currentDisplayUnit.value === baseUnit.value) {
    return 1 // Base units are always whole numbers
  }
  return 0.1 // Purchase units can have decimals
}

function getQuantityStep(): number {
  if (currentDisplayUnit.value === baseUnit.value) {
    return 1 // Base units are always whole numbers
  }
  return 0.1 // Purchase units can have decimals
}

function updateQuantity(newValue: string | number): void {
  const quantity = typeof newValue === 'string' ? parseFloat(newValue) : newValue
  if (isNaN(quantity) || quantity < 0) return

  // Allow 0 to clear quantity, but treat empty string as no change
  if (newValue === '' || newValue === null || newValue === undefined) return

  let finalQuantity = quantity

  // Convert to base units if needed (only if ratio is available)
  if (
    currentDisplayUnit.value === purchaseUnit.value &&
    product.value &&
    product.value.purchaseToBaseRatio
  ) {
    finalQuantity = Math.round(quantity * product.value.purchaseToBaseRatio)
  } else {
    finalQuantity = Math.round(quantity)
  }

  emits('update-quantity', props.suggestion.itemId, finalQuantity)
}

// =============================================
// USAGE CALCULATIONS
// =============================================

function formatDailyUsage(suggestion: OrderSuggestion): string {
  if (!product.value) return 'N/A'

  const dailyUsage = Math.max(
    1,
    Math.round(product.value.dailyConsumption || suggestion.suggestedQuantity / 10)
  )
  return formatQuantityInBestUnit(dailyUsage) + '/day'
}

function formatWeeklyUsage(suggestion: OrderSuggestion): string {
  if (!product.value) return 'N/A'

  const dailyUsage = Math.max(
    1,
    Math.round(product.value.dailyConsumption || suggestion.suggestedQuantity / 10)
  )
  const weeklyUsage = dailyUsage * 7
  return formatQuantityInBestUnit(weeklyUsage) + '/week'
}

function formatStockDuration(suggestion: OrderSuggestion): string {
  if (!product.value) return 'N/A'

  const dailyUsage = Math.max(
    1,
    Math.round(product.value.dailyConsumption || suggestion.suggestedQuantity / 10)
  )
  const currentStock = suggestion.currentStock

  if (currentStock <= 0) return '0 days'

  const daysRemaining = Math.floor(currentStock / dailyUsage)
  return daysRemaining <= 1 ? `${daysRemaining} day` : `${daysRemaining} days`
}

function calculateDaysSupply(): number {
  if (!product.value || !props.selectedQuantity) return 0

  const dailyUsage = Math.max(
    1,
    Math.round(product.value.dailyConsumption || props.selectedQuantity / 10)
  )
  return Math.floor(props.selectedQuantity / dailyUsage)
}

function getShelfLife(suggestion: OrderSuggestion): string {
  if (!product.value) return 'N/A'

  const shelfLifeDays = product.value.shelfLifeDays || product.value.shelfLife
  if (!shelfLifeDays) return 'N/A'

  if (shelfLifeDays >= 365) {
    const years = Math.floor(shelfLifeDays / 365)
    return `${years}+ year${years > 1 ? 's' : ''}`
  }

  if (shelfLifeDays >= 30) {
    const months = Math.floor(shelfLifeDays / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  }

  if (shelfLifeDays >= 7) {
    const weeks = Math.floor(shelfLifeDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''}`
  }

  return `${shelfLifeDays} day${shelfLifeDays > 1 ? 's' : ''}`
}

// =============================================
// UI HELPERS
// =============================================

function getCurrentStockColor(suggestion: OrderSuggestion): string {
  if (suggestion.currentStock <= 0) return 'text-error'
  if (suggestion.currentStock < suggestion.minStock * 0.5) return 'text-warning'
  if (suggestion.currentStock < suggestion.minStock) return 'text-info'
  return 'text-success'
}

function getStockDurationColor(suggestion: OrderSuggestion): string {
  if (!product.value) return 'text-medium-emphasis'

  const dailyUsage = Math.max(
    1,
    Math.round(product.value.dailyConsumption || suggestion.suggestedQuantity / 10)
  )
  const daysRemaining = Math.floor(suggestion.currentStock / dailyUsage)

  if (daysRemaining <= 1) return 'text-error'
  if (daysRemaining <= 3) return 'text-warning'
  if (daysRemaining <= 7) return 'text-info'
  return 'text-success'
}

function getUrgencyColor(urgency: string): string {
  const colors: Record<string, string> = {
    high: 'error',
    medium: 'warning',
    low: 'info'
  }
  return colors[urgency] || 'grey'
}

function getUrgencyIcon(urgency: string): string {
  const icons: Record<string, string> = {
    high: 'mdi-alert-circle',
    medium: 'mdi-alert',
    low: 'mdi-information'
  }
  return icons[urgency] || 'mdi-help-circle'
}

function formatReason(reason: string): string {
  const reasons: Record<string, string> = {
    below_minimum: 'Stock below minimum threshold',
    out_of_stock: 'Out of stock - urgent reorder needed',
    running_low: 'Stock running low',
    optimization: 'Optimization opportunity',
    expired_soon: 'Items expiring soon'
  }
  return reasons[reason] || reason
}
</script>

<style scoped>
.suggestion-card {
  transition: background-color 0.2s ease;
}

.suggestion-card:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.05);
}

.border-b {
  border-bottom: 1px solid rgba(var(--v-theme-surface-variant), 0.2);
}

.stock-info {
  font-size: 0.875rem;
}

.usage-grid {
  background: rgba(var(--v-theme-surface-variant), 0.05);
  border-radius: 4px;
  padding: 6px 8px;
}

.usage-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.usage-label {
  color: rgba(var(--v-theme-on-surface), 0.6);
  min-width: 60px;
  font-size: 0.75rem;
}

.usage-value {
  font-weight: 500;
  font-size: 0.75rem;
}

.action-section {
  min-width: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.added-section {
  width: 100%;
}

.quantity-editor {
  width: 100%;
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}
</style>
