<!-- src/views/storage/components/AddReceiptItemDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>
        <h3>Add Receipt Item</h3>
      </v-card-title>

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid">
          <!-- Item Type -->
          <v-tabs v-model="selectedItemType" class="mb-4">
            <v-tab value="product">
              <v-icon icon="mdi-food" class="mr-2" />
              Products
            </v-tab>
            <v-tab value="preparation">
              <v-icon icon="mdi-chef-hat" class="mr-2" />
              Preparations
            </v-tab>
          </v-tabs>

          <!-- Item Selection -->
          <v-select
            v-model="selectedItemId"
            :items="availableItems"
            item-title="name"
            item-value="id"
            label="Select Item"
            :rules="[v => !!v || 'Please select an item']"
            variant="outlined"
            class="mb-4"
          />

          <!-- Quantity -->
          <v-text-field
            v-model.number="quantity"
            label="Quantity"
            type="number"
            min="0.01"
            step="0.01"
            :rules="[v => (!!v && v > 0) || 'Quantity must be greater than 0']"
            variant="outlined"
            class="mb-4"
          />

          <!-- Cost per Unit -->
          <v-text-field
            v-model.number="costPerUnit"
            label="Cost per Unit"
            type="number"
            min="0"
            step="1000"
            :rules="[v => v >= 0 || 'Cost cannot be negative']"
            variant="outlined"
            prefix="Rp"
            class="mb-4"
          />

          <!-- Expiry Date -->
          <v-text-field
            v-model="expiryDate"
            label="Expiry Date (optional)"
            type="date"
            variant="outlined"
            class="mb-4"
          />
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!canSubmit" @click="handleSubmit">
          Add Item
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ReceiptItem, StorageItemType } from '@/stores/storage'

// Props
interface Props {
  modelValue: boolean
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add-item': [item: ReceiptItem]
}>()

// State
const form = ref()
const isFormValid = ref(false)
const selectedItemType = ref<StorageItemType>('product')
const selectedItemId = ref('')
const quantity = ref(1)
const costPerUnit = ref(0)
const expiryDate = ref('')

// Computed
const availableItems = computed(() => {
  // Mock items - in real app, get from Product/Recipe store
  const mockProducts = [
    { id: 'beef-steak', name: 'Beef Steak' },
    { id: 'potato', name: 'Potato' },
    { id: 'garlic', name: 'Garlic' },
    { id: 'vodka', name: 'Vodka' },
    { id: 'beer', name: 'Beer' }
  ]

  const mockPreparations = [{ id: 'beef-rendang-prep', name: 'Beef Rendang (Prepared)' }]

  return selectedItemType.value === 'product' ? mockProducts : mockPreparations
})

const canSubmit = computed(
  () => isFormValid.value && selectedItemId.value && quantity.value > 0 && costPerUnit.value >= 0
)

// Methods
function handleSubmit() {
  if (!canSubmit.value) return

  const receiptItem: ReceiptItem = {
    itemId: selectedItemId.value,
    itemType: selectedItemType.value,
    quantity: quantity.value,
    costPerUnit: costPerUnit.value,
    expiryDate: expiryDate.value || undefined,
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
  selectedItemId.value = ''
  quantity.value = 1
  costPerUnit.value = 0
  expiryDate.value = ''

  if (form.value) {
    form.value.resetValidation()
  }
}
</script>
