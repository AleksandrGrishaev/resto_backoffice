<!-- src/views/supplier_2/components/orders/PurchaseOrderDetailsDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="1200px">
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
          <div class="text-subtitle-1 font-weight-bold mb-4">
            <v-icon icon="mdi-credit-card-outline" class="mr-2" />
            Payment Management
          </div>

          <!-- Payment Status Summary -->
          <div class="mb-4">
            <v-card variant="outlined" class="pa-3">
              <v-row>
                <v-col cols="6" md="3">
                  <div class="text-subtitle-2 mb-1">Payment Status</div>
                  <v-chip
                    size="small"
                    :color="getPaymentStatusColor(paymentCalculations.paymentStatus)"
                    variant="flat"
                  >
                    {{ getPaymentStatusText(paymentCalculations.paymentStatus) }}
                  </v-chip>
                </v-col>

                <v-col cols="6" md="3">
                  <div class="text-subtitle-2 mb-1">Total Billed</div>
                  <div class="text-body-1 font-weight-bold">
                    {{ formatCurrency(paymentCalculations.totalBilled) }}
                  </div>
                </v-col>

                <v-col cols="6" md="3">
                  <div class="text-subtitle-2 mb-1">Amount Difference</div>
                  <div
                    class="text-body-1 font-weight-bold"
                    :class="paymentCalculations.amountDifferenceClass"
                  >
                    {{ formatCurrency(Math.abs(paymentCalculations.amountDifference)) }}
                    <span v-if="paymentCalculations.amountDifference > 0">(Over)</span>
                    <span v-else-if="paymentCalculations.amountDifference < 0">(Under)</span>
                  </div>
                </v-col>

                <v-col cols="6" md="3">
                  <div class="text-subtitle-2 mb-1">Bills Count</div>
                  <div class="text-body-1 font-weight-bold">
                    {{ selectedOrderBills.length }}
                  </div>
                </v-col>
              </v-row>
            </v-card>
          </div>

          <!-- Bills Management -->
          <div class="mb-4">
            <!-- No Bills State -->
            <div v-if="selectedOrderBills.length === 0" class="text-center pa-6">
              <v-icon
                icon="mdi-receipt-text-outline"
                size="48"
                color="grey-lighten-1"
                class="mb-3"
              />
              <div class="text-h6 text-medium-emphasis mb-2">No Bills Created</div>
              <div class="text-body-2 text-medium-emphasis mb-4">
                Create a new bill or attach an existing one to manage payments for this order
              </div>

              <div class="d-flex gap-3 justify-center">
                <v-btn
                  color="primary"
                  variant="elevated"
                  prepend-icon="mdi-plus"
                  :loading="paymentState.loading"
                  @click="handleCreateBill"
                >
                  Create New Bill
                </v-btn>

                <v-btn
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-link"
                  :loading="paymentState.loading"
                  :disabled="availableBillsForSupplier.length === 0"
                  @click="handleAttachBill"
                >
                  Attach Existing Bill
                  <v-badge
                    v-if="availableBillsForSupplier.length > 0"
                    :content="availableBillsForSupplier.length"
                    color="success"
                  />
                </v-btn>
              </div>
            </div>

            <!-- Bills List -->
            <div v-else>
              <div class="d-flex justify-space-between align-center mb-3">
                <div class="text-subtitle-2">
                  Associated Bills ({{ selectedOrderBills.length }})
                </div>
                <div class="d-flex gap-2">
                  <v-btn
                    color="primary"
                    variant="text"
                    size="small"
                    prepend-icon="mdi-plus"
                    :loading="paymentState.loading"
                    @click="handleCreateBill"
                  >
                    Create New
                  </v-btn>

                  <v-btn
                    color="primary"
                    variant="text"
                    size="small"
                    prepend-icon="mdi-link"
                    :loading="paymentState.loading"
                    :disabled="availableBillsForSupplier.length === 0"
                    @click="handleAttachBill"
                  >
                    Attach Bill
                    <v-badge
                      v-if="availableBillsForSupplier.length > 0"
                      :content="availableBillsForSupplier.length"
                      color="success"
                    />
                  </v-btn>
                </div>
              </div>

              <!-- Bills Cards -->
              <div class="d-flex flex-column gap-2">
                <v-card
                  v-for="bill in selectedOrderBills"
                  :key="bill.id"
                  variant="outlined"
                  class="pa-3"
                >
                  <div class="d-flex justify-space-between align-center">
                    <div class="flex-grow-1">
                      <div class="d-flex align-center mb-1">
                        <v-chip
                          :color="getPaymentStatusColor(bill.status)"
                          size="x-small"
                          variant="flat"
                          class="mr-2"
                        >
                          {{ getBillStatusText(bill.status) }}
                        </v-chip>
                        <div class="text-body-1 font-weight-medium">
                          {{ bill.description }}
                        </div>
                      </div>

                      <div class="text-caption text-medium-emphasis mb-1">
                        ID: {{ bill.id.slice(-8) }} | Invoice: {{ bill.invoiceNumber || 'N/A' }} |
                        Priority: {{ bill.priority }}
                      </div>

                      <div v-if="bill.dueDate" class="text-caption text-medium-emphasis">
                        Due: {{ formatDate(bill.dueDate) }}
                        <span
                          v-if="isOverdue(bill.dueDate)"
                          class="text-error font-weight-bold ml-1"
                        >
                          (OVERDUE)
                        </span>
                      </div>
                    </div>

                    <div class="text-right mr-3">
                      <div class="text-h6 font-weight-bold">
                        {{ formatCurrency(bill.amount) }}
                      </div>
                    </div>

                    <div class="d-flex gap-1">
                      <v-btn
                        icon="mdi-eye"
                        variant="text"
                        size="small"
                        color="info"
                        @click="actions.navigateToPayment(bill.id)"
                      >
                        <v-icon>mdi-eye</v-icon>
                        <v-tooltip activator="parent">View Bill</v-tooltip>
                      </v-btn>

                      <v-btn
                        v-if="bill.status === 'pending'"
                        icon="mdi-link-off"
                        variant="text"
                        size="small"
                        color="warning"
                        @click="handleDetachBill(bill.id)"
                      >
                        <v-icon>mdi-link-off</v-icon>
                        <v-tooltip activator="parent">Detach Bill</v-tooltip>
                      </v-btn>

                      <v-menu>
                        <template #activator="{ props: menuProps }">
                          <v-btn
                            v-bind="menuProps"
                            icon="mdi-dots-vertical"
                            variant="text"
                            size="small"
                            color="grey"
                          />
                        </template>

                        <v-list density="compact">
                          <v-list-item
                            v-if="bill.status === 'pending'"
                            prepend-icon="mdi-cancel"
                            title="Cancel Bill"
                            @click="handleCancelBill(bill.id)"
                          />
                          <v-list-item prepend-icon="mdi-history" title="Show History" disabled />
                        </v-list>
                      </v-menu>
                    </div>
                  </div>
                </v-card>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="d-flex gap-2 justify-center mt-4">
              <v-btn
                v-if="paymentCalculations.hasAmountMismatch"
                color="warning"
                variant="outlined"
                prepend-icon="mdi-alert-circle"
                @click="actions.showShortfall()"
              >
                Review Amount Mismatch
              </v-btn>

              <v-btn
                color="info"
                variant="text"
                prepend-icon="mdi-view-list"
                @click="actions.navigateToAccounts()"
              >
                Manage in Accounts Module
              </v-btn>
            </div>
          </div>
        </div>

        <!-- Items List -->
        <div class="pa-4">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            Order Items ({{ order.items.length }})
          </div>

          <v-data-table
            :headers="itemHeaders"
            :items="order.items"
            density="compact"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #[`item.pricePerUnit`]="{ item }">
              <div class="text-right">
                {{ formatCurrency(item.pricePerUnit) }}
                <div v-if="item.isEstimatedPrice" class="text-caption text-warning">Est.</div>
                <div v-if="item.lastPriceDate" class="text-caption text-medium-emphasis">
                  ({{ formatDate(item.lastPriceDate || '') }})
                </div>
              </div>
            </template>

            <template #[`item.totalPrice`]="{ item }">
              <div class="text-right font-weight-bold">
                {{ formatCurrency(item.totalPrice) }}
              </div>
            </template>

            <template #[`item.status`]="{ item }">
              <v-chip size="x-small" :color="getItemStatusColor(item.status)" variant="tonal">
                {{ item.status }}
              </v-chip>
            </template>
          </v-data-table>

          <!-- Order Total -->
          <div class="d-flex justify-end mt-4 pa-3 bg-surface rounded">
            <div>
              <div class="text-body-2 text-medium-emphasis mb-1">Order Total:</div>
              <div class="text-h6 font-weight-bold">
                {{ formatCurrency(order.totalAmount) }}
              </div>
            </div>
          </div>
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

    <!-- Bill Attachment Dialog -->
    <v-dialog v-model="showAttachBillDialog" max-width="600px">
      <v-card>
        <v-card-title>Attach Existing Bill</v-card-title>

        <v-card-text>
          <div v-if="availableBillsForSupplier.length === 0" class="text-center pa-4">
            <v-icon icon="mdi-receipt-text-outline" size="48" color="grey-lighten-1" class="mb-3" />
            <div class="text-h6 text-medium-emphasis mb-2">No Available Bills</div>
            <div class="text-body-2 text-medium-emphasis">
              There are no unattached bills for {{ order?.supplierName }}
            </div>
          </div>

          <div v-else>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Select a bill to attach to order {{ order?.orderNumber }}:
            </div>

            <v-list>
              <v-list-item
                v-for="bill in availableBillsForSupplier"
                :key="bill.id"
                :value="bill.id"
                @click="selectedBillToAttach = bill.id"
              >
                <template #prepend>
                  <v-radio :model-value="selectedBillToAttach" :value="bill.id" color="primary" />
                </template>

                <v-list-item-title>{{ bill.description }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ formatCurrency(bill.amount) }} • {{ bill.priority }} priority
                  <span v-if="bill.dueDate">• Due: {{ formatDate(bill.dueDate) }}</span>
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showAttachBillDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!selectedBillToAttach"
            :loading="paymentState.loading"
            @click="handleAttachBillSubmit"
          >
            Attach Bill
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

