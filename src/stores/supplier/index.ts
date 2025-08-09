// src/stores/supplier/index.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ

// ============================================================================
// MAIN EXPORTS
// ============================================================================

// Store
export { useSupplierStore } from './supplierStore'

// Service
export { supplierService } from './supplierService'

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Main Types
export type {
  Supplier,
  ProcurementRequest,
  PurchaseOrder,
  ReceiptAcceptance,
  SupplierState
} from './types'

// Item Types
export type {
  ProcurementRequestItem,
  PurchaseOrderItem,
  AcceptanceItem,
  OrderSuggestion
} from './types'

// DTO Types
export type {
  CreateSupplierData,
  CreateProcurementRequestData,
  CreatePurchaseOrderData
} from './types'

// Enum Types
export type {
  PaymentTerms,
  SupplierType,
  SupplierReliability,
  ProcurementStatus,
  ProcurementPriority,
  PurchaseOrderStatus,
  PaymentStatus,
  DeliveryMethod,
  AcceptanceStatus,
  QualityRating
} from './types'

// ============================================================================
// MOCK DATA EXPORTS
// ============================================================================

export {
  mockSuppliers,
  mockProcurementRequests,
  mockPurchaseOrders,
  mockReceiptAcceptances,
  generateMockSupplier,
  getSupplierStatistics
} from './supplierMock'

// ============================================================================
// CONSTANTS
// ============================================================================

export const SUPPLIER_TYPES = {
  local: 'Local Supplier',
  wholesale: 'Wholesale Distributor',
  online: 'Online Supplier',
  other: 'Other'
} as const

export const PAYMENT_TERMS = {
  prepaid: 'Prepaid',
  on_delivery: 'On Delivery',
  monthly: 'Monthly Terms',
  custom: 'Custom Terms'
} as const

export const RELIABILITY_LEVELS = {
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
  poor: 'Poor'
} as const

export const PROCUREMENT_STATUSES = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  converted: 'Converted to Order',
  cancelled: 'Cancelled'
} as const

export const PROCUREMENT_PRIORITIES = {
  low: 'Low Priority',
  normal: 'Normal Priority',
  urgent: 'Urgent'
} as const

export const PURCHASE_ORDER_STATUSES = {
  draft: 'Draft',
  sent: 'Sent to Supplier',
  confirmed: 'Confirmed',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
} as const

export const PAYMENT_STATUSES = {
  pending: 'Payment Pending',
  partial: 'Partially Paid',
  paid: 'Fully Paid'
} as const

export const DELIVERY_METHODS = {
  pickup: 'Pickup',
  delivery: 'Delivery'
} as const

export const ACCEPTANCE_STATUSES = {
  draft: 'Draft',
  accepted: 'Accepted',
  rejected: 'Rejected'
} as const

export const QUALITY_RATINGS = {
  excellent: 'Excellent',
  good: 'Good',
  acceptable: 'Acceptable',
  poor: 'Poor',
  rejected: 'Rejected'
} as const

