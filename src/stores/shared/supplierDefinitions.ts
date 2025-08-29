// src/stores/shared/supplierDefinitions.ts

import { TimeUtils } from '@/utils'
import { CORE_PRODUCTS } from './productDefinitions'
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
// БАЗОВЫЕ ПРЕДЛОЖЕНИЯ ДЛЯ ЗАКАЗОВ
// =============================================

export const CORE_ORDER_SUGGESTIONS: OrderSuggestion[] = [
  // Kitchen - критично мало
  {
    itemId: 'prod-garlic',
    itemName: 'Garlic',
    currentStock: 0.3, // Осталось 300г из 2кг
    minStock: 0.5,
    suggestedQuantity: 2,
    urgency: 'high',
    reason: 'below_minimum',
    estimatedPrice: 25, // IDR за грамм
    lastPriceDate: TimeUtils.getDateDaysAgo(2)
  },

  // Kitchen - закончилось
  {
    itemId: 'prod-tomato',
    itemName: 'Fresh Tomato',
    currentStock: 0,
    minStock: 2,
    suggestedQuantity: 5,
    urgency: 'high',
    reason: 'out_of_stock',
    estimatedPrice: 12,
    lastPriceDate: TimeUtils.getDateDaysAgo(3)
  },

  // Kitchen - скоро закончится
  {
    itemId: 'prod-beef-steak',
    itemName: 'Beef Steak',
    currentStock: 1.5, // Осталось 1.5кг
    minStock: 3,
    suggestedQuantity: 5,
    urgency: 'medium',
    reason: 'below_minimum',
    estimatedPrice: 180,
    lastPriceDate: TimeUtils.getDateDaysAgo(1)
  },

  // Bar - заканчивается пиво
  {
    itemId: 'prod-beer-bintang-330',
    itemName: 'Bintang Beer 330ml',
    currentStock: 12, // Осталось 12 штук из 48
    minStock: 24,
    suggestedQuantity: 48,
    urgency: 'medium',
    reason: 'below_minimum',
    estimatedPrice: 12000, // IDR за штуку
    lastPriceDate: TimeUtils.getDateDaysAgo(5)
  },

  // Kitchen - масло скоро закончится
  {
    itemId: 'prod-olive-oil',
    itemName: 'Olive Oil',
    currentStock: 0.8, // 800мл из 2л
    minStock: 1.0,
    suggestedQuantity: 2,
    urgency: 'low',
    reason: 'below_minimum',
    estimatedPrice: 85,
    lastPriceDate: TimeUtils.getDateDaysAgo(7)
  }
]

// =============================================
// ГЕНЕРАЦИЯ ЗАПРОСОВ из предложений
// =============================================

export const CORE_PROCUREMENT_REQUESTS: ProcurementRequest[] = [
  // Срочный запрос от кухни
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
        requestedQuantity: 5,
        unit: 'kg',
        estimatedPrice: 180000, // ✅ ДОБАВИТЬ
        priority: 'urgent',
        category: 'meat',
        notes: 'Urgent - for evening menu'
      },
      {
        id: 'req-item-002',
        itemId: 'prod-potato',
        itemName: 'Potato',
        requestedQuantity: 10,
        unit: 'kg',
        estimatedPrice: 8000 // ✅ ДОБАВИТЬ
      },
      {
        id: 'req-item-003',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        requestedQuantity: 2,
        unit: 'kg',
        estimatedPrice: 18000, // ✅ ДОБАВИТЬ
        notes: 'Stock critically low'
      }
    ],
    status: 'converted', // Уже преобразован в заказы
    priority: 'urgent',
    purchaseOrderIds: ['po-001'],
    notes: 'Urgent request - running out of main ingredients',
    createdAt: TimeUtils.getDateDaysAgo(3),
    updatedAt: TimeUtils.getDateDaysAgo(2)
  },

  // Обычный запрос от бара
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
        notes: '2 cases for weekend'
      },
      {
        id: 'req-item-005',
        itemId: 'prod-cola-330',
        itemName: 'Coca-Cola 330ml',
        requestedQuantity: 24,
        unit: 'piece'
      }
    ],
    status: 'submitted', // Ожидает обработки
    priority: 'normal',
    purchaseOrderIds: [],
    notes: 'Weekly beverage restock',
    createdAt: TimeUtils.getDateDaysAgo(1),
    updatedAt: TimeUtils.getDateDaysAgo(1)
  },

  // Новый черновик
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
    status: 'draft', // Еще черновик
    priority: 'normal',
    purchaseOrderIds: [],
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// =============================================
// ГЕНЕРАЦИЯ ЗАКАЗОВ поставщикам
// =============================================

