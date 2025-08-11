<!-- src/views/supplier/components/purchase/PurchaseOrderTable.vue -->
<template>
  <div class="purchase-order-table">
    <!-- Filters and Actions -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search orders..."
          variant="outlined"
          density="compact"
          hide-details
          style="width: 300px"
          clearable
        />

        <v-select
          v-model="supplierFilter"
          :items="supplierOptions"
          label="Supplier"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 200px"
        />

        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 150px"
        />

        <v-select
          v-model="paymentStatusFilter"
          :items="paymentStatusOptions"
          label="Payment"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 140px"
        />

        <v-menu>
          <template #activator="{ props }">
            <v-btn variant="outlined" size="small" prepend-icon="mdi-calendar" v-bind="props">
              Date Range
            </v-btn>
          </template>
          <v-card min-width="300">
            <v-card-text>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="dateFrom"
                    type="date"
                    label="From Date"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="dateTo"
                    type="date"
                    label="To Date"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions>
              <v-btn size="small" @click="clearDateFilter">Clear</v-btn>
              <v-spacer />
              <v-btn color="primary" size="small" @click="applyDateFilter">Apply</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>

        <v-btn
          v-if="hasActiveFilters"
          color="warning"
          variant="outlined"
          size="small"
          prepend-icon="mdi-filter-off"
          @click="clearFilters"
        >
          Clear Filters
        </v-btn>
      </div>

      <div class="d-flex gap-2">
        <v-btn
          color="success"
          variant="outlined"
          prepend-icon="mdi-plus-circle"
          @click="$emit('create-order')"
        >
          New Order
        </v-btn>

        <v-btn color="primary" variant="outlined" prepend-icon="mdi-download" @click="exportOrders">
          Export
        </v-btn>
      </div>
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="mb-3">
      <div class="d-flex align-center gap-2">
        <span class="text-caption text-medium-emphasis">Active filters:</span>

        <v-chip
          v-if="supplierFilter !== 'all'"
          size="small"
          closable
          color="primary"
          @click:close="supplierFilter = 'all'"
        >
          Supplier: {{ getSupplierName(supplierFilter) }}
        </v-chip>

        <v-chip
          v-if="statusFilter !== 'all'"
          size="small"
          closable
          color="info"
          @click:close="statusFilter = 'all'"
        >
          Status: {{ getPurchaseOrderStatusName(statusFilter) }}
        </v-chip>

        <v-chip
          v-if="paymentStatusFilter !== 'all'"
          size="small"
          closable
          color="warning"
          @click:close="paymentStatusFilter = 'all'"
        >
          Payment: {{ getPaymentStatusName(paymentStatusFilter) }}
        </v-chip>

        <v-chip
          v-if="dateFrom || dateTo"
          size="small"
          closable
          color="secondary"
          @click:close="clearDateFilter"
        >
          Date: {{ formatDateRange() }}
        </v-chip>
      </div>
    </div>

    <!-- Quick Stats -->
    <v-row class="mb-4">
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="info">
          <v-card-text class="text-center pa-3">
            <div class="text-h6 font-weight-bold">{{ totalOrders }}</div>
            <div class="text-caption">Total Orders</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="warning">
          <v-card-text class="text-center pa-3">
            <div class="text-h6 font-weight-bold">{{ pendingOrders }}</div>
            <div class="text-caption">Pending</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="success">
          <v-card-text class="text-center pa-3">
            <div class="text-h6 font-weight-bold">{{ deliveredOrders }}</div>
            <div class="text-caption">Delivered</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="primary">
          <v-card-text class="text-center pa-3">
            <div class="text-h6 font-weight-bold">{{ formatCurrency(totalValue) }}</div>
            <div class="text-caption">Total Value</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Table -->
    <v-card>
      <v-data-table
        v-model="selectedOrders"
        :headers="headers"
        :items="filteredOrders"
        :loading="loading"
        :search="searchQuery"
        item-key="id"
        class="elevation-0"
        :items-per-page="15"
        :sort-by="[{ key: 'orderDate', order: 'desc' }]"
        show-select
      >
        <!-- Order Number & Supplier -->
        <template #[`item.orderNumber`]="{ item }">
          <div class="d-flex align-center">
            <div class="order-icon mr-3">
              {{ getSupplierIcon(item.supplierName) }}
            </div>
            <div class="order-info">
              <div class="font-weight-medium">{{ item.orderNumber }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ item.supplierName }}
              </div>
              <div v-if="isOverdue(item)" class="text-caption text-error">
                <v-icon icon="mdi-clock-alert" size="12" class="mr-1" />
                {{ getOverdueDays(item) }} days overdue
              </div>
            </div>
          </div>
        </template>

        <!-- Order Date & Delivery -->
        <template #[`item.orderDate`]="{ item }">
          <div>
            <div class="font-weight-medium">{{ formatDate(item.orderDate) }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ getRelativeTime(item.orderDate) }}
            </div>
            <div v-if="item.expectedDeliveryDate" class="text-caption text-primary">
              <v-icon icon="mdi-truck" size="12" class="mr-1" />
              Expected: {{ formatDate(item.expectedDeliveryDate) }}
            </div>
            <div v-if="item.actualDeliveryDate" class="text-caption text-success">
              <v-icon icon="mdi-check-circle" size="12" class="mr-1" />
              Delivered: {{ formatDate(item.actualDeliveryDate) }}
            </div>
          </div>
        </template>

        <!-- Items & Progress -->
        <template #[`item.items`]="{ item }">
          <div>
            <div class="font-weight-medium">
              {{ item.items.length }} item{{ item.items.length !== 1 ? 's' : '' }}
            </div>

            <!-- Delivery Progress -->
            <div class="mt-1">
              <v-progress-linear
                :model-value="getDeliveryProgress(item)"
                :color="getProgressColor(item)"
                height="4"
                rounded
              />
              <div class="text-caption text-medium-emphasis mt-1">
                {{ getReceivedItems(item) }}/{{ item.items.length }} received
              </div>
            </div>

            <!-- Top items preview -->
            <div class="mt-2">
              <v-chip
                v-for="(previewItem, index) in getItemsPreview(item)"
                :key="index"
                size="x-small"
                variant="outlined"
                color="primary"
                class="mr-1 mb-1"
              >
                {{ previewItem.name }} ({{ previewItem.qty }})
              </v-chip>
              <v-chip v-if="item.items.length > 3" size="x-small" variant="text" color="primary">
                +{{ item.items.length - 3 }} more
              </v-chip>
            </div>
          </div>
        </template>

        <!-- Total Amount -->
        <template #[`item.totalAmount`]="{ item }">
          <div class="text-right">
            <div class="font-weight-bold text-h6">{{ formatCurrency(item.totalAmount) }}</div>
            <div v-if="item.taxAmount" class="text-caption text-medium-emphasis">
              Tax: {{ formatCurrency(item.taxAmount) }}
            </div>
            <div v-if="item.discountAmount" class="text-caption text-success">
              Discount: -{{ formatCurrency(item.discountAmount) }}
            </div>
          </div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip :color="getPurchaseOrderStatusColor(item.status)" size="small" variant="flat">
            <v-icon :icon="getStatusIcon(item.status)" size="14" class="mr-1" />
            {{ getPurchaseOrderStatusName(item.status) }}
          </v-chip>
        </template>

        <!-- Payment Status -->
        <template #[`item.paymentStatus`]="{ item }">
          <div>
            <v-chip :color="getPaymentStatusColor(item.paymentStatus)" size="small" variant="tonal">
              <v-icon :icon="getPaymentIcon(item.paymentStatus)" size="14" class="mr-1" />
              {{ getPaymentStatusName(item.paymentStatus) }}
            </v-chip>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ getPaymentTermsName(item.paymentTerms) }}
            </div>
          </div>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center gap-1">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-eye"
              @click="viewOrderDetails(item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">View Details</v-tooltip>
            </v-btn>

            <v-btn
              v-if="canEdit(item)"
              size="small"
              variant="text"
              color="warning"
              icon="mdi-pencil"
              @click="$emit('edit-order', item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">Edit Order</v-tooltip>
            </v-btn>

            <v-menu>
              <template #activator="{ props }">
                <v-btn
                  size="small"
                  variant="text"
                  color="info"
                  icon="mdi-dots-vertical"
                  v-bind="props"
                >
                  <v-icon />
                  <v-tooltip activator="parent" location="top">More Actions</v-tooltip>
                </v-btn>
              </template>

              <v-list density="compact">
                <v-list-item v-if="canSend(item)" @click="sendOrder(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-send" class="mr-2" />
                    Send to Supplier
                  </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="canConfirm(item)" @click="confirmOrder(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-check-circle" class="mr-2" />
                    Mark as Confirmed
                  </v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-if="canStartAcceptance(item)"
                  @click="$emit('start-acceptance', item)"
                >
                  <v-list-item-title>
                    <v-icon icon="mdi-truck-check" class="mr-2" />
                    Start Acceptance
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="duplicateOrder(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-content-copy" class="mr-2" />
                    Duplicate Order
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="exportOrderPdf(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-file-pdf-box" class="mr-2" />
                    Export PDF
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="trackDelivery(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-map-marker-path" class="mr-2" />
                    Track Delivery
                  </v-list-item-title>
                </v-list-item>

                <v-divider />

                <v-list-item v-if="canCancel(item)" class="text-error" @click="cancelOrder(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-cancel" class="mr-2" />
                    Cancel Order
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-package-variant-off" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">
              {{ hasActiveFilters ? 'No orders match filters' : 'No purchase orders found' }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{
                hasActiveFilters
                  ? 'Try adjusting or clearing your filters'
                  : 'Create your first purchase order from procurement requests'
              }}
            </div>
            <div v-if="hasActiveFilters" class="d-flex justify-center gap-2">
              <v-btn size="small" variant="outlined" @click="clearFilters">Clear Filters</v-btn>
            </div>
            <div v-else class="d-flex justify-center gap-2">
              <v-btn color="success" variant="flat" @click="$emit('create-order')">
                <v-icon icon="mdi-plus-circle" class="mr-2" />
                Create Order
              </v-btn>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-2" />
            <div>Loading purchase orders...</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Bulk Actions (when orders are selected) -->
    <v-expand-transition>
      <v-card v-if="selectedOrders.length > 0" variant="tonal" color="primary" class="mt-4">
        <v-card-text class="d-flex align-center justify-space-between">
          <div>
            <div class="font-weight-medium">
              {{ selectedOrders.length }} order{{ selectedOrders.length !== 1 ? 's' : '' }}
              selected
            </div>
            <div class="text-caption">
              Total value: {{ formatCurrency(getSelectedOrdersValue()) }}
            </div>
          </div>

          <div class="d-flex gap-2">
            <v-btn
              color="success"
              variant="outlined"
              size="small"
              prepend-icon="mdi-send"
              :disabled="!canBulkSend"
              @click="bulkSendOrders"
            >
              Send Orders
            </v-btn>

            <v-btn
              color="info"
              variant="outlined"
              size="small"
              prepend-icon="mdi-check-circle"
              :disabled="!canBulkConfirm"
              @click="bulkConfirmOrders"
            >
              Confirm Orders
            </v-btn>

            <v-btn
              color="warning"
              variant="outlined"
              size="small"
              prepend-icon="mdi-file-pdf-box"
              @click="bulkExportPdf"
            >
              Export PDFs
            </v-btn>

            <v-btn
              color="error"
              variant="outlined"
              size="small"
              prepend-icon="mdi-cancel"
              :disabled="!canBulkCancel"
              @click="bulkCancelOrders"
            >
              Cancel Orders
            </v-btn>

            <v-btn variant="text" size="small" @click="selectedOrders = []">Clear Selection</v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-expand-transition>

    <!-- Order Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="1000px" scrollable>
      <v-card v-if="selectedOrder">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <h3>{{ selectedOrder.orderNumber }}</h3>
            <div class="text-caption text-medium-emphasis">
              {{ selectedOrder.supplierName }}
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6" style="max-height: 700px">
          <!-- Order Info -->
          <v-row class="mb-4">
            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Order Date</div>
              <div class="font-weight-medium">{{ formatDateTime(selectedOrder.orderDate) }}</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Status</div>
              <v-chip
                :color="getPurchaseOrderStatusColor(selectedOrder.status)"
                size="small"
                variant="flat"
              >
                {{ getPurchaseOrderStatusName(selectedOrder.status) }}
              </v-chip>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Payment Status</div>
              <v-chip
                :color="getPaymentStatusColor(selectedOrder.paymentStatus)"
                size="small"
                variant="tonal"
              >
                {{ getPaymentStatusName(selectedOrder.paymentStatus) }}
              </v-chip>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Total Amount</div>
              <div class="text-h6 font-weight-bold">
                {{ formatCurrency(selectedOrder.totalAmount) }}
              </div>
            </v-col>
          </v-row>

          <!-- Delivery Info -->
          <v-row
            v-if="selectedOrder.expectedDeliveryDate || selectedOrder.actualDeliveryDate"
            class="mb-4"
          >
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Expected Delivery</div>
              <div class="font-weight-medium">
                {{
                  selectedOrder.expectedDeliveryDate
                    ? formatDateTime(selectedOrder.expectedDeliveryDate)
                    : 'Not set'
                }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Actual Delivery</div>
              <div class="font-weight-medium">
                {{
                  selectedOrder.actualDeliveryDate
                    ? formatDateTime(selectedOrder.actualDeliveryDate)
                    : 'Not delivered'
                }}
              </div>
            </v-col>
          </v-row>

          <!-- Items List -->
          <div class="mb-4">
            <h4 class="mb-3">Order Items</h4>
            <v-card
              v-for="item in selectedOrder.items"
              :key="item.id"
              variant="outlined"
              class="mb-2"
            >
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="font-weight-medium">{{ item.itemName }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Status:
                      <v-chip
                        :color="getItemStatusColor(item.status)"
                        size="x-small"
                        variant="flat"
                      >
                        {{ item.status.replace('_', ' ').toUpperCase() }}
                      </v-chip>
                    </div>
                    <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                      <v-icon icon="mdi-note-text" size="12" class="mr-1" />
                      {{ item.notes }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-bold">
                      {{ item.orderedQuantity }} {{ item.unit }}
                      <span v-if="item.receivedQuantity !== undefined">
                        ({{ item.receivedQuantity }} received)
                      </span>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatCurrency(item.pricePerUnit) }} per {{ item.unit }}
                    </div>
                    <div class="font-weight-medium text-primary">
                      Total: {{ formatCurrency(item.totalPrice) }}
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Notes -->
          <div v-if="selectedOrder.notes" class="mb-4">
            <h4 class="mb-2">Notes</h4>
            <v-card variant="tonal" color="info">
              <v-card-text>{{ selectedOrder.notes }}</v-card-text>
            </v-card>
          </div>

          <!-- Related Requests -->
          <div v-if="selectedOrder.requestIds.length > 0">
            <h4 class="mb-2">Related Procurement Requests</h4>
            <v-chip
              v-for="requestId in selectedOrder.requestIds"
              :key="requestId"
              color="info"
              variant="tonal"
              size="small"
              class="mr-1"
            >
              <v-icon icon="mdi-clipboard-list" size="12" class="mr-1" />
              {{ requestId }}
            </v-chip>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" @click="showDetailsDialog = false">Close</v-btn>
          <v-btn
            v-if="canEdit(selectedOrder)"
            color="warning"
            variant="flat"
            @click="handleEditOrder"
          >
            Edit Order
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getPurchaseOrderStatusName,
  getPurchaseOrderStatusColor,
  getPaymentStatusName,
  getPaymentStatusColor,
  getPaymentTermsName,
  PURCHASE_ORDER_STATUSES,
  PAYMENT_STATUSES
} from '@/stores/supplier'
import type { PurchaseOrder } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PurchaseOrderTable'

