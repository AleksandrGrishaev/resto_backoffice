<!-- src/views/supplier/components/procurement/OrderAssistantDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1000px"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>🛒 Order Assistant</h3>
          <div class="text-caption text-medium-emphasis">
            Smart ordering suggestions based on current stock levels and consumption patterns
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <!-- Department Selection & Basic Info -->
      <v-card-text class="pa-4 pb-0">
        <v-row align="center">
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedDepartment"
              :items="departmentOptions"
              label="Department"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-store"
              @update:model-value="handleDepartmentChange"
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-text-field
              v-model="requestedBy"
              label="Requested By"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-account"
              placeholder="e.g., Chef Maria"
            />
          </v-col>

          <v-col cols="12" md="4">
            <v-select
              v-model="priority"
              :items="priorityOptions"
              label="Priority"
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-flag"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <!-- Loading State -->
      <div v-if="loadingSuggestions" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" size="64" class="mb-4" />
        <div class="text-h6 mb-2">Analyzing Stock Levels</div>
        <div class="text-body-2 text-medium-emphasis">
          Checking {{ selectedDepartment }} inventory for ordering suggestions...
        </div>
      </div>

      <!-- Main Content -->
      <v-card-text v-else class="pa-4" style="max-height: 600px">
        <!-- Suggestions Section -->
        <div v-if="suggestions.length > 0" class="mb-6">
          <div class="d-flex align-center mb-3">
            <v-icon icon="mdi-lightbulb" color="warning" class="mr-2" />
            <h4>Smart Suggestions</h4>
            <v-chip size="small" color="warning" variant="tonal" class="ml-2">
              {{ suggestions.length }} item{{ suggestions.length !== 1 ? 's' : '' }}
            </v-chip>
          </div>

          <v-row>
            <v-col
              v-for="suggestion in suggestions"
              :key="suggestion.itemId"
              cols="12"
              md="6"
              lg="4"
            >
              <v-card
                variant="outlined"
                :color="getUrgencyColor(suggestion.urgency)"
                class="suggestion-card"
                :class="{ selected: isItemSelected(suggestion.itemId) }"
                @click="toggleSuggestion(suggestion)"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="font-weight-medium">{{ suggestion.itemName }}</div>
                    <v-checkbox
                      :model-value="isItemSelected(suggestion.itemId)"
                      hide-details
                      density="compact"
                      color="primary"
                      @click.stop
                      @update:model-value="checked => toggleSuggestionCheck(suggestion, checked)"
                    />
                  </div>

                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="text-caption text-medium-emphasis">Current Stock</div>
                    <div class="font-weight-medium" :class="getStockColor(suggestion)">
                      {{ suggestion.currentStock }} / {{ suggestion.minStock }} min
                    </div>
                  </div>

                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="text-caption text-medium-emphasis">Suggested Order</div>
                    <div class="font-weight-bold text-primary">
                      {{ suggestion.suggestedQuantity }} units
                    </div>
                  </div>

                  <v-chip
                    :color="getReasonColor(suggestion.reason)"
                    size="x-small"
                    variant="flat"
                    class="mr-1"
                  >
                    {{ getReasonText(suggestion.reason) }}
                  </v-chip>

                  <v-chip
                    :color="getUrgencyColor(suggestion.urgency)"
                    size="x-small"
                    variant="outlined"
                  >
                    {{ suggestion.urgency.toUpperCase() }}
                  </v-chip>

                  <!-- Quick Quantity Adjustment -->
                  <div v-if="isItemSelected(suggestion.itemId)" class="mt-3">
                    <v-text-field
                      :model-value="getSelectedQuantity(suggestion.itemId)"
                      type="number"
                      label="Order Quantity"
                      variant="outlined"
                      density="compact"
                      hide-details
                      min="0"
                      step="1"
                      @update:model-value="
                        value => updateQuantity(suggestion.itemId, Number(value))
                      "
                    />
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Manual Add Section -->
        <div class="mb-6">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="d-flex align-center">
              <v-icon icon="mdi-plus-circle" color="success" class="mr-2" />
              <h4>Manual Add Items</h4>
            </div>
            <v-btn
              color="success"
              variant="outlined"
              size="small"
              prepend-icon="mdi-plus"
              @click="showAddItemDialog = true"
            >
              Add Item
            </v-btn>
          </div>

          <!-- Manual Items List -->
          <div v-if="manualItems.length > 0" class="manual-items-list">
            <v-card v-for="item in manualItems" :key="item.itemId" variant="outlined" class="mb-2">
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <div class="mr-3">
                      <div class="font-weight-medium">{{ item.itemName }}</div>
                      <div class="text-caption text-medium-emphasis">
                        Current: {{ item.currentStock }} • Requesting: {{ item.requestedQuantity }}
                        {{ item.unit }}
                      </div>
                    </div>
                  </div>

                  <div class="d-flex align-center gap-2">
                    <v-text-field
                      :model-value="item.requestedQuantity"
                      type="number"
                      variant="outlined"
                      density="compact"
                      hide-details
                      style="width: 100px"
                      min="0"
                      @update:model-value="
                        value => updateManualItemQuantity(item.itemId, Number(value))
                      "
                    />
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      size="small"
                      @click="removeManualItem(item.itemId)"
                    />
                  </div>
                </div>

                <div v-if="item.notes" class="mt-2">
                  <v-text-field
                    :model-value="item.notes"
                    label="Notes (optional)"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @update:model-value="value => updateManualItemNotes(item.itemId, value)"
                  />
                </div>
              </v-card-text>
            </v-card>
          </div>

          <div v-else class="text-center pa-6 text-medium-emphasis">
            <v-icon icon="mdi-package-variant-plus" size="48" class="mb-2" />
            <div>No manual items added</div>
            <div class="text-caption">Click "Add Item" to manually add products to the request</div>
          </div>
        </div>

        <!-- Summary Section -->
        <div v-if="hasItems" class="mb-4">
          <v-card variant="tonal" color="info">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-3">
                <v-icon icon="mdi-clipboard-list" class="mr-2" />
                <h4>Order Summary</h4>
              </div>

              <v-row>
                <v-col cols="6" md="3">
                  <div class="text-caption text-medium-emphasis">Total Items</div>
                  <div class="text-h6 font-weight-bold">{{ totalItems }}</div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="text-caption text-medium-emphasis">Suggestions</div>
                  <div class="text-h6 font-weight-bold">{{ selectedSuggestions.length }}</div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="text-caption text-medium-emphasis">Manual Items</div>
                  <div class="text-h6 font-weight-bold">{{ manualItems.length }}</div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="text-caption text-medium-emphasis">Urgency</div>
                  <div class="text-h6 font-weight-bold text-error">
                    {{ urgentItemsCount }} urgent
                  </div>
                </v-col>
              </v-row>

              <div class="mt-3">
                <v-text-field
                  v-model="notes"
                  label="Request Notes (optional)"
                  variant="outlined"
                  density="compact"
                  placeholder="Additional notes for this procurement request..."
                />
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center pa-8">
          <v-icon icon="mdi-clipboard-list-outline" size="64" class="text-medium-emphasis mb-4" />
          <div class="text-h6 text-medium-emphasis mb-2">No Items to Order</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            {{ selectedDepartment.charAt(0).toUpperCase() + selectedDepartment.slice(1) }} stock
            levels look good! Add items manually if needed.
          </div>
          <v-btn color="success" variant="outlined" @click="showAddItemDialog = true">
            <v-icon icon="mdi-plus-circle" class="mr-2" />
            Add Manual Item
          </v-btn>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="creating"
          :disabled="!hasItems || !requestedBy"
          @click="handleCreateRequest"
        >
          Create Procurement Request
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Item Dialog -->
    <v-dialog v-model="showAddItemDialog" max-width="500px">
      <v-card>
        <v-card-title>Add Manual Item</v-card-title>
        <v-card-text>
          <v-form ref="addItemForm" v-model="isAddItemFormValid">
            <v-autocomplete
              v-model="newItem.itemId"
              :items="availableItems"
              item-title="name"
              item-value="id"
              label="Select Product"
              variant="outlined"
              :rules="[v => !!v || 'Product is required']"
              @update:model-value="handleItemSelect"
            />

            <v-text-field
              v-model.number="newItem.requestedQuantity"
              type="number"
              label="Quantity"
              variant="outlined"
              min="0"
              step="1"
              :rules="[v => v > 0 || 'Quantity must be greater than 0']"
            />

            <v-text-field
              v-model="newItem.notes"
              label="Notes (optional)"
              variant="outlined"
              placeholder="Reason for ordering, special instructions..."
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showAddItemDialog = false">Cancel</v-btn>
          <v-btn color="primary" :disabled="!isAddItemFormValid" @click="addManualItem">
            Add Item
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import type {
  OrderSuggestion,
  CreateProcurementRequestData,
  ProcurementRequestItem
} from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'OrderAssistantDialog'

