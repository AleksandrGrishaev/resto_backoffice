<template>
  <div class="account-detail-view">
    <!-- Header with back button and account info -->
    <div class="account-header">
      <v-btn icon="mdi-arrow-left" variant="text" @click="handleBack" />
      <div v-if="account" class="account-info">
        <h2>{{ account.name }}</h2>
        <div class="balance">{{ formatIDR(account.balance) }}</div>
      </div>
    </div>

    <!-- Filters and controls -->
    <div class="filters-section">
      <v-row>
        <v-col cols="12" md="6">
          <v-select
            v-model="filters.type"
            :items="operationTypes"
            label="Operation Type"
            clearable
            @update:model-value="applyFilters"
          />
        </v-col>
        <v-col cols="12" md="6">
          <v-menu v-model="menu.date" :close-on-content-click="false">
            <template #activator="{ props }">
              <v-text-field
                v-bind="props"
                :model-value="getDateRangeLabel"
                label="Period"
                readonly
                append-inner-icon="mdi-calendar"
              />
            </template>
            <v-date-picker v-model="filters.dateFrom" @update:model-value="applyFilters" />
          </v-menu>
        </v-col>
      </v-row>

      <!-- Action buttons -->
      <div class="action-buttons">
        <v-btn color="success" @click="showOperationDialog('income')">
          <v-icon>mdi-plus</v-icon>
          Income
        </v-btn>
        <v-btn color="error" @click="showOperationDialog('expense')">
          <v-icon>mdi-minus</v-icon>
          Expense
        </v-btn>
        <v-btn color="primary" @click="showTransferDialog">
          <v-icon>mdi-swap-horizontal</v-icon>
          Transfer
        </v-btn>
        <v-btn v-if="canCorrect" color="warning" @click="showCorrectionDialog">
          <v-icon>mdi-pencil</v-icon>
          Correction
        </v-btn>
      </div>
    </div>

    <!-- Transactions list -->
    <div class="transactions-section">
      <h3>Transactions</h3>
      <div v-if="store.state.loading.transactions" class="loading">
        <v-progress-circular indeterminate />
        Loading transactions...
      </div>
      <div v-else-if="filteredOperations.length === 0" class="no-data">No transactions found</div>
      <div v-else class="transactions-list">
        <div
          v-for="transaction in filteredOperations"
          :key="transaction.id"
          class="transaction-item"
          @click="handleEditOperation(transaction)"
        >
          <div class="transaction-info">
            <div class="transaction-type">
              <v-icon :color="getTransactionColor(transaction.type)">
                {{ getTransactionIcon(transaction.type) }}
              </v-icon>
              {{ getTransactionTypeLabel(transaction.type) }}
            </div>
            <div class="transaction-description">
              {{ transaction.description }}
            </div>
            <div class="transaction-date">
              {{ formatTransactionDate(transaction.createdAt) }}
            </div>
          </div>
          <div class="transaction-amount">
            <div :class="getAmountClass(transaction)">
              {{ formatTransactionAmount(transaction) }}
            </div>
            <div class="balance-after">Balance: {{ formatIDR(transaction.balanceAfter) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <operation-dialog
      v-if="dialogs.operation"
      v-model="dialogs.operation"
      :type="operationType"
      :account="account"
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
      :account="account"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format, startOfToday } from 'date-fns'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth.store'
import type { Account, Transaction, OperationType } from '@/stores/account'
// ✅ ИСПРАВЛЕНО: Импортируем все необходимые утилиты
import { formatIDR } from '@/utils/currency'
import { formatDate } from '@/utils/formatter'

// Импорты диалогов
import AccountOperations from './components/detail/AccountOperations.vue'
import OperationDialog from './components/dialogs/OperationDialog.vue'
import TransferDialog from './components/dialogs/TransferDialog.vue'
import CorrectionDialog from './components/dialogs/CorrectionDialog.vue'
import TransactionDetailDialog from './components/dialogs/TransactionDetailDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useAccountStore()
const authStore = useAuthStore()

// State
const loading = ref(false)
const operationType = ref<OperationType>('income')
const dialogs = ref({
  operation: false,
  transfer: false,
  correction: false,
  transactionDetail: false
})
const menu = ref({
  date: false
})
const dateRange = ref('today')
const filters = ref({
  dateFrom: format(startOfToday(), 'yyyy-MM-dd'),
  dateTo: format(startOfToday(), 'yyyy-MM-dd'),
  type: null as OperationType | null
})
const selectedTransaction = ref<Transaction | null>(null)

// Computed
const accountId = computed(() => route.params.id as string)
const account = computed(() => store.getAccountById(accountId.value))
const canCorrect = computed(() => authStore.isAdmin)
const filteredOperations = computed(() => {
  // Устанавливаем selectedAccountId если он не установлен
  if (store.state.selectedAccountId !== accountId.value) {
    store.fetchTransactions(accountId.value)
  }
  return store.accountTransactions
})

const operationTypes = [
  { title: 'All Operations', value: null },
  { title: 'Income', value: 'income' },
  { title: 'Expense', value: 'expense' },
  { title: 'Transfers', value: 'transfer' },
  { title: 'Corrections', value: 'correction' }
]

const getDateRangeLabel = computed(() => {
  if (!filters.value.dateFrom) return 'Select period'

  if (filters.value.dateFrom === filters.value.dateTo) {
    return format(new Date(filters.value.dateFrom), 'dd.MM.yyyy')
  }

  return `${format(new Date(filters.value.dateFrom), 'dd.MM.yyyy')} - ${format(
    new Date(filters.value.dateTo || ''),
    'dd.MM.yyyy'
  )}`
})

// Methods
function handleBack() {
  router.back()
  // После возврата обновляем данные
  const timer = setTimeout(() => {
    fetchData()
  }, 100)
  onUnmounted(() => clearTimeout(timer))
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

function handleOperationSuccess() {
  dialogs.value.operation = false
  fetchData()
}

function handleTransferSuccess() {
  dialogs.value.transfer = false
  fetchData()
}

function handleCorrectionSuccess() {
  dialogs.value.correction = false
  fetchData()
}

function applyFilters() {
  store.setFilters({
    dateFrom: filters.value.dateFrom,
    dateTo: filters.value.dateTo,
    type: filters.value.type,
    category: null
  })
}

async function fetchData() {
  try {
    loading.value = true
    // Сначала загружаем аккаунты, чтобы получить информацию о текущем аккаунте
    await store.fetchAccounts()

    // Затем загружаем транзакции для текущего аккаунта
    if (accountId.value) {
      await store.fetchTransactions(accountId.value)
    }
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

// ✅ ИСПРАВЛЕНО: Добавлена функция форматирования даты транзакции
function formatTransactionDate(date: string | Date): string {
  try {
    return formatDate(date)
  } catch (error) {
    console.warn('Error formatting transaction date:', error)
    return String(date)
  }
}

// Utility functions
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
  const sign = transaction.amount > 0 ? '+' : ''
  return `${sign}${formatIDR(Math.abs(transaction.amount))}`
}

// Initialize
onMounted(() => {
  fetchData()
})

// Watch for route parameter changes
watch(
  accountId,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      fetchData()
    }
  },
  { immediate: false }
)
</script>

<style lang="scss" scoped>
.account-detail-view {
  padding: 16px;
}

.account-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
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

.filters-section {
  margin-bottom: 24px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.transactions-section {
  h3 {
    margin-bottom: 16px;
  }
}

.loading,
.no-data {
  text-align: center;
  padding: 32px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.transactions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transaction-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgb(var(--v-theme-surface-variant));
  }
}

.transaction-info {
  flex: 1;

  .transaction-type {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .transaction-description {
    margin-bottom: 4px;
  }

  .transaction-date {
    font-size: 0.875rem;
    color: rgb(var(--v-theme-on-surface-variant));
  }
}

.transaction-amount {
  text-align: right;

  .balance-after {
    font-size: 0.875rem;
    color: rgb(var(--v-theme-on-surface-variant));
    margin-top: 4px;
  }
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-error {
  color: rgb(var(--v-theme-error));
}

.text-warning {
  color: rgb(var(--v-theme-warning));
}
</style>
