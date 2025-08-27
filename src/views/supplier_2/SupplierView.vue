<!-- src/views/supplier_2/SupplierView.vue - ИСПРАВЛЕННАЯ ВЕРСИЯ -->
<template>
  <div class="supplier-view pa-4">
    <!-- Header with Statistics -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-2">Supplier Management</h1>
        <div class="text-body-1 text-medium-emphasis">
          Complete procurement workflow from requests to storage
        </div>
      </div>

      <div class="d-flex gap-2">
        <v-btn
          color="success"
          prepend-icon="mdi-robot"
          :loading="isLoadingValue"
          @click="showOrderAssistant = true"
        >
          🤖 Order Assistant
        </v-btn>

        <v-btn
          color="info"
          prepend-icon="mdi-information"
          variant="outlined"
          @click="showInfoDialog = true"
        >
          About Workflow
        </v-btn>
      </div>
    </div>

    <!-- Statistics Cards -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4 text-center">
          <v-icon icon="mdi-file-document" size="32" color="primary" class="mb-2" />
          <div class="text-h6 font-weight-bold">{{ statisticsComputed.totalRequests }}</div>
          <div class="text-body-2 text-medium-emphasis">Total Requests</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4 text-center">
          <v-icon icon="mdi-cart" size="32" color="info" class="mb-2" />
          <div class="text-h6 font-weight-bold">{{ statisticsComputed.totalOrders }}</div>
          <div class="text-body-2 text-medium-emphasis">Total Orders</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4 text-center">
          <v-icon icon="mdi-truck-check" size="32" color="success" class="mb-2" />
          <div class="text-h6 font-weight-bold">{{ statisticsComputed.totalReceipts }}</div>
          <div class="text-body-2 text-medium-emphasis">Total Receipts</div>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4 text-center">
          <v-icon
            icon="mdi-alert"
            size="32"
            :color="statisticsComputed.urgentSuggestions > 0 ? 'error' : 'grey'"
            class="mb-2"
          />
          <div class="text-h6 font-weight-bold">{{ statisticsComputed.urgentSuggestions }}</div>
          <div class="text-body-2 text-medium-emphasis">Urgent Items</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Content -->
    <v-card>
      <v-tabs v-model="selectedTab" bg-color="primary">
        <v-tab value="requests" prepend-icon="mdi-file-document">
          Requests
          <v-chip
            v-if="submittedRequestsArray.length > 0"
            size="small"
            color="warning"
            class="ml-2"
          >
            {{ submittedRequestsArray.length }}
          </v-chip>
        </v-tab>

        <v-tab value="orders" prepend-icon="mdi-cart">
          Orders
          <v-chip v-if="draftOrdersArray.length > 0" size="small" color="info" class="ml-2">
            {{ draftOrdersArray.length }} draft
          </v-chip>
        </v-tab>

        <v-tab value="receipts" prepend-icon="mdi-truck-check">
          Receipts
          <v-chip v-if="pendingReceiptsArray.length > 0" size="small" color="success" class="ml-2">
            {{ pendingReceiptsArray.length }} pending
          </v-chip>
        </v-tab>
      </v-tabs>

      <v-tabs-window v-model="selectedTab">
        <!-- Requests Tab -->
        <v-tabs-window-item value="requests">
          <procurement-request-table
            :requests="requestsArray"
            :orders="ordersArray"
            :loading="isLoadingValue"
            @edit-request="handleEditRequest"
            @submit-request="handleSubmitRequest"
            @delete-request="handleDeleteRequest"
            @create-order="handleCreateOrderFromRequest"
            @go-to-order="handleGoToOrder"
            @selection-change="selectedRequestIds = $event"
          />

          <!-- Action Bar for Requests -->
          <div v-if="selectedRequestIds.length > 0" class="pa-4 bg-surface border-t">
            <div class="d-flex align-center justify-space-between">
              <div class="text-body-2 text-medium-emphasis">
                {{ selectedRequestIds.length }} requests selected
              </div>
              <v-btn
                color="primary"
                prepend-icon="mdi-cart-plus"
                @click="showSupplierBaskets = true"
              >
                Create Orders
              </v-btn>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="requestsArray.length === 0 && !isLoadingValue" class="text-center pa-8">
            <v-icon icon="mdi-file-document-outline" size="64" color="grey" class="mb-4" />
            <div class="text-h6 mb-2">No Requests</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Use Order Assistant to create procurement requests
            </div>
            <v-btn color="success" prepend-icon="mdi-robot" @click="showOrderAssistant = true">
              🤖 Start Order Assistant
            </v-btn>
          </div>
        </v-tabs-window-item>

        <!-- Orders Tab -->
        <v-tabs-window-item value="orders">
          <purchase-order-table
            :orders="ordersArray"
            :loading="isLoadingValue"
            :highlighted-order-id="highlightedOrderId"
            @edit-order="handleEditOrder"
            @view-order="handleViewOrder"
            @send-order="handleSendOrder"
            @confirm-order="handleConfirmOrder"
            @start-receipt="handleStartReceipt"
          />

          <!-- Empty State -->
          <div v-if="ordersArray.length === 0 && !isLoadingValue" class="text-center pa-8">
            <v-icon icon="mdi-cart-outline" size="64" color="grey" class="mb-4" />
            <div class="text-h6 mb-2">No Orders</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Create orders from submitted requests
            </div>
          </div>
        </v-tabs-window-item>

        <!-- Receipts Tab -->
        <v-tabs-window-item value="receipts">
          <receipt-table
            :receipts="receiptsArray"
            :loading="isLoadingValue"
            @view-details="handleViewReceiptDetails"
            @edit-receipt="handleEditReceipt"
            @complete-receipt="handleCompleteReceipt"
            @view-storage="handleViewStorage"
          />

          <!-- Empty State -->
          <div v-if="receiptsArray.length === 0 && !isLoadingValue" class="text-center pa-8">
            <v-icon icon="mdi-truck-check-outline" size="64" color="grey" class="mb-4" />
            <div class="text-h6 mb-2">No Receipts</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Start receiving orders to create receipts
            </div>
          </div>
        </v-tabs-window-item>
      </v-tabs-window>
    </v-card>

    <!-- Dialogs -->
    <base-order-assistant
      v-model="showOrderAssistant"
      @success="handleOrderAssistantSuccess"
      @error="handleError"
    />

    <base-supplier-baskets
      v-model="showSupplierBaskets"
      :request-ids="selectedRequestIds"
      @success="showSuccess"
      @error="handleError"
      @order-created="handleOrdersCreated"
    />

    <!-- ✅ ИСПРАВЛЕНО: Receipt Dialog с правильными обработчиками -->
    <base-receipt-dialog
      v-model="showReceiptDialog"
      :order="selectedOrder"
      :receipt="selectedReceipt"
      @success="handleReceiptSuccess"
      @error="handleError"
    />

    <!-- ✅ НОВОЕ: Receipt Details Dialog -->
    <receipt-details-dialog
      v-model="showReceiptDetailsDialog"
      :receipt="selectedReceipt"
      @edit-receipt="handleEditReceiptFromDetails"
      @complete-receipt="handleCompleteReceipt"
      @view-storage="handleViewStorage"
    />

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccessSnackbar" color="success" timeout="3000" location="top">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showErrorSnackbar" color="error" timeout="5000" location="top">
      <v-icon icon="mdi-alert-circle" class="mr-2" />
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showErrorSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>

    <!-- Info Dialog -->
    <v-dialog v-model="showInfoDialog" max-width="700px">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-information" color="info" class="mr-2" />
          About Supplier Workflow
        </v-card-title>

        <v-card-text class="pa-6">
          <div class="mb-4">
            <h4 class="mb-2">Complete Procurement Workflow:</h4>
            <ol class="text-body-2">
              <li>
                <strong>Order Assistant:</strong>
                Analyzes stock levels and suggests items to order
              </li>
              <li>
                <strong>Procurement Request:</strong>
                Created from suggestions or manually
              </li>
              <li>
                <strong>Purchase Order:</strong>
                Groups requests by supplier with prices
              </li>
              <li>
                <strong>Receipt:</strong>
                Records delivered items and integrates with storage
              </li>
            </ol>
          </div>

          <v-alert type="info" variant="tonal">
            This system automatically integrates with Storage Store to track inventory and Products
            Store to update costs based on actual purchase prices.
          </v-alert>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="showInfoDialog = false">Got it</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupplierStore } from '@/stores/supplier_2/supplierStore'
