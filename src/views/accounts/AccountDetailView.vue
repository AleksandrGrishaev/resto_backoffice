<template>
  <div class="account-detail-view">
    <!-- Header with back button and account info -->
    <div class="account-header">
      <v-btn icon="mdi-arrow-left" variant="text" @click="handleBack" />
      <div v-if="currentAccount" class="account-info">
        <h2>{{ currentAccount.name }}</h2>
        <div class="balance">{{ formatIDR(currentAccount.balance) }}</div>
      </div>
    </div>

    <!-- Page content with LazyList -->
    <LazyList
      v-bind="lazyProps"
      :empty-title="'No transactions found'"
      :empty-description="'Try adjusting your filters or create a new transaction.'"
      :empty-icon="'mdi-receipt-text-outline'"
      :loading-text="'Loading transactions...'"
      :loading-more-text="'Loading more transactions...'"
      :load-more-text="'Load More Transactions'"
      class="transactions-lazy-list"
    >
      <!-- Header with title and action buttons -->
      <template #header="{ meta }">
        <div class="transactions-header">
          <div class="header-title">
            <h3>Transactions</h3>
            <v-chip v-if="meta.currentCount > 0" variant="outlined" size="small">
              {{ meta.currentCount }} of {{ meta.total }}{{ meta.total === 0 ? '+' : '' }} loaded
            </v-chip>
          </div>

          <!-- Action buttons -->
          <div class="action-buttons">
            <v-btn
              v-if="!isPosСashRegister"
              color="success"
              size="small"
              @click="showOperationDialog('income')"
            >
              <v-icon>mdi-plus</v-icon>
              Income
            </v-btn>
            <v-btn color="error" size="small" @click="showOperationDialog('expense')">
              <v-icon>mdi-minus</v-icon>
              Expense
            </v-btn>
            <v-btn color="primary" size="small" @click="showTransferDialog">
              <v-icon>mdi-swap-horizontal</v-icon>
              Transfer
            </v-btn>
            <v-btn v-if="canCorrect" color="warning" size="small" @click="showCorrectionDialog">
              <v-icon>mdi-pencil</v-icon>
              Correction
            </v-btn>
          </div>
        </div>
      </template>

      <!-- Filters -->
      <template #filters="{ filters: currentFilters }">
        <div class="filters-section">
          <v-row>
            <v-col cols="12" md="3">
              <v-select
                :model-value="currentFilters.type"
                :items="operationTypes"
                label="Operation Type"
                clearable
                density="compact"
                @update:model-value="setOperationType"
              />
            </v-col>
            <v-col cols="12" md="4">
              <DateRangePicker
                :model-value="{
                  dateFrom: currentFilters.dateFrom,
                  dateTo: currentFilters.dateTo
                }"
                label="Date Range"
                placeholder="Select date range"
                density="compact"
                @update:model-value="setDateRangeFromObject"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                :model-value="currentFilters.category"
                :items="categoryOptions"
                label="Category Type"
                clearable
                density="compact"
                @update:model-value="setCategory"
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-text-field
                :model-value="currentFilters.search"
                label="Search"
                placeholder="Search..."
                prepend-inner-icon="mdi-magnify"
                clearable
                density="compact"
                @update:model-value="setSearch"
              />
            </v-col>
          </v-row>

          <!-- Filter stats and controls -->
          <div v-if="hasActiveFilters || filterStats.totalCount > 0" class="filter-controls">
            <div class="filter-stats">
              <v-chip size="small" variant="outlined">{{ filterStats.totalCount }} total</v-chip>
              <v-chip
                v-if="filterStats.incomeCount > 0"
                size="small"
                variant="outlined"
                color="success"
              >
                {{ filterStats.incomeCount }} income
              </v-chip>
              <v-chip
                v-if="filterStats.expenseCount > 0"
                size="small"
                variant="outlined"
                color="error"
              >
                {{ filterStats.expenseCount }} expense
              </v-chip>
              <v-chip
                v-if="filterStats.transferCount > 0"
                size="small"
                variant="outlined"
                color="primary"
              >
                {{ filterStats.transferCount }} transfers
              </v-chip>
            </div>

            <v-btn
              v-if="hasActiveFilters"
              variant="text"
              size="small"
              color="error"
              @click="clearFilters"
            >
              <v-icon>mdi-filter-off</v-icon>
              Clear Filters
            </v-btn>
          </div>
        </div>
      </template>

      <!-- Transaction table instead of list items -->
      <template #item="{}">
        <!-- We'll render the entire table as one "item" -->
        <v-table class="transactions-table" hover>
          <thead>
            <tr>
              <th width="10%">Type</th>
              <th width="25%">Description</th>
              <th width="15%">Category</th>
              <th width="15%">Counteragent</th>
              <th width="10%">Date</th>
              <th width="12%" class="text-right">Amount</th>
              <th width="13%" class="text-right">Balance After</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="transaction in transactionsWithBalance"
              :key="transaction.id"
              class="transaction-row"
              @click="handleEditOperation(transaction)"
            >
              <!-- Type -->
              <td>
                <div class="transaction-type">
                  <v-icon :color="getTransactionColor(transaction.type)" size="small">
                    {{ getTransactionIcon(transaction.type) }}
                  </v-icon>
                  <span class="type-label">{{ getTransactionTypeLabel(transaction.type) }}</span>
                </div>
              </td>

              <!-- Description -->
              <td>
                <div class="transaction-description">
                  {{ transaction.description }}
                </div>
              </td>

              <!-- Category (отдельная колонка!) -->
              <td>
                <v-chip
                  v-if="transaction.expenseCategory"
                  size="small"
                  :color="getCategoryChipColor(transaction)"
                  :variant="getCategoryChipVariant(transaction)"
                >
                  {{ getCategoryLabel(transaction.expenseCategory) }}
                  <!-- Allocation indicator for supplier payments -->
                  <v-icon
                    v-if="isSupplierTransaction(transaction) && !isFullyAllocated(transaction)"
                    size="x-small"
                    class="ml-1"
                  >
                    mdi-alert-circle
                  </v-icon>
                </v-chip>
                <span v-else class="text-grey">—</span>
              </td>

              <!-- Counteragent -->
              <td>
                <div v-if="transaction.counteragentName" class="counteragent-info">
                  <v-icon size="small" color="grey">mdi-domain</v-icon>
                  <span>{{ transaction.counteragentName }}</span>
                </div>
                <span v-else class="text-grey">—</span>
              </td>

              <!-- Date -->
              <td>
                <div class="transaction-date">
                  {{ formatTransactionDate(transaction.createdAt) }}
                </div>
              </td>

              <!-- Amount -->
              <td class="text-right">
                <div :class="getAmountClass(transaction)" class="transaction-amount">
                  {{ formatTransactionAmount(transaction) }}
                </div>
              </td>

              <!-- Balance After -->
              <td class="text-right">
                <div class="balance-after">
                  {{ formatIDR(transaction.balanceAfter) }}
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </template>
    </LazyList>

    <!-- Dialogs -->
    <operation-dialog
      v-if="dialogs.operation"
      v-model="dialogs.operation"
      :type="operationType"
      :account="currentAccount"
      @success="handleOperationSuccess"
    />

    <transfer-dialog
      v-if="dialogs.transfer"
      v-model="dialogs.transfer"
      @success="handleTransferSuccess"
    />

    <correction-dialog
      v-if="dialogs.correction"
      v-model="dialogs.correction"
      :account="currentAccount"
      @success="handleCorrectionSuccess"
    />

    <transaction-detail-dialog
      v-if="dialogs.transactionDetail"
      v-model="dialogs.transactionDetail"
      :transaction="selectedTransaction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAccountTransactions } from '@/stores/account/composables/useAccountTransactions'
