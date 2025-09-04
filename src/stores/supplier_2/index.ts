// src/stores/supplier_2/index.ts

// =============================================
// IMPORTS FOR CONVENIENCE COMPOSABLES
// =============================================

import { useOrderAssistant } from './composables/useOrderAssistant'
import { useProcurementRequests } from './composables/useProcurementRequests'
import { usePurchaseOrders } from './composables/usePurchaseOrders'
import { useReceipts } from './composables/useReceipts'
import { useSupplierStore } from './supplierStore'

export type { BillStatus } from './types'

// =============================================
// TYPES EXPORT
// =============================================

// Core workflow types
export type {
  ProcurementRequest,
  RequestItem,
  PurchaseOrder,
  OrderItem,
  Receipt,
  ReceiptItem
} from './types'

// Store state
export type { SupplierState } from './types'

// Helper types
export type { OrderSuggestion, SupplierBasket, UnassignedItem } from './types'

// Create/Update types
export type {
  CreateRequestData,
  CreateOrderData,
  CreateReceiptData,
  UpdateRequestData,
  UpdateOrderData,
  UpdateReceiptData
} from './types'

// Integration types
export type {
  ProductInfo,
  SupplierInfo,
  PriceHistory,
  CreateBillInAccountStore,
  CreateStorageReceipt
} from './types'

// UI types
export type {
  RequestFilters,
  OrderFilters,
  ReceiptFilters,
  SupplierStatistics,
  DiscrepancySummary
} from './types'

// Utility types
export type {
  RequestStatus,
  OrderStatus,
  ReceiptStatus,
  Department,
  Priority,
  Urgency,
  RequestId,
  OrderId,
  ReceiptId,
  ItemId,
  SupplierId,
  WorkflowStep
} from './types'

// Constants
export {
  REQUEST_STATUSES,
  REQUEST_PRIORITIES,
  ORDER_STATUSES,
  BILL_STATUSES, // ИЗМЕНЕНО с PAYMENT_STATUSES
  RECEIPT_STATUSES,
  SUGGESTION_URGENCY,
  SUGGESTION_REASONS,
  getBillStatusColor // ДОБАВЛЕНО
} from './types'
// Type guards
export { isProcurementRequest, isPurchaseOrder, isReceipt } from './types'

// =============================================

// =============================================
// STORE EXPORT
// =============================================

export { useSupplierStore } from './supplierStore'

// =============================================
// SERVICE EXPORT
// =============================================

export { supplierService } from './supplierService'

// =============================================
// COMPOSABLES EXPORT
// =============================================

export { useOrderAssistant } from './composables/useOrderAssistant'
export { useProcurementRequests } from './composables/useProcurementRequests'
export { usePurchaseOrders } from './composables/usePurchaseOrders'
export { useReceipts } from './composables/useReceipts'

// =============================================
// CONVENIENCE EXPORTS - All-in-one composables
// =============================================

/**
 * Complete supplier workflow composable
 * Combines all supplier functionality in one place
 */
export function useSupplierWorkflow() {
  const orderAssistant = useOrderAssistant()
  const procurementRequests = useProcurementRequests()
  const purchaseOrders = usePurchaseOrders()
  const receipts = useReceipts()
  const store = useSupplierStore()

  return {
    // Composables
    orderAssistant,
    procurementRequests,
    purchaseOrders,
    receipts,

    // Store
    store,

    // Quick access to statistics
    statistics: store.statistics,
    isLoading: store.isLoading
  }
}

/**
 * Order creation workflow composable
 * Focused on the request → order creation flow
 */
export function useOrderCreationWorkflow() {
  const {
    selectedRequestIds,
    requestsForOrders,
    groupRequestsForOrders,
    assignItemsToSupplier,
    clearSupplierBaskets
  } = useProcurementRequests()

  const {
    createOrderFromBasket,
    getStatusColor,
    getBillStatusColorForOrder, // ДОБАВЛЕНО
    formatCurrency
  } = usePurchaseOrders()

  const store = useSupplierStore()

  return {
    // State
    selectedRequestIds,
    requestsForOrders,
    supplierBaskets: store.state.supplierBaskets,

    // Actions
    groupRequestsForOrders,
    assignItemsToSupplier,
    createOrderFromBasket,
    clearSupplierBaskets,

    // Utilities
    getStatusColor,
    getBillStatusColorForOrder,
    formatCurrency
  }
}

/**
 * Receipt workflow composable
 * Focused on the order → receipt → storage flow
 */
export function useReceiptWorkflow() {
  const { ordersForReceipt, canReceiveOrder, isReadyForReceipt } = usePurchaseOrders()

  const {
    startReceipt,
    completeReceipt,
    updateReceiptItem,
    calculateDiscrepancies,
    calculateFinancialImpact
  } = useReceipts()

  return {
    // Available orders for receipt
    ordersForReceipt,

    // Order validation
    canReceiveOrder,
    isReadyForReceipt,

    // Receipt actions
    startReceipt,
    completeReceipt,
    updateReceiptItem,

    // Analysis
    calculateDiscrepancies,
    calculateFinancialImpact
  }
}
