<!-- src/views/counteragents/components/counteragents/CounteragentPaymentsSimple.vue -->
<template>
  <div class="payments-simple">
    <!-- ИТОГ БАЛАНСА -->
    <div class="balance-summary mb-4">
      <div class="section-title">
        <v-icon icon="mdi-scale-balance" class="me-2" />
        Payment & Balance Summary
      </div>

      <v-card variant="outlined" class="balance-card">
        <v-card-text class="pa-4">
          <div class="balance-main">
            <div class="balance-amount">
              <span class="balance-label">Current Balance:</span>
              <v-chip :color="balanceColor" size="large" variant="flat" class="balance-chip">
                <v-icon :icon="balanceIcon" start />
                {{ formattedBalance }}
              </v-chip>
            </div>

            <div class="balance-actions">
              <div class="balance-explanation">
                <span class="text-caption" :class="`text-${balanceColor}`">
                  {{ balanceExplanation }}
                </span>
              </div>

              <!-- NEW: Balance Correction Button -->
              <v-btn
                variant="outlined"
                size="small"
                color="primary"
                prepend-icon="mdi-pencil"
                @click="openBalanceCorrection"
              >
                Adjust Balance
              </v-btn>
            </div>
          </div>

          <!-- Breakdown -->
          <div class="balance-breakdown mt-3">
            <v-row dense>
              <v-col cols="4">
                <div class="breakdown-item">
                  <div class="breakdown-value text-warning">
                    {{ formatCurrency(balanceBreakdownData.totalReceived) }}
                  </div>
                  <div class="breakdown-label">Total Received</div>
                </div>
              </v-col>

              <v-col cols="4">
                <div class="breakdown-item">
                  <div class="breakdown-value text-success">
                    {{ formatCurrency(balanceBreakdownData.totalPaid) }}
                  </div>
                  <div class="breakdown-label">Total Paid</div>
                </div>
              </v-col>

              <v-col cols="4">
                <div class="breakdown-item">
                  <div
                    class="breakdown-value"
                    :class="balanceBreakdownData.balance >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ formatCurrency(Math.abs(balanceBreakdownData.balance)) }}
                  </div>
                  <div class="breakdown-label">
                    {{ balanceBreakdownData.balance >= 0 ? 'Credit' : 'Outstanding' }}
                  </div>
                </div>
              </v-col>
            </v-row>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- ФИЛЬТРЫ И ОПЕРАЦИИ -->
    <div class="operations-section">
      <div class="section-title mb-3">
        <v-icon icon="mdi-receipt-text" class="me-2" />
        All Payments & Operations
        <v-spacer />
      </div>

      <!-- Фильтры -->
      <v-row class="mb-3" dense>
        <v-col cols="12" md="6">
          <DateRangePicker
            v-model="dateRange"
            label="Filter by Date"
            variant="outlined"
            density="compact"
            placeholder="Select date range..."
            @update:model-value="filterByDate"
          />
        </v-col>

        <v-col cols="12" md="6">
          <v-chip-group v-model="selectedFilter" class="d-flex justify-end">
            <v-chip value="all" size="small">{{ filterLabels.all }}</v-chip>
            <v-chip value="debt" size="small" color="warning">
              {{ filterLabels.debt }}
            </v-chip>
            <v-chip value="payment" size="small" color="success">
              {{ filterLabels.payment }}
            </v-chip>
            <v-chip value="correction" size="small" color="info">
              {{ filterLabels.correction }}
            </v-chip>
          </v-chip-group>
        </v-col>
      </v-row>

      <!-- Список операций -->
      <div v-if="filteredOperations.length > 0" class="operations-list">
        <v-card
          v-for="operation in filteredOperations"
          :key="operation.id"
          variant="outlined"
          class="operation-card mb-2"
          :class="getOperationCardClass(operation)"
        >
          <v-card-text class="pa-3">
            <div class="operation-header">
              <div class="operation-info">
                <div class="operation-description">
                  <v-icon
                    :icon="getOperationIcon(operation)"
                    :color="getOperationIconColor(operation)"
                    size="20"
                    class="me-2"
                  />

                  <span class="operation-title">{{ getOperationTitle(operation) }}</span>

                  <v-chip
                    size="x-small"
                    variant="flat"
                    :color="getStatusChipColor(operation)"
                    class="ms-2"
                  >
                    {{ getStatusText(operation) }}
                  </v-chip>
                </div>

                <div class="operation-meta">
                  <span class="text-caption text-medium-emphasis">
                    {{ formatDate(operation.createdAt) }}
                  </span>
                  <span class="text-caption operation-id">#{{ operation.id.slice(-8) }}</span>

                  <!-- Показать причину для корректировок -->
                  <span
                    v-if="operation.isBalanceCorrection && operation.reason"
                    class="text-caption reason-badge"
                  >
                    {{ getCorrectionReasonLabel(operation.reason) }}
                  </span>
                </div>
              </div>

              <div class="operation-amount">
                <div class="amount-display">
                  <span class="amount-sign" :class="getAmountSignClass(operation)">
                    {{ getAmountSign(operation) }}
                  </span>
                  <span class="amount-value">
                    {{ formatCurrency(operation.amount) }}
                  </span>
                </div>

                <!-- Дополнительная информация только для обычных платежей -->
                <div
                  v-if="!operation.isBalanceCorrection && showAdditionalInfo(operation)"
                  class="amount-details"
                >
                  <div v-if="operation.usedAmount && operation.usedAmount > 0" class="amount-used">
                    Used: {{ formatCurrency(operation.usedAmount) }}
                  </div>
                  <div v-if="getAvailableAmount(operation) > 0" class="amount-available">
                    Available: {{ formatCurrency(getAvailableAmount(operation)) }}
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Пустое состояние -->
      <div v-else class="empty-state">
        <v-icon icon="mdi-receipt-text-off" size="48" color="grey-lighten-2" class="mb-2" />
        <div class="text-body-1 text-medium-emphasis">No operations found</div>
        <div class="text-caption text-medium-emphasis">
          {{ getEmptyMessage() }}
        </div>
      </div>
    </div>
  </div>

  <BalanceCorrectionDialog
    v-model="showBalanceCorrectionDialog"
    :counteragent="counteragent"
    @success="onCorrectionSuccess"
    @error="onCorrectionError"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { Counteragent, BalanceHistoryEntry } from '@/stores/counteragents'
