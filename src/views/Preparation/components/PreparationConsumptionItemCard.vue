<!-- src/views/preparation/components/PreparationConsumptionItemCard.vue -->
<template>
  <v-card variant="outlined" class="consumption-item-card" :class="getCardClass()">
    <v-card-text class="pa-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <div class="d-flex align-center">
          <div class="item-icon mr-3">🍲</div>
          <div>
            <div class="text-subtitle-1 font-weight-medium">
              {{ getPreparationName(modelValue.preparationId) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              Available: {{ availableStock }}{{ stockUnit }} | Cost:
              {{ formatCurrency(averageCost) }}/{{ stockUnit }}
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

      <!-- Stock Status Alert -->
      <v-alert
        v-if="stockAlert"
        :type="stockAlert.type"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        <v-icon :icon="stockAlert.icon" class="mr-1" />
        {{ stockAlert.message }}
      </v-alert>

      <v-row>
        <!-- Quantity -->
        <v-col cols="12" md="6">
          <v-text-field
            :model-value="modelValue.quantity"
            label="Quantity to Use"
            type="number"
            min="1"
            step="10"
            :max="availableStock"
            :rules="quantityRules"
            variant="outlined"
            density="compact"
            :suffix="stockUnit"
            :error="hasStockError"
            @update:model-value="updateQuantity"
          />
        </v-col>

        <!-- Estimated Cost (Read-only) -->
        <v-col cols="12" md="6">
          <v-text-field
            :model-value="formatCurrency(estimatedCost)"
            label="Estimated Cost (FIFO)"
            variant="outlined"
            density="compact"
            readonly
            :loading="calculatingCost"
          />
        </v-col>
      </v-row>

      <!-- FIFO Allocation Preview -->
      <div v-if="fifoAllocation && fifoAllocation.allocations.length > 0" class="mb-3">
        <div class="text-caption font-weight-medium mb-2">FIFO Allocation:</div>
        <div class="fifo-preview">
          <v-chip
            v-for="(allocation, index) in fifoAllocation.allocations"
            :key="index"
            size="small"
            variant="outlined"
            class="mr-1 mb-1"
          >
            {{ allocation.quantity }}{{ stockUnit }} @ {{ formatCurrency(allocation.costPerUnit) }}
          </v-chip>
        </div>
      </div>

      <!-- Insufficient Stock Warning -->
      <v-alert
        v-if="fifoAllocation && fifoAllocation.remainingQuantity > 0"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        <v-icon icon="mdi-alert-circle" class="mr-1" />
        Insufficient stock! Missing {{ fifoAllocation.remainingQuantity }}{{ stockUnit }}
      </v-alert>

      <!-- Shelf Life Warning -->
      <v-alert
        v-if="hasExpiringStock"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        <v-icon icon="mdi-clock-alert-outline" class="mr-1" />
        Some batches expire soon - use quickly!
      </v-alert>

      <!-- Notes -->
      <v-textarea
        :model-value="modelValue.notes"
        label="Usage Notes (optional)"
        variant="outlined"
        rows="2"
        density="compact"
        placeholder="Portion details, quality notes..."
        @update:model-value="updateNotes"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import type {
  PreparationConsumptionItem,
  PreparationDepartment,
  BatchAllocation
} from '@/stores/preparation'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PreparationConsumptionItemCard'

// Props
interface Props {
  modelValue: PreparationConsumptionItem
  department: PreparationDepartment
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: PreparationConsumptionItem]
  remove: []
  error: [message: string]
}>()

// Store
const preparationStore = usePreparationStore()

// State
const calculatingCost = ref(false)
const fifoAllocation = ref<{ allocations: BatchAllocation[]; remainingQuantity: number } | null>(
  null
)

// Computed
const balance = computed(() => {
  try {
    return preparationStore.getBalance(props.modelValue.preparationId, props.department)
  } catch (error) {
    return null
  }
})

const availableStock = computed(() => balance.value?.totalQuantity || 0)

const stockUnit = computed(() => {
  try {
    return preparationStore.getPreparationUnit(props.modelValue.preparationId)
  } catch (error) {
    return 'g'
  }
})

const averageCost = computed(() => balance.value?.averageCost || 0)

const estimatedCost = computed(() => {
  try {
    if (props.modelValue.quantity <= 0) return 0
    return preparationStore.calculateConsumptionCost(
      props.modelValue.preparationId,
      props.department,
      props.modelValue.quantity
    )
  } catch (error) {
    return 0
  }
})

const hasStockError = computed(() => {
  return props.modelValue.quantity > availableStock.value
})

const hasExpiringStock = computed(() => {
  return balance.value?.hasNearExpiry || balance.value?.hasExpired || false
})

const stockAlert = computed(() => {
  if (!balance.value) {
    return {
      type: 'error',
      icon: 'mdi-alert-circle',
      message: 'Preparation not found in inventory'
    }
  }

  if (balance.value.hasExpired) {
    return {
      type: 'error',
      icon: 'mdi-alert-circle',
      message: 'Contains expired batches - do not use!'
    }
  }

  if (balance.value.hasNearExpiry) {
    return {
      type: 'warning',
      icon: 'mdi-clock-alert-outline',
      message: 'Expires soon - use immediately'
    }
  }

  if (balance.value.belowMinStock) {
    return {
      type: 'info',
      icon: 'mdi-information',
      message: 'Low stock - consider producing more'
    }
  }

  return null
})

const quantityRules = computed(() => [
  (v: number) => !!v || 'Quantity is required',
  (v: number) => v > 0 || 'Quantity must be greater than 0',
  (v: number) =>
    v <= availableStock.value || `Only ${availableStock.value}${stockUnit.value} available`,
  (v: number) => {
    if (balance.value?.hasExpired) {
      return 'Cannot use expired preparations'
    }
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

function getCardClass(): string {
  if (balance.value?.hasExpired) return 'expired-preparation'
  if (balance.value?.hasNearExpiry) return 'expiring-preparation'
  if (hasStockError.value) return 'insufficient-stock'
  return 'available-preparation'
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

function calculateFifoAllocation() {
  try {
    if (props.modelValue.quantity <= 0) {
      fifoAllocation.value = null
      return
    }

    calculatingCost.value = true

    const allocation = preparationStore.calculateFifoAllocation(
      props.modelValue.preparationId,
      props.department,
      props.modelValue.quantity
    )

    fifoAllocation.value = allocation

    if (allocation.remainingQuantity > 0) {
      emit('error', `Insufficient stock for ${getPreparationName(props.modelValue.preparationId)}`)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to calculate FIFO allocation', { error })
    emit('error', 'Failed to calculate cost allocation')
  } finally {
    calculatingCost.value = false
  }
}

// Watch for quantity changes
watch(
  () => props.modelValue.quantity,
  () => {
    calculateFifoAllocation()
  },
  { immediate: true }
)

// Watch for preparation changes
watch(
  () => props.modelValue.preparationId,
  () => {
    calculateFifoAllocation()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.consumption-item-card {
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.available-preparation {
    border-left: 4px solid rgb(var(--v-theme-success));
  }

  &.expiring-preparation {
    border-left: 4px solid rgb(var(--v-theme-warning));
    background-color: rgba(var(--v-theme-warning), 0.02);
  }

  &.expired-preparation {
    border-left: 4px solid rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.02);
  }

  &.insufficient-stock {
    border-left: 4px solid rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.02);
  }

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
    background: rgba(var(--v-theme-primary), 0.05);
    padding: 8px;
    border-radius: 6px;
    border: 1px solid rgba(var(--v-theme-primary), 0.2);
  }
}
</style>
