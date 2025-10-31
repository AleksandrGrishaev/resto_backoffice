// src/stores/supplier_2/types.ts

import type { BaseEntity } from '@/types/common'
import type { Department } from '@/stores/productsStore/types'

// =============================================
// CORE WORKFLOW TYPES - Core entities
// =============================================

// 1. Procurement request (from department)
export interface ProcurementRequest extends BaseEntity {
  requestNumber: string // "REQ-KITCHEN-001"
  department: Department
  requestedBy: string

  items: RequestItem[]

  status: 'draft' | 'submitted' | 'converted' | 'cancelled'
  priority: 'normal' | 'urgent'

  // Relations
  purchaseOrderIds: string[] // PO created from this request

  notes?: string
}

export interface RequestItem {
  id: string
  itemId: string // relation to Product from ProductsStore
  itemName: string // cached name
  requestedQuantity: number // ✅ ВСЕГДА в базовых единицах
  unit: string // ✅ ВСЕГДА базовая единица продукта

  // ✅ НОВЫЕ ПОЛЯ для упаковок (опционально в заявках)
  packageId?: string // ID выбранной упаковки
  packageName?: string // Название упаковки для отображения
  packageQuantity?: number // Количество упаковок для UI

  estimatedPrice?: number
  priority?: 'normal' | 'urgent'
  category?: string
  notes?: string
}

// 2. Purchase order to supplier
export interface PurchaseOrder extends BaseEntity {
  orderNumber: string // "PO-001"
  supplierId: string // relation to Counteragent
  supplierName: string // cached name

  orderDate: string
  expectedDeliveryDate?: string

  items: OrderItem[]
  totalAmount: number // calculated from items
  isEstimatedTotal: boolean // true if contains estimated prices

  status: 'draft' | 'sent' | 'delivered' | 'cancelled'
  billStatus: BillStatus
  billStatusCalculatedAt?: string

  // Relations to other Stores
  requestIds: string[] // created from
  receiptId?: string // relation to receipt
  billId?: string // relation to bill in Account Store (PendingPayment.id)

  notes?: string

  // ✅ НОВЫЕ ПОЛЯ для обработки результатов приемки
  originalTotalAmount?: number // Первоначальная сумма заказа (до приемки)
  actualDeliveredAmount?: number // Фактическая стоимость доставленного
  receiptDiscrepancies?: ReceiptDiscrepancyInfo[] // Информация о расхождениях при приемке
  hasReceiptDiscrepancies?: boolean // Быстрая проверка наличия расхождений
  receiptCompletedAt?: string // Дата завершения приемки
  receiptCompletedBy?: string // Кто завершил приемку

  // ✅ УСТАРЕВШИЕ ПОЛЯ (для обратной совместимости)
  hasShortfall?: boolean // Есть недопоставка
  shortfallAmount?: number // Сумма недопоставки
}

export interface ReceiptDiscrepancyInfo {
  type: 'quantity' | 'price' | 'both'
  itemId: string
  itemName: string
  ordered: {
    quantity: number
    price: number
    total: number
  }
  received: {
    quantity: number
    price: number
    total: number
  }
  impact: {
    quantityDifference: number
    priceDifference: number
    totalDifference: number
  }
}

export interface OrderItem {
  id: string
  itemId: string // relation to Product
  itemName: string

  // ✅ КОЛИЧЕСТВА всегда в базовых единицах для расчетов
  orderedQuantity: number // в базовых единицах
  receivedQuantity?: number // в базовых единицах
  unit: string // базовая единица продукта

  // ✅ НОВЫЕ ПОЛЯ для упаковок (ОБЯЗАТЕЛЬНО в заказах)
  packageId: string // ОБЯЗАТЕЛЬНО - ID упаковки для заказа
  packageName: string // Название упаковки
  packageQuantity: number // Количество упаковок
  packageUnit: string // Единица упаковки (kg, liter, pack и т.д.)

