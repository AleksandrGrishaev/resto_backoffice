<!-- src/views/supplier/components/procurement/ProcurementRequestDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900px"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>{{ existingRequest ? 'Edit' : 'Create' }} Procurement Request</h3>
          <div class="text-caption text-medium-emphasis">
            {{
              existingRequest
                ? `Editing ${existingRequest.requestNumber}`
                : 'Create a new procurement request for supplies'
            }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6" style="max-height: 700px">
        <v-form ref="form" v-model="isFormValid">
          <!-- Basic Information Section -->
          <div class="mb-6">
            <div class="d-flex align-center mb-4">
              <v-icon icon="mdi-information" color="primary" class="mr-2" />
              <h4>Basic Information</h4>
            </div>

            <v-row>
              <v-col cols="12" md="4">
                <v-select
                  v-model="formData.department"
                  :items="departmentOptions"
                  label="Department"
                  :rules="requiredRules"
                  prepend-inner-icon="mdi-store"
                  variant="outlined"
                  required
                  :disabled="!!existingRequest"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-text-field
                  v-model="formData.requestedBy"
                  label="Requested By"
                  :rules="requiredRules"
                  prepend-inner-icon="mdi-account"
                  variant="outlined"
                  required
                  placeholder="e.g., Chef Maria"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-select
                  v-model="formData.priority"
                  :items="priorityOptions"
                  label="Priority"
                  :rules="requiredRules"
                  prepend-inner-icon="mdi-flag"
                  variant="outlined"
                  required
                />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="formData.notes"
                  label="Request Notes (optional)"
                  prepend-inner-icon="mdi-note-text"
                  variant="outlined"
                  rows="2"
                  placeholder="Additional context, special requirements, delivery notes..."
                />
              </v-col>
            </v-row>
          </div>

          <!-- Items Section -->
          <div class="mb-6">
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center">
                <v-icon icon="mdi-package-variant" color="primary" class="mr-2" />
                <h4>Requested Items</h4>
                <v-chip
                  v-if="formData.items.length > 0"
                  size="small"
                  color="primary"
                  variant="tonal"
                  class="ml-2"
                >
                  {{ formData.items.length }} item{{ formData.items.length !== 1 ? 's' : '' }}
                </v-chip>
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

            <!-- Items List -->
            <div v-if="formData.items.length > 0" class="items-list">
              <v-card
                v-for="(item, index) in formData.items"
                :key="item.id || index"
                variant="outlined"
                class="mb-3"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <div class="d-flex align-center">
                      <div class="item-icon mr-3">
                        {{ getItemIcon(item.itemName) }}
                      </div>
                      <div>
                        <div class="font-weight-medium text-h6">{{ item.itemName }}</div>
                        <div class="text-caption text-medium-emphasis">
                          Current stock: {{ item.currentStock }} {{ item.unit }}
                        </div>
                      </div>
                    </div>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      color="error"
                      size="small"
                      @click="removeItem(index)"
                    >
                      <v-icon />
                      <v-tooltip activator="parent">Remove Item</v-tooltip>
                    </v-btn>
                  </div>

                  <v-row>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model.number="item.requestedQuantity"
                        type="number"
                        label="Requested Quantity"
                        :rules="quantityRules"
                        variant="outlined"
                        density="compact"
                        min="0"
                        step="0.1"
                        :suffix="item.unit"
                      />
                    </v-col>

                    <v-col cols="12" md="4">
                      <v-select
                        v-model="item.reason"
                        :items="reasonOptions"
                        label="Reason"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>

                    <v-col cols="12" md="4">
                      <div class="d-flex align-center h-100">
                        <v-chip :color="getStockStatusColor(item)" size="small" variant="flat">
                          {{ getStockStatusText(item) }}
                        </v-chip>
                        <div class="ml-2 text-caption text-medium-emphasis">
                          Need: {{ item.requestedQuantity }} {{ item.unit }}
                        </div>
                      </div>
                    </v-col>
                  </v-row>

                  <v-row v-if="item.notes || showNotesForItem === index">
                    <v-col cols="12">
                      <v-text-field
                        v-model="item.notes"
                        label="Item Notes (optional)"
                        variant="outlined"
                        density="compact"
                        placeholder="Special instructions, quality requirements..."
                        append-inner-icon="mdi-close"
                        @click:append-inner="clearItemNotes(index)"
                      />
                    </v-col>
                  </v-row>

                  <div v-if="!item.notes && showNotesForItem !== index" class="mt-2">
                    <v-btn
                      size="small"
                      variant="text"
                      color="info"
                      prepend-icon="mdi-note-plus"
                      @click="showNotesForItem = index"
                    >
                      Add Notes
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center pa-8">
              <v-icon icon="mdi-package-variant-plus" size="64" class="text-medium-emphasis mb-4" />
              <div class="text-h6 text-medium-emphasis mb-2">No Items Added</div>
              <div class="text-body-2 text-medium-emphasis mb-4">
                Add items to create a procurement request
              </div>
              <v-btn color="success" variant="flat" @click="showAddItemDialog = true">
                <v-icon icon="mdi-plus-circle" class="mr-2" />
                Add First Item
              </v-btn>
            </div>
          </div>

          <!-- Summary Section -->
          <div v-if="formData.items.length > 0" class="mb-4">
            <v-card variant="tonal" color="info">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-3">
                  <v-icon icon="mdi-clipboard-list" class="mr-2" />
                  <h4>Request Summary</h4>
                </div>

                <v-row>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Total Items</div>
                    <div class="text-h6 font-weight-bold">{{ formData.items.length }}</div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Department</div>
                    <div class="text-h6 font-weight-bold">
                      {{
                        formData.department.charAt(0).toUpperCase() + formData.department.slice(1)
                      }}
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Priority</div>
                    <div
                      class="text-h6 font-weight-bold"
                      :class="getPriorityTextColor(formData.priority)"
                    >
                      {{ formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1) }}
                    </div>
                  </v-col>
                  <v-col cols="6" md="3">
                    <div class="text-caption text-medium-emphasis">Critical Items</div>
                    <div class="text-h6 font-weight-bold text-error">
                      {{ getCriticalItemsCount() }}
                    </div>
                  </v-col>
                </v-row>

                <!-- Items breakdown by reason -->
                <div class="mt-4">
                  <div class="text-caption text-medium-emphasis mb-2">Items by Reason:</div>
                  <div class="d-flex flex-wrap gap-2">
                    <v-chip
                      v-for="(count, reason) in getItemsByReason()"
                      :key="reason"
                      :color="getReasonColor(reason)"
                      size="small"
                      variant="tonal"
                    >
                      {{ getReasonText(reason) }}: {{ count }}
                    </v-chip>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!isFormValid || formData.items.length === 0"
          @click="handleSave"
        >
          {{ existingRequest ? 'Update' : 'Create' }} Request
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Item Dialog -->
    <v-dialog v-model="showAddItemDialog" max-width="600px">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <h3>Add Item to Request</h3>
            <div class="text-caption text-medium-emphasis">
              Select a product and specify quantity needed
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showAddItemDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6">
          <v-form ref="addItemForm" v-model="isAddItemFormValid">
            <v-row>
              <v-col cols="12">
                <v-autocomplete
                  v-model="newItem.itemId"
                  :items="availableItems"
                  item-title="name"
                  item-value="id"
                  label="Select Product"
                  :rules="requiredRules"
                  prepend-inner-icon="mdi-package-variant"
                  variant="outlined"
                  clearable
                  @update:model-value="handleItemSelect"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <template #prepend>
                        <div class="item-preview-icon mr-3">
                          {{ getItemIcon(item.raw.name) }}
                        </div>
                      </template>
                      <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                      <v-list-item-subtitle>
                        Stock: {{ item.raw.currentStock }} {{ item.raw.unit }}
                        <span v-if="item.raw.minStock" class="ml-2">
                          • Min: {{ item.raw.minStock }} {{ item.raw.unit }}
                        </span>
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="newItem.requestedQuantity"
                  type="number"
                  label="Requested Quantity"
                  :rules="quantityRules"
                  variant="outlined"
                  min="0"
                  step="0.1"
                  :suffix="selectedItemUnit"
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="newItem.reason"
                  :items="reasonOptions"
                  label="Reason for Request"
                  :rules="requiredRules"
                  variant="outlined"
                />
              </v-col>

              <v-col cols="12">
                <v-text-field
                  v-model="newItem.notes"
                  label="Item Notes (optional)"
                  variant="outlined"
                  placeholder="Special requirements, quality specifications..."
                />
              </v-col>
            </v-row>

            <!-- Selected Item Preview -->
            <div v-if="selectedItemData" class="mt-4">
              <v-card variant="tonal" color="info">
                <v-card-text class="pa-4">
                  <div class="d-flex align-center mb-3">
                    <div class="item-preview-icon mr-3">
                      {{ getItemIcon(selectedItemData.name) }}
                    </div>
                    <div>
                      <div class="font-weight-medium">{{ selectedItemData.name }}</div>
                      <div class="text-caption text-medium-emphasis">
                        Current Stock: {{ selectedItemData.currentStock }}
                        {{ selectedItemData.unit }}
                      </div>
                    </div>
                  </div>

                  <div class="d-flex justify-space-between">
                    <div>
                      <div class="text-caption text-medium-emphasis">After Request</div>
                      <div class="font-weight-medium">
                        Requesting: {{ newItem.requestedQuantity || 0 }} {{ selectedItemData.unit }}
                      </div>
                    </div>
                    <div class="text-right">
                      <v-chip :color="getNewItemStockColor()" size="small" variant="flat">
                        {{ getNewItemStockStatus() }}
                      </v-chip>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn @click="showAddItemDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!isAddItemFormValid" @click="addItem">
            Add Item
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import type {
  ProcurementRequest,
  CreateProcurementRequestData,
  ProcurementRequestItem
} from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProcurementRequestDialog'

