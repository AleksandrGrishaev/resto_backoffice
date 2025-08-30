<!-- src/views/supplier_2/components/shared/BaseOrderAssistant.vue -->
<!-- ✅ UPDATED: Fixed unit display, shelf life from store, improved UI, compact cards -->
<template>
  <v-dialog v-model="isOpen" max-width="1200px" persistent>
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

            <!-- Suggestions by Categories - ✅ UPDATED: Using compact cards -->
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

                  <!-- Category Items - ✅ NEW: Using SuggestionItemCard -->
                  <div class="pa-0">
                    <SuggestionItemCard
                      v-for="(suggestion, index) in category.items"
                      :key="suggestion.itemId"
                      :suggestion="suggestion"
                      :is-added="isSuggestionAdded(suggestion.itemId)"
                      :selected-quantity="getSelectedQuantityInBaseUnits(suggestion.itemId)"
                      :is-last="index === category.items.length - 1"
                      :products-store="productsStore"
                      :order-assistant="orderAssistant"
                      @add-suggestion="addSuggestionToRequest"
                      @update-quantity="updateSelectedQuantityInBaseUnits"
                    />
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

                  <!-- ✅ UPDATED: Unit Toggle and Quantity -->
                  <v-col cols="12">
                    <div class="d-flex gap-3 align-end">
                      <!-- Unit Selection -->
                      <v-btn-toggle
                        v-model="manualItem.displayUnit"
                        color="primary"
                        mandatory
                        class="mb-6"
                      >
                        <v-btn :value="getManualItemBaseUnit()">
                          {{ getManualItemBaseUnit() }}
                        </v-btn>
                        <v-btn
                          v-if="getManualItemPurchaseUnit() !== getManualItemBaseUnit()"
                          :value="getManualItemPurchaseUnit()"
                        >
                          {{ getManualItemPurchaseUnit() }}
                        </v-btn>
                      </v-btn-toggle>

                      <!-- Quantity Input -->
                      <v-text-field
                        v-model.number="manualItem.quantity"
                        label="Quantity"
                        type="number"
                        :min="getManualItemMinQuantity()"
                        :step="getManualItemStep()"
                        variant="outlined"
                        :suffix="manualItem.displayUnit"
                        :hint="getQuantityHint()"
                        persistent-hint
                        style="flex: 1"
                      />
                    </div>
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

                  <!-- ✅ UPDATED: Enhanced Preview -->
                  <v-col v-if="manualItem.itemId" cols="12">
                    <v-card variant="tonal" color="info">
                      <v-card-text class="pa-3">
                        <div class="d-flex justify-space-between align-center">
                          <div>
                            <div class="text-subtitle-2 font-weight-bold">
                              {{ manualItem.itemName }}
                            </div>
                            <div class="text-body-2">{{ getFormattedManualQuantity() }}</div>
                            <div class="text-caption text-medium-emphasis">
                              Supply for {{ calculateManualItemDaysSupply() }} days
                            </div>
                          </div>
                          <div class="text-right">
                            <div class="text-body-2 text-medium-emphasis">Estimated Cost</div>
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
                        <div class="text-caption text-medium-emphasis">
                          Supply for {{ calculateItemDaysSupply(item) }} days
                        </div>
                        <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                          <v-icon size="14" class="mr-1">mdi-note-text</v-icon>
                          {{ item.notes }}
                        </div>
                      </div>

                      <!-- ✅ UPDATED: Unit toggle and quantity editing -->
                      <div class="d-flex align-center gap-3 ml-4">
                        <!-- Unit Toggle -->
                        <v-btn-toggle
                          :model-value="getItemDisplayUnit(item.itemId)"
                          size="small"
                          density="compact"
                          mandatory
                          @update:model-value="updateItemDisplayUnit(item.itemId, $event)"
                        >
                          <v-btn :value="getItemBaseUnit(item)" size="small">
                            {{ getItemBaseUnit(item) }}
                          </v-btn>
                          <v-btn
                            v-if="getItemPurchaseUnit(item) !== getItemBaseUnit(item)"
                            :value="getItemPurchaseUnit(item)"
                            size="small"
                          >
                            {{ getItemPurchaseUnit(item) }}
                          </v-btn>
                        </v-btn-toggle>

                        <!-- Quantity Input -->
                        <div class="d-flex align-center gap-1">
                          <v-text-field
                            :model-value="getSelectedQuantityInDisplayUnit(item.itemId)"
                            type="number"
                            :min="getMinQuantityForDisplayUnit(item)"
                            :step="getQuantityStepForDisplayUnit(item)"
                            hide-details
                            density="compact"
                            variant="outlined"
                            style="width: 90px"
                            class="text-center"
                            @update:model-value="
                              updateSelectedQuantityInDisplayUnit(item.itemId, $event)
                            "
                          />
                        </div>

                        <!-- Days supply -->
                        <div
                          class="text-caption text-medium-emphasis text-center"
                          style="min-width: 60px"
                        >
                          ~{{ calculateItemDaysSupply(item) }} days
                        </div>

                        <!-- Cost -->
                        <div class="text-right" style="min-width: 120px">
                          <div class="text-caption text-medium-emphasis">Cost</div>
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
import SuggestionItemCard from './SuggestionItemCard.vue'

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
// LOCAL STATE
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

