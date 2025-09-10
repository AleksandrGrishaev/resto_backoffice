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

            <div class="balance-explanation">
              <span class="text-caption" :class="`text-${balanceColor}`">
                {{ balanceExplanation }}
              </span>
            </div>
          </div>

          <!-- Breakdown -->
          <div class="balance-breakdown mt-3">
            <v-row dense>
              <v-col cols="4">
                <div class="breakdown-item">
                  <div class="breakdown-value text-error">
                    {{ formatCurrency(totalDebt) }}
                  </div>
                  <div class="breakdown-label">Total Debt</div>
                </div>
              </v-col>

              <v-col cols="4">
                <div class="breakdown-item">
                  <div class="breakdown-value text-success">
                    {{ formatCurrency(totalPaid) }}
                  </div>
                  <div class="breakdown-label">Total Paid</div>
                </div>
              </v-col>

              <v-col cols="4">
                <div class="breakdown-item">
                  <div class="breakdown-value text-info">
                    {{ formatCurrency(availablePrepayment) }}
                  </div>
                  <div class="breakdown-label">Available</div>
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
            <v-chip value="all" size="small">All ({{ operations.length }})</v-chip>
            <v-chip value="debt" size="small" color="error">
              Debt ({{ debtOperations.length }})
            </v-chip>
            <v-chip value="payment" size="small" color="success">
              Paid ({{ paymentOperations.length }})
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
          :class="{
            'payment-operation': operation.type === 'payment'
          }"
        >
          <v-card-text class="pa-3">
            <div class="operation-header">
              <div class="operation-info">
                <div class="operation-description">
                  <v-icon
                    :icon="getOperationIcon(operation)"
                    :color="getOperationColor(operation)"
                    size="small"
                    class="me-2"
                  />
                  {{ operation.description }}

                  <!-- Индикаторы -->
                  <v-chip
                    v-if="operation.sourceOrderId"
                    size="x-small"
                    color="primary"
                    variant="outlined"
                    class="ml-2"
                  >
                    AUTO
                  </v-chip>

                  <v-chip
                    v-if="isOverdue(operation)"
                    size="x-small"
                    color="error"
                    variant="outlined"
                    class="ml-2"
                  >
                    <v-icon icon="mdi-clock-alert" size="10" start />
                    OVERDUE
                  </v-chip>
                </div>

                <div class="operation-meta">
                  <v-chip :color="getStatusColor(operation.status)" size="x-small">
                    {{ operation.status }}
                  </v-chip>

                  <span class="text-caption text-medium-emphasis ml-2">
                    {{ formatDate(operation.createdAt) }}
                  </span>

                  <span v-if="operation.invoiceNumber" class="text-caption ml-2">
                    #{{ operation.invoiceNumber }}
                  </span>

                  <span v-if="operation.linkedOrders?.length" class="text-caption ml-2">
                    → {{ operation.linkedOrders[0].orderNumber }}
                  </span>
                </div>
              </div>

              <div class="operation-amount">
                <div
                  class="amount-value"
                  :class="{
                    'text-error': operation.type === 'debt',
                    'text-success': operation.type === 'payment'
                  }"
                >
                  {{ operation.type === 'debt' ? '-' : '+' }}{{ formatCurrency(operation.amount) }}
                </div>

                <!-- Дополнительная информация -->
                <div v-if="operation.usedAmount && operation.usedAmount > 0" class="amount-used">
                  Used: {{ formatCurrency(operation.usedAmount) }}
                </div>

                <div v-if="getAvailableAmount(operation) > 0" class="amount-available">
                  Available: {{ formatCurrency(getAvailableAmount(operation)) }}
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Counteragent } from '@/stores/counteragents'
import type { PendingPayment } from '@/stores/account/types'
import DateRangePicker from '@/components/molecules/DateRangePicker.vue'

interface Props {
  counteragent: Counteragent
}

const props = defineProps<Props>()

// State
const operations = ref<PendingPayment[]>([])
const loading = ref<boolean | string>(false)
const selectedFilter = ref('all')
const dateRange = ref<{ dateFrom: string | null; dateTo: string | null }>({
  dateFrom: null,
  dateTo: null
})

// Computed - операции по типам

const paymentOperations = computed(() => operations.value.filter(op => op.status === 'completed'))

// Фильтрация по дате и типу
const filteredOperations = computed(() => {
  let filtered = operations.value

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
      return filtered.filter(op => op.status === 'pending')
    case 'payment':
      return filtered.filter(op => op.status === 'completed')
    case 'overdue':
      return filtered.filter(op => isOverdue(op))
    default:
      return filtered
  }
})

// Computed - баланс

const debtOperations = computed(() => operations.value.filter(op => op.status === 'pending'))

const totalDebt = computed(() => {
  return debtOperations.value.reduce((sum, op) => sum + (op.amount || 0), 0)
})

