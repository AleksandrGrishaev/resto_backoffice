// src/stores/shared/supplierDefinitions.ts - ИСПРАВЛЕННАЯ версия с базовыми единицами

import { TimeUtils } from '@/utils'
import { CORE_PRODUCTS, getProductDefinition } from './productDefinitions'
import type {
  ProcurementRequest,
  PurchaseOrder,
  Receipt,
  OrderSuggestion,
  RequestItem,
  OrderItem,
  ReceiptItem
} from '@/stores/supplier_2/types'

// =============================================
// CORE SUPPLIER WORKFLOW DEFINITIONS
// =============================================

export interface CoreSupplierWorkflow {
  suggestions: OrderSuggestion[]
  requests: ProcurementRequest[]
  orders: PurchaseOrder[]
  receipts: Receipt[]
}

// =============================================
// УТИЛИТА: Конвертация в базовые единицы
// =============================================

/**
 * ✅ Конвертирует количество в базовые единицы для продукта
 */
function convertToBaseUnits(quantity: number, productId: string): number {
  const product = getProductDefinition(productId)
  if (!product) return quantity

  // Все данные теперь сразу создаем в базовых единицах
  // Эта функция для понимания логики
  return quantity
}

/**
 * ✅ Получает цену за базовую единицу
 */
function getBaseCostPerUnit(productId: string): number {
  const product = getProductDefinition(productId)
  return product?.baseCostPerUnit || 1000
}

// =============================================
// ИСПРАВЛЕННЫЕ ПРЕДЛОЖЕНИЯ ДЛЯ ЗАКАЗОВ (все в базовых единицах)
// =============================================