  // ЦЕНЫ
  pricePerUnit: number // цена за базовую единицу (для совместимости)
  packagePrice: number // ✅ НОВОЕ - цена за упаковку
  totalPrice: number // общая стоимость

  // Price information
  isEstimatedPrice: boolean
  lastPriceDate?: string
  status: 'ordered' | 'received' | 'cancelled'
}

// 3. Goods receipt
export interface Receipt extends BaseEntity {
  receiptNumber: string // "RCP-001"
  purchaseOrderId: string

  deliveryDate: string
  receivedBy: string

  items: ReceiptItem[]

  hasDiscrepancies: boolean
  status: 'draft' | 'completed'

  // Receipt result - creates operation in Storage Store
  storageOperationId?: string // StorageOperation.id (type: 'receipt')

  notes?: string
}

export interface ReceiptItem {
  id: string
  orderItemId: string
  itemId: string
  itemName: string

  // ✅ КОЛИЧЕСТВА в базовых единицах
  orderedQuantity: number // в базовых единицах
  receivedQuantity: number // в базовых единицах
  unit: string // базовая единица

  // ✅ УПАКОВКА
  packageId: string // ID упаковки
  packageName: string // Название упаковки
  orderedPackageQuantity: number // Заказано упаковок
  receivedPackageQuantity: number // Получено упаковок
  packageUnit: string // Единица упаковки

  // ✅ ЦЕНЫ
  orderedPrice: number // цена за упаковку из заказа
  actualPrice?: number // фактическая цена за упаковку
  orderedBaseCost: number // цена за базовую единицу из заказа
  actualBaseCost?: number // фактическая цена за базовую единицу

  notes?: string
}

// =============================================
// STORE STATE - Store state
// =============================================

export interface SupplierState {
  // Data
  requests: ProcurementRequest[]
  orders: PurchaseOrder[]
  receipts: Receipt[]

  // UI state (only necessary)
  loading: {
    requests: boolean
    orders: boolean
    receipts: boolean
    suggestions: boolean
  }

  // Current workflow (only active objects)
  currentRequest?: ProcurementRequest
  currentOrder?: PurchaseOrder
  currentReceipt?: Receipt

  // For order assistant (minimum)
  selectedRequestIds: string[]
  orderSuggestions: OrderSuggestion[]

  // For supplier grouping (minimum)
  supplierBaskets: SupplierBasket[]
}

export type BillStatus =
  | 'not_billed' // Счета не выставлены
  | 'billed' // Счета выставлены, но не оплачены
  | 'partially_paid' // Частично оплачено
  | 'fully_paid' // Полностью оплачено
  | 'overdue' // Есть просроченные неоплаченные счета
  | 'overpaid' // Переплата

// =============================================
// HELPER TYPES - Helper types
// =============================================

// Order assistant suggestions
export interface OrderSuggestion {
  itemId: string
  itemName: string
  currentStock: number // в базовых единицах
  minStock: number
  suggestedQuantity: number // в базовых единицах
  urgency: 'low' | 'medium' | 'high'
  reason: 'below_minimum' | 'out_of_stock'

  // ✅ ЦЕНЫ И УПАКОВКИ
  estimatedBaseCost: number // цена за базовую единицу
  recommendedPackageId?: string // рекомендуемая упаковка
  recommendedPackageName?: string
  recommendedPackageQuantity?: number // количество упаковок
  estimatedPackagePrice?: number // цена за упаковку

  lastPriceDate?: string
  transitStock?: number
  pendingOrderStock?: number
  effectiveStock?: number
  nearestDelivery?: string
}

// Supplier baskets for UI distribution
export interface SupplierBasket {
  supplierId: string | null // null = "Unassigned"
  supplierName: string
  items: UnassignedItem[]
  totalItems: number
  estimatedTotal: number // calculated from past prices
}

export interface UnassignedItem {
  itemId: string
  itemName: string
  category: string
  totalQuantity: number // в базовых единицах
  unit: string // базовая единица

