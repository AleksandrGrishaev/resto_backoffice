<template>
  <base-dialog
    :model-value="modelValue"
    :title="tax ? 'Редактировать налог' : 'Новый налог'"
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
      <v-text-field
        v-model.number="formData.percentage"
        label="Процент"
        type="number"
        min="0"
        max="100"
        step="0.1"
        :rules="[
          v => !!v || 'Обязательное поле',
          v => !isNaN(v) || 'Должно быть числом',
          v => v >= 0 || 'Значение не может быть отрицательным',
          v => v <= 100 || 'Значение не может быть больше 100'
        ]"
        required
        @input="formatPercentageInput"
      />
      <v-switch v-model="formData.isActive" label="Активен" color="primary" hide-details />
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Tax } from '@/types/tax'
import { useDialogForm } from '@/composables/useDialogForm'
import { usePaymentSettingsStore } from '@/stores/payment-settings.store'
import BaseDialog from '@/components/base/BaseDialog.vue'

const MODULE_NAME = 'TaxDialog'

const props = defineProps<{
  modelValue: boolean
  tax?: Tax | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: [Tax]
}>()

const initialData = computed(() => ({
  name: '',
  percentage: 0,
  isActive: true,
  ...props.tax
}))

function formatPercentageInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  const formatted = Math.max(0, Math.min(100, parseFloat(value) || 0))
  formData.percentage = formatted
}

const { form, loading, formState, formData, isFormValid, handleSubmit, handleCancel } =
  useDialogForm({
    moduleName: MODULE_NAME,
    initialData: initialData.value,
    onSubmit: async data => {
      try {
        const store = usePaymentSettingsStore()
        if (props.tax) {
          await store.updateTax(props.tax.id, data)
        } else {
          await store.createTax(data)
        }
        emit('saved', data)
        emit('update:modelValue', false)
      } catch (error) {
        console.error(MODULE_NAME, 'Failed to save tax', error)
        // Здесь можно добавить показ уведомления об ошибке
      }
    }
  })
</script>
