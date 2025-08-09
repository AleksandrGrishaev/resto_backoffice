// src/stores/supplier/index.ts - ENHANCED VERSION 2.0

// ============================================================================
// MAIN EXPORTS
// ============================================================================

// Store
export { useSupplierStore } from './supplierStore'

// Service
export { supplierService } from './supplierService'

// ============================================================================
// TYPE EXPORTS - ENHANCED WITH NEW TYPES
// ============================================================================

// Main Types
export type {
  Supplier,
  ProcurementRequest,
  PurchaseOrder,
  ReceiptAcceptance,
  SupplierState
} from './types'

// NEW: Enhanced Workflow Types
export type {
  Bill,
  RequestConsolidation,
  SupplierGroup,
  ConsolidatedItem,
  StatusChange
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
  CreatePurchaseOrderData,
  CreateBillData,
  CreateConsolidationData
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
  QualityRating,
  BillStatus,
  ConsolidationStatus
} from './types'

// ============================================================================
// MOCK DATA EXPORTS - ENHANCED
// ============================================================================

export {
  mockSuppliers,
  mockProcurementRequests,
  mockPurchaseOrders,
  mockReceiptAcceptances,
  generateMockSupplier
} from './supplierMock'

// NEW: Enhanced Mock Data
export {
  mockBills,
  mockConsolidations,
  generateMockBill,
  generateMockConsolidation,
  getEnhancedSupplierStatistics as getSupplierStatistics,
  getBillsByStatus,
  getOverdueBills,
  getConsolidationsByStatus,
  getRequestsReadyForConsolidation,
  getFinancialSummary
} from './supplierMock'

// ============================================================================
// CONSTANTS - ENHANCED WITH NEW CONSTANTS
// ============================================================================

// Existing Constants
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

// NEW: Enhanced Constants
export const BILL_STATUSES = {
  draft: 'Draft',
  issued: 'Issued',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled'
} as const

export const CONSOLIDATION_STATUSES = {
  draft: 'Draft',
  processed: 'Processed',
  cancelled: 'Cancelled'
} as const

export const WORKFLOW_STAGES = {
  request_created: 'Request Created',
  request_submitted: 'Request Submitted',
  request_approved: 'Request Approved',
  consolidated: 'Consolidated',
  order_created: 'Order Created',
  order_sent: 'Order Sent',
  order_confirmed: 'Order Confirmed',
  delivered: 'Delivered',
  accepted: 'Accepted',
  bill_issued: 'Bill Issued',
  bill_paid: 'Bill Paid'
} as const

export const FINANCIAL_TERMS = {
  we_owe: 'We Owe',
  they_owe: 'They Owe',
  balanced: 'Balanced',
  credit: 'Credit',
  debt: 'Debt'
} as const

// ============================================================================
// UTILITY FUNCTIONS - ENHANCED
// ============================================================================

// Existing Display Name Functions
export function getSupplierTypeName(type: keyof typeof SUPPLIER_TYPES): string {
  return SUPPLIER_TYPES[type] || type
}

export function getPaymentTermsName(terms: keyof typeof PAYMENT_TERMS): string {
  return PAYMENT_TERMS[terms] || terms
}

export function getReliabilityName(level: keyof typeof RELIABILITY_LEVELS): string {
  return RELIABILITY_LEVELS[level] || level
}

export function getProcurementStatusName(status: keyof typeof PROCUREMENT_STATUSES): string {
  return PROCUREMENT_STATUSES[status] || status
}

export function getPurchaseOrderStatusName(status: keyof typeof PURCHASE_ORDER_STATUSES): string {
  return PURCHASE_ORDER_STATUSES[status] || status
}

export function getPaymentStatusName(status: keyof typeof PAYMENT_STATUSES): string {
  return PAYMENT_STATUSES[status] || status
}

export function getAcceptanceStatusName(status: keyof typeof ACCEPTANCE_STATUSES): string {
  return ACCEPTANCE_STATUSES[status] || status
}

// NEW: Enhanced Display Name Functions
export function getBillStatusName(status: keyof typeof BILL_STATUSES): string {
  return BILL_STATUSES[status] || status
}

export function getConsolidationStatusName(status: keyof typeof CONSOLIDATION_STATUSES): string {
  return CONSOLIDATION_STATUSES[status] || status
}

export function getWorkflowStageName(stage: keyof typeof WORKFLOW_STAGES): string {
  return WORKFLOW_STAGES[stage] || stage
}

export function getQualityRatingName(rating: keyof typeof QUALITY_RATINGS): string {
  return QUALITY_RATINGS[rating] || rating
}

// Color Functions - Existing
export function getReliabilityColor(level: keyof typeof RELIABILITY_LEVELS): string {
  const colors = {
    excellent: 'success',
    good: 'info',
    average: 'warning',
    poor: 'error'
  }
  return colors[level] || 'default'
}

export function getProcurementPriorityColor(priority: keyof typeof PROCUREMENT_PRIORITIES): string {
  const colors = {
    low: 'info',
    normal: 'default',
    urgent: 'error'
  }
  return colors[priority] || 'default'
}

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

