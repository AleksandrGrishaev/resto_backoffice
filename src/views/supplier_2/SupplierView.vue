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
            @manage-bill-create="handleManageBillCreate"
            @manage-bill-attach="handleManageBillAttach"
            @manage-bill-view="handleManageBillView"
            @show-shortfall="handleShowShortfall"
            @view-bill="handleViewBill"
            @process-payment="handleProcessPayment"
            @detach-bill="handleDetachBill"
            @edit-bill="handleEditBill"
            @cancel-bill="handleCancelBill"
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
    <!-- Payment Management Dialog -->
    <PaymentDialog
      :open="showPaymentDialog"
      :mode="paymentDialogMode"
      :order-data="selectedOrderForBill"
      :linked-bills="linkedBills"
      :available-bills="availableBills"
      :loading="paymentLoading"
      :error="paymentError"
      @update:open="handlePaymentDialogClose"
      @create-bill="handleCreateBill"
      @attach-bill="handleAttachBill"
      @detach-bill="handleDetachBill"
      @process-payment="handleProcessPayment"
      @view-bill="handleViewBill"
      @edit-bill="handleEditBill"
      @navigate-to-accounts="handleNavigateToAccounts"
    />

    <!-- Shortfall Alert -->
    <shortfall-alert
      v-if="shortfallData"
      :show="showShortfallAlert"
      :shortfall-amount="shortfallData.amount"
      :paid-amount="getOrderPaidAmount(shortfallData.order)"
      :delivered-amount="shortfallData.order.actualDeliveredAmount"
      @dismiss="showShortfallAlert = false"
      @create-credit-note="handleCreateCreditNote"
      @request-additional-payment="handleRequestAdditionalPayment"
    />
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
import { useAuthStore } from '@/stores/auth.store'

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
import PaymentDialog from '../accounts/components/dialogs/PaymentDialog.vue'
import ShortfallAlert from './components/orders/ShortfallAlert.vue'

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
// Payment Management
const showPaymentDialog = ref(false)
const paymentDialogMode = ref<'create' | 'view' | 'attach'>('create')
const selectedOrderForBill = ref<PurchaseOrder | null>(null)
const showShortfallAlert = ref(false)
const shortfallData = ref<{ order: PurchaseOrder; amount: number } | null>(null)
const linkedBills = ref<PendingPayment[]>([])
const availableBills = ref<PendingPayment[]>([])
const paymentLoading = ref(false)
const paymentError = ref<string | null>(null)

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

const totalBilledAmount = computed(() =>
  linkedBills.value.reduce((sum, bill) => sum + bill.amount, 0)
)

const amountDifference = computed(
  () => totalBilledAmount.value - (selectedOrderForBill.value?.totalAmount || 0)
)

const hasAmountMismatch = computed(() => Math.abs(amountDifference.value) > 1)

const amountDifferenceClass = computed(() => {
  if (!hasAmountMismatch.value) return ''
  return amountDifference.value > 0 ? 'text-warning' : 'text-error'
})

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

async function handlePaymentDialogClose(isOpen: boolean): Promise<void> {
  console.log(`${MODULE_NAME}: Payment dialog close event, isOpen:`, isOpen)

  if (!isOpen) {
    // Диалог закрывается - обновляем данные
    showPaymentDialog.value = false

    // Обновляем данные заказов в основной таблице для отображения актуального статуса счетов
    try {
      await supplierStore.getOrders() // Или refreshOrders() если такой метод есть
      console.log(`${MODULE_NAME}: Orders refreshed after payment dialog close`)
    } catch (error) {
      console.error('Failed to refresh orders after dialog close:', error)
    }
  } else {
    // Диалог открывается
    showPaymentDialog.value = true
  }
}

