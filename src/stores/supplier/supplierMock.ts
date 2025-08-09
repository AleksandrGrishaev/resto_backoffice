// src/stores/supplier/supplierMock.ts - ENHANCED VERSION

import type {
  Supplier,
  ProcurementRequest,
  PurchaseOrder,
  ReceiptAcceptance,
  Bill,
  RequestConsolidation,
  SupplierGroup,
  ConsolidatedItem
} from './types'

const now = new Date().toISOString()

// ============================================================================
// EXISTING MOCK DATA (Enhanced with new fields)
// ============================================================================

export const mockSuppliers: Supplier[] = [
  {
    id: 'sup-001',
    name: 'Premium Meat Co',
    type: 'wholesale',
    contactPerson: 'John Doe',
    phone: '+62-21-555-0001',
    email: 'orders@premiummeat.co.id',
    address: 'Jl. Meat Market No. 123, Jakarta',
    products: ['prod-beef-steak', 'prod-chicken-breast', 'prod-lamb-chop'],
    categories: ['meat'],
    paymentTerms: 'on_delivery',
    totalOrders: 25,
    totalOrderValue: 15000000, // 15M IDR
    averageOrderValue: 600000,
    lastOrderDate: '2025-02-01T00:00:00Z',
    reliability: 'excellent',
    currentBalance: -2500000, // we owe them 2.5M
    totalPaid: 12500000,
    totalDebt: 2500000,
    isActive: true,
    notes: 'Best quality beef supplier, excellent delivery record',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'sup-002',
    name: 'Fresh Vegetables Market',
    type: 'local',
    contactPerson: 'Maria Santos',
    phone: '+62-21-555-0002',
    email: 'fresh@vegmarket.co.id',
    address: 'Pasar Mayestik, Jakarta Selatan',
    products: [
      'prod-potato',
      'prod-tomato',
      'prod-onion',
      'prod-garlic',
      'prod-carrot',
      'prod-lettuce'
    ],
    categories: ['vegetables'],
    paymentTerms: 'prepaid',
    totalOrders: 28,
    totalOrderValue: 12000000,
    averageOrderValue: 428571,
    lastOrderDate: '2025-02-02T00:00:00Z',
    reliability: 'good',
    currentBalance: 800000, // they owe us 800k (prepaid but not fully delivered)
    totalPaid: 12800000,
    totalDebt: 0,
    isActive: true,
    notes: 'Reliable local supplier, good prices',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'sup-003',
    name: 'Beverage Distributor Ltd',
    type: 'wholesale',
    contactPerson: 'Tommy Liu',
    phone: '+62-21-555-0003',
    email: 'orders@bevdist.co.id',
    address: 'Jl. Industri No. 456, Tangerang',
    products: [
      'prod-beer-bintang-330',
      'prod-beer-bintang-500',
      'prod-cola-330',
      'prod-water-500',
      'prod-sprite-330'
    ],
    categories: ['beverages'],
    paymentTerms: 'monthly',
    totalOrders: 18,
    totalOrderValue: 32000000,
    averageOrderValue: 1777777,
    lastOrderDate: '2025-01-28T00:00:00Z',
    reliability: 'excellent',
    currentBalance: -5200000, // we owe them 5.2M
    totalPaid: 26800000,
    totalDebt: 5200000,
    isActive: true,
    notes: 'Large distributor, bulk discounts available',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'sup-004',
    name: 'Spice & Herbs Co',
    type: 'local',
    contactPerson: 'Ahmad Nurdin',
    phone: '+62-21-555-0004',
    email: 'info@spiceherbs.co.id',
    address: 'Jl. Rempah No. 789, Jakarta Pusat',
    products: ['prod-salt', 'prod-black-pepper', 'prod-oregano', 'prod-basil', 'prod-chili-powder'],
    categories: ['spices'],
    paymentTerms: 'on_delivery',
    totalOrders: 12,
    totalOrderValue: 3600000,
    averageOrderValue: 300000,
    lastOrderDate: '2025-01-30T00:00:00Z',
    reliability: 'good',
    currentBalance: -280000, // we owe them 280k
    totalPaid: 3320000,
    totalDebt: 280000,
    isActive: true,
    notes: 'Good quality spices, sometimes delayed delivery',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'sup-005',
    name: 'Dairy Fresh Ltd',
    type: 'wholesale',
    contactPerson: 'Lisa Wang',
    phone: '+62-21-555-0005',
    email: 'sales@dairyfresh.co.id',
    address: 'Jl. Susu No. 321, Bogor',
    products: ['prod-butter', 'prod-milk', 'prod-cream', 'prod-cheese'],
    categories: ['dairy'],
    paymentTerms: 'prepaid',
    totalOrders: 20,
    totalOrderValue: 9500000,
    averageOrderValue: 475000,
    lastOrderDate: '2025-02-03T00:00:00Z',
    reliability: 'excellent',
    currentBalance: 0, // balanced
    totalPaid: 9500000,
    totalDebt: 0,
    isActive: true,
    notes: 'Very reliable dairy supplier, excellent cold chain',
    createdAt: now,
    updatedAt: now
  }
]

