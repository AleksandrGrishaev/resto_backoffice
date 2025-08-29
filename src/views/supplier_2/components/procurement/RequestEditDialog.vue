<!-- src/views/supplier_2/components/procurement/RequestEditDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="900px" scrollable persistent>
    <v-card v-if="editableRequest">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-3 bg-primary">
        <div>
          <div class="text-h6 font-weight-bold text-white">Edit Request</div>
          <div class="text-caption text-white" style="opacity: 0.9">
            {{ editableRequest.requestNumber }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="cancelEdit" />
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Basic Info Section -->
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-1 pa-3 bg-surface">Basic Information</v-card-title>
          <v-card-text class="pa-3">
            <v-row>
              <!-- Department -->
              <v-col cols="12" md="4">
                <v-select
                  v-model="editableRequest.department"
                  :items="departmentOptions"
                  label="Department"
                  :disabled="!canEditBasicInfo"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <!-- Priority -->
              <v-col cols="12" md="4">
                <v-select
                  v-model="editableRequest.priority"
                  :items="priorityOptions"
                  label="Priority"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <!-- Requested By -->
              <v-col cols="12" md="4">
                <v-text-field
                  v-model="editableRequest.requestedBy"
                  label="Requested By"
                  :disabled="!canEditBasicInfo"
                  :rules="[rules.required]"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>

              <!-- Notes -->
              <v-col cols="12">
                <v-textarea
                  v-model="editableRequest.notes"
                  label="Notes (Optional)"
                  rows="2"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Items Section -->
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center justify-space-between pa-3 bg-surface">
            <span class="text-subtitle-1">Items ({{ editableRequest.items.length }})</span>
            <v-btn
              v-if="canEditItems"
              color="primary"
              size="small"
              prepend-icon="mdi-plus"
              @click="addNewItem"
            >
              Add Item
            </v-btn>
          </v-card-title>

          <v-card-text class="pa-0">
            <!-- Items Table -->
            <v-table density="compact">
              <thead>
                <tr>
                  <th style="width: 250px">Item</th>
                  <th style="width: 120px" class="text-center">Quantity</th>
                  <th style="width: 80px" class="text-center">Unit</th>
                  <th style="width: 120px" class="text-right">Est. Price</th>
                  <th style="width: 120px" class="text-right">Total</th>
                  <th v-if="canEditItems" style="width: 60px" class="text-center">Actions</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in editableRequest.items" :key="item.id">
                  <!-- Item Name -->
                  <td>
                    <div class="d-flex align-center">
                      <div>
                        <div class="text-body-2 font-weight-medium">{{ item.itemName }}</div>
                        <div class="text-caption text-medium-emphasis">{{ item.itemId }}</div>
                      </div>
                      <v-chip
                        v-if="isItemOrdered(item)"
                        size="x-small"
                        color="warning"
                        class="ml-2"
                      >
                        Ordered
                      </v-chip>
                    </div>
                  </td>

                  <!-- Quantity -->
                  <td class="text-center">
                    <v-text-field
                      v-if="canEditItems && !isItemOrdered(item)"
                      v-model.number="item.requestedQuantity"
                      type="number"
                      min="0"
                      step="1"
                      density="compact"
                      variant="outlined"
                      hide-details
                      style="width: 100px"
                      @input="validateQuantity(item)"
                    />
                    <span v-else class="font-weight-medium">
                      {{ item.requestedQuantity }}
                    </span>
                  </td>

                  <!-- Unit -->
                  <td class="text-center">
                    <span class="text-body-2">{{ item.unit }}</span>
                  </td>

                  <!-- Estimated Price -->
                  <td class="text-right">
                    <div class="text-body-2">
                      {{ formatCurrency(getEstimatedPrice(item.itemId)) }}
                    </div>
                  </td>

                  <!-- Line Total -->
                  <td class="text-right">
                    <div class="text-body-2 font-weight-medium">
                      {{ formatCurrency(item.requestedQuantity * getEstimatedPrice(item.itemId)) }}
                    </div>
                  </td>

                  <!-- Actions -->
                  <td v-if="canEditItems" class="text-center">
                    <v-btn
                      v-if="!isItemOrdered(item)"
                      icon
                      size="small"
                      variant="text"
                      color="error"
                      @click="removeItem(index)"
                    >
                      <v-icon size="18">mdi-delete</v-icon>
                    </v-btn>
                  </td>

                  <!-- Notes -->
                  <td>
                    <v-text-field
                      v-if="canEditItems"
                      v-model="item.notes"
                      placeholder="Optional notes"
                      density="compact"
                      variant="outlined"
                      hide-details
                    />
                    <span v-else class="text-body-2">{{ item.notes || '-' }}</span>
                  </td>
                </tr>

                <!-- No items row -->
                <tr v-if="editableRequest.items.length === 0">
                  <td colspan="7" class="text-center pa-4">
                    <div class="text-medium-emphasis">
                      No items added yet
                      <v-btn
                        v-if="canEditItems"
                        color="primary"
                        size="small"
                        class="ml-2"
                        @click="addNewItem"
                      >
                        Add First Item
                      </v-btn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <!-- Summary -->
            <div v-if="editableRequest.items.length > 0" class="pa-3 border-t">
              <div class="d-flex justify-end">
                <div class="text-subtitle-2 font-weight-bold">
                  Total: {{ formatCurrency(calculateTotalEstimate()) }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Warning Messages -->
        <v-alert
          v-if="originalRequest?.status === 'submitted' && hasOrderedItems"
          type="warning"
          variant="tonal"
          class="mt-4"
        >
          <template #title>Limited Editing</template>
          Some items in this request have already been ordered and cannot be modified. You can still
          update priority, notes, and add new items.
        </v-alert>

        <v-alert v-if="hasValidationErrors" type="error" variant="tonal" class="mt-4">
          <template #title>Validation Errors</template>
          Please fix the validation errors before saving.
        </v-alert>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <div class="d-flex align-center">
          <v-chip :color="getStatusColor(originalRequest?.status)" size="small" variant="tonal">
            {{ originalRequest?.status?.toUpperCase() }}
          </v-chip>
        </div>

        <v-spacer />

        <v-btn color="grey" variant="outlined" @click="cancelEdit">Cancel</v-btn>

        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="!canSave"
          @click="saveRequest"
        >
          Save Changes
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Item Dialog -->
    <add-item-dialog
      v-model="showAddItemDialog"
      :department="editableRequest?.department"
      @item-added="handleItemAdded"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ProcurementRequest, RequestItem, PurchaseOrder } from '@/stores/supplier_2/types'
import AddItemDialog from './AddItemDialog.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  request: ProcurementRequest | null
  orders?: PurchaseOrder[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save-request', request: ProcurementRequest): void
}

const props = withDefaults(defineProps<Props>(), {
  orders: () => []
})

const emits = defineEmits<Emits>()

// =============================================
// LOCAL STATE
// =============================================

const originalRequest = ref<ProcurementRequest | null>(null)
const editableRequest = ref<ProcurementRequest | null>(null)
const saving = ref(false)
const showAddItemDialog = ref(false)

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

// Определяем что можно редактировать в зависимости от статуса
const canEditBasicInfo = computed(() => {
  return originalRequest.value?.status === 'draft'
})

const canEditItems = computed(() => {
  return originalRequest.value?.status === 'draft' || originalRequest.value?.status === 'submitted'
})

// Проверяем есть ли уже заказанные товары
const hasOrderedItems = computed(() => {
  if (!editableRequest.value || !props.orders) return false

  const relatedOrders = props.orders.filter(
    order => order.requestIds && order.requestIds.includes(editableRequest.value!.id)
  )

  return relatedOrders.length > 0
})

const hasValidationErrors = computed(() => {
  if (!editableRequest.value) return false

  // Проверяем обязательные поля
  if (
    !editableRequest.value.department ||
    !editableRequest.value.priority ||
    !editableRequest.value.requestedBy
  ) {
    return true
  }

  // Проверяем есть ли товары
  if (editableRequest.value.items.length === 0) {
    return true
  }

  // Проверяем валидность товаров
  return editableRequest.value.items.some(item => !item.itemName || item.requestedQuantity <= 0)
})

const canSave = computed(() => {
  return !hasValidationErrors.value && hasChanges.value
})

const hasChanges = computed(() => {
  if (!originalRequest.value || !editableRequest.value) return false

  // Сравниваем основные поля
  if (originalRequest.value.priority !== editableRequest.value.priority) return true
  if (originalRequest.value.notes !== editableRequest.value.notes) return true
  if (originalRequest.value.department !== editableRequest.value.department) return true
  if (originalRequest.value.requestedBy !== editableRequest.value.requestedBy) return true

  // Сравниваем товары
  if (originalRequest.value.items.length !== editableRequest.value.items.length) return true

  return originalRequest.value.items.some((originalItem, index) => {
    const editedItem = editableRequest.value!.items[index]
    return (
      originalItem.requestedQuantity !== editedItem.requestedQuantity ||
      originalItem.notes !== editedItem.notes
    )
  })
})

// =============================================
// OPTIONS
// =============================================

const departmentOptions = [
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const priorityOptions = [
  { title: 'Normal', value: 'normal' },
  { title: 'Urgent', value: 'urgent' }
]

const rules = {
  required: (value: any) => !!value || 'This field is required'
}

// =============================================
// WATCHERS
// =============================================

// Инициализируем данные для редактирования когда диалог открывается
watch(
  () => props.request,
  newRequest => {
    if (newRequest && props.modelValue) {
      originalRequest.value = newRequest
      editableRequest.value = JSON.parse(JSON.stringify(newRequest)) // deep copy
    }
  },
  { immediate: true }
)

// =============================================
// METHODS
// =============================================

function cancelEdit() {
  if (hasChanges.value) {
    if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      isOpen.value = false
    }
  } else {
    isOpen.value = false
  }
}

async function saveRequest() {
  if (!editableRequest.value || !canSave.value) return

  try {
    saving.value = true
    emits('save-request', editableRequest.value)
  } finally {
    saving.value = false
  }
}

function addNewItem() {
  showAddItemDialog.value = true
}

function handleItemAdded(newItem: RequestItem) {
  if (editableRequest.value) {
    editableRequest.value.items.push({
      ...newItem,
      id: `item-${Date.now()}` // temporary ID
    })
  }
}

function removeItem(index: number) {
  if (editableRequest.value && canEditItems.value) {
    const item = editableRequest.value.items[index]

    if (isItemOrdered(item)) {
      alert('Cannot remove item that has already been ordered')
      return
    }

    if (confirm(`Remove "${item.itemName}" from request?`)) {
      editableRequest.value.items.splice(index, 1)
    }
  }
}

function validateQuantity(item: RequestItem) {
  if (item.requestedQuantity < 0) {
    item.requestedQuantity = 0
  }
}

// =============================================
// HELPER METHODS
// =============================================

function isItemOrdered(item: RequestItem): boolean {
  if (!props.orders) return false

  const relatedOrders = props.orders.filter(
    order => order.requestIds && order.requestIds.includes(originalRequest.value!.id)
  )

  return relatedOrders.some(order =>
    order.items.some(orderItem => orderItem.itemId === item.itemId)
  )
}

function getEstimatedPrice(itemId: string): number {
  const prices: Record<string, number> = {
    'prod-beef-steak': 180000,
    'prod-potato': 8000,
    'prod-garlic': 25000,
    'prod-tomato': 12000,
    'prod-beer-bintang-330': 12000,
    'prod-cola-330': 8000,
    'prod-butter': 45000,
    'prod-chicken-breast': 85000,
    'prod-onion': 15000,
    'prod-rice': 12000
  }
  return prices[itemId] || 0
}

function calculateTotalEstimate(): number {
  if (!editableRequest.value) return 0

  return editableRequest.value.items.reduce((sum, item) => {
    return sum + item.requestedQuantity * getEstimatedPrice(item.itemId)
  }, 0)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function getStatusColor(status?: string): string {
  const colors = {
    draft: 'grey',
    submitted: 'blue',
    converted: 'success',
    cancelled: 'error'
  }
  return colors[status as keyof typeof colors] || 'grey'
}
</script>

<style scoped>
.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.v-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>
