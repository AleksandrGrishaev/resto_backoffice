<!-- src/views/preparation/components/writeoff/PreparationQuantityDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-delete-sweep" class="mr-2" color="error" />
        Write Off: {{ preparation?.name }}
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- Preparation Info -->
        <div class="mb-4">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-body-2 text-medium-emphasis">Total Stock:</span>
            <span class="text-h6 font-weight-bold">
              {{ preparationStock }} {{ preparationUnit }}
            </span>
          </div>

          <!-- Stock breakdown with preparation-specific alerts -->
          <div v-if="stockBreakdown" class="stock-breakdown mb-3">
            <v-card variant="outlined" class="pa-3">
              <div class="text-subtitle-2 font-weight-bold mb-2">Stock Breakdown:</div>

              <div
                v-if="stockBreakdown.expired > 0"
                class="d-flex justify-space-between align-center mb-1"
              >
                <span class="text-body-2">
                  <v-icon icon="mdi-alert-circle" color="error" size="16" class="mr-1" />
                  Expired:
                </span>
                <span class="text-body-2 font-weight-bold text-error">
                  {{ formatQuantity(stockBreakdown.expired) }} {{ preparationUnit }}
                </span>
              </div>

              <div
                v-if="stockBreakdown.expiring > 0"
                class="d-flex justify-space-between align-center mb-1"
              >
                <span class="text-body-2">
                  <v-icon icon="mdi-clock-alert" color="warning" size="16" class="mr-1" />
                  Expiring Soon:
                </span>
                <span class="text-body-2 font-weight-bold text-warning">
                  {{ formatQuantity(stockBreakdown.expiring) }} {{ preparationUnit }}
                </span>
              </div>

              <div
                v-if="stockBreakdown.fresh > 0"
                class="d-flex justify-space-between align-center"
              >
                <span class="text-body-2">
                  <v-icon icon="mdi-check-circle" color="success" size="16" class="mr-1" />
                  Fresh:
                </span>
                <span class="text-body-2 font-weight-bold text-success">
                  {{ formatQuantity(stockBreakdown.fresh) }} {{ preparationUnit }}
                </span>
              </div>
            </v-card>
          </div>

          <div v-if="hasExpiryIssues" class="mb-3">
            <v-alert :type="expiryAlertType" variant="tonal" density="compact">
              {{ expiryDescription }}
            </v-alert>
          </div>
        </div>

        <!-- Quantity input with better validation -->
        <v-text-field
          v-model.number="quantityToWriteOff"
          type="number"
          :label="`Quantity to write off (${preparationUnit})`"
          variant="outlined"
          min="0"
          :max="preparationStock"
          step="0.1"
          :rules="quantityRules"
          :error-messages="quantityErrorMessages"
          class="mb-4"
          @blur="validateQuantity"
          @input="clearQuantityError"
        />

        <!-- Notes input -->
        <v-textarea
          v-model="notes"
          label="Notes (optional)"
          variant="outlined"
          rows="2"
          placeholder="Reason for write-off, condition, etc..."
          class="mb-4"
          hide-details
        />

        <!-- Quick buttons for preparations -->
        <div class="quick-buttons">
          <v-btn-group variant="outlined" divided class="w-100 mb-2">
            <v-btn
              :disabled="!hasExpiredStock"
              class="flex-1"
              :title="
                hasExpiredStock
                  ? `Write off ${formatQuantity(stockBreakdown?.expired || 0)} ${preparationUnit} expired stock`
                  : 'No expired stock available'
              "
              @click="setQuantity('expired')"
            >
              <v-icon icon="mdi-clock-alert" class="mr-1" />
              Expired Only
              <v-chip v-if="hasExpiredStock" size="x-small" class="ml-1">
                {{ formatQuantity(stockBreakdown?.expired || 0) }}
              </v-chip>
            </v-btn>
            <v-btn
              :disabled="!hasExpiringStock"
              class="flex-1"
              :title="
                hasExpiringStock
                  ? `Write off ${formatQuantity(stockBreakdown?.expiring || 0)} ${preparationUnit} expiring stock`
                  : 'No expiring stock available'
              "
              @click="setQuantity('expiring')"
            >
              <v-icon icon="mdi-clock-outline" class="mr-1" />
              Expiring Soon
              <v-chip v-if="hasExpiringStock" size="x-small" class="ml-1">
                {{ formatQuantity(stockBreakdown?.expiring || 0) }}
              </v-chip>
            </v-btn>
          </v-btn-group>

          <v-btn-group variant="outlined" divided class="w-100">
            <v-btn class="flex-1" @click="setQuantity('half')">
              <v-icon icon="mdi-circle-half-full" class="mr-1" />
              Half Stock
              <v-chip size="x-small" class="ml-1">
                {{ formatQuantity(preparationStock * 0.5) }}
              </v-chip>
            </v-btn>
            <v-btn class="flex-1" @click="setQuantity('all')">
              <v-icon icon="mdi-select-all" class="mr-1" />
              All Stock
              <v-chip size="x-small" class="ml-1">
                {{ formatQuantity(preparationStock) }}
              </v-chip>
            </v-btn>
          </v-btn-group>
        </div>

        <!-- Cost preview -->
        <div v-if="quantityToWriteOff > 0" class="cost-preview mt-4">
          <v-card variant="tonal" color="error" class="pa-3">
            <div class="text-subtitle-2 font-weight-bold">Write-off Cost Preview</div>
            <div class="text-h6">{{ formatIDR(writeOffCost) }}</div>
            <div class="text-body-2 text-medium-emphasis mt-1">
              Unit cost: {{ formatIDR(averageUnitCost) }}/{{ preparationUnit }}
            </div>
          </v-card>
        </div>

        <!-- Stock validation warning -->
        <v-alert
          v-if="quantityToWriteOff > preparationStock"
          type="error"
          variant="tonal"
          class="mt-3"
          density="compact"
        >
          <template #prepend>
            <v-icon icon="mdi-alert-triangle" />
          </template>
          <strong>Insufficient Stock!</strong>
          You're trying to write off {{ formatQuantity(quantityToWriteOff) }} {{ preparationUnit }},
          but only {{ formatQuantity(preparationStock) }} {{ preparationUnit }} is available.
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn color="error" variant="flat" :disabled="!isQuantityValid" @click="handleConfirm">
          Write Off
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import { formatIDR } from '@/utils/currency'
import { DebugUtils } from '@/utils'
import type { PreparationDepartment } from '@/stores/preparation/types'