// Props
interface Props {
  orders: PurchaseOrder[]
  loading: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'edit-order': [order: PurchaseOrder]
  'start-acceptance': [order: PurchaseOrder]
  'create-order': []
}>()

// Store
const supplierStore = useSupplierStore()

// State
const searchQuery = ref('')
const supplierFilter = ref('all')
const statusFilter = ref('all')
const paymentStatusFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const selectedOrders = ref<PurchaseOrder[]>([])

const showDetailsDialog = ref(false)
const selectedOrder = ref<PurchaseOrder | null>(null)

// Options
const supplierOptions = computed(() => [
  { title: 'All Suppliers', value: 'all' },
  ...Array.from(new Set(props.orders.map(o => o.supplierName))).map(name => ({
    title: name,
    value: name
  }))
])

const statusOptions = [
  { title: 'All Statuses', value: 'all' },
  ...Object.entries(PURCHASE_ORDER_STATUSES).map(([value, title]) => ({ title, value }))
]

const paymentStatusOptions = [
  { title: 'All Payment Status', value: 'all' },
  ...Object.entries(PAYMENT_STATUSES).map(([value, title]) => ({ title, value }))
]

// Computed
const headers = computed(() => [
  { title: 'Order', key: 'orderNumber', sortable: true, width: '220px' },
  { title: 'Date & Delivery', key: 'orderDate', sortable: true, width: '180px' },
  { title: 'Items & Progress', key: 'items', sortable: false, width: '250px' },
  { title: 'Amount', key: 'totalAmount', sortable: true, width: '150px' },
  { title: 'Status', key: 'status', sortable: true, width: '130px' },
  { title: 'Payment', key: 'paymentStatus', sortable: true, width: '140px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
])

const filteredOrders = computed(() => {
  let orders = [...props.orders]

  // Supplier filter
  if (supplierFilter.value !== 'all') {
    orders = orders.filter(o => o.supplierName === supplierFilter.value)
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    orders = orders.filter(o => o.status === statusFilter.value)
  }

  // Payment status filter
  if (paymentStatusFilter.value !== 'all') {
    orders = orders.filter(o => o.paymentStatus === paymentStatusFilter.value)
  }

  // Date range filter
  if (dateFrom.value) {
    orders = orders.filter(o => new Date(o.orderDate) >= new Date(dateFrom.value))
  }
  if (dateTo.value) {
    orders = orders.filter(o => new Date(o.orderDate) <= new Date(dateTo.value))
  }

  return orders
})

const hasActiveFilters = computed(
  () =>
    supplierFilter.value !== 'all' ||
    statusFilter.value !== 'all' ||
    paymentStatusFilter.value !== 'all' ||
    dateFrom.value ||
    dateTo.value
)

// Stats
const totalOrders = computed(() => filteredOrders.value.length)
const pendingOrders = computed(
  () =>
    filteredOrders.value.filter(o =>
      ['draft', 'sent', 'confirmed', 'in_transit'].includes(o.status)
    ).length
)
const deliveredOrders = computed(
  () => filteredOrders.value.filter(o => o.status === 'delivered').length
)
const totalValue = computed(() => filteredOrders.value.reduce((sum, o) => sum + o.totalAmount, 0))

// Bulk actions computed
const canBulkSend = computed(() => selectedOrders.value.some(o => o.status === 'draft'))

const canBulkConfirm = computed(() => selectedOrders.value.some(o => o.status === 'sent'))

const canBulkCancel = computed(() =>
  selectedOrders.value.some(o => ['draft', 'sent'].includes(o.status))
)

// Methods
function handleEditOrder() {
  if (selectedOrder.value) {
    emit('edit-order', selectedOrder.value)
    showDetailsDialog.value = false
  }
}

function getSupplierIcon(supplierName: string): string {
  const icons: Record<string, string> = {
    meat: '🥩',
    premium: '⭐',
    fresh: '🌿',
    market: '🏪',
    beverage: '🥤',
    distributor: '🚛',
    dairy: '🥛',
    spice: '🌶️'
  }

  const lowerName = supplierName.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerName.includes(key)) return icon
  }
  return '🏪'
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else {
    return 'Today'
  }
}

