// src/stores/recipes/composables/useConversionCheck.ts
// Validation logic for Recipe ↔ Preparation conversion

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import type { Recipe, Preparation } from '../types'

const MODULE_NAME = 'useConversionCheck'

export interface ConversionCheckResult {
  canConvert: boolean
  blockers: string[]
  warnings: string[]
  batchCount?: number
}

export function useConversionCheck() {
  /**
   * Check if a recipe can be converted to a preparation
   */
  async function checkRecipeToPreparation(recipe: Recipe): Promise<ConversionCheckResult> {
    const blockers: string[] = []
    const warnings: string[] = []

    // Blocker: recipe has sub-recipe components (preparations can't contain recipes)
    const subRecipes = recipe.components.filter(c => c.componentType === 'recipe')
    if (subRecipes.length > 0) {
      blockers.push(
        `Recipe contains ${subRecipes.length} sub-recipe component(s). Preparations cannot contain recipes. Replace them with preparations or products first.`
      )
    }

    DebugUtils.info(MODULE_NAME, 'Recipe→Preparation check', {
      recipeId: recipe.id,
      blockers: blockers.length,
      warnings: warnings.length
    })

    return {
      canConvert: blockers.length === 0,
      blockers,
      warnings
    }
  }

  /**
   * Check if a preparation can be converted to a recipe
   */
  async function checkPreparationToRecipe(
    preparation: Preparation
  ): Promise<ConversionCheckResult> {
    const blockers: string[] = []
    const warnings: string[] = []
    let batchCount = 0

    // Blocker: preparation is used as ingredient in other preparations
    try {
      const { data: parentPreps } = await supabase
        .from('preparation_ingredients')
        .select('preparation_id')
        .eq('ingredient_id', preparation.id)
        .eq('type', 'preparation')

      if (parentPreps && parentPreps.length > 0) {
        blockers.push(
          `Preparation is used as ingredient in ${parentPreps.length} other preparation(s). Recipes cannot be used inside preparations. Remove those references first.`
        )
      }
    } catch (err) {
      DebugUtils.warn(MODULE_NAME, 'Failed to check parent preparations', { err })
    }

    // Warning: active batches will be archived
    try {
      const { data: batches, count } = await supabase
        .from('storage_batches')
        .select('id', { count: 'exact' })
        .eq('item_id', preparation.id)
        .eq('item_type', 'preparation')
        .eq('is_active', true)
        .gt('current_quantity', 0)

      batchCount = count || batches?.length || 0
      if (batchCount > 0) {
        warnings.push(`${batchCount} active batch(es) with remaining stock will be archived.`)
      }
    } catch (err) {
      DebugUtils.warn(MODULE_NAME, 'Failed to check batches', { err })
    }

    DebugUtils.info(MODULE_NAME, 'Preparation→Recipe check', {
      preparationId: preparation.id,
      blockers: blockers.length,
      warnings: warnings.length,
      batchCount
    })

    return {
      canConvert: blockers.length === 0,
      blockers,
      warnings,
      batchCount
    }
  }

  return {
    checkRecipeToPreparation,
    checkPreparationToRecipe
  }
}
