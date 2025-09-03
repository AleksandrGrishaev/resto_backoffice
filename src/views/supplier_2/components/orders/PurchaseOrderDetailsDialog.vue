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

            <!-- ✅ ИНТЕГРАЦИЯ: PurchaseOrderPayment компонент -->
            <v-col cols="12">
              <purchase-order-payment
                :order="order"
                :bills="orderBills"
                :loading="false"
                @create-bill="handleCreateBill"
                @attach-bill="handleAttachBill"
                @manage-all-bills="handleManageAllBills"
                @view-bill="viewBill"
                @process-payment="processPayment"
                @detach-bill="detachBillFromOrder"
                @edit-bill="editBillAmount"
                @cancel-bill="cancelBill"
              />
            </v-col>
          </v-row>
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
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import type { PurchaseOrder } from '@/stores/supplier_2/types'
import type { PendingPayment } from '@/stores/account/types'
import PurchaseOrderPayment from './PurchaseOrderPayment.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  order: PurchaseOrder | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void

  // Order actions
  (e: 'send-order', order: PurchaseOrder): void
  (e: 'start-receipt', order: PurchaseOrder): void

  // Bill management emits (проксирование от PurchaseOrderPayment)
  (e: 'manage-bill-create', order: PurchaseOrder): void
  (e: 'manage-bill-attach', order: PurchaseOrder): void
  (e: 'manage-bill-view', order: PurchaseOrder): void
  (e: 'view-bill', billId: string): void
  (e: 'process-payment', billId: string): void
  (e: 'detach-bill', billId: string): void
  (e: 'edit-bill', billId: string): void
  (e: 'cancel-bill', billId: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES
// =============================================

const { formatCurrency, getStatusColor, canSendOrder, canReceiveOrder, isReadyForReceipt } =
  usePurchaseOrders()

// =============================================
// LOCAL STATE
// =============================================

const orderBills = ref<PendingPayment[]>([])

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
// BILL MANAGEMENT METHODS
// =============================================

/**
 * Load bills for the current order
 */
async function loadOrderBills(order: PurchaseOrder) {
  if (!order) {
    orderBills.value = []
    return
  }

  try {
    const { supplierAccountIntegration } = await import(
      '@/stores/supplier_2/integrations/accountIntegration'
    )
    orderBills.value = await supplierAccountIntegration.getBillsForOrder(order.id)
    console.log(`Loaded ${orderBills.value.length} bills for order ${order.orderNumber}`)
  } catch (error) {
    console.error('Failed to load order bills:', error)
    orderBills.value = []
  }
}

/**
 * ✅ Create bill - проксирование события
 */
function handleCreateBill(order: PurchaseOrder) {
  console.log('Creating bill for order:', order.orderNumber)
  emits('manage-bill-create', order)
}

/**
 * ✅ Attach bill - проксирование события
 */
function handleAttachBill(order: PurchaseOrder) {
  console.log('Attaching bill to order:', order.orderNumber)
  emits('manage-bill-attach', order)
}

/**
 * ✅ Manage all bills - проксирование события
 */
function handleManageAllBills(order: PurchaseOrder) {
  console.log('Managing all bills for order:', order.orderNumber)
  emits('manage-bill-view', order)
}

function viewBill(billId: string) {
  emits('view-bill', billId)
}

function processPayment(billId: string) {
  emits('process-payment', billId)
}

function detachBillFromOrder(billId: string) {
  emits('detach-bill', billId)
}

function editBillAmount(billId: string) {
  emits('edit-bill', billId)
}

function cancelBill(billId: string) {
  emits('cancel-bill', billId)
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
    cancelled: 'Cancelled',
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed'
  }
  return statusMap[status] || status
}

function getStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    draft: 'mdi-file-edit',
    sent: 'mdi-send',
    delivered: 'mdi-truck-check',
    cancelled: 'mdi-cancel'
  }
  return iconMap[status] || 'mdi-help-circle'
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

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.order,
  order => {
    if (order) {
      loadOrderBills(order)
    } else {
      orderBills.value = []
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.purchase-order-details-dialog {
  .v-dialog {
    max-width: 1200px;
  }
}

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

.v-data-table :deep(.v-data-table__tr:hover) {
  background-color: rgb(var(--v-theme-surface-variant), 0.1);
}

.v-icon.text-error {
  animation: blinkWarning 2s infinite;
}

@keyframes blinkWarning {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0.5;
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
}
</style>
