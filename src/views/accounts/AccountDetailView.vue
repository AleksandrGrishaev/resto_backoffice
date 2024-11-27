<template>
  <div class="account-detail-view">
    <div class="account-header">
      <v-btn icon="mdi-arrow-left" variant="text" @click="handleBack" />

      <div class="account-info">
        <div class="d-flex align-center gap-4">
          <h2 class="text-h5">{{ account?.name }}</h2>
          <v-chip :color="account?.isActive ? 'success' : 'warning'" size="small">
            {{ account?.isActive ? 'Активен' : 'Неактивен' }}
          </v-chip>
        </div>
        <div class="account-balance">
          <span class="text-h4">{{ formatAmount(account?.balance || 0) }}</span>
          <v-btn
            v-if="canCorrect"
            color="primary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-cash-sync"
            @click="showCorrectionDialog"
          >
            Корректировать
          </v-btn>
        </div>
      </div>

      <div class="account-actions">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showOperationDialog('income')">
          Приход
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-minus" @click="showOperationDialog('expense')">
          Расход
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-bank-transfer" @click="showTransferDialog">
          Перевод
        </v-btn>
      </div>
    </div>

    <div class="operations-section">
      <v-card>
        <v-card-title class="d-flex align-center py-3 px-4">
          <span class="text-h6">История операций</span>
          <v-spacer />
          <v-menu v-model="menu.date" :close-on-content-click="false">
            <template #activator="{ props }">
              <v-btn v-bind="props" variant="outlined" class="mr-2">
                {{ getDateRangeLabel }}
                <v-icon right>mdi-calendar</v-icon>
              </v-btn>
            </template>

            <v-card min-width="300" class="pa-4">
              <v-btn-toggle v-model="dateRange" mandatory class="mb-4">
                <v-btn value="today">Сегодня</v-btn>
                <v-btn value="week">Неделя</v-btn>
                <v-btn value="month">Месяц</v-btn>
                <v-btn value="custom">Период</v-btn>
              </v-btn-toggle>

              <template v-if="dateRange === 'custom'">
                <v-text-field
                  v-model="filters.dateFrom"
                  label="От"
                  type="date"
                  density="compact"
                  class="mb-2"
                />
                <v-text-field v-model="filters.dateTo" label="До" type="date" density="compact" />
              </template>

              <div class="d-flex justify-end mt-4">
                <v-btn color="primary" @click="applyDateFilter">Применить</v-btn>
              </div>
            </v-card>
          </v-menu>

          <v-select
            v-model="filters.type"
            :items="operationTypes"
            label="Тип операции"
            clearable
            density="compact"
            hide-details
            style="max-width: 200px"
            @update:model-value="handleFiltersChange"
          />
        </v-card-title>

        <v-card-text class="pa-0">
          <account-operations
            :operations="filteredOperations"
            :loading="loading"
            @edit="handleEditOperation"
          />
        </v-card-text>
      </v-card>
    </div>

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
      :account="account"
      @success="handleOperationSuccess"
    />

    <correction-dialog
      v-if="dialogs.correction"
      v-model="dialogs.correction"
      :account="account"
      @success="handleOperationSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account.store'
import { useAuthStore } from '@/stores/auth.store'
import { startOfToday, startOfWeek, startOfMonth, format } from 'date-fns'
import AccountOperations from '@/components/accounts/detail/AccountOperations.vue'
import OperationDialog from '@/components/accounts/dialogs/OperationDialog.vue'
import TransferDialog from '@/components/accounts/dialogs/TransferDialog.vue'
import CorrectionDialog from '@/components/accounts/dialogs/CorrectionDialog.vue'
import type { OperationType } from '@/types/transaction'
import { formatAmount } from '@/utils/formatter'

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
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
const account = computed(() => accountStore.getAccountById(accountId.value))
const canCorrect = computed(() => authStore.isAdmin)
const filteredOperations = computed(() => {
  return accountStore.getAccountOperations(accountId.value)
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
  dialogs.value.transfer = false
  dialogs.value.correction = false
  fetchData()
}

function handleFiltersChange() {
  accountStore.setFilters(filters.value)
}

function applyDateFilter() {
  const today = startOfToday()

  switch (dateRange.value) {
    case 'today':
      filters.value.dateFrom = format(today, 'yyyy-MM-dd')
      filters.value.dateTo = format(today, 'yyyy-MM-dd')
      break
    case 'week':
      filters.value.dateFrom = format(startOfWeek(today), 'yyyy-MM-dd')
      filters.value.dateTo = format(today, 'yyyy-MM-dd')
      break
    case 'month':
      filters.value.dateFrom = format(startOfMonth(today), 'yyyy-MM-dd')
      filters.value.dateTo = format(today, 'yyyy-MM-dd')
      break
  }

  menu.value.date = false
  handleFiltersChange()
}

// Data fetching
async function fetchData() {
  loading.value = true
  try {
    await accountStore.fetchAccounts()
    if (accountId.value) {
      await accountStore.fetchTransactions(accountId.value)
    }
  } catch (error) {
    console.error('Failed to fetch account data:', error)
  } finally {
    loading.value = false
  }
}

// Watch for route changes
watch(
  () => route.params.id,
  newId => {
    if (newId) {
      fetchData()
    }
  }
)

// Initialize
onMounted(() => {
  fetchData()
})

// Cleanup
onUnmounted(() => {
  accountStore.setFilters({
    dateFrom: null,
    dateTo: null,
    type: null
  })
})
</script>

<style lang="scss" scoped>
.account-detail-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
}

.account-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--color-surface);
  padding: 16px;
  border-radius: 8px;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-balance {
  display: flex;
  align-items: center;
  gap: 16px;
}

.account-actions {
  display: flex;
  gap: 8px;
}

.operations-section {
  flex: 1;
  min-height: 0;
}

.gap-4 {
  gap: 16px;
}
</style>