import type { Transaction, OperationType, ExpenseCategory } from '@/stores/account'
import { formatIDR } from '@/utils/currency'
import { formatDate } from '@/utils/formatter'

// Components
import LazyList from '@/components/organisms/LazyList.vue'
import DateRangePicker from '@/components/molecules/DateRangePicker.vue'
import OperationDialog from './components/dialogs/OperationDialog.vue'
import TransferDialog from './components/dialogs/TransferDialog.vue'
import CorrectionDialog from './components/dialogs/CorrectionDialog.vue'
import TransactionDetailDialog from './components/dialogs/TransactionDetailDialog.vue'
import { useAccountStore } from '@/stores/account'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const accountStore = useAccountStore()
const paymentSettingsStore = usePaymentSettingsStore()

// Ensure payment methods are loaded for POS cash register check
// Also load pending payments for allocation status display
onMounted(async () => {
  if (paymentSettingsStore.paymentMethods.length === 0) {
    await paymentSettingsStore.fetchPaymentMethods()
  }
  // Load payments for allocation status in supplier payment chips
  if (accountStore.allPayments.length === 0) {
    await accountStore.fetchPayments()
  }
})

// Get account ID from route
const accountId = computed(() => route.params.id as string)

// Initialize account transactions composable
const {
  state,
  items: transactions,
  filters,
  meta,
  isInitialLoading,
  isLoadingMore,
  isEmpty,
  hasData,
  loadMore,
  refresh,
  updateFilters,
  clearError,
  transactionsWithBalance,
  currentAccount,
  filterStats,
  setDateRangeFromObject,
  setOperationType,
  setSearch,
  setCategory,
  clearFilters,
  refreshAfterTransaction
} = useAccountTransactions(accountId, 20)

