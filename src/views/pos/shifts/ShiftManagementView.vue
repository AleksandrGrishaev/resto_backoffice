<!-- src/views/pos/shifts/ShiftManagementView.vue -->
<template>
  <div class="shift-management-view">
    <!-- Header with Back Button -->
    <div class="shift-header">
      <v-btn icon @click="handleBack">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <h1>Shift Management</h1>
      <div class="header-actions">
        <!-- ✅ Sprint 5: Hide End Shift button in read-only mode -->
        <v-btn
          v-if="currentShift && !readOnly"
          color="error"
          variant="flat"
          :disabled="hasNegativeBalance"
          @click="handleEndShift"
        >
          <v-icon start>mdi-stop</v-icon>
          End Shift
        </v-btn>
      </div>
    </div>

    <!-- No Active Shift Message -->
    <v-alert v-if="!currentShift" type="warning" variant="tonal" class="mb-4">
      <div class="d-flex align-center">
        <v-icon start>mdi-alert</v-icon>
        <div>
          <div class="font-weight-bold">No Active Shift</div>
          <div class="text-caption">Start a shift to view management details</div>
        </div>
      </div>
    </v-alert>

    <template v-if="currentShift">
      <!-- Current Shift Summary -->
      <v-card class="shift-summary">
        <v-card-title>Current Shift</v-card-title>
        <v-card-text>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="label">Shift Number</div>
              <div class="value">{{ currentShift.shiftNumber }}</div>
            </div>

            <div class="summary-item">
              <div class="label">Cashier</div>
              <div class="value">{{ currentShift.cashierName }}</div>
            </div>

            <div class="summary-item">
              <div class="label">Start Time</div>
              <div class="value">{{ formatDateTime(currentShift.startTime) }}</div>
            </div>

            <div class="summary-item">
              <div class="label">Duration</div>
              <div class="value">{{ calculateDuration(currentShift.startTime) }}</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Cash Balance -->
      <v-card class="cash-balance mt-4">
        <v-card-title>Cash Balance</v-card-title>
        <v-card-text>
          <div class="balance-grid">
            <div class="balance-item">
              <div class="label">Starting Cash</div>
              <div class="value">{{ formatPrice(currentShift.startingCash || 0) }}</div>
            </div>

            <div class="balance-item">
              <div class="label">Cash Received</div>
              <div class="value positive">+ {{ formatPrice(shiftStats.cashReceived) }}</div>
            </div>

            <div class="balance-item">
              <div class="label">Cash Refunded</div>
              <div class="value negative">- {{ formatPrice(shiftStats.cashRefunded) }}</div>
            </div>

            <!-- ✅ Sprint 4: Total Expenses -->
            <div class="balance-item">
              <div class="label">Total Expenses</div>
              <div class="value negative">- {{ formatPrice(totalShiftExpenses) }}</div>
            </div>

            <div class="balance-item highlight">
              <div class="label">Expected Cash</div>
              <div class="value">{{ formatPrice(expectedCash) }}</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Payment Methods Breakdown -->
      <v-card class="payment-breakdown mt-4">
        <v-card-title>Payment Methods</v-card-title>
        <v-card-text>
          <v-table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Count</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <v-icon size="20" class="mr-2">mdi-cash</v-icon>
                  Cash
                </td>
                <td>{{ shiftStats.cash.count }}</td>
                <td>{{ formatPrice(shiftStats.cash.amount) }}</td>
              </tr>
              <tr>
                <td>
                  <v-icon size="20" class="mr-2">mdi-credit-card</v-icon>
                  Card
                </td>
                <td>{{ shiftStats.card.count }}</td>
                <td>{{ formatPrice(shiftStats.card.amount) }}</td>
              </tr>
              <tr>
                <td>
                  <v-icon size="20" class="mr-2">mdi-qrcode</v-icon>
                  QR Code
                </td>
                <td>{{ shiftStats.qr.count }}</td>
                <td>{{ formatPrice(shiftStats.qr.amount) }}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td>
                  <strong>{{ shiftStats.totalCount }}</strong>
                </td>
                <td>
                  <strong>{{ formatPrice(shiftStats.totalAmount) }}</strong>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>

      <!-- Sprint 3: Negative Balance Warning -->
      <v-alert v-if="hasNegativeBalance" type="error" variant="tonal" prominent class="mt-4">
        <template #prepend>
          <v-icon size="48">mdi-alert-circle</v-icon>
        </template>
        <v-alert-title class="text-h6">Negative Cash Balance!</v-alert-title>
        <div class="text-body-1 mt-2">
          Expected cash balance is negative:
          <strong>{{ formatPrice(expectedCash) }}</strong>
        </div>
        <div class="text-body-2 mt-2">
          You cannot close the shift with negative balance. Please add cash to the register or
          review expenses.
        </div>
      </v-alert>

      <!-- Sprint 3: Pending Confirmations -->
      <!-- ✅ Sprint 5: Hide pending payments in read-only mode -->
      <div v-if="pendingPayments.length > 0 && !readOnly" class="mt-4">
        <PendingSupplierPaymentsList
          :pending-payments="pendingPayments"
          @confirm-payment="handleConfirmPaymentClick"
          @reject-payment="handleRejectPaymentClick"
        />
      </div>

      <!-- Sprint 3: Expense Operations -->
      <div class="mt-4">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-cash-minus" color="error" class="me-3" />
            <span>Expense Operations</span>
            <v-spacer />
            <!-- ✅ Sprint 5: Hide Add Expense button in read-only mode -->
            <v-btn
              v-if="!readOnly"
              color="error"
              variant="elevated"
              prepend-icon="mdi-plus"
              @click="handleAddExpense"
            >
              Add Expense
            </v-btn>
          </v-card-title>
        </v-card>

        <!-- Expenses List -->
        <div class="mt-3">
          <ShiftExpensesList :expenses="shiftExpenses" />
        </div>
      </div>

      <!-- Sprint 3: Incoming Transfers -->
      <div v-if="incomingTransfers.length > 0" class="mt-4">
        <ShiftTransfersList
          :transfers="incomingTransfers"
          :cash-account-id="cashAccount?.id || ''"
        />
      </div>

      <!-- Payments List -->
      <v-card class="payments-list mt-4">
        <v-card-title class="d-flex align-center">
          <span>Payments ({{ shiftPayments.length }})</span>
          <v-spacer />
          <v-text-field
            v-model="search"
            prepend-inner-icon="mdi-magnify"
            label="Search"
            single-line
            hide-details
            density="compact"
            style="max-width: 300px"
          />
        </v-card-title>

        <v-data-table
          :items="shiftPayments"
          :headers="paymentHeaders"
          :search="search"
          density="comfortable"
          hover
          @click:row="handlePaymentClick"
        >
          <template #[`item.paymentNumber`]="{ item }">
            <strong>{{ item.paymentNumber }}</strong>
          </template>

          <template #[`item.amount`]="{ item }">
            <span :class="{ 'text-error': item.amount < 0 }">
              {{ formatPrice(item.amount) }}
            </span>
          </template>

          <template #[`item.method`]="{ item }">
            <v-chip size="small">{{ item.method }}</v-chip>
          </template>

          <template #[`item.status`]="{ item }">
            <v-chip :color="getPaymentStatusColor(item.status)" size="small">
              {{ item.status }}
            </v-chip>
          </template>

          <template #[`item.processedAt`]="{ item }">
            {{ formatTime(item.processedAt) }}
          </template>
        </v-data-table>
      </v-card>

      <!-- Previous Shifts (Collapsible) -->
      <v-expansion-panels class="mt-4">
        <v-expansion-panel>
          <v-expansion-panel-title>
            <v-icon class="mr-2">mdi-history</v-icon>
            Previous Shifts
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <div v-if="previousShifts.length === 0" class="text-center py-4 text-medium-emphasis">
              No previous shifts found
            </div>
            <div v-for="shift in previousShifts" :key="shift.id" class="previous-shift-item">
              <div class="shift-info">
                <div>Shift {{ shift.shiftNumber }}</div>
                <div class="text-caption">
                  {{ formatDateTime(shift.startTime) }}
                  <template v-if="shift.endTime">- {{ formatDateTime(shift.endTime) }}</template>
                </div>
              </div>
              <div class="shift-total">
                {{ formatPrice(shift.totalSales || 0) }}
              </div>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <!-- End Shift Dialog -->
    <EndShiftDialog v-model="showEndShiftDialog" @shift-ended="handleShiftEnded" />

    <!-- Payment Details Dialog -->
    <PaymentDetailsDialog
      v-model="showPaymentDetailsDialog"
      :payment-id="selectedPaymentId"
      @print-receipt="handlePrintReceipt"
      @refund-created="handleRefundCreated"
    />

    <!-- Sprint 3: Expense Operation Dialog -->
    <ExpenseOperationDialog
      v-if="currentShift && cashAccount"
      v-model="showExpenseDialog"
      :shift-id="currentShift.id"
      :cash-account-id="cashAccount.id"
      @expense-created="handleExpenseCreated"
    />

    <!-- Sprint 3: Supplier Payment Confirm Dialog -->
    <SupplierPaymentConfirmDialog
      v-if="currentShift"
      v-model="showConfirmPaymentDialog"
      :payment="selectedPayment"
      :shift-id="currentShift.id"
      @payment-confirmed="handlePaymentConfirmed"
      @payment-rejected="handlePaymentRejected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { useAccountStore } from '@/stores/account'
