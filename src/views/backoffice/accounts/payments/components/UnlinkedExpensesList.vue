<script setup lang="ts">
// src/views/backoffice/accounts/payments/components/UnlinkedExpensesList.vue
// Sprint 4: Unlinked Expenses List Component

import { computed } from 'vue'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  expenses: ShiftExpenseOperation[]
  loading?: boolean
}

interface Emits {
  (e: 'link', expense: ShiftExpenseOperation): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// =============================================
// COMPUTED
// =============================================

const sortedExpenses = computed(() => {
  return [...props.expenses].sort((a, b) => {
    // Sort by date descending
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const totalAmount = computed(() => {
  return props.expenses.reduce((sum, exp) => sum + exp.amount, 0)
})

// =============================================
// METHODS
// =============================================

function handleLink(expense: ShiftExpenseOperation) {
  emit('link', expense)
}

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
      <!-- Summary -->
      <v-alert type="warning" variant="tonal" class="mb-4">
        <div class="d-flex align-center justify-space-between">
          <span>
            <v-icon start size="small">mdi-alert</v-icon>
            {{ expenses.length }} expense(s) need to be linked
          </span>
          <span class="font-weight-bold">Total: {{ formatIDR(totalAmount) }}</span>
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
              <!-- Amount -->
              <v-chip size="small" color="error" variant="tonal">
                {{ formatIDR(expense.amount) }}
              </v-chip>

              <!-- Shift Info -->
              <v-chip size="x-small" variant="outlined">
                <v-icon start size="x-small">mdi-cash-register</v-icon>
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
            <v-btn color="primary" variant="flat" size="small" @click="handleLink(expense)">
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
