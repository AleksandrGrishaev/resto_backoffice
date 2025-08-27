// src/stores/supplier_2/supplierService.ts - COMPLETE ENHANCED VERSION

import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
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
  Department
} from './types'

import {
  mockProcurementRequests,
  mockPurchaseOrders,
  mockReceipts,
  getRequestById,
  getOrderById,
  getReceiptById,
  getSupplierStatistics
} from './mock/supplierMock'

const MODULE_NAME = 'SupplierService'

// =============================================
// ENHANCED SERVICE CLASS WITH FULL INTEGRATION
// =============================================

class SupplierService {
  private requests: ProcurementRequest[] = [...mockProcurementRequests]
  private orders: PurchaseOrder[] = [...mockPurchaseOrders]
  private receipts: Receipt[] = [...mockReceipts]

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

    // ✅ Enhanced: Get latest prices from storage
    const itemIds = data.items.map(item => item.itemId)
    const latestPrices = await this.getLatestPrices(itemIds)

    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber: this.generateOrderNumber(),
      supplierId: data.supplierId,
      supplierName: await this.getSupplierName(data.supplierId),
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      items: data.items.map(item => {
        // Use latest price if available, otherwise use provided price
        const unitPrice = latestPrices[item.itemId] || item.pricePerUnit

        return {
          id: `po-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          itemId: item.itemId,
          itemName: this.getItemName(item.itemId),
          orderedQuantity: item.quantity,
          unit: this.getItemUnit(item.itemId),
          pricePerUnit: unitPrice,
          totalPrice: item.quantity * unitPrice,
          isEstimatedPrice: !latestPrices[item.itemId], // False if we have real price from storage
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
      paymentStatus: 'pending',
      requestIds: data.requestIds || [],
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.orders.unshift(newOrder)

    // Update related requests status
    if (data.requestIds) {
      data.requestIds.forEach(requestId => {
        const request = this.requests.find(req => req.id === requestId)
        if (request) {
          request.purchaseOrderIds.push(newOrder.id)
          request.status = 'converted'
          request.updatedAt = new Date().toISOString()
        }
      })
    }

    DebugUtils.info(MODULE_NAME, 'Purchase order created', {
      orderId: newOrder.id,
      supplierId: data.supplierId,
      itemCount: newOrder.items.length,
      totalAmount: newOrder.totalAmount,
      usedLatestPrices: Object.keys(latestPrices).length > 0
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
  // RECEIPTS METHODS - ENHANCED WITH STORAGE INTEGRATION
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

  async completeReceipt(id: string, data?: UpdateReceiptData): Promise<Receipt> {
    await this.delay(300)

    const receipt = this.receipts.find(rec => rec.id === id)
    if (!receipt) {
      throw new Error(`Receipt with id ${id} not found`)
    }

    // Update receipt data if provided
    if (data) {
      Object.assign(receipt, data)
    }

    // Update receipt status
    receipt.status = 'completed'
    receipt.updatedAt = new Date().toISOString()

    // Update related order
    const order = this.orders.find(ord => ord.id === receipt.purchaseOrderId)
    if (order) {
      order.status = 'delivered'
      order.receiptId = receipt.id
      order.updatedAt = new Date().toISOString()

      // Update order items with received quantities and prices
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

      // Recalculate total amount
      order.totalAmount = order.items.reduce(
        (sum, item) => sum + (item.receivedQuantity || item.orderedQuantity) * item.pricePerUnit,
        0
      )
      order.isEstimatedTotal = false
    }

    // ✅ NEW: Create storage operation
    try {
      await this.createStorageOperation(receipt)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create storage operation for receipt', {
        receiptId: receipt.id,
        error
      })
      // Don't throw - receipt is still valid even if storage fails
    }

    // ✅ NEW: Update product prices if needed
    try {
      await this.updateProductPrices(receipt)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update product prices from receipt', {
        receiptId: receipt.id,
        error
      })
      // Don't throw - receipt is still valid even if price update fails
    }

    DebugUtils.info(MODULE_NAME, 'Receipt completed with storage integration', {
      receiptId: receipt.id,
      orderId: receipt.purchaseOrderId
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
  // ✅ ENHANCED ORDER SUGGESTIONS FROM STORAGE
  // =============================================

  async getOrderSuggestions(department?: Department): Promise<OrderSuggestion[]> {
    try {
      const storageStore = useStorageStore()
      const productsStore = useProductsStore()

      // Ensure data is loaded
      if (storageStore.state.balances.length === 0) {
        await storageStore.fetchBalances(department)
      }

      if (productsStore.products.length === 0) {
        await productsStore.loadProducts()
      }

      const balances = department
        ? storageStore.departmentBalances(department)
        : storageStore.state.balances

      const suggestions: OrderSuggestion[] = []

      for (const balance of balances) {
        const product = productsStore.products.find(p => p.id === balance.itemId)

        if (!product || !product.isActive) continue

        // Conditions for creating suggestion:
        // 1. Item is completely out of stock
        // 2. Item is below minimum stock
        // 3. Item has minimum stock configured
        const isOutOfStock = balance.totalQuantity <= 0
        const minStock = product.minStock || 0
        const isBelowMinimum = minStock > 0 && balance.totalQuantity < minStock

        if (isOutOfStock || isBelowMinimum) {
          // Calculate suggested quantity
          const suggestedQuantity = this.calculateSuggestedQuantity(balance, product, minStock)

          // Determine urgency
          const urgency = this.determineUrgency(balance.totalQuantity, minStock)

          suggestions.push({
            itemId: balance.itemId,
            itemName: balance.itemName,
            currentStock: balance.totalQuantity,
            minStock: minStock,
            suggestedQuantity: suggestedQuantity,
            urgency: urgency,
            reason: isOutOfStock ? 'out_of_stock' : 'below_minimum',
            estimatedPrice: balance.latestCost || product.baseCostPerUnit || product.costPerUnit,
            lastPriceDate: balance.newestBatchDate || undefined
          })
        }
      }

      // Sort by urgency
      suggestions.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 }
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
      })

      DebugUtils.info(MODULE_NAME, 'Generated order suggestions from storage data', {
        department,
        totalSuggestions: suggestions.length,
        urgent: suggestions.filter(s => s.urgency === 'high').length,
        medium: suggestions.filter(s => s.urgency === 'medium').length,
        low: suggestions.filter(s => s.urgency === 'low').length
      })

      return suggestions
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate order suggestions from storage', { error })

      // Fallback to mock data
      const { mockOrderSuggestions } = await import('./mock/supplierMock')
      return this.filterSuggestionsByDepartment(mockOrderSuggestions, department)
    }
  }

  // =============================================
  // SUPPLIER BASKET METHODS
  // =============================================

  async createSupplierBaskets(requestIds: string[]): Promise<SupplierBasket[]> {
    await this.delay(100)

    const requests = this.requests.filter(req => requestIds.includes(req.id))
    const unassignedItems: UnassignedItem[] = []

    // Group items from all requests
    for (const request of requests) {
      for (const item of request.items) {
        const existingItem = unassignedItems.find(ui => ui.itemId === item.itemId)

        if (existingItem) {
          existingItem.totalQuantity += item.requestedQuantity
          existingItem.sources.push({
            requestId: request.id,
            requestNumber: request.requestNumber,
            department: request.department,
            quantity: item.requestedQuantity
          })
        } else {
          const estimatedPrice = await this.getEstimatedPrice(item.itemId)

          unassignedItems.push({
            itemId: item.itemId,
            itemName: item.itemName,
            category: this.getItemCategory(item.itemId),
            totalQuantity: item.requestedQuantity,
            unit: item.unit,
            estimatedPrice: estimatedPrice,
            sources: [
              {
                requestId: request.id,
                requestNumber: request.requestNumber,
                department: request.department,
                quantity: item.requestedQuantity
              }
            ]
          })
        }
      }
    }

    // Create baskets
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

    DebugUtils.info(MODULE_NAME, 'Supplier baskets created', {
      requestCount: requests.length,
      itemCount: unassignedItems.length,
      basketCount: baskets.length
    })

    return baskets
  }

  // =============================================
  // STATISTICS
  // =============================================

  async getStatistics() {
    await this.delay(50)
    return getSupplierStatistics()
  }

  // =============================================
  // ✅ STORAGE INTEGRATION METHODS
  // =============================================

  /**
   * Get latest prices from storage store
   */
  async getLatestPrices(itemIds: string[]): Promise<Record<string, number>> {
    try {
      const storageStore = useStorageStore()
      const prices: Record<string, number> = {}

      for (const itemId of itemIds) {
        const balance = storageStore.getBalance(itemId)
        if (balance) {
          prices[itemId] = balance.latestCost || balance.averageCost || 0
        }
      }

      return prices
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get latest prices from storage', { error })
      return {}
    }
  }

  /**
   * Create storage operation for completed receipt
   */
  private async createStorageOperation(receipt: Receipt): Promise<void> {
    try {
      const storageStore = useStorageStore()
      const order = this.orders.find(o => o.id === receipt.purchaseOrderId)

      if (!order) {
        throw new Error(`Order not found for receipt ${receipt.id}`)
      }

      const createData = {
        department: this.getDepartmentFromOrder(order),
        responsiblePerson: receipt.receivedBy,
        items: receipt.items.map(item => ({
          itemId: item.itemId,
          quantity: item.receivedQuantity,
          costPerUnit: item.actualPrice || item.orderedPrice,
          notes: `Receipt: ${receipt.receiptNumber}`,
          expiryDate: this.calculateExpiryDate(item.itemId)
        })),
        sourceType: 'purchase' as const,
        notes: `Receipt ${receipt.receiptNumber} - ${receipt.notes || ''}`
      }

      const operation = await storageStore.createReceipt(createData)
      receipt.storageOperationId = operation.id

      DebugUtils.info(MODULE_NAME, 'Storage operation created for receipt', {
        receiptId: receipt.id,
        operationId: operation.id
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create storage operation', { error })
      throw error
    }
  }

  /**
   * Update product prices after receipt completion
   */
  private async updateProductPrices(receipt: Receipt): Promise<void> {
    try {
      const productsStore = useProductsStore()

      for (const item of receipt.items) {
        const actualPrice = item.actualPrice || item.orderedPrice

        // Update price in Products Store if it changed
        if (actualPrice && actualPrice !== item.orderedPrice) {
          // TODO: Implement updateProductCost in ProductsStore
          // await productsStore.updateProductCost(item.itemId, actualPrice)

          DebugUtils.info(MODULE_NAME, 'Product price should be updated', {
            itemId: item.itemId,
            oldPrice: item.orderedPrice,
            newPrice: actualPrice
          })
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update product prices', { error })
      throw error
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private calculateSuggestedQuantity(balance: any, product: any, minStock: number): number {
    // If completely out of stock - order minimum * 2
    if (balance.totalQuantity <= 0) {
      return Math.max(minStock * 2, 1)
    }

    // If below minimum - order to reach minimum * 1.5
    const targetQuantity = minStock * 1.5
    const neededQuantity = targetQuantity - balance.totalQuantity

    return Math.max(Math.ceil(neededQuantity), 1)
  }

  private determineUrgency(currentStock: number, minStock: number): 'low' | 'medium' | 'high' {
    if (currentStock <= 0) {
      return 'high' // Completely out of stock
    }

    if (currentStock < minStock * 0.3) {
      return 'high' // Less than 30% of minimum
    }

    if (currentStock < minStock * 0.7) {
      return 'medium' // Less than 70% of minimum
    }

    return 'low'
  }

  private getDepartmentFromOrder(order: PurchaseOrder): Department {
    // Simple logic to determine department based on items
    const hasBarItems = order.items.some(
      item =>
        item.itemId.includes('beer') ||
        item.itemId.includes('cola') ||
        item.itemId.includes('water') ||
        item.itemId.includes('wine') ||
        item.itemId.includes('spirit')
    )
    return hasBarItems ? 'bar' : 'kitchen'
  }

  private calculateExpiryDate(itemId: string): string | undefined {
    // Simple expiry date calculation logic
    const productsStore = useProductsStore()
    const product = productsStore.products.find(p => p.id === itemId)

    if (product?.shelfLife) {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + product.shelfLife)
      return expiryDate.toISOString()
    }

    return undefined
  }

  private filterSuggestionsByDepartment(
    suggestions: OrderSuggestion[],
    department?: Department
  ): OrderSuggestion[] {
    if (!department) return suggestions

    if (department === 'kitchen') {
      return suggestions.filter(
        s =>
          !s.itemId.includes('beer') &&
          !s.itemId.includes('cola') &&
          !s.itemId.includes('water') &&
          !s.itemId.includes('wine') &&
          !s.itemId.includes('spirit')
      )
    } else {
      return suggestions.filter(
        s =>
          s.itemId.includes('beer') ||
          s.itemId.includes('cola') ||
          s.itemId.includes('water') ||
          s.itemId.includes('wine') ||
          s.itemId.includes('spirit')
      )
    }
  }

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
    // In real app, this would come from CounterAgentsStore
    const supplierNames: Record<string, string> = {
      'ca-premium-meat-co': 'Premium Meat Company',
      'ca-fresh-veg-market': 'Fresh Vegetable Market',
      'ca-beverage-distribution': 'Jakarta Beverage Distribution',
      'ca-dairy-plus': 'Dairy Products Plus',
      'ca-spices-herbs': 'Jakarta Spices & Herbs',
      'ca-seafood-fresh': 'Fresh Seafood Supply'
    }
    return supplierNames[supplierId] || 'Unknown Supplier'
  }

  private getItemName(itemId: string): string {
    // In real app, this would come from ProductsStore
    const itemNames: Record<string, string> = {
      'prod-beef-steak': 'Beef Steak',
      'prod-potato': 'Potato',
      'prod-garlic': 'Garlic',
      'prod-tomato': 'Fresh Tomato',
      'prod-beer-bintang-330': 'Bintang Beer 330ml',
      'prod-cola-330': 'Coca-Cola 330ml',
      'prod-butter': 'Butter',
      'prod-chicken-breast': 'Chicken Breast',
      'prod-onion': 'Onion',
      'prod-rice': 'Jasmine Rice'
    }
    return itemNames[itemId] || 'Unknown Item'
  }

  private getItemUnit(itemId: string): string {
    // In real app, this would come from ProductsStore
    if (itemId.includes('beer') || itemId.includes('cola')) return 'piece'
    if (itemId.includes('rice')) return 'kg'
    return 'kg'
  }

  private getItemCategory(itemId: string): string {
    // In real app, this would come from ProductsStore
    if (itemId.includes('beef') || itemId.includes('chicken')) return 'meat'
    if (
      itemId.includes('potato') ||
      itemId.includes('garlic') ||
      itemId.includes('tomato') ||
      itemId.includes('onion')
    )
      return 'vegetables'
    if (itemId.includes('beer') || itemId.includes('cola')) return 'beverages'
    if (itemId.includes('butter')) return 'dairy'
    if (itemId.includes('rice')) return 'grains'
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
      DebugUtils.warn(MODULE_NAME, 'Could not get price from storage, using fallback', { itemId })
    }

    // Fallback to hardcoded prices
    const fallbackPrices: Record<string, number> = {
      'prod-beef-steak': 180000,
      'prod-potato': 8000,
      'prod-garlic': 25000,
      'prod-tomato': 12000,
      'prod-beer-bintang-330': 12000,
      'prod-cola-330': 8000,
      'prod-butter': 45000,
      'prod-chicken-breast': 85000,
      'prod-onion': 15000,
      'prod-rice': 12000
    }
    return fallbackPrices[itemId] || 0
  }
}

// =============================================
// SINGLETON INSTANCE
// =============================================

export const supplierService = new SupplierService()
export default supplierService
