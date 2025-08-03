<template>
  <div class="account-detail-view">
    <!-- Header with back button and account info -->
    <div class="account-header">
      <v-btn icon="mdi-arrow-left" variant="text" @click="handleBack" />
      <div v-if="account" class="account-info">
        <h2>{{ account.name }}</h2>
        <div class="balance">{{ formatAmount(account.balance) }}</div>
      </div>
    </div>

    <!-- Filters and controls -->
    <div class="filters-section">
      <v-row>
        <v-col cols="12" md="6">
          <v-select
            v-model="filters.type"
            :items="operationTypes"
            label="Тип операции"
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
                label="Период"
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
          Приход
        </v-btn>
        <v-btn color="error" @click="showOperationDialog('expense')">
          <v-icon>mdi-minus</v-icon>
          Расход
        </v-btn>
        <v-btn color="primary" @click="showTransferDialog">
          <v-icon>mdi-swap-horizontal</v-icon>
          Перевод
        </v-btn>
        <v-btn v-if="canCorrect" color="warning" @click="showCorrectionDialog">
          <v-icon>mdi-pencil</v-icon>
          Корректировка
        </v-btn>
      </div>
    </div>

    <!-- Transactions list -->
    <div class="transactions-section">
      <h3>Операции</h3>
      <div v-if="store.state.loading.transactions" class="loading">
        <v-progress-circular indeterminate />
        Загрузка операций...
      </div>
      <div v-else-if="filteredOperations.length === 0" class="no-data">Операции не найдены</div>
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
              {{ formatDate(transaction.createdAt) }}
            </div>
          </div>
          <div class="transaction-amount">
            <div :class="getAmountClass(transaction)">
              {{ formatTransactionAmount(transaction) }}
            </div>
            <div class="balance-after">Баланс: {{ formatAmount(transaction.balanceAfter) }}</div>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format, startOfToday } from 'date-fns'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth.store'
import type { Account, Transaction, OperationType } from '@/stores/account'
import { formatAmount, formatDate } from '@/utils/formatter'

// Импорты диалогов
import OperationDialog from '@/components/accounts/dialogs/OperationDialog.vue'
import TransferDialog from '@/components/accounts/dialogs/TransferDialog.vue'
import CorrectionDialog from '@/components/accounts/dialogs/CorrectionDialog.vue'

const route = useRoute()
const router = useRouter()
const store = useAccountStore() // используем переименованный store
const authStore = useAuthStore()

// State
const loading = ref(false)
const operationType = ref<OperationType>('income')
const dialogs = ref({
  operation: false,
  transfer: false,
  correction: false
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

// Computed
const accountId = computed(() => route.params.id as string)
const account = computed(() => store.getAccountById(accountId.value))
const canCorrect = computed(() => authStore.isAdmin)
const filteredOperations = computed(() => {
  return store.getAccountOperations(accountId.value)
})

const operationTypes = [
  { title: 'Все операции', value: null },
  { title: 'Приход', value: 'income' },
  { title: 'Расход', value: 'expense' },
  { title: 'Переводы', value: 'transfer' },
  { title: 'Корректировки', value: 'correction' }
]

const getDateRangeLabel = computed(() => {
  if (!filters.value.dateFrom) return 'Выберите период'

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
  // TODO: Реализовать редактирование операции
  console.log('Edit operation:', operation)
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
    income: 'Приход',
    expense: 'Расход',
    transfer: 'Перевод',
    correction: 'Корректировка'
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
  return `${sign}${formatAmount(Math.abs(transaction.amount))}`
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
