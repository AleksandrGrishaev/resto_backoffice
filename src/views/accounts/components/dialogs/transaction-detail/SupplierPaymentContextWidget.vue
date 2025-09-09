<!-- src/views/accounts/components/dialogs/transaction-detail/SupplierPaymentContextWidget.vue - УПРОЩЕННАЯ ВЕРСИЯ -->

<template>
  <div class="supplier-payment-context">
    <!-- Минимальная информация о платеже -->
    <div class="payment-context pa-4">
      <div class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
        <v-icon icon="mdi-truck" color="primary" class="mr-2" />
        <span class="text-primary">Supplier Payment Context</span>
        <!-- Показываем что это предстоящий платеж -->
        <v-chip
          v-if="mode === 'pending-payment'"
          size="small"
          color="warning"
          variant="flat"
          class="ml-2"
        >
          Pending Payment
        </v-chip>
      </div>

      <!-- ✅ ИСПОЛЬЗУЕМ ДАННЫЕ НАПРЯМУЮ -->
      <div class="payment-details">
        <div class="mb-2 d-flex justify-space-between">
          <span class="text-medium-emphasis">Supplier:</span>
          <span class="font-weight-bold">{{ supplierName }}</span>
        </div>

        <div class="mb-2 d-flex justify-space-between">
          <span class="text-medium-emphasis">Payment Amount:</span>
          <span class="font-weight-bold text-primary">{{ formatIDR(paymentAmount) }}</span>
        </div>

        <div v-if="invoiceNumber" class="mb-2 d-flex justify-space-between">
          <span class="text-medium-emphasis">Invoice:</span>
          <span>{{ invoiceNumber }}</span>
        </div>

        <div v-if="paymentStatus" class="mb-2 d-flex justify-space-between">
          <span class="text-medium-emphasis">Status:</span>
          <v-chip :color="getStatusColor(paymentStatus)" size="small" variant="flat">
            {{ paymentStatus }}
          </v-chip>
        </div>

        <!-- ✅ ПОКАЗЫВАЕМ BREAKDOWN ДЛЯ PENDING ПЛАТЕЖЕЙ -->
        <div
          v-if="mode === 'pending-payment' && orderBreakdown"
          class="mt-3 pa-3 bg-blue-lighten-5 rounded"
        >
          <div class="text-caption text-medium-emphasis mb-1">Payment Breakdown:</div>
          <div class="d-flex justify-space-between mb-1">
            <span>Total Order Amount:</span>
            <span class="font-weight-bold">{{ formatIDR(orderBreakdown.totalLinked) }}</span>
          </div>
          <div
            v-if="orderBreakdown.availableAmount > 0"
            class="d-flex justify-space-between text-success"
          >
            <span>Available Credit:</span>
            <span class="font-weight-bold">{{ formatIDR(orderBreakdown.availableAmount) }}</span>
          </div>
          <div
            v-else-if="orderBreakdown.shortfall > 0"
            class="d-flex justify-space-between text-warning"
          >
            <span>Additional Payment Needed:</span>
            <span class="font-weight-bold">{{ formatIDR(orderBreakdown.shortfall) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Минимальный список заказов -->
    <div v-if="relatedOrderIds.length > 0" class="related-orders pa-4 border-t">
      <div class="text-subtitle-2 font-weight-bold mb-3 text-primary">
        Related Orders ({{ relatedOrderIds.length }})
      </div>

      <div class="orders-summary">
        <v-chip
          v-for="orderId in relatedOrderIds.slice(0, 4)"
          :key="orderId"
          size="small"
          color="primary"
          variant="outlined"
          class="mr-2 mb-2"
          @click="viewOrderDetails(orderId)"
        >
          {{ getOrderNumber(orderId) }}
        </v-chip>

        <div v-if="relatedOrderIds.length > 4" class="text-caption text-medium-emphasis">
          +{{ relatedOrderIds.length - 4 }} more orders
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { formatIDR } from '@/utils/currency'
import type { PendingPayment } from '@/stores/account'

interface Props {
  // ✅ НОВЫЙ интерфейс - получаем данные напрямую
  payment?: PendingPayment
  relatedOrderIds?: string[]
  mode?: 'transaction' | 'pending-payment'
  showDebugInfo?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  relatedOrderIds: () => [],
  mode: 'pending-payment',
  showDebugInfo: true // Временно для отладки
})

const router = useRouter()

// ✅ ДОБАВЛЯЕМ ЛОГИРОВАНИЕ
onMounted(() => {
  console.log('🔍 SupplierPaymentContextWidget mounted (NEW):', {
    hasPayment: !!props.payment,
    paymentId: props.payment?.id,
    supplierName: props.payment?.counteragentName,
    orderIds: props.relatedOrderIds,
    mode: props.mode,
    linkedOrders: props.payment?.linkedOrders
  })
})

// ✅ ПРОСТЫЕ computed из props
const supplierName = computed(() => props.payment?.counteragentName || 'Unknown Supplier')
const paymentAmount = computed(() => props.payment?.amount || 0)
const invoiceNumber = computed(() => props.payment?.invoiceNumber)
const paymentStatus = computed(() => props.payment?.status)

// ✅ ИНФОРМАЦИЯ О breakdown для pending платежей
const orderBreakdown = computed(() => {
  if (props.mode !== 'pending-payment' || !props.payment?.linkedOrders) return null

  const totalLinked = props.payment.linkedOrders
    .filter(order => order.isActive)
    .reduce((sum, order) => sum + order.linkedAmount, 0)

  const availableAmount = Math.max(0, props.payment.amount - totalLinked)
  const shortfall = Math.max(0, totalLinked - props.payment.amount)

  return {
    totalLinked,
    availableAmount,
    shortfall,
    paymentAmount: props.payment.amount
  }
})

// ✅ DEBUG INFO
const debugInfo = computed(() => ({
  paymentId: props.payment?.id || 'null',
  supplierName: props.payment?.counteragentName || 'null',
  orderCount: props.relatedOrderIds.length,
  mode: props.mode,
  linkedOrders: props.payment?.linkedOrders
}))

// Methods
function getStatusColor(status: string): string {
  const colors = {
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    failed: 'error',
    cancelled: 'grey'
  }
  return colors[status] || 'grey'
}

function getOrderNumber(orderId: string): string {
  return `PO-${orderId.slice(-3).toUpperCase()}`
}

function viewOrderDetails(orderId: string) {
  console.log('🔍 Viewing order details:', orderId)
  const url = router.resolve(`/suppliers/orders/${orderId}`).href
  window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
.supplier-payment-context {
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 12px;
  overflow: hidden;
  background-color: rgb(var(--v-theme-surface));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.payment-context {
  background: linear-gradient(
    135deg,
    rgb(var(--v-theme-primary-lighten-5)) 0%,
    rgb(var(--v-theme-surface)) 100%
  );
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-outline-variant));
}

.orders-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;

  .v-chip {
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
}

.bg-blue-lighten-5 {
  background-color: rgb(var(--v-theme-blue-lighten-5));
}

.bg-warning-lighten-4 {
  background-color: rgba(var(--v-theme-warning), 0.2);
}

.text-primary {
  color: rgb(var(--v-theme-primary));
}

.text-warning-darken-2 {
  color: rgb(var(--v-theme-warning));
}

.text-medium-emphasis {
  color: rgb(var(--v-theme-on-surface-variant));
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-warning {
  color: rgb(var(--v-theme-warning));
}
</style>
