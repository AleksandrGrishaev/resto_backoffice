<!-- src/views/kitchen/request/components/KitchenOrderAssistant.vue -->
<!-- Adapted from BaseOrderAssistant.vue for Kitchen Monitor -->
<!-- Key changes: No dialog wrapper, department via prop, uses useKitchenRequest for isolated state -->
<template>
  <v-card class="kitchen-order-assistant" variant="flat">
    <!-- Dark Tabs for Tablet -->
    <v-tabs
      v-model="activeTab"
      bg-color="grey-darken-4"
      color="white"
      slider-color="primary"
      grow
      class="request-tabs"
    >
      <v-tab value="suggestions">
        AI Suggestions
        <v-badge
          v-if="departmentFilteredSuggestions.length > 0"
          :content="departmentFilteredSuggestions.length"
          color="warning"
          inline
          class="ml-2"
        />
      </v-tab>
      <v-tab value="manual">+ Manual</v-tab>
      <v-tab value="summary">
        Summary
        <v-badge
          v-if="selectedItems.length > 0"
          :content="selectedItems.length"
          color="success"
          inline
          class="ml-2"
        />
      </v-tab>
    </v-tabs>

    <!-- Scrollable Content Area -->
    <v-tabs-window v-model="activeTab" class="tabs-content">
      <!-- AI Suggestions Tab -->
      <v-tabs-window-item value="suggestions">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
          <div class="text-body-1">Analyzing stock levels for {{ department }}...</div>
        </div>

        <!-- Empty State -->
        <div v-else-if="categorizedSuggestions.length === 0" class="text-center pa-8">
          <v-icon icon="mdi-check-circle" size="64" color="success" class="mb-4" />
          <div class="text-h6 mb-2">All Stock Levels OK</div>
          <div class="text-body-2 text-medium-emphasis">
            No urgent items needed for {{ department }}
          </div>
          <v-btn color="primary" class="mt-4" @click="generateSuggestions">
            <v-icon start>mdi-refresh</v-icon>
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
                <KitchenSuggestionCard
                  v-for="(suggestion, index) in category.items"
                  :key="suggestion.itemId"
                  :suggestion="suggestion"
                  :is-added="isSuggestionAdded(suggestion.itemId)"
                  :selected-quantity="getSelectedQuantityInBaseUnits(suggestion.itemId)"
                  :is-last="index === category.items.length - 1"
                  :products-store="productsStore"
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
        <KitchenManualItemForm
          :existing-item-ids="existingItemIds"
          :loading="isLoading"
          :department="department"
          @add-item="handleAddManualItem"
          @error="handleError"
        />
      </v-tabs-window-item>

      <!-- Request Summary Tab -->
      <v-tabs-window-item value="summary">
        <KitchenSummaryPanel
          :items="selectedItems"
          :requested-by="requestedBy"
          :priority="priority"
          @update:requested-by="requestedByLocal = $event"
          @update:priority="priority = $event"
          @update-quantity="handleUpdateQuantity"
          @update-package="handleUpdatePackage"
          @remove-item="removeItemFromRequest"
        />
      </v-tabs-window-item>
    </v-tabs-window>

    <!-- Fixed Footer Actions -->
    <div class="actions-footer">
      <v-btn variant="text" color="secondary" @click="clearSelectedItems">Clear</v-btn>
      <v-spacer />
      <v-btn
        color="success"
        size="large"
        :disabled="!canCreateRequest"
        :loading="isSubmitting"
        @click="sendRequest"
      >
        Send Request ({{ selectedItems.length }})
      </v-btn>
    </div>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showItemAddedSnackbar" :timeout="2000" color="success" location="top">
      <div class="d-flex align-center">
        <v-icon icon="mdi-check-circle" class="mr-2" />
        {{ itemAddedMessage }}
      </div>
    </v-snackbar>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useKitchenRequest } from '../composables/useKitchenRequest'
import type { OrderSuggestion, RequestItem } from '@/stores/supplier_2/types'
import KitchenSuggestionCard from './KitchenSuggestionCard.vue'
import KitchenManualItemForm from './KitchenManualItemForm.vue'
import KitchenSummaryPanel from './KitchenSummaryPanel.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  department: 'kitchen' | 'bar'
  requestedBy: string
}

