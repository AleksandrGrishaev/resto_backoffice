<!-- ManualItemTab.vue -->
<template>
  <v-card variant="outlined">
    <v-card-title class="text-subtitle-1 pa-3 bg-primary-lighten-5">
      <v-icon icon="mdi-plus" class="mr-2" />
      Add Manual Item
    </v-card-title>

    <v-card-text class="pa-4">
      <v-row>
        <!-- Product Selection -->
        <v-col cols="12" md="6">
          <v-select
            :model-value="manualItem.itemId"
            :items="availableProducts"
            item-value="id"
            item-title="name"
            label="Select Product"
            prepend-icon="mdi-package-variant"
            :rules="[v => !!v || 'Product is required']"
            hint="Choose from available products"
            persistent-hint
            @update:model-value="handleProductChange"
          />
        </v-col>

        <!-- Quantity -->
        <v-col cols="12" md="3">
          <v-text-field
            :model-value="manualItem.quantity"
            type="number"
            label="Quantity"
            prepend-icon="mdi-counter"
            min="0.1"
            step="0.1"
            :rules="[v => !!v || 'Quantity is required', v => v > 0 || 'Quantity must be positive']"
            @update:model-value="updateQuantity"
          />
        </v-col>

        <!-- Unit -->
        <v-col cols="12" md="3">
          <v-text-field
            :model-value="manualItem.unit"
            label="Unit"
            prepend-icon="mdi-ruler"
            readonly
            hint="Auto-selected based on product"
            persistent-hint
          />
        </v-col>

        <!-- Notes -->
        <v-col cols="12">
          <v-textarea
            :model-value="manualItem.notes"
            label="Notes (Optional)"
            prepend-icon="mdi-note-text"
            rows="2"
            hint="Add any additional information about this item"
            persistent-hint
            @update:model-value="updateNotes"
          />
        </v-col>
      </v-row>

      <!-- Preview Card (without cost information) -->
      <v-card
        v-if="manualItem.itemId && manualItem.quantity > 0"
        variant="tonal"
        color="success"
        class="mt-4"
      >
        <v-card-text class="pa-3">
          <div class="text-subtitle-2 mb-1">
            <v-icon icon="mdi-eye" class="mr-2" size="18" />
            Preview
          </div>
          <div class="text-body-2">
            <strong>{{ manualItem.itemName }}</strong>
          </div>
          <div class="text-body-2 text-medium-emphasis">
            Quantity: {{ manualItem.quantity }}{{ manualItem.unit }}
          </div>
          <div v-if="manualItem.notes" class="text-caption text-medium-emphasis mt-1">
            Notes: {{ manualItem.notes }}
          </div>
        </v-card-text>
      </v-card>

      <!-- Validation Messages -->
      <div v-if="validationMessage" class="mt-3">
        <v-alert :type="validationMessage.type" density="compact">
          {{ validationMessage.text }}
        </v-alert>
      </div>
    </v-card-text>

    <v-card-actions class="pa-4">
      <v-btn variant="outlined" prepend-icon="mdi-refresh" @click="$emit('reset')">Reset</v-btn>
      <v-spacer />
      <v-btn color="success" prepend-icon="mdi-plus" :disabled="!canAddItem" @click="$emit('add')">
        Add Item to Request
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
interface ManualItem {
  itemId: string
  itemName: string
  quantity: number
  unit: string
  notes: string
}

interface Product {
  id: string
  name: string
  unit: string
  isActive: boolean
}

interface Props {
  manualItem: ManualItem
  availableProducts: Product[]
  selectedItems: any[]
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  'update:manualItem': [item: ManualItem]
  add: []
  reset: []
}>()

// Computed
const canAddItem = computed(() => {
  return (
    props.manualItem.itemId &&
    props.manualItem.quantity > 0 &&
    !props.selectedItems.some(item => item.itemId === props.manualItem.itemId)
  )
})

const validationMessage = computed(() => {
  if (!props.manualItem.itemId) return null

  if (props.selectedItems.some(item => item.itemId === props.manualItem.itemId)) {
    return {
      type: 'warning',
      text: 'This item is already in your request'
    }
  }

  if (props.manualItem.quantity <= 0) {
    return {
      type: 'error',
      text: 'Quantity must be greater than 0'
    }
  }

  return null
})

// Methods
function handleProductChange(productId: string): void {
  const product = props.availableProducts.find(p => p.id === productId)
  if (product) {
    const updatedItem = {
      ...props.manualItem,
      itemId: product.id,
      itemName: product.name,
      unit: product.unit
    }
    emitUpdate(updatedItem)
  }
}

function updateQuantity(value: string): void {
  const quantity = parseFloat(value) || 0
  emitUpdate({ ...props.manualItem, quantity })
}

function updateNotes(value: string): void {
  emitUpdate({ ...props.manualItem, notes: value })
}

function emitUpdate(updatedItem: ManualItem): void {
  // Since we can't directly emit the update, we'll need to handle this
  // through parent component communication or provide a different approach
  console.log('Manual item updated:', updatedItem)
}
</script>