import type { PendingPayment } from '@/stores/account/types'
import { balanceCorrectionService } from '@/stores/counteragents/services/balanceCorrectionService'
import { REASON_DESCRIPTIONS } from '@/stores/counteragents/types'
import {
  useCounteragentBalance,
  type BalanceBreakdown
} from '@/stores/counteragents/composables/useCounteragentBalance'
import DateRangePicker from '@/components/molecules/DateRangePicker.vue'
import BalanceCorrectionDialog from '../dialogs/BalanceCorrectionDialog.vue'

interface Props {
  counteragent: Counteragent
}

const props = defineProps<Props>()

// =============================================
// COMPOSABLES
// =============================================
const { getBalanceBreakdown } = useCounteragentBalance()

// =============================================
// STATE
// =============================================

const operations = ref<PendingPayment[]>([])
const balanceHistory = ref<BalanceHistoryEntry[]>([])
const loading = ref<boolean | string>(false)
const selectedFilter = ref('all')
const dateRange = ref<{ dateFrom: string | null; dateTo: string | null }>({
  dateFrom: null,
  dateTo: null
})

const showBalanceCorrectionDialog = ref(false)

// Balance breakdown from receipts (correct calculation)
const balanceBreakdownData = ref<BalanceBreakdown>({
  totalReceived: 0,
  totalPaid: 0,
  balance: 0,
  ordersWithReceipts: 0
})

// =============================================
// COMPUTED - Объединенные операции
// =============================================
const getOperationCardClass = (operation: CombinedOperation): string => {
  if (operation.isBalanceCorrection) {
    return operation.type === 'correction_increase' ? 'correction-increase' : 'correction-decrease'
  }
  if (isOverdue(operation as PendingPayment)) return 'overdue-operation'
  if (operation.type === 'debt') return 'debt-operation'
  if (operation.type === 'payment') return 'payment-operation'
  return ''
}

const getOperationIcon = (operation: CombinedOperation): string => {
  if (operation.isBalanceCorrection) {
    return operation.type === 'correction_increase' ? 'mdi-arrow-up-bold' : 'mdi-arrow-down-bold'
  }
  if (operation.type === 'debt') return 'mdi-minus-circle'
  if (operation.type === 'payment') return 'mdi-plus-circle'
  return 'mdi-circle'
}