import { POS_CASH_ACCOUNT_ID } from '@/stores/account/types'
import type { PosShift, PosPayment } from '@/stores/pos/types'
import type { PendingPayment } from '@/stores/account/types'
import EndShiftDialog from './dialogs/EndShiftDialog.vue'
import PaymentDetailsDialog from './dialogs/PaymentDetailsDialog.vue'
import ExpenseOperationDialog from './dialogs/ExpenseOperationDialog.vue'
import SupplierPaymentConfirmDialog from './dialogs/SupplierPaymentConfirmDialog.vue'
import ShiftExpensesList from './components/ShiftExpensesList.vue'
import PendingSupplierPaymentsList from './components/PendingSupplierPaymentsList.vue'
import ShiftTransfersList from './components/ShiftTransfersList.vue'

// ✅ Sprint 5: Props for read-only mode
interface Props {
  shiftId?: string // Optional: view specific shift instead of current
  readOnly?: boolean // If true, hide all action buttons
}

const props = withDefaults(defineProps<Props>(), {
  shiftId: undefined,
  readOnly: false
})

// ✅ Sprint 5: Emit close event (for dialog usage) - currently unused
// const emit = defineEmits<{
//   close: []
// }>()

const router = useRouter()
const shiftsStore = useShiftsStore()
const paymentsStore = usePosPaymentsStore()
const accountStore = useAccountStore()

