<!-- src/views/supplier_2/components/orders/PurchaseOrderTable.vue -->
<template>
  <div class="purchase-order-table">
    <!-- Filters Bar -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="pa-4">
        <v-row align="center">
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Order Status"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" md="2">
            <v-select
              v-model="filters.paymentStatus"
              :items="paymentStatusOptions"
              label="Payment Status"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="filters.supplier"
              :items="supplierOptions"
              label="Supplier"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" md="2">
            <v-text-field
              v-model="searchQuery"
              label="Search orders..."
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-magnify"
              clearable
              @update:model-value="handleSearch"
            />
          </v-col>

          <v-col cols="12" md="3">
            <div class="d-flex gap-2">
              <v-btn
                color="grey"
                variant="outlined"
                prepend-icon="mdi-filter-off"
                size="small"
                @click="clearFilters"
              >
                Clear Filters
              </v-btn>

              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-refresh"
                size="small"
                :loading="loading"
                @click="refreshData"
              >
                Refresh
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-data-table
      :headers="headers"
      :items="filteredOrders"
      :loading="loading"
      class="elevation-1"
      :items-per-page="25"
      :sort-by="[{ key: 'orderDate', order: 'desc' }]"
    >
      <!-- Order Number -->
      <template #[`item.orderNumber`]="{ item }">
        <div class="d-flex align-center">
          <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal" class="mr-2">
            {{ item.orderNumber }}
          </v-chip>

          <!-- Overdue indicator -->
          <v-icon
            v-if="isOverdueForDelivery(item)"
            icon="mdi-clock-alert"
            color="error"
            size="16"
            class="ml-1"
          >
            <v-tooltip activator="parent" location="top">Overdue for delivery</v-tooltip>
          </v-icon>
        </div>
      </template>

      <!-- Supplier -->
      <template #[`item.supplierName`]="{ item }">
        <div class="text-subtitle-2 font-weight-medium">
          {{ item.supplierName }}
        </div>
      </template>

      <!-- Order Status -->
      <template #[`item.status`]="{ item }">
        <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal">
          <v-icon :icon="getStatusIcon(item.status)" size="14" class="mr-1" />
          {{ getStatusText(item.status) }}
        </v-chip>
      </template>

      <!-- Payment Status -->
      <template #[`item.paymentStatus`]="{ item }">
        <div class="d-flex align-center">
          <v-chip size="small" :color="getPaymentStatusColor(item.paymentStatus)" variant="tonal">
            <v-icon :icon="getPaymentStatusIcon(item.paymentStatus)" size="14" class="mr-1" />
            {{ getPaymentStatusText(item.paymentStatus) }}
          </v-chip>

          <!-- Bill link -->
          <v-btn
            v-if="item.billId"
            icon="mdi-receipt"
            variant="text"
            size="x-small"
            color="info"
            class="ml-1"
            @click="viewBill(item.billId)"
          >
            <v-tooltip activator="parent" location="top">View Bill</v-tooltip>
          </v-btn>
        </div>
      </template>

      <!-- Items Count -->
      <template #[`item.itemsCount`]="{ item }">
        <div class="text-center">
          <v-chip size="small" variant="outlined">{{ item.items.length }} items</v-chip>
        </div>
      </template>

      <!-- Total Amount -->
      <template #[`item.totalAmount`]="{ item }">
        <div class="text-right">
          <div class="font-weight-bold">
            {{ formatCurrency(item.totalAmount) }}
          </div>
          <div v-if="item.isEstimatedTotal" class="text-caption text-warning">Estimated</div>
        </div>
      </template>

      <!-- Order Date -->
      <template #[`item.orderDate`]="{ item }">
        <div class="text-body-2">
          {{ formatDate(item.orderDate) }}
        </div>
        <div v-if="item.expectedDeliveryDate" class="text-caption text-medium-emphasis">
          Expected: {{ formatDate(item.expectedDeliveryDate) }}
        </div>
      </template>

      <!-- Age -->
      <template #[`item.age`]="{ item }">
        <v-chip size="small" :color="getAgeColor(getOrderAge(item))" variant="tonal">
          {{ getOrderAge(item) }}d
        </v-chip>
      </template>

      <!-- Actions -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex align-center justify-center gap-1">
          <!-- View Details -->
          <v-tooltip location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="info"
                @click="viewOrderDetails(item)"
              >
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </template>
            <span>View Details</span>
          </v-tooltip>

          <!-- Edit (только для draft/sent) -->
          <v-tooltip v-if="canEditOrder(item)" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="primary"
                @click="editOrder(item)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
            <span>Edit Order</span>
          </v-tooltip>

          <!-- Send (только для draft) -->
          <v-tooltip v-if="canSendOrder(item)" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="success"
                @click="sendOrder(item)"
              >
                <v-icon>mdi-send</v-icon>
              </v-btn>
            </template>
            <span>Send to Supplier</span>
          </v-tooltip>

          <!-- Start Receipt (только для confirmed/paid) -->
          <v-tooltip v-if="canStartReceipt(item)" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="purple"
                @click="startReceipt(item)"
              >
                <v-icon>mdi-truck-check</v-icon>
              </v-btn>
            </template>
            <span>Start Receipt</span>
          </v-tooltip>

          <!-- More Actions Menu -->
          <v-menu>
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" icon variant="text" size="small" color="grey">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>

            <v-list density="compact" min-width="160">
              <v-list-item
                v-if="canDeleteOrder(item)"
                prepend-icon="mdi-delete"
                title="Delete"
                @click="deleteOrder(item)"
              />

              <v-list-item
                v-if="item.status !== 'cancelled'"
                prepend-icon="mdi-cancel"
                title="Cancel"
                @click="cancelOrder(item)"
              />

              <v-list-item
                prepend-icon="mdi-content-copy"
                title="Duplicate"
                @click="duplicateOrder(item)"
              />

              <v-list-item
                prepend-icon="mdi-download"
                title="Export PDF"
                @click="exportOrder(item)"
              />
            </v-list>
          </v-menu>
        </div>
      </template>

      <!-- Loading state -->
      <template #loading>
        <v-skeleton-loader type="table-row@10" />
      </template>

      <!-- No data state -->
      <template #no-data>
        <div class="text-center pa-4">
          <v-icon icon="mdi-package-variant-closed" size="48" color="grey" class="mb-2" />
          <div class="text-body-1 text-medium-emphasis">No purchase orders found</div>
          <div class="text-body-2 text-medium-emphasis">
            Try adjusting your filters or create orders from requests
          </div>
        </div>
      </template>
    </v-data-table>

    <!-- Order Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="1000px">
      <v-card v-if="selectedOrder">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
          <div>
            <div class="text-h6">{{ selectedOrder.orderNumber }}</div>
            <div class="text-caption opacity-90">Purchase Order Details</div>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-card-text class="pa-0">
          <!-- Order Summary -->
          <div class="pa-4 border-b">
            <v-row>
              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Supplier</div>
                <div class="text-body-1 font-weight-bold">{{ selectedOrder.supplierName }}</div>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Status</div>
                <v-chip size="small" :color="getStatusColor(selectedOrder.status)" variant="flat">
                  {{ getStatusText(selectedOrder.status) }}
                </v-chip>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Payment</div>
                <v-chip
                  size="small"
                  :color="getPaymentStatusColor(selectedOrder.paymentStatus)"
                  variant="flat"
                >
                  {{ getPaymentStatusText(selectedOrder.paymentStatus) }}
                </v-chip>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Total Amount</div>
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(selectedOrder.totalAmount) }}
                </div>
                <div v-if="selectedOrder.isEstimatedTotal" class="text-caption text-warning">
                  Estimated Total
                </div>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Order Date</div>
                <div class="text-body-2">{{ formatDate(selectedOrder.orderDate) }}</div>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Expected Delivery</div>
                <div class="text-body-2">
                  {{
                    selectedOrder.expectedDeliveryDate
                      ? formatDate(selectedOrder.expectedDeliveryDate)
                      : 'Not set'
                  }}
                </div>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Related Requests</div>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="requestId in selectedOrder.requestIds"
                    :key="requestId"
                    size="x-small"
                    variant="outlined"
                  >
                    {{ getRequestNumber(requestId) }}
                  </v-chip>
                </div>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Bill Status</div>
                <v-btn
                  v-if="selectedOrder.billId"
                  color="info"
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-receipt"
                  @click="viewBill(selectedOrder.billId)"
                >
                  View Bill
                </v-btn>
                <div v-else class="text-body-2 text-medium-emphasis">No bill created</div>
              </v-col>

              <v-col cols="12">
                <div class="text-subtitle-2 mb-1">Notes</div>
                <div class="text-body-2">{{ selectedOrder.notes || 'No notes' }}</div>
              </v-col>
            </v-row>
          </div>

          <!-- Items List -->
          <div class="pa-4">
            <div class="text-subtitle-1 font-weight-bold mb-3">
              Order Items ({{ selectedOrder.items.length }})
            </div>

            <v-data-table
              :headers="itemHeaders"
              :items="selectedOrder.items"
              density="compact"
              :items-per-page="-1"
              hide-default-footer
            >
              <template #[`item.pricePerUnit`]="{ item }">
                <div class="text-right">
                  {{ formatCurrency(item.pricePerUnit) }}
                  <div v-if="item.isEstimatedPrice" class="text-caption text-warning">
                    Est. ({{ formatDate(item.lastPriceDate || '') }})
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
                  {{ formatCurrency(selectedOrder.totalAmount) }}
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <!-- Dialog Actions -->
        <v-card-actions class="pa-4 border-t">
          <v-spacer />

          <v-btn
            v-if="canSendOrder(selectedOrder)"
            color="success"
            variant="flat"
            prepend-icon="mdi-send"
            @click="sendOrder(selectedOrder)"
          >
            Send to Supplier
          </v-btn>

          <v-btn
            v-if="canStartReceipt(selectedOrder)"
            color="purple"
            variant="flat"
            prepend-icon="mdi-truck-check"
            @click="startReceipt(selectedOrder)"
          >
            Start Receipt
          </v-btn>

          <v-btn color="grey" variant="outlined" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import type { PurchaseOrder, OrderFilters } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  orders: PurchaseOrder[]
  loading: boolean
}

