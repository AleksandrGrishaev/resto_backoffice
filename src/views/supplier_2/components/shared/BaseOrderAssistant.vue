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

            <div v-else-if="filteredSuggestions.length === 0" class="text-center pa-8">
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
              <!-- Suggestions List -->
              <div class="mb-4">
                <v-row
                  v-for="suggestion in filteredSuggestions"
                  :key="suggestion.itemId"
                  class="mb-2"
                >
                  <v-col cols="12">
                    <v-card
                      variant="outlined"
                      :color="getUrgencyColor(suggestion.urgency)"
                      class="pa-3"
                    >
                      <div class="d-flex align-center justify-space-between">
                        <div class="flex-grow-1">
                          <div class="d-flex align-center mb-1">
                            <v-icon
                              :icon="getUrgencyIcon(suggestion.urgency)"
                              :color="getUrgencyColor(suggestion.urgency)"
                              class="mr-2"
                              size="16"
                            />
                            <span class="font-weight-bold">{{ suggestion.itemName }}</span>
                            <v-chip
                              size="small"
                              :color="getUrgencyColor(suggestion.urgency)"
                              variant="tonal"
                              class="ml-2"
                            >
                              {{ suggestion.urgency }}
                            </v-chip>
                          </div>
                          <div class="text-body-2 text-medium-emphasis mb-2">
                            Current: {{ suggestion.currentStock }} • Min:
                            {{ suggestion.minStock }} • Suggested:
                            {{ suggestion.suggestedQuantity }}
                          </div>
                          <div class="text-body-2">
                            Est. Cost:
                            {{
                              formatCurrency(
                                suggestion.estimatedPrice * suggestion.suggestedQuantity
                              )
                            }}
                          </div>
                        </div>
                        <div>
                          <v-btn
                            v-if="!isSuggestionAdded(suggestion.itemId)"
                            color="success"
                            size="small"
                            @click="addSuggestionToRequest(suggestion)"
                          >
                            Add
                          </v-btn>
                          <v-chip v-else color="success" size="small" variant="tonal">
                            Added ✓
                          </v-chip>
                        </div>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>
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
              <v-col cols="12" md="6">
                <v-select
                  v-model="manualItem.itemId"
                  :items="availableProducts"
                  item-title="name"
                  item-value="id"
                  label="Product"
                  @update:model-value="updateManualItemName"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field
                  v-model.number="manualItem.quantity"
                  label="Quantity"
                  type="number"
                  min="1"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field v-model="manualItem.unit" label="Unit" readonly />
              </v-col>
              <v-col cols="12">
                <v-textarea v-model="manualItem.notes" label="Notes (optional)" rows="2" />
              </v-col>
              <v-col cols="12">
                <v-btn color="primary" :disabled="!canAddManualItem" @click="addManualItem">
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
              <!-- Selected Items -->
              <v-card variant="outlined" class="mb-4">
                <v-card-title class="text-subtitle-1 pa-3">
                  Selected Items ({{ selectedItems.length }})
                </v-card-title>
                <v-divider />
                <div class="pa-3">
                  <div
                    v-for="item in selectedItems"
                    :key="item.itemId"
                    class="d-flex align-center justify-space-between py-2 border-b"
                  >
                    <div>
                      <div class="font-weight-bold">{{ item.itemName }}</div>
                      <div class="text-body-2 text-medium-emphasis">
                        {{ item.quantity }} {{ item.unit }}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="font-weight-bold">
                        {{ formatCurrency(getEstimatedPrice(item.itemId) * item.quantity) }}
                      </div>
                      <v-btn
                        icon="mdi-close"
                        size="x-small"
                        variant="text"
                        color="error"
                        @click="removeItemFromRequest(item.itemId)"
                      />
                    </div>
                  </div>
                </div>
              </v-card>

              <!-- Request Details -->
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="requestedBy"
                    label="Requested By"
                    prepend-icon="mdi-account"
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
                  />
                </v-col>
              </v-row>

              <!-- Summary -->
              <v-card variant="tonal" color="info" class="mb-4">
                <v-card-text class="pa-3">
                  <div class="d-flex justify-space-between">
                    <div>
                      <div class="text-body-2 text-medium-emphasis">Total Items</div>
                      <div class="text-h6">{{ requestSummary.totalItems }}</div>
                    </div>
                    <div class="text-right">
                      <div class="text-body-2 text-medium-emphasis">Estimated Total</div>
                      <div class="text-h6">{{ formatCurrency(requestSummary.estimatedTotal) }}</div>
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
// COMPOSABLES - Упрощенно без избыточных проверок
// =============================================

