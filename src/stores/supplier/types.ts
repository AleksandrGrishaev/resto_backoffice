// src/stores/supplier/types.ts - ENHANCED VERSION

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

// NEW: Bill/Invoice Types
export type BillStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
export type ConsolidationStatus = 'draft' | 'processed' | 'cancelled'

// Поставщик (existing)
export interface Supplier extends BaseEntity {
  name: string
  type: SupplierType
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  products: string[]
  categories: string[]
  paymentTerms: PaymentTerms
  totalOrders?: number
  totalOrderValue?: number
  averageOrderValue?: number
  lastOrderDate?: string
  reliability: SupplierReliability
  currentBalance: number
  totalPaid?: number
  totalDebt?: number
  isActive: boolean
  notes?: string
}

// NEW: Bill Entity
export interface Bill extends BaseEntity {
  // Identification
  billNumber: string // "BILL-MEAT-001"
  purchaseOrderId: string
  supplierId: string
  supplierName: string // cached

  // Financial details
  totalAmount: number
  taxAmount?: number
  discountAmount?: number
  finalAmount: number // calculated final amount

  // Payment terms
  paymentTerms: PaymentTerms
  issueDate: string
  dueDate: string

  // Status and tracking
  status: BillStatus
  paymentStatus: PaymentStatus

  // Integration
  accountTransactionId?: string // link to payment transaction

  // Metadata
  notes?: string
  issuedBy: string
  paidAt?: string
}

// NEW: Request Consolidation
export interface RequestConsolidation extends BaseEntity {
  // Basic info
  consolidationNumber: string // "CONS-001"
  consolidationDate: string
  consolidatedBy: string

  // Source requests
  sourceRequestIds: string[]
  departments: ('kitchen' | 'bar')[]

  // Consolidated items grouped by supplier
  supplierGroups: SupplierGroup[]

  // Status
  status: ConsolidationStatus

  // Results
  generatedOrderIds: string[]
  totalEstimatedValue: number
}

export interface SupplierGroup {
  supplierId: string
  supplierName: string
  items: ConsolidatedItem[]
  estimatedTotal: number
}

export interface ConsolidatedItem {
  itemId: string
  itemName: string
  unit: string

  // Quantities by department
  kitchenQuantity: number
  barQuantity: number
  totalQuantity: number

  // Source requests
  sourceRequests: {
    requestId: string
    requestNumber: string
    department: 'kitchen' | 'bar'
    quantity: number
    reason: string
  }[]

  // Pricing
  estimatedPrice?: number
  totalEstimatedCost?: number
}

// Enhanced Procurement Request
export interface ProcurementRequest extends BaseEntity {
  requestNumber: string
  department: 'kitchen' | 'bar'
  requestedBy: string
  requestDate: string
  items: ProcurementRequestItem[]
  suggestions?: OrderSuggestion[]
  status: ProcurementStatus
  priority: ProcurementPriority
  purchaseOrderIds: string[]

  // NEW: Enhanced tracking
  consolidationId?: string // If part of consolidation
  lastStatusChange?: string
  statusHistory?: StatusChange[]

  notes?: string
}

// NEW: Status tracking
export interface StatusChange {
  from: ProcurementStatus
  to: ProcurementStatus
  changedAt: string
  changedBy: string
  reason?: string
}

// Enhanced Purchase Order
export interface PurchaseOrder extends BaseEntity {
  orderNumber: string
  supplierId: string
  supplierName: string
  orderDate: string
  expectedDeliveryDate?: string
  actualDeliveryDate?: string
  items: PurchaseOrderItem[]
  totalAmount: number
  taxAmount?: number
  discountAmount?: number
  paymentTerms: PaymentTerms
  paymentStatus: PaymentStatus
  deliveryMethod: DeliveryMethod
  status: PurchaseOrderStatus
  requestIds: string[]

  // NEW: Enhanced tracking
  billId?: string // Link to bill
  consolidationId?: string // If created from consolidation
  statusHistory?: StatusChange[]

  receiptOperationId?: string
  accountTransactionId?: string
  hasExportedPdf?: boolean
  exportedAt?: string
  notes?: string
}

// Existing interfaces (unchanged)
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

export interface PurchaseOrderItem {
  id: string
  itemId: string
  itemName: string
  orderedQuantity: number
  receivedQuantity?: number
  unit: string
  pricePerUnit: number
  totalPrice: number
  status: 'ordered' | 'partially_received' | 'received' | 'cancelled'
  notes?: string
}

export interface ReceiptAcceptance extends BaseEntity {
  acceptanceNumber: string
  purchaseOrderId: string
  supplierId: string
  deliveryDate: string
  acceptedBy: string
  items: AcceptanceItem[]
  hasDiscrepancies: boolean
  totalDiscrepancies: number
  totalValueDifference: number
  status: AcceptanceStatus
  storageOperationId?: string
  correctionOperationIds: string[]
  notes?: string
}

export interface AcceptanceItem {
  id: string
  purchaseOrderItemId: string
  itemId: string
  itemName: string
  orderedQuantity: number
  deliveredQuantity: number
  acceptedQuantity: number
  quality: QualityRating
  quantityDiscrepancy: number
  qualityIssues?: string
  orderedPrice: number
  acceptedPrice?: number
  notes?: string
}

// NEW: Create DTOs
export interface CreateBillData {
  purchaseOrderId: string
  supplierId: string
  totalAmount: number
  paymentTerms: PaymentTerms
  dueDate: string
  notes?: string
  issuedBy: string
}

export interface CreateConsolidationData {
  requestIds: string[]
  consolidatedBy: string
  notes?: string
}

// Existing DTOs (unchanged)
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
  consolidationId?: string // NEW
  notes?: string
}

// Enhanced Store State
export interface SupplierState {
  // Core data
  suppliers: Supplier[]
  procurementRequests: ProcurementRequest[]
  purchaseOrders: PurchaseOrder[]
  receiptAcceptances: ReceiptAcceptance[]

  // NEW: Enhanced data
  bills: Bill[]
  consolidations: RequestConsolidation[]

  // UI state
  loading: {
    suppliers: boolean
    requests: boolean
    orders: boolean
    acceptance: boolean
    bills: boolean // NEW
    consolidation: boolean // NEW
    payment: boolean // NEW
  }
  error: string | null

  // Enhanced workflow state
  currentRequest?: ProcurementRequest
  currentOrder?: PurchaseOrder
  currentAcceptance?: ReceiptAcceptance
  currentConsolidation?: RequestConsolidation // NEW
  selectedRequestIds: string[] // NEW

  // Filters
  filters: {
    department: 'kitchen' | 'bar' | 'all'
    supplier: string | 'all'
    status: string | 'all'
    dateFrom?: string
    dateTo?: string
  }
}
