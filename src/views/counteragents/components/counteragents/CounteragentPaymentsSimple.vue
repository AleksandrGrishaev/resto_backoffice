<!-- src/views/counteragents/components/counteragents/CounteragentPaymentsSimple.vue -->
<template>
  <div class="payments-simple">
    <!-- Баланс -->
    <div v-if="hasBalance" class="balance-section mb-4">
      <div class="section-title">
        <v-icon icon="mdi-scale-balance" class="me-2" />
        Current Balance
      </div>

      <v-chip :color="balanceColor" size="large" variant="flat" class="balance-chip">
        <v-icon :icon="balanceIcon" start />
        {{ balanceText }}: {{ formattedBalance }}
      </v-chip>

      <div class="balance-note mt-2">
        <span class="text-caption" :class="`text-${balanceColor}`">
          {{ balanceColor === 'success' ? 'Available for new orders' : 'Payment required' }}
        </span>
      </div>
    </div>

    <!-- Платежи -->
    <div class="payments-section">
      <div class="section-title mb-3">
        <v-icon icon="mdi-receipt-text" class="me-2" />
        Recent Payments
        <v-spacer />
        <v-btn
          size="small"
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="loadPayments"
        >
          Refresh
        </v-btn>
      </div>

      <!-- Фильтры -->
      <v-chip-group v-model="selectedFilter" class="mb-3">
        <v-chip value="all" size="small">All</v-chip>
        <v-chip value="available" size="small" color="success">
          Available ({{ availablePayments.length }})
        </v-chip>
        <v-chip value="completed" size="small">Completed</v-chip>
      </v-chip-group>

      <!-- Список платежей -->
      <div v-if="filteredPayments.length > 0" class="payments-list">
        <v-card
          v-for="payment in filteredPayments"
          :key="payment.id"
          variant="outlined"
          class="payment-card mb-3"
        >
          <v-card-text class="pa-3">
            <div class="payment-header">
              <div class="payment-info">
                <div class="payment-description">{{ payment.description }}</div>
                <div class="payment-meta">
                  <v-chip :color="getStatusColor(payment.status)" size="x-small">
                    {{ payment.status }}
                  </v-chip>
                  <span class="text-caption text-medium-emphasis ml-2">
                    {{ formatDate(payment.createdAt) }}
                  </span>
                </div>
              </div>
              <div class="payment-amounts">
                <div class="amount-total">{{ formatCurrency(payment.amount) }}</div>
                <div v-if="payment.availableAmount > 0" class="amount-available">
                  Available: {{ formatCurrency(payment.availableAmount) }}
                </div>
              </div>
            </div>

            <!-- Связанные заказы -->
            <div v-if="payment.linkedOrders?.length" class="linked-orders mt-2">
              <div class="text-caption text-medium-emphasis mb-1">Linked to:</div>
              <div class="orders-chips">
                <v-chip
                  v-for="order in payment.linkedOrders.filter(o => o.isActive)"
                  :key="order.orderId"
                  size="x-small"
                  variant="outlined"
                  class="me-1"
                >
                  {{ order.orderNumber }}
                </v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Пустое состояние -->
      <div v-else class="empty-state">
        <v-icon icon="mdi-receipt-text-off" size="48" color="grey-lighten-2" class="mb-2" />
        <div class="text-body-1 text-medium-emphasis">No payments found</div>
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
import { useCounteragentBalance } from '@/stores/counteragents/composables/useCounteragentBalance'

interface Props {
  counteragent: Counteragent
}

const props = defineProps<Props>()

// State
const payments = ref<PendingPayment[]>([])
const loading = ref(false)
const selectedFilter = ref('all')

// Composables
const { formatBalance, getBalanceColor, getBalanceIcon, getBalanceText } = useCounteragentBalance()

// Computed
const hasBalance = computed(() => {
  return (props.counteragent.currentBalance || 0) !== 0
})

const balanceColor = computed(() => {
  return getBalanceColor(props.counteragent.currentBalance || 0)
})

const balanceIcon = computed(() => {
  return getBalanceIcon(props.counteragent.currentBalance || 0)
})

const balanceText = computed(() => {
  return getBalanceText(props.counteragent.currentBalance || 0)
})

const formattedBalance = computed(() => {
  return formatBalance(props.counteragent.currentBalance || 0)
})

const availablePayments = computed(() => payments.value.filter(p => p.availableAmount > 0))

const filteredPayments = computed(() => {
  const filter = selectedFilter.value

  switch (filter) {
    case 'available':
      return availablePayments.value
    case 'completed':
      return payments.value.filter(p => p.status === 'completed')
    default:
      return payments.value
  }
})

// Methods
const loadPayments = async () => {
  loading.value = true
  try {
    const { useAccountStore } = await import('@/stores/account')
    const accountStore = useAccountStore()

    payments.value = accountStore.state.pendingPayments
      .filter(payment => payment.counteragentId === props.counteragent.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10) // Показываем только последние 10
  } catch (error) {
    console.error('Failed to load payments:', error)
  } finally {
    loading.value = false
  }
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
    day: 'numeric'
  })
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'warning',
    completed: 'success',
    cancelled: 'error'
  }
  return colors[status] || 'default'
}

const getEmptyMessage = (): string => {
  const filter = selectedFilter.value
  switch (filter) {
    case 'available':
      return 'No available overpayments'
    case 'completed':
      return 'No completed payments'
    default:
      return 'No payments made to this supplier yet'
  }
}

// Lifecycle
onMounted(() => {
  loadPayments()
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

.balance-section {
  padding: 16px;
  border: 1px solid #333;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}

.balance-chip {
  font-weight: 600;
  font-size: 0.875rem;
}

.balance-note {
  font-size: 0.75rem;
}

.payments-list {
  max-height: 400px;
  overflow-y: auto;
}

.payment-card {
  transition: all 0.2s ease;
}

.payment-card:hover {
  background: rgba(255, 255, 255, 0.05);
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.payment-info {
  flex: 1;
}

.payment-description {
  font-weight: 500;
  margin-bottom: 4px;
}

.payment-meta {
  display: flex;
  align-items: center;
}

.payment-amounts {
  text-align: right;
}

.amount-total {
  font-weight: 600;
  font-size: 1rem;
}

.amount-available {
  font-size: 0.75rem;
  color: #4caf50;
  margin-top: 2px;
}

.linked-orders {
  border-top: 1px solid #333;
  padding-top: 8px;
}

.orders-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
}

@media (max-width: 768px) {
  .payment-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .payment-amounts {
    text-align: left;
  }
}
</style>
