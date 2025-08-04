<!-- src/views/storage/components/ReceiptDialog.vue -->
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
          <h3>Receipt/Correction - {{ formatDepartment(department) }}</h3>
          <div class="text-caption text-medium-emphasis">Add new stock or make corrections</div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid" @submit.prevent="handleSubmit">
          <!-- Responsible Person -->
          <v-text-field
            v-model="formData.responsiblePerson"
            label="Responsible Person"
            :rules="[v => !!v || 'Required field']"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
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

          <!-- Items Section -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <v-label>Items to Receive</v-label>
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="mdi-plus"
                @click="addItem"
              >
                Add Item
              </v-btn>
            </div>

            <!-- Items List -->
            <div v-if="formData.items.length === 0" class="text-center py-8 text-medium-emphasis">
              <v-icon icon="mdi-package-plus" size="48" class="mb-2" />
              <div>No items added yet</div>
              <div class="text-caption">Click "Add Item" to start</div>
            </div>

            <div v-else class="receipt-items">
              <receipt-item-card
                v-for="(item, index) in formData.items"
                :key="index"
                v-model="formData.items[index]"
                class="mb-3"
                @remove="removeItem(index)"
              />
            </div>
          </div>

          <!-- Total Value -->
          <v-card v-if="totalValue > 0" variant="tonal" color="success" class="mb-4">
            <v-card-text class="d-flex align-center justify-space-between">
              <div>
                <div class="text-subtitle-1 font-weight-medium">Total Value</div>
                <div class="text-caption">
                  {{ formData.items.length }} item{{ formData.items.length !== 1 ? 's' : '' }}
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
          Confirm Receipt
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Item Dialog -->
    <add-receipt-item-dialog v-model="showAddItemDialog" @add-item="handleAddItem" />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorageStore } from '@/stores/storage'
import type { StorageDepartment, CreateReceiptData, ReceiptItem } from '@/stores/storage'
import { DebugUtils } from '@/utils'

// Components
import ReceiptItemCard from './ReceiptItemCard.vue'
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
  success: []
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
  sourceType: 'correction',
  items: [],
  notes: ''
})

// Computed
const sourceTypeOptions = computed(() => [
  { title: 'Purchase', value: 'purchase' },
  { title: 'Production', value: 'production' },
  { title: 'Correction', value: 'correction' },
  { title: 'Opening Balance', value: 'opening_balance' }
])

const totalValue = computed(() =>
  formData.value.items.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0)
)

const canSubmit = computed(
  () => isFormValid.value && formData.value.items.length > 0 && !loading.value
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

function addItem() {
  showAddItemDialog.value = true
}

function handleAddItem(item: ReceiptItem) {
  formData.value.items.push(item)
  showAddItemDialog.value = false
}

function removeItem(index: number) {
  formData.value.items.splice(index, 1)
}

async function handleSubmit() {
  if (!canSubmit.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Submitting receipt', { formData: formData.value })

    await storageStore.createReceipt(formData.value)

    DebugUtils.info(MODULE_NAME, 'Receipt created successfully')
    emit('success')
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create receipt', { error })
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
    sourceType: 'correction',
    items: [],
    notes: ''
  }

  if (form.value) {
    form.value.resetValidation()
  }
}
</script>

<style lang="scss" scoped>
.receipt-items {
  max-height: 400px;
  overflow-y: auto;
}
</style>
