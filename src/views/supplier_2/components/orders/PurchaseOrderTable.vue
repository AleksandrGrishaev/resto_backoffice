<!-- src/views/supplier_2/components/orders/PurchaseOrderTable.vue -->
<template>
  <div class="purchase-order-table">
    <!-- Filters Section -->
    <v-card variant="flat" class="mb-4">
      <v-card-text class="pa-3">
        <v-row align="center">
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              density="compact"
              variant="outlined"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.billStatus"
              :items="billStatusOptions"
              label="Bill Status"
              density="compact"
              variant="outlined"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="filters.supplier"
              :items="supplierOptions"
              label="Supplier"
              density="compact"
              variant="outlined"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-text-field
              v-model="searchQuery"
              label="Search orders..."
              prepend-inner-icon="mdi-magnify"
              density="compact"
              variant="outlined"
              clearable
              @input="handleSearch"
            />
          </v-col>
        </v-row>

        <div class="d-flex justify-space-between align-center mt-2">
          <div class="text-caption text-medium-emphasis">
            Showing {{ filteredOrders.length }} of {{ props.orders?.length || 0 }} orders
          </div>
          <v-btn
            variant="text"
            color="primary"
            size="small"
            prepend-icon="mdi-filter-off"
            @click="clearFilters"
          >
            Clear Filters
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Orders Data Table -->
    <v-data-table
      :headers="headers"
      :items="filteredOrders"
      :loading="props.loading"
      density="comfortable"
      :items-per-page="25"
      :items-per-page-options="[25, 50, 100]"
      class="elevation-1"
    >
      <!-- Status Column -->
      <template #[`item.status`]="{ item }">
        <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal">
          <v-icon :icon="getStatusIcon(item.status)" size="14" class="mr-1" />
          {{ getStatusText(item.status) }}
        </v-chip>
      </template>

      <!-- Bill Status Column -->
      <template #[`item.billStatus`]="{ item }">
        <div class="bill-status">
          <v-chip
            :color="getBillStatusColorForOrder(getBillStatusForOrder(item))"
            size="small"
            variant="tonal"
          >
            {{ getBillStatusText(getBillStatusForOrder(item)) }}
          </v-chip>

          <!-- Индикатор проблем -->
          <v-icon
            v-if="
              item.hasShortfall ||
              (item.actualDeliveredAmount && item.actualDeliveredAmount < item.totalAmount)
            "
            color="warning"
            size="small"
            class="ml-1"
          >
            mdi-alert-circle
          </v-icon>
        </div>
      </template>

      <!-- Items Count Column -->

      <template #[`item.itemsCount`]="{ item }">
        <v-chip size="small" variant="outlined">{{ item.items?.length || 0 }}</v-chip>
      </template>

      <template #[`item.originalAmount`]="{ item }">
        {{ formatCurrency(item.originalTotalAmount || item.totalAmount) }}
      </template>
      <!-- Total Amount Column -->
      <template #[`item.deliveredAmount`]="{ item }">
        <div v-if="item.actualDeliveredAmount" class="d-flex flex-column">
          <span>{{ formatCurrency(item.actualDeliveredAmount) }}</span>
          <span
            v-if="hasAmountDifference(item)"
            class="text-caption"
            :class="getAmountDifferenceClass(item)"
          >
            {{ formatAmountDifference(item) }}
          </span>
        </div>
        <span v-else class="text-medium-emphasis">—</span>
      </template>

      <template #[`item.receiptInfo`]="{ item }">
        <v-chip
          v-if="item.hasReceiptDiscrepancies"
          :color="getReceiptDiscrepancyColor(item)"
          size="x-small"
          variant="flat"
        >
          <v-icon icon="mdi-alert-triangle" size="12" class="mr-1" />
          {{ item.receiptDiscrepancies?.length || 0 }}
        </v-chip>
        <v-chip
          v-else-if="item.status === 'delivered'"
          color="success"
          size="x-small"
          variant="flat"
        >
          <v-icon icon="mdi-check" size="12" />
        </v-chip>
        <span v-else class="text-medium-emphasis">—</span>
      </template>

      <!-- Order Date Column -->
      <template #[`item.orderDate`]="{ item }">
        {{ formatDate(item.orderDate) }}
      </template>

      <!-- Age Column -->
      <template #[`item.age`]="{ item }">
        <v-chip size="x-small" :color="getAgeColor(getOrderAge(item))" variant="tonal">
          {{ getOrderAge(item) }}d
        </v-chip>
      </template>

      <!-- Actions Column -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex align-center justify-center gap-1">
          <v-btn
            icon="mdi-eye"
            variant="text"
            size="small"
            color="primary"
            @click="viewOrderDetails(item)"
          >
            <v-icon>mdi-eye</v-icon>
            <v-tooltip activator="parent" location="top">View Details</v-tooltip>
          </v-btn>

          <v-btn
            v-if="canEditOrder(item)"
            icon="mdi-pencil"
            variant="text"
            size="small"
            color="info"
            @click="editOrder(item)"
          >
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="top">Edit Order</v-tooltip>
          </v-btn>

          <v-menu>
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" icon variant="text" size="small" color="grey">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>

            <v-list density="compact" min-width="160">
              <v-list-item
                v-if="canSendOrder(item)"
                prepend-icon="mdi-send"
                title="Send to Supplier"
                @click="sendOrder(item)"
              />

              <v-list-item
                v-if="canReceiveOrder(item) && isReadyForReceipt(item)"
                prepend-icon="mdi-truck-check"
                title="Start Receipt"
                @click="startReceipt(item)"
              />

              <v-divider />

              <v-list-item
                prepend-icon="mdi-content-copy"
                title="Duplicate"
                @click="duplicateOrder(item)"
              />

              <v-list-item prepend-icon="mdi-download" title="Export" @click="exportOrder(item)" />

              <v-divider v-if="canDeleteOrder(item)" />

              <v-list-item
                v-if="canDeleteOrder(item)"
                prepend-icon="mdi-delete"
                title="Delete"
                @click="deleteOrder(item)"
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
          <v-icon icon="mdi-clipboard-list-outline" size="48" color="grey" class="mb-2" />
          <div class="text-body-1 text-medium-emphasis">No purchase orders found</div>
          <div class="text-body-2 text-medium-emphasis">
            Try adjusting your filters or create orders from requests
          </div>
        </div>
      </template>
    </v-data-table>

    <!-- ✅ НОВЫЙ КОМПОНЕНТ: Order Details Dialog -->
    <purchase-order-details-dialog
      v-model="showDetailsDialog"
      :order="selectedOrder"
      @send-order="sendOrder"
      @start-receipt="startReceipt"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import type { PurchaseOrder, BillStatus } from '@/stores/supplier_2/types'
