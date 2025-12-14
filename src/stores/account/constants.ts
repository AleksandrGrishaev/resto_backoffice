// src/stores/account/constants.ts
// Static constants for account store (categories, statuses, labels)

import type { OperationType, PaymentPriority, PaymentStatus, AmountChangeReason } from './types'

// ============ DEPRECATED LEGACY CONSTANTS ============

/**
 * @deprecated Use getPOSCashAccountId() from './accountConfig' instead
 * This constant is kept for backwards compatibility only
 *
 * Legacy POS cash account ID (dev environment)
 */
export const POS_CASH_ACCOUNT_ID = 'acc_1'

// ============ COGS CATEGORIES (HARDCODED) ============

/**
 * COGS (Cost of Goods Sold) category labels
 * These categories are NOT stored in transaction_categories table
 * They are used for P&L calculations and inventory write-offs
 */
export const COGS_CATEGORY_LABELS: Record<string, string> = {
  product: 'Products',
  food_cost: 'Food Cost (Negative Batches)',
  inventory_variance: 'Inventory Variance (Reconciliation)',
  inventory_adjustment: 'Inventory Adjustment (Physical Count)',
  training_education: 'Training & Education',
  recipe_development: 'Recipe Development'
} as const

/**
 * List of COGS category codes for type checking
 */
export const COGS_CATEGORY_CODES = [
  'product',
  'food_cost',
  'inventory_variance',
  'inventory_adjustment',
  'training_education',
  'recipe_development'
] as const

export type COGSCategoryCode = (typeof COGS_CATEGORY_CODES)[number]

/**
 * Check if a category code is a COGS category
 */
export function isCOGSCategory(code: string): code is COGSCategoryCode {
  return COGS_CATEGORY_CODES.includes(code as COGSCategoryCode)
}

// ============ OPERATION TYPES ============

/**
 * Operation type labels for display
 */
export const OPERATION_TYPES: Record<OperationType, string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
  correction: 'Correction'
} as const

// ============ PAYMENT PRIORITIES ============

/**
 * Payment priority labels for display
 */
export const PAYMENT_PRIORITIES: Record<PaymentPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
} as const

// ============ PAYMENT STATUSES ============

/**
 * Payment status labels for display
 */
export const PAYMENT_STATUSES: Record<PaymentStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Paid',
  failed: 'Failed',
  cancelled: 'Cancelled'
} as const

// ============ AMOUNT CHANGE REASONS ============

/**
 * Amount change reason labels for display
 */
export const AMOUNT_CHANGE_REASONS: Record<AmountChangeReason, string> = {
  original_order: 'Original Order Amount',
  receipt_discrepancy: 'Receipt Discrepancy Adjustment',
  manual_adjustment: 'Manual Adjustment',
  supplier_credit: 'Supplier Credit',
  payment_split: 'Payment Split',
  order_cancellation: 'Order Cancellation',
  other: 'Other'
} as const