// Enhanced Procurement Requests
export const mockProcurementRequests: ProcurementRequest[] = [
  {
    id: 'req-001',
    requestNumber: 'REQ-KITCHEN-001',
    department: 'kitchen',
    requestedBy: 'Chef Maria',
    requestDate: '2025-02-05T08:00:00Z',
    items: [
      {
        id: 'req-item-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        currentStock: 2.5,
        requestedQuantity: 8,
        unit: 'kg',
        reason: 'low_stock',
        notes: 'Weekend demand expected'
      },
      {
        id: 'req-item-002',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        currentStock: 0.3,
        requestedQuantity: 3,
        unit: 'kg',
        reason: 'out_of_stock'
      }
    ],
    status: 'approved', // Changed to approved for consolidation demo
    priority: 'urgent',
    purchaseOrderIds: [],
    notes: 'Need for weekend menu, high priority',
    createdAt: '2025-02-05T08:00:00Z',
    updatedAt: '2025-02-05T10:30:00Z'
  },
  {
    id: 'req-002',
    requestNumber: 'REQ-BAR-001',
    department: 'bar',
    requestedBy: 'Bartender John',
    requestDate: '2025-02-04T14:00:00Z',
    items: [
      {
        id: 'req-item-003',
        itemId: 'prod-beer-bintang-330',
        itemName: 'Bintang Beer 330ml',
        currentStock: 24,
        requestedQuantity: 72,
        unit: 'piece',
        reason: 'low_stock',
        notes: 'Popular item, running low'
      },
      {
        id: 'req-item-004',
        itemId: 'prod-cola-330',
        itemName: 'Coca-Cola 330ml',
        currentStock: 36,
        requestedQuantity: 48,
        unit: 'piece',
        reason: 'upcoming_menu'
      }
    ],
    status: 'approved', // Changed to approved for consolidation demo
    priority: 'normal',
    purchaseOrderIds: [],
    notes: 'Weekly beverage stock up',
    createdAt: '2025-02-04T14:00:00Z',
    updatedAt: '2025-02-04T16:20:00Z'
  },
  {
    id: 'req-003',
    requestNumber: 'REQ-KITCHEN-002',
    department: 'kitchen',
    requestedBy: 'Sous Chef David',
    requestDate: '2025-02-05T09:30:00Z',
    items: [
      {
        id: 'req-item-005',
        itemId: 'prod-potato',
        itemName: 'Potato',
        currentStock: 8,
        requestedQuantity: 15,
        unit: 'kg',
        reason: 'low_stock',
        notes: 'For fries and mashed potatoes'
      },
      {
        id: 'req-item-006',
        itemId: 'prod-onion',
        itemName: 'Onion',
        currentStock: 4,
        requestedQuantity: 10,
        unit: 'kg',
        reason: 'low_stock'
      }
    ],
    status: 'approved', // Ready for consolidation
    priority: 'normal',
    purchaseOrderIds: [],
    notes: 'Standard weekly restock',
    createdAt: '2025-02-05T09:30:00Z',
    updatedAt: '2025-02-05T11:15:00Z'
  },
  {
    id: 'req-004',
    requestNumber: 'REQ-BAR-002',
    department: 'bar',
    requestedBy: 'Bar Manager Sarah',
    requestDate: '2025-02-05T11:00:00Z',
    items: [
      {
        id: 'req-item-007',
        itemId: 'prod-water-500',
        itemName: 'Water 500ml',
        currentStock: 60,
        requestedQuantity: 100,
        unit: 'piece',
        reason: 'bulk_discount',
        notes: 'Bulk order for cost savings'
      }
    ],
    status: 'draft',
    priority: 'low',
    purchaseOrderIds: [],
    notes: 'Taking advantage of bulk pricing',
    createdAt: '2025-02-05T11:00:00Z',
    updatedAt: '2025-02-05T11:00:00Z'
  }
]

