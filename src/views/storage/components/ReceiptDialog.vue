<!-- src/views/storage/components/ReceiptDialog.vue - УПРОЩЕННАЯ ВЕРСИЯ -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Add Product Stock - {{ formatDepartment(department) }}</h3>
          <div class="text-caption text-medium-emphasis">Add new products to inventory</div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid">
          <!-- Info Alert -->
          <v-alert type="info" variant="tonal" class="mb-4">
            <v-alert-title>Feature in Development</v-alert-title>
            The product selection dialog is being developed. Check back soon for the full
            functionality.
          </v-alert>

          <!-- Responsible Person -->
          <v-text-field
            v-model="formData.responsiblePerson"
            label="Responsible Person"
            :rules="[v => !!v || 'Required field']"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
            placeholder="Enter your name"
          />

          <!-- Source Type -->
          <v-select
            v-model="formData.sourceType"
            label="Source Type"
            :items="sourceTypeOptions"
            :rules="[v => !!v || 'Required field']"
            variant="outlined"
            class="mb-4"
          />

          <!-- Products Section -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <v-label class="font-weight-medium">Products to Add</v-label>
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="mdi-plus"
                @click="addItem"
              >
                Add Product
              </v-btn>
            </div>

            <!-- Products List -->
            <div v-if="formData.items.length === 0" class="text-center py-6">
              <v-icon icon="mdi-package-plus" size="48" class="text-medium-emphasis mb-2" />
              <div class="text-body-2 text-medium-emphasis">No products added yet</div>
              <div class="text-caption text-medium-emphasis">Click "Add Product" to start</div>
            </div>

            <div v-else class="receipt-items">
              <v-card
                v-for="(item, index) in formData.items"
                :key="index"
                variant="outlined"
                class="mb-3"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center justify-space-between">
                    <div class="d-flex align-center">
                      <v-icon icon="mdi-package-variant" class="mr-3" color="primary" />
                      <div>
                        <div class="font-weight-medium">{{ getItemName(item.itemId) }}</div>
                        <div class="text-caption text-medium-emphasis">
                          {{ item.quantity }} {{ getItemUnit(item.itemId) }} ×
                          {{ formatCurrency(item.costPerUnit) }}
                        </div>
                      </div>
                    </div>
                    <div class="d-flex align-center gap-2">
                      <div class="text-right">
                        <div class="font-weight-medium">
                          {{ formatCurrency(item.quantity * item.costPerUnit) }}
                        </div>
                        <div class="text-caption text-medium-emphasis">Total</div>
                      </div>
                      <v-btn
                        icon="mdi-close"
                        size="small"
                        variant="text"
                        color="error"
                        @click="removeItem(index)"
                      />
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>

          <!-- Total Value -->
          <v-card v-if="totalValue > 0" variant="tonal" color="success" class="mb-4">
            <v-card-text class="d-flex align-center justify-space-between">
              <div>
                <div class="text-subtitle-1 font-weight-medium">Total Receipt Value</div>
                <div class="text-caption">
                  {{ formData.items.length }} product{{ formData.items.length !== 1 ? 's' : '' }}
                </div>
              </div>
              <div class="text-h5 font-weight-bold">
                {{ formatCurrency(totalValue) }}
              </div>
            </v-card-text>
          </v-card>

          <!-- Notes -->
          <v-textarea
            v-model="formData.notes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
            class="mb-4"
            placeholder="Additional notes about this receipt..."
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="success"
          variant="flat"
          :loading="loading"
          :disabled="!canSubmit"
          @click="handleSubmit"
        >
          <v-icon icon="mdi-check" class="mr-2" />
          Confirm Receipt
          <v-tooltip activator="parent" location="top">Feature coming soon</v-tooltip>
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Product Dialog -->
    <add-receipt-item-dialog v-model="showAddItemDialog" @add-item="handleAddItem" />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStorageStore } from '@/stores/storage'
