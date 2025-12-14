// src/components/accounts/dialogs/OperationDialog.vue
<template>
  <base-dialog
    ref="dialogRef"
    v-model="dialogModel"
    :title="title"
    :loading="loading"
    :disabled="!isFormValid"
    @confirm="handleSubmit"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <!-- Общие поля для всех типов операций -->
      <v-select
        v-if="!account"
        v-model="formData.accountId"
        label="Account"
        :items="accountItems"
        item-title="name"
        item-value="id"
        :rules="[v => !!v || 'Required field']"
        required
      />

      <v-text-field
        v-model.number="formData.amount"
        label="Amount"
        type="number"
        :rules="[
          v => !!v || 'Required field',
          v => v > 0 || 'Amount must be greater than 0',
          validateAmount
        ]"
        required
      />

      <!-- Category selector for expense and income -->
      <template v-if="type === 'expense' || type === 'income'">
        <v-select
          v-model="formData.expenseCategory.category"
          :label="type === 'expense' ? 'Expense Category' : 'Income Category'"
          :items="categoryItems"
          item-title="name"
          item-value="code"
          :rules="[v => !!v || 'Required field']"
          required
        />
      </template>

      <v-textarea
        v-model="formData.description"
        label="Description"
        rows="3"
        :rules="[v => !!v || 'Required field']"
        required
      />
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import { useDialogForm } from '@/composables/useDialogForm'
import { formatIDR } from '@/utils/currency'
import type { Account, OperationType, ExpenseCategory } from '@/stores/account'

const props = defineProps<{
  modelValue: boolean
  type: OperationType
  account?: Account | null
}>()

const emit = defineEmits<{
  'update:model-value': [value: boolean]
  success: []
}>()

// Stores
const accountStore = useAccountStore()
const authStore = useAuthStore()

// Computed
const title = computed(() => {
  const titles = {
    income: 'New Income',
    expense: 'New Expense',
    transfer: 'New Transfer',
    correction: 'Balance Correction'
  }
  return titles[props.type]
})

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

// Use categories from store based on operation type
const categoryItems = computed(() => {
  if (props.type === 'income') {
    return accountStore.incomeCategories
  }
  return accountStore.expenseCategories
})

// Form
const initialData = computed(() => ({
  accountId: props.account?.id || '',
  amount: 0,
  type: props.type,
  description: '',
  expenseCategory:
    props.type === 'expense' || props.type === 'income'
      ? ({
          type: props.type as 'expense' | 'income',
          category: ''
        } as ExpenseCategory)
      : undefined
}))

const { form, loading, formState, formData, isFormValid, handleSubmit } = useDialogForm({
  moduleName: 'OperationDialog',
  initialData: initialData.value,
  onSubmit: async data => {
    try {
      await accountStore.createOperation({
        ...data,
        performedBy: {
          type: 'user',
          id: authStore.userId,
          name: authStore.userName
        }
      })
      emit('success')
    } catch (error) {
      // Преобразуем ошибку в понятное пользователю сообщение
      if (error instanceof Error) {
        if (error.message === 'Insufficient funds') {
          form.value?.setErrors({
            amount: `Insufficient funds. Available: ${formatIDR(props.account?.balance || 0)}`
          })
        } else {
          form.value?.setErrors({
            amount: 'An error occurred while creating the operation'
          })
        }
      }
      throw error
    }
  }
})

// Methods
function validateAmount(value: number) {
  if (props.type === 'expense' && props.account) {
    const maxAmount = props.account.balance
    if (value > maxAmount) {
      return `Insufficient funds. Available: ${formatIDR(maxAmount)}`
    }
  }
  return true
}

watch(
  () => props.account?.balance,
  () => {
    if (form.value) {
      form.value.validate()
    }
  }
)
</script>
