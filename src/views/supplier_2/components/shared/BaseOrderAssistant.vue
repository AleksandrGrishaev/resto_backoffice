<!-- src/views/supplier_2/components/shared/BaseOrderAssistant.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="900px" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-robot" class="mr-3" size="24" />
          <div>
            <div class="text-h6 font-weight-bold">🛒 Order Assistant</div>
            <div class="text-caption opacity-90">Smart ordering suggestions</div>
          </div>
        </div>

        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Department Selection -->
        <div class="pa-4 border-b">
          <v-row align="center">
            <v-col cols="auto">
              <v-chip-group
                v-model="selectedDepartmentIndex"
                color="primary"
                variant="tonal"
                mandatory
                @update:model-value="handleDepartmentChange"
              >
                <v-chip value="kitchen" prepend-icon="mdi-chef-hat">Kitchen</v-chip>
                <v-chip value="bar" prepend-icon="mdi-glass-cocktail">Bar</v-chip>
              </v-chip-group>
            </v-col>

            <v-spacer />

            <v-col cols="auto">
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-refresh"
                :loading="isGenerating"
                @click="generateSuggestions"
              >
                Refresh Suggestions
              </v-btn>
            </v-col>
          </v-row>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="pa-6 text-center">
          <v-progress-circular indeterminate color="primary" size="64" class="mb-4" />
          <div class="text-body-1">Analyzing stock levels...</div>
        </div>

        <!-- Suggestions Section -->
        <div v-else-if="filteredSuggestions.length > 0" class="pa-4">
          <div class="d-flex align-center mb-4">
            <v-icon icon="mdi-lightbulb" color="warning" class="mr-2" />
            <h3 class="text-h6">Smart Suggestions</h3>
            <v-chip
              v-if="urgentSuggestions.length > 0"
              size="small"
              color="error"
              variant="flat"
              class="ml-2"
            >
              {{ urgentSuggestions.length }} urgent
            </v-chip>
          </div>

          <v-row>
            <v-col
              v-for="suggestion in filteredSuggestions"
              :key="suggestion.itemId"
              cols="12"
              md="6"
            >
              <v-card
                variant="outlined"
                :color="getUrgencyColor(suggestion.urgency)"
                class="suggestion-card"
                :class="{ 'suggestion-urgent': suggestion.urgency === 'high' }"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center">
                      <v-icon
                        :icon="getUrgencyIcon(suggestion.urgency)"
                        :color="getUrgencyColor(suggestion.urgency)"
                        class="mr-2"
                      />
                      <div>
                        <div class="text-subtitle-2 font-weight-bold">
                          {{ suggestion.itemName }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{
                            suggestion.reason === 'out_of_stock' ? 'Out of Stock' : 'Below Minimum'
                          }}
                        </div>
                      </div>
                    </div>

                    <v-chip
                      :color="getUrgencyColor(suggestion.urgency)"
                      size="small"
                      variant="tonal"
                    >
                      {{ suggestion.urgency.toUpperCase() }}
                    </v-chip>
                  </div>

                  <div class="mb-3">
                    <div class="text-body-2 mb-1">
                      <strong>Current:</strong>
                      {{ suggestion.currentStock }} units
                    </div>
                    <div class="text-body-2 mb-1">
                      <strong>Minimum:</strong>
                      {{ suggestion.minStock }} units
                    </div>
                    <div class="text-body-2 mb-1">
                      <strong>Estimated Price:</strong>
                      {{ formatCurrency(suggestion.estimatedPrice) }}
                    </div>
                    <div v-if="suggestion.lastPriceDate" class="text-caption text-medium-emphasis">
                      Last price: {{ formatDate(suggestion.lastPriceDate) }}
                    </div>
                  </div>

                  <div class="d-flex align-center gap-2">
                    <v-text-field
                      v-model.number="suggestion.suggestedQuantity"
                      label="Quantity"
                      type="number"
                      min="0"
                      step="0.1"
                      variant="outlined"
                      density="compact"
                      hide-details
                      style="width: 120px"
                    />

                    <v-btn
                      v-if="!isSuggestionAdded(suggestion)"
                      color="success"
                      variant="flat"
                      size="small"
                      prepend-icon="mdi-plus"
                      @click="addSuggestionToRequest(suggestion)"
                    >
                      Add
                    </v-btn>

                    <v-btn
                      v-else
                      color="grey"
                      variant="outlined"
                      size="small"
                      prepend-icon="mdi-check"
                      disabled
                    >
                      Added
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- No Suggestions -->
        <div v-else class="pa-6 text-center">
          <v-icon icon="mdi-check-circle" color="success" size="64" class="mb-4" />
          <div class="text-h6 mb-2">All Good! 👍</div>
          <div class="text-body-2 text-medium-emphasis">
            No urgent stock issues for {{ selectedDepartment }}
          </div>
        </div>

        <!-- Manual Add Section -->
        <v-divider />

        <div class="pa-4">
          <div class="d-flex align-center mb-3">
            <v-icon icon="mdi-plus-circle" color="primary" class="mr-2" />
            <h3 class="text-h6">Add Manual Item</h3>
          </div>

          <v-row align="center">
            <v-col cols="12" md="4">
              <v-select
                v-model="manualItem.itemId"
                :items="availableProducts"
                item-title="name"
                item-value="id"
                label="Select Product"
                variant="outlined"
                density="compact"
                @update:model-value="updateManualItemName"
              />
            </v-col>

            <v-col cols="6" md="2">
              <v-text-field
                v-model.number="manualItem.quantity"
                label="Quantity"
                type="number"
                min="0"
                step="0.1"
                variant="outlined"
                density="compact"
              />
            </v-col>

            <v-col cols="6" md="2">
              <v-text-field
                v-model="manualItem.unit"
                label="Unit"
                variant="outlined"
                density="compact"
                readonly
              />
            </v-col>

            <v-col cols="12" md="3">
              <v-text-field
                v-model="manualItem.notes"
                label="Notes (optional)"
                variant="outlined"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="1">
              <v-btn
                color="primary"
                variant="flat"
                icon="mdi-plus"
                :disabled="!canAddManualItem"
                @click="addManualItem"
              />
            </v-col>
          </v-row>
        </div>

        <!-- Selected Items Summary -->
        <v-divider />

        <div v-if="selectedItems.length > 0" class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="d-flex align-center">
              <v-icon icon="mdi-cart" color="success" class="mr-2" />
              <h3 class="text-h6">Request Summary</h3>
            </div>

            <v-btn
              color="grey"
              variant="text"
              size="small"
              prepend-icon="mdi-delete"
              @click="clearSelectedItems"
            >
              Clear All
            </v-btn>
          </div>

          <div class="mb-3">
            <v-chip color="primary" variant="tonal" class="mr-2">
              {{ requestSummary.totalItems }} items
            </v-chip>
            <v-chip color="success" variant="tonal">
              Est. {{ formatCurrency(requestSummary.estimatedTotal) }}
            </v-chip>
          </div>

          <div class="selected-items-list">
            <div
              v-for="item in selectedItems"
              :key="item.id"
              class="d-flex align-center justify-space-between pa-2 border rounded mb-2"
            >
              <div class="flex-grow-1">
                <div class="text-subtitle-2">{{ item.itemName }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.requestedQuantity }} {{ item.unit }}
                  <span v-if="item.notes">• {{ item.notes }}</span>
                </div>
              </div>

              <div class="d-flex align-center gap-2">
                <div class="text-body-2 text-medium-emphasis">
                  {{ formatCurrency(getEstimatedPrice(item.itemId) * item.requestedQuantity) }}
                </div>
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  color="error"
                  @click="removeItemFromRequest(item.itemId)"
                />
              </div>
            </div>
          </div>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 border-t">
        <div class="d-flex align-center flex-grow-1">
          <v-text-field
            v-model="requestedBy"
            label="Requested by"
            variant="outlined"
            density="compact"
            style="width: 200px"
            class="mr-4"
          />

          <v-select
            v-model="priority"
            :items="[
              { title: 'Normal', value: 'normal' },
              { title: 'Urgent', value: 'urgent' }
            ]"
            label="Priority"
            variant="outlined"
            density="compact"
            style="width: 120px"
          />
        </div>

        <v-spacer />

        <v-btn color="grey" variant="outlined" @click="closeDialog">Cancel</v-btn>

        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-check"
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

