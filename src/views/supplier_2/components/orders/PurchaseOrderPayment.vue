<template>
  <div class="purchase-order-payment">
    <div class="text-subtitle-2 mb-3">
      <v-icon icon="mdi-credit-card-outline" class="mr-2" />
      Payment Management
    </div>

    <!-- No Bills State - Enhanced with both buttons -->
    <div v-if="!bills || bills.length === 0" class="no-bills-section">
      <v-card variant="outlined" class="pa-4">
        <div class="text-center">
          <v-icon icon="mdi-receipt-text-outline" size="48" color="grey-lighten-1" class="mb-3" />
          <div class="text-h6 text-medium-emphasis mb-2">No Bills Created</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            Create a new bill or attach an existing one to manage payments for this order
          </div>

          <!-- Two Action Buttons -->
          <div class="d-flex gap-3 justify-center">
            <v-btn
              color="primary"
              variant="elevated"
              prepend-icon="mdi-plus"
              :loading="loading"
              @click="$emit('create-bill', order)"
            >
              Create New Bill
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              prepend-icon="mdi-link"
              :loading="loading"
              @click="$emit('attach-bill', order)"
            >
              Attach Existing Bill
            </v-btn>
          </div>
        </div>
      </v-card>
    </div>

    <!-- Bills Exist State -->
    <div v-else class="bills-section">
      <!-- ✅ УБИРАЕМ дублирующий серый блок, оставляем только список счетов -->
      <!-- Bills List -->
      <v-card variant="outlined">
        <v-card-title class="d-flex justify-space-between align-center pa-3">
          <span class="text-subtitle-1">Associated Bills ({{ bills.length }})</span>
          <div class="d-flex gap-2">
            <v-btn
              color="primary"
              variant="text"
              size="small"
              prepend-icon="mdi-link"
              :loading="loading"
              @click="$emit('attach-bill', order)"
            >
              Attach Bill
            </v-btn>
            <v-btn
              color="primary"
              variant="text"
              size="small"
              prepend-icon="mdi-plus"
              :loading="loading"
              @click="$emit('create-bill', order)"
            >
              Create New
            </v-btn>
          </div>
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-0">
          <div v-for="(bill, index) in bills" :key="bill.id" class="bill-item">
            <div class="pa-3" :class="{ 'border-b': index < bills.length - 1 }">
              <div class="d-flex justify-space-between align-center">
                <!-- Bill Information -->
                <div class="bill-info flex-grow-1">
                  <div class="d-flex align-center mb-1">
                    <v-chip
                      :color="getBillStatusColor(bill.status)"
                      size="x-small"
                      variant="flat"
                      class="mr-2"
                    >
                      {{ getBillStatusText(bill.status) }}
                    </v-chip>
                    <div class="text-body-1 font-weight-medium">
                      {{ bill.description }}
                    </div>
                  </div>

                  <div class="text-caption text-medium-emphasis mb-1">
                    ID: {{ bill.id.slice(-8) }} | Invoice: {{ bill.invoiceNumber || 'N/A' }} |
                    Priority: {{ bill.priority }}
                  </div>

                  <div v-if="bill.dueDate" class="text-caption text-medium-emphasis">
                    Due: {{ formatDate(bill.dueDate) }}
                    <span v-if="isOverdue(bill.dueDate)" class="text-error font-weight-bold ml-1">
                      (OVERDUE)
                    </span>
                  </div>

                  <div
                    v-if="getLinkedAmountForOrder(bill, order.id) !== bill.amount"
                    class="text-caption text-medium-emphasis"
                  >
                    Original payment: {{ formatCurrency(bill.amount) }} • Linked to this order:
                    {{ formatCurrency(getLinkedAmountForOrder(bill, order.id)) }}
                  </div>
                </div>

                <!-- Amount -->
                <div class="bill-amount text-right mr-3">
                  <div class="text-h6 font-weight-bold">
                    {{ formatCurrency(getLinkedAmountForOrder(bill, order.id)) }}
                  </div>

                  <div
                    v-if="bill.paidAmount && bill.paidAmount > 0"
                    class="text-caption text-success"
                  >
                    Paid: {{ formatCurrency(bill.paidAmount) }}
                  </div>
                </div>

                <!-- Actions -->
                <div class="bill-actions d-flex gap-1">
                  <!-- ✅ Unlink для completed переплат -->
                  <v-tooltip v-if="canUnlinkOverpayment(bill)" text="Unlink Overpayment">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        icon="mdi-link-off"
                        variant="text"
                        size="small"
                        color="warning"
                        @click="$emit('detach-bill', bill.id)"
                      />
                    </template>
                  </v-tooltip>

                  <!-- ✅ Process Payment для pending счетов -->
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

                  <!-- ✅ Cancel для pending счетов (созданных для этого заказа) -->
                  <v-tooltip v-if="canCancelBill(bill)" text="Cancel Bill">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        icon="mdi-cancel"
                        variant="text"
                        size="small"
                        color="error"
                        @click="$emit('cancel-bill', bill.id)"
                      />
                    </template>
                  </v-tooltip>
                  <!-- More Actions Menu -->
                  <v-menu>
                    <template #activator="{ props: menuProps }">
                      <v-btn
                        v-bind="menuProps"
                        icon="mdi-dots-vertical"
                        variant="text"
                        size="small"
                        color="grey"
                      />
                    </template>

                    <v-list density="compact">
                      <v-list-item
                        v-if="bill.status === 'pending'"
                        prepend-icon="mdi-cancel"
                        title="Cancel Bill"
                        @click="$emit('cancel-bill', bill.id)"
                      />
                    </v-list>
                  </v-menu>
                </div>
              </div>

              <!-- Bill History (collapsible) -->
              <div v-if="bill.amountHistory?.length && showBillHistory[bill.id]" class="mt-2">
                <v-divider class="mb-2" />
                <div class="text-caption text-medium-emphasis mb-1">Amount History:</div>
                <div class="history-items">
                  <div
                    v-for="change in bill.amountHistory.slice(-3)"
                    :key="change.timestamp"
                    class="d-flex justify-space-between text-caption py-1"
                  >
                    <span>{{ change.reason }}</span>
                    <span>
                      {{ formatCurrency(change.oldAmount) }} →
                      {{ formatCurrency(change.newAmount) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <!-- Additional Actions for existing bills -->
        <v-card-actions class="pa-3 border-t">
          <div class="d-flex gap-2 justify-center w-100">
            <v-btn
              color="info"
              variant="text"
              size="small"
              prepend-icon="mdi-view-list"
              @click="$emit('manage-all-bills', order)"
            >
              Manage All Bills
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PurchaseOrder } from '@/stores/supplier_2/types'
import type { PendingPayment } from '@/stores/account/types'
import { useOrderPayments } from '@/stores/supplier_2/composables/useOrderPayments'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  order: PurchaseOrder
  bills: PendingPayment[]
  loading?: boolean
}

