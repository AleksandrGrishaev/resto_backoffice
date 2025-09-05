// Создать src/views/supplier_2/components/orders/OrderReceiptWidget.vue
<template>
  <v-card v-if="order.hasReceiptDiscrepancies || order.status === 'delivered'" variant="outlined">
    <v-card-title class="text-subtitle-1 pa-3 pb-2">
      <v-icon icon="mdi-truck-check" class="mr-2" size="20" />
      Receipt Information
    </v-card-title>

    <v-card-text class="pa-3 pt-0">
      <!-- Summary Row -->
      <div class="d-flex justify-space-between align-center mb-3">
        <div>
          <div class="text-body-2 font-weight-medium">
            {{
              order.hasReceiptDiscrepancies
                ? 'Delivered with discrepancies'
                : 'Delivered as ordered'
            }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Completed {{ formatDate(order.receiptCompletedAt) }}
          </div>
        </div>
        <v-chip
          :color="order.hasReceiptDiscrepancies ? 'warning' : 'success'"
          size="small"
          variant="flat"
        >
          <v-icon
            :icon="order.hasReceiptDiscrepancies ? 'mdi-alert-triangle' : 'mdi-check'"
            size="14"
            class="mr-1"
          />
          {{
            order.hasReceiptDiscrepancies
              ? `${order.receiptDiscrepancies?.length || 0} issues`
              : 'OK'
          }}
        </v-chip>
      </div>

      <!-- Amount Comparison (only if there are discrepancies) -->
      <div v-if="order.hasReceiptDiscrepancies" class="border rounded pa-2 bg-surface-variant">
        <div class="d-flex justify-space-between text-body-2 mb-1">
          <span>Original amount:</span>
          <span>{{ formatCurrency(order.originalTotalAmount) }}</span>
        </div>
        <div class="d-flex justify-space-between text-body-2 mb-1">
          <span>Delivered amount:</span>
          <span>{{ formatCurrency(order.actualDeliveredAmount) }}</span>
        </div>
        <v-divider class="my-2" />
        <div class="d-flex justify-space-between text-body-2 font-weight-medium">
          <span>Difference:</span>
          <span :class="getAmountDifferenceClass(order)">
            {{ formatAmountDifference(order) }}
          </span>
        </div>
      </div>

      <!-- Discrepancies List (только если есть расхождения) -->
      <div v-if="order.receiptDiscrepancies?.length" class="mt-3">
        <div class="text-caption text-medium-emphasis mb-2">Affected items:</div>
        <div class="d-flex flex-wrap gap-2">
          <v-chip
            v-for="discrepancy in order.receiptDiscrepancies"
            :key="discrepancy.itemId"
            size="x-small"
            :color="getDiscrepancyTypeColor(discrepancy.type)"
            variant="tonal"
          >
            {{ discrepancy.itemName }}
            <v-tooltip activator="parent" location="top">
              <div class="text-caption">
                <div>
                  <strong>Type:</strong>
                  {{ getDiscrepancyTypeText(discrepancy.type) }}
                </div>
                <div>
                  <strong>Impact:</strong>
                  {{ formatCurrency(discrepancy.impact.totalDifference) }}
                </div>
              </div>
            </v-tooltip>
          </v-chip>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { PurchaseOrder, ReceiptDiscrepancyInfo } from '@/stores/supplier_2/types'

interface Props {
  order: PurchaseOrder
}

defineProps<Props>()

function formatCurrency(amount: number | undefined): string {
  if (!amount) return '—'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString))
}

function getAmountDifferenceClass(order: PurchaseOrder): string {
  const difference = (order.actualDeliveredAmount || 0) - (order.originalTotalAmount || 0)
  return difference > 0 ? 'text-warning' : 'text-error'
}

function formatAmountDifference(order: PurchaseOrder): string {
  const difference = (order.actualDeliveredAmount || 0) - (order.originalTotalAmount || 0)
  const sign = difference > 0 ? '+' : ''
  return `${sign}${formatCurrency(Math.abs(difference))}`
}

function getDiscrepancyTypeColor(type: ReceiptDiscrepancyInfo['type']): string {
  switch (type) {
    case 'quantity':
      return 'info'
    case 'price':
      return 'warning'
    case 'both':
      return 'error'
    default:
      return 'grey'
  }
}

function getDiscrepancyTypeText(type: ReceiptDiscrepancyInfo['type']): string {
  switch (type) {
    case 'quantity':
      return 'Quantity difference'
    case 'price':
      return 'Price difference'
    case 'both':
      return 'Quantity & price differences'
    default:
      return type
  }
}
</script>
