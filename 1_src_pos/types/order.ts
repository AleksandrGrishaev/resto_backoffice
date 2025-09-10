// src/types/order.ts

import { Bill } from './bill'
import { BaseEntity } from './common'

// Основные типы заказа
export interface Order extends BaseEntity {
  id: string
  orderNumber: string // Например D001/T001
  type: OrderType
  status: OrderStatus
  tableId: string
  bills: string[] // ID счетов
  customerInfo?: CustomerInfo
  createdAt: string
  updatedAt: string
}

// Данные заказа
export interface OrderData {
  orderId: string
  bills: Bill[]
  timestamp: string
}

// Статусы и типы
export type OrderStatus = 'draft' | 'active' | 'completed' | 'cancelled'

export type OrderType = 'dine-in' | 'takeaway' | 'delivery'

export type DeliveryType =
  | 'dine-in'
  | 'takeaway'
  | 'delivery-gojek'
  | 'delivery-grab'
  | 'delivery-other'

// Информация о клиенте
export interface CustomerInfo {
  name?: string
  phone?: string
  address?: string
  notes?: string
}

// Валидация заказа
export interface OrderValidation {
  isValid: boolean
  errors: string[]
}

// Форма редактирования типа заказа
export interface OrderTypeForm {
  type: DeliveryType
  tableId: string
  targetOrderId?: string
}

export interface OrderTypeChangeData {
  type: DeliveryType
  orderType: OrderType
  tableId?: string
  targetOrderId?: string
}
