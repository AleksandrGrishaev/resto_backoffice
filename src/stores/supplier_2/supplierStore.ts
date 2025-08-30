// src/stores/supplier_2/supplierStore.ts - FIXED TO USE COORDINATOR

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supplierService } from './supplierService'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { mockDataCoordinator } from '@/stores/shared/mockDataCoordinator'
import { DebugUtils, TimeUtils } from '@/utils'

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

export const useSupplierStore = defineStore('supplier', () => {
  // =============================================
  // STATE - Initialize empty, load from coordinator
  // =============================================

  const state = ref<SupplierState>({
    requests: [], // ✅ Start empty, load from coordinator
    orders: [], // ✅ Start empty, load from coordinator
    receipts: [], // ✅ Start empty, load from coordinator

    loading: {
      requests: false,
      orders: false,
      receipts: false,
      suggestions: false
    },

    currentRequest: undefined,
    currentOrder: undefined,
    currentReceipt: undefined,

    selectedRequestIds: [],
    orderSuggestions: [], // ✅ Start empty, load from coordinator

    supplierBaskets: []
  })

  const integrationState = ref<IntegrationState>({
    isInitialized: false,
    lastSuggestionsUpdate: null,
    lastStorageSync: null,
    lastProductsSync: null,
    useMockData: true,
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

  const storageStore = useStorageStore()
  const productsStore = useProductsStore()

  // =============================================
  // COMPUTED PROPERTIES
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

  const statistics = computed(
    (): SupplierStatistics & {
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

      const currentMonthOrders = state.value.orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.orderDate)
        return orderDate.getMonth() === thisMonth && orderDate.getFullYear() === thisYear
      })

      const currentMonthReceipts = state.value.receipts.filter(receipt => {
        const receiptDate = new Date(receipt.createdAt || receipt.deliveryDate)
        return receiptDate.getMonth() === thisMonth && receiptDate.getFullYear() === thisYear
      })

      const totalOrderValue = state.value.orders.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      )
      const averageOrderValue =
        state.value.orders.length > 0 ? totalOrderValue / state.value.orders.length : 0

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
      const performanceScore = calculatePerformanceScore()

      return {
        totalRequests: state.value.requests.length,
        pendingRequests: submittedRequests.value.length,
        totalOrders: state.value.orders.length,
        ordersAwaitingPayment: pendingOrders.value.length,
        ordersAwaitingDelivery: ordersAwaitingDelivery.value.length,
        totalReceipts: state.value.receipts.length,
        pendingReceipts: draftReceipts.value.length,
        urgentSuggestions: urgentSuggestions.value.length,

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
  // CORE ACTIONS - Load from coordinator
  // =============================================

  /**
   * ✅ FIXED: Load data from mockDataCoordinator instead of old mocks
   */
  async function initialize(): Promise<void> {
    if (integrationState.value.isInitialized) {
      DebugUtils.info(MODULE_NAME, 'Store already initialized')
      return
    }
    const startTime = Date.now()

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing supplier store from mockDataCoordinator...')

      integrationState.value.integrationErrors = []

      // Step 1: Load data from coordinator (БЕЗ suggestions)
      await loadDataFromCoordinator()

      // Step 2: Ensure dependent stores are ready
      await ensureDependentStoresReady()

      // Step 3: ✅ НОВОЕ: Сразу генерируем suggestions из Storage данных
      try {
        DebugUtils.info(MODULE_NAME, 'Generating initial suggestions from Storage data...')
        await refreshSuggestions() // Генерируем для всех департаментов
        DebugUtils.info(MODULE_NAME, 'Initial suggestions generated successfully', {
          total: state.value.orderSuggestions.length
        })
      } catch (suggestionsError) {
        DebugUtils.warn(MODULE_NAME, 'Failed to generate initial suggestions', {
          error: suggestionsError
        })
        // Оставляем suggestions пустыми, не загружаем mock данные
        state.value.orderSuggestions = []
      }

      // Step 4: Validate integration health
      validateIntegrationHealth()

      // Step 5: Mark as successfully initialized
      integrationState.value.isInitialized = true
      integrationState.value.useMockData = false // ← Теперь всегда false для suggestions

      const initTime = Date.now() - startTime

      DebugUtils.info(MODULE_NAME, 'Supplier store initialized successfully', {
        initializationTime: `${initTime}ms`,
        suggestions: state.value.orderSuggestions.length,
        requests: state.value.requests.length,
        orders: state.value.orders.length,
        receipts: state.value.receipts.length,
        dataSource: 'dynamic_storage_only' // ← Новый источник данных
      })
    } catch (error) {
      const errorMessage = `Initialization failed: ${error}`
      DebugUtils.error(MODULE_NAME, 'Failed to initialize supplier store', { error })

      integrationState.value.integrationErrors.push(errorMessage)
      integrationState.value.integrationHealth = 'critical'
      integrationState.value.isInitialized = true

      // При ошибке suggestions остаются пустыми
      state.value.orderSuggestions = []

      DebugUtils.warn(MODULE_NAME, 'Supplier store initialized with errors - no suggestions loaded')
    }
  }

  /**
   * ✅ NEW: Load all data from mockDataCoordinator
   */
  async function loadDataFromCoordinator(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading data from mockDataCoordinator...')

      // Проверить, что координатор существует
      if (!mockDataCoordinator) {
        throw new Error('mockDataCoordinator is not available')
      }

      // Получить данные с проверкой
      const supplierData = mockDataCoordinator.getSupplierStoreData()

      if (!supplierData) {
        throw new Error('No supplier data returned from coordinator')
      }

      // Проверить структуру данных
      if (!Array.isArray(supplierData.requests)) {
        throw new Error('Invalid requests data structure from coordinator')
      }

      // Load data into state
      state.value.requests = [...supplierData.requests]
      state.value.orders = [...supplierData.orders]
      state.value.receipts = [...supplierData.receipts]
      state.value.orderSuggestions = [...supplierData.suggestions]

      DebugUtils.info(MODULE_NAME, 'Data loaded from coordinator successfully', {
        requests: state.value.requests.length,
        orders: state.value.orders.length,
        receipts: state.value.receipts.length,
        suggestions: state.value.orderSuggestions.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load data from coordinator', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error)
      })
      throw new Error(`Failed to load coordinator data: ${error}`)
    }
  }

  async function ensureDependentStoresReady(): Promise<void> {
    try {
      if (storageStore.state.balances.length === 0) {
        DebugUtils.info(MODULE_NAME, 'Initializing Storage Store...')
        await storageStore.initialize()
      }

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
   * ✅ ИСПРАВЛЕННАЯ функция: Обновить предложения с учетом существующих заявок
   */
  async function refreshSuggestions(department?: Department): Promise<void> {
    const startTime = Date.now()

    try {
      state.value.loading.suggestions = true
      integrationState.value.integrationErrors = []

      DebugUtils.info(MODULE_NAME, 'Refreshing suggestions with dynamic data', {
        department: department || 'all',
        flow: 'supplierStore → supplierService → storageIntegration'
      })

      // ✅ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Используем supplierService.refreshSuggestions()
      // вместо getOrderSuggestions() для принудительного обновления
      const suggestions = await supplierService.refreshSuggestions(department)

      // Обновляем состояние
      state.value.orderSuggestions = suggestions
      integrationState.value.lastSuggestionsUpdate = TimeUtils.getCurrentLocalISO()

      // Обновляем метрики
      const refreshTime = Date.now() - startTime
      updatePerformanceMetric('avgSuggestionGenerationTime', refreshTime)

      // Проверяем качество данных
      const dataQuality = analyzeSuggestionsQuality(suggestions)

      DebugUtils.info(MODULE_NAME, 'Suggestions refreshed successfully', {
        department: department || 'all',
        total: suggestions.length,
        urgent: suggestions.filter(s => s.urgency === 'high').length,
        medium: suggestions.filter(s => s.urgency === 'medium').length,
        low: suggestions.filter(s => s.urgency === 'low').length,
        refreshTime: `${refreshTime}ms`,
        dataQuality: {
          withCurrentStock: dataQuality.withCurrentStock,
          withPrices: dataQuality.withPrices,
          withMinStock: dataQuality.withMinStock
        },
        sampleSuggestions: suggestions.slice(0, 3).map(s => ({
          itemName: s.itemName,
          currentStock: s.currentStock,
          minStock: s.minStock,
          suggestedQuantity: s.suggestedQuantity,
          urgency: s.urgency
        }))
      })

      // Обновляем health status
      if (suggestions.length > 0 && dataQuality.withCurrentStock > 0.8) {
        integrationState.value.integrationHealth = 'excellent'
      } else if (suggestions.length > 0) {
        integrationState.value.integrationHealth = 'good'
      } else {
        integrationState.value.integrationHealth = 'poor'
        integrationState.value.integrationErrors.push('No suggestions generated')
      }
    } catch (error) {
      const errorMessage = `Failed to refresh suggestions: ${error}`
      DebugUtils.error(MODULE_NAME, 'Suggestions refresh failed', {
        error,
        department,
        errorType: error?.constructor?.name,
        errorMessage: error?.message
      })

      integrationState.value.integrationErrors.push(errorMessage)
      integrationState.value.integrationHealth = 'critical'

      // Не бросаем ошибку - пусть UI покажет пустой список
      state.value.orderSuggestions = []
    } finally {
      state.value.loading.suggestions = false
    }
  }

  function analyzeSuggestionsQuality(suggestions: OrderSuggestion[]) {
    if (suggestions.length === 0) {
      return {
        withCurrentStock: 0,
        withPrices: 0,
        withMinStock: 0,
        isEmpty: true
      }
    }

    const withCurrentStock = suggestions.filter(
      s => typeof s.currentStock === 'number' && s.currentStock >= 0
    ).length

    const withPrices = suggestions.filter(
      s => typeof s.estimatedPrice === 'number' && s.estimatedPrice > 0
    ).length

    const withMinStock = suggestions.filter(
      s => typeof s.minStock === 'number' && s.minStock > 0
    ).length

    return {
      withCurrentStock: withCurrentStock / suggestions.length,
      withPrices: withPrices / suggestions.length,
      withMinStock: withMinStock / suggestions.length,
      isEmpty: false
    }
  }

  /**
   * ✅ ИСПРАВЛЕННАЯ вспомогательная функция: Фильтрует предложения с учетом существующих заявок
   */
  function filterSuggestionsWithExistingRequests(
    suggestions: OrderSuggestion[],
    requests: ProcurementRequest[]
  ): OrderSuggestion[] {
    // Подсчитываем уже запрошенные количества по каждому товару
    const requestedQuantities: Record<string, number> = {}

    requests.forEach(request => {
      request.items.forEach(item => {
        if (!requestedQuantities[item.itemId]) {
          requestedQuantities[item.itemId] = 0
        }
        requestedQuantities[item.itemId] += item.requestedQuantity
      })
    })

    DebugUtils.debug(MODULE_NAME, 'Requested quantities calculated', {
      requestedQuantities,
      activeRequests: requests.length
    })

    // Фильтруем предложения
    const filteredSuggestions = suggestions.filter(suggestion => {
      const alreadyRequested = requestedQuantities[suggestion.itemId] || 0

      // Если уже запросили столько же или больше - убираем из предложений
      if (alreadyRequested >= suggestion.suggestedQuantity) {
        DebugUtils.debug(MODULE_NAME, 'Removing suggestion - already requested', {
          itemId: suggestion.itemId,
          itemName: suggestion.itemName,
          suggestedQuantity: suggestion.suggestedQuantity,
          alreadyRequested
        })
        return false
      }

      // Если частично запросили - уменьшаем предлагаемое количество
      if (alreadyRequested > 0) {
        const originalQuantity = suggestion.suggestedQuantity
        suggestion.suggestedQuantity = suggestion.suggestedQuantity - alreadyRequested

        DebugUtils.debug(MODULE_NAME, 'Reducing suggestion quantity', {
          itemId: suggestion.itemId,
          itemName: suggestion.itemName,
          originalQuantity,
          alreadyRequested,
          newSuggestedQuantity: suggestion.suggestedQuantity
        })
      }

      return true
    })

    DebugUtils.info(MODULE_NAME, 'Suggestions filtered with existing requests', {
      originalCount: suggestions.length,
      filteredCount: filteredSuggestions.length,
      removedCount: suggestions.length - filteredSuggestions.length
    })

    return filteredSuggestions
  }

  async function createRequest(data: CreateRequestData): Promise<ProcurementRequest> {
    try {
      state.value.loading.requests = true

      DebugUtils.info(MODULE_NAME, 'Creating request with enhanced data', {
        department: data.department,
        itemsCount: data.items.length,
        priority: data.priority
      })

      const enhancedData = await enhanceRequestWithLatestPrices(data)
      const newRequest = await supplierService.createRequest(enhancedData)

      state.value.requests.unshift(newRequest)
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

  async function updateRequest(id: string, data: UpdateRequestData): Promise<ProcurementRequest> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating request', { requestId: id })

      const updatedRequest = await supplierService.updateRequest(id, data)

      const index = state.value.requests.findIndex(r => r.id === id)
      if (index !== -1) {
        state.value.requests = [
          ...state.value.requests.slice(0, index),
          updatedRequest,
          ...state.value.requests.slice(index + 1)
        ]

        console.log(`SupplierStore: Reactively updated request ${id} in array at index ${index}`)
      } else {
        console.warn(`SupplierStore: Request ${id} not found in local state for update`)
      }

      if (state.value.currentRequest?.id === id) {
        state.value.currentRequest = updatedRequest
      }

      DebugUtils.info(MODULE_NAME, 'Request updated successfully', {
        requestId: id,
        status: updatedRequest.status,
        updatedInArray: index !== -1
      })

      return updatedRequest
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update request', { id, error })
      throw error
    }
  }

  async function deleteRequest(id: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deleting request', { requestId: id })

      await supplierService.deleteRequest(id)

      const index = state.value.requests.findIndex(r => r.id === id)
      if (index !== -1) {
        const deletedRequest = state.value.requests[index]
        state.value.requests.splice(index, 1)

        if (state.value.currentRequest?.id === id) {
          state.value.currentRequest = undefined
        }

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

  async function createOrder(data: CreateOrderData): Promise<PurchaseOrder> {
    try {
      state.value.loading.orders = true

      DebugUtils.info(MODULE_NAME, 'Creating purchase order', {
        supplierId: data.supplierId,
        itemsCount: data.items?.length || 0,
        requestIds: data.requestIds
      })

      const newOrder = await supplierService.createOrder(data)

      state.value.orders.unshift(newOrder)
      state.value.currentOrder = newOrder

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

  async function updateOrder(id: string, data: UpdateOrderData): Promise<PurchaseOrder> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating order', { orderId: id })

      const updatedOrder = await supplierService.updateOrder(id, data)

      const index = state.value.orders.findIndex(o => o.id === id)
      if (index !== -1) {
        state.value.orders[index] = updatedOrder
      }

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

      const baskets = await supplierService.createSupplierBaskets(requestIds)
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

  async function createReceipt(data: CreateReceiptData): Promise<Receipt> {
    try {
      state.value.loading.receipts = true

      DebugUtils.info(MODULE_NAME, 'Creating receipt', {
        orderId: data.purchaseOrderId,
        itemsCount: data.items.length,
        receivedBy: data.receivedBy
      })

      const newReceipt = await supplierService.createReceipt(data)

      state.value.receipts.unshift(newReceipt)
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

  async function updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating receipt', { receiptId: id })

      const updatedReceipt = await supplierService.updateReceipt(id, data)

      const index = state.value.receipts.findIndex(r => r.id === id)
      if (index !== -1) {
        state.value.receipts[index] = updatedReceipt
      }

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

  async function getReceipts(filters?: {
    status?: ReceiptStatus[]
    hasDiscrepancies?: boolean
    dateFrom?: string
    dateTo?: string
  }): Promise<Receipt[]> {
    try {
      state.value.loading.receipts = true

      let receipts = await supplierService.getReceipts()

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

  async function completeReceipt(receiptId: string, data?: UpdateReceiptData): Promise<Receipt> {
    const startTime = Date.now()

    try {
      state.value.loading.receipts = true

      DebugUtils.info(MODULE_NAME, 'Completing receipt with storage integration', { receiptId })

      const updatedReceipt = await supplierService.completeReceipt(receiptId, data || {})

      const index = state.value.receipts.findIndex(r => r.id === receiptId)
      if (index !== -1) {
        state.value.receipts[index] = updatedReceipt
      }

      if (state.value.currentReceipt?.id === receiptId) {
        state.value.currentReceipt = updatedReceipt
      }

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

  function getItemInfo(itemId: string, department?: Department) {
    try {
      const balance = getItemBalance(itemId, department)
      const product = productsStore.products.find(p => p.id === itemId)
      const suggestion = state.value.orderSuggestions.find(s => s.itemId === itemId)

      return {
        itemId,
        itemName: product?.name || balance?.itemName || itemId,
        category: product?.category || 'unknown',
        unit: product?.unit || balance?.unit || 'kg',

        currentStock: balance?.totalQuantity || 0,
        minStock: product?.minStock || 0,
        maxStock: product?.maxStock,
        belowMinStock: balance?.belowMinStock || false,

        baseCost: product?.baseCostPerUnit || product?.costPerUnit || 0,
        latestCost: balance?.latestCost || 0,
        averageCost: balance?.averageCost || 0,

        lastReceiptDate: balance?.newestBatchDate,
        oldestBatchDate: balance?.oldestBatchDate,

        isActive: product?.isActive ?? true,
        canBeSold: product?.canBeSold ?? false,
        hasExpired: balance?.hasExpired || false,
        hasNearExpiry: balance?.hasNearExpiry || false,

        isUrgent: suggestion?.urgency === 'high',
        suggestedQuantity: suggestion?.suggestedQuantity,
        urgency: suggestion?.urgency,
        reason: suggestion?.reason,

        shelfLife: product?.shelfLife,
        totalValue: balance?.totalValue || 0
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Failed to get item info', { itemId, error })
      return null
    }
  }

  function getIntegrationStatus() {
    return {
      isInitialized: integrationState.value.isInitialized,
      useMockData: integrationState.value.useMockData,
      hasErrors: integrationState.value.integrationErrors.length > 0,
      errors: [...integrationState.value.integrationErrors],

      storageConnected: storageStore.state.balances.length > 0,
      productsConnected: productsStore.products.length > 0,

      lastSuggestionsUpdate: integrationState.value.lastSuggestionsUpdate,
      lastStorageSync: integrationState.value.lastStorageSync,
      lastProductsSync: integrationState.value.lastProductsSync,

      integrationHealth: integrationState.value.integrationHealth,
      performanceMetrics: { ...integrationState.value.performanceMetrics },

      storageOperationsCreated: integrationState.value.storageOperationsCreated,
      priceUpdatesProcessed: integrationState.value.priceUpdatesProcessed,

      totalSuggestions: state.value.orderSuggestions.length,
      urgentSuggestions: urgentSuggestions.value.length,
      totalRequests: state.value.requests.length,
      totalOrders: state.value.orders.length,
      totalReceipts: state.value.receipts.length
    }
  }

  async function refreshIntegratedData(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Refreshing all integrated data...')

      integrationState.value.integrationErrors = []

      await storageStore.fetchBalances()
      integrationState.value.lastStorageSync = TimeUtils.getCurrentLocalISO()

      await productsStore.loadProducts()
      integrationState.value.lastProductsSync = TimeUtils.getCurrentLocalISO()

      await refreshSuggestions()

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

  function clearIntegrationErrors(): void {
    integrationState.value.integrationErrors = []
    validateIntegrationHealth()
    DebugUtils.info(MODULE_NAME, 'Integration errors cleared')
  }

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

  function updatePerformanceMetric(
    metric: keyof IntegrationState['performanceMetrics'],
    newValue: number
  ): void {
    const current = integrationState.value.performanceMetrics[metric]
    integrationState.value.performanceMetrics[metric] =
      current === 0 ? newValue : (current + newValue) / 2
  }

  function calculatePerformanceScore(): number {
    const metrics = integrationState.value.performanceMetrics
    const health = integrationState.value.integrationHealth
    const errors = integrationState.value.integrationErrors.length

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

    score -= errors * 5

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
    // State
    state,
    integrationState,

    // Computed properties
    draftRequests,
    submittedRequests,
    approvedRequests,
    pendingOrders,
    paidOrders,
    draftOrders,
    sentOrders,
    confirmedOrders,
    ordersAwaitingDelivery,
    draftReceipts,
    completedReceipts,
    receiptsWithDiscrepancies,
    urgentSuggestions,
    mediumSuggestions,
    lowSuggestions,
    statistics,
    isLoading,
    hasIntegrationErrors,
    isFullyIntegrated,

    // Core actions
    initialize,
    loadDataFromCoordinator,
    refreshSuggestions,
    refreshIntegratedData,

    // CRUD operations
    getRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    getOrders,
    createOrder,
    updateOrder,
    getReceipts,
    createReceipt,
    updateReceipt,
    completeReceipt,

    // Integration methods
    enhanceRequestWithLatestPrices,
    getIntegrationStatus,
    getItemBalance,
    getItemInfo,
    clearIntegrationErrors,
    validateIntegrationHealth,

    // Utility methods
    getRequestById,
    getOrderById,
    getReceiptById,

    // Supplier basket management
    addToSupplierBasket,
    removeFromSupplierBasket,
    clearSupplierBaskets,
    getSupplierBasket,

    // Workflow management
    setCurrentRequest,
    setCurrentOrder,
    setCurrentReceipt,

    // Selection management
    toggleRequestSelection,
    selectAllRequests,
    clearRequestSelection,
    getSelectedRequests,

    // Analytics and reporting
    getDepartmentStatistics,
    getSupplierStatistics,
    getPerformanceReport,

    createSupplierBaskets,
    updateRequestStatus
  }
})
