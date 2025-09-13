// src/stores/pos/mocks/posMockData.ts
import type { PosTable, TableStatus } from '../types'
import type { OrderType } from '@/types/order'

// =============================================
// MOCK ORDERS DATA
// =============================================

export interface MockOrder {
  id: string
  orderNumber: string
  type: OrderType
  tableId?: string
  customerInfo?: {
    name: string
    phone?: string
    address?: string
  }
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  createdAt: string
  items?: Array<{
    id: string
    name: string
    quantity: number
    price: number
  }>
}

/**
 * Mock данные для активных заказов delivery/takeaway
 */
export function createMockOrders(): MockOrder[] {
  return [
    {
      id: 'order_delivery_1',
      orderNumber: 'D001',
      type: 'delivery',
      status: 'active',
      createdAt: new Date().toISOString(),
      customerInfo: {
        name: 'Иван Петров',
        phone: '+7 999 123-45-67',
        address: 'ул. Пушкина, д. 10, кв. 25'
      },
      items: [
        { id: '1', name: 'Пицца Маргарита', quantity: 1, price: 850 },
        { id: '2', name: 'Кола 0.5л', quantity: 2, price: 120 }
      ]
    },
    {
      id: 'order_takeaway_1',
      orderNumber: 'T002',
      type: 'takeaway',
      status: 'active',
      createdAt: new Date().toISOString(),
      customerInfo: {
        name: 'Мария Сидорова',
        phone: '+7 999 987-65-43'
      },
      items: [
        { id: '3', name: 'Бургер Классик', quantity: 2, price: 450 },
        { id: '4', name: 'Картофель фри', quantity: 1, price: 180 }
      ]
    },
    {
      id: 'order_delivery_2',
      orderNumber: 'D003',
      type: 'delivery',
      status: 'active',
      createdAt: new Date().toISOString(),
      customerInfo: {
        name: 'Алексей Иванов',
        phone: '+7 999 555-11-22',
        address: 'пр. Мира, д. 15, оф. 201'
      },
      items: [{ id: '5', name: 'Суши сет', quantity: 1, price: 1200 }]
    },
    {
      id: 'order_takeaway_2',
      orderNumber: 'T004',
      type: 'takeaway',
      status: 'active',
      createdAt: new Date().toISOString(),
      customerInfo: {
        name: 'Елена Козлова',
        phone: '+7 999 444-33-22'
      },
      items: [
        { id: '6', name: 'Салат Цезарь', quantity: 1, price: 320 },
        { id: '7', name: 'Сок апельсиновый', quantity: 1, price: 150 }
      ]
    },
    {
      id: 'order_delivery_3',
      orderNumber: 'D005',
      type: 'delivery',
      status: 'active',
      createdAt: new Date().toISOString(),
      customerInfo: {
        name: 'Дмитрий Петров',
        phone: '+7 999 777-88-99',
        address: 'ул. Ленина, д. 42, кв. 8'
      },
      items: [
        { id: '8', name: 'Паста Карбонара', quantity: 1, price: 580 },
        { id: '9', name: 'Вино красное', quantity: 1, price: 800 }
      ]
    },
    {
      id: 'order_takeaway_3',
      orderNumber: 'T006',
      type: 'takeaway',
      status: 'active',
      createdAt: new Date().toISOString(),
      customerInfo: {
        name: 'Ольга Смирнова',
        phone: '+7 999 222-11-00'
      },
      items: [
        { id: '10', name: 'Кофе латте', quantity: 3, price: 180 },
        { id: '11', name: 'Круассан', quantity: 2, price: 120 }
      ]
    }
  ]
}

// =============================================
// MOCK TABLES DATA
// =============================================

/**
 * Mock данные для столов
 */
export function createMockTables(): PosTable[] {
  const now = new Date().toISOString()

  return [
    // Основные столы (свободные)
    {
      id: 'table_t1',
      number: 'T1',
      capacity: 4,
      section: 'main',
      floor: 1,
      status: 'free' as TableStatus,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'table_t2',
      number: 'T2',
      capacity: 2,
      section: 'main',
      floor: 1,
      status: 'free' as TableStatus,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'table_t3',
      number: 'T3',
      capacity: 6,
      section: 'main',
      floor: 1,
      status: 'occupied' as TableStatus,
      currentOrderId: 'order_table_t3_1',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'table_t4',
      number: 'T4',
      capacity: 4,
      section: 'main',
      floor: 1,
      status: 'free' as TableStatus,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'table_t5',
      number: 'T5',
      capacity: 2,
      section: 'main',
      floor: 1,
      status: 'occupied' as TableStatus,
      currentOrderId: 'order_table_t5_1',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'table_t6',
      number: 'T6',
      capacity: 8,
      section: 'main',
      floor: 1,
      status: 'reserved' as TableStatus,
      reservedUntil: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // +2 часа
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'table_t7',
      number: 'T7',
      capacity: 4,
      section: 'main',
      floor: 1,
      status: 'cleaning' as TableStatus,
      createdAt: now,
      updatedAt: now
    },

    // Островные столы
    {
      id: 'table_i1',
      number: 'I1',
      capacity: 6,
      section: 'island',
      floor: 1,
      status: 'free' as TableStatus,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'table_i2',
      number: 'I2',
      capacity: 6,
      section: 'island',
      floor: 1,
      status: 'occupied' as TableStatus,
      currentOrderId: 'order_table_i2_1',
      createdAt: now,
      updatedAt: now
    },

    // Барные места
    {
      id: 'table_b1',
      number: 'B1',
      capacity: 2,
      section: 'bar',
      floor: 1,
      status: 'free' as TableStatus,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'table_b2',
      number: 'B2',
      capacity: 2,
      section: 'bar',
      floor: 1,
      status: 'occupied' as TableStatus,
      currentOrderId: 'order_table_b2_1',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'table_b3',
      number: 'B3',
      capacity: 2,
      section: 'bar',
      floor: 1,
      status: 'free' as TableStatus,
      createdAt: now,
      updatedAt: now
    }
  ]
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Получить заказы только delivery и takeaway
 */
export function getActiveDeliveryOrders(): MockOrder[] {
  return createMockOrders().filter(order => order.type === 'delivery' || order.type === 'takeaway')
}

/**
 * Получить занятые столы с заказами
 */
export function getOccupiedTablesWithOrders(): Array<PosTable & { order?: MockOrder }> {
  const tables = createMockTables()
  const orders = createMockOrders()

  return tables
    .filter(table => table.status === 'occupied' && table.currentOrderId)
    .map(table => ({
      ...table,
      order: orders.find(order => order.id === table.currentOrderId)
    }))
}
