<!-- src/views/supplier/components/consolidation/BillsManagementCard.vue -->
<template>
  <v-card class="bills-management-card">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-file-document" color="warning" class="mr-2" />
        <div>
          <h4>Bills & Payments</h4>
          <div class="text-caption text-medium-emphasis">
            Manage supplier bills and payment tracking
          </div>
        </div>
      </div>
      <div class="d-flex align-center gap-2">
        <v-chip
          v-if="unpaidBillsCount > 0"
          :color="hasOverdueBills ? 'error' : 'warning'"
          size="small"
          variant="flat"
        >
          <v-icon :icon="hasOverdueBills ? 'mdi-alert' : 'mdi-clock'" size="12" class="mr-1" />
          {{ unpaidBillsCount }} unpaid
        </v-chip>
        <v-menu>
          <template #activator="{ props }">
            <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
          </template>
          <v-list density="compact">
            <v-list-item @click="showCreateBillDialog = true">
              <v-list-item-title>
                <v-icon icon="mdi-plus-circle" class="mr-2" />
                Create Bill
              </v-list-item-title>
            </v-list-item>
            <v-list-item @click="exportBillsReport">
              <v-list-item-title>
                <v-icon icon="mdi-download" class="mr-2" />
                Export Report
              </v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item @click="showPaymentSettings">
              <v-list-item-title>
                <v-icon icon="mdi-cog" class="mr-2" />
                Payment Settings
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </v-card-title>

    <v-divider />

    <!-- Bills Summary -->
    <v-card-text class="pa-4 pb-2">
      <v-row class="mb-4">
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="info">
            <v-card-text class="text-center pa-3">
              <div class="text-h6 font-weight-bold">{{ totalBills }}</div>
              <div class="text-caption">Total Bills</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="warning">
            <v-card-text class="text-center pa-3">
              <div class="text-h6 font-weight-bold">{{ unpaidBillsCount }}</div>
              <div class="text-caption">Unpaid</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="error">
            <v-card-text class="text-center pa-3">
              <div class="text-h6 font-weight-bold">{{ overdueBillsCount }}</div>
              <div class="text-caption">Overdue</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center pa-3">
              <div class="text-h6 font-weight-bold">{{ formatCurrency(totalUnpaidAmount) }}</div>
              <div class="text-caption">Total Due</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Bills List -->
    <v-card-text class="pa-4" style="max-height: 500px; overflow-y: auto">
      <!-- Loading State -->
      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" class="mb-2" />
        <div>Loading bills...</div>
      </div>

      <!-- Empty State -->
      <div v-else-if="bills.length === 0" class="text-center pa-8">
        <v-icon icon="mdi-file-document-plus" size="64" class="text-medium-emphasis mb-4" />
        <div class="text-h6 text-medium-emphasis mb-2">No Bills Found</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          Bills will appear here when purchase orders are delivered
        </div>
        <v-btn color="primary" variant="outlined" @click="showCreateBillDialog = true">
          <v-icon icon="mdi-plus-circle" class="mr-2" />
          Create First Bill
        </v-btn>
      </div>

      <!-- Bills Cards -->
      <div v-else class="bills-list">
        <v-card
          v-for="bill in sortedBills"
          :key="bill.id"
          variant="outlined"
          class="mb-3 bill-card"
          :class="{
            overdue: isBillOverdue(bill),
            paid: bill.paymentStatus === 'paid'
          }"
        >
          <v-card-text class="pa-4">
            <!-- Bill Header -->
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center">
                <div class="bill-icon mr-3">
                  {{ getSupplierIcon(bill.supplierName) }}
                </div>
                <div>
                  <div class="font-weight-medium">{{ bill.billNumber }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ bill.supplierName }}
                  </div>
                </div>
              </div>
              <div class="d-flex align-center gap-2">
                <v-chip :color="getBillStatusColor(bill.status)" size="small" variant="flat">
                  <v-icon :icon="getBillStatusIcon(bill.status)" size="12" class="mr-1" />
                  {{ getBillStatusName(bill.status) }}
                </v-chip>
                <v-chip
                  :color="getPaymentStatusColor(bill.paymentStatus)"
                  size="small"
                  variant="tonal"
                >
                  <v-icon :icon="getPaymentStatusIcon(bill.paymentStatus)" size="12" class="mr-1" />
                  {{ getPaymentStatusName(bill.paymentStatus) }}
                </v-chip>
              </div>
            </div>

            <!-- Bill Details -->
            <div class="bill-details">
              <v-row>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">Issue Date</div>
                  <div class="font-weight-medium">{{ formatDate(bill.issueDate) }}</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">Due Date</div>
                  <div class="font-weight-medium" :class="getDueDateColor(bill.dueDate)">
                    {{ formatDate(bill.dueDate) }}
                    <span v-if="isBillOverdue(bill)" class="text-error">
                      ({{ getOverdueDays(bill) }} days overdue)
                    </span>
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">Amount</div>
                  <div class="text-h6 font-weight-bold text-primary">
                    {{ formatCurrency(bill.finalAmount) }}
                  </div>
                  <div v-if="bill.taxAmount" class="text-caption text-medium-emphasis">
                    Tax: {{ formatCurrency(bill.taxAmount) }}
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">Payment Terms</div>
                  <div class="font-weight-medium">
                    {{ getPaymentTermsName(bill.paymentTerms) }}
                  </div>
                  <div v-if="bill.paidAt" class="text-caption text-success">
                    <v-icon icon="mdi-check-circle" size="12" class="mr-1" />
                    Paid: {{ formatDate(bill.paidAt) }}
                  </div>
                </v-col>
              </v-row>

              <!-- Bill Notes -->
              <div v-if="bill.notes" class="mt-3">
                <div class="text-caption text-medium-emphasis mb-1">Notes:</div>
                <div class="text-caption">{{ bill.notes }}</div>
              </div>

              <!-- Purchase Order Link -->
              <div class="mt-3">
                <v-chip
                  color="info"
                  size="x-small"
                  variant="outlined"
                  @click="viewPurchaseOrder(bill.purchaseOrderId)"
                >
                  <v-icon icon="mdi-package-variant" size="12" class="mr-1" />
                  View PO: {{ bill.purchaseOrderId }}
                </v-chip>
              </div>
            </div>

            <!-- Bill Actions -->
            <div class="d-flex justify-end gap-2 mt-4">
              <v-btn
                v-if="bill.paymentStatus === 'unpaid'"
                color="success"
                variant="flat"
                size="small"
                prepend-icon="mdi-credit-card"
                @click="payBill(bill)"
              >
                Pay Bill
              </v-btn>
              <v-btn
                variant="outlined"
                size="small"
                prepend-icon="mdi-eye"
                @click="viewBillDetails(bill)"
              >
                View
              </v-btn>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
                </template>
                <v-list density="compact">
                  <v-list-item @click="editBill(bill)">
                    <v-list-item-title>
                      <v-icon icon="mdi-pencil" class="mr-2" />
                      Edit Bill
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="downloadBillPdf(bill)">
                    <v-list-item-title>
                      <v-icon icon="mdi-file-pdf-box" class="mr-2" />
                      Download PDF
                    </v-list-item-title>
                  </v-list-item>
                  <v-list-item @click="duplicateBill(bill)">
                    <v-list-item-title>
                      <v-icon icon="mdi-content-copy" class="mr-2" />
                      Duplicate
                    </v-list-item-title>
                  </v-list-item>
                  <v-divider />
                  <v-list-item
                    v-if="bill.paymentStatus === 'unpaid'"
                    class="text-error"
                    @click="cancelBill(bill)"
                  >
                    <v-list-item-title>
                      <v-icon icon="mdi-cancel" class="mr-2" />
                      Cancel Bill
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-card-text>

    <!-- Create Bill Dialog -->
    <v-dialog v-model="showCreateBillDialog" max-width="600px">
      <v-card>
        <v-card-title>Create New Bill</v-card-title>
        <v-card-text class="pa-6">
          <v-form ref="createBillForm" v-model="isCreateBillFormValid">
            <v-row>
              <v-col cols="12">
                <v-autocomplete
                  v-model="newBill.purchaseOrderId"
                  :items="eligiblePurchaseOrders"
                  item-title="displayName"
                  item-value="id"
                  label="Select Purchase Order"
                  variant="outlined"
                  :rules="[v => !!v || 'Purchase Order is required']"
                  @update:model-value="handlePurchaseOrderSelect"
                >
                  <template #item="{ props: itemProps, item }">
                    <v-list-item v-bind="itemProps">
                      <v-list-item-title>{{ item.raw.orderNumber }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{ item.raw.supplierName }} • {{ formatCurrency(item.raw.totalAmount) }}
                      </v-list-item-subtitle>
                    </v-list-item>
                  </template>
                </v-autocomplete>
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newBill.dueDate"
                  type="date"
                  label="Due Date"
                  variant="outlined"
                  :rules="[v => !!v || 'Due date is required']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="newBill.issuedBy"
                  label="Issued By"
                  variant="outlined"
                  :rules="[v => !!v || 'Issued by is required']"
                  placeholder="e.g., Finance Team"
                />
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="newBill.notes"
                  label="Notes (optional)"
                  variant="outlined"
                  rows="2"
                  placeholder="Additional bill notes or payment instructions..."
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn @click="showCreateBillDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!isCreateBillFormValid"
            @click="createBill"
          >
            Create Bill
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Payment Dialog -->
    <v-dialog v-model="showPaymentDialog" max-width="500px">
      <v-card v-if="selectedBill">
        <v-card-title>Pay Bill: {{ selectedBill.billNumber }}</v-card-title>
        <v-card-text class="pa-6">
          <div class="mb-4">
            <div class="d-flex justify-space-between align-center mb-2">
              <div class="text-h6">{{ selectedBill.supplierName }}</div>
              <div class="text-h5 font-weight-bold text-primary">
                {{ formatCurrency(selectedBill.finalAmount) }}
              </div>
            </div>
            <div class="text-caption text-medium-emphasis">
              Due: {{ formatDate(selectedBill.dueDate) }}
            </div>
          </div>

          <v-form ref="paymentForm" v-model="isPaymentFormValid">
            <v-select
              v-model="payment.method"
              :items="paymentMethods"
              label="Payment Method"
              variant="outlined"
              :rules="[v => !!v || 'Payment method is required']"
            />
            <v-text-field
              v-model="payment.transactionId"
              label="Transaction ID (optional)"
              variant="outlined"
              placeholder="Bank transfer reference, check number, etc."
            />
            <v-text-field
              v-model="payment.notes"
              label="Payment Notes (optional)"
              variant="outlined"
              placeholder="Additional payment details..."
            />
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn @click="showPaymentDialog = false">Cancel</v-btn>
          <v-btn
            color="success"
            variant="flat"
            :disabled="!isPaymentFormValid"
            @click="confirmPayment"
          >
            Confirm Payment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatCurrency, formatDate, getPaymentTermsName } from '@/stores/supplier'