// State
const search = ref('')
const showEndShiftDialog = ref(false)
const showPaymentDetailsDialog = ref(false)
const selectedPaymentId = ref<string | null>(null)

// Sprint 3: Expense operations state
const showExpenseDialog = ref(false)
const showConfirmPaymentDialog = ref(false)
const selectedPayment = ref<PendingPayment | null>(null)

// Computed
// ✅ Sprint 5: Support shiftId prop for viewing specific shift
const currentShift = computed(() => {
  if (props.shiftId) {
    return shiftsStore.shifts.find(s => s.id === props.shiftId) || null
  }
  return shiftsStore.currentShift
})
const previousShifts = computed(() =>
  shiftsStore.shifts.filter((s: PosShift) => s.status === 'completed').slice(0, 10)
)

// Get payments for current shift
const shiftPayments = computed(() => {
  if (!currentShift.value) return []
  return paymentsStore.getShiftPayments(currentShift.value.id)
})

// Calculate shift statistics
const shiftStats = computed(() => {
  const stats = {
    cash: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
    qr: { count: 0, amount: 0 },
    totalCount: 0,
    totalAmount: 0,
    cashReceived: 0,
    cashRefunded: 0
  }

  shiftPayments.value.forEach((p: PosPayment) => {
    // Include both completed payments and refunds
    if (p.status === 'completed' || p.status === 'refunded') {
      stats.totalCount++
      stats.totalAmount += p.amount

      // Update method-specific stats
      if (p.method === 'cash') {
        stats.cash.count++
        stats.cash.amount += p.amount

        // Cash tracking
        if (p.amount > 0) {
          stats.cashReceived += p.amount
        } else {
          stats.cashRefunded += Math.abs(p.amount)
        }
      } else if (p.method === 'card') {
        stats.card.count++
        stats.card.amount += p.amount
      } else if (p.method === 'qr') {
        stats.qr.count++
        stats.qr.amount += p.amount
      }
    }
  })

  return stats
})

