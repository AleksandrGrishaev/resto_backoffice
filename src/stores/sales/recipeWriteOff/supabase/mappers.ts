import type { RecipeWriteOff, RecipeWriteOffItem } from '../types'
import type { DecomposedItem } from '../../types'
import type { MenuComposition } from '@/stores/menu/types'

/**
 * Supabase Mappers for Recipe Write-offs
 * Handles conversion between TypeScript interfaces and Supabase schema
 */

/**
 * Convert RecipeWriteOff to Supabase format (camelCase → snake_case)
 */
export function toSupabase(writeOff: RecipeWriteOff): Record<string, any> {
  return {
    id: writeOff.id,
    created_at: writeOff.createdAt,
    updated_at: writeOff.updatedAt,

    // Links
    sales_transaction_id: writeOff.salesTransactionId,
    menu_item_id: writeOff.menuItemId,
    variant_id: writeOff.variantId,
    recipe_id: writeOff.recipeId || null,

    // Recipe data
    portion_size: writeOff.portionSize,
    sold_quantity: writeOff.soldQuantity,

    // JSONB arrays
    write_off_items: writeOff.writeOffItems,
    decomposed_items: writeOff.decomposedItems,
    original_composition: writeOff.originalComposition,

    // Operation data
    department: writeOff.department,
    operation_type: writeOff.operationType,
    performed_at: writeOff.performedAt,
    performed_by: writeOff.performedBy,

    // Storage operation link
    storage_operation_id: writeOff.storageOperationId || null
  }
}

/**
 * Convert Supabase row to RecipeWriteOff (snake_case → camelCase)
 */
export function fromSupabase(row: any): RecipeWriteOff {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    // Links
    salesTransactionId: row.sales_transaction_id,
    menuItemId: row.menu_item_id,
    variantId: row.variant_id,
    recipeId: row.recipe_id,

    // Recipe data
    portionSize: Number(row.portion_size),
    soldQuantity: Number(row.sold_quantity),

    // JSONB arrays (already parsed by Supabase client)
    writeOffItems: row.write_off_items as RecipeWriteOffItem[],
    decomposedItems: row.decomposed_items as DecomposedItem[],
    originalComposition: row.original_composition as MenuComposition[],

    // Operation data
    department: row.department,
    operationType: row.operation_type,
    performedAt: row.performed_at,
    performedBy: row.performed_by,

    // Storage operation link
    storageOperationId: row.storage_operation_id
  }
}
