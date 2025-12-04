import type { SalesTransaction, ProfitCalculation, DecompositionSummary } from '../types'

/**
 * Supabase Mappers for Sales Transactions
 * Handles conversion between TypeScript interfaces and Supabase schema
 */

/**
 * Convert SalesTransaction to Supabase format (camelCase → snake_case)
 */
export function toSupabase(transaction: SalesTransaction): Record<string, any> {
  return {
    id: transaction.id,
    created_at: transaction.createdAt,
    updated_at: transaction.updatedAt,

    // Reference links
    payment_id: transaction.paymentId,
    order_id: transaction.orderId,
    bill_id: transaction.billId,
    item_id: transaction.itemId,
    shift_id: transaction.shiftId || null,

    // Menu data
    menu_item_id: transaction.menuItemId,
    menu_item_name: transaction.menuItemName,
    variant_id: transaction.variantId,
    variant_name: transaction.variantName,

    // Sale data
    quantity: transaction.quantity,
    unit_price: transaction.unitPrice,
    total_price: transaction.totalPrice,
    payment_method: transaction.paymentMethod,

    // Date/time
    sold_at: transaction.soldAt,
    processed_by: transaction.processedBy,

    // Recipe/Inventory link
    recipe_id: transaction.recipeId || null,
    recipe_write_off_id: transaction.recipeWriteOffId || null,

    // JSONB fields
    profit_calculation: transaction.profitCalculation,
    decomposition_summary: transaction.decompositionSummary,
    actual_cost: transaction.actualCost || null, // ✅ SPRINT 2: FIFO actual cost

    // ✅ SPRINT 8: Tax storage
    service_tax_rate: transaction.serviceTaxRate || null,
    service_tax_amount: transaction.serviceTaxAmount || null,
    government_tax_rate: transaction.governmentTaxRate || null,
    government_tax_amount: transaction.governmentTaxAmount || null,
    total_tax_amount: transaction.totalTaxAmount || null,

    // ✅ SPRINT 2: Write-off IDs
    preparation_write_off_ids: transaction.preparationWriteOffIds || null,
    product_write_off_ids: transaction.productWriteOffIds || null,

    // Sync status
    synced_to_backoffice: transaction.syncedToBackoffice,
    synced_at: transaction.syncedAt || null,

    // Department
    department: transaction.department
  }
}

/**
 * Convert Supabase row to SalesTransaction (snake_case → camelCase)
 */
export function fromSupabase(row: any): SalesTransaction {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    // Reference links
    paymentId: row.payment_id,
    orderId: row.order_id,
    billId: row.bill_id,
    itemId: row.item_id,
    shiftId: row.shift_id,

    // Menu data
    menuItemId: row.menu_item_id,
    menuItemName: row.menu_item_name,
    variantId: row.variant_id,
    variantName: row.variant_name,

    // Sale data
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    totalPrice: Number(row.total_price),
    paymentMethod: row.payment_method,

    // Date/time
    soldAt: row.sold_at,
    processedBy: row.processed_by,

    // Recipe/Inventory link
    recipeId: row.recipe_id,
    recipeWriteOffId: row.recipe_write_off_id,

    // JSONB fields (already parsed by Supabase client)
    profitCalculation: row.profit_calculation as ProfitCalculation,
    decompositionSummary: row.decomposition_summary as DecompositionSummary,
    actualCost: row.actual_cost, // ✅ SPRINT 2: FIFO actual cost

    // ✅ SPRINT 8: Tax storage
    serviceTaxRate: row.service_tax_rate ? Number(row.service_tax_rate) : undefined,
    serviceTaxAmount: row.service_tax_amount ? Number(row.service_tax_amount) : undefined,
    governmentTaxRate: row.government_tax_rate ? Number(row.government_tax_rate) : undefined,
    governmentTaxAmount: row.government_tax_amount ? Number(row.government_tax_amount) : undefined,
    totalTaxAmount: row.total_tax_amount ? Number(row.total_tax_amount) : undefined,

    // ✅ SPRINT 2: Write-off IDs
    preparationWriteOffIds: row.preparation_write_off_ids,
    productWriteOffIds: row.product_write_off_ids,

    // Sync status
    syncedToBackoffice: row.synced_to_backoffice,
    syncedAt: row.synced_at,

    // Department
    department: row.department
  }
}