import { useReceipts } from '@/stores/supplier_2/composables/useReceipts'
import type { ProcurementRequest, PurchaseOrder, Receipt } from '@/stores/supplier_2/types'

// Components
import BaseOrderAssistant from './components/shared/BaseOrderAssistant.vue'
import BaseSupplierBaskets from './components/orders/BaseSupplierBaskets.vue'
import BaseReceiptDialog from './components/receipts/BaseReceiptDialog.vue'
import ReceiptDetailsDialog from './components/receipts/ReceiptDetailsDialog.vue'
import ProcurementRequestTable from './components/procurement/ProcurementRequestTable.vue'
import PurchaseOrderTable from './components/orders/PurchaseOrderTable.vue'
import ReceiptTable from './components/receipts/ReceiptTable.vue'

const MODULE_NAME = 'SupplierView'

// =============================================
// STORE & COMPOSABLES
// =============================================

const supplierStore = useSupplierStore()
const { completeReceipt } = useReceipts()

// =============================================
// STATE
// =============================================

const selectedTab = ref('requests')
const showOrderAssistant = ref(false)
const showSupplierBaskets = ref(false)
const showReceiptDialog = ref(false)
const showReceiptDetailsDialog = ref(false) // ✅ НОВОЕ
const showInfoDialog = ref(false)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Selected items for operations
const selectedRequestIds = ref<string[]>([])
const selectedOrder = ref<PurchaseOrder | null>(null)
const selectedReceipt = ref<Receipt | null>(null) // ✅ НОВОЕ