// ✅ UPDATED: Manual item with display unit
const manualItem = ref({
  itemId: '',
  itemName: '',
  quantity: 1,
  displayUnit: 'g',
  notes: ''
})

// ✅ NEW: Track display units for each item
const itemDisplayUnits = ref<Record<string, string>>({})

// =============================================
// COMPUTED PROPERTIES
// =============================================

const selectedDepartment = computed(() => orderAssistant.selectedDepartment.value)
const selectedItems = computed(() => orderAssistant.selectedItems.value)
const isGenerating = computed(() => orderAssistant.isGenerating.value)
const isLoading = computed(() => orderAssistant.isLoading.value)
const filteredSuggestions = computed(() => orderAssistant.filteredSuggestions.value)
const urgentSuggestions = computed(() => orderAssistant.urgentSuggestions.value)
const requestSummary = computed(() => orderAssistant.requestSummary.value)

// Group suggestions by categories
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
      unit: getBaseUnitDisplay(product),
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

  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (
    product &&
    product.baseUnit === 'piece' &&
    manualItem.value.displayUnit === getBaseUnitDisplay(product)
  ) {
    if (manualItem.value.quantity % 1 !== 0) {
      return {
        type: 'error',
        text: 'Piece quantities must be whole numbers'
      }
    }
  }

  return null
})

// =============================================
// ✅ UPDATED: Unit handling functions
// =============================================

function getBaseUnitDisplay(product: any): string {
  const baseUnits: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pcs'
  }
  return baseUnits[product.baseUnit] || product.baseUnit
}

function getPurchaseUnitDisplay(product: any): string {
  const purchaseUnits: Record<string, string> = {
    kg: 'kg',
    liter: 'L',
    piece: 'pcs',
    pack: 'pack'
  }
  return purchaseUnits[product.purchaseUnit] || product.purchaseUnit
}

function shouldShowInPurchaseUnits(quantity: number, product: any): boolean {
  if (!product) return false

  // Show in purchase units if quantity >= 1000 and purchase unit is different
  return (
    quantity >= 1000 &&
    ((product.baseUnit === 'gram' && product.purchaseUnit === 'kg') ||
      (product.baseUnit === 'ml' && product.purchaseUnit === 'liter'))
  )
}

function getItemBaseUnit(item: any): string {
  const product = productsStore.products.find(p => p.id === item.itemId)
  return product ? getBaseUnitDisplay(product) : 'g'
}

function getItemPurchaseUnit(item: any): string {
  const product = productsStore.products.find(p => p.id === item.itemId)
  return product ? getPurchaseUnitDisplay(product) : 'kg'
}

function getItemDisplayUnit(itemId: string): string {
  return itemDisplayUnits.value[itemId] || getItemBaseUnitById(itemId)
}

function getItemBaseUnitById(itemId: string): string {
  const product = productsStore.products.find(p => p.id === itemId)
  return product ? getBaseUnitDisplay(product) : 'g'
}

function updateItemDisplayUnit(itemId: string, unit: string): void {
  itemDisplayUnits.value[itemId] = unit
}

// =============================================
// ✅ UPDATED: Manual item unit functions
// =============================================

function getManualItemBaseUnit(): string {
  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  return product ? getBaseUnitDisplay(product) : 'g'
}

function getManualItemPurchaseUnit(): string {
  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  return product ? getPurchaseUnitDisplay(product) : 'kg'
}

function getManualItemMinQuantity(): number {
  if (manualItem.value.displayUnit === getManualItemBaseUnit()) {
    return 1 // Base units start from 1
  }
  return 0.1 // Purchase units can have decimals
}

