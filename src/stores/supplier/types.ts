// src/stores/supplier/types.ts
import { BaseEntity } from '@/types/common'

// Базовые типы
export type PaymentTerms = 'prepaid' | 'on_delivery' | 'monthly' | 'custom'
export type SupplierType = 'local' | 'wholesale' | 'online' | 'other'
export type SupplierReliability = 'excellent' | 'good' | 'average' | 'poor'
export type ProcurementStatus = 'draft' | 'submitted' | 'approved' | 'converted' | 'cancelled'
export type ProcurementPriority = 'low' | 'normal' | 'urgent'
export type PurchaseOrderStatus =
  | 'draft'
  | 'sent'
  | 'confirmed'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid'
export type DeliveryMethod = 'pickup' | 'delivery'
export type AcceptanceStatus = 'draft' | 'accepted' | 'rejected'
export type QualityRating = 'excellent' | 'good' | 'acceptable' | 'poor' | 'rejected'

// Поставщик
export interface Supplier extends BaseEntity {
  // Основная информация
  name: string
  type: SupplierType

  // Контакты
  contactPerson?: string
  phone?: string
  email?: string
  address?: string

  // Продукты
  products: string[] // Product IDs
  categories: string[] // Категории продуктов

  // Условия работы
  paymentTerms: PaymentTerms

  // Статистика и финансы
  totalOrders?: number
  totalOrderValue?: number
  averageOrderValue?: number
  lastOrderDate?: string
  reliability: SupplierReliability

  // Финансовые показатели
  currentBalance: number // дебет/кредит с поставщиком
  totalPaid?: number
  totalDebt?: number

  // Статус
  isActive: boolean
  notes?: string
}

// Заявка на заказ
export interface ProcurementRequest extends BaseEntity {
  // Заявка
  requestNumber: string // "REQ-KITCHEN-001"
  department: 'kitchen' | 'bar'
  requestedBy: string
  requestDate: string

  // Товары
  items: ProcurementRequestItem[]

  // Помощник заказов
  suggestions?: OrderSuggestion[]

  // Статус
  status: ProcurementStatus
  priority: ProcurementPriority

  // Связи
  purchaseOrderIds: string[]

  notes?: string
}

export interface ProcurementRequestItem {
  id: string
  itemId: string
  itemName: string
  currentStock: number
  requestedQuantity: number
  unit: string
  reason: 'low_stock' | 'out_of_stock' | 'upcoming_menu' | 'bulk_discount' | 'other'
  notes?: string
}

export interface OrderSuggestion {
  itemId: string
  itemName: string
  currentStock: number
  minStock: number
  suggestedQuantity: number
  reason: 'below_minimum' | 'out_of_stock' | 'expiring_soon'
  urgency: 'low' | 'medium' | 'high'
}

// Заказ поставщику
export interface PurchaseOrder extends BaseEntity {
  // Заказ
  orderNumber: string // "PO-SUPPLIER-001"
  supplierId: string
  supplierName: string

  // Даты
  orderDate: string
  expectedDeliveryDate?: string
  actualDeliveryDate?: string

  // Товары
  items: PurchaseOrderItem[]

  // Финансы
  totalAmount: number
  taxAmount?: number
  discountAmount?: number

  // Платежи и доставка
  paymentTerms: PaymentTerms
  paymentStatus: PaymentStatus
  deliveryMethod: DeliveryMethod

  // Статус
  status: PurchaseOrderStatus

  // Связи
  requestIds: string[]
  receiptOperationId?: string
  accountTransactionId?: string

  // Документы
  hasExportedPdf?: boolean
  exportedAt?: string

  notes?: string
}

export interface PurchaseOrderItem {
  id: string
  itemId: string
  itemName: string
  orderedQuantity: number
  receivedQuantity?: number
  unit: string
  pricePerUnit: number
  totalPrice: number

  // Статус по товару
  status: 'ordered' | 'partially_received' | 'received' | 'cancelled'
  notes?: string
}

// Акцепт прихода товара
export interface ReceiptAcceptance extends BaseEntity {
  // Основная информация
  acceptanceNumber: string // "ACC-PO-001"
  purchaseOrderId: string
  supplierId: string

  // Даты
  deliveryDate: string
  acceptedBy: string

  // Товары
  items: AcceptanceItem[]

  // Расхождения
  hasDiscrepancies: boolean
  totalDiscrepancies: number
  totalValueDifference: number

  // Статус
  status: AcceptanceStatus

  // Результат
  storageOperationId?: string
  correctionOperationIds: string[]

  notes?: string
}

export interface AcceptanceItem {
  id: string
  purchaseOrderItemId: string
  itemId: string
  itemName: string

  // Количества
  orderedQuantity: number
  deliveredQuantity: number
  acceptedQuantity: number

  // Качество
  quality: QualityRating

  // Расхождения
  quantityDiscrepancy: number
  qualityIssues?: string

  // Финансы
  orderedPrice: number
  acceptedPrice?: number

  notes?: string
}

// DTO для создания
export interface CreateSupplierData {
  name: string
  type: SupplierType
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  products: string[]
  categories: string[]
  paymentTerms: PaymentTerms
  reliability: SupplierReliability
  isActive?: boolean
  notes?: string
}

export interface CreateProcurementRequestData {
  department: 'kitchen' | 'bar'
  requestedBy: string
  items: Omit<ProcurementRequestItem, 'id'>[]
  priority?: ProcurementPriority
  notes?: string
}

export interface CreatePurchaseOrderData {
  supplierId: string
  requestIds: string[]
  items: Omit<PurchaseOrderItem, 'id' | 'status'>[]
  expectedDeliveryDate?: string
  paymentTerms?: PaymentTerms
  deliveryMethod?: DeliveryMethod
  notes?: string
}

// Store State
export interface SupplierState {
  // Core data
  suppliers: Supplier[]
  procurementRequests: ProcurementRequest[]
  purchaseOrders: PurchaseOrder[]
  receiptAcceptances: ReceiptAcceptance[]

  // UI state
  loading: {
    suppliers: boolean
    requests: boolean
    orders: boolean
    acceptance: boolean
  }
  error: string | null

  // Current workflow
  currentRequest?: ProcurementRequest
  currentOrder?: PurchaseOrder
  currentAcceptance?: ReceiptAcceptance

  // Filters
  filters: {
    department: 'kitchen' | 'bar' | 'all'
    supplier: string | 'all'
    status: string | 'all'
    dateFrom?: string
    dateTo?: string
  }
}
