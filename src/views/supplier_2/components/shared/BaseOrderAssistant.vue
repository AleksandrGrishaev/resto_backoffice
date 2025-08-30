<!-- src/views/supplier_2/components/shared/BaseOrderAssistant.vue -->
<!-- ✅ ОБНОВЛЕНО: убрано дублирование, используется composable для utility функций -->
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
            <!-- Loading State -->
            <div v-if="isLoading" class="text-center pa-8">
              <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
              <div class="text-body-1">Analyzing stock levels...</div>
            </div>

            <!-- Empty State -->
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

            <!-- Suggestions by Categories -->
            <div v-else>
              <div v-for="category in categorizedSuggestions" :key="category.name" class="mb-4">
                <v-card variant="outlined" class="overflow-hidden">
                  <!-- Category Header -->
                  <v-card-title
                    class="d-flex align-center pa-3"
                    :class="`bg-${category.color}-lighten-4`"
                  >
                    <v-icon :icon="category.icon" :color="category.color" class="mr-2" size="20" />
                    <span class="font-weight-bold">{{ category.name }}</span>
                    <v-spacer />
                    <v-chip size="small" :color="category.color">
                      {{ category.items.length }} items
                    </v-chip>
                  </v-card-title>

                  <!-- Category Items -->
                  <div class="pa-0">
                    <div
                      v-for="(suggestion, index) in category.items"
                      :key="suggestion.itemId"
                      class="pa-4"
                      :class="{ 'border-b': index < category.items.length - 1 }"
                    >
                      <div class="d-flex align-start">
                        <!-- Product Info -->
                        <div class="flex-grow-1 mr-4">
                          <div class="d-flex align-center mb-2">
                            <div class="font-weight-bold text-subtitle-2 mr-2">
                              {{ suggestion.itemName }}
                            </div>
                            <!-- ✅ ИСПРАВЛЕНО: используем composable -->
                            <v-chip
                              size="small"
                              :color="orderAssistant.getUrgencyColor(suggestion.urgency)"
                              :prepend-icon="orderAssistant.getUrgencyIcon(suggestion.urgency)"
                            >
                              {{ suggestion.urgency }}
                            </v-chip>
                          </div>

                          <!-- Stock Information -->
                          <div class="text-body-2 text-medium-emphasis mb-2">
                            {{ formatSuggestionQuantityRange(suggestion) }}
                          </div>

                          <!-- Reason -->
                          <div
                            v-if="suggestion.reason"
                            class="text-caption text-medium-emphasis mb-2"
                          >
                            <v-icon size="14" class="mr-1">mdi-information-outline</v-icon>
                            {{ formatReason(suggestion.reason) }}
                          </div>

                          <!-- Average Daily Usage -->
                          <div class="text-body-2">
                            <div class="text-caption text-medium-emphasis">
                              Avg. daily usage (7 days)
                            </div>
                            <div class="font-weight-bold text-info">
                              {{ formatDailyUsage(suggestion) }}
                            </div>
                          </div>
                        </div>

                        <!-- Actions -->
                        <div class="d-flex flex-column align-center">
                          <!-- If not added -->
                          <div v-if="!isSuggestionAdded(suggestion.itemId)">
                            <v-btn
                              color="success"
                              size="small"
                              prepend-icon="mdi-plus"
                              @click="addSuggestionToRequest(suggestion)"
                            >
                              Add {{ formatSuggestedQuantity(suggestion) }}
                            </v-btn>
                          </div>

                          <!-- If added - show editor -->
                          <div v-else class="d-flex align-center gap-2">
                            <v-chip color="success" size="small" prepend-icon="mdi-check">
                              Added
                            </v-chip>

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
                              <span class="text-caption">{{ getBestDisplayUnit(suggestion) }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </v-card>
              </div>

              <!-- Quick Actions -->
              <div class="d-flex gap-2 mb-4">
                <v-btn
                  v-if="urgentSuggestions.length > 0"
                  color="error"
                  prepend-icon="mdi-fire"
                  @click="addUrgentItems"
                >
                  Add All {{ urgentSuggestions.length }} Urgent Items
                </v-btn>
                <v-btn variant="outlined" prepend-icon="mdi-refresh" @click="generateSuggestions">
                  Refresh Suggestions
                </v-btn>
              </div>
            </div>
          </v-tabs-window-item>

          <!-- Manual Item Tab -->
          <v-tabs-window-item value="manual">
            <v-card>
              <v-card-title class="text-subtitle-1 pa-3 bg-grey-lighten-4">
                <v-icon icon="mdi-plus" class="mr-2" />
                Add Manual Item
              </v-card-title>

              <v-card-text class="pa-4">
                <v-row>
                  <!-- Product Selection -->
                  <v-col cols="12">
                    <v-select
                      v-model="manualItem.itemId"
                      :items="availableProductsFromStore"
                      item-title="name"
                      item-value="id"
                      label="Product"
                      placeholder="Select a product"
                      variant="outlined"
                      prepend-inner-icon="mdi-package-variant"
                      :loading="productsStore.loading"
                      @update:model-value="updateManualItemName"
                    />
                  </v-col>

                  <!-- Quantity -->
                  <v-col cols="6">
                    <v-text-field
                      v-model.number="manualItem.quantity"
                      label="Quantity"
                      type="number"
                      min="0.1"
                      step="0.1"
                      variant="outlined"
                      :suffix="manualItem.unit"
                      :hint="getQuantityHint()"
                      persistent-hint
                    />
                  </v-col>

                  <!-- Unit (read-only display) -->
                  <v-col cols="6">
                    <v-text-field
                      :model-value="manualItem.unit"
                      label="Unit"
                      readonly
                      variant="outlined"
                    />
                  </v-col>

                  <!-- Notes -->
                  <v-col cols="12">
                    <v-textarea
                      v-model="manualItem.notes"
                      label="Notes (optional)"
                      variant="outlined"
                      rows="2"
                    />
                  </v-col>

                  <!-- Preview -->
                  <v-col v-if="manualItem.itemId" cols="12">
                    <v-card variant="tonal" color="info">
                      <v-card-text class="pa-3">
                        <div class="d-flex justify-space-between align-center">
                          <div>
                            <div class="text-subtitle-2 font-weight-bold">
                              {{ manualItem.itemName }}
                            </div>
                            <div class="text-body-2">{{ getFormattedManualQuantity() }}</div>
                          </div>
                          <div class="text-right">
                            <div class="text-body-2 text-medium-emphasis">Estimated Cost</div>
                            <!-- ✅ ИСПРАВЛЕНО: используем composable -->
                            <div class="font-weight-bold">
                              {{ orderAssistant.formatCurrency(calculateManualItemCost()) }}
                            </div>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <!-- Validation Messages -->
                  <v-col v-if="manualItemValidationMessage" cols="12">
                    <v-alert :type="manualItemValidationMessage.type" density="compact">
                      {{ manualItemValidationMessage.text }}
                    </v-alert>
                  </v-col>
                </v-row>
              </v-card-text>

              <v-card-actions class="pa-4">
                <v-btn variant="outlined" prepend-icon="mdi-refresh" @click="resetManualItem">
                  Reset
                </v-btn>
                <v-spacer />
                <v-btn
                  color="success"
                  prepend-icon="mdi-plus"
                  :disabled="!canAddManualItem"
                  @click="addManualItem"
                >
                  Add Item to Request
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-tabs-window-item>

          <!-- Request Summary Tab -->
          <v-tabs-window-item value="summary">
            <!-- Empty State -->
            <div v-if="selectedItems.length === 0" class="text-center pa-8">
              <v-icon icon="mdi-cart-outline" size="64" color="grey" class="mb-4" />
              <div class="text-h6 mb-2">No Items Selected</div>
              <div class="text-body-2 text-medium-emphasis">
                Add items from suggestions or manually to create a request
              </div>
            </div>

            <!-- Selected Items with editing -->
            <div v-else>
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
                          <v-icon size="14" class="mr-1">mdi-note-text</v-icon>
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
                          <!-- ✅ ИСПРАВЛЕНО: используем composable -->
                          <div class="font-weight-bold">
                            {{
                              orderAssistant.formatCurrency(
                                orderAssistant.getEstimatedPrice(item.itemId) *
                                  item.requestedQuantity
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
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 pa-3 bg-grey-lighten-4">
                  <v-icon icon="mdi-information" class="mr-2" />
                  Request Details
                </v-card-title>

                <v-card-text class="pa-4">
                  <v-row>
                    <v-col cols="6">
                      <v-text-field
                        v-model="requestedBy"
                        label="Requested By"
                        variant="outlined"
                        prepend-inner-icon="mdi-account"
                      />
                    </v-col>
                    <v-col cols="6">
                      <v-select
                        v-model="priority"
                        :items="[
                          { title: 'Normal Priority', value: 'normal' },
                          { title: 'Urgent Priority', value: 'urgent' }
                        ]"
                        label="Priority"
                        variant="outlined"
                        prepend-inner-icon="mdi-flag"
                      />
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>

              <!-- Summary -->
              <v-card variant="outlined">
                <v-card-text class="pa-4">
                  <div class="d-flex justify-space-between align-center">
                    <div>
                      <div class="text-body-2 text-medium-emphasis">Total Items</div>
                      <div class="text-h6 font-weight-bold">{{ requestSummary.totalItems }}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-body-2 text-medium-emphasis">Avg. Cost per Item</div>
                      <!-- ✅ ИСПРАВЛЕНО: используем composable -->
                      <div class="text-h6 font-weight-bold">
                        {{
                          orderAssistant.formatCurrency(
                            requestSummary.totalItems > 0
                              ? requestSummary.estimatedTotal / requestSummary.totalItems
                              : 0
                          )
                        }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-body-2 text-medium-emphasis">Estimated Total</div>
                      <!-- ✅ ИСПРАВЛЕНО: используем composable -->
                      <div class="text-h6 font-weight-bold text-primary">
                        {{ orderAssistant.formatCurrency(requestSummary.estimatedTotal) }}
                      </div>
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
import { ref, computed, watch } from 'vue'
import { useOrderAssistant } from '@/stores/supplier_2/composables/useOrderAssistant'
import { useProductsStore } from '@/stores/productsStore'
import {
  formatQuantityWithUnit,
  formatQuantityRange,
  getBestInputUnit,
  convertUserInputToBaseUnits
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
// LOCAL STATE (без изменений)
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
  unit: 'кг',
  notes: ''
})

// =============================================
// COMPUTED PROPERTIES (без изменений)
// =============================================

const selectedDepartment = computed(() => orderAssistant.selectedDepartment.value)
const selectedItems = computed(() => orderAssistant.selectedItems.value)
const isGenerating = computed(() => orderAssistant.isGenerating.value)
const isLoading = computed(() => orderAssistant.isLoading.value)
const filteredSuggestions = computed(() => orderAssistant.filteredSuggestions.value)
const urgentSuggestions = computed(() => orderAssistant.urgentSuggestions.value)
const requestSummary = computed(() => orderAssistant.requestSummary.value)

// Group suggestions by categories (уникальная логика UI)
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

const availableProductsFromStore = computed(() => {
  return productsStore.products
    .filter(product => product.isActive)
    .map(product => ({
      id: product.id,
      name: product.name,
      unit: getBestInputUnit(product),
      isActive: product.isActive
    }))
})

const canAddManualItem = computed(() => {
  return (
    manualItem.value.itemId !== '' &&
    manualItem.value.quantity > 0 &&
    !selectedItems.value.some(item => item.itemId === manualItem.value.itemId)
  )
})

const canCreateRequest = computed(() => {
  return selectedItems.value.length > 0 && requestedBy.value.trim() !== '' && !isCreating.value
})

const manualItemValidationMessage = computed(() => {
  if (!manualItem.value.itemId) return null

  if (selectedItems.value.some(item => item.itemId === manualItem.value.itemId)) {
    return {
      type: 'warning',
      text: 'This item is already in your request'
    }
  }

  if (manualItem.value.quantity <= 0) {
    return {
      type: 'error',
      text: 'Quantity must be greater than 0'
    }
  }

  return null
})

// =============================================
// ✅ УПРОЩЕННЫЕ UTILITY FUNCTIONS - используют composable
// =============================================

function isSuggestionAdded(itemId: string): boolean {
  return orderAssistant.isSuggestionAdded(itemId)
}

// =============================================
// AI SUGGESTIONS FORMATTING (уникальная UI логика)
// =============================================

function formatSuggestionQuantityRange(suggestion: OrderSuggestion): string {
  const product = productsStore.products.find(p => p.id === suggestion.itemId)
  if (!product) {
    const formatNumber = (num: number) => {
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}kg`
      }
      return `${num}g`
    }

    return `Current: ${formatNumber(suggestion.currentStock)} • Min: ${formatNumber(suggestion.minStock)} • Suggested: ${formatNumber(suggestion.suggestedQuantity)}`
  }

  return formatQuantityRange(
    suggestion.currentStock,
    suggestion.minStock,
    suggestion.suggestedQuantity,
    product
  )
}

function formatSuggestedQuantity(suggestion: OrderSuggestion): string {
  const product = productsStore.products.find(p => p.id === suggestion.itemId)
  if (!product) return `${suggestion.suggestedQuantity}`

  return formatQuantityWithUnit(suggestion.suggestedQuantity, product, { precision: 1 })
}

function getBestDisplayUnit(suggestion: OrderSuggestion): string {
  const product = productsStore.products.find(p => p.id === suggestion.itemId)
  if (!product) return 'units'

  return getBestInputUnit(product)
}

function formatDailyUsage(suggestion: OrderSuggestion): string {
  const product = productsStore.products.find(p => p.id === suggestion.itemId)
  if (!product) return 'N/A'

  // Примерный расчет на основе minStock
  const estimatedDailyUsage = Math.max(1, (product.minStock || suggestion.suggestedQuantity) / 10)

  return formatQuantityWithUnit(estimatedDailyUsage, product, { precision: 1 }) + '/day'
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

// =============================================
// ✅ УПРОЩЕННЫЕ EVENT HANDLERS
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

// ✅ УПРОЩЕНО: убран try/catch - ошибки обрабатываются в composable
async function generateSuggestions(): Promise<void> {
  await orderAssistant.generateSuggestions()
}

// ✅ УПРОЩЕНО: минимальный try/catch только для UI состояния
async function createRequest(): Promise<void> {
  try {
    isCreating.value = true

    const requestId = await orderAssistant.createRequest(requestedBy.value, {
      priority: priority.value,
      department: selectedDepartmentIndex.value
    })

    emits('success', `Request ${requestId} created successfully`)
    closeDialog()
  } catch (error) {
    emits('error', 'Failed to create request')
  } finally {
    isCreating.value = false
  }
}

function closeDialog(): void {
  isOpen.value = false
  activeTab.value = 'suggestions'
  resetManualItem()
}

// =============================================
// ✅ УПРОЩЕННОЕ QUANTITY MANAGEMENT
// =============================================

function updateSelectedQuantity(itemId: string, newQuantity: string | number): void {
  const quantity = typeof newQuantity === 'string' ? parseFloat(newQuantity) : newQuantity
  if (quantity <= 0 || isNaN(quantity)) return

  // ✅ УПРОЩЕНО: прямой вызов composable
  orderAssistant.updateSelectedQuantity(itemId, quantity)
}

function getSelectedQuantity(itemId: string): number {
  // ✅ УПРОЩЕНО: используем метод из composable
  return orderAssistant.getSelectedQuantityForDisplay(itemId)
}

function removeItemFromRequest(itemId: string): void {
  orderAssistant.removeItemFromRequest(itemId)
}

// =============================================
// MANUAL ITEM MANAGEMENT (без изменений)
// =============================================

function updateManualItemName(): void {
  const product = availableProductsFromStore.value.find(p => p.id === manualItem.value.itemId)
  if (product) {
    manualItem.value.itemName = product.name
    manualItem.value.unit = product.unit
  }
}

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

function getFormattedManualQuantity(): string {
  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return `${manualItem.value.quantity} ${manualItem.value.unit}`

  const baseQuantity = convertUserInputToBaseUnits(
    manualItem.value.quantity,
    manualItem.value.unit,
    product
  )

  return formatQuantityWithUnit(baseQuantity, product)
}

function calculateManualItemCost(): number {
  if (!manualItem.value.itemId) return 0

  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return 0

  const baseQuantity = convertUserInputToBaseUnits(
    manualItem.value.quantity,
    manualItem.value.unit,
    product
  )

  // ✅ ИСПРАВЛЕНО: используем метод из composable
  const baseCost = orderAssistant.getEstimatedPrice(product.id)
  return baseQuantity * baseCost
}

function addManualItem(): void {
  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) {
    emits('error', 'Product not found')
    return
  }

  const quantityInBaseUnits = convertUserInputToBaseUnits(
    manualItem.value.quantity,
    manualItem.value.unit,
    product
  )

  orderAssistant.addManualItem(
    manualItem.value.itemId,
    manualItem.value.itemName,
    quantityInBaseUnits,
    getBestInputUnit(product),
    manualItem.value.notes
  )

  resetManualItem()
  activeTab.value = 'summary'
  emits('success', `Added ${product.name} to request`)
}

function resetManualItem(): void {
  manualItem.value = {
    itemId: '',
    itemName: '',
    quantity: 1,
    unit: 'кг',
    notes: ''
  }
}

// =============================================
// REQUEST SUMMARY FORMATTING (уникальная логика)
// =============================================

function formatQuantityForSummary(item: any): string {
  const product = productsStore.products.find(p => p.id === item.itemId)
  if (!product) return `${item.requestedQuantity} ${item.unit}`

  return formatQuantityWithUnit(item.requestedQuantity, product)
}

function getBestDisplayUnitForItem(item: any): string {
  const product = productsStore.products.find(p => p.id === item.itemId)
  if (!product) return item.unit

  return getBestInputUnit(product)
}

// =============================================
// WATCHERS (без изменений)
// =============================================

watch(
  selectedDepartmentIndex,
  async newDepartment => {
    if (newDepartment !== orderAssistant.selectedDepartment.value) {
      await orderAssistant.changeDepartment(newDepartment)
      await generateSuggestions()
    }
  },
  { immediate: false }
)

watch(
  isOpen,
  async newValue => {
    if (newValue) {
      selectedDepartmentIndex.value = orderAssistant.selectedDepartment.value
      await orderAssistant.refreshData()
    }
  },
  { immediate: false }
)
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.v-text-field :deep(.v-field__input) {
  text-align: center;
}
</style>
