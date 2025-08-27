<!-- src/views/supplier_2/SupplierView.vue -->
<template>
  <div class="supplier-view">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h1 class="text-h4 font-weight-bold">🛒 Suppliers & Orders</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          Manage procurement workflow from requests to receipts
        </p>
        <v-chip size="small" color="primary" variant="tonal" class="mt-1">
          <v-icon icon="mdi-workflow" size="14" class="mr-1" />
          Supplier Store v2 - Minimal Workflow
        </v-chip>
      </div>

      <!-- Quick Actions -->
      <div class="d-flex gap-2">
        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-robot"
          @click="showOrderAssistant = true"
        >
          Order Assistant
        </v-btn>

        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-cart-variant"
          :disabled="submittedRequestsArray.length === 0"
          @click="openSupplierBaskets"
        >
          Create Orders
          <v-chip v-if="submittedRequestsArray.length > 0" size="small" color="white" class="ml-2">
            {{ submittedRequestsArray.length }}
          </v-chip>
        </v-btn>

        <!-- Info Button -->
        <v-btn
          color="info"
          variant="text"
          icon="mdi-information-outline"
          @click="showInfoDialog = true"
        >
          <v-tooltip activator="parent" location="bottom">About Supplier Workflow</v-tooltip>
        </v-btn>
      </div>
    </div>

    <!-- Quick Stats Bar -->
    <v-card variant="tonal" color="info" class="mb-4">
      <v-card-text class="pa-4">
        <v-row align="center">
          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold text-primary">
                {{ statisticsComputed.totalRequests }}
              </div>
              <div class="text-caption text-medium-emphasis">Total Requests</div>
            </div>
          </v-col>

          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold text-warning">
                {{ statisticsComputed.pendingRequests }}
              </div>
              <div class="text-caption text-medium-emphasis">Pending Requests</div>
            </div>
          </v-col>

          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold text-success">
                {{ statisticsComputed.totalOrders }}
              </div>
              <div class="text-caption text-medium-emphasis">Total Orders</div>
            </div>
          </v-col>

          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold text-info">
                {{ statisticsComputed.ordersAwaitingDelivery }}
              </div>
              <div class="text-caption text-medium-emphasis">Awaiting Delivery</div>
            </div>
          </v-col>

          <v-col cols="6" md="2">
            <div class="text-center">
              <div class="text-h6 font-weight-bold text-purple">
                {{ statisticsComputed.totalReceipts }}
              </div>
              <div class="text-caption text-medium-emphasis">Receipts</div>
            </div>
          </v-col>

          <v-col cols="6" md="2">
            <div class="text-center">
              <div
                class="text-h6 font-weight-bold"
                :class="
                  statisticsComputed.urgentSuggestions > 0
                    ? 'text-error animate-ready'
                    : 'text-grey'
                "
              >
                {{ statisticsComputed.urgentSuggestions }}
              </div>
              <div class="text-caption text-medium-emphasis">Urgent Orders</div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Tabs -->
    <v-card>
      <v-tabs v-model="selectedTab" color="primary" align-tabs="start">
        <v-tab value="requests" prepend-icon="mdi-clipboard-list">
          Requests
          <v-chip
            v-if="submittedRequestsArray.length > 0"
            size="x-small"
            color="warning"
            class="ml-2"
          >
            {{ submittedRequestsArray.length }}
          </v-chip>
        </v-tab>

        <v-tab value="orders" prepend-icon="mdi-cart">
          Orders
          <v-chip v-if="draftOrdersArray.length > 0" size="x-small" color="info" class="ml-2">
            {{ draftOrdersArray.length }} draft
          </v-chip>
        </v-tab>

        <v-tab value="receipts" prepend-icon="mdi-truck-check">
          Receipts
          <v-chip
            v-if="pendingReceiptsArray.length > 0"
            size="x-small"
            color="success"
            class="ml-2"
          >
            {{ pendingReceiptsArray.length }} pending
          </v-chip>
        </v-tab>
      </v-tabs>

      <v-divider />

      <!-- Tab Content -->
      <v-tabs-window v-model="selectedTab">
        <!-- Requests Tab -->
        <v-tabs-window-item value="requests">
          <procurement-request-table
            v-if="requestsArray.length > 0"
            :requests="requestsArray"
            :orders="ordersArray"
            :loading="isLoadingValue"
            @edit-request="handleEditRequest"
            @submit-request="handleSubmitRequest"
            @delete-request="handleDeleteRequest"
            @create-order="handleCreateOrderFromRequest"
            @go-to-order="handleGoToOrder"
          />

          <div v-else class="text-center pa-8">
            <v-icon icon="mdi-clipboard-list-outline" size="64" color="grey" class="mb-4" />
            <div class="text-h6 mb-2">No Procurement Requests</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Start by using Order Assistant to create procurement requests
            </div>
            <v-btn
              color="success"
              variant="flat"
              prepend-icon="mdi-robot"
              @click="showOrderAssistant = true"
            >
              Open Order Assistant
            </v-btn>
          </div>
        </v-tabs-window-item>

        <!-- Orders Tab -->
        <v-tabs-window-item value="orders">
          <purchase-order-table
            v-if="ordersArray.length > 0"
            :orders="ordersArray"
            :highlighted-order-id="highlightedOrderId"
            :loading="isLoadingValue"
            @edit-order="handleEditOrder"
            @view-order="handleViewOrder"
            @send-order="handleSendOrder"
            @confirm-order="handleConfirmOrder"
            @start-receipt="handleStartReceipt"
          />

          <div v-else class="text-center pa-8">
            <v-icon icon="mdi-cart-outline" size="64" color="grey" class="mb-4" />
            <div class="text-h6 mb-2">No Purchase Orders</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Create orders from submitted procurement requests
            </div>
            <v-btn
              color="primary"
              variant="flat"
              prepend-icon="mdi-cart-plus"
              :disabled="submittedRequestsArray.length === 0"
              @click="openSupplierBaskets"
            >
              Create Orders
            </v-btn>
          </div>
        </v-tabs-window-item>

        <!-- Receipts Tab -->
        <v-tabs-window-item value="receipts">
          <receipt-table
            v-if="receiptsArray.length > 0"
            :receipts="receiptsArray"
            :loading="isLoadingValue"
            @view-details="handleViewReceipt"
            @edit-receipt="handleEditReceipt"
            @complete-receipt="handleCompleteReceipt"
          />

          <div v-else class="text-center pa-8">
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

    <base-receipt-dialog
      v-model="showReceiptDialog"
      :order="selectedOrder"
      @success="handleReceiptSuccess"
      @error="handleError"
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
                Creates formal request for supplies
              </li>
              <li>
                <strong>Supplier Assignment:</strong>
                Groups items by supplier for efficient ordering
              </li>
              <li>
                <strong>Purchase Order:</strong>
                Creates orders with auto-filled prices from history
              </li>
              <li>
                <strong>Payment Integration:</strong>
                Automatically creates bills in Account Store
              </li>
              <li>
                <strong>Receipt Process:</strong>
                Compares ordered vs received quantities and prices
              </li>
              <li>
                <strong>Storage Integration:</strong>
                Updates inventory with FIFO tracking
              </li>
            </ol>
          </div>

          <div class="mb-4">
            <h4 class="mb-2">Key Features:</h4>
            <ul class="text-body-2">
              <li>
                <strong>Smart Suggestions:</strong>
                Auto-suggest orders based on stock levels
              </li>
              <li>
                <strong>Price History:</strong>
                Auto-fill prices from previous Storage operations
              </li>
              <li>
                <strong>Supplier Grouping:</strong>
                Automatically group items by supplier
              </li>
              <li>
                <strong>Payment Automation:</strong>
                Auto-create bills when orders are placed
              </li>
              <li>
                <strong>Discrepancy Tracking:</strong>
                Track quantity and price differences
              </li>
              <li>
                <strong>Full Integration:</strong>
                Works with Storage, Account, and Products stores
              </li>
            </ul>
          </div>

          <v-alert type="info" variant="tonal">
            <v-alert-title>Minimalist Approach</v-alert-title>
            This implementation focuses only on the essential workflow without unnecessary features.
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
import type { ProcurementRequest, PurchaseOrder, Receipt } from '@/stores/supplier_2/types'

