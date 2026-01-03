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
        <div class="text-h6">{{ formatIDR(transaction.balanceAfter || 0) }}</div>
        <div class="text-caption text-medium-emphasis">Calculated dynamically</div>
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

    <!-- Supplier Payment Allocation (for supplier payments with relatedPaymentId) -->
    <div v-if="isSupplierPayment && relatedPayment" class="mb-3">
      <div class="text-subtitle-2 text-medium-emphasis mb-2">Payment Allocation</div>
      <v-card variant="outlined" class="pa-3">
        <!-- Allocation Status -->
        <div class="d-flex align-center justify-space-between mb-2">
          <span class="text-body-2">Allocation Status</span>
          <v-chip :color="allocationStatusColor" size="small" variant="flat">
            {{ allocationStatusText }}
          </v-chip>
        </div>

        <!-- Amounts -->
        <div class="d-flex justify-space-between text-body-2 mb-1">
          <span class="text-medium-emphasis">Total Amount:</span>
          <span>{{ formatIDR(relatedPayment.amount) }}</span>
        </div>
        <div class="d-flex justify-space-between text-body-2 mb-1">
          <span class="text-medium-emphasis">Allocated:</span>
          <span :class="totalAllocated > 0 ? 'text-success' : ''">
            {{ formatIDR(totalAllocated) }}
          </span>
        </div>
        <div v-if="remainingAmount > 0" class="d-flex justify-space-between text-body-2">
          <span class="text-medium-emphasis">Remaining:</span>
          <span class="text-warning">{{ formatIDR(remainingAmount) }}</span>
        </div>

        <!-- Linked Orders -->
        <template v-if="activeLinkedOrders.length > 0">
          <v-divider class="my-2" />
          <div class="text-caption text-medium-emphasis mb-1">Linked Orders:</div>
          <div
            v-for="order in activeLinkedOrders"
            :key="order.orderId"
            class="d-flex justify-space-between text-body-2 py-1"
          >
            <span>{{ order.orderNumber }}</span>
            <span class="text-success">{{ formatIDR(order.linkedAmount) }}</span>
          </div>
        </template>

        <!-- No allocations yet -->
        <div v-else class="text-caption text-medium-emphasis mt-2">
          <v-icon icon="mdi-information-outline" size="small" class="mr-1" />
          Not yet allocated to any purchase orders
        </div>
      </v-card>
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
import { computed } from 'vue'
import { formatIDR } from '@/utils/currency'
import { formatDateTime } from '@/utils/formatter'
import { useAccountStore } from '@/stores/account'
import type { Transaction, PendingPayment } from '@/stores/account'

const accountStore = useAccountStore()

interface Props {
  transaction: Transaction
}

const props = defineProps<Props>()

defineEmits<{
  close: []
}>()

// Check if this is a supplier payment
const isSupplierPayment = computed(() => {
  return (
    props.transaction.type === 'expense' &&
    props.transaction.expenseCategory?.category === 'supplier' &&
    props.transaction.relatedPaymentId
  )
})

// Get related pending payment data
const relatedPayment = computed<PendingPayment | null>(() => {
  if (!props.transaction.relatedPaymentId) return null
  return (
    accountStore.state.pendingPayments.find(p => p.id === props.transaction.relatedPaymentId) ||
    null
  )
})

// Get active linked orders
const activeLinkedOrders = computed(() => {
  if (!relatedPayment.value?.linkedOrders) return []
  return relatedPayment.value.linkedOrders.filter(o => o.isActive)
})

// Calculate total allocated amount
const totalAllocated = computed(() => {
  return activeLinkedOrders.value.reduce((sum, o) => sum + o.linkedAmount, 0)
})

// Calculate remaining amount
const remainingAmount = computed(() => {
  if (!relatedPayment.value) return 0
  return Math.max(0, relatedPayment.value.amount - totalAllocated.value)
})

// Allocation status text
const allocationStatusText = computed(() => {
  if (!relatedPayment.value) return 'Unknown'
  if (totalAllocated.value === 0) return 'Not Allocated'
  if (totalAllocated.value >= relatedPayment.value.amount) return 'Fully Allocated'
  return 'Partially Allocated'
})

// Allocation status color
const allocationStatusColor = computed(() => {
  if (!relatedPayment.value) return 'grey'
  if (totalAllocated.value === 0) return 'warning'
  if (totalAllocated.value >= relatedPayment.value.amount) return 'success'
  return 'orange'
})

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
  return accountStore.getCategoryLabel(expenseCategory.category)
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