import type { Bill, PurchaseOrder } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'BillsManagementCard'

// Props
interface Props {
  bills: Bill[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  'create-bill': [orderId: string]
  'pay-bill': [billId: string, transactionId?: string]
}>()

// State
const showCreateBillDialog = ref(false)
const showPaymentDialog = ref(false)
const selectedBill = ref<Bill | null>(null)
const createBillForm = ref()
const paymentForm = ref()
const isCreateBillFormValid = ref(false)
const isPaymentFormValid = ref(false)

const newBill = ref({
  purchaseOrderId: '',
  dueDate: '',
  issuedBy: '',
  notes: ''
})

const payment = ref({
  method: '',
  transactionId: '',
  notes: ''
})

// Mock data for demo
const eligiblePurchaseOrders = ref([
  {
    id: 'po-001',
    orderNumber: 'PO-001',
    supplierName: 'Premium Meat Supply',
    totalAmount: 925000,
    displayName: 'PO-001 - Premium Meat Supply (Rp 925,000)'
  },
  {
    id: 'po-002',
    orderNumber: 'PO-002',
    supplierName: 'Fresh Market Distributor',
    totalAmount: 450000,
    displayName: 'PO-002 - Fresh Market Distributor (Rp 450,000)'
  }
])

const paymentMethods = [
  { title: 'Bank Transfer', value: 'bank_transfer' },
  { title: 'Cash', value: 'cash' },
  { title: 'Check', value: 'check' },
  { title: 'Credit Card', value: 'credit_card' }
]

// Computed
const totalBills = computed(() => props.bills.length)

const unpaidBillsCount = computed(
  () => props.bills.filter(b => b.paymentStatus === 'unpaid').length
)

const overdueBillsCount = computed(() => props.bills.filter(b => isBillOverdue(b)).length)

const hasOverdueBills = computed(() => overdueBillsCount.value > 0)

const totalUnpaidAmount = computed(() =>
  props.bills.filter(b => b.paymentStatus === 'unpaid').reduce((sum, b) => sum + b.finalAmount, 0)
)

const sortedBills = computed(() => {
  return [...props.bills].sort((a, b) => {
    // Sort by payment status (unpaid first), then by due date
    if (a.paymentStatus !== b.paymentStatus) {
      if (a.paymentStatus === 'unpaid') return -1
      if (b.paymentStatus === 'unpaid') return 1
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })
})

// Methods
function getSupplierIcon(supplierName: string): string {
  const icons: Record<string, string> = {
    meat: '🥩',
    premium: '⭐',
    fresh: '🌿',
    market: '🏪',
    beverage: '🥤',
    distributor: '🚛'
  }

  const lowerName = supplierName.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerName.includes(key)) return icon
  }
  return '🏪'
}