export const PRODUCT_CATEGORIES = {
  meat: 'Meat & Poultry',
  vegetables: 'Vegetables',
  dairy: 'Dairy Products',
  beverages: 'Beverages',
  spices: 'Spices & Seasonings',
  other: 'Other Ingredients'
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get display name for supplier type
 */
export function getSupplierTypeName(type: keyof typeof SUPPLIER_TYPES): string {
  return SUPPLIER_TYPES[type] || type
}

/**
 * Get display name for payment terms
 */
export function getPaymentTermsName(terms: keyof typeof PAYMENT_TERMS): string {
  return PAYMENT_TERMS[terms] || terms
}

/**
 * Get display name for reliability level
 */
export function getReliabilityName(level: keyof typeof RELIABILITY_LEVELS): string {
  return RELIABILITY_LEVELS[level] || level
}

/**
 * Get display name for procurement status
 */
export function getProcurementStatusName(status: keyof typeof PROCUREMENT_STATUSES): string {
  return PROCUREMENT_STATUSES[status] || status
}

/**
 * Get display name for purchase order status
 */
export function getPurchaseOrderStatusName(status: keyof typeof PURCHASE_ORDER_STATUSES): string {
  return PURCHASE_ORDER_STATUSES[status] || status
}

/**
 * Get display name for payment status - ДОБАВЛЕНО
 */
export function getPaymentStatusName(status: keyof typeof PAYMENT_STATUSES): string {
  return PAYMENT_STATUSES[status] || status
}

/**
 * Get display name for acceptance status - ДОБАВЛЕНО
 */
export function getAcceptanceStatusName(status: keyof typeof ACCEPTANCE_STATUSES): string {
  return ACCEPTANCE_STATUSES[status] || status
}

/**
 * Get color for reliability level
 */
export function getReliabilityColor(level: keyof typeof RELIABILITY_LEVELS): string {
  const colors = {
    excellent: 'success',
    good: 'info',
    average: 'warning',
    poor: 'error'
  }
  return colors[level] || 'default'
}

/**
 * Get color for procurement priority
 */
export function getProcurementPriorityColor(priority: keyof typeof PROCUREMENT_PRIORITIES): string {
  const colors = {
    low: 'info',
    normal: 'default',
    urgent: 'error'
  }
  return colors[priority] || 'default'
}

/**
 * Get color for purchase order status
 */
export function getPurchaseOrderStatusColor(status: keyof typeof PURCHASE_ORDER_STATUSES): string {
  const colors = {
    draft: 'default',
    sent: 'warning',
    confirmed: 'info',
    in_transit: 'primary',
    delivered: 'success',
    cancelled: 'error'
  }
  return colors[status] || 'default'
}

/**
 * Get color for payment status - ДОБАВЛЕНО
 */
export function getPaymentStatusColor(status: keyof typeof PAYMENT_STATUSES): string {
  const colors = {
    pending: 'warning',
    partial: 'info',
    paid: 'success'
  }
  return colors[status] || 'default'
}

/**
 * Get color for acceptance status - ДОБАВЛЕНО
 */
export function getAcceptanceStatusColor(status: keyof typeof ACCEPTANCE_STATUSES): string {
  const colors = {
    draft: 'warning',
    accepted: 'success',
    rejected: 'error'
  }
  return colors[status] || 'default'
}

/**
 * Get color for quality rating - ДОБАВЛЕНО
 */
export function getQualityRatingColor(quality: keyof typeof QUALITY_RATINGS): string {
  const colors = {
    excellent: 'success',
    good: 'info',
    acceptable: 'warning',
    poor: 'error',
    rejected: 'error'
  }
  return colors[quality] || 'default'
}

/**
 * Get display name for delivery method - ДОБАВЛЕНО
 */
export function getDeliveryMethodName(method: keyof typeof DELIVERY_METHODS): string {
  return DELIVERY_METHODS[method] || method
}

/**
 * Get display name for product category - ДОБАВЛЕНО
 */
export function getProductCategoryName(category: keyof typeof PRODUCT_CATEGORIES): string {
  return PRODUCT_CATEGORIES[category] || category
}

/**
 * Format currency for Indonesian Rupiah
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format datetime for display
 */
export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Get supplier icon based on type
 */
export function getSupplierIcon(type: keyof typeof SUPPLIER_TYPES): string {
  const icons = {
    local: '🏪',
    wholesale: '🏭',
    online: '💻',
    other: '🏬'
  }
  return icons[type] || '🏬'
}

/**
 * Check if supplier balance indicates debt
 */
export function isSupplierDebt(balance: number): boolean {
  return balance < 0 // negative balance means we owe them
}

/**
 * Get absolute debt amount
 */
export function getDebtAmount(balance: number): number {
  return Math.abs(Math.min(0, balance))
}

/**
 * Get credit amount (they owe us)
 */
export function getCreditAmount(balance: number): number {
  return Math.max(0, balance)
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate supplier data
 */
export function validateSupplierData(data: Partial<CreateSupplierData>): string[] {
  const errors: string[] = []

  if (!data.name?.trim()) {
    errors.push('Supplier name is required')
  }

  if (!data.type) {
    errors.push('Supplier type is required')
  }

  if (!data.paymentTerms) {
    errors.push('Payment terms are required')
  }

  if (!data.reliability) {
    errors.push('Reliability rating is required')
  }

  if (!data.categories || data.categories.length === 0) {
    errors.push('At least one product category is required')
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push('Invalid email address')
  }

  return errors
}

/**
 * Validate procurement request data
 */
export function validateProcurementRequestData(
  data: Partial<CreateProcurementRequestData>
): string[] {
  const errors: string[] = []

  if (!data.department) {
    errors.push('Department is required')
  }

  if (!data.requestedBy?.trim()) {
    errors.push('Requested by field is required')
  }

  if (!data.items || data.items.length === 0) {
    errors.push('At least one item is required')
  }

  data.items?.forEach((item, index) => {
    if (!item.itemId) {
      errors.push(`Item ${index + 1}: Product selection is required`)
    }
    if (!item.requestedQuantity || item.requestedQuantity <= 0) {
      errors.push(`Item ${index + 1}: Valid quantity is required`)
    }
  })

  return errors
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ============================================================================
// DEFAULT EXPORTS - УБИРАЕМ ПРОБЛЕМНЫЙ DEFAULT EXPORT
// ============================================================================

// Используем только named exports для избежания проблем с модульной системой
// Все необходимые экспорты уже доступны как named exports выше
