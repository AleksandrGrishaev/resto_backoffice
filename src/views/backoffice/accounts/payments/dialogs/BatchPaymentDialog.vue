<script setup lang="ts">
// src/views/backoffice/accounts/payments/dialogs/BatchPaymentDialog.vue
// Sprint 7: Batch Payment Dialog - Pay multiple pending payments with sequential allocation

import { ref, computed, watch } from 'vue'
import type { PendingPayment } from '@/stores/account/types'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  modelValue: boolean
  payments: PendingPayment[]
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  payments: () => []
})

const emit = defineEmits<Emits>()

const accountStore = useAccountStore()
const authStore = useAuthStore()

// =============================================
// STATE
// =============================================

const selectedAccountId = ref<string>('')
const totalPaymentAmount = ref(0)
const isProcessing = ref(false)
const processingError = ref<string | null>(null)

// Allocation tracking - which payments have been allocated and how much
interface AllocationItem {
  paymentId: string
  allocatedAmount: number
  isFullyPaid: boolean
}
const allocations = ref<AllocationItem[]>([])

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Total amount needed for all selected payments
const totalNeededAmount = computed(() => {
  return props.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
})

// Remaining amount to allocate
const remainingAmount = computed(() => {
  const totalAllocated = allocations.value.reduce((sum, a) => sum + a.allocatedAmount, 0)
  return totalPaymentAmount.value - totalAllocated
})

// Get all active accounts for payment
const availableAccounts = computed(() => {
  return accountStore.activeAccounts
})

// Get selected account for balance check
const selectedAccount = computed(() => {
  return availableAccounts.value.find(a => a.id === selectedAccountId.value)
})

// Check if account has sufficient balance
const hasSufficientBalance = computed(() => {
  if (!selectedAccount.value) return true
  return selectedAccount.value.balance >= totalPaymentAmount.value
})

// Check if selected account is cash account
const needsCashierConfirmation = computed(() => {
  return selectedAccount.value?.type === 'cash'
})

// Can process the batch payment
const canProcess = computed(() => {
  return (
    selectedAccountId.value !== '' &&
    totalPaymentAmount.value > 0 &&
    hasSufficientBalance.value &&
    allocations.value.length > 0 &&
    allocations.value.some(a => a.allocatedAmount > 0)
  )
})

// Payments with allocation info for display
const paymentsWithAllocation = computed(() => {
  return props.payments.map(p => {
    const allocation = allocations.value.find(a => a.paymentId === p.id)
    return {
      ...p,
      allocatedAmount: allocation?.allocatedAmount || 0,
      isFullyPaid: allocation?.isFullyPaid || false,
      isAllocated: (allocation?.allocatedAmount || 0) > 0
    }
  })
})

// =============================================
// WATCHERS
// =============================================

// Reset state when payments change - auto-allocate all selected payments
watch(
  () => props.payments,
  newPayments => {
    if (newPayments.length > 0) {
      totalPaymentAmount.value = totalNeededAmount.value
      processingError.value = null

      // Pre-select account
      if (availableAccounts.value.length > 0) {
        const bankAccount = availableAccounts.value.find(a => a.type === 'bank')
        selectedAccountId.value = bankAccount?.id || availableAccounts.value[0].id
      }

      // Auto-allocate all payments (they were already selected by user)
      autoAllocateAll()
    }
  },
  { immediate: true }
)

// =============================================
// METHODS
// =============================================

/**
 * Allocate payment amount to a specific pending payment
 * User clicks on a payment to allocate funds sequentially
 */
function allocateToPayment(payment: PendingPayment) {
  if (remainingAmount.value <= 0) return

  const existingIndex = allocations.value.findIndex(a => a.paymentId === payment.id)
  const paymentAmount = payment.amount || 0

  // If already allocated, remove allocation (toggle off)
  if (existingIndex >= 0) {
    allocations.value.splice(existingIndex, 1)
    return
  }

  // Allocate as much as possible
  const amountToAllocate = Math.min(remainingAmount.value, paymentAmount)
  const isFullyPaid = amountToAllocate >= paymentAmount

  allocations.value.push({
    paymentId: payment.id,
    allocatedAmount: amountToAllocate,
    isFullyPaid
  })
}

