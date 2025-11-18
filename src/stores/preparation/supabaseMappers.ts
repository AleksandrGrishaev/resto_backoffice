// src/stores/preparation/supabaseMappers.ts - Mappers for Supabase integration

import { TimeUtils } from '@/utils'
import type {
  Preparation,
  PreparationIngredient,
  PreparationBatch,
  PreparationOperation,
  PreparationBalance,
  CreatePreparationReceiptData,
  CreatePreparationCorrectionData,
  CreatePreparationWriteOffData,
  PreparationDepartment,
  BatchStatus
} from './types'

// =============================================
// DATABASE ROW TYPES
// =============================================

export interface PreparationRow {
  id: string
  created_at: string
  updated_at: string
  closed_at: string | null
  created_by: string | null
  updated_by: string | null
  name: string
  code: string | null
  description: string | null
  type: string
  output_quantity: number
  output_unit: string
  preparation_time: number
  instructions: string
  is_active: boolean
  cost_per_portion: number
}

export interface PreparationIngredientRow {
  id: string
  preparation_id: string
  type: string
  product_id: string
  quantity: number
  unit: string
  notes: string | null
  sort_order: number
}

export interface PreparationBatchRow {
  id: string
  preparation_id: string
  batch_number: string
  initial_quantity: number
  current_quantity: number
  unit: string
  cost_per_unit: number
  created_at: string
  produced_at: string
  expires_at: string | null
  department: string
  status: string
  notes: string | null
  created_by: string | null
}

export interface PreparationOperationRow {
  id: string
  preparation_id: string
  batch_id: string | null
  operation_type: string
  quantity: number
  unit: string
  cost_per_unit: number | null
  department: string
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  performed_at: string
  performed_by: string | null
  created_at: string
}

export interface PreparationBalanceRow {
  id: string
  preparation_id: string
  department: string
  current_quantity: number
  unit: string
  average_cost: number | null
  last_updated: string
  last_operation_at: string | null
}

// =============================================
// PREPARATION MAPPERS
// =============================================

export function preparationFromSupabase(row: PreparationRow): Preparation {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    name: row.name,
    code: row.code || undefined,
    description: row.description || undefined,
    type: row.type as any, // sauce, garnish, marinade, semifinished, seasoning
    outputQuantity: row.output_quantity,
    outputUnit: row.output_unit,
    preparationTime: row.preparation_time,
    instructions: row.instructions,
    isActive: row.is_active,
    costPerPortion: row.cost_per_portion || 0,
    ingredients: [] // Will be loaded separately
  }
}

export function preparationToSupabaseInsert(
  data: any
): Omit<PreparationRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: data.name,
    code: data.code || null,
    description: data.description || null,
    type: data.type,
    output_quantity: data.outputQuantity,
    output_unit: data.outputUnit,
    preparation_time: data.preparationTime || 0,
    instructions: data.instructions || '',
    is_active: data.isActive ?? true,
    cost_per_portion: data.costPerPortion || 0,
    closed_at: data.closedAt || null,
    created_by: data.createdBy || null,
    updated_by: data.updatedBy || null
  }
}

export function preparationToSupabaseUpdate(data: Partial<Preparation>): Partial<PreparationRow> {
  const update: Partial<PreparationRow> = {
    updated_at: TimeUtils.getCurrentLocalISO(),
    updated_by: data.updatedBy
  }

  if (data.name !== undefined) update.name = data.name
  if (data.code !== undefined) update.code = data.code
  if (data.description !== undefined) update.description = data.description
  if (data.type !== undefined) update.type = data.type
  if (data.outputQuantity !== undefined) update.output_quantity = data.outputQuantity
  if (data.outputUnit !== undefined) update.output_unit = data.outputUnit
  if (data.preparationTime !== undefined) update.preparation_time = data.preparationTime
  if (data.instructions !== undefined) update.instructions = data.instructions
  if (data.isActive !== undefined) update.is_active = data.isActive
  if (data.costPerPortion !== undefined) update.cost_per_portion = data.costPerPortion
  if (data.closedAt !== undefined) update.closed_at = data.closedAt
  if (data.createdBy !== undefined) update.created_by = data.createdBy

  return update
}

// =============================================
// INGREDIENT MAPPERS
// =============================================

export function preparationIngredientFromSupabase(
  row: PreparationIngredientRow
): PreparationIngredient {
  return {
    id: row.id,
    preparationId: row.preparation_id,
    type: row.type as 'product' | 'preparation',
    productId: row.product_id,
    quantity: row.quantity,
    unit: row.unit,
    notes: row.notes || undefined,
    sortOrder: row.sort_order
  }
}

export function preparationIngredientToSupabase(
  data: PreparationIngredient
): Omit<PreparationIngredientRow, 'preparation_id'> {
  return {
    id: data.id,
    type: data.type,
    product_id: data.productId,
    quantity: data.quantity,
    unit: data.unit,
    notes: data.notes || null,
    sort_order: data.sortOrder
  }
}

// =============================================
// BATCH MAPPERS
// =============================================