// Подсветка заказа при переходе
const highlightedOrderId = ref<string | null>(null)

// =============================================
// COMPUTED - Безопасные computed свойства
// =============================================

const requestsArray = computed(() => {
  return Array.isArray(supplierStore.state.requests) ? supplierStore.state.requests : []
})

const ordersArray = computed(() => {
  return Array.isArray(supplierStore.state.orders) ? supplierStore.state.orders : []
})

const receiptsArray = computed(() => {
  return Array.isArray(supplierStore.state.receipts) ? supplierStore.state.receipts : []
})

const submittedRequestsArray = computed(() => {
  return requestsArray.value.filter(request => request.status === 'submitted')
})

const draftOrdersArray = computed(() => {
  return ordersArray.value.filter(order => order.status === 'draft')
})

const pendingReceiptsArray = computed(() => {
  return receiptsArray.value.filter(receipt => receipt.status === 'draft')
})

const statisticsComputed = computed(() => {
  const stats = supplierStore.statistics || {}
  return {
    totalRequests: stats.totalRequests || 0,
    pendingRequests: stats.pendingRequests || 0,
    totalOrders: stats.totalOrders || 0,
    ordersAwaitingPayment: stats.ordersAwaitingPayment || 0,
    ordersAwaitingDelivery: stats.ordersAwaitingDelivery || 0,
    totalReceipts: stats.totalReceipts || 0,
    pendingReceipts: stats.pendingReceipts || 0,
    urgentSuggestions: stats.urgentSuggestions || 0
  }
})

