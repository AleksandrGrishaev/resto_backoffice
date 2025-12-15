<script setup lang="ts">
// src/views/backoffice/accounts/payments/PaymentsView.vue
// Sprint 5: Backoffice Payments Management View (Complete)

import { ref, onMounted, computed } from 'vue'
import { useExpenseLinking } from '@/stores/pos/shifts/composables/useExpenseLinking'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import PendingPaymentsList from './components/PendingPaymentsList.vue'
import UnlinkedExpensesList from './components/UnlinkedExpensesList.vue'
import PaymentHistoryList from './components/PaymentHistoryList.vue'
import LinkExpenseDialog from './dialogs/LinkExpenseDialog.vue'
import UnlinkExpenseDialog from './dialogs/UnlinkExpenseDialog.vue'
import ConfirmPaymentDialog from './dialogs/ConfirmPaymentDialog.vue'
import type { ShiftExpenseOperation } from '@/stores/pos/shifts/types'
import type { PendingPayment } from '@/stores/account/types'
import type { InvoiceSuggestion } from '@/stores/pos/shifts/composables/useExpenseLinking'

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
  unlinkExpenseFromInvoice,
  clearError
} = useExpenseLinking()

// =============================================
// STATE
// =============================================

const activeTab = ref('unlinked')
const selectedExpense = ref<ShiftExpenseOperation | null>(null)
const selectedPayment = ref<PendingPayment | null>(null)
const showLinkDialog = ref(false)
const showUnlinkDialog = ref(false)
const showConfirmPaymentDialog = ref(false)
const invoiceSuggestions = ref<InvoiceSuggestion[]>([])

// =============================================
// COMPUTED
// =============================================

const currentUser = computed(() => ({
  id: authStore.user?.id || 'unknown',
  name: authStore.user?.name || authStore.user?.email || 'Manager'
}))

const pendingPayments = computed(() => {
  // Get pending payments from account store
  return accountStore.pendingPayments || []
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

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
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

function handleCancelLink() {
  showLinkDialog.value = false
  selectedExpense.value = null
  invoiceSuggestions.value = []
}

// =============================================
// UNLINK EXPENSE METHODS
// =============================================

function handleUnlinkExpense(expense: ShiftExpenseOperation) {
  selectedExpense.value = expense
  showUnlinkDialog.value = true
}

async function handleConfirmUnlink(reason: string) {
  if (!selectedExpense.value) return

  const result = await unlinkExpenseFromInvoice(selectedExpense.value, reason, currentUser.value)

  if (result.success) {
    showUnlinkDialog.value = false
    selectedExpense.value = null
  }
}

function handleCancelUnlink() {
  showUnlinkDialog.value = false
  selectedExpense.value = null
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
    // Process payment using existing accountStore method
    await accountStore.processPayment({
      paymentId: payment.id,
      accountId,
      actualAmount,
      performedBy: currentUser.value
    })

    showConfirmPaymentDialog.value = false
    selectedPayment.value = null
  } catch (err) {
    console.error('Failed to confirm payment:', err)
  }
}

function handleCancelConfirmPayment() {
  showConfirmPaymentDialog.value = false
  selectedPayment.value = null
}

function handleRejectPayment(payment: PendingPayment) {
  // TODO: Implement payment rejection with reason dialog
  console.log('Reject payment:', payment)
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
</script>

<template>
  <v-container fluid class="payments-view pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Payments Management</h1>
      <v-spacer />

      <!-- Unlinked Amount Badge -->
      <v-chip v-if="totalUnlinkedAmount > 0" color="warning" variant="flat" class="mr-2">
        <v-icon start size="small">mdi-alert</v-icon>
        Unlinked:
        {{ totalUnlinkedAmount.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) }}
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
          />
        </v-window-item>

        <!-- Unlinked Expenses Tab -->
        <v-window-item value="unlinked">
          <UnlinkedExpensesList
            :expenses="unlinkedExpenses"
            :loading="isLoading"
            @link="handleLinkExpense"
          />
        </v-window-item>

        <!-- Payment History Tab -->
        <v-window-item value="history">
          <PaymentHistoryList
            :expenses="paymentHistory"
            :loading="isLoading"
            @unlink="handleUnlinkExpense"
          />
        </v-window-item>
      </v-window>
    </v-card>

    <!-- Link Expense Dialog -->
    <LinkExpenseDialog
      v-model="showLinkDialog"
      :expense="selectedExpense"
      :suggestions="invoiceSuggestions"
      :loading="isLoading"
      @confirm="handleConfirmLink"
      @cancel="handleCancelLink"
    />

    <!-- Unlink Expense Dialog -->
    <UnlinkExpenseDialog
      v-model="showUnlinkDialog"
      :expense="selectedExpense"
      :loading="isLoading"
      @confirm="handleConfirmUnlink"
      @cancel="handleCancelUnlink"
    />

    <!-- Confirm Payment Dialog -->
    <ConfirmPaymentDialog
      v-model="showConfirmPaymentDialog"
      :payment="selectedPayment"
      :loading="isLoading"
      @confirm="handleConfirmPaymentSubmit"
      @cancel="handleCancelConfirmPayment"
    />
  </v-container>
</template>

<style scoped lang="scss">
.payments-view {
  min-height: 100vh;
  background: rgb(var(--v-theme-surface-variant));
}
</style>
