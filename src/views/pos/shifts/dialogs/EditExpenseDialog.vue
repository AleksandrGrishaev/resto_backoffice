<!-- src/views/pos/shifts/dialogs/EditExpenseDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="expense">
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-primary">
        <v-icon icon="mdi-pencil" color="white" class="me-3" />
        <span class="text-white">Edit Expense</span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form ref="formRef" v-model="formValid" @submit.prevent="saveChanges">
          <!-- Amount -->
          <div class="mb-4">
            <NumericInputField
              v-model="form.amount"
              label="Amount *"
              variant="outlined"
              :min="0"
              :max="999999999"
              :format-as-currency="true"
              prefix="Rp"
              prepend-inner-icon="mdi-currency-usd"
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
            >
              <template #item="{ item, props: itemProps }">
                <v-list-item v-bind="itemProps">
                  <template #prepend>
                    <v-icon
                      :icon="item.value === 'supplier' ? 'mdi-truck-delivery' : 'mdi-tag'"
                      :color="item.value === 'supplier' ? 'purple' : undefined"
                    />
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </div>

          <!-- Supplier Warning -->
          <v-alert
            v-if="isSupplierCategory"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <div class="text-caption">
              Supplier Payment — will need to be linked to a Purchase Order in Backoffice.
            </div>
          </v-alert>

          <!-- Counteragent -->
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
            />
          </div>

          <!-- Notes -->
          <div class="mb-4">
            <v-textarea
              v-model="form.notes"
              label="Notes (Optional)"
              variant="outlined"
              prepend-inner-icon="mdi-note"
              rows="2"
            />
          </div>

          <!-- Reason for edit (required) -->
          <div class="mb-4">
            <v-textarea
              v-model="form.reason"
              label="Reason for Edit *"
              variant="outlined"
              :rules="[rules.required]"
              prepend-inner-icon="mdi-alert-circle"
              rows="2"
              hint="Explain why this expense needs to be changed"
              persistent-hint
              color="warning"
            />
          </div>

          <!-- Transaction info -->
          <v-alert
            v-if="expense.relatedTransactionId"
            type="info"
            variant="tonal"
            density="compact"
          >
            <div class="text-caption">
              This expense has a linked transaction. If you change amount or category, a reversal +
              new transaction will be created automatically.
            </div>
          </v-alert>
        </v-form>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="!formValid || !hasChanges || !form.reason.trim() || loading"
          @click="saveChanges"
        >
          <v-icon icon="mdi-check" start />
          Save Changes
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
import { useSnackbar } from '@/composables/useSnackbar'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'

const props = defineProps<{
  modelValue: boolean
  expense: ShiftExpenseOperation | null
  shiftId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'expense-edited': []
}>()

const shiftsStore = useShiftsStore()
const counteragentsStore = useCounteragentsStore()
const authStore = useAuthStore()
const accountStore = useAccountStore()
const { showError } = useSnackbar()

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
  notes: '',
  reason: ''
})

const expenseCategories = computed(() => {
  return accountStore.posExpenseCategories.map(cat => ({
    value: cat.code,
    label: cat.name
  }))
})

const counteragents = computed(() => {
  return counteragentsStore.activeCounterAgents || []
})

const isSupplierCategory = computed(() => form.value.category === 'supplier')

const hasChanges = computed(() => {
  if (!props.expense) return false
  return (
    form.value.amount !== props.expense.amount ||
    form.value.description !== props.expense.description ||
    form.value.category !== (props.expense.category || '') ||
    form.value.counteragentId !== (props.expense.counteragentId || '') ||
    form.value.notes !== (props.expense.notes || '')
  )
})

const rules = {
  required: (v: any) => !!v || 'This field is required'
}

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

async function saveChanges() {
  if (!formRef.value || !props.expense) return

  const { valid } = await formRef.value.validate()
  if (!valid || !form.value.reason.trim()) return

  try {
    loading.value = true

    const result = await shiftsStore.editExpense({
      shiftId: props.shiftId,
      expenseId: props.expense.id,
      amount: form.value.amount !== props.expense.amount ? form.value.amount : undefined,
      description:
        form.value.description !== props.expense.description ? form.value.description : undefined,
      category:
        form.value.category !== (props.expense.category || '') ? form.value.category : undefined,
      counteragentId:
        form.value.counteragentId !== (props.expense.counteragentId || '')
          ? form.value.counteragentId // empty string = clear, non-empty = set
          : undefined, // undefined = no change
      counteragentName:
        form.value.counteragentName !== (props.expense.counteragentName || '')
          ? form.value.counteragentName
          : undefined,
      notes: form.value.notes !== (props.expense.notes || '') ? form.value.notes : undefined,
      reason: form.value.reason.trim(),
      performedBy: {
        type: 'user',
        id: authStore.user?.id || 'unknown',
        name: authStore.user?.name || 'Unknown User'
      }
    })

    if (result.success) {
      emit('expense-edited')
      closeDialog()
    } else {
      console.error('Failed to edit expense:', result.error)
      showError('Failed to edit expense: ' + (result.error || 'Unknown error'))
    }
  } catch (err) {
    console.error('Error editing expense:', err)
    showError('Error editing expense')
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  emit('update:modelValue', false)
}

// Populate form when expense changes or dialog opens
watch(
  [() => props.expense, dialog],
  ([expense, isOpen]) => {
    if (isOpen && expense) {
      form.value = {
        amount: expense.amount,
        category: expense.category || '',
        counteragentId: expense.counteragentId || '',
        counteragentName: expense.counteragentName || '',
        description: expense.description,
        notes: expense.notes || '',
        reason: ''
      }
      // Lazy load counteragents
      if (!counteragentsStore.counteragents?.length) {
        counteragentsStore.initialize()
      }
    }
  },
  { immediate: true }
)
</script>