const isLoadingValue = computed(() => {
  return supplierStore.isLoading || false
})

// =============================================
// UTILITY METHODS
// =============================================

function showSuccess(message: string) {
  successMessage.value = message
  showSuccessSnackbar.value = true
}

function handleError(error: string | Error) {
  const message = typeof error === 'string' ? error : error.message
  console.error(`${MODULE_NAME}: Error -`, message)
  errorMessage.value = message
  showErrorSnackbar.value = true
}

// =============================================
// EVENT HANDLERS - General
// =============================================

function handleOrderAssistantSuccess(message: string) {
  showSuccess(message)
  showOrderAssistant.value = false

  // If we have submitted requests, show option to create orders
  if (submittedRequestsArray.value.length > 0) {
    setTimeout(() => {
      showSuccess(`${submittedRequestsArray.value.length} requests ready for order creation`)
    }, 1000)
  }
}

function handleOrdersCreated(orderIds: string[]) {
  showSuccess(`${orderIds.length} orders created successfully`)
  showSupplierBaskets.value = false
  selectedRequestIds.value = []
  selectedTab.value = 'orders'
}

function handleReceiptSuccess(message: string) {
  showSuccess(message)
  showReceiptDialog.value = false
  selectedOrder.value = null
  selectedReceipt.value = null
}

// =============================================
// EVENT HANDLERS - Requests
// =============================================

function handleEditRequest(request: ProcurementRequest) {
  console.log(`${MODULE_NAME}: Edit request`, request.id)
  showSuccess(`Edit request ${request.requestNumber} - TODO: Implement`)
}

function handleSubmitRequest(request: ProcurementRequest) {
  console.log(`${MODULE_NAME}: Submit request`, request.id)
  showSuccess(`Submit request ${request.requestNumber} - TODO: Implement`)
}

function handleDeleteRequest(request: ProcurementRequest) {
  console.log(`${MODULE_NAME}: Delete request`, request.id)
  showSuccess(`Delete request ${request.requestNumber} - TODO: Implement`)
}

function handleCreateOrderFromRequest(request: ProcurementRequest) {
  console.log(`${MODULE_NAME}: Create order from request`, request.id)
  selectedRequestIds.value = [request.id]
  showSupplierBaskets.value = true
}

function handleGoToOrder(orderId: string) {
  console.log(`${MODULE_NAME}: Navigating to order ${orderId}`)
  selectedTab.value = 'orders'
  highlightedOrderId.value = orderId

  setTimeout(() => {
    highlightedOrderId.value = null
  }, 3000)

  const order = ordersArray.value.find(o => o.id === orderId)
  const orderNumber = order ? order.orderNumber : orderId.slice(-8)
  showSuccess(`Found order ${orderNumber}`)
}

// =============================================
// EVENT HANDLERS - Orders
// =============================================

function handleEditOrder(order: PurchaseOrder) {
  console.log(`${MODULE_NAME}: Edit order`, order.id)
  showSuccess(`Edit order ${order.orderNumber} - TODO: Implement`)
}

function handleViewOrder(order: PurchaseOrder) {
  console.log(`${MODULE_NAME}: View order`, order.id)
  showSuccess(`View order ${order.orderNumber} - TODO: Implement`)
}

function handleSendOrder(order: PurchaseOrder) {
  console.log(`${MODULE_NAME}: Send order`, order.id)
  showSuccess(`Send order ${order.orderNumber} - TODO: Implement`)
}

function handleConfirmOrder(order: PurchaseOrder) {
  console.log(`${MODULE_NAME}: Confirm order`, order.id)
  showSuccess(`Confirm order ${order.orderNumber} - TODO: Implement`)
}

function handleStartReceipt(order: PurchaseOrder) {
  console.log(`${MODULE_NAME}: Start receipt for order`, order.id)
  selectedOrder.value = order
  selectedReceipt.value = null // Новый receipt
  showReceiptDialog.value = true
}

