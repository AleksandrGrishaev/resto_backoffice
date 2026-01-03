<script setup lang="ts">
// src/views/backoffice/accounts/payments/PaymentsView.vue
// Sprint 5: Backoffice Payments Management View (Complete)

import { ref, onMounted, computed } from 'vue'
import { useExpenseLinking } from '@/stores/pos/shifts/composables/useExpenseLinking'
import { useShiftsStore } from '@/stores/pos/shifts'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import PendingPaymentsList from './components/PendingPaymentsList.vue'
import UnlinkedExpensesList from './components/UnlinkedExpensesList.vue'
import PaymentHistoryList from './components/PaymentHistoryList.vue'
import LinkExpenseDialog from './dialogs/LinkExpenseDialog.vue'
import ConfirmPaymentDialog from './dialogs/ConfirmPaymentDialog.vue'
import ExpenseDetailsDialog from './dialogs/ExpenseDetailsDialog.vue'
import BatchPaymentDialog from './dialogs/BatchPaymentDialog.vue'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'
import type { PendingPayment } from '@/stores/account/types'
import type { InvoiceSuggestion } from '@/stores/pos/shifts/composables/useExpenseLinking'
import type { LinkAllocation } from './dialogs/LinkExpenseDialog.vue'

// =============================================
// STORES & COMPOSABLES
// =============================================

const accountStore = useAccountStore()
const authStore = useAuthStore()
const {
  unlinkedExpenses,
  linkedExpenses,
  totalUnlinkedAmount,
  isLoading,
  error,
  getInvoiceSuggestions,
  linkExpenseToInvoice,
  linkExpenseToMultipleInvoices,
  clearError
} = useExpenseLinking()

// =============================================
// STATE
// =============================================

const activeTab = ref('pending')
const selectedExpense = ref<ShiftExpenseOperation | null>(null)
const selectedPayment = ref<PendingPayment | null>(null)
const showLinkDialog = ref(false)
const showConfirmPaymentDialog = ref(false)
const showExpenseDetailsDialog = ref(false)
const showBatchPaymentDialog = ref(false)
const invoiceSuggestions = ref<InvoiceSuggestion[]>([])
const expenseAvailableAmount = ref(0) // Amount available for linking (expense.amount - alreadyLinkedAmount)
const selectedExpensePayment = ref<PendingPayment | null>(null) // Payment for expense details dialog
const batchPaymentsList = ref<PendingPayment[]>([]) // Payments selected for batch payment

// =============================================
// COMPUTED
// =============================================

const currentUser = computed(() => ({
  id: authStore.user?.id || 'unknown',
  name: authStore.user?.name || authStore.user?.email || 'Manager'
}))

// Pending payments (status === 'pending') - for Pending tab
const pendingPayments = computed(() => {
  return accountStore.pendingPayments || []
})

// All payments (for looking up usedAmount) - for calculating available amounts
const allPaymentsForLookup = computed(() => {
  return accountStore.allPayments || []
})

const paymentHistory = computed(() => {
  // Get linked expenses as payment history
  return linkedExpenses.value
})

const tabStats = computed(() => ({
  pending: pendingPayments.value.length,
  unlinked: unlinkedExpenses.value.length,
  history: paymentHistory.value.length
}))

// Calculate actual available amount for unlinked expenses (considering partial links)
const actualUnlinkedAmount = computed(() => {
  return unlinkedExpenses.value.reduce((sum, exp) => {
    if (!exp.relatedPaymentId) {
      return sum + exp.amount
    }
    // Use allPaymentsForLookup (not pendingPayments) because expense payments are 'completed'
    const payment = allPaymentsForLookup.value.find(p => p.id === exp.relatedPaymentId)
    if (!payment) {
      return sum + exp.amount
    }
    return sum + (payment.amount - (payment.usedAmount || 0))
  }, 0)
})

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  // Load shifts for expense linking (needed in backoffice to show unlinked expenses)
  const shiftsStore = useShiftsStore()
  await shiftsStore.loadShifts()

  // Load pending payments if needed
  if (accountStore.pendingPayments.length === 0) {
    await accountStore.fetchPayments()
  }
})

// =============================================
// LINK EXPENSE METHODS
// =============================================

