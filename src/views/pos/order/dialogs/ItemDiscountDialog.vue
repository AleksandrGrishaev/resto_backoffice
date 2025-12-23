<!-- src/views/pos/order/dialogs/ItemDiscountDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">Apply Item Discount</v-card-title>

      <v-card-text class="pa-4">
        <div v-if="item">
          <!-- Item Info (Compact) -->
          <div class="item-info-card pa-2 mb-3 rounded">
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-body-2 font-weight-medium">{{ item.menuItemName }}</div>
                <div v-if="item.variantName" class="text-caption text-medium-emphasis">
                  {{ item.variantName }}
                </div>
              </div>
              <div class="text-subtitle-1 font-weight-bold">{{ formatIDR(item.totalPrice) }}</div>
            </div>
          </div>

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

          <!-- Value Input (Compact) -->
          <v-text-field
            v-model.number="discountValue"
            :label="discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'"
            :suffix="discountType === 'percentage' ? '%' : 'IDR'"
            type="number"
            min="0"
            :max="maxDiscountValue"
            :error-messages="valueErrorMessage"
            variant="outlined"
            density="compact"
            class="mb-3"
            @input="updatePreview"
          />

          <!-- Live Preview (Compact) -->
          <v-card variant="tonal" color="primary" class="mb-3">
            <v-card-text class="pa-2">
              <div class="text-caption text-medium-emphasis mb-1">Preview</div>
              <div class="d-flex justify-space-between align-center">
                <span class="text-caption">Original Price:</span>
                <span class="text-caption">{{ formatIDR(item.totalPrice) }}</span>
              </div>
              <div class="d-flex justify-space-between align-center">
                <span class="text-caption text-error">Discount:</span>
                <span class="text-caption text-error font-weight-medium">
                  -{{ formatIDR(calculatedDiscount) }}
                </span>
              </div>
              <v-divider class="my-1" />
              <div class="d-flex justify-space-between align-center">
                <span class="text-body-2 font-weight-bold">Final Price:</span>
                <span class="text-subtitle-1 font-weight-bold">{{ formatIDR(finalPrice) }}</span>
              </div>
            </v-card-text>
          </v-card>

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
        </div>
      </v-card-text>

      <v-card-actions>
        <!-- Remove Discount Button (shown only if item has existing discounts) -->
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
import type { PosBillItem } from '@/stores/pos/types'
import { formatIDR } from '@/utils/currency'
import { DISCOUNT_REASON_OPTIONS, DISCOUNT_VALIDATION } from '@/stores/discounts/constants'
import type { DiscountReason, DiscountValueType } from '@/stores/discounts/types'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ItemDiscountDialog'
const MAX_NOTES_LENGTH = DISCOUNT_VALIDATION.MAX_NOTES_LENGTH

// Props
interface Props {
  modelValue: boolean
  item: PosBillItem | null
  billId: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
  cancel: []
}>()

// Store
const ordersStore = usePosOrdersStore()

// Form state
const discountType = ref<DiscountValueType>('percentage')
const discountValue = ref<number>(0)
const selectedReason = ref<DiscountReason | ''>('')
const notes = ref<string>('')
const isApplying = ref<boolean>(false)
const isRemoving = ref<boolean>(false)

// Computed
const discountReasonOptions = computed(() => DISCOUNT_REASON_OPTIONS)

const hasExistingDiscount = computed(() => {
  return props.item && props.item.discounts && props.item.discounts.length > 0
})

const maxDiscountValue = computed(() => {
  if (!props.item) return 0
  return discountType.value === 'percentage'
    ? DISCOUNT_VALIDATION.MAX_PERCENTAGE
    : props.item.totalPrice
})

const calculatedDiscount = computed(() => {
  if (!props.item || !discountValue.value) return 0

  if (discountType.value === 'percentage') {
    return (props.item.totalPrice * discountValue.value) / 100
  } else {
    return Math.min(discountValue.value, props.item.totalPrice)
  }
})

const finalPrice = computed(() => {
  if (!props.item) return 0
  return Math.max(0, props.item.totalPrice - calculatedDiscount.value)
})

// Validation
const valueErrorMessage = computed(() => {
  // Allow empty/zero during input, but show error for validation
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
    if (props.item && discountValue.value > props.item.totalPrice) {
      return `Discount cannot exceed item price (max: ${formatIDR(props.item.totalPrice)})`
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
  if (!isValid.value || !props.item) {
    DebugUtils.error(MODULE_NAME, 'Invalid form or missing item', {
      isValid: isValid.value,
      hasItem: !!props.item
    })
    return
  }

  try {
    isApplying.value = true

    DebugUtils.info(MODULE_NAME, 'Applying item discount', {
      itemId: props.item.id,
      billId: props.billId,
      type: discountType.value,
      value: discountValue.value,
      reason: selectedReason.value
    })

    // Call ordersStore to apply discount
    await ordersStore.applyItemDiscount(props.item.id, {
      discountType: discountType.value,
      value: discountValue.value,
      reason: selectedReason.value as DiscountReason,
      notes: notes.value || undefined
    })

    DebugUtils.info(MODULE_NAME, 'Item discount applied successfully')

    // Reset form and close dialog
    resetForm()
    emit('success')
    emit('update:modelValue', false)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to apply item discount', { error })
    // TODO: Show error notification to user
  } finally {
    isApplying.value = false
  }
}

const handleRemoveDiscount = async () => {
  if (!props.item) {
    DebugUtils.error(MODULE_NAME, 'Cannot remove discount - missing item')
    return
  }

  try {
    isRemoving.value = true

    DebugUtils.info(MODULE_NAME, 'Removing item discount', {
      itemId: props.item.id,
      billId: props.billId,
      existingDiscounts: props.item.discounts?.length || 0
    })

    // Call ordersStore to remove discount
    await ordersStore.removeItemDiscount(props.billId, props.item.id)

    DebugUtils.info(MODULE_NAME, 'Item discount removed successfully')

    // Reset form and close dialog
    resetForm()
    emit('success')
    emit('update:modelValue', false)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to remove item discount', { error })
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
    } else if (props.item) {
      // Dialog opened with item, log for debugging
      DebugUtils.info(MODULE_NAME, 'Dialog opened for item', {
        itemId: props.item.id,
        itemName: props.item.menuItemName,
        price: props.item.totalPrice
      })
    }
  }
)
</script>

<style scoped>
.item-info-card {
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
</style>