// =============================================
// ✅ EVENT HANDLERS - Receipts (ИСПРАВЛЕННЫЕ)
// =============================================

function handleViewReceiptDetails(receipt: Receipt) {
  console.log(`${MODULE_NAME}: View receipt details`, receipt.id)
  selectedReceipt.value = receipt
  showReceiptDetailsDialog.value = true
}

function handleEditReceipt(receipt: Receipt) {
  console.log(`${MODULE_NAME}: Edit receipt`, receipt.id)

  // Находим соответствующий заказ
  const order = ordersArray.value.find(o => o.id === receipt.purchaseOrderId)
  if (!order) {
    handleError(`Order not found for receipt ${receipt.receiptNumber}`)
    return
  }

  selectedOrder.value = order
  selectedReceipt.value = receipt
  showReceiptDialog.value = true
}

function handleEditReceiptFromDetails(receipt: Receipt) {
  // Закрываем details dialog и открываем edit dialog
  showReceiptDetailsDialog.value = false
  handleEditReceipt(receipt)
}

async function handleCompleteReceipt(receipt: Receipt) {
  console.log(`${MODULE_NAME}: Complete receipt`, receipt.id)

  try {
    // Используем composable для завершения поступления
    const completedReceipt = await completeReceipt(receipt.id, 'Receipt completed from UI')

    showSuccess(`Receipt ${completedReceipt.receiptNumber} completed successfully`)

    // Закрываем открытые диалоги
    showReceiptDialog.value = false
    showReceiptDetailsDialog.value = false
    selectedReceipt.value = null
    selectedOrder.value = null

    // Переходим на вкладку receipts чтобы показать обновленный статус
    selectedTab.value = 'receipts'
  } catch (error) {
    console.error(`${MODULE_NAME}: Failed to complete receipt`, error)
    handleError(`Failed to complete receipt: ${error}`)
  }
}

function handleViewStorage(operationId: string) {
  console.log(`${MODULE_NAME}: View storage operation`, operationId)
  // TODO: Интеграция с Storage View
  showSuccess(`Navigate to storage operation ${operationId} - TODO: Implement storage integration`)
}
// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  try {
    console.log(`${MODULE_NAME}: Initializing supplier view`)
    await supplierStore.initialize()
    console.log(`${MODULE_NAME}: Supplier view initialized successfully`)

    // Show urgent suggestions if any
    if (statisticsComputed.value.urgentSuggestions > 0) {
      setTimeout(() => {
        showSuccess(
          `${statisticsComputed.value.urgentSuggestions} urgent stock suggestions available`
        )
      }, 1500)
    }
  } catch (error: any) {
    console.error(`${MODULE_NAME}: Failed to initialize`, error)
    handleError('Failed to initialize supplier management system')
  }
})
</script>

<style lang="scss" scoped>
.supplier-view {
  padding: 24px;
}

.gap-2 {
  gap: 8px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

// Stats styling
.text-h6 {
  line-height: 1.2;
}

// Tab styling
.v-tabs {
  .v-tab {
    text-transform: none;
    font-weight: 500;

    .v-chip {
      margin-left: 8px;
      font-size: 0.75rem;
    }
  }
}

// Empty state styling
.text-center {
  .v-icon {
    opacity: 0.5;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .supplier-view {
    padding: 16px;
  }

  .d-flex.gap-2 {
    flex-direction: column;
    align-items: stretch;

    .v-btn {
      justify-content: center;
    }
  }
}

// Success highlighting for urgent orders
.animate-ready {
  animation: readyPulse 2s infinite;
}

@keyframes readyPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

// Order highlighting
:deep(.v-data-table .v-data-table__td) {
  &.highlighted-order {
    background-color: rgb(var(--v-theme-warning-lighten-4)) !important;
    transition: background-color 0.3s ease;
  }
}
</style>