// Components
import BaseOrderAssistant from './components/shared/BaseOrderAssistant.vue'
import BaseSupplierBaskets from './components/orders/BaseSupplierBaskets.vue'
import BaseReceiptDialog from './components/receipts/BaseReceiptDialog.vue'
import ProcurementRequestTable from './components/procurement/ProcurementRequestTable.vue'
import PurchaseOrderTable from './components/orders/PurchaseOrderTable.vue'
import ReceiptTable from './components/receipts/ReceiptTable.vue'

const MODULE_NAME = 'SupplierView'

// =============================================
// STORE
// =============================================

const supplierStore = useSupplierStore()

// =============================================
// STATE
// =============================================

const selectedTab = ref('requests')
const showOrderAssistant = ref(false)
const showSupplierBaskets = ref(false)
const showReceiptDialog = ref(false)
const showInfoDialog = ref(false)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// Selected items for operations
const selectedRequestIds = ref<string[]>([])
const selectedOrder = ref<PurchaseOrder | null>(null)

// ✅ НОВОЕ: Подсветка заказа при переходе
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
// METHODS - Event Handlers
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
}

// =============================================
// ✅ НОВЫЕ МЕТОДЫ - Обработка событий таблицы заявок
// =============================================

function handleEditRequest(request: ProcurementRequest) {
  // TODO: Логика редактирования заявки
  console.log(`${MODULE_NAME}: Edit request`, request.id)
  showSuccess(`Edit request ${request.requestNumber} - TODO: Implement`)
}

