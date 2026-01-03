<script setup lang="ts">
// src/views/backoffice/accounts/payments/components/PendingPaymentsList.vue
// Sprint 5: Pending Payments List Component (Tab 1)
// Sprint 7: Added multi-select for batch payment operations

import { computed, ref } from 'vue'
import type { PendingPayment } from '@/stores/account/types'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils'

interface Props {
  payments: PendingPayment[]
  loading?: boolean
}

interface Emits {
  (e: 'confirm', payment: PendingPayment): void
  (e: 'reject', payment: PendingPayment): void
  (e: 'view', payment: PendingPayment): void
  (e: 'batch-pay', payments: PendingPayment[]): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

// =============================================
// SELECTION STATE
// =============================================

const selectedPaymentIds = ref<Set<string>>(new Set())
const selectAll = ref(false)

// Selected payments as array
const selectedPayments = computed(() => {
  return props.payments.filter(p => selectedPaymentIds.value.has(p.id))
})

// Total amount of selected payments
const selectedTotal = computed(() => {
  return selectedPayments.value.reduce((sum, p) => sum + (p.amount || 0), 0)
})

// Check if any payments are selected
const hasSelection = computed(() => selectedPaymentIds.value.size > 0)

// Check if multiple payments are selected (2+)
const hasMultipleSelection = computed(() => selectedPaymentIds.value.size >= 2)

// Get the selected supplier ID (for restricting selection to same supplier)
const selectedSupplierId = computed(() => {
  if (selectedPayments.value.length === 0) return null
  return selectedPayments.value[0].counteragentId || null
})

// Check if a payment can be selected (same supplier as first selection)
function canSelectPayment(payment: PendingPayment): boolean {
  if (!selectedSupplierId.value) return true
  return payment.counteragentId === selectedSupplierId.value
}

// Check if payment is selected (helper for template)
function isSelected(paymentId: string): boolean {
  return selectedPaymentIds.value.has(paymentId)
}

// =============================================
// SELECTION METHODS
// =============================================

function toggleSelection(payment: PendingPayment) {
  if (selectedPaymentIds.value.has(payment.id)) {
    selectedPaymentIds.value.delete(payment.id)
  } else {
    // Only allow selection if same supplier (or first selection)
    if (!canSelectPayment(payment)) return
    selectedPaymentIds.value.add(payment.id)
  }
  // Update selectAll state - only count same-supplier payments
  const sameSupplierPayments = props.payments.filter(
    p => !selectedSupplierId.value || p.counteragentId === selectedSupplierId.value
  )
  selectAll.value = selectedPaymentIds.value.size === sameSupplierPayments.length
}

function toggleSelectAll() {
  if (selectAll.value) {
    // Deselect all
    selectedPaymentIds.value.clear()
  } else {
    // Select all payments of the same supplier (or all if none selected yet)
    const supplierId = selectedSupplierId.value
    props.payments.forEach(p => {
      if (!supplierId || p.counteragentId === supplierId) {
        selectedPaymentIds.value.add(p.id)
      }
    })
  }
  selectAll.value = !selectAll.value
}

function clearSelection() {
  selectedPaymentIds.value.clear()
  selectAll.value = false
}

function handleBatchPay() {
  if (selectedPayments.value.length === 0) return
  emit('batch-pay', selectedPayments.value)
}

// =============================================
// COMPUTED
// =============================================

const sortedPayments = computed(() => {
  return [...props.payments].sort((a, b) => {
    // Sort by date descending (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

const totalPendingAmount = computed(() => {
  return props.payments.reduce((sum, p) => sum + (p.amount || 0), 0)
})

// =============================================
// METHODS
// =============================================

function handleConfirm(payment: PendingPayment) {
  emit('confirm', payment)
}

function handleReject(payment: PendingPayment) {
  emit('reject', payment)
}

function handleView(payment: PendingPayment) {
  emit('view', payment)
}

function formatDate(dateStr: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateStr)
}

function getPaymentIcon(type?: string): string {
  switch (type) {
    case 'supplier_payment':
      return 'mdi-truck-delivery'
    case 'transfer':
      return 'mdi-bank-transfer'
    default:
      return 'mdi-cash-clock'
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'error'
    default:
      return 'grey'
  }
}

function getConfirmationStatusColor(confirmationStatus?: string): string {
  switch (confirmationStatus) {
    case 'pending':
      return 'info'
    case 'confirmed':
      return 'success'
    case 'rejected':
      return 'error'
    default:
      return 'grey'
  }
}

function getConfirmationStatusText(payment: PendingPayment): string {
  if (!payment.requiresCashierConfirmation) return ''

  switch (payment.confirmationStatus) {
    case 'pending':
      return 'Awaiting Cashier'
    case 'confirmed':
      return 'Confirmed by Cashier'
    case 'rejected':
      return 'Rejected by Cashier'
    default:
      return 'Awaiting Cashier'
  }
}

// =============================================
// ALLOCATION STATUS (for supplier payments)
// =============================================

function getActiveLinkedOrders(payment: PendingPayment) {
  if (!payment.linkedOrders) return []
  return payment.linkedOrders.filter(o => o.isActive)
}

function getTotalAllocated(payment: PendingPayment): number {
  return getActiveLinkedOrders(payment).reduce((sum, o) => sum + o.linkedAmount, 0)
}

function getAllocationStatus(payment: PendingPayment): 'none' | 'partial' | 'full' {
  const totalAllocated = getTotalAllocated(payment)
  if (totalAllocated === 0) return 'none'
  if (totalAllocated >= payment.amount) return 'full'
  return 'partial'
}

function getAllocationStatusColor(payment: PendingPayment): string {
  const status = getAllocationStatus(payment)
  switch (status) {
    case 'full':
      return 'success'
    case 'partial':
      return 'orange'
    case 'none':
    default:
      return 'grey'
  }
}

function getAllocationStatusIcon(payment: PendingPayment): string {
  const status = getAllocationStatus(payment)
  switch (status) {
    case 'full':
      return 'mdi-check-circle'
    case 'partial':
      return 'mdi-circle-half-full'
    case 'none':
    default:
      return 'mdi-circle-outline'
  }
}

function getAllocationStatusText(payment: PendingPayment): string {
  const status = getAllocationStatus(payment)
  const allocated = getTotalAllocated(payment)
  const ordersCount = getActiveLinkedOrders(payment).length

  switch (status) {
    case 'full':
      return `Fully allocated (${ordersCount} order${ordersCount !== 1 ? 's' : ''})`
    case 'partial':
      return `${formatIDR(allocated)} / ${formatIDR(payment.amount)} allocated`
    case 'none':
    default:
      return 'Not allocated'
  }
}

function isSupplierPayment(payment: PendingPayment): boolean {
  return payment.category === 'supplier'
}
</script>

<template>
  <v-card-text>
    <!-- Loading State -->
    <div v-if="loading" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate color="primary" />
    </div>

    <!-- Empty State -->
    <v-alert v-else-if="payments.length === 0" type="success" variant="tonal">
      <v-icon start>mdi-check-circle</v-icon>
      No pending payments requiring confirmation.
    </v-alert>

    <!-- Payments List -->
    <template v-else>
      <!-- Selection Action Bar (shown when items selected) -->
      <div
        v-if="hasSelection"
        class="selection-bar d-flex align-center justify-space-between mb-4 pa-3 bg-primary rounded"
      >
        <div class="d-flex align-center">
          <v-checkbox
            :model-value="selectAll"
            hide-details
            density="compact"
            class="mr-2"
            @click="toggleSelectAll"
          />
          <span class="text-body-2 text-white">
            {{ selectedPayments.length }} bills
            <span v-if="selectedSupplierId" class="text-caption ml-1">
              ({{ selectedPayments[0]?.counteragentName }})
            </span>
          </span>
        </div>

        <div class="d-flex align-center gap-3">
          <span class="text-body-1 text-white mr-4">
            Total:
            <strong>{{ formatIDR(selectedTotal) }}</strong>
          </span>
          <v-btn color="success" variant="flat" @click="handleBatchPay">
            <v-icon start>mdi-check</v-icon>
            Confirm
          </v-btn>
          <v-btn icon variant="text" size="small" color="white" @click="clearSelection">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Summary -->
      <v-alert type="warning" variant="tonal" class="mb-4">
        <div class="d-flex align-center justify-space-between">
          <span>
            <v-icon start size="small">mdi-clock-outline</v-icon>
            {{ payments.length }} payment(s) awaiting confirmation
          </span>
          <span class="font-weight-bold">Total: {{ formatIDR(totalPendingAmount) }}</span>
        </div>
      </v-alert>

      <!-- List -->
      <v-list lines="two">
        <v-list-item
          v-for="payment in sortedPayments"
          :key="payment.id"
          class="mb-2 border rounded payment-item"
          :class="{
            'selected-item': isSelected(payment.id),
            'disabled-item': hasSelection && !canSelectPayment(payment) && !isSelected(payment.id)
          }"
        >
          <template #prepend>
            <div class="d-flex align-center">
              <!-- Checkbox for selection -->
              <v-checkbox
                :model-value="isSelected(payment.id)"
                :disabled="!canSelectPayment(payment) && !isSelected(payment.id)"
                hide-details
                density="compact"
                class="mr-2"
                @click.stop="toggleSelection(payment)"
              />
              <v-avatar color="warning" variant="tonal">
                <v-icon>{{ getPaymentIcon(payment.type) }}</v-icon>
              </v-avatar>
            </div>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ payment.counteragentName || payment.description || 'Unknown Payment' }}
          </v-list-item-title>