function isOverdue(order: PurchaseOrder): boolean {
  if (!order.expectedDeliveryDate || order.status === 'delivered') return false

  const expectedDate = new Date(order.expectedDeliveryDate)
  const now = new Date()

  return now > expectedDate
}

function getOverdueDays(order: PurchaseOrder): number {
  if (!order.expectedDeliveryDate) return 0

  const expectedDate = new Date(order.expectedDeliveryDate)
  const now = new Date()

  return Math.ceil((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24))
}

function getDeliveryProgress(order: PurchaseOrder): number {
  if (order.items.length === 0) return 0

  const receivedItems = order.items.filter(
    item => item.status === 'received' || item.status === 'partially_received'
  ).length

  return (receivedItems / order.items.length) * 100
}

function getProgressColor(order: PurchaseOrder): string {
  const progress = getDeliveryProgress(order)
  if (progress === 100) return 'success'
  if (progress > 0) return 'warning'
  return 'info'
}

function getReceivedItems(order: PurchaseOrder): number {
  return order.items.filter(
    item => item.status === 'received' || item.status === 'partially_received'
  ).length
}

function getItemsPreview(order: PurchaseOrder) {
  return order.items.slice(0, 3).map(item => ({
    name: item.itemName,
    qty: `${item.orderedQuantity} ${item.unit}`
  }))
}

