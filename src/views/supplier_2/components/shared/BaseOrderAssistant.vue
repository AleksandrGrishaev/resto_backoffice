<!-- src/views/supplier_2/components/shared/BaseOrderAssistant.vue -->
<!-- ✅ UPDATED: Integrated ManualItemForm and RequestSummaryPanel with PackageSelector -->
<template>
  <v-dialog v-model="isOpen" max-width="1200px" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-success text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-robot" class="mr-3" size="24" />
          <div>
            <div class="text-h6 font-weight-bold">Order Assistant</div>
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

          <!-- ✅ NEW: Manual Item Tab with ManualItemForm -->
          <v-tabs-window-item value="manual">
            <ManualItemForm
              :existing-item-ids="existingItemIds"
              :loading="isLoading"
              @add-item="handleAddManualItem"
              @error="handleError"
            />
          </v-tabs-window-item>

          <!-- ✅ NEW: Request Summary Tab with RequestSummaryPanel -->
          <v-tabs-window-item value="summary">
            <RequestSummaryPanel
              :items="selectedItems"
              :requested-by="requestedBy"
              :priority="priority"
              @update:requested-by="requestedBy = $event"
              @update:priority="priority = $event"
              @update-quantity="handleUpdateQuantity"
              @update-package="handleUpdatePackage"
              @remove-item="removeItemFromRequest"
            />
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
import type { OrderSuggestion, Department } from '@/stores/supplier_2/types'
import SuggestionItemCard from './SuggestionItemCard.vue'
import ManualItemForm from './ManualItemForm.vue'
import RequestSummaryPanel from './RequestSummaryPanel.vue'

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

const existingItemIds = computed(() => {
  return selectedItems.value.map(item => item.itemId)
})

// Group suggestions by categories
const categorizedSuggestions = computed(() => {
  const suggestions = filteredSuggestions.value

  const categories = [
    {
      name: 'Critical - Out of Stock',
      icon: 'mdi-alert-circle',
      color: 'error',
      items: suggestions.filter(s => s.urgency === 'high' && s.currentStock === 0)
    },
    {
      name: 'Low Stock - Urgent',
      icon: 'mdi-alert',
      color: 'warning',
      items: suggestions.filter(s => s.urgency === 'high' && s.currentStock > 0)
    },
    {
      name: 'Regular Restock',
      icon: 'mdi-package-variant',
      color: 'info',
      items: suggestions.filter(s => s.urgency === 'medium')
    },
    {
      name: 'Optimization',
      icon: 'mdi-trending-up',
      color: 'success',
      items: suggestions.filter(s => s.urgency === 'low')
    }
  ].filter(category => category.items.length > 0)

  return categories
})

const canCreateRequest = computed(() => {
  return selectedItems.value.length > 0 && requestedBy.value.trim() !== '' && !isCreating.value
})

// =============================================
// UTILITY FUNCTIONS
// =============================================

function isSuggestionAdded(itemId: string): boolean {
  return orderAssistant.isSuggestionAdded(itemId)
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

function removeItemFromRequest(itemId: string): void {
  orderAssistant.removeItemFromRequest(itemId)
}

// =============================================
// EVENT HANDLERS
// =============================================

function addSuggestionToRequest(suggestion: OrderSuggestion): void {
  orderAssistant.addSuggestionToRequest(suggestion)
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

function handleAddManualItem(item: {
  itemId: string
  itemName: string
  requestedQuantity: number
  unit: string
  packageId?: string
  packageName?: string
  packageQuantity?: number
  notes?: string
}): void {
  // Add item using order assistant
  orderAssistant.addManualItem(
    item.itemId,
    item.itemName,
    item.requestedQuantity,
    item.unit,
    item.notes
  )

  // Update package info if provided
  if (item.packageId) {
    handleUpdatePackage(item.itemId, {
      packageId: item.packageId,
      packageName: item.packageName,
      packageQuantity: item.packageQuantity
    })
  }

  activeTab.value = 'summary'
  emits('success', `Added ${item.itemName} to request`)
}

function handleUpdateQuantity(itemId: string, quantity: number): void {
  orderAssistant.updateSelectedQuantity(itemId, quantity)
}

function handleUpdatePackage(
  itemId: string,
  packageData: {
    packageId?: string
    packageName?: string
    packageQuantity?: number
  }
): void {
  // Найти индекс элемента в state
  const itemIndex = selectedItems.value.findIndex(i => i.itemId === itemId)
  if (itemIndex !== -1) {
    // ✅ Обновляем через splice для реактивности
    const updatedItem = {
      ...selectedItems.value[itemIndex],
      packageId: packageData.packageId,
      packageName: packageData.packageName,
      packageQuantity: packageData.packageQuantity
    }
    selectedItems.value.splice(itemIndex, 1, updatedItem)
  }
}

function handleError(message: string): void {
  emits('error', message)
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
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.gap-2 {
  gap: 8px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

.bg-surface {
  background-color: rgb(var(--v-theme-surface-variant), 0.5);
}
</style>
