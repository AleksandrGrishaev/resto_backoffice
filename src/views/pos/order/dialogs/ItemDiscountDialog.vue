<!-- src/views/pos/order/dialogs/ItemDiscountDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">Apply Item Discount</v-card-title>

      <v-card-text>
        <div v-if="item">
          <!-- Item Info (Read-only) -->
          <div class="item-info-card pa-3 mb-4 rounded">
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-subtitle-1 font-weight-medium">{{ item.menuItemName }}</div>
                <div v-if="item.variantName" class="text-caption text-medium-emphasis">
                  {{ item.variantName }}
                </div>
              </div>
              <div class="text-h6 font-weight-bold">{{ formatIDR(item.totalPrice) }}</div>
            </div>
          </div>

          <!-- Discount Type Toggle -->
          <div class="mb-4">
            <label class="text-subtitle-2 mb-2 d-block">Discount Type</label>
            <v-btn-toggle v-model="discountType" mandatory color="primary" class="w-100">
              <v-btn value="percentage" class="flex-grow-1">
                <v-icon start>mdi-percent</v-icon>
                Percentage (%)
              </v-btn>
              <v-btn value="fixed" class="flex-grow-1">
                <v-icon start>mdi-currency-usd</v-icon>
                Fixed Amount
              </v-btn>
            </v-btn-toggle>
          </div>

          <!-- Value Input -->
          <v-text-field
            v-model.number="discountValue"
            :label="discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'"
            :suffix="discountType === 'percentage' ? '%' : 'IDR'"
            type="number"
            min="0"
            :max="maxDiscountValue"
            :error-messages="valueErrorMessage"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            @input="updatePreview"
          />

          <!-- Live Preview -->
          <v-card variant="tonal" color="primary" class="mb-4">
            <v-card-text>
              <div class="text-caption text-medium-emphasis mb-2">Preview</div>
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-body-2">Original Price:</span>
                <span class="text-body-2">{{ formatIDR(item.totalPrice) }}</span>
              </div>
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-body-2 text-error">Discount:</span>
                <span class="text-body-2 text-error font-weight-medium">
                  -{{ formatIDR(calculatedDiscount) }}
                </span>
              </div>
              <v-divider class="my-2" />
              <div class="d-flex justify-space-between align-center">
                <span class="text-subtitle-1 font-weight-bold">Final Price:</span>
                <span class="text-h6 font-weight-bold">{{ formatIDR(finalPrice) }}</span>
              </div>
            </v-card-text>
          </v-card>

          <!-- Reason Selection (Required) -->
          <v-select
            v-model="selectedReason"
            :items="discountReasonOptions"
            item-title="label"
            item-value="value"
            label="Reason *"
            :error-messages="reasonErrorMessage"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          >
            <template #item="{ props: itemProps, item: reasonItem }">
              <v-list-item v-bind="itemProps">
                <template #title>{{ reasonItem.raw.label }}</template>
                <template v-if="reasonItem.raw.description" #subtitle>
                  <span class="text-caption">{{ reasonItem.raw.description }}</span>
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Optional Notes -->
          <v-textarea
            v-model="notes"
            label="Notes (Optional)"
            :counter="MAX_NOTES_LENGTH"
            :maxlength="MAX_NOTES_LENGTH"
            variant="outlined"
            density="comfortable"
            rows="3"
            auto-grow
          />
        </div>
      </v-card-text>

      <v-card-actions>
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

// Computed
const discountReasonOptions = computed(() => DISCOUNT_REASON_OPTIONS)

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
  if (!discountValue.value || discountValue.value === 0) {
    return 'Discount value is required'
  }
  if (discountValue.value < 0) {
    return 'Discount must be positive'
  }
  if (discountType.value === 'percentage' && discountValue.value > 100) {
    return 'Percentage cannot exceed 100%'
  }
  if (discountType.value === 'fixed' && props.item && discountValue.value > props.item.totalPrice) {
    return 'Discount cannot exceed item price'
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
