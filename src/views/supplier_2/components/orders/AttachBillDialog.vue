<!-- src/views/supplier_2/components/orders/AttachBillDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="700px" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div>
          <div class="text-h6">Attach Existing Bill</div>
          <div v-if="order" class="text-caption text-medium-emphasis">
            Order {{ order.orderNumber }} • {{ order.supplierName }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <!-- Loading State -->
        <div v-if="loading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
          <div class="text-body-1">Loading available bills...</div>
        </div>

        <!-- Empty State -->
        <div v-else-if="availableBills.length === 0" class="text-center pa-8">
          <v-icon icon="mdi-receipt-text-outline" size="64" color="grey-lighten-1" class="mb-4" />
          <div class="text-h6 text-medium-emphasis mb-2">No Available Bills</div>
          <div class="text-body-2 text-medium-emphasis mb-4">
            There are no bills with available amounts for {{ order?.supplierName }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Available bills are those with unused amounts from overpayments or partial usage.
          </div>
        </div>

        <!-- Bills List -->
        <div v-else class="pa-4">
          <div class="text-body-2 text-medium-emphasis mb-4">
            Select a bill to attach to order {{ order?.orderNumber }}. Only bills with available
            amounts are shown:
          </div>

          <v-list class="py-0">
            <v-list-item
              v-for="bill in availableBills"
              :key="bill.id"
              :value="bill.id"
              class="mb-2"
              @click="selectedBillId = bill.id"
            >
              <template #prepend>
                <v-radio
                  :model-value="selectedBillId"
                  :value="bill.id"
                  color="primary"
                  class="me-3"
                />
              </template>

              <div class="flex-grow-1">
                <!-- Title Row -->
                <v-list-item-title class="mb-1">
                  <div class="d-flex align-center">
                    <span class="font-weight-medium">{{ bill.description }}</span>

                    <!-- Status Indicators -->
                    <div class="d-flex gap-1 ml-2">
                      <v-chip
                        v-if="isOverpayment(bill)"
                        size="x-small"
                        color="success"
                        variant="flat"
                      >
                        Available
                      </v-chip>

                      <v-chip
                        v-if="bill.priority === 'urgent'"
                        size="x-small"
                        color="error"
                        variant="flat"
                      >
                        Urgent
                      </v-chip>
                    </div>
                  </div>
                </v-list-item-title>

                <!-- Available Amount - Main Info -->
                <v-list-item-subtitle class="mb-2">
                  <div class="d-flex align-center">
                    <v-icon icon="mdi-cash-multiple" size="16" color="success" class="me-1" />
                    <span class="font-weight-bold text-success">
                      Available: {{ formatCurrency(getAvailableAmount(bill)) }}
                    </span>
                    <span class="text-medium-emphasis ml-2">
                      (from {{ formatCurrency(bill.amount) }} {{ getPaymentSourceText(bill) }})
                    </span>
                  </div>
                </v-list-item-subtitle>

                <!-- Details Row -->
                <v-list-item-subtitle>
                  <div class="d-flex flex-wrap gap-3 text-caption text-medium-emphasis">
                    <span>
                      <v-icon icon="mdi-identifier" size="12" class="me-1" />
                      ID: {{ bill.id.slice(-8) }}
                    </span>
                    <span v-if="bill.invoiceNumber">
                      <v-icon icon="mdi-receipt" size="12" class="me-1" />
                      Invoice: {{ bill.invoiceNumber }}
                    </span>
                    <span>
                      <v-icon icon="mdi-flag" size="12" class="me-1" />
                      Priority: {{ bill.priority }}
                    </span>
                    <span v-if="bill.dueDate">
                      <v-icon icon="mdi-calendar" size="12" class="me-1" />
                      Due: {{ formatDate(bill.dueDate) }}
                    </span>
                  </div>
                </v-list-item-subtitle>

                <!-- Usage Info for Overpayments -->
                <div v-if="isOverpayment(bill)" class="mt-2">
                  <v-alert type="info" variant="tonal" density="compact" class="text-caption">
                    <v-icon icon="mdi-information-outline" size="16" class="me-1" />
                    This is an overpayment from {{ getSourceOrderText(bill) }}. Used:
                    {{ formatCurrency(bill.usedAmount || 0) }}, Available:
                    {{ formatCurrency(getAvailableAmount(bill)) }}
                  </v-alert>
                </div>
              </div>

              <template #append>
                <div class="d-flex flex-column align-center gap-1">
                  <v-chip :color="getStatusColor(bill.status)" size="small" variant="flat">
                    {{ bill.status }}
                  </v-chip>

                  <!-- Link Amount Preview -->
                  <div v-if="selectedBillId === bill.id && order" class="text-caption text-center">
                    <div class="text-medium-emphasis">Will link:</div>
                    <div class="font-weight-bold text-primary">
                      {{ formatCurrency(calculateLinkAmount(bill)) }}
                    </div>
                  </div>
                </div>
              </template>
            </v-list-item>
          </v-list>

          <!-- Link Amount Warning -->
          <v-alert
            v-if="selectedBill && linkAmountWarning"
            type="warning"
            variant="tonal"
            density="compact"
            class="mt-4"
          >
            <v-icon icon="mdi-alert-circle" class="me-2" />
            {{ linkAmountWarning }}
          </v-alert>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <div v-if="selectedBill" class="flex-grow-1">
          <div class="text-caption text-medium-emphasis">
            <strong>Selected:</strong>
            {{ selectedBill.description }}
          </div>
          <div class="text-caption">
            <strong>Amount to link:</strong>
            <span class="text-primary font-weight-bold">
              {{ formatCurrency(calculateLinkAmount(selectedBill)) }}
            </span>
          </div>
        </div>

        <v-spacer />

        <v-btn @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="!selectedBillId || loading"
          :loading="submitting"
          @click="handleAttach"
        >
          Attach Bill
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PendingPayment, PurchaseOrder } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  order: PurchaseOrder | null
  availableBills: PendingPayment[]
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'attach-bill', billId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emits = defineEmits<Emits>()

// =============================================
// LOCAL STATE
// =============================================

const selectedBillId = ref<string | null>(null)
const submitting = ref(false)

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const selectedBill = computed(() =>
  props.availableBills.find(bill => bill.id === selectedBillId.value)
)

const linkAmountWarning = computed(() => {
  if (!selectedBill.value || !props.order) return null

  const linkAmount = calculateLinkAmount(selectedBill.value)
  const availableAmount = getAvailableAmount(selectedBill.value)
  const orderAmount = props.order.totalAmount

  if (linkAmount > availableAmount) {
    return `Link amount (${formatCurrency(linkAmount)}) exceeds available amount (${formatCurrency(availableAmount)})`
  }

  if (linkAmount < orderAmount) {
    const shortfall = orderAmount - linkAmount
    return `This will only cover ${formatCurrency(linkAmount)} of ${formatCurrency(orderAmount)}. Shortfall: ${formatCurrency(shortfall)}`
  }

  return null
})

// =============================================
// METHODS
// =============================================

function getAvailableAmount(payment: PendingPayment): number {
  if (!payment.linkedOrders) return 0

  if (payment.status === 'completed') {
    return payment.amount - (payment.usedAmount || 0)
  }

  const linkedAmount =
    payment.linkedOrders?.filter(o => o.isActive).reduce((sum, o) => sum + o.linkedAmount, 0) || 0

  return payment.amount - linkedAmount
}

function calculateLinkAmount(payment: PendingPayment): number {
  if (!props.order) return 0

  const availableAmount = getAvailableAmount(payment)
  const orderAmount = props.order.totalAmount

  return Math.min(availableAmount, orderAmount)
}

function isOverpayment(payment: PendingPayment): boolean {
  return payment.status === 'completed' && payment.sourceOrderId && getAvailableAmount(payment) > 0
}

function getPaymentSourceText(payment: PendingPayment): string {
  if (payment.status === 'completed') {
    const usedAmount = payment.usedAmount || 0
    return `paid, ${formatCurrency(usedAmount)} used`
  }
  return payment.status
}

function getSourceOrderText(payment: PendingPayment): string {
  if (payment.sourceOrderId) {
    const linkedOrder = payment.linkedOrders?.find(o => o.orderId === payment.sourceOrderId)
    return linkedOrder?.orderNumber || payment.sourceOrderId
  }
  return 'previous order'
}

function getStatusColor(status: string): string {
  const colors = {
    pending: 'warning',
    completed: 'success',
    processing: 'info',
    failed: 'error',
    cancelled: 'grey'
  }
  return colors[status] || 'grey'
}

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

async function handleAttach(): Promise<void> {
  if (!selectedBillId.value) return

  try {
    submitting.value = true
    emits('attach-bill', selectedBillId.value)
    // ✅ ДОБАВИТЬ:
    isOpen.value = false
    selectedBillId.value = null
  } finally {
    submitting.value = false
  }
}

function handleCancel(): void {
  isOpen.value = false
  selectedBillId.value = null
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.modelValue,
  newValue => {
    if (!newValue) {
      selectedBillId.value = null
    }
  }
)

watch(
  () => props.availableBills,
  () => {
    // Reset selection if selected bill is no longer available
    if (selectedBillId.value && !props.availableBills.find(b => b.id === selectedBillId.value)) {
      selectedBillId.value = null
    }
  }
)
</script>

<style scoped>
.v-list-item {
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.12);
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 1);
}

.v-list-item--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}

.v-list-item:hover {
  background: rgba(var(--v-theme-surface-variant), 0.08);
}

.v-list-item--active:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}
</style>
