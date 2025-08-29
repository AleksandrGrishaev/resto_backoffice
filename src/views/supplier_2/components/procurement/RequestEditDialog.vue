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
                  <v-text-field
                    v-if="canEditItems && !isItemOrdered(item)"
                    v-model.number="item.requestedQuantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    hide-details
                    density="compact"
                    variant="outlined"
                    style="width: 100px"
                    class="text-center"
                    @blur="validateQuantity(item)"
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
                    {{
                      formatCurrency(item.estimatedPrice || getEstimatedPrice(item.itemId, item))
                    }}
                  </div>
                </td>

                <!-- Line Total -->
                <td class="text-right">
                  <div class="text-body-2 font-weight-medium">
                    {{
                      formatCurrency(
                        item.requestedQuantity *
                          (item.estimatedPrice || getEstimatedPrice(item.itemId, item))
                      )
                    }}
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
    if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      isOpen.value = false
    }
  } else {
    isOpen.value = false
  }
}

function hasUnsavedChanges(): boolean {
  return JSON.stringify(originalRequest.value) !== JSON.stringify(editableRequest.value)
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

// =============================================
// PRICING FUNCTIONS - ИСПРАВЛЕНО
// =============================================

function getEstimatedPrice(itemId: string, item?: any): number {
  if (item?.estimatedPrice) return item.estimatedPrice

  const product = productsStore.products.find(p => p.id === itemId)
  if (product && product.baseCostPerUnit) {
    return product.baseCostPerUnit
  }

  return 0
}

function calculateTotalEstimate(): number {
  if (!editableRequest.value) return 0

  return editableRequest.value.items.reduce((sum, item) => {
    const product = productsStore.products.find(p => p.id === item.itemId)
    if (!product) return sum

    let baseQuantity = item.requestedQuantity

    if (item.unit !== product.baseUnit) {
      if (item.unit === 'kg' && product.baseUnit === 'gram') {
        baseQuantity = item.requestedQuantity * 1000
      } else if (item.unit === 'liter' && product.baseUnit === 'ml') {
        baseQuantity = item.requestedQuantity * 1000
      }
    }

    return sum + baseQuantity * product.baseCostPerUnit
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
