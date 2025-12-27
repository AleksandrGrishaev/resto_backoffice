<!-- src/views/kitchen/preparation/dialogs/ProductWriteOffDialog.vue -->
<!-- Kitchen Preparation - Product Write-Off Dialog (Horizontal Tablet Layout) -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="dialog-card">
      <!-- Compact Header with Reason Selector -->
      <v-card-title class="dialog-header pa-3">
        <div class="d-flex align-center justify-space-between w-100">
          <div class="d-flex align-center gap-4 flex-grow-1">
            <div>
              <h3 class="text-h6">Write Off Products</h3>
              <div class="text-caption text-medium-emphasis">
                {{ userDepartment === 'kitchen' ? 'Kitchen' : 'Bar' }}
              </div>
            </div>
            <!-- Reason Selector inline -->
            <v-select
              v-model="formData.reason"
              :items="writeOffReasonOptions"
              label="Reason"
              variant="outlined"
              density="compact"
              class="reason-select"
              hide-details
              :rules="[rules.required]"
            >
              <template #item="{ props: itemProps, item }">
                <v-list-item v-bind="itemProps" :title="undefined" :subtitle="undefined">
                  <template #prepend>
                    <v-icon
                      :color="item.raw.color"
                      :icon="item.raw.affectsKPI ? 'mdi-alert' : 'mdi-check-circle'"
                      size="small"
                    />
                  </template>
                  <v-list-item-title class="text-body-2">{{ item.raw.title }}</v-list-item-title>
                </v-list-item>
              </template>
            </v-select>
            <!-- KPI Warning inline -->
            <v-chip
              v-if="selectedReasonInfo?.affectsKPI"
              color="warning"
              size="small"
              prepend-icon="mdi-alert"
            >
              Affects KPI
            </v-chip>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
        </div>
      </v-card-title>
      <v-divider />

      <!-- Main Content: Horizontal Layout -->
      <v-card-text class="pa-3 dialog-content">
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <div class="d-flex gap-3 panels-container">
            <!-- Left Panel: Product Search & Add -->
            <v-card variant="outlined" class="flex-grow-1 panel-card">
              <v-card-title class="pa-2 py-1">
                <span class="text-body-1 font-weight-medium">Add Products</span>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-2">
                <!-- Product Search -->
                <v-autocomplete
                  v-model="selectedProduct"
                  :items="availableProducts"
                  item-title="name"
                  item-value="id"
                  placeholder="Search product..."
                  variant="outlined"
                  density="compact"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  return-object
                  hide-details
                  :loading="loadingProducts"
                  @update:model-value="handleProductSelected"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <v-list-item-subtitle class="text-caption">
                        {{ item.raw.currentQuantity }} {{ item.raw.unit }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-autocomplete>

                <!-- Quantity Input (appears after product selected) -->
                <div v-if="pendingProduct" class="pending-product-input mt-2">
                  <div class="d-flex align-center gap-2">
                    <div class="flex-grow-1">
                      <div class="text-body-2 font-weight-medium text-truncate">
                        {{ pendingProduct.name }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        Stock: {{ pendingProduct.currentQuantity }} {{ pendingProduct.unit }}
                      </div>
                    </div>
                    <NumericInputField
                      v-model="pendingQuantity"
                      :min="0.01"
                      :max="99999"
                      :allow-decimal="true"
                      :decimal-places="2"
                      variant="outlined"
                      density="compact"
                      :suffix="pendingProduct.unit"
                      hide-details
                      class="quantity-input"
                    />
                    <v-btn
                      color="primary"
                      variant="flat"
                      size="small"
                      :disabled="!pendingQuantity || pendingQuantity <= 0"
                      @click="addPendingProduct"
                    >
                      Add
                    </v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Right Panel: Selected Products -->
            <v-card variant="outlined" class="selected-panel panel-card">
              <v-card-title class="d-flex align-center justify-space-between pa-2 py-1">
                <span class="text-body-1 font-weight-medium">Selected</span>
                <v-chip size="x-small" color="primary" variant="tonal">
                  {{ formData.items.length }}
                </v-chip>
              </v-card-title>
              <v-divider />
              <v-card-text class="pa-2 panel-scroll">
                <!-- Empty State -->
                <div
                  v-if="formData.items.length === 0"
                  class="text-center py-4 text-medium-emphasis"
                >
                  <v-icon icon="mdi-package-variant-closed" size="32" class="mb-1" />
                  <div class="text-caption">No products selected</div>
                </div>

                <!-- Products list -->
                <div v-else class="selected-items-list">
                  <div
                    v-for="(item, index) in formData.items"
                    :key="`item-${index}`"
                    class="selected-item-row d-flex align-center justify-space-between py-1"
                  >
                    <div class="flex-grow-1">
                      <div class="text-body-2 font-weight-medium text-truncate">
                        {{ getProductName(item.itemId) }}
                      </div>
                      <div class="d-flex align-center gap-2 text-caption text-medium-emphasis">
                        <span>{{ item.quantity }} {{ getProductUnit(item.itemId) }}</span>
                        <span>{{ formatIDR(calculateItemCost(item)) }}</span>
                      </div>
                    </div>
                    <v-btn
                      icon="mdi-close"
                      variant="text"
                      size="x-small"
                      color="error"
                      @click="removeProductRow(index)"
                    />
                  </div>
                </div>
              </v-card-text>

              <!-- Total Cost at bottom of selected panel -->
              <v-divider v-if="formData.items.length > 0" />
              <div v-if="formData.items.length > 0" class="pa-2 bg-error-lighten-5">
                <div class="d-flex align-center justify-space-between">
                  <span class="text-body-2 font-weight-medium">Total Cost</span>
                  <span class="text-subtitle-1 font-weight-bold text-error">
                    {{ formatIDR(totalCost) }}
                  </span>
                </div>
              </div>
            </v-card>
          </div>
        </v-form>
      </v-card-text>

      <!-- Compact Actions -->
      <v-divider />
      <v-card-actions class="pa-3 dialog-actions">
        <v-text-field
          v-model="formData.notes"
          placeholder="Notes (optional)"
          variant="outlined"
          density="compact"
          hide-details
          class="notes-input"
          prepend-inner-icon="mdi-note-text"
        />
        <v-spacer />
        <v-btn variant="text" size="small" @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="error"
          variant="flat"
          size="small"
          :loading="loading"
          :disabled="!isFormValid"
          @click="handleSubmit"
        >
          Write Off ({{ formData.items.length }})
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWriteOff, useStorageStore } from '@/stores/storage'
import { useAuthStore } from '@/stores/auth'
import { formatIDR } from '@/utils/currency'
import { DebugUtils, TimeUtils } from '@/utils'
import type { WriteOffReason } from '@/stores/storage/types'
import type { Department } from '@/stores/productsStore/types'

const MODULE_NAME = 'ProductWriteOffDialog'

interface WriteOffFormData {
  reason: WriteOffReason
  items: Array<{
    itemId: string
    quantity: number
    notes: string
  }>
  notes: string
}

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: [message: string]
  completed: [] // Emitted when background task completes successfully - triggers data reload
  error: [error: string]
}>()