async function handleCancelBill(billId: string): Promise<void> {
  console.log(`${MODULE_NAME}: Cancelling bill ${billId}`)

  paymentLoading.value = true
  paymentError.value = null

  try {
    await accountStore.cancelPayment(billId)

    // Обновляем данные счетов
    await refreshBillsData()

    showSuccess(`Bill cancelled successfully`)

    // Если это был единственный счет, переключаемся в режим создания
    if (linkedBills.value.length === 0) {
      paymentDialogMode.value = 'create'
    }
  } catch (error) {
    console.error('Failed to cancel bill:', error)
    paymentError.value = 'Failed to cancel bill. Please try again.'
    handleError('Failed to cancel bill')
  } finally {
    paymentLoading.value = false
  }
}

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
// PAYMENT
// =============================================

/**
 * ✅ Обработчик редактирования счета
 */
async function handleEditBill(billId: string): Promise<void> {
  console.log(`${MODULE_NAME}: Editing bill ${billId}`)

  try {
    // Перенаправляем в модуль Accounts для редактирования
    router.push(`/accounts/payments/${billId}/edit`)
  } catch (error) {
    console.error('Failed to navigate to edit bill:', error)
    handleError('Failed to open bill editor')
  }
}

/**
 * ✅ Навигация в модуль Accounts с контекстом заказа
 */
async function handleNavigateToAccounts(order: PurchaseOrder): Promise<void> {
  console.log(`${MODULE_NAME}: Navigating to accounts for order ${order.orderNumber}`)

  try {
    // Закрываем диалог платежей
    showPaymentDialog.value = false

    // Навигация в Accounts с фильтром по заказу
    router.push({
      path: '/accounts',
      query: {
        tab: 'payments',
        filter: `order:${order.orderNumber}`,
        supplierId: order.supplierId
      }
    })

    showSuccess(`Opened Accounts module for order ${order.orderNumber}`)
  } catch (error) {
    console.error('Failed to navigate to accounts:', error)
    handleError('Failed to open Accounts module')
  }
}

/**
 * ✅ Улучшенная обработка создания счета с error handling
 */
async function handleCreateBill(data: {
  amount: number
  priority: string
  description: string
}): Promise<void> {
  if (!selectedOrderForBill.value) return

  console.log(`${MODULE_NAME}: Creating bill`, data)

  paymentLoading.value = true
  paymentError.value = null

  try {
    const createDto = {
      counteragentId: selectedOrderForBill.value.supplierId,
      counteragentName: selectedOrderForBill.value.supplierName,
      amount: data.amount,
      description: data.description,
      priority: data.priority as any,
      category: 'supplier' as const,
      invoiceNumber: selectedOrderForBill.value.orderNumber,
      purchaseOrderId: selectedOrderForBill.value.id,
      sourceOrderId: selectedOrderForBill.value.id,
      autoSyncEnabled: true,
      createdBy: {
        type: 'user',
        id: authStore.currentUser?.id || 'system',
        name: authStore.currentUser?.name || 'System'
      }
    }

    const bill = await accountStore.createPayment(createDto)

    // ✅ ОБНОВЛЯЕМ состояния
    await refreshBillsData()

    showSuccess(`Bill created: ${formatCurrency(data.amount)}`)

    // Автоматически переключаем в режим просмотра
    paymentDialogMode.value = 'view'
  } catch (error) {
    console.error('Failed to create bill:', error)
    paymentError.value = 'Failed to create bill. Please try again.'
    handleError(`Failed to create bill: ${error}`)
  } finally {
    paymentLoading.value = false
  }
}

/**
 * ✅ Улучшенная обработка привязки счета
 */
async function handleAttachBill(billId: string): Promise<void> {
  if (!selectedOrderForBill.value) return

  console.log(`${MODULE_NAME}: Attaching bill ${billId}`)

  paymentLoading.value = true
  paymentError.value = null

  try {
    // Используем метод из AccountStore
    await accountStore.attachPaymentToOrder(billId, selectedOrderForBill.value.id)

    // ✅ ОБНОВЛЯЕМ состояния
    await refreshBillsData()

    showSuccess(`Bill attached to order ${selectedOrderForBill.value.orderNumber}`)

    // Автоматически переключаем в режим просмотра
    paymentDialogMode.value = 'view'
  } catch (error) {
    console.error('Failed to attach bill:', error)
    paymentError.value = 'Failed to attach bill. Please try again.'
    handleError('Failed to attach bill')
  } finally {
    paymentLoading.value = false
  }
}

