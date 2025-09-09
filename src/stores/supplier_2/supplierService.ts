// src/stores/supplier_2/supplierService.ts - FIXED TO USE COORDINATOR

import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { useSupplierStorageIntegration } from './integrations/storageIntegration'
import { getProductDefinition } from '@/stores/shared/productDefinitions'
import { mockDataCoordinator } from '@/stores/shared/mockDataCoordinator'

import { DebugUtils } from '@/utils'
import type {
  ProcurementRequest,
  PurchaseOrder,
  Receipt,
  OrderSuggestion,
  CreateRequestData,
  CreateOrderData,
  CreateReceiptData,
  UpdateRequestData,
  UpdateOrderData,
  UpdateReceiptData,
  SupplierBasket,
  UnassignedItem,
  Department,
  BillStatus
} from './types'

const MODULE_NAME = 'SupplierService'

class SupplierService {
  private requests: ProcurementRequest[] = []
  private orders: PurchaseOrder[] = []
  private receipts: Receipt[] = []
  private storageIntegration = useSupplierStorageIntegration()

  constructor() {
    // Initialize with coordinator data
    this.loadDataFromCoordinator()
  }

  // =============================================
  // LOAD DATA FROM COORDINATOR
  // =============================================

  private loadDataFromCoordinator(): void {
    try {
      const supplierData = mockDataCoordinator.getSupplierStoreData()

      this.requests = [...supplierData.requests]
      this.orders = [...supplierData.orders]
      this.receipts = [...supplierData.receipts]

      DebugUtils.info(MODULE_NAME, 'Data loaded from coordinator', {
        requests: this.requests.length,
        orders: this.orders.length,
        receipts: this.receipts.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load data from coordinator', { error })
      // Keep empty arrays as fallback
    }
  }

  // =============================================
  // PROCUREMENT REQUESTS METHODS
  // =============================================

  async getRequests(): Promise<ProcurementRequest[]> {
    await this.delay(100)
    return [...this.requests]
  }

  async getRequestById(id: string): Promise<ProcurementRequest | null> {
    await this.delay(50)
    return this.requests.find(req => req.id === id) || null
  }

  async createRequest(data: CreateRequestData): Promise<ProcurementRequest> {
    await this.delay(200)

    const newRequest: ProcurementRequest = {
      id: `req-${Date.now()}`,
      requestNumber: this.generateRequestNumber(data.department),
      department: data.department,
      requestedBy: data.requestedBy,
      items: data.items.map(item => ({
        ...item,
        id: `req-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      })),
      status: 'draft',
      priority: data.priority || 'normal',
      purchaseOrderIds: [],
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.requests.unshift(newRequest)

    DebugUtils.info(MODULE_NAME, 'Procurement request created', {
      requestId: newRequest.id,
      department: newRequest.department,
      itemCount: newRequest.items.length
    })

    return newRequest
  }

  async updateRequest(id: string, data: UpdateRequestData): Promise<ProcurementRequest> {
    await this.delay(150)

    const request = this.requests.find(req => req.id === id)
    if (!request) {
      throw new Error(`Request with id ${id} not found`)
    }

    Object.assign(request, {
      ...data,
      updatedAt: new Date().toISOString()
    })

    DebugUtils.info(MODULE_NAME, 'Procurement request updated', { requestId: id })
    return request
  }

  async deleteRequest(id: string): Promise<void> {
    await this.delay(100)

    const index = this.requests.findIndex(req => req.id === id)
    if (index === -1) {
      throw new Error(`Request with id ${id} not found`)
    }

    this.requests.splice(index, 1)
    DebugUtils.info(MODULE_NAME, 'Procurement request deleted', { requestId: id })
  }

  // =============================================
  // PURCHASE ORDERS METHODS
  // =============================================

  async getOrders(): Promise<PurchaseOrder[]> {
    await this.delay(100)
    return [...this.orders]
  }

  async getOrderById(id: string): Promise<PurchaseOrder | null> {
    await this.delay(50)
    return this.orders.find(order => order.id === id) || null
  }

  async createOrder(data: CreateOrderData): Promise<PurchaseOrder> {
    await this.delay(300)

    // Get latest prices from storage if available
    const itemIds = data.items.map(item => item.itemId)
    const latestPrices: Record<string, number> = {}

    try {
      const storageStore = useStorageStore()
      if (storageStore && storageStore.getBalance) {
        for (const itemId of itemIds) {
          try {
            const balance = storageStore.getBalance(itemId)
            if (balance && balance.currentPrice) {
              latestPrices[itemId] = balance.currentPrice
            }
          } catch (error) {
            // Ignore individual item errors
          }
        }
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Could not access storage store, using provided prices', {
        error
      })
    }

    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber: this.generateOrderNumber(),
      supplierId: data.supplierId,
      supplierName: await this.getSupplierName(data.supplierId),
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      items: data.items.map(item => {
        const unitPrice = latestPrices[item.itemId] || item.pricePerUnit

        return {
          id: `po-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          itemId: item.itemId,
          itemName: this.getItemName(item.itemId),
          orderedQuantity: item.quantity,
          unit: this.getItemUnit(item.itemId),
          pricePerUnit: unitPrice,
          totalPrice: item.quantity * unitPrice,
          isEstimatedPrice: !latestPrices[item.itemId],
          lastPriceDate: latestPrices[item.itemId] ? new Date().toISOString() : undefined,
          status: 'ordered'
        }
      }),
      totalAmount: data.items.reduce((sum, item) => {
        const unitPrice = latestPrices[item.itemId] || item.pricePerUnit
        return sum + item.quantity * unitPrice
      }, 0),
      isEstimatedTotal: !data.items.every(item => latestPrices[item.itemId]),
      status: 'draft',
      billStatus: 'not_billed',
      requestIds: data.requestIds || [],
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.orders.unshift(newOrder)

    // Link requests to order (but don't change status)
    if (data.requestIds) {
      data.requestIds.forEach(requestId => {
        const request = this.requests.find(req => req.id === requestId)
        if (request) {
          request.purchaseOrderIds.push(newOrder.id)
          request.updatedAt = new Date().toISOString()
        }
      })
    }

    DebugUtils.info(MODULE_NAME, 'Purchase order created', {
      orderId: newOrder.id,
      supplierId: data.supplierId,
      itemCount: newOrder.items.length,
      totalAmount: newOrder.totalAmount,
      usedLatestPrices: Object.keys(latestPrices).length > 0,
      requestIds: data.requestIds
    })

    return newOrder
  }

  async updateOrder(id: string, data: UpdateOrderData): Promise<PurchaseOrder> {
    await this.delay(150)

    const order = this.orders.find(ord => ord.id === id)
    if (!order) {
      throw new Error(`Order with id ${id} not found`)
    }

    Object.assign(order, {
      ...data,
      updatedAt: new Date().toISOString()
    })

    DebugUtils.info(MODULE_NAME, 'Purchase order updated', { orderId: id })
    return order
  }

  async deleteOrder(id: string): Promise<void> {
    await this.delay(100)

    const index = this.orders.findIndex(order => order.id === id)
    if (index === -1) {
      throw new Error(`Order with id ${id} not found`)
    }

    this.orders.splice(index, 1)
    DebugUtils.info(MODULE_NAME, 'Purchase order deleted', { orderId: id })
  }

  // =============================================
  // RECEIPTS METHODS
  // =============================================

  async getReceipts(): Promise<Receipt[]> {
    await this.delay(100)
    return [...this.receipts]
  }

  async getReceiptById(id: string): Promise<Receipt | null> {
    await this.delay(50)
    return this.receipts.find(receipt => receipt.id === id) || null
  }

  async createReceipt(data: CreateReceiptData): Promise<Receipt> {
    await this.delay(200)

    const order = this.orders.find(ord => ord.id === data.purchaseOrderId)
    if (!order) {
      throw new Error(`Order with id ${data.purchaseOrderId} not found`)
    }

    const newReceipt: Receipt = {
      id: `receipt-${Date.now()}`,
      receiptNumber: this.generateReceiptNumber(),
      purchaseOrderId: data.purchaseOrderId,
      deliveryDate: new Date().toISOString(),
      receivedBy: data.receivedBy,
      items: data.items.map(item => {
        const orderItem = order.items.find(oi => oi.id === item.orderItemId)
        if (!orderItem) {
          throw new Error(`Order item with id ${item.orderItemId} not found`)
        }

        return {
          id: `receipt-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          orderItemId: item.orderItemId,
          itemId: orderItem.itemId,
          itemName: orderItem.itemName,
          orderedQuantity: orderItem.orderedQuantity,
          receivedQuantity: item.receivedQuantity,
          orderedPrice: orderItem.pricePerUnit,
          actualPrice: item.actualPrice || orderItem.pricePerUnit,
          notes: item.notes
        }
      }),
      hasDiscrepancies: this.calculateDiscrepancies(data, order),
      status: 'draft',
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.receipts.unshift(newReceipt)

    DebugUtils.info(MODULE_NAME, 'Receipt created', {
      receiptId: newReceipt.id,
      orderId: data.purchaseOrderId,
      itemCount: newReceipt.items.length,
      hasDiscrepancies: newReceipt.hasDiscrepancies
    })

    return newReceipt
  }

  async completeReceipt(id: string, notes?: string): Promise<Receipt> {
    await this.delay(200)

    const receipt = this.receipts.find(r => r.id === id)
    if (!receipt) {
      throw new Error(`Receipt with id ${id} not found`)
    }

    if (receipt.status !== 'draft') {
      throw new Error('Only draft receipts can be completed')
    }

    const order = this.orders.find(o => o.id === receipt.purchaseOrderId)
    if (!order) {
      throw new Error(`Order not found for receipt ${id}`)
    }

    DebugUtils.info(MODULE_NAME, 'Completing receipt with storage integration', {
      receiptId: id,
      receiptNumber: receipt.receiptNumber,
      orderId: order.id
    })

    // Update receipt status
    receipt.status = 'completed'
    receipt.notes = notes || receipt.notes
    receipt.updatedAt = new Date().toISOString()

    // Update order status
    if (order.status === 'confirmed') {
      order.status = 'delivered'
      order.receiptId = receipt.id
      order.updatedAt = new Date().toISOString()

      // Update order items with received quantities
      receipt.items.forEach(receiptItem => {
        const orderItem = order.items.find(oi => oi.id === receiptItem.orderItemId)
        if (orderItem) {
          orderItem.receivedQuantity = receiptItem.receivedQuantity
          orderItem.status = 'received'

          // Update price if changed
          if (receiptItem.actualPrice && receiptItem.actualPrice !== receiptItem.orderedPrice) {
            orderItem.pricePerUnit = receiptItem.actualPrice
            orderItem.totalPrice = receiptItem.receivedQuantity * receiptItem.actualPrice
            orderItem.isEstimatedPrice = false
          }
        }
      })

      // Recalculate order total
      order.totalAmount = order.items.reduce(
        (sum, item) => sum + (item.receivedQuantity || item.orderedQuantity) * item.pricePerUnit,
        0
      )
      order.isEstimatedTotal = false
    }

    // Try to create storage operations (don't fail if error)
    try {
      const operationId = await this.storageIntegration.createReceiptOperation(receipt, order)
      receipt.storageOperationId = operationId

      DebugUtils.info(MODULE_NAME, 'Storage operation created successfully', {
        receiptId: id,
        operationId
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Storage operation failed, but receipt completed', {
        receiptId: id,
        error
      })
    }

    // Try to update product prices (don't fail if error)
    try {
      await this.storageIntegration.updateProductPrices(receipt)

      DebugUtils.info(MODULE_NAME, 'Product prices updated successfully', {
        receiptId: id
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Price update failed, but receipt completed', {
        receiptId: id,
        error
      })
    }

    DebugUtils.info(MODULE_NAME, 'Receipt completed successfully with full integration', {
      receiptId: receipt.id,
      receiptNumber: receipt.receiptNumber,
      storageOperationId: receipt.storageOperationId,
      orderId: order.id,
      orderStatus: order.status
    })

    return receipt
  }

  async updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt> {
    await this.delay(150)

    const receipt = this.receipts.find(rec => rec.id === id)
    if (!receipt) {
      throw new Error(`Receipt with id ${id} not found`)
    }

    Object.assign(receipt, {
      ...data,
      updatedAt: new Date().toISOString()
    })

    DebugUtils.info(MODULE_NAME, 'Receipt updated', { receiptId: id })
    return receipt
  }

  // =============================================
  // ORDER SUGGESTIONS - FROM COORDINATOR
  // =============================================

  async getOrderSuggestions(department?: Department): Promise<OrderSuggestion[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Getting order suggestions', {
        department: department || 'all',
        source: 'ALWAYS_dynamic_from_storage'
      })

      // ✅ ВСЕГДА используем только динамические данные из Storage
      const suggestions = await this.storageIntegration.getSuggestionsFromStock(department)

      DebugUtils.info(MODULE_NAME, 'Dynamic suggestions loaded successfully', {
        department: department || 'all',
        total: suggestions.length,
        urgent: suggestions.filter(s => s.urgency === 'high').length,
        medium: suggestions.filter(s => s.urgency === 'medium').length,
        low: suggestions.filter(s => s.urgency === 'low').length,
        source: 'dynamic_storage_integration'
      })

      // ✅ ВАЛИДАЦИЯ: Проверяем корректность данных
      const validSuggestions = suggestions.filter(
        s =>
          s.itemId &&
          s.itemName &&
          typeof s.currentStock === 'number' &&
          typeof s.minStock === 'number' &&
          s.currentStock >= 0 &&
          s.minStock >= 0
      )

      if (validSuggestions.length !== suggestions.length) {
        DebugUtils.warn(MODULE_NAME, 'Some suggestions were invalid and filtered out', {
          total: suggestions.length,
          valid: validSuggestions.length,
          filtered: suggestions.length - validSuggestions.length,
          invalidSuggestions: suggestions
            .filter(s => !validSuggestions.includes(s))
            .map(s => ({
              itemId: s.itemId,
              issue: !s.itemId
                ? 'missing itemId'
                : !s.itemName
                  ? 'missing itemName'
                  : 'invalid stock values'
            }))
        })
      }

      // ✅ ФИЛЬТРАЦИЯ: Убираем товары с существующими активными заявками
      const filteredSuggestions = this.filterSuggestionsWithExistingRequests(
        validSuggestions,
        department
      )

      DebugUtils.info(MODULE_NAME, 'Order suggestions processed successfully', {
        department: department || 'all',
        dataSource: 'dynamic_storage_integration',
        totalSuggestions: suggestions.length,
        validSuggestions: validSuggestions.length,
        filteredOut: validSuggestions.length - filteredSuggestions.length,
        finalSuggestions: filteredSuggestions.length,
        sampleSuggestions: filteredSuggestions.slice(0, 3).map(s => ({
          itemName: s.itemName,
          currentStock: s.currentStock,
          minStock: s.minStock,
          urgency: s.urgency
        }))
      })

      return filteredSuggestions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get order suggestions', {
        error,
        department,
        errorMessage: error instanceof Error ? error.message : String(error)
      })

      // ✅ При ошибке возвращаем пустой массив, НЕ fallback на mock
      DebugUtils.warn(
        MODULE_NAME,
        'Returning empty suggestions due to error - no fallback to mock data'
      )
      return []
    }
  }

  // ✅ ДОБАВИТЬ отсутствующую функцию filterSuggestionsWithExistingRequests в supplierService
  private filterSuggestionsWithExistingRequests(
    suggestions: OrderSuggestion[],
    department?: Department
  ): OrderSuggestion[] {
    try {
      // Получаем активные заявки (draft + submitted, НЕ converted/cancelled)
      const activeRequests = this.requests.filter(
        request => request.status === 'draft' || request.status === 'submitted'
      )

      // Фильтруем по департаменту если указан
      const relevantRequests = department
        ? activeRequests.filter(request => request.department === department)
        : activeRequests

      if (relevantRequests.length === 0) {
        DebugUtils.debug(MODULE_NAME, 'No active requests found, returning all suggestions', {
          department: department || 'all',
          suggestionsCount: suggestions.length
        })
        return suggestions
      }

      // Подсчитываем уже запрошенные количества по каждому товару
      const requestedQuantities: Record<string, number> = {}

      relevantRequests.forEach(request => {
        request.items.forEach(item => {
          const currentRequested = requestedQuantities[item.itemId] || 0
          requestedQuantities[item.itemId] = currentRequested + item.requestedQuantity
        })
      })

      DebugUtils.debug(MODULE_NAME, 'Calculated requested quantities', {
        requestedQuantities,
        activeRequests: relevantRequests.length,
        department: department || 'all'
      })

      // Фильтруем suggestions
      const filtered = suggestions.filter(suggestion => {
        const alreadyRequested = requestedQuantities[suggestion.itemId] || 0

        // Если уже запросили достаточно количество - убираем suggestion
        if (alreadyRequested >= suggestion.suggestedQuantity) {
          DebugUtils.debug(MODULE_NAME, 'Removing suggestion - already requested enough', {
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
          suggestion.suggestedQuantity = Math.max(
            0,
            suggestion.suggestedQuantity - alreadyRequested
          )

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

      DebugUtils.debug(MODULE_NAME, 'Filtered suggestions with existing requests', {
        originalCount: suggestions.length,
        filteredCount: filtered.length,
        removedCount: suggestions.length - filtered.length,
        department: department || 'all'
      })

      return filtered
    } catch (error) {
      DebugUtils.warn(
        MODULE_NAME,
        'Error filtering existing requests, returning original suggestions',
        {
          error,
          suggestionsCount: suggestions.length
        }
      )
      return suggestions
    }
  }

  // =============================================
  // ✅ НОВЫЙ МЕТОД: Получение актуальных цен из Storage (усовершенствованный)
  // =============================================

  async getLatestPrices(itemIds: string[]): Promise<Record<string, number>> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Getting latest prices', {
        itemIds,
        source: 'attempting_storage_integration'
      })

      // Пытаемся получить цены через storageIntegration
      const storagePrice = await this.storageIntegration.getLatestPrices(itemIds)

      // Дополняем недостающие цены из Products Store
      const productsStore = useProductsStore()
      const combinedPrices: Record<string, number> = {}

      for (const itemId of itemIds) {
        // Приоритет 1: цена из Storage (самая актуальная)
        if (storagePrice[itemId] && storagePrice[itemId] > 0) {
          combinedPrices[itemId] = storagePrice[itemId]
          continue
        }

        // Приоритет 2: цена из Products Store
        const product = productsStore.products.find(p => p.id === itemId)
        if (product) {
          if (product.baseCostPerUnit && product.baseCostPerUnit > 0) {
            combinedPrices[itemId] = product.baseCostPerUnit
          } else if (product.costPerUnit && product.costPerUnit > 0) {
            combinedPrices[itemId] = product.costPerUnit
          }
        }
      }

      DebugUtils.debug(MODULE_NAME, 'Latest prices retrieved', {
        requested: itemIds.length,
        found: Object.keys(combinedPrices).length,
        fromStorage: Object.keys(storagePrice).length,
        fromProducts: Object.keys(combinedPrices).length - Object.keys(storagePrice).length
      })

      return combinedPrices
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get latest prices', { error, itemIds })
      return {}
    }
  }

  // =============================================
  // ✅ НОВЫЙ МЕТОД: Принудительное обновление suggestions
  // =============================================

  async refreshSuggestions(department?: Department): Promise<OrderSuggestion[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Force refreshing suggestions', {
        department: department || 'all'
      })

      // Инвалидируем кэш перед получением новых данных
      this.storageIntegration.invalidateCache()

      // Получаем свежие suggestions
      const suggestions = await this.getOrderSuggestions(department)

      DebugUtils.info(MODULE_NAME, 'Suggestions force refreshed', {
        department: department || 'all',
        total: suggestions.length,
        urgent: suggestions.filter(s => s.urgency === 'high').length
      })

      return suggestions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to refresh suggestions', { error, department })
      return []
    }
  }
  // =============================================
  // SUPPLIER BASKET METHODS
  // =============================================

  async createSupplierBaskets(requestIds: string[]): Promise<SupplierBasket[]> {
    await this.delay(200)

    const requests = this.requests.filter(req => requestIds.includes(req.id))
    if (requests.length === 0) {
      return []
    }

    const unassignedItems: UnassignedItem[] = []

    for (const request of requests) {
      console.log(`Processing request ${request.requestNumber} (${request.status})`)

      for (const item of request.items) {
        // Check how much is already ordered
        const orderedQuantity = this.getOrderedQuantityForItem(request.id, item.itemId)
        const remainingQuantity = item.requestedQuantity - orderedQuantity

        console.log(
          `Item ${item.itemName}: requested=${item.requestedQuantity}, ordered=${orderedQuantity}, remaining=${remainingQuantity}`
        )

        if (remainingQuantity > 0) {
          const existingItem = unassignedItems.find(ui => ui.itemId === item.itemId)

          if (existingItem) {
            existingItem.totalQuantity += remainingQuantity
            existingItem.sources.push({
              requestId: request.id,
              requestNumber: request.requestNumber,
              department: request.department,
              quantity: remainingQuantity
            })
          } else {
            const estimatedPrice = await this.getEstimatedPrice(item.itemId)

            unassignedItems.push({
              itemId: item.itemId,
              itemName: item.itemName,
              category: this.getItemCategory(item.itemId),
              totalQuantity: remainingQuantity,
              unit: item.unit,
              estimatedPrice: estimatedPrice,
              sources: [
                {
                  requestId: request.id,
                  requestNumber: request.requestNumber,
                  department: request.department,
                  quantity: remainingQuantity
                }
              ]
            })
          }
        } else {
          console.log(`Item ${item.itemName} is fully ordered, skipping`)
        }
      }
    }

    const baskets: SupplierBasket[] = [
      {
        supplierId: null,
        supplierName: 'Unassigned',
        items: unassignedItems,
        totalItems: unassignedItems.length,
        estimatedTotal: unassignedItems.reduce(
          (sum, item) => sum + item.totalQuantity * item.estimatedPrice,
          0
        )
      }
    ]

    console.log(
      `Created baskets: ${unassignedItems.length} unassigned items from ${requests.length} requests`
    )

    return baskets
  }

  private getOrderedQuantityForItem(requestId: string, itemId: string): number {
    let totalOrdered = 0

    const relatedOrders = this.orders.filter(order => order.requestIds.includes(requestId))

    for (const order of relatedOrders) {
      const orderItem = order.items.find(item => item.itemId === itemId)
      if (orderItem) {
        totalOrdered += orderItem.orderedQuantity
      }
    }

    return totalOrdered
  }

  // =============================================
  // STATISTICS
  // =============================================

  async getStatistics() {
    await this.delay(50)
    return {
      totalRequests: this.requests.length,
      pendingRequests: this.requests.filter(r => r.status === 'submitted').length,
      totalOrders: this.orders.length,
      ordersAwaitingPayment: this.orders.filter(o => o.paymentStatus === 'pending').length,
      ordersAwaitingDelivery: this.orders.filter(
        // ❌ СТАРОЕ: o => ['sent', 'confirmed'].includes(o.status) && o.paymentStatus === 'paid'
        o => o.status === 'sent' && o.paymentStatus === 'paid' // ✅ НОВОЕ
      ).length,
      totalReceipts: this.receipts.length,
      pendingReceipts: this.receipts.filter(r => r.status === 'draft').length,
      urgentSuggestions: 0
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private calculateDiscrepancies(data: CreateReceiptData, order: PurchaseOrder): boolean {
    return data.items.some(item => {
      const orderItem = order.items.find(oi => oi.id === item.orderItemId)
      if (!orderItem) return false

      // Check quantity discrepancy
      if (Math.abs(item.receivedQuantity - orderItem.orderedQuantity) > 0.01) {
        return true
      }

      // Check price discrepancy
      if (item.actualPrice && Math.abs(item.actualPrice - orderItem.pricePerUnit) > 0.01) {
        return true
      }

      return false
    })
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateRequestNumber(department: Department): string {
    const departmentPrefix = department === 'kitchen' ? 'KIT' : 'BAR'
    const count = this.requests.filter(req => req.department === department).length + 1
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `REQ-${departmentPrefix}-${month}${day}-${String(count).padStart(3, '0')}`
  }

  private generateOrderNumber(): string {
    const count = this.orders.length + 1
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `PO-${month}${day}-${String(count).padStart(3, '0')}`
  }

  private generateReceiptNumber(): string {
    const count = this.receipts.length + 1
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `RCP-${month}${day}-${String(count).padStart(3, '0')}`
  }

  private async getSupplierName(supplierId: string): Promise<string> {
    const supplierNames: Record<string, string> = {
      'sup-premium-meat-co': 'Premium Meat Company',
      'sup-fresh-veg-market': 'Fresh Vegetable Market',
      'sup-beverage-distribution': 'Jakarta Beverage Distribution',
      'sup-dairy-fresh': 'Dairy Products Plus',
      'sup-spice-world': 'Jakarta Spices & Herbs',
      'sup-specialty-foods': 'Specialty Foods Supply',
      'sup-basic-supplies': 'Basic Supplies Co'
    }
    return supplierNames[supplierId] || 'Unknown Supplier'
  }

  private getItemName(itemId: string): string {
    const product = getProductDefinition(itemId)
    if (product) {
      return product.name
    }

    const itemNames: Record<string, string> = {
      'prod-beef-steak': 'Beef Steak',
      'prod-potato': 'Potato',
      'prod-garlic': 'Garlic',
      'prod-tomato': 'Fresh Tomato',
      'prod-onion': 'Onion',
      'prod-olive-oil': 'Olive Oil',
      'prod-milk': 'Milk 3.2%',
      'prod-butter': 'Butter',
      'prod-salt': 'Salt',
      'prod-black-pepper': 'Black Pepper',
      'prod-oregano': 'Oregano',
      'prod-basil': 'Fresh Basil',
      'prod-beer-bintang-330': 'Bintang Beer 330ml',
      'prod-beer-bintang-500': 'Bintang Beer 500ml',
      'prod-cola-330': 'Coca-Cola 330ml',
      'prod-water-500': 'Mineral Water 500ml'
    }
    return itemNames[itemId] || 'Unknown Item'
  }

  private getItemUnit(itemId: string): string {
    const product = getProductDefinition(itemId)
    if (product) {
      return product.baseUnit
    }

    if (itemId.includes('beer') || itemId.includes('cola') || itemId.includes('water'))
      return 'piece'
    if (itemId.includes('oil') || itemId.includes('milk')) return 'ml'
    return 'gram'
  }

  private getItemCategory(itemId: string): string {
    const product = getProductDefinition(itemId)
    if (product) {
      return product.category
    }

    if (itemId.includes('beef') || itemId.includes('chicken')) return 'meat'
    if (
      itemId.includes('potato') ||
      itemId.includes('garlic') ||
      itemId.includes('tomato') ||
      itemId.includes('onion')
    )
      return 'vegetables'
    if (itemId.includes('beer') || itemId.includes('cola') || itemId.includes('water'))
      return 'beverages'
    if (itemId.includes('butter') || itemId.includes('milk')) return 'dairy'
    if (
      itemId.includes('salt') ||
      itemId.includes('pepper') ||
      itemId.includes('oregano') ||
      itemId.includes('basil')
    )
      return 'spices'
    return 'other'
  }

  private async getEstimatedPrice(itemId: string): Promise<number> {
    // Try to get price from storage first
    try {
      const latestPrices = await this.getLatestPrices([itemId])
      if (latestPrices[itemId]) {
        return latestPrices[itemId]
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, 'Could not get price from storage', { itemId })
    }

    // Get price from product definition
    const productDef = getProductDefinition(itemId)
    if (productDef) {
      return productDef.baseCostPerUnit // Return base cost per unit
    }

    DebugUtils.warn(MODULE_NAME, 'No price found for item', { itemId })
    return 0
  }
}

export const supplierService = new SupplierService()
export default supplierService