  // ✅ УПАКОВКА

  packageId?: string
  packageName?: string
  packageQuantity?: number
  recommendedPackageId?: string
  recommendedPackageName?: string
  estimatedPackagePrice?: number
  estimatedBaseCost: number

  // Sources from different requests
  sources: Array<{
    requestId: string
    requestNumber: string
    department: 'kitchen' | 'bar'
    quantity: number // в базовых единицах
    packageId?: string
    packageQuantity?: number
  }>
}

// =============================================
// CREATE/UPDATE TYPES - Types for create/update
// =============================================

export interface CreateRequestData {
  department: 'kitchen' | 'bar'
  requestedBy: string
  items: Omit<RequestItem, 'id'>[]
  priority?: 'normal' | 'urgent'
  notes?: string
}

export interface CreateOrderData {
  supplierId: string
  requestIds: string[]
  items: CreateOrderItemData[]
  expectedDeliveryDate?: string
  notes?: string
}
export interface CreateOrderItemData {
  itemId: string
  quantity: number // в базовых единицах
  packageId: string // ОБЯЗАТЕЛЬНО - выбранная упаковка
  pricePerUnit?: number // цена за базовую единицу (для совместимости)
  packagePrice?: number // цена за упаковку
}

export interface CreateReceiptData {
  purchaseOrderId: string
  receivedBy: string
  items: CreateReceiptItemData[]
  notes?: string
}

export interface CreateReceiptItemData {
  orderItemId: string
  receivedQuantity: number // в базовых единицах
  receivedPackageQuantity?: number // количество полученных упаковок
  actualPackagePrice?: number // фактическая цена за упаковку
  packageId?: string // ID упаковки (можно изменить при приемке)
  notes?: string
}

export interface UpdateRequestData {
  status?: ProcurementRequest['status']
  priority?: ProcurementRequest['priority']
  notes?: string
}

export interface UpdateOrderData {
  status?: PurchaseOrder['status']
  billStatus?: PurchaseOrder['billStatus']
  expectedDeliveryDate?: string
  notes?: string
}

export interface UpdateReceiptData {
  status?: Receipt['status']
  notes?: string
}

// =============================================
// INTEGRATION TYPES - Types for integration with other Stores
// =============================================

// Relations with ProductsStore
export interface ProductInfo {
  id: string // Product.id
  name: string // Product.name
  category: string // Product.category
  unit: string // Product.unit
  isActive: boolean // Product.isActive
  canBeSold: boolean // Product.canBeSold
  minStock?: number // Product.minStock
}

// Relations with CounterAgentsStore
export interface SupplierInfo {
  id: string // Counteragent.id
  name: string // Counteragent.name
  displayName: string // Counteragent.displayName
  type: 'supplier' // Counteragent.type
  paymentTerms: string // Counteragent.paymentTerms
  isActive: boolean // Counteragent.isActive
}

// Relations with StorageStore for price history
export interface PriceHistory {
  itemId: string
  supplierId?: string
  pricePerUnit: number
  date: string
  operationId: string // StorageOperation.id
}

// Relations with AccountStore for bill creation
export interface CreateBillInAccountStore {
  counteragentId: string // supplierId
  counteragentName: string // supplierName
  amount: number // PurchaseOrder.totalAmount
  description: string // "Order #{orderNumber}"
  category: 'supplier' // PendingPayment.category
  invoiceNumber?: string // PurchaseOrder.orderNumber
  purchaseOrderId: string // metadata for relation
  priority: 'low' | 'medium' | 'high' | 'urgent'
  createdBy: {
    type: 'user'
    id: string
    name: string
  }
}

// Relations with StorageStore for receipt creation
export interface CreateStorageReceipt {
  department: 'kitchen' | 'bar'
  responsiblePerson: string
  items: Array<{
    itemId: string
    quantity: number // в базовых единицах
    costPerUnit: number // цена за базовую единицу
    notes?: string
  }>
  sourceType: 'purchase'
  purchaseOrderId: string
}