/**
 * ✅ Улучшенная обработка отвязки счета
 */
async function handleDetachBill(billId: string): Promise<void> {
  if (!selectedOrderForBill.value) return

  console.log(`${MODULE_NAME}: Detaching bill ${billId}`)

  paymentLoading.value = true
  paymentError.value = null

  try {
    await accountStore.detachPaymentFromOrder(billId)

    // ✅ ОБНОВЛЯЕМ состояния
    await refreshBillsData()

    showSuccess(`Bill detached from order`)

    // Если больше нет счетов, переключаемся в режим создания
    if (linkedBills.value.length === 0) {
      paymentDialogMode.value = 'create'
    }
  } catch (error) {
    console.error('Failed to detach bill:', error)
    paymentError.value = 'Failed to detach bill. Please try again.'
    handleError('Failed to detach bill')
  } finally {
    paymentLoading.value = false
  }
}

/**
 * ✅ Улучшенная функция обновления данных с error handling
 */
async function refreshBillsData(): Promise<void> {
  if (!selectedOrderForBill.value) return

  try {
    const [linked, available] = await Promise.all([
      getLinkedBills(selectedOrderForBill.value),
      getAvailableBills(selectedOrderForBill.value.supplierId)
    ])

    linkedBills.value = linked
    availableBills.value = available
  } catch (error) {
    console.error('Failed to refresh bills data:', error)
    paymentError.value = 'Failed to refresh data'
  }
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
// EVENT HANDLERS - bills
// =============================================

/**
 * ✅ Открыть PaymentDialog в режиме CREATE
 */
async function handleManageBillCreate(order: PurchaseOrder): Promise<void> {
  console.log(`${MODULE_NAME}: Creating bill for order`, order.orderNumber)

  try {
    await loadBillsDataForOrder(order)
    paymentDialogMode.value = 'create'
    showPaymentDialog.value = true
  } catch (error) {
    console.error('Failed to load bills for order:', error)
    handleError('Failed to load payment information')
  }
}

/**
 * ✅ Открыть PaymentDialog в режиме ATTACH
 */
async function handleManageBillAttach(order: PurchaseOrder): Promise<void> {
  console.log(`${MODULE_NAME}: Attaching bill for order`, order.orderNumber)

  try {
    await loadBillsDataForOrder(order)
    paymentDialogMode.value = 'attach'
    showPaymentDialog.value = true
  } catch (error) {
    console.error('Failed to load bills for order:', error)
    handleError('Failed to load payment information')
  }
}

/**
 * ✅ Открыть PaymentDialog в режиме VIEW (управление всеми счетами)
 */
async function handleManageBillView(order: PurchaseOrder): Promise<void> {
  console.log(`${MODULE_NAME}: Managing all bills for order`, order.orderNumber)

  try {
    await loadBillsDataForOrder(order)
    paymentDialogMode.value = 'view'
    showPaymentDialog.value = true
  } catch (error) {
    console.error('Failed to load bills for order:', error)
    handleError('Failed to load payment information')
  }
}

/**
 * ✅ Вспомогательная функция для загрузки данных счетов
 */
async function loadBillsDataForOrder(order: PurchaseOrder): Promise<void> {
  const [linked, available] = await Promise.all([
    getLinkedBills(order),
    getAvailableBills(order.supplierId)
  ])

  linkedBills.value = linked
  availableBills.value = available
  selectedOrderForBill.value = order
}

function handleShowShortfall(order: PurchaseOrder): void {
  console.log(`${MODULE_NAME}: Showing shortfall for order`, order.orderNumber)

  // ✅ ИСПОЛЬЗУЕМ linkedBills вместо getCurrentBill
  const paidAmount = getOrderPaidAmount(order)
  const deliveredAmount = order.actualDeliveredAmount || 0
  const shortfallAmount = paidAmount - deliveredAmount

  shortfallData.value = { order, amount: shortfallAmount }
  showShortfallAlert.value = true
}

// ✅ НОВАЯ функция вместо getCurrentBill:
function getOrderPaidAmount(order: PurchaseOrder): number {
  // Ищем счета для этого заказа в linkedBills или через integration
  return 0 // TODO: Рассчитать из транзакций, пока 0
}

// =============================================
// PAYMENT MANAGEMENT METHODS
// =============================================

async function getLinkedBills(order: PurchaseOrder | null): Promise<PendingPayment[]> {
  if (!order) return []

  try {
    // ✅ РЕАЛЬНАЯ ИНТЕГРАЦИЯ с AccountStore
    await accountStore.fetchPayments()

    // Получаем все счета, связанные с этим заказом
    const bills = accountStore.state.pendingPayments.filter(
      payment => payment.purchaseOrderId === order.id
    )

    console.log(`Found ${bills.length} bills for order ${order.orderNumber}`)
    return bills
  } catch (error) {
    console.error('Failed to get linked bills:', error)
    return []
  }
}

async function getAvailableBills(supplierId: string | undefined): Promise<PendingPayment[]> {
  if (!supplierId) return []

  try {
    await accountStore.fetchPayments()

    // Получаем неприкрепленные счета этого поставщика
    return accountStore.state.pendingPayments.filter(
      payment =>
        payment.counteragentId === supplierId &&
        payment.status === 'pending' &&
        !payment.purchaseOrderId // Только свободные счета
    )
  } catch (error) {
    console.error('Failed to get available bills:', error)
    return []
  }
}

function handleViewBill(billId: string): void {
  console.log(`${MODULE_NAME}: Viewing bill ${billId}`)

  try {
    // Навигация к детальному просмотру счета
    router.push(`/accounts/payments/${billId}`)
  } catch (error) {
    console.error('Failed to navigate to bill:', error)
    handleError('Failed to open bill details')
  }
}

async function handleProcessPayment(billId: string): Promise<void> {
  console.log(`${MODULE_NAME}: Processing payment for bill ${billId}`)

  try {
    // TODO: Перенаправить в Account модуль для обработки платежа
    showSuccess('Redirecting to payment processing - TODO: Account integration')
  } catch (error) {
    console.error('Failed to process payment:', error)
    handleError('Failed to process payment')
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

async function handleCreateCreditNote(): Promise<void> {
  if (!shortfallData.value) return

  console.log(
    `${MODULE_NAME}: Creating credit note for order`,
    shortfallData.value.order.orderNumber
  )

  try {
    // TODO: Интеграция с SupplierAccountIntegration.handleShortfall()
    showSuccess(`Credit note created for ${shortfallData.value.order.orderNumber}`)
    showShortfallAlert.value = false
    shortfallData.value = null
  } catch (error) {
    console.error('Failed to create credit note:', error)
    handleError('Failed to create credit note')
  }
}

async function handleRequestAdditionalPayment(): Promise<void> {
  if (!shortfallData.value) return

  console.log(
    `${MODULE_NAME}: Requesting additional payment for order`,
    shortfallData.value.order.orderNumber
  )

  try {
    // TODO: Создать дополнительный счет на недоплаченную сумму
    showSuccess(`Additional payment requested for ${shortfallData.value.order.orderNumber}`)
    showShortfallAlert.value = false
    shortfallData.value = null
  } catch (error) {
    console.error('Failed to request additional payment:', error)
    handleError('Failed to request additional payment')
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

function handleViewOrder(order: PurchaseOrder) {
  console.log(`${MODULE_NAME}: View order`, order.id)
  showSuccess(`View order ${order.orderNumber} - TODO: Implement`)
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
      paymentStatus: editedOrder.paymentStatus,
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
