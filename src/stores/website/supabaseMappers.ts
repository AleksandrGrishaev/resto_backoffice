// src/stores/website/supabaseMappers.ts - DB row <-> domain mappers

import type { HomepageSection, HomepageFeaturedItem } from './types'

export function mapSectionFromDb(row: any): HomepageSection {
  return {
    id: row.id,
    slotPosition: row.slot_position,
    categoryId: row.category_id,
    title: row.title,
    maxItems: row.max_items,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryName: row.menu_categories?.name ?? undefined
  }
}

export function mapSectionToDb(section: Partial<HomepageSection>): Record<string, any> {
  const row: Record<string, any> = {}
  if (section.slotPosition !== undefined) row.slot_position = section.slotPosition
  if (section.categoryId !== undefined) row.category_id = section.categoryId
  if (section.title !== undefined) row.title = section.title
  if (section.maxItems !== undefined) row.max_items = section.maxItems
  if (section.isActive !== undefined) row.is_active = section.isActive
  return row
}

export function mapFeaturedItemFromDb(row: any): HomepageFeaturedItem {
  return {
    id: row.id,
    sectionId: row.section_id,
    menuItemId: row.menu_item_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    menuItemName: row.menu_items?.name ?? undefined,
    menuItemPrice: row.menu_items?.price ?? undefined,
    menuItemImageUrl: row.menu_items?.image_url ?? undefined,
    menuItemType: row.menu_items?.type ?? undefined
  }
}
