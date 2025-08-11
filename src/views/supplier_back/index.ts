// src/views/supplier/index.ts
// Enhanced Supplier Module Index - Complete Export with Consolidation

// ===========================
// MAIN VIEW COMPONENT
// ===========================
export { default as SupplierView } from './SupplierView.vue'

// ===========================
// SUPPLIER MANAGEMENT
// ===========================
export { default as SupplierTable } from './components/supplier/SupplierTable.vue'
export { default as SupplierDialog } from './components/supplier/SupplierDialog.vue'

// ===========================
// PROCUREMENT MANAGEMENT
// ===========================
export { default as ProcurementTable } from './components/procurement/ProcurementTable.vue'
export { default as ProcurementRequestDialog } from './components/procurement/ProcurementRequestDialog.vue'
export { default as OrderAssistantDialog } from './components/procurement/OrderAssistantDialog.vue'

// ===========================
// PURCHASE ORDERS
// ===========================
export { default as PurchaseOrderTable } from './components/purchase/PurchaseOrderTable.vue'
export { default as PurchaseOrderDialog } from './components/purchase/PurchaseOrderDialog.vue'
export { default as AcceptanceTable } from './components/purchase/AcceptanceTable.vue'
export { default as ReceiptAcceptanceDialog } from './components/purchase/ReceiptAcceptanceDialog.vue'

// ===========================
// CONSOLIDATION WORKFLOW (NEW)
// ===========================
export {
  default as NewOrdersTab,
  RequestSelectionCard,
  ConsolidationPreviewCard,
  BillsManagementCard,
  WorkflowStatusIndicator,

  // Consolidation constants and utilities
  CONSOLIDATION_WORKFLOW_STEPS,
  CONSOLIDATION_STATUSES,
  BILL_STATUSES,
  PAYMENT_STATUSES,

  // Helper functions
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
} from './components/consolidation'

// Add WorkflowStatusIndicator export
export { default as WorkflowStatusIndicator } from './components/consolidation/WorkflowStatusIndicator.vue'

// ===========================
// STORE & UTILITIES
// ===========================
export {
  useSupplierStore,
  formatCurrency,
  formatDate,
  formatDateTime,
  getRelativeTime,
  getSupplierIcon,
  getSupplierTypeName,
  getPaymentTermsName,
  getReliabilityName,
  getReliabilityColor,
  getProcurementStatusName,
  getProcurementPriorityColor,
  getPurchaseOrderStatusName,
  getPurchaseOrderStatusColor,
  getPaymentStatusName,
  getPaymentStatusColor,

  // Constants
  SUPPLIER_TYPES,
  PAYMENT_TERMS,
  DELIVERY_METHODS,
  RELIABILITY_LEVELS,
  PROCUREMENT_STATUSES,
  PROCUREMENT_PRIORITIES,
  PURCHASE_ORDER_STATUSES,
  PAYMENT_STATUSES as STORE_PAYMENT_STATUSES
} from '@/stores/supplier'

// ===========================
// WORKFLOW CONFIGURATIONS
// ===========================

/**
 * Default consolidation workflow configuration
 */
export const DEFAULT_CONSOLIDATION_WORKFLOW = {
  steps: [
    {
      id: 'select-requests',
      title: 'Select Requests',
      description: 'Choose approved requests to consolidate',
      estimatedTime: '2-5 min',
      actions: [
        { id: 'select-all', label: 'Select All', icon: 'mdi-select-all' },
        { id: 'filter', label: 'Filter', icon: 'mdi-filter' }
      ]
    },
    {
      id: 'review-consolidation',
      title: 'Review Consolidation',
      description: 'Preview grouped items and suppliers',
      estimatedTime: '3-10 min',
      actions: [
        { id: 'edit', label: 'Edit', icon: 'mdi-pencil', variant: 'outlined' },
        { id: 'create-orders', label: 'Create Orders', icon: 'mdi-cart-plus', color: 'primary' }
      ]
    },
    {
      id: 'orders-created',
      title: 'Orders Created',
      description: 'Purchase orders generated and ready',
      estimatedTime: '1-2 min',
      actions: [
        { id: 'view-orders', label: 'View Orders', icon: 'mdi-package-variant' },
        { id: 'send-orders', label: 'Send to Suppliers', icon: 'mdi-send', color: 'success' }
      ]
    },
    {
      id: 'bills-management',
      title: 'Bills Management',
      description: 'Manage bills and payments',
      estimatedTime: 'Ongoing',
      actions: [
        { id: 'create-bills', label: 'Create Bills', icon: 'mdi-file-document-plus' },
        { id: 'pay-bills', label: 'Pay Bills', icon: 'mdi-credit-card', color: 'warning' }
      ]
    }
  ],

  settings: {
    autoAdvanceSteps: true,
    showEstimatedTime: true,
    enableQuickActions: true,
    compactMode: false
  }
} as const

/**
 * Consolidation workflow step types
 */
export type ConsolidationWorkflowStep = (typeof DEFAULT_CONSOLIDATION_WORKFLOW.steps)[number]

/**
 * Consolidation workflow settings
 */
export type ConsolidationWorkflowSettings = typeof DEFAULT_CONSOLIDATION_WORKFLOW.settings

// ===========================
// INTEGRATION HELPERS
// ===========================

/**
 * Integration helper for Storage module
 */
export const STORAGE_INTEGRATION = {
  /**
   * Events that trigger storage updates
   */
  TRIGGER_EVENTS: ['receipt-accepted', 'order-delivered', 'inventory-adjustment'],

  /**
   * Storage operations mapping
   */
  OPERATIONS: {
    'receipt-accepted': 'createReceipt',
    'order-delivered': 'createReceipt',
    'inventory-adjustment': 'createCorrection'
  }
} as const