const orderAssistant = useOrderAssistant()

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

const manualItem = ref({
  itemId: '',
  itemName: '',
  quantity: 1,
  unit: 'kg',
  notes: ''
})

// Продукты для ручного добавления
const availableProducts = ref([
  { id: 'prod-beef-steak', name: 'Beef Steak', unit: 'kg' },
  { id: 'prod-potato', name: 'Potato', unit: 'kg' },
  { id: 'prod-garlic', name: 'Garlic', unit: 'kg' },
  { id: 'prod-tomato', name: 'Fresh Tomato', unit: 'kg' },
  { id: 'prod-beer-bintang-330', name: 'Bintang Beer 330ml', unit: 'piece' },
  { id: 'prod-cola-330', name: 'Coca-Cola 330ml', unit: 'piece' },
  { id: 'prod-butter', name: 'Butter', unit: 'kg' }
])

// =============================================
// COMPUTED - Прямой доступ к composable
// =============================================

const selectedDepartment = computed(() => orderAssistant.selectedDepartment.value)
const selectedItems = computed(() => orderAssistant.selectedItems.value)
const isGenerating = computed(() => orderAssistant.isGenerating.value)
const isLoading = computed(() => orderAssistant.isLoading.value)
const filteredSuggestions = computed(() => orderAssistant.filteredSuggestions.value)
const urgentSuggestions = computed(() => orderAssistant.urgentSuggestions.value)
const requestSummary = computed(() => orderAssistant.requestSummary.value)

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
// METHODS
// =============================================

async function handleDepartmentChange() {
  try {
    await orderAssistant.changeDepartment(selectedDepartmentIndex.value)
    resetManualItem()
  } catch (error) {
    console.error('Error changing department:', error)
    emits('error', 'Failed to change department')
  }
}

function updateManualItemName() {
  const product = availableProducts.value.find(p => p.id === manualItem.value.itemId)
  if (product) {
    manualItem.value.itemName = product.name
    manualItem.value.unit = product.unit
  }
}

function addManualItem() {
  try {
    orderAssistant.addManualItem(
      manualItem.value.itemId,
      manualItem.value.itemName,
      manualItem.value.quantity,
      manualItem.value.unit,
      manualItem.value.notes || undefined
    )
    resetManualItem()
    activeTab.value = 'summary'
  } catch (error) {
    console.error('Error adding manual item:', error)
    emits('error', 'Failed to add item')
  }
}

function addSuggestionToRequest(suggestion: OrderSuggestion) {
  orderAssistant.addSuggestionToRequest(suggestion)
}

function addUrgentItems() {
  urgentSuggestions.value.forEach(suggestion => {
    if (!orderAssistant.isSuggestionAdded(suggestion.itemId)) {
      orderAssistant.addSuggestionToRequest(suggestion)
    }
  })
  activeTab.value = 'summary'
}

function removeItemFromRequest(itemId: string) {
  orderAssistant.removeItemFromRequest(itemId)
}

async function generateSuggestions() {
  try {
    await orderAssistant.generateSuggestions()
  } catch (error) {
    console.error('Error generating suggestions:', error)
    emits('error', 'Failed to generate suggestions')
  }
}

async function createRequest() {
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

function resetManualItem() {
  manualItem.value = {
    itemId: '',
    itemName: '',
    quantity: 1,
    unit: 'kg',
    notes: ''
  }
}

function closeDialog() {
  isOpen.value = false
  setTimeout(() => {
    resetForm()
  }, 300)
}

function resetForm() {
  orderAssistant.clearSelectedItems()
  resetManualItem()
  requestedBy.value = 'Chef Maria'
  priority.value = 'normal'
  activeTab.value = 'suggestions'
}

// Методы из composable
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
