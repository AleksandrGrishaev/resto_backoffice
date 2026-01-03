// src/components/accounts/dialogs/OperationDialog.vue
<template>
  <base-dialog
    ref="dialogRef"
    v-model="dialogModel"
    :title="title"
    :loading="loading"
    :disabled="!isFormValid || (isSupplierCategory && !formData.counteragentId)"
    @confirm="handleSubmit"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <!-- Account selector (if not pre-selected) -->
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
        >
          <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
              <template #prepend>
                <v-icon
                  :icon="item.raw.code === 'supplier' ? 'mdi-truck-delivery' : 'mdi-tag'"
                  :color="item.raw.code === 'supplier' ? 'purple' : undefined"
                />
              </template>
              <template v-if="item.raw.code === 'supplier'" #append>
                <v-chip size="x-small" color="warning" variant="flat">Requires Linking</v-chip>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </template>

      <!-- Supplier Payment Alert -->
      <v-alert v-if="isSupplierCategory" type="info" variant="tonal" density="compact" class="mb-4">
        <div class="d-flex align-center">
          <v-icon icon="mdi-link-variant" class="me-2" />
          <div>
            <div class="text-subtitle-2">Supplier Payment</div>
            <div class="text-caption">
              This payment can be linked to Purchase Orders in the Payments tab.
            </div>
          </div>
        </div>
      </v-alert>

      <!-- Supplier selector (required for supplier category) -->
      <v-autocomplete
        v-if="isSupplierCategory"
        v-model="formData.counteragentId"
        label="Supplier *"
        :items="supplierItems"
        item-title="name"
        item-value="id"
        :rules="[v => !!v || 'Supplier is required for supplier payments']"
        prepend-inner-icon="mdi-truck-delivery"
        clearable
        @update:model-value="onSupplierChange"
      />

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
import { useCounteragentsStore } from '@/stores/counteragents'
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
const counteragentsStore = useCounteragentsStore()

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
// For expenses, use backofficeExpenseCategories which includes supplier
const categoryItems = computed(() => {
  if (props.type === 'income') {
    return accountStore.incomeCategories
  }
  return accountStore.backofficeExpenseCategories
})

// Check if supplier category is selected
const isSupplierCategory = computed(() => formData.value.expenseCategory?.category === 'supplier')

// Get active suppliers for dropdown
const supplierItems = computed(() => {
  return counteragentsStore.supplierCounterAgents || []
})

// Form
const initialData = computed(() => ({
  accountId: props.account?.id || '',
  amount: 0,
  type: props.type,
  description: '',
  counteragentId: '',
  counteragentName: '',
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
      const operationData = {
        ...data,
        counteragentId: data.counteragentId || undefined,
        counteragentName: data.counteragentName || undefined,
        performedBy: {
          type: 'user' as const,
          id: authStore.userId,
          name: authStore.userName
        }
      }

      // Use unified method for supplier expenses to create PendingPayment for linking
      const isSupplierExpense =
        data.type === 'expense' &&
        data.expenseCategory?.category === 'supplier' &&
        data.counteragentId

      if (isSupplierExpense) {
        // Creates Transaction + PendingPayment for tracking in Unlinked tab
        await accountStore.createSupplierExpenseWithPayment(operationData)
      } else {
        // Standard operation (income, non-supplier expense, etc.)
        await accountStore.createOperation(operationData)
      }

      emit('success')
    } catch (error) {
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

function onSupplierChange(supplierId: string | null) {
  if (supplierId) {
    const supplier = supplierItems.value.find(s => s.id === supplierId)
    if (supplier) {
      formData.value.counteragentName = supplier.name
    }
  } else {
    formData.value.counteragentName = ''
  }
}

// Reset counteragent when category changes away from supplier
watch(
  () => formData.value.expenseCategory?.category,
  newCategory => {
    if (newCategory !== 'supplier') {
      formData.value.counteragentId = ''
      formData.value.counteragentName = ''
    }
  }
)

// Ensure counteragents are loaded when dialog opens and supplier category might be used
watch(
  () => props.modelValue,
  async isOpen => {
    if (isOpen && props.type === 'expense') {
      // Lazy load counteragents if not already loaded
      if (!counteragentsStore.counteragents?.length) {
        await counteragentsStore.initialize()
      }
    }
  }
)

watch(
  () => props.account?.balance,
  () => {
    if (form.value) {
      form.value.validate()
    }
  }
)
</script>
