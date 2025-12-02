// src/stores/account/constants.ts
// Static constants for account store (categories, statuses, labels)

import type {
  DailyExpenseCategory,
  InvestmentCategory,
  OperationType,
  PaymentPriority,
  PaymentStatus,
  AmountChangeReason
} from './types'

// ============ DEPRECATED LEGACY CONSTANTS ============

/**
 * @deprecated Use getPOSCashAccountId() from './accountConfig' instead
 * This constant is kept for backwards compatibility only
 *
 * Legacy POS cash account ID (dev environment)
 */
export const POS_CASH_ACCOUNT_ID = 'acc_1'

// ============ EXPENSE CATEGORIES ============

/**
 * Expense category labels for display
 */
export const EXPENSE_CATEGORIES: Record<
  'daily' | 'investment',
  Record<DailyExpenseCategory | InvestmentCategory, string>
> = {
  daily: {
    product: 'Products',
    food_cost: 'Food Cost (Negative Batches)',
    inventory_variance: 'Inventory Variance (Reconciliation)',
    inventory_adjustment: 'Inventory Adjustment (Physical Count)',
    training_education: 'Training & Education',
    recipe_development: 'Recipe Development',
    marketing: 'Marketing',
    takeaway: 'Takeaway',
    ayu_cake: 'Ayu cake',
    utilities: 'Utilities',
    salary: 'Salary',
    renovation: 'Renovation',
    transport: 'Products Transport',
    cleaning: 'Cleaning',
    security: 'Security',
    village: 'Village',
    rent: 'Rent',
    other: 'Other'
  },
  investment: {
    shares: 'Shares',
    other: 'Other Investments'
  }
} as const

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
 * Payment priority labels for display (Russian)
 */
export const PAYMENT_PRIORITIES: Record<PaymentPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный'
} as const

// ============ PAYMENT STATUSES ============

/**
 * Payment status labels for display (Russian)
 */
export const PAYMENT_STATUSES: Record<PaymentStatus, string> = {
  pending: 'Ожидает оплаты',
  processing: 'В обработке',
  completed: 'Оплачен',
  failed: 'Ошибка',
  cancelled: 'Отменен'
} as const

// ============ PAYMENT CATEGORIES ============

/**
 * Payment category labels for display
 */
export const PAYMENT_CATEGORIES = {
  supplier: 'Supplier Payment',
  service: 'Service Payment',
  utilities: 'Utilities',
  salary: 'Salary',
  rent: 'Rent',
  maintenance: 'Maintenance',
  other: 'Other'
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