// Enhanced Purchase Orders
export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-001',
    orderNumber: 'PO-MEAT-001',
    supplierId: 'sup-001',
    supplierName: 'Premium Meat Co',
    orderDate: '2025-02-05T10:00:00Z',
    expectedDeliveryDate: '2025-02-06T08:00:00Z',
    items: [
      {
        id: 'po-item-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 5,
        unit: 'kg',
        pricePerUnit: 185000,
        totalPrice: 925000,
        status: 'ordered'
      }
    ],
    totalAmount: 925000,
    paymentTerms: 'on_delivery',
    paymentStatus: 'pending',
    deliveryMethod: 'delivery',
    status: 'sent',
    requestIds: ['req-001'],
    billId: 'bill-001', // NEW: Link to bill
    notes: 'Urgent order for weekend',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'po-002',
    orderNumber: 'PO-VEG-001',
    supplierId: 'sup-002',
    supplierName: 'Fresh Vegetables Market',
    orderDate: '2025-02-05T11:30:00Z',
    expectedDeliveryDate: '2025-02-06T10:00:00Z',
    items: [
      {
        id: 'po-item-002',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        orderedQuantity: 2,
        unit: 'kg',
        pricePerUnit: 25000,
        totalPrice: 50000,
        status: 'ordered'
      }
    ],
    totalAmount: 50000,
    paymentTerms: 'prepaid',
    paymentStatus: 'paid',
    deliveryMethod: 'delivery',
    status: 'confirmed',
    requestIds: ['req-001'],
    billId: 'bill-002', // NEW: Link to bill
    notes: 'Paid in advance as per terms',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'po-003',
    orderNumber: 'PO-BEV-001',
    supplierId: 'sup-003',
    supplierName: 'Beverage Distributor Ltd',
    orderDate: '2025-02-03T09:00:00Z',
    expectedDeliveryDate: '2025-02-05T14:00:00Z',
    actualDeliveryDate: '2025-02-05T13:45:00Z',
    items: [
      {
        id: 'po-item-003',
        itemId: 'prod-beer-bintang-330',
        itemName: 'Bintang Beer 330ml',
        orderedQuantity: 48,
        receivedQuantity: 48,
        unit: 'piece',
        pricePerUnit: 12000,
        totalPrice: 576000,
        status: 'received'
      },
      {
        id: 'po-item-004',
        itemId: 'prod-cola-330',
        itemName: 'Coca-Cola 330ml',
        orderedQuantity: 48,
        receivedQuantity: 45,
        unit: 'piece',
        pricePerUnit: 8000,
        totalPrice: 384000,
        status: 'partially_received'
      }
    ],
    totalAmount: 960000,
    paymentTerms: 'monthly',
    paymentStatus: 'pending',
    deliveryMethod: 'delivery',
    status: 'delivered',
    requestIds: ['req-002'],
    billId: 'bill-003', // NEW: Link to bill
    receiptOperationId: 'receipt-001',
    notes: 'Minor shortage on Cola delivery',
    createdAt: '2025-02-03T09:00:00Z',
    updatedAt: '2025-02-05T14:00:00Z'
  }
]

// Existing Receipt Acceptances (unchanged)
export const mockReceiptAcceptances: ReceiptAcceptance[] = [
  {
    id: 'acc-001',
    acceptanceNumber: 'ACC-PO-003',
    purchaseOrderId: 'po-003',
    supplierId: 'sup-003',
    deliveryDate: '2025-02-05T13:45:00Z',
    acceptedBy: 'Warehouse Manager',
    items: [
      {
        id: 'acc-item-001',
        purchaseOrderItemId: 'po-item-003',
        itemId: 'prod-beer-bintang-330',
        itemName: 'Bintang Beer 330ml',
        orderedQuantity: 48,
        deliveredQuantity: 48,
        acceptedQuantity: 48,
        quality: 'excellent',
        quantityDiscrepancy: 0,
        orderedPrice: 12000,
        notes: 'Perfect condition, all bottles intact'
      },
      {
        id: 'acc-item-002',
        purchaseOrderItemId: 'po-item-004',
        itemId: 'prod-cola-330',
        itemName: 'Coca-Cola 330ml',
        orderedQuantity: 48,
        deliveredQuantity: 45,
        acceptedQuantity: 45,
        quality: 'good',
        quantityDiscrepancy: -3,
        qualityIssues: '3 cans missing from one case',
        orderedPrice: 8000,
        notes: 'Supplier acknowledged shortage, will credit next order'
      }
    ],
    hasDiscrepancies: true,
    totalDiscrepancies: 1,
    totalValueDifference: -24000, // -3 * 8000
    status: 'accepted',
    storageOperationId: 'op-receipt-001',
    correctionOperationIds: [],
    notes: 'Minor shortage accepted, supplier will credit difference',
    createdAt: '2025-02-05T14:00:00Z',
    updatedAt: '2025-02-05T14:00:00Z'
  }
]

