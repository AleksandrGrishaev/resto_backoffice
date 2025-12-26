<script setup lang="ts">
// src/views/backoffice/accounts/payments/dialogs/LinkExpenseDialog.vue
// Sprint 4: Link Expense to Invoice Dialog

import { ref, computed, watch } from 'vue'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'
import type { InvoiceSuggestion } from '@/stores/pos/shifts/composables/useExpenseLinking'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  modelValue: boolean
  expense: ShiftExpenseOperation | null
  suggestions: InvoiceSuggestion[]
  availableAmount: number // Amount available for linking from this expense (expense.amount - usedAmount)
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', invoice: InvoiceSuggestion, amount: number): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  availableAmount: 0
})

const emit = defineEmits<Emits>()

// =============================================
// STATE
// =============================================

const selectedInvoice = ref<InvoiceSuggestion | null>(null)
const linkAmount = ref(0)
const searchQuery = ref('')

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const filteredSuggestions = computed(() => {
  if (!searchQuery.value) return props.suggestions

  const query = searchQuery.value.toLowerCase()
  return props.suggestions.filter(
    inv =>
      inv.orderNumber.toLowerCase().includes(query) ||
      inv.supplierName.toLowerCase().includes(query)
  )
})

// Maximum amount that can be linked - minimum of:
// 1. Available from expense (expense.amount - alreadyUsedAmount)
// 2. Unpaid amount on the selected invoice
const maxLinkAmount = computed(() => {
  if (!selectedInvoice.value) return props.availableAmount
  return Math.min(props.availableAmount, selectedInvoice.value.unpaidAmount)
})

const amountDifference = computed(() => {
  if (!selectedInvoice.value || !props.expense) return 0
  return linkAmount.value - props.availableAmount
})

const canConfirm = computed(() => {
  return (
    selectedInvoice.value !== null &&
    linkAmount.value > 0 &&
    linkAmount.value <= maxLinkAmount.value
  )
})

const amountError = computed(() => {
  if (!selectedInvoice.value) return ''
  if (linkAmount.value > props.availableAmount) {
    return `Exceeds available amount (${formatIDR(props.availableAmount)})`
  }
  if (linkAmount.value > selectedInvoice.value.unpaidAmount) {
    return `Exceeds invoice unpaid amount (${formatIDR(selectedInvoice.value.unpaidAmount)})`
  }
  return ''
})

// =============================================
// WATCHERS
// =============================================

// Reset state when expense changes
watch(
  () => props.expense,
  newExpense => {
    if (newExpense) {
      // Default to available amount (not full expense amount)
      linkAmount.value = props.availableAmount
      selectedInvoice.value = null
      searchQuery.value = ''
    }
  }
)

// Update linkAmount when availableAmount changes
watch(
  () => props.availableAmount,
  newAmount => {
    if (newAmount > 0) {
      linkAmount.value = newAmount
    }
  }
)

// Auto-select if only one suggestion with high score
watch(
  () => props.suggestions,
  suggestions => {
    if (suggestions.length === 1 && suggestions[0].matchScore >= 80) {
      selectedInvoice.value = suggestions[0]
    }
  }
)

// =============================================
// METHODS
// =============================================

function selectInvoice(invoice: InvoiceSuggestion) {
  selectedInvoice.value = invoice
  // Suggest the minimum of available amount and invoice unpaid amount
  linkAmount.value = Math.min(props.availableAmount, invoice.unpaidAmount)
}

function handleConfirm() {
  if (!selectedInvoice.value) return
  emit('confirm', selectedInvoice.value, linkAmount.value)
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}

function formatDate(dateStr: string): string {
  return TimeUtils.formatDateForDisplay(dateStr)
}