// Stores & Composables
const writeOff = useWriteOff()
const storageStore = useStorageStore()
const authStore = useAuthStore()

// Background tasks (non-blocking processing)
import { useBackgroundTasks } from '@/core/background'
const { addProductWriteOffTask } = useBackgroundTasks()

// Refs
const formRef = ref()
const loading = ref(false)
const loadingProducts = ref(false)

// Product selection state
const selectedProduct = ref<any>(null)
const pendingProduct = ref<any>(null)
const pendingQuantity = ref<number>(0)

// Form data
const formData = ref<WriteOffFormData>({
  reason: 'other',
  items: [],
  notes: ''
})

// Computed
const userDepartment = computed<Department>(() => {
  const roles = authStore.userRoles
  if (roles.includes('bar') && !roles.includes('kitchen')) {
    return 'bar'
  }
  return 'kitchen'
})

const writeOffReasonOptions = computed(() => writeOff.writeOffReasonOptions.value)

const selectedReasonInfo = computed(() => {
  return writeOff.getReasonInfo(formData.value.reason)
})

// Available products - from storage balances with stock info
const availableProducts = computed(() => {
  // Use writeOff.availableProducts which filters by department and has stock > 0
  return writeOff.availableProducts.value.map(item => ({
    id: item.itemId,
    name: item.itemName,
    currentQuantity: item.currentQuantity,
    unit: item.unit
  }))
})

const totalCost = computed(() => {
  return formData.value.items.reduce((sum, item) => sum + calculateItemCost(item), 0)
})