          <v-list-item-subtitle>
            <div class="d-flex flex-wrap gap-2 mt-1">
              <!-- Amount -->
              <v-chip size="small" color="warning" variant="tonal">
                {{ formatIDR(payment.amount || 0) }}
              </v-chip>

              <!-- Status -->
              <v-chip
                size="x-small"
                :color="getStatusColor(payment.status || 'pending')"
                variant="flat"
              >
                {{ payment.status || 'pending' }}
              </v-chip>

              <!-- Cashier Confirmation Status -->
              <v-chip
                v-if="payment.requiresCashierConfirmation"
                size="x-small"
                :color="getConfirmationStatusColor(payment.confirmationStatus)"
                variant="flat"
              >
                <v-icon start size="x-small">mdi-cash-register</v-icon>
                {{ getConfirmationStatusText(payment) }}
              </v-chip>

              <!-- Order Number if exists -->
              <v-chip v-if="payment.orderId" size="x-small" color="info" variant="outlined">
                <v-icon start size="x-small">mdi-file-document</v-icon>
                Order: {{ payment.orderId.slice(0, 8) }}...
              </v-chip>

              <!-- Allocation Status (for supplier payments) -->
              <v-chip
                v-if="isSupplierPayment(payment)"
                size="x-small"
                :color="getAllocationStatusColor(payment)"
                :variant="getAllocationStatus(payment) === 'partial' ? 'flat' : 'tonal'"
              >
                <v-icon start size="x-small">{{ getAllocationStatusIcon(payment) }}</v-icon>
                {{ getAllocationStatusText(payment) }}
              </v-chip>

