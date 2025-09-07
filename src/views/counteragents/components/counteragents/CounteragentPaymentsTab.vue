<!-- src/views/counteragents/components/counteragents/CounteragentPaymentsTab.vue -->
<template>
  <div class="payments-tab">
    <!-- Заголовок с балансом -->
    <div class="balance-summary">
      <div class="balance-header">
        <v-icon icon="mdi-scale-balance" class="me-2" />
        <span class="text-h6">Financial Summary</span>
      </div>

      <div class="balance-cards">
        <v-card
          v-if="balanceInfo.hasBalance"
          :color="balanceInfo.color"
          variant="flat"
          class="balance-card"
        >
          <v-card-text class="pa-4">
            <div class="d-flex align-center">
              <v-icon :icon="balanceInfo.icon" size="32" class="me-3" />
              <div>
                <div class="text-h5 font-weight-bold">{{ balanceInfo.formattedBalance }}</div>
                <div class="text-body-2 opacity-90">{{ balanceInfo.status }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card v-else variant="outlined" class="balance-card">
          <v-card-text class="pa-4 text-center">
            <v-icon icon="mdi-check-circle" size="32" color="success" class="mb-2" />
            <div class="text-h6">Balanced</div>
            <div class="text-body-2 text-medium-emphasis">No outstanding balance</div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <v-divider class="my-4" />

    <!-- Список платежей -->
    <div class="payments-section">
      <div class="section-header">
        <v-icon icon="mdi-receipt-text" class="me-2" />
        <span class="text-h6">Payment History</span>
        <v-spacer />

        <!-- Фильтры -->
        <v-chip-group v-model="selectedFilter" class="me-4">
          <v-chip value="all" size="small" variant="outlined">All</v-chip>
          <v-chip value="available" size="small" variant="outlined" color="success">
            Available ({{ availablePayments.length }})
          </v-chip>
          <v-chip value="completed" size="small" variant="outlined">Completed</v-chip>
          <v-chip value="pending" size="small" variant="outlined">Pending</v-chip>
        </v-chip-group>

        <v-btn
          variant="outlined"
          size="small"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="refreshPayments"
        >
          Refresh
        </v-btn>
      </div>

      <!-- Список платежей -->
      <div v-if="filteredPayments.length > 0" class="payments-list">
        <v-card
          v-for="payment in filteredPayments"
          :key="payment.id"
          variant="outlined"
          class="payment-item mb-3"
        >
          <v-card-text class="pa-3">
            <div class="payment-header">
              <div class="payment-title">
                <v-icon :icon="getPaymentIcon(payment)" class="me-2" />
                <span class="font-weight-medium">{{ payment.description }}</span>

                <!-- Статус платежа -->
                <v-chip
                  :color="getPaymentStatusColor(payment.status)"
                  size="x-small"
                  variant="flat"
                  class="ml-2"
                >
                  {{ payment.status }}
                </v-chip>

                <!-- Индикатор переплаты -->
                <v-chip
                  v-if="payment.isOverpayment"
                  color="warning"
                  size="x-small"
                  variant="flat"
                  class="ml-1"
                >
                  <v-icon icon="mdi-plus-circle" start size="x-small" />
                  Overpayment
                </v-chip>
              </div>

              <div class="payment-amount">
                <span class="text-h6 font-weight-bold">{{ formatCurrency(payment.amount) }}</span>
              </div>
            </div>

            <!-- Детали платежа -->
            <div class="payment-details mt-2">
              <div class="details-grid">
                <!-- Доступная сумма (для переплат) -->
                <div v-if="payment.availableAmount > 0" class="detail-item">
                  <span class="detail-label">Available:</span>
                  <v-chip color="success" size="small" variant="flat">
                    {{ formatCurrency(payment.availableAmount) }}
                  </v-chip>
                </div>

                <!-- Использованная сумма -->
                <div v-if="payment.usedAmount && payment.usedAmount > 0" class="detail-item">
                  <span class="detail-label">Used:</span>
                  <span class="detail-value">{{ formatCurrency(payment.usedAmount) }}</span>
                </div>

                <!-- Дата создания -->
                <div class="detail-item">
                  <span class="detail-label">Created:</span>
                  <span class="detail-value">{{ formatDate(payment.createdAt) }}</span>
                </div>

                <!-- Связанные заказы -->
                <div
                  v-if="payment.linkedOrders && payment.linkedOrders.length > 0"
                  class="detail-item full-width"
                >
                  <span class="detail-label">Linked Orders:</span>
                  <div class="linked-orders">
                    <v-chip
                      v-for="order in payment.linkedOrders.filter(o => o.isActive)"
                      :key="order.orderId"
                      size="small"
                      variant="outlined"
                      class="me-1 mb-1"
                    >
                      {{ order.orderNumber }} ({{ formatCurrency(order.linkedAmount) }})
                    </v-chip>
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Пустое состояние -->
      <div v-else class="empty-state">
        <v-icon icon="mdi-receipt-text-off" size="64" color="grey-lighten-2" class="mb-3" />
        <div class="text-h6 text-medium-emphasis mb-2">
          {{ getEmptyStateTitle() }}
        </div>
        <div class="text-body-2 text-medium-emphasis">
          {{ getEmptyStateSubtitle() }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Counteragent } from '@/stores/counteragents'
import type { PendingPayment } from '@/stores/account/types'
import { useCounteragentBalance } from '@/stores/counteragents/composables/useCounteragentBalance'

// =============================================
// PROPS
// =============================================

interface Props {
  counteragent: Counteragent
}

const props = defineProps<Props>()

// =============================================
// STATE
// =============================================

const payments = ref<PendingPayment[]>([])
const loading = ref(false)
const selectedFilter = ref('all')

// =============================================
// COMPOSABLES
// =============================================

const { getBalanceInfo, formatCurrency } = useCounteragentBalance()

// =============================================
// COMPUTED
// =============================================

const balanceInfo = computed(() => getBalanceInfo(props.counteragent).value)

const availablePayments = computed(() => payments.value.filter(p => p.availableAmount > 0))

const filteredPayments = computed(() => {
  const filter = selectedFilter.value

  switch (filter) {
    case 'available':
      return availablePayments.value
    case 'completed':
      return payments.value.filter(p => p.status === 'completed')
    case 'pending':
      return payments.value.filter(p => p.status === 'pending')
    default:
      return payments.value
  }
})

// =============================================
// METHODS
// =============================================

const loadPayments = async () => {
  loading.value = true
  try {
    // Загружаем платежи контрагента из Account Store
    const { useAccountStore } = await import('@/stores/account')
    const accountStore = useAccountStore()

    payments.value = accountStore.state.pendingPayments.filter(
      payment => payment.counteragentId === props.counteragent.id
    )
  } catch (error) {
    console.error('Failed to load counteragent payments:', error)
  } finally {
    loading.value = false
  }
}

const refreshPayments = () => {
  loadPayments()
}

// =============================================
// HELPER FUNCTIONS
// =============================================

const getPaymentIcon = (payment: PendingPayment): string => {
  if (payment.isOverpayment) return 'mdi-plus-circle'
  if (payment.status === 'completed') return 'mdi-check-circle'
  return 'mdi-clock'
}

const getPaymentStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'warning',
    completed: 'success',
    cancelled: 'error'
  }
  return colors[status] || 'default'
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getEmptyStateTitle = (): string => {
  const filter = selectedFilter.value
  switch (filter) {
    case 'available':
      return 'No Available Payments'
    case 'completed':
      return 'No Completed Payments'
    case 'pending':
      return 'No Pending Payments'
    default:
      return 'No Payment History'
  }
}

