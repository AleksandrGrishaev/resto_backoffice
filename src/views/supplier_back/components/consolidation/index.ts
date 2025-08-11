// src/views/supplier/components/consolidation/index.ts
// Enhanced Index - Export all consolidation components and utilities

// ===========================
// CORE CONSOLIDATION COMPONENTS
// ===========================

// Main workflow component
export { default as NewOrdersTab } from './NewOrdersTab.vue'

// Step components
export { default as RequestSelectionCard } from './RequestSelectionCard.vue'
export { default as ConsolidationPreviewCard } from './ConsolidationPreviewCard.vue'
export { default as BillsManagementCard } from './BillsManagementCard.vue'

// ===========================
// WORKFLOW UTILITIES
// ===========================

// Consolidation workflow constants
export const CONSOLIDATION_WORKFLOW_STEPS = {
  SELECT_REQUESTS: 1,
  REVIEW_CONSOLIDATION: 2,
  ORDERS_CREATED: 3,
  BILLS_MANAGEMENT: 4
} as const

export type ConsolidationWorkflowStep =
  (typeof CONSOLIDATION_WORKFLOW_STEPS)[keyof typeof CONSOLIDATION_WORKFLOW_STEPS]

// Consolidation status constants
export const CONSOLIDATION_STATUSES = {
  DRAFT: 'draft',
  PROCESSED: 'processed',
  CANCELLED: 'cancelled'
} as const

export type ConsolidationStatus =
  (typeof CONSOLIDATION_STATUSES)[keyof typeof CONSOLIDATION_STATUSES]

// Bill status constants
export const BILL_STATUSES = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
} as const

export type BillStatus = (typeof BILL_STATUSES)[keyof typeof BILL_STATUSES]

// Payment status constants
export const PAYMENT_STATUSES = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid'
} as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES]

// ===========================
// CONSOLIDATION HELPERS
// ===========================

/**
 * Get consolidation workflow step name
 */
export function getConsolidationStepName(step: ConsolidationWorkflowStep): string {
  const names = {
    [CONSOLIDATION_WORKFLOW_STEPS.SELECT_REQUESTS]: 'Select Requests',
    [CONSOLIDATION_WORKFLOW_STEPS.REVIEW_CONSOLIDATION]: 'Review Consolidation',
    [CONSOLIDATION_WORKFLOW_STEPS.ORDERS_CREATED]: 'Orders Created',
    [CONSOLIDATION_WORKFLOW_STEPS.BILLS_MANAGEMENT]: 'Bills Management'
  }
  return names[step] || 'Unknown Step'
}

/**
 * Get consolidation workflow step description
 */
export function getConsolidationStepDescription(step: ConsolidationWorkflowStep): string {
  const descriptions = {
    [CONSOLIDATION_WORKFLOW_STEPS.SELECT_REQUESTS]: 'Choose approved requests to consolidate',
    [CONSOLIDATION_WORKFLOW_STEPS.REVIEW_CONSOLIDATION]: 'Preview grouped items and suppliers',
    [CONSOLIDATION_WORKFLOW_STEPS.ORDERS_CREATED]: 'Purchase orders generated and ready',
    [CONSOLIDATION_WORKFLOW_STEPS.BILLS_MANAGEMENT]: 'Manage bills and payments'
  }
  return descriptions[step] || 'Unknown step description'
}

/**
 * Get consolidation workflow step icon
 */
export function getConsolidationStepIcon(step: ConsolidationWorkflowStep): string {
  const icons = {
    [CONSOLIDATION_WORKFLOW_STEPS.SELECT_REQUESTS]: 'mdi-clipboard-list',
    [CONSOLIDATION_WORKFLOW_STEPS.REVIEW_CONSOLIDATION]: 'mdi-merge',
    [CONSOLIDATION_WORKFLOW_STEPS.ORDERS_CREATED]: 'mdi-package-variant',
    [CONSOLIDATION_WORKFLOW_STEPS.BILLS_MANAGEMENT]: 'mdi-file-document'
  }
  return icons[step] || 'mdi-help'
}

/**
 * Get consolidation status color
 */