export function getPaymentStatusColor(status: keyof typeof PAYMENT_STATUSES): string {
  const colors = {
    pending: 'warning',
    partial: 'info',
    paid: 'success'
  }
  return colors[status] || 'default'
}

export function getAcceptanceStatusColor(status: keyof typeof ACCEPTANCE_STATUSES): string {
  const colors = {
    draft: 'warning',
    accepted: 'success',
    rejected: 'error'
  }
  return colors[status] || 'default'
}

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

// NEW: Enhanced Color Functions
export function getBillStatusColor(status: keyof typeof BILL_STATUSES): string {
  const colors = {
    draft: 'default',
    issued: 'warning',
    paid: 'success',
    overdue: 'error',
    cancelled: 'error'
  }
  return colors[status] || 'default'
}

export function getConsolidationStatusColor(status: keyof typeof CONSOLIDATION_STATUSES): string {
  const colors = {
    draft: 'warning',
    processed: 'success',
    cancelled: 'error'
  }
  return colors[status] || 'default'
}

export function getWorkflowStageColor(stage: keyof typeof WORKFLOW_STAGES): string {
  const colors = {
    request_created: 'info',
    request_submitted: 'warning',
    request_approved: 'primary',
    consolidated: 'secondary',
    order_created: 'info',
    order_sent: 'warning',
    order_confirmed: 'primary',
    delivered: 'success',
    accepted: 'success',
    bill_issued: 'warning',
    bill_paid: 'success'
  }
  return colors[stage] || 'default'
}

// NEW: Financial Helper Functions
export function getBalanceColor(balance: number): string {
  if (balance < 0) return 'error' // we owe them
  if (balance > 0) return 'success' // they owe us
  return 'default'
}

export function getBalanceDescription(balance: number): string {
  if (balance < 0) return FINANCIAL_TERMS.we_owe
  if (balance > 0) return FINANCIAL_TERMS.they_owe
  return FINANCIAL_TERMS.balanced
}

export function getDebtAmount(balance: number): number {
  return Math.abs(Math.min(0, balance))
}

export function getCreditAmount(balance: number): number {
  return Math.max(0, balance)
}

export function isSupplierDebt(balance: number): boolean {
  return balance < 0 // negative balance means we owe them
}

// Other Helper Functions - Existing
export function getDeliveryMethodName(method: keyof typeof DELIVERY_METHODS): string {
  return DELIVERY_METHODS[method] || method
}

export function getProductCategoryName(category: keyof typeof PRODUCT_CATEGORIES): string {
  return PRODUCT_CATEGORIES[category] || category
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getSupplierIcon(type: keyof typeof SUPPLIER_TYPES): string {
  const icons = {
    local: '🏪',
    wholesale: '🏭',
    online: '💻',
    other: '🏬'
  }
  return icons[type] || '🏬'
}

// NEW: Enhanced Utility Functions
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  } else {
    return 'Just now'
  }
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

export function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  const diffMs = now.getTime() - due.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function calculateDueDate(
  issueDate: string,
  paymentTerms: keyof typeof PAYMENT_TERMS
): string {
  const date = new Date(issueDate)

  switch (paymentTerms) {
    case 'prepaid':
      return date.toISOString() // Immediate
    case 'on_delivery':
      date.setDate(date.getDate() + 7) // 7 days
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1) // 30 days
      break
    case 'custom':
      date.setDate(date.getDate() + 14) // Default 14 days
      break
  }

  return date.toISOString()
}

export function getPaymentTermsDays(terms: keyof typeof PAYMENT_TERMS): number {
  const days = {
    prepaid: 0,
    on_delivery: 7,
    monthly: 30,
    custom: 14
  }
  return days[terms] || 0
}

// NEW: Workflow Helper Functions
export function getWorkflowProgress(currentStage: keyof typeof WORKFLOW_STAGES): number {
  const stages = Object.keys(WORKFLOW_STAGES)
  const currentIndex = stages.indexOf(currentStage)
  return ((currentIndex + 1) / stages.length) * 100
}

export function getNextWorkflowStage(
  currentStage: keyof typeof WORKFLOW_STAGES
): keyof typeof WORKFLOW_STAGES | null {
  const stages = Object.keys(WORKFLOW_STAGES) as (keyof typeof WORKFLOW_STAGES)[]
  const currentIndex = stages.indexOf(currentStage)
  return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null
}

export function canTransitionTo(
  from: keyof typeof WORKFLOW_STAGES,
  to: keyof typeof WORKFLOW_STAGES
): boolean {
  const stages = Object.keys(WORKFLOW_STAGES) as (keyof typeof WORKFLOW_STAGES)[]
  const fromIndex = stages.indexOf(from)
  const toIndex = stages.indexOf(to)

  // Can only go forward, or to any previous stage (for corrections)
  return toIndex >= fromIndex || toIndex < fromIndex
}

// ============================================================================
// VALIDATION HELPERS - ENHANCED
// ============================================================================

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

