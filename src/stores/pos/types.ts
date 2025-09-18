// src/stores/pos/types.ts
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// ===== TABLE TYPES =====
export type TableStatus = 'free' | 'occupied_unpaid' | 'occupied_paid' | 'reserved'
export type TableSection = 'main'

export interface PosTable extends BaseEntity {
  number: string
  capacity: number
  section: TableSection
  floor: number
  status: TableStatus
  currentOrderId?: string
  reservedUntil?: string
  notes?: string
}

// ===== ORDER TYPES =====
export type OrderType = 'dine_in' | 'takeaway' | 'delivery'

export type OrderStatus =
  | 'draft'
  | 'waiting'
  | 'cooking'
  | 'ready'
  | 'served'
  | 'collected'
  | 'delivered'
  | 'cancelled'
export type OrderPaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'

export type ItemStatus = 'draft' | 'waiting' | 'cooking' | 'ready' | 'served' | 'cancelled'
export type ItemPaymentStatus = 'unpaid' | 'paid' | 'refunded'

// ДОБАВИТЬ: Типы статусов для разных типов заказов
export type DineInStatus = 'draft' | 'waiting' | 'cooking' | 'ready' | 'served' | 'cancelled'
export type TakeawayStatus = 'draft' | 'waiting' | 'cooking' | 'ready' | 'collected' | 'cancelled'
export type DeliveryStatus = 'draft' | 'waiting' | 'cooking' | 'ready' | 'delivered' | 'cancelled'

// ДОБАВИТЬ: Правила переходов статусов
export interface StatusTransition {
  from: OrderStatus
  to: OrderStatus[]
  orderTypes: OrderType[]
}

// ДОБАВИТЬ: Конфигурация статусов для каждого типа заказа
export interface OrderTypeStatusConfig {
  allowedStatuses: OrderStatus[]
  finalStatus: OrderStatus // served | collected | delivered
  transitions: Record<OrderStatus, OrderStatus[]>
}

// ДОБАВИТЬ: Маппинг типов заказов к конфигурации статусов
// ДОБАВИТЬ: Маппинг типов заказов к конфигурации статусов
export const ORDER_TYPE_STATUS_CONFIG: Record<OrderType, OrderTypeStatusConfig> = {
  dine_in: {
    allowedStatuses: ['draft', 'waiting', 'cooking', 'ready', 'served', 'cancelled'],
    finalStatus: 'served',
    transitions: {
      draft: ['waiting', 'cancelled'],
      waiting: ['cooking', 'cancelled'],
      cooking: ['ready', 'cancelled'],
      ready: ['served', 'cancelled'],
      served: ['cancelled'],
      collected: [], // Неиспользуемый статус
      delivered: [], // Неиспользуемый статус
      cancelled: []
    }
  },
  takeaway: {
    allowedStatuses: ['draft', 'waiting', 'cooking', 'ready', 'collected', 'cancelled'],
    finalStatus: 'collected',
    transitions: {
      draft: ['waiting', 'cancelled'],
      waiting: ['cooking', 'cancelled'],
      cooking: ['ready', 'cancelled'],
      ready: ['collected', 'cancelled'],
      served: [], // Неиспользуемый статус
      collected: ['cancelled'],
      delivered: [], // Неиспользуемый статус
      cancelled: []
    }
  },
  delivery: {
    allowedStatuses: ['draft', 'waiting', 'cooking', 'ready', 'delivered', 'cancelled'],
    finalStatus: 'delivered',
    transitions: {
      draft: ['waiting', 'cancelled'],
      waiting: ['cooking', 'cancelled'],
      cooking: ['ready', 'cancelled'],
      ready: ['delivered', 'cancelled'],
      served: [], // Неиспользуемый статус
      collected: [], // Неиспользуемый статус
      delivered: ['cancelled'],
      cancelled: []
    }
  }
}

export interface PosOrder extends BaseEntity {
  orderNumber: string
  type: OrderType
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  tableId?: string
  customerId?: string
  customerName?: string
  waiterName?: string
  bills: PosBill[]
  totalAmount: number
  discountAmount: number
  taxAmount: number
  finalAmount: number
  notes?: string
  estimatedReadyTime?: string
  actualReadyTime?: string
}

// ===== BILL TYPES =====
export type BillStatus = 'draft' | 'active' | 'closed' | 'cancelled'