              <!-- Date -->
              <v-chip size="x-small" variant="outlined">
                <v-icon start size="x-small">mdi-calendar</v-icon>
                {{ formatDate(payment.createdAt) }}
              </v-chip>
            </div>
          </v-list-item-subtitle>

          <!-- Notes -->
          <div v-if="payment.notes" class="text-caption text-grey mt-2">
            {{ payment.notes }}
          </div>

          <template #append>
            <div class="d-flex gap-2">
              <!-- Hide action buttons when multiple items are selected -->
              <template v-if="!hasMultipleSelection">
                <!-- Show Confirm button only if NOT awaiting cashier confirmation -->
                <v-btn
                  v-if="
                    !payment.requiresCashierConfirmation ||
                    payment.confirmationStatus === 'confirmed'
                  "
                  color="success"
                  variant="flat"
                  size="small"
                  @click="handleConfirm(payment)"
                >
                  <v-icon start>mdi-check</v-icon>
                  Confirm
                </v-btn>

                <!-- Show "View" button for payments awaiting cashier -->
                <v-btn
                  v-else-if="
                    payment.requiresCashierConfirmation && payment.confirmationStatus === 'pending'
                  "
                  color="info"
                  variant="outlined"
                  size="small"
                  @click="handleView(payment)"
                >
                  <v-icon start>mdi-eye</v-icon>
                  View
                </v-btn>

                <v-btn
                  color="error"
                  variant="text"
                  icon="mdi-close"
                  size="small"
                  @click="handleReject(payment)"
                />
              </template>

              <!-- Show disabled indicator for different supplier -->
              <v-chip
                v-else-if="!canSelectPayment(payment)"
                size="x-small"
                color="grey"
                variant="tonal"
              >
                Different supplier
              </v-chip>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </template>
  </v-card-text>
</template>

<style scoped lang="scss">
.payment-item {
  transition: all 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-warning), 0.04);
  }

  &.selected-item {
    background-color: rgba(var(--v-theme-primary), 0.08);
    border-color: rgb(var(--v-theme-primary)) !important;
  }

  &.disabled-item {
    opacity: 0.5;
    pointer-events: none;
  }
}
</style>
