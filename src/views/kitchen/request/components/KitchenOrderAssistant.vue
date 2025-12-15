<!-- src/views/kitchen/request/components/KitchenOrderAssistant.vue -->
<!-- Adapted from BaseOrderAssistant.vue for Kitchen Monitor -->
<!-- Key changes: No dialog wrapper, department via prop, uses useKitchenRequest for isolated state -->
<template>
  <v-card class="kitchen-order-assistant" variant="flat">
    <!-- Content Tabs -->
    <v-tabs v-model="activeTab" bg-color="surface-variant">
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

    <v-divider />

    <!-- Actions -->
    <v-card-actions class="pa-4">
      <v-btn variant="outlined" color="secondary" @click="clearSelectedItems">
        <v-icon start>mdi-close</v-icon>
        Clear All
      </v-btn>
      <v-spacer />
      <v-btn
        variant="tonal"
        color="primary"
        :disabled="!canCreateRequest"
        :loading="isCreating && !isSubmitting"
        prepend-icon="mdi-content-save-outline"
        @click="saveDraft"
      >
        Save Draft
      </v-btn>
      <v-btn
        color="success"
        :disabled="!canCreateRequest"
        :loading="isSubmitting"
        prepend-icon="mdi-send"
        class="ml-2"
        @click="sendRequest"
      >
        Send Request
      </v-btn>
    </v-card-actions>

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
const isCreating = ref(false)
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
  return selectedItems.value.length > 0 && requestedByLocal.value.trim() !== '' && !isCreating.value
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

async function saveDraft(): Promise<void> {
  try {
    isCreating.value = true

    const requestId = await kitchenRequest.createRequest(requestedByLocal.value, priority.value)

    emits('success', `Draft ${requestId} saved successfully`)
  } catch (error) {
    emits('error', 'Failed to save draft')
  } finally {
    isCreating.value = false
  }
}

async function sendRequest(): Promise<void> {
  try {
    isSubmitting.value = true
    isCreating.value = true

    const requestId = await kitchenRequest.createRequest(
      requestedByLocal.value,
      priority.value,
      `Request from Kitchen Monitor (${props.department})`
    )

    emits('success', `Request ${requestId} sent successfully`)
  } catch (error) {
    emits('error', 'Failed to send request')
  } finally {
    isSubmitting.value = false
    isCreating.value = false
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

  .v-tabs-window {
    flex: 1;
    overflow-y: auto;
  }

  // Large touch targets for tablet use
  :deep(.v-tab) {
    min-height: 56px;
    font-size: var(--text-base);
  }

  :deep(.v-btn) {
    min-height: 48px;
  }
}

.gap-2 {
  gap: 8px;
}

.text-medium-emphasis {
  opacity: 0.7;
}
</style>