export const CORE_PURCHASE_ORDERS: PurchaseOrder[] = [
  // Заказ мяса - отправлен, ожидается поставка
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
        orderedQuantity: 5,
        unit: 'kg',
        pricePerUnit: 180000, // IDR за кг
        totalPrice: 900000,
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(30),
        status: 'ordered'
      }
    ],
    totalAmount: 900000,
    isEstimatedTotal: true,
    status: 'sent', // Отправлен поставщику
    paymentStatus: 'pending',
    requestIds: ['req-001'],
    billId: 'payment_11', // Связь с Account Store
    notes: 'Urgent meat order for evening menu',
    createdAt: TimeUtils.getDateDaysAgo(2),
    updatedAt: TimeUtils.getDateDaysAgo(2)
  },

  // Заказ овощей - подтвержден, оплачен
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
        orderedQuantity: 10,
        unit: 'kg',
        pricePerUnit: 8000,
        totalPrice: 80000,
        isEstimatedPrice: true,
        lastPriceDate: TimeUtils.getDateDaysAgo(15),
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
        lastPriceDate: TimeUtils.getDateDaysAgo(10),
        status: 'ordered'
      }
    ],
    totalAmount: 130000,
    isEstimatedTotal: true,
    status: 'confirmed', // Подтвержден поставщиком
    paymentStatus: 'paid', // Уже оплачен
    requestIds: ['req-001'],
    billId: 'payment_12',
    notes: 'Vegetables for weekly menu prep',
    createdAt: TimeUtils.getDateDaysAgo(3),
    updatedAt: TimeUtils.getDateDaysAgo(1)
  },

  // Заказ напитков - черновик
  {
    id: 'po-003',
    orderNumber: 'PO-003',
    supplierId: 'sup-beverage-distribution',
    supplierName: 'Jakarta Beverage Distribution',
    orderDate: TimeUtils.getCurrentLocalISO(),
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
        lastPriceDate: TimeUtils.getDateDaysAgo(5),
        status: 'ordered'
      }
    ],
    totalAmount: 576000,
    isEstimatedTotal: true,
    status: 'draft', // Еще черновик
    paymentStatus: 'pending',
    requestIds: ['req-002'],
    notes: 'Beverage restock for bar',
    createdAt: TimeUtils.getCurrentLocalISO(),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// =============================================
// ГЕНЕРАЦИЯ ПОСТУПЛЕНИЙ товаров
// =============================================

export const CORE_RECEIPTS: Receipt[] = [
  // Поступление овощей - завершено без расхождений
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
        orderedQuantity: 10,
        receivedQuantity: 10, // Получено точно как заказано
        orderedPrice: 8000,
        actualPrice: 8000, // Цена не изменилась
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
        actualPrice: 27000, // Цена выросла!
        notes: 'Price increased by 2000 IDR'
      }
    ],
    hasDiscrepancies: true, // Есть ценовые расхождения
    status: 'completed',
    storageOperationId: 'op-storage-006', // Связь со Storage Store
    notes: 'Receipt completed, minor price increase on garlic',
    createdAt: TimeUtils.getDateDaysAgo(1),
    updatedAt: TimeUtils.getDateDaysAgo(1)
  },

  // Поступление мяса - в процессе (черновик)
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
        orderedQuantity: 5,
        receivedQuantity: 4.8, // Небольшая недостача
        orderedPrice: 180000
        // actualPrice не установлена - поступление в процессе
      }
    ],
    hasDiscrepancies: true, // Количественные расхождения
    status: 'draft', // Поступление не завершено
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
    suggestions: CORE_ORDER_SUGGESTIONS,
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

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Автоматическая валидация при импорте в dev режиме
if (import.meta.env.DEV) {
  const validation = validateSupplierDefinitions()
  if (!validation.isValid) {
    console.error('❌ Supplier definitions validation failed:', validation.errors)
  } else {
    console.log('✅ All supplier definitions are valid')
  }
}
