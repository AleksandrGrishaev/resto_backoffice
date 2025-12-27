<!-- src/views/supplier_2/components/procurement/RequestEditDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="900px" persistent scrollable>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-3 bg-primary">
        <div>
          <div class="text-h6 font-weight-bold text-white">Edit Request</div>
          <div class="text-caption text-white" style="opacity: 0.9">
            {{ originalRequest?.requestNumber }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <v-card-text v-if="editableRequest" class="pa-0">
        <!-- Basic Information -->
        <div class="pa-4 bg-surface">
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="editableRequest.requestedBy"
                :disabled="!canEditBasicInfo"
                label="Requested By"
                variant="outlined"
                density="compact"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="editableRequest.priority"
                :disabled="!canEditBasicInfo"
                :items="priorityOptions"
                label="Priority"
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
        </div>

        <v-divider />

        <!-- Items Section -->
        <div class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-1 font-weight-bold">Items</div>
            <v-btn
              v-if="canEditItems"
              color="primary"
              size="small"
              prepend-icon="mdi-plus"
              @click="addNewItem"
            >
              Add Item
            </v-btn>
          </div>

          <!-- Items Table -->
          <v-table density="compact" class="border">
            <thead>
              <tr>
                <th class="text-left">Item</th>
                <th class="text-center">Quantity</th>
                <th class="text-center">Unit</th>
                <th class="text-right">Price</th>
                <th class="text-right">Total</th>
                <th v-if="canEditItems" class="text-center">Actions</th>
                <th class="text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in editableRequest.items"
                :key="item.id"
                :class="{ 'item-ordered': isItemOrdered(item) }"
              >
                <!-- Item Name -->
                <td>
                  <div class="font-weight-medium">{{ item.itemName }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.itemId }}</div>
                </td>

                <!-- Quantity -->
                <td class="text-center">
                  <NumericInputField
                    v-if="canEditItems && !isItemOrdered(item)"
                    v-model="item.requestedQuantity"
                    :min="0.1"
                    :max="99999"
                    :allow-decimal="true"
                    :decimal-places="1"
                    hide-details
                    density="compact"
                    variant="outlined"
                    style="width: 100px"
                    @update:model-value="validateQuantity(item)"
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
                    {{ formatCurrency(getItemPrice(item)) }}
                  </div>
                </td>

                <!-- Line Total -->
                <td class="text-right">
                  <div class="text-body-2 font-weight-medium">
                    {{ formatCurrency(item.requestedQuantity * getItemPrice(item)) }}
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
                    @click="confirmRemoveItem(index)"
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
                    style="min-width: 150px"
                  />
                  <span v-else class="text-body-2">{{ item.notes || '-' }}</span>
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Totals -->
          <div class="d-flex justify-end border-t pa-2">
            <div class="text-right">
              <div class="text-body-2 text-medium-emphasis">Total Estimated</div>
              <div class="text-h6 font-weight-bold text-primary">
                {{ formatCurrency(calculateTotalEstimate()) }}
              </div>
            </div>
          </div>
        </div>

        <v-divider />

        <!-- Notes -->
        <div class="pa-4">
          <v-textarea
            v-model="editableRequest.notes"
            :disabled="!canEditBasicInfo"
            label="Notes"
            variant="outlined"
            rows="3"
            placeholder="Additional notes for this request..."
          />
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" @click="closeDialog">Cancel</v-btn>
        <v-spacer />
        <v-btn
          color="success"
          :disabled="!canSave"
          :loading="saving"
          prepend-icon="mdi-content-save"
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
      @add-item="handleItemAdded"
    />

    <!-- Unsaved Changes Confirmation Dialog -->
    <v-dialog v-model="showUnsavedChangesDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">Unsaved Changes</v-card-title>
        <v-card-text>
          You have unsaved changes. Are you sure you want to cancel without saving?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="showUnsavedChangesDialog = false">
            Keep Editing
          </v-btn>
          <v-btn color="error" variant="text" @click="confirmCloseDialog">Discard Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Item Confirmation Dialog -->
    <v-dialog v-model="showRemoveItemDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">Remove Item</v-card-title>
        <v-card-text>Remove "{{ itemToRemove?.itemName }}" from request?</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="grey" variant="text" @click="showRemoveItemDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="text" @click="confirmRemoveItemAction">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cannot Remove Ordered Item Dialog -->
    <v-dialog v-model="showCannotRemoveDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6 text-warning">Cannot Remove Item</v-card-title>
        <v-card-text>
          Cannot remove "{{ itemToRemove?.itemName }}" because it has already been ordered.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="showCannotRemoveDialog = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import type { ProcurementRequest, PurchaseOrder, RequestItem } from '@/stores/supplier_2/types'