function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'grey'
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="700" persistent>
    <v-card v-if="expense">
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-link-variant</v-icon>
        Link Expense to Invoice
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Expense Info -->
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="d-flex justify-space-between align-center">
            <div>
              <div class="text-subtitle-2">{{ expense.counteragentName || 'Unknown' }}</div>
              <div class="text-caption text-grey">
                {{ expense.description || 'No description' }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-h6 font-weight-bold text-primary">
                {{ formatIDR(expense.amount) }}
              </div>
              <div v-if="availableAmount < expense.amount" class="text-caption text-success">
                Available to link: {{ formatIDR(availableAmount) }}
              </div>
            </div>
          </div>
        </v-alert>

        <!-- Search -->
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search invoices"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="mb-4"
        />

        <!-- Loading State -->
        <div v-if="loading" class="d-flex justify-center pa-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <!-- No Suggestions -->
        <v-alert v-else-if="suggestions.length === 0" type="warning" variant="tonal" class="mb-4">
          <v-icon start>mdi-alert</v-icon>
          No matching invoices found for this supplier.
        </v-alert>

        <!-- Invoice Suggestions -->
        <template v-else>
          <div class="text-subtitle-2 mb-2">
            Select Invoice ({{ filteredSuggestions.length }} found)
          </div>

          <v-list lines="two" class="suggestions-list border rounded mb-4" max-height="300">
            <v-list-item
              v-for="invoice in filteredSuggestions"
              :key="invoice.id"
              :active="selectedInvoice?.id === invoice.id"
              class="suggestion-item"
              @click="selectInvoice(invoice)"
            >
              <template #prepend>
                <v-avatar
                  :color="selectedInvoice?.id === invoice.id ? 'primary' : 'grey-lighten-2'"
                  size="40"
                >
                  <v-icon :color="selectedInvoice?.id === invoice.id ? 'white' : 'grey'">
                    {{ selectedInvoice?.id === invoice.id ? 'mdi-check' : 'mdi-file-document' }}
                  </v-icon>
                </v-avatar>
              </template>

              <v-list-item-title class="font-weight-medium">
                {{ invoice.orderNumber }}
                <v-chip
                  :color="getMatchScoreColor(invoice.matchScore)"
                  size="x-small"
                  variant="flat"
                  class="ml-2"
                >
                  {{ invoice.matchScore }}% match
                </v-chip>
              </v-list-item-title>

              <v-list-item-subtitle>
                <div class="d-flex flex-wrap gap-2 mt-1">
                  <span>{{ invoice.supplierName }}</span>
                  <v-chip size="x-small" color="success" variant="tonal">
                    Unpaid: {{ formatIDR(invoice.unpaidAmount) }}
                  </v-chip>
                  <v-chip size="x-small" variant="outlined">
                    Total: {{ formatIDR(invoice.totalAmount) }}
                  </v-chip>
                  <v-chip size="x-small" variant="outlined">
                    {{ formatDate(invoice.createdAt) }}
                  </v-chip>
                </div>
                <div v-if="invoice.matchReason" class="text-caption text-grey mt-1">
                  {{ invoice.matchReason }}
                </div>
              </v-list-item-subtitle>

              <template #append>
                <v-chip
                  :color="invoice.status === 'completed' ? 'success' : 'warning'"
                  size="small"
                  variant="tonal"
                >
                  {{ invoice.status }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </template>

        <!-- Link Amount -->
        <div v-if="selectedInvoice" class="link-amount-section pa-4 bg-grey-lighten-4 rounded">
          <div class="text-subtitle-2 mb-3">Link Amount</div>

          <v-text-field
            v-model.number="linkAmount"
            label="Amount to link"
            type="number"
            variant="outlined"
            density="compact"
            prefix="Rp"
            :error-messages="amountError"
            :hint="`Max: ${formatIDR(maxLinkAmount)}`"
            persistent-hint
          />

          <!-- Amount Breakdown -->
          <div class="d-flex justify-space-between text-body-2 mt-3">
            <span>Available from expense:</span>
            <span class="text-success">{{ formatIDR(availableAmount) }}</span>
          </div>
          <div class="d-flex justify-space-between text-body-2">
            <span>Invoice unpaid:</span>
            <span class="text-warning">{{ formatIDR(selectedInvoice.unpaidAmount) }}</span>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between font-weight-medium">
            <span>Maximum linkable:</span>
            <span class="text-primary">{{ formatIDR(maxLinkAmount) }}</span>
          </div>

          <!-- Info about remaining -->
          <v-alert
            v-if="linkAmount < availableAmount"
            type="info"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            <v-icon start size="small">mdi-information</v-icon>
            Remaining {{ formatIDR(availableAmount - linkAmount) }} can be linked to another
            invoice.
          </v-alert>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="handleCancel">Cancel</v-btn>

        <v-spacer />

        <v-btn
          color="primary"
          variant="flat"
          :disabled="!canConfirm"
          :loading="loading"
          @click="handleConfirm"
        >
          <v-icon start>mdi-link-variant</v-icon>
          Link Expense
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.suggestions-list {
  overflow-y: auto;
}

.suggestion-item {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.04);
  }
}

.link-amount-section {
  border: 1px solid rgba(var(--v-border-color), 0.12);
}
</style>