// Props for LazyList component
const lazyProps = computed(() => ({
  state: state.value,
  items: [{ id: 'table' }], // Единственный "item" для таблицы
  filters: filters.value,
  meta: meta.value,
  isInitialLoading: isInitialLoading.value,
  isLoadingMore: isLoadingMore.value,
  isEmpty: isEmpty.value,
  hasData: hasData.value,
  loadMore,
  refresh,
  updateFilters,
  clearError
}))

// Local state
const operationType = ref<OperationType>('income')
const dialogs = ref({
  operation: false,
  transfer: false,
  correction: false,
  transactionDetail: false
})
const selectedTransaction = ref<Transaction | null>(null)

// Computed
const canCorrect = computed(() => authStore.isAdmin)

// Check if this account is used as POS cash register
// POS cash register should not allow direct Income operations from backoffice
// (all income for POS cash should come through confirmed transfers or POS sales)
const isPosСashRegister = computed(() => {
  const posCashAccountId = paymentSettingsStore.posCashAccountId
  return currentAccount.value?.id === posCashAccountId
})

const operationTypes = [
  { title: 'All Operations', value: null },
  { title: 'Income', value: 'income' },
  { title: 'Expense', value: 'expense' },
  { title: 'Transfers', value: 'transfer' },
  { title: 'Corrections', value: 'correction' }
]

const categoryOptions = [
  { title: 'All Categories', value: null },
  { title: 'Daily Expenses', value: 'daily' },
  { title: 'Investments', value: 'investment' }
]

const hasActiveFilters = computed(() => {
  const f = filters.value
  return !!(f.dateFrom || f.dateTo || f.type || f.search || f.category)
})

// Methods
function handleBack() {
  router.back()
}

function handleDateRangeUpdate(range: { dateFrom: string | null; dateTo: string | null }) {
  setDateRangeFromObject(range)
}

function showOperationDialog(type: OperationType) {
  operationType.value = type
  dialogs.value.operation = true
}

function showTransferDialog() {
  dialogs.value.transfer = true
}

function showCorrectionDialog() {
  dialogs.value.correction = true
}

