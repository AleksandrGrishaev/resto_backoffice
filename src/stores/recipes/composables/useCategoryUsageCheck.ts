// src/stores/recipes/composables/useCategoryUsageCheck.ts

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { executeSupabaseQuery } from '@/utils/supabase'
import { ENV } from '@/config/environment'

const MODULE_NAME = 'useCategoryUsageCheck'

// Helper: Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return ENV.useSupabase && !!supabase
}

export interface CategoryUsageResult {
  isUsed: boolean
  count: number
  canDelete: boolean
}

/**
 * Composable for checking if categories are in use
 */
export function useCategoryUsageCheck() {
  /**
   * Check if preparation category is used by any preparations
   */
  async function checkPreparationCategoryUsage(categoryId: string): Promise<CategoryUsageResult> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, assuming category is not used')
      return { isUsed: false, count: 0, canDelete: true }
    }

    try {
      const result = await executeSupabaseQuery(
        supabase
          .from('preparations')
          .select('id', { count: 'exact', head: false })
          .eq('type', categoryId),
        `${MODULE_NAME}.checkPreparationCategoryUsage`
      )

      const count = result.length
      const isUsed = count > 0

      DebugUtils.info(MODULE_NAME, 'Checked preparation category usage', {
        categoryId,
        count,
        isUsed
      })

      return {
        isUsed,
        count,
        canDelete: !isUsed
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error checking preparation category usage', error)
      // В случае ошибки, предполагаем, что категория используется (безопасный вариант)
      return { isUsed: true, count: 0, canDelete: false }
    }
  }

  /**
   * Check if recipe category is used by any recipes
   */
  async function checkRecipeCategoryUsage(categoryId: string): Promise<CategoryUsageResult> {
    if (!isSupabaseAvailable()) {
      DebugUtils.warn(MODULE_NAME, 'Supabase not available, assuming category is not used')
      return { isUsed: false, count: 0, canDelete: true }
    }

    try {
      const result = await executeSupabaseQuery(
        supabase
          .from('recipes')
          .select('id', { count: 'exact', head: false })
          .eq('category', categoryId),
        `${MODULE_NAME}.checkRecipeCategoryUsage`
      )

      const count = result.length
      const isUsed = count > 0

      DebugUtils.info(MODULE_NAME, 'Checked recipe category usage', {
        categoryId,
        count,
        isUsed
      })

      return {
        isUsed,
        count,
        canDelete: !isUsed
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error checking recipe category usage', error)
      // В случае ошибки, предполагаем, что категория используется (безопасный вариант)
      return { isUsed: true, count: 0, canDelete: false }
    }
  }

  return {
    checkPreparationCategoryUsage,
    checkRecipeCategoryUsage
  }
}
