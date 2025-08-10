// src/stores/supplier_2/supplierStore.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supplierService } from './supplierService'
import type {
  SupplierState,
  ProcurementRequest,
  PurchaseOrder,
  Receipt,
  OrderSuggestion,
  SupplierBasket,
  CreateRequestData,
  CreateOrderData,
  CreateReceiptData,
  UpdateRequestData,
  UpdateOrderData,
  UpdateReceiptData,
  SupplierStatistics
} from './types'

const MODULE_NAME = 'SupplierStore'

export const useSupplierStore = defineStore('supplier', () => {
  // =============================================
  // STATE - Reactive state
  // =============================================

  const state = ref<SupplierState>({
    // Data
    requests: [],
    orders: [],
    receipts: [],

    // UI state
    loading: {
      requests: false,
      orders: false,
      receipts: false,
      suggestions: false
    },

    // Current workflow
    currentRequest: undefined,
    currentOrder: undefined,
    currentReceipt: undefined,

    // Order assistant
    selectedRequestIds: [],
    orderSuggestions: [],

    // Supplier grouping
    supplierBaskets: []
  })

  // =============================================
  // GETTERS - Computed properties
  // =============================================

  const draftRequests = computed(
    () => state.value.requests?.filter(req => req.status === 'draft') || []
  )

  const submittedRequests = computed(
    () => state.value.requests?.filter(req => req.status === 'submitted') || []
  )

  const pendingOrders = computed(
    () => state.value.orders?.filter(order => order.paymentStatus === 'pending') || []
  )

  const unpaidOrders = computed(
    () => state.value.orders?.filter(order => order.paymentStatus === 'pending') || []
  )

  const ordersAwaitingDelivery = computed(
    () =>
      state.value.orders?.filter(
        order => ['sent', 'confirmed'].includes(order.status) && order.paymentStatus === 'paid'
      ) || []
  )

  const ordersForReceipt = computed(
    () =>
      state.value.orders?.filter(
        order =>
          ['sent', 'confirmed'].includes(order.status) &&
          !state.value.receipts?.some(
            receipt => receipt.purchaseOrderId === order.id && receipt.status === 'completed'
          )
      ) || []
  )

  const draftReceipts = computed(
    () => state.value.receipts?.filter(receipt => receipt.status === 'draft') || []
  )

  const urgentSuggestions = computed(
    () => state.value.orderSuggestions?.filter(suggestion => suggestion.urgency === 'high') || []
  )

  const statistics = computed(
    (): SupplierStatistics => ({
      totalRequests: state.value.requests?.length || 0,
      pendingRequests: submittedRequests.value.length,
      totalOrders: state.value.orders?.length || 0,
      ordersAwaitingPayment: unpaidOrders.value.length,
      ordersAwaitingDelivery: ordersAwaitingDelivery.value.length,
      totalReceipts: state.value.receipts?.length || 0,
      pendingReceipts: draftReceipts.value.length,
      urgentSuggestions: urgentSuggestions.value.length
    })
  )

  // =============================================
  // ACTIONS - Procurement Requests
  // =============================================

  async function fetchRequests() {
    try {
      state.value.loading.requests = true
      console.log(`${MODULE_NAME}: Fetching requests`)

      state.value.requests = await supplierService.getRequests()

      console.log(`${MODULE_NAME}: Fetched ${state.value.requests.length} requests`)
    } catch (error) {
      console.error(`${MODULE_NAME}: Error fetching requests:`, error)
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }

  async function createRequest(data: CreateRequestData): Promise<ProcurementRequest> {
    try {
      state.value.loading.requests = true
      console.log(`${MODULE_NAME}: Creating request`, data)

      const newRequest = await supplierService.createRequest(data)

      if (!state.value.requests) {
        state.value.requests = []
      }
      state.value.requests.unshift(newRequest)

      console.log(`${MODULE_NAME}: Created request ${newRequest.id}`)
      return newRequest
    } catch (error) {
      console.error(`${MODULE_NAME}: Error creating request:`, error)
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }

  async function updateRequest(id: string, data: UpdateRequestData): Promise<ProcurementRequest> {
    try {
      state.value.loading.requests = true
      console.log(`${MODULE_NAME}: Updating request ${id}`, data)

      const updatedRequest = await supplierService.updateRequest(id, data)

      if (state.value.requests) {
        const index = state.value.requests.findIndex(req => req.id === id)
        if (index !== -1) {
          state.value.requests[index] = updatedRequest
        }
      }

      console.log(`${MODULE_NAME}: Updated request ${id}`)
      return updatedRequest
    } catch (error) {
      console.error(`${MODULE_NAME}: Error updating request:`, error)
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }

  async function deleteRequest(id: string): Promise<void> {
    try {
      state.value.loading.requests = true
      console.log(`${MODULE_NAME}: Deleting request ${id}`)

      await supplierService.deleteRequest(id)

      if (state.value.requests) {
        const index = state.value.requests.findIndex(req => req.id === id)
        if (index !== -1) {
          state.value.requests.splice(index, 1)
        }
      }

      console.log(`${MODULE_NAME}: Deleted request ${id}`)
    } catch (error) {
      console.error(`${MODULE_NAME}: Error deleting request:`, error)
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }

  // =============================================
  // ACTIONS - Purchase Orders
  // =============================================

  async function fetchOrders() {
    try {
      state.value.loading.orders = true
      console.log(`${MODULE_NAME}: Fetching orders`)

      state.value.orders = await supplierService.getOrders()

      console.log(`${MODULE_NAME}: Fetched ${state.value.orders.length} orders`)
    } catch (error) {
      console.error(`${MODULE_NAME}: Error fetching orders:`, error)
      throw error
    } finally {
      state.value.loading.orders = false
    }
  }

  async function createOrder(data: CreateOrderData): Promise<PurchaseOrder> {
    try {
      state.value.loading.orders = true
      console.log(`${MODULE_NAME}: Creating order`, data)

      const newOrder = await supplierService.createOrder(data)

      if (!state.value.orders) {
        state.value.orders = []
      }
      state.value.orders.unshift(newOrder)

      // Update related requests in local state
      if (state.value.requests) {
        data.requestIds.forEach(requestId => {
          const request = state.value.requests!.find(req => req.id === requestId)
          if (request) {
            request.purchaseOrderIds.push(newOrder.id)
            request.status = 'converted'
            request.updatedAt = new Date().toISOString()
          }
        })
      }

      console.log(`${MODULE_NAME}: Created order ${newOrder.id}`)
      return newOrder
    } catch (error) {
      console.error(`${MODULE_NAME}: Error creating order:`, error)
      throw error
    } finally {
      state.value.loading.orders = false
    }
  }

  async function updateOrder(id: string, data: UpdateOrderData): Promise<PurchaseOrder> {
    try {
      state.value.loading.orders = true
      console.log(`${MODULE_NAME}: Updating order ${id}`, data)

      const updatedOrder = await supplierService.updateOrder(id, data)

      if (state.value.orders) {
        const index = state.value.orders.findIndex(order => order.id === id)
        if (index !== -1) {
          state.value.orders[index] = updatedOrder
        }
      }

      console.log(`${MODULE_NAME}: Updated order ${id}`)
      return updatedOrder
    } catch (error) {
      console.error(`${MODULE_NAME}: Error updating order:`, error)
      throw error
    } finally {
      state.value.loading.orders = false
    }
  }

  async function deleteOrder(id: string): Promise<void> {
    try {
      state.value.loading.orders = true
      console.log(`${MODULE_NAME}: Deleting order ${id}`)

      await supplierService.deleteOrder(id)

      if (state.value.orders) {
        const index = state.value.orders.findIndex(order => order.id === id)
        if (index !== -1) {
          state.value.orders.splice(index, 1)
        }
      }

      console.log(`${MODULE_NAME}: Deleted order ${id}`)
    } catch (error) {
      console.error(`${MODULE_NAME}: Error deleting order:`, error)
      throw error
    } finally {
      state.value.loading.orders = false
    }
  }

  // =============================================
  // ACTIONS - Receipts
  // =============================================

  async function fetchReceipts() {
    try {
      state.value.loading.receipts = true
      console.log(`${MODULE_NAME}: Fetching receipts`)

      state.value.receipts = await supplierService.getReceipts()

      console.log(`${MODULE_NAME}: Fetched ${state.value.receipts.length} receipts`)
    } catch (error) {
      console.error(`${MODULE_NAME}: Error fetching receipts:`, error)
      throw error
    } finally {
      state.value.loading.receipts = false
    }
  }

  async function createReceipt(data: CreateReceiptData): Promise<Receipt> {
    try {
      state.value.loading.receipts = true
      console.log(`${MODULE_NAME}: Creating receipt`, data)

      const newReceipt = await supplierService.createReceipt(data)

      if (!state.value.receipts) {
        state.value.receipts = []
      }
      state.value.receipts.unshift(newReceipt)

      console.log(`${MODULE_NAME}: Created receipt ${newReceipt.id}`)
      return newReceipt
    } catch (error) {
      console.error(`${MODULE_NAME}: Error creating receipt:`, error)
      throw error
    } finally {
      state.value.loading.receipts = false
    }
  }

  async function completeReceipt(id: string): Promise<Receipt> {
    try {
      state.value.loading.receipts = true
      console.log(`${MODULE_NAME}: Completing receipt ${id}`)

      const completedReceipt = await supplierService.completeReceipt(id)

      // Update receipt in local state
      if (state.value.receipts) {
        const receiptIndex = state.value.receipts.findIndex(receipt => receipt.id === id)
        if (receiptIndex !== -1) {
          state.value.receipts[receiptIndex] = completedReceipt
        }
      }

      // Update related order in local state
      if (state.value.orders) {
        const order = state.value.orders.find(ord => ord.id === completedReceipt.purchaseOrderId)
        if (order) {
          order.status = 'delivered'
          order.receiptId = completedReceipt.id
          order.updatedAt = new Date().toISOString()
        }
      }

      console.log(`${MODULE_NAME}: Completed receipt ${id}`)
      return completedReceipt
    } catch (error) {
      console.error(`${MODULE_NAME}: Error completing receipt:`, error)
      throw error
    } finally {
      state.value.loading.receipts = false
    }
  }

  async function updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt> {
    try {
      state.value.loading.receipts = true
      console.log(`${MODULE_NAME}: Updating receipt ${id}`, data)

      const updatedReceipt = await supplierService.updateReceipt(id, data)

      if (state.value.receipts) {
        const index = state.value.receipts.findIndex(receipt => receipt.id === id)
        if (index !== -1) {
          state.value.receipts[index] = updatedReceipt
        }
      }

      console.log(`${MODULE_NAME}: Updated receipt ${id}`)
      return updatedReceipt
    } catch (error) {
      console.error(`${MODULE_NAME}: Error updating receipt:`, error)
      throw error
    } finally {
      state.value.loading.receipts = false
    }
  }

  // =============================================
  // ACTIONS - Order Suggestions
  // =============================================

  async function fetchOrderSuggestions(department?: 'kitchen' | 'bar') {
    try {
      state.value.loading.suggestions = true
      console.log(`${MODULE_NAME}: Fetching order suggestions for ${department || 'all'}`)

      state.value.orderSuggestions = await supplierService.getOrderSuggestions(department)

      console.log(`${MODULE_NAME}: Fetched ${state.value.orderSuggestions.length} suggestions`)
    } catch (error) {
      console.error(`${MODULE_NAME}: Error fetching suggestions:`, error)
      throw error
    } finally {
      state.value.loading.suggestions = false
    }
  }

  // =============================================
  // ACTIONS - Supplier Baskets (for UI grouping)
  // =============================================

  async function createSupplierBaskets(requestIds: string[]) {
    try {
      console.log(`${MODULE_NAME}: Creating supplier baskets for requests:`, requestIds)

      state.value.supplierBaskets = await supplierService.createSupplierBaskets(requestIds)
      state.value.selectedRequestIds = [...requestIds]

      console.log(`${MODULE_NAME}: Created ${state.value.supplierBaskets.length} supplier baskets`)
    } catch (error) {
      console.error(`${MODULE_NAME}: Error creating supplier baskets:`, error)
      throw error
    }
  }

  function clearSupplierBaskets() {
    state.value.supplierBaskets = []
    state.value.selectedRequestIds = []
    console.log(`${MODULE_NAME}: Cleared supplier baskets`)
  }

  // =============================================
  // ACTIONS - Current Workflow Management
  // =============================================

  function setCurrentRequest(request: ProcurementRequest | undefined) {
    state.value.currentRequest = request
    console.log(`${MODULE_NAME}: Set current request:`, request?.id)
  }

  function setCurrentOrder(order: PurchaseOrder | undefined) {
    state.value.currentOrder = order
    console.log(`${MODULE_NAME}: Set current order:`, order?.id)
  }

  function setCurrentReceipt(receipt: Receipt | undefined) {
    state.value.currentReceipt = receipt
    console.log(`${MODULE_NAME}: Set current receipt:`, receipt?.id)
  }

  // =============================================
  // ACTIONS - Data Loading & Initialization
  // =============================================

  async function initialize() {
    try {
      console.log(`${MODULE_NAME}: Initializing supplier store`)

      await Promise.all([fetchRequests(), fetchOrders(), fetchReceipts()])

      console.log(`${MODULE_NAME}: Initialization completed`)
    } catch (error) {
      console.error(`${MODULE_NAME}: Error during initialization:`, error)
      throw error
    }
  }

  async function refreshAll() {
    try {
      console.log(`${MODULE_NAME}: Refreshing all data`)

      await Promise.all([fetchRequests(), fetchOrders(), fetchReceipts(), fetchOrderSuggestions()])

      console.log(`${MODULE_NAME}: Refresh completed`)
    } catch (error) {
      console.error(`${MODULE_NAME}: Error during refresh:`, error)
      throw error
    }
  }

  // =============================================
  // HELPER ACTIONS - Getters
  // =============================================

  function getRequestById(id: string): ProcurementRequest | undefined {
    return state.value.requests?.find(req => req.id === id)
  }

  function getOrderById(id: string): PurchaseOrder | undefined {
    return state.value.orders?.find(order => order.id === id)
  }

  function getReceiptById(id: string): Receipt | undefined {
    return state.value.receipts?.find(receipt => receipt.id === id)
  }

  function getRequestsByStatus(status: ProcurementRequest['status']): ProcurementRequest[] {
    return state.value.requests?.filter(req => req.status === status) || []
  }

  function getOrdersByStatus(status: PurchaseOrder['status']): PurchaseOrder[] {
    return state.value.orders?.filter(order => order.status === status) || []
  }

  function getOrdersByPaymentStatus(
    paymentStatus: PurchaseOrder['paymentStatus']
  ): PurchaseOrder[] {
    return state.value.orders?.filter(order => order.paymentStatus === paymentStatus) || []
  }

  function getReceiptsByStatus(status: Receipt['status']): Receipt[] {
    return state.value.receipts?.filter(receipt => receipt.status === status) || []
  }

  // =============================================
  // UTILITY ACTIONS
  // =============================================

  function clearError() {
    // Add error state if needed in future
    console.log(`${MODULE_NAME}: Cleared errors`)
  }

  function isLoading(): boolean {
    return Object.values(state.value.loading).some(loading => loading)
  }

  // =============================================
  // RETURN PUBLIC API - ИСПРАВЛЕНО
  // =============================================

  return {
    // State
    state,

    // Computed
    draftRequests,
    submittedRequests,
    pendingOrders,
    unpaidOrders,
    ordersAwaitingDelivery,
    ordersForReceipt,
    draftReceipts,
    urgentSuggestions,
    statistics,

    // Actions - Requests
    fetchRequests,
    createRequest,
    updateRequest,
    deleteRequest,

    // Actions - Orders
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,

    // Actions - Receipts
    fetchReceipts,
    createReceipt,
    completeReceipt,
    updateReceipt,

    // Actions - Suggestions - КРИТИЧЕСКИ ВАЖНО!
    fetchOrderSuggestions,

    // Actions - Supplier Baskets
    createSupplierBaskets,
    clearSupplierBaskets,

    // Actions - Current Workflow
    setCurrentRequest,
    setCurrentOrder,
    setCurrentReceipt,

    // Actions - Initialization
    initialize,
    refreshAll,

    // Helper Actions
    getRequestById,
    getOrderById,
    getReceiptById,
    getRequestsByStatus,
    getOrdersByStatus,
    getOrdersByPaymentStatus,
    getReceiptsByStatus,

    // Utilities
    clearError,
    isLoading
  }
})
