// src/stores/supplier_2/mock/supplierMock.ts

import type { ProcurementRequest, PurchaseOrder, Receipt, OrderSuggestion } from '../types'

const now = new Date().toISOString()

// =============================================
// PROCUREMENT REQUESTS - Order requests
// =============================================

export const mockProcurementRequests: ProcurementRequest[] = [
  // Kitchen request - already processed
  {
    id: 'req-001',
    requestNumber: 'REQ-KITCHEN-001',
    department: 'kitchen',
    requestedBy: 'Chef Maria',

    items: [
      {
        id: 'req-item-001',
        itemId: 'prod-beef-steak', // relation to ProductsStore
        itemName: 'Beef Steak',
        requestedQuantity: 5,
        unit: 'kg',
        notes: 'For evening menu'
      },
      {
        id: 'req-item-002',
        itemId: 'prod-potato',
        itemName: 'Potato',
        requestedQuantity: 10,
        unit: 'kg'
      },
      {
        id: 'req-item-003',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        requestedQuantity: 2,
        unit: 'kg',
        notes: 'Stock critically low'
      }
    ],

    status: 'converted', // already converted to orders
    priority: 'urgent',
    purchaseOrderIds: ['po-001'], // related order

    notes: 'Urgent request - running out of main products',
    createdAt: '2025-08-07T10:00:00Z',
    updatedAt: '2025-08-07T14:30:00Z'
  },

  // Bar request - new
  {
    id: 'req-002',
    requestNumber: 'REQ-BAR-001',
    department: 'bar',
    requestedBy: 'Bartender John',

    items: [
      {
        id: 'req-item-004',
        itemId: 'prod-beer-bintang-330',
        itemName: 'Bintang Beer 330ml',
        requestedQuantity: 48,
        unit: 'piece',
        notes: '2 cases'
      },
      {
        id: 'req-item-005',
        itemId: 'prod-cola-330',
        itemName: 'Coca-Cola 330ml',
        requestedQuantity: 24,
        unit: 'piece'
      }
    ],

    status: 'submitted', // awaiting processing
    priority: 'normal',
    purchaseOrderIds: [],

    notes: 'Weekly beverage request',
    createdAt: '2025-08-08T09:00:00Z',
    updatedAt: '2025-08-08T09:00:00Z'
  },

  // New request - draft
  {
    id: 'req-003',
    requestNumber: 'REQ-KITCHEN-002',
    department: 'kitchen',
    requestedBy: 'Chef Maria',

    items: [
      {
        id: 'req-item-006',
        itemId: 'prod-tomato',
        itemName: 'Fresh Tomato',
        requestedQuantity: 5,
        unit: 'kg'
      }
    ],

    status: 'draft', // still draft
    priority: 'normal',
    purchaseOrderIds: [],

    createdAt: '2025-08-09T08:00:00Z',
    updatedAt: '2025-08-09T08:00:00Z'
  }
]

// =============================================
// PURCHASE ORDERS - Orders to suppliers
// =============================================

