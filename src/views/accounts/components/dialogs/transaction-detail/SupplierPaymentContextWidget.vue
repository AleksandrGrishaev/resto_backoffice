<!-- src/views/accounts/components/dialogs/transaction-detail/SupplierPaymentContextWidget.vue -->
<template>
  <div class="supplier-payment-context">
    <!-- Минимальная информация о платеже -->
    <div class="payment-context pa-4 bg-blue-lighten-5">
      <div class="text-subtitle-1 font-weight-bold mb-2">
        <v-icon icon="mdi-truck" class="mr-2" />
        Supplier Payment Context
      </div>

      <div v-if="relatedPayment">
        <div>
          <strong>Invoice:</strong>
          {{ relatedPayment.invoiceNumber || 'N/A' }}
        </div>
        <div>
          <strong>Payment Status:</strong>
          <v-chip :color="getStatusColor(relatedPayment.status)" size="small">
            {{ relatedPayment.status }}
          </v-chip>
        </div>
      </div>
    </div>

    <!-- Минимальный список заказов -->
    <div v-if="relatedOrderIds.length > 0" class="related-orders pa-4">
      <div class="text-subtitle-2 font-weight-bold mb-3">
        Related Orders ({{ relatedOrderIds.length }})
      </div>

      <div class="orders-summary">
        <v-chip
          v-for="orderId in relatedOrderIds.slice(0, 3)"
          :key="orderId"
          size="small"
          variant="outlined"
          class="mr-2 mb-2"
        >
          {{ getOrderNumber(orderId) }}
        </v-chip>

        <div v-if="relatedOrderIds.length > 3" class="text-caption text-medium-emphasis">
          +{{ relatedOrderIds.length - 3 }} more orders
        </div>
      </div>
    </div>

    <!-- Кнопка перехода к полной информации -->
    <div class="pa-4">
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-open-in-new"
        @click="openSupplierModule"
      >
        View Full Details in Suppliers
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account'
import type { Transaction, PendingPayment } from '@/stores/account'

interface Props {
  transaction: Transaction
}

const props = defineProps<Props>()
const router = useRouter()
const accountStore = useAccountStore()

// Computed
const relatedPayment = computed((): PendingPayment | null => {
  if (!props.transaction.relatedPaymentId) return null
  return accountStore.getPaymentById(props.transaction.relatedPaymentId)
})

const relatedOrderIds = computed((): string[] => {
  return props.transaction.relatedOrderIds || []
})

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
  // Простое преобразование ID в читаемый номер заказа
  return `PO-${orderId.slice(-3).toUpperCase()}`
}

function openSupplierModule() {
  // Переход к соответствующему заказу в модуле поставщиков
  const firstOrderId = relatedOrderIds.value[0]
  if (firstOrderId) {
    router.push(`/suppliers/orders/${firstOrderId}`)
  } else {
    // Если нет связанных заказов, переходим к контрагенту
    router.push(`/suppliers/counteragents/${props.transaction.counteragentId}`)
  }
}
</script>

<style lang="scss" scoped>
.supplier-payment-context {
  border-top: 1px solid rgb(var(--v-theme-outline));
}

.payment-context {
  background-color: rgb(var(--v-theme-surface-variant));
}

.orders-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}
</style>
