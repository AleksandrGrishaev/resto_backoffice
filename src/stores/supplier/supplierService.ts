// src/stores/supplier/supplierService.ts - ENHANCED VERSION

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
  Bill,
  RequestConsolidation,
  CreateSupplierData,
  CreateProcurementRequestData,
  CreatePurchaseOrderData,
  CreateBillData,
  CreateConsolidationData,
  OrderSuggestion,
  SupplierGroup,
  ConsolidatedItem
} from './types'

const MODULE_NAME = 'SupplierService'

class SupplierService {
  private suppliers: Supplier[] = [...mockSuppliers]
  private requests: ProcurementRequest[] = [...mockProcurementRequests]
  private orders: PurchaseOrder[] = [...mockPurchaseOrders]
  private acceptances: ReceiptAcceptance[] = [...mockReceiptAcceptances]

  // NEW: Enhanced data stores
  private bills: Bill[] = []
  private consolidations: RequestConsolidation[] = []

  // ============================================================================
  // EXISTING SUPPLIER METHODS (unchanged)
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
    DebugUtils.info(MODULE_NAME, 'Supplier updated successfully', { supplierId: id })

    return Promise.resolve(updatedSupplier)
  }

  async deleteSupplier(id: string): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'Deleting supplier', { id })
    await this.simulateDelay(300)

    const index = this.suppliers.findIndex(s => s.id === id)
    if (index === -1) {
      throw new Error(`Supplier with id ${id} not found`)
    }

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
  // EXISTING PROCUREMENT REQUEST METHODS (unchanged)
  // ============================================================================

  async getProcurementRequests(department?: 'kitchen' | 'bar'): Promise<ProcurementRequest[]> {
    DebugUtils.info(MODULE_NAME, 'Getting procurement requests', { department })
    await this.simulateDelay(250)

    let requests = [...this.requests]
    if (department) {
      requests = requests.filter(r => r.department === department)
    }

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
  // ENHANCED PURCHASE ORDER METHODS
  // ============================================================================

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    DebugUtils.info(MODULE_NAME, 'Getting purchase orders')
    await this.simulateDelay(300)

    const orders = [...this.orders]
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
      consolidationId: data.consolidationId, // NEW
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
    supplier.currentBalance -= totalAmount

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
  // EXISTING RECEIPT ACCEPTANCE METHODS (unchanged)
  // ============================================================================

  async getReceiptAcceptances(): Promise<ReceiptAcceptance[]> {
    DebugUtils.info(MODULE_NAME, 'Getting receipt acceptances')
    await this.simulateDelay(250)

    const acceptances = [...this.acceptances]
    acceptances.sort(
      (a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
    )
    return Promise.resolve(acceptances)
  }

  // ============================================================================
  // EXISTING ORDER SUGGESTIONS (unchanged)
  // ============================================================================

  async getOrderSuggestions(department: 'kitchen' | 'bar'): Promise<OrderSuggestion[]> {
    DebugUtils.info(MODULE_NAME, 'Getting order suggestions', { department })
    await this.simulateDelay(400)

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
        if (department === 'kitchen') {
          return ['prod-garlic', 'prod-beef-steak', 'prod-potato', 'prod-tomato'].includes(s.itemId)
        } else {
          return ['prod-beer-bintang-330', 'prod-cola-330', 'prod-water-500'].includes(s.itemId)
        }
      })
    )
  }

  // ============================================================================
  // NEW: REQUEST CONSOLIDATION METHODS
  // ============================================================================

  async createConsolidation(data: CreateConsolidationData): Promise<RequestConsolidation> {
    DebugUtils.info(MODULE_NAME, 'Creating consolidation', { data })
    await this.simulateDelay(800)

    try {
      // 1. Validate requests
      const requests = await this.getRequestsByIds(data.requestIds)
      if (requests.length !== data.requestIds.length) {
        const foundIds = requests.map(r => r.id)
        const missingIds = data.requestIds.filter(id => !foundIds.includes(id))
        throw new Error(`Some requests not found: ${missingIds.join(', ')}`)
      }

      // Check if requests are eligible for consolidation
      const invalidRequests = requests.filter(r => r.status !== 'approved')
      if (invalidRequests.length > 0) {
        const invalidNumbers = invalidRequests.map(r => r.requestNumber).join(', ')
        throw new Error(`Only approved requests can be consolidated. Invalid: ${invalidNumbers}`)
      }

      // 2. Validate that requests have items
      const requestsWithoutItems = requests.filter(r => !r.items || r.items.length === 0)
      if (requestsWithoutItems.length > 0) {
        const emptyNumbers = requestsWithoutItems.map(r => r.requestNumber).join(', ')
        throw new Error(`Requests without items cannot be consolidated: ${emptyNumbers}`)
      }

      // 3. Group items by supplier with enhanced error handling
      let supplierGroups: SupplierGroup[]
      try {
        supplierGroups = this.groupItemsBySupplier(requests)
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to group items by supplier', { error, requests })
        throw new Error(
          'Failed to group items by supplier. Please check that all items have valid suppliers.'
        )
      }

      // 4. Validate that we have at least one supplier group
      if (supplierGroups.length === 0) {
        throw new Error(
          'No suppliers found for the requested items. Please ensure items have associated suppliers.'
        )
      }

      // 5. Calculate totals
      const totalEstimatedValue = this.calculateTotalValue(supplierGroups)

      // 6. Create consolidation
      const consolidation: RequestConsolidation = {
        id: `cons-${Date.now()}`,
        consolidationNumber: `CONS-${String(this.consolidations.length + 1).padStart(3, '0')}`,
        consolidationDate: new Date().toISOString(),
        consolidatedBy: data.consolidatedBy,
        sourceRequestIds: data.requestIds,
        departments: this.extractDepartments(requests),
        supplierGroups,
        status: 'draft',
        generatedOrderIds: [],
        totalEstimatedValue,
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      this.consolidations.push(consolidation)

      DebugUtils.info(MODULE_NAME, 'Consolidation created successfully', {
        consolidationId: consolidation.id,
        totalValue: totalEstimatedValue,
        supplierGroups: supplierGroups.length,
        totalItems: supplierGroups.reduce((sum, group) => sum + group.items.length, 0)
      })

      return Promise.resolve(consolidation)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Consolidation creation failed', { error, data })
      throw error // Re-throw with original error message
    }
  }

  async createOrdersFromConsolidation(consolidationId: string): Promise<PurchaseOrder[]> {
    DebugUtils.info(MODULE_NAME, 'Creating orders from consolidation', { consolidationId })
    await this.simulateDelay(1000)

    const consolidation = this.getConsolidationById(consolidationId)
    if (!consolidation) {
      throw new Error('Consolidation not found')
    }

    const createdOrders: PurchaseOrder[] = []

    // Create one PO per supplier group
    for (const group of consolidation.supplierGroups) {
      const orderData: CreatePurchaseOrderData = {
        supplierId: group.supplierId,
        requestIds: consolidation.sourceRequestIds,
        items: this.convertConsolidatedItems(group.items),
        consolidationId: consolidation.id,
        notes: `Created from consolidation ${consolidation.consolidationNumber}`
      }

      const order = await this.createPurchaseOrder(orderData)
      createdOrders.push(order)
    }

    // Update consolidation status
    await this.updateConsolidation(consolidationId, {
      status: 'processed',
      generatedOrderIds: createdOrders.map(o => o.id)
    })

    // Update source requests status
    await this.updateRequestsStatus(consolidation.sourceRequestIds, 'converted')

    DebugUtils.info(MODULE_NAME, 'Orders created from consolidation successfully', {
      consolidationId,
      orderCount: createdOrders.length
    })

    return Promise.resolve(createdOrders)
  }

  async getConsolidations(): Promise<RequestConsolidation[]> {
    DebugUtils.info(MODULE_NAME, 'Getting consolidations')
    await this.simulateDelay(250)

    const consolidations = [...this.consolidations]
    consolidations.sort(
      (a, b) => new Date(b.consolidationDate).getTime() - new Date(a.consolidationDate).getTime()
    )
    return Promise.resolve(consolidations)
  }

  // ============================================================================
  // NEW: BILLS MANAGEMENT METHODS
  // ============================================================================

  async createBillFromPurchaseOrder(
    purchaseOrderId: string,
    issuedBy: string,
    customDueDate?: string
  ): Promise<Bill> {
    DebugUtils.info(MODULE_NAME, 'Creating bill from purchase order', { purchaseOrderId, issuedBy })
    await this.simulateDelay(500)

    const purchaseOrder = this.orders.find(o => o.id === purchaseOrderId)
    if (!purchaseOrder) {
      throw new Error('Purchase Order not found')
    }

    // Calculate due date based on payment terms
    const dueDate =
      customDueDate || this.calculateDueDate(purchaseOrder.orderDate, purchaseOrder.paymentTerms)

    const bill: Bill = {
      id: `bill-${Date.now()}`,
      billNumber: `BILL-${purchaseOrder.orderNumber}`,
      purchaseOrderId,
      supplierId: purchaseOrder.supplierId,
      supplierName: purchaseOrder.supplierName,
      totalAmount: purchaseOrder.totalAmount,
      taxAmount: purchaseOrder.taxAmount,
      discountAmount: purchaseOrder.discountAmount,
      finalAmount: purchaseOrder.totalAmount, // TODO: calculate with tax/discount
      paymentTerms: purchaseOrder.paymentTerms,
      issueDate: new Date().toISOString(),
      dueDate,
      status: 'issued',
      paymentStatus: 'pending',
      issuedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.bills.push(bill)

    // Update purchase order
    const orderIndex = this.orders.findIndex(o => o.id === purchaseOrderId)
    if (orderIndex !== -1) {
      this.orders[orderIndex] = {
        ...this.orders[orderIndex],
        billId: bill.id,
        paymentStatus: 'pending',
        updatedAt: new Date().toISOString()
      }
    }

    DebugUtils.info(MODULE_NAME, 'Bill created successfully', {
      billId: bill.id,
      billNumber: bill.billNumber
    })

    return Promise.resolve(bill)
  }

  async markBillAsPaid(billId: string, accountTransactionId: string): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'Marking bill as paid', { billId, accountTransactionId })
    await this.simulateDelay(400)

    const billIndex = this.bills.findIndex(b => b.id === billId)
    if (billIndex === -1) {
      throw new Error('Bill not found')
    }

    const bill = this.bills[billIndex]

    // Update bill
    this.bills[billIndex] = {
      ...bill,
      status: 'paid',
      paymentStatus: 'paid',
      paidAt: new Date().toISOString(),
      accountTransactionId,
      updatedAt: new Date().toISOString()
    }

    // Update purchase order payment status
    const orderIndex = this.orders.findIndex(o => o.id === bill.purchaseOrderId)
    if (orderIndex !== -1) {
      this.orders[orderIndex] = {
        ...this.orders[orderIndex],
        paymentStatus: 'paid',
        updatedAt: new Date().toISOString()
      }
    }

    // Update supplier balance
    const supplier = this.suppliers.find(s => s.id === bill.supplierId)
    if (supplier) {
      supplier.currentBalance += bill.finalAmount
      supplier.totalPaid = (supplier.totalPaid || 0) + bill.finalAmount
      supplier.updatedAt = new Date().toISOString()
    }

    DebugUtils.info(MODULE_NAME, 'Bill marked as paid successfully', { billId })
    return Promise.resolve()
  }

  async getBills(): Promise<Bill[]> {
    DebugUtils.info(MODULE_NAME, 'Getting bills')
    await this.simulateDelay(250)

    const bills = [...this.bills]
    bills.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    return Promise.resolve(bills)
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getRequestsByIds(requestIds: string[]): Promise<ProcurementRequest[]> {
    return this.requests.filter(r => requestIds.includes(r.id))
  }

  private groupItemsBySupplier(requests: ProcurementRequest[]): SupplierGroup[] {
    const itemsBySupplier = new Map<string, ConsolidatedItem[]>()

    // Group all items by supplier (based on product categories)
    requests.forEach(request => {
      request.items.forEach(item => {
        // Find suppliers that carry this product
        // FIX: Add safety checks for products array
        const suppliersForItem = this.suppliers.filter(
          s =>
            s.isActive &&
            s.products &&
            Array.isArray(s.products) &&
            s.products.includes(item.itemId)
        )

        // For simplicity, use the first available supplier
        // In real app, this would be more sophisticated (price comparison, reliability, etc.)
        const supplier = suppliersForItem[0]

        // FIX: If no supplier found, create a fallback or skip
        if (!supplier) {
          DebugUtils.warn(MODULE_NAME, 'No supplier found for item', {
            itemId: item.itemId,
            itemName: item.itemName
          })
          return // Skip this item
        }

        if (!itemsBySupplier.has(supplier.id)) {
          itemsBySupplier.set(supplier.id, [])
        }

        // Find existing consolidated item or create new one
        const existingItem = itemsBySupplier.get(supplier.id)!.find(ci => ci.itemId === item.itemId)

        if (existingItem) {
          // Add to existing item
          if (request.department === 'kitchen') {
            existingItem.kitchenQuantity += item.requestedQuantity
          } else {
            existingItem.barQuantity += item.requestedQuantity
          }
          existingItem.totalQuantity += item.requestedQuantity
          existingItem.sourceRequests.push({
            requestId: request.id,
            requestNumber: request.requestNumber,
            department: request.department,
            quantity: item.requestedQuantity,
            reason: item.reason
          })
          // Recalculate total cost
          existingItem.totalEstimatedCost =
            existingItem.totalQuantity * (existingItem.estimatedPrice || 0)
        } else {
          // Create new consolidated item
          const consolidatedItem: ConsolidatedItem = {
            itemId: item.itemId,
            itemName: item.itemName,
            unit: item.unit,
            kitchenQuantity: request.department === 'kitchen' ? item.requestedQuantity : 0,
            barQuantity: request.department === 'bar' ? item.requestedQuantity : 0,
            totalQuantity: item.requestedQuantity,
            sourceRequests: [
              {
                requestId: request.id,
                requestNumber: request.requestNumber,
                department: request.department,
                quantity: item.requestedQuantity,
                reason: item.reason
              }
            ],
            estimatedPrice: this.getEstimatedPrice(item.itemId, supplier.id),
            totalEstimatedCost: 0 // Will be calculated below
          }
          consolidatedItem.totalEstimatedCost =
            consolidatedItem.totalQuantity * (consolidatedItem.estimatedPrice || 0)

          itemsBySupplier.get(supplier.id)!.push(consolidatedItem)
        }
      })
    })

    // Convert to SupplierGroup array
    const supplierGroups: SupplierGroup[] = []
    itemsBySupplier.forEach((items, supplierId) => {
      const supplier = this.suppliers.find(s => s.id === supplierId)

      // FIX: Add safety check for supplier
      if (!supplier) {
        DebugUtils.warn(MODULE_NAME, 'Supplier not found during group creation', { supplierId })
        return
      }

      const estimatedTotal = items.reduce((sum, item) => sum + (item.totalEstimatedCost || 0), 0)

      supplierGroups.push({
        supplierId,
        supplierName: supplier.name,
        items,
        estimatedTotal
      })
    })

    DebugUtils.info(MODULE_NAME, 'Items grouped by supplier', {
      supplierGroups: supplierGroups.length,
      totalItems: supplierGroups.reduce((sum, group) => sum + group.items.length, 0)
    })

    return supplierGroups
  }

  private extractDepartments(requests: ProcurementRequest[]): ('kitchen' | 'bar')[] {
    const departments = new Set<'kitchen' | 'bar'>()
    requests.forEach(r => departments.add(r.department))
    return Array.from(departments)
  }

  private calculateTotalValue(supplierGroups: SupplierGroup[]): number {
    return supplierGroups.reduce((sum, group) => sum + group.estimatedTotal, 0)
  }

  private getConsolidationById(id: string): RequestConsolidation | null {
    return this.consolidations.find(c => c.id === id) || null
  }

  private async updateConsolidation(
    id: string,
    data: Partial<RequestConsolidation>
  ): Promise<RequestConsolidation> {
    const index = this.consolidations.findIndex(c => c.id === id)
    if (index === -1) {
      throw new Error(`Consolidation with id ${id} not found`)
    }

    this.consolidations[index] = {
      ...this.consolidations[index],
      ...data,
      updatedAt: new Date().toISOString()
    }

    return this.consolidations[index]
  }

  private async updateRequestsStatus(
    requestIds: string[],
    status: ProcurementRequest['status']
  ): Promise<void> {
    requestIds.forEach(requestId => {
      const request = this.requests.find(r => r.id === requestId)
      if (request) {
        request.status = status
        request.updatedAt = new Date().toISOString()
      }
    })
  }

  private convertConsolidatedItems(
    items: ConsolidatedItem[]
  ): Omit<import('./types').PurchaseOrderItem, 'id' | 'status'>[] {
    return items.map(item => ({
      itemId: item.itemId,
      itemName: item.itemName,
      orderedQuantity: item.totalQuantity,
      unit: item.unit,
      pricePerUnit: item.estimatedPrice || 0,
      totalPrice: item.totalEstimatedCost || 0,
      notes: `Consolidated from ${item.sourceRequests.length} request(s)`
    }))
  }

  private getEstimatedPrice(itemId: string, supplierId: string): number {
    // In real app, this would look up historical prices or price lists
    // For now, return mock prices
    const mockPrices: Record<string, number> = {
      'prod-beef-steak': 185000,
      'prod-potato': 8000,
      'prod-tomato': 12000,
      'prod-garlic': 25000,
      'prod-onion': 15000,
      'prod-salt': 5000,
      'prod-black-pepper': 120000,
      'prod-beer-bintang-330': 12000,
      'prod-cola-330': 8000,
      'prod-water-500': 3000
    }
    return mockPrices[itemId] || 0
  }

  private calculateDueDate(
    orderDate: string,
    paymentTerms: import('./types').PaymentTerms
  ): string {
    const date = new Date(orderDate)

    switch (paymentTerms) {
      case 'prepaid':
        return date.toISOString() // Immediate
      case 'on_delivery':
        date.setDate(date.getDate() + 7) // 7 days after delivery
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1) // 30 days
        break
      case 'custom':
        date.setDate(date.getDate() + 14) // Default 14 days
        break
    }

    return date.toISOString()
  }

  // ============================================================================
  // EXISTING UTILITY METHODS (unchanged)
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
      totalBills: this.bills.length,
      unpaidBills: this.bills.filter(b => b.status !== 'paid').length,
      totalConsolidations: this.consolidations.length,
      averageReliability:
        activeSuppliers.reduce((sum, s) => {
          const scores = { excellent: 4, good: 3, average: 2, poor: 1 }
          return sum + scores[s.reliability]
        }, 0) / Math.max(activeSuppliers.length, 1)
    }
  }

  private async simulateDelay(ms: number): Promise<void> {
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      await new Promise(resolve => setTimeout(resolve, ms))
    }
  }

  resetData(): void {
    this.suppliers = [...mockSuppliers]
    this.requests = [...mockProcurementRequests]
    this.orders = [...mockPurchaseOrders]
    this.acceptances = [...mockReceiptAcceptances]
    this.bills = []
    this.consolidations = []

    DebugUtils.info(MODULE_NAME, 'Data reset to initial state')
  }
}

export const supplierService = new SupplierService()
