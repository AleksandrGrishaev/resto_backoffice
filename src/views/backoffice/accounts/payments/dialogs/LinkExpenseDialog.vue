<script setup lang="ts">
// src/views/backoffice/accounts/payments/dialogs/LinkExpenseDialog.vue
// Sprint 4: Link Expense to Invoice Dialog
// Sprint 7: Converted to sequential multi-invoice allocation

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

// Link allocation item for multi-invoice linking
export interface LinkAllocation {
  invoice: InvoiceSuggestion
  allocatedAmount: number
  isFullyPaid: boolean // Whether invoice is fully paid by this allocation
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', invoice: InvoiceSuggestion, amount: number): void
  (e: 'confirm-multiple', links: LinkAllocation[]): void
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

const searchQuery = ref('')

// Allocation tracking - which invoices have been allocated and how much
const allocations = ref<LinkAllocation[]>([])

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

// Remaining amount to allocate
const remainingAmount = computed(() => {
  const totalAllocated = allocations.value.reduce((sum, a) => sum + a.allocatedAmount, 0)
  return props.availableAmount - totalAllocated
})

// Total allocated amount
const totalAllocated = computed(() => {
  return allocations.value.reduce((sum, a) => sum + a.allocatedAmount, 0)
})

// Can confirm if at least one invoice is allocated
const canConfirm = computed(() => {
  return allocations.value.length > 0 && allocations.value.some(a => a.allocatedAmount > 0)
})

// Invoices with allocation info for display
const invoicesWithAllocation = computed(() => {
  return filteredSuggestions.value.map(inv => {
    const allocation = allocations.value.find(a => a.invoice.id === inv.id)
    return {
      ...inv,
      allocatedAmount: allocation?.allocatedAmount || 0,
      isFullyPaid: allocation?.isFullyPaid || false,
      isAllocated: (allocation?.allocatedAmount || 0) > 0
    }
  })
})

// =============================================
// WATCHERS
// =============================================

// Reset state when expense changes
watch(
  () => props.expense,
  newExpense => {
    if (newExpense) {
      allocations.value = []
      searchQuery.value = ''
    }
  }
)

// Reset allocations when suggestions change
watch(
  () => props.suggestions,
  () => {
    allocations.value = []
  }
)

// =============================================
// METHODS
// =============================================

/**
 * Allocate payment amount to a specific invoice
 * User clicks on an invoice to allocate funds sequentially
 */
function allocateToInvoice(invoice: InvoiceSuggestion) {
  const existingIndex = allocations.value.findIndex(a => a.invoice.id === invoice.id)

  // If already allocated, remove allocation (toggle off)
  if (existingIndex >= 0) {
    allocations.value.splice(existingIndex, 1)
    return
  }

  // Can't add new allocation if no remaining amount
  if (remainingAmount.value <= 0) return

  // Allocate as much as possible (minimum of remaining amount and invoice unpaid)
  const amountToAllocate = Math.min(remainingAmount.value, invoice.unpaidAmount)
  const isFullyPaid = amountToAllocate >= invoice.unpaidAmount

  allocations.value.push({
    invoice,
    allocatedAmount: amountToAllocate,
    isFullyPaid
  })
}

/**
 * Clear all allocations
 */
function clearAllocations() {
  allocations.value = []
}

/**
 * Auto-allocate to all invoices in order (by match score, then date)
 */
function autoAllocateAll() {
  allocations.value = []
  let remaining = props.availableAmount

  // Sort by match score (highest first), then by date (oldest first for FIFO)
  const sortedInvoices = [...props.suggestions].sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  for (const invoice of sortedInvoices) {
    if (remaining <= 0) break

    const amountToAllocate = Math.min(remaining, invoice.unpaidAmount)

    allocations.value.push({
      invoice,
      allocatedAmount: amountToAllocate,
      isFullyPaid: amountToAllocate >= invoice.unpaidAmount
    })

    remaining -= amountToAllocate
  }
}

function handleConfirm() {
  if (!canConfirm.value) return

  // If only one allocation, use legacy single-invoice emit for backwards compatibility
  if (allocations.value.length === 1) {
    const alloc = allocations.value[0]
    emit('confirm', alloc.invoice, alloc.allocatedAmount)
  } else {
    // Multiple allocations - use new multi-invoice emit
    emit('confirm-multiple', allocations.value)
  }
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
  <v-dialog v-model="isOpen" max-width="700" persistent scrollable>
    <v-card v-if="expense">
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-link-variant</v-icon>
        Link Expense to Invoice(s)
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

        <!-- Allocation Summary -->
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="d-flex justify-space-between align-center">
            <div>
              <v-icon start size="small">mdi-cursor-pointer</v-icon>
              Click on invoices below to allocate funds
            </div>
            <div class="d-flex gap-2">
              <v-btn size="x-small" variant="outlined" @click="autoAllocateAll">
                <v-icon start size="small">mdi-auto-fix</v-icon>
                Auto (Best Match)
              </v-btn>
              <v-btn size="x-small" variant="text" @click="clearAllocations">Clear</v-btn>
            </div>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between">
            <span>Remaining to allocate:</span>
            <span
              :class="remainingAmount > 0 ? 'text-warning' : 'text-success'"
              class="font-weight-bold"
            >
              {{ formatIDR(remainingAmount) }}
            </span>
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

        <!-- Invoice Suggestions with Allocation -->
        <template v-else>
          <div class="text-subtitle-2 mb-2">
            Select Invoice(s) ({{ filteredSuggestions.length }} found)
          </div>

          <v-list lines="two" class="suggestions-list border rounded mb-4">
            <v-list-item
              v-for="invoice in invoicesWithAllocation"
              :key="invoice.id"
              class="suggestion-item mb-2"
              :class="{
                'allocated-item': invoice.isAllocated,
                'fully-paid-item': invoice.isFullyPaid
              }"
              @click="allocateToInvoice(invoice)"
            >
              <template #prepend>
                <v-checkbox
                  :model-value="invoice.isAllocated"
                  hide-details
                  readonly
                  density="compact"
                  class="mr-2"
                />
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
                  <v-chip size="x-small" color="warning" variant="tonal">
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
                <div v-if="invoice.isAllocated" class="text-right">
                  <div class="text-caption text-grey">Allocated:</div>
                  <div
                    class="font-weight-bold"
                    :class="invoice.isFullyPaid ? 'text-success' : 'text-warning'"
                  >
                    {{ formatIDR(invoice.allocatedAmount) }}
                  </div>
                  <v-chip v-if="invoice.isFullyPaid" size="x-small" color="success" variant="flat">
                    Full
                  </v-chip>
                  <v-chip v-else size="x-small" color="warning" variant="flat">Partial</v-chip>
                </div>
                <div v-else class="text-caption text-grey">Click to allocate</div>
              </template>
            </v-list-item>
          </v-list>
        </template>

