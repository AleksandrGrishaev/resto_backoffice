<template>
  <base-dialog
    :model-value="modelValue"
    :title="method ? 'Редактировать метод оплаты' : 'Новый метод оплаты'"
    :loading="loading"
    :disabled="!isFormValid"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="handleSubmit"
    @cancel="handleCancel"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <v-text-field
        v-model="formData.name"
        label="Название"
        :rules="[v => !!v || 'Обязательное поле']"
        required
      />

      <v-select
        v-model="formData.type"
        label="Тип"
        :items="accountTypes"
        :rules="[v => !!v || 'Обязательное поле']"
        required
      />

      <v-switch
        v-model="formData.requiresDetails"
        label="Требуются детали"
        color="primary"
        hide-details
      />

      <v-switch v-model="formData.isActive" label="Активен" color="primary" hide-details />
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import type { PaymentMethod } from '@/types/payment'
import { useDialogForm } from '@/composables/useDialogForm'
import type { AccountType } from '@/types/account'

const MODULE_NAME = 'PaymentMethodDialog'

const accountTypes = [
  { title: 'Наличные', value: 'cash' },
  { title: 'Банковская карта', value: 'card' },
  { title: 'Банковский счет', value: 'bank' },
  { title: 'Электронный кошелек', value: 'ewallet' },
  { title: 'Gojek', value: 'gojeck' },
  { title: 'Grab', value: 'grab' }
] as const

const props = defineProps<{
  modelValue: boolean
  method?: PaymentMethod | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: [PaymentMethod]
}>()

const initialData = computed(() => ({
  name: '',
  type: 'cash' as AccountType,
  requiresDetails: false,
  isActive: true,
  ...props.method
}))

const { form, loading, formState, formData, isFormValid, handleSubmit, handleCancel } =
  useDialogForm({
    moduleName: MODULE_NAME,
    initialData: initialData.value,
    onSubmit: async data => {
      try {
        const store = usePaymentSettingsStore()
        if (props.method) {
          await store.updatePaymentMethod(props.method.id, data)
        } else {
          await store.createPaymentMethod(data)
        }
        emit('saved', data as PaymentMethod)
        emit('update:modelValue', false)
      } catch (error) {
        console.error(MODULE_NAME, 'Failed to save payment method', error)
      }
    }
  })
</script>