function handleEditOperation(operation: Transaction) {
  selectedTransaction.value = operation
  dialogs.value.transactionDetail = true
}

async function handleOperationSuccess() {
  dialogs.value.operation = false
  await refreshAfterTransaction()
}

async function handleTransferSuccess() {
  dialogs.value.transfer = false
  await refreshAfterTransaction()
}

async function handleCorrectionSuccess() {
  dialogs.value.correction = false
  await refreshAfterTransaction()
}

// Utility functions
function formatTransactionDate(date: string | Date): string {
  try {
    return formatDate(date)
  } catch (error) {
    console.warn('Error formatting transaction date:', error)
    return String(date)
  }
}

function getCategoryLabel(expenseCategory: ExpenseCategory): string {
  if (!expenseCategory) return 'No category'
  return accountStore.getCategoryLabel(expenseCategory.category)
}

// =============================================
// SUPPLIER PAYMENT ALLOCATION HELPERS
// =============================================

/**
 * Check if transaction is a supplier payment
 */
function isSupplierTransaction(transaction: Transaction): boolean {
  return transaction.expenseCategory?.category === 'supplier'
}

/**
 * Get related payment for a transaction
 */
function getRelatedPayment(transaction: Transaction) {
  if (!transaction.relatedPaymentId) return null
  return accountStore.allPayments.find(p => p.id === transaction.relatedPaymentId) || null
}

/**
 * Check if supplier payment is fully allocated
 */
function isFullyAllocated(transaction: Transaction): boolean {
  if (!isSupplierTransaction(transaction)) return true

  const payment = getRelatedPayment(transaction)
  if (!payment) return true // No payment data - assume OK

  const totalLinked =
    payment.linkedOrders?.filter(o => o.isActive).reduce((sum, o) => sum + o.linkedAmount, 0) || 0

  return totalLinked >= payment.amount
}

/**
 * Get chip color based on allocation status
 */
function getCategoryChipColor(transaction: Transaction): string {
  if (!isSupplierTransaction(transaction)) return 'primary'

  const payment = getRelatedPayment(transaction)
  if (!payment) return 'primary'

  const totalLinked =
    payment.linkedOrders?.filter(o => o.isActive).reduce((sum, o) => sum + o.linkedAmount, 0) || 0

  if (totalLinked === 0) return 'warning' // Not allocated - warning (orange)
  if (totalLinked >= payment.amount) return 'primary' // Fully allocated - normal
  return 'orange' // Partially allocated - orange
}

/**
 * Get chip variant based on allocation status
 */
function getCategoryChipVariant(transaction: Transaction): 'flat' | 'outlined' {
  if (!isSupplierTransaction(transaction)) return 'flat'

  const payment = getRelatedPayment(transaction)
  if (!payment) return 'flat'

  const totalLinked =
    payment.linkedOrders?.filter(o => o.isActive).reduce((sum, o) => sum + o.linkedAmount, 0) || 0

  // Not allocated or partially - use flat to make it more visible
  if (totalLinked < payment.amount) return 'flat'
  return 'flat'
}

function getTransactionColor(type: OperationType): string {
  const colors = {
    income: 'success',
    expense: 'error',
    transfer: 'primary',
    correction: 'warning'
  }
  return colors[type] || 'grey'
}

function getTransactionIcon(type: OperationType): string {
  const icons = {
    income: 'mdi-plus',
    expense: 'mdi-minus',
    transfer: 'mdi-swap-horizontal',
    correction: 'mdi-pencil'
  }
  return icons[type] || 'mdi-help-circle'
}

function getTransactionTypeLabel(type: OperationType): string {
  const labels = {
    income: 'Income',
    expense: 'Expense',
    transfer: 'Transfer',
    correction: 'Correction'
  }
  return labels[type] || type
}

function getAmountClass(transaction: Transaction): string {
  if (transaction.type === 'income') return 'text-success'
  if (transaction.type === 'expense') return 'text-error'
  if (transaction.type === 'transfer') {
    return transaction.amount > 0 ? 'text-success' : 'text-error'
  }
  return 'text-warning'
}

