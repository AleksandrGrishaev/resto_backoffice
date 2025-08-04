<!-- src/views/storage/components/ConsumptionItemCard.vue -->
<template>
  <v-card variant="outlined" class="consumption-item-card">
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

      <!-- Available Stock -->
      <div class="mb-3">
        <div class="text-caption text-medium-emphasis mb-1">Available Stock</div>
        <div class="d-flex align-center">
          <v-icon :icon="stockStatus.icon" :color="stockStatus.color" size="16" class="mr-1" />
          <span :class="`text-${stockStatus.color}`">{{ availableQuantity }} {{ stockUnit }}</span>
        </div>
      </div>

      <!-- Quantity Input -->
      <div class="mb-3">
        <v-text-field
          :model-value="modelValue.quantity"
          label="Consume Quantity"
          type="number"
          min="0.01"
          step="0.01"
          :max="availableQuantity"
          :rules="quantityRules"
          variant="outlined"
          density="compact"
          :suffix="stockUnit"
          @update:model-value="updateQuantity"
        />
      </div>

      <!-- FIFO Preview -->
      <div v-if="fifoPreview.length > 0" class="mb-3">
        <div class="text-caption text-medium-emphasis mb-2">FIFO Allocation:</div>
        <div class="fifo-preview">
          <div
            v-for="allocation in fifoPreview"
            :key="allocation.batchId"
            class="d-flex justify-space-between text-caption"
          >
            <span>{{ allocation.quantity }} {{ stockUnit }} from {{ allocation.batchNumber }}</span>
            <span class="font-weight-medium">
              {{ formatCurrency(allocation.quantity * allocation.costPerUnit) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Cost Information -->
      <div class="cost-info">
        <v-divider class="mb-2" />
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="text-body-2 font-weight-medium">Total Cost:</div>
            <div class="text-caption text-medium-emphasis">Based on FIFO calculation</div>
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

      <!-- Warning Messages -->
      <v-alert v-if="insufficientStock" type="error" variant="tonal" density="compact" class="mt-2">
        Insufficient stock! Available: {{ availableQuantity }} {{ stockUnit }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStorageStore } from '@/stores/storage'
import type { ConsumptionItem, StorageDepartment } from '@/stores/storage'

// Props
interface Props {
  modelValue: ConsumptionItem
  department: StorageDepartment
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: ConsumptionItem]
  remove: []
}>()

// Store
const storageStore = useStorageStore()

// Computed
const balance = computed(() =>
  storageStore.state.balances.find(
    b =>
      b.itemId === props.modelValue.itemId &&
      b.itemType === props.modelValue.itemType &&
      b.department === props.department
  )
)

const availableQuantity = computed(() => balance.value?.totalQuantity || 0)
const stockUnit = computed(() => balance.value?.unit || 'unit')

const insufficientStock = computed(() => props.modelValue.quantity > availableQuantity.value)

const stockStatus = computed(() => {
  if (insufficientStock.value) {
    return { icon: 'mdi-alert-circle', color: 'error' }
  }
  if (availableQuantity.value < 2) {
    return { icon: 'mdi-alert', color: 'warning' }
  }
  return { icon: 'mdi-check-circle', color: 'success' }
})

const fifoPreview = computed(() => {
  try {
    const result = storageStore.calculateFifoAllocation(
      props.modelValue.itemId,
      props.modelValue.itemType,
      props.department,
      props.modelValue.quantity
    )
    return result.allocations
  } catch {
    return []
  }
})

const totalCost = computed(() => {
  try {
    return storageStore.calculateConsumptionCost(
      props.modelValue.itemId,
      props.modelValue.itemType,
      props.department,
      props.modelValue.quantity
    )
  } catch {
    return 0
  }
})

const quantityRules = computed(() => [
  (v: number) => !!v || 'Quantity is required',
  (v: number) => v > 0 || 'Quantity must be greater than 0',
  (v: number) => v <= availableQuantity.value || `Maximum available: ${availableQuantity.value}`
])

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

function updateNotes(notes: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    notes
  })
}
</script>

<style lang="scss" scoped>
.consumption-item-card {
  .item-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 8px;
  }

  .fifo-preview {
    background: rgba(var(--v-theme-surface), 0.5);
    border-radius: 4px;
    padding: 8px;
    border: 1px solid rgba(var(--v-theme-outline), 0.2);
  }

  .cost-info {
    background: rgba(var(--v-theme-primary), 0.05);
    border-radius: 8px;
    padding: 12px;
    margin-top: 8px;
  }
}
</style>
