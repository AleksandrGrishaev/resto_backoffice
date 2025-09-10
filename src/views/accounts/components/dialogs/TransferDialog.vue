<template>
  <base-dialog
    v-model="dialogModel"
    title="Перевод между счетами"
    :loading="loading"
    :disabled="!isFormValid"
    @confirm="handleSubmit"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <v-select
        v-model="formData.fromAccountId"
        label="Счет отправитель"
        :items="accountItems"
        item-title="name"
        item-value="id"
        :rules="[
          v => !!v || 'Обязательное поле',
          v => v !== formData.toAccountId || 'Выберите разные счета'
        ]"
        required
      />
      <v-select
        v-model="formData.toAccountId"
        label="Счет получатель"
        :items="accountItems"
        item-title="name"
        item-value="id"
        :rules="[
          v => !!v || 'Обязательное поле',
          v => v !== formData.fromAccountId || 'Выберите разные счета'
        ]"
        required
      />
      <v-text-field
        v-model.number="formData.amount"
        label="Сумма"
        type="number"
        :rules="[
          v => !!v || 'Обязательное поле',
          v => v > 0 || 'Сумма должна быть больше 0',
          validateTransferAmount
        ]"
        required
      />
      <v-textarea
        v-model="formData.description"
        label="Описание"
        rows="3"
        :rules="[v => !!v || 'Обязательное поле']"
        required
      />
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import { useDialogForm } from '@/composables/useDialogForm'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:model-value': [value: boolean]
  success: []
}>()

// Stores
const accountStore = useAccountStore()
const authStore = useAuthStore()

// Computed
const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:model-value', value)
})

const accountItems = computed(() =>
  accountStore.activeAccounts.map(acc => ({
    id: acc.id,
    name: acc.name
  }))
)

// Form
const { form, loading, formState, formData, isFormValid, handleSubmit } = useDialogForm({
  moduleName: 'TransferDialog',
  initialData: {
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    description: ''
  },
  onSubmit: async data => {
    try {
      await accountStore.transferBetweenAccounts({
        ...data,
        performedBy: {
          type: 'user',
          id: authStore.userId,
          name: authStore.userName
        }
      })
      emit('success')
    } catch (error) {
      console.error('Failed to transfer funds:', error)
      throw error
    }
  }
})

// Validation
function validateTransferAmount(value: number) {
  const fromAccount = accountStore.getAccountById(formData.value.fromAccountId)
  if (!fromAccount) return true
  return value <= fromAccount.balance || 'Недостаточно средств для перевода'
}
</script>
