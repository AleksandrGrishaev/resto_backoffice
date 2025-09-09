// src/stores/shared/supplierDefinitions.ts - ИСПРАВЛЕННАЯ версия с базовыми единицами

import { TimeUtils } from '@/utils'
import { CORE_PRODUCTS, getProductDefinition } from './productDefinitions'
import type {
  ProcurementRequest,
  PurchaseOrder,
  Receipt,
  OrderSuggestion,
  BillStatus
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

function createMockDateWithTime(daysAgo: number, time: string): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const dateStr = date.toISOString().split('T')[0]
  return `${dateStr}T${time}`
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
  {
    id: 'req-credit-test',
    requestNumber: 'REQ-CREDIT-001',
    department: 'kitchen',
    priority: 'normal',
    requestedBy: 'Test Manager',
    status: 'converted',

    items: [
      {
        id: 'ri-credit-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        requestedQuantity: 5000,
        unit: 'gram',
        estimatedPrice: 180,
        notes: 'High quality beef required'
      },
      {
        id: 'ri-credit-002',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        requestedQuantity: 2000,
        unit: 'gram',
        estimatedPrice: 25,
        notes: 'Fresh local garlic'
      },
      {
        id: 'ri-credit-003',
        itemId: 'prod-potato',
        itemName: 'Potato',
        requestedQuantity: 40000,
        unit: 'gram',
        estimatedPrice: 8,
        notes: 'For multiple dishes'
      },
      {
        id: 'ri-credit-004',
        itemId: 'prod-onion',
        itemName: 'Onion',
        requestedQuantity: 15000,
        unit: 'gram',
        estimatedPrice: 6,
        notes: 'Fresh onions for cooking'
      },
      {
        id: 'ri-credit-005',
        itemId: 'prod-milk',
        itemName: 'Milk 3.2%',
        requestedQuantity: 15000,
        unit: 'ml',
        estimatedPrice: 15,
        notes: 'Fresh milk for cooking and beverages'
      }
    ],

    purchaseOrderIds: ['po-credit-test'],
    notes: 'TEST REQUEST: Will create credit scenario order',

    createdBy: 'Test Manager',
    createdAt: createMockDateWithTime(8, '09:00:00.000Z'),
    updatedAt: createMockDateWithTime(7, '16:00:00.000Z')
  },

  {
    id: 'req-use-credit',
    requestNumber: 'REQ-USE-CREDIT-001',
    department: 'kitchen',
    priority: 'normal',
    requestedBy: 'Test Manager',
    status: 'converted',

    items: [
      {
        id: 'ri-use-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        requestedQuantity: 3000,
        unit: 'gram',
        estimatedPrice: 180,
        notes: 'Using supplier credit'
      },
      {
        id: 'ri-use-002',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        requestedQuantity: 1000,
        unit: 'gram',
        estimatedPrice: 25,
        notes: 'Regular restock'
      },
      {
        id: 'ri-use-003',
        itemId: 'prod-milk',
        itemName: 'Milk 3.2%',
        requestedQuantity: 15000,
        unit: 'ml',
        estimatedPrice: 15,
        notes: 'Kitchen and beverage use'
      },
      {
        id: 'ri-use-004',
        itemId: 'prod-olive-oil',
        itemName: 'Olive Oil Extra Virgin',
        requestedQuantity: 1000,
        unit: 'ml',
        estimatedPrice: 85,
        notes: 'High quality olive oil for special dishes'
      }
    ],

    purchaseOrderIds: ['po-using-credit'],
    notes: 'TEST REQUEST: Will use supplier credit from previous order',

    createdBy: 'Test Manager',
    createdAt: createMockDateWithTime(2, '10:00:00.000Z'),
    updatedAt: createMockDateWithTime(1, '15:00:00.000Z')
  },

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
// ЗАМЕНИТЬ секцию CORE_PURCHASE_ORDERS:
// =============================================

export const CORE_PURCHASE_ORDERS: PurchaseOrder[] = [
  // ✅ КРЕДИТНЫЙ ЗАКАЗ: Создает переплату и кредит поставщика
  {
    id: 'po-credit-test',
    orderNumber: 'PO-CREDIT-001',
    supplierId: 'sup-premium-meat-co', // ✅ Существует в counteragentsMock.ts
    supplierName: 'Premium Meat Company',
    requestIds: ['req-credit-test'],
    status: 'delivered',
    billStatus: 'overpaid' as BillStatus, // ✅ ИСПРАВЛЕНО: заменить paymentStatus
    billId: 'payment-credit-main',
    receiptId: 'receipt-credit-001', // ✅ Будет создан ниже

    // Математика: заказали на 1.5M, получили на 1.2M = переплата 300k
    orderDate: createMockDateWithTime(7, '09:00:00.000Z'),
    expectedDeliveryDate: createMockDateWithTime(3, '14:00:00.000Z'),

    items: [
      {
        id: 'oi-credit-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 5000, // 5кг
        unit: 'gram',
        pricePerUnit: 180, // 180 IDR за грамм
        totalPrice: 900000, // 5000 * 180 = 900k
        isEstimatedPrice: false,
        lastPriceDate: createMockDateWithTime(7, '09:00:00.000Z'),
        status: 'received'
      },
      {
        id: 'oi-credit-002',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        orderedQuantity: 2000, // 2кг
        unit: 'gram',
        pricePerUnit: 25, // 25 IDR за грамм
        totalPrice: 50000, // 2000 * 25 = 50k
        isEstimatedPrice: false,
        lastPriceDate: createMockDateWithTime(7, '09:00:00.000Z'),
        status: 'received'
      },
      {
        id: 'oi-credit-003',
        itemId: 'prod-potato',
        itemName: 'Potato',
        orderedQuantity: 40000, // 40кг
        unit: 'gram',
        pricePerUnit: 8, // 8 IDR за грамм
        totalPrice: 320000, // 40000 * 8 = 320k
        isEstimatedPrice: false,
        lastPriceDate: createMockDateWithTime(7, '09:00:00.000Z'),
        status: 'received'
      },
      {
        id: 'oi-credit-004',
        itemId: 'prod-onion',
        itemName: 'Onion',
        orderedQuantity: 15000, // 15кг
        unit: 'gram',
        pricePerUnit: 6, // 6 IDR за грамм
        totalPrice: 90000, // 15000 * 6 = 90k
        isEstimatedPrice: false,
        lastPriceDate: createMockDateWithTime(7, '09:00:00.000Z'),
        status: 'received'
      },
      {
        id: 'oi-credit-005',
        itemId: 'prod-milk',
        itemName: 'Milk 3.2%',
        orderedQuantity: 15000, // 15 литров
        unit: 'ml',
        pricePerUnit: 15, // 15 IDR за мл
        totalPrice: 225000, // 15000 * 15 = 225k
        isEstimatedPrice: false,
        lastPriceDate: createMockDateWithTime(7, '09:00:00.000Z'),
        status: 'received'
      }
    ],

    // ИТОГО: 900k + 50k + 320k + 90k + 225k = 1.585M (оригинальный заказ)
    // Но доставлено: (4000*180) + (2000*25) + (40000*8) + (15000*6) + (15000*15) = 1.285M
    // Переплата: 1.5M оплачено - 1.285M получено = 215k
    totalAmount: 1585000,
    originalTotalAmount: 1585000,
    actualDeliveredAmount: 1285000, // После приемки
    hasReceiptDiscrepancies: true,
    receiptDiscrepancies: [
      {
        type: 'quantity',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        ordered: {
          quantity: 5000,
          price: 180,
          total: 900000
        },
        received: {
          quantity: 4000, // недопоставка 1кг
          price: 180,
          total: 720000
        },
        impact: {
          quantityDifference: -1000,
          priceDifference: 0,
          totalDifference: -180000
        }
      }
    ],
    receiptCompletedAt: createMockDateWithTime(2, '16:00:00.000Z'),
    receiptCompletedBy: 'Warehouse Manager',

    isEstimatedTotal: false,
    notes: 'TEST ORDER: Overpayment scenario - creates supplier credit of 300k IDR',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Test Manager'
    },
    createdAt: createMockDateWithTime(7, '10:00:00.000Z'),
    updatedAt: createMockDateWithTime(2, '16:30:00.000Z')
  },

  // ✅ ЗАКАЗ ИСПОЛЬЗУЮЩИЙ КРЕДИТ: Частично оплачен кредитом
  {
    id: 'po-using-credit',
    orderNumber: 'PO-USE-CREDIT-001',
    supplierId: 'sup-premium-meat-co', // ✅ Тот же поставщик
    supplierName: 'Premium Meat Company',
    requestIds: ['req-use-credit'],
    status: 'confirmed',
    billStatus: 'partially_paid' as BillStatus, // ✅ ИСПРАВЛЕНО: заменить paymentStatus

    totalAmount: 800000, // новый заказ на 800k

    items: [
      {
        id: 'oi-use-credit-001',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 3000, // 3кг
        unit: 'gram',
        pricePerUnit: 180,
        totalPrice: 540000, // 3000 * 180 = 540k
        isEstimatedPrice: false,
        lastPriceDate: createMockDateWithTime(1, '11:00:00.000Z'),
        status: 'ordered'
      },
      {
        id: 'oi-use-credit-002',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        orderedQuantity: 1000, // 1кг
        unit: 'gram',
        pricePerUnit: 25,
        totalPrice: 25000, // 1000 * 25 = 25k
        isEstimatedPrice: false,
        lastPriceDate: createMockDateWithTime(1, '11:00:00.000Z'),
        status: 'ordered'
      },
      {
        id: 'oi-use-credit-003',
        itemId: 'prod-milk',
        itemName: 'Milk 3.2%',
        orderedQuantity: 15000, // 15 литров
        unit: 'ml',
        pricePerUnit: 15,
        totalPrice: 225000, // 15000 * 15 = 225k
        isEstimatedPrice: false,
        lastPriceDate: createMockDateWithTime(1, '11:00:00.000Z'),
        status: 'ordered'
      },
      {
        id: 'oi-use-credit-004',
        itemId: 'prod-olive-oil',
        itemName: 'Olive Oil Extra Virgin',
        orderedQuantity: 1000, // 1 литр
        unit: 'ml',
        pricePerUnit: 10,
        totalPrice: 10000, // 1000 * 10 = 10k
        isEstimatedPrice: false,
        lastPriceDate: createMockDateWithTime(1, '11:00:00.000Z'),
        status: 'ordered'
      }
    ],

    // ИТОГО: 540k + 25k + 225k + 10k = 800k ✅
    isEstimatedTotal: false,
    orderDate: createMockDateWithTime(1, '11:00:00.000Z'),
    expectedDeliveryDate: createMockDateWithTime(-2, '15:00:00.000Z'),
    notes: 'TEST ORDER: Uses 250k supplier credit, needs 550k additional payment',
    createdBy: {
      type: 'user',
      id: 'user_1',
      name: 'Test Manager'
    },
    createdAt: createMockDateWithTime(1, '11:00:00.000Z'),
    updatedAt: createMockDateWithTime(1, '11:00:00.000Z')
  },

  // ✅ PO-001: Заказ с расхождениями при приемке (недопоставка говядины)
  {
    id: 'po-001',
    orderNumber: 'PO-001',
    supplierId: 'sup-premium-meat-co',
    supplierName: 'Premium Meat Company',
    orderDate: TimeUtils.getDateDaysAgo(5),
    expectedDeliveryDate: TimeUtils.getDateDaysAgo(1),

    items: [
      {
        id: 'oi-001-beef',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 5000,
        receivedQuantity: 4500,
        unit: 'g',
        pricePerUnit: 180,
        totalPrice: 810000,
        isEstimatedPrice: false,
        lastPriceDate: TimeUtils.getDateDaysAgo(3),
        status: 'received'
      }
    ],

    totalAmount: 810000,
    originalTotalAmount: 900000,
    actualDeliveredAmount: 810000,
    hasReceiptDiscrepancies: true,
    receiptDiscrepancies: [
      {
        type: 'quantity',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        ordered: {
          quantity: 5000,
          price: 180,
          total: 900000
        },
        received: {
          quantity: 4500,
          price: 180,
          total: 810000
        },
        impact: {
          quantityDifference: -500,
          priceDifference: 0,
          totalDifference: -90000
        }
      }
    ],
    receiptCompletedAt: createMockDateWithTime(1, '14:30:00.000Z'),
    receiptCompletedBy: 'Warehouse Manager',

    isEstimatedTotal: false,
    status: 'delivered',
    billStatus: 'overpaid' as BillStatus, // ✅ ИСПРАВЛЕНО: заменить paymentStatus
    billStatusCalculatedAt: createMockDateWithTime(1, '14:35:00.000Z'),

    requestIds: ['req-001'],
    receiptId: 'receipt-001',
    billId: 'payment_po_001_partial',
    notes: 'Недопоставка 500г говядины из-за проблем поставщика',

    createdAt: createMockDateWithTime(5, '09:00:00.000Z'),
    updatedAt: createMockDateWithTime(1, '14:35:00.000Z')
  },

  // ✅ PO-002: Заказ доставлен без расхождений (картофель)
  {
    id: 'po-002',
    orderNumber: 'PO-002',
    supplierId: 'sup-fresh-veg-market',
    supplierName: 'Fresh Vegetable Market',
    orderDate: TimeUtils.getDateDaysAgo(3),
    expectedDeliveryDate: TimeUtils.getDateDaysAgo(1),

    items: [
      {
        id: 'oi-002-potato',
        itemId: 'prod-potato',
        itemName: 'Potato',
        orderedQuantity: 15000,
        receivedQuantity: 15000,
        unit: 'g',
        pricePerUnit: 8,
        totalPrice: 120000,
        isEstimatedPrice: false,
        lastPriceDate: TimeUtils.getDateDaysAgo(2),
        status: 'received'
      }
    ],

    totalAmount: 120000,
    originalTotalAmount: 120000,
    actualDeliveredAmount: 120000,
    hasReceiptDiscrepancies: false,
    receiptDiscrepancies: [],
    receiptCompletedAt: createMockDateWithTime(1, '11:15:00.000Z'),
    receiptCompletedBy: 'Kitchen Manager',

    isEstimatedTotal: false,
    status: 'delivered',
    billStatus: 'fully_paid' as BillStatus, // ✅ ИСПРАВЛЕНО: заменить paymentStatus
    billStatusCalculatedAt: createMockDateWithTime(1, '11:20:00.000Z'),

    requestIds: ['req-002'],
    receiptId: 'receipt-002',
    billId: 'payment_po_002_full',
    notes: 'Доставлено без замечаний',

    createdAt: createMockDateWithTime(3, '10:00:00.000Z'),
    updatedAt: createMockDateWithTime(1, '11:20:00.000Z')
  },

  // ✅ PO-003: Заказ отправлен, ожидает доставки (томаты)
  {
    id: 'po-003',
    orderNumber: 'PO-003',
    supplierId: 'sup-specialty-foods', // ✅ ИСПРАВЛЕНО
    supplierName: 'Specialty Foods Supply', // ✅ ИСПРАВЛЕНО
    orderDate: TimeUtils.getDateDaysAgo(2),
    expectedDeliveryDate: TimeUtils.getCurrentLocalISO(),

    items: [
      {
        id: 'oi-003-tomato',
        itemId: 'prod-tomato',
        itemName: 'Fresh Tomato',
        orderedQuantity: 5000,
        unit: 'g',
        pricePerUnit: 12,
        totalPrice: 60000,
        isEstimatedPrice: false,
        lastPriceDate: TimeUtils.getDateDaysAgo(1),
        status: 'ordered'
      }
    ],

    totalAmount: 60000,
    isEstimatedTotal: false,
    status: 'sent',
    billStatus: 'not_billed' as BillStatus, // ✅ ИСПРАВЛЕНО: заменить paymentStatus
    billStatusCalculatedAt: createMockDateWithTime(2, '15:00:00.000Z'),

    requestIds: ['req-003'],
    notes: 'Ожидается доставка сегодня',

    createdAt: createMockDateWithTime(2, '15:00:00.000Z'),
    updatedAt: createMockDateWithTime(2, '15:00:00.000Z')
  },

  // ✅ PO-0904-006: Заказ пива с расхождениями по количеству и цене
  {
    id: 'po-1757014034857',
    orderNumber: 'PO-0904-006',
    supplierId: 'sup-beverage-distribution', // ✅ ИСПРАВЛЕНО
    supplierName: 'Jakarta Beverage Distribution', // ✅ ИСПРАВЛЕНО
    orderDate: TimeUtils.getDateDaysAgo(1),
    expectedDeliveryDate: TimeUtils.getCurrentLocalISO(),

    items: [
      {
        id: 'oi-beer-330ml',
        itemId: 'prod-beer-bintang-330',
        itemName: 'Bintang Beer 330ml',
        orderedQuantity: 24,
        receivedQuantity: 20,
        unit: 'pcs',
        pricePerUnit: 10000,
        totalPrice: 240000,
        isEstimatedPrice: false,
        lastPriceDate: TimeUtils.getDateDaysAgo(1),
        status: 'received'
      }
    ],

    totalAmount: 160000,
    originalTotalAmount: 240000,
    actualDeliveredAmount: 160000,
    hasReceiptDiscrepancies: true,
    receiptDiscrepancies: [
      {
        type: 'both',
        itemId: 'prod-beer-bintang-330',
        itemName: 'Bintang Beer 330ml',
        ordered: {
          quantity: 24,
          price: 10000,
          total: 240000
        },
        received: {
          quantity: 20,
          price: 8000,
          total: 160000
        },
        impact: {
          quantityDifference: -4,
          priceDifference: -2000,
          totalDifference: -80000
        }
      }
    ],
    receiptCompletedAt: TimeUtils.getCurrentLocalISO(),
    receiptCompletedBy: 'Bar Manager',

    isEstimatedTotal: false,
    status: 'delivered',
    billStatus: 'fully_paid' as BillStatus, // ✅ ИСПРАВЛЕНО: заменить paymentStatus
    billStatusCalculatedAt: TimeUtils.getCurrentLocalISO(),

    requestIds: ['req-001'],
    receiptId: 'receipt-1757014065706',
    notes: 'Количество меньше заказанного, но цена снижена',

    createdAt: createMockDateWithTime(1, '12:00:00.000Z'),
    updatedAt: TimeUtils.getCurrentLocalISO()
  }
]

