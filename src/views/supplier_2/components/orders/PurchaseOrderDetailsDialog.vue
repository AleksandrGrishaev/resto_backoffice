<!-- src/views/supplier_2/components/orders/PurchaseOrderDetailsDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="1200px" scrollable>
    <v-card v-if="order">
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
        <div>
          <div class="text-h6">{{ order.orderNumber }}</div>
          <div class="text-caption opacity-90">Purchase Order Details</div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="isOpen = false" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Order Summary -->
        <div class="pa-4 border-b">
          <v-row>
            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Supplier</div>
              <div class="text-body-1 font-weight-bold">{{ order.supplierName }}</div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Status</div>
              <v-chip size="small" :color="getStatusColor(order.status)" variant="flat">
                {{ getStatusText(order.status) }}
              </v-chip>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Total Amount</div>
              <div class="text-h6 font-weight-bold">
                {{ formatCurrency(order.actualDeliveredAmount || order.totalAmount) }}
              </div>
              <!-- Show original amount if different from delivered -->
              <div v-if="hasDeliveredAmountDifference" class="text-caption">
                <span class="text-decoration-line-through text-medium-emphasis">
                  {{ formatCurrency(order.originalTotalAmount || order.totalAmount) }}
                </span>
                <span :class="deliveredAmountDifferenceClass" class="ml-1">
                  ({{ formatDeliveredAmountDifference }})
                </span>
              </div>
              <div v-else-if="order.isEstimatedTotal" class="text-caption text-warning">
                Estimated Total
              </div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Order Date</div>
              <div class="text-body-2">{{ formatDate(order.orderDate) }}</div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Expected Delivery</div>
              <div class="text-body-2">
                {{
                  order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'Not set'
                }}
              </div>
            </v-col>

            <v-col cols="6" md="3">
              <div class="text-subtitle-2 mb-1">Related Requests</div>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="requestId in order.requestIds"
                  :key="requestId"
                  size="x-small"
                  variant="outlined"
                >
                  {{ getRequestNumber(requestId) }}
                </v-chip>
              </div>
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-1">Notes</div>
              <div class="text-body-2">{{ order.notes || 'No notes' }}</div>
            </v-col>
          </v-row>
        </div>

        <!-- Payment Management Section -->
        <div class="pa-4 border-b">
          <PurchaseOrderPayment
            :order="order"
            :bills="activeBills"
            :loading="paymentState.loading"
            @create-bill="handleCreateBill"
            @attach-bill="handleAttachBill"
            @detach-bill="handleDetachBill"
            @unlink-payment="handleUnlinkPayment"
            @view-bill="billId => actions.navigateToPayment(billId)"
            @cancel-bill="handleCancelBill"
            @manage-all-bills="() => actions.navigateToAccounts()"
          />
        </div>

        <!-- Receipt Information (если есть) -->
        <div v-if="order.status === 'delivered'" class="pa-4 border-b">
          <OrderReceiptWidget :order="order" />
        </div>

        <!-- Items List - NEW WIDGET -->
        <div class="pa-4 border-b">
          <OrderItemsWidget :items="order.items" />
        </div>
      </v-card-text>

      <!-- Dialog Actions -->
      <v-card-actions class="pa-4 border-t">
        <!-- Preview Button -->
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-eye-outline"
          :loading="isPrinting"
          @click="handlePrintOrder"
        >
          Preview Order
        </v-btn>

        <v-spacer />

        <v-btn
          v-if="canSendOrder(order)"
          color="success"
          variant="flat"
          prepend-icon="mdi-send"
          @click="sendOrder(order)"
        >
          Send to Supplier
        </v-btn>

        <!-- Edit existing draft receipt -->
        <v-btn
          v-if="draftReceiptForOrder"
          color="purple"
          variant="flat"
          prepend-icon="mdi-pencil"
          @click="editReceipt(draftReceiptForOrder)"
        >
          Edit Receipt
        </v-btn>

        <!-- Start new receipt -->
        <v-btn
          v-else-if="canStartReceipt(order)"
          color="purple"
          variant="flat"
          prepend-icon="mdi-truck-check"
          @click="startReceipt(order)"
        >
          Start Receipt
        </v-btn>

        <v-btn color="grey" variant="outlined" @click="isOpen = false">Close</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Payment Creation Dialog -->
    <v-dialog v-model="showCreateBillDialog" max-width="500px">
      <v-card>
        <v-card-title>Create New Bill</v-card-title>

        <v-card-text>
          <!-- Payment Summary Info -->
          <v-alert
            v-if="paymentCalculations.totalBilled > 0"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-caption">Order Total</div>
                <div class="font-weight-bold">{{ formatCurrency(order?.totalAmount || 0) }}</div>
              </div>
              <div class="text-center">
                <div class="text-caption">Already Billed</div>
                <div class="font-weight-bold text-warning">
                  {{ formatCurrency(paymentCalculations.totalBilled) }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-caption">Remaining</div>
                <div class="font-weight-bold text-success">
                  {{ formatCurrency(remainingAmount) }}
                </div>
              </div>
            </div>
          </v-alert>

          <v-form v-model="createBillForm.valid">
            <NumericInputField
              v-model="createBillForm.amount"
              label="Amount"
              prefix="Rp"
              :min="0"
              :max="999999999"
              :format-as-currency="true"
              :rules="createBillForm.amountRules"
              :hint="
                remainingAmount > 0 ? `Remaining unpaid: ${formatCurrency(remainingAmount)}` : ''
              "
              persistent-hint
              required
            />

            <v-select
              v-model="createBillForm.priority"
              label="Priority"
              :items="priorityOptions"
              :rules="createBillForm.priorityRules"
              required
              class="mt-2"
            />

            <v-textarea
              v-model="createBillForm.description"
              label="Description"
              rows="3"
              :rules="createBillForm.descriptionRules"
              required
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showCreateBillDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!createBillForm.valid"
            :loading="paymentState.loading"
            @click="handleCreateBillSubmit"
          >
            Create Bill
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Attach Bill Dialog -->
    <AttachBillDialog
      v-model="showAttachBillDialog"
      :order="order"
      :available-bills="availableBillsForSupplier"
      :loading="paymentState.loading"
      @attach-bill="onAttachBill"
    />

    <!-- Shortfall Alert -->
    <v-dialog v-model="paymentState.showShortfallAlert" max-width="500px">
      <v-card>
        <v-card-title class="text-warning">
          <v-icon icon="mdi-alert-circle" class="mr-2" />
          Amount Mismatch Detected
        </v-card-title>

        <v-card-text>
          <div v-if="paymentState.shortfallData">
            <div class="mb-4">
              <div class="text-h6 mb-2">
                Order: {{ paymentState.shortfallData.order.orderNumber }}
              </div>

              <v-row>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">Order Total</div>
                  <div class="text-h6">
                    {{ formatCurrency(paymentState.shortfallData.order.totalAmount) }}
                  </div>
                </v-col>
                <v-col cols="6">
                  <div class="text-caption text-medium-emphasis">Total Billed</div>
                  <div class="text-h6">{{ formatCurrency(paymentCalculations.totalBilled) }}</div>
                </v-col>
              </v-row>

              <v-divider class="my-3" />

              <div class="text-center">
                <div class="text-caption text-medium-emphasis">Difference</div>
                <div
                  class="text-h5 font-weight-bold"
                  :class="paymentCalculations.amountDifferenceClass"
                >
                  {{ formatCurrency(Math.abs(paymentCalculations.amountDifference)) }}
                  <span v-if="paymentCalculations.amountDifference > 0">(Overbilled)</span>
                  <span v-else>(Underbilled)</span>
                </div>
              </div>
            </div>

            <v-alert type="info" variant="tonal" class="mb-4">
              Please review the bill amounts and order total. You may need to adjust the bills or
              create additional payments.
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="actions.closeShortfallAlert()">Close</v-btn>
          <v-btn color="primary" @click="actions.navigateToAccounts()">Manage in Accounts</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Export Options Dialog -->
    <OrderExportOptionsDialog
      v-model="showPrintOptionsDialog"
      :order="order"
      :loading="isPrinting"
      @print="handlePrintWithOptions"
    />

    <!-- Order Preview Dialog -->
    <OrderPreviewDialog v-model="showPreviewDialog" :order-data="previewData" />

    <!-- Unlink Payment Confirmation Dialog -->
    <v-dialog v-model="showUnlinkConfirmDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center text-warning">
          <v-icon icon="mdi-alert" class="mr-2" />
          Confirm Payment Unlink
        </v-card-title>

        <v-card-text>
          <v-alert v-if="unlinkDialogData.isDelivered" type="warning" variant="tonal" class="mb-4">
            <strong>Warning:</strong>
            This order is already delivered. Unlinking this payment may affect accounting records
            and will create an alert for review.
          </v-alert>

          <v-alert v-else type="info" variant="tonal" class="mb-4">
            This payment was originally created for this order. Unlinking will make the payment
            available for other orders.
          </v-alert>

          <div v-if="unlinkDialogData.payment" class="pa-3 bg-grey-darken-3 rounded mb-4">
            <div class="d-flex justify-space-between mb-2">
              <span class="text-medium-emphasis">Payment ID:</span>
              <span class="font-weight-medium">{{ unlinkDialogData.payment?.id?.slice(-8) }}</span>
            </div>
            <div class="d-flex justify-space-between mb-2">
              <span class="text-medium-emphasis">Amount:</span>
              <span class="font-weight-medium">
                {{ formatCurrency(unlinkDialogData.payment?.amount || 0) }}
              </span>
            </div>
            <div class="d-flex justify-space-between">
              <span class="text-medium-emphasis">Order:</span>
              <span class="font-weight-medium">{{ order?.orderNumber }}</span>
            </div>
          </div>

          <p class="text-body-2 text-medium-emphasis">
            Are you sure you want to unlink this payment from the order?
          </p>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelUnlink">Cancel</v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="unlinkDialogData.loading"
            @click="confirmUnlink"
          >
            Unlink Payment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import { useOrderPayments } from '@/stores/supplier_2/composables/useOrderPayments'
import { usePurchaseOrderExport } from '@/stores/supplier_2/composables/usePurchaseOrderExport'
import { useReceipts } from '@/stores/supplier_2/composables/useReceipts'
import { useAlertsStore } from '@/stores/alerts'
import { useAuthStore } from '@/stores/auth'
import type { PurchaseOrder, Receipt } from '@/stores/supplier_2/types'
import type { PendingPayment } from '@/stores/account/types'
import OrderItemsWidget from './order/OrderItemsWidget.vue'
import OrderReceiptWidget from './order/OrderReceiptWidget.vue'
import AttachBillDialog from './order/AttachBillDialog.vue'
import PurchaseOrderPayment from './order/PurchaseOrderPayment.vue'
import OrderExportOptionsDialog from './OrderExportOptionsDialog.vue'
import OrderPreviewDialog from './OrderPreviewDialog.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  order: PurchaseOrder | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'send-order', order: PurchaseOrder): void
  (e: 'start-receipt', order: PurchaseOrder): void
  (e: 'edit-receipt', receipt: Receipt): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES
// =============================================

const { formatCurrency, getStatusColor, canSendOrder, canReceiveOrder, isReadyForReceipt } =
  usePurchaseOrders()

const {
  paymentState,
  selectedOrderBills,
  availableBillsForSupplier,
  paymentCalculations,
  actions,
  getPaymentStatusColor
} = useOrderPayments()

const { isPrinting, buildExportData } = usePurchaseOrderExport()

const { getReceiptByOrderId } = useReceipts()

// Preview dialogs
const showPrintOptionsDialog = ref(false)
const showPreviewDialog = ref(false)
const previewData = ref<any>(null)

// =============================================
// LOCAL STATE
// =============================================

const showAttachBillDialog = ref(false)
const showCreateBillDialog = ref(false)
const showUnlinkConfirmDialog = ref(false)

// Unlink dialog state
const unlinkDialogData = reactive<{
  billId: string | null
  payment: PendingPayment | null
  isDelivered: boolean
  loading: boolean
}>({
  billId: null,
  payment: null,
  isDelivered: false,
  loading: false
})

const createBillForm = ref({
  valid: false,
  amount: 0,
  priority: 'medium' as const,
  description: '',
  amountRules: [
    (v: number) => !!v || 'Amount is required',
    (v: number) => v > 0 || 'Amount must be greater than 0'
  ],
  priorityRules: [(v: string) => !!v || 'Priority is required'],
  descriptionRules: [
    (v: string) => !!v || 'Description is required',
    (v: string) => v.length <= 200 || 'Description must be less than 200 characters'
  ]
})

const priorityOptions = [
  { title: 'Low', value: 'low' },
  { title: 'Medium', value: 'medium' },
  { title: 'High', value: 'high' },
  { title: 'Urgent', value: 'urgent' }
]

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const activeBills = computed(() =>
  selectedOrderBills.value.filter(bill => bill.status !== 'cancelled')
)

// =============================================
// RECEIPT RELATED COMPUTED
// =============================================

// Get draft receipt for current order (if exists)
const draftReceiptForOrder = computed((): Receipt | undefined => {
  if (!props.order) return undefined
  const receipt = getReceiptByOrderId(props.order.id)
  return receipt?.status === 'draft' ? receipt : undefined
})

// Check if delivered amount differs from original
const hasDeliveredAmountDifference = computed((): boolean => {
  if (!props.order?.actualDeliveredAmount) return false
  const original = props.order.originalTotalAmount || props.order.totalAmount
  return Math.abs(props.order.actualDeliveredAmount - original) > 1
})

// Get CSS class for amount difference
const deliveredAmountDifferenceClass = computed((): string => {
  if (!props.order?.actualDeliveredAmount) return ''
  const original = props.order.originalTotalAmount || props.order.totalAmount
  const diff = props.order.actualDeliveredAmount - original
  return diff > 0 ? 'text-warning' : 'text-error'
})

// Format delivered amount difference
const formatDeliveredAmountDifference = computed((): string => {
  if (!props.order?.actualDeliveredAmount) return ''
  const original = props.order.originalTotalAmount || props.order.totalAmount
  const diff = props.order.actualDeliveredAmount - original
  const sign = diff > 0 ? '+' : ''
  return `${sign}${formatCurrency(diff)}`
})

// Remaining amount to be billed
const remainingAmount = computed(() => {
  if (!props.order) return 0
  const remaining = props.order.totalAmount - paymentCalculations.value.totalBilled
  return Math.max(0, remaining)
})

// =============================================
// METHODS
// =============================================

async function handleCreateBill() {
  if (!props.order) return
  // Use remaining amount if there are already bills, otherwise use full order amount
  const suggestedAmount =
    remainingAmount.value > 0 ? remainingAmount.value : props.order.totalAmount
  createBillForm.value.amount = suggestedAmount
  createBillForm.value.description = `Payment for order ${props.order.orderNumber}`
  showCreateBillDialog.value = true
}

async function handleCreateBillSubmit() {
  if (!createBillForm.value.valid || !props.order) return

  try {
    await actions.createBill({
      amount: createBillForm.value.amount,
      priority: createBillForm.value.priority,
      description: createBillForm.value.description
    })

    showCreateBillDialog.value = false
    createBillForm.value.amount = 0
    createBillForm.value.priority = 'medium'
    createBillForm.value.description = ''
  } catch (error) {
    console.error('Failed to create bill:', error)
  }
}

function handleAttachBill() {
  showAttachBillDialog.value = true
}

async function handleDetachBill(billId: string) {
  try {
    await actions.detachBill(billId)
  } catch (error) {
    console.error('Failed to detach bill:', error)
  }
}

async function onAttachBill(billId: string) {
  try {
    await actions.attachBill(billId)
  } catch (error) {
    console.error('Failed to attach bill:', error)
  }
}

async function handleCancelBill(billId: string) {
  try {
    await actions.cancelBill(billId)
  } catch (error) {
    console.error('Failed to cancel bill:', error)
  }
}

/**
 * ✅ NEW: Handle unlink payment from order
 * Shows confirmation dialog for completed payments
 */
function handleUnlinkPayment(billId: string, needsConfirmation: boolean) {
  // Find the payment in active bills
  const payment = activeBills.value.find(b => b.id === billId)

  // Set dialog data
  unlinkDialogData.billId = billId
  unlinkDialogData.payment = payment || null
  unlinkDialogData.isDelivered = props.order?.status === 'delivered'
  unlinkDialogData.loading = false

  // Always show dialog for better UX (even if needsConfirmation is false)
  showUnlinkConfirmDialog.value = true
}

/**
 * Cancel unlink operation
 */
function cancelUnlink() {
  showUnlinkConfirmDialog.value = false
  unlinkDialogData.billId = null
  unlinkDialogData.payment = null
}

/**
 * Confirm and execute unlink operation
 * Creates an alert for delivered orders
 */
async function confirmUnlink() {
  if (!unlinkDialogData.billId) return

  unlinkDialogData.loading = true

  try {
    const billId = unlinkDialogData.billId
    const isDelivered = unlinkDialogData.isDelivered
    const payment = unlinkDialogData.payment

    // Execute unlink
    await actions.detachBill(billId)
    console.log('Payment unlinked successfully:', billId)

    // Create alert for delivered orders
    if (isDelivered && props.order) {
      try {
        const alertsStore = useAlertsStore()
        const authStore = useAuthStore()

        await alertsStore.createAlert({
          category: 'supplier',
          type: 'payment_unlinked',
          severity: 'warning',
          title: `Payment unlinked from delivered order ${props.order.orderNumber}`,
          description: `Payment ${payment?.id?.slice(-8) || billId.slice(-8)} (${formatCurrency(payment?.amount || 0)}) was unlinked from order ${props.order.orderNumber} after delivery. This may affect accounting records.`,
          metadata: {
            purchaseOrderId: props.order.id,
            orderNumber: props.order.orderNumber,
            paymentId: billId,
            paymentAmount: payment?.amount || 0,
            supplierName: props.order.supplierName,
            unlinkedBy: authStore.user?.name || 'Unknown'
          }
          // Note: orderId is NOT passed here because it's a purchase order, not a POS order
          // The FK constraint on operations_alerts.order_id references the POS orders table
        })

        console.log('Alert created for unlinked payment from delivered order')
      } catch (alertError) {
        console.error('Failed to create alert:', alertError)
        // Don't throw - unlink was successful, alert is secondary
      }
    }

    // Close dialog
    showUnlinkConfirmDialog.value = false
    unlinkDialogData.billId = null
    unlinkDialogData.payment = null
  } catch (error) {
    console.error('Failed to unlink payment:', error)
  } finally {
    unlinkDialogData.loading = false
  }
}

function sendOrder(order: PurchaseOrder) {
  emits('send-order', order)
  isOpen.value = false
}

function handlePrintOrder() {
  showPrintOptionsDialog.value = true
}

async function handlePrintWithOptions(options: { includePrices: boolean }) {
  if (!props.order) return
  showPrintOptionsDialog.value = false

  // Build export data and show preview dialog
  previewData.value = await buildExportData(props.order, {
    companyName: 'Kitchen Restaurant',
    companyAddress: 'Bali, Indonesia',
    includePrices: options.includePrices
  })

  showPreviewDialog.value = true
}

function startReceipt(order: PurchaseOrder) {
  emits('start-receipt', order)
  isOpen.value = false
}

function editReceipt(receipt: Receipt) {
  emits('edit-receipt', receipt)
  isOpen.value = false
}

function canStartReceipt(order: PurchaseOrder): boolean {
  return canReceiveOrder(order) && isReadyForReceipt(order)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}

function getRequestNumber(requestId: string): string {
  return `REQ-${requestId.slice(-3)}`
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => [props.order, props.modelValue],
  async ([newOrder, isDialogOpen]) => {
    if (newOrder && isDialogOpen) {
      await actions.selectOrder(newOrder)
    } else if (!isDialogOpen) {
      actions.clearSelection()
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.border-t {
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}
</style>