export const mockPurchaseOrders: PurchaseOrder[] = [
  // Meat supplier order - sent, awaiting delivery
  {
    id: 'po-001',
    orderNumber: 'PO-001',
    supplierId: 'ca-premium-meat-co', // relation to CounterAgentsStore
    supplierName: 'Premium Meat Company',

    orderDate: '2025-08-07T15:00:00Z',
    expectedDeliveryDate: '2025-08-09T10:00:00Z',

    items: [
      {
        id: 'po-item-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 5,
        unit: 'kg',
        pricePerUnit: 180000, // auto-filled from history
        totalPrice: 900000,

        isEstimatedPrice: true, // price from history
        lastPriceDate: '2025-08-01T00:00:00Z',

        status: 'ordered'
      }
    ],

    totalAmount: 900000,
    isEstimatedTotal: true, // contains estimated prices

    status: 'sent', // sent to supplier
    paymentStatus: 'pending', // awaiting payment

    requestIds: ['req-001'], // created from which request
    billId: 'payment_11', // relation to bill in AccountStore

    notes: 'Urgent meat order for evening menu',
    createdAt: '2025-08-07T15:00:00Z',
    updatedAt: '2025-08-07T15:30:00Z'
  },

  // Vegetable supplier order - confirmed, in transit
  {
    id: 'po-002',
    orderNumber: 'PO-002',
    supplierId: 'ca-fresh-veg-market',
    supplierName: 'Fresh Vegetable Market',

    orderDate: '2025-08-07T16:00:00Z',
    expectedDeliveryDate: '2025-08-09T08:00:00Z',

    items: [
      {
        id: 'po-item-002',
        itemId: 'prod-potato',
        itemName: 'Potato',
        orderedQuantity: 10,
        unit: 'kg',
        pricePerUnit: 8000,
        totalPrice: 80000,

        isEstimatedPrice: true,
        lastPriceDate: '2025-08-01T00:00:00Z',

        status: 'ordered'
      },
      {
        id: 'po-item-003',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        orderedQuantity: 2,
        unit: 'kg',
        pricePerUnit: 25000,
        totalPrice: 50000,

        isEstimatedPrice: true,
        lastPriceDate: '2025-08-02T00:00:00Z',

        status: 'ordered'
      }
    ],

    totalAmount: 130000,
    isEstimatedTotal: true,

    status: 'confirmed', // confirmed by supplier
    paymentStatus: 'paid', // already paid

    requestIds: ['req-001'],
    billId: 'payment_12',

    notes: 'Vegetables for weekly menu',
    createdAt: '2025-08-07T16:00:00Z',
    updatedAt: '2025-08-08T10:00:00Z'
  },

  // Beverage order - draft
  {
    id: 'po-003',
    orderNumber: 'PO-003',
    supplierId: 'ca-beverage-distribution',
    supplierName: 'Jakarta Beverage Distribution',

    orderDate: '2025-08-09T09:00:00Z',

    items: [
      {
        id: 'po-item-004',
        itemId: 'prod-beer-bintang-330',
        itemName: 'Bintang Beer 330ml',
        orderedQuantity: 48,
        unit: 'piece',
        pricePerUnit: 12000,
        totalPrice: 576000,

        isEstimatedPrice: true,
        lastPriceDate: '2025-08-01T00:00:00Z',

        status: 'ordered'
      }
    ],

    totalAmount: 576000,
    isEstimatedTotal: true,

    status: 'draft', // still draft
    paymentStatus: 'pending',

    requestIds: ['req-002'],

    notes: 'Beverage order for bar',
    createdAt: '2025-08-09T09:00:00Z',
    updatedAt: '2025-08-09T09:00:00Z'
  }
]

// =============================================
// RECEIPTS - Goods receipt
// =============================================

export const mockReceipts: Receipt[] = [
  // Vegetable receipt - completed without discrepancies
  {
    id: 'receipt-001',
    receiptNumber: 'RCP-001',
    purchaseOrderId: 'po-002', // relation to order

    deliveryDate: '2025-08-09T08:30:00Z',
    receivedBy: 'Warehouse Manager',

    items: [
      {
        id: 'receipt-item-001',
        orderItemId: 'po-item-002',
        itemId: 'prod-potato',
        itemName: 'Potato',

        orderedQuantity: 10,
        receivedQuantity: 10, // received exactly as ordered

        orderedPrice: 8000,
        actualPrice: 8000, // price unchanged

        notes: 'Good quality'
      },
      {
        id: 'receipt-item-002',
        orderItemId: 'po-item-003',
        itemId: 'prod-garlic',
        itemName: 'Garlic',

        orderedQuantity: 2,
        receivedQuantity: 2,

        orderedPrice: 25000,
        actualPrice: 27000, // price increased!

        notes: 'Price increased by 2000'
      }
    ],

    hasDiscrepancies: true, // price discrepancies
    status: 'completed',

    storageOperationId: 'op-006', // relation to operation in StorageStore

    notes: 'Receipt completed successfully, small price increase on garlic',
    createdAt: '2025-08-09T08:30:00Z',
    updatedAt: '2025-08-09T09:00:00Z'
  },

  // Meat receipt - in progress (draft)
  {
    id: 'receipt-002',
    receiptNumber: 'RCP-002',
    purchaseOrderId: 'po-001',

    deliveryDate: '2025-08-09T10:15:00Z',
    receivedBy: 'Chef Maria',

    items: [
      {
        id: 'receipt-item-003',
        orderItemId: 'po-item-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',

        orderedQuantity: 5,
        receivedQuantity: 4.8, // slight shortage

        orderedPrice: 180000,
        // actualPrice not set yet - receipt in progress

        notes: 'Small weight shortage'
      }
    ],

    hasDiscrepancies: true, // quantity discrepancies
    status: 'draft', // receipt not completed yet

    notes: 'Receipt in progress, checking meat quality',
    createdAt: '2025-08-09T10:15:00Z',
    updatedAt: '2025-08-09T10:15:00Z'
  }
]

