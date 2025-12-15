// src/stores/pos/receipts/types.ts - POS Receipt Types
// Sprint 6: POS Receipt Module (ONLINE ONLY)

import type { TransactionPerformer } from '@/types/common'

// =============================================
// PENDING ORDERS FOR RECEIPT
// =============================================

/**
 * Order ready for receipt (from supplierstore_orders)
 * Only orders with status='sent' and payment_terms='on_delivery'
 */
export interface PendingOrderForReceipt {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
  totalAmount: number
  isEstimatedTotal: boolean
  createdAt: string
  items: PendingOrderItem[]
}

/**
 * Order item ready for receipt
 */
export interface PendingOrderItem {
  id: string
  productId: string
  productName: string
  unit: string
  quantity: number
  price: number
  total: number

  // Package info (from supplierstore_order_items)
  packageId?: string
  packageName?: string
  packageUnit?: string
  packageQuantity?: number
  packagePrice?: number
  pricePerUnit?: number // base cost per unit (gram, kg, etc.)
}

// =============================================
// RECEIPT FORM STATE (LOCAL UI)
// =============================================

/**
 * Receipt form state - pre-filled from order, editable by cashier
 */
export interface ReceiptFormData {
  orderId: string
  orderNumber: string
  supplierId: string
  supplierName: string
  items: ReceiptFormItem[]

  // Totals
  expectedTotal: number // From order
  actualTotal: number // Calculated from actual items
  hasDiscrepancies: boolean

  // Payment (optional)
  paymentAmount?: number
  paymentNotes?: string
}

/**
 * Receipt form item - editable by cashier
 * Enhanced with package support (matches backoffice EditableReceiptItemsWidget)
 */
export interface ReceiptFormItem {
  orderItemId: string
  productId: string
  productName: string
  unit: string // base unit (gram, kg, piece, etc.)

  // Package info (optional - for package-based items)
  packageId?: string
  packageName?: string
  packageUnit?: string // e.g., "bags", "boxes"
  packageSize?: number // base units per package

  // Ordered values (from order, readonly)
  orderedQuantity: number // in base units
  orderedPackageQuantity?: number
  orderedPrice: number // price per package
  orderedBaseCost: number // price per base unit
  orderedTotal: number

  // Actual/Received values (editable by cashier)
  receivedQuantity: number // in base units (calculated from packages)
  receivedPackageQuantity?: number // editable by cashier
  actualPrice?: number // price per package (if changed)
  actualBaseCost?: number // price per base unit (calculated from actualPrice)
  actualTotal: number // Calculated or manually adjusted (for market rounding)
  actualLineTotal?: number // Manual override for market rounding

  // Discrepancy indicator
  hasDiscrepancy: boolean // true if received != ordered OR price changed
  discrepancyType?: 'quantity' | 'price' | 'both' | 'none'
}

// =============================================
// RECEIPT COMPLETION
// =============================================

/**
 * Receipt completion options
 */
export interface CompleteReceiptOptions {
  items: ReceiptItemUpdate[]
  paymentAmount?: number
  paymentNotes?: string
  performedBy: TransactionPerformer
}

/**
 * Item update for receipt completion
 */
export interface ReceiptItemUpdate {
  productId: string
  receivedQuantity: number
  actualPrice: number
}

// =============================================
// PAYMENT SCENARIOS
// =============================================

/**
 * Payment scenario at receipt
 * A1: Confirm existing pending payment
 * A2: Create linked expense (online, no pending payment)
 * B: Create unlinked expense (offline)
 */
export type PaymentScenario = 'confirm_pending' | 'create_linked' | 'create_unlinked'

/**
 * Payment scenario result
 */
export interface PaymentScenarioResult {
  scenario: PaymentScenario
  expenseId?: string
  pendingPaymentId?: string
  linkedOrderId?: string
  amount: number
  success: boolean
  error?: string
}

// =============================================
// SERVICE RESPONSE
// =============================================

export interface PosReceiptServiceResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}