const MODULE_NAME = 'PreparationQuantityDialog'

interface Preparation {
  id: string
  name: string
  unit: string
  type?: string
}

interface Props {
  modelValue: boolean
  preparation: Preparation | null
  department: PreparationDepartment
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:model-value': [boolean]
  confirm: [preparation: Preparation, quantity: number, notes: string]
  cancel: []
}>()

// Store
const preparationStore = usePreparationStore()

// State
const quantityToWriteOff = ref(0)
const notes = ref('')
const quantityError = ref('')

// Computed properties with null safety
const preparationBalance = computed(() => {
  if (!props.preparation) return null
  return preparationStore.getBalance(props.preparation.id, props.department)
})

const preparationStock = computed(() => {
  return preparationBalance.value?.totalQuantity || 0
})

const preparationUnit = computed(() => {
  return preparationBalance.value?.unit || props.preparation?.unit || 'gram'
})

const averageUnitCost = computed(() => {
  return preparationBalance.value?.averageCost || 0
})

// Stock breakdown calculation for preparations
const stockBreakdown = computed(() => {
  const balance = preparationBalance.value
  if (!balance || !balance.batches || balance.batches.length === 0) {
    return null
  }

  const now = new Date()
  let expired = 0
  let expiring = 0
  let fresh = 0

  balance.batches.forEach(batch => {
    if (!batch.expiryDate) {
      fresh += batch.currentQuantity
      return
    }

    const expiryDate = new Date(batch.expiryDate)
    const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays < 0) {
      expired += batch.currentQuantity
    } else if (diffDays <= 1) {
      // Preparations expire faster (1 day)
      expiring += batch.currentQuantity
    } else {
      fresh += batch.currentQuantity
    }
  })

  return {
    expired: Math.round(expired * 100) / 100,
    expiring: Math.round(expiring * 100) / 100,
    fresh: Math.round(fresh * 100) / 100
  }
})

const hasExpiryIssues = computed(() => {
  return preparationBalance.value?.hasExpired || preparationBalance.value?.hasNearExpiry || false
})

const hasExpiredStock = computed(() => {
  return (stockBreakdown.value?.expired || 0) > 0
})

const hasExpiringStock = computed(() => {
  return (stockBreakdown.value?.expiring || 0) > 0
})

const expiryAlertType = computed((): 'error' | 'warning' | 'info' => {
  if (preparationBalance.value?.hasExpired) return 'error'
  if (preparationBalance.value?.hasNearExpiry) return 'warning'
  return 'info'
})

const expiryDescription = computed(() => {
  if (preparationBalance.value?.hasExpired) {
    return 'This preparation has expired and should be written off immediately'
  }
  if (preparationBalance.value?.hasNearExpiry) {
    return 'This preparation is expiring soon and should be used or written off'
  }
  return 'Preparation is fresh'
})

// Validation
const quantityRules = computed(() => [
  (v: number) => v >= 0 || 'Quantity must be positive',
  (v: number) =>
    v <= preparationStock.value ||
    `Cannot exceed available stock (${formatQuantity(preparationStock.value)} ${preparationUnit.value})`
])

const quantityErrorMessages = computed(() => {
  if (quantityError.value) return [quantityError.value]
  return []
})

const isQuantityValid = computed(() => {
  return (
    quantityToWriteOff.value > 0 &&
    quantityToWriteOff.value <= preparationStock.value &&
    !quantityError.value
  )
})