// =============================================
// ORDER SUGGESTIONS - Order suggestions
// =============================================

export const mockOrderSuggestions: OrderSuggestion[] = [
  // Critically low stock
  {
    itemId: 'prod-garlic',
    itemName: 'Garlic',
    currentStock: 0.3,
    minStock: 0.5,
    suggestedQuantity: 2,
    urgency: 'high',
    reason: 'below_minimum',
    estimatedPrice: 25000,
    lastPriceDate: '2025-08-02T00:00:00Z'
  },

  // Completely out of stock
  {
    itemId: 'prod-tomato',
    itemName: 'Fresh Tomato',
    currentStock: 0,
    minStock: 2,
    suggestedQuantity: 5,
    urgency: 'high',
    reason: 'out_of_stock',
    estimatedPrice: 12000,
    lastPriceDate: '2025-08-02T00:00:00Z'
  },

  // Running low soon
  {
    itemId: 'prod-beer-bintang-330',
    itemName: 'Bintang Beer 330ml',
    currentStock: 12,
    minStock: 24,
    suggestedQuantity: 48,
    urgency: 'medium',
    reason: 'below_minimum',
    estimatedPrice: 12000,
    lastPriceDate: '2025-08-01T00:00:00Z'
  },

  // Low stock but not critical
  {
    itemId: 'prod-butter',
    itemName: 'Butter',
    currentStock: 1.2,
    minStock: 1,
    suggestedQuantity: 2,
    urgency: 'low',
    reason: 'below_minimum',
    estimatedPrice: 45000,
    lastPriceDate: '2025-08-03T00:00:00Z'
  }
]

// =============================================
// UTILITY FUNCTIONS
// =============================================

export function getRequestById(id: string): ProcurementRequest | undefined {
  return mockProcurementRequests.find(req => req.id === id)
}

export function getOrderById(id: string): PurchaseOrder | undefined {
  return mockPurchaseOrders.find(order => order.id === id)
}

export function getReceiptById(id: string): Receipt | undefined {
  return mockReceipts.find(receipt => receipt.id === id)
}

export function getRequestsByStatus(status: ProcurementRequest['status']): ProcurementRequest[] {
  return mockProcurementRequests.filter(req => req.status === status)
}

export function getOrdersByStatus(status: PurchaseOrder['status']): PurchaseOrder[] {
  return mockPurchaseOrders.filter(order => order.status === status)
}

export function getOrdersByPaymentStatus(
  paymentStatus: PurchaseOrder['paymentStatus']
): PurchaseOrder[] {
  return mockPurchaseOrders.filter(order => order.paymentStatus === paymentStatus)
}

export function getReceiptsByStatus(status: Receipt['status']): Receipt[] {
  return mockReceipts.filter(receipt => receipt.status === status)
}

export function getOrdersForReceipt(): PurchaseOrder[] {
  // Orders that can be received (sent or confirmed)
  return mockPurchaseOrders.filter(
    order =>
      ['sent', 'confirmed'].includes(order.status) &&
      !mockReceipts.some(
        receipt => receipt.purchaseOrderId === order.id && receipt.status === 'completed'
      )
  )
}

export function getSuggestionsForDepartment(department: 'kitchen' | 'bar'): OrderSuggestion[] {
  // Simple logic - raw materials for kitchen, beverages for bar
  if (department === 'kitchen') {
    return mockOrderSuggestions.filter(
      s => !s.itemId.includes('beer') && !s.itemId.includes('cola')
    )
  } else {
    return mockOrderSuggestions.filter(
      s => s.itemId.includes('beer') || s.itemId.includes('cola') || s.itemId.includes('water')
    )
  }
}

// Statistics for Overview
export function getSupplierStatistics() {
  return {
    totalRequests: mockProcurementRequests.length,
    pendingRequests: getRequestsByStatus('submitted').length,
    totalOrders: mockPurchaseOrders.length,
    ordersAwaitingPayment: getOrdersByPaymentStatus('pending').length,
    ordersAwaitingDelivery: mockPurchaseOrders.filter(o => ['sent', 'confirmed'].includes(o.status))
      .length,
    totalReceipts: mockReceipts.length,
    pendingReceipts: getReceiptsByStatus('draft').length,
    urgentSuggestions: mockOrderSuggestions.filter(s => s.urgency === 'high').length
  }
}