// ============================================================================
// NEW: BILLS MOCK DATA
// ============================================================================

export const mockBills: Bill[] = [
  {
    id: 'bill-001',
    billNumber: 'BILL-PO-MEAT-001',
    purchaseOrderId: 'po-001',
    supplierId: 'sup-001',
    supplierName: 'Premium Meat Co',
    totalAmount: 925000,
    taxAmount: 101750, // 11% PPN
    discountAmount: 0,
    finalAmount: 1026750,
    paymentTerms: 'on_delivery',
    issueDate: '2025-02-05T10:30:00Z',
    dueDate: '2025-02-13T10:30:00Z', // 7 days after delivery
    status: 'issued',
    paymentStatus: 'pending',
    issuedBy: 'Finance Manager',
    notes: 'Payment due within 7 days of delivery',
    createdAt: '2025-02-05T10:30:00Z',
    updatedAt: '2025-02-05T10:30:00Z'
  },
  {
    id: 'bill-002',
    billNumber: 'BILL-PO-VEG-001',
    purchaseOrderId: 'po-002',
    supplierId: 'sup-002',
    supplierName: 'Fresh Vegetables Market',
    totalAmount: 50000,
    taxAmount: 5500,
    discountAmount: 2500, // Early payment discount
    finalAmount: 53000,
    paymentTerms: 'prepaid',
    issueDate: '2025-02-05T11:30:00Z',
    dueDate: '2025-02-05T11:30:00Z', // Immediate for prepaid
    status: 'paid',
    paymentStatus: 'paid',
    issuedBy: 'Finance Manager',
    paidAt: '2025-02-05T11:45:00Z',
    accountTransactionId: 'txn-001',
    notes: 'Prepaid order, early payment discount applied',
    createdAt: '2025-02-05T11:30:00Z',
    updatedAt: '2025-02-05T11:45:00Z'
  },
  {
    id: 'bill-003',
    billNumber: 'BILL-PO-BEV-001',
    purchaseOrderId: 'po-003',
    supplierId: 'sup-003',
    supplierName: 'Beverage Distributor Ltd',
    totalAmount: 960000,
    taxAmount: 105600,
    discountAmount: 48000, // Bulk discount
    finalAmount: 1017600,
    paymentTerms: 'monthly',
    issueDate: '2025-02-05T14:30:00Z',
    dueDate: '2025-03-05T14:30:00Z', // 30 days
    status: 'issued',
    paymentStatus: 'pending',
    issuedBy: 'Finance Manager',
    notes: 'Monthly payment terms, bulk discount applied for quantity',
    createdAt: '2025-02-05T14:30:00Z',
    updatedAt: '2025-02-05T14:30:00Z'
  },
  {
    id: 'bill-004',
    billNumber: 'BILL-PO-SPICE-001',
    purchaseOrderId: 'po-004',
    supplierId: 'sup-004',
    supplierName: 'Spice & Herbs Co',
    totalAmount: 180000,
    taxAmount: 19800,
    discountAmount: 0,
    finalAmount: 199800,
    paymentTerms: 'on_delivery',
    issueDate: '2025-01-28T09:00:00Z',
    dueDate: '2025-02-04T09:00:00Z', // Overdue
    status: 'overdue',
    paymentStatus: 'pending',
    issuedBy: 'Finance Manager',
    notes: 'OVERDUE: Payment was due 3 days ago',
    createdAt: '2025-01-28T09:00:00Z',
    updatedAt: '2025-02-05T08:00:00Z'
  }
]

// ============================================================================
// NEW: REQUEST CONSOLIDATION MOCK DATA
// ============================================================================