        <!-- Info about remaining -->
        <v-alert
          v-if="allocations.length > 0 && remainingAmount > 0"
          type="info"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          <v-icon start size="small">mdi-information</v-icon>
          Remaining {{ formatIDR(remainingAmount) }} will stay unlinked. You can link it later.
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="loading" @click="handleCancel">Cancel</v-btn>

        <v-spacer />

        <div class="text-right mr-4">
          <div class="text-caption text-grey">Total Allocated:</div>
          <div class="text-h6 font-weight-bold text-primary">
            {{ formatIDR(totalAllocated) }}
          </div>
        </div>

        <v-btn
          color="primary"
          variant="flat"
          :disabled="!canConfirm"
          :loading="loading"
          @click="handleConfirm"
        >
          <v-icon start>mdi-link-variant</v-icon>
          Link {{ allocations.length }} Invoice{{ allocations.length !== 1 ? 's' : '' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.suggestions-list {
  max-height: 350px;
  overflow-y: auto;
}

.suggestion-item {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.04);
  }

  &.allocated-item {
    background-color: rgba(var(--v-theme-primary), 0.08);
    border-color: rgb(var(--v-theme-primary)) !important;
  }

  &.fully-paid-item {
    background-color: rgba(var(--v-theme-success), 0.08);
    border-color: rgb(var(--v-theme-success)) !important;
  }
}
</style>
