// src/stores/recipes/composables/useCategoryManagement.ts

import { supabase } from '@/supabase/client'
import { DebugUtils, TimeUtils, extractErrorDetails } from '@/utils'
import { executeSupabaseQuery, executeSupabaseMutation } from '@/utils/supabase'
import { ENV } from '@/config/environment'
import type { PreparationCategory, RecipeCategory } from '../types'

const MODULE_NAME = 'useCategoryManagement'

// Helper: Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return ENV.useSupabase && !!supabase
}

export interface CreatePreparationCategoryData {
  key: string
  name: string
  description?: string
  icon?: string
  emoji?: string
  color?: string
  sortOrder?: number
  isActive?: boolean
}

export interface CreateRecipeCategoryData {
  key: string
  name: string
  description?: string
  color?: string
  icon?: string
  sortOrder?: number
  isActive?: boolean
}

/**
 * Composable for managing categories (preparations and recipes)
 */
export function useCategoryManagement() {
  // =============================================
  // PREPARATION CATEGORIES - CRUD OPERATIONS
  // =============================================

  /**
   * Create new preparation category
   */
  async function createPreparationCategory(
    data: CreatePreparationCategoryData
  ): Promise<PreparationCategory> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase is not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating preparation category', { data })

      const now = TimeUtils.getCurrentLocalISO()

      // Get max sort order
      const categories = await executeSupabaseQuery(
        supabase.from('preparation_categories').select('sort_order'),
        `${MODULE_NAME}.getMaxSortOrder`
      )

      const maxSortOrder =
        categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0

      const categoryData = {
        key: data.key,
        name: data.name,
        description: data.description || null,
        icon: data.icon || null,
        emoji: data.emoji || null,
        color: data.color || null,
        sort_order: data.sortOrder ?? maxSortOrder + 1,
        is_active: data.isActive ?? true,
        created_at: now,
        updated_at: now
      }

      const insertedCategory = await executeSupabaseMutation(async () => {
        const { data: result, error } = await supabase
          .from('preparation_categories')
          .insert(categoryData)
          .select()
          .single()

        if (error) throw error
        return result
      }, `${MODULE_NAME}.createPreparationCategory`)

      const category: PreparationCategory = {
        id: insertedCategory.id,
        key: insertedCategory.key,
        name: insertedCategory.name,
        description: insertedCategory.description,
        icon: insertedCategory.icon,
        emoji: insertedCategory.emoji,
        color: insertedCategory.color,
        sortOrder: insertedCategory.sort_order,
        isActive: insertedCategory.is_active,
        createdAt: insertedCategory.created_at,
        updatedAt: insertedCategory.updated_at
      }

      DebugUtils.info(MODULE_NAME, 'Preparation category created', { id: category.id })
      return category
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating preparation category', error)
      throw error
    }
  }

  /**
   * Update preparation category
   */
  async function updatePreparationCategory(
    id: string,
    data: Partial<CreatePreparationCategoryData>
  ): Promise<PreparationCategory> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase is not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Updating preparation category', { id, data })

      const updateData: any = {
        updated_at: TimeUtils.getCurrentLocalISO()
      }

      if (data.key !== undefined) updateData.key = data.key
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.icon !== undefined) updateData.icon = data.icon
      if (data.emoji !== undefined) updateData.emoji = data.emoji
      if (data.color !== undefined) updateData.color = data.color
      if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder
      if (data.isActive !== undefined) updateData.is_active = data.isActive

      const updatedCategory = await executeSupabaseMutation(async () => {
        const { data: result, error } = await supabase
          .from('preparation_categories')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return result
      }, `${MODULE_NAME}.updatePreparationCategory`)

      const category: PreparationCategory = {
        id: updatedCategory.id,
        key: updatedCategory.key,
        name: updatedCategory.name,
        description: updatedCategory.description,
        icon: updatedCategory.icon,
        emoji: updatedCategory.emoji,
        color: updatedCategory.color,
        sortOrder: updatedCategory.sort_order,
        isActive: updatedCategory.is_active,
        createdAt: updatedCategory.created_at,
        updatedAt: updatedCategory.updated_at
      }

      DebugUtils.info(MODULE_NAME, 'Preparation category updated', { id })
      return category
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating preparation category', error)
      throw error
    }
  }

  /**
   * Delete preparation category
   * WARNING: This will fail if category is used by any preparations
   */
  async function deletePreparationCategory(id: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase is not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Deleting preparation category', { id })

      // Check if category is in use
      const preparations = await executeSupabaseQuery(
        supabase.from('preparations').select('id').eq('type', id).limit(1),
        `${MODULE_NAME}.checkCategoryUsage`
      )

      if (preparations.length > 0) {
        throw new Error(
          'Cannot delete category: it is currently used by one or more preparations. Please reassign or delete those preparations first.'
        )
      }

      await executeSupabaseMutation(async () => {
        const { error } = await supabase.from('preparation_categories').delete().eq('id', id)
        if (error) throw error
      }, `${MODULE_NAME}.deletePreparationCategory`)

      DebugUtils.info(MODULE_NAME, 'Preparation category deleted', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting preparation category', error)
      throw error
    }
  }

  // =============================================
  // RECIPE CATEGORIES - CRUD OPERATIONS
  // =============================================

  /**
   * Create new recipe category
   */
  async function createRecipeCategory(data: CreateRecipeCategoryData): Promise<RecipeCategory> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase is not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Creating recipe category', { data })

      const now = TimeUtils.getCurrentLocalISO()

      // Get max sort order
      const categories = await executeSupabaseQuery(
        supabase.from('recipe_categories').select('sort_order'),
        `${MODULE_NAME}.getMaxSortOrder`
      )

      const maxSortOrder =
        categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) : 0

      const categoryData = {
        key: data.key,
        name: data.name,
        description: data.description || null,
        color: data.color || null,
        icon: data.icon || null,
        sort_order: data.sortOrder ?? maxSortOrder + 1,
        is_active: data.isActive ?? true,
        created_at: now,
        updated_at: now
      }

      const insertedCategory = await executeSupabaseMutation(async () => {
        const { data: result, error } = await supabase
          .from('recipe_categories')
          .insert(categoryData)
          .select()
          .single()

        if (error) throw error
        return result
      }, `${MODULE_NAME}.createRecipeCategory`)

      const category: RecipeCategory = {
        id: insertedCategory.id,
        key: insertedCategory.key,
        name: insertedCategory.name,
        description: insertedCategory.description,
        color: insertedCategory.color,
        icon: insertedCategory.icon,
        sortOrder: insertedCategory.sort_order,
        isActive: insertedCategory.is_active,
        createdAt: insertedCategory.created_at,
        updatedAt: insertedCategory.updated_at
      }

      DebugUtils.info(MODULE_NAME, 'Recipe category created', { id: category.id })
      return category
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating recipe category', error)
      throw error
    }
  }

  /**
   * Update recipe category
   */
  async function updateRecipeCategory(
    id: string,
    data: Partial<CreateRecipeCategoryData>
  ): Promise<RecipeCategory> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase is not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Updating recipe category', { id, data })

      const updateData: any = {
        updated_at: TimeUtils.getCurrentLocalISO()
      }

      if (data.key !== undefined) updateData.key = data.key
      if (data.name !== undefined) updateData.name = data.name
      if (data.description !== undefined) updateData.description = data.description
      if (data.color !== undefined) updateData.color = data.color
      if (data.icon !== undefined) updateData.icon = data.icon
      if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder
      if (data.isActive !== undefined) updateData.is_active = data.isActive

      const updatedCategory = await executeSupabaseMutation(async () => {
        const { data: result, error } = await supabase
          .from('recipe_categories')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return result
      }, `${MODULE_NAME}.updateRecipeCategory`)

      const category: RecipeCategory = {
        id: updatedCategory.id,
        key: updatedCategory.key,
        name: updatedCategory.name,
        description: updatedCategory.description,
        color: updatedCategory.color,
        icon: updatedCategory.icon,
        sortOrder: updatedCategory.sort_order,
        isActive: updatedCategory.is_active,
        createdAt: updatedCategory.created_at,
        updatedAt: updatedCategory.updated_at
      }

      DebugUtils.info(MODULE_NAME, 'Recipe category updated', { id })
      return category
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating recipe category', error)
      throw error
    }
  }

  /**
   * Delete recipe category
   * WARNING: This will fail if category is used by any recipes
   */
  async function deleteRecipeCategory(id: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase is not available')
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Deleting recipe category', { id })

      // Check if category is in use
      const recipes = await executeSupabaseQuery(
        supabase.from('recipes').select('id').eq('category', id).limit(1),
        `${MODULE_NAME}.checkCategoryUsage`
      )

      if (recipes.length > 0) {
        throw new Error(
          'Cannot delete category: it is currently used by one or more recipes. Please reassign or delete those recipes first.'
        )
      }

      await executeSupabaseMutation(async () => {
        const { error } = await supabase.from('recipe_categories').delete().eq('id', id)
        if (error) throw error
      }, `${MODULE_NAME}.deleteRecipeCategory`)

      DebugUtils.info(MODULE_NAME, 'Recipe category deleted', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting recipe category', error)
      throw error
    }
  }

  return {
    // Preparation categories
    createPreparationCategory,
    updatePreparationCategory,
    deletePreparationCategory,

    // Recipe categories
    createRecipeCategory,
    updateRecipeCategory,
    deleteRecipeCategory
  }
}