export const mockConsolidations: RequestConsolidation[] = [
  {
    id: 'cons-001',
    consolidationNumber: 'CONS-001',
    consolidationDate: '2025-02-05T12:00:00Z',
    consolidatedBy: 'Procurement Manager',
    sourceRequestIds: ['req-001', 'req-002', 'req-003'],
    departments: ['kitchen', 'bar'],
    supplierGroups: [
      {
        supplierId: 'sup-001',
        supplierName: 'Premium Meat Co',
        items: [
          {
            itemId: 'prod-beef-steak',
            itemName: 'Beef Steak',
            unit: 'kg',
            kitchenQuantity: 8,
            barQuantity: 0,
            totalQuantity: 8,
            sourceRequests: [
              {
                requestId: 'req-001',
                requestNumber: 'REQ-KITCHEN-001',
                department: 'kitchen',
                quantity: 8,
                reason: 'low_stock'
              }
            ],
            estimatedPrice: 185000,
            totalEstimatedCost: 1480000
          }
        ],
        estimatedTotal: 1480000
      },
      {
        supplierId: 'sup-002',
        supplierName: 'Fresh Vegetables Market',
        items: [
          {
            itemId: 'prod-garlic',
            itemName: 'Garlic',
            unit: 'kg',
            kitchenQuantity: 3,
            barQuantity: 0,
            totalQuantity: 3,
            sourceRequests: [
              {
                requestId: 'req-001',
                requestNumber: 'REQ-KITCHEN-001',
                department: 'kitchen',
                quantity: 3,
                reason: 'out_of_stock'
              }
            ],
            estimatedPrice: 25000,
            totalEstimatedCost: 75000
          },
          {
            itemId: 'prod-potato',
            itemName: 'Potato',
            unit: 'kg',
            kitchenQuantity: 15,
            barQuantity: 0,
            totalQuantity: 15,
            sourceRequests: [
              {
                requestId: 'req-003',
                requestNumber: 'REQ-KITCHEN-002',
                department: 'kitchen',
                quantity: 15,
                reason: 'low_stock'
              }
            ],
            estimatedPrice: 8000,
            totalEstimatedCost: 120000
          },
          {
            itemId: 'prod-onion',
            itemName: 'Onion',
            unit: 'kg',
            kitchenQuantity: 10,
            barQuantity: 0,
            totalQuantity: 10,
            sourceRequests: [
              {
                requestId: 'req-003',
                requestNumber: 'REQ-KITCHEN-002',
                department: 'kitchen',
                quantity: 10,
                reason: 'low_stock'
              }
            ],
            estimatedPrice: 15000,
            totalEstimatedCost: 150000
          }
        ],
        estimatedTotal: 345000
      },
      {
        supplierId: 'sup-003',
        supplierName: 'Beverage Distributor Ltd',
        items: [
          {
            itemId: 'prod-beer-bintang-330',
            itemName: 'Bintang Beer 330ml',
            unit: 'piece',
            kitchenQuantity: 0,
            barQuantity: 72,
            totalQuantity: 72,
            sourceRequests: [
              {
                requestId: 'req-002',
                requestNumber: 'REQ-BAR-001',
                department: 'bar',
                quantity: 72,
                reason: 'low_stock'
              }
            ],
            estimatedPrice: 12000,
            totalEstimatedCost: 864000
          },
          {
            itemId: 'prod-cola-330',
            itemName: 'Coca-Cola 330ml',
            unit: 'piece',
            kitchenQuantity: 0,
            barQuantity: 48,
            totalQuantity: 48,
            sourceRequests: [
              {
                requestId: 'req-002',
                requestNumber: 'REQ-BAR-001',
                department: 'bar',
                quantity: 48,
                reason: 'upcoming_menu'
              }
            ],
            estimatedPrice: 8000,
            totalEstimatedCost: 384000
          }
        ],
        estimatedTotal: 1248000
      }
    ],
    status: 'draft',
    generatedOrderIds: [],
    totalEstimatedValue: 3073000,
    notes: 'Consolidating weekend and weekly restock requests',
    createdAt: '2025-02-05T12:00:00Z',
    updatedAt: '2025-02-05T12:00:00Z'
  },
  {
    id: 'cons-002',
    consolidationNumber: 'CONS-002',
    consolidationDate: '2025-02-04T16:00:00Z',
    consolidatedBy: 'Assistant Manager',
    sourceRequestIds: ['req-005', 'req-006'], // Mock IDs for demonstration
    departments: ['kitchen'],
    supplierGroups: [
      {
        supplierId: 'sup-004',
        supplierName: 'Spice & Herbs Co',
        items: [
          {
            itemId: 'prod-salt',
            itemName: 'Salt',
            unit: 'kg',
            kitchenQuantity: 5,
            barQuantity: 0,
            totalQuantity: 5,
            sourceRequests: [
              {
                requestId: 'req-005',
                requestNumber: 'REQ-KITCHEN-003',
                department: 'kitchen',
                quantity: 5,
                reason: 'low_stock'
              }
            ],
            estimatedPrice: 5000,
            totalEstimatedCost: 25000
          },
          {
            itemId: 'prod-black-pepper',
            itemName: 'Black Pepper',
            unit: 'kg',
            kitchenQuantity: 1,
            barQuantity: 0,
            totalQuantity: 1,
            sourceRequests: [
              {
                requestId: 'req-006',
                requestNumber: 'REQ-KITCHEN-004',
                department: 'kitchen',
                quantity: 1,
                reason: 'out_of_stock'
              }
            ],
            estimatedPrice: 120000,
            totalEstimatedCost: 120000
          }
        ],
        estimatedTotal: 145000
      }
    ],
    status: 'processed',
    generatedOrderIds: ['po-004'],
    totalEstimatedValue: 145000,
    notes: 'Spice restock consolidation - completed',
    createdAt: '2025-02-04T16:00:00Z',
    updatedAt: '2025-02-04T18:30:00Z'
  }
]

