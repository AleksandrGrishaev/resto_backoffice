// src/stores/supplier_2/supabaseMappers.ts
// Mappers for converting between TypeScript (camelCase) and Supabase (snake_case)

import type { Database } from '@/supabase/types.gen'
import type {
  ProcurementRequest,
  RequestItem,
  PurchaseOrder,
  OrderItem,
  Receipt,
  ReceiptItem
} from './types'

// =============================================
// DATABASE TYPES - Extracted from generated types
// =============================================

type DBRequest = Database['public']['Tables']['supplierstore_requests']['Row']
type DBRequestInsert = Database['public']['Tables']['supplierstore_requests']['Insert']
type DBRequestItem = Database['public']['Tables']['supplierstore_request_items']['Row']
type DBRequestItemInsert = Database['public']['Tables']['supplierstore_request_items']['Insert']

type DBOrder = Database['public']['Tables']['supplierstore_orders']['Row']
type DBOrderInsert = Database['public']['Tables']['supplierstore_orders']['Insert']
type DBOrderItem = Database['public']['Tables']['supplierstore_order_items']['Row']
type DBOrderItemInsert = Database['public']['Tables']['supplierstore_order_items']['Insert']

type DBReceipt = Database['public']['Tables']['supplierstore_receipts']['Row']
type DBReceiptInsert = Database['public']['Tables']['supplierstore_receipts']['Insert']
type DBReceiptItem = Database['public']['Tables']['supplierstore_receipt_items']['Row']
type DBReceiptItemInsert = Database['public']['Tables']['supplierstore_receipt_items']['Insert']

// =============================================
// REQUEST MAPPERS
// =============================================

/**
 * Convert Supabase request row to TypeScript ProcurementRequest
 * @param dbRequest - Database row from supplierstore_requests
 * @param dbItems - Array of database rows from supplierstore_request_items
 * @returns ProcurementRequest object
 */
export function mapRequestFromDB(
  dbRequest: DBRequest,
  dbItems: DBRequestItem[] = []
): ProcurementRequest {
  return {
    // BaseEntity fields
    id: dbRequest.id,
    createdAt: dbRequest.created_at,
    updatedAt: dbRequest.updated_at,
    closedAt: dbRequest.closed_at ?? undefined,
    createdBy: dbRequest.created_by ?? undefined,
    updatedBy: dbRequest.updated_by ?? undefined,

    // Request fields
    requestNumber: dbRequest.request_number,
    department: dbRequest.department as 'kitchen' | 'bar',
    requestedBy: dbRequest.requested_by,
    status: dbRequest.status as ProcurementRequest['status'],
    priority: dbRequest.priority as ProcurementRequest['priority'],

    // Relations (JSONB to array)
    purchaseOrderIds: (dbRequest.purchase_order_ids as string[]) ?? [],

    // Items
    items: dbItems.map(mapRequestItemFromDB),

    // Optional fields
    notes: dbRequest.notes ?? undefined
  }
}

/**
 * Convert TypeScript ProcurementRequest to Supabase insert object
 * @param request - ProcurementRequest object
 * @returns Database insert object
 */
export function mapRequestToDB(request: ProcurementRequest): DBRequestInsert {
  return {
    id: request.id,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
    closed_at: request.closedAt ?? null,
    created_by: request.createdBy ?? null,
    updated_by: request.updatedBy ?? null,

    request_number: request.requestNumber,
    department: request.department,
    requested_by: request.requestedBy,
    status: request.status,
    priority: request.priority,

    purchase_order_ids: request.purchaseOrderIds,

    notes: request.notes ?? null
  }
}

/**
 * Convert Supabase request item row to TypeScript RequestItem
 */