// Dialog states
const showCreateBillDialog = ref(false)
const showAttachBillDialog = ref(false)
const selectedBillToAttach = ref<string | null>(null)

// Form states
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
// COMPUTED PROPERTIES
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

// =============================================
// TABLE CONFIGURATION
// =============================================

const itemHeaders = [
  { title: 'Item', key: 'itemName', sortable: false },
  { title: 'Qty Ordered', key: 'orderedQuantity', sortable: false, width: '100px', align: 'end' },
  { title: 'Qty Received', key: 'receivedQuantity', sortable: false, width: '100px', align: 'end' },
  { title: 'Unit', key: 'unit', sortable: false, width: '80px' },
  { title: 'Price/Unit', key: 'pricePerUnit', sortable: false, width: '120px', align: 'end' },
  { title: 'Total', key: 'totalPrice', sortable: false, width: '120px', align: 'end' },
  { title: 'Status', key: 'status', sortable: false, width: '100px' }
]

// =============================================
// PAYMENT MANAGEMENT METHODS
// =============================================

async function handleCreateBill() {
  if (!props.order) return

  // Set default values
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

    // Reset form
    createBillForm.value.amount = 0
    createBillForm.value.priority = 'medium'
    createBillForm.value.description = ''
  } catch (error) {
    console.error('Failed to create bill:', error)
  }
}