async function handleLinkExpense(expense: ShiftExpenseOperation) {
  selectedExpense.value = expense

  // Calculate available amount for linking
  // If expense has relatedPaymentId, check the payment's usedAmount
  if (expense.relatedPaymentId) {
    // Use allPayments (not pendingPayments) because expense payments are 'completed'
    const payment = allPaymentsForLookup.value.find(p => p.id === expense.relatedPaymentId)
    if (payment) {
      expenseAvailableAmount.value = payment.amount - (payment.usedAmount || 0)
    } else {
      expenseAvailableAmount.value = expense.amount
    }
  } else {
    // Old expenses without relatedPaymentId - use full amount
    expenseAvailableAmount.value = expense.amount
  }

  // Get invoice suggestions for this expense
  invoiceSuggestions.value = await getInvoiceSuggestions(expense)

  showLinkDialog.value = true
}

async function handleConfirmLink(invoice: InvoiceSuggestion, amount: number) {
  if (!selectedExpense.value) return

  const result = await linkExpenseToInvoice(
    selectedExpense.value,
    invoice,
    amount,
    currentUser.value
  )

  if (result.success) {
    showLinkDialog.value = false
    selectedExpense.value = null
    invoiceSuggestions.value = []
  }
}

async function handleConfirmMultipleLinks(links: LinkAllocation[]) {
  if (!selectedExpense.value) return

  const result = await linkExpenseToMultipleInvoices(
    selectedExpense.value,
    links,
    currentUser.value
  )

  if (result.success) {
    showLinkDialog.value = false
    selectedExpense.value = null
    invoiceSuggestions.value = []
  }
}

function handleCancelLink() {
  showLinkDialog.value = false
  selectedExpense.value = null
  invoiceSuggestions.value = []
}

// =============================================
// VIEW EXPENSE DETAILS
// =============================================

function handleViewExpenseDetails(expense: ShiftExpenseOperation) {
  selectedExpense.value = expense

  // Find the related payment to show linked orders
  if (expense.relatedPaymentId) {
    selectedExpensePayment.value =
      allPaymentsForLookup.value.find(p => p.id === expense.relatedPaymentId) || null
  } else {
    selectedExpensePayment.value = null
  }

  showExpenseDetailsDialog.value = true
}

// =============================================
// PENDING PAYMENTS METHODS
// =============================================

function handleConfirmPayment(payment: PendingPayment) {
  selectedPayment.value = payment
  showConfirmPaymentDialog.value = true
}

async function handleConfirmPaymentSubmit(
  payment: PendingPayment,
  accountId: string,
  actualAmount: number
) {
  try {
    // ✅ Step 1: Check if target account is cash account
    const targetAccount = accountStore.accounts.find(a => a.id === accountId)
    const isCashAccount = targetAccount?.type === 'cash'

    // ✅ Step 2: Always assign payment to account first
    // This sets requiresCashierConfirmation=true for cash accounts
    await accountStore.assignPaymentToAccount(payment.id, accountId)

    // ✅ Step 3: For cash accounts, STOP here (payment awaits cashier confirmation)
    if (isCashAccount) {
      console.log('✅ Payment assigned to cash account, awaiting cashier confirmation')
      showConfirmPaymentDialog.value = false
      selectedPayment.value = null
      // Payment is created with status='pending', cashier will process it from POS
      return
    }

    // ✅ Step 4: For non-cash accounts (bank, card), process payment immediately
    await accountStore.processPayment({
      paymentId: payment.id,
      accountId,
      actualAmount,
      performedBy: currentUser.value
    })

    showConfirmPaymentDialog.value = false
    selectedPayment.value = null
  } catch (err: any) {
    console.error('Failed to confirm payment:', err)
    // Error is already handled by accountStore (sets error state)
    // Dialog will remain open, showing the error from accountStore
  }
}

function handleCancelConfirmPayment() {
  showConfirmPaymentDialog.value = false
  selectedPayment.value = null
}

async function handleRejectPayment(payment: PendingPayment) {
  try {
    // Cancel the pending payment
    await accountStore.cancelPayment(payment.id)

    // Force refresh the payment list (bypass cache)
    await accountStore.fetchPayments(true)

    // Update bill status for linked orders (if any)
    if (payment.linkedOrders && payment.linkedOrders.length > 0) {
      try {
        const { usePurchaseOrders } = await import(
          '@/stores/supplier_2/composables/usePurchaseOrders'
        )
        const { updateMultipleOrderBillStatuses } = usePurchaseOrders()

        const orderIds = payment.linkedOrders
          .filter(link => link.isActive)
          .map(link => link.orderId)

        if (orderIds.length > 0) {
          await updateMultipleOrderBillStatuses(orderIds)
        }
      } catch (error) {
        console.error('Failed to update order bill statuses:', error)
        // Non-critical error, continue
      }
    }
  } catch (err) {
    console.error('Failed to cancel payment:', err)
  }
}