interface Emits {
  (e: 'create-bill', order: PurchaseOrder): void
  (e: 'attach-bill', order: PurchaseOrder): void
  (e: 'manage-all-bills', order: PurchaseOrder): void
  (e: 'view-bill', billId: string): void
  (e: 'process-payment', billId: string): void
  (e: 'detach-bill', billId: string): void
  (e: 'edit-bill', billId: string): void
  (e: 'cancel-bill', billId: string): void
  (e: 'detach-bill', billId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<Emits>()

const { getAvailableAmount } = useOrderPayments()
// =============================================
// LOCAL STATE
// =============================================

const showBillHistory = ref<Record<string, boolean>>({})

// =============================================
// METHODS
// =============================================

function canUnlinkOverpayment(bill: PendingPayment): boolean {
  // Только completed счета (переплаты)
  if (bill.status !== 'completed') return false

  // Заказ НЕ в финальном статусе
  if (props.order.status === 'delivered' || props.order.status === 'received') return false

  // Счет был привязан через Attach (не создан для этого заказа)
  if (bill.sourceOrderId === props.order.id) return false

  return true
}

function canCancelBill(bill: PendingPayment): boolean {
  // Только pending счета
  if (bill.status !== 'pending') return false

  // Заказ НЕ в финальном статусе
  if (props.order.status === 'delivered' || props.order.status === 'received') return false

  // Счет был создан для этого заказа (не attached)
  if (bill.sourceOrderId !== props.order.id) return false

  return true
}

function formatDate(date: string | Date): string {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

function getBillStatusColor(status: string): string {
  const statusColors = {
    pending: 'orange',
    processing: 'blue',
    completed: 'green',
    cancelled: 'red'
  }
  return statusColors[status as keyof typeof statusColors] || 'grey'
}

function getBillStatusText(status: string): string {
  const statusTexts = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return statusTexts[status as keyof typeof statusTexts] || status
}

function getLinkedAmountForOrder(payment: PendingPayment, orderId: string): number {
  console.log(`DEBUG getLinkedAmountForOrder for payment ${payment.id}:`, {
    orderId,
    linkedOrders: payment.linkedOrders,
    hasLinkedOrders: !!payment.linkedOrders,
    linkedOrdersLength: payment.linkedOrders?.length || 0
  })

  const link = payment.linkedOrders?.find(o => o.orderId === orderId && o.isActive)
  const result = link?.linkedAmount || 0

  console.log(`DEBUG result for ${payment.id}:`, result, 'link found:', !!link)
  return result
}
</script>

<style lang="scss" scoped>
.purchase-order-payment {
  .no-bills-section {
    .v-card {
      border: 2px dashed rgb(var(--v-theme-outline-variant));
      transition: all 0.3s ease;

      &:hover {
        border-color: rgb(var(--v-theme-primary));
        background-color: rgb(var(--v-theme-primary), 0.05);
      }
    }
  }

  .bills-section {
    .v-card {
      border-radius: 8px;
      overflow: hidden;
    }
  }

  .payment-summary {
    background: rgb(var(--v-theme-surface-variant));
  }

  .bill-item {
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgb(var(--v-theme-surface-variant), 0.1);
    }
  }

  .bill-info {
    min-width: 0;
  }

  .bill-actions {
    flex-shrink: 0;
  }

  .history-items {
    max-height: 120px;
    overflow-y: auto;
    background: rgb(var(--v-theme-surface));
    border-radius: 4px;
    padding: 8px;
    border: 1px solid rgb(var(--v-theme-outline-variant));
  }

  .border-b {
    border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  }

  .border-t {
    border-top: 1px solid rgb(var(--v-theme-outline-variant));
  }

  .text-medium-emphasis {
    opacity: 0.7;
  }

  // Status chip animations
  .v-chip {
    transition: all 0.2s ease;

    &:hover {
      transform: scale(1.05);
    }
  }

  // Responsive design
  @media (max-width: 768px) {
    .payment-summary .v-row {
      text-align: center;
    }

    .bill-item {
      .d-flex {
        flex-direction: column;
        align-items: stretch !important;
      }

      .bill-actions {
        justify-content: center;
        margin-top: 8px;
      }
    }

    .no-bills-section {
      .d-flex.gap-3 {
        flex-direction: column;
        gap: 12px;
      }
    }
  }
}
</style>