// =============================================
// ИСПРАВЛЕННЫЕ CORE_RECEIPTS:
// =============================================

export const CORE_RECEIPTS: Receipt[] = [
  {
    id: 'receipt-credit-001',
    receiptNumber: 'RCP-CREDIT-001',
    purchaseOrderId: 'po-credit-test', // ✅ Правильная ссылка
    deliveryDate: createMockDateWithTime(2, '15:00:00.000Z'),
    receivedBy: 'Warehouse Manager',

    items: [
      {
        id: 'ri-credit-001',
        orderItemId: 'oi-credit-001', // ✅ Ссылка на order item
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 5000,
        receivedQuantity: 4000, // недопоставка 1кг
        orderedPrice: 180,
        actualPrice: 180,
        unit: 'gram',
        notes: 'Недопоставка из-за проблем поставщика'
      },
      {
        id: 'ri-credit-002',
        orderItemId: 'oi-credit-002',
        itemId: 'prod-garlic',
        itemName: 'Garlic',
        orderedQuantity: 2000,
        receivedQuantity: 2000,
        orderedPrice: 25,
        actualPrice: 25,
        unit: 'gram',
        notes: 'Доставлено полностью'
      },
      {
        id: 'ri-credit-003',
        orderItemId: 'oi-credit-003',
        itemId: 'prod-potato',
        itemName: 'Potato',
        orderedQuantity: 40000,
        receivedQuantity: 40000,
        orderedPrice: 8,
        actualPrice: 8,
        unit: 'gram',
        notes: 'Доставлено полностью'
      },
      {
        id: 'ri-credit-004',
        orderItemId: 'oi-credit-004',
        itemId: 'prod-onion',
        itemName: 'Onion',
        orderedQuantity: 15000,
        receivedQuantity: 15000,
        orderedPrice: 6,
        actualPrice: 6,
        unit: 'gram',
        notes: 'Доставлено полностью'
      },
      {
        id: 'ri-credit-005',
        orderItemId: 'oi-credit-005',
        itemId: 'prod-milk',
        itemName: 'Milk 3.2%',
        orderedQuantity: 15000,
        receivedQuantity: 15000,
        orderedPrice: 15,
        actualPrice: 15,
        unit: 'ml',
        notes: 'Доставлено полностью'
      }
    ],

    hasDiscrepancies: true,
    status: 'completed',
    storageOperationId: 'op-credit-receipt-001',
    notes: 'Недопоставка говядины создала переплату 180k IDR',

    createdAt: createMockDateWithTime(2, '15:00:00.000Z'),
    updatedAt: createMockDateWithTime(2, '16:30:00.000Z')
  },

  {
    id: 'receipt-001',
    receiptNumber: 'RCP-001',
    purchaseOrderId: 'po-001',
    deliveryDate: createMockDateWithTime(1, '14:00:00.000Z'),
    receivedBy: 'Warehouse Manager',

    items: [
      {
        id: 'ri-001',
        orderItemId: 'oi-001-beef',
        itemId: 'prod-beef-steak',
        itemName: 'Beef Steak',
        orderedQuantity: 5000,
        receivedQuantity: 4500,
        orderedPrice: 180,
        actualPrice: 180,
        unit: 'g',
        notes: 'Поставщик объяснил недопоставку проблемами на складе'
      }
    ],

    hasDiscrepancies: true,
    status: 'completed',
    storageOperationId: 'op-receipt-001',
    notes: 'Недопоставка 500г говядины',

    createdAt: createMockDateWithTime(1, '14:00:00.000Z'),
    updatedAt: createMockDateWithTime(1, '14:30:00.000Z')
  },

  // Receipt для PO-002 без расхождений
  {
    id: 'receipt-002',
    receiptNumber: 'RCP-002',
    purchaseOrderId: 'po-002',
    deliveryDate: createMockDateWithTime(1, '11:00:00.000Z'),
    receivedBy: 'Kitchen Manager',

    items: [
      {
        id: 'ri-002',
        orderItemId: 'oi-002-potato',
        itemId: 'prod-potato',
        itemName: 'Potato',
        orderedQuantity: 15000,
        receivedQuantity: 15000,
        orderedPrice: 8,
        actualPrice: 8,
        unit: 'g',
        notes: 'Отличное качество, доставлено в срок'
      }
    ],

    hasDiscrepancies: false,
    status: 'completed',
    storageOperationId: 'op-receipt-002',
    notes: 'Приемка прошла без замечаний',

    createdAt: createMockDateWithTime(1, '11:00:00.000Z'),
    updatedAt: createMockDateWithTime(1, '11:15:00.000Z')
  },

  // Receipt для PO-0904-006 с расхождениями по количеству и цене
  {
    id: 'receipt-1757014065706',
    receiptNumber: 'RCP-0904-003',
    purchaseOrderId: 'po-1757014034857',
    deliveryDate: TimeUtils.getCurrentLocalISO(),
    receivedBy: 'Bar Manager',

    items: [
      {
        id: 'ri-beer-330',
        orderItemId: 'oi-beer-330ml',
        itemId: 'prod-beer-bintang-330',
        itemName: 'Bintang Beer 330ml',
        orderedQuantity: 24,
        receivedQuantity: 20,
        orderedPrice: 10000,
        actualPrice: 8000,
        unit: 'pcs',
        notes: 'Количество меньше, но поставщик снизил цену в качестве компенсации'
      }
    ],

    hasDiscrepancies: true,
    status: 'completed',
    storageOperationId: 'op-1757014083495',
    notes: 'Расхождения по количеству компенсированы снижением цены',

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
