<template>
  <base-dialog
    :model-value="modelValue"
    title="Add Discount"
    :loading="loading"
    @confirm="handleSubmit"
    @cancel="handleCancel"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <v-form ref="form" @submit.prevent="handleSubmit">
      <v-container class="pa-0">
        <!-- Информация о позиции -->
        <v-row>
          <v-col cols="12">
            <div class="text-subtitle-2">{{ item.name }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ variant?.name }} × {{ billItem.quantity }} • ${{ originalPrice }}
            </div>
          </v-col>
        </v-row>

        <!-- Процент скидки -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-text-field
              v-model="formData.value"
              type="number"
              label="Discount %"
              variant="outlined"
              hide-details
              :rules="discountRules"
              min="0"
              max="100"
            />
          </v-col>
        </v-row>

        <!-- Причина скидки -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-select
              v-model="formData.reason"
              :items="discountReasons"
              label="Reason"
              variant="outlined"
              hide-details
              :rules="[v => !!v || 'Reason is required']"
            />
          </v-col>
        </v-row>

        <!-- Предпросмотр цены -->
        <v-row v-if="formData.value > 0" class="mt-4">
          <v-col cols="12">
            <div class="d-flex justify-space-between align-center pa-3 bg-surface-variant rounded">
              <div class="text-caption">
                <div class="text-medium-emphasis text-decoration-line-through">
                  ${{ originalPrice }}
                </div>
                <div class="text-success">${{ calculateDiscountedPrice }}</div>
              </div>
              <v-chip size="small" color="success" variant="flat">-{{ formData.value }}%</v-chip>
            </div>
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
  confirm: [{ value: number; reason: DiscountReason }]
}>()

interface FormData {
  value: number
  reason: DiscountReason | null
}

const initialData: FormData = {
  value: 0,
  reason: null
}

const { formData, loading, handleSubmit, handleCancel } = useDialogForm<FormData>({
  moduleName: 'DiscountEditor',
  initialData,
  validateForm: data => {
    if (!data.value || data.value <= 0 || data.value > 100) {
      return 'Discount must be between 1 and 100%'
    }
    if (!data.reason) {
      return 'Reason is required'
    }
    return true
  },
  onSubmit: async data => {
    if (data.value && data.reason) {
      emit('confirm', {
        value: data.value,
        reason: data.reason
      })
      emit('update:model-value', false)
    }
  }
})

const discountReasons = [
  { title: 'Customer Complaint', value: 'customer_complaint' },
  { title: 'Manager Approval', value: 'manager_approval' },
  { title: 'Happy Hour', value: 'happy_hour' },
  { title: 'Special Event', value: 'special_event' },
  { title: 'Other', value: 'other' }
]

const discountRules = [
  (v: number) => (v >= 0 && v <= 100) || 'Discount must be between 0 and 100%',
  (v: number) => v > 0 || 'Discount must be greater than 0%'
]

// Вычисляемые свойства для отображения цен
const variant = computed(() => {
  return props.item.variants.find(v => v.id === props.billItem.variantId)
})

const originalPrice = computed(() => {
  const quantity = props.billItem.quantity - (props.billItem.activeCancellations || 0)
  return (props.billItem.price * quantity).toFixed(2)
})

const calculateDiscountedPrice = computed(() => {
  const quantity = props.billItem.quantity - (props.billItem.activeCancellations || 0)
  const price = props.billItem.price * quantity
  const discountedPrice = price * (1 - formData.value.value / 100)
  return discountedPrice.toFixed(2)
})
</script>