function getBillStatusColor(status: string): string {
  const colors = {
    draft: 'default',
    issued: 'info',
    paid: 'success',
    overdue: 'error',
    cancelled: 'error'
  }
  return colors[status as keyof typeof colors] || 'default'
}

function getBillStatusIcon(status: string): string {
  const icons = {
    draft: 'mdi-file-document-outline',
    issued: 'mdi-file-document',
    paid: 'mdi-check-circle',
    overdue: 'mdi-alert',
    cancelled: 'mdi-cancel'
  }
  return icons[status as keyof typeof icons] || 'mdi-help'
}

function getBillStatusName(status: string): string {
  const names = {
    draft: 'Draft',
    issued: 'Issued',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled'
  }
  return names[status as keyof typeof names] || status
}

function getPaymentStatusColor(status: string): string {
  const colors = {
    unpaid: 'warning',
    partial: 'info',
    paid: 'success'
  }
  return colors[status as keyof typeof colors] || 'default'
}

function getPaymentStatusIcon(status: string): string {
  const icons = {
    unpaid: 'mdi-clock',
    partial: 'mdi-credit-card-clock',
    paid: 'mdi-check-circle'
  }
  return icons[status as keyof typeof icons] || 'mdi-help'
}

function getPaymentStatusName(status: string): string {
  const names = {
    unpaid: 'Unpaid',
    partial: 'Partial',
    paid: 'Paid'
  }
  return names[status as keyof typeof names] || status
}

