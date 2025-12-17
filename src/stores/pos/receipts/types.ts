// src/stores/pos/receipts/types.ts - POS Receipt Types
// Sprint 6: POS Receipt Module (ONLINE ONLY)

import type { TransactionPerformer } from '@/types/common'
import type { BillStatus } from '@/stores/supplier_2/types'

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

  // Payment info (populated from pendingPayments)
  hasPendingPayment?: boolean
  pendingPaymentId?: string
  pendingPaymentAmount?: number

  // Bill status (from order)
  billStatus?: BillStatus
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

// =============================================
// PAYMENT STATUS DISPLAY (Single Source of Truth)
// =============================================

/**
 * Payment status display info for UI
 */
export interface PaymentStatusDisplay {
  status: 'pending' | 'billed' | 'partially_paid' | 'fully_paid' | 'overdue' | 'no_payment'
  label: string
  shortLabel: string // For table view (compact)
  color: string
  icon: string
  description: string
}

/**
 * Get payment status display for an order
 * SINGLE SOURCE OF TRUTH for all views (table, dialog, widget)
 */
export function getPaymentStatusDisplay(order: PendingOrderForReceipt): PaymentStatusDisplay {
  // 1. Has actual pending payment ready to confirm
  if (order.hasPendingPayment) {
    return {
      status: 'pending',
      label: 'Pending Payment',
      shortLabel: 'Pending',
      color: 'orange',
      icon: 'mdi-cash-clock',
      description: 'A pending payment is ready to be confirmed upon receipt completion.'
    }
  }

  // 2. Check billStatus for orders without pending payment
  const billStatus = order.billStatus || 'not_billed'

  switch (billStatus) {
    case 'billed':
      return {
        status: 'billed',
        label: 'Billed (Not Paid)',
        shortLabel: 'Billed',
        color: 'warning',
        icon: 'mdi-receipt-text',
        description: 'Invoice created but not yet paid. Payment will be required.'
      }

    case 'partially_paid':
      return {
        status: 'partially_paid',
        label: 'Partially Paid',
        shortLabel: 'Partial',
        color: 'info',
        icon: 'mdi-cash-multiple',
        description: 'Some payments made. Remaining balance due upon receipt.'
      }

    case 'fully_paid':
      return {
        status: 'fully_paid',
        label: 'Fully Paid',
        shortLabel: 'Paid',
        color: 'success',
        icon: 'mdi-cash-check',
        description: 'Order is fully paid. No additional payment needed.'
      }

    case 'overdue':
      return {
        status: 'overdue',
        label: 'Overdue',
        shortLabel: 'Overdue',
        color: 'error',
        icon: 'mdi-alert-circle',
        description: 'Payment is overdue. Immediate payment required.'
      }

    case 'not_billed':
    default:
      return {
        status: 'no_payment',
        label: 'No Pre-payment',
        shortLabel: 'No Payment',
        color: 'grey',
        icon: 'mdi-cash-remove',
        description: 'No pending payment linked to this order. Payment can be added during receipt.'
      }
  }
}