interface Emits {
  (e: 'edit-order', order: PurchaseOrder): void
  (e: 'send-order', order: PurchaseOrder): void
  (e: 'confirm-order', order: PurchaseOrder): void
  (e: 'start-receipt', order: PurchaseOrder): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES
// =============================================

const {
  filters,
  updateFilters,
  clearFilters,
  formatCurrency,
  getStatusColor,
  getPaymentStatusColor,
  canEditOrder,
  canDeleteOrder,
  canSendOrder,
  canReceiveOrder,
  isReadyForReceipt,
  getOrderAge,
  isOverdueForDelivery
} = usePurchaseOrders()

// =============================================
// LOCAL STATE
// =============================================

const showDetailsDialog = ref(false)
const selectedOrder = ref<PurchaseOrder | null>(null)
const searchQuery = ref('')

// =============================================
// TABLE CONFIGURATION
// =============================================

const headers = [
  { title: 'Order #', key: 'orderNumber', sortable: true, width: '140px' },
  { title: 'Supplier', key: 'supplierName', sortable: true, width: '180px' },
  { title: 'Status', key: 'status', sortable: true, width: '120px' },
  { title: 'Payment', key: 'paymentStatus', sortable: true, width: '140px' },
  { title: 'Items', key: 'itemsCount', sortable: false, width: '80px', align: 'center' },
  { title: 'Total', key: 'totalAmount', sortable: true, width: '120px', align: 'end' },
  { title: 'Order Date', key: 'orderDate', sortable: true, width: '140px' },
  { title: 'Age', key: 'age', sortable: false, width: '80px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '200px', align: 'center' }
]

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
// FILTER OPTIONS
// =============================================

const statusOptions = [
  { title: 'All Statuses', value: 'all' },
  { title: 'Draft', value: 'draft' },
  { title: 'Sent', value: 'sent' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'Cancelled', value: 'cancelled' }
]

const paymentStatusOptions = [
  { title: 'All Payment Statuses', value: 'all' },
  { title: 'Pending', value: 'pending' },
  { title: 'Paid', value: 'paid' }
]

const supplierOptions = computed(() => {
  const suppliers = new Set(props.orders?.map(order => order.supplierName) || [])
  return [
    { title: 'All Suppliers', value: 'all' },
    ...Array.from(suppliers).map(supplier => ({ title: supplier, value: supplier }))
  ]
})

// =============================================
// COMPUTED
// =============================================

const filteredOrders = computed(() => {
  let filtered = props.orders || []

  // Apply filters
  if (filters.value.status && filters.value.status !== 'all') {
    filtered = filtered.filter(order => order.status === filters.value.status)
  }

  if (filters.value.paymentStatus && filters.value.paymentStatus !== 'all') {
    filtered = filtered.filter(order => order.paymentStatus === filters.value.paymentStatus)
  }

  if (filters.value.supplier && filters.value.supplier !== 'all') {
    filtered = filtered.filter(order => order.supplierName === filters.value.supplier)
  }

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.supplierName.toLowerCase().includes(query) ||
        order.notes?.toLowerCase().includes(query)
    )
  }

  return filtered
})

