// src/stores/websiteMenu/websiteMenuService.ts

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { mapCategoryFromDB, mapMenuItemFromDB } from './supabaseMappers'
import type {
  WebsiteMenuCategory,
  WebsiteMenuItem,
  CreateWebsiteCategoryDto,
  UpdateWebsiteCategoryDto,
  CreateWebsiteMenuItemDto,
  UpdateWebsiteMenuItemDto
} from './types'

const MODULE_NAME = 'WebsiteMenuService'

export const websiteMenuService = {
  // ===== CATEGORIES =====

  async getCategories(): Promise<WebsiteMenuCategory[]> {
    const { data, error } = await supabase
      .from('website_menu_categories')
      .select('*')
      .order('sort_order')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch categories', { error })
      throw error
    }

    return (data || []).map(mapCategoryFromDB)
  },

  async createCategory(dto: CreateWebsiteCategoryDto): Promise<WebsiteMenuCategory> {
    const { data, error } = await supabase
      .from('website_menu_categories')
      .insert({
        name: dto.name,
        name_en: dto.nameEn || null,
        description: dto.description || null,
        slug: dto.slug || null,
        image_url: dto.imageUrl || null,
        parent_id: dto.parentId || null,
        is_active: dto.isActive ?? true
      })
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create category', { error })
      throw error
    }

    return mapCategoryFromDB(data)
  },

  async updateCategory(id: string, dto: UpdateWebsiteCategoryDto): Promise<WebsiteMenuCategory> {
    const updateData: Record<string, any> = {}
    if (dto.name !== undefined) updateData.name = dto.name
    if (dto.nameEn !== undefined) updateData.name_en = dto.nameEn
    if (dto.description !== undefined) updateData.description = dto.description
    if (dto.slug !== undefined) updateData.slug = dto.slug
    if (dto.imageUrl !== undefined) updateData.image_url = dto.imageUrl
    if (dto.parentId !== undefined) updateData.parent_id = dto.parentId
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive

    const { data, error } = await supabase
      .from('website_menu_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update category', { error })
      throw error
    }

    return mapCategoryFromDB(data)
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from('website_menu_categories').delete().eq('id', id)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete category', { error })
      throw error
    }
  },

  async reorderCategories(items: { id: string; sortOrder: number }[]): Promise<void> {
    for (const item of items) {
      const { error } = await supabase
        .from('website_menu_categories')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id)

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to reorder category', { error, item })
        throw error
      }
    }
  },

  // ===== ITEMS =====

  async getItems(categoryId?: string): Promise<WebsiteMenuItem[]> {
    let query = supabase.from('website_menu_items').select('*').order('sort_order')

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch items', { error })
      throw error
    }

    return (data || []).map(mapMenuItemFromDB)
  },

  async addItem(dto: CreateWebsiteMenuItemDto): Promise<WebsiteMenuItem> {
    const { data, error } = await supabase
      .from('website_menu_items')
      .insert({
        category_id: dto.categoryId,
        menu_item_id: dto.menuItemId,
        variant_id: dto.variantId || null,
        display_name: dto.displayName || null,
        display_description: dto.displayDescription || null,
        display_image_url: dto.displayImageUrl || null,
        variant_display_mode: dto.variantDisplayMode || 'options'
      })
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to add item', { error })
      throw error
    }

    return mapMenuItemFromDB(data)
  },

  async bulkAddItems(items: CreateWebsiteMenuItemDto[]): Promise<WebsiteMenuItem[]> {
    const rows = items.map(dto => ({
      category_id: dto.categoryId,
      menu_item_id: dto.menuItemId,
      variant_id: dto.variantId || null,
      display_name: dto.displayName || null,
      display_description: dto.displayDescription || null,
      display_image_url: dto.displayImageUrl || null,
      variant_display_mode: dto.variantDisplayMode || 'options'
    }))

    const { data, error } = await supabase.from('website_menu_items').insert(rows).select()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to bulk add items', { error })
      throw error
    }

    return (data || []).map(mapMenuItemFromDB)
  },

  async updateItem(id: string, dto: UpdateWebsiteMenuItemDto): Promise<WebsiteMenuItem> {
    const updateData: Record<string, any> = {}
    if (dto.displayName !== undefined) updateData.display_name = dto.displayName
    if (dto.displayDescription !== undefined)
      updateData.display_description = dto.displayDescription
    if (dto.displayImageUrl !== undefined) updateData.display_image_url = dto.displayImageUrl
    if (dto.variantDisplayMode !== undefined)
      updateData.variant_display_mode = dto.variantDisplayMode
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive

    const { data, error } = await supabase
      .from('website_menu_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update item', { error })
      throw error
    }

    return mapMenuItemFromDB(data)
  },

  async removeItem(id: string): Promise<void> {
    const { error } = await supabase.from('website_menu_items').delete().eq('id', id)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove item', { error })
      throw error
    }
  },

  async reorderItems(items: { id: string; sortOrder: number }[]): Promise<void> {
    for (const item of items) {
      const { error } = await supabase
        .from('website_menu_items')
        .update({ sort_order: item.sortOrder })
        .eq('id', item.id)

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to reorder item', { error, item })
        throw error
      }
    }
  }
}
