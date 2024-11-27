// src/components/accounts/dialogs/OperationDialog.vue
<template>
  <base-dialog
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
        label="Счет"
        :items="accountItems"
        item-title="name"
        item-value="id"
        :rules="[v => !!v || 'Обязательное поле']"
        required
      />

      <v-text-field
        v-model.number="formData.amount"
        label="Сумма"
        type="number"
        :rules="[v => !!v || 'Обязательное поле', v => v > 0 || 'Сумма должна быть больше 0']"
        required
      />

      <!-- Поля для расходов -->
      <template v-if="type === 'expense'">
        <v-select
          v-model="formData.expenseCategory.type"
          label="Тип расхода"
          :items="expenseTypes"
          :rules="[v => !!v || 'Обязательное поле']"
          required
          @update:model-value="handleExpenseTypeChange"
        />

        <v-select
          v-model="formData.expenseCategory.category"
          label="Категория"
          :items="categoryItems"
          :rules="[v => !!v || 'Обязательное поле']"
          required
        />
      </template>

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
import { useAccountStore } from '@/stores/account.store'
import { useAuthStore } from '@/stores/auth.store'
import { useDialogForm } from '@/composables/useDialogForm'
import { EXPENSE_CATEGORIES } from '@/types'
import type { Account } from '@/types'
import type { OperationType, ExpenseCategory } from '@/types/transaction'

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
    income: 'Новый приход',
    expense: 'Новый расход',
    transfer: 'Новый перевод',
    correction: 'Корректировка баланса'
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

const expenseTypes = [
  { title: 'Ежедневные расходы', value: 'daily' },
  { title: 'Инвестиции', value: 'investment' }
]

const categoryItems = computed(() => {
  const type = formData.value.expenseCategory?.type
  if (!type) return []

  return Object.entries(EXPENSE_CATEGORIES[type]).map(([value, title]) => ({
    title,
    value
  }))
})

// Form
const initialData = computed(() => ({
  accountId: props.account?.id || '',
  amount: 0,
  type: props.type,
  description: '',
  expenseCategory:
    props.type === 'expense'
      ? ({
          type: 'daily',
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
      console.error('Failed to create operation:', error)
      throw error
    }
  }
})

// Methods
function handleExpenseTypeChange() {
  formData.value.expenseCategory!.category = ''
}
</script>