/**
 * Integration helper for Account module (future)
 */
export const ACCOUNT_INTEGRATION = {
  /**
   * Events that trigger account updates
   */
  TRIGGER_EVENTS: ['bill-created', 'bill-paid', 'supplier-payment'],

  /**
   * Account operations mapping
   */
  OPERATIONS: {
    'bill-created': 'createAccountEntry',
    'bill-paid': 'createPaymentEntry',
    'supplier-payment': 'updateSupplierBalance'
  },

  /**
   * Bills migration helper
   */
  MIGRATION: {
    moveToAccountStore: true,
    keepSupplierReference: true,
    updateReferences: ['purchase-orders', 'receipt-acceptances']
  }
} as const

// ===========================
// FEATURE FLAGS
// ===========================

/**
 * Feature flags for gradual rollout
 */
export const FEATURE_FLAGS = {
  // Consolidation features
  CONSOLIDATION_ENABLED: true,
  SMART_GROUPING: true,
  BULK_OPERATIONS: true,

  // Bills management
  BILLS_IN_SUPPLIER_STORE: true, // Will be false when moved to Account
  ADVANCED_PAYMENT_TERMS: true,
  AUTOMATED_BILL_CREATION: true,

  // Integration features
  STORAGE_INTEGRATION: true,
  ACCOUNT_INTEGRATION: false, // Future
  REAL_TIME_UPDATES: true,

  // UI enhancements
  WORKFLOW_ANIMATIONS: true,
  PROGRESS_INDICATORS: true,
  SMART_NOTIFICATIONS: true,

  // Analytics and reporting
  CONSOLIDATION_ANALYTICS: true,
  COST_OPTIMIZATION_HINTS: true,
  SUPPLIER_PERFORMANCE_TRACKING: true
} as const

// ===========================
// PERFORMANCE CONFIGURATIONS
// ===========================

/**
 * Performance optimization settings
 */
export const PERFORMANCE_CONFIG = {
  // Pagination settings
  DEFAULT_PAGE_SIZE: 15,
  MAX_PAGE_SIZE: 50,

  // Caching settings
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100,

  // Debounce settings
  SEARCH_DEBOUNCE: 300,
  FILTER_DEBOUNCE: 200,

  // Lazy loading
  ENABLE_VIRTUAL_SCROLLING: true,
  VIRTUAL_SCROLL_THRESHOLD: 100,

  // Real-time updates
  POLLING_INTERVAL: 30 * 1000, // 30 seconds
  WEBSOCKET_RECONNECT_DELAY: 5000
} as const

// ===========================
// ERROR HANDLING
// ===========================

/**
 * Error types and handling
 */
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'validation_error',
  NETWORK_ERROR: 'network_error',
  PERMISSION_ERROR: 'permission_error',
  CONSOLIDATION_ERROR: 'consolidation_error',
  BILL_ERROR: 'bill_error',
  INTEGRATION_ERROR: 'integration_error'
} as const

/**
 * Error recovery strategies
 */
export const ERROR_RECOVERY = {
  [ERROR_TYPES.VALIDATION_ERROR]: 'show_form_errors',
  [ERROR_TYPES.NETWORK_ERROR]: 'retry_with_backoff',
  [ERROR_TYPES.PERMISSION_ERROR]: 'redirect_to_login',
  [ERROR_TYPES.CONSOLIDATION_ERROR]: 'reset_workflow',
  [ERROR_TYPES.BILL_ERROR]: 'rollback_transaction',
  [ERROR_TYPES.INTEGRATION_ERROR]: 'fallback_to_manual'
} as const

// ===========================
// MODULE METADATA
// ===========================

/**
 * Module information
 */
export const MODULE_INFO = {
  name: 'Supplier Management',
  version: '3.0.0',
  description: 'Complete supplier management with smart consolidation workflow',
  features: [
    'Supplier Management',
    'Procurement Requests',
    'Purchase Orders',
    'Smart Consolidation',
    'Bills Management',
    'Receipt Acceptance',
    'Storage Integration',
    'Analytics & Reporting'
  ],
  dependencies: ['@/stores/supplier', '@/utils', 'vuetify'],
  integrations: ['Storage Module', 'Account Module (planned)', 'Analytics Module (planned)']
} as const

// ===========================
// DEVELOPMENT HELPERS
// ===========================

/**
 * Development and debugging helpers
 */
export const DEV_HELPERS = {
  /**
   * Enable debug logging
   */
  DEBUG_ENABLED: process.env.NODE_ENV === 'development',

  /**
   * Mock data generators
   */
  MOCK_GENERATORS: {
    suppliers: () => import('./mocks/suppliers'),
    requests: () => import('./mocks/requests'),
    orders: () => import('./mocks/orders'),
    consolidations: () => import('./mocks/consolidations')
  },

  /**
   * Testing utilities
   */
  TEST_UTILS: {
    resetStore: () => 'useSupplierStore().reset()',
    mockConsolidation: () => 'generateMockConsolidation()',
    triggerWorkflow: () => 'startMockWorkflow()'
  }
} as const

// ===========================
// DEFAULT EXPORT
// ===========================

export default {
  // Main component
  SupplierView,

  // Configuration
  DEFAULT_CONSOLIDATION_WORKFLOW,
  FEATURE_FLAGS,
  PERFORMANCE_CONFIG,
  MODULE_INFO,

  // Integrations
  STORAGE_INTEGRATION,
  ACCOUNT_INTEGRATION,

  // Error handling
  ERROR_TYPES,
  ERROR_RECOVERY,

  // Development
  DEV_HELPERS
}