function getStatusIcon(status: string): string {
  const icons = {
    draft: 'mdi-file-document-outline',
    sent: 'mdi-send',
    confirmed: 'mdi-check-circle',
    in_transit: 'mdi-truck',
    delivered: 'mdi-package-variant',
    cancelled: 'mdi-cancel'
  }
  return icons[status as keyof typeof icons] || 'mdi-help'
}

function getPaymentIcon(status: string): string {
  const icons = {
    pending: 'mdi-clock-outline',
    partial: 'mdi-credit-card-clock',
    paid: 'mdi-check-circle'
  }
  return icons[status as keyof typeof icons] || 'mdi-help'
}

function getItemStatusColor(status: string): string {
  const colors = {
    ordered: 'info',
    partially_received: 'warning',
    received: 'success',
    cancelled: 'error'
  }
  return colors[status as keyof typeof colors] || 'default'
}

function getSupplierName(supplierId: string): string {
  const supplier = supplierStore.state.suppliers.find(s => s.id === supplierId)
  return supplier?.name || supplierId
}

function formatDateRange(): string {
  if (dateFrom.value && dateTo.value) {
    return `${formatDate(dateFrom.value)} - ${formatDate(dateTo.value)}`
  } else if (dateFrom.value) {
    return `From ${formatDate(dateFrom.value)}`
  } else if (dateTo.value) {
    return `Until ${formatDate(dateTo.value)}`
  }
  return ''
}