const isFormValid = computed(() => {
  return (
    formData.value.reason &&
    formData.value.items.length > 0 &&
    formData.value.items.every(item => item.itemId && item.quantity > 0)
  )
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'This field is required'
}

// Methods
function handleProductSelected(product: any) {
  if (product) {
    pendingProduct.value = product
    pendingQuantity.value = 1
    selectedProduct.value = null // Clear autocomplete
  }
}

function addPendingProduct() {
  if (!pendingProduct.value || !pendingQuantity.value || pendingQuantity.value <= 0) return

  // Check if already in list
  const existingIndex = formData.value.items.findIndex(
    item => item.itemId === pendingProduct.value.id
  )

  if (existingIndex !== -1) {
    // Update quantity
    formData.value.items[existingIndex].quantity += pendingQuantity.value
  } else {
    // Add new
    formData.value.items.push({
      itemId: pendingProduct.value.id,
      quantity: pendingQuantity.value,
      notes: ''
    })
  }

  DebugUtils.info(MODULE_NAME, 'Product added', {
    productId: pendingProduct.value.id,
    name: pendingProduct.value.name,
    quantity: pendingQuantity.value
  })

  // Reset
  pendingProduct.value = null
  pendingQuantity.value = 0
}

function removeProductRow(index: number) {
  formData.value.items.splice(index, 1)
}

function getProductName(productId: string): string {
  return storageStore.getItemName(productId)
}

function getProductUnit(productId: string): string {
  return storageStore.getItemUnit(productId)
}

function getProductStock(productId: string): number {
  const balance = storageStore.state.balances.find(b => b.itemId === productId)
  return balance?.totalQuantity || 0
}

function calculateItemCost(item: { itemId: string; quantity: number }): number {
  if (!item.itemId || !item.quantity) return 0
  // Use writeOff.calculateWriteOffCost for FIFO-based cost calculation
  return writeOff.calculateWriteOffCost(item.itemId, item.quantity, userDepartment.value)
}

async function handleSubmit() {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  DebugUtils.info(MODULE_NAME, 'Queueing product write-off task (background)', {
    reason: formData.value.reason,
    itemCount: formData.value.items.length,
    totalCost: totalCost.value
  })

  // Prepare data before closing dialog
  const affectsKpi = selectedReasonInfo.value?.affectsKPI || false
  const items = formData.value.items.map(item => ({
    itemId: item.itemId,
    itemName: getProductName(item.itemId),
    quantity: item.quantity,
    unit: getProductUnit(item.itemId)
  }))

  // Queue background task (non-blocking)
  addProductWriteOffTask(
    {
      items,
      department: userDepartment.value,
      responsiblePerson: authStore.userName,
      reason: formData.value.reason,
      notes: formData.value.notes,
      kpiData: {
        userId: authStore.userId || 'unknown',
        userName: authStore.userName,
        affectsKpi
      }
    },
    {
      onSuccess: (message: string) => {
        emit('success', message)
        emit('completed') // Trigger data reload in parent
      },
      onError: (message: string) => {
        emit('error', message)
      }
    }
  )

  // Close dialog immediately (operations continue in background)
  const itemCount = formData.value.items.length
  emit('success', `Processing write-off of ${itemCount} product(s)...`)
  handleCancel()
}

function handleCancel() {
  formData.value = {
    reason: 'other',
    items: [],
    notes: ''
  }
  pendingProduct.value = null
  pendingQuantity.value = 0
  selectedProduct.value = null
  formRef.value?.resetValidation()
  emit('update:modelValue', false)
}

// Watch dialog open
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      // Set department for writeOff composable
      writeOff.selectedDepartment.value = userDepartment.value
    }
  }
)
</script>

<style scoped lang="scss">
// Horizontal tablet-optimized layout
.dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.dialog-header {
  flex-shrink: 0;
}

.dialog-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.dialog-actions {
  flex-shrink: 0;
}

.reason-select {
  max-width: 200px;
  min-width: 150px;
}

.notes-input {
  max-width: 300px;
}

.quantity-input {
  max-width: 120px;
}

.panels-container {
  height: 100%;
  min-height: 200px;
}

.panel-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  max-height: 220px;
}

.selected-panel {
  min-width: 280px;
  max-width: 320px;
}

.pending-product-input {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-radius: 6px;
  padding: 8px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.3);
}

.selected-items-list {
  .selected-item-row {
    border-radius: 4px;
    padding: 4px 8px;
    margin-bottom: 2px;

    &:hover {
      background-color: rgba(var(--v-theme-surface-variant), 0.1);
    }

    &:not(:last-child) {
      border-bottom: 1px solid rgba(var(--v-theme-outline), 0.08);
    }
  }
}

.bg-error-lighten-5 {
  background-color: rgba(var(--v-theme-error), 0.08);
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.gap-4 {
  gap: 16px;
}

.w-100 {
  width: 100%;
}
</style>
