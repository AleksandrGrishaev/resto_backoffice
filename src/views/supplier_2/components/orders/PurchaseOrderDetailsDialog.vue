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
                {{ formatCurrency(order.totalAmount) }}
              </div>
              <div v-if="order.isEstimatedTotal" class="text-caption text-warning">
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

        <v-btn
          v-if="canStartReceipt(order)"
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
          <v-form v-model="createBillForm.valid">
            <v-text-field
              v-model.number="createBillForm.amount"
              label="Amount"
              type="number"
              prefix="Rp"
              :rules="createBillForm.amountRules"
              required
            />

            <v-select
              v-model="createBillForm.priority"
              label="Priority"
              :items="priorityOptions"
              :rules="createBillForm.priorityRules"
              required
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
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import { useOrderPayments } from '@/stores/supplier_2/composables/useOrderPayments'
import type { PurchaseOrder } from '@/stores/supplier_2/types'
import OrderItemsWidget from './order/OrderItemsWidget.vue'
import OrderReceiptWidget from './order/OrderReceiptWidget.vue'
import AttachBillDialog from './order/AttachBillDialog.vue'
import PurchaseOrderPayment from './order/PurchaseOrderPayment.vue'

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

// =============================================
// LOCAL STATE
// =============================================

const showAttachBillDialog = ref(false)
const showCreateBillDialog = ref(false)

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
// METHODS
// =============================================

async function handleCreateBill() {
  if (!props.order) return
  createBillForm.value.amount = props.order.totalAmount
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

function sendOrder(order: PurchaseOrder) {
  emits('send-order', order)
  isOpen.value = false
}

function startReceipt(order: PurchaseOrder) {
  emits('start-receipt', order)
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