const {
  selectedDepartment,
  selectedItems,
  isGenerating,
  filteredSuggestions,
  urgentSuggestions,
  requestSummary,
  isLoading,
  generateSuggestions,
  addSuggestionToRequest,
  addManualItem: addManualItemToRequest,
  removeItemFromRequest,
  clearSelectedItems,
  createRequestFromItems,
  changeDepartment,
  isSuggestionAdded,
  getEstimatedPrice,
  formatCurrency,
  getUrgencyColor,
  getUrgencyIcon
} = useOrderAssistant()

// =============================================
// LOCAL STATE
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const isCreating = ref(false)
const requestedBy = ref('Chef Maria') // Default value
const priority = ref<'normal' | 'urgent'>('normal')

// Department selection state
const selectedDepartmentIndex = ref(selectedDepartment.value)

// Manual item form
const manualItem = ref({
  itemId: '',
  itemName: '',
  quantity: 1,
  unit: 'kg',
  notes: ''
})

// Mock available products (in real app, this would come from ProductsStore)
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
// COMPUTED
// =============================================

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
    await changeDepartment(selectedDepartmentIndex.value as Department)
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
    addManualItemToRequest(
      manualItem.value.itemId,
      manualItem.value.itemName,
      manualItem.value.quantity,
      manualItem.value.unit,
      manualItem.value.notes || undefined
    )
    resetManualItem()
  } catch (error) {
    console.error('Error adding manual item:', error)
    emits('error', 'Failed to add item')
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

async function createRequest() {
  if (!canCreateRequest.value) return

  try {
    isCreating.value = true

    const request = await createRequestFromItems(
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

function closeDialog() {
  isOpen.value = false

  // Reset form after animation completes
  setTimeout(() => {
    resetForm()
  }, 300)
}

function resetForm() {
  clearSelectedItems()
  resetManualItem()
  requestedBy.value = 'Chef Maria'
  priority.value = 'normal'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric'
  })
}

// =============================================
// WATCHERS
// =============================================

// Auto-generate suggestions when dialog opens
watch(isOpen, newValue => {
  if (newValue) {
    generateSuggestions()
  }
})

// Sync department selection
watch(selectedDepartment, newValue => {
  selectedDepartmentIndex.value = newValue
})
</script>

<style lang="scss" scoped>
.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.border {
  border: 1px solid rgb(var(--v-theme-surface-variant));
}

.suggestion-card {
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.suggestion-urgent {
    border-left: 4px solid rgb(var(--v-theme-error));
    animation: urgentPulse 2s infinite;
  }
}

@keyframes urgentPulse {
  0%,
  100% {
    border-left-color: rgb(var(--v-theme-error));
  }
  50% {
    border-left-color: rgb(var(--v-theme-warning));
  }
}

.selected-items-list {
  max-height: 200px;
  overflow-y: auto;
}

.gap-2 {
  gap: 8px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

// Department chip styling
.v-chip-group {
  .v-chip {
    font-weight: 500;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .suggestion-card {
    margin-bottom: 12px;
  }

  .selected-items-list {
    max-height: 150px;
  }
}
</style>