function getSelectedOrdersValue(): number {
  return selectedOrders.value.reduce((sum, order) => sum + order.totalAmount, 0)
}

// Permission checks
function canEdit(order: PurchaseOrder): boolean {
  return order.status === 'draft'
}

function canSend(order: PurchaseOrder): boolean {
  return order.status === 'draft'
}

function canConfirm(order: PurchaseOrder): boolean {
  return order.status === 'sent'
}

function canStartAcceptance(order: PurchaseOrder): boolean {
  return ['confirmed', 'in_transit'].includes(order.status)
}

function canCancel(order: PurchaseOrder): boolean {
  return ['draft', 'sent'].includes(order.status)
}

// Filter methods
function clearFilters() {
  supplierFilter.value = 'all'
  statusFilter.value = 'all'
  paymentStatusFilter.value = 'all'
  dateFrom.value = ''
  dateTo.value = ''
  searchQuery.value = ''
}

function clearDateFilter() {
  dateFrom.value = ''
  dateTo.value = ''
}

function applyDateFilter() {
  // Date filter is applied automatically through computed
}

// Action Methods
function viewOrderDetails(order: PurchaseOrder) {
  selectedOrder.value = order
  showDetailsDialog.value = true

  DebugUtils.info(MODULE_NAME, 'View order details', {
    orderId: order.id,
    orderNumber: order.orderNumber
  })
}

