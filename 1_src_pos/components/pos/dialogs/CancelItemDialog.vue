<template>
  <base-dialog
    :model-value="isOpen"
    :title="dialogTitle"
    :loading="loading"
    @confirm="handleSubmit"
    @cancel="handleCancel"
    @update:model-value="updateDialog"
  >
    <v-form ref="form" @submit.prevent="handleSubmit">
      <v-container class="pa-0">
        <!-- Quantity Selector -->
        <v-row v-if="showQuantitySelector">
          <v-col cols="12">
            <div class="text-subtitle-2 mb-2">Quantity to Cancel</div>
            <div class="d-flex align-center quantity-editor">
              <v-btn
                icon="mdi-minus"
                :disabled="formData.quantity <= 1"
                @click="decrementQuantity"
              />
              <v-text-field
                v-model="quantityInput"
                type="number"
                variant="outlined"
                hide-details
                density="compact"
                class="mx-2"
                style="width: 80px"
                :min="1"
                :max="availableQuantity"
                @input="handleQuantityInput"
              />
              <v-btn
                icon="mdi-plus"
                :disabled="formData.quantity >= availableQuantity"
                @click="incrementQuantity"
              />
            </div>
          </v-col>
        </v-row>

        <!-- Reason Selector -->
        <v-row :class="{ 'mt-4': showQuantitySelector }">
          <v-col cols="12">
            <v-select
              v-model="formData.reason"
              :items="cancelReasons"
              item-title="title"
              item-value="value"
              label="Cancellation Reason"
              variant="outlined"
              :rules="reasonRules"
              required
            />
          </v-col>
        </v-row>

        <!-- Note Input -->
        <v-row class="mt-2">
          <v-col cols="12">
            <v-text-field
              v-model="formData.note"
              label="Additional Note"
              variant="outlined"
              :rules="noteRules"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDialogForm } from '@/composables/useDialogForm'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { BillItem, CancellationReason } from '@/types/bill'

interface CancelFormData {
  reason: CancellationReason
  note: string
  quantity: number
}

const props = defineProps<{
  modelValue: boolean
  item?: BillItem
}>()

const emit = defineEmits<{
  'update:model-value': [boolean]
  confirm: [{ reason: CancellationReason; note: string; quantity: number }]
}>()

// Локальное состояние для диалога
const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:model-value', value)
})

const updateDialog = (value: boolean) => {
  isOpen.value = value
}

// Состояние количества
const quantityInput = ref('1')

// Вычисляемые свойства
const availableQuantity = computed(() => {
  if (!props.item) return 0
  return props.item.quantity - (props.item.activeCancellations || 0)
})

const showQuantitySelector = computed(() => {
  return props.item && availableQuantity.value > 1
})

const dialogTitle = computed(() =>
  availableQuantity.value === props.item?.quantity ? 'Cancel Item' : 'Partially Cancel Item'
)

// Опции причин отмены
const cancelReasons = [
  { title: 'Customer Request', value: 'customer_request' },
  { title: 'Out of Stock', value: 'out_of_stock' },
  { title: 'Wrong Order', value: 'wrong_order' },
  { title: 'Quality Issue', value: 'quality_issue' },
  { title: 'Long Wait', value: 'long_wait' },
  { title: 'Price Dispute', value: 'price_dispute' },
  { title: 'Other', value: 'other' }
] as const

// Правила валидации
const reasonRules = [(v: string) => !!v || 'Reason is required']
const noteRules = [(v: string) => !v || v.length <= 100 || 'Note must be less than 100 characters']

// Обработчики количества
const decrementQuantity = () => {
  const currentQuantity = formData.value.quantity
  if (currentQuantity > 1) {
    formData.value.quantity = currentQuantity - 1
    quantityInput.value = String(currentQuantity - 1)
  }
}

const incrementQuantity = () => {
  const currentQuantity = formData.value.quantity
  if (currentQuantity < availableQuantity.value) {
    formData.value.quantity = currentQuantity + 1
    quantityInput.value = String(currentQuantity + 1)
  }
}

const handleQuantityInput = () => {
  let value = parseInt(quantityInput.value)

  if (isNaN(value) || value < 1) {
    value = 1
  } else if (value > availableQuantity.value) {
    value = availableQuantity.value
  }

  formData.value.quantity = value
  quantityInput.value = String(value)
}
// Использование composable для управления формой
const { formData, loading, handleSubmit, handleCancel } = useDialogForm<CancelFormData>({
  moduleName: 'CancelItemDialog',
  initialData: {
    reason: 'customer_request',
    note: '',
    quantity: 1
  },
  validateForm: (data: CancelFormData) => {
    if (!data.reason) return 'Please select a reason'
    if (data.quantity < 1 || data.quantity > availableQuantity.value) {
      return 'Invalid quantity'
    }
    if (data.note && data.note.length > 100) {
      return 'Note is too long'
    }
    return true
  },
  onSubmit: async (data: CancelFormData) => {
    emit('confirm', {
      reason: data.reason,
      note: data.note,
      quantity: data.quantity
    })
    emit('update:model-value', false)
  }
})
</script>

<style scoped>
.quantity-editor {
  display: flex;
  align-items: center;
}

.quantity-editor :deep(.v-field) {
  border-radius: 8px;
}

.quantity-editor :deep(.v-field__input) {
  text-align: center;
  padding: 0;
}
</style>
