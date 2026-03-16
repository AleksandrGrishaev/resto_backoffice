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
        <v-btn icon variant="text" :loading="refreshing" @click="handleRefreshAll">
          <v-icon>mdi-refresh</v-icon>
          <v-tooltip activator="parent" location="bottom">Refresh shift data</v-tooltip>
        </v-btn>
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

    <!-- No Active Shift Message with Start Button -->
    <v-alert v-if="!currentShift" type="warning" variant="tonal" class="mb-4">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon start>mdi-alert</v-icon>
          <div>
            <div class="font-weight-bold">No Active Shift</div>
            <div class="text-caption">Start a shift to view management details</div>
          </div>
        </div>
        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-play-circle"
          @click="handleStartShift"
        >
          Start Shift
        </v-btn>
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

            <!-- ✅ Sprint 10: Confirmed Incoming Transfers -->
            <div v-if="totalConfirmedTransfers > 0" class="balance-item">
              <div class="label">Incoming Transfers</div>
              <div class="value positive">+ {{ formatPrice(totalConfirmedTransfers) }}</div>
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
              <!-- Dynamic payment methods rows -->
              <tr v-for="(method, code) in shiftStats.methods" :key="code">
                <td>
                  <v-icon size="20" class="mr-2">{{ method.icon }}</v-icon>
                  {{ method.name }}
                </td>
                <td>{{ method.count }}</td>
                <td>{{ formatPrice(method.amount) }}</td>
              </tr>
              <!-- Total row -->
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
          <ShiftExpensesList
            :expenses="shiftExpenses"
            :read-only="readOnly"
            @edit-expense="handleEditExpenseClick"
            @cancel-expense="handleCancelExpenseClick"
          />
        </div>
      </div>

      <!-- Sprint 10: Incoming Transfers with confirmation -->
      <div v-if="incomingTransfers.length > 0" class="mt-4">
        <ShiftTransfersList
          :transfers="incomingTransfers"
          :cash-account-id="cashAccount?.id || ''"
          :read-only="readOnly"
          @confirm-transfer="handleConfirmTransferClick"
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
    </template>

    <!-- ✅ Sprint 8: Pending Confirmations (shown even without active shift) -->
    <div v-if="pendingPayments.length > 0 && !readOnly" class="mt-4">
      <PendingSupplierPaymentsList
        :pending-payments="pendingPayments"
        :has-active-shift="!!currentShift"
        :loading="loading"
        @confirm-payment="handleConfirmPaymentClick"
        @reject-payment="handleRejectPaymentClick"
        @refresh="refreshPendingPayments"
      />
    </div>

    <!-- ✅ NEW: Start Shift Dialog -->
    <StartShiftDialog v-model="showStartShiftDialog" @shift-started="handleShiftStarted" />

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

    <!-- Sprint 10: Transfer Confirm Dialog -->
    <TransferConfirmDialog
      v-if="currentShift"
      v-model="showTransferConfirmDialog"
      :transfer="selectedTransfer"
      :shift-id="currentShift.id"
      @transfer-confirmed="handleTransferConfirmed"
      @transfer-rejected="handleTransferRejected"
    />

    <!-- Cancel Expense Dialog -->
    <CancelExpenseDialog
      v-if="currentShift"
      v-model="showCancelExpenseDialog"
      :expense="selectedExpense"
      :shift-id="currentShift.id"
      @expense-cancelled="handleExpenseCancelled"
    />

    <!-- Edit Expense Dialog -->
    <EditExpenseDialog
      v-if="currentShift"
      v-model="showEditExpenseDialog"
      :expense="selectedExpense"
      :shift-id="currentShift.id"
      @expense-edited="handleExpenseEdited"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useShiftsStore } from '@/stores/pos/shifts/shiftsStore'
import { usePosPaymentsStore } from '@/stores/pos/payments/paymentsStore'
import { useAccountStore } from '@/stores/account'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import type { PosShift, PosPayment } from '@/stores/pos/types'
import type { PendingPayment } from '@/stores/account/types'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'
import StartShiftDialog from './dialogs/StartShiftDialog.vue'
import EndShiftDialog from './dialogs/EndShiftDialog.vue'
import PaymentDetailsDialog from './dialogs/PaymentDetailsDialog.vue'
import ExpenseOperationDialog from './dialogs/ExpenseOperationDialog.vue'
import SupplierPaymentConfirmDialog from './dialogs/SupplierPaymentConfirmDialog.vue'
import TransferConfirmDialog from './dialogs/TransferConfirmDialog.vue'
import CancelExpenseDialog from './dialogs/CancelExpenseDialog.vue'
import EditExpenseDialog from './dialogs/EditExpenseDialog.vue'
import ShiftExpensesList from './components/ShiftExpensesList.vue'
import PendingSupplierPaymentsList from './components/PendingSupplierPaymentsList.vue'
import ShiftTransfersList from './components/ShiftTransfersList.vue'
import type { Transaction } from '@/stores/account/types'

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
const paymentSettingsStore = usePaymentSettingsStore()