/**
 * Clear all allocations
 */
function clearAllocations() {
  allocations.value = []
}

/**
 * Auto-allocate to all payments in order (FIFO by date)
 */
function autoAllocateAll() {
  allocations.value = []
  let remaining = totalPaymentAmount.value

  // Sort by date (oldest first)
  const sortedPayments = [...props.payments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  for (const payment of sortedPayments) {
    if (remaining <= 0) break

    const paymentAmount = payment.amount || 0
    const amountToAllocate = Math.min(remaining, paymentAmount)

    allocations.value.push({
      paymentId: payment.id,
      allocatedAmount: amountToAllocate,
      isFullyPaid: amountToAllocate >= paymentAmount
    })

    remaining -= amountToAllocate
  }
}

/**
 * Process the batch payment
 */
async function handleProcess() {
  if (!canProcess.value) return

  try {
    isProcessing.value = true
    processingError.value = null

    const performer = {
      type: 'user' as const,
      id: authStore.userId,
      name: authStore.userName
    }

    // Process each allocated payment
    for (const allocation of allocations.value) {
      if (allocation.allocatedAmount <= 0) continue

      const payment = props.payments.find(p => p.id === allocation.paymentId)
      if (!payment) continue

      // Assign to account if not already assigned
      if (!payment.assignedToAccount) {
        await accountStore.assignPaymentToAccount(allocation.paymentId, selectedAccountId.value)
      }

      // For cash accounts, this will create pending cashier confirmation
      // For other accounts, this will process immediately
      if (!needsCashierConfirmation.value) {
        await accountStore.processPayment({
          paymentId: allocation.paymentId,
          accountId: selectedAccountId.value,
          actualAmount: allocation.allocatedAmount,
          performedBy: performer
        })
      }
    }

    emit('success')
    isOpen.value = false
  } catch (error) {
    processingError.value = error instanceof Error ? error.message : 'Failed to process payments'
    console.error('Batch payment error:', error)
  } finally {
    isProcessing.value = false
  }
}

function handleCancel() {
  emit('cancel')
  isOpen.value = false
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-'
  return TimeUtils.formatDateForDisplay(dateStr)
}

function getAccountIcon(type: string): string {
  const icons: Record<string, string> = {
    cash: 'mdi-cash',
    bank: 'mdi-bank',
    card: 'mdi-credit-card',
    default: 'mdi-wallet'
  }
  return icons[type] || icons.default
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="700" persistent scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-cash-multiple</v-icon>
        Batch Payment
        <v-chip size="small" color="primary" class="ml-2">{{ payments.length }} payments</v-chip>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Error Alert -->
        <v-alert v-if="processingError" type="error" variant="tonal" class="mb-4" closable>
          {{ processingError }}
        </v-alert>

        <!-- Payment Amount Input -->
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-text-field
              v-model.number="totalPaymentAmount"
              label="Total Payment Amount *"
              type="number"
              variant="outlined"
              density="compact"
              prefix="Rp"
              :hint="`Total needed: ${formatIDR(totalNeededAmount)}`"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="selectedAccountId"
              :items="availableAccounts"
              item-title="name"
              item-value="id"
              label="Pay from Account *"
              variant="outlined"
              density="compact"
            >
              <template #item="{ item, props: itemProps }">
                <v-list-item v-bind="itemProps">
                  <template #prepend>
                    <v-icon :icon="getAccountIcon(item.raw.type)" size="small" />
                  </template>
                  <template #append>
                    <span class="text-caption">{{ formatIDR(item.raw.balance) }}</span>
                  </template>
                </v-list-item>
              </template>
            </v-select>
          </v-col>
        </v-row>

        <!-- Cashier Confirmation Info -->
        <v-alert v-if="needsCashierConfirmation" type="info" variant="tonal" class="mb-4">
          <v-icon start size="small">mdi-information</v-icon>
          These payments will be sent to cashier for confirmation.
        </v-alert>

        <!-- Insufficient Balance Warning -->
        <v-alert
          v-if="selectedAccount && !hasSufficientBalance"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          <v-icon start size="small">mdi-alert</v-icon>
          Insufficient balance. Account has {{ formatIDR(selectedAccount.balance) }}.
        </v-alert>

        <!-- Allocation Summary -->
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="d-flex justify-space-between align-center">
            <div>
              <v-icon start size="small">mdi-cursor-pointer</v-icon>
              Click on payments below to allocate funds
            </div>
            <div class="d-flex gap-2">
              <v-btn size="x-small" variant="outlined" @click="autoAllocateAll">
                <v-icon start size="small">mdi-auto-fix</v-icon>
                Auto (FIFO)
              </v-btn>
              <v-btn size="x-small" variant="text" @click="clearAllocations">Clear</v-btn>
            </div>
          </div>
          <v-divider class="my-2" />
          <div class="d-flex justify-space-between">
            <span>Remaining to allocate:</span>
            <span
              :class="remainingAmount > 0 ? 'text-warning' : 'text-success'"
              class="font-weight-bold"
            >
              {{ formatIDR(remainingAmount) }}
            </span>
          </div>
        </v-alert>

        <!-- Payments List for Allocation -->
        <v-list lines="two" class="allocation-list">
          <v-list-item
            v-for="payment in paymentsWithAllocation"
            :key="payment.id"
            class="mb-2 border rounded allocation-item"
            :class="{
              'allocated-item': payment.isAllocated,
              'fully-paid-item': payment.isFullyPaid
            }"
            @click="allocateToPayment(payment)"
          >
            <template #prepend>
              <v-checkbox
                :model-value="payment.isAllocated"
                hide-details
                readonly
                density="compact"
                class="mr-2"
              />
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ payment.counteragentName || payment.description || 'Unknown' }}
            </v-list-item-title>

            <v-list-item-subtitle>
              <div class="d-flex flex-wrap gap-2 mt-1">
                <v-chip size="small" color="warning" variant="tonal">
                  {{ formatIDR(payment.amount || 0) }}
                </v-chip>
                <v-chip size="x-small" variant="outlined">
                  <v-icon start size="x-small">mdi-calendar</v-icon>
                  {{ formatDate(payment.createdAt) }}
                </v-chip>
              </div>
            </v-list-item-subtitle>

            <template #append>
              <div v-if="payment.isAllocated" class="text-right">
                <div class="text-caption text-grey">Allocated:</div>
                <div
                  class="font-weight-bold"
                  :class="payment.isFullyPaid ? 'text-success' : 'text-warning'"
                >
                  {{ formatIDR(payment.allocatedAmount) }}
                </div>
                <v-chip v-if="payment.isFullyPaid" size="x-small" color="success" variant="flat">
                  Full
                </v-chip>
                <v-chip v-else size="x-small" color="warning" variant="flat">Partial</v-chip>
              </div>
              <div v-else class="text-caption text-grey">Click to allocate</div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" :disabled="isProcessing" @click="handleCancel">Cancel</v-btn>

        <v-spacer />

        <div class="text-right mr-4">
          <div class="text-caption text-grey">Total Allocated:</div>
          <div class="text-h6 font-weight-bold text-primary">
            {{ formatIDR(totalPaymentAmount - remainingAmount) }}
          </div>
        </div>

        <v-btn
          color="success"
          variant="flat"
          :disabled="!canProcess"
          :loading="isProcessing"
          @click="handleProcess"
        >
          <v-icon start>mdi-check</v-icon>
          Process Payments
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
.allocation-list {
  max-height: 400px;
  overflow-y: auto;
}

.allocation-item {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.04);
  }

  &.allocated-item {
    background-color: rgba(var(--v-theme-primary), 0.08);
    border-color: rgb(var(--v-theme-primary)) !important;
  }

  &.fully-paid-item {
    background-color: rgba(var(--v-theme-success), 0.08);
    border-color: rgb(var(--v-theme-success)) !important;
  }
}
</style>