export const CORE_ORDER_SUGGESTIONS: OrderSuggestion[] = [
  // Kitchen - критично мало чеснока
  {
    itemId: 'prod-garlic',
    itemName: 'Garlic',
    currentStock: 300, // ✅ 300 грамм (было 0.3 кг)
    minStock: 900, // ✅ 900 грамм минимум
    suggestedQuantity: 2000, // ✅ 2000 грамм (было 2 кг)
    urgency: 'high',
    reason: 'below_minimum',
    estimatedPrice: 25, // 25 IDR за грамм (базовая единица)
    lastPriceDate: TimeUtils.getDateDaysAgo(2)
  },

  // Kitchen - томаты закончились
  {
    itemId: 'prod-tomato',
    itemName: 'Fresh Tomato',
    currentStock: 0, // ✅ 0 грамм
    minStock: 4500, // ✅ 4500 грамм минимум
    suggestedQuantity: 5000, // ✅ 5000 грамм (было 5 кг)
    urgency: 'high',
    reason: 'out_of_stock',
    estimatedPrice: 12, // 12 IDR за грамм
    lastPriceDate: TimeUtils.getDateDaysAgo(3)
  },

  // Kitchen - говядина скоро закончится
  {
    itemId: 'prod-beef-steak',
    itemName: 'Beef Steak',
    currentStock: 5500, // ✅ 5.5 кг = 5500 грамм
    minStock: 11250, // ✅ 11.25 кг = 11250 грамм
    suggestedQuantity: 11870, // ✅ примерно 12 кг в граммах
    urgency: 'medium',
    reason: 'below_minimum',
    estimatedPrice: 180, // 180 IDR за грамм
    lastPriceDate: TimeUtils.getDateDaysAgo(1)
  },

  // Bar - пиво заканчивается
  {
    itemId: 'prod-beer-bintang-330',
    itemName: 'Bintang Beer 330ml',
    currentStock: 12, // ✅ 12 штук (baseUnit = piece)
    minStock: 150, // ✅ 150 штук минимум
    suggestedQuantity: 48, // ✅ 48 штук
    urgency: 'medium',
    reason: 'below_minimum',
    estimatedPrice: 12000, // 12000 IDR за штуку
    lastPriceDate: TimeUtils.getDateDaysAgo(5)
  },

  // Kitchen - масло скоро закончится
  {
    itemId: 'prod-olive-oil',
    itemName: 'Olive Oil',
    currentStock: 1500, // ✅ 1500 мл (было 1.5 L)
    minStock: 3150, // ✅ 3150 мл минимум
    suggestedQuantity: 4724, // ✅ примерно 5 L в мл
    urgency: 'high',
    reason: 'below_minimum',
    estimatedPrice: 85, // 85 IDR за мл
    lastPriceDate: TimeUtils.getDateDaysAgo(7)
  },

  // Kitchen - соль закончилась
  {
    itemId: 'prod-salt',
    itemName: 'Salt',
    currentStock: 0, // ✅ 0 грамм
    minStock: 750, // ✅ 750 грамм
    suggestedQuantity: 1500, // ✅ 1500 грамм (1.5 кг)
    urgency: 'high',
    reason: 'out_of_stock',
    estimatedPrice: 3, // 3 IDR за грамм
    lastPriceDate: ''
  },

  // Kitchen - перец закончился
  {
    itemId: 'prod-black-pepper',
    itemName: 'Black Pepper',
    currentStock: 0, // ✅ 0 грамм
    minStock: 525, // ✅ 525 грамм
    suggestedQuantity: 1050, // ✅ 1050 грамм
    urgency: 'high',
    reason: 'out_of_stock',
    estimatedPrice: 120, // 120 IDR за грамм
    lastPriceDate: ''
  },

  // Kitchen - орегано закончилось
  {
    itemId: 'prod-oregano',
    itemName: 'Oregano',
    currentStock: 0, // ✅ 0 грамм
    minStock: 210, // ✅ 210 грамм
    suggestedQuantity: 420, // ✅ 420 грамм
    urgency: 'high',
    reason: 'out_of_stock',
    estimatedPrice: 150, // 150 IDR за грамм
    lastPriceDate: ''
  },

  // Kitchen - лук мало
  {
    itemId: 'prod-onion',
    itemName: 'Onion',
    currentStock: 3000, // ✅ 3 кг = 3000 грамм
    minStock: 3000, // ✅ 3000 грамм минимум
    suggestedQuantity: 4497, // ✅ примерно 4.5 кг в граммах
    urgency: 'high',
    reason: 'below_minimum',
    estimatedPrice: 6, // 6 IDR за грамм
    lastPriceDate: TimeUtils.getDateDaysAgo(1)
  },

  // Kitchen - молоко закончилось
  {
    itemId: 'prod-milk',
    itemName: 'Milk 3.2%',
    currentStock: 0, // ✅ 0 мл
    minStock: 3000, // ✅ 3000 мл (3 L)
    suggestedQuantity: 6000, // ✅ 6000 мл (6 L)
    urgency: 'high',
    reason: 'out_of_stock',
    estimatedPrice: 15, // 15 IDR за мл
    lastPriceDate: ''
  }
]

// =============================================
// ИСПРАВЛЕННЫЕ ЗАЯВКИ (все количества в базовых единицах)
// =============================================