// State
const search = ref('')
const showStartShiftDialog = ref(false) // ✅ NEW: Start Shift dialog
const showEndShiftDialog = ref(false)
const showPaymentDetailsDialog = ref(false)
const selectedPaymentId = ref<string | null>(null)
const loading = ref(false) // ✅ Sprint 8: Loading state for pending payments refresh
const refreshing = ref(false)

// Sprint 3: Expense operations state
const showExpenseDialog = ref(false)
const showConfirmPaymentDialog = ref(false)
const selectedPayment = ref<PendingPayment | null>(null)

// Sprint 10: Transfer confirmation state
const showTransferConfirmDialog = ref(false)
const selectedTransfer = ref<Transaction | null>(null)

// Expense edit/cancel state
const showCancelExpenseDialog = ref(false)
const showEditExpenseDialog = ref(false)
const selectedExpense = ref<ShiftExpenseOperation | null>(null)

// Computed
// ✅ Sprint 5: Support shiftId prop for viewing specific shift
const currentShift = computed(() => {
  if (props.shiftId) {
    return shiftsStore.shifts.find(s => s.id === props.shiftId) || null
  }
  return shiftsStore.currentShift
})

// Get payments for current shift
const shiftPayments = computed(() => {
  if (!currentShift.value) return []
  return paymentsStore.getShiftPayments(currentShift.value.id)
})

