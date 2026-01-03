<template>
  <base-dialog
    v-model="dialogModel"
    title="Transfer Between Accounts"
    :loading="loading"
    :disabled="!isFormValid"
    @confirm="handleSubmit"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <v-select
        v-model="formData.fromAccountId"
        label="Source Account"
        :items="accountItems"
        item-title="name"
        item-value="id"
        :rules="[
          v => !!v || 'Required field',
          v => v !== formData.toAccountId || 'Select different accounts'
        ]"
        required
      />
      <v-select
        v-model="formData.toAccountId"
        label="Destination Account"
        :items="accountItems"
        item-title="name"
        item-value="id"
        :rules="[
          v => !!v || 'Required field',
          v => v !== formData.fromAccountId || 'Select different accounts'
        ]"
        required
      />
      <v-text-field
        v-model.number="formData.amount"
        label="Amount"
        type="number"
        :rules="[
          v => !!v || 'Required field',
          v => v > 0 || 'Amount must be greater than 0',
          validateTransferAmount
        ]"
        required
      />
      <v-text-field
        v-model="formData.description"
        label="Description (optional)"
        density="compact"
        hide-details
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
  return value <= fromAccount.balance || 'Insufficient funds for transfer'
}
</script>
