import type { PreparationBatch, PreparationOperation } from '../types'

/**
 * Supabase Mappers for Preparation Storage
 * Handles conversion between TypeScript interfaces and Supabase schema
 */

// =====================================================
// PREPARATION BATCH MAPPERS
// =====================================================

/**
 * Convert PreparationBatch to Supabase format (camelCase → snake_case)
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
    created_at: batch.createdAt,
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
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
