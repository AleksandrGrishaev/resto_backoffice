<!-- src/views/storage/components/ReceiptItemCard.vue -->
<template>
  <v-card variant="outlined" class="receipt-item-card">
    <v-card-text class="pa-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="d-flex align-center">
          <div class="item-icon mr-3">
            {{ getItemIcon(modelValue.itemType) }}
          </div>
          <div>
            <div class="text-subtitle-1 font-weight-medium">
              {{ getItemName(modelValue.itemId) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formatItemType(modelValue.itemType) }}
            </div>
          </div>
        </div>

        <v-btn
          icon="mdi-close"
          size="small"
          variant="text"
          color="error"
          @click="$emit('remove')"
        />
      </div>

      <v-row>
        <!-- Quantity -->
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="modelValue.quantity"
            label="Quantity"
            type="number"
            min="0.01"
            step="0.01"
            :rules="quantityRules"
            variant="outlined"
            density="compact"
            @update:model-value="updateQuantity"
          />
        </v-col>

        <!-- Cost per Unit -->
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="modelValue.costPerUnit"
            label="Cost per Unit"
            type="number"
            min="0"
            step="1000"
            :rules="costRules"
            variant="outlined"
            density="compact"
            prefix="Rp"
            @update:model-value="updateCostPerUnit"
          />
        </v-col>

        <!-- Expiry Date -->
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="modelValue.expiryDate"
            label="Expiry Date (optional)"
            type="date"
            variant="outlined"
            density="compact"
            @update:model-value="updateExpiryDate"
          />
        </v-col>
      </v-row>

      <!-- Total Cost Display -->
      <div class="total-cost-section">
        <v-divider class="mb-3" />
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="text-body-2 font-weight-medium">Total Cost:</div>
            <div class="text-caption text-medium-emphasis">
              {{ modelValue.quantity }} × {{ formatCurrency(modelValue.costPerUnit) }}
            </div>
          </div>
          <div class="text-h6 font-weight-bold text-primary">
            {{ formatCurrency(totalCost) }}
          </div>
        </div>
      </div>

      <!-- Notes -->
      <v-textarea
        :model-value="modelValue.notes"
        label="Notes (optional)"
        variant="outlined"
        rows="2"
        density="compact"
        class="mt-3"
        @update:model-value="updateNotes"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReceiptItem } from '@/stores/storage'

// Props
interface Props {
  modelValue: ReceiptItem
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: ReceiptItem]
  remove: []
}>()

// Computed
const totalCost = computed(() => props.modelValue.quantity * props.modelValue.costPerUnit)

const quantityRules = computed(() => [
  (v: number) => !!v || 'Quantity is required',
  (v: number) => v > 0 || 'Quantity must be greater than 0'
])

const costRules = computed(() => [(v: number) => v >= 0 || 'Cost cannot be negative'])

// Methods
function getItemIcon(itemType: 'product' | 'preparation'): string {
  return itemType === 'product' ? '🥩' : '🍲'
}

function formatItemType(itemType: 'product' | 'preparation'): string {
  return itemType === 'product' ? 'Product' : 'Preparation'
}

function getItemName(itemId: string): string {
  // Mock function - in real app, get from Product/Recipe store
  const mockNames: Record<string, string> = {
    'beef-steak': 'Beef Steak',
    potato: 'Potato',
    garlic: 'Garlic',
    vodka: 'Vodka',
    beer: 'Beer',
    'beef-rendang-prep': 'Beef Rendang (Prepared)'
  }
  return mockNames[itemId] || itemId
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function updateQuantity(value: string | number) {
  const quantity = typeof value === 'string' ? parseFloat(value) : value
  emit('update:modelValue', {
    ...props.modelValue,
    quantity: quantity || 0
  })
}

function updateCostPerUnit(value: string | number) {
  const costPerUnit = typeof value === 'string' ? parseFloat(value) : value
  emit('update:modelValue', {
    ...props.modelValue,
    costPerUnit: costPerUnit || 0
  })
}

function updateExpiryDate(value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    expiryDate: value || undefined
  })
}

function updateNotes(notes: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    notes
  })
}
</script>

<style lang="scss" scoped>
.receipt-item-card {
  .item-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-success), 0.1);
    border-radius: 8px;
  }

  .total-cost-section {
    background: rgba(var(--v-theme-success), 0.05);
    border-radius: 8px;
    padding: 12px;
    margin-top: 8px;
  }
}
</style>
