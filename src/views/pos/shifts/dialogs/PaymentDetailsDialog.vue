<!-- src/views/pos/shifts/dialogs/PaymentDetailsDialog.vue -->
<template>
  <v-dialog v-model="dialog" max-width="700" scrollable>
    <v-card v-if="payment">
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <div class="text-h6">Payment Details</div>
          <div class="text-caption">{{ payment.paymentNumber }}</div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-divider />

      <!-- Content -->
      <v-card-text class="pa-4">
        <!-- Payment Summary Card -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <div class="payment-summary">
              <!-- Amount -->
              <div class="summary-row">
                <span class="label">Amount:</span>
                <span class="value text-h5 font-weight-bold">
                  {{ formatPrice(payment.amount) }}
                </span>
              </div>

              <!-- Method -->
              <div class="summary-row">
                <span class="label">Method:</span>
                <v-chip :prepend-icon="getPaymentMethodIcon(payment.method)" size="small">
                  {{ getPaymentMethodName(payment.method) }}
                </v-chip>
              </div>

              <!-- Status -->
              <div class="summary-row">
                <span class="label">Status:</span>
                <v-chip :color="getPaymentStatusColor(payment.status)" size="small">
                  {{ payment.status }}
                </v-chip>
              </div>

              <!-- Time -->
              <div class="summary-row">
                <span class="label">Processed:</span>
                <span class="value">{{ formatDateTime(payment.processedAt) }}</span>
              </div>

              <!-- Processed By -->
              <div class="summary-row">
                <span class="label">Cashier:</span>
                <span class="value">{{ payment.processedBy }}</span>
              </div>

              <!-- Shift -->
              <div v-if="payment.shiftId" class="summary-row">
                <span class="label">Shift:</span>
                <span class="value">{{ getShiftNumber(payment.shiftId) }}</span>
              </div>

              <!-- Change (for cash payments) -->
              <div v-if="payment.method === 'cash' && payment.changeAmount" class="summary-row">
                <span class="label">Received:</span>
                <span class="value">{{ formatPrice(payment.receivedAmount || 0) }}</span>
              </div>
              <div v-if="payment.method === 'cash' && payment.changeAmount" class="summary-row">
                <span class="label">Change:</span>
                <span class="value text-info">{{ formatPrice(payment.changeAmount) }}</span>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Refund Information -->
        <v-alert
          v-if="payment.status === 'refunded' && payment.refundReason"
          color="warning"
          variant="tonal"
          class="mb-4"
        >
          <div class="d-flex align-center">
            <v-icon class="mr-2">mdi-alert-circle</v-icon>
            <div class="flex-grow-1">
              <div class="font-weight-bold mb-1">Refund Information</div>
              <div class="text-body-2 mb-2">
                <strong>Reason:</strong>
                {{ payment.refundReason }}
              </div>
              <div v-if="payment.refundedAt" class="text-caption">
                <v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>
                Refunded: {{ formatDateTime(payment.refundedAt) }}
              </div>
              <div v-if="payment.refundedBy" class="text-caption">
                <v-icon size="16" class="mr-1">mdi-account</v-icon>
                By: {{ payment.refundedBy }}
              </div>
              <div v-if="payment.originalPaymentId" class="text-caption">
                <v-icon size="16" class="mr-1">mdi-link</v-icon>
                Original Payment: {{ getOriginalPaymentNumber(payment.originalPaymentId) }}
              </div>
            </div>
          </div>
        </v-alert>

        <!-- Order Information -->
        <div v-if="order" class="order-info mb-4">
          <div class="text-subtitle-1 mb-2 d-flex align-center">
            <v-icon class="mr-2">mdi-receipt-text</v-icon>
            Order Information
          </div>

          <v-card variant="outlined">
            <v-card-text>
              <div class="d-flex justify-space-between align-center mb-2">
                <span>Order #{{ order.orderNumber }}</span>
                <v-chip size="small">{{ getOrderTypeLabel(order.type) }}</v-chip>
              </div>

              <div v-if="order.type === 'dine_in'" class="text-caption">
                <v-icon size="16">mdi-table-furniture</v-icon>
                {{ getTableName(order.tableId) }}
              </div>

              <div class="text-caption text-medium-emphasis">
                Created: {{ formatDateTime(order.createdAt) }}
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Items List -->
        <div class="items-list mb-4">
          <div class="text-subtitle-1 mb-2 d-flex align-center">
            <v-icon class="mr-2">mdi-food</v-icon>
            Paid Items ({{ paidItems.length }})
          </div>

          <v-card variant="outlined">
            <v-list>
              <v-list-item v-for="item in paidItems" :key="item.id" density="compact">
                <template #prepend>
                  <div class="item-quantity">{{ item.quantity }}x</div>
                </template>

                <v-list-item-title>{{ item.menuItemName }}</v-list-item-title>
                <v-list-item-subtitle v-if="item.modifications?.length">
                  <span v-for="mod in item.modifications" :key="mod.id" class="mr-2">
                    + {{ mod.name }}
                  </span>
                </v-list-item-subtitle>

                <template #append>
                  <div class="item-price">
                    {{ formatPrice(item.totalPrice) }}
                  </div>
                </template>
              </v-list-item>

              <!-- Total -->
              <v-divider />
              <v-list-item>
                <v-list-item-title class="font-weight-bold">Total</v-list-item-title>
                <template #append>
                  <div class="text-h6 font-weight-bold">
                    {{ formatPrice(payment.amount) }}
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </div>

        <!-- Receipt Information -->
        <div class="receipt-info">
          <div class="text-subtitle-1 mb-2 d-flex align-center">
            <v-icon class="mr-2">mdi-printer</v-icon>
            Receipt
          </div>

          <v-alert
            :color="payment.receiptPrinted ? 'success' : 'grey'"
            variant="tonal"
            density="compact"
          >
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="font-weight-bold">
                  {{ payment.receiptPrinted ? 'Receipt Printed' : 'Receipt Not Printed' }}
                </div>
                <div v-if="payment.receiptNumber" class="text-caption">
                  Receipt #{{ payment.receiptNumber }}
                </div>
              </div>
              <v-btn
                size="small"
                variant="outlined"
                prepend-icon="mdi-printer"
                @click="printReceipt"
              >
                {{ payment.receiptPrinted ? 'Reprint' : 'Print' }}
              </v-btn>
            </div>
          </v-alert>
        </div>
      </v-card-text>

      <v-divider />

      <!-- Actions -->
      <v-card-actions class="pa-4">
        <v-btn variant="outlined" @click="close">Close</v-btn>

        <v-spacer />

        <!-- Refund Button (admin/manager only) -->
        <v-btn
          v-if="canCreateRefund"
          color="error"
          variant="outlined"
          prepend-icon="mdi-cash-refund"
          :disabled="payment.status === 'refunded' || isRefunding"
          :loading="isRefunding"
          @click="createRefund"
        >
          Create Refund
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Loading state -->
    <v-card v-else>
      <v-card-text class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" />
        <div class="mt-4">Loading payment details...</div>
      </v-card-text>
    </v-card>

    <!-- Refund Dialog -->
    <RefundDialog
      v-model="showRefundDialog"
      :payment="payment"
      @refund-confirmed="handleRefundConfirmed"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { useAuthStore } from '@/stores/auth'
