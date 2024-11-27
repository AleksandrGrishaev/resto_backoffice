<template>
  <base-dialog
    v-model="dialogModel"
    :title="account ? 'Редактирование счета' : 'Новый счет'"
    :loading="loading"
    :disabled="!isFormValid"
    @confirm="handleSubmit"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <v-text-field
        v-model="formData.name"
        label="Название счета"
        :rules="[v => !!v || 'Обязательное поле']"
        required
      />

      <v-select
        v-model="formData.type"
        label="Тип счета"
        :items="accountTypes"
        item-title="title"
        item-value="value"
        :rules="[v => !!v || 'Обязательное поле']"
        required
      />

      <v-text-field
        v-if="!account"
        v-model.number="formData.initialBalance"
        label="Начальный баланс"
        type="number"
        hint="Оставьте пустым для нулевого баланса"
        :rules="[v => !v || v >= 0 || 'Баланс не может быть отрицательным']"
      />

      <v-textarea v-model="formData.description" label="Описание" rows="3" />

      <v-switch
        v-model="formData.isActive"
        label="Активен"
        color="primary"
        :disabled="account && !canDeactivateAccount"
      />
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { useDialogForm } from '@/composables/useDialogForm'
import { useAccountStore } from '@/stores/account.store'
import type { Account } from '@/types/account'

const props = defineProps<{
  modelValue: boolean
  account?: Account | null
}>()

const emit = defineEmits<{
  'update:model-value': [value: boolean]
  success: []
}>()

const accountStore = useAccountStore()

const accountTypes = [
  { title: 'Наличные', value: 'cash' },
  { title: 'Банковский счет', value: 'bank' },
  { title: 'Карта', value: 'card' },
  { title: 'Gojek', value: 'gojeck' },
  { title: 'Grab', value: 'grab' }
]

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:model-value', value)
})

// Предотвращаем деактивацию счета с ненулевым балансом
const canDeactivateAccount = computed(() => {
  if (!props.account) return true
  return props.account.balance === 0
})

const initialData = computed(() => ({
  name: props.account?.name || '',
  type: props.account?.type || 'cash',
  description: props.account?.description || '',
  isActive: props.account?.isActive ?? true,
  initialBalance: props.account ? undefined : 0
}))

const { form, loading, formState, formData, isFormValid, handleSubmit } = useDialogForm({
  moduleName: 'AccountDialog',
  initialData: initialData.value,
  onSubmit: async data => {
    try {
      if (props.account) {
        await accountStore.updateAccount(props.account.id, {
          name: data.name,
          type: data.type,
          description: data.description,
          isActive: data.isActive
        })
      } else {
        await accountStore.createAccount({
          name: data.name,
          type: data.type,
          description: data.description,
          isActive: data.isActive,
          balance: data.initialBalance || 0
        })
      }
      emit('success')
    } catch (error) {
      console.error('Failed to save account:', error)
      throw error
    }
  }
})
</script>
