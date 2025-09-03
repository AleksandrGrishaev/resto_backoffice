<!-- src/views/supplier_2/components/orders/BillCard.vue -->
<!-- ✅ NEW: Компонент карточки счета для переиспользования -->
<template>
  <v-card variant="outlined" class="bill-card pa-3" :class="{ 'elevation-2': hover }">
    <div class="d-flex justify-space-between align-center">
      <!-- Основная информация -->
      <div class="flex-grow-1">
        <div class="d-flex align-center mb-1">
          <span class="font-weight-medium mr-2">{{ bill.description }}</span>
          <v-chip :color="getStatusColor(bill.status)" size="small" variant="flat">
            {{ getStatusText(bill.status) }}
          </v-chip>
        </div>

        <div class="text-caption text-medium-emphasis">
          <span>ID: {{ bill.id }}</span>
          <span v-if="bill.invoiceNumber">| Invoice: {{ bill.invoiceNumber }}</span>
        </div>

        <div v-if="bill.dueDate" class="text-caption mt-1" :class="dueDateClass">
          <v-icon :icon="dueDateIcon" size="small" class="mr-1" />
          Due: {{ formatDate(bill.dueDate) }}
        </div>
      </div>

      <!-- Сумма -->
      <div class="text-right mx-3">
        <div class="text-h6 font-weight-bold">
          {{ formatCurrency(bill.amount) }}
        </div>
        <div v-if="bill.paidAmount && bill.paidAmount > 0" class="text-caption text-success">
          Paid: {{ formatCurrency(bill.paidAmount) }}
        </div>
      </div>

      <!-- Действия -->
      <div class="d-flex gap-1">
        <v-tooltip text="View Details">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              icon="mdi-eye"
              variant="text"
              size="small"
              color="info"
              @click="$emit('view', bill.id)"
            />
          </template>
        </v-tooltip>

        <v-tooltip v-if="bill.status === 'pending'" text="Process Payment">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              icon="mdi-credit-card"
              variant="text"
              size="small"
              color="success"
              @click="$emit('process-payment', bill.id)"
            />
          </template>
        </v-tooltip>

        <v-tooltip v-if="showDetach && bill.status === 'pending'" text="Detach from Order">
          <template #activator="{ props: tooltipProps }">
            <v-btn
              v-bind="tooltipProps"
              icon="mdi-link-off"
              variant="text"
              size="small"
              color="warning"
              @click="$emit('detach', bill.id)"
            />
          </template>
        </v-tooltip>

        <!-- Меню дополнительных действий -->
        <v-menu v-if="bill.status === 'pending'">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-dots-vertical" variant="text" size="small" />
          </template>
          <v-list density="compact">
            <v-list-item @click="$emit('edit', bill.id)">
              <template #prepend>
                <v-icon icon="mdi-pencil" />
              </template>
              <v-list-item-title>Edit Amount</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-if="bill.status === 'pending'"
              @click="$emit('process-payment', bill.id)"
            >
              <template #prepend>
                <v-icon icon="mdi-credit-card" />
              </template>
              <v-list-item-title>Process Payment</v-list-item-title>
            </v-list-item>
            <v-list-item
              v-if="showDetach && bill.status === 'pending'"
              @click="$emit('detach', bill.id)"
            >
              <template #prepend>
                <v-icon icon="mdi-link-off" />
              </template>
              <v-list-item-title>Detach from Order</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- ✅ История изменений (опционально) -->
    <v-expand-transition>
      <div v-if="showHistory && bill.amountHistory?.length" class="mt-3 pt-3 border-t">
        <div class="text-caption text-medium-emphasis mb-2">Amount History</div>
        <div class="history-list">
          <div
            v-for="change in bill.amountHistory"
            :key="change.timestamp"
            class="d-flex justify-space-between align-center py-1 text-caption"
          >
            <span>{{ change.reason }}</span>
            <span>
              {{ formatCurrency(change.oldAmount) }} →
              {{ formatCurrency(change.newAmount) }}
            </span>
          </div>
        </div>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PendingPayment } from '@/stores/account/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  bill: PendingPayment
  showDetach?: boolean
  showHistory?: boolean
  hover?: boolean
}

interface Emits {
  (e: 'view', billId: string): void
  (e: 'edit', billId: string): void
  (e: 'detach', billId: string): void
  (e: 'process-payment', billId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  showDetach: true,
  showHistory: false,
  hover: true
})

defineEmits<Emits>()

// =============================================
// COMPUTED
// =============================================

const dueDateClass = computed(() => {
  if (!props.bill.dueDate) return ''

  const today = new Date()
  const dueDate = new Date(props.bill.dueDate)
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'text-error' // Просрочен
  if (diffDays <= 3) return 'text-warning' // Скоро истекает
  return 'text-medium-emphasis' // Нормально
})

const dueDateIcon = computed(() => {
  if (!props.bill.dueDate) return 'mdi-calendar'

  const today = new Date()
  const dueDate = new Date(props.bill.dueDate)
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'mdi-alert-circle' // Просрочен
  if (diffDays <= 3) return 'mdi-clock-alert' // Скоро истекает
  return 'mdi-calendar' // Нормально
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'orange'
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
      return 'Processing'
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
.bill-card {
  transition: all 0.2s ease;
}

.bill-card:hover {
  transform: translateY(-1px);
}

.history-list {
  max-height: 120px;
  overflow-y: auto;
  background: rgb(var(--v-theme-surface));
  border-radius: 4px;
  padding: 8px;
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.gap-1 {
  gap: 4px;
}

/* ✅ Специальные стили для статусов */
.text-error {
  color: rgb(var(--v-theme-error)) !important;
}

.text-warning {
  color: rgb(var(--v-theme-warning)) !important;
}

.text-success {
  color: rgb(var(--v-theme-success)) !important;
}

.text-medium-emphasis {
  opacity: 0.7;
}
</style>
