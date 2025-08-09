// src/stores/supplier/supplierService.ts
import { DebugUtils } from '@/utils'
import {
  mockSuppliers,
  mockProcurementRequests,
  mockPurchaseOrders,
  mockReceiptAcceptances
} from './supplierMock'
import type {
  Supplier,
  ProcurementRequest,
  PurchaseOrder,
  ReceiptAcceptance,
  CreateSupplierData,
  CreateProcurementRequestData,
  CreatePurchaseOrderData,
  OrderSuggestion
} from './types'

const MODULE_NAME = 'SupplierService'

class SupplierService {
  private suppliers: Supplier[] = [...mockSuppliers]
  private requests: ProcurementRequest[] = [...mockProcurementRequests]
  private orders: PurchaseOrder[] = [...mockPurchaseOrders]
  private acceptances: ReceiptAcceptance[] = [...mockReceiptAcceptances]

  // ============================================================================
  // SUPPLIER METHODS
  // ============================================================================

  async getSuppliers(): Promise<Supplier[]> {
    DebugUtils.info(MODULE_NAME, 'Getting suppliers')
    await this.simulateDelay(300)
    return Promise.resolve([...this.suppliers])
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    DebugUtils.info(MODULE_NAME, 'Getting supplier by ID', { id })
    await this.simulateDelay(200)
    const supplier = this.suppliers.find(s => s.id === id)
    return Promise.resolve(supplier || null)
  }

  async createSupplier(data: CreateSupplierData): Promise<Supplier> {
    DebugUtils.info(MODULE_NAME, 'Creating supplier', { data })

    await this.simulateDelay(500)

    const supplier: Supplier = {
      id: `sup-${Date.now()}`,
      ...data,
      totalOrders: 0,
      totalOrderValue: 0,
      averageOrderValue: 0,
      currentBalance: 0,
      totalPaid: 0,
      totalDebt: 0,
      isActive: data.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.suppliers.push(supplier)

    DebugUtils.info(MODULE_NAME, 'Supplier created successfully', {
      supplierId: supplier.id,
      name: supplier.name
    })

    return Promise.resolve(supplier)
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    DebugUtils.info(MODULE_NAME, 'Updating supplier', { id, data })

    await this.simulateDelay(400)

    const index = this.suppliers.findIndex(s => s.id === id)
    if (index === -1) {
      throw new Error(`Supplier with id ${id} not found`)
    }

    const updatedSupplier = {
      ...this.suppliers[index],
      ...data,
      updatedAt: new Date().toISOString()
    }

    this.suppliers[index] = updatedSupplier

    DebugUtils.info(MODULE_NAME, 'Supplier updated successfully', {
      supplierId: id
    })

    return Promise.resolve(updatedSupplier)
  }

  async deleteSupplier(id: string): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'Deleting supplier', { id })

    await this.simulateDelay(300)

    const index = this.suppliers.findIndex(s => s.id === id)
    if (index === -1) {
      throw new Error(`Supplier with id ${id} not found`)
    }

    // Check if supplier has active orders
    const hasActiveOrders = this.orders.some(
      o => o.supplierId === id && !['delivered', 'cancelled'].includes(o.status)
    )

    if (hasActiveOrders) {
      throw new Error('Cannot delete supplier with active orders')
    }

    this.suppliers.splice(index, 1)