// ============================================================================
// ENHANCED HELPER FUNCTIONS
// ============================================================================

export function generateMockSupplier(overrides: Partial<Supplier> = {}): Supplier {
  const supplierTypes: Supplier['type'][] = ['local', 'wholesale', 'online', 'other']
  const reliabilities: Supplier['reliability'][] = ['excellent', 'good', 'average', 'poor']
  const paymentTerms: Supplier['paymentTerms'][] = ['prepaid', 'on_delivery', 'monthly', 'custom']

  const randomType = supplierTypes[Math.floor(Math.random() * supplierTypes.length)]
  const randomReliability = reliabilities[Math.floor(Math.random() * reliabilities.length)]
  const randomPayment = paymentTerms[Math.floor(Math.random() * paymentTerms.length)]

  // FIX: Ensure products is always an array
  const defaultProducts = ['prod-mock-item-1', 'prod-mock-item-2', 'prod-mock-item-3']

  const defaultSupplier: Supplier = {
    id: `sup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Mock Supplier',
    type: randomType,
    contactPerson: 'Contact Person',
    phone: '+62-21-555-0000',
    email: 'contact@supplier.com',
    address: 'Mock Address',
    products: defaultProducts, // FIX: Always provide default products array
    categories: ['other'],
    paymentTerms: randomPayment,
    totalOrders: Math.floor(Math.random() * 50),
    totalOrderValue: Math.floor(Math.random() * 10000000),
    averageOrderValue: Math.floor(Math.random() * 500000),
    lastOrderDate: new Date().toISOString(),
    reliability: randomReliability,
    currentBalance: Math.floor(Math.random() * 2000000) - 1000000, // -1M to +1M
    totalPaid: Math.floor(Math.random() * 10000000),
    totalDebt: Math.floor(Math.random() * 1000000),
    isActive: Math.random() > 0.2, // 80% active
    notes: 'Generated mock supplier',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // FIX: Ensure overrides.products is an array if provided
  const finalSupplier = { ...defaultSupplier, ...overrides }

  // Ensure products is always an array
  if (!finalSupplier.products || !Array.isArray(finalSupplier.products)) {
    finalSupplier.products = defaultProducts
  }

  // Ensure categories is always an array
  if (!finalSupplier.categories || !Array.isArray(finalSupplier.categories)) {
    finalSupplier.categories = ['other']
  }

  return finalSupplier
}

// NEW: Generate mock bill
export function generateMockBill(overrides: Partial<Bill> = {}): Bill {
  const statuses: Bill['status'][] = ['draft', 'issued', 'paid', 'overdue', 'cancelled']
  const paymentStatuses: Bill['paymentStatus'][] = ['pending', 'partial', 'paid']

  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
  const randomPaymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)]

  const totalAmount = Math.floor(Math.random() * 1000000) + 50000 // 50k to 1M
  const taxAmount = Math.floor(totalAmount * 0.11) // 11% tax
  const discountAmount = Math.floor(Math.random() * (totalAmount * 0.1)) // Up to 10% discount

  const issueDate = new Date()
  const dueDate = new Date(issueDate)
  dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 30) + 1) // 1-30 days

  const defaultBill: Bill = {
    id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    billNumber: `BILL-MOCK-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`,
    purchaseOrderId: `po-mock-${Math.floor(Math.random() * 100)}`,
    supplierId: `sup-mock-${Math.floor(Math.random() * 10)}`,
    supplierName: 'Mock Supplier',
    totalAmount,
    taxAmount,
    discountAmount,
    finalAmount: totalAmount + taxAmount - discountAmount,
    paymentTerms: 'on_delivery',
    issueDate: issueDate.toISOString(),
    dueDate: dueDate.toISOString(),
    status: randomStatus,
    paymentStatus: randomPaymentStatus,
    issuedBy: 'Mock Finance Manager',
    notes: 'Generated mock bill',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return { ...defaultBill, ...overrides }
}

// FIX: Enhanced validation for existing suppliers to ensure they have products
export function validateAndFixSuppliers(suppliers: Supplier[]): Supplier[] {
  return suppliers.map(supplier => {
    const fixed = { ...supplier }

    // Ensure products is always an array
    if (!fixed.products || !Array.isArray(fixed.products)) {
      console.warn(`Supplier ${supplier.name} missing products array, adding defaults`)
      fixed.products = [`prod-default-${supplier.id}`]
    }

    // Ensure categories is always an array
    if (!fixed.categories || !Array.isArray(fixed.categories)) {
      console.warn(`Supplier ${supplier.name} missing categories array, adding defaults`)
      fixed.categories = ['other']
    }

    return fixed
  })
}

// Apply validation to mock suppliers
export const mockSuppliersValidated = validateAndFixSuppliers(mockSuppliers)

// NEW: Generate mock consolidation
export function generateMockConsolidation(
  overrides: Partial<RequestConsolidation> = {}
): RequestConsolidation {
  const departments: ('kitchen' | 'bar')[] = ['kitchen', 'bar']
  const statuses: RequestConsolidation['status'][] = ['draft', 'processed', 'cancelled']

  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
  const randomDepartments =
    Math.random() > 0.5 ? ['kitchen'] : Math.random() > 0.5 ? ['bar'] : ['kitchen', 'bar']

  const mockSupplierGroup: SupplierGroup = {
    supplierId: `sup-mock-${Math.floor(Math.random() * 10)}`,
    supplierName: 'Mock Supplier',
    items: [
      {
        itemId: `prod-mock-${Math.floor(Math.random() * 100)}`,
        itemName: 'Mock Product',
        unit: 'kg',
        kitchenQuantity: Math.floor(Math.random() * 20),
        barQuantity: Math.floor(Math.random() * 20),
        totalQuantity: 0, // Will be calculated
        sourceRequests: [
          {
            requestId: `req-mock-${Math.floor(Math.random() * 100)}`,
            requestNumber: `REQ-MOCK-${Math.floor(Math.random() * 100)}`,
            department: randomDepartments[0],
            quantity: Math.floor(Math.random() * 20),
            reason: 'low_stock'
          }
        ],
        estimatedPrice: Math.floor(Math.random() * 50000) + 5000,
        totalEstimatedCost: 0 // Will be calculated
      }
    ],
    estimatedTotal: 0 // Will be calculated
  }

  // Calculate totals
  mockSupplierGroup.items[0].totalQuantity =
    mockSupplierGroup.items[0].kitchenQuantity + mockSupplierGroup.items[0].barQuantity
  mockSupplierGroup.items[0].totalEstimatedCost =
    mockSupplierGroup.items[0].totalQuantity * (mockSupplierGroup.items[0].estimatedPrice || 0)
  mockSupplierGroup.estimatedTotal = mockSupplierGroup.items[0].totalEstimatedCost

  const defaultConsolidation: RequestConsolidation = {
    id: `cons_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    consolidationNumber: `CONS-MOCK-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`,
    consolidationDate: new Date().toISOString(),
    consolidatedBy: 'Mock Procurement Manager',
    sourceRequestIds: [
      `req-mock-${Math.floor(Math.random() * 100)}`,
      `req-mock-${Math.floor(Math.random() * 100)}`
    ],
    departments: randomDepartments,
    supplierGroups: [mockSupplierGroup],
    status: randomStatus,
    generatedOrderIds:
      randomStatus === 'processed' ? [`po-mock-${Math.floor(Math.random() * 100)}`] : [],
    totalEstimatedValue: mockSupplierGroup.estimatedTotal,
    notes: 'Generated mock consolidation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  return { ...defaultConsolidation, ...overrides }
}

// ENHANCED: Get comprehensive statistics
export function getEnhancedSupplierStatistics() {
  const suppliers = mockSuppliers
  const requests = mockProcurementRequests
  const orders = mockPurchaseOrders
  const bills = mockBills
  const consolidations = mockConsolidations

  return {
    // Basic stats
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter(s => s.isActive).length,
    totalOrderValue: suppliers.reduce((sum, s) => sum + (s.totalOrderValue || 0), 0),
    averageReliability:
      suppliers.reduce((sum, s) => {
        const reliabilityScore = { excellent: 4, good: 3, average: 2, poor: 1 }[s.reliability]
        return sum + reliabilityScore
      }, 0) / suppliers.length,

    // Request stats
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'submitted').length,
    approvedRequests: requests.filter(r => r.status === 'approved').length,
    convertedRequests: requests.filter(r => r.status === 'converted').length,

    // Order stats
    totalOrders: orders.length,
    activeOrders: orders.filter(o => ['sent', 'confirmed', 'in_transit'].includes(o.status)).length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    totalOrdersValue: orders.reduce((sum, o) => sum + o.totalAmount, 0),

    // Financial stats
    totalOutstanding: suppliers.reduce((sum, s) => sum + Math.max(0, -s.currentBalance), 0),
    totalPrepaid: suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0),

    // NEW: Bills stats
    totalBills: bills.length,
    paidBills: bills.filter(b => b.status === 'paid').length,
    unpaidBills: bills.filter(b => b.status !== 'paid').length,
    overdueBills: bills.filter(b => b.status === 'overdue').length,
    totalBillValue: bills.reduce((sum, b) => sum + b.finalAmount, 0),
    unpaidBillValue: bills
      .filter(b => b.status !== 'paid')
      .reduce((sum, b) => sum + b.finalAmount, 0),

    // NEW: Consolidation stats
    totalConsolidations: consolidations.length,
    draftConsolidations: consolidations.filter(c => c.status === 'draft').length,
    processedConsolidations: consolidations.filter(c => c.status === 'processed').length,
    totalConsolidationValue: consolidations.reduce((sum, c) => sum + c.totalEstimatedValue, 0),

    // Department breakdown
    departmentBreakdown: {
      kitchen: requests.filter(r => r.department === 'kitchen').length,
      bar: requests.filter(r => r.department === 'bar').length
    },

    // Category breakdown
    categoryBreakdown: suppliers.reduce(
      (acc, supplier) => {
        supplier.categories.forEach(category => {
          acc[category] = (acc[category] || 0) + 1
        })
        return acc
      },
      {} as Record<string, number>
    ),

    // Payment terms breakdown
    paymentTermsBreakdown: suppliers.reduce(
      (acc, supplier) => {
        acc[supplier.paymentTerms] = (acc[supplier.paymentTerms] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),

    // Status distributions
    requestStatusDistribution: requests.reduce(
      (acc, request) => {
        acc[request.status] = (acc[request.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),

    orderStatusDistribution: orders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),

    billStatusDistribution: bills.reduce(
      (acc, bill) => {
        acc[bill.status] = (acc[bill.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),

    // Performance metrics
    averageOrderValue:
      orders.length > 0 ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length : 0,
    averageBillValue:
      bills.length > 0 ? bills.reduce((sum, b) => sum + b.finalAmount, 0) / bills.length : 0,
    consolidationEfficiency:
      consolidations.length > 0
        ? consolidations.filter(c => c.status === 'processed').length / consolidations.length
        : 0
  }
}

// NEW: Get bills by status
export function getBillsByStatus(status: Bill['status']): Bill[] {
  return mockBills.filter(bill => bill.status === status)
}

// NEW: Get overdue bills
export function getOverdueBills(): Bill[] {
  const now = new Date()
  return mockBills.filter(
    bill => bill.status !== 'paid' && bill.status !== 'cancelled' && new Date(bill.dueDate) < now
  )
}

// NEW: Get consolidations by status
export function getConsolidationsByStatus(
  status: RequestConsolidation['status']
): RequestConsolidation[] {
  return mockConsolidations.filter(consolidation => consolidation.status === status)
}

// NEW: Get requests ready for consolidation (approved status)
export function getRequestsReadyForConsolidation(): ProcurementRequest[] {
  return mockProcurementRequests.filter(
    request => request.status === 'approved' && !request.consolidationId // Not already consolidated
  )
}

// NEW: Calculate financial summary
export function getFinancialSummary() {
  return {
    totalOrdersValue: mockPurchaseOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    totalBillsValue: mockBills.reduce((sum, bill) => sum + bill.finalAmount, 0),
    totalPaidValue: mockBills
      .filter(b => b.status === 'paid')
      .reduce((sum, bill) => sum + bill.finalAmount, 0),
    totalOutstandingValue: mockBills
      .filter(b => b.status !== 'paid')
      .reduce((sum, bill) => sum + bill.finalAmount, 0),
    totalOverdueValue: getOverdueBills().reduce((sum, bill) => sum + bill.finalAmount, 0),
    suppliersBalance: {
      totalOwed: mockSuppliers.reduce((sum, s) => sum + Math.max(0, -s.currentBalance), 0),
      totalCredit: mockSuppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0)
    }
  }
}