// Props
interface Props {
  modelValue: boolean
  existingRequest?: ProcurementRequest | null
}

const props = withDefaults(defineProps<Props>(), {
  existingRequest: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Store
const supplierStore = useSupplierStore()

// State
const form = ref()
const addItemForm = ref()
const isFormValid = ref(false)
const isAddItemFormValid = ref(false)
const loading = ref(false)
const showAddItemDialog = ref(false)
const showNotesForItem = ref<number | null>(null)

const formData = ref<CreateProcurementRequestData>({
  department: 'kitchen',
  requestedBy: '',
  items: [],
  priority: 'normal',
  notes: ''
})

const newItem = ref({
  itemId: '',
  requestedQuantity: 1,
  reason: 'low_stock',
  notes: ''
})

// Mock available items (in real app, this would come from ProductStore)
const availableItems = ref([
  { id: 'prod-beef-steak', name: 'Beef Steak', unit: 'kg', currentStock: 2.5, minStock: 2 },
  { id: 'prod-potato', name: 'Potato', unit: 'kg', currentStock: 15, minStock: 10 },
  { id: 'prod-tomato', name: 'Tomato', unit: 'kg', currentStock: 8, minStock: 5 },
  { id: 'prod-garlic', name: 'Garlic', unit: 'kg', currentStock: 0.3, minStock: 0.5 },
  { id: 'prod-onion', name: 'Onion', unit: 'kg', currentStock: 12, minStock: 8 },
  { id: 'prod-salt', name: 'Salt', unit: 'kg', currentStock: 2, minStock: 1 },
  { id: 'prod-black-pepper', name: 'Black Pepper', unit: 'kg', currentStock: 0.5, minStock: 0.3 },
  {
    id: 'prod-beer-bintang-330',
    name: 'Bintang Beer 330ml',
    unit: 'piece',
    currentStock: 24,
    minStock: 48
  },
  { id: 'prod-cola-330', name: 'Coca-Cola 330ml', unit: 'piece', currentStock: 36, minStock: 24 },
  { id: 'prod-water-500', name: 'Water 500ml', unit: 'piece', currentStock: 120, minStock: 100 }
])

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

const reasonOptions = [
  { title: 'Low Stock', value: 'low_stock' },
  { title: 'Out of Stock', value: 'out_of_stock' },
  { title: 'Upcoming Menu', value: 'upcoming_menu' },
  { title: 'Bulk Discount', value: 'bulk_discount' },
  { title: 'Other', value: 'other' }
]

// Validation Rules
const requiredRules = [(v: any) => !!v || 'This field is required']
const quantityRules = [
  (v: number) => !!v || 'Quantity is required',
  (v: number) => v > 0 || 'Quantity must be greater than 0'
]

// Computed
const selectedItemData = computed(() => {
  if (!newItem.value.itemId) return null
  return availableItems.value.find(item => item.id === newItem.value.itemId)
})

const selectedItemUnit = computed(() => selectedItemData.value?.unit || '')

// Methods

function clearItemNotes(index: number) {
  formData.value.items[index].notes = ''
  showNotesForItem.value = null
}

function getItemIcon(itemName: string): string {
  const icons: Record<string, string> = {
    beef: '🥩',
    steak: '🥩',
    meat: '🥩',
    potato: '🥔',
    tomato: '🍅',
    garlic: '🧄',
    onion: '🧅',
    salt: '🧂',
    pepper: '🌶️',
    spice: '🌿',
    beer: '🍺',
    cola: '🥤',
    water: '💧',
    drink: '🥤'
  }

  const lowerName = itemName.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerName.includes(key)) return icon
  }
  return '📦'
}

