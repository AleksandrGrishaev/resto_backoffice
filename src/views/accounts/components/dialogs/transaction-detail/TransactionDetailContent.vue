<!-- src/views/accounts/components/dialogs/transaction-detail/TransactionDetailContent.vue -->
<template>
  <!-- Header -->
  <v-card-title class="d-flex align-center justify-space-between">
    <div class="d-flex align-center">
      <v-icon
        :icon="getTransactionIcon(transaction.type)"
        :color="getTransactionColor(transaction.type)"
        class="mr-3"
      />
      <div>
        <div class="text-h6">{{ getTransactionTitle(transaction) }}</div>
        <div class="text-caption">{{ formatDateTime(transaction.createdAt) }}</div>
      </div>
    </div>
    <v-btn icon="mdi-close" variant="text" @click="$emit('close')" />
  </v-card-title>

  <v-divider />

  <!-- Basic Info -->
  <v-card-text>
    <v-row>
      <v-col cols="6">
        <div class="text-subtitle-2 text-medium-emphasis">Amount</div>
        <div class="text-h6" :class="getAmountClass(transaction)">
          {{ formatAmount(transaction) }}
        </div>
      </v-col>
      <v-col cols="6">
        <div class="text-subtitle-2 text-medium-emphasis">Balance After</div>
        <div class="text-h6">{{ formatIDR(transaction.balanceAfter) }}</div>
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <div class="mb-3">
      <div class="text-subtitle-2 text-medium-emphasis">Description</div>
      <div>{{ transaction.description }}</div>
    </div>

    <!-- ✅ ОБЯЗАТЕЛЬНАЯ категория для расходов -->
    <div v-if="transaction.type === 'expense'" class="mb-3">
      <div class="text-subtitle-2 text-medium-emphasis">Expense Category *</div>
      <v-chip color="primary" variant="flat" size="small">
        {{ getCategoryLabel(transaction.expenseCategory) }}
      </v-chip>
    </div>

    <!-- ✅ НОВОЕ: Контрагент (если есть) -->
    <div v-if="transaction.counteragentName" class="mb-3">
      <div class="text-subtitle-2 text-medium-emphasis">Counteragent</div>
      <div class="d-flex align-center">
        <v-icon icon="mdi-domain" size="small" class="mr-2" />
        <span>{{ transaction.counteragentName }}</span>
      </div>
    </div>

    <div class="mb-3">
      <div class="text-subtitle-2 text-medium-emphasis">Performed By</div>
      <div>{{ transaction.performedBy.name }} ({{ transaction.performedBy.type }})</div>
    </div>

    <!-- Transfer details -->
    <div v-if="transaction.transferDetails" class="mb-3">
      <div class="text-subtitle-2 text-medium-emphasis">Transfer Details</div>
      <div class="transfer-info">
        <div>From Account: {{ transaction.transferDetails.fromAccountId }}</div>
        <div>To Account: {{ transaction.transferDetails.toAccountId }}</div>
      </div>
    </div>

    <!-- Status -->
    <div class="mb-3">
      <div class="text-subtitle-2 text-medium-emphasis">Status</div>
      <v-chip :color="transaction.status === 'completed' ? 'success' : 'error'" size="small">
        {{ transaction.status }}
      </v-chip>
    </div>
  </v-card-text>
</template>

<script setup lang="ts">
import { formatIDR } from '@/utils/currency'
import { formatDateTime } from '@/utils/formatter'
import { EXPENSE_CATEGORIES } from '@/stores/account'
import type { Transaction } from '@/stores/account'

interface Props {
  transaction: Transaction
}

defineProps<Props>()

defineEmits<{
  close: []
}>()

// Helpers
function getTransactionIcon(type: Transaction['type']): string {
  const icons = {
    income: 'mdi-plus-circle',
    expense: 'mdi-minus-circle',
    transfer: 'mdi-swap-horizontal',
    correction: 'mdi-pencil'
  }
  return icons[type] || 'mdi-help-circle'
}

function getTransactionColor(type: Transaction['type']): string {
  const colors = {
    income: 'success',
    expense: 'error',
    transfer: 'primary',
    correction: 'warning'
  }
  return colors[type] || 'grey'
}

function getTransactionTitle(transaction: Transaction): string {
  const titles = {
    income: 'Income Transaction',
    expense: 'Expense Transaction',
    transfer: 'Transfer Transaction',
    correction: 'Balance Correction'
  }
  return titles[transaction.type] || 'Transaction'
}

function getAmountClass(transaction: Transaction): string {
  if (transaction.type === 'income') return 'text-success'
  if (transaction.type === 'expense') return 'text-error'
  if (transaction.type === 'transfer') return 'text-primary'
  return 'text-warning'
}

function formatAmount(transaction: Transaction): string {
  const sign = transaction.type === 'income' ? '+' : '-'
  return `${sign}${formatIDR(transaction.amount)}`
}

function getCategoryLabel(expenseCategory: Transaction['expenseCategory']): string {
  if (!expenseCategory) return 'No category'
  return EXPENSE_CATEGORIES[expenseCategory.type][expenseCategory.category]
}
</script>

<style lang="scss" scoped>
.transfer-info {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-error {
  color: rgb(var(--v-theme-error));
}

.text-primary {
  color: rgb(var(--v-theme-primary));
}

.text-warning {
  color: rgb(var(--v-theme-warning));
}
</style>