import AddItemDialog from './AddItemDialog.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  request: ProcurementRequest | null
  orders: PurchaseOrder[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'save-request', request: ProcurementRequest): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// STORES
// =============================================

const productsStore = useProductsStore()

// =============================================
// LOCAL STATE
// =============================================

const originalRequest = ref<ProcurementRequest | null>(null)
const editableRequest = ref<ProcurementRequest | null>(null)
const saving = ref(false)
const showAddItemDialog = ref(false)
const showUnsavedChangesDialog = ref(false)
const showRemoveItemDialog = ref(false)
const showCannotRemoveDialog = ref(false)
const itemToRemove = ref<RequestItem | null>(null)
const itemToRemoveIndex = ref<number>(-1)
const originalRequestJson = ref<string>('')

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const canEditBasicInfo = computed(() => {
  return editableRequest.value?.status === 'draft'
})

const canEditItems = computed(() => {
  return ['draft', 'submitted'].includes(editableRequest.value?.status || '')
})

const canSave = computed(() => {
  return (
    editableRequest.value &&
    editableRequest.value.items.length > 0 &&
    editableRequest.value.requestedBy.trim() !== '' &&
    !saving.value
  )
})

const priorityOptions = [
  { title: 'Normal', value: 'normal' },
  { title: 'Urgent', value: 'urgent' }
]

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.request,
  newRequest => {
    if (newRequest) {
      originalRequest.value = newRequest
      editableRequest.value = JSON.parse(JSON.stringify(newRequest)) // Deep copy
      originalRequestJson.value = JSON.stringify(newRequest) // Store original for comparison
    }
  },
  { immediate: true }
)

// =============================================
// METHODS
// =============================================

function closeDialog() {
  if (saving.value) return

  if (hasUnsavedChanges()) {
    showUnsavedChangesDialog.value = true
  } else {
    isOpen.value = false
  }
}

function confirmCloseDialog() {
  showUnsavedChangesDialog.value = false
  isOpen.value = false
}

function hasUnsavedChanges(): boolean {
  if (!originalRequestJson.value || !editableRequest.value) return false
  return originalRequestJson.value !== JSON.stringify(editableRequest.value)
}

async function saveRequest() {
  if (!editableRequest.value || !canSave.value) return

  try {
    saving.value = true
    emits('save-request', editableRequest.value)
    // Update original after successful save
    originalRequestJson.value = JSON.stringify(editableRequest.value)
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

function confirmRemoveItem(index: number) {
  if (!editableRequest.value || !canEditItems.value) return

  const item = editableRequest.value.items[index]

  if (isItemOrdered(item)) {
    itemToRemove.value = item
    showCannotRemoveDialog.value = true
    return
  }

  itemToRemove.value = item
  itemToRemoveIndex.value = index
  showRemoveItemDialog.value = true
}

function confirmRemoveItemAction() {
  if (editableRequest.value && itemToRemoveIndex.value >= 0) {
    editableRequest.value.items.splice(itemToRemoveIndex.value, 1)
  }
  showRemoveItemDialog.value = false
  itemToRemove.value = null
  itemToRemoveIndex.value = -1
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

/**
 * Получает правильную цену для товара (та же логика что в useOrderAssistant)
 */
function getItemPrice(item: any): number {
  // 1. Приоритет: цена из самого item
  if (item.estimatedPrice && item.estimatedPrice > 0) {
    return item.estimatedPrice
  }

  // 2. Получаем из ProductStore (та же логика что в useOrderAssistant)
  const product = productsStore.products.find(p => p.id === item.itemId)
  if (!product) return 1000

  // 3. Используем ту же логику что и в useOrderAssistant
  if (product.baseCostPerUnit && product.baseCostPerUnit > 0) {
    return product.baseCostPerUnit
  }

  if (product.purchaseCost && product.purchaseToBaseRatio && product.purchaseToBaseRatio > 0) {
    return Math.round(product.purchaseCost / product.purchaseToBaseRatio)
  }

  if (product.costPerUnit && product.costPerUnit > 0) {
    return product.costPerUnit
  }

  return 1000
}

/**
 * Расчет общей стоимости
 */
function calculateTotalEstimate(): number {
  if (!editableRequest.value) return 0

  return editableRequest.value.items.reduce((sum, item) => {
    const itemPrice = getItemPrice(item)
    return sum + item.requestedQuantity * itemPrice
  }, 0)
}

// =============================================
// FORMATTING & UTILITY FUNCTIONS
// =============================================

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
.border {
  border: 1px solid rgb(var(--v-theme-surface-variant));
  border-radius: 4px;
}

.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}

.v-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.item-ordered {
  background-color: rgba(76, 175, 80, 0.05);
}

.item-ordered td {
  opacity: 0.7;
}
</style>