// =============================================
// METHODS
// =============================================

function refreshData() {
  console.log('Refreshing purchase orders data')
}

function handleSearch() {
  // Search is handled by computed property
}

function viewOrderDetails(order: PurchaseOrder) {
  selectedOrder.value = order
  showDetailsDialog.value = true
}

function editOrder(order: PurchaseOrder) {
  emits('edit-order', order)
}

function sendOrder(order: PurchaseOrder) {
  emits('send-order', order)
  showDetailsDialog.value = false
}

function startReceipt(order: PurchaseOrder) {
  emits('start-receipt', order)
  showDetailsDialog.value = false
}

function deleteOrder(order: PurchaseOrder) {
  if (confirm(`Are you sure you want to delete order ${order.orderNumber}?`)) {
    console.log('Delete order:', order.id)
  }
}

function cancelOrder(order: PurchaseOrder) {
  if (confirm(`Are you sure you want to cancel order ${order.orderNumber}?`)) {
    console.log('Cancel order:', order.id)
  }
}

function duplicateOrder(order: PurchaseOrder) {
  console.log('Duplicate order:', order.id)
}

function exportOrder(order: PurchaseOrder) {
  console.log('Export order:', order.id)
}

function viewBill(billId: string) {
  console.log('View bill:', billId)
  // TODO: Integrate with AccountStore
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

function getStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    draft: 'mdi-file-edit',
    sent: 'mdi-send',
    delivered: 'mdi-truck-check',
    cancelled: 'mdi-cancel'
  }
  return iconMap[status] || 'mdi-help-circle'
}

function getPaymentStatusText(paymentStatus: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    paid: 'Paid'
  }
  return statusMap[paymentStatus] || paymentStatus
}

function getPaymentStatusIcon(paymentStatus: string): string {
  const iconMap: Record<string, string> = {
    pending: 'mdi-clock',
    paid: 'mdi-check-circle'
  }
  return iconMap[paymentStatus] || 'mdi-help-circle'
}

function getItemStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    ordered: 'blue',
    received: 'green',
    cancelled: 'red'
  }
  return colorMap[status] || 'grey'
}

function getAgeColor(days: number): string {
  if (days <= 1) return 'green'
  if (days <= 3) return 'orange'
  return 'red'
}

function getRequestNumber(requestId: string): string {
  // Mock function - in real app, would get from store
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
</script>

<style lang="scss" scoped>
.purchase-order-table {
  .v-data-table {
    border-radius: 8px;
  }
}

.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

// Status chip animations
.v-chip {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

// Row hover effects
.v-data-table :deep(.v-data-table__tr:hover) {
  background-color: rgb(var(--v-theme-surface-variant), 0.1);
}

// Overdue highlighting
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

// Responsive adjustments
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
