<script setup lang="ts">
// src/views/backoffice/accounts/payments/components/UnlinkedExpensesList.vue
// Sprint 4: Unlinked Expenses List Component
// Sprint 7: Added account filter, source display, and backoffice payment support

import { computed, ref } from 'vue'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'
import type { PendingPayment } from '@/stores/account/types'
import type { ExpenseWithSource } from '@/stores/pos/shifts/composables/useExpenseLinking'
import { useAccountStore } from '@/stores/account'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  expenses: (ShiftExpenseOperation | ExpenseWithSource)[]
  payments: PendingPayment[] // For showing available amounts
  loading?: boolean
}

interface Emits {
  (e: 'link', expense: ShiftExpenseOperation): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  payments: () => []
})

const emit = defineEmits<Emits>()

// Account store for getting account names
const accountStore = useAccountStore()

// Filter state
const accountFilter = ref<string | null>(null)
const sourceFilter = ref<string | null>(null) // 'pos' | 'backoffice' | null

// =============================================
// METHODS
// =============================================

function handleLink(expense: ShiftExpenseOperation) {
  emit('link', expense)
}

/**
 * Get available amount for an expense
 * If expense has relatedPaymentId, check the payment's usedAmount
 */
function getAvailableAmount(expense: ShiftExpenseOperation | ExpenseWithSource): number {
  if (!expense.relatedPaymentId) {
    return expense.amount
  }
  const payment = props.payments.find(p => p.id === expense.relatedPaymentId)
  if (!payment) {
    return expense.amount
  }
  return payment.amount - (payment.usedAmount || 0)
}

/**
 * Check if expense is partially linked
 */
function isPartiallyLinked(expense: ShiftExpenseOperation | ExpenseWithSource): boolean {
  const available = getAvailableAmount(expense)
  return available > 0 && available < expense.amount
}

/**
 * Get account name from ID
 */
function getAccountName(accountId: string | undefined): string {
  if (!accountId) return 'Unknown'
  const account = accountStore.getAccountById(accountId)
  return account?.name || 'Unknown'
}

/**
 * Get source type for display
 */
function getSourceType(expense: ShiftExpenseOperation | ExpenseWithSource): 'pos' | 'backoffice' {
  return (expense as ExpenseWithSource).sourceType || (expense.shiftId ? 'pos' : 'backoffice')
}

// =============================================
// COMPUTED (after methods so they can use getAvailableAmount)
// =============================================

// Get unique accounts from expenses for filter
const accountOptions = computed(() => {
  const accountIds = new Set(
    props.expenses.map(e => e.relatedAccountId).filter((id): id is string => !!id)
  )
  return Array.from(accountIds).map(id => ({
    id,
    name: getAccountName(id)
  }))
})

// Source type options for filter
const sourceOptions = [
  { value: null, title: 'All Sources' },
  { value: 'pos', title: 'POS (Cash Register)' },
  { value: 'backoffice', title: 'Backoffice' }
]

// Filtered and sorted expenses
const filteredExpenses = computed(() => {
  let result = [...props.expenses]

  // ✅ FIX: Safety filter - exclude payments with no available amount
  // This ensures fully linked payments don't appear even if cache is stale
  result = result.filter(exp => getAvailableAmount(exp) > 0)

  // Filter by account
  if (accountFilter.value) {
    result = result.filter(exp => exp.relatedAccountId === accountFilter.value)
  }

  // Filter by source type
  if (sourceFilter.value) {
    result = result.filter(exp => getSourceType(exp) === sourceFilter.value)
  }

  // Sort by date descending
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return result
})

// Legacy alias for template compatibility
const sortedExpenses = filteredExpenses

// Total available amount (not total expense amount)
const totalAvailableAmount = computed(() => {
  return props.expenses.reduce((sum, exp) => sum + getAvailableAmount(exp), 0)
})

function getExpenseIcon(type: ShiftExpenseOperation['type']): string {
  switch (type) {
    case 'supplier_payment':
      return 'mdi-truck-delivery'
    case 'unlinked_expense':
      return 'mdi-cash-minus'
    case 'direct_expense':
      return 'mdi-cash-remove'
    default:
      return 'mdi-cash'
  }
}

function formatDate(dateStr: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateStr)
}
</script>