const getOperationIconColor = (operation: CombinedOperation): string => {
  if (operation.isBalanceCorrection) {
    return operation.type === 'correction_increase' ? 'success' : 'warning'
  }
  if (isOverdue(operation as PendingPayment)) return 'error'
  if (operation.type === 'debt') return 'warning'
  if (operation.type === 'payment') return 'success'
  return 'default'
}

const getOperationTitle = (operation: CombinedOperation): string => {
  if (operation.isBalanceCorrection) {
    const actionType = operation.type === 'correction_increase' ? 'increase' : 'decrease'
    return `Balance ${actionType}: ${getCorrectionReasonLabel(operation.reason)}`
  }
  return operation.description || 'Payment operation'
}

const getStatusChipColor = (operation: CombinedOperation): string => {
  if (operation.isBalanceCorrection) return 'info'
  if (operation.status === 'completed') return 'success'
  if (operation.status === 'pending') return 'warning'
  return 'default'
}

const getStatusText = (operation: CombinedOperation): string => {
  if (operation.isBalanceCorrection) return 'ADJUSTMENT'
  return operation.status?.toUpperCase() || 'UNKNOWN'
}

const getAmountSign = (operation: CombinedOperation): string => {
  if (operation.isBalanceCorrection) {
    return operation.type === 'correction_increase' ? '+' : '-'
  }
  return operation.type === 'debt' ? '-' : '+'
}

const getAmountSignClass = (operation: CombinedOperation): string => {
  if (operation.isBalanceCorrection) {
    return operation.type === 'correction_increase' ? 'sign-positive' : 'sign-negative'
  }
  return operation.type === 'debt' ? 'sign-negative' : 'sign-positive'
}

const showAdditionalInfo = (operation: CombinedOperation): boolean => {
  return !operation.isBalanceCorrection && operation.status === 'completed'
}

// Use receipt-based balance calculation
const currentBalance = computed(() => balanceBreakdownData.value.balance)

const formattedBalance = computed(() => {
  return formatCurrency(Math.abs(currentBalance.value))
})

const balanceColor = computed(() => {
  if (currentBalance.value > 0) return 'success' // переплата (credit)
  if (currentBalance.value < 0) return 'error' // долг за полученные товары
  return 'default' // ноль
})

const balanceIcon = computed(() => {
  if (currentBalance.value > 0) return 'mdi-cash-plus'
  if (currentBalance.value < 0) return 'mdi-cash-minus'
  return 'mdi-scale-balance'
})

const balanceExplanation = computed(() => {
  if (currentBalance.value > 0) return 'Credit available (prepayment exceeds debt)'
  if (currentBalance.value < 0) return 'Outstanding debt for received goods'
  return 'Balanced - all received goods paid'
})

// Тип для объединенной операции
type CombinedOperation = (PendingPayment | BalanceHistoryEntry) & {
  isBalanceCorrection?: boolean
  type?: string
  status?: string
}

// Преобразуем историю баланса в формат операций для UI
const historyAsOperations = computed((): CombinedOperation[] => {
  return balanceHistory.value.map(entry => ({
    ...entry,
    isBalanceCorrection: true,
    type: entry.amount > 0 ? 'correction_increase' : 'correction_decrease',
    status: 'completed',
    description: `Balance ${entry.amount > 0 ? 'increase' : 'decrease'}: ${REASON_DESCRIPTIONS[entry.reason]}`,
    counteragentId: props.counteragent.id,
    counteragentName: props.counteragent.name,
    amount: Math.abs(entry.amount),
    createdAt: entry.date,
    updatedAt: entry.date
  }))
})