import type { StorageDepartment, CreateReceiptData, ReceiptItem } from '@/stores/storage'
import { DebugUtils } from '@/utils'

// Components
import AddReceiptItemDialog from './AddReceiptItemDialog.vue'

const MODULE_NAME = 'ReceiptDialog'

// Props
interface Props {
  modelValue: boolean
  department: StorageDepartment
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Store
const storageStore = useStorageStore()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const showAddItemDialog = ref(false)

const formData = ref<CreateReceiptData>({
  department: props.department,
  responsiblePerson: '',
  sourceType: 'purchase',
  items: [],
  notes: ''
})

// Mock item names for display
const itemNames: Record<string, string> = {
  'prod-beef-steak': 'Beef Steak',
  'prod-potato': 'Potato',
  'prod-tomato': 'Fresh Tomato',
  'prod-onion': 'Onion',
  'prod-garlic': 'Garlic',
  'prod-olive-oil': 'Olive Oil'
}

const itemUnits: Record<string, string> = {
  'prod-beef-steak': 'kg',
  'prod-potato': 'kg',
  'prod-tomato': 'kg',
  'prod-onion': 'kg',
  'prod-garlic': 'kg',
  'prod-olive-oil': 'liter'
}

// Computed
const sourceTypeOptions = computed(() => [
  { title: 'Purchase', value: 'purchase' },
  { title: 'Correction', value: 'correction' },
  { title: 'Opening Balance', value: 'opening_balance' }
])

const totalValue = computed(() =>
  formData.value.items.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0)
)

const canSubmit = computed(
  () => false // Disabled since this is a placeholder
  // () => isFormValid.value && formData.value.items.length > 0 && !loading.value
)

// Methods
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function getItemName(itemId: string): string {
  return itemNames[itemId] || itemId
}

function getItemUnit(itemId: string): string {
  return itemUnits[itemId] || 'kg'
}

function addItem() {
  showAddItemDialog.value = true
}

function handleAddItem(item: any) {
  // Since we're using a placeholder, we don't actually add anything
  // Just close the dialog and show a message
  showAddItemDialog.value = false

  DebugUtils.info(MODULE_NAME, 'Add product dialog closed (placeholder)')
}

function removeItem(index: number) {
  const removedItem = formData.value.items[index]
  formData.value.items.splice(index, 1)

  DebugUtils.info(MODULE_NAME, 'Product removed from receipt', {
    itemId: removedItem.itemId,
    index
  })
}

async function handleSubmit() {
  if (!canSubmit.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Submitting product receipt', {
      formData: formData.value,
      totalValue: totalValue.value
    })

    const { reconciliations } = await storageStore.createReceipt(formData.value)

    DebugUtils.info(MODULE_NAME, 'Product receipt created successfully')
    const reconciledMsg =
      reconciliations.length > 0
        ? ` Reconciled ${reconciliations.length} product(s) with negative batches.`
        : ''
    emit(
      'success',
      `Receipt created successfully! Added ${formData.value.items.length} products worth ${formatCurrency(totalValue.value)} to ${formatDepartment(props.department).toLowerCase()} inventory.${reconciledMsg}`
    )
    handleClose()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create receipt'
    DebugUtils.error(MODULE_NAME, 'Failed to create product receipt', { error })
    emit('error', message)
  } finally {
    loading.value = false
  }
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  formData.value = {
    department: props.department,
    responsiblePerson: '',
    sourceType: 'purchase',
    items: [],
    notes: ''
  }

  if (form.value) {
    form.value.resetValidation()
  }

  DebugUtils.info(MODULE_NAME, 'Receipt form reset')
}

// Watch for department changes
watch(
  () => props.department,
  newDepartment => {
    formData.value.department = newDepartment
  }
)
</script>

<style lang="scss" scoped>
.receipt-items {
  max-height: 300px;
  overflow-y: auto;
}

.v-card-title {
  background: rgba(var(--v-theme-success), 0.05);
}

.v-label {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.v-alert {
  border-radius: 12px;
}
</style>