export interface PosBill extends BaseEntity {
  billNumber: string
  orderId: string
  name: string
  status: BillStatus
  items: PosBillItem[]
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  paidAmount: number
  notes?: string
}

export interface PosBillItem extends BaseEntity {
  billId: string
  menuItemId: string
  menuItemName: string
  variantId?: string
  variantName?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  discounts: PosItemDiscount[]
  modifications: PosItemModification[]
  status: ItemStatus
  paymentStatus: ItemPaymentStatus
  kitchenNotes?: string
  sentToKitchenAt?: string
  preparedAt?: string
}

export interface PosItemDiscount {
  id: string
  type: 'percentage' | 'fixed'
  value: number
  reason: string
  appliedBy: string
  appliedAt: string
}

export interface PosItemModification {
  id: string
  name: string
  price: number
}

// ===== PAYMENT TYPES =====
export type PaymentMethod = 'cash' | 'card' | 'qr' | 'mixed'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface PosPayment extends BaseEntity {
  paymentNumber: string
  orderId: string
  billIds: string[]
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  receivedAmount?: number
  changeAmount?: number
  cardTransactionId?: string
  receiptPrinted: boolean
  processedBy: string
  processedAt: string
  refundedAt?: string
  refundReason?: string
}

export interface PaymentSplit {
  method: PaymentMethod
  amount: number
}

// ===== MENU INTEGRATION TYPES =====
export interface PosMenuItem {
  id: string
  name: string
  categoryId: string
  categoryName: string
  price: number
  isAvailable: boolean
  stockQuantity?: number
  preparationTime?: number
  description?: string
  imageUrl?: string
  variants?: PosMenuVariant[]
  modifications?: PosMenuModification[]
}

export interface PosMenuVariant {
  id: string
  name: string
  price: number
  isAvailable: boolean
}

export interface PosMenuModification {
  id: string
  name: string
  price: number
  isRequired: boolean
  options: PosModificationOption[]
}

export interface PosModificationOption {
  id: string
  name: string
  price: number
}

// ===== SERVICE INTERFACES =====
export interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  errors?: string[]
}

export interface PaginatedResponse<T> extends ServiceResponse<T[]> {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ===== FILTER AND SEARCH TYPES =====
export interface TableFilters {
  section?: TableSection
  status?: TableStatus
  floor?: number
  search?: string
}

export interface OrderFilters {
  type?: OrderType
  status?: OrderStatus
  tableId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface PaymentFilters {
  method?: PaymentMethod
  status?: PaymentStatus
  dateFrom?: string
  dateTo?: string
  amountFrom?: number
  amountTo?: number
}

// ===== STATISTICS TYPES =====
export interface DailySalesStats {
  date: string
  totalOrders: number
  totalAmount: number
  averageOrderValue: number
  paymentMethods: {
    cash: number
    card: number
    qr: number
    mixed: number
  }
  orderTypes: {
    dine_in: number
    takeaway: number
    delivery: number
  }
  topItems: {
    itemName: string
    quantity: number
    revenue: number
  }[]
}

export interface ShiftReport {
  shiftId: string
  startTime: string
  endTime?: string
  cashierId: string
  cashierName: string
  totalOrders: number
  totalAmount: number
  totalTax: number
  totalDiscounts: number
  paymentBreakdown: {
    cash: { count: number; amount: number }
    card: { count: number; amount: number }
    qr: { count: number; amount: number }
  }
  voidedOrders: number
  voidedAmount: number
}

// ===== INVENTORY INTEGRATION =====
export interface StockAlert {
  itemId: string
  itemName: string
  currentStock: number
  minStock: number
  isOutOfStock: boolean
}

export interface InventoryReservation {
  id: string
  orderId: string
  itemId: string
  quantity: number
  reservedAt: string
  expiresAt: string
}

// ===== ERROR TYPES =====
export interface PosError {
  code: string
  message: string
  details?: any
}

export type PosErrorCode =
  | 'ITEM_NOT_AVAILABLE'
  | 'INSUFFICIENT_STOCK'
  | 'PAYMENT_FAILED'
  | 'TABLE_OCCUPIED'
  | 'ORDER_NOT_FOUND'
  | 'INVALID_DISCOUNT'
  | 'KITCHEN_ERROR'