// =============================================
// UI TYPES - Types for user interface
// =============================================

// Filters for tables
export interface RequestFilters {
  status?: ProcurementRequest['status'] | 'all'
  department?: 'kitchen' | 'bar' | 'all'
  priority?: ProcurementRequest['priority'] | 'all'
}

export interface OrderFilters {
  status?: PurchaseOrder['status'] | 'all'
  billStatus?: PurchaseOrder['billStatus'] | 'all'
  supplier?: string | 'all'
}

export interface ReceiptFilters {
  status?: Receipt['status'] | 'all'
  hasDiscrepancies?: boolean | 'all'
}

// Statistics for Overview
export interface SupplierStatistics {
  totalRequests: number
  pendingRequests: number
  totalOrders: number
  ordersAwaitingPayment: number
  ordersAwaitingDelivery: number
  totalReceipts: number
  pendingReceipts: number
  urgentSuggestions: number
}

// Discrepancy summary
export interface DiscrepancySummary {
  hasQuantityDiscrepancies: boolean
  hasPriceDiscrepancies: boolean
  totalQuantityDifference: number
  totalPriceDifference: number
  affectedItems: number
}

// =============================================
// CONSTANTS - Constants
// =============================================

export const REQUEST_STATUSES = {
  draft: 'Draft',
  submitted: 'Submitted',
  converted: 'Converted',
  cancelled: 'Cancelled'
} as const

export const REQUEST_PRIORITIES = {
  normal: 'Normal',
  urgent: 'Urgent'
} as const

export const ORDER_STATUSES = {
  draft: 'Draft',
  sent: 'Sent',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
} as const

export const BILL_STATUSES = {
  not_billed: 'Not Billed',
  billed: 'Billed',
  partially_paid: 'Partially Paid',
  fully_paid: 'Fully Paid',
  overdue: 'Overdue',
  overpaid: 'Overpaid'
} as const

export const RECEIPT_STATUSES = {
  draft: 'Draft',
  completed: 'Completed'
} as const

export const SUGGESTION_URGENCY = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
} as const

export const SUGGESTION_REASONS = {
  below_minimum: 'Below Minimum',
  out_of_stock: 'Out of Stock'
} as const

// =============================================
// TYPE GUARDS - Type guards
// =============================================

export function getBillStatusColor(status: BillStatus): string {
  const colors = {
    not_billed: 'grey',
    billed: 'orange',
    partially_paid: 'blue',
    fully_paid: 'green',
    overdue: 'red',
    overpaid: 'purple'
  }
  return colors[status] || 'grey'
}

export function isProcurementRequest(obj: any): obj is ProcurementRequest {
  return obj && typeof obj.requestNumber === 'string' && obj.department && obj.items
}

export function isPurchaseOrder(obj: any): obj is PurchaseOrder {
  return obj && typeof obj.orderNumber === 'string' && obj.supplierId && obj.items
}

export function isReceipt(obj: any): obj is Receipt {
  return obj && typeof obj.receiptNumber === 'string' && obj.purchaseOrderId && obj.items
}

// =============================================
// UTILITY TYPES - Utility types
// =============================================

// Status union types
export type RequestStatus = ProcurementRequest['status']
export type OrderStatus = PurchaseOrder['status']
export type BillStatusType = PurchaseOrder['billStatus']
export type ReceiptStatus = Receipt['status']
export type Department = 'kitchen' | 'bar'
export type Priority = 'normal' | 'urgent'
export type Urgency = 'low' | 'medium' | 'high'

// ID types
export type RequestId = string
export type OrderId = string
export type ReceiptId = string
export type ItemId = string
export type SupplierId = string

// Workflow step type
export type WorkflowStep = 'request' | 'order' | 'payment' | 'receipt' | 'storage'