export function mapRequestItemFromDB(dbItem: DBRequestItem): RequestItem {
  return {
    id: dbItem.id,
    itemId: dbItem.item_id,
    itemName: dbItem.item_name,
    requestedQuantity: Number(dbItem.requested_quantity),
    unit: dbItem.unit,

    // Optional package info
    packageId: dbItem.package_id ?? undefined,
    packageName: dbItem.package_name ?? undefined,
    packageQuantity: dbItem.package_quantity ? Number(dbItem.package_quantity) : undefined,

    // Optional fields
    estimatedPrice: dbItem.estimated_price ? Number(dbItem.estimated_price) : undefined,
    priority: (dbItem.priority as RequestItem['priority']) ?? undefined,
    category: dbItem.category ?? undefined,
    notes: dbItem.notes ?? undefined
  }
}

/**
 * Convert TypeScript RequestItem to Supabase insert object
 */
export function mapRequestItemToDB(item: RequestItem, requestId: string): DBRequestItemInsert {
  return {
    id: item.id,
    request_id: requestId,
    item_id: item.itemId,
    item_name: item.itemName,
    requested_quantity: item.requestedQuantity,
    unit: item.unit,

    package_id: item.packageId ?? null,
    package_name: item.packageName ?? null,
    package_quantity: item.packageQuantity ?? null,

    estimated_price: item.estimatedPrice ?? null,
    priority: item.priority ?? null,
    category: item.category ?? null,
    notes: item.notes ?? null
  }
}

// =============================================
// ORDER MAPPERS
// =============================================

/**
 * Convert Supabase order row to TypeScript PurchaseOrder
 * @param dbOrder - Database row from supplierstore_orders
 * @param dbItems - Array of database rows from supplierstore_order_items
 * @returns PurchaseOrder object
 */
export function mapOrderFromDB(dbOrder: DBOrder, dbItems: DBOrderItem[] = []): PurchaseOrder {
  return {
    // BaseEntity fields
    id: dbOrder.id,
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
    closedAt: dbOrder.closed_at ?? undefined,
    createdBy: dbOrder.created_by ?? undefined,
    updatedBy: dbOrder.updated_by ?? undefined,

    // Order fields
    orderNumber: dbOrder.order_number,
    supplierId: dbOrder.supplier_id,
    supplierName: dbOrder.supplier_name,
    orderDate: dbOrder.order_date,
    expectedDeliveryDate: dbOrder.expected_delivery_date ?? undefined,

    totalAmount: Number(dbOrder.total_amount),
    isEstimatedTotal: dbOrder.is_estimated_total,

    status: dbOrder.status as PurchaseOrder['status'],
    billStatus: dbOrder.bill_status as PurchaseOrder['billStatus'],
    billStatusCalculatedAt: dbOrder.bill_status_calculated_at ?? undefined,

    // Relations
    requestIds: (dbOrder.request_ids as string[]) ?? [],
    receiptId: dbOrder.receipt_id ?? undefined,
    billId: dbOrder.bill_id ?? undefined,

    // Items
    items: dbItems.map(mapOrderItemFromDB),

    // Receipt processing results
    originalTotalAmount: dbOrder.original_total_amount
      ? Number(dbOrder.original_total_amount)
      : undefined,
    actualDeliveredAmount: dbOrder.actual_delivered_amount
      ? Number(dbOrder.actual_delivered_amount)
      : undefined,
    receiptDiscrepancies:
      (dbOrder.receipt_discrepancies as PurchaseOrder['receiptDiscrepancies']) ?? undefined,
    hasReceiptDiscrepancies: dbOrder.has_receipt_discrepancies ?? undefined,
    receiptCompletedAt: dbOrder.receipt_completed_at ?? undefined,
    receiptCompletedBy: dbOrder.receipt_completed_by ?? undefined,

    // Deprecated fields
    hasShortfall: dbOrder.has_shortfall ?? undefined,
    shortfallAmount: dbOrder.shortfall_amount ? Number(dbOrder.shortfall_amount) : undefined,

    // Optional fields
    notes: dbOrder.notes ?? undefined
  }
}