function handleSubmitRequest(request: ProcurementRequest) {
  // TODO: Логика отправки заявки
  console.log(`${MODULE_NAME}: Submit request`, request.id)
  showSuccess(`Submit request ${request.requestNumber} - TODO: Implement`)
}

function handleDeleteRequest(request: ProcurementRequest) {
  // TODO: Логика удаления заявки
  console.log(`${MODULE_NAME}: Delete request`, request.id)
  showSuccess(`Delete request ${request.requestNumber} - TODO: Implement`)
}

function handleCreateOrderFromRequest(request: ProcurementRequest) {
  console.log(`${MODULE_NAME}: Create order from request`, request.id)

  // Открываем диалог создания заказов с этой заявкой
  selectedRequestIds.value = [request.id]
  showSupplierBaskets.value = true
}

function handleGoToOrder(orderId: string) {
  console.log(`${MODULE_NAME}: Navigating to order ${orderId}`)

  // Переключаемся на вкладку Orders
  selectedTab.value = 'orders'

  // Подсвечиваем конкретный заказ
  highlightedOrderId.value = orderId

  // Убираем подсветку через 3 секунды
  setTimeout(() => {
    highlightedOrderId.value = null
  }, 3000)

  // Находим заказ для отображения номера
  const order = ordersArray.value.find(o => o.id === orderId)
  const orderNumber = order ? order.orderNumber : orderId.slice(-8)

  showSuccess(`Found order ${orderNumber}`)
}

// =============================================
// METHODS - Обработчики заказов
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
  showReceiptDialog.value = true
}

// =============================================
// METHODS - Обработчики поступлений
// =============================================

function handleViewReceipt(receipt: Receipt) {
  console.log(`${MODULE_NAME}: View receipt`, receipt.id)
  showSuccess(`View receipt ${receipt.receiptNumber} - TODO: Implement`)
}

function handleEditReceipt(receipt: Receipt) {
  console.log(`${MODULE_NAME}: Edit receipt`, receipt.id)
  showSuccess(`Edit receipt ${receipt.receiptNumber} - TODO: Implement`)
}

function handleCompleteReceipt(receipt: Receipt) {
  console.log(`${MODULE_NAME}: Complete receipt`, receipt.id)
  showSuccess(`Complete receipt ${receipt.receiptNumber} - TODO: Implement`)
}

// =============================================
// METHODS - UI Actions
// =============================================

function openSupplierBaskets() {
  if (submittedRequestsArray.value.length === 0) {
    handleError('No submitted requests available for order creation')
    return
  }

  selectedRequestIds.value = submittedRequestsArray.value.map(req => req.id)
  showSupplierBaskets.value = true
}

function showSuccess(message: string) {
  successMessage.value = message
  showSuccessSnackbar.value = true
  console.log(`${MODULE_NAME}: Success - ${message}`)
}

function handleError(message: string) {
  errorMessage.value = message
  showErrorSnackbar.value = true
  console.error(`${MODULE_NAME}: Error - ${message}`)
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
