<!-- src/views/pos/order/dialogs/BillDiscountDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">Apply Bill Discount</v-card-title>

      <v-card-text class="pa-4">
        <v-row v-if="bill">
          <!-- LEFT COLUMN: Bill Info + Preview + Allocation -->
          <v-col cols="12" md="6" class="preview-column pr-md-4">
            <!-- Bill Info (Compact) -->
            <div class="bill-info-card pa-2 mb-3 rounded">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-body-2 font-weight-medium">{{ bill.name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ bill.items.filter(i => i.status !== 'cancelled').length }} items
                  </div>
                </div>
                <div>
                  <div class="text-subtitle-1 font-weight-bold text-right">
                    {{ formatIDR(billSubtotal) }}
                  </div>
                  <div class="text-caption text-medium-emphasis text-right">
                    (after product discounts)
                  </div>
                </div>
              </div>
            </div>

            <!-- Preview Summary (Compact) -->
            <v-card variant="tonal" color="primary" class="mb-3">
              <v-card-text class="pa-2">
                <div class="text-caption text-medium-emphasis mb-1">Preview</div>
                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption">Bill Subtotal:</span>
                  <span class="text-caption">{{ formatIDR(billSubtotal) }}</span>
                </div>
                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption text-error">Discount:</span>
                  <span class="text-caption text-error font-weight-medium">
                    -{{ formatIDR(discountAmount) }}
                  </span>
                </div>
                <v-divider class="my-1" />
                <div class="d-flex justify-space-between align-center">
                  <span class="text-body-2 font-weight-bold">After Discount:</span>
                  <span class="text-subtitle-1 font-weight-bold">
                    {{ formatIDR(afterDiscount) }}
                  </span>
                </div>

                <!-- Tax breakdown -->
                <div
                  v-if="taxBreakdown.length > 0"
                  class="mt-1 pt-1"
                  style="border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12)"
                >
                  <div
                    v-for="tax in taxBreakdown"
                    :key="tax.taxId"
                    class="d-flex justify-space-between align-center text-caption"
                  >
                    <span>{{ tax.name }} ({{ tax.percentage }}%)</span>
                    <span>+{{ formatIDR(tax.amount) }}</span>
                  </div>
                  <div class="d-flex justify-space-between align-center mt-1">
                    <span class="text-caption font-weight-medium">Total with Taxes:</span>
                    <span class="text-caption font-weight-bold">
                      {{ formatIDR(totalWithTaxes) }}
                    </span>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Allocation Preview (Always visible, scrollable) -->
            <div class="allocation-section">
              <div class="d-flex align-center mb-2">
                <v-icon size="small" class="mr-1">mdi-chart-pie</v-icon>
                <span class="text-caption font-weight-medium">
                  Per-item Allocation ({{ activeItems.length }} items)
                </span>
              </div>
              <div class="allocation-list">
                <div
                  v-for="item in allocationPreview"
                  :key="item.itemId"
                  class="allocation-row d-flex justify-space-between align-center py-1"
                >
                  <div class="flex-grow-1">
                    <div class="text-caption">{{ item.name }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatIDR(item.itemAmount) }}
                    </div>
                  </div>
                  <div class="text-center mx-2" style="min-width: 50px">
                    <span class="text-caption font-weight-medium">
                      {{ (item.proportion * 100).toFixed(1) }}%
                    </span>
                  </div>
                  <div class="text-right" style="min-width: 80px">
                    <span class="text-caption text-error font-weight-medium">
                      -{{ formatIDR(item.allocatedDiscount) }}
                    </span>
                  </div>
                </div>

                <!-- Verification sum -->
                <v-divider class="my-1" />
                <div class="d-flex justify-space-between align-center">
                  <span class="text-caption font-weight-bold">Total:</span>
                  <div class="d-flex align-center gap-1">
                    <span class="text-caption font-weight-bold text-error">
                      -{{ formatIDR(totalAllocated) }}
                    </span>
                    <v-icon
                      v-if="Math.abs(totalAllocated - discountAmount) < 0.01"
                      color="success"
                      size="small"
                    >
                      mdi-check-circle
                    </v-icon>
                  </div>
                </div>
              </div>
            </div>
          </v-col>

          <!-- RIGHT COLUMN: Discount Controls -->
          <v-col cols="12" md="6" class="controls-column pl-md-4">
            <!-- Discount Type Toggle (Compact) -->
            <div class="mb-3">
              <label class="text-caption font-weight-medium mb-1 d-block">Discount Type</label>
              <v-btn-toggle
                v-model="discountType"
                mandatory
                color="primary"
                density="compact"
                class="w-100"
              >
                <v-btn value="percentage" class="flex-grow-1" size="small">
                  <v-icon start size="small">mdi-percent</v-icon>
                  <span class="text-caption">%</span>
                </v-btn>
                <v-btn value="fixed" class="flex-grow-1" size="small">
                  <v-icon start size="small">mdi-currency-usd</v-icon>
                  <span class="text-caption">Fixed</span>
                </v-btn>
              </v-btn-toggle>
            </div>

            <!-- Value Input (Compact) - Tablet-friendly -->
            <NumericInputField
              v-model="discountValue"
              :label="discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'"
              :suffix="discountType === 'percentage' ? '%' : 'IDR'"
              :hint="maxDiscountHint"
              persistent-hint
              :min="0"
              :max="maxDiscountValue"
              :allow-decimal="discountType === 'percentage'"
              :decimal-places="1"
              :format-as-currency="discountType === 'fixed'"
              :error-messages="valueErrorMessage"
              :quick-values="
                discountType === 'percentage' ? percentageQuickValues : fixedQuickValues
              "
              variant="outlined"
              density="compact"
              class="mb-3"
              submit-label="Apply"
              @update:model-value="updatePreview"
            />

            <!-- Reason Selection (Compact) -->
            <v-select
              v-model="selectedReason"
              :items="discountReasonOptions"
              item-title="label"
              item-value="value"
              label="Reason *"
              :error-messages="reasonErrorMessage"
              variant="outlined"
              density="compact"
              class="mb-3"
            >
              <template #item="{ props: itemProps, item: reasonItem }">
                <v-list-item v-bind="itemProps" density="compact">
                  <template #title>{{ reasonItem.raw.label }}</template>
                  <template v-if="reasonItem.raw.description" #subtitle>
                    <span class="text-caption">{{ reasonItem.raw.description }}</span>
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <!-- Optional Notes (Compact) -->
            <v-textarea
              v-model="notes"
              label="Notes (Optional)"
              :counter="MAX_NOTES_LENGTH"
              :maxlength="MAX_NOTES_LENGTH"
              variant="outlined"
              density="compact"
              rows="2"
              auto-grow
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <!-- Remove Discount Button (shown only if bill has existing discount) -->
        <v-btn
          v-if="hasExistingDiscount"
          color="error"
          variant="text"
          :disabled="isRemoving"
          :loading="isRemoving"
          @click="handleRemoveDiscount"
        >
          <v-icon start>mdi-delete</v-icon>
          Remove Discount
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="!isValid || isApplying"
          :loading="isApplying"
          @click="handleApply"
        >
          Apply Discount
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PosBill, PosBillItem } from '@/stores/pos/types'
import { formatIDR } from '@/utils/currency'
import { DISCOUNT_REASON_OPTIONS, DISCOUNT_VALIDATION } from '@/stores/discounts/constants'
import type { DiscountReason, DiscountValueType } from '@/stores/discounts/types'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import { DebugUtils } from '@/utils'
import { NumericInputField } from '@/components/input'

