<template>
  <base-dialog
    :model-value="modelValue"
    :title="method ? 'Edit Payment Method' : 'New Payment Method'"
    :loading="loading"
    :disabled="!isFormValid"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="handleSubmit"
    @cancel="handleCancel"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <v-text-field
        v-model="formData.name"
        label="Name"
        :rules="[v => !!v || 'Required field']"
        required
      />

      <v-select
        v-model="formData.type"
        label="Type"
        :items="accountTypes"
        :rules="[v => !!v || 'Required field']"
        required
      />

      <v-switch
        v-model="formData.requiresDetails"
        label="Requires details"
        color="primary"
        hide-details
      />

      <v-switch v-model="formData.isActive" label="Active" color="primary" hide-details />
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
  { title: 'Cash', value: 'cash' },
  { title: 'Bank Card', value: 'card' },
  { title: 'Bank Account', value: 'bank' },
  { title: 'E-Wallet', value: 'ewallet' },
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