<template>
  <v-card-text>
    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty State -->
    <v-alert v-else-if="expenses.length === 0" type="success" variant="tonal">
      <v-icon start>mdi-check-circle</v-icon>
      All expenses are linked to invoices. Great job!
    </v-alert>

    <!-- Expenses List -->
    <template v-else>
      <!-- Filters Row -->
      <v-row class="mb-4" dense>
        <v-col cols="12" sm="6" md="4">
          <v-select
            v-model="accountFilter"
            :items="[{ id: null, name: 'All Accounts' }, ...accountOptions]"
            item-title="name"
            item-value="id"
            label="Filter by Account"
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-wallet"
            clearable
          />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-select
            v-model="sourceFilter"
            :items="sourceOptions"
            item-title="title"
            item-value="value"
            label="Filter by Source"
            density="compact"
            variant="outlined"
            hide-details
            prepend-inner-icon="mdi-source-branch"
          />
        </v-col>
      </v-row>

      <!-- Summary -->
      <v-alert type="warning" variant="tonal" class="mb-4">
        <div class="d-flex align-center justify-space-between">
          <span>
            <v-icon start size="small">mdi-alert</v-icon>
            {{ filteredExpenses.length }} expense(s) need to be linked
            <span v-if="filteredExpenses.length !== expenses.length" class="text-caption">
              ({{ expenses.length }} total)
            </span>
          </span>
          <span class="font-weight-bold">Total: {{ formatIDR(totalAvailableAmount) }}</span>
        </div>
      </v-alert>

      <!-- List -->
      <v-list lines="two">
        <v-list-item
          v-for="expense in sortedExpenses"
          :key="expense.id"
          class="mb-2 border rounded expense-item"
        >
          <template #prepend>
            <v-avatar color="warning" variant="tonal">
              <v-icon>{{ getExpenseIcon(expense.type) }}</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ expense.counteragentName || expense.description || 'Unknown Expense' }}
          </v-list-item-title>

          <v-list-item-subtitle>
            <div class="d-flex flex-wrap gap-2 mt-1">
              <!-- Amount - show both total and available if partially linked -->
              <v-chip
                v-if="isPartiallyLinked(expense)"
                size="small"
                color="warning"
                variant="tonal"
              >
                Available: {{ formatIDR(getAvailableAmount(expense)) }}
                <span class="text-caption ml-1">(of {{ formatIDR(expense.amount) }})</span>
              </v-chip>
              <v-chip v-else size="small" color="error" variant="tonal">
                {{ formatIDR(expense.amount) }}
              </v-chip>

              <!-- Source Type Badge (POS vs Backoffice) -->
              <v-chip
                size="x-small"
                :color="getSourceType(expense) === 'backoffice' ? 'info' : 'warning'"
                variant="flat"
              >
                <v-icon start size="x-small">
                  {{
                    getSourceType(expense) === 'backoffice'
                      ? 'mdi-desktop-mac'
                      : 'mdi-cash-register'
                  }}
                </v-icon>
                {{ getSourceType(expense) === 'backoffice' ? 'Backoffice' : 'POS' }}
              </v-chip>

              <!-- Source Account -->
              <v-chip v-if="expense.relatedAccountId" size="x-small" color="purple" variant="tonal">
                <v-icon start size="x-small">mdi-wallet</v-icon>
                {{ getAccountName(expense.relatedAccountId) }}
              </v-chip>

              <!-- Shift Info (only for POS) -->
              <v-chip
                v-if="expense.shiftId && getSourceType(expense) === 'pos'"
                size="x-small"
                variant="outlined"
              >
                <v-icon start size="x-small">mdi-clock-outline</v-icon>
                Shift: {{ expense.shiftId.slice(0, 8) }}...
              </v-chip>

              <!-- Date -->
              <v-chip size="x-small" variant="outlined">
                <v-icon start size="x-small">mdi-calendar</v-icon>
                {{ formatDate(expense.createdAt) }}
              </v-chip>

              <!-- Invoice Number if exists -->
              <v-chip v-if="expense.invoiceNumber" size="x-small" color="info" variant="outlined">
                <v-icon start size="x-small">mdi-file-document</v-icon>
                {{ expense.invoiceNumber }}
              </v-chip>
            </div>
          </v-list-item-subtitle>

          <!-- Notes -->
          <div v-if="expense.notes" class="text-caption text-grey mt-2">
            {{ expense.notes }}
          </div>

          <template #append>
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              :disabled="getAvailableAmount(expense) <= 0"
              @click="handleLink(expense)"
            >
              <v-icon start>mdi-link-variant</v-icon>
              Link
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-card-text>
</template>

<style scoped lang="scss">
.expense-item {
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.04);
  }
}
</style>