import type { PosBillItem } from '@/stores/pos/types'
import RefundDialog from './RefundDialog.vue'

// Props & Emits
interface Props {
  modelValue: boolean
  paymentId: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  paymentId: null
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'print-receipt': [paymentId: string]
  'refund-created': [paymentId: string]
}>()

// Stores
const shiftsStore = useShiftsStore()
const paymentsStore = usePosPaymentsStore()
const ordersStore = usePosOrdersStore()
const tablesStore = usePosTablesStore()
const authStore = useAuthStore()

// State
const dialog = ref(props.modelValue)
const isRefunding = ref(false)
const showRefundDialog = ref(false)

// Computed
const payment = computed(() => {
  if (!props.paymentId) return null
  return paymentsStore.payments.find(p => p.id === props.paymentId) || null
})

const order = computed(() => {
  if (!payment.value) return null
  return ordersStore.orders.find(o => o.id === payment.value!.orderId) || null
})

const paidItems = computed(() => {
  if (!payment.value || !order.value) return []

  const items: PosBillItem[] = []
  for (const bill of order.value.bills) {
    for (const item of bill.items) {
      if (payment.value.itemIds.includes(item.id)) {
        items.push(item)
      }
    }
  }

  return items
})

// TODO: Restore permission checks when roles are properly configured
// const canCreateRefund = computed(() => {
//   const roles = authStore.userRoles
//   return roles.includes('admin') || roles.includes('manager')
// })

// Temporary: Allow all users to create refunds for testing
const canCreateRefund = computed(() => true)

// Watchers
watch(
  () => props.modelValue,
  newVal => {
    dialog.value = newVal
  }
)

watch(dialog, newVal => {
  emit('update:modelValue', newVal)
})

// Methods
function close() {
  dialog.value = false
}

function printReceipt() {
  if (!payment.value) return
  emit('print-receipt', payment.value.id)
}

function createRefund() {
  if (!payment.value) return
  // Open refund dialog instead of creating refund directly
  showRefundDialog.value = true
}

async function handleRefundConfirmed(reason: string) {
  if (!payment.value) return

  isRefunding.value = true
  try {
    const result = await paymentsStore.createRefund(payment.value.id, reason)

    if (result.success) {
      // Close refund dialog
      showRefundDialog.value = false

      emit('refund-created', payment.value.id)
      // Show success message
      console.log('✅ Refund created successfully with reason:', reason)

      // Close payment details dialog
      close()
    } else {
      console.error('❌ Failed to create refund:', result.error)
      // TODO: Show error notification
      showRefundDialog.value = false
    }
  } catch (error) {
    console.error('❌ Error creating refund:', error)
    showRefundDialog.value = false
  } finally {
    isRefunding.value = false
  }
}

function getShiftNumber(shiftId: string): string {
  const shift = shiftsStore.shifts.find(s => s.id === shiftId)
  return shift?.shiftNumber || 'Unknown'
}

function getOriginalPaymentNumber(paymentId: string): string {
  const originalPayment = paymentsStore.payments.find(p => p.id === paymentId)
  return originalPayment?.paymentNumber || 'Unknown'
}

function getTableName(tableId?: string): string {
  if (!tableId) return 'N/A'
  const table = tablesStore.tables.find(t => t.id === tableId)
  return table ? `Table ${table.number}` : 'Unknown'
}

function getOrderTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dine_in: 'Dine In',
    takeaway: 'Takeaway',
    delivery: 'Delivery'
  }
  return labels[type] || type
}

function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    cash: 'mdi-cash',
    card: 'mdi-credit-card',
    qr: 'mdi-qrcode'
  }
  return icons[method] || 'mdi-currency-usd'
}

function getPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    qr: 'QR Code'
  }
  return names[method] || method
}

function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    refunded: 'grey'
  }
  return colors[status] || 'grey'
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('id-ID')
}
</script>

<style scoped>
.payment-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.value {
  font-size: 16px;
  font-weight: 500;
}

.item-quantity {
  min-width: 40px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.item-price {
  font-weight: 600;
  min-width: 100px;
  text-align: right;
}
</style>