function formatTransactionAmount(transaction: Transaction): string {
  // Для расходов всегда показываем минус
  if (transaction.type === 'expense') {
    return `-${formatIDR(Math.abs(transaction.amount))}`
  }

  // Для доходов всегда показываем плюс
  if (transaction.type === 'income') {
    return `+${formatIDR(Math.abs(transaction.amount))}`
  }

  // Для переводов и корректировок показываем знак в зависимости от суммы
  const sign = transaction.amount > 0 ? '+' : '-'
  return `${sign}${formatIDR(Math.abs(transaction.amount))}`
}
</script>

<style lang="scss" scoped>
.account-detail-view {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.account-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-shrink: 0;
}

.account-info {
  h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .balance {
    font-size: 1.25rem;
    font-weight: 600;
    color: rgb(var(--v-theme-primary));
  }
}

.transactions-lazy-list {
  flex: 1;
  min-height: 0;
}

.transactions-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;

  .header-title {
    display: flex;
    align-items: center;
    gap: 12px;

    h3 {
      margin: 0;
    }
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.filters-section {
  margin-bottom: 16px;
}

.filter-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;

  .filter-stats {
    display: flex;
    gap: 4px;
  }
}

.transactions-table {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgb(var(--v-theme-outline));

  :deep(thead) {
    background-color: rgb(var(--v-theme-surface-variant));

    th {
      font-weight: 600;
      font-size: 0.875rem;
      padding: 12px 16px;
      border-bottom: 1px solid rgb(var(--v-theme-outline));
    }
  }

  :deep(tbody) {
    tr {
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: rgb(var(--v-theme-surface-variant), 0.5);
      }

      &:not(:last-child) {
        border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
      }

      td {
        padding: 12px 16px;
        vertical-align: middle;
      }
    }
  }
}

.transaction-type {
  display: flex;
  align-items: center;
  gap: 6px;

  .type-label {
    font-size: 0.875rem;
    font-weight: 500;
  }
}

.transaction-description {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.counteragent-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  opacity: 0.7;
}

.transaction-date {
  font-size: 0.875rem;
  opacity: 0.7;
}

.transaction-amount {
  font-weight: 600;
}

.balance-after {
  font-size: 0.875rem;
  opacity: 0.7;
}

.text-success {
  color: rgb(var(--v-theme-success)) !important;
}

.text-error {
  color: rgb(var(--v-theme-error)) !important;
}

.text-warning {
  color: rgb(var(--v-theme-warning)) !important;
}

.text-grey {
  opacity: 0.6;
  font-style: italic;
}

// Responsive design
@media (max-width: 1200px) {
  .transactions-table {
    :deep(thead th),
    :deep(tbody td) {
      padding: 8px 12px;
      font-size: 0.8rem;
    }
  }
}

@media (max-width: 768px) {
  .account-detail-view {
    padding: 12px;
  }

  .transactions-header {
    flex-direction: column;
    align-items: stretch;

    .action-buttons {
      justify-content: stretch;

      .v-btn {
        flex: 1;
      }
    }
  }

  .filter-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;

    .filter-stats {
      justify-content: center;
    }
  }

  // Скрываем некоторые колонки на мобильных
  .transactions-table {
    :deep(thead th:nth-child(4)),
    :deep(tbody td:nth-child(4)) {
      display: none; // Скрываем Counteragent
    }

    :deep(thead th:nth-child(3)),
    :deep(tbody td:nth-child(3)) {
      display: none; // Скрываем Category на очень маленьких экранах
    }
  }
}

@media (max-width: 480px) {
  .transactions-table {
    :deep(thead th:nth-child(7)),
    :deep(tbody td:nth-child(7)) {
      display: none; // Скрываем Balance After на очень маленьких экранах
    }
  }
}
</style>
