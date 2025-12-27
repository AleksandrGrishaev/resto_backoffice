// src/stores/alerts/types.ts
// Operations Alert System - Types and Constants

// =============================================
// ALERT CATEGORIES
// =============================================

export type AlertCategory = 'shift' | 'account' | 'product' | 'supplier'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type AlertStatus = 'new' | 'viewed' | 'acknowledged' | 'resolved'

// =============================================
// ALERT TYPES BY CATEGORY
// =============================================

// Shift-related alert types
export type ShiftAlertType =
  | 'pre_bill_modified' // Changes after pre-bill print
  | 'cash_discrepancy' // Cash count doesn't match expected
  | 'large_refund' // Refund above threshold
  | 'suspicious_activity' // Other suspicious patterns

// Account-related alert types
export type AccountAlertType =
  | 'manual_correction' // Manual balance adjustment
  | 'balance_discrepancy' // Calculated vs actual mismatch
  | 'unusual_transfer' // Atypical transfer between accounts

// Product-related alert types
export type ProductAlertType =
  | 'high_cancellation' // Many cancellations in a shift
  | 'write_off_threshold' // Write-off above normal
  | 'negative_inventory' // Negative stock detected

// Supplier-related alert types
export type SupplierAlertType =
  | 'payment_discrepancy' // Payment doesn't match invoice
  | 'overdue_delivery' // Delivery not received on time

export type AlertType = ShiftAlertType | AccountAlertType | ProductAlertType | SupplierAlertType

// =============================================
// MAIN INTERFACES
// =============================================

export interface OperationAlert {
  id: string
  category: AlertCategory
  type: AlertType
  severity: AlertSeverity
  title: string
  description?: string
  metadata?: Record<string, any>

  // Context references
  shiftId?: string
  orderId?: string
  billId?: string
  userId?: string // Who triggered the alert (cashier)

  // Status workflow
  status: AlertStatus
  acknowledgedBy?: string // Manager who acknowledged
  acknowledgedAt?: string
  resolvedBy?: string
  resolvedAt?: string
  resolutionNotes?: string

  // Timestamps
  createdAt: string
  updatedAt: string
}

// For creating new alerts
export interface CreateAlertPayload {
  category: AlertCategory
  type: AlertType
  severity: AlertSeverity
  title: string
  description?: string
  metadata?: Record<string, any>
  shiftId?: string
  orderId?: string
  billId?: string
  userId?: string
}

// =============================================
// ALERT COUNTS
// =============================================

export interface CategoryAlertCounts {
  critical: number
  warning: number
  info: number
  total: number
}

export interface AlertCounts {
  shift: CategoryAlertCounts
  account: CategoryAlertCounts
  product: CategoryAlertCounts
  supplier: CategoryAlertCounts
  total: number
  newCount: number
}

// =============================================
// FILTERS
// =============================================

export interface AlertFilters {
  category?: AlertCategory
  severity?: AlertSeverity
  status?: AlertStatus
  shiftId?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}

// =============================================
// CONSTANTS - COLORS
// =============================================

export const ALERT_COLORS: Record<AlertCategory, string> = {
  shift: '#9C27B0', // Purple
  account: '#FF9800', // Orange
  product: '#009688', // Teal
  supplier: '#2196F3' // Blue
}

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: '#F44336', // Red
  warning: '#FF9800', // Orange
  info: '#2196F3' // Blue
}

// =============================================
// CONSTANTS - ICONS
// =============================================

export const ALERT_ICONS: Record<AlertCategory, string> = {
  shift: 'mdi-clock-alert',
  account: 'mdi-bank-alert',
  product: 'mdi-package-variant-closed-alert',
  supplier: 'mdi-truck-alert'
}

export const ALERT_SEVERITY_ICONS: Record<AlertSeverity, string> = {
  critical: 'mdi-alert-circle',
  warning: 'mdi-alert',
  info: 'mdi-information'
}

// =============================================
// CONSTANTS - LABELS
// =============================================

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  shift: 'Shift',
  account: 'Account',
  product: 'Product',
  supplier: 'Supplier'
}

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info'
}

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  new: 'New',
  viewed: 'Viewed',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved'
}

// Alert type labels for display
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  // Shift
  pre_bill_modified: 'Pre-bill Modified',
  cash_discrepancy: 'Cash Discrepancy',
  large_refund: 'Large Refund',
  suspicious_activity: 'Suspicious Activity',
  // Account
  manual_correction: 'Manual Correction',
  balance_discrepancy: 'Balance Discrepancy',
  unusual_transfer: 'Unusual Transfer',
  // Product
  high_cancellation: 'High Cancellation Rate',
  write_off_threshold: 'Write-off Threshold',
  negative_inventory: 'Negative Inventory',
  // Supplier
  payment_discrepancy: 'Payment Discrepancy',
  overdue_delivery: 'Overdue Delivery'
}

// =============================================
// THRESHOLDS (configurable)
// =============================================

export const ALERT_THRESHOLDS = {
  // Shift
  largeRefundAmount: 500000, // IDR - refunds above this trigger alert
  // Product
  highCancellationCount: 5, // More than this per shift
  writeOffPercentage: 10, // % of inventory written off
  // Account
  unusualTransferAmount: 5000000 // IDR - transfers above this
}
