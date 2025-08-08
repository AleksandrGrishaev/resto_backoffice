<!-- src/views/preparation/components/PreparationProductionItemCard.vue -->
<template>
  <v-card variant="outlined" class="production-item-card">
    <v-card-text class="pa-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="d-flex align-center">
          <div class="item-icon mr-3">🍲</div>
          <div>
            <div class="text-subtitle-1 font-weight-medium">
              {{ getPreparationName(modelValue.preparationId) }}
            </div>
            <div class="text-caption text-medium-emphasis">Preparation</div>
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
            min="1"
            step="50"
            :rules="quantityRules"
            variant="outlined"
            density="compact"
            suffix="g"
            @update:model-value="updateQuantity"
          />
        </v-col>

        <!-- Cost per Unit -->
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="modelValue.costPerUnit"
            label="Cost per gram"
            type="number"
            min="0"
            step="1"
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
            label="Expiry Date"
            type="datetime-local"
            variant="outlined"
            density="compact"
            :rules="expiryRules"
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
              {{ modelValue.quantity }}g × {{ formatCurrency(modelValue.costPerUnit) }}
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
        label="Production Notes (optional)"
        variant="outlined"
        rows="2"
        density="compact"
        class="mt-3"
        placeholder="Recipe notes, batch info, special instructions..."
        @update:model-value="updateNotes"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import type { PreparationReceiptItem } from '@/stores/preparation'

// Props
interface Props {
  modelValue: PreparationReceiptItem
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: PreparationReceiptItem]
  remove: []
}>()

// Store
const preparationStore = usePreparationStore()

// Computed
const totalCost = computed(() => props.modelValue.quantity * props.modelValue.costPerUnit)

const quantityRules = computed(() => [
  (v: number) => !!v || 'Quantity is required',
  (v: number) => v > 0 || 'Quantity must be greater than 0'
])

const costRules = computed(() => [(v: number) => v >= 0 || 'Cost cannot be negative'])

const expiryRules = computed(() => [
  (v: string) => {
    if (!v) return 'Expiry date is required for preparations'
    const expiry = new Date(v)
    const now = new Date()
    const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (diffHours <= 0) return 'Expiry date must be in the future'
    if (diffHours > 72) return 'Preparations typically last max 3 days'
    return true
  }
])

// Methods
function getPreparationName(preparationId: string): string {
  try {
    return preparationStore.getPreparationName(preparationId)
  } catch (error) {
    return preparationId
  }
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
.production-item-card {
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
