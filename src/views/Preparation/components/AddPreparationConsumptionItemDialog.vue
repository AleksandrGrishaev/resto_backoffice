<!-- src/views/preparation/components/AddPreparationConsumptionItemDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>
        <h3>Add Preparation to Use</h3>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid">
          <!-- Preparation Selection -->
          <v-select
            v-model="selectedPreparationId"
            :items="availablePreparations"
            item-title="name"
            item-value="id"
            label="Select Preparation"
            :rules="[v => !!v || 'Please select a preparation']"
            variant="outlined"
            class="mb-4"
          >
            <template #item="{ item, props: itemProps }">
              <v-list-item v-bind="itemProps">
                <template #append>
                  <div class="text-caption text-medium-emphasis">
                    {{ getStockInfo(item.raw.id) }}
                  </div>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Stock Information -->
          <v-alert
            v-if="selectedStock"
            :type="getStockAlertType()"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <div class="d-flex justify-space-between">
              <span>Available: {{ selectedStock.totalQuantity }}{{ selectedStock.unit }}</span>
              <span>{{ formatCurrency(selectedStock.averageCost) }}/{{ selectedStock.unit }}</span>
            </div>
          </v-alert>

          <!-- Quantity -->
          <v-text-field
            v-model.number="quantity"
            label="Quantity to Use"
            type="number"
            min="10"
            step="10"
            :max="selectedStock?.totalQuantity || 9999"
            :rules="quantityRules"
            variant="outlined"
            class="mb-4"
            :suffix="selectedStock?.unit || 'g'"
          />
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!canSubmit" @click="handleSubmit">
          Add to Usage
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import type { PreparationConsumptionItem, PreparationDepartment } from '@/stores/preparation'

// Props
interface Props {
  modelValue: boolean
  department: PreparationDepartment
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add-item': [item: PreparationConsumptionItem]
}>()

// Store
const preparationStore = usePreparationStore()

// State
const form = ref()
const isFormValid = ref(false)
const selectedPreparationId = ref('')
const quantity = ref(100) // 100g default

// Computed
const availablePreparations = computed(() => {
  try {
    return preparationStore.getAvailablePreparations()
  } catch (error) {
    return []
  }
})

const selectedStock = computed(() => {
  if (!selectedPreparationId.value) return null
  try {
    return preparationStore.getBalance(selectedPreparationId.value, props.department)
  } catch (error) {
    return null
  }
})

const quantityRules = computed(() => [
  (v: number) => !!v || 'Quantity is required',
  (v: number) => v > 0 || 'Quantity must be greater than 0',
  (v: number) => {
    const maxStock = selectedStock.value?.totalQuantity || 0
    return v <= maxStock || `Only ${maxStock} available`
  },
  (v: number) => {
    if (selectedStock.value?.hasExpired) {
      return 'Cannot use expired preparations'
    }
    return true
  }
])

const canSubmit = computed(
  () =>
    isFormValid.value &&
    selectedPreparationId.value &&
    quantity.value > 0 &&
    selectedStock.value &&
    !selectedStock.value.hasExpired
)

// Methods
function getStockInfo(preparationId: string): string {
  try {
    const balance = preparationStore.getBalance(preparationId, props.department)
    if (!balance) return 'No stock'

    let status = `${balance.totalQuantity}${balance.unit}`
    if (balance.hasExpired) status += ' (EXPIRED)'
    else if (balance.hasNearExpiry) status += ' (EXPIRING)'

    return status
  } catch (error) {
    return 'Unknown'
  }
}

function getStockAlertType(): string {
  if (!selectedStock.value) return 'info'
  if (selectedStock.value.hasExpired) return 'error'
  if (selectedStock.value.hasNearExpiry) return 'warning'
  return 'success'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function handleSubmit() {
  if (!canSubmit.value) return

  const consumptionItem: PreparationConsumptionItem = {
    preparationId: selectedPreparationId.value,
    quantity: quantity.value,
    notes: ''
  }

  emit('add-item', consumptionItem)
  handleClose()
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  selectedPreparationId.value = ''
  quantity.value = 100

  if (form.value) {
    form.value.resetValidation()
  }
}
</script>