// NEW: Enhanced Validation Functions
export function validateBillData(data: Partial<CreateBillData>): string[] {
  const errors: string[] = []

  if (!data.purchaseOrderId) {
    errors.push('Purchase order ID is required')
  }

  if (!data.supplierId) {
    errors.push('Supplier ID is required')
  }

  if (!data.totalAmount || data.totalAmount <= 0) {
    errors.push('Valid total amount is required')
  }

  if (!data.paymentTerms) {
    errors.push('Payment terms are required')
  }

  if (!data.dueDate) {
    errors.push('Due date is required')
  }

  if (!data.issuedBy?.trim()) {
    errors.push('Issued by field is required')
  }

  return errors
}

export function validateConsolidationData(data: Partial<CreateConsolidationData>): string[] {
  const errors: string[] = []

  if (!data.requestIds || data.requestIds.length === 0) {
    errors.push('At least one request is required for consolidation')
  }

  if (!data.consolidatedBy?.trim()) {
    errors.push('Consolidated by field is required')
  }

  return errors
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// ============================================================================
// ADVANCED HELPER FUNCTIONS
// ============================================================================

export function groupItemsBySupplier<T extends { itemId: string }>(
  items: T[],
  suppliers: Supplier[]
): Map<string, T[]> {
  const groupedItems = new Map<string, T[]>()

  items.forEach(item => {
    const supplier = suppliers.find(s => s.products.includes(item.itemId))
    if (supplier) {
      if (!groupedItems.has(supplier.id)) {
        groupedItems.set(supplier.id, [])
      }
      groupedItems.get(supplier.id)!.push(item)
    }
  })

  return groupedItems
}

export function calculateOrderTotal(
  items: PurchaseOrderItem[],
  taxRate: number = 0.11
): {
  subtotal: number
  tax: number
  total: number
} {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const tax = subtotal * taxRate
  const total = subtotal + tax

  return { subtotal, tax, total }
}

export function getSupplierPerformanceScore(supplier: Supplier): number {
  const reliabilityScore =
    {
      excellent: 100,
      good: 80,
      average: 60,
      poor: 40
    }[supplier.reliability] || 0

  const balanceScore = supplier.currentBalance >= 0 ? 100 : 70 // Penalty for debt
  const activityScore = supplier.totalOrders && supplier.totalOrders > 0 ? 100 : 50

  return Math.round((reliabilityScore + balanceScore + activityScore) / 3)
}

export function suggestPaymentTerms(supplier: Supplier): keyof typeof PAYMENT_TERMS {
  if (supplier.reliability === 'excellent') return 'monthly'
  if (supplier.reliability === 'good') return 'on_delivery'
  return 'prepaid'
}

// ============================================================================
// ENHANCED STATISTICS AND REPORTING
// ============================================================================

export function calculateSupplierMetrics(suppliers: Supplier[]) {
  const active = suppliers.filter(s => s.isActive)
  const totalValue = suppliers.reduce((sum, s) => sum + (s.totalOrderValue || 0), 0)
  const avgReliability =
    suppliers.reduce((sum, s) => {
      const score = { excellent: 4, good: 3, average: 2, poor: 1 }[s.reliability]
      return sum + score
    }, 0) / suppliers.length

  return {
    total: suppliers.length,
    active: active.length,
    inactive: suppliers.length - active.length,
    totalValue,
    averageValue: totalValue / suppliers.length || 0,
    averageReliability: avgReliability || 0,
    byType: suppliers.reduce(
      (acc, s) => {
        acc[s.type] = (acc[s.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    ),
    byReliability: suppliers.reduce(
      (acc, s) => {
        acc[s.reliability] = (acc[s.reliability] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }
}

// ============================================================================
// CONSOLIDATED EXPORT OBJECT (Optional - for easier importing)
// ============================================================================

export const SupplierUtils = {
  // Display functions
  getSupplierTypeName,
  getPaymentTermsName,
  getReliabilityName,
  getProcurementStatusName,
  getPurchaseOrderStatusName,
  getPaymentStatusName,
  getAcceptanceStatusName,
  getBillStatusName,
  getConsolidationStatusName,
  getWorkflowStageName,
  getQualityRatingName,

  // Color functions
  getReliabilityColor,
  getProcurementPriorityColor,
  getPurchaseOrderStatusColor,
  getPaymentStatusColor,
  getAcceptanceStatusColor,
  getQualityRatingColor,
  getBillStatusColor,
  getConsolidationStatusColor,
  getWorkflowStageColor,

  // Financial functions
  getBalanceColor,
  getBalanceDescription,
  getDebtAmount,
  getCreditAmount,
  isSupplierDebt,

  // Format functions
  formatCurrency,
  formatDate,
  formatDateTime,
  getRelativeTime,

  // Validation functions
  validateSupplierData,
  validateProcurementRequestData,
  validateBillData,
  validateConsolidationData,

  // Utility functions
  getSupplierIcon,
  isOverdue,
  getDaysOverdue,
  calculateDueDate,
  getPaymentTermsDays,
  getWorkflowProgress,
  getNextWorkflowStage,
  canTransitionTo,

  // Advanced functions
  groupItemsBySupplier,
  calculateOrderTotal,
  getSupplierPerformanceScore,
  suggestPaymentTerms,
  calculateSupplierMetrics
}

export default SupplierUtils
