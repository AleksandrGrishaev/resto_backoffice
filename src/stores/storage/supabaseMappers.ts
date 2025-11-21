// src/stores/storage/supabaseMappers.ts
// Database mappers for StorageBatch, StorageOperation, and InventoryDocument
// Converts between snake_case (database) and camelCase (TypeScript)

import type { StorageBatch, StorageOperation, InventoryDocument } from './types'
import type { Tables } from '@/supabase/types.gen'

type DBStorageBatch = Tables<'storage_batches'>
type DBStorageOperation = Tables<'storage_operations'>
type DBInventoryDocument = Tables<'inventory_documents'>

/**
 * Maps database storage_batch to TypeScript StorageBatch
 */
export function mapBatchFromDB(dbBatch: DBStorageBatch): StorageBatch {
  return {
    id: dbBatch.id,
    batchNumber: dbBatch.batch_number,
    itemId: dbBatch.item_id,
    itemType: dbBatch.item_type as 'product',
    warehouseId: dbBatch.warehouse_id,
    initialQuantity: parseFloat(String(dbBatch.initial_quantity)),
    currentQuantity: parseFloat(String(dbBatch.current_quantity)),
    unit: dbBatch.unit,
    costPerUnit: parseFloat(String(dbBatch.cost_per_unit)),
    totalValue: parseFloat(String(dbBatch.total_value)),
    receiptDate: dbBatch.receipt_date,
    expiryDate: dbBatch.expiry_date ?? undefined,
    sourceType: dbBatch.source_type as
      | 'purchase'
      | 'correction'
      | 'opening_balance'
      | 'inventory_adjustment',
    status: dbBatch.status as 'active' | 'expired' | 'consumed' | 'in_transit',
    isActive: dbBatch.is_active,
    notes: dbBatch.notes ?? undefined,
    purchaseOrderId: dbBatch.purchase_order_id ?? undefined,
    supplierId: dbBatch.supplier_id ?? undefined,
    supplierName: dbBatch.supplier_name ?? undefined,
    plannedDeliveryDate: dbBatch.planned_delivery_date ?? undefined,
    actualDeliveryDate: dbBatch.actual_delivery_date ?? undefined,
    createdAt: dbBatch.created_at,
    updatedAt: dbBatch.updated_at
  }
}

/**
 * Maps TypeScript StorageBatch to database format
 */
export function mapBatchToDB(batch: Partial<StorageBatch>): Partial<DBStorageBatch> {
  return {
    id: batch.id,
    batch_number: batch.batchNumber,
    item_id: batch.itemId,
    item_type: batch.itemType,
    warehouse_id: batch.warehouseId,
    initial_quantity: batch.initialQuantity,
    current_quantity: batch.currentQuantity,
    unit: batch.unit,
    cost_per_unit: batch.costPerUnit,
    total_value: batch.totalValue,
    receipt_date: batch.receiptDate,
    expiry_date: batch.expiryDate ?? null,
    source_type: batch.sourceType,
    status: batch.status,
    is_active: batch.isActive,
    notes: batch.notes ?? null,
    purchase_order_id: batch.purchaseOrderId ?? null,
    supplier_id: batch.supplierId ?? null,
    supplier_name: batch.supplierName ?? null,
    planned_delivery_date: batch.plannedDeliveryDate ?? null,
    actual_delivery_date: batch.actualDeliveryDate ?? null,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt
  }
}

/**
 * Maps database storage_operation to TypeScript StorageOperation
 */
export function mapOperationFromDB(dbOp: DBStorageOperation): StorageOperation {
  return {
    id: dbOp.id,
    operationType: dbOp.operation_type as 'receipt' | 'correction' | 'inventory' | 'write_off',
    documentNumber: dbOp.document_number,
    operationDate: dbOp.operation_date,
    warehouseId: dbOp.warehouse_id ?? undefined,
    department: dbOp.department as 'kitchen' | 'bar',
    responsiblePerson: dbOp.responsible_person,
    items: dbOp.items as any, // JSONB array
    totalValue: dbOp.total_value ? parseFloat(String(dbOp.total_value)) : undefined,
    notes: dbOp.notes ?? undefined,
    correctionDetails: dbOp.correction_details as any,
    writeOffDetails: dbOp.write_off_details as any,
    relatedInventoryId: dbOp.related_inventory_id ?? undefined,
    status: dbOp.status as 'draft' | 'confirmed',
    createdAt: dbOp.created_at,
    updatedAt: dbOp.updated_at
  }
}

/**
 * Maps TypeScript StorageOperation to database format
 */
export function mapOperationToDB(op: Partial<StorageOperation>): Partial<DBStorageOperation> {
  return {
    id: op.id,
    operation_type: op.operationType,
    document_number: op.documentNumber,
    operation_date: op.operationDate,
    warehouse_id: op.warehouseId ?? null,
    department: op.department,
    responsible_person: op.responsiblePerson,
    items: op.items as any, // JSONB array
    total_value: op.totalValue,
    notes: op.notes ?? null,
    correction_details: op.correctionDetails as any,
    write_off_details: op.writeOffDetails as any,
    related_inventory_id: op.relatedInventoryId ?? null,
    status: op.status,
    created_at: op.createdAt,
    updated_at: op.updatedAt
  }
}

/**
 * Maps database inventory_document to TypeScript InventoryDocument
 */
export function mapInventoryFromDB(dbInventory: DBInventoryDocument): InventoryDocument {
  return {
    id: dbInventory.id,
    documentNumber: dbInventory.document_number,
    inventoryDate: dbInventory.inventory_date,
    department: dbInventory.department as 'kitchen' | 'bar',
    itemType: dbInventory.item_type as 'product',
    responsiblePerson: dbInventory.responsible_person,
    items: dbInventory.items as any, // JSONB array of InventoryItem[]
    totalItems: dbInventory.total_items,
    totalDiscrepancies: dbInventory.total_discrepancies,
    totalValueDifference: parseFloat(String(dbInventory.total_value_difference)),
    status: dbInventory.status as 'draft' | 'confirmed',
    notes: dbInventory.notes ?? undefined,
    createdAt: dbInventory.created_at,
    updatedAt: dbInventory.updated_at
  }
}

/**
 * Maps TypeScript InventoryDocument to database format
 */
export function mapInventoryToDB(
  inventory: Partial<InventoryDocument>
): Partial<DBInventoryDocument> {
  return {
    id: inventory.id,
    document_number: inventory.documentNumber,
    inventory_date: inventory.inventoryDate,
    department: inventory.department,
    item_type: inventory.itemType,
    responsible_person: inventory.responsiblePerson,
    items: inventory.items as any, // JSONB array
    total_items: inventory.totalItems,
    total_discrepancies: inventory.totalDiscrepancies,
    total_value_difference: inventory.totalValueDifference,
    status: inventory.status,
    notes: inventory.notes ?? null,
    created_at: inventory.createdAt,
    updated_at: inventory.updatedAt
  }
}