const totalPaid = computed(() => {
  if (!operations.value || operations.value.length === 0) return 0
  return operations.value.reduce((sum, op) => sum + (op.amount || 0), 0)
})

const availablePrepayment = computed(() => {
  return paymentOperations.value.reduce((sum, op) => {
    const used = op.usedAmount || 0
    const available = op.amount - used
    return sum + Math.max(0, available)
  }, 0)
})

const currentBalance = computed(() => {
  const balance = props.counteragent.currentBalance
  if (balance === undefined || balance === null) return 0
  return balance
})

const formattedBalance = computed(() => {
  return formatCurrency(Math.abs(currentBalance.value || 0))
})

const balanceColor = computed(() => {
  if (currentBalance.value > 0) return 'success' // предоплата
  if (currentBalance.value < 0) return 'error' // долг
  return 'default' // ноль
})

const balanceIcon = computed(() => {
  if (currentBalance.value > 0) return 'mdi-cash-plus'
  if (currentBalance.value < 0) return 'mdi-cash-minus'
  return 'mdi-scale-balance'
})

const balanceExplanation = computed(() => {
  if (currentBalance.value > 0) return 'Prepayment available for new orders'
  if (currentBalance.value < 0) return 'Outstanding debt - payment required'
  return 'Balanced - no debt or prepayment'
})

// Methods
const loadOperations = async () => {
  loading.value = true
  try {
    const { useAccountStore } = await import('@/stores/account')
    const accountStore = useAccountStore()

    await accountStore.fetchPayments()

    // Получаем ВСЕ платежи контрагента (и pending, и completed)
    const allPayments = await accountStore.getPaymentsByCounteragent(props.counteragent.id)

    // Сортируем по дате (новые сверху) и добавляем тип
    operations.value = allPayments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(payment => ({
        ...payment,
        type: payment.status === 'pending' ? 'debt' : 'payment'
      }))
  } catch (error) {
    console.error('Failed to load operations:', error)
  } finally {
    loading.value = false
  }
}

const filterByDate = () => {
  // Фильтрация происходит автоматически через computed
  console.log('Date filter applied:', dateRange.value)
}

const markAsPaid = async (operation: PendingPayment) => {
  loading.value = operation.id
  try {
    const { useAccountStore } = await import('@/stores/account')
    const accountStore = useAccountStore()

    await accountStore.updatePayment(operation.id, {
      status: 'completed',
      paidDate: new Date().toISOString(),
      paidAmount: operation.amount
    })

    await loadOperations()
  } catch (error) {
    console.error('Failed to mark payment as paid:', error)
  } finally {
    loading.value = false
  }
}

const editPayment = (operation: PendingPayment) => {
  // Открыть диалог редактирования
  console.log('Edit payment:', operation.id)
}

const getAvailableAmount = (payment: PendingPayment): number => {
  const usedAmount = payment.usedAmount || 0
  return Math.max(0, payment.amount - usedAmount)
}

const isOverdue = (payment: PendingPayment): boolean => {
  if (payment.status !== 'pending' || !payment.dueDate) return false
  return new Date(payment.dueDate) < new Date()
}

const getOperationIcon = (operation: any) => {
  if (operation.type === 'debt') return 'mdi-minus-circle'
  if (operation.type === 'payment') return 'mdi-plus-circle'
  return 'mdi-circle'
}

const getOperationColor = (operation: any) => {
  if (isOverdue(operation)) return 'error'
  if (operation.type === 'debt') return 'warning'
  if (operation.type === 'payment') return 'success'
  return 'default'
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'warning',
    completed: 'success',
    cancelled: 'grey',
    failed: 'error'
  }
  return colors[status] || 'default'
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
    case 'overdue':
      return 'No overdue payments'
    default:
      return 'No payment operations found'
  }
}

// Lifecycle
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
  align-items: center;
  margin-bottom: 16px;
}

.balance-amount {
  display: flex;
  align-items: center;
  gap: 12px;
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
  border-left: 3px solid transparent;
}

.operation-card:hover {
  background: rgba(255, 255, 255, 0.05);
}

.debt-operation {
  border-left-color: rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.02);
}

.payment-operation {
  border-left-color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.02);
}

.overdue-operation {
  border-left-color: rgb(var(--v-theme-error)) !important;
  background: rgba(var(--v-theme-error), 0.05) !important;
}

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
  font-weight: 500;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.operation-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.operation-amount {
  text-align: right;
  min-width: 120px;
}

.amount-value {
  font-weight: 600;
  font-size: 1rem;
}

.amount-used {
  font-size: 0.75rem;
  color: #ff9800;
  margin-top: 2px;
}

.amount-available {
  font-size: 0.75rem;
  color: #4caf50;
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

/* Mobile */
@media (max-width: 768px) {
  .operation-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .operation-amount {
    text-align: left;
  }

  .breakdown-item {
    text-align: left;
  }

  .balance-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
