import type { PreparationBatch, PreparationOperation, PreparationInventoryDocument } from '../types'

/**
 * Supabase Mappers for Preparation Storage
 * Handles conversion between TypeScript interfaces and Supabase schema
 */

// =====================================================
// PREPARATION BATCH MAPPERS
// =====================================================

/**
 * Convert PreparationBatch to Supabase format for INSERT (camelCase → snake_case)
 */
export function batchToSupabase(batch: PreparationBatch): Record<string, any> {
  return {
    id: batch.id,
    batch_number: batch.batchNumber,
    preparation_id: batch.preparationId,
    department: batch.department,
    initial_quantity: batch.initialQuantity,
    current_quantity: batch.currentQuantity,
    unit: batch.unit,
    cost_per_unit: batch.costPerUnit,
    total_value: batch.totalValue,
    production_date: batch.productionDate,
    expiry_date: batch.expiryDate || null,
    source_type: batch.sourceType,
    status: batch.status,
    is_active: batch.isActive,
    notes: batch.notes || null,
    // Negative batch fields
    is_negative: batch.isNegative || false,
    source_batch_id: batch.sourceBatchId || null,
    negative_created_at: batch.negativeCreatedAt || null,
    negative_reason: batch.negativeReason || null,
    source_operation_type: batch.sourceOperationType || null,
    affected_recipe_ids: batch.affectedRecipeIds || null,
    reconciled_at: batch.reconciledAt || null,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt
  }
}

/**
 * Convert PreparationBatch to Supabase format for UPDATE (excludes id and created_at)
 */
export function batchToSupabaseUpdate(batch: PreparationBatch): Record<string, any> {
  return {
    batch_number: batch.batchNumber,
    preparation_id: batch.preparationId,
    department: batch.department,
    initial_quantity: batch.initialQuantity,
    current_quantity: batch.currentQuantity,
    unit: batch.unit,
    cost_per_unit: batch.costPerUnit,
    total_value: batch.totalValue,
    production_date: batch.productionDate,
    expiry_date: batch.expiryDate || null,
    source_type: batch.sourceType,
    status: batch.status,
    is_active: batch.isActive,
    notes: batch.notes || null,
    // ✅ FIX: Include negative batch fields
    is_negative: batch.isNegative || false,
    source_batch_id: batch.sourceBatchId || null,
    negative_created_at: batch.negativeCreatedAt || null,
    negative_reason: batch.negativeReason || null,
    source_operation_type: batch.sourceOperationType || null,
    affected_recipe_ids: batch.affectedRecipeIds || null,
    reconciled_at: batch.reconciledAt || null,
    updated_at: batch.updatedAt
  }
}

/**
 * Convert Supabase row to PreparationBatch (snake_case → camelCase)
 */
export function batchFromSupabase(row: any): PreparationBatch {
  return {
    id: row.id,
    batchNumber: row.batch_number,
    preparationId: row.preparation_id,
    department: row.department,
    initialQuantity: Number(row.initial_quantity),
    currentQuantity: Number(row.current_quantity),
    unit: row.unit,
    costPerUnit: Number(row.cost_per_unit),
    totalValue: Number(row.total_value),
    productionDate: row.production_date,
    expiryDate: row.expiry_date,
    sourceType: row.source_type,
    status: row.status,
    isActive: row.is_active,
    notes: row.notes,
    // Negative batch fields
    isNegative: row.is_negative || false,
    sourceBatchId: row.source_batch_id,
    negativeCreatedAt: row.negative_created_at,
    negativeReason: row.negative_reason,
    sourceOperationType: row.source_operation_type,
    affectedRecipeIds: row.affected_recipe_ids,
    reconciledAt: row.reconciled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// =====================================================
// PREPARATION OPERATION MAPPERS
// =====================================================

/**
 * Convert PreparationOperation to Supabase format (camelCase → snake_case)
 */
export function operationToSupabase(operation: PreparationOperation): Record<string, any> {
  return {
    id: operation.id,
    operation_type: operation.operationType,
    document_number: operation.documentNumber,
    operation_date: operation.operationDate,
    department: operation.department,
    responsible_person: operation.responsiblePerson || null,

    // JSONB fields (stored as-is)
    items: operation.items,
    consumption_details: operation.consumptionDetails || null,
    correction_details: operation.correctionDetails || null,
    write_off_details: operation.writeOffDetails || null,

    total_value: operation.totalValue,
    status: operation.status,
    related_inventory_id: operation.relatedInventoryId || null,
    related_storage_operation_ids: operation.relatedStorageOperationIds || null, // ✨ NEW: Array of storage operation IDs
    notes: operation.notes || null,
    created_at: operation.createdAt,
    updated_at: operation.updatedAt
  }
}

/**
 * Convert Supabase row to PreparationOperation (snake_case → camelCase)
 */
export function operationFromSupabase(row: any): PreparationOperation {
  return {
    id: row.id,
    operationType: row.operation_type,
    documentNumber: row.document_number,
    operationDate: row.operation_date,
    department: row.department,
    responsiblePerson: row.responsible_person,

    // JSONB fields (already parsed by Supabase client)
    items: row.items,
    consumptionDetails: row.consumption_details,
    correctionDetails: row.correction_details,
    writeOffDetails: row.write_off_details,

    totalValue: Number(row.total_value),
    status: row.status,
    relatedInventoryId: row.related_inventory_id,
    relatedStorageOperationIds: row.related_storage_operation_ids, // ✨ NEW: Array of storage operation IDs
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// =====================================================
// PREPARATION INVENTORY DOCUMENT MAPPERS
// =====================================================

/**
 * Convert PreparationInventoryDocument to Supabase format for INSERT (camelCase → snake_case)
 */
export function inventoryDocumentToSupabase(
  doc: PreparationInventoryDocument
): Record<string, any> {
  return {
    id: doc.id,
    document_number: doc.documentNumber,
    inventory_date: doc.inventoryDate,
    department: doc.department,
    responsible_person: doc.responsiblePerson,
    status: doc.status,
    total_items: doc.totalItems,
    total_discrepancies: doc.totalDiscrepancies,
    total_value_difference: doc.totalValueDifference,
    notes: doc.notes || null,
    // JSONB field (stored as-is)
    items: doc.items,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt
  }
}

/**
 * Convert PreparationInventoryDocument to Supabase format for UPDATE (excludes id and created_at)
 */
export function inventoryDocumentToSupabaseUpdate(
  doc: PreparationInventoryDocument
): Record<string, any> {
  return {
    document_number: doc.documentNumber,
    inventory_date: doc.inventoryDate,
    department: doc.department,
    responsible_person: doc.responsiblePerson,
    status: doc.status,
    total_items: doc.totalItems,
    total_discrepancies: doc.totalDiscrepancies,
    total_value_difference: doc.totalValueDifference,
    notes: doc.notes || null,
    // JSONB field (stored as-is)
    items: doc.items,
    updated_at: doc.updatedAt
  }
}

/**
 * Convert Supabase row to PreparationInventoryDocument (snake_case → camelCase)
 */
export function inventoryDocumentFromSupabase(row: any): PreparationInventoryDocument {
  return {
    id: row.id,
    documentNumber: row.document_number,
    inventoryDate: row.inventory_date,
    department: row.department,
    responsiblePerson: row.responsible_person,
    status: row.status,
    totalItems: Number(row.total_items),
    totalDiscrepancies: Number(row.total_discrepancies),
    totalValueDifference: Number(row.total_value_difference),
    notes: row.notes,
    // JSONB field (already parsed by Supabase client)
    items: row.items,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
