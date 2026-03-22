// src/stores/websiteMenu/supabaseMappers.ts

import type { WebsiteMenuCategory, WebsiteMenuItem } from './types'

export function mapCategoryFromDB(row: any): WebsiteMenuCategory {
  return {
    id: row.id,
    name: row.name,
    nameEn: row.name_en || undefined,
    description: row.description || undefined,
    slug: row.slug || undefined,
    imageUrl: row.image_url || undefined,
    parentId: row.parent_id || null,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapMenuItemFromDB(row: any): WebsiteMenuItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    menuItemId: row.menu_item_id,
    variantId: row.variant_id || null,
    sortOrder: row.sort_order ?? 0,
    displayName: row.display_name || undefined,
    displayDescription: row.display_description || undefined,
    displayImageUrl: row.display_image_url || undefined,
    variantDisplayMode: row.variant_display_mode || 'options',
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
