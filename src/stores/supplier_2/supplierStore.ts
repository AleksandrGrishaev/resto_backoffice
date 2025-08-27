// src/stores/supplier_2/supplierStore.ts - COMPLETE ENHANCED WITH FULL INTEGRATION

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supplierService } from './supplierService'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils, TimeUtils } from '@/utils'

// Import mock data as fallback
import {
  mockProcurementRequests,
  mockPurchaseOrders,
  mockReceipts,
  mockOrderSuggestions
} from './mock/supplierMock'

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
  SupplierStatistics,
  Department,
  RequestStatus,
  OrderStatus,
  ReceiptStatus,
  Priority,
  Urgency
} from './types'

const MODULE_NAME = 'SupplierStore'

// =============================================
// ENHANCED SUPPLIER STATE WITH INTEGRATION
// =============================================

interface IntegrationState {
  isInitialized: boolean
  lastSuggestionsUpdate: string | null
  lastStorageSync: string | null
  lastProductsSync: string | null
  useMockData: boolean
  integrationErrors: string[]
  storageOperationsCreated: number
  priceUpdatesProcessed: number
  integrationHealth: 'excellent' | 'good' | 'poor' | 'critical'
  performanceMetrics: {
    avgSuggestionGenerationTime: number
    avgStorageOperationTime: number
    avgPriceUpdateTime: number
  }
}

// =============================================
// STORE DEFINITION
// =============================================

