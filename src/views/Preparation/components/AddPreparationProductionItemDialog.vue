<!-- src/views/preparation/components/AddPreparationProductionItemDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>
        <h3>Add Preparation to Production</h3>
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
          />

          <!-- Quantity -->
          <v-text-field
            v-model.number="quantity"
            label="Quantity (grams)"
            type="number"
            min="50"
            step="50"
            :rules="[v => (!!v && v > 0) || 'Quantity must be greater than 0']"
            variant="outlined"
            class="mb-4"
            suffix="g"
          />

          <!-- Cost per Unit -->
          <v-text-field
            v-model.number="costPerUnit"
            label="Cost per Gram"
            type="number"
            min="0"
            step="1"
            :rules="[v => v >= 0 || 'Cost cannot be negative']"
            variant="outlined"
            prefix="Rp"
            class="mb-4"
          />

          <!-- Auto-set expiry for tomorrow -->
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <v-icon icon="mdi-information" class="mr-1" />
            Expiry will be set automatically (24-48 hours from production)
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!canSubmit" @click="handleSubmit">
          Add to Production
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import type { PreparationReceiptItem } from '@/stores/preparation'

// Props
interface Props {
  modelValue: boolean
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add-item': [item: PreparationReceiptItem]
}>()

// Store
const preparationStore = usePreparationStore()

// State
const form = ref()
const isFormValid = ref(false)
const selectedPreparationId = ref('')
const quantity = ref(500) // 500g default
const costPerUnit = ref(0)

// Computed
const availablePreparations = computed(() => {
  try {
    return preparationStore.getAvailablePreparations()
  } catch (error) {
    return []
  }
})

const canSubmit = computed(
  () =>
    isFormValid.value && selectedPreparationId.value && quantity.value > 0 && costPerUnit.value >= 0
)

// Methods
function handleSubmit() {
  if (!canSubmit.value) return

  // Auto-set expiry date to tomorrow evening
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(20, 0, 0, 0) // 8 PM tomorrow

  const receiptItem: PreparationReceiptItem = {
    preparationId: selectedPreparationId.value,
    quantity: quantity.value,
    costPerUnit: costPerUnit.value,
    expiryDate: tomorrow.toISOString().slice(0, 16), // Format for datetime-local
    notes: ''
  }

  emit('add-item', receiptItem)
  handleClose()
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  selectedPreparationId.value = ''
  quantity.value = 500
  costPerUnit.value = 0

  if (form.value) {
    form.value.resetValidation()
  }
}
</script>
