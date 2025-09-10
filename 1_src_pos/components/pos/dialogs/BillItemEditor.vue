// src/components/pos/dialogs/BillItemEditor.vue
<template>
  <base-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    :loading="loading"
    @confirm="handleSubmit"
    @cancel="handleCancel"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <v-form ref="form" @submit.prevent="handleSubmit">
      <v-container class="pa-0">
        <!-- Количество -->
        <v-row>
          <v-col cols="12">
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
                min="1"
                @input="handleQuantityInput"
              />
              <v-btn icon="mdi-plus" @click="incrementQuantity" />
            </div>
          </v-col>
        </v-row>

        <!-- Примечание -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-text-field
              v-model="formData.note"
              label="Note"
              variant="outlined"
              hide-details
              :rules="noteRules"
            />
          </v-col>
        </v-row>

        <!-- Варианты если есть -->
        <v-row v-if="item.variants?.length > 1" class="mt-4">
          <v-col cols="12">
            <v-select
              v-model="formData.variantId"
              :items="item.variants"
              item-title="name"
              item-value="id"
              label="Variant"
              variant="outlined"
              hide-details
            />
          </v-col>
        </v-row>
        <v-row v-if="canAddDiscount" class="mt-4">
          <v-col cols="12">
            <v-select
              v-model="formData.discountReason"
              :items="discountReasons"
              label="Discount Reason"
              variant="outlined"
              hide-details
              :disabled="!formData.discountValue"
            />
          </v-col>
        </v-row>

        <v-row v-if="canAddDiscount" class="mt-4">
          <v-col cols="12">
            <v-text-field
              v-model="discountInput"
              type="number"
              label="Discount %"
              variant="outlined"
              hide-details
              :rules="discountRules"
              min="0"
              max="100"
              @input="handleDiscountInput"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BillItem, DiscountReason } from '@/types/bill'
import { MenuItem } from '@/types/menu'
import { useDialogForm } from '@/composables/useDialogForm'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { useBillStore } from '@/stores/bill.store'

interface Props {
  modelValue: boolean
  item: MenuItem
  billItem: BillItem
}

const props = defineProps<Props>()
const billStore = useBillStore()

const emit = defineEmits<{
  'update:model-value': [boolean]
  confirm: [{ quantity: number; note: string; variantId: string }]
}>()

interface FormData {
  quantity: number
  note: string
  variantId: string
  discountValue: number | null
  discountReason: DiscountReason | null
}

// Создаем отдельный ref для количества для правильной обработки ввода
const quantityInput = ref(String(props.billItem.quantity))

const initialData: FormData = {
  quantity: props.billItem.quantity,
  note: props.billItem.notes ?? '',
  variantId: props.billItem.variantId ?? props.item.variants[0].id,
  discountValue: props.billItem.discounts?.[0]?.value || null,
  discountReason: props.billItem.discounts?.[0]?.reason || null
}
const { formData, loading, handleSubmit, handleCancel } = useDialogForm<FormData>({
  moduleName: 'BillItemEditor',
  initialData,
  validateForm: data => {
    if (data.quantity < 1) return 'Quantity must be at least 1'
    if (!data.variantId) return 'Variant must be selected'
    if (data.discountValue && (data.discountValue < 0 || data.discountValue > 100)) {
      return 'Discount must be between 0 and 100%'
    }
    if (data.discountValue && !data.discountReason) {
      return 'Discount reason must be selected'
    }
    return true
  },
  onSubmit: async data => {
    // Если есть скидка, добавляем её
    if (data.discountValue && data.discountReason) {
      await billStore.addItemDiscount(props.billItem.id, {
        value: data.discountValue,
        reason: data.discountReason
      })
    }

    // Передаем основные данные в emit
    emit('confirm', {
      quantity: data.quantity,
      note: data.note,
      variantId: data.variantId
    })
    emit('update:model-value', false)
  }
})

const discountReasons = [
  { title: 'Customer Complaint', value: 'customer_complaint' },
  { title: 'Manager Approval', value: 'manager_approval' },
  { title: 'Happy Hour', value: 'happy_hour' },
  { title: 'Special Event', value: 'special_event' },
  { title: 'Other', value: 'other' }
]

const discountRules = [(v: number) => (v >= 0 && v <= 100) || 'Discount must be between 0 and 100%']

const canAddDiscount = computed(() => props.billItem.status === 'pending')

const discountInput = ref(String(formData.value.discountValue || ''))

const handleDiscountInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  const numValue = parseInt(value)
  if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
    formData.value.discountValue = numValue
  }
}

const dialogTitle = computed(() => `Edit ${props.item.name}`)

const noteRules = [(v: string) => v.length <= 100 || 'Note must be less than 100 characters']

const handleQuantityInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  const numValue = parseInt(value)
  if (!isNaN(numValue) && numValue >= 1) {
    formData.value.quantity = numValue
  }
}

const incrementQuantity = () => {
  formData.value.quantity++
  quantityInput.value = String(formData.value.quantity)
}

const decrementQuantity = () => {
  if (formData.value.quantity > 1) {
    formData.value.quantity--
    quantityInput.value = String(formData.value.quantity)
  }
}
</script>