function isBillOverdue(bill: Bill): boolean {
  if (bill.paymentStatus === 'paid') return false
  return new Date(bill.dueDate) < new Date()
}

function getOverdueDays(bill: Bill): number {
  const dueDate = new Date(bill.dueDate)
  const now = new Date()
  return Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

function getDueDateColor(dueDate: string): string {
  const due = new Date(dueDate)
  const now = new Date()
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  if (diffDays < 0) return 'text-error' // Overdue
  if (diffDays <= 3) return 'text-warning' // Due soon
  return 'text-success' // Ok
}

// Action Methods
function handlePurchaseOrderSelect() {
  // Auto-calculate due date based on payment terms
  // This is a simplified version
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 30) // Default 30 days
  newBill.value.dueDate = futureDate.toISOString().split('T')[0]
}

function createBill() {
  if (!isCreateBillFormValid.value) return

  DebugUtils.info(MODULE_NAME, 'Creating bill', {
    purchaseOrderId: newBill.value.purchaseOrderId,
    dueDate: newBill.value.dueDate
  })

  emit('create-bill', newBill.value.purchaseOrderId)

  // Reset form
  newBill.value = {
    purchaseOrderId: '',
    dueDate: '',
    issuedBy: '',
    notes: ''
  }
  showCreateBillDialog.value = false
}

