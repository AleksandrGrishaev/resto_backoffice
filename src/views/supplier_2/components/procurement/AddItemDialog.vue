<!-- src/views/supplier_2/components/procurement/AddItemDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="500px" persistent>
    <v-card>
      <v-card-title class="pa-4">
        <span class="text-h6">Add Item to Request</span>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-row>
          <!-- Item Selection -->
          <v-col cols="12">
            <v-select
              v-model="selectedItemId"
              :items="availableItems"
              item-title="name"
              item-value="id"
              label="Select Item"
              :rules="[rules.required]"
              variant="outlined"
              return-object
              @update:model-value="handleItemSelection"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <v-avatar size="32" color="primary">
                      <v-icon>{{ getCategoryIcon(item.raw.category) }}</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ item.raw.category }} • {{ item.raw.unit }}
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>
          </v-col>

          <!-- Quantity -->
          <v-col cols="6">
            <v-text-field
              v-model.number="quantity"
              type="number"
              label="Quantity"
              min="1"
              step="1"
              :rules="[rules.required, rules.positive]"
              variant="outlined"
            />
          </v-col>

          <!-- Unit (readonly) -->
          <v-col cols="6">
            <v-text-field
              :value="selectedItem?.unit || ''"
              label="Unit"
              readonly
              variant="outlined"
            />
          </v-col>

          <!-- Notes -->
          <v-col cols="12">
            <v-text-field v-model="notes" label="Notes (Optional)" variant="outlined" />
          </v-col>

          <!-- Preview -->
          <v-col v-if="selectedItem" cols="12">
            <v-card variant="tonal" color="primary">
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="text-subtitle-2 font-weight-bold">{{ selectedItem.name }}</div>
                    <div class="text-body-2">{{ quantity }} {{ selectedItem.unit }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-caption">Estimated Price</div>
                    <div class="text-subtitle-2 font-weight-bold">
                      {{ formatCurrency(getEstimatedPrice(selectedItem.id) * quantity) }}
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn color="grey" variant="outlined" @click="cancel">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!isValid" @click="addItem">Add Item</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RequestItem } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  department?: 'kitchen' | 'bar'
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'item-added', item: RequestItem): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// LOCAL STATE
// =============================================

const selectedItemId = ref<any>(null)
const quantity = ref(1)
const notes = ref('')

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const selectedItem = computed(() => {
  return selectedItemId.value
})

// Mock available items based on department
const availableItems = computed(() => {
  const kitchenItems = [
    { id: 'prod-beef-steak', name: 'Beef Steak', category: 'meat', unit: 'kg' },
    { id: 'prod-chicken-breast', name: 'Chicken Breast', category: 'meat', unit: 'kg' },
    { id: 'prod-potato', name: 'Potato', category: 'vegetables', unit: 'kg' },
    { id: 'prod-tomato', name: 'Tomato', category: 'vegetables', unit: 'kg' },
    { id: 'prod-onion', name: 'Onion', category: 'vegetables', unit: 'kg' },
    { id: 'prod-garlic', name: 'Garlic', category: 'vegetables', unit: 'kg' },
    { id: 'prod-butter', name: 'Butter', category: 'dairy', unit: 'kg' },
    { id: 'prod-rice', name: 'Rice', category: 'grains', unit: 'kg' }
  ]

  const barItems = [
    {
      id: 'prod-beer-bintang-330',
      name: 'Bintang Beer 330ml',
      category: 'beverages',
      unit: 'bottle'
    },
    { id: 'prod-cola-330', name: 'Coca-Cola 330ml', category: 'beverages', unit: 'bottle' }
  ]

  if (props.department === 'bar') {
    return barItems
  } else if (props.department === 'kitchen') {
    return kitchenItems
  } else {
    return [...kitchenItems, ...barItems]
  }
})

const isValid = computed(() => {
  return selectedItem.value && quantity.value > 0
})

// =============================================
// VALIDATION RULES
// =============================================

const rules = {
  required: (value: any) => !!value || 'This field is required',
  positive: (value: number) => value > 0 || 'Quantity must be greater than 0'
}

// =============================================
// WATCHERS
// =============================================

// Reset form when dialog opens
watch(isOpen, newValue => {
  if (newValue) {
    resetForm()
  }
})

// =============================================
// METHODS
// =============================================

function resetForm() {
  selectedItemId.value = null
  quantity.value = 1
  notes.value = ''
}

function handleItemSelection(item: any) {
  selectedItemId.value = item
}

function cancel() {
  isOpen.value = false
}

function addItem() {
  if (!isValid.value) return

  const newItem: RequestItem = {
    id: `temp-${Date.now()}`, // temporary ID
    itemId: selectedItem.value.id,
    itemName: selectedItem.value.name,
    requestedQuantity: quantity.value,
    unit: selectedItem.value.unit,
    notes: notes.value || undefined
  }

  emits('item-added', newItem)
  isOpen.value = false
}

// =============================================
// HELPER METHODS
// =============================================

function getCategoryIcon(category: string): string {
  const icons = {
    meat: 'mdi-food-steak',
    vegetables: 'mdi-carrot',
    beverages: 'mdi-bottle-soda',
    dairy: 'mdi-bottle-wine',
    grains: 'mdi-grain'
  }
  return icons[category as keyof typeof icons] || 'mdi-package-variant'
}

function getEstimatedPrice(itemId: string): number {
  const prices: Record<string, number> = {
    'prod-beef-steak': 180000,
    'prod-potato': 8000,
    'prod-garlic': 25000,
    'prod-tomato': 12000,
    'prod-beer-bintang-330': 12000,
    'prod-cola-330': 8000,
    'prod-butter': 45000,
    'prod-chicken-breast': 85000,
    'prod-onion': 15000,
    'prod-rice': 12000
  }
  return prices[itemId] || 0
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}
</script>