// ✅ Sprint 4: Total expenses (all expenses of the shift)
const totalShiftExpenses = computed(() => {
  return (
    currentShift.value?.expenseOperations
      ?.filter(e => e.status === 'completed' || e.status === 'confirmed')
      .reduce((sum, e) => sum + e.amount, 0) || 0
  )
})

const expectedCash = computed(() => {
  const baseExpected =
    (currentShift.value?.startingCash || 0) +
    shiftStats.value.cashReceived -
    shiftStats.value.cashRefunded

  // ✅ Sprint 4: Subtract ALL expenses (direct + supplier payments)
  return baseExpected - totalShiftExpenses.value
})

// Sprint 3: Check if balance is negative
const hasNegativeBalance = computed(() => expectedCash.value < 0)

// Sprint 3: Get POS cash account (by ID from types.ts)
const cashAccount = computed(() => {
  return accountStore.accounts.find(acc => acc.id === POS_CASH_ACCOUNT_ID)
})

// Sprint 3: Pending payments requiring confirmation
const pendingPayments = computed(() => {
  if (!currentShift.value || !cashAccount.value) return []

  return accountStore.pendingPayments.filter(
    p =>
      p.requiresCashierConfirmation === true &&
      p.confirmationStatus === 'pending' &&
      p.assignedToAccount === cashAccount.value?.id
  )
})