function getManualItemStep(): number {
  if (manualItem.value.displayUnit === getManualItemBaseUnit()) {
    return 1 // Base units are whole numbers
  }
  return 0.1 // Purchase units can have decimals
}

// =============================================
// ✅ UPDATED: Quantity management with unit conversion
// =============================================

function getSelectedQuantityInDisplayUnit(itemId: string): number {
  const item = selectedItems.value.find(item => item.itemId === itemId)
  if (!item) return 0

  const displayUnit = getItemDisplayUnit(itemId)
  const baseUnit = getItemBaseUnitById(itemId)

  if (displayUnit === baseUnit) {
    return Math.round(item.requestedQuantity)
  }

  // Convert to purchase units
  const product = productsStore.products.find(p => p.id === itemId)
  if (product && product.purchaseToBaseRatio) {
    return Math.round((item.requestedQuantity / product.purchaseToBaseRatio) * 10) / 10
  }

  return Math.round(item.requestedQuantity)
}

function updateSelectedQuantityInDisplayUnit(itemId: string, newQuantity: string | number): void {
  const quantity = typeof newQuantity === 'string' ? parseFloat(newQuantity) : newQuantity
  if (quantity <= 0 || isNaN(quantity)) return

  const displayUnit = getItemDisplayUnit(itemId)
  const baseUnit = getItemBaseUnitById(itemId)

  let finalQuantity = quantity

  // Convert to base units if needed
  if (displayUnit !== baseUnit) {
    const product = productsStore.products.find(p => p.id === itemId)
    if (product && product.purchaseToBaseRatio) {
      finalQuantity = Math.round(quantity * product.purchaseToBaseRatio)
    }
  } else {
    finalQuantity = Math.round(quantity)
  }

  orderAssistant.updateSelectedQuantity(itemId, finalQuantity)
}

function getMinQuantityForDisplayUnit(item: any): number {
  const displayUnit = getItemDisplayUnit(item.itemId)
  const baseUnit = getItemBaseUnit(item)

  return displayUnit === baseUnit ? 1 : 0.1
}

function getQuantityStepForDisplayUnit(item: any): number {
  const displayUnit = getItemDisplayUnit(item.itemId)
  const baseUnit = getItemBaseUnit(item)

  return displayUnit === baseUnit ? 1 : 0.1
}

function getSelectedQuantityInBaseUnits(itemId: string): number {
  const item = selectedItems.value.find(item => item.itemId === itemId)
  return item ? Math.round(item.requestedQuantity) : 0
}

function updateSelectedQuantityInBaseUnits(itemId: string, newQuantity: string | number): void {
  const quantity = typeof newQuantity === 'string' ? parseInt(newQuantity) : Math.round(newQuantity)
  if (quantity <= 0 || isNaN(quantity)) return

  orderAssistant.updateSelectedQuantity(itemId, quantity)
}

// =============================================
// ✅ UPDATED: Days supply calculations
// =============================================

function calculateItemDaysSupply(item: any): number {
  const product = productsStore.products.find(p => p.id === item.itemId)
  if (!product) return 0

  // ✅ FIXED: Use dailyConsumption from product store instead of hardcoded calculation
  const dailyUsage = Math.max(1, Math.round(product.dailyConsumption || product.minStock / 10))
  return Math.floor(item.requestedQuantity / dailyUsage)
}

function calculateManualItemDaysSupply(): number {
  if (!manualItem.value.itemId) return 0

  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return 0

  const baseQuantity = convertDisplayQuantityToBase()
  const dailyUsage = Math.max(1, Math.round(product.dailyConsumption || baseQuantity / 10))
  return Math.floor(baseQuantity / dailyUsage)
}

