// src/stores/pos/types.ts
import type { SelectedModifier } from '@/stores/menu/types'
import type { DiscountReason } from '@/stores/discounts/types'

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// ===== TABLE TYPES =====
export type TableStatus = 'free' | 'occupied' | 'reserved'
export type TableSection = 'main'

export interface PosTable extends BaseEntity {
  number: string
  capacity: number
  section: TableSection
  floor: number
  status: TableStatus
  sortOrder?: number
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

// Cancellation reasons for order items
export type CancellationReason =
  | 'kitchen_mistake'
  | 'customer_refused'
  | 'wrong_order'
  | 'out_of_stock'
  | 'other'

// Ready-Triggered Write-off types
export type WriteOffStatus = 'pending' | 'processing' | 'completed' | 'skipped'
export type WriteOffTrigger = 'kitchen_ready' | 'payment_fallback' | 'cancellation'

// Cancellation reason options for UI
export const CANCELLATION_REASON_OPTIONS = [
  { value: 'kitchen_mistake' as CancellationReason, label: 'Kitchen Mistake', color: 'error' },
  { value: 'customer_refused' as CancellationReason, label: 'Customer Refused', color: 'warning' },
  { value: 'wrong_order' as CancellationReason, label: 'Wrong Order', color: 'info' },
  { value: 'out_of_stock' as CancellationReason, label: 'Out of Stock', color: 'secondary' },
  { value: 'other' as CancellationReason, label: 'Other', color: 'grey' }
] as const

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

  // Payment references (Sprint 1: Payment Architecture)
  paymentIds: string[] // Links to PosPayment records
  paidAmount: number // Computed from payments

  // Revenue breakdown (Sprint 7: Discount System)
  plannedRevenue?: number // Original revenue before discounts
  actualRevenue?: number // Revenue after discounts
  totalCollected?: number // Revenue after discounts + taxes
  revenueBreakdown?: import('@/stores/discounts/types').RevenueBreakdown
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
  discountReason?: DiscountReason // Reason for bill-level discount (properly typed)
  discountType?: 'percentage' | 'fixed' // Type of bill-level discount
  taxAmount: number
  total: number
  paymentStatus: 'unpaid' | 'partial' | 'paid'
  paidAmount: number
  notes?: string

  // Pre-bill tracking (fraud protection)
  preBillPrintedAt?: string // When pre-bill was printed
  preBillPrintedBy?: string // Who printed the pre-bill (cashier ID)
  preBillSnapshot?: PreBillSnapshot // Snapshot of bill state at print time
  preBillModifiedAfterPrint?: boolean // Flag if changes detected after print
}

// Snapshot of bill state for fraud detection
export interface PreBillSnapshot {
  itemsHash: string // Hash of items for quick comparison
  itemCount: number // Number of items
  subtotal: number // Subtotal at print time
  discountAmount: number // Discount at print time
  total: number // Total at print time
  items: PreBillSnapshotItem[] // Detailed items for audit
}

export interface PreBillSnapshotItem {
  menuItemId: string
  menuItemName: string
  variantName?: string
  quantity: number
  unitPrice: number
  totalPrice: number
  discountAmount: number
}

export interface PosBillItem extends BaseEntity {
  billId: string
  menuItemId: string
  menuItemName: string
  variantId?: string
  variantName?: string
  quantity: number
  unitPrice: number // базовая цена варианта
  totalPrice: number // итоговая цена (unitPrice + modifiersTotal) * quantity БЕЗ скидок (скидки в discounts[])
  discounts: PosItemDiscount[]

  // DEPRECATED: старая структура модификаторов (для обратной совместимости)
  modifications: PosItemModification[]

  // NEW: модификаторы из menu system
  selectedModifiers?: SelectedModifier[] // выбранные модификаторы
  modifiersTotal?: number // сумма доплат за модификаторы (за 1 штуку)

  status: ItemStatus
  paymentStatus: ItemPaymentStatus
  kitchenNotes?: string

  // KPI timestamps (for time tracking)
  sentToKitchenAt?: string // When item sent to kitchen (status → waiting)
  cookingStartedAt?: string // When cooking started (status → cooking)
  readyAt?: string // When item ready (status → ready)
  servedAt?: string // When item served (status → served)

  // Department routing (Kitchen vs Bar)
  department?: Department // Which department should prepare this item

  // Payment link (Sprint 1: Payment Architecture)
  paidByPaymentIds?: string[] // Links to payments that paid this item

  // Cancellation tracking (Sprint: Item Cancellation)
  cancelledAt?: string // When item was cancelled
  cancelledBy?: string // User who cancelled the item
  cancellationReason?: CancellationReason // Reason for cancellation
  cancellationNotes?: string // Additional notes
  writeOffOperationId?: string // Link to write-off if ingredients were written off

  // Ready-Triggered Write-off tracking (Sprint: Ready-Triggered Write-off)
  writeOffStatus?: WriteOffStatus // Write-off processing status
  writeOffAt?: string // When write-off was triggered (ISO timestamp)
  writeOffTriggeredBy?: WriteOffTrigger // What triggered the write-off
  cachedActualCost?: import('@/core/decomposition').ActualCostBreakdown // Cached cost for fast payment
  recipeWriteOffId?: string // Link to recipe_write_offs record
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
/**
 * Payment Method Code - dynamic string from payment_methods table
 * Examples: 'cash', 'card', 'qr', 'bni', 'gojek', 'grab', etc.
 * Previously hardcoded as 'cash' | 'card' | 'qr' - now supports any payment code
 */
export type PaymentMethod = string
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface PosPayment extends BaseEntity {
  // Identity
  paymentNumber: string // PAY-20251104-123456

  // Financial Data
  method: PaymentMethod
  status: PaymentStatus
  amount: number // Positive for payment, negative for refund

  // Cash handling
  receivedAmount?: number // For cash payments
  changeAmount?: number // Change returned

  // Links to operational data
  orderId: string // Which order
  billIds: string[] // Which bills
  itemIds: string[] // Which items (for partial payments)

  // Refund data
  refundedAt?: string
  refundReason?: string
  refundedBy?: string
  originalPaymentId?: string // If this is a refund

  // Reconciliation (for cash counting)
  processedBy: string // Cashier/waiter name
  processedAt: string // ISO datetime
  shiftId?: string // For shift reports
  reconciledAt?: string // When money counted
  reconciledBy?: string // Who verified

  // Receipt
  receiptPrinted: boolean
  receiptNumber?: string

  // ✅ SPRINT 8: Payment details (tax breakdown, etc.)
  details?: Record<string, any> // Flexible storage for payment breakdown

  // Sync status (for future backend sync)
  syncedAt?: string
  syncStatus?: 'pending' | 'synced' | 'failed'
}

export interface PaymentSplit {
  method: PaymentMethod
  amount: number
}

// ===== MENU INTEGRATION TYPES =====
export type Department = 'kitchen' | 'bar'

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
  department?: Department // Kitchen or Bar
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
