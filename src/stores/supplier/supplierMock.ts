// src/stores/supplier/supplierMock.ts
import type { Supplier, ProcurementRequest, PurchaseOrder, ReceiptAcceptance } from './types'

const now = new Date().toISOString()

export const mockSuppliers: Supplier[] = [
  {
    id: 'sup-001',
    name: 'Premium Meat Co',
    type: 'wholesale',
    contactPerson: 'John Doe',
    phone: '+62-21-555-0001',
    email: 'orders@premiummeat.co.id',
    address: 'Jl. Meat Market No. 123, Jakarta',
    products: ['prod-beef-steak'], // from existing product mock
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
    notes: 'Best quality beef supplier',
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
    products: ['prod-potato', 'prod-tomato', 'prod-onion', 'prod-garlic'],
    categories: ['vegetables'],
    paymentTerms: 'prepaid',
    totalOrders: 18,
    totalOrderValue: 8000000,
    averageOrderValue: 444000,
    lastOrderDate: '2025-02-02T00:00:00Z',
    reliability: 'good',
    currentBalance: 500000, // they owe us 500k (prepaid but not delivered)
    totalPaid: 8500000,
    totalDebt: 0,
    isActive: true,
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
    products: ['prod-beer-bintang-330', 'prod-beer-bintang-500', 'prod-cola-330', 'prod-water-500'],
    categories: ['beverages'],
    paymentTerms: 'monthly',
    totalOrders: 12,
    totalOrderValue: 24000000,
    averageOrderValue: 2000000,
    lastOrderDate: '2025-01-28T00:00:00Z',
    reliability: 'excellent',
    currentBalance: -3200000, // we owe them 3.2M
    totalPaid: 20800000,
    totalDebt: 3200000,
    isActive: true,
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
    products: ['prod-salt', 'prod-black-pepper', 'prod-oregano', 'prod-basil'],
    categories: ['spices'],
    paymentTerms: 'on_delivery',
    totalOrders: 8,
    totalOrderValue: 2400000,
    averageOrderValue: 300000,
    lastOrderDate: '2025-01-30T00:00:00Z',
    reliability: 'good',
    currentBalance: -180000, // we owe them 180k
    totalPaid: 2220000,
    totalDebt: 180000,
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
    products: ['prod-butter', 'prod-milk'],
    categories: ['dairy'],
    paymentTerms: 'prepaid',
    totalOrders: 15,
    totalOrderValue: 6750000,
    averageOrderValue: 450000,
    lastOrderDate: '2025-02-03T00:00:00Z',
    reliability: 'excellent',
    currentBalance: 0, // balanced
    totalPaid: 6750000,
    totalDebt: 0,
    isActive: true,
    notes: 'Very reliable dairy supplier',
    createdAt: now,
    updatedAt: now
  }
]

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
        requestedQuantity: 5,
        unit: 'kg',
        reason: 'low_stock',
        notes: 'Weekend demand expected'
      },
      {
        id: 'req-item-002',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        currentStock: 0.3,
        requestedQuantity: 2,
        unit: 'kg',
        reason: 'out_of_stock'
      }
    ],
    status: 'submitted',
    priority: 'urgent',
    purchaseOrderIds: [],
    notes: 'Need for weekend menu',
    createdAt: now,
    updatedAt: now
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
        requestedQuantity: 48,
        unit: 'piece',
        reason: 'low_stock',
        notes: 'Popular item, running low'
      },
      {
        id: 'req-item-004',
        itemId: 'prod-cola-330',
        itemName: 'Coca-Cola 330ml',
        currentStock: 36,
        requestedQuantity: 24,
        unit: 'piece',
        reason: 'upcoming_menu'
      }
    ],
    status: 'draft',
    priority: 'normal',
    purchaseOrderIds: [],
    notes: 'Weekly beverage stock up',
    createdAt: now,
    updatedAt: now
  }
]

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
    receiptOperationId: 'receipt-001',
    notes: 'Minor shortage on Cola delivery',
    createdAt: '2025-02-03T09:00:00Z',
    updatedAt: '2025-02-05T14:00:00Z'
  }
]

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
    totalDiscrepancies: 1, // 1 item with discrepancy
    totalValueDifference: -24000, // -3 * 8000
    status: 'accepted',
    storageOperationId: 'op-receipt-001',
    correctionOperationIds: [],
    notes: 'Minor shortage accepted, supplier will credit difference',
    createdAt: '2025-02-05T14:00:00Z',
    updatedAt: '2025-02-05T14:00:00Z'
  }
]

// Helper functions for mock data
export function generateMockSupplier(overrides: Partial<Supplier> = {}): Supplier {
  const supplierTypes: Supplier['type'][] = ['local', 'wholesale', 'online', 'other']
  const reliabilities: Supplier['reliability'][] = ['excellent', 'good', 'average', 'poor']
  const paymentTerms: Supplier['paymentTerms'][] = ['prepaid', 'on_delivery', 'monthly', 'custom']

  const randomType = supplierTypes[Math.floor(Math.random() * supplierTypes.length)]
  const randomReliability = reliabilities[Math.floor(Math.random() * reliabilities.length)]
  const randomPayment = paymentTerms[Math.floor(Math.random() * paymentTerms.length)]

  const defaultSupplier: Supplier = {
    id: `sup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Mock Supplier',
    type: randomType,
    contactPerson: 'Contact Person',
    phone: '+62-21-555-0000',
    email: 'contact@supplier.com',
    address: 'Mock Address',
    products: [],
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

  return { ...defaultSupplier, ...overrides }
}

export function getSupplierStatistics() {
  const suppliers = mockSuppliers
  const requests = mockProcurementRequests
  const orders = mockPurchaseOrders

  return {
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter(s => s.isActive).length,
    totalOrderValue: suppliers.reduce((sum, s) => sum + (s.totalOrderValue || 0), 0),
    averageReliability:
      suppliers.reduce((sum, s) => {
        const reliabilityScore = { excellent: 4, good: 3, average: 2, poor: 1 }[s.reliability]
        return sum + reliabilityScore
      }, 0) / suppliers.length,

    pendingRequests: requests.filter(r => r.status === 'submitted').length,
    activeOrders: orders.filter(o => ['sent', 'confirmed', 'in_transit'].includes(o.status)).length,

    totalOutstanding: suppliers.reduce((sum, s) => sum + Math.max(0, -s.currentBalance), 0),
    totalPrepaid: suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0),

    departmentBreakdown: {
      kitchen: requests.filter(r => r.department === 'kitchen').length,
      bar: requests.filter(r => r.department === 'bar').length
    },

    categoryBreakdown: suppliers.reduce(
      (acc, supplier) => {
        supplier.categories.forEach(category => {
          acc[category] = (acc[category] || 0) + 1
        })
        return acc
      },
      {} as Record<string, number>
    )
  }
}