export function getConsolidationStatusColor(status: ConsolidationStatus): string {
  const colors = {
    [CONSOLIDATION_STATUSES.DRAFT]: 'warning',
    [CONSOLIDATION_STATUSES.PROCESSED]: 'success',
    [CONSOLIDATION_STATUSES.CANCELLED]: 'error'
  }
  return colors[status] || 'default'
}

/**
 * Get consolidation status name
 */
export function getConsolidationStatusName(status: ConsolidationStatus): string {
  const names = {
    [CONSOLIDATION_STATUSES.DRAFT]: 'Draft',
    [CONSOLIDATION_STATUSES.PROCESSED]: 'Processed',
    [CONSOLIDATION_STATUSES.CANCELLED]: 'Cancelled'
  }
  return names[status] || status
}

/**
 * Get bill status color
 */
export function getBillStatusColor(status: BillStatus): string {
  const colors = {
    [BILL_STATUSES.DRAFT]: 'default',
    [BILL_STATUSES.ISSUED]: 'info',
    [BILL_STATUSES.PAID]: 'success',
    [BILL_STATUSES.OVERDUE]: 'error',
    [BILL_STATUSES.CANCELLED]: 'error'
  }
  return colors[status] || 'default'
}

/**
 * Get bill status icon
 */
export function getBillStatusIcon(status: BillStatus): string {
  const icons = {
    [BILL_STATUSES.DRAFT]: 'mdi-file-document-outline',
    [BILL_STATUSES.ISSUED]: 'mdi-file-document',
    [BILL_STATUSES.PAID]: 'mdi-check-circle',
    [BILL_STATUSES.OVERDUE]: 'mdi-alert',
    [BILL_STATUSES.CANCELLED]: 'mdi-cancel'
  }
  return icons[status] || 'mdi-help'
}

/**
 * Get payment status color
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  const colors = {
    [PAYMENT_STATUSES.UNPAID]: 'warning',
    [PAYMENT_STATUSES.PARTIAL]: 'info',
    [PAYMENT_STATUSES.PAID]: 'success'
  }
  return colors[status] || 'default'
}

/**
 * Get payment status icon
 */
export function getPaymentStatusIcon(status: PaymentStatus): string {
  const icons = {
    [PAYMENT_STATUSES.UNPAID]: 'mdi-clock',
    [PAYMENT_STATUSES.PARTIAL]: 'mdi-credit-card-clock',
    [PAYMENT_STATUSES.PAID]: 'mdi-check-circle'
  }
  return icons[status] || 'mdi-help'
}

// ===========================
// CONSOLIDATION CALCULATIONS
// ===========================

/**
 * Calculate estimated supplier count from requests
 */
export function calculateEstimatedSupplierCount(
  requestIds: string[],
  getRequestById: (id: string) => any
): number {
  const supplierIds = new Set<string>()

  requestIds.forEach(requestId => {
    const request = getRequestById(requestId)
    if (request) {
      request.items?.forEach((item: any) => {
        // This would need to be connected to actual supplier mapping
        // For now, we'll use a simplified approach
        supplierIds.add(item.preferredSupplierId || 'default-supplier')
      })
    }
  })

  return supplierIds.size
}

/**
 * Calculate total estimated value from requests
 */
export function calculateTotalEstimatedValue(
  requestIds: string[],
  getRequestById: (id: string) => any
): number {
  let totalValue = 0

  requestIds.forEach(requestId => {
    const request = getRequestById(requestId)
    if (request) {
      request.items?.forEach((item: any) => {
        const estimatedPrice = item.estimatedPrice || 0
        const quantity = item.requestedQuantity || 0
        totalValue += estimatedPrice * quantity
      })
    }
  })

  return totalValue
}

/**
 * Check if bill is overdue
 */
export function isBillOverdue(bill: { dueDate: string; paymentStatus: PaymentStatus }): boolean {
  if (bill.paymentStatus === PAYMENT_STATUSES.PAID) return false
  return new Date(bill.dueDate) < new Date()
}

/**
 * Calculate overdue days for a bill
 */
