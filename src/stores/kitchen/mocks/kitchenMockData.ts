// src/stores/kitchen/mocks/kitchenMockData.ts
import type { PosOrder, PosBill, PosBillItem } from '@/stores/pos/types'
import { generateId } from '@/utils'

/**
 * Mock Kitchen Orders for Development
 * Эти данные используются для тестирования Kitchen UI
 */

const now = new Date()
const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
const twentyMinutesAgo = new Date(now.getTime() - 20 * 60 * 1000).toISOString()

// Helper function to create bill items
function createBillItem(
  billId: string,
  menuItemName: string,
  quantity: number,
  unitPrice: number,
  status: 'waiting' | 'cooking' | 'ready' = 'waiting',
  kitchenNotes?: string
): PosBillItem {
  return {
    id: generateId(),
    billId,
    menuItemId: generateId(),
    menuItemName,
    variantId: undefined,
    variantName: undefined,
    quantity,
    unitPrice,
    totalPrice: unitPrice * quantity,
    discounts: [],
    modifications: [],
    status,
    paymentStatus: 'unpaid',
    kitchenNotes,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }
}

// Helper function to create a bill
function createBill(orderId: string, billNumber: string, items: PosBillItem[]): PosBill {
  const billId = generateId()
  const billItems = items.map(item => ({ ...item, billId }))
  const subtotal = billItems.reduce((sum, item) => sum + item.totalPrice, 0)

  return {
    id: billId,
    billNumber,
    orderId,
    name: `Bill ${billNumber}`,
    status: 'active',
    items: billItems,
    subtotal,
    discountAmount: 0,
    taxAmount: subtotal * 0.1, // 10% tax
    total: subtotal * 1.1,
    paymentStatus: 'unpaid',
    paidAmount: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  }
}

// Helper function to create an order
function createOrder(
  orderNumber: string,
  type: 'dine_in' | 'takeaway' | 'delivery',
  status: 'waiting' | 'cooking' | 'ready',
  bills: PosBill[],
  createdAt: string,
  tableId?: string
): PosOrder {
  const totalAmount = bills.reduce((sum, bill) => sum + bill.subtotal, 0)
  const taxAmount = bills.reduce((sum, bill) => sum + bill.taxAmount, 0)
  const discountAmount = 0

  return {
    id: generateId(),
    orderNumber,
    type,
    status,
    paymentStatus: 'unpaid',
    tableId,
    bills,
    totalAmount,
    discountAmount,
    taxAmount,
    finalAmount: totalAmount + taxAmount - discountAmount,
    paymentIds: [],
    paidAmount: 0,
    createdAt,
    updatedAt: createdAt
  }
}

// ===== MOCK ORDERS =====

// Waiting Orders (3 orders)
const waitingOrder1 = createOrder(
  'ORD-001',
  'dine_in',
  'waiting',
  [
    createBill('order_1', '1', [
      createBillItem('bill_1', 'Nasi Goreng', 2, 35000, 'waiting'),
      createBillItem('bill_1', 'Mie Goreng', 1, 30000, 'waiting', 'Extra spicy please'),
      createBillItem('bill_1', 'Es Teh Manis', 2, 8000, 'waiting')
    ])
  ],
  fiveMinutesAgo,
  'table_1'
)

const waitingOrder2 = createOrder(
  'ORD-002',
  'takeaway',
  'waiting',
  [
    createBill('order_2', '1', [
      createBillItem('bill_2', 'Ayam Bakar', 3, 45000, 'waiting'),
      createBillItem('bill_2', 'Sambal Extra', 3, 5000, 'waiting')
    ])
  ],
  tenMinutesAgo
)

const waitingOrder3 = createOrder(
  'ORD-003',
  'dine_in',
  'waiting',
  [
    createBill('order_3', '1', [
      createBillItem('bill_3', 'Soto Ayam', 1, 25000, 'waiting'),
      createBillItem('bill_3', 'Gado-Gado', 1, 28000, 'waiting', 'No peanuts'),
      createBillItem('bill_3', 'Es Jeruk', 2, 10000, 'waiting')
    ])
  ],
  fifteenMinutesAgo,
  'table_5'
)

// Cooking Orders (2 orders)
const cookingOrder1 = createOrder(
  'ORD-004',
  'dine_in',
  'cooking',
  [
    createBill('order_4', '1', [
      createBillItem('bill_4', 'Rendang', 2, 55000, 'cooking'),
      createBillItem('bill_4', 'Nasi Putih', 2, 8000, 'cooking'),
      createBillItem('bill_4', 'Sayur Asem', 1, 15000, 'cooking')
    ])
  ],
  twentyMinutesAgo,
  'table_3'
)

const cookingOrder2 = createOrder(
  'ORD-005',
  'delivery',
  'cooking',
  [
    createBill('order_5', '1', [
      createBillItem('bill_5', 'Nasi Uduk', 4, 30000, 'cooking'),
      createBillItem('bill_5', 'Ayam Goreng', 4, 40000, 'cooking'),
      createBillItem('bill_5', 'Kerupuk', 4, 5000, 'cooking')
    ])
  ],
  new Date(now.getTime() - 25 * 60 * 1000).toISOString()
)

// Ready Orders (2 orders)
const readyOrder1 = createOrder(
  'ORD-006',
  'dine_in',
  'ready',
  [
    createBill('order_6', '1', [
      createBillItem('bill_6', 'Beef Steak', 1, 85000, 'ready'),
      createBillItem('bill_6', 'French Fries', 1, 25000, 'ready'),
      createBillItem('bill_6', 'Orange Juice', 1, 15000, 'ready')
    ])
  ],
  new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
  'table_7'
)

const readyOrder2 = createOrder(
  'ORD-007',
  'takeaway',
  'ready',
  [
    createBill('order_7', '1', [
      createBillItem('bill_7', 'Nasi Goreng Seafood', 2, 45000, 'ready'),
      createBillItem('bill_7', 'Es Campur', 2, 18000, 'ready')
    ])
  ],
  new Date(now.getTime() - 35 * 60 * 1000).toISOString()
)

// Export all mock orders
export const MOCK_KITCHEN_ORDERS: PosOrder[] = [
  waitingOrder1,
  waitingOrder2,
  waitingOrder3,
  cookingOrder1,
  cookingOrder2,
  readyOrder1,
  readyOrder2
]

/**
 * Get mock orders by status
 */
export function getMockOrdersByStatus(status: 'waiting' | 'cooking' | 'ready'): PosOrder[] {
  return MOCK_KITCHEN_ORDERS.filter(order => order.status === status)
}

/**
 * Get mock orders count by status
 */
export function getMockOrdersStats() {
  return {
    total: MOCK_KITCHEN_ORDERS.length,
    waiting: getMockOrdersByStatus('waiting').length,
    cooking: getMockOrdersByStatus('cooking').length,
    ready: getMockOrdersByStatus('ready').length
  }
}
