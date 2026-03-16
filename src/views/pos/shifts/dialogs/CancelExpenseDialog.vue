<!-- src/views/pos/shifts/dialogs/CancelExpenseDialog.vue -->
<template>
  <v-dialog
    v-model="dialog"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="expense">
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-error">
        <v-icon icon="mdi-cancel" color="white" class="me-3" />
        <span class="text-white">Cancel Expense</span>
      </v-card-title>

      <v-divider />

      <!-- Expense summary -->
      <v-card-text class="pa-4">
        <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
          <div class="text-subtitle-2">You are about to cancel this expense:</div>
          <div class="mt-2">
            <div>
              <strong>Amount:</strong>
              Rp {{ formatCurrency(expense.amount) }}
            </div>
            <div>
              <strong>Description:</strong>
              {{ expense.description }}
            </div>
            <div v-if="expense.counteragentName">
              <strong>Counteragent:</strong>
              {{ expense.counteragentName }}
            </div>
            <div>
              <strong>Type:</strong>
              {{ expense.type === 'supplier_payment' ? 'Supplier Payment' : 'Direct Expense' }}
            </div>
          </div>
          <div v-if="expense.relatedTransactionId" class="mt-2 text-caption">
            A reversal transaction will be created to restore the account balance.
          </div>
        </v-alert>

        <!-- Reason -->
        <v-textarea
          v-model="reason"
          label="Cancellation Reason *"
          variant="outlined"
          :rules="[rules.required]"
          prepend-inner-icon="mdi-text"
          rows="3"
          hint="Explain why this expense is being cancelled"
          persistent-hint
        />
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="closeDialog">Back</v-btn>
        <v-btn
          color="error"
          variant="elevated"
          :loading="loading"
          :disabled="!reason.trim() || loading"
          @click="confirmCancel"
        >
          <v-icon icon="mdi-cancel" start />
          Cancel Expense
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts'
import { useAuthStore } from '@/stores/auth'
import { useSnackbar } from '@/composables/useSnackbar'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'

const props = defineProps<{
  modelValue: boolean
  expense: ShiftExpenseOperation | null
  shiftId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'expense-cancelled': []
}>()

const shiftsStore = useShiftsStore()
const authStore = useAuthStore()
const { showError } = useSnackbar()

const dialog = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const reason = ref('')
const loading = ref(false)

const rules = {
  required: (v: string) => !!v?.trim() || 'This field is required'
}

async function confirmCancel() {
  if (!props.expense || !reason.value.trim()) return

  try {
    loading.value = true

    const result = await shiftsStore.cancelExpense({
      shiftId: props.shiftId,
      expenseId: props.expense.id,
      reason: reason.value.trim(),
      performedBy: {
        type: 'user',
        id: authStore.user?.id || 'unknown',
        name: authStore.user?.name || 'Unknown User'
      }
    })

    if (result.success) {
      emit('expense-cancelled')
      closeDialog()
    } else {
      console.error('Failed to cancel expense:', result.error)
      showError('Failed to cancel expense: ' + (result.error || 'Unknown error'))
    }
  } catch (err) {
    console.error('Error cancelling expense:', err)
    showError('Error cancelling expense')
  } finally {
    loading.value = false
  }
}

function closeDialog() {
  emit('update:modelValue', false)
}

watch(dialog, newVal => {
  if (!newVal) {
    reason.value = ''
  }
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}
</script>
