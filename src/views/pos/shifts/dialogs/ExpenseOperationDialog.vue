<!-- src/views/pos/shifts/dialogs/ExpenseOperationDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-error">
        <v-icon icon="mdi-cash-minus" color="white" class="me-3" />
        <span class="text-white">Expense from Cash Register</span>
      </v-card-title>

      <v-divider />

      <!-- Form -->
      <v-card-text class="pa-4">
        <v-form ref="formRef" v-model="formValid" @submit.prevent="createExpense">
          <!-- Amount -->
          <div class="mb-4">
            <v-text-field
              v-model.number="form.amount"
              label="Amount *"
              variant="outlined"
              type="number"
              min="0"
              step="1000"
              prefix="Rp"
              :rules="[rules.required, rules.positive]"
              prepend-inner-icon="mdi-currency-usd"
              autofocus
              hint="Enter expense amount"
              persistent-hint
            />
          </div>

          <!-- Category -->
          <div class="mb-4">
            <v-select
              v-model="form.category"
              label="Expense Category *"
              :items="expenseCategories"
              item-title="label"
              item-value="value"
              variant="outlined"
              :rules="[rules.required]"
              prepend-inner-icon="mdi-tag"
              hint="Select expense category"
              persistent-hint
            >
              <template #item="{ item, props: itemProps }">
                <v-list-item v-bind="itemProps">
                  <template #prepend>
                    <v-icon
                      :icon="item.value === 'supplier' ? 'mdi-truck-delivery' : 'mdi-tag'"
                      :color="item.value === 'supplier' ? 'purple' : undefined"
                    />
                  </template>
                  <template v-if="item.value === 'supplier'" #append>
                    <v-chip size="x-small" color="warning" variant="flat">Requires Linking</v-chip>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </div>

          <!-- Supplier Payment Warning -->
          <v-alert
            v-if="isSupplierCategory"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <div class="d-flex align-center">
              <v-icon icon="mdi-link-variant" class="me-2" />
              <div>
                <div class="text-subtitle-2">Supplier Payment - Linking Required</div>
                <div class="text-caption">
                  This expense will need to be linked to a Purchase Order in Backoffice before shift
                  reconciliation.
                </div>
              </div>
            </div>
          </v-alert>

          <!-- Counteragent (Required for Supplier category) -->
          <div class="mb-4">
            <v-autocomplete
              v-model="form.counteragentId"
              :label="isSupplierCategory ? 'Supplier *' : 'Counteragent (Optional)'"
              :items="counteragents"
              item-title="name"
              item-value="id"
              variant="outlined"
              prepend-inner-icon="mdi-account-tie"
              :clearable="!isSupplierCategory"
              :rules="isSupplierCategory ? [rules.required] : []"
              :hint="
                isSupplierCategory
                  ? 'Select supplier for this payment'
                  : 'Select service provider or supplier'
              "
              persistent-hint
              @update:model-value="onCounteragentChange"
            />
          </div>

          <!-- Description -->
          <div class="mb-4">
            <v-textarea
              v-model="form.description"
              label="Description *"
              variant="outlined"
              :rules="[rules.required]"
              prepend-inner-icon="mdi-text"
              rows="3"
              hint="Brief description of the expense"
              persistent-hint
            />
          </div>

          <!-- Invoice Number -->
          <div class="mb-4">
            <v-text-field
              v-model="form.invoiceNumber"
              label="Invoice Number (Optional)"
              variant="outlined"
              prepend-inner-icon="mdi-file-document"
              hint="Invoice or receipt number"
              persistent-hint
            />
          </div>

          <!-- Notes -->
          <div class="mb-4">
            <v-textarea
              v-model="form.notes"
              label="Additional Notes (Optional)"
              variant="outlined"
              prepend-inner-icon="mdi-note"
              rows="2"
              hint="Any additional information"
              persistent-hint
            />
          </div>

          <!-- Account Info (Read-only) -->
          <div class="mb-4">
            <v-alert type="info" variant="tonal" density="compact">
              <div class="d-flex align-center">
                <v-icon icon="mdi-cash-register" class="me-2" />
                <div>
                  <div class="text-subtitle-2">Account: Cash Register</div>
                  <div class="text-caption">
                    Expense will be deducted from cash register account
                  </div>
                </div>
              </div>
            </v-alert>
          </div>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="error"
          variant="elevated"
          :loading="loading"
          :disabled="!formValid || loading"
          @click="createExpense"
        >
          <v-icon icon="mdi-check" start />
          Create Expense
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts'
import { useCounteragentsStore } from '@/stores/counteragents'
import { useAuthStore } from '@/stores/auth'
import { useAccountStore } from '@/stores/account'
import type { CreateDirectExpenseDto } from '@/stores/pos/shifts/types'

// Props & Emits
const props = defineProps<{
  modelValue: boolean
  shiftId: string
  cashAccountId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'expense-created': [expenseId: string]
}>()

// Stores
const shiftsStore = useShiftsStore()
const counteragentsStore = useCounteragentsStore()
const authStore = useAuthStore()
const accountStore = useAccountStore()

// Local state
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
  description: '',
  invoiceNumber: '',
  notes: ''
})

// Expense categories for dropdown (from DB via store)
// Use posExpenseCategories which includes 'supplier' category for POS
const expenseCategories = computed(() => {
  return accountStore.posExpenseCategories.map(cat => ({
    value: cat.code,
    label: cat.name
  }))
})

// Counteragents list
const counteragents = computed(() => {
  return counteragentsStore.activeCounterAgents || []
})

// Check if supplier category is selected
const isSupplierCategory = computed(() => form.value.category === 'supplier')

// Validation rules
const rules = {
  required: (v: any) => !!v || 'This field is required',
  positive: (v: number) => v > 0 || 'Amount must be greater than 0',
  nonNegative: (v: number) => v >= 0 || 'Amount cannot be negative'
}

// Methods
function onCounteragentChange(counteragentId: string) {
  if (counteragentId) {
    const counteragent = counteragents.value.find(c => c.id === counteragentId)
    if (counteragent) {
      form.value.counteragentName = counteragent.name
    }
  } else {
    form.value.counteragentName = ''
  }
}

async function createExpense() {
  if (!formRef.value) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    loading.value = true

    const expenseData: CreateDirectExpenseDto = {
      shiftId: props.shiftId,
      accountId: props.cashAccountId,
      amount: form.value.amount,
      description: form.value.description,
      category: form.value.category,
      counteragentId: form.value.counteragentId || undefined,
      counteragentName: form.value.counteragentName || undefined,
      invoiceNumber: form.value.invoiceNumber || undefined,
      notes: form.value.notes || undefined,
      performedBy: {
        type: 'user',
        id: authStore.user?.id || 'unknown',
        name: authStore.user?.name || 'Unknown User'
      }
    }

    const result = await shiftsStore.createDirectExpense(expenseData)

    if (result.success && result.data) {
      emit('expense-created', result.data.id)
      closeDialog()
      resetForm()
    } else {
      console.error('Failed to create expense:', result.error)
      alert('Failed to create expense: ' + (result.error || 'Unknown error'))
    }
  } catch (error) {
    console.error('Error creating expense:', error)
    alert('Error creating expense')
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  emit('update:modelValue', false)
}

function resetForm() {
  form.value = {
    amount: 0,
    category: '',
    counteragentId: '',
    counteragentName: '',
    description: '',
    invoiceNumber: '',
    notes: ''
  }
  formRef.value?.resetValidation()
}

// Watch dialog close to reset form
watch(dialog, newValue => {
  if (!newValue) {
    resetForm()
  }
})
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
