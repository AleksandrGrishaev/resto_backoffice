<!-- src/views/supplier_2/components/orders/BillStatus.vue - УПРОЩЕННАЯ ВЕРСИЯ -->
<template>
  <div class="bill-status">
    <!-- ✅ УПРОЩЕННАЯ логика: только показываем статус -->
    <div v-if="hasBills" class="d-flex align-center">
      <span class="text-body-2">{{ billCount }} bill{{ billCount > 1 ? 's' : '' }}</span>

      <v-chip
        :color="getPaymentStatusColor(paymentStatus)"
        size="x-small"
        variant="flat"
        class="ml-2"
      >
        {{ getPaymentStatusText(paymentStatus) }}
      </v-chip>

      <!-- Индикатор проблем -->
      <v-icon v-if="hasIssues" color="warning" size="small" class="ml-1">mdi-alert-circle</v-icon>
    </div>

    <!-- Нет счетов -->
    <div v-else class="text-grey-400 text-caption">No bills</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PurchaseOrder } from '@/stores/supplier_2/types'

// =============================================
// PROPS - Упрощенные до минимума
// =============================================

interface Props {
  order: PurchaseOrder
}

const props = defineProps<Props>()

// =============================================
// COMPUTED - Простая логика на основе order данных
// =============================================

const hasBills = computed(() => {
  // Простая проверка наличия billId в заказе
  return !!props.order.billId
})

const billCount = computed(() => {
  // Пока упрощенно - считаем что у заказа может быть только 1 счет
  // В будущем можно расширить если нужно множественные счета
  return hasBills.value ? 1 : 0
})

const paymentStatus = computed(() => {
  if (!hasBills.value) return 'no_bills'

  // Упрощенная логика на основе paymentStatus заказа
  switch (props.order.paymentStatus) {
    case 'pending':
      return 'pending'
    case 'paid':
      return 'paid'
    default:
      return 'pending'
  }
})

const hasIssues = computed(() => {
  // Простая проверка наличия проблем
  return (
    props.order.hasShortfall ||
    (props.order.actualDeliveredAmount &&
      props.order.actualDeliveredAmount < props.order.totalAmount)
  )
})

// =============================================
// METHODS - Только для отображения
// =============================================

function getPaymentStatusColor(status: string): string {
  const colors = {
    no_bills: 'grey',
    pending: 'orange',
    partial: 'blue',
    paid: 'green'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

function getPaymentStatusText(status: string): string {
  const texts = {
    no_bills: 'No Bills',
    pending: 'Pending',
    partial: 'Partial',
    paid: 'Paid'
  }
  return texts[status as keyof typeof texts] || status
}
</script>

<style scoped>
.bill-status {
  min-height: 24px;
  display: flex;
  align-items: center;
}
</style>