async function sendOrder(order: PurchaseOrder) {
  try {
    // TODO: Implement send order logic via SupplierStore
    DebugUtils.info(MODULE_NAME, 'Send order to supplier', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      supplier: order.supplierName
    })

    // For now, just update status locally
    // await supplierStore.updatePurchaseOrder(order.id, { status: 'sent' })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to send order', { error })
  }
}

async function confirmOrder(order: PurchaseOrder) {
  try {
    DebugUtils.info(MODULE_NAME, 'Confirm order', {
      orderId: order.id,
      orderNumber: order.orderNumber
    })

    // TODO: Implement confirm order logic
    // await supplierStore.updatePurchaseOrder(order.id, { status: 'confirmed' })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to confirm order', { error })
  }
}

async function cancelOrder(order: PurchaseOrder) {
  try {
    DebugUtils.info(MODULE_NAME, 'Cancel order', {
      orderId: order.id,
      orderNumber: order.orderNumber
    })

    // TODO: Implement cancel order logic
    // await supplierStore.updatePurchaseOrder(order.id, { status: 'cancelled' })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to cancel order', { error })
  }
}

function duplicateOrder(order: PurchaseOrder) {
  DebugUtils.info(MODULE_NAME, 'Duplicate order', {
    orderId: order.id,
    orderNumber: order.orderNumber
  })
  // TODO: Implement order duplication
}

