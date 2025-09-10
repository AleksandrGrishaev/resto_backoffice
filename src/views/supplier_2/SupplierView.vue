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
          AI Order Assistant
        </v-btn>

        <!-- Create Orders кнопка появляется когда есть submitted заявки -->
        <v-btn
          v-if="availableItemsCount > 0"
          color="primary"
          prepend-icon="mdi-cart-plus"
          @click="handleCreateOrdersFromSubmitted"
        >
          Create Orders ({{ availableItemsCount }})
        </v-btn>
      </div>
    </div>

    <!-- Main Content Tabs -->
    <v-tabs v-model="selectedTab" class="mb-4">
      <v-tab value="requests">
        <v-icon icon="mdi-file-document" class="mr-2" />
        Requests
        <v-chip v-if="activeRequestsCount > 0" size="small" class="ml-2" variant="tonal">
          {{ activeRequestsCount }}
        </v-chip>
      </v-tab>

      <v-tab value="orders">
        <v-icon icon="mdi-cart" class="mr-2" />
        Orders
        <v-chip v-if="activeOrdersCount > 0" size="small" class="ml-2" variant="tonal">
          {{ activeOrdersCount }}
        </v-chip>
      </v-tab>

      <v-tab value="receipts">
        <v-icon icon="mdi-truck-check" class="mr-2" />
        Receipts
        <v-chip v-if="activeReceiptsCount > 0" size="small" class="ml-2" variant="tonal">
          {{ activeReceiptsCount }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Content -->
    <v-card>
      <v-tabs-window v-model="selectedTab">
        <!-- Requests Tab -->
        <v-tabs-window-item value="requests">
          <!-- ✅ ИСПРАВЛЕНО: Добавлен проп orders -->
          <procurement-request-table
            :requests="requestsArray"
            :orders="ordersArray"
            :loading="supplierStore.state.loading?.requests || false"
            @edit-request="handleEditRequest"
            @submit-request="handleSubmitRequest"
            @delete-request="handleDeleteRequest"
            @create-order="handleCreateOrderFromRequest"
            @go-to-order="handleGoToOrder"
            @selection-change="selectedRequestIds = $event"
          />

          <!-- Empty State -->
          <div v-if="requestsArray.length === 0 && !isLoadingValue" class="text-center pa-8">
            <v-icon icon="mdi-file-document-outline" size="64" color="grey" class="mb-4" />
            <div class="text-h6 mb-2">No Requests</div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              Use Order Assistant to create procurement requests
            </div>
            <v-btn color="success" prepend-icon="mdi-robot" @click="showOrderAssistant = true">
              Start Order Assistant
            </v-btn>
          </div>
        </v-tabs-window-item>

        <!-- Orders Tab -->
        <v-tabs-window-item value="orders">
          <purchase-order-table
            :orders="ordersArray"
            :loading="Boolean(supplierStore.state.loading?.orders)"
            @edit-order="handleEditOrder"
            @send-order="handleSendOrder"
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
            :loading="supplierStore.state.loading?.requests || false"
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

    <!-- Receipt Dialog -->
    <base-receipt-dialog
      v-model="showReceiptDialog"
      :order="selectedOrder"
      :receipt="selectedReceipt"
      @success="handleReceiptSuccess"
      @error="handleError"
    />

    <!-- Receipt Details Dialog -->
    <receipt-details-dialog
      v-if="selectedReceipt"
      v-model="showReceiptDetailsDialog"
      :receipt="selectedReceipt"
      @edit-receipt="handleEditReceiptFromDetails"
      @complete-receipt="handleCompleteReceipt"
      @view-storage="handleViewStorage"
    />

    <!-- Request Edit Dialog -->
    <request-edit-dialog
      v-model="showRequestEditDialog"
      :request="selectedRequestForEdit"
      :orders="ordersArray"
      @save-request="handleSaveEditedRequest"
    />

    <!-- Order Edit Dialog -->
    <purchase-order-edit-dialog
      v-model="showOrderEditDialog"
      :order="selectedOrderForEdit"
      @order-updated="handleSaveEditedOrder"
      @order-sent="handleOrderSentFromDialog"
      @success="showSuccess"
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

    <!-- ✅ ИСПРАВЛЕНО: Info Dialog объявлен в template и script -->
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
import { useProcurementRequests } from '@/stores/supplier_2/composables/useProcurementRequests'
import type { ProcurementRequest, PurchaseOrder, Receipt } from '@/stores/supplier_2/types'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import { useAccountStore } from '@/stores/account'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Types
import type { PendingPayment } from '@/stores/account/types'

// Components
import BaseOrderAssistant from './components/shared/BaseOrderAssistant.vue'
import BaseSupplierBaskets from './components/orders/BaseSupplierBaskets.vue'
import BaseReceiptDialog from './components/receipts/BaseReceiptDialog.vue'
import ReceiptDetailsDialog from './components/receipts/ReceiptDetailsDialog.vue'
import ProcurementRequestTable from './components/procurement/ProcurementRequestTable.vue'
import PurchaseOrderTable from './components/orders/PurchaseOrderTable.vue'
import ReceiptTable from './components/receipts/ReceiptTable.vue'
import RequestEditDialog from './components/procurement/RequestEditDialog.vue'
import PurchaseOrderEditDialog from './components/orders/PurchaseOrderEditDialog.vue'

const MODULE_NAME = 'SupplierView'

// =============================================
// STORE & COMPOSABLES
// =============================================

const supplierStore = useSupplierStore()
const { completeReceipt } = useReceipts()
const { submitRequest, updateRequest, canEditRequest, canDeleteRequest } = useProcurementRequests()
const { sendOrder, updateOrder, canEditOrder, canSendOrder } = usePurchaseOrders()
const accountStore = useAccountStore()
const router = useRouter()
const authStore = useAuthStore()
// =============================================
// STATE
// =============================================

const selectedTab = ref('requests')
const showOrderAssistant = ref(false)
const showSupplierBaskets = ref(false)
const showReceiptDialog = ref(false)
const showReceiptDetailsDialog = ref(false)
const showInfoDialog = ref(false)
const showRequestEditDialog = ref(false)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const showOrderEditDialog = ref(false)
const selectedOrderForEdit = ref<PurchaseOrder | null>(null)

// Selected items for operations
const selectedRequestIds = ref<string[]>([])
const selectedOrder = ref<PurchaseOrder | null>(null)
const selectedReceipt = ref<Receipt | null>(null)
const selectedRequestForEdit = ref<ProcurementRequest | null>(null)

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

// ✅ НОВЫЙ: Подсчет товаров готовых к заказу
const availableItemsCount = computed(() => {
  let totalItems = 0

  // Проходим по всем submitted запросам
  submittedRequestsArray.value.forEach(request => {
    request.items.forEach(item => {
      // Проверяем, заказан ли уже этот товар полностью
      const isFullyOrdered = isItemFullyOrdered(request.id, item.itemId, item.requestedQuantity)

      if (!isFullyOrdered) {
        totalItems++
      }
    })
  })

  return totalItems
})

// ✅ HELPER: Функция проверки, заказан ли товар полностью
function isItemFullyOrdered(requestId: string, itemId: string, requestedQuantity: number): boolean {
  // Находим все заказы, связанные с этим запросом
  const relatedOrders = ordersArray.value.filter(order => order.requestIds.includes(requestId))

  // Считаем общее заказанное количество этого товара
  let totalOrdered = 0
  relatedOrders.forEach(order => {
    const orderItem = order.items.find(item => item.itemId === itemId)
    if (orderItem) {
      totalOrdered += orderItem.orderedQuantity
    }
  })

  // Товар полностью заказан, если заказанное количество >= запрашиваемого
  return totalOrdered >= requestedQuantity
}

// Считаем только активные элементы в работе
const activeRequestsCount = computed(() => {
  return requestsArray.value.filter(
    request => request.status !== 'converted' && request.status !== 'cancelled'
  ).length
})

const activeOrdersCount = computed(() => {
  return ordersArray.value.filter(
    order => order.status !== 'delivered' && order.status !== 'cancelled'
  ).length
})

const activeReceiptsCount = computed(() => {
  return receiptsArray.value.filter(receipt => receipt.status !== 'completed').length
})

const submittedRequestsArray = computed(() => {
  return requestsArray.value.filter(request => request.status === 'submitted')
})

const isLoadingValue = computed(() => {
  // Убедиться что loading это boolean, а не объект
  return Boolean(supplierStore.state.loading?.orders || supplierStore.isLoading)
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

async function handleEditRequest(request: ProcurementRequest) {
  console.log(`${MODULE_NAME}: Edit request`, request.id)

  // Проверяем можно ли редактировать
  if (!canEditRequest(request)) {
    handleError(`Cannot edit request with status: ${request.status}`)
    return
  }

  // Открываем диалог редактирования
  selectedRequestForEdit.value = request
  showRequestEditDialog.value = true
}

async function handleSubmitRequest(request: ProcurementRequest) {
  console.log(`${MODULE_NAME}: Submit request`, request.id)

  try {
    // Проверяем статус - можно отправить только draft
    if (request.status !== 'draft') {
      handleError(`Cannot submit request with status: ${request.status}`)
      return
    }

    console.log(`${MODULE_NAME}: Submitting request via composable...`)

    // Отправляем заявку через composable
    const submittedRequest = await submitRequest(request.id)

    console.log(`${MODULE_NAME}: Request submitted, new status:`, submittedRequest.status)

    showSuccess(`Request ${submittedRequest.requestNumber} submitted successfully`)

    // Можем показать уведомление о возможности создания заказа
    setTimeout(() => {
      const submittedCount = submittedRequestsArray.value.length
      if (submittedCount > 0) {
        showSuccess(`${submittedCount} requests ready for order creation`)
      }
    }, 1000)
  } catch (error) {
    console.error(`${MODULE_NAME}: Failed to submit request`, error)
    handleError(`Failed to submit request: ${error}`)
  }
}

function handleDeleteRequest(request: ProcurementRequest) {
  console.log(`${MODULE_NAME}: Delete request`, request.id)

  // Проверяем можно ли удалить
  if (!canDeleteRequest(request)) {
    handleError(`Cannot delete request with status: ${request.status}`)
    return
  }

  // TODO: Показать подтверждение и удалить через composable
  showSuccess(`Delete request ${request.requestNumber} - TODO: Implement with confirmation`)
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

function handleCreateOrdersFromSubmitted() {
  console.log(`${MODULE_NAME}: Creating orders from submitted requests`)
  selectedRequestIds.value = submittedRequestsArray.value.map(req => req.id)
  console.log(`${MODULE_NAME}: Selected ${selectedRequestIds.value.length} submitted requests`)
  showSupplierBaskets.value = true
}

async function handleSaveEditedRequest(editedRequest: ProcurementRequest) {
  console.log(`${MODULE_NAME}: Saving edited request`, editedRequest.id)

  try {
    const updatedRequest = await updateRequest(editedRequest.id, {
      department: editedRequest.department,
      priority: editedRequest.priority,
      requestedBy: editedRequest.requestedBy,
      notes: editedRequest.notes,
      items: editedRequest.items
    })

    showSuccess(`Request ${updatedRequest.requestNumber} updated successfully`)
    showRequestEditDialog.value = false
    selectedRequestForEdit.value = null
  } catch (error) {
    console.error(`${MODULE_NAME}: Failed to update request`, error)
    handleError(`Failed to update request: ${error}`)
  }
}

// =============================================
// EVENT HANDLERS - Orders
// =============================================

function handleEditOrder(order: PurchaseOrder) {
  console.log(`${MODULE_NAME}: Edit order`, order.id)

  // Проверяем можно ли редактировать
  if (!canEditOrder(order)) {
    handleError(`Cannot edit order with status: ${order.status}`)
    return
  }

  // Открываем диалог редактирования
  selectedOrderForEdit.value = order
  showOrderEditDialog.value = true
}

async function handleSendOrder(order: PurchaseOrder) {
  console.log(`${MODULE_NAME}: Send order`, order.id)

  try {
    // Проверяем можно ли отправить
    if (!canSendOrder(order)) {
      handleError(`Cannot send order with status: ${order.status}`)
      return
    }

    // Отправляем заказ через композабл
    const sentOrder = await sendOrder(order.id)

    console.log(`${MODULE_NAME}: Order sent successfully`, sentOrder.orderNumber)
    showSuccess(`Order ${sentOrder.orderNumber} sent to supplier successfully`)
  } catch (error) {
    console.error(`${MODULE_NAME}: Failed to send order`, error)
    handleError(`Failed to send order: ${error}`)
  }
}

async function handleSaveEditedOrder(editedOrder: PurchaseOrder) {
  console.log(`${MODULE_NAME}: Saving edited order`, editedOrder.id)

  try {
    const updatedOrder = await updateOrder(editedOrder.id, {
      status: editedOrder.status,
      orderDate: editedOrder.orderDate,
      expectedDelivery: editedOrder.expectedDelivery,
      billStatus: editedOrder.billStatus,
      notes: editedOrder.notes,
      items: editedOrder.items
    })

    showSuccess(`Order ${updatedOrder.orderNumber} updated successfully`)
    showOrderEditDialog.value = false
    selectedOrderForEdit.value = null
  } catch (error) {
    console.error(`${MODULE_NAME}: Failed to update order`, error)
    handleError(`Failed to update order: ${error}`)
  }
}

function handleOrderSentFromDialog(sentOrder: PurchaseOrder) {
  console.log(`${MODULE_NAME}: Order sent from dialog`, sentOrder.orderNumber)
  showSuccess(`Order ${sentOrder.orderNumber} sent to supplier successfully`)
  showOrderEditDialog.value = false
  selectedOrderForEdit.value = null
}

async function handleStartReceipt(order: PurchaseOrder) {
  console.log(`${MODULE_NAME}: Start receipt for order`, order.id)

  try {
    // ✅ УПРОЩЕННАЯ проверка - только статус 'sent'
    if (order.status !== 'sent') {
      let suggestion = ''
      if (order.status === 'draft') {
        suggestion = ' Please send the order first.'
      } else if (order.status === 'delivered') {
        suggestion = ' This order has already been delivered.'
      }

      handleError(
        `Order ${order.orderNumber} is not ready for receipt.\n` +
          `Current status: ${order.status}\n` +
          `Required status: sent${suggestion}`
      )
      return
    }

    // Проверка активных receipts
    const existingReceipts = receiptsArray.value.filter(r => r.purchaseOrderId === order.id)
    const activeReceipts = existingReceipts.filter(r => r.status === 'draft')

    if (activeReceipts.length > 0) {
      const receiptNumbers = activeReceipts.map(r => r.receiptNumber).join(', ')
      handleError(
        `Order ${order.orderNumber} already has an active receipt in progress.\n` +
          `Active receipt(s): ${receiptNumbers}\n` +
          `Please complete or cancel the existing receipt first.`
      )
      return
    }

    // Открываем диалог создания receipt
    selectedOrder.value = order
    selectedReceipt.value = null
    showReceiptDialog.value = true
  } catch (error) {
    console.error('Error starting receipt:', error)
    handleError(`Failed to start receipt for order ${order.orderNumber}: ${error}`)
  }
}

// =============================================
// EVENT HANDLERS - Receipts
// =============================================

function handleViewReceiptDetails(receipt: Receipt) {
  console.log(`${MODULE_NAME}: View receipt details`, receipt.id)
  selectedReceipt.value = receipt
  showReceiptDetailsDialog.value = true
}

function handleEditReceipt(receipt: Receipt) {
  console.log(`${MODULE_NAME}: Edit receipt`, receipt.id)

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
  showReceiptDetailsDialog.value = false
  handleEditReceipt(receipt)
}

async function handleCompleteReceipt(receipt: Receipt) {
  console.log(`${MODULE_NAME}: Complete receipt`, receipt.id)

  try {
    const completedReceipt = await completeReceipt(receipt.id, 'Receipt completed from UI')
    showSuccess(`Receipt ${completedReceipt.receiptNumber} completed successfully`)

    showReceiptDialog.value = false
    showReceiptDetailsDialog.value = false
    selectedReceipt.value = null
    selectedOrder.value = null
    selectedTab.value = 'receipts'
  } catch (error) {
    console.error(`${MODULE_NAME}: Failed to complete receipt`, error)
    handleError(`Failed to complete receipt: ${error}`)
  }
}

function handleViewStorage(operationId: string) {
  console.log(`${MODULE_NAME}: View storage operation`, operationId)
  showSuccess(`Navigate to storage operation ${operationId} - TODO: Implement storage integration`)
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  console.log(`${MODULE_NAME}: Component mounted, initializing data`)

  try {
    await supplierStore.initialize()
    console.log(`${MODULE_NAME}: Data initialized successfully`)
  } catch (error) {
    console.error(`${MODULE_NAME}: Failed to initialize data`, error)
    handleError('Failed to load supplier data')
  }
})
</script>

<style scoped>
.supplier-view {
  min-height: 100vh;
}

.v-tab {
  min-width: 120px;
}

/* Debug режим стили */
.debug-chip {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
}
</style>