export const useSupplierStore = defineStore('supplier', () => {
  // =============================================
  // STATE - Enhanced with integration
  // =============================================

  const state = ref<SupplierState>({
    // Core data - Initialize with mock, replace with integrated data
    requests: [...mockProcurementRequests],
    orders: [...mockPurchaseOrders],
    receipts: [...mockReceipts],

    // UI loading states
    loading: {
      requests: false,
      orders: false,
      receipts: false,
      suggestions: false
    },

    // Current workflow objects
    currentRequest: undefined,
    currentOrder: undefined,
    currentReceipt: undefined,

    // Order assistant data
    selectedRequestIds: [],
    orderSuggestions: [...mockOrderSuggestions],

    // Supplier grouping for UI
    supplierBaskets: []
  })

  // NEW: Integration state tracking
  const integrationState = ref<IntegrationState>({
    isInitialized: false,
    lastSuggestionsUpdate: null,
    lastStorageSync: null,
    lastProductsSync: null,
    useMockData: true, // Start with mock data
    integrationErrors: [],
    storageOperationsCreated: 0,
    priceUpdatesProcessed: 0,
    integrationHealth: 'poor',
    performanceMetrics: {
      avgSuggestionGenerationTime: 0,
      avgStorageOperationTime: 0,
      avgPriceUpdateTime: 0
    }
  })

  // Store references for integration
  const storageStore = useStorageStore()
  const productsStore = useProductsStore()

  // =============================================
  // COMPUTED PROPERTIES - Enhanced
  // =============================================

  const draftRequests = computed(() => state.value.requests.filter(req => req.status === 'draft'))

  const submittedRequests = computed(() =>
    state.value.requests.filter(req => req.status === 'submitted')
  )

  const approvedRequests = computed(() =>
    state.value.requests.filter(req => req.status === 'approved')
  )

  const pendingOrders = computed(() =>
    state.value.orders.filter(order => order.paymentStatus === 'pending')
  )

  const paidOrders = computed(() =>
    state.value.orders.filter(order => order.paymentStatus === 'paid')
  )

  const draftOrders = computed(() => state.value.orders.filter(order => order.status === 'draft'))

  const sentOrders = computed(() => state.value.orders.filter(order => order.status === 'sent'))

  const confirmedOrders = computed(() =>
    state.value.orders.filter(order => order.status === 'confirmed')
  )

  const ordersAwaitingDelivery = computed(() =>
    state.value.orders.filter(
      order => ['sent', 'confirmed'].includes(order.status) && order.paymentStatus === 'paid'
    )
  )

  const draftReceipts = computed(() =>
    state.value.receipts.filter(receipt => receipt.status === 'draft')
  )

  const completedReceipts = computed(() =>
    state.value.receipts.filter(receipt => receipt.status === 'completed')
  )

  const receiptsWithDiscrepancies = computed(() =>
    state.value.receipts.filter(receipt => receipt.hasDiscrepancies)
  )

  const urgentSuggestions = computed(() =>
    state.value.orderSuggestions.filter(s => s.urgency === 'high')
  )

  const mediumSuggestions = computed(() =>
    state.value.orderSuggestions.filter(s => s.urgency === 'medium')
  )

  const lowSuggestions = computed(() =>
    state.value.orderSuggestions.filter(s => s.urgency === 'low')
  )

  // ENHANCED: Comprehensive statistics with integration data
  const statistics = computed(
    (): SupplierStatistics & {
      // Extended statistics
      currentMonthOrderValue: number
      currentMonthReceiptCount: number
      averageOrderValue: number
      averageReceiptTime: number
      integrationHealth: string
      lastDataUpdate: string | null
      dataSource: 'mock' | 'integrated'
      performanceScore: number
    } => {
      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()

      // Filter current month data
      const currentMonthOrders = state.value.orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.orderDate)
        return orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear
      })

      const currentMonthReceipts = state.value.receipts.filter(receipt => {
        const receiptDate = new Date(receipt.createdAt || receipt.deliveryDate)
        return receiptDate.getMonth() === thisMonth && receiptDate.getFullYear() === thisYear
      })

      // Calculate averages
      const totalOrderValue = state.value.orders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      )
      const averageOrderValue =
        state.value.orders.length > 0 ? totalOrderValue / state.value.orders.length : 0

      // Calculate receipt processing time
      let totalReceiptTime = 0
      let receiptTimeCount = 0

      for (const receipt of completedReceipts.value) {
        const order = state.value.orders.find(o => o.id === receipt.purchaseOrderId)
        if (order && receipt.deliveryDate && order.orderDate) {
          const orderTime = new Date(order.orderDate).getTime()
          const deliveryTime = new Date(receipt.deliveryDate).getTime()
          totalReceiptTime += deliveryTime - orderTime
          receiptTimeCount++
        }
      }

      const averageReceiptTime =
        receiptTimeCount > 0 ? totalReceiptTime / receiptTimeCount / (1000 * 60 * 60 * 24) : 0

      // Calculate performance score
      const performanceScore = calculatePerformanceScore()

      return {
        // Basic statistics
        totalRequests: state.value.requests.length,
        pendingRequests: submittedRequests.value.length,
        totalOrders: state.value.orders.length,
        ordersAwaitingPayment: pendingOrders.value.length,
        ordersAwaitingDelivery: ordersAwaitingDelivery.value.length,
        totalReceipts: state.value.receipts.length,
        pendingReceipts: draftReceipts.value.length,
        urgentSuggestions: urgentSuggestions.value.length,

        // Enhanced statistics
        currentMonthOrderValue: currentMonthOrders.reduce(
          (sum, order) => sum + (order.totalAmount || 0),
          0
        ),
        currentMonthReceiptCount: currentMonthReceipts.length,
        averageOrderValue: Math.round(averageOrderValue),
        averageReceiptTime: Math.round(averageReceiptTime * 10) / 10,
        integrationHealth: integrationState.value.integrationHealth,
        lastDataUpdate: integrationState.value.lastSuggestionsUpdate,
        dataSource: integrationState.value.useMockData ? 'mock' : 'integrated',
        performanceScore: Math.round(performanceScore * 10) / 10
      }
    }
  )

  const isLoading = computed(
    () =>
      state.value.loading.requests ||
      state.value.loading.orders ||
      state.value.loading.receipts ||
      state.value.loading.suggestions
  )

  const hasIntegrationErrors = computed(() => integrationState.value.integrationErrors.length > 0)

  const isFullyIntegrated = computed(
    () =>
      integrationState.value.isInitialized &&
      !integrationState.value.useMockData &&
      !hasIntegrationErrors.value
  )

  // =============================================
  // CORE ACTIONS - Enhanced with integration
  // =============================================

  /**
   * ENHANCED: Complete initialization with full integration
   */
  async function initialize(): Promise<void> {
    const startTime = Date.now()

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing supplier store with full integration...')

      // Clear previous errors
      integrationState.value.integrationErrors = []

      // Step 1: Ensure dependent stores are initialized
      await ensureDependentStoresReady()

      // Step 2: Initialize integrated data
      await initializeIntegratedData()

      // Step 3: Validate integration health
      validateIntegrationHealth()

      // Step 4: Mark as successfully initialized
      integrationState.value.isInitialized = true
      integrationState.value.useMockData = false
      integrationState.value.lastStorageSync = TimeUtils.getCurrentLocalISO()
      integrationState.value.lastProductsSync = TimeUtils.getCurrentLocalISO()

      const initTime = Date.now() - startTime

      DebugUtils.info(MODULE_NAME, 'Supplier store initialized successfully', {
        initializationTime: `${initTime}ms`,
        suggestions: state.value.orderSuggestions.length,
        requests: state.value.requests.length,
        orders: state.value.orders.length,
        receipts: state.value.receipts.length,
        integrationHealth: integrationState.value.integrationHealth,
        dataSource: integrationState.value.useMockData ? 'mock' : 'integrated'
      })
    } catch (error) {
      const errorMessage = `Initialization failed: ${error}`
      DebugUtils.error(MODULE_NAME, 'Failed to initialize with integration', { error })

      integrationState.value.integrationErrors.push(errorMessage)
      integrationState.value.useMockData = true
      integrationState.value.integrationHealth = 'critical'

      // Still mark as initialized but with mock data
      integrationState.value.isInitialized = true

      DebugUtils.warn(MODULE_NAME, 'Falling back to mock data mode')
    }
  }

  /**
   * NEW: Ensure dependent stores are ready
   */
  async function ensureDependentStoresReady(): Promise<void> {
    try {
      // Initialize Storage Store if needed
      if (storageStore.state.balances.length === 0) {
        DebugUtils.info(MODULE_NAME, 'Initializing Storage Store...')
        await storageStore.initialize()
      }

      // Initialize Products Store if needed
      if (productsStore.products.length === 0) {
        DebugUtils.info(MODULE_NAME, 'Initializing Products Store...')
        await productsStore.loadProducts()
      }

      DebugUtils.info(MODULE_NAME, 'Dependent stores ready', {
        storageBalances: storageStore.state.balances.length,
        products: productsStore.products.length
      })
    } catch (error) {
      throw new Error(`Failed to initialize dependent stores: ${error}`)
    }
  }

  /**
   * NEW: Initialize integrated data
   */
  async function initializeIntegratedData(): Promise<void> {
    try {
      // Generate real suggestions from storage data
      await refreshSuggestions()

      // TODO: Load integrated request/order/receipt data if available
      // For now, we start with mock data and generate new data based on suggestions

      DebugUtils.info(MODULE_NAME, 'Integrated data initialized')
    } catch (error) {
      throw new Error(`Failed to initialize integrated data: ${error}`)
    }
  }

  /**
   * ENHANCED: Refresh suggestions with performance tracking
   */
  async function refreshSuggestions(department?: Department): Promise<void> {
    const startTime = Date.now()

    try {
      state.value.loading.suggestions = true

      DebugUtils.info(MODULE_NAME, 'Refreshing order suggestions from integrated data', {
        department
      })

      const suggestions = await supplierService.getOrderSuggestions(department)
      state.value.orderSuggestions = suggestions
      integrationState.value.lastSuggestionsUpdate = TimeUtils.getCurrentLocalISO()

      // Update performance metrics
      const generationTime = Date.now() - startTime
      updatePerformanceMetric('avgSuggestionGenerationTime', generationTime)

      DebugUtils.info(MODULE_NAME, 'Order suggestions refreshed', {
        count: suggestions.length,
        urgent: suggestions.filter(s => s.urgency === 'high').length,
        medium: suggestions.filter(s => s.urgency === 'medium').length,
        low: suggestions.filter(s => s.urgency === 'low').length,
        department,
        generationTime: `${generationTime}ms`
      })
    } catch (error) {
      const errorMessage = `Suggestions refresh failed: ${error}`
      DebugUtils.error(MODULE_NAME, 'Failed to refresh suggestions', { error })
      integrationState.value.integrationErrors.push(errorMessage)

      // Don't throw - keep existing suggestions
    } finally {
      state.value.loading.suggestions = false
    }
  }

  /**
   * ENHANCED: Create request with price validation and enhancement
   */
  async function createRequest(data: CreateRequestData): Promise<ProcurementRequest> {
    try {
      state.value.loading.requests = true

      DebugUtils.info(MODULE_NAME, 'Creating request with enhanced data', {
        department: data.department,
        itemsCount: data.items.length,
        priority: data.priority
      })

      // Enhance request with latest prices from storage
      const enhancedData = await enhanceRequestWithLatestPrices(data)

      // Create request through service
      const newRequest = await supplierService.createRequest(enhancedData)

      // Add to local state
      state.value.requests.unshift(newRequest)

      // Update current request for workflow
      state.value.currentRequest = newRequest

      DebugUtils.info(MODULE_NAME, 'Request created successfully', {
        requestId: newRequest.id,
        requestNumber: newRequest.requestNumber,
        itemsCount: newRequest.items.length,
        totalValue: newRequest.items.reduce(
          (sum, item) => sum + item.estimatedPrice * item.requestedQuantity,
          0
        ),
        pricesUpdated: enhancedData !== data
      })

      return newRequest
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create request', { error })
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }

  /**
   * ENHANCED: Update request with validation
   */
  async function updateRequest(id: string, data: UpdateRequestData): Promise<ProcurementRequest> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating request', { requestId: id })

      const updatedRequest = await supplierService.updateRequest(id, data)

      // Update in local state
      const index = state.value.requests.findIndex(r => r.id === id)
      if (index !== -1) {
        state.value.requests[index] = updatedRequest
      }

      // Update current request if it's the same
      if (state.value.currentRequest?.id === id) {
        state.value.currentRequest = updatedRequest
      }

      DebugUtils.info(MODULE_NAME, 'Request updated successfully', {
        requestId: id,
        status: updatedRequest.status
      })

      return updatedRequest
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update request', { id, error })
      throw error
    }
  }

  /**
   * ENHANCED: Delete request with cleanup
   */
  async function deleteRequest(id: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deleting request', { requestId: id })

      await supplierService.deleteRequest(id)

      // Remove from local state
      const index = state.value.requests.findIndex(r => r.id === id)
      if (index !== -1) {
        const deletedRequest = state.value.requests[index]
        state.value.requests.splice(index, 1)

        // Clear current request if it's the deleted one
        if (state.value.currentRequest?.id === id) {
          state.value.currentRequest = undefined
        }

        // Remove from selected requests
        const selectedIndex = state.value.selectedRequestIds.indexOf(id)
        if (selectedIndex !== -1) {
          state.value.selectedRequestIds.splice(selectedIndex, 1)
        }

        DebugUtils.info(MODULE_NAME, 'Request deleted successfully', {
          requestId: id,
          requestNumber: deletedRequest.requestNumber
        })
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete request', { id, error })
      throw error
    }
  }

  /**
   * ENHANCED: Get all requests with optional filtering
   */
  async function getRequests(filters?: {
    status?: RequestStatus[]
    department?: Department
    priority?: Priority
    dateFrom?: string
    dateTo?: string
  }): Promise<ProcurementRequest[]> {
    try {
      state.value.loading.requests = true

      let requests = await supplierService.getRequests()

      // Apply filters if provided
      if (filters) {
        if (filters.status?.length) {
          requests = requests.filter(req => filters.status!.includes(req.status))
        }
        if (filters.department) {
          requests = requests.filter(req => req.department === filters.department)
        }
        if (filters.priority) {
          requests = requests.filter(req => req.priority === filters.priority)
        }
        if (filters.dateFrom) {
          requests = requests.filter(req => req.createdAt >= filters.dateFrom!)
        }
        if (filters.dateTo) {
          requests = requests.filter(req => req.createdAt <= filters.dateTo!)
        }
      }

      state.value.requests = requests
      return requests
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get requests', { error })
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }

  /**
   * ENHANCED: Create order with supplier assignment
   */
  async function createOrder(data: CreateOrderData): Promise<PurchaseOrder> {
    try {
      state.value.loading.orders = true

      DebugUtils.info(MODULE_NAME, 'Creating purchase order', {
        supplierId: data.supplierId,
        itemsCount: data.items?.length || 0,
        requestIds: data.requestIds
      })

      const newOrder = await supplierService.createOrder(data)

      // Add to local state
      state.value.orders.unshift(newOrder)

      // Update current order
      state.value.currentOrder = newOrder

      // Mark related requests as processed
      if (data.requestIds) {
        for (const requestId of data.requestIds) {
          await updateRequest(requestId, { status: 'approved' })
        }
      }

      DebugUtils.info(MODULE_NAME, 'Purchase order created successfully', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        totalAmount: newOrder.totalAmount,
        supplierId: newOrder.supplierId
      })

      return newOrder
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create order', { error })
      throw error
    } finally {
      state.value.loading.orders = false
    }
  }

  /**
   * ENHANCED: Update order with status tracking
   */
  async function updateOrder(id: string, data: UpdateOrderData): Promise<PurchaseOrder> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating order', { orderId: id })

      const updatedOrder = await supplierService.updateOrder(id, data)

      // Update in local state
      const index = state.value.orders.findIndex(o => o.id === id)
      if (index !== -1) {
        state.value.orders[index] = updatedOrder
      }

      // Update current order if it's the same
      if (state.value.currentOrder?.id === id) {
        state.value.currentOrder = updatedOrder
      }

      DebugUtils.info(MODULE_NAME, 'Order updated successfully', {
        orderId: id,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus
      })

      return updatedOrder
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update order', { id, error })
      throw error
    }
  }

  /**
   * ENHANCED: Get all orders with optional filtering
   */
  async function getOrders(filters?: {
    status?: OrderStatus[]
    paymentStatus?: ('pending' | 'paid' | 'failed')[]
    supplierId?: string
    dateFrom?: string
    dateTo?: string
  }): Promise<PurchaseOrder[]> {
    try {
      state.value.loading.orders = true

      let orders = await supplierService.getOrders()

      // Apply filters if provided
      if (filters) {
        if (filters.status?.length) {
          orders = orders.filter(order => filters.status!.includes(order.status))
        }
        if (filters.paymentStatus?.length) {
          orders = orders.filter(order => filters.paymentStatus!.includes(order.paymentStatus))
        }
        if (filters.supplierId) {
          orders = orders.filter(order => order.supplierId === filters.supplierId)
        }
        if (filters.dateFrom) {
          orders = orders.filter(order => order.createdAt >= filters.dateFrom!)
        }
        if (filters.dateTo) {
          orders = orders.filter(order => order.createdAt <= filters.dateTo!)
        }
      }

      state.value.orders = orders
      return orders
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get orders', { error })
      throw error
    } finally {
      state.value.loading.orders = false
    }
  }
  async function createSupplierBaskets(requestIds: string[]): Promise<void> {
    try {
      state.value.loading.requests = true

      console.log('SupplierStore: Creating supplier baskets', { requestIds })

      // Вызываем сервис для создания корзин
      const baskets = await supplierService.createSupplierBaskets(requestIds)

      // Сохраняем в состоянии
      state.value.supplierBaskets = baskets

      console.log(`SupplierStore: Created ${baskets.length} supplier baskets`, {
        totalBaskets: baskets.length,
        unassignedItems: baskets.find(b => b.supplierId === null)?.items.length || 0
      })
    } catch (error) {
      console.error('SupplierStore: Failed to create supplier baskets', { error })
      throw error
    } finally {
      state.value.loading.requests = false
    }
  }
  /**
   * ИСПРАВЛЕНИЕ: Update request status after order creation
   */
  async function updateRequestStatus(requestId: string, status: RequestStatus): Promise<void> {
    try {
      const request = state.value.requests.find(req => req.id === requestId)
      if (request) {
        request.status = status
        request.updatedAt = new Date().toISOString()

        console.log(`SupplierStore: Updated request ${requestId} status to ${status}`)
      }
    } catch (error) {
      console.error('SupplierStore: Failed to update request status', { requestId, status, error })
      throw error
    }
  }

  /**
   * ENHANCED: Create receipt with validation
   */
  async function createReceipt(data: CreateReceiptData): Promise<Receipt> {
    try {
      state.value.loading.receipts = true

      DebugUtils.info(MODULE_NAME, 'Creating receipt', {
        orderId: data.purchaseOrderId,
        itemsCount: data.items.length,
        receivedBy: data.receivedBy
      })

      const newReceipt = await supplierService.createReceipt(data)

      // Add to local state
      state.value.receipts.unshift(newReceipt)

      // Update current receipt
      state.value.currentReceipt = newReceipt

      DebugUtils.info(MODULE_NAME, 'Receipt created successfully', {
        receiptId: newReceipt.id,
        receiptNumber: newReceipt.receiptNumber,
        hasDiscrepancies: newReceipt.hasDiscrepancies
      })

      return newReceipt
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create receipt', { error })
      throw error
    } finally {
      state.value.loading.receipts = false
    }
  }

  /**
   * ENHANCED: Update receipt with basic validation
   */
  async function updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating receipt', { receiptId: id })

      const updatedReceipt = await supplierService.updateReceipt(id, data)

      // Update in local state
      const index = state.value.receipts.findIndex(r => r.id === id)
      if (index !== -1) {
        state.value.receipts[index] = updatedReceipt
      }

      // Update current receipt if it's the same
      if (state.value.currentReceipt?.id === id) {
        state.value.currentReceipt = updatedReceipt
      }

      DebugUtils.info(MODULE_NAME, 'Receipt updated successfully', {
        receiptId: id,
        status: updatedReceipt.status
      })

      return updatedReceipt
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update receipt', { id, error })
      throw error
    }
  }

  /**
   * ENHANCED: Get all receipts with optional filtering
   */
  async function getReceipts(filters?: {
    status?: ReceiptStatus[]
    hasDiscrepancies?: boolean
    dateFrom?: string
    dateTo?: string
  }): Promise<Receipt[]> {
    try {
      state.value.loading.receipts = true

      let receipts = await supplierService.getReceipts()

      // Apply filters if provided
      if (filters) {
        if (filters.status?.length) {
          receipts = receipts.filter(receipt => filters.status!.includes(receipt.status))
        }
        if (filters.hasDiscrepancies !== undefined) {
          receipts = receipts.filter(
            receipt => receipt.hasDiscrepancies === filters.hasDiscrepancies
          )
        }
        if (filters.dateFrom) {
          receipts = receipts.filter(receipt => receipt.createdAt >= filters.dateFrom!)
        }
        if (filters.dateTo) {
          receipts = receipts.filter(receipt => receipt.createdAt <= filters.dateTo!)
        }
      }

      state.value.receipts = receipts
      return receipts
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get receipts', { error })
      throw error
    } finally {
      state.value.loading.receipts = false
    }
  }

  /**
   * ENHANCED: Complete receipt with full storage integration
   */
  async function completeReceipt(receiptId: string, data?: UpdateReceiptData): Promise<Receipt> {
    const startTime = Date.now()

    try {
      state.value.loading.receipts = true

      DebugUtils.info(MODULE_NAME, 'Completing receipt with storage integration', { receiptId })

      // Use enhanced service method that handles storage operations and price updates
      const updatedReceipt = await supplierService.completeReceipt(receiptId, data || {})

      // Update local state
      const index = state.value.receipts.findIndex(r => r.id === receiptId)
      if (index !== -1) {
        state.value.receipts[index] = updatedReceipt
      }

      // Update current receipt
      if (state.value.currentReceipt?.id === receiptId) {
        state.value.currentReceipt = updatedReceipt
      }

      // Update metrics
      integrationState.value.storageOperationsCreated += 1
      if (
        updatedReceipt.items.some(
          item => item.actualPrice && item.actualPrice !== item.orderedPrice
        )
      ) {
        integrationState.value.priceUpdatesProcessed += 1
      }

      const operationTime = Date.now() - startTime
      updatePerformanceMetric('avgStorageOperationTime', operationTime)

      DebugUtils.info(MODULE_NAME, 'Receipt completed with full integration', {
        receiptId: updatedReceipt.id,
        receiptNumber: updatedReceipt.receiptNumber,
        storageOperationId: updatedReceipt.storageOperationId,
        hasDiscrepancies: updatedReceipt.hasDiscrepancies,
        operationTime: `${operationTime}ms`,
        storageOperationsTotal: integrationState.value.storageOperationsCreated
      })

      return updatedReceipt
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to complete receipt', { receiptId, error })
      integrationState.value.integrationErrors.push(`Receipt completion failed: ${error}`)
      throw error
    } finally {
      state.value.loading.receipts = false
    }
  }

  // =============================================
  // INTEGRATION HELPER METHODS
  // =============================================

  /**
   * ENHANCED: Enhance request data with latest prices from storage
   */
  async function enhanceRequestWithLatestPrices(
    data: CreateRequestData
  ): Promise<CreateRequestData> {
    const startTime = Date.now()

    try {
      const itemIds = data.items.map(item => item.itemId)
      const latestPrices = await supplierService.getLatestPrices(itemIds)

      let pricesUpdated = 0
      const enhancedItems = data.items.map(item => {
        const latestPrice = latestPrices[item.itemId]
        if (latestPrice && Math.abs(latestPrice - item.estimatedPrice) > 0.01) {
          pricesUpdated++
          return {
            ...item,
            estimatedPrice: latestPrice,
            notes:
              `${item.notes || ''} [Price updated: ${item.estimatedPrice} → ${latestPrice}]`.trim()
          }
        }
        return item
      })

      const updateTime = Date.now() - startTime
      updatePerformanceMetric('avgPriceUpdateTime', updateTime)

      if (pricesUpdated > 0) {
        DebugUtils.info(MODULE_NAME, 'Request enhanced with latest prices', {
          totalItems: itemIds.length,
          pricesUpdated,
          updateTime: `${updateTime}ms`
        })
      }

      return {
        ...data,
        items: enhancedItems
      }
    } catch (error) {
      DebugUtils.warn(
        MODULE_NAME,
        'Failed to enhance request with latest prices, using original data',
        { error }
      )
      integrationState.value.integrationErrors.push(`Price enhancement failed: ${error}`)
      return data
    }
  }

  /**
   * NEW: Get balance info for item with department filtering
   */
  function getItemBalance(itemId: string, department?: Department) {
    try {
      if (department) {
        const balances = storageStore.departmentBalances(department)
        return balances.find(b => b.itemId === itemId)
      } else {
        return storageStore.getBalance(itemId)
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to get item balance', { itemId, department, error })
      return null
    }
  }

  /**
   * NEW: Get detailed item information from all sources
   */
  function getItemInfo(itemId: string, department?: Department) {
    try {
      const balance = getItemBalance(itemId, department)
      const product = productsStore.products.find(p => p.id === itemId)
      const suggestion = state.value.orderSuggestions.find(s => s.itemId === itemId)

      return {
        // Basic info
        itemId,
        itemName: product?.name || balance?.itemName || itemId,
        category: product?.category || 'unknown',
        unit: product?.unit || balance?.unit || 'kg',

        // Stock info
        currentStock: balance?.totalQuantity || 0,
        minStock: product?.minStock || 0,
        maxStock: product?.maxStock,
        belowMinStock: balance?.belowMinStock || false,

        // Pricing info
        baseCost: product?.baseCostPerUnit || product?.costPerUnit || 0,
        latestCost: balance?.latestCost || 0,
        averageCost: balance?.averageCost || 0,

        // Dates
        lastReceiptDate: balance?.newestBatchDate,
        oldestBatchDate: balance?.oldestBatchDate,

        // Status flags
        isActive: product?.isActive ?? true,
        canBeSold: product?.canBeSold ?? false,
        hasExpired: balance?.hasExpired || false,
        hasNearExpiry: balance?.hasNearExpiry || false,

        // Suggestion info
        isUrgent: suggestion?.urgency === 'high',
        suggestedQuantity: suggestion?.suggestedQuantity,
        urgency: suggestion?.urgency,
        reason: suggestion?.reason,

        // Additional data
        shelfLife: product?.shelfLife,
        totalValue: balance?.totalValue || 0
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to get item info', { itemId, error })
      return null
    }
  }

  /**
   * NEW: Get comprehensive integration status
   */
  function getIntegrationStatus() {
    return {
      // Basic status
      isInitialized: integrationState.value.isInitialized,
      useMockData: integrationState.value.useMockData,
      hasErrors: integrationState.value.integrationErrors.length > 0,
      errors: [...integrationState.value.integrationErrors],

      // Data sources
      storageConnected: storageStore.state.balances.length > 0,
      productsConnected: productsStore.products.length > 0,

      // Sync status
      lastSuggestionsUpdate: integrationState.value.lastSuggestionsUpdate,
      lastStorageSync: integrationState.value.lastStorageSync,
      lastProductsSync: integrationState.value.lastProductsSync,

      // Health and performance
      integrationHealth: integrationState.value.integrationHealth,
      performanceMetrics: { ...integrationState.value.performanceMetrics },

      // Statistics
      storageOperationsCreated: integrationState.value.storageOperationsCreated,
      priceUpdatesProcessed: integrationState.value.priceUpdatesProcessed,

      // Data counts
      totalSuggestions: state.value.orderSuggestions.length,
      urgentSuggestions: urgentSuggestions.value.length,
      totalRequests: state.value.requests.length,
      totalOrders: state.value.orders.length,
      totalReceipts: state.value.receipts.length
    }
  }

  /**
   * NEW: Force refresh all integrated data
   */
  async function refreshIntegratedData(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Refreshing all integrated data...')

      // Clear previous errors
      integrationState.value.integrationErrors = []

      // Refresh storage data
      await storageStore.fetchBalances()
      integrationState.value.lastStorageSync = TimeUtils.getCurrentLocalISO()

      // Refresh products data
      await productsStore.loadProducts()
      integrationState.value.lastProductsSync = TimeUtils.getCurrentLocalISO()

      // Refresh suggestions based on new data
      await refreshSuggestions()

      // Validate integration health
      validateIntegrationHealth()

      DebugUtils.info(MODULE_NAME, 'All integrated data refreshed successfully', {
        integrationHealth: integrationState.value.integrationHealth
      })
    } catch (error) {
      const errorMessage = `Data refresh failed: ${error}`
      DebugUtils.error(MODULE_NAME, 'Failed to refresh integrated data', { error })
      integrationState.value.integrationErrors.push(errorMessage)
      integrationState.value.integrationHealth = 'poor'
      throw error
    }
  }

  /**
   * NEW: Clear integration errors
   */
  function clearIntegrationErrors(): void {
    integrationState.value.integrationErrors = []

    // Recalculate health after clearing errors
    validateIntegrationHealth()

    DebugUtils.info(MODULE_NAME, 'Integration errors cleared')
  }

  /**
   * NEW: Validate integration health
   */
  function validateIntegrationHealth(): void {
    const errors = integrationState.value.integrationErrors.length
    const hasStorageData = storageStore.state.balances.length > 0
    const hasProductsData = productsStore.products.length > 0
    const hasSuggestions = state.value.orderSuggestions.length > 0

    let health: 'excellent' | 'good' | 'poor' | 'critical' = 'excellent'

    if (errors > 5 || !hasStorageData || !hasProductsData) {
      health = 'critical'
    } else if (errors > 2 || !hasSuggestions) {
      health = 'poor'
    } else if (errors > 0) {
      health = 'good'
    }

    integrationState.value.integrationHealth = health

    DebugUtils.debug(MODULE_NAME, 'Integration health validated', {
      health,
      errors,
      hasStorageData,
      hasProductsData,
      hasSuggestions
    })
  }

  /**
   * NEW: Update performance metrics
   */
  function updatePerformanceMetric(
    metric: keyof IntegrationState['performanceMetrics'],
    newValue: number
  ): void {
    const current = integrationState.value.performanceMetrics[metric]
    // Simple moving average
    integrationState.value.performanceMetrics[metric] =
      current === 0 ? newValue : (current + newValue) / 2
  }

  /**
   * NEW: Calculate overall performance score
   */
  function calculatePerformanceScore(): number {
    const metrics = integrationState.value.performanceMetrics
    const health = integrationState.value.integrationHealth
    const errors = integrationState.value.integrationErrors.length

    // Base score from health
    let score = 100
    switch (health) {
      case 'excellent':
        score = 100
        break
      case 'good':
        score = 80
        break
      case 'poor':
        score = 60
        break
      case 'critical':
        score = 30
        break
    }

    // Penalize for errors
    score -= errors * 5

    // Bonus for fast performance
    if (metrics.avgSuggestionGenerationTime < 100) score += 5
    if (metrics.avgStorageOperationTime < 500) score += 5
    if (metrics.avgPriceUpdateTime < 50) score += 5

    return Math.max(0, Math.min(100, score))
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  function getRequestById(id: string): ProcurementRequest | undefined {
    return state.value.requests.find(req => req.id === id)
  }

  function getOrderById(id: string): PurchaseOrder | undefined {
    return state.value.orders.find(order => order.id === id)
  }

  function getReceiptById(id: string): Receipt | undefined {
    return state.value.receipts.find(receipt => receipt.id === id)
  }

  // =============================================
  // SUPPLIER BASKET MANAGEMENT
  // =============================================

  function addToSupplierBasket(item: any, supplierId: string | null): void {
    try {
      // Find or create basket
      let basket = state.value.supplierBaskets.find(b => b.supplierId === supplierId)

      if (!basket) {
        const supplierName = supplierId ? `Supplier ${supplierId}` : 'Unassigned'

        basket = {
          supplierId,
          supplierName,
          items: [],
          totalItems: 0,
          estimatedTotal: 0
        }
        state.value.supplierBaskets.push(basket)
      }

      // Add item to basket
      basket.items.push(item)
      basket.totalItems = basket.items.length
      basket.estimatedTotal = basket.items.reduce(
        (sum, item) => sum + item.estimatedPrice * item.totalQuantity,
        0
      )

      DebugUtils.debug(MODULE_NAME, 'Item added to supplier basket', {
        supplierId,
        itemId: item.itemId,
        basketTotal: basket.estimatedTotal
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to add item to supplier basket', { error })
    }
  }

  function removeFromSupplierBasket(supplierId: string | null, itemId: string): void {
    try {
      const basket = state.value.supplierBaskets.find(b => b.supplierId === supplierId)

      if (basket) {
        const itemIndex = basket.items.findIndex(item => item.itemId === itemId)

        if (itemIndex !== -1) {
          basket.items.splice(itemIndex, 1)
          basket.totalItems = basket.items.length
          basket.estimatedTotal = basket.items.reduce(
            (sum, item) => sum + item.estimatedPrice * item.totalQuantity,
            0
          )

          // Remove empty baskets
          if (basket.items.length === 0) {
            const basketIndex = state.value.supplierBaskets.indexOf(basket)
            state.value.supplierBaskets.splice(basketIndex, 1)
          }

          DebugUtils.debug(MODULE_NAME, 'Item removed from supplier basket', {
            supplierId,
            itemId,
            remainingItems: basket.items.length
          })
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove item from supplier basket', { error })
    }
  }

  function clearSupplierBaskets(): void {
    state.value.supplierBaskets = []
    console.log('SupplierStore: Cleared supplier baskets')
  }

  function getSupplierBasket(supplierId: string | null): SupplierBasket | undefined {
    return state.value.supplierBaskets.find(b => b.supplierId === supplierId)
  }

  // =============================================
  // WORKFLOW MANAGEMENT
  // =============================================

  function setCurrentRequest(request: ProcurementRequest | undefined): void {
    state.value.currentRequest = request
    DebugUtils.debug(MODULE_NAME, 'Current request set', {
      requestId: request?.id,
      requestNumber: request?.requestNumber
    })
  }

  function setCurrentOrder(order: PurchaseOrder | undefined): void {
    state.value.currentOrder = order
    DebugUtils.debug(MODULE_NAME, 'Current order set', {
      orderId: order?.id,
      orderNumber: order?.orderNumber
    })
  }

  function setCurrentReceipt(receipt: Receipt | undefined): void {
    state.value.currentReceipt = receipt
    DebugUtils.debug(MODULE_NAME, 'Current receipt set', {
      receiptId: receipt?.id,
      receiptNumber: receipt?.receiptNumber
    })
  }

  // =============================================
  // SELECTION MANAGEMENT
  // =============================================

  function toggleRequestSelection(requestId: string): void {
    const index = state.value.selectedRequestIds.indexOf(requestId)

    if (index !== -1) {
      state.value.selectedRequestIds.splice(index, 1)
    } else {
      state.value.selectedRequestIds.push(requestId)
    }

    DebugUtils.debug(MODULE_NAME, 'Request selection toggled', {
      requestId,
      isSelected: index === -1,
      totalSelected: state.value.selectedRequestIds.length
    })
  }

  function selectAllRequests(requests: ProcurementRequest[]): void {
    state.value.selectedRequestIds = requests.map(req => req.id)
    DebugUtils.debug(MODULE_NAME, 'All requests selected', {
      count: state.value.selectedRequestIds.length
    })
  }

  function clearRequestSelection(): void {
    state.value.selectedRequestIds = []
    DebugUtils.debug(MODULE_NAME, 'Request selection cleared')
  }

  function getSelectedRequests(): ProcurementRequest[] {
    return state.value.requests.filter(req => state.value.selectedRequestIds.includes(req.id))
  }

  // =============================================
  // ANALYTICS AND REPORTING
  // =============================================

  function getDepartmentStatistics(department: Department) {
    const requests = state.value.requests.filter(req => req.department === department)
    const orders = state.value.orders.filter(order => {
      // Determine department from order items
      return order.items.some(item => {
        if (department === 'bar') {
          return (
            item.itemId.includes('beer') ||
            item.itemId.includes('cola') ||
            item.itemId.includes('water')
          )
        } else {
          return (
            !item.itemId.includes('beer') &&
            !item.itemId.includes('cola') &&
            !item.itemId.includes('water')
          )
        }
      })
    })

    const suggestions = state.value.orderSuggestions.filter(s => {
      if (department === 'bar') {
        return s.itemId.includes('beer') || s.itemId.includes('cola') || s.itemId.includes('water')
      } else {
        return (
          !s.itemId.includes('beer') && !s.itemId.includes('cola') && !s.itemId.includes('water')
        )
      }
    })

    return {
      department,
      totalRequests: requests.length,
      pendingRequests: requests.filter(r => r.status === 'submitted').length,
      totalOrders: orders.length,
      totalOrderValue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      totalSuggestions: suggestions.length,
      urgentSuggestions: suggestions.filter(s => s.urgency === 'high').length,
      mediumSuggestions: suggestions.filter(s => s.urgency === 'medium').length,
      lowSuggestions: suggestions.filter(s => s.urgency === 'low').length
    }
  }

  function getSupplierStatistics(supplierId: string) {
    const orders = state.value.orders.filter(order => order.supplierId === supplierId)
    const receipts = state.value.receipts.filter(receipt => {
      const order = state.value.orders.find(o => o.id === receipt.purchaseOrderId)
      return order?.supplierId === supplierId
    })

    const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    const avgOrderValue = orders.length > 0 ? totalValue / orders.length : 0

    const onTimeDeliveries = receipts.filter(receipt => {
      const order = orders.find(o => o.id === receipt.purchaseOrderId)
      if (!order?.expectedDeliveryDate || !receipt.deliveryDate) return false

      const expected = new Date(order.expectedDeliveryDate).getTime()
      const actual = new Date(receipt.deliveryDate).getTime()
      return actual <= expected
    })

    return {
      supplierId,
      totalOrders: orders.length,
      totalValue,
      avgOrderValue: Math.round(avgOrderValue),
      totalReceipts: receipts.length,
      onTimeDeliveryRate:
        receipts.length > 0 ? (onTimeDeliveries.length / receipts.length) * 100 : 0,
      receiptsWithDiscrepancies: receipts.filter(r => r.hasDiscrepancies).length,
      lastOrderDate: orders.length > 0 ? orders[0].orderDate : null
    }
  }

  function getPerformanceReport() {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthlyOrders = state.value.orders.filter(order => new Date(order.createdAt) >= thisMonth)

    const monthlyReceipts = state.value.receipts.filter(
      receipt => new Date(receipt.createdAt) >= thisMonth
    )

    return {
      period: `${thisMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
      totalOrders: monthlyOrders.length,
      totalOrderValue: monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      totalReceipts: monthlyReceipts.length,
      receiptsWithDiscrepancies: monthlyReceipts.filter(r => r.hasDiscrepancies).length,
      avgOrderProcessingTime: calculateAvgOrderProcessingTime(monthlyOrders, monthlyReceipts),
      integrationHealth: integrationState.value.integrationHealth,
      performanceScore: calculatePerformanceScore(),
      storageOperationsCreated: integrationState.value.storageOperationsCreated,
      priceUpdatesProcessed: integrationState.value.priceUpdatesProcessed
    }
  }

  function calculateAvgOrderProcessingTime(orders: PurchaseOrder[], receipts: Receipt[]): number {
    let totalTime = 0
    let processedOrders = 0

    for (const order of orders) {
      const receipt = receipts.find(r => r.purchaseOrderId === order.id && r.status === 'completed')
      if (receipt && receipt.deliveryDate) {
        const orderTime = new Date(order.orderDate).getTime()
        const deliveryTime = new Date(receipt.deliveryDate).getTime()
        totalTime += deliveryTime - orderTime
        processedOrders++
      }
    }

    return processedOrders > 0 ? totalTime / processedOrders / (1000 * 60 * 60 * 24) : 0
  }

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // ===== STATE =====
    state,
    integrationState,

    // ===== COMPUTED PROPERTIES =====
    // Request filters
    draftRequests,
    submittedRequests,
    approvedRequests,

    // Order filters
    pendingOrders,
    paidOrders,
    draftOrders,
    sentOrders,
    confirmedOrders,
    ordersAwaitingDelivery,

    // Receipt filters
    draftReceipts,
    completedReceipts,
    receiptsWithDiscrepancies,

    // Suggestion filters
    urgentSuggestions,
    mediumSuggestions,
    lowSuggestions,

    // Status indicators
    statistics,
    isLoading,
    hasIntegrationErrors,
    isFullyIntegrated,

    // ===== CORE ACTIONS =====
    initialize,
    refreshSuggestions,
    refreshIntegratedData,

    // ===== CRUD OPERATIONS =====
    // Requests
    getRequests,
    createRequest,
    updateRequest,
    deleteRequest,

    // Orders
    getOrders,
    createOrder,
    updateOrder,

    // Receipts
    getReceipts,
    createReceipt,
    updateReceipt,
    completeReceipt,

    // ===== INTEGRATION METHODS =====
    enhanceRequestWithLatestPrices,
    getIntegrationStatus,
    getItemBalance,
    getItemInfo,
    clearIntegrationErrors,
    validateIntegrationHealth,

    // ===== UTILITY METHODS =====
    getRequestById,
    getOrderById,
    getReceiptById,

    // ===== SUPPLIER BASKET MANAGEMENT =====
    addToSupplierBasket,
    removeFromSupplierBasket,
    clearSupplierBaskets,
    getSupplierBasket,

    // ===== WORKFLOW MANAGEMENT =====
    setCurrentRequest,
    setCurrentOrder,
    setCurrentReceipt,

    // ===== SELECTION MANAGEMENT =====
    toggleRequestSelection,
    selectAllRequests,
    clearRequestSelection,
    getSelectedRequests,

    // ===== ANALYTICS AND REPORTING =====
    getDepartmentStatistics,
    getSupplierStatistics,
    getPerformanceReport,

    createSupplierBaskets,
    updateRequestStatus
  }
})