const writeOffCost = computed(() => {
  if (!props.preparation || quantityToWriteOff.value <= 0) return 0

  try {
    return preparationStore.calculateCorrectionCost(
      props.preparation.id,
      props.department,
      quantityToWriteOff.value
    )
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off cost', { error })
    return quantityToWriteOff.value * averageUnitCost.value
  }
})

// Helper functions
function formatQuantity(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function validateQuantity() {
  if (quantityToWriteOff.value > preparationStock.value) {
    quantityError.value = `Exceeds available stock by ${formatQuantity(quantityToWriteOff.value - preparationStock.value)} ${preparationUnit.value}`
  } else {
    quantityError.value = ''
  }
}

function clearQuantityError() {
  quantityError.value = ''
}

// Quantity setting with validation
function setQuantity(type: 'expired' | 'expiring' | 'half' | 'all') {
  if (!props.preparation) return

  const stock = preparationStock.value
  const breakdown = stockBreakdown.value

  let newQuantity = 0

  switch (type) {
    case 'expired':
      newQuantity = breakdown?.expired || 0
      break
    case 'expiring':
      newQuantity = breakdown?.expiring || 0
      break
    case 'half':
      newQuantity = Math.round(stock * 0.5 * 100) / 100
      break
    case 'all':
      newQuantity = stock
      break
  }

  // Ensure we don't exceed available stock
  quantityToWriteOff.value = Math.min(newQuantity, stock)
  clearQuantityError()

  DebugUtils.debug(MODULE_NAME, 'Quantity set', {
    type,
    requestedQuantity: newQuantity,
    actualQuantity: quantityToWriteOff.value,
    stock,
    breakdown
  })
}

function handleConfirm() {
  if (!props.preparation || !isQuantityValid.value) return

  // Final validation before confirm
  if (quantityToWriteOff.value > preparationStock.value) {
    quantityError.value = 'Cannot write off more than available stock'
    return
  }

  DebugUtils.info(MODULE_NAME, 'Confirming preparation write-off', {
    preparationId: props.preparation.id,
    quantity: quantityToWriteOff.value,
    availableStock: preparationStock.value,
    cost: writeOffCost.value,
    notes: notes.value
  })

  emit('confirm', props.preparation, quantityToWriteOff.value, notes.value)
  resetDialog()
}

function handleCancel() {
  DebugUtils.debug(MODULE_NAME, 'Preparation write-off cancelled', {
    preparationId: props.preparation?.id,
    preparationName: props.preparation?.name
  })

  emit('cancel')
  resetDialog()
}

function resetDialog() {
  quantityToWriteOff.value = 0
  notes.value = ''
  quantityError.value = ''
}

// Watchers
watch(
  () => props.preparation,
  newPreparation => {
    if (newPreparation) {
      resetDialog()
      DebugUtils.debug(MODULE_NAME, 'Preparation changed', {
        preparationId: newPreparation.id,
        preparationName: newPreparation.name,
        availableStock: preparationStock.value
      })
    }
  }
)

watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen && props.preparation) {
      resetDialog()

      // Auto-suggest quantity based on stock breakdown
      const breakdown = stockBreakdown.value
      if (breakdown?.expired > 0) {
        setQuantity('expired')
        notes.value = 'Automatic write-off: expired preparation'
      } else if (breakdown?.expiring > 0) {
        setQuantity('expiring')
        notes.value = 'Write-off: preparation expiring soon'
      }

      DebugUtils.debug(MODULE_NAME, 'Dialog opened', {
        preparationId: props.preparation.id,
        stockBreakdown: breakdown,
        autoSuggestedQuantity: quantityToWriteOff.value
      })
    }
  }
)

// Watch for quantity changes to clear errors
watch(quantityToWriteOff, () => {
  clearQuantityError()
})
</script>

<style lang="scss" scoped>
.quick-buttons {
  .v-btn-group {
    .v-btn {
      text-transform: none;
      font-size: 0.875rem;

      &.flex-1 {
        flex: 1;
      }

      &:disabled {
        opacity: 0.5;
      }

      .v-chip {
        font-size: 0.7rem;
        height: 18px;
      }
    }
  }
}

.cost-preview {
  border-radius: 8px;

  .text-subtitle-2 {
    margin-bottom: 4px;
  }
}

.stock-breakdown {
  .v-card {
    border: 1px solid rgba(var(--v-theme-outline), 0.2);

    .text-subtitle-2 {
      color: rgb(var(--v-theme-on-surface));
    }
  }
}

/* Responsive improvements */
@media (max-width: 600px) {
  .quick-buttons {
    .v-btn-group {
      .v-btn {
        font-size: 0.75rem;
        padding: 0 8px;

        .v-icon {
          margin-right: 4px !important;
        }

        .v-chip {
          font-size: 0.65rem;
          height: 16px;
        }
      }
    }
  }

  .stock-breakdown {
    .d-flex {
      font-size: 0.875rem;
    }
  }
}
</style>