const getEmptyStateSubtitle = (): string => {
  const filter = selectedFilter.value
  switch (filter) {
    case 'available':
      return 'All payments have been fully used or are pending'
    case 'completed':
      return 'No completed payments found for this supplier'
    case 'pending':
      return 'No pending payments found for this supplier'
    default:
      return 'No payments have been made to this supplier yet'
  }
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadPayments()
})
</script>

<style scoped>
.payments-tab {
  min-height: 400px;
}

.balance-summary {
  margin-bottom: 24px;
}

.balance-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.balance-cards {
  display: flex;
  gap: 16px;
}

.balance-card {
  flex: 1;
  max-width: 300px;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 8px;
}

.payments-list {
  max-height: 500px;
  overflow-y: auto;
}

.payment-item {
  transition: all 0.2s ease;
}

.payment-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.payment-title {
  display: flex;
  align-items: center;
  flex: 1;
}

.payment-amount {
  flex-shrink: 0;
}

.payment-details {
  border-top: 1px solid #333;
  padding-top: 12px;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  align-items: center;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.detail-label {
  font-size: 0.75rem;
  color: #999;
  text-transform: uppercase;
  font-weight: 600;
  min-width: 60px;
}

.detail-value {
  font-size: 0.875rem;
  color: #ccc;
}

.linked-orders {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
}

@media (max-width: 768px) {
  .balance-cards {
    flex-direction: column;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .payment-header {
    flex-direction: column;
    align-items: stretch;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