// Sprint 3: Shift expenses
const shiftExpenses = computed(() => {
  if (!currentShift.value) return []

  // ✅ Sprint 4: All expense operations (direct + supplier payments)
  const expenses = currentShift.value.expenseOperations || []

  // Sort by date (newest first)
  return [...expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

// Sprint 3: Incoming transfers to cash register
const incomingTransfers = computed(() => {
  if (!currentShift.value || !cashAccount.value) return []

  // Get all transactions for cash account
  const cashTransactions = accountStore.getAccountTransactions(cashAccount.value.id)

  // Filter for incoming transfers during this shift
  return cashTransactions.filter(
    t =>
      t.type === 'transfer' &&
      t.transferDetails?.toAccountId === cashAccount.value?.id &&
      new Date(t.createdAt) >= new Date(currentShift.value?.startTime || '')
  )
})

// Table headers
const paymentHeaders = [
  { title: 'Payment #', key: 'paymentNumber', sortable: true },
  { title: 'Time', key: 'processedAt', sortable: true },
  { title: 'Method', key: 'method' },
  { title: 'Amount', key: 'amount', sortable: true },
  { title: 'Status', key: 'status' }
]

// Methods
const handleBack = () => {
  router.push('/pos')
}

const handleEndShift = () => {
  showEndShiftDialog.value = true
}

const handleShiftEnded = () => {
  // Navigate back to POS after shift ends
  router.push('/pos')
}

const handlePaymentClick = (_event: MouseEvent, { item }: { item: PosPayment }) => {
  selectedPaymentId.value = item.id
  showPaymentDetailsDialog.value = true
}

const handlePrintReceipt = async (paymentId: string) => {
  try {
    await paymentsStore.printReceipt(paymentId)
    console.log('✅ Receipt printed:', paymentId)
    // TODO: Show success notification
  } catch (error) {
    console.error('❌ Failed to print receipt:', error)
    // TODO: Show error notification
  }
}

const handleRefundCreated = async () => {
  console.log('✅ Refund created successfully')
  // Dialog already closed by PaymentDetailsDialog

  // Force reactivity update by triggering computed recalculation
  // The payments array is already updated in paymentsStore,
  // so shiftPayments computed will automatically recalculate

  // TODO: Show success notification
  // TODO: Add toast notification here
}

const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('id-ID')
}

const formatTime = (date: string): string => {
  return new Date(date).toLocaleTimeString('id-ID')
}

const calculateDuration = (startTime: string): string => {
  const start = new Date(startTime)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

const getPaymentStatusColor = (status: string): string => {
  const colors = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    refunded: 'grey'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

// Sprint 3: Expense operations methods
const handleAddExpense = () => {
  showExpenseDialog.value = true
}

const handleExpenseCreated = async (expenseId: string) => {
  console.log('✅ Expense created:', expenseId)
  // Reload pending payments
  if (currentShift.value) {
    await shiftsStore.loadPendingPayments()
  }
}

const handleConfirmPaymentClick = (payment: PendingPayment) => {
  selectedPayment.value = payment
  showConfirmPaymentDialog.value = true
}

const handleRejectPaymentClick = (payment: PendingPayment) => {
  selectedPayment.value = payment
  showConfirmPaymentDialog.value = true
}

const handlePaymentConfirmed = async (paymentId: string) => {
  console.log('✅ Payment confirmed:', paymentId)
  selectedPayment.value = null
  // Reload pending payments
  if (currentShift.value) {
    await shiftsStore.loadPendingPayments()
  }
}

const handlePaymentRejected = async (paymentId: string) => {
  console.log('❌ Payment rejected:', paymentId)
  selectedPayment.value = null
  // Reload pending payments
  if (currentShift.value) {
    await shiftsStore.loadPendingPayments()
  }
}

// Sprint 3: Lifecycle hooks
onMounted(async () => {
  if (currentShift.value) {
    // Load pending payments on mount
    await shiftsStore.loadPendingPayments()

    // Start expense operations sync (polling every 30 sec)
    // TODO: Replace with WebSocket/Firebase Realtime/SSE
    const syncCallback = async () => {
      await shiftsStore.loadPendingPayments()
    }

    // Access the service through the store
    // Note: We need to expose the service's startExpenseOperationsSync method
    // For now, we'll handle polling in the component
    // TODO: Move this to store initialization
  }
})

onUnmounted(() => {
  // Stop sync when component unmounts
  // TODO: Implement stopExpenseOperationsSync in store
})
</script>

<style scoped>
.shift-management-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

.shift-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.shift-header h1 {
  flex: 1;
  font-size: 24px;
  font-weight: 600;
}

.summary-grid,
.balance-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-item,
.balance-item {
  padding: 12px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 8px;
}

.balance-item.highlight {
  background: rgba(var(--v-theme-primary), 0.1);
  border: 2px solid rgb(var(--v-theme-primary));
}

.label {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 4px;
}

.value {
  font-size: 20px;
  font-weight: 600;
}

.value.positive {
  color: rgb(var(--v-theme-success));
}

.value.negative {
  color: rgb(var(--v-theme-error));
}

.total-row {
  background: rgba(var(--v-theme-primary), 0.05);
  font-weight: 600;
}

.previous-shift-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.previous-shift-item:last-child {
  border-bottom: none;
}

.shift-total {
  font-size: 16px;
  font-weight: 600;
}
</style>