// Calculate shift statistics (dynamic payment methods)
const shiftStats = computed(() => {
  const stats = {
    methods: {} as Record<string, { count: number; amount: number; name: string; icon: string }>,
    totalCount: 0,
    totalAmount: 0,
    cashReceived: 0,
    cashRefunded: 0
  }

  // ✅ Fix: For historical shifts (read-only mode), use saved paymentMethods from shift
  // This fixes the issue where payment methods showed 0 in backoffice shift history
  if (props.readOnly && currentShift.value?.paymentMethods?.length) {
    const shift = currentShift.value

    for (const pm of shift.paymentMethods) {
      stats.totalCount += pm.count
      stats.totalAmount += pm.amount

      // Store method-specific stats dynamically
      stats.methods[pm.methodType] = {
        count: pm.count,
        amount: pm.amount,
        name: pm.methodName,
        icon: getPaymentMethodIcon(pm.methodType)
      }

      // Track cash received for expected cash calculation
      if (pm.methodType === 'cash') {
        stats.cashReceived = pm.amount
      }
    }

    // Calculate refunds from corrections
    const refunds = shift.corrections?.filter(c => c.type === 'refund') || []
    stats.cashRefunded = refunds.reduce((sum, c) => sum + c.amount, 0)

    return stats
  }

  // For active shifts, calculate from payments store
  shiftPayments.value.forEach((p: PosPayment) => {
    // Include both completed payments and refunds
    if (p.status === 'completed' || p.status === 'refunded') {
      stats.totalCount++
      stats.totalAmount += p.amount

      // Initialize method stats if not exists
      if (!stats.methods[p.method]) {
        const methodInfo = paymentSettingsStore.activePaymentMethods.find(m => m.code === p.method)
        stats.methods[p.method] = {
          count: 0,
          amount: 0,
          name: methodInfo?.name || p.method,
          icon: methodInfo?.icon || getPaymentMethodIcon(p.method)
        }
      }

      // Update method-specific stats
      stats.methods[p.method].count++
      stats.methods[p.method].amount += p.amount

      // Cash tracking (for expected cash calculation)
      if (p.method === 'cash') {
        if (p.amount > 0) {
          stats.cashReceived += p.amount
        } else {
          stats.cashRefunded += Math.abs(p.amount)
        }
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

// ✅ Sprint 10: Total confirmed incoming transfers
const totalConfirmedTransfers = computed(() => {
  return (
    currentShift.value?.transferOperations
      ?.filter(t => t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0) || 0
  )
})

const expectedCash = computed(() => {
  const baseExpected =
    (currentShift.value?.startingCash || 0) +
    shiftStats.value.cashReceived -
    shiftStats.value.cashRefunded

  // ✅ Sprint 4: Subtract ALL expenses (direct + supplier payments)
  // ✅ Sprint 10: Add confirmed incoming transfers
  return baseExpected + totalConfirmedTransfers.value - totalShiftExpenses.value
})

// Sprint 3: Check if balance is negative
const hasNegativeBalance = computed(() => expectedCash.value < 0)

// Sprint 3 FIX: Get POS cash account from PaymentMethod settings
// Uses isPosСashRegister flag from payment_methods table - works with any UUID
const cashAccount = computed(() => {
  // Primary: Use PaymentMethod with isPosСashRegister = true
  const posCashAccountId = paymentSettingsStore.posCashAccountId
  if (posCashAccountId) {
    return accountStore.accounts.find(acc => acc.id === posCashAccountId)
  }
  // Fallback: Find account by type 'cash' (if PaymentMethod not configured)
  return accountStore.accounts.find(acc => acc.type === 'cash')
})

// Sprint 3: Pending payments requiring confirmation
// ✅ Sprint 8: Show pending payments even without active shift
const pendingPayments = computed(() => {
  if (!cashAccount.value) return []

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

// ✅ NEW: Handle Start Shift button click
const handleStartShift = () => {
  showStartShiftDialog.value = true
}

// ✅ NEW: Handle shift started event
const handleShiftStarted = () => {
  showStartShiftDialog.value = false
  // Shift is now active, view will update automatically via computed currentShift
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

const getPaymentMethodIcon = (methodCode: string): string => {
  // Try to get icon from payment settings first
  const method = paymentSettingsStore.activePaymentMethods.find(m => m.code === methodCode)
  if (method?.icon) return method.icon

  // Fallback to default icons
  const iconMap: Record<string, string> = {
    cash: 'mdi-cash',
    card: 'mdi-credit-card',
    qr: 'mdi-qrcode',
    bni: 'mdi-bank',
    gojek: 'mdi-motorbike',
    grab: 'mdi-car'
  }
  return iconMap[methodCode] || 'mdi-wallet'
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

// Expense edit/cancel handlers
const handleEditExpenseClick = (expense: ShiftExpenseOperation) => {
  selectedExpense.value = expense
  showEditExpenseDialog.value = true
}

const handleCancelExpenseClick = (expense: ShiftExpenseOperation) => {
  selectedExpense.value = expense
  showCancelExpenseDialog.value = true
}

const handleExpenseEdited = () => {
  console.log('✅ Expense edited')
  selectedExpense.value = null
}

const handleExpenseCancelled = () => {
  console.log('✅ Expense cancelled')
  selectedExpense.value = null
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

// Sprint 10: Transfer confirmation handlers
const handleConfirmTransferClick = (transfer: Transaction) => {
  selectedTransfer.value = transfer
  showTransferConfirmDialog.value = true
}

const handleTransferConfirmed = async (transactionId: string) => {
  console.log('✅ Transfer confirmed:', transactionId)
  selectedTransfer.value = null
}

const handleTransferRejected = async (transactionId: string) => {
  console.log('❌ Transfer rejected:', transactionId)
  selectedTransfer.value = null
}

const handleRefreshAll = async () => {
  refreshing.value = true
  try {
    // Reset paymentsStore initialized flag to force re-fetch
    paymentsStore.initialized = false

    await Promise.all([
      shiftsStore.loadShifts(),
      paymentsStore.initialize().catch(() => {}),
      shiftsStore.loadPendingPayments().catch(() => {}),
      // Force-refresh account payments (bypass 2-min cache)
      accountStore.fetchPayments(true).catch(() => {}),
      // Force-refresh cash account transactions
      cashAccount.value
        ? accountStore.fetchTransactions(cashAccount.value.id).catch(() => {})
        : Promise.resolve()
    ])
    console.log('✅ Shift data refreshed (full cache bypass)')
  } catch (error) {
    console.error('❌ Failed to refresh shift data:', error)
  } finally {
    refreshing.value = false
  }
}

// ✅ Sprint 8: Refresh pending payments manually
const refreshPendingPayments = async () => {
  loading.value = true
  try {
    await shiftsStore.loadPendingPayments()
    console.log('✅ Pending payments refreshed')
  } catch (error) {
    console.error('❌ Failed to refresh pending payments:', error)
  } finally {
    loading.value = false
  }
}

// Sprint 3: Lifecycle hooks
onMounted(async () => {
  // ✅ Ensure paymentsStore is initialized (for Shift History view from Backoffice)
  if (!paymentsStore.initialized) {
    console.log('📦 [ShiftManagementView] Initializing paymentsStore...')
    await paymentsStore.initialize()
    console.log('✅ [ShiftManagementView] PaymentsStore initialized')
  }

  // ✅ Initialize payment settings to get POS cash account ID
  if (paymentSettingsStore.paymentMethods.length === 0) {
    console.log('📦 [ShiftManagementView] Initializing paymentSettingsStore...')
    await paymentSettingsStore.initialize()
    console.log('✅ [ShiftManagementView] PaymentSettingsStore initialized')
  }

  // ✅ Sprint 8: Load pending payments ALWAYS (even without active shift)
  await shiftsStore.loadPendingPayments()

  // ✅ FIX: Force-refresh cash account transactions on mount
  // Without this, transfers created from backoffice are invisible
  // because POS uses stale in-memory cache
  if (cashAccount.value) {
    try {
      await accountStore.fetchTransactions(cashAccount.value.id)
      console.log('✅ [ShiftManagementView] Cash account transactions refreshed')
    } catch (err) {
      console.warn('⚠️ [ShiftManagementView] Failed to refresh cash transactions:', err)
    }
  }

  if (currentShift.value) {
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
</style>