export function preparationBatchFromSupabase(row: PreparationBatchRow): PreparationBatch {
  return {
    id: row.id,
    preparationId: row.preparation_id,
    batchNumber: row.batch_number,
    initialQuantity: row.initial_quantity,
    currentQuantity: row.current_quantity,
    unit: row.unit,
    costPerUnit: row.cost_per_unit,
    totalValue: row.current_quantity * row.cost_per_unit,
    productionDate: row.produced_at,
    expiryDate: row.expires_at,
    sourceType: 'production',
    notes: row.notes || undefined,
    status: row.status as BatchStatus,
    isActive: row.status === 'active',
    createdAt: row.created_at,
    updatedAt: row.created_at,
    closedAt: null,
    updatedBy: row.created_by,
    createdBy: row.created_by,
    // Additional fields from JSON data
    producedAt: row.produced_at,
    expiresAt: row.expires_at,
    department: row.department as PreparationDepartment
  }
}

export function preparationBatchToSupabaseInsert(
  data: CreatePreparationReceiptData
): Omit<PreparationBatchRow, 'id' | 'created_at'> {
  const now = TimeUtils.getCurrentLocalISO()
  return {
    preparation_id: data.preparationId,
    batch_number: data.batchNumber,
    initial_quantity: data.quantity,
    current_quantity: data.quantity,
    unit: data.unit,
    cost_per_unit: data.costPerUnit || 0,
    produced_at: data.producedAt || now,
    expires_at: data.expiresAt || null,
    department: data.department || 'kitchen',
    status: 'active',
    notes: data.notes || null,
    created_by: data.createdBy || null
  }
}

// =============================================
// OPERATION MAPPERS
// =============================================

export function preparationOperationFromSupabase(
  row: PreparationOperationRow
): PreparationOperation {
  return {
    id: row.id,
    preparationId: row.preparation_id,
    batchId: row.batch_id,
    type: row.operation_type as 'production' | 'consumption' | 'write_off' | 'adjustment',
    quantity: row.quantity,
    unit: row.unit,
    costPerUnit: row.cost_per_unit || undefined,
    department: row.department as PreparationDepartment,
    referenceId: row.reference_id || undefined,
    referenceType: row.reference_type || undefined,
    notes: row.notes || undefined,
    performedAt: row.performed_at,
    performedBy: row.performed_by || undefined,
    createdAt: row.created_at
  }
}

export function preparationOperationToSupabaseInsert(
  operationType: 'production' | 'consumption' | 'write_off' | 'adjustment',
  data: any,
  batchId?: string
): Omit<PreparationOperationRow, 'id' | 'created_at'> {
  const now = TimeUtils.getCurrentLocalISO()

  return {
    preparation_id: data.preparationId,
    batch_id: batchId || null,
    operation_type: operationType,
    quantity:
      operationType === 'consumption' || operationType === 'write_off'
        ? -Math.abs(data.quantity)
        : data.quantity,
    unit: data.unit,
    cost_per_unit: data.costPerUnit || null,
    department: data.department || 'kitchen',
    reference_id: data.referenceId || null,
    reference_type: data.referenceType || null,
    notes: data.notes || null,
    performed_at: now,
    performed_by: data.performedBy || null
  }
}

// =============================================
// BALANCE MAPPERS
// =============================================

export function preparationBalanceFromSupabase(row: PreparationBalanceRow): PreparationBalance {
  return {
    preparationId: row.preparation_id,
    preparationName: '', // Will be filled by store/layer above
    department: row.department as PreparationDepartment,
    totalQuantity: row.current_quantity,
    unit: row.unit,
    totalValue: row.current_quantity * (row.average_cost || 0),
    averageCost: row.average_cost || 0,
    latestCost: row.average_cost || 0,
    costTrend: 'stable',
    batches: [], // Will be loaded separately
    oldestBatchDate: row.last_updated,
    newestBatchDate: row.last_updated,
    hasExpired: false, // Will be calculated from batches
    hasNearExpiry: false, // Will be calculated from batches
    belowMinStock: false, // Will be calculated from preparation settings
    lastCalculated: row.last_updated
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

export function preparationsFromSupabase(rows: PreparationRow[]): Preparation[] {
  return rows.map(preparationFromSupabase)
}

export function preparationIngredientsFromSupabase(
  rows: PreparationIngredientRow[]
): PreparationIngredient[] {
  return rows.map(preparationIngredientFromSupabase)
}

export function preparationBatchesFromSupabase(rows: PreparationBatchRow[]): PreparationBatch[] {
  return rows.map(preparationBatchFromSupabase)
}

export function preparationOperationsFromSupabase(
  rows: PreparationOperationRow[]
): PreparationOperation[] {
  return rows.map(preparationOperationFromSupabase)
}

export function preparationBalancesFromSupabase(
  rows: PreparationBalanceRow[]
): PreparationBalance[] {
  return rows.map(preparationBalanceFromSupabase)
}

export function generateBatchNumber(): string {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return `PREP-${yearMonth}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
}

export function calculateExpirationDate(baseExpiryDays: number): string {
  const now = new Date()
  const expiryDate = new Date(now.getTime() + baseExpiryDays * 24 * 60 * 60 * 1000)
  return expiryDate.toISOString()
}
