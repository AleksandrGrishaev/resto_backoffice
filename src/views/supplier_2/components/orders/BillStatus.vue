<template>
  <div class="bill-status">
    <!-- Нет счета -->
    <span v-if="!bill" class="text-grey-400 text-caption">No bill</span>

    <!-- Есть счет -->
    <div v-else class="d-flex align-center">
      <!-- Основная сумма -->
      <span class="text-body-2">
        {{ formatCurrency(bill.paidAmount || 0) }}
        <span class="text-grey-400">/ {{ formatCurrency(bill.amount) }}</span>
      </span>

      <!-- Индикатор статуса -->
      <v-chip :color="getStatusColor(bill.status)" size="x-small" variant="flat" class="ml-2">
        {{ getStatusText(bill.status) }}
      </v-chip>

      <!-- Индикатор рассинхронизации -->
      <v-icon
        v-if="isAmountOutOfSync"
        color="warning"
        size="small"
        class="ml-1"
        @click.stop="$emit('show-sync-warning')"
      >
        mdi-alert-circle
      </v-icon>

      <!-- Индикатор недопоставки -->
      <v-icon
        v-if="hasShortfall"
        color="error"
        size="small"
        class="ml-1"
        @click.stop="$emit('show-shortfall')"
      >
        mdi-package-down
      </v-icon>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PendingPayment } from '@/stores/account/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  bill?: TempBill | null
  orderAmount?: number
  hasShortfall?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'show-sync-warning': []
  'show-shortfall': []
}>()

// =============================================
// COMPUTED
// =============================================

const isAmountOutOfSync = computed(() => {
  if (!props.bill || !props.orderAmount) return false
  return Math.abs(props.bill.amount - props.orderAmount) > 1 // допуск в 1 IDR
})

// =============================================
// METHODS
// =============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'grey'
    case 'processing':
      return 'warning'
    case 'completed':
      return 'success'
    case 'failed':
      return 'error'
    default:
      return 'grey'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'processing':
      return 'Partial'
    case 'completed':
      return 'Paid'
    case 'failed':
      return 'Failed'
    default:
      return status
  }
}
</script>

<style scoped>
.bill-status {
  min-height: 24px;
  display: flex;
  align-items: center;
}
</style>
