<!-- src/views/pos/shifts/components/ShiftExpensesList.vue -->
<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon icon="mdi-cash-minus" color="error" class="me-3" />
      <span>Expense History</span>
      <v-spacer />
      <div class="d-flex align-center gap-2">
        <!-- ✅ Sprint 8: Category breakdown -->
        <v-chip v-if="productExpenses > 0" color="purple" size="small" variant="tonal">
          Product: Rp {{ formatCurrency(productExpenses) }}
        </v-chip>
        <v-chip v-if="otherExpenses > 0" color="blue" size="small" variant="tonal">
          Other: Rp {{ formatCurrency(otherExpenses) }}
        </v-chip>
        <v-chip color="error" variant="tonal">Total: Rp {{ formatCurrency(totalExpenses) }}</v-chip>
      </div>
    </v-card-title>

    <v-divider />

    <!-- ✅ Sprint 4: Improved empty state -->
    <v-card-text v-if="expenses.length === 0" class="text-center py-8">
      <v-icon icon="mdi-receipt-text-off-outline" size="64" color="grey-lighten-2" />
      <div class="text-h6 mt-4 text-grey">No expenses yet</div>
      <div class="text-caption text-grey">
        Click "Add Expense" to record a cash expense for this shift
      </div>
    </v-card-text>

    <v-list v-else>
      <v-list-item
        v-for="expense in sortedExpenses"
        :key="expense.id"
        :prepend-icon="getExpenseIcon(expense)"
        :subtitle="expense.description"
      >
        <template #title>
          <div class="d-flex align-center justify-space-between">
            <div>
              <span class="font-weight-medium">
                {{ expense.counteragentName || 'Direct Expense' }}
              </span>
              <!-- ✅ Sprint 8: Category chip -->
              <v-chip
                size="x-small"
                :color="getCategoryColor(expense.category)"
                variant="tonal"
                class="ml-2"
              >
                {{ getCategoryLabel(expense.category) }}
              </v-chip>
              <!-- Type indicator -->
              <v-chip
                size="x-small"
                :color="expense.relatedPaymentId ? 'purple' : 'blue'"
                variant="flat"
                class="ml-2"
              >
                <v-icon
                  v-if="expense.relatedPaymentId"
                  start
                  size="x-small"
                  icon="mdi-file-document-check"
                />
                {{ expense.relatedPaymentId ? 'Supplier' : 'Direct' }}
              </v-chip>
              <!-- Status chip -->
              <v-chip size="x-small" :color="getStatusColor(expense.status)" class="ml-2">
                {{ expense.status }}
              </v-chip>
            </div>
            <span class="text-h6 text-error">-Rp {{ formatCurrency(expense.amount) }}</span>
          </div>
        </template>

        <template #append>
          <div class="text-caption text-grey text-right">
            <div>{{ formatDate(expense.createdAt) }}</div>
            <div>{{ formatTime(expense.createdAt) }}</div>
          </div>
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'

const props = defineProps<{
  expenses: ShiftExpenseOperation[]
}>()

const totalExpenses = computed(() => {
  return props.expenses
    .filter(e => e.status === 'completed' || e.status === 'confirmed')
    .reduce((sum, e) => sum + e.amount, 0)
})

// ✅ Sprint 8: Category breakdown
const productExpenses = computed(() => {
  return props.expenses
    .filter(
      e => (e.status === 'completed' || e.status === 'confirmed') && e.category === 'supplier'
    )
    .reduce((sum, e) => sum + e.amount, 0)
})

const otherExpenses = computed(() => {
  return props.expenses
    .filter(
      e => (e.status === 'completed' || e.status === 'confirmed') && e.category !== 'supplier'
    )
    .reduce((sum, e) => sum + e.amount, 0)
})

const sortedExpenses = computed(() => {
  return [...props.expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

function getExpenseIcon(expense: ShiftExpenseOperation): string {
  const icons: Record<string, string> = {
    direct_expense: 'mdi-cash-minus',
    supplier_payment: 'mdi-truck-delivery',
    incoming_transfer: 'mdi-bank-transfer-in'
  }
  return icons[expense.type] || 'mdi-cash'
}

// ✅ Sprint 8: Category functions
function getCategoryLabel(category?: string): string {
  if (category === 'supplier') return 'Product'
  return 'Other'
}

function getCategoryColor(category?: string): string {
  return category === 'supplier' ? 'purple' : 'blue'
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'success',
    confirmed: 'success',
    pending: 'warning',
    rejected: 'error'
  }
  return colors[status] || 'default'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
</script>
