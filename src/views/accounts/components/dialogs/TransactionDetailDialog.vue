<!-- src/views/accounts/components/dialogs/TransactionDetailDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="800px" persistent>
    <v-card>
      <!-- Основной контент: Header + BasicInfo -->
      <transaction-detail-content :transaction="transaction" @close="closeDialog" />

      <!-- Специальные виджеты -->
      <component
        :is="getWidgetComponent(transaction)"
        v-if="getWidgetComponent(transaction)"
        :transaction="transaction"
      />

      <!-- Actions -->
      <v-card-actions>
        <v-btn
          v-if="canCorrect"
          color="warning"
          variant="tonal"
          prepend-icon="mdi-file-document-edit"
          @click="showCorrectDialog = true"
        >
          Correct
        </v-btn>
        <v-chip
          v-else-if="belongsToActiveShift"
          color="info"
          variant="tonal"
          size="small"
          prepend-icon="mdi-cash-register"
        >
          Active shift — edit via POS
        </v-chip>
        <v-spacer />
        <v-btn variant="outlined" @click="closeDialog">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Correct Transaction Dialog -->
  <correct-transaction-dialog
    v-model="showCorrectDialog"
    :transaction="transaction"
    @correction-applied="handleCorrectionApplied"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TransactionDetailContent from './transaction-detail/TransactionDetailContent.vue'
import SupplierPaymentContextWidget from './transaction-detail/SupplierPaymentContextWidget.vue'
import CorrectTransactionDialog from './CorrectTransactionDialog.vue'
import { usePermissions } from '@/stores/auth/composables'
import { supabase } from '@/supabase'
import type { Transaction } from '@/stores/account'

interface Props {
  modelValue: boolean
  transaction: Transaction | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'transaction-corrected': []
}>()

const { hasAnyRole } = usePermissions()
const showCorrectDialog = ref(false)
const belongsToActiveShift = ref(false)

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Check if this transaction belongs to an active shift (created after shift start)
watch(
  [isOpen, () => props.transaction],
  async ([open, tx]) => {
    belongsToActiveShift.value = false
    if (!open || !tx) return
    try {
      const { data: activeShift } = await supabase
        .from('shifts')
        .select('start_time')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      if (activeShift && new Date(tx.createdAt) >= new Date(activeShift.start_time)) {
        belongsToActiveShift.value = true
      }
    } catch {
      // If check fails, allow correction
    }
  },
  { immediate: true }
)

// Only allow correction for expense/income transactions, not corrections/transfers
// And only for admin/manager roles
// Block if transaction belongs to the currently active POS shift
const canCorrect = computed(() => {
  if (!props.transaction) return false
  if (belongsToActiveShift.value) return false
  const tx = props.transaction
  // Don't allow correcting reversal/correction transactions
  if (tx.description.startsWith('[REVERSAL]') || tx.description.startsWith('[COMPENSATION]'))
    return false
  if (tx.type === 'correction' || tx.type === 'transfer') return false
  if (tx.isCorrection) return false
  // Role check
  return hasAnyRole(['admin', 'manager'])
})

// Methods
function closeDialog() {
  emit('update:modelValue', false)
}

function handleCorrectionApplied() {
  showCorrectDialog.value = false
  emit('transaction-corrected')
  closeDialog()
}

function getWidgetComponent(transaction: Transaction | null) {
  if (!transaction) return null

  if (isSupplierPayment(transaction)) {
    return SupplierPaymentContextWidget
  }

  return null
}

function isSupplierPayment(transaction: Transaction): boolean {
  return (
    transaction.type === 'expense' &&
    !!transaction.counteragentId &&
    transaction.expenseCategory?.category === 'product'
  )
}
</script>