    DebugUtils.info(MODULE_NAME, 'Supplier deleted successfully', { id })
    return Promise.resolve()
  }

  // ============================================================================
  // PROCUREMENT REQUEST METHODS
  // ============================================================================

  async getProcurementRequests(department?: 'kitchen' | 'bar'): Promise<ProcurementRequest[]> {
    DebugUtils.info(MODULE_NAME, 'Getting procurement requests', { department })

    await this.simulateDelay(250)

    let requests = [...this.requests]
    if (department) {
      requests = requests.filter(r => r.department === department)
    }

    // Sort by date (newest first)
    requests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())

    return Promise.resolve(requests)
  }

  async createProcurementRequest(data: CreateProcurementRequestData): Promise<ProcurementRequest> {
    DebugUtils.info(MODULE_NAME, 'Creating procurement request', { data })

    await this.simulateDelay(600)

    const requestNumber = `REQ-${data.department.toUpperCase()}-${String(this.requests.length + 1).padStart(3, '0')}`

    const request: ProcurementRequest = {
      id: `req-${Date.now()}`,
      requestNumber,
      department: data.department,
      requestedBy: data.requestedBy,
      requestDate: new Date().toISOString(),
      items: data.items.map((item, index) => ({
        id: `req-item-${Date.now()}-${index}`,
        ...item
      })),
      status: 'draft',
      priority: data.priority || 'normal',
      purchaseOrderIds: [],
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.requests.push(request)

    DebugUtils.info(MODULE_NAME, 'Procurement request created successfully', {
      requestId: request.id,
      requestNumber: request.requestNumber
    })

    return Promise.resolve(request)
  }

  async updateProcurementRequest(
    id: string,
    data: Partial<ProcurementRequest>
  ): Promise<ProcurementRequest> {
    DebugUtils.info(MODULE_NAME, 'Updating procurement request', { id, data })

    await this.simulateDelay(400)

    const index = this.requests.findIndex(r => r.id === id)
    if (index === -1) {
      throw new Error(`Procurement request with id ${id} not found`)
    }

    const updatedRequest = {
      ...this.requests[index],
      ...data,
      updatedAt: new Date().toISOString()
    }

    this.requests[index] = updatedRequest

    DebugUtils.info(MODULE_NAME, 'Procurement request updated successfully', { id })

    return Promise.resolve(updatedRequest)
  }

  // ============================================================================
  // PURCHASE ORDER METHODS
  // ============================================================================

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    DebugUtils.info(MODULE_NAME, 'Getting purchase orders')

    await this.simulateDelay(300)

    const orders = [...this.orders]
    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())

    return Promise.resolve(orders)
  }

  async createPurchaseOrder(data: CreatePurchaseOrderData): Promise<PurchaseOrder> {
    DebugUtils.info(MODULE_NAME, 'Creating purchase order', { data })

    await this.simulateDelay(700)

    const supplier = await this.getSupplierById(data.supplierId)
    if (!supplier) {
      throw new Error('Supplier not found')
    }

    const orderNumber = `PO-${supplier.name.replace(/\s+/g, '').toUpperCase()}-${String(this.orders.length + 1).padStart(3, '0')}`

    const totalAmount = data.items.reduce((sum, item) => sum + item.totalPrice, 0)

    const order: PurchaseOrder = {
      id: `po-${Date.now()}`,
      orderNumber,
      supplierId: data.supplierId,
      supplierName: supplier.name,
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      items: data.items.map((item, index) => ({
        id: `po-item-${Date.now()}-${index}`,
        ...item,
        status: 'ordered'
      })),
      totalAmount,
      paymentTerms: data.paymentTerms || supplier.paymentTerms,
      paymentStatus: 'pending',
      deliveryMethod: data.deliveryMethod || 'delivery',
      status: 'draft',
      requestIds: data.requestIds,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.orders.push(order)

    // Update supplier statistics
    supplier.totalOrders = (supplier.totalOrders || 0) + 1
    supplier.totalOrderValue = (supplier.totalOrderValue || 0) + totalAmount
    supplier.averageOrderValue = supplier.totalOrderValue / supplier.totalOrders
    supplier.lastOrderDate = new Date().toISOString()
    supplier.currentBalance -= totalAmount // We now owe them more

    // Update requests status if they are linked
    data.requestIds.forEach(requestId => {
      const request = this.requests.find(r => r.id === requestId)
      if (request) {
        request.status = 'converted'
        request.purchaseOrderIds.push(order.id)
        request.updatedAt = new Date().toISOString()
      }
    })

    DebugUtils.info(MODULE_NAME, 'Purchase order created successfully', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount
    })

    return Promise.resolve(order)
  }

  // ============================================================================
  // RECEIPT ACCEPTANCE METHODS
  // ============================================================================

  async getReceiptAcceptances(): Promise<ReceiptAcceptance[]> {
    DebugUtils.info(MODULE_NAME, 'Getting receipt acceptances')

    await this.simulateDelay(250)

    const acceptances = [...this.acceptances]
    // Sort by date (newest first)
    acceptances.sort(
      (a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
    )

    return Promise.resolve(acceptances)
  }

  // ============================================================================
  // ORDER SUGGESTIONS & ASSISTANT
  // ============================================================================

  async getOrderSuggestions(department: 'kitchen' | 'bar'): Promise<OrderSuggestion[]> {
    DebugUtils.info(MODULE_NAME, 'Getting order suggestions', { department })

    await this.simulateDelay(400)

    // TODO: Integration with StorageStore to get actual low stock items
    // For now, return mock suggestions
    const mockSuggestions: OrderSuggestion[] = [
      {
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        currentStock: 0.3,
        minStock: 0.5,
        suggestedQuantity: 2,
        reason: 'below_minimum',
        urgency: 'high'
      },
      {
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        currentStock: 2.5,
        minStock: 2,
        suggestedQuantity: 5,
        reason: 'below_minimum',
        urgency: 'medium'
      }
    ]

    return Promise.resolve(
      mockSuggestions.filter(s => {
        // Filter suggestions based on department
        if (department === 'kitchen') {
          return ['prod-garlic', 'prod-beef-steak', 'prod-potato', 'prod-tomato'].includes(s.itemId)
        } else {
          return ['prod-beer-bintang-330', 'prod-cola-330', 'prod-water-500'].includes(s.itemId)
        }
      })
    )
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getSupplierProducts(supplierId: string): string[] {
    const supplier = this.suppliers.find(s => s.id === supplierId)
    return supplier?.products || []
  }

  getSuppliersByProduct(productId: string): Supplier[] {
    return this.suppliers.filter(s => s.isActive && s.products.includes(productId))
  }

  getSuppliersByCategory(category: string): Supplier[] {
    return this.suppliers.filter(s => s.isActive && s.categories.includes(category))
  }

  // Get statistics
  getSupplierStatistics() {
    const activeSuppliers = this.suppliers.filter(s => s.isActive)
    const pendingRequests = this.requests.filter(r => r.status === 'submitted')
    const activeOrders = this.orders.filter(o =>
      ['sent', 'confirmed', 'in_transit'].includes(o.status)
    )
    const totalOutstanding = this.suppliers.reduce(
      (sum, s) => sum + Math.max(0, -s.currentBalance),
      0
    )

    return {
      totalSuppliers: this.suppliers.length,
      activeSuppliers: activeSuppliers.length,
      pendingRequests: pendingRequests.length,
      activeOrders: activeOrders.length,
      totalOutstanding,
      averageReliability:
        activeSuppliers.reduce((sum, s) => {
          const scores = { excellent: 4, good: 3, average: 2, poor: 1 }
          return sum + scores[s.reliability]
        }, 0) / Math.max(activeSuppliers.length, 1)
    }
  }

  // Simulate network delay for realistic UX
  private async simulateDelay(ms: number): Promise<void> {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      await new Promise(resolve => setTimeout(resolve, ms))
    }
  }

  // Reset data to initial state (useful for testing)
  resetData(): void {
    this.suppliers = [...mockSuppliers]
    this.requests = [...mockProcurementRequests]
    this.orders = [...mockPurchaseOrders]
    this.acceptances = [...mockReceiptAcceptances]

    DebugUtils.info(MODULE_NAME, 'Data reset to initial state')
  }
}

export const supplierService = new SupplierService()