function exportOrderPdf(order: PurchaseOrder) {
  DebugUtils.info(MODULE_NAME, 'Export order PDF', {
    orderId: order.id,
    orderNumber: order.orderNumber
  })
  // TODO: Implement PDF export
}

function trackDelivery(order: PurchaseOrder) {
  DebugUtils.info(MODULE_NAME, 'Track delivery', {
    orderId: order.id,
    orderNumber: order.orderNumber
  })
  // TODO: Implement delivery tracking
}

function exportOrders() {
  DebugUtils.info(MODULE_NAME, 'Export all orders', {
    count: filteredOrders.value.length
  })
  // TODO: Implement bulk export
}

// Bulk Actions
async function bulkSendOrders() {
  const draftOrders = selectedOrders.value.filter(o => o.status === 'draft')

  try {
    DebugUtils.info(MODULE_NAME, 'Bulk send orders', {
      count: draftOrders.length,
      orderIds: draftOrders.map(o => o.id)
    })

    // TODO: Implement bulk send
    // await Promise.all(draftOrders.map(o => supplierStore.updatePurchaseOrder(o.id, { status: 'sent' })))
    selectedOrders.value = []
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to bulk send orders', { error })
  }
}

async function bulkConfirmOrders() {
  const sentOrders = selectedOrders.value.filter(o => o.status === 'sent')

  try {
    DebugUtils.info(MODULE_NAME, 'Bulk confirm orders', {
      count: sentOrders.length,
      orderIds: sentOrders.map(o => o.id)
    })

    // TODO: Implement bulk confirm
    selectedOrders.value = []
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to bulk confirm orders', { error })
  }
}

function bulkExportPdf() {
  DebugUtils.info(MODULE_NAME, 'Bulk export PDFs', {
    count: selectedOrders.value.length,
    orderIds: selectedOrders.value.map(o => o.id)
  })

  // TODO: Implement bulk PDF export
}

async function bulkCancelOrders() {
  const cancellableOrders = selectedOrders.value.filter(o => ['draft', 'sent'].includes(o.status))

  try {
    DebugUtils.info(MODULE_NAME, 'Bulk cancel orders', {
      count: cancellableOrders.length,
      orderIds: cancellableOrders.map(o => o.id)
    })

    // TODO: Implement bulk cancel
    selectedOrders.value = []
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to bulk cancel orders', { error })
  }
}
</script>

<style lang="scss" scoped>
.purchase-order-table {
  .gap-2 {
    gap: 8px;
  }

  .order-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 6px;
    flex-shrink: 0;
  }

  .order-info {
    min-width: 0;
    flex: 1;
  }
}

:deep(.v-data-table) {
  .v-data-table__td {
    padding: 8px 16px;
  }

  .v-data-table__th {
    font-weight: 600;
  }
}

:deep(.v-progress-linear) {
  border-radius: 4px;
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
</style>