/**
 * Convert TypeScript PurchaseOrder to Supabase insert object
 */
export function mapOrderToDB(order: PurchaseOrder): DBOrderInsert {
  return {
    id: order.id,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    closed_at: order.closedAt ?? null,
    created_by: order.createdBy ?? null,
    updated_by: order.updatedBy ?? null,

    order_number: order.orderNumber,
    supplier_id: order.supplierId,
    supplier_name: order.supplierName,
    order_date: order.orderDate,
    expected_delivery_date: order.expectedDeliveryDate ?? null,

    total_amount: order.totalAmount,
    is_estimated_total: order.isEstimatedTotal,

    status: order.status,
    bill_status: order.billStatus,
    bill_status_calculated_at: order.billStatusCalculatedAt ?? null,

    request_ids: order.requestIds,
    receipt_id: order.receiptId ?? null,
    bill_id: order.billId ?? null,

    original_total_amount: order.originalTotalAmount ?? null,
    actual_delivered_amount: order.actualDeliveredAmount ?? null,
    receipt_discrepancies: order.receiptDiscrepancies ?? null,
    has_receipt_discrepancies: order.hasReceiptDiscrepancies ?? null,
    receipt_completed_at: order.receiptCompletedAt ?? null,
    receipt_completed_by: order.receiptCompletedBy ?? null,

    has_shortfall: order.hasShortfall ?? null,
    shortfall_amount: order.shortfallAmount ?? null,

    notes: order.notes ?? null
  }
}

/**
 * Convert Supabase order item row to TypeScript OrderItem
 */
export function mapOrderItemFromDB(dbItem: DBOrderItem): OrderItem {
  return {
    id: dbItem.id,
    itemId: dbItem.item_id,
    itemName: dbItem.item_name,

    // Quantities (always in base units)
    orderedQuantity: Number(dbItem.ordered_quantity),
    receivedQuantity: dbItem.received_quantity ? Number(dbItem.received_quantity) : undefined,
    unit: dbItem.unit,

    // Package info (REQUIRED in orders)
    packageId: dbItem.package_id,
    packageName: dbItem.package_name,
    packageQuantity: Number(dbItem.package_quantity),
    packageUnit: dbItem.package_unit,

    // Pricing
    pricePerUnit: Number(dbItem.price_per_unit),
    packagePrice: Number(dbItem.package_price),
    totalPrice: Number(dbItem.total_price),

    // Price metadata
    isEstimatedPrice: dbItem.is_estimated_price,
    lastPriceDate: dbItem.last_price_date ?? undefined,

    // Status
    status: dbItem.status as OrderItem['status']
  }
}

/**
 * Convert TypeScript OrderItem to Supabase insert object
 */
export function mapOrderItemToDB(item: OrderItem, orderId: string): DBOrderItemInsert {
  return {
    id: item.id,
    order_id: orderId,
    item_id: item.itemId,
    item_name: item.itemName,

    ordered_quantity: item.orderedQuantity,
    received_quantity: item.receivedQuantity ?? null,
    unit: item.unit,

    package_id: item.packageId,
    package_name: item.packageName,
    package_quantity: item.packageQuantity,
    package_unit: item.packageUnit,

    price_per_unit: item.pricePerUnit,
    package_price: item.packagePrice,
    total_price: item.totalPrice,

    is_estimated_price: item.isEstimatedPrice,
    last_price_date: item.lastPriceDate ?? null,

    status: item.status
  }
}

// =============================================
// RECEIPT MAPPERS
// =============================================

/**
 * Convert Supabase receipt row to TypeScript Receipt
 * @param dbReceipt - Database row from supplierstore_receipts
 * @param dbItems - Array of database rows from supplierstore_receipt_items
 * @returns Receipt object
 */
