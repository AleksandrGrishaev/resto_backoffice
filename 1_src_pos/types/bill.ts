// src/types/bill.ts

import { BaseEntity } from './common'
import { BaseItem } from './menu'
import { DeliveryType } from './order'
import { PaymentStatus, BillPayment } from './payment'
import { AppliedDiscount } from './discount'

// Основные типы счета
export interface Bill extends BaseEntity {
  id: string
  name: string
  status: BillStatus
  items: BillItem[]
  paymentStatus: PaymentStatus // Добавляем статус оплаты для всего счета
  payments: BillPayment[] // История платежей
  customerId?: string // ID клиента
  customerDiscount?: AppliedDiscount // Скидка по программе лояльности
  priceBeforeDiscount: number // Сумма до скидок
  tableActivity?: TableActivity[]
  deliveryType?: DeliveryType
  notes?: {
    kitchen?: string
    bar?: string
  }
  paymentTotal?: number // Общая сумма платежей
  unpaidAmount?: number // Неоплаченная сумма
}

// Позиция в счете
export interface BillItem extends BaseItem {
  id: string
  status: BillItemStatus
  paymentStatus: PaymentStatus // Добавляем статус оплаты
  paymentTransactionId?: string // ID транзакции оплаты
  paymentTimestamp?: string // Время оплаты
  discountedPrice?: number // добавляем поле для цены со скидкой
  discount?: AppliedDiscount // Скидка на позицию
  priceBeforeDiscount: number // Цена до скидки
  history: BillHistory[]
  cancellations?: CancellationData[]
  activeCancellations?: number
  discounts?: BillDiscount[]
}

// История
export interface BillHistory {
  id: string
  billId: string
  itemId?: string
  type: BillHistoryType
  changes: BillHistoryChange
  timestamp: string
  userId: string
}

// Discount items
export interface ItemPricing {
  basePrice: number // базовая цена (price из BaseItem)
  discountedPrice: number // цена со скидкой
  totalPrice: number // итоговая цена с учетом quantity
}

// Статусы
export type BillStatus = 'active' | 'closed' | 'cancelled'

export type BillItemStatus = 'pending' | 'ordered' | 'cooking' | 'completed' | 'cancelled'

// История изменений
export type BillHistoryType =
  | 'item_added'
  | 'item_modified'
  | 'item_cancelled'
  | 'bill_renamed'
  | 'bill_saved'
  | 'bill_cancelled'
  | 'bill_moved_to_table'
  | 'bill_type_changed'
  | 'items_moved'
  | 'bill_moved_to_order'
  | 'discount_added'
  | 'discount_modified'
  | 'payment_added' // Добавляем новые типы для платежей
  | 'payment_cancelled'
  | 'payment_refunded'

// Selection
export type SelectionMode = 'none' | 'items' | 'bills' | 'order'

export interface SelectableState {
  selectedItems: Set<string>
  selectedBills: Set<string>
  selectionMode: SelectionMode
}

// Вспомогательные интерфейсы
export interface TableActivity {
  tableId: string
  startTime: string
  endTime?: string
}

export interface BillHistoryChange {
  before?: {
    billId?: string
    orderId?: string
    items?: BillItem[]
    pricing?: ItemPricing // добавляем информацию о ценах
  } & Partial<BillItem | Bill>
  after?: {
    billId?: string
    orderId?: string
    items?: BillItem[]
    pricing?: ItemPricing // добавляем информацию о ценах
  } & Partial<BillItem | Bill>
  notes?: string
}

export interface CancellationData {
  reason: CancellationReason
  note: string
  timestamp: string
  userId: string
  quantity: number
}

export type CancellationReason =
  | 'customer_request'
  | 'out_of_stock'
  | 'wrong_order'
  | 'quality_issue'
  | 'long_wait'
  | 'price_dispute'
  | 'other'

// Валидация
export interface ValidationResult {
  code?: string
  message: string
  isValid: boolean
}

// Константы для переходов статусов
export const STATUS_TRANSITIONS: Record<BillItemStatus, BillItemStatus[]> = {
  pending: ['ordered', 'cancelled'],
  ordered: ['cooking', 'cancelled'],
  cooking: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
}

export interface AddItemData {
  dishId: string
  variantId: string
  quantity: number
  price: number
  status: BillItemStatus
  notes?: string
}

// Добавим интерфейсы для перемещений
export interface MoveItemsPayload {
  sourceId: string // ID исходного счета
  targetId: string // ID целевого счета
  items: string[] // ID перемещаемых позиций
  targetOrderId?: string // ID целевого заказа
}

export interface MoveBillPayload {
  billId: string
  targetTableId?: string // Для перемещения на стол
  targetOrderId?: string // Для перемещения в заказ
  newType?: DeliveryType // Для смены типа
}

// Discount items

export type DiscountReason =
  | 'customer_complaint'
  | 'manager_approval'
  | 'happy_hour'
  | 'special_event'
  | 'other'

export interface BillDiscount {
  id: string
  value: number
  reason: DiscountReason
  timestamp: string
}
