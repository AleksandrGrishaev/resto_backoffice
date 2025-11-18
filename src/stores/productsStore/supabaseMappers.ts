// src/stores/productsStore/supabaseMappers.ts
// Mappers for Products ↔ Supabase conversion

import type { Product, PackageOption } from './types'
import type { Tables, TablesInsert, TablesUpdate } from '@/supabase/types.gen'

// =============================================
// SUPABASE TYPES (from generated types.gen.ts)
// =============================================

export type SupabaseProduct = Tables<'products'>
export type SupabaseProductInsert = TablesInsert<'products'>
export type SupabaseProductUpdate = TablesUpdate<'products'>

export type SupabasePackageOption = Tables<'package_options'>
export type SupabasePackageOptionInsert = TablesInsert<'package_options'>
export type SupabasePackageOptionUpdate = TablesUpdate<'package_options'>

// =============================================
// PRODUCT MAPPERS
// =============================================

/**
 * Convert Product to Supabase INSERT format
 */
export function productToSupabaseInsert(product: Product): SupabaseProductInsert {
  return {
    id: product.id,
    name: product.name,
    name_en: product.nameEn || null,
    name_ru: null, // Not used in TypeScript interface
    description: product.description || null,
    category: product.category,
    base_unit: product.baseUnit,
    base_cost_per_unit: product.baseCostPerUnit,
    yield_percentage: product.yieldPercentage || 100,
    can_be_sold: product.canBeSold,
    used_in_departments: product.usedInDepartments.length > 0 ? product.usedInDepartments : null,
    is_active: product.isActive,
    storage_conditions: product.storageConditions || null,
    shelf_life: product.shelfLife || null,
    min_stock: product.minStock || null,
    max_stock: product.maxStock || null,
    lead_time_days: product.leadTimeDays || null,
    primary_supplier_id: product.primarySupplierId || null,
    tags: product.tags && product.tags.length > 0 ? product.tags : null,
    recommended_package_id: product.recommendedPackageId || null,

    // Additional Supabase fields (required by schema)
    price: product.baseCostPerUnit, // Use base cost as price for now
    unit: product.baseUnit, // Same as base_unit
    track_stock: true, // Always track stock
    is_available: product.isActive, // Available if active
    barcode: null, // Not tracked yet
    sku: null, // Not tracked yet
    cost: product.baseCostPerUnit, // Same as base_cost_per_unit
    current_stock: null, // Managed by storage system
    image_url: null, // Not tracked yet

    updated_at: product.updatedAt
  }
}

/**
 * Convert Product to Supabase UPDATE format
 */
export function productToSupabaseUpdate(product: Product): SupabaseProductUpdate {
  const insert = productToSupabaseInsert(product)
  // created_at is immutable, already omitted by type
  return insert
}

/**
 * Convert Supabase row to Product
 *
 * NOTE: packageOptions must be loaded separately via JOIN or secondary query
 */
export function productFromSupabase(
  row: SupabaseProduct,
  packageOptions: PackageOption[] = []
): Product {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en || undefined,
    description: row.description || undefined,
    category: row.category as any, // ProductCategory
    baseUnit: row.base_unit as any, // BaseUnit
    baseCostPerUnit: row.base_cost_per_unit,
    yieldPercentage: row.yield_percentage || 100,
    canBeSold: row.can_be_sold ?? false,
    usedInDepartments: (row.used_in_departments as any) || ['kitchen'],
    isActive: row.is_active ?? true,
    storageConditions: row.storage_conditions || undefined,
    shelfLife: row.shelf_life || undefined,
    minStock: row.min_stock || undefined,
    maxStock: row.max_stock || undefined,
    leadTimeDays: row.lead_time_days || undefined,
    primarySupplierId: row.primary_supplier_id || undefined,
    tags: row.tags || undefined,
    recommendedPackageId: row.recommended_package_id || undefined,
    packageOptions, // Passed from JOIN or secondary query
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  }
}

// =============================================
// PACKAGE OPTION MAPPERS
// =============================================

/**
 * Convert PackageOption to Supabase INSERT format
 */
export function packageOptionToSupabaseInsert(
  packageOption: PackageOption
): SupabasePackageOptionInsert {
  return {
    id: packageOption.id,
    product_id: packageOption.productId,
    package_name: packageOption.packageName,
    package_size: packageOption.packageSize,
    package_unit: packageOption.packageUnit,
    brand_name: packageOption.brandName || null,
    package_price: packageOption.packagePrice || null,
    base_cost_per_unit: packageOption.baseCostPerUnit,
    is_active: packageOption.isActive,
    notes: packageOption.notes || null,
    updated_at: packageOption.updatedAt
  }
}

/**
 * Convert PackageOption to Supabase UPDATE format
 */
export function packageOptionToSupabaseUpdate(
  packageOption: PackageOption
): SupabasePackageOptionUpdate {
  const insert = packageOptionToSupabaseInsert(packageOption)
  // created_at is immutable, already omitted by type
  return insert
}

/**
 * Convert Supabase row to PackageOption
 */
export function packageOptionFromSupabase(row: SupabasePackageOption): PackageOption {
  return {
    id: row.id,
    productId: row.product_id,
    packageName: row.package_name,
    packageSize: row.package_size,
    packageUnit: row.package_unit as any, // MeasurementUnit
    brandName: row.brand_name || undefined,
    packagePrice: row.package_price || undefined,
    baseCostPerUnit: row.base_cost_per_unit,
    isActive: row.is_active ?? true,
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  }
}

// =============================================
// BATCH OPERATIONS
// =============================================

/**
 * Convert multiple products to Supabase format
 */
export function productsToSupabase(products: Product[]): SupabaseProductInsert[] {
  return products.map(productToSupabaseInsert)
}

/**
 * Convert multiple Supabase rows to products
 */
export function productsFromSupabase(
  rows: SupabaseProduct[],
  packageOptionsMap: Map<string, PackageOption[]> = new Map()
): Product[] {
  return rows.map(row => productFromSupabase(row, packageOptionsMap.get(row.id) || []))
}

/**
 * Convert multiple package options to Supabase format
 */
export function packageOptionsToSupabase(
  packageOptions: PackageOption[]
): SupabasePackageOptionInsert[] {
  return packageOptions.map(packageOptionToSupabaseInsert)
}

/**
 * Convert multiple Supabase rows to package options
 */
export function packageOptionsFromSupabase(rows: SupabasePackageOption[]): PackageOption[] {
  return rows.map(packageOptionFromSupabase)
}