async function handleAttachBill() {
  if (!props.order) return

  selectedBillToAttach.value = null
  showAttachBillDialog.value = true
}

async function handleAttachBillSubmit() {
  if (!selectedBillToAttach.value) return

  try {
    await actions.attachBill(selectedBillToAttach.value)
    showAttachBillDialog.value = false
    selectedBillToAttach.value = null
  } catch (error) {
    console.error('Failed to attach bill:', error)
  }
}

async function handleDetachBill(billId: string) {
  try {
    await actions.detachBill(billId)
  } catch (error) {
    console.error('Failed to detach bill:', error)
  }
}

async function handleCancelBill(billId: string) {
  try {
    await actions.cancelBill(billId)
  } catch (error) {
    console.error('Failed to cancel bill:', error)
  }
}

// =============================================
// ORDER ACTIONS
// =============================================

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

// =============================================
// HELPER FUNCTIONS
// =============================================

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}

function getPaymentStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    not_billed: 'Not Billed',
    pending: 'Pending Payment',
    partial: 'Partially Paid',
    paid: 'Fully Paid'
  }
  return statusMap[status] || status
}

function getBillStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}

function getItemStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    ordered: 'blue',
    received: 'green',
    cancelled: 'red'
  }
  return colorMap[status] || 'grey'
}

function getRequestNumber(requestId: string): string {
  return `REQ-${requestId.slice(-3)}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isOverdue(dateString: string): boolean {
  return new Date(dateString) < new Date()
}

// =============================================
// WATCHERS
// =============================================

// Автоматически выбираем заказ при открытии диалога
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

<style lang="scss" scoped>
.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.text-medium-emphasis {
  opacity: 0.7;
}

.v-chip {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

@media (max-width: 768px) {
  .v-data-table {
    :deep(.v-data-table__th),
    :deep(.v-data-table__td) {
      padding: 8px 4px;
      font-size: 0.8rem;
    }
  }

  .payment-summary .v-row {
    text-align: center;
  }

  .d-flex.gap-3 {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