export const CORE_PROCUREMENT_REQUESTS: ProcurementRequest[] = [
  // Срочная заявка от кухни
  {
    id: 'req-001',
    requestNumber: 'REQ-KITCHEN-001',
    department: 'kitchen',
    requestedBy: 'Chef Maria',
    items: [
      {
        id: 'req-item-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        requestedQuantity: 5000, // ✅ 5000 грамм (было 5 кг)
        estimatedPrice: 180, // 180 IDR за грамм
        priority: 'urgent',
        category: 'meat',
        notes: 'Urgent - for evening menu'
      },
      {
        id: 'req-item-002',
        itemId: 'prod-potato',
        itemName: 'Potato',
        requestedQuantity: 10000, // ✅ 10000 грамм (было 10 кг)
        estimatedPrice: 8, // 8 IDR за грамм
        category: 'vegetables'
      },
      {
        id: 'req-item-003',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        requestedQuantity: 2000, // ✅ 2000 грамм (было 2 кг)
        estimatedPrice: 25, // 25 IDR за грамм
        category: 'vegetables',
        notes: 'Stock critically low'
      }
    ],
    status: 'converted',
    priority: 'urgent',
    purchaseOrderIds: ['po-001'],
    notes: 'Urgent request - running out of main ingredients',
    createdAt: TimeUtils.getDateDaysAgo(3),
    updatedAt: TimeUtils.getDateDaysAgo(2)
  },

  // Заявка от бара
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
        requestedQuantity: 48, // ✅ 48 штук (baseUnit = piece)
        estimatedPrice: 12000, // 12000 IDR за штуку
        category: 'beverages',
        notes: '2 cases for weekend'
      },
      {
        id: 'req-item-005',
        itemId: 'prod-cola-330',
        itemName: 'Coca-Cola 330ml',
        requestedQuantity: 24, // ✅ 24 штуки
        estimatedPrice: 8000, // 8000 IDR за штуку
        category: 'beverages'
      }
    ],
    status: 'submitted',
    priority: 'normal',
    purchaseOrderIds: [],
    notes: 'Weekly beverage restock',
    createdAt: TimeUtils.getDateDaysAgo(1),
    updatedAt: TimeUtils.getDateDaysAgo(1)
  },

  // Новая заявка от кухни
  {
    id: 'req-003',
    requestNumber: 'REQ-KIT-0830-003',
    department: 'kitchen',
    requestedBy: 'Chef Maria',
    items: [
      {
        id: 'req-item-006',
        itemId: 'prod-oregano',
        itemName: 'Oregano',
        requestedQuantity: 420, // ✅ 420 грамм
        estimatedPrice: 150, // 150 IDR за грамм
        category: 'spices'
      },
      {
        id: 'req-item-007',
        itemId: 'prod-black-pepper',
        itemName: 'Black Pepper',
        requestedQuantity: 1050, // ✅ 1050 грамм
        estimatedPrice: 120, // 120 IDR за грамм
        category: 'spices'
      },
      {
        id: 'req-item-008',
        itemId: 'prod-milk',
        itemName: 'Milk 3.2%',
        requestedQuantity: 6000, // ✅ 6000 мл
        estimatedPrice: 15, // 15 IDR за мл
        category: 'dairy'
      },
      {
        id: 'req-item-009',
        itemId: 'prod-salt',
        itemName: 'Salt',
        requestedQuantity: 1500, // ✅ 1500 грамм
        estimatedPrice: 3, // 3 IDR за грамм
        category: 'spices'
      },
      {
        id: 'req-item-010',
        itemId: 'prod-onion',
        itemName: 'Onion',
        requestedQuantity: 4497, // ✅ 4497 грамм
        estimatedPrice: 6, // 6 IDR за грамм
        category: 'vegetables'
      }
    ],
    status: 'submitted',
    priority: 'normal',
    purchaseOrderIds: [],
    notes:
      'Created from Order Assistant for kitchen department | Total estimated value: Rp 310.482',
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// =============================================
// ИСПРАВЛЕННЫЕ ЗАКАЗЫ (все количества в базовых единицах)
// =============================================

export const CORE_PURCHASE_ORDERS: PurchaseOrder[] = [
  // Заказ мяса
  {
    id: 'po-001',
    orderNumber: 'PO-001',
    supplierId: 'sup-premium-meat-co',
    supplierName: 'Premium Meat Company',
    orderDate: TimeUtils.getDateDaysAgo(2),
    expectedDeliveryDate: TimeUtils.getDateDaysFromNow(1),
    items: [
      {
        id: 'po-item-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 5000, // ✅ 5000 грамм (было 5 кг)
        pricePerUnit: 180, // ✅ 180 IDR за ГРАММ (не за кг!)
        totalPrice: 900000, // 5000 * 180 = 900,000 IDR
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(30),
        status: 'ordered'
      }
    ],
    totalAmount: 900000,
    isEstimatedTotal: true,
    status: 'sent',
    billStatus: 'partially_paid',
    requestIds: ['req-001'],
    notes: 'Urgent meat order for evening menu',
    createdAt: TimeUtils.getDateDaysAgo(2),
    updatedAt: TimeUtils.getDateDaysAgo(2)
  },

  // Заказ овощей
  {
    id: 'po-002',
    orderNumber: 'PO-002',
    supplierId: 'sup-fresh-veg-market',
    supplierName: 'Fresh Vegetable Market',
    orderDate: TimeUtils.getDateDaysAgo(3),
    expectedDeliveryDate: TimeUtils.getDateDaysFromNow(1),
    items: [
      {
        id: 'po-item-002',
        itemId: 'prod-potato',
        itemName: 'Potato',
        orderedQuantity: 10000, // ✅ 10000 грамм (было 10 кг)
        pricePerUnit: 8, // ✅ 8 IDR за ГРАММ
        totalPrice: 80000, // 10000 * 8 = 80,000 IDR
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(15),
        status: 'ordered'
      },
      {
        id: 'po-item-003',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        orderedQuantity: 2000, // ✅ 2000 грамм (было 2 кг)
        pricePerUnit: 25, // ✅ 25 IDR за ГРАММ
        totalPrice: 50000, // 2000 * 25 = 50,000 IDR
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(10),
        status: 'ordered'
      }
    ],
    totalAmount: 130000,
    isEstimatedTotal: true,
    status: 'confirmed',
    billStatus: 'fully_paid',
    requestIds: ['req-001'],
    notes: 'Vegetables for weekly menu prep',
    createdAt: TimeUtils.getDateDaysAgo(3),
    updatedAt: TimeUtils.getDateDaysAgo(1)
  },

  // Заказ специй от заявки REQ-KIT-0830-003
  {
    id: 'po-0830-005',
    orderNumber: 'PO-0830-005',
    supplierId: 'sup-fresh-veg-market',
    supplierName: 'Fresh Vegetable Market',
    orderDate: TimeUtils.getCurrentLocalISO(),
    expectedDeliveryDate: TimeUtils.getDateDaysFromNow(2),
    items: [
      {
        id: 'po-item-011',
        itemId: 'prod-onion',
        itemName: 'Onion',
        orderedQuantity: 4497, // ✅ 4497 грамм
        pricePerUnit: 6, // ✅ 6 IDR за грамм
        totalPrice: 26982, // 4497 * 6 = 26,982 IDR
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(1),
        status: 'ordered'
      },
      {
        id: 'po-item-012',
        itemId: 'prod-salt',
        itemName: 'Salt',
        orderedQuantity: 1500, // ✅ 1500 грамм
        pricePerUnit: 3, // ✅ 3 IDR за грамм
        totalPrice: 4500, // 1500 * 3 = 4,500 IDR
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(1),
        status: 'ordered'
      },
      {
        id: 'po-item-013',
        itemId: 'prod-black-pepper',
        itemName: 'Black Pepper',
        orderedQuantity: 1050, // ✅ 1050 грамм
        pricePerUnit: 120, // ✅ 120 IDR за грамм
        totalPrice: 126000, // 1050 * 120 = 126,000 IDR
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(1),
        status: 'ordered'
      },
      {
        id: 'po-item-014',
        itemId: 'prod-oregano',
        itemName: 'Oregano',
        orderedQuantity: 420, // ✅ 420 грамм
        pricePerUnit: 150, // ✅ 150 IDR за грамм
        totalPrice: 63000, // 420 * 150 = 63,000 IDR
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(1),
        status: 'ordered'
      }
    ],
    totalAmount: 220482, // Сумма всех товаров
    isEstimatedTotal: true,
    status: 'sent',
    billStatus: 'overpaid',
    requestIds: ['req-003'],
    notes: 'Order from REQ-KIT-0830-003',
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Заказ молока
  {
    id: 'po-0830-004',
    orderNumber: 'PO-0830-004',
    supplierId: 'sup-dairy-fresh',
    supplierName: 'Jakarta Beverage Distribution',
    orderDate: TimeUtils.getCurrentLocalISO(),
    expectedDeliveryDate: TimeUtils.getDateDaysFromNow(2),
    items: [
      {
        id: 'po-item-015',
        itemId: 'prod-milk',
        itemName: 'Milk 3.2%',
        orderedQuantity: 6000, // ✅ 6000 мл
        pricePerUnit: 15, // ✅ 15 IDR за мл
        totalPrice: 90000, // 6000 * 15 = 90,000 IDR
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(1),
        status: 'ordered'
      }
    ],
    totalAmount: 90000,
    isEstimatedTotal: true,
    status: 'draft',
    billStatus: 'not_billed',
    requestIds: ['req-003'],
    notes: 'Milk order from kitchen request',
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  },

  // Заказ напитков
  {
    id: 'po-003',
    orderNumber: 'PO-003',
    supplierId: 'sup-beverage-distribution',
    supplierName: 'Jakarta Beverage Distribution',
    orderDate: TimeUtils.getCurrentLocalISO(),
    expectedDeliveryDate: TimeUtils.getDateDaysFromNow(3),
    items: [
      {
        id: 'po-item-004',
        itemId: 'prod-beer-bintang-330',
        itemName: 'Bintang Beer 330ml',
        orderedQuantity: 48, // ✅ 48 штук (piece)
        pricePerUnit: 12000, // ✅ 12000 IDR за штуку
        totalPrice: 576000, // 48 * 12000 = 576,000 IDR
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(5),
        status: 'ordered'
      }
    ],
    totalAmount: 576000,
    isEstimatedTotal: true,
    status: 'draft',
    billStatus: 'not_billed',
    requestIds: ['req-002'],
    notes: 'Beverage restock for bar',
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// =============================================
// ИСПРАВЛЕННЫЕ ПОСТУПЛЕНИЯ (все количества в базовых единицах)
// =============================================

export const CORE_RECEIPTS: Receipt[] = [
  // Поступление овощей
  {
    id: 'receipt-001',
    receiptNumber: 'RCP-001',
    purchaseOrderId: 'po-002',
    deliveryDate: TimeUtils.getDateDaysAgo(1),
    receivedBy: 'Warehouse Manager',
    items: [
      {
        id: 'receipt-item-001',
        orderItemId: 'po-item-002',
        itemId: 'prod-potato',
        itemName: 'Potato',
        orderedQuantity: 10000, // ✅ 10000 грамм
        receivedQuantity: 10000, // ✅ 10000 грамм (получили точно)
        orderedPrice: 8, // 8 IDR за грамм
        actualPrice: 8, // цена не изменилась
        notes: 'Good quality'
      },
      {
        id: 'receipt-item-002',
        orderItemId: 'po-item-003',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        orderedQuantity: 2000, // ✅ 2000 грамм
        receivedQuantity: 2000, // ✅ 2000 грамм
        orderedPrice: 25, // 25 IDR за грамм
        actualPrice: 27, // ✅ цена выросла до 27 IDR за грамм
        notes: 'Price increased by 2 IDR per gram'
      }
    ],
    hasDiscrepancies: true,
    status: 'completed',
    storageOperationId: 'op-storage-006',
    notes: 'Receipt completed, minor price increase on garlic',
    createdAt: TimeUtils.getDateDaysAgo(1),
    updatedAt: TimeUtils.getDateDaysAgo(1)
  },

  // Поступление мяса (в процессе)
  {
    id: 'receipt-002',
    receiptNumber: 'RCP-002',
    purchaseOrderId: 'po-001',
    deliveryDate: TimeUtils.getCurrentLocalISO(),
    receivedBy: 'Chef Maria',
    items: [
      {
        id: 'receipt-item-003',
        orderItemId: 'po-item-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 5000, // ✅ 5000 грамм
        receivedQuantity: 4800, // ✅ 4800 грамм (небольшая недостача)
        orderedPrice: 180, // 180 IDR за грамм
        notes: 'Small weight shortage: 200g short'
      }
    ],
    hasDiscrepancies: true,
    status: 'draft',
    notes: 'Receipt in progress, checking meat quality',
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// =============================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С ОПРЕДЕЛЕНИЯМИ
// =============================================

export function getSupplierWorkflowData(): CoreSupplierWorkflow {
  return {
    suggestions: [],
    requests: CORE_PROCUREMENT_REQUESTS,
    orders: CORE_PURCHASE_ORDERS,
    receipts: CORE_RECEIPTS
  }
}

export function getSuggestionById(id: string): OrderSuggestion | undefined {
  return CORE_ORDER_SUGGESTIONS.find(s => s.itemId === id)
}

export function getRequestById(id: string): ProcurementRequest | undefined {
  return CORE_PROCUREMENT_REQUESTS.find(r => r.id === id)
}

export function getOrderById(id: string): PurchaseOrder | undefined {
  return CORE_PURCHASE_ORDERS.find(o => o.id === id)
}

export function getReceiptById(id: string): Receipt | undefined {
  return CORE_RECEIPTS.find(r => r.id === id)
}

// Фильтры по статусам
export function getRequestsByStatus(status: ProcurementRequest['status']): ProcurementRequest[] {
  return CORE_PROCUREMENT_REQUESTS.filter(r => r.status === status)
}

export function getOrdersByStatus(status: PurchaseOrder['status']): PurchaseOrder[] {
  return CORE_PURCHASE_ORDERS.filter(o => o.status === status)
}

export function getReceiptsByStatus(status: Receipt['status']): Receipt[] {
  return CORE_RECEIPTS.filter(r => r.status === status)
}

// Статистика
export function getSupplierStatistics() {
  return {
    totalRequests: CORE_PROCUREMENT_REQUESTS.length,
    pendingRequests: getRequestsByStatus('submitted').length,
    totalOrders: CORE_PURCHASE_ORDERS.length,
    ordersAwaitingPayment: CORE_PURCHASE_ORDERS.filter(o => o.paymentStatus === 'pending').length,
    ordersAwaitingDelivery: CORE_PURCHASE_ORDERS.filter(o =>
      ['sent', 'confirmed'].includes(o.status)
    ).length,
    totalReceipts: CORE_RECEIPTS.length,
    pendingReceipts: getReceiptsByStatus('draft').length,
    urgentSuggestions: CORE_ORDER_SUGGESTIONS.filter(s => s.urgency === 'high').length
  }
}

// Связь с продуктами
export function getSuggestionsForDepartment(department: 'kitchen' | 'bar'): OrderSuggestion[] {
  return CORE_ORDER_SUGGESTIONS.filter(suggestion => {
    const product = CORE_PRODUCTS.find(p => p.id === suggestion.itemId)
    if (!product) return false

    if (department === 'kitchen') {
      return product.category !== 'beverages'
    } else {
      return product.category === 'beverages'
    }
  })
}

// Валидация определений
export function validateSupplierDefinitions(): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Проверяем связи между сущностями
  CORE_PROCUREMENT_REQUESTS.forEach(request => {
    request.purchaseOrderIds.forEach(orderId => {
      if (!getOrderById(orderId)) {
        errors.push(`Request ${request.requestNumber} references non-existent order ${orderId}`)
      }
    })
  })

  CORE_PURCHASE_ORDERS.forEach(order => {
    order.requestIds.forEach(requestId => {
      if (!getRequestById(requestId)) {
        errors.push(`Order ${order.orderNumber} references non-existent request ${requestId}`)
      }
    })
  })

  CORE_RECEIPTS.forEach(receipt => {
    if (!getOrderById(receipt.purchaseOrderId)) {
      errors.push(
        `Receipt ${receipt.receiptNumber} references non-existent order ${receipt.purchaseOrderId}`
      )
    }
  })

  // Проверяем ссылки на продукты
  const allItemIds = new Set([
    ...CORE_ORDER_SUGGESTIONS.map(s => s.itemId),
    ...CORE_PROCUREMENT_REQUESTS.flatMap(r => r.items.map(i => i.itemId)),
    ...CORE_PURCHASE_ORDERS.flatMap(o => o.items.map(i => i.itemId)),
    ...CORE_RECEIPTS.flatMap(r => r.items.map(i => i.itemId))
  ])

  allItemIds.forEach(itemId => {
    if (!CORE_PRODUCTS.find(p => p.id === itemId)) {
      errors.push(`Item ${itemId} not found in CORE_PRODUCTS`)
    }
  })

  // Проверяем правильность расчетов в базовых единицах
  CORE_PURCHASE_ORDERS.forEach(order => {
    order.items.forEach(item => {
      const product = getProductDefinition(item.itemId)
      if (!product) {
        warnings.push(`Product ${item.itemId} not found in definitions`)
        return
      }

      // Проверяем что цена указана за базовую единицу
      const expectedPricePerBaseUnit = product.baseCostPerUnit
      if (Math.abs(item.pricePerUnit - expectedPricePerBaseUnit) > expectedPricePerBaseUnit * 0.5) {
        warnings.push(
          `Order ${order.orderNumber} item ${item.itemName}: price ${item.pricePerUnit} seems incorrect for base unit ${product.baseUnit} (expected ~${expectedPricePerBaseUnit})`
        )
      }

      // Проверяем правильность расчета общей стоимости
      const expectedTotal = item.orderedQuantity * item.pricePerUnit
      if (Math.abs(item.totalPrice - expectedTotal) > 0.01) {
        errors.push(
          `Order ${order.orderNumber} item ${item.itemName}: total price calculation error. Expected ${expectedTotal}, got ${item.totalPrice}`
        )
      }
    })
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Утилита для демонстрации правильных расчетов
export function demonstrateCorrectCalculations(): void {
  console.log('\n' + '='.repeat(60))
  console.log('ДЕМОНСТРАЦИЯ ПРАВИЛЬНЫХ РАСЧЕТОВ В БАЗОВЫХ ЕДИНИЦАХ')
  console.log('='.repeat(60))

  // Пример заявки REQ-KIT-0830-003
  const request = getRequestById('req-003')
  if (request) {
    console.log(`\nЗАЯВКА: ${request.requestNumber}`)
    console.log('Все количества хранятся в базовых единицах:\n')

    let totalCost = 0
    request.items.forEach(item => {
      const product = getProductDefinition(item.itemId)
      if (!product) return

      const itemTotal = item.requestedQuantity * (item.estimatedPrice || 0)
      totalCost += itemTotal

      console.log(`${item.itemName}:`)
      console.log(`  Количество: ${item.requestedQuantity} ${product.baseUnit}`)
      console.log(`  Цена: ${item.estimatedPrice} IDR/${product.baseUnit}`)
      console.log(`  Стоимость: ${itemTotal.toLocaleString('id-ID')} IDR`)
      console.log()
    })

    console.log(`ИТОГО: ${totalCost.toLocaleString('id-ID')} IDR`)
  }

  // Пример заказа
  const order = getOrderById('po-0830-005')
  if (order) {
    console.log(`\nЗАКАЗ: ${order.orderNumber}`)
    console.log('Все количества и цены в базовых единицах:\n')

    order.items.forEach(item => {
      const product = getProductDefinition(item.itemId)
      if (!product) return

      console.log(`${item.itemName}:`)
      console.log(`  Заказано: ${item.orderedQuantity} ${product.baseUnit}`)
      console.log(`  Цена: ${item.pricePerUnit} IDR/${product.baseUnit}`)
      console.log(`  Сумма: ${item.totalPrice.toLocaleString('id-ID')} IDR`)
      console.log()
    })

    console.log(`ИТОГО ЗАКАЗ: ${order.totalAmount.toLocaleString('id-ID')} IDR`)
  }

  console.log('\n' + '='.repeat(60))
}

// Автоматическая валидация при импорте в dev режиме
if (import.meta.env.DEV) {
  const validation = validateSupplierDefinitions()
  if (!validation.isValid) {
    console.error('Supplier definitions validation failed:', validation.errors)
    if (validation.warnings.length > 0) {
      console.warn('Warnings:', validation.warnings)
    }
  } else {
    console.log('All supplier definitions are valid')
    if (validation.warnings.length > 0) {
      console.warn('Warnings:', validation.warnings)
    }

    // Демонстрируем правильные расчеты
    setTimeout(() => {
      demonstrateCorrectCalculations()
    }, 100)
  }
}