function payBill(bill: Bill) {
  selectedBill.value = bill
  payment.value = {
    method: '',
    transactionId: '',
    notes: ''
  }
  showPaymentDialog.value = true

  DebugUtils.info(MODULE_NAME, 'Initiating bill payment', {
    billId: bill.id,
    billNumber: bill.billNumber,
    amount: bill.finalAmount
  })
}

function confirmPayment() {
  if (!isPaymentFormValid.value || !selectedBill.value) return

  DebugUtils.info(MODULE_NAME, 'Confirming bill payment', {
    billId: selectedBill.value.id,
    method: payment.value.method,
    transactionId: payment.value.transactionId
  })

  emit('pay-bill', selectedBill.value.id, payment.value.transactionId)

  showPaymentDialog.value = false
  selectedBill.value = null
}

function viewBillDetails(bill: Bill) {
  DebugUtils.info(MODULE_NAME, 'View bill details', {
    billId: bill.id,
    billNumber: bill.billNumber
  })
  // TODO: Implement bill details view
}

function viewPurchaseOrder(orderId: string) {
  DebugUtils.info(MODULE_NAME, 'View purchase order', { orderId })
  // TODO: Navigate to purchase order or emit event
}

function editBill(bill: Bill) {
  DebugUtils.info(MODULE_NAME, 'Edit bill', { billId: bill.id })
  // TODO: Implement bill editing
}

function downloadBillPdf(bill: Bill) {
  DebugUtils.info(MODULE_NAME, 'Download bill PDF', { billId: bill.id })
  // TODO: Implement PDF download
}

function duplicateBill(bill: Bill) {
  DebugUtils.info(MODULE_NAME, 'Duplicate bill', { billId: bill.id })
  // TODO: Implement bill duplication
}

function cancelBill(bill: Bill) {
  DebugUtils.info(MODULE_NAME, 'Cancel bill', { billId: bill.id })
  // TODO: Implement bill cancellation
}

function exportBillsReport() {
  DebugUtils.info(MODULE_NAME, 'Export bills report')
  // TODO: Implement bills report export
}

function showPaymentSettings() {
  DebugUtils.info(MODULE_NAME, 'Show payment settings')
  // TODO: Implement payment settings
}
</script>

<style lang="scss" scoped>
.bills-management-card {
  .bill-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-warning), 0.1);
    border-radius: 6px;
    flex-shrink: 0;
  }

  .bills-list {
    .bill-card {
      transition: all 0.2s ease;
      border-left: 4px solid transparent;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &.overdue {
        border-left-color: rgb(var(--v-theme-error));
        background: rgba(var(--v-theme-error), 0.02);
      }

      &.paid {
        border-left-color: rgb(var(--v-theme-success));
        background: rgba(var(--v-theme-success), 0.02);
        opacity: 0.8;
      }
    }
  }

  .bill-details {
    background: rgba(var(--v-theme-surface), 0.5);
    border-radius: 8px;
    padding: 12px;
  }

  .gap-2 {
    gap: 8px;
  }
}

:deep(.v-dialog .v-card) {
  .v-card-text {
    .v-row {
      margin: 0;

      .v-col {
        padding: 4px 8px;
      }
    }
  }
}

// Pulsing animation for overdue bills
.bill-card.overdue {
  animation: overduePulse 2s ease-in-out infinite;
}

@keyframes overduePulse {
  0%,
  100% {
    border-left-color: rgb(var(--v-theme-error));
  }
  50% {
    border-left-color: rgba(var(--v-theme-error), 0.5);
  }
}

// Success state for paid bills
.bill-card.paid {
  .bill-icon {
    background: rgba(var(--v-theme-success), 0.1);
  }
}
</style>