function getStockStatusColor(item: ProcurementRequestItem): string {
  if (item.currentStock <= 0) return 'error'
  if (item.reason === 'out_of_stock') return 'error'
  if (item.reason === 'low_stock') return 'warning'
  return 'info'
}

function getStockStatusText(item: ProcurementRequestItem): string {
  if (item.currentStock <= 0) return 'Out of Stock'
  if (item.reason === 'out_of_stock') return 'Critical'
  if (item.reason === 'low_stock') return 'Low Stock'
  return 'In Stock'
}

function getPriorityTextColor(priority: string): string {
  const colors = {
    low: 'text-success',
    normal: 'text-primary',
    urgent: 'text-error'
  }
  return colors[priority as keyof typeof colors] || 'text-primary'
}

function getCriticalItemsCount(): number {
  return formData.value.items.filter(
    item => item.reason === 'out_of_stock' || item.currentStock <= 0
  ).length
}

function getItemsByReason(): Record<string, number> {
  return formData.value.items.reduce(
    (acc, item) => {
      acc[item.reason] = (acc[item.reason] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
}

function getReasonColor(reason: string): string {
  const colors = {
    low_stock: 'warning',
    out_of_stock: 'error',
    upcoming_menu: 'info',
    bulk_discount: 'success',
    other: 'default'
  }
  return colors[reason as keyof typeof colors] || 'default'
}

function getReasonText(reason: string): string {
  const texts = {
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
    upcoming_menu: 'Menu Planning',
    bulk_discount: 'Bulk Order',
    other: 'Other'
  }
  return texts[reason as keyof typeof texts] || reason
}

function getNewItemStockColor(): string {
  if (!selectedItemData.value || !newItem.value.requestedQuantity) return 'default'

  const currentStock = selectedItemData.value.currentStock
  if (currentStock <= 0) return 'error'
  if (newItem.value.requestedQuantity > currentStock * 2) return 'warning'
  return 'success'
}

function getNewItemStockStatus(): string {
  if (!selectedItemData.value || !newItem.value.requestedQuantity) return 'Unknown'

  const currentStock = selectedItemData.value.currentStock
  const requestedQty = newItem.value.requestedQuantity

  if (currentStock <= 0) return 'Critical Need'
  if (requestedQty > currentStock * 2) return 'Large Order'
  if (requestedQty > currentStock) return 'Restocking'
  return 'Normal Order'
}

// Item Management
function handleItemSelect() {
  const item = availableItems.value.find(i => i.id === newItem.value.itemId)
  if (item) {
    // Auto-suggest quantity based on current stock and min stock
    const suggestedQty = Math.max(1, (item.minStock || item.currentStock) - item.currentStock)
    newItem.value.requestedQuantity =
      suggestedQty > 0 ? suggestedQty : Math.ceil(item.currentStock * 0.5)

    // Auto-suggest reason based on stock level
    if (item.currentStock <= 0) {
      newItem.value.reason = 'out_of_stock'
    } else if (item.minStock && item.currentStock < item.minStock) {
      newItem.value.reason = 'low_stock'
    }
  }
}

function addItem() {
  if (!isAddItemFormValid.value || !selectedItemData.value) return

  // Check if item already exists
  const existingIndex = formData.value.items.findIndex(i => i.itemId === newItem.value.itemId)
  if (existingIndex !== -1) {
    // Update existing item
    formData.value.items[existingIndex] = {
      ...formData.value.items[existingIndex],
      requestedQuantity: newItem.value.requestedQuantity,
      reason: newItem.value.reason as any,
      notes: newItem.value.notes
    }
  } else {
    // Add new item
    formData.value.items.push({
      id: `item-${Date.now()}`,
      itemId: newItem.value.itemId,
      itemName: selectedItemData.value.name,
      currentStock: selectedItemData.value.currentStock,
      requestedQuantity: newItem.value.requestedQuantity,
      unit: selectedItemData.value.unit,
      reason: newItem.value.reason as any,
      notes: newItem.value.notes
    })
  }

  // Reset form
  newItem.value = {
    itemId: '',
    requestedQuantity: 1,
    reason: 'low_stock',
    notes: ''
  }
  showAddItemDialog.value = false

  DebugUtils.info(MODULE_NAME, 'Item added to request', {
    itemId: selectedItemData.value.id,
    itemName: selectedItemData.value.name
  })
}

function removeItem(index: number) {
  const item = formData.value.items[index]
  formData.value.items.splice(index, 1)

  DebugUtils.info(MODULE_NAME, 'Item removed from request', {
    itemId: item.itemId,
    itemName: item.itemName
  })
}

// Form Management
function loadExistingRequest() {
  if (props.existingRequest) {
    DebugUtils.info(MODULE_NAME, 'Loading existing request', {
      requestId: props.existingRequest.id,
      requestNumber: props.existingRequest.requestNumber
    })

    formData.value = {
      department: props.existingRequest.department,
      requestedBy: props.existingRequest.requestedBy,
      items: [...props.existingRequest.items],
      priority: props.existingRequest.priority,
      notes: props.existingRequest.notes || ''
    }
  }
}

function resetForm() {
  DebugUtils.info(MODULE_NAME, 'Resetting form')

  formData.value = {
    department: 'kitchen',
    requestedBy: '',
    items: [],
    priority: 'normal',
    notes: ''
  }

  newItem.value = {
    itemId: '',
    requestedQuantity: 1,
    reason: 'low_stock',
    notes: ''
  }

  showNotesForItem.value = null

  if (form.value) {
    form.value.resetValidation()
  }
}

async function handleSave() {
  if (!isFormValid.value || formData.value.items.length === 0) {
    DebugUtils.warn(MODULE_NAME, 'Form validation failed')
    return
  }

  try {
    loading.value = true

    DebugUtils.info(MODULE_NAME, 'Saving procurement request', {
      isEdit: !!props.existingRequest,
      department: formData.value.department,
      itemCount: formData.value.items.length
    })

    if (props.existingRequest) {
      await supplierStore.updateProcurementRequest(props.existingRequest.id, formData.value)
      emit('success', `Request "${props.existingRequest.requestNumber}" updated successfully`)

      DebugUtils.info(MODULE_NAME, 'Request updated successfully', {
        requestId: props.existingRequest.id
      })
    } else {
      const request = await supplierStore.createProcurementRequest(formData.value)
      emit('success', `Request "${request.requestNumber}" created successfully`)

      DebugUtils.info(MODULE_NAME, 'Request created successfully', {
        requestId: request.id,
        requestNumber: request.requestNumber
      })
    }

    handleClose()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save procurement request'
    DebugUtils.error(MODULE_NAME, 'Failed to save request', { error })
    emit('error', message)
  } finally {
    loading.value = false
  }
}

function handleClose() {
  DebugUtils.info(MODULE_NAME, 'Closing dialog')
  resetForm()
  showAddItemDialog.value = false
  emit('update:modelValue', false)
}

// Watch for dialog open
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      DebugUtils.info(MODULE_NAME, 'Dialog opened', {
        isEdit: !!props.existingRequest,
        requestId: props.existingRequest?.id
      })

      if (props.existingRequest) {
        loadExistingRequest()
      } else {
        resetForm()
      }
    }
  }
)

// Watch for existing request changes
watch(
  () => props.existingRequest,
  newRequest => {
    if (newRequest && props.modelValue) {
      loadExistingRequest()
    }
  }
)
</script>

<style lang="scss" scoped>
.procurement-request-dialog {
  .gap-2 {
    gap: 8px;
  }

  .item-icon,
  .item-preview-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 6px;
    flex-shrink: 0;
  }

  .items-list {
    max-height: 400px;
    overflow-y: auto;
  }
}

:deep(.v-field__input) {
  --v-field-padding-start: 16px;
}

:deep(.v-selection-control) {
  justify-content: flex-start;
}

:deep(.v-autocomplete) {
  .v-list-item {
    .v-list-item-title {
      font-weight: 500;
    }

    .v-list-item-subtitle {
      font-size: 0.75rem;
      opacity: 0.7;
    }
  }
}
</style>