// Объединяем операции и историю баланса
const allOperations = computed((): CombinedOperation[] => {
  const combined: CombinedOperation[] = [
    // Обычные операции
    ...operations.value.map(op => ({
      ...op,
      isBalanceCorrection: false,
      type: op.status === 'pending' ? 'debt' : 'payment'
    })),
    // История баланса как операции
    ...historyAsOperations.value
  ]

  // Сортируем по дате (новые сверху)
  return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// Операции по типам (исключая корректировки)
const paymentOperations = computed(() => operations.value.filter(op => op.status === 'completed'))

const debtOperations = computed(() => operations.value.filter(op => op.status === 'pending'))

const correctionOperations = computed(() => balanceHistory.value)

// Фильтрованные операции
const filteredOperations = computed(() => {
  let filtered = allOperations.value

  // Фильтр по дате
  if (dateRange.value.dateFrom || dateRange.value.dateTo) {
    filtered = filtered.filter(op => {
      const opDate = new Date(op.createdAt)
      const fromDate = dateRange.value.dateFrom ? new Date(dateRange.value.dateFrom) : null
      const toDate = dateRange.value.dateTo ? new Date(dateRange.value.dateTo) : null

      if (fromDate && opDate < fromDate) return false
      if (toDate && opDate > toDate) return false
      return true
    })
  }

  // Фильтр по типу
  switch (selectedFilter.value) {
    case 'debt':
      return filtered.filter(op => !op.isBalanceCorrection && op.status === 'pending')
    case 'payment':
      return filtered.filter(op => !op.isBalanceCorrection && op.status === 'completed')
    case 'correction':
      return filtered.filter(op => op.isBalanceCorrection)
    case 'overdue':
      return filtered.filter(op => !op.isBalanceCorrection && isOverdue(op as PendingPayment))
    default:
      return filtered
  }
})

// Динамические расчеты баланса (БЕЗ корректировок, только реальные операции)
const totalDebt = computed(() => {
  return debtOperations.value.reduce((sum, op) => sum + (op.amount || 0), 0)
})

const totalPaid = computed(() => {
  return paymentOperations.value.reduce((sum, op) => sum + (op.amount || 0), 0)
})

const availablePrepayment = computed(() => {
  return paymentOperations.value.reduce((sum, op) => {
    const used = op.usedAmount || 0
    const available = op.amount - used
    return sum + Math.max(0, available)
  }, 0)
})

// Лейблы для фильтров
const filterLabels = computed(() => {
  return {
    all: `All (${allOperations.value.length})`,
    debt: `Debt (${debtOperations.value.length})`,
    payment: `Paid (${paymentOperations.value.length})`,
    correction: `Adjustments (${correctionOperations.value.length})`,
    overdue: `Overdue (${operations.value.filter(op => isOverdue(op)).length})`
  }
})

// =============================================
// METHODS
// =============================================
const filterByDate = () => {
  // Фильтрация происходит автоматически через computed
  console.log('Date filter applied:', dateRange.value)
}

const getEmptyMessage = (): string => {
  if (dateRange.value.dateFrom || dateRange.value.dateTo) {
    return 'No operations found in selected date range'
  }

  const filter = selectedFilter.value
  switch (filter) {
    case 'debt':
      return 'No pending debts'
    case 'payment':
      return 'No completed payments'
    case 'correction':
      return 'No balance adjustments'
    case 'overdue':
      return 'No overdue payments'
    default:
      return 'No payment operations found'
  }
}
const loadOperations = async () => {
  loading.value = true
  try {
    // Загружаем обычные операции
    const { useAccountStore } = await import('@/stores/account')
    const accountStore = useAccountStore()

    await accountStore.fetchPayments()
    const allPayments = await accountStore.getPaymentsByCounteragent(props.counteragent.id)

    operations.value = allPayments.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Загружаем историю баланса напрямую из counteragent
    balanceHistory.value = props.counteragent.balanceHistory || []

    // Загружаем правильный расчёт баланса (на основе receipts)
    balanceBreakdownData.value = await getBalanceBreakdown(props.counteragent.id)
  } catch (error) {
    console.error('Failed to load operations:', error)
  } finally {
    loading.value = false
  }
}

// Методы для работы с операциями

const getCorrectionReasonLabel = (reason?: string): string => {
  if (!reason) return ''
  return REASON_DESCRIPTIONS[reason as keyof typeof REASON_DESCRIPTIONS] || reason
}

// Методы корректировки баланса
const openBalanceCorrection = () => {
  showBalanceCorrectionDialog.value = true
}

const onCorrectionSuccess = async (result: any) => {
  console.log('Balance correction successful:', result)

  // Принудительно закрываем диалог
  showBalanceCorrectionDialog.value = false

  try {
    // Получаем свежие данные контрагента из store
    const { useCounteragentsStore } = await import('@/stores/counteragents')
    const counteragentsStore = useCounteragentsStore()

    const updatedCounteragent = await counteragentsStore.getCounteragentById(props.counteragent.id)

    if (updatedCounteragent) {
      // Обновляем локальную историю баланса
      balanceHistory.value = updatedCounteragent.balanceHistory || []

      // ПРИНУДИТЕЛЬНО обновляем props.counteragent
      Object.assign(props.counteragent, updatedCounteragent)

      console.log('Balance history updated:', balanceHistory.value.length, 'entries')
      console.log('New balance:', updatedCounteragent.currentBalance)
    }
  } catch (error) {
    console.error('Failed to refresh counteragent data:', error)
  }

  // Обновляем операции
  await loadOperations()

  console.log(
    `Balance updated: ${result.correctionAmount > 0 ? '+' : ''}${result.correctionAmount}`
  )
}

const onCorrectionError = (error: string) => {
  console.error('Balance correction failed:', error)
}

// Остальные методы остаются без изменений...
const isOverdue = (payment: PendingPayment): boolean => {
  if (payment.status !== 'pending' || !payment.dueDate) return false
  return new Date(payment.dueDate) < new Date()
}

const getAvailableAmount = (payment: PendingPayment): number => {
  const usedAmount = payment.usedAmount || 0
  return Math.max(0, payment.amount - usedAmount)
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadOperations()
})
</script>
<style scoped>
.payments-simple {
  min-height: 300px;
}

.section-title {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 1rem;
  color: #fff;
  margin-bottom: 12px;
}

/* Balance Card */
.balance-card {
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.balance-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 16px;
}

.balance-amount {
  display: flex;
  align-items: center;
  gap: 12px;
}

.balance-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.balance-explanation {
  text-align: right;
}

.balance-label {
  font-weight: 500;
  font-size: 0.9rem;
}

.balance-chip {
  font-weight: 600;
  font-size: 1.1rem;
}

.balance-breakdown {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 12px;
}

.breakdown-item {
  text-align: center;
}

.breakdown-value {
  font-weight: 600;
  font-size: 0.9rem;
}

.breakdown-label {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 2px;
}

/* Operations */
.operations-list {
  max-height: 500px;
  overflow-y: auto;
}

.operation-card {
  transition: all 0.2s ease;
  border-left: 4px solid transparent;
  position: relative;
}

.operation-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Типы операций */
.debt-operation {
  border-left-color: #ff9800;
  background: rgba(255, 152, 0, 0.03);
}

.payment-operation {
  border-left-color: #4caf50;
  background: rgba(76, 175, 80, 0.03);
}

.correction-increase {
  border-left-color: #2196f3;
  background: rgba(33, 150, 243, 0.03);
}

.correction-decrease {
  border-left-color: #ff5722;
  background: rgba(255, 87, 34, 0.03);
}

.overdue-operation {
  border-left-color: #f44336 !important;
  background: rgba(244, 67, 54, 0.05) !important;
}

/* Заголовок операции */
.operation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.operation-info {
  flex: 1;
}

.operation-description {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.operation-title {
  font-weight: 500;
  font-size: 0.9rem;
}

.operation-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.operation-id {
  font-family: monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
}

.reason-badge {
  background: rgba(33, 150, 243, 0.1);
  color: #2196f3;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

/* Сумма */
.operation-amount {
  text-align: right;
  min-width: 140px;
}

.amount-display {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.amount-sign {
  font-size: 1.2rem;
  font-weight: 700;
  margin-right: 4px;
}

.sign-positive {
  color: #4caf50;
}

.sign-negative {
  color: #ff5722;
}

.amount-value {
  color: inherit;
}

.amount-details {
  font-size: 0.75rem;
  line-height: 1.2;
}

.amount-used {
  color: #ff9800;
  font-size: 0.75rem;
  margin-top: 2px;
}

.amount-available {
  color: #4caf50;
  font-size: 0.75rem;
  margin-top: 2px;
}

.operation-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
}

/* Mobile адаптация */
@media (max-width: 768px) {
  .operation-header {
    flex-direction: column;
    gap: 8px;
  }

  .operation-amount {
    text-align: left;
    min-width: auto;
  }

  .amount-display {
    justify-content: flex-start;
  }

  .breakdown-item {
    text-align: left;
  }

  .balance-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .balance-actions {
    align-items: flex-start;
    width: 100%;
  }

  .balance-explanation {
    text-align: left;
  }
}
</style>
