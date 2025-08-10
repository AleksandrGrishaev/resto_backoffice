// src/stores/supplier_2/supplierService.ts

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
  UnassignedItem
} from './types'

import {
  mockProcurementRequests,
  mockPurchaseOrders,
  mockReceipts,
  mockOrderSuggestions,
  getRequestById,
  getOrderById,
  getReceiptById,
  getSupplierStatistics
} from './mock/supplierMock'

// =============================================
// SERVICE CLASS
// =============================================

class SupplierService {
  private requests: ProcurementRequest[] = [...mockProcurementRequests]
  private orders: PurchaseOrder[] = [...mockPurchaseOrders]
  private receipts: Receipt[] = [...mockReceipts]
  private suggestions: OrderSuggestion[] = [...mockOrderSuggestions]

  // =============================================
  // PROCUREMENT REQUESTS METHODS
  // =============================================

  async getRequests(): Promise<ProcurementRequest[]> {
    // Simulate API delay
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

    return request
  }

  async deleteRequest(id: string): Promise<void> {
    await this.delay(100)

    const index = this.requests.findIndex(req => req.id === id)
    if (index === -1) {
      throw new Error(`Request with id ${id} not found`)
    }

    this.requests.splice(index, 1)
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

    const newOrder: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber: this.generateOrderNumber(),
      supplierId: data.supplierId,
      supplierName: this.getSupplierName(data.supplierId),
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      items: data.items.map(item => ({
        id: `po-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        itemId: item.itemId,
        itemName: this.getItemName(item.itemId),
        orderedQuantity: item.quantity,
        unit: this.getItemUnit(item.itemId),
        pricePerUnit: item.pricePerUnit,
        totalPrice: item.quantity * item.pricePerUnit,
        isEstimatedPrice: true, // Always true for new orders
        lastPriceDate: new Date().toISOString(),
        status: 'ordered'
      })),
      totalAmount: data.items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0),
      isEstimatedTotal: true,
      status: 'draft',
      paymentStatus: 'pending',
      requestIds: data.requestIds,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.orders.unshift(newOrder)

    // Update related requests status
    data.requestIds.forEach(requestId => {
      const request = this.requests.find(req => req.id === requestId)
      if (request) {
        request.purchaseOrderIds.push(newOrder.id)
        request.status = 'converted'
        request.updatedAt = new Date().toISOString()
      }
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

    return order
  }

  async deleteOrder(id: string): Promise<void> {
    await this.delay(100)

    const index = this.orders.findIndex(order => order.id === id)
    if (index === -1) {
      throw new Error(`Order with id ${id} not found`)
    }

    this.orders.splice(index, 1)
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
    return newReceipt
  }

  async completeReceipt(id: string): Promise<Receipt> {
    await this.delay(200)

    const receipt = this.receipts.find(rec => rec.id === id)
    if (!receipt) {
      throw new Error(`Receipt with id ${id} not found`)
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

      // Recalculate total amount
      order.totalAmount = order.items.reduce(
        (sum, item) => sum + (item.receivedQuantity || item.orderedQuantity) * item.pricePerUnit,
        0
      )
      order.isEstimatedTotal = false
    }

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

    return receipt
  }

  // =============================================
  // ORDER SUGGESTIONS METHODS
  // =============================================

  async getOrderSuggestions(department?: 'kitchen' | 'bar'): Promise<OrderSuggestion[]> {
    await this.delay(150)

    if (!department) {
      return [...this.suggestions]
    }

    // Filter suggestions by department
    if (department === 'kitchen') {
      return this.suggestions.filter(s => !s.itemId.includes('beer') && !s.itemId.includes('cola'))
    } else {
      return this.suggestions.filter(
        s => s.itemId.includes('beer') || s.itemId.includes('cola') || s.itemId.includes('water')
      )
    }
  }

  // =============================================
  // SUPPLIER BASKET METHODS (for UI grouping)
  // =============================================

  async createSupplierBaskets(requestIds: string[]): Promise<SupplierBasket[]> {
    await this.delay(100)

    const requests = this.requests.filter(req => requestIds.includes(req.id))
    const unassignedItems: UnassignedItem[] = []

    // Group items from all requests
    requests.forEach(request => {
      request.items.forEach(item => {
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
          unassignedItems.push({
            itemId: item.itemId,
            itemName: item.itemName,
            category: this.getItemCategory(item.itemId),
            totalQuantity: item.requestedQuantity,
            unit: item.unit,
            estimatedPrice: this.getEstimatedPrice(item.itemId),
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
      })
    })

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
  // PRIVATE HELPER METHODS
  // =============================================

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateRequestNumber(department: 'kitchen' | 'bar'): string {
    const prefix = department.toUpperCase()
    const count = this.requests.filter(req => req.department === department).length + 1
    return `REQ-${prefix}-${String(count).padStart(3, '0')}`
  }

  private generateOrderNumber(): string {
    const count = this.orders.length + 1
    return `PO-${String(count).padStart(3, '0')}`
  }

  private generateReceiptNumber(): string {
    const count = this.receipts.length + 1
    return `RCP-${String(count).padStart(3, '0')}`
  }

  private getSupplierName(supplierId: string): string {
    // In real app, this would come from CounterAgentsStore
    const supplierNames: Record<string, string> = {
      'ca-premium-meat-co': 'Premium Meat Company',
      'ca-fresh-veg-market': 'Fresh Vegetable Market',
      'ca-beverage-distribution': 'Jakarta Beverage Distribution',
      'ca-dairy-plus': 'Dairy Products Plus'
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
      'prod-butter': 'Butter'
    }
    return itemNames[itemId] || 'Unknown Item'
  }

  private getItemUnit(itemId: string): string {
    // In real app, this would come from ProductsStore
    if (itemId.includes('beer') || itemId.includes('cola')) return 'piece'
    return 'kg'
  }

  private getItemCategory(itemId: string): string {
    // In real app, this would come from ProductsStore
    if (itemId.includes('beef')) return 'meat'
    if (itemId.includes('potato') || itemId.includes('garlic') || itemId.includes('tomato'))
      return 'vegetables'
    if (itemId.includes('beer') || itemId.includes('cola')) return 'beverages'
    if (itemId.includes('butter')) return 'dairy'
    return 'other'
  }

  private getEstimatedPrice(itemId: string): number {
    // In real app, this would come from StorageStore operations history
    const prices: Record<string, number> = {
      'prod-beef-steak': 180000,
      'prod-potato': 8000,
      'prod-garlic': 25000,
      'prod-tomato': 12000,
      'prod-beer-bintang-330': 12000,
      'prod-cola-330': 8000,
      'prod-butter': 45000
    }
    return prices[itemId] || 0
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
}

// =============================================
// SINGLETON INSTANCE
// =============================================

export const supplierService = new SupplierService()
export default supplierService
