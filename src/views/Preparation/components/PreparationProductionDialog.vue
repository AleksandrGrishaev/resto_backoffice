<!-- src/views/preparation/components/PreparationProductionDialog.vue - Адаптация ReceiptDialog для производства -->
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
          <h3>Production - {{ formatDepartment(department) }}</h3>
          <div class="text-caption text-medium-emphasis">Record new preparation production</div>
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
            label="Production Source"
            :items="sourceTypeOptions"
            :rules="[v => !!v || 'Required field']"
            variant="outlined"
            class="mb-4"
          />

          <!-- Items Section -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <v-label>Preparations to Produce</v-label>
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                prepend-icon="mdi-plus"
                @click="addItem"
              >
                Add Preparation
              </v-btn>
            </div>

            <!-- Items List -->
            <div v-if="formData.items.length === 0" class="text-center py-8 text-medium-emphasis">
              <v-icon icon="mdi-chef-hat" size="48" class="mb-2" />
              <div>No preparations added yet</div>
              <div class="text-caption">Click "Add Preparation" to start</div>
            </div>

            <div v-else class="production-items">
              <preparation-production-item-card
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
                <div class="text-subtitle-1 font-weight-medium">Total Production Value</div>
                <div class="text-caption">
                  {{ formData.items.length }} preparation{{
                    formData.items.length !== 1 ? 's' : ''
                  }}
                </div>
              </div>
              <div class="text-h5 font-weight-bold">
                {{ formatCurrency(totalValue) }}
              </div>
            </v-card-text>
          </v-card>

          <!-- Shelf Life Warning -->
          <v-alert
            v-if="formData.items.length > 0"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <v-icon icon="mdi-clock-alert-outline" class="mr-2" />
            <strong>Short Shelf Life:</strong>
            Preparations typically last 1-2 days. Set expiry dates carefully and use quickly.
          </v-alert>

          <!-- Notes -->
          <v-textarea
            v-model="formData.notes"
            label="Production Notes (optional)"
            variant="outlined"
            rows="2"
            class="mb-4"
            placeholder="e.g., Recipe batch #123, Special occasion prep..."
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
          Confirm Production
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add Item Dialog -->
    <add-preparation-production-item-dialog v-model="showAddItemDialog" @add-item="handleAddItem" />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import type {
  PreparationDepartment,
  CreatePreparationReceiptData,
  PreparationReceiptItem
} from '@/stores/preparation'
import { DebugUtils } from '@/utils'

// Components
import PreparationProductionItemCard from './PreparationProductionItemCard.vue'
import AddPreparationProductionItemDialog from './AddPreparationProductionItemDialog.vue'

const MODULE_NAME = 'PreparationProductionDialog'

// Props
interface Props {
  modelValue: boolean
  department: PreparationDepartment
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Store
const preparationStore = usePreparationStore()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const showAddItemDialog = ref(false)

const formData = ref<CreatePreparationReceiptData>({
  department: props.department,
  responsiblePerson: '',
  sourceType: 'production',
  items: [],
  notes: ''
})

// Computed
const sourceTypeOptions = computed(() => [
  { title: 'Recipe Production', value: 'production' },
  { title: 'Correction/Adjustment', value: 'correction' },
  { title: 'Opening Balance', value: 'opening_balance' }
])

const totalValue = computed(() =>
  formData.value.items.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0)
)

const canSubmit = computed(
  () => isFormValid.value && formData.value.items.length > 0 && !loading.value
)

// Methods
function formatDepartment(dept: PreparationDepartment): string {
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

function handleAddItem(item: PreparationReceiptItem) {
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
    DebugUtils.info(MODULE_NAME, 'Submitting preparation production', { formData: formData.value })

    await preparationStore.createReceipt(formData.value)

    DebugUtils.info(MODULE_NAME, 'Preparation production created successfully')

    const message = `Produced ${formData.value.items.length} preparation${formData.value.items.length !== 1 ? 's' : ''} successfully`
    emit('success', message)
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create preparation production', { error })
    emit('error', error instanceof Error ? error.message : 'Failed to record production')
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
    sourceType: 'production',
    items: [],
    notes: ''
  }

  if (form.value) {
    form.value.resetValidation()
  }
}
</script>

<style lang="scss" scoped>
.production-items {
  max-height: 400px;
  overflow-y: auto;
}
</style>