export function getOverdueDays(bill: { dueDate: string }): number {
  const dueDate = new Date(bill.dueDate)
  const now = new Date()
  return Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get due date warning color
 */
export function getDueDateColor(dueDate: string): string {
  const due = new Date(dueDate)
  const now = new Date()
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

  if (diffDays < 0) return 'text-error' // Overdue
  if (diffDays <= 3) return 'text-warning' // Due soon
  return 'text-success' // Ok
}

// ===========================
// WORKFLOW VALIDATION
// ===========================

/**
 * Validate if requests can be consolidated
 */
export function validateConsolidationRequests(requests: any[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (requests.length === 0) {
    errors.push('No requests selected for consolidation')
  }

  if (requests.length === 1) {
    warnings.push('Only one request selected - consolidation may not provide benefits')
  }

  // Check if all requests are approved
  const unapprovedRequests = requests.filter(r => r.status !== 'approved')
  if (unapprovedRequests.length > 0) {
    errors.push(`${unapprovedRequests.length} request(s) are not approved`)
  }

  // Check for department consistency (optional warning)
  const departments = new Set(requests.map(r => r.department))
  if (departments.size > 1) {
    warnings.push(`Requests from multiple departments: ${Array.from(departments).join(', ')}`)
  }

  // Check for very old requests
  const now = new Date()
  const oldRequests = requests.filter(r => {
    const requestDate = new Date(r.requestDate)
    const diffDays = (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays > 7
  })

  if (oldRequests.length > 0) {
    warnings.push(`${oldRequests.length} request(s) are older than 7 days`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Generate consolidation summary statistics
 */
export function generateConsolidationStats(consolidation: any): {
  totalRequests: number
  totalItems: number
  totalSuppliers: number
  estimatedSavings: number
  averageOrderValue: number
} {
  const totalRequests = consolidation.sourceRequestIds?.length || 0
  const totalItems =
    consolidation.supplierGroups?.reduce(
      (sum: number, group: any) => sum + (group.items?.length || 0),
      0
    ) || 0
  const totalSuppliers = consolidation.supplierGroups?.length || 0
  const totalValue = consolidation.totalEstimatedValue || 0

  // Estimated savings calculation (simplified)
  // Assume 5% savings from consolidation (reduced delivery costs, bulk discounts)
  const estimatedSavings = totalValue * 0.05

  const averageOrderValue = totalSuppliers > 0 ? totalValue / totalSuppliers : 0

  return {
    totalRequests,
    totalItems,
    totalSuppliers,
    estimatedSavings,
    averageOrderValue
  }
}

// ===========================
// FORMAT UTILITIES
// ===========================

/**
 * Format time ago for activity tracking
 */
export function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffDays > 0) {
    return `${diffDays}d ago`
  } else if (diffHours > 0) {
    return `${diffHours}h ago`
  } else if (diffMinutes > 5) {
    return `${diffMinutes}m ago`
  } else {
    return 'Just now'
  }
}

/**
 * Generate consolidation number
 */
export function generateConsolidationNumber(existingConsolidations: any[]): string {
  const count = existingConsolidations.length + 1
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  return `CONS-${year}${month}-${String(count).padStart(3, '0')}`
}

/**
 * Generate bill number from purchase order
 */
export function generateBillNumber(purchaseOrderNumber: string): string {
  return `BILL-${purchaseOrderNumber.replace('PO-', '')}`
}

// ===========================
// EXPORT SUMMARY
// ===========================

export default {
  // Components
  NewOrdersTab,
  RequestSelectionCard,
  ConsolidationPreviewCard,
  BillsManagementCard,

  // Constants
  CONSOLIDATION_WORKFLOW_STEPS,
  CONSOLIDATION_STATUSES,
  BILL_STATUSES,
  PAYMENT_STATUSES,

  // Utilities
  getConsolidationStepName,
  getConsolidationStepDescription,
  getConsolidationStepIcon,
  getConsolidationStatusColor,
  getConsolidationStatusName,
  getBillStatusColor,
  getBillStatusIcon,
  getPaymentStatusColor,
  getPaymentStatusIcon,
  calculateEstimatedSupplierCount,
  calculateTotalEstimatedValue,
  isBillOverdue,
  getOverdueDays,
  getDueDateColor,
  validateConsolidationRequests,
  generateConsolidationStats,
  formatTimeAgo,
  generateConsolidationNumber,
  generateBillNumber
}
