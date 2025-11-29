<template>
  <div v-if="pendingPayments.length > 0" class="pending-payments-section">
    <v-card class="mb-4" variant="outlined">
      <v-card-title class="d-flex align-center">
        <v-icon color="warning" class="mr-2">mdi-clock-alert-outline</v-icon>
        <span>Pending Payments Awaiting Confirmation</span>
        <v-spacer />
        <v-chip color="warning" variant="flat" size="small">
          {{ pendingPayments.length }} pending
        </v-chip>
        <!-- ✅ NEW: Refresh button -->
        <v-btn
          icon="mdi-refresh"
          size="small"
          variant="text"
          class="ml-2"
          @click="$emit('refresh')"
        >
          <v-icon>mdi-refresh</v-icon>
          <v-tooltip activator="parent" location="bottom">Refresh pending payments</v-tooltip>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          These payments are assigned to this account but require cashier confirmation before the
          transaction is completed.
        </v-alert>

        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Counteragent</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="payment in pendingPayments" :key="payment.id" class="pending-payment-row">
              <td>
                <div class="text-caption">
                  {{ formatDate(payment.createdAt) }}
                </div>
              </td>
              <td>
                <div class="font-weight-medium">{{ payment.counteragentName }}</div>
              </td>
              <td>
                <div class="text-truncate" style="max-width: 300px">
                  {{ payment.description }}
                </div>
                <div v-if="payment.invoiceNumber" class="text-caption text-grey">
                  Invoice: {{ payment.invoiceNumber }}
                </div>
              </td>
              <td>
                <v-chip :color="getCategoryColor(payment.category)" size="small" variant="tonal">
                  {{ getCategoryLabel(payment.category) }}
                </v-chip>
              </td>
              <td>
                <div class="font-weight-bold text-error">-{{ formatIDR(payment.amount) }}</div>
              </td>
              <td>
                <v-chip :color="getPriorityColor(payment.priority)" size="small" variant="flat">
                  {{ getPriorityLabel(payment.priority) }}
                </v-chip>
              </td>
              <td>
                <v-chip color="warning" size="small" variant="tonal">
                  <v-icon start size="small">mdi-clock-outline</v-icon>
                  Pending Confirmation
                </v-chip>
              </td>
              <td>
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  icon="mdi-information-outline"
                  @click="$emit('view-payment', payment)"
                />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import type { PendingPayment } from '@/stores/account/types'
import { PAYMENT_CATEGORIES, PAYMENT_PRIORITIES } from '@/stores/account/types'

interface Props {
  pendingPayments: PendingPayment[]
}

defineProps<Props>()

defineEmits<{
  (e: 'view-payment', payment: PendingPayment): void
  (e: 'refresh'): void
}>()

// Форматирование даты
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Форматирование валюты
function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Получить цвет категории
function getCategoryColor(category: PendingPayment['category']): string {
  const colors: Record<PendingPayment['category'], string> = {
    supplier: 'blue',
    service: 'purple',
    utilities: 'orange',
    salary: 'green',
    rent: 'red',
    maintenance: 'teal',
    other: 'grey'
  }
  return colors[category] || 'grey'
}

// Получить лейбл категории
function getCategoryLabel(category: PendingPayment['category']): string {
  return PAYMENT_CATEGORIES[category] || category
}

// Получить цвет приоритета
function getPriorityColor(priority: PendingPayment['priority']): string {
  const colors: Record<PendingPayment['priority'], string> = {
    low: 'grey',
    medium: 'blue',
    high: 'orange',
    urgent: 'red'
  }
  return colors[priority] || 'grey'
}

// Получить лейбл приоритета
function getPriorityLabel(priority: PendingPayment['priority']): string {
  return PAYMENT_PRIORITIES[priority] || priority
}
</script>

<style scoped>
.pending-payments-section {
  margin-bottom: 24px;
}

.pending-payment-row {
  background-color: rgba(255, 193, 7, 0.05);
}

.pending-payment-row:hover {
  background-color: rgba(255, 193, 7, 0.1);
}

.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