interface Emits {
  (e: 'success', message: string): void
  (e: 'error', message: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLE - Using isolated state
// =============================================

const kitchenRequest = useKitchenRequest()
const { productsStore } = kitchenRequest

// =============================================
// LOCAL STATE
// =============================================

const activeTab = ref('suggestions')
const isSubmitting = ref(false)
const requestedByLocal = ref(props.requestedBy)
const priority = ref<'normal' | 'urgent'>('normal')
const showItemAddedSnackbar = ref(false)
const itemAddedMessage = ref('')

// =============================================
// COMPUTED PROPERTIES
// =============================================

const selectedItems = computed(() => kitchenRequest.selectedItems.value)
const isLoading = computed(() => kitchenRequest.isGenerating.value)
const urgentSuggestions = computed(() => kitchenRequest.urgentSuggestions.value)
const departmentFilteredSuggestions = computed(
  () => kitchenRequest.departmentFilteredSuggestions.value
)

const existingItemIds = computed(() => {
  return selectedItems.value.map(item => item.itemId)
})

// Group suggestions by categories
const categorizedSuggestions = computed(() => {
  const suggestions = departmentFilteredSuggestions.value

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
  return (
    selectedItems.value.length > 0 && requestedByLocal.value.trim() !== '' && !isSubmitting.value
  )
})

// =============================================
// UTILITY FUNCTIONS
// =============================================

function isSuggestionAdded(itemId: string): boolean {
  return kitchenRequest.isSuggestionAdded(itemId)
}

function getSelectedQuantityInBaseUnits(itemId: string): number {
  const item = selectedItems.value.find(item => item.itemId === itemId)
  return item ? Math.round(item.requestedQuantity) : 0
}

function updateSelectedQuantityInBaseUnits(itemId: string, newQuantity: string | number): void {
  const quantity = typeof newQuantity === 'string' ? parseInt(newQuantity) : Math.round(newQuantity)
  if (quantity <= 0 || isNaN(quantity)) return

  kitchenRequest.updateItemQuantity(itemId, quantity)
}

function removeItemFromRequest(itemId: string): void {
  kitchenRequest.removeSelectedItem(itemId)
}

function clearSelectedItems(): void {
  kitchenRequest.clearSelectedItems()
}

// =============================================
// EVENT HANDLERS
// =============================================

function addSuggestionToRequest(suggestion: OrderSuggestion): void {
  kitchenRequest.addSelectedItem(suggestion)
}

function addUrgentItems(): void {
  urgentSuggestions.value.forEach(suggestion => {
    if (!kitchenRequest.isSuggestionAdded(suggestion.itemId)) {
      addSuggestionToRequest(suggestion)
    }
  })
  activeTab.value = 'summary'
}

async function generateSuggestions(): Promise<void> {
  await kitchenRequest.generateSuggestions()
}

function handleAddManualItem(item: {
  itemId: string
  itemName: string
  requestedQuantity: number
  unit: string
  packageId?: string
  packageName?: string
  packageQuantity?: number
  pricePerUnit?: number
  totalCost?: number
  notes?: string
}): void {
  // Create a suggestion-like object for the manual item
  const manualSuggestion: OrderSuggestion = {
    itemId: item.itemId,
    itemName: item.itemName,
    suggestedQuantity: item.requestedQuantity,
    urgency: 'medium',
    reason: 'manual_add',
    estimatedPrice: item.pricePerUnit || 0,
    currentStock: 0,
    minStock: 0
  }

  kitchenRequest.addSelectedItem(manualSuggestion, item.requestedQuantity)

  // Update package info if provided
  if (item.packageId) {
    handleUpdatePackage(item.itemId, {
      packageId: item.packageId,
      packageName: item.packageName,
      packageQuantity: item.packageQuantity
    })
  }

  // Show success notification
  itemAddedMessage.value = `Added ${item.itemName} to request`
  showItemAddedSnackbar.value = true
}

function handleUpdateQuantity(itemId: string, quantity: number): void {
  kitchenRequest.updateItemQuantity(itemId, quantity)
}

function handleUpdatePackage(
  itemId: string,
  packageData: {
    packageId?: string
    packageName?: string
    packageQuantity?: number
  }
): void {
  const itemIndex = selectedItems.value.findIndex(i => i.itemId === itemId)
  if (itemIndex !== -1) {
    const item = kitchenRequest.state.selectedItems[itemIndex]
    item.packageId = packageData.packageId
    item.packageName = packageData.packageName
    item.packageQuantity = packageData.packageQuantity
  }
}

function handleError(message: string): void {
  emits('error', message)
}

async function sendRequest(): Promise<void> {
  try {
    isSubmitting.value = true

    // Kitchen Monitor always sends requests directly with 'submitted' status
    const requestId = await kitchenRequest.createRequest(
      requestedByLocal.value,
      priority.value,
      `Request from Kitchen Monitor (${props.department})`,
      true // sendDirectly = true, creates with 'submitted' status
    )

    emits('success', `Request ${requestId} sent successfully`)
  } catch (error) {
    emits('error', 'Failed to send request')
  } finally {
    isSubmitting.value = false
  }
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  // Generate suggestions on mount
  await generateSuggestions()
})

// Watch for requestedBy prop changes
watch(
  () => props.requestedBy,
  newValue => {
    requestedByLocal.value = newValue
  }
)
</script>

<style scoped lang="scss">
.kitchen-order-assistant {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// Dark tabs bar
.request-tabs {
  flex-shrink: 0;

  :deep(.v-tab) {
    min-height: 52px;
    padding: 0 20px;
    text-transform: none;
    letter-spacing: normal;
    font-weight: 500;
    opacity: 0.7;

    &.v-tab--selected {
      opacity: 1;
    }
  }
}

// Scrollable content area - MUST fill remaining space
.tabs-content {
  flex: 1 1 auto;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  min-height: 0; // Important for flex overflow

  // Force v-window to fill container
  :deep(.v-window__container) {
    height: 100%;
  }
}

// Fixed footer for actions - always visible at bottom
.actions-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));

  .v-btn {
    min-height: 48px;
  }
}

:deep(.v-btn) {
  min-height: 44px;
}

.gap-2 {
  gap: 8px;
}

.text-medium-emphasis {
  opacity: 0.7;
}
</style>
