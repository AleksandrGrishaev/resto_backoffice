<!-- src/views/accounts/components/dialogs/CorrectTransactionDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="650"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="transaction">
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-warning-darken-1">
        <v-icon icon="mdi-file-document-edit" color="white" class="me-3" />
        <span class="text-white">Correct Transaction</span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Original transaction info -->
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          <div class="text-subtitle-2 mb-1">Original Transaction</div>
          <div class="d-flex flex-column gap-1">
            <div>
              <strong>Type:</strong>
              {{ transaction.type }}
            </div>
            <div>
              <strong>Amount:</strong>
              {{ formatIDR(transaction.amount) }}
            </div>
            <div>
              <strong>Description:</strong>
              {{ transaction.description }}
            </div>
            <div v-if="transaction.counteragentName">
              <strong>Counteragent:</strong>
              {{ transaction.counteragentName }}
            </div>
            <div v-if="transaction.expenseCategory">
              <strong>Category:</strong>
              {{ getCategoryLabel(transaction.expenseCategory.category) }}
            </div>
          </div>
        </v-alert>

        <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
          A reversal will be created for the original transaction, and a new corrected transaction
          will replace it. Both will appear in the transaction history.
        </v-alert>

        <v-form ref="formRef" v-model="formValid" @submit.prevent="handleSubmit">
          <!-- Amount -->
          <v-text-field
            v-model.number="form.amount"
            label="Amount"
            type="number"
            variant="outlined"
            :rules="[v => v > 0 || 'Amount must be greater than 0']"
            prefix="Rp"
            class="mb-3"
          />

          <!-- Category (for expense/income) -->
          <v-select
            v-if="transaction.expenseCategory"
            v-model="form.category"
            label="Category"
            :items="categoryItems"
            item-title="name"
            item-value="code"
            variant="outlined"
            :rules="[v => !!v || 'Category is required']"
            class="mb-3"
          >
            <template #item="{ item, props: itemProps }">
              <v-list-item v-bind="itemProps">
                <template #prepend>
                  <v-icon
                    :icon="item.raw.code === 'supplier' ? 'mdi-truck-delivery' : 'mdi-tag'"
                    :color="item.raw.code === 'supplier' ? 'purple' : undefined"
                  />
                </template>
              </v-list-item>
            </template>
          </v-select>

          <!-- Counteragent -->
          <v-autocomplete
            v-model="form.counteragentId"
            :label="isSupplierCategory ? 'Supplier *' : 'Counteragent (Optional)'"
            :items="counteragents"
            item-title="name"
            item-value="id"
            variant="outlined"
            prepend-inner-icon="mdi-account-tie"
            clearable
            :rules="isSupplierCategory ? [v => !!v || 'Supplier is required'] : []"
            class="mb-3"
            @update:model-value="onCounteragentChange"
          />

          <!-- Accrual Date -->
          <v-text-field
            v-if="transaction.type === 'expense'"
            v-model="form.accrualDate"
            label="Expense Period Date"
            type="date"
            variant="outlined"
            class="mb-3"
          />
          <v-alert
            v-if="transaction.type === 'expense' && isAccrualDateDifferent"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-3"
          >
            This expense will be attributed to
            <strong>{{ form.accrualDate }}</strong>
            instead of today. It will appear in that period's P&L (accrual basis).
          </v-alert>

          <!-- Description -->
          <v-text-field
            v-model="form.description"
            label="Description"
            variant="outlined"
            class="mb-3"
          />

          <!-- Reason (required) -->
          <v-textarea
            v-model="form.reason"
            label="Reason for Correction *"
            variant="outlined"
            :rules="[v => !!v?.trim() || 'Reason is required']"
            rows="2"
            hint="Explain why this transaction needs correction"
            persistent-hint
            color="warning"
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="warning"
          variant="elevated"
          :loading="loading"
          :disabled="!formValid || !hasChanges || !form.reason.trim() || loading"
          @click="handleSubmit"
        >
          <v-icon icon="mdi-check" start />
          Apply Correction
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAccountStore } from '@/stores/account'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useAuthStore } from '@/stores/auth'
import { formatIDR } from '@/utils/currency'
import type { Transaction } from '@/stores/account'

