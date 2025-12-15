<script setup lang="ts">
// src/views/backoffice/accounts/payments/dialogs/UnlinkExpenseDialog.vue
// Sprint 5: Unlink Expense from Invoice Dialog

import { ref, computed, watch } from 'vue'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  modelValue: boolean
  expense: ShiftExpenseOperation | null
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', reason: string): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// =============================================
// STATE
// =============================================

const unlinkReason = ref('')
const selectedReasonType = ref<string | null>(null)

// Predefined reasons
const predefinedReasons = [
  { value: 'wrong_invoice', label: 'Wrong invoice selected' },
  { value: 'amount_mismatch', label: 'Amount mismatch' },
  { value: 'duplicate_link', label: 'Duplicate linking' },
  { value: 'invoice_cancelled', label: 'Invoice was cancelled' },
  { value: 'other', label: 'Other reason' }
]

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const canConfirm = computed(() => {
  if (!selectedReasonType.value) return false
  if (selectedReasonType.value === 'other' && !unlinkReason.value.trim()) return false
  return true
})

const finalReason = computed(() => {
  if (selectedReasonType.value === 'other') {
    return unlinkReason.value.trim()
  }
  const preset = predefinedReasons.find(r => r.value === selectedReasonType.value)
  return preset?.label || unlinkReason.value
})

// =============================================
// WATCHERS
// =============================================

// Reset state when dialog opens
watch(
  () => props.modelValue,
  open => {
    if (open) {
      unlinkReason.value = ''
      selectedReasonType.value = null
    }
  }
)

// =============================================
// METHODS
// =============================================

function handleConfirm() {
  if (!canConfirm.value) return
  emit('confirm', finalReason.value)
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}

function formatDate(dateStr: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateStr)
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="500" persistent>
    <v-card v-if="expense">
      <v-card-title class="d-flex align-center text-error">
        <v-icon start color="error">mdi-link-variant-off</v-icon>
        Unlink Expense
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Warning -->
        <v-alert type="warning" variant="tonal" class="mb-4">
          <v-icon start size="small">mdi-alert</v-icon>
          This action will remove the link between this expense and the invoice. The expense will
          return to "Unlinked" status.
        </v-alert>

        <!-- Expense Info -->
        <div class="expense-info pa-3 bg-grey-lighten-4 rounded mb-4">
          <div class="text-subtitle-2 mb-2">Expense Details</div>

          <div class="d-flex justify-space-between mb-1">
            <span class="text-body-2 text-grey">Supplier:</span>
            <span class="text-body-2 font-weight-medium">
              {{ expense.counteragentName || 'Unknown' }}
            </span>
          </div>

          <div class="d-flex justify-space-between mb-1">
            <span class="text-body-2 text-grey">Amount:</span>
            <span class="text-body-2 font-weight-bold text-primary">
              {{ formatIDR(expense.amount) }}
            </span>
          </div>

          <div v-if="expense.linkedOrderId" class="d-flex justify-space-between mb-1">
            <span class="text-body-2 text-grey">Linked Invoice:</span>
            <span class="text-body-2">
              {{ expense.invoiceNumber || expense.linkedOrderId.slice(0, 8) + '...' }}
            </span>
          </div>

          <div class="d-flex justify-space-between">
            <span class="text-body-2 text-grey">Created:</span>
            <span class="text-body-2">{{ formatDate(expense.createdAt) }}</span>
          </div>
        </div>

        <!-- Reason Selection -->
        <div class="text-subtitle-2 mb-2">Reason for unlinking *</div>

        <v-radio-group v-model="selectedReasonType" class="mt-0">
          <v-radio
            v-for="reason in predefinedReasons"
            :key="reason.value"
            :label="reason.label"
            :value="reason.value"
            density="compact"
          />
        </v-radio-group>

        <!-- Custom Reason Input -->
        <v-textarea
          v-if="selectedReasonType === 'other'"
          v-model="unlinkReason"
          label="Specify reason"
          variant="outlined"
          density="compact"
          rows="2"
          :rules="[v => !!v.trim() || 'Please specify a reason']"
          class="mt-2"
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="handleCancel">Cancel</v-btn>

        <v-spacer />

        <v-btn
          color="error"
          variant="flat"
          :disabled="!canConfirm"
          :loading="loading"
          @click="handleConfirm"
        >
          <v-icon start>mdi-link-variant-off</v-icon>
          Unlink Expense
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.expense-info {
  border: 1px solid rgba(var(--v-border-color), 0.12);
}
</style>
