<!-- src/views/supplier_2/components/shared/BaseOrderAssistant.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="1000px" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-success text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-robot" class="mr-3" size="24" />
          <div>
            <div class="text-h6 font-weight-bold">🤖 Order Assistant</div>
            <div class="text-caption opacity-90">AI-powered procurement suggestions</div>
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Department Selection -->
        <div class="pa-4 bg-surface border-b">
          <div class="text-subtitle-1 font-weight-bold mb-3">Department</div>
          <v-btn-toggle v-model="selectedDepartmentIndex" color="primary" mandatory>
            <v-btn value="kitchen" prepend-icon="mdi-chef-hat">Kitchen</v-btn>
            <v-btn value="bar" prepend-icon="mdi-glass-cocktail">Bar</v-btn>
          </v-btn-toggle>
        </div>

        <!-- Content Tabs -->
        <v-tabs v-model="activeTab">
          <v-tab value="suggestions">
            <v-icon icon="mdi-lightbulb" class="mr-2" />
            AI Suggestions
            <v-chip v-if="urgentSuggestions.length > 0" size="small" color="error" class="ml-2">
              {{ urgentSuggestions.length }} urgent
            </v-chip>
          </v-tab>
          <v-tab value="manual">
            <v-icon icon="mdi-plus" class="mr-2" />
            Add Manual Item
          </v-tab>
          <v-tab value="summary">
            <v-icon icon="mdi-cart" class="mr-2" />
            Request Summary
            <v-chip v-if="selectedItems.length > 0" size="small" color="primary" class="ml-2">
              {{ selectedItems.length }}
            </v-chip>
          </v-tab>
        </v-tabs>

        <v-tabs-window v-model="activeTab" class="pa-4" style="min-height: 400px">
          <!-- AI Suggestions Tab -->
          <v-tabs-window-item value="suggestions">
            <div v-if="isLoading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
              <div class="text-body-1">Analyzing stock levels...</div>
            </div>

            <div v-else-if="categorizedSuggestions.length === 0" class="text-center pa-8">
              <v-icon icon="mdi-check-circle" size="64" color="success" class="mb-4" />
              <div class="text-h6 mb-2">All Stock Levels OK</div>
              <div class="text-body-2 text-medium-emphasis">
                No urgent items needed for {{ selectedDepartment }}
              </div>
              <v-btn color="primary" class="mt-4" @click="generateSuggestions">
                Refresh Suggestions
              </v-btn>
            </div>

            <div v-else>
              <!-- Grouped suggestions by categories -->
              <div v-for="category in categorizedSuggestions" :key="category.name" class="mb-4">
                <v-card variant="outlined" class="overflow-hidden">
                  <!-- Category header -->
                  <v-card-title
                    class="d-flex align-center pa-3"
                    :class="`bg-${category.color}-lighten-4`"
                  >
                    <v-icon :icon="category.icon" :color="category.color" class="mr-2" size="20" />
                    <span class="font-weight-bold">{{ category.name }}</span>
                    <v-chip size="small" :color="category.color" variant="flat" class="ml-auto">
                      {{ category.items.length }} items
                    </v-chip>
                  </v-card-title>

                  <!-- Category items -->
                  <v-card-text class="pa-0">
                    <div v-for="(suggestion, index) in category.items" :key="suggestion.itemId">
                      <div class="pa-4" :class="{ 'border-b': index < category.items.length - 1 }">
                        <div class="d-flex align-center justify-space-between">
                          <div class="flex-grow-1">
                            <!-- Product name and status -->
                            <div class="d-flex align-center mb-2">
                              <span class="font-weight-bold text-subtitle-2">
                                {{ suggestion.itemName }}
                              </span>
                              <v-chip
                                size="x-small"
                                :color="getUrgencyColor(suggestion.urgency)"
                                variant="tonal"
                                class="ml-2"
                              >
                                {{ suggestion.urgency.toUpperCase() }}
                              </v-chip>
                            </div>

                            <!-- Fixed: Proper unit display -->
                            <div class="text-body-2 text-medium-emphasis mb-2">
                              {{ formatSuggestionQuantityRange(suggestion) }}
                            </div>

                            <!-- Cost -->
                            <div class="text-body-2">
                              Est. Cost: {{ formatCurrency(calculateTotalCost(suggestion)) }}
                            </div>
                          </div>

                          <!-- Extended actions -->
                          <div class="ml-4 d-flex align-center gap-2">
                            <!-- If not added -->
                            <div v-if="!isSuggestionAdded(suggestion.itemId)">
                              <v-btn
                                color="success"
                                size="small"
                                @click="addSuggestionToRequest(suggestion)"
                              >
                                Add {{ formatSuggestedQuantity(suggestion) }}
                              </v-btn>
                            </div>

                            <!-- If added - show editor -->
                            <div v-else class="d-flex align-center gap-2">
                              <v-chip color="success" size="small" variant="tonal">Added ✓</v-chip>

                              <!-- Inline quantity editor -->
                              <div class="d-flex align-center gap-1">
                                <v-text-field
                                  :model-value="getSelectedQuantity(suggestion.itemId)"
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  hide-details
                                  density="compact"
                                  variant="outlined"
                                  style="width: 80px"
                                  class="text-center"
                                  @update:model-value="
                                    updateSelectedQuantity(suggestion.itemId, $event)
                                  "
                                />
                                <span
                                  class="text-caption text-medium-emphasis"
                                  style="min-width: 25px"
                                >
                                  {{ getBestDisplayUnit(suggestion) }}
                                </span>
                              </div>

                              <!-- Delete button -->
                              <v-btn
                                icon="mdi-delete"
                                size="x-small"
                                variant="text"
                                color="error"
                                @click="removeSuggestionFromRequest(suggestion.itemId)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </div>

              <!-- Quick Actions -->
              <div class="d-flex gap-2">
                <v-btn color="error" variant="outlined" @click="addUrgentItems">
                  Add All Urgent ({{ urgentSuggestions.length }})
                </v-btn>
                <v-btn
                  color="primary"
                  variant="outlined"
                  :loading="isGenerating"
                  @click="generateSuggestions"
                >
                  Refresh
                </v-btn>
              </div>
            </div>
          </v-tabs-window-item>

          <!-- Manual Item Tab -->
          <v-tabs-window-item value="manual">
            <v-row>
              <!-- Product selection from store -->
              <v-col cols="12" md="6">
                <v-select
                  v-model="manualItem.itemId"
                  :items="availableProductsFromStore"
                  item-title="name"
                  item-value="id"
                  label="Product"
                  variant="outlined"
                  @update:model-value="updateManualItemName"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :title="item.raw.name">
                      <template #subtitle>
                        <div class="text-caption">
                          Input unit: {{ item.raw.unit }}
                          <v-chip
                            v-if="!item.raw.isActive"
                            size="x-small"
                            color="warning"
                            class="ml-2"
                          >
                            Inactive
                          </v-chip>
                        </div>
                      </template>
                    </v-list-item>
                  </template>
                </v-select>
              </v-col>

              <!-- Quantity field with decimal support -->
              <v-col cols="12" md="3">
                <v-text-field
                  v-model.number="manualItem.quantity"
                  label="Quantity"
                  type="number"
                  min="0.1"
                  step="0.1"
                  variant="outlined"
                  :hint="getQuantityHint()"
                  persistent-hint
                />
              </v-col>

              <!-- Unit field -->
              <v-col cols="12" md="3">
                <v-text-field
                  v-model="manualItem.unit"
                  label="Unit"
                  readonly
                  variant="outlined"
                  :placeholder="manualItem.itemId ? '' : 'Select product first'"
                />
              </v-col>

              <!-- Notes field -->
              <v-col cols="12">
                <v-textarea
                  v-model="manualItem.notes"
                  label="Notes (optional)"
                  rows="2"
                  variant="outlined"
                  placeholder="Add any special requirements or notes..."
                />
              </v-col>

              <!-- Item preview -->
              <v-col v-if="manualItem.itemId" cols="12">
                <v-card variant="tonal" color="info" class="mb-3">
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center justify-space-between">
                      <div>
                        <div class="font-weight-bold">{{ manualItem.itemName }}</div>
                        <div class="text-body-2">
                          {{ getFormattedManualQuantity() }}
                        </div>
                        <div v-if="manualItem.notes" class="text-caption text-medium-emphasis mt-1">
                          Note: {{ manualItem.notes }}
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-body-2 text-medium-emphasis">Estimated Cost</div>
                        <div class="font-weight-bold">
                          {{ formatCurrency(calculateManualItemCost()) }}
                        </div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Add button -->
              <v-col cols="12">
                <v-btn
                  color="primary"
                  :disabled="!canAddManualItem"
                  block
                  size="large"
                  @click="addManualItem"
                >
                  <v-icon icon="mdi-plus" class="mr-2" />
                  Add Item to Request
                </v-btn>
              </v-col>
            </v-row>
          </v-tabs-window-item>

          <!-- Request Summary Tab -->
          <v-tabs-window-item value="summary">
            <div v-if="selectedItems.length === 0" class="text-center pa-8">
              <v-icon icon="mdi-cart-outline" size="64" color="grey" class="mb-4" />
              <div class="text-h6 mb-2">No Items Selected</div>
              <div class="text-body-2 text-medium-emphasis">
                Add items from suggestions or manually to create a request
              </div>
            </div>

            <div v-else>
              <!-- Updated: Selected Items with editing -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 pa-3 bg-primary-lighten-5">
                  <v-icon icon="mdi-cart" class="mr-2" />
                  Selected Items ({{ selectedItems.length }})
                </v-card-title>
                <v-divider />

                <div class="pa-3">
                  <div
                    v-for="(item, index) in selectedItems"
                    :key="item.itemId"
                    class="py-3"
                    :class="{ 'border-b': index < selectedItems.length - 1 }"
                  >
                    <div class="d-flex align-center justify-space-between">
                      <!-- Product information -->
                      <div class="flex-grow-1">
                        <div class="font-weight-bold text-subtitle-2">{{ item.itemName }}</div>
                        <div class="text-body-2 text-medium-emphasis">
                          {{ formatQuantityForSummary(item) }}
                        </div>
                        <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                          {{ item.notes }}
                        </div>
                      </div>

                      <!-- Quantity editing -->
                      <div class="d-flex align-center gap-3 ml-4">
                        <!-- Inline editor -->
                        <div class="d-flex align-center gap-1">
                          <v-text-field
                            :model-value="getSelectedQuantity(item.itemId)"
                            type="number"
                            min="0.1"
                            step="0.1"
                            hide-details
                            density="compact"
                            variant="outlined"
                            style="width: 90px"
                            class="text-center"
                            @update:model-value="updateSelectedQuantity(item.itemId, $event)"
                          />
                          <span class="text-caption text-medium-emphasis" style="min-width: 30px">
                            {{ getBestDisplayUnitForItem(item) }}
                          </span>
                        </div>

                        <!-- Cost -->
                        <div class="text-right" style="min-width: 120px">
                          <div class="text-caption text-medium-emphasis">Cost</div>
                          <div class="font-weight-bold">
                            {{
                              formatCurrency(
                                getEstimatedPrice(item.itemId) * item.requestedQuantity
                              )
                            }}
                          </div>
                        </div>

                        <!-- Delete button -->
                        <v-btn
                          icon="mdi-close"
                          size="small"
                          variant="text"
                          color="error"
                          @click="removeItemFromRequest(item.itemId)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </v-card>

              <!-- Request Details -->
              <v-row class="mb-4">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="requestedBy"
                    label="Requested By"
                    prepend-icon="mdi-account"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="priority"
                    :items="[
                      { title: 'Normal', value: 'normal' },
                      { title: 'Urgent', value: 'urgent' }
                    ]"
                    label="Priority"
                    prepend-icon="mdi-flag"
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <!-- Improved summary -->
              <v-card variant="tonal" color="info" class="mb-4">
                <v-card-text class="pa-4">
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="text-body-2 text-medium-emphasis">Total Items</div>
                      <div class="text-h6 font-weight-bold">{{ requestSummary.totalItems }}</div>
                    </div>

                    <div class="text-center">
                      <div class="text-body-2 text-medium-emphasis">Avg per Item</div>
                      <div class="text-subtitle-1 font-weight-bold">
                        {{
                          formatCurrency(
                            requestSummary.totalItems > 0
                              ? requestSummary.estimatedTotal / requestSummary.totalItems
                              : 0
                          )
                        }}
                      </div>
                    </div>

                    <div class="text-right">
                      <div class="text-body-2 text-medium-emphasis">Estimated Total</div>
                      <div class="text-h6 font-weight-bold text-primary">
                        {{ formatCurrency(requestSummary.estimatedTotal) }}
                      </div>
                    </div>
                  </div>

                  <!-- Category breakdown -->
                  <v-divider class="my-3" />
                  <div class="d-flex gap-4 text-center">
                    <div>
                      <div class="text-caption text-medium-emphasis">Urgent Items</div>
                      <v-chip
                        size="small"
                        :color="requestSummary.urgentItems > 0 ? 'error' : 'success'"
                      >
                        {{ requestSummary.urgentItems }}
                      </v-chip>
                    </div>
                    <div>
                      <div class="text-caption text-medium-emphasis">Department</div>
                      <v-chip
                        size="small"
                        :color="selectedDepartment === 'kitchen' ? 'orange' : 'purple'"
                      >
                        {{ selectedDepartment }}
                      </v-chip>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" @click="closeDialog">Cancel</v-btn>
        <v-spacer />
        <v-btn
          color="success"
          :disabled="!canCreateRequest"
          :loading="isCreating"
          @click="createRequest"
        >
          Create Request
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useOrderAssistant } from '@/stores/supplier_2/composables/useOrderAssistant'
import { useProductsStore } from '@/stores/productsStore'
// New utility imports
import {
  formatQuantityWithUnit,
  formatQuantityRange,
  getBestInputUnit,
  convertToPurchaseUnits,
  convertUserInputToBaseUnits,
  convertBaseUnitsToUserDisplay
} from '@/utils/quantityFormatter'
import type { OrderSuggestion, Department } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', message: string): void
  (e: 'error', message: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES
// =============================================

const orderAssistant = useOrderAssistant()
const productsStore = useProductsStore()

// =============================================
// LOCAL STATE (updated)
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const activeTab = ref('suggestions')
const isCreating = ref(false)
const requestedBy = ref('Chef Maria')
const priority = ref<'normal' | 'urgent'>('normal')
const selectedDepartmentIndex = ref<Department>('kitchen')

const manualItem = ref({
  itemId: '',
  itemName: '',
  quantity: 1,
  unit: 'кг', // Fixed: Using Russian units
  notes: ''
})

// =============================================
// UPDATED COMPUTED PROPERTIES
// =============================================

const selectedDepartment = computed(() => orderAssistant.selectedDepartment.value)
const selectedItems = computed(() => orderAssistant.selectedItems.value)
const isGenerating = computed(() => orderAssistant.isGenerating.value)
const isLoading = computed(() => orderAssistant.isLoading.value)
const filteredSuggestions = computed(() => orderAssistant.filteredSuggestions.value)
const urgentSuggestions = computed(() => orderAssistant.urgentSuggestions.value)
const requestSummary = computed(() => orderAssistant.requestSummary.value)

// New: Group suggestions by categories
const categorizedSuggestions = computed(() => {
  const suggestions = filteredSuggestions.value

  const categories = [
    {
      name: '🔥 Critical - Out of Stock',
      icon: 'mdi-alert-circle',
      color: 'error',
      items: suggestions.filter(s => s.urgency === 'high' && s.currentStock === 0)
    },
    {
      name: '⚠️ Low Stock - Urgent',
      icon: 'mdi-alert',
      color: 'warning',
      items: suggestions.filter(s => s.urgency === 'high' && s.currentStock > 0)
    },
    {
      name: '📦 Regular Restock',
      icon: 'mdi-package-variant',
      color: 'info',
      items: suggestions.filter(s => s.urgency === 'medium')
    },
    {
      name: '💡 Optimization',
      icon: 'mdi-trending-up',
      color: 'success',
      items: suggestions.filter(s => s.urgency === 'low')
    }
  ].filter(category => category.items.length > 0)

  return categories
})

// Fixed: Products from ProductsStore instead of hardcoded list
const availableProductsFromStore = computed(() => {
  return productsStore.products
    .filter(product => product.isActive)
    .map(product => ({
      id: product.id,
      name: product.name,
      unit: getBestInputUnit(product), // Best input unit for user
      isActive: product.isActive
    }))
})

const canAddManualItem = computed(() => {
  return (
    manualItem.value.itemId &&
    manualItem.value.quantity > 0 &&
    !selectedItems.value.some(item => item.itemId === manualItem.value.itemId)
  )
})

const canCreateRequest = computed(() => {
  return selectedItems.value.length > 0 && requestedBy.value.trim() !== '' && !isCreating.value
})

// =============================================
// NEW METHODS FOR UNIT FORMATTING
// =============================================

/**
 * Formats quantity range for suggestion
 */
function formatSuggestionQuantityRange(suggestion: OrderSuggestion): string {
  const product = productsStore.products.find(p => p.id === suggestion.itemId)
  if (!product) {
    return `Current: ${suggestion.currentStock} • Min: ${suggestion.minStock} • Suggested: ${suggestion.suggestedQuantity}`
  }

  return formatQuantityRange(
    suggestion.currentStock,
    suggestion.minStock,
    suggestion.suggestedQuantity,
    product
  )
}

/**
 * Formats suggested quantity for Add button
 */
function formatSuggestedQuantity(suggestion: OrderSuggestion): string {
  const product = productsStore.products.find(p => p.id === suggestion.itemId)
  if (!product) return `${suggestion.suggestedQuantity}`

  return formatQuantityWithUnit(suggestion.suggestedQuantity, product, { precision: 1 })
}

/**
 * Gets best unit for editor display
 */
function getBestDisplayUnit(suggestion: OrderSuggestion): string {
  const product = productsStore.products.find(p => p.id === suggestion.itemId)
  if (!product) return 'units'

  return getBestInputUnit(product)
}

/**
 * Formats quantity for summary tab
 */
function formatQuantityForSummary(item: any): string {
  const product = productsStore.products.find(p => p.id === item.itemId)
  if (!product) return `${item.requestedQuantity} ${item.unit}`

  return formatQuantityWithUnit(item.requestedQuantity, product)
}

/**
 * Calculates total cost for suggestion
 */
function calculateTotalCost(suggestion: OrderSuggestion): number {
  const product = productsStore.products.find(p => p.id === suggestion.itemId)
  if (!product) return suggestion.estimatedPrice * suggestion.suggestedQuantity

  // Get purchase cost per unit
  const purchaseCost = (product as any).purchaseCost || suggestion.estimatedPrice

  // Convert suggested quantity to purchase units
  const purchaseUnits = convertToPurchaseUnits(suggestion.suggestedQuantity, product)

  return purchaseUnits.quantity * purchaseCost
}

// =============================================
// NEW METHODS FOR QUANTITY EDITING
// =============================================

/**
 * Updates quantity of already added item
 */
function updateSelectedQuantity(itemId: string, newQuantity: string | number): void {
  const quantity = typeof newQuantity === 'string' ? parseFloat(newQuantity) : newQuantity
  if (quantity <= 0 || isNaN(quantity)) return

  try {
    const product = productsStore.products.find(p => p.id === itemId)
    if (!product) return

    // Convert user input to base units
    const inputUnit = getBestInputUnit(product)
    const quantityInBaseUnits = convertUserInputToBaseUnits(quantity, inputUnit, product)

    // Update through composable
    orderAssistant.updateSelectedQuantity(itemId, quantityInBaseUnits)
  } catch (error) {
    console.error('Error updating quantity:', error)
    emits('error', 'Failed to update quantity')
  }
}

/**
 * Gets quantity for editor display (in convenient units)
 */
function getSelectedQuantity(itemId: string): number {
  const item = selectedItems.value.find(item => item.itemId === itemId)
  if (!item) return 0

  const product = productsStore.products.find(p => p.id === itemId)
  if (!product) return item.requestedQuantity

  // Всегда конвертируем в единицы ввода (kg для граммовых продуктов)
  const inputUnit = getBestInputUnit(product)

  if (inputUnit === 'kg' && product.baseUnit === 'gram') {
    return Number((item.requestedQuantity / 1000).toFixed(3)) // 420г → 0.42кг
  }

  if (inputUnit === 'L' && product.baseUnit === 'ml') {
    return Number((item.requestedQuantity / 1000).toFixed(3))
  }

  return item.requestedQuantity
}

/**
 * Removes suggestion from request
 */
function removeSuggestionFromRequest(itemId: string): void {
  try {
    orderAssistant.removeItemFromRequest(itemId)
  } catch (error) {
    console.error('Error removing item:', error)
    emits('error', 'Failed to remove item')
  }
}

// =============================================
// ADDITIONAL METHODS FOR MANUAL ITEM
// =============================================

/**
 * Updates manual item information when product is selected
 */
function updateManualItemName(): void {
  const product = availableProductsFromStore.value.find(p => p.id === manualItem.value.itemId)
  if (product) {
    manualItem.value.itemName = product.name
    manualItem.value.unit = product.unit
  }
}

/**
 * Gets quantity input hint
 */
function getQuantityHint(): string {
  if (!manualItem.value.itemId) return ''

  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return ''

  const baseUnit = product.baseUnit
  const inputUnit = manualItem.value.unit

  if (inputUnit === 'kg' && baseUnit === 'gram') {
    return 'Enter in kg (will be converted to grams internally)'
  }

  if (inputUnit === 'L' && baseUnit === 'ml') {
    return 'Enter in liters (will be converted to ml internally)'
  }

  return `Enter in ${inputUnit}`
}

/**
 * Formats quantity for manual item preview
 */
function getFormattedManualQuantity(): string {
  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return `${manualItem.value.quantity} ${manualItem.value.unit}`

  // Convert to base units for accurate display
  const baseQuantity = convertUserInputToBaseUnits(
    manualItem.value.quantity,
    manualItem.value.unit,
    product
  )

  return formatQuantityWithUnit(baseQuantity, product)
}

/**
 * Calculates manual item cost
 */
function calculateManualItemCost(): number {
  if (!manualItem.value.itemId) return 0

  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return 0

  const baseQuantity = convertUserInputToBaseUnits(
    manualItem.value.quantity,
    manualItem.value.unit,
    product
  )

  const baseCost = (product as any).baseCostPerUnit || product.costPerUnit || 0
  return baseQuantity * baseCost
}

/**
 * Gets display unit for item in summary
 */
function getBestDisplayUnitForItem(item: any): string {
  const product = productsStore.products.find(p => p.id === item.itemId)
  if (!product) return item.unit

  return getBestInputUnit(product)
}

/**
 * Adds manual item to request
 */
function addManualItem(): void {
  try {
    const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
    if (!product) {
      emits('error', 'Product not found')
      return
    }

    // Fixed: Convert quantity to base units
    const quantityInBaseUnits = convertUserInputToBaseUnits(
      manualItem.value.quantity,
      manualItem.value.unit,
      product
    )

    orderAssistant.addManualItem(
      manualItem.value.itemId,
      manualItem.value.itemName,
      quantityInBaseUnits, // Pass in base units
      product.baseUnit, // Save base unit
      manualItem.value.notes || undefined
    )

    resetManualItem()
    activeTab.value = 'summary'
  } catch (error) {
    console.error('Error adding manual item:', error)
    emits('error', 'Failed to add item')
  }
}

/**
 * Resets manual item form
 */
function resetManualItem(): void {
  manualItem.value = {
    itemId: '',
    itemName: '',
    quantity: 1,
    unit: 'kg',
    notes: ''
  }
}

// =============================================
// OTHER METHODS (existing, but updated)
// =============================================

function addSuggestionToRequest(suggestion: OrderSuggestion): void {
  orderAssistant.addSuggestionToRequest(suggestion)
}

function addUrgentItems(): void {
  urgentSuggestions.value.forEach(suggestion => {
    if (!orderAssistant.isSuggestionAdded(suggestion.itemId)) {
      orderAssistant.addSuggestionToRequest(suggestion)
    }
  })
  activeTab.value = 'summary'
}

function removeItemFromRequest(itemId: string): void {
  orderAssistant.removeItemFromRequest(itemId)
}

async function generateSuggestions(): Promise<void> {
  try {
    await orderAssistant.generateSuggestions()
  } catch (error) {
    console.error('Error generating suggestions:', error)
    emits('error', 'Failed to generate suggestions')
  }
}

async function createRequest(): Promise<void> {
  if (!canCreateRequest.value) return

  try {
    isCreating.value = true

    const request = await orderAssistant.createRequestFromItems(
      requestedBy.value.trim(),
      priority.value,
      `Created via Order Assistant for ${selectedDepartment.value}`
    )

    emits('success', `Request ${request.requestNumber} created successfully!`)
    closeDialog()
  } catch (error: any) {
    console.error('Error creating request:', error)
    emits('error', error.message || 'Failed to create request')
  } finally {
    isCreating.value = false
  }
}

async function handleDepartmentChange(): Promise<void> {
  try {
    await orderAssistant.changeDepartment(selectedDepartmentIndex.value)
    resetManualItem()
  } catch (error) {
    console.error('Error changing department:', error)
    emits('error', 'Failed to change department')
  }
}

function closeDialog(): void {
  isOpen.value = false
  setTimeout(() => {
    resetForm()
  }, 300)
}

function resetForm(): void {
  orderAssistant.clearSelectedItems()
  resetManualItem()
  requestedBy.value = 'Chef Maria'
  priority.value = 'normal'
  activeTab.value = 'suggestions'
}

// Methods from composable
const { formatCurrency, getUrgencyColor, getUrgencyIcon, isSuggestionAdded, getEstimatedPrice } =
  orderAssistant

// =============================================
// WATCHERS
// =============================================

watch(selectedDepartmentIndex, handleDepartmentChange)

watch(isOpen, async newValue => {
  if (newValue) {
    await nextTick()
    generateSuggestions()
  }
})
</script>