export function mapReceiptFromDB(dbReceipt: DBReceipt, dbItems: DBReceiptItem[] = []): Receipt {
  return {
    // BaseEntity fields
    id: dbReceipt.id,
    createdAt: dbReceipt.created_at,
    updatedAt: dbReceipt.updated_at,
    closedAt: dbReceipt.closed_at ?? undefined,
    createdBy: dbReceipt.created_by ?? undefined,
    updatedBy: dbReceipt.updated_by ?? undefined,

    // Receipt fields
    receiptNumber: dbReceipt.receipt_number,
    purchaseOrderId: dbReceipt.purchase_order_id,
    deliveryDate: dbReceipt.delivery_date,
    receivedBy: dbReceipt.received_by,

    hasDiscrepancies: dbReceipt.has_discrepancies,
    status: dbReceipt.status as Receipt['status'],

    // Items
    items: dbItems.map(mapReceiptItemFromDB),

    // Relations
    storageOperationId: dbReceipt.storage_operation_id ?? undefined,

    // Optional fields
    notes: dbReceipt.notes ?? undefined
  }
}

/**
 * Convert TypeScript Receipt to Supabase insert object
 */
export function mapReceiptToDB(receipt: Receipt): DBReceiptInsert {
  return {
    id: receipt.id,
    created_at: receipt.createdAt,
    updated_at: receipt.updatedAt,
    closed_at: receipt.closedAt ?? null,
    created_by: receipt.createdBy ?? null,
    updated_by: receipt.updatedBy ?? null,

    receipt_number: receipt.receiptNumber,
    purchase_order_id: receipt.purchaseOrderId,
    delivery_date: receipt.deliveryDate,
    received_by: receipt.receivedBy,

    has_discrepancies: receipt.hasDiscrepancies,
    status: receipt.status,

    storage_operation_id: receipt.storageOperationId ?? null,

    notes: receipt.notes ?? null
  }
}

/**
 * Convert Supabase receipt item row to TypeScript ReceiptItem
 */
export function mapReceiptItemFromDB(dbItem: DBReceiptItem): ReceiptItem {
  return {
    id: dbItem.id,
    orderItemId: dbItem.order_item_id,
    itemId: dbItem.item_id,
    itemName: dbItem.item_name,

    // Quantities (always in base units)
    orderedQuantity: Number(dbItem.ordered_quantity),
    receivedQuantity: Number(dbItem.received_quantity),
    unit: dbItem.unit,

    // Package info
    packageId: dbItem.package_id,
    packageName: dbItem.package_name,
    orderedPackageQuantity: Number(dbItem.ordered_package_quantity),
    receivedPackageQuantity: Number(dbItem.received_package_quantity),
    packageUnit: dbItem.package_unit,

    // Pricing
    orderedPrice: Number(dbItem.ordered_price),
    actualPrice: dbItem.actual_price ? Number(dbItem.actual_price) : undefined,
    orderedBaseCost: Number(dbItem.ordered_base_cost),
    actualBaseCost: dbItem.actual_base_cost ? Number(dbItem.actual_base_cost) : undefined,

    // Optional fields
    notes: dbItem.notes ?? undefined
  }
}

/**
 * Convert TypeScript ReceiptItem to Supabase insert object
 */
export function mapReceiptItemToDB(item: ReceiptItem, receiptId: string): DBReceiptItemInsert {
  return {
    id: item.id,
    receipt_id: receiptId,
    order_item_id: item.orderItemId,
    item_id: item.itemId,
    item_name: item.itemName,

    ordered_quantity: item.orderedQuantity,
    received_quantity: item.receivedQuantity,
    unit: item.unit,

    package_id: item.packageId,
    package_name: item.packageName,
    ordered_package_quantity: item.orderedPackageQuantity,
    received_package_quantity: item.receivedPackageQuantity,
    package_unit: item.packageUnit,

    ordered_price: item.orderedPrice,
    actual_price: item.actualPrice ?? null,
    ordered_base_cost: item.orderedBaseCost,
    actual_base_cost: item.actualBaseCost ?? null,

    notes: item.notes ?? null
  }
}