const MODULE_NAME = 'BillDiscountDialog'
const MAX_NOTES_LENGTH = DISCOUNT_VALIDATION.MAX_NOTES_LENGTH

// Props
interface Props {
  modelValue: boolean
  bill: PosBill | null
  applyToOrder?: boolean // If false, only return discount data without saving to order
}

const props = withDefaults(defineProps<Props>(), {
  applyToOrder: true
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [discountData: { amount: number; reason: string; type: string; value: number }]
  cancel: []
}>()

// Stores
const ordersStore = usePosOrdersStore()
const paymentSettingsStore = usePaymentSettingsStore()

// Form state
const discountType = ref<DiscountValueType>('percentage')
const discountValue = ref<number>(0)
const selectedReason = ref<DiscountReason | ''>('')
const notes = ref<string>('')
const isApplying = ref<boolean>(false)
const isRemoving = ref<boolean>(false)

// Quick values for NumericKeypad
const percentageQuickValues = [
  { label: '5%', value: 5 },
  { label: '10%', value: 10 },
  { label: '15%', value: 15 },
  { label: '20%', value: 20 }
]

const fixedQuickValues = [
  { label: '5K', value: 5000 },
  { label: '10K', value: 10000 },
  { label: '20K', value: 20000 },
  { label: '50K', value: 50000 }
]

// Computed - Bill data
const activeItems = computed(() => {
  if (!props.bill) return []
  return props.bill.items.filter(item => item.status !== 'cancelled')
})

// Calculate item discount amount for a single item
const calculateItemDiscountAmount = (item: PosBillItem): number => {
  if (!item.discounts || item.discounts.length === 0) return 0

  return item.discounts.reduce((sum, discount) => {
    if (discount.type === 'percentage') {
      return sum + (item.totalPrice * discount.value) / 100
    } else {
      return sum + discount.value
    }
  }, 0)
}

// Bill subtotal AFTER item discounts (this is the base for bill discount)
const billSubtotal = computed(() => {
  return activeItems.value.reduce((sum, item) => {
    const itemDiscountAmount = calculateItemDiscountAmount(item)
    const itemFinalPrice = item.totalPrice - itemDiscountAmount
    return sum + itemFinalPrice
  }, 0)
})

const hasExistingDiscount = computed(() => {
  return props.bill && (props.bill.discountAmount ?? 0) > 0
})

const maxDiscountValue = computed(() => {
  return discountType.value === 'percentage'
    ? DISCOUNT_VALIDATION.MAX_PERCENTAGE
    : billSubtotal.value
})

const maxDiscountHint = computed(() => {
  if (discountType.value === 'percentage') {
    return 'Maximum: 100%'
  } else {
    return `Maximum: ${formatIDR(billSubtotal.value)}`
  }
})

const discountAmount = computed(() => {
  if (!discountValue.value) return 0

  if (discountType.value === 'percentage') {
    return (billSubtotal.value * discountValue.value) / 100
  } else {
    return Math.min(discountValue.value, billSubtotal.value)
  }
})

const afterDiscount = computed(() => {
  return Math.max(0, billSubtotal.value - discountAmount.value)
})

// Tax calculations
const activeTaxes = computed(() => paymentSettingsStore.activeTaxes)

const taxBreakdown = computed(() => {
  return activeTaxes.value.map(tax => {
    const amount = (afterDiscount.value * tax.percentage) / 100
    return {
      taxId: tax.id,
      name: tax.name,
      percentage: tax.percentage,
      amount
    }
  })
})

const totalWithTaxes = computed(() => {
  const totalTaxes = taxBreakdown.value.reduce((sum, tax) => sum + tax.amount, 0)
  return afterDiscount.value + totalTaxes
})

// Allocation preview with per-item caps
const allocationPreview = computed(() => {
  if (!discountAmount.value || billSubtotal.value === 0) return []

  // Step 1: Initial proportional allocation
  const allocations = activeItems.value.map(item => {
    // Use price AFTER item discounts for allocation
    const itemDiscountAmount = calculateItemDiscountAmount(item)
    const itemFinalPrice = item.totalPrice - itemDiscountAmount
    const proportion = itemFinalPrice / billSubtotal.value
    const rawAllocatedDiscount = discountAmount.value * proportion

    return {
      itemId: item.id,
      name: item.menuItemName + (item.variantName ? ` (${item.variantName})` : ''),
      itemAmount: itemFinalPrice, // Show final price after item discounts
      maxAllowed: itemFinalPrice, // Maximum discount is item's final price
      proportion,
      allocatedDiscount: rawAllocatedDiscount,
      isCapped: false
    }
  })

  // Step 2: Cap allocations at item price and redistribute remainder
  let remainderToDistribute = 0
  allocations.forEach(alloc => {
    if (alloc.allocatedDiscount > alloc.maxAllowed) {
      remainderToDistribute += alloc.allocatedDiscount - alloc.maxAllowed
      alloc.allocatedDiscount = alloc.maxAllowed
      alloc.isCapped = true
    }
  })

  // Step 3: Redistribute remainder to uncapped items (iterative)
  let iterations = 0
  const MAX_ITERATIONS = 10 // Prevent infinite loops
  while (remainderToDistribute > 0.01 && iterations < MAX_ITERATIONS) {
    const uncappedItems = allocations.filter(a => !a.isCapped)
    if (uncappedItems.length === 0) break // All items capped, can't distribute further

    const uncappedTotal = uncappedItems.reduce((sum, a) => sum + a.itemAmount, 0)
    if (uncappedTotal === 0) break

    let redistributed = 0
    uncappedItems.forEach(alloc => {
      const proportion = alloc.itemAmount / uncappedTotal
      const additionalDiscount = remainderToDistribute * proportion
      const newTotal = alloc.allocatedDiscount + additionalDiscount

      if (newTotal > alloc.maxAllowed) {
        redistributed += newTotal - alloc.maxAllowed
        alloc.allocatedDiscount = alloc.maxAllowed
        alloc.isCapped = true
      } else {
        alloc.allocatedDiscount = newTotal
        redistributed += additionalDiscount
      }
    })

    remainderToDistribute -= redistributed
    iterations++
  }

  // Step 4: Handle final rounding adjustment on largest uncapped item
  const sumAllocated = allocations.reduce((sum, a) => sum + a.allocatedDiscount, 0)
  const diff = discountAmount.value - sumAllocated

  if (Math.abs(diff) > 0.01 && allocations.length > 0) {
    // Find largest uncapped item, or fallback to largest item
    const uncappedItems = allocations.filter(a => !a.isCapped)
    const targetArray = uncappedItems.length > 0 ? uncappedItems : allocations

    const largestIndex = allocations.findIndex(
      a =>
        a ===
        targetArray.reduce(
          (max, curr) => (curr.itemAmount > max.itemAmount ? curr : max),
          targetArray[0]
        )
    )

    if (largestIndex >= 0) {
      const newAmount = allocations[largestIndex].allocatedDiscount + diff
      if (newAmount <= allocations[largestIndex].maxAllowed) {
        allocations[largestIndex].allocatedDiscount = newAmount
      }
    }
  }

  return allocations
})

const totalAllocated = computed(() => {
  return allocationPreview.value.reduce((sum, a) => sum + a.allocatedDiscount, 0)
})

// Computed - Other
const discountReasonOptions = computed(() => DISCOUNT_REASON_OPTIONS)

// Validation
const valueErrorMessage = computed(() => {
  if (!discountValue.value || discountValue.value === 0) {
    return 'Discount value is required and must be greater than 0'
  }
  if (discountValue.value < 0) {
    return 'Discount must be positive'
  }
  if (discountType.value === 'percentage') {
    if (discountValue.value > 100) {
      return `Percentage cannot exceed 100% (current: ${discountValue.value}%)`
    }
  } else {
    // Fixed amount validation
    if (discountValue.value > billSubtotal.value) {
      return `Discount cannot exceed bill subtotal (max: ${formatIDR(billSubtotal.value)})`
    }
  }
  return ''
})

const reasonErrorMessage = computed(() => {
  if (!selectedReason.value) {
    return 'Please select a reason'
  }
  return ''
})

const isValid = computed(() => {
  return (
    discountValue.value > 0 &&
    !valueErrorMessage.value &&
    selectedReason.value !== '' &&
    !reasonErrorMessage.value
  )
})

// Methods
const updatePreview = () => {
  // Preview updates automatically via computed properties
}

const resetForm = () => {
  discountType.value = 'percentage'
  discountValue.value = 0
  selectedReason.value = ''
  notes.value = ''
  isApplying.value = false
}

const handleCancel = () => {
  resetForm()
  emit('cancel')
  emit('update:modelValue', false)
}

const handleApply = async () => {
  if (!isValid.value || !props.bill) {
    DebugUtils.error(MODULE_NAME, 'Invalid form or missing bill', {
      isValid: isValid.value,
      hasBill: !!props.bill
    })
    return
  }

  try {
    isApplying.value = true

    DebugUtils.info(MODULE_NAME, 'Applying bill discount', {
      billId: props.bill.id,
      type: discountType.value,
      value: discountValue.value,
      reason: selectedReason.value,
      allocation: allocationPreview.value,
      applyToOrder: props.applyToOrder
    })

    if (props.applyToOrder) {
      // Apply to order store (save to database)
      await ordersStore.applyBillDiscount(props.bill.id, {
        discountType: discountType.value,
        value: discountValue.value,
        reason: selectedReason.value as DiscountReason,
        notes: notes.value || undefined
      })

      DebugUtils.info(MODULE_NAME, 'Bill discount applied to order successfully')
    } else {
      // Just return data without saving (for PaymentDialog preview)
      DebugUtils.info(MODULE_NAME, 'Bill discount calculated (preview mode)', {
        amount: discountAmount.value
      })
    }

    // Reset form and emit success with discount data
    const discountData = {
      amount: discountAmount.value,
      reason: selectedReason.value,
      type: discountType.value,
      value: discountValue.value
    }

    resetForm()
    emit('success', discountData)
    emit('update:modelValue', false)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to apply bill discount', { error })
    // TODO: Show error notification to user
  } finally {
    isApplying.value = false
  }
}

const handleRemoveDiscount = async () => {
  if (!props.bill) {
    DebugUtils.error(MODULE_NAME, 'Cannot remove discount - missing bill')
    return
  }

  try {
    isRemoving.value = true

    DebugUtils.info(MODULE_NAME, 'Removing bill discount', {
      billId: props.bill.id,
      existingDiscount: props.bill.discountAmount
    })

    // Call ordersStore to remove bill discount
    await ordersStore.removeBillDiscount(props.bill.id)

    DebugUtils.info(MODULE_NAME, 'Bill discount removed successfully')

    // Reset form and close dialog
    resetForm()
    emit('success', {
      amount: 0,
      reason: '',
      type: 'percentage',
      value: 0
    })
    emit('update:modelValue', false)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to remove bill discount', { error })
    // TODO: Show error notification to user
  } finally {
    isRemoving.value = false
  }
}

// Watch for dialog open/close to reset form
watch(
  () => props.modelValue,
  newValue => {
    if (!newValue) {
      // Dialog closed, reset form
      resetForm()
    } else if (props.bill) {
      // Dialog opened with bill, log for debugging
      DebugUtils.info(MODULE_NAME, 'Dialog opened for bill', {
        billId: props.bill.id,
        billName: props.bill.name,
        itemsCount: activeItems.value.length,
        subtotal: billSubtotal.value
      })
    }
  }
)
</script>

<style scoped>
.bill-info-card {
  background: rgba(var(--v-theme-surface-variant), 0.5);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.w-100 {
  width: 100%;
}

:deep(.v-btn-toggle) {
  width: 100%;
}

:deep(.v-btn-toggle .v-btn) {
  flex: 1;
}

/* Allocation section styling */
.allocation-section {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 4px;
  padding: 8px;
}

.allocation-list {
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

/* Scrollbar styling for allocation list */
.allocation-list::-webkit-scrollbar {
  width: 6px;
}

.allocation-list::-webkit-scrollbar-track {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 3px;
}

.allocation-list::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.allocation-list::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--v-theme-on-surface), 0.3);
}

.allocation-row {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.allocation-row:last-child {
  border-bottom: none;
}

/* Responsive: single column on mobile */
@media (max-width: 960px) {
  .allocation-list {
    max-height: 150px;
  }
}
</style>