const props = defineProps<{
  modelValue: boolean
  transaction: Transaction | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'correction-applied': []
}>()

const accountStore = useAccountStore()
const counteragentsStore = useCounteragentsStore()
const authStore = useAuthStore()

const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const formRef = ref()
const formValid = ref(false)
const loading = ref(false)

const form = ref({
  amount: 0,
  category: '',
  counteragentId: '',
  counteragentName: '',
  accrualDate: '',
  description: '',
  reason: ''
})

const categoryItems = computed(() => {
  if (!props.transaction?.expenseCategory) return []
  const type = props.transaction.expenseCategory.type
  return type === 'expense'
    ? accountStore.backofficeExpenseCategories
    : accountStore.incomeCategories
})

const counteragents = computed(() => counteragentsStore.activeCounterAgents || [])

const isSupplierCategory = computed(() => form.value.category === 'supplier')

const hasChanges = computed(() => {
  if (!props.transaction) return false
  const origAccrualDate = props.transaction.accrualDate
    ? props.transaction.accrualDate.split('T')[0]
    : ''
  return (
    form.value.amount !== props.transaction.amount ||
    form.value.description !== props.transaction.description ||
    form.value.category !== (props.transaction.expenseCategory?.category || '') ||
    form.value.counteragentId !== (props.transaction.counteragentId || '') ||
    form.value.accrualDate !== origAccrualDate
  )
})

const isAccrualDateDifferent = computed(() => {
  if (!form.value.accrualDate) return false
  const today = new Date().toISOString().split('T')[0]
  return form.value.accrualDate !== today
})

function getCategoryLabel(code: string): string {
  return accountStore.getCategoryLabel(code)
}

function onCounteragentChange(id: string) {
  if (id) {
    const c = counteragents.value.find(c => c.id === id)
    if (c) form.value.counteragentName = c.name
  } else {
    form.value.counteragentName = ''
  }
}

async function handleSubmit() {
  if (!formRef.value || !props.transaction) return
  const { valid } = await formRef.value.validate()
  if (!valid || !form.value.reason.trim()) return

  try {
    loading.value = true
    const tx = props.transaction

    await accountStore.correctTransaction({
      originalTransactionId: tx.id,
      accountId: tx.accountId,
      amount: form.value.amount !== tx.amount ? form.value.amount : undefined,
      description: form.value.description !== tx.description ? form.value.description : undefined,
      category:
        form.value.category !== (tx.expenseCategory?.category || '')
          ? form.value.category
          : undefined,
      counteragentId:
        form.value.counteragentId !== (tx.counteragentId || '')
          ? form.value.counteragentId
          : undefined,
      counteragentName:
        form.value.counteragentName !== (tx.counteragentName || '')
          ? form.value.counteragentName
          : undefined,
      accrualDate:
        form.value.accrualDate !== (tx.accrualDate ? tx.accrualDate.split('T')[0] : '')
          ? form.value.accrualDate
          : undefined,
      reason: form.value.reason.trim(),
      performedBy: {
        type: 'user',
        id: authStore.user?.id || '',
        name: authStore.user?.name || 'Unknown'
      }
    })

    emit('correction-applied')
    closeDialog()
  } catch (err) {
    console.error('Failed to correct transaction:', err)
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  emit('update:modelValue', false)
}

// Populate form when transaction changes
watch(
  [() => props.transaction, dialog],
  ([tx, isOpen]) => {
    if (isOpen && tx) {
      form.value = {
        amount: tx.amount,
        category: tx.expenseCategory?.category || '',
        counteragentId: tx.counteragentId || '',
        counteragentName: tx.counteragentName || '',
        accrualDate: tx.accrualDate ? tx.accrualDate.split('T')[0] : '',
        description: tx.description,
        reason: ''
      }
      if (!counteragentsStore.counteragents?.length) {
        counteragentsStore.initialize()
      }
    }
  },
  { immediate: true }
)
</script>