function handleViewPayment(payment: PendingPayment) {
  // Open confirm dialog in view mode (or navigate to details)
  selectedPayment.value = payment
  showConfirmPaymentDialog.value = true
}

// =============================================
// ERROR HANDLING
// =============================================

function handleDismissError() {
  clearError()
}

// =============================================
// BATCH PAYMENT METHODS
// =============================================

function handleBatchPay(payments: PendingPayment[]) {
  batchPaymentsList.value = payments
  showBatchPaymentDialog.value = true
}

async function handleBatchPaymentSuccess() {
  showBatchPaymentDialog.value = false
  batchPaymentsList.value = []
  // Refresh payments list
  await accountStore.fetchPayments(true)
}

function handleCancelBatchPayment() {
  showBatchPaymentDialog.value = false
  batchPaymentsList.value = []
}
</script>

<template>
  <v-container fluid class="payments-view pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Payments Management</h1>
      <v-spacer />

      <!-- Unlinked Amount Badge -->
      <v-chip v-if="actualUnlinkedAmount > 0" color="warning" variant="flat" class="mr-2">
        <v-icon start size="small">mdi-alert</v-icon>
        Unlinked:
        {{ actualUnlinkedAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) }}
      </v-chip>
    </div>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="handleDismissError"
    >
      {{ error }}
    </v-alert>

    <!-- Tabs -->
    <v-card>
      <v-tabs v-model="activeTab" bg-color="primary">
        <v-tab value="pending">
          <v-icon start>mdi-clock-outline</v-icon>
          Pending
          <v-badge
            v-if="tabStats.pending > 0"
            :content="tabStats.pending"
            color="warning"
            class="ml-2"
          />
        </v-tab>
        <v-tab value="unlinked">
          <v-icon start>mdi-link-variant-off</v-icon>
          Unlinked
          <v-badge
            v-if="tabStats.unlinked > 0"
            :content="tabStats.unlinked"
            color="error"
            class="ml-2"
          />
        </v-tab>
        <v-tab value="history">
          <v-icon start>mdi-history</v-icon>
          History
          <v-badge
            v-if="tabStats.history > 0"
            :content="tabStats.history"
            color="success"
            class="ml-2"
          />
        </v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- Pending Payments Tab -->
        <v-window-item value="pending">
          <PendingPaymentsList
            :payments="pendingPayments"
            :loading="isLoading"
            @confirm="handleConfirmPayment"
            @reject="handleRejectPayment"
            @view="handleViewPayment"
            @batch-pay="handleBatchPay"
          />
        </v-window-item>

        <!-- Unlinked Expenses Tab -->
        <v-window-item value="unlinked">
          <UnlinkedExpensesList
            :expenses="unlinkedExpenses"
            :payments="allPaymentsForLookup"
            :loading="isLoading"
            @link="handleLinkExpense"
          />
        </v-window-item>

        <!-- Payment History Tab -->
        <v-window-item value="history">
          <PaymentHistoryList
            :expenses="paymentHistory"
            :loading="isLoading"
            @view="handleViewExpenseDetails"
          />
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Link Expense Dialog -->
    <LinkExpenseDialog
      v-model="showLinkDialog"
      :expense="selectedExpense"
      :suggestions="invoiceSuggestions"
      :available-amount="expenseAvailableAmount"
      :loading="isLoading"
      @confirm="handleConfirmLink"
      @confirm-multiple="handleConfirmMultipleLinks"
      @cancel="handleCancelLink"
    />

    <!-- Confirm Payment Dialog -->
    <ConfirmPaymentDialog
      v-model="showConfirmPaymentDialog"
      :payment="selectedPayment"
      :loading="isLoading"
      @confirm="handleConfirmPaymentSubmit"
      @cancel="handleCancelConfirmPayment"
    />

    <!-- Expense Details Dialog -->
    <ExpenseDetailsDialog
      v-model="showExpenseDetailsDialog"
      :expense="selectedExpense"
      :payment="selectedExpensePayment"
    />

    <!-- Batch Payment Dialog -->
    <BatchPaymentDialog
      v-model="showBatchPaymentDialog"
      :payments="batchPaymentsList"
      :loading="isLoading"
      @success="handleBatchPaymentSuccess"
      @cancel="handleCancelBatchPayment"
    />
  </v-container>
</template>

<style scoped lang="scss">
.payments-view {
  min-height: 100vh;
  // ✅ Changed to default black background (removed surface-variant)
}
</style>