import PurchaseOrderDetailsDialog from './PurchaseOrderDetailsDialog.vue'

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
  canEditOrder,
  canDeleteOrder,
  canSendOrder,
  canReceiveOrder,
  isReadyForReceipt,
  getOrderAge,
  getBillStatusColorForOrder,
  getBillStatusText,
  getBillStatus,
  updateOrderBillStatus,
  updateMultipleOrderBillStatuses,
  refreshAllBillStatuses,
  getOrderPaymentDetails
} = usePurchaseOrders()

// =============================================
// LOCAL STATE (упрощенный - убраны orderBills)
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
  { title: 'Bill Status', key: 'billStatus', sortable: false, width: '160px' },
  { title: 'Items', key: 'itemsCount', sortable: false, width: '80px', align: 'center' },
  { title: 'Original', key: 'originalAmount', sortable: true, width: '120px', align: 'end' },
  { title: 'Delivered', key: 'deliveredAmount', sortable: true, width: '120px', align: 'end' },
  { title: 'Receipt', key: 'receiptInfo', sortable: false, width: '100px' },
  { title: 'Order Date', key: 'orderDate', sortable: true, width: '140px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '200px', align: 'center' }
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

const billStatusOptions = [
  { title: 'All Bill Statuses', value: 'all' },
  { title: 'Not Billed', value: 'not_billed' },
  { title: 'Billed', value: 'billed' },
  { title: 'Partially Paid', value: 'partially_paid' },
  { title: 'Fully Paid', value: 'fully_paid' },
  { title: 'Overdue', value: 'overdue' },
  { title: 'Overpaid', value: 'overpaid' }
]

const supplierOptions = computed(() => {
  const suppliers = new Set(props.orders?.map(order => order.supplierName) || [])
  return [
    { title: 'All Suppliers', value: 'all' },
    ...Array.from(suppliers).map(supplier => ({ title: supplier, value: supplier }))
  ]
})

// =============================================
// COMPUTED PROPERTIES
// =============================================

const filteredOrders = computed(() => {
  let filtered = props.orders || []

  if (filters.value.status && filters.value.status !== 'all') {
    filtered = filtered.filter(order => order.status === filters.value.status)
  }

  if (filters.value.billStatus && filters.value.billStatus !== 'all') {
    filtered = filtered.filter(order => {
      const orderBillStatus = getBillStatusForOrder(order)
      return orderBillStatus === filters.value.billStatus
    })
  }

  if (filters.value.supplier && filters.value.supplier !== 'all') {
    filtered = filtered.filter(order => order.supplierName === filters.value.supplier)
  }

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
function hasAmountDifference(order: PurchaseOrder): boolean {
  if (!order.actualDeliveredAmount || !order.originalTotalAmount) return false
  return Math.abs(order.actualDeliveredAmount - order.originalTotalAmount) > 1
}

function getAmountDifferenceClass(order: PurchaseOrder): string {
  const difference =
    (order.actualDeliveredAmount || 0) - (order.originalTotalAmount || order.totalAmount)
  return difference > 0 ? 'text-warning' : 'text-error'
}

function formatAmountDifference(order: PurchaseOrder): string {
  const difference =
    (order.actualDeliveredAmount || 0) - (order.originalTotalAmount || order.totalAmount)
  const sign = difference > 0 ? '+' : ''
  return `${sign}${formatCurrency(Math.abs(difference))}`
}

function getReceiptDiscrepancyColor(order: PurchaseOrder): string {
  const totalImpact =
    (order.actualDeliveredAmount || 0) - (order.originalTotalAmount || order.totalAmount)
  return totalImpact > 0 ? 'warning' : 'error'
}
function getBillStatusForOrder(order: PurchaseOrder): BillStatus {
  return getBillStatus(order) // используем функцию из usePurchaseOrders
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
}

function startReceipt(order: PurchaseOrder) {
  emits('start-receipt', order)
}

function duplicateOrder(order: PurchaseOrder) {
  console.log('Duplicate order:', order.id)
}

function exportOrder(order: PurchaseOrder) {
  console.log('Export order:', order.id)
}

function deleteOrder(order: PurchaseOrder) {
  console.log('Delete order:', order.id)
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

function getAgeColor(days: number): string {
  if (days <= 1) return 'green'
  if (days <= 3) return 'orange'
  return 'red'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  // ✅ ЗАМЕНИТЬ существующий onMounted на это:
  if (props.orders?.length) {
    try {
      // Фильтруем только заказы, которые могут иметь счета
      const ordersNeedingStatusUpdate = props.orders
        .filter(order => order.status === 'sent')
        .slice(0, 20) // Ограничиваем для производительности
        .map(order => order.id)

      if (ordersNeedingStatusUpdate.length > 0) {
        // Используем батчевое обновление вместо Promise.all
        await updateMultipleOrderBillStatuses(ordersNeedingStatusUpdate)
      }
    } catch (error) {
      console.warn('Failed to update bill statuses:', error)
    }
  }
})
</script>

<style lang="scss" scoped>
.purchase-order-table {
  .v-data-table {
    border-radius: 8px;
  }
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

.bill-status {
  min-height: 24px;
  display: flex;
  align-items: center;
}
</style>
