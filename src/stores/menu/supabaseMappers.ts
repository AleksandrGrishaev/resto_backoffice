// src/stores/menu/supabaseMappers.ts
// Mappers for Menu Categories and Menu Items ↔ Supabase conversion

import type { Category, MenuItem } from './types'
import type {
  SupabaseMenuCategory,
  SupabaseMenuCategoryInsert,
  SupabaseMenuCategoryUpdate,
  SupabaseMenuItem,
  SupabaseMenuItemInsert,
  SupabaseMenuItemUpdate
} from '@/supabase/types'

// =============================================
// CATEGORY MAPPERS
// =============================================

/**
 * Convert Category to Supabase INSERT format
 */
export function categoryToSupabaseInsert(category: Category): SupabaseMenuCategoryInsert {
  return {
    id: category.id,
    name: category.name,
    description: category.description || null,
    sort_order: category.sortOrder || 0,
    is_active: category.isActive,
    created_at: category.createdAt,
    updated_at: category.updatedAt
  }
}

/**
 * Convert Category to Supabase UPDATE format
 */
export function categoryToSupabaseUpdate(category: Category): SupabaseMenuCategoryUpdate {
  const insert = categoryToSupabaseInsert(category)
  // Remove created_at (immutable)
  const { created_at, ...update } = insert
  return update
}

/**
 * Convert Supabase row to Category
 */
export function categoryFromSupabase(row: SupabaseMenuCategory): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    sortOrder: row.sort_order || 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  }
}

// =============================================
// MENU ITEM MAPPERS
// =============================================

/**
 * Convert MenuItem to Supabase INSERT format
 *
 * Challenge: Complex nested structure (variants, modifierGroups, composition)
 * Solution: Store as JSONB, preserve exact TypeScript structure
 */
export function menuItemToSupabaseInsert(item: MenuItem): SupabaseMenuItemInsert {
  return {
    id: item.id,
    category_id: item.categoryId || null,
    name: item.name,
    name_en: (item as any).nameEn || null, // Optional English name
    description: item.description || null,

    // Pricing: Use first variant price as base price
    price: item.variants?.[0]?.price || 0,
    cost: calculateMenuItemCost(item),

    // Dish type
    dish_type: item.dishType || 'simple',

    // Complex nested data stored as JSONB
    // modifierGroups: Store exact TypeScript structure
    modifier_groups: (item.modifierGroups || []) as any,

    // variants: Store exact TypeScript structure (includes composition, modifiers, etc.)
    variants: (item.variants || []) as any,

    // Status and ordering
    is_active: item.isActive,
    sort_order: item.sortOrder || 0,

    // Media
    image_url: (item as any).imageUrl || null,

    // Timestamps
    created_at: item.createdAt,
    updated_at: item.updatedAt
  }
}

/**
 * Convert MenuItem to Supabase UPDATE format
 */
export function menuItemToSupabaseUpdate(item: MenuItem): SupabaseMenuItemUpdate {
  const insert = menuItemToSupabaseInsert(item)
  // Remove created_at (immutable)
  const { created_at, ...update } = insert
  return update
}

/**
 * Convert Supabase row to MenuItem
 *
 * JSONB fields (modifier_groups, variants) are already parsed by Supabase client
 */
export function menuItemFromSupabase(row: SupabaseMenuItem): MenuItem {
  return {
    id: row.id,
    categoryId: row.category_id || '',
    name: row.name,
    nameEn: row.name_en || undefined,
    description: row.description || undefined,

    // Type and department
    type: inferMenuItemType(row),
    department: (row.department as 'kitchen' | 'bar') || 'kitchen',

    // Dish type
    dishType: (row.dish_type as any) || 'simple',

    // Status and ordering
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order || 0,

    // Complex JSONB fields (already parsed by Supabase client)
    modifierGroups: (row.modifier_groups as any) || [],
    variants: (row.variants as any) || [],

    // Optional fields
    preparationTime: undefined, // Not stored in Supabase yet
    allergens: undefined,
    tags: undefined,
    templates: undefined,
    imageUrl: row.image_url || undefined,

    // Timestamps
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Calculate menu item cost based on composition
 * For now, returns 0 (cost calculation requires Products/Recipes integration)
 */
function calculateMenuItemCost(item: MenuItem): number {
  // TODO: Implement cost calculation when Products Store is integrated
  // Will need to:
  // 1. Get all composition items (products, recipes, preparations)
  // 2. Calculate total cost based on quantities
  // 3. Add modifier costs
  return 0
}

/**
 * Infer menu item type from name/category
 * This is a fallback for old data without explicit type field
 */
function inferMenuItemType(row: SupabaseMenuItem): 'food' | 'beverage' {
  const name = row.name.toLowerCase()
  const beverageKeywords = ['beer', 'wine', 'juice', 'soda', 'coffee', 'tea', 'water', 'drink']

  if (beverageKeywords.some(keyword => name.includes(keyword))) {
    return 'beverage'
  }

  return 'food'
}

/**
 * Infer department from dish type
 * component-based/addon-based → likely kitchen
 * simple → could be bar (beverages) or kitchen
 */
function inferDepartment(row: SupabaseMenuItem): 'kitchen' | 'bar' {
  const dishType = row.dish_type

  // Component-based and addon-based dishes are typically kitchen
  if (dishType === 'component-based' || dishType === 'addon-based') {
    return 'kitchen'
  }

  // For simple dishes, check if it's a beverage
  const type = inferMenuItemType(row)
  return type === 'beverage' ? 'bar' : 'kitchen'
}

// =============================================
// BATCH OPERATIONS
// =============================================

/**
 * Convert multiple categories to Supabase format
 */
export function categoriesToSupabase(categories: Category[]): SupabaseMenuCategoryInsert[] {
  return categories.map(categoryToSupabaseInsert)
}

/**
 * Convert multiple Supabase rows to categories
 */
export function categoriesFromSupabase(rows: SupabaseMenuCategory[]): Category[] {
  return rows.map(categoryFromSupabase)
}

/**
 * Convert multiple menu items to Supabase format
 */
export function menuItemsToSupabase(items: MenuItem[]): SupabaseMenuItemInsert[] {
  return items.map(menuItemToSupabaseInsert)
}

/**
 * Convert multiple Supabase rows to menu items
 */
export function menuItemsFromSupabase(rows: SupabaseMenuItem[]): MenuItem[] {
  return rows.map(menuItemFromSupabase)
}