function convertDisplayQuantityToBase(): number {
  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return Math.round(manualItem.value.quantity)

  const displayUnit = manualItem.value.displayUnit
  const baseUnit = getBaseUnitDisplay(product)

  if (displayUnit === baseUnit) {
    return Math.round(manualItem.value.quantity)
  }

  // Convert from purchase units to base units
  if (product.purchaseToBaseRatio) {
    return Math.round(manualItem.value.quantity * product.purchaseToBaseRatio)
  }

  return Math.round(manualItem.value.quantity)
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function isSuggestionAdded(itemId: string): boolean {
  return orderAssistant.isSuggestionAdded(itemId)
}

function removeItemFromRequest(itemId: string): void {
  orderAssistant.removeItemFromRequest(itemId)
}

// =============================================
// EVENT HANDLERS
// =============================================

function addSuggestionToRequest(suggestion: OrderSuggestion): void {
  orderAssistant.addSuggestionToRequest(suggestion)

  // Set initial display unit based on suggested quantity
  const product = productsStore.products.find(p => p.id === suggestion.itemId)
  if (product && shouldShowInPurchaseUnits(suggestion.suggestedQuantity, product)) {
    itemDisplayUnits.value[suggestion.itemId] = getPurchaseUnitDisplay(product)
  } else {
    itemDisplayUnits.value[suggestion.itemId] = getBaseUnitDisplay(product)
  }
}

function addUrgentItems(): void {
  urgentSuggestions.value.forEach(suggestion => {
    if (!orderAssistant.isSuggestionAdded(suggestion.itemId)) {
      addSuggestionToRequest(suggestion)
    }
  })
  activeTab.value = 'summary'
}

async function generateSuggestions(): Promise<void> {
  await orderAssistant.generateSuggestions()
}

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
  itemDisplayUnits.value = {} // Reset display units
}

// =============================================
// ✅ UPDATED: Manual item management
// =============================================

function updateManualItemName(): void {
  const product = availableProductsFromStore.value.find(p => p.id === manualItem.value.itemId)
  if (product) {
    manualItem.value.itemName = product.name
    manualItem.value.displayUnit = product.unit
  }
}

function getQuantityHint(): string {
  if (!manualItem.value.itemId) return ''

  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return ''

  const isBaseUnit = manualItem.value.displayUnit === getBaseUnitDisplay(product)

  if (isBaseUnit) {
    return `Enter in ${manualItem.value.displayUnit} (base units - whole numbers only)`
  } else {
    return `Enter in ${manualItem.value.displayUnit} (will be converted to base units)`
  }
}

function getFormattedManualQuantity(): string {
  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return `${Math.round(manualItem.value.quantity)} ${manualItem.value.displayUnit}`

  const baseQuantity = convertDisplayQuantityToBase()
  const baseUnit = getBaseUnitDisplay(product)

  // Show both display quantity and base quantity if different
  if (manualItem.value.displayUnit !== baseUnit) {
    return `${manualItem.value.quantity} ${manualItem.value.displayUnit} (${baseQuantity} ${baseUnit})`
  }

  return `${Math.round(manualItem.value.quantity)} ${manualItem.value.displayUnit}`
}

function calculateManualItemCost(): number {
  if (!manualItem.value.itemId) return 0

  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) return 0

  const baseQuantity = convertDisplayQuantityToBase()
  const baseCost = orderAssistant.getEstimatedPrice(product.id)
  return baseQuantity * baseCost
}

function addManualItem(): void {
  const product = productsStore.products.find(p => p.id === manualItem.value.itemId)
  if (!product) {
    emits('error', 'Product not found')
    return
  }

  const quantityInBaseUnits = convertDisplayQuantityToBase()

  orderAssistant.addManualItem(
    manualItem.value.itemId,
    manualItem.value.itemName,
    quantityInBaseUnits,
    getBaseUnitDisplay(product),
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
    displayUnit: 'g',
    notes: ''
  }
}

// =============================================
// ✅ UPDATED: Summary formatting with best units
// =============================================

function formatQuantityForSummary(item: any): string {
  const product = productsStore.products.find(p => p.id === item.itemId)
  if (!product) return `${Math.round(item.requestedQuantity)} ${item.unit}`

  // Always show in the most appropriate unit
  if (shouldShowInPurchaseUnits(item.requestedQuantity, product)) {
    const purchaseQuantity = item.requestedQuantity / product.purchaseToBaseRatio
    return `${purchaseQuantity.toFixed(1)} ${getPurchaseUnitDisplay(product)}`
  }

  const baseUnit = getBaseUnitDisplay(product)
  return `${Math.round(item.requestedQuantity)} ${baseUnit}`
}

// =============================================
// WATCHERS
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

// ✅ NEW: Watch for manual item changes to update display unit
watch(
  () => manualItem.value.itemId,
  newItemId => {
    if (newItemId) {
      const product = productsStore.products.find(p => p.id === newItemId)
      if (product) {
        // Start with base unit
        manualItem.value.displayUnit = getBaseUnitDisplay(product)
      }
    }
  }
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