// Props
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Store
const supplierStore = useSupplierStore()

// State
const selectedDepartment = ref<'kitchen' | 'bar'>('kitchen')
const requestedBy = ref('')
const priority = ref<'low' | 'normal' | 'urgent'>('normal')
const notes = ref('')
const loadingSuggestions = ref(false)
const creating = ref(false)

const suggestions = ref<OrderSuggestion[]>([])
const selectedSuggestions = ref<Map<string, number>>(new Map())
const manualItems = ref<ProcurementRequestItem[]>([])

// Add Item Dialog
const showAddItemDialog = ref(false)
const addItemForm = ref()
const isAddItemFormValid = ref(false)
const newItem = ref({
  itemId: '',
  requestedQuantity: 1,
  notes: ''
})

// Options
const departmentOptions = [
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const priorityOptions = [
  { title: 'Low Priority', value: 'low' },
  { title: 'Normal Priority', value: 'normal' },
  { title: 'Urgent', value: 'urgent' }
]

// Mock available items (in real app, this would come from ProductStore)
const availableItems = ref([
  { id: 'prod-beef-steak', name: 'Beef Steak', unit: 'kg', currentStock: 2.5 },
  { id: 'prod-potato', name: 'Potato', unit: 'kg', currentStock: 15 },
  { id: 'prod-tomato', name: 'Tomato', unit: 'kg', currentStock: 8 },
  { id: 'prod-garlic', name: 'Garlic', unit: 'kg', currentStock: 0.3 },
  { id: 'prod-beer-bintang-330', name: 'Bintang Beer 330ml', unit: 'piece', currentStock: 24 },
  { id: 'prod-cola-330', name: 'Coca-Cola 330ml', unit: 'piece', currentStock: 36 }
])

// Computed
const hasItems = computed(() => selectedSuggestions.value.size > 0 || manualItems.value.length > 0)

const totalItems = computed(() => selectedSuggestions.value.size + manualItems.value.length)

const urgentItemsCount = computed(
  () =>
    suggestions.value.filter(s => s.urgency === 'high' && selectedSuggestions.value.has(s.itemId))
      .length
)

// Methods
function getUrgencyColor(urgency: string): string {
  const colors = {
    low: 'success',
    medium: 'warning',
    high: 'error'
  }
  return colors[urgency as keyof typeof colors] || 'info'
}

function getStockColor(suggestion: OrderSuggestion): string {
  if (suggestion.currentStock <= 0) return 'text-error'
  if (suggestion.currentStock < suggestion.minStock) return 'text-warning'
  return 'text-success'
}

function getReasonColor(reason: string): string {
  const colors = {
    below_minimum: 'warning',
    out_of_stock: 'error',
    expiring_soon: 'orange'
  }
  return colors[reason as keyof typeof colors] || 'info'
}

function getReasonText(reason: string): string {
  const texts = {
    below_minimum: 'Low Stock',
    out_of_stock: 'Out of Stock',
    expiring_soon: 'Expiring Soon'
  }
  return texts[reason as keyof typeof texts] || reason
}

function isItemSelected(itemId: string): boolean {
  return selectedSuggestions.value.has(itemId)
}

function getSelectedQuantity(itemId: string): number {
  return selectedSuggestions.value.get(itemId) || 0
}

function toggleSuggestion(suggestion: OrderSuggestion) {
  if (selectedSuggestions.value.has(suggestion.itemId)) {
    selectedSuggestions.value.delete(suggestion.itemId)
  } else {
    selectedSuggestions.value.set(suggestion.itemId, suggestion.suggestedQuantity)
  }
}

function toggleSuggestionCheck(suggestion: OrderSuggestion, checked: boolean) {
  if (checked) {
    selectedSuggestions.value.set(suggestion.itemId, suggestion.suggestedQuantity)
  } else {
    selectedSuggestions.value.delete(suggestion.itemId)
  }
}

function updateQuantity(itemId: string, quantity: number) {
  if (quantity > 0) {
    selectedSuggestions.value.set(itemId, quantity)
  } else {
    selectedSuggestions.value.delete(itemId)
  }
}

// Manual Items
function handleItemSelect() {
  const item = availableItems.value.find(i => i.id === newItem.value.itemId)
  if (item) {
    // Auto-suggest reasonable quantity based on current stock
    newItem.value.requestedQuantity = Math.max(1, Math.ceil(item.currentStock * 0.5))
  }
}

function addManualItem() {
  if (!isAddItemFormValid.value) return

  const item = availableItems.value.find(i => i.id === newItem.value.itemId)
  if (!item) return

  // Check if item already exists
  const existingIndex = manualItems.value.findIndex(i => i.itemId === newItem.value.itemId)
  if (existingIndex !== -1) {
    // Update existing item
    manualItems.value[existingIndex] = {
      ...manualItems.value[existingIndex],
      requestedQuantity: newItem.value.requestedQuantity,
      notes: newItem.value.notes
    }
  } else {
    // Add new item
    manualItems.value.push({
      id: `manual-${Date.now()}`,
      itemId: newItem.value.itemId,
      itemName: item.name,
      currentStock: item.currentStock,
      requestedQuantity: newItem.value.requestedQuantity,
      unit: item.unit,
      reason: 'other',
      notes: newItem.value.notes
    })
  }

  // Reset form
  newItem.value = {
    itemId: '',
    requestedQuantity: 1,
    notes: ''
  }
  showAddItemDialog.value = false

  DebugUtils.info(MODULE_NAME, 'Manual item added', { itemId: item.id, name: item.name })
}

function removeManualItem(itemId: string) {
  const index = manualItems.value.findIndex(i => i.itemId === itemId)
  if (index !== -1) {
    manualItems.value.splice(index, 1)
    DebugUtils.info(MODULE_NAME, 'Manual item removed', { itemId })
  }
}

function updateManualItemQuantity(itemId: string, quantity: number) {
  const item = manualItems.value.find(i => i.itemId === itemId)
  if (item && quantity > 0) {
    item.requestedQuantity = quantity
  }
}

function updateManualItemNotes(itemId: string, notes: string) {
  const item = manualItems.value.find(i => i.itemId === itemId)
  if (item) {
    item.notes = notes
  }
}

// Department change
async function handleDepartmentChange() {
  await loadSuggestions()
}

async function loadSuggestions() {
  try {
    loadingSuggestions.value = true

    DebugUtils.info(MODULE_NAME, 'Loading suggestions', { department: selectedDepartment.value })

    const orderSuggestions = await supplierStore.getOrderSuggestions(selectedDepartment.value)
    suggestions.value = orderSuggestions

    // Clear previous selections when department changes
    selectedSuggestions.value.clear()

    DebugUtils.info(MODULE_NAME, 'Suggestions loaded', {
      count: orderSuggestions.length,
      department: selectedDepartment.value
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load suggestions', { error })
    emit('error', 'Failed to load ordering suggestions')
  } finally {
    loadingSuggestions.value = false
  }
}

async function handleCreateRequest() {
  if (!hasItems.value || !requestedBy.value) {
    DebugUtils.warn(MODULE_NAME, 'Cannot create request - missing required data')
    return
  }

  try {
    creating.value = true

    // Combine suggestions and manual items
    const items: Omit<ProcurementRequestItem, 'id'>[] = []

    // Add selected suggestions
    for (const [itemId, quantity] of selectedSuggestions.value) {
      const suggestion = suggestions.value.find(s => s.itemId === itemId)
      if (suggestion) {
        items.push({
          itemId: suggestion.itemId,
          itemName: suggestion.itemName,
          currentStock: suggestion.currentStock,
          requestedQuantity: quantity,
          unit: 'kg', // TODO: Get from product data
          reason:
            suggestion.reason === 'below_minimum'
              ? 'low_stock'
              : suggestion.reason === 'out_of_stock'
                ? 'out_of_stock'
                : 'other',
          notes: `Suggested by Order Assistant - ${getReasonText(suggestion.reason)}`
        })
      }
    }

    // Add manual items
    for (const item of manualItems.value) {
      items.push({
        itemId: item.itemId,
        itemName: item.itemName,
        currentStock: item.currentStock,
        requestedQuantity: item.requestedQuantity,
        unit: item.unit,
        reason: 'other',
        notes: item.notes
      })
    }

    const requestData: CreateProcurementRequestData = {
      department: selectedDepartment.value,
      requestedBy: requestedBy.value,
      items,
      priority: priority.value,
      notes: notes.value
    }

    DebugUtils.info(MODULE_NAME, 'Creating procurement request', {
      department: selectedDepartment.value,
      itemCount: items.length,
      priority: priority.value
    })

    await supplierStore.createProcurementRequest(requestData)

    emit('success', `Procurement request created with ${items.length} items`)
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create procurement request', { error })
    emit('error', error instanceof Error ? error.message : 'Failed to create procurement request')
  } finally {
    creating.value = false
  }
}

function handleClose() {
  // Reset all data
  selectedDepartment.value = 'kitchen'
  requestedBy.value = ''
  priority.value = 'normal'
  notes.value = ''
  suggestions.value = []
  selectedSuggestions.value.clear()
  manualItems.value = []
  showAddItemDialog.value = false

  emit('update:modelValue', false)

  DebugUtils.info(MODULE_NAME, 'Dialog closed and reset')
}

// Watch for dialog open
watch(
  () => props.modelValue,
  async isOpen => {
    if (isOpen) {
      DebugUtils.info(MODULE_NAME, 'Order Assistant dialog opened')
      await loadSuggestions()
    }
  }
)

onMounted(() => {
  DebugUtils.info(MODULE_NAME, 'OrderAssistantDialog mounted')
})
</script>

<style lang="scss" scoped>
.suggestion-card {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &.selected {
    border: 2px solid rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.05);
  }
}

.manual-items-list {
  max-height: 300px;
  overflow-y: auto;
}

:deep(.v-field__input) {
  --v-field-padding-start: 16px;
}

.gap-2 {
  gap: 8px;
}
</style>
