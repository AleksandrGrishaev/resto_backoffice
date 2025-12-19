// src/stores/recipes/composables/useRecipeUsage.ts
// "Used In" feature for Recipes and Preparations (Phase 1 - Recipe Nesting)

import type { Recipe, Preparation } from '../types'
import type { MenuItem } from '@/stores/menu/types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'useRecipeUsage'

// =============================================
// TYPES
// =============================================

/**
 * Where a recipe is used
 */
export interface RecipeUsageInfo {
  // Used in Menu Items
  menuItems: MenuItemUsage[]

  // Used in other Recipes (nested recipes)
  parentRecipes: ParentRecipeUsage[]

  // Summary
  totalUsages: number
}

/**
 * Where a preparation is used
 */
export interface PreparationUsageInfo {
  // Used in Recipes
  recipes: RecipeUsageReference[]

  // Used in other Preparations (nested preparations)
  parentPreparations: ParentPreparationUsage[]

  // Summary
  totalUsages: number
}

export interface MenuItemUsage {
  menuItemId: string
  menuItemName: string
  variantId?: string
  variantName?: string
  quantity: number
  unit: string
  isActive: boolean
}

export interface ParentRecipeUsage {
  recipeId: string
  recipeName: string
  recipeCode: string
  quantity: number
  unit: string
  isActive: boolean
}

export interface RecipeUsageReference {
  recipeId: string
  recipeName: string
  recipeCode: string
  quantity: number
  unit: string
  isActive: boolean
}

export interface ParentPreparationUsage {
  preparationId: string
  preparationName: string
  preparationCode: string
  quantity: number
  unit: string
  isActive: boolean
}

// =============================================
// MAIN COMPOSABLE
// =============================================

export function useRecipeUsage() {
  /**
   * Finds all usages of a specific recipe
   *
   * @param recipeId - ID of the recipe to search for
   * @param allRecipes - All recipes in the system
   * @param allMenuItems - All menu items in the system
   * @returns Usage information
   */
  function findRecipeUsage(
    recipeId: string,
    allRecipes: Recipe[],
    allMenuItems: MenuItem[]
  ): RecipeUsageInfo {
    DebugUtils.info(MODULE_NAME, 'Finding recipe usage', { recipeId })

    const usageInfo: RecipeUsageInfo = {
      menuItems: [],
      parentRecipes: [],
      totalUsages: 0
    }

    // 1. Find usage in Menu Items
    for (const menuItem of allMenuItems) {
      for (const variant of menuItem.variants) {
        // Check composition
        for (const comp of variant.composition) {
          if (comp.type === 'recipe' && comp.id === recipeId) {
            usageInfo.menuItems.push({
              menuItemId: menuItem.id,
              menuItemName: menuItem.name,
              variantId: variant.id,
              variantName: variant.name,
              quantity: comp.quantity,
              unit: comp.unit,
              isActive: menuItem.isActive
            })
          }
        }
      }
    }

    // 2. ⭐ NEW: Find usage in other Recipes (nested recipes)
    for (const recipe of allRecipes) {
      // Skip self-reference
      if (recipe.id === recipeId) continue

      // Check if this recipe uses our target recipe as a component
      for (const component of recipe.components) {
        if (component.componentType === 'recipe' && component.componentId === recipeId) {
          // ⭐ FIX: For nested recipes, find the actual recipe to get its portionUnit
          const nestedRecipe = allRecipes.find(r => r.id === recipeId)
          const displayUnit = nestedRecipe?.portionUnit || component.unit || 'portion'

          usageInfo.parentRecipes.push({
            recipeId: recipe.id,
            recipeName: recipe.name,
            recipeCode: recipe.code,
            quantity: component.quantity,
            unit: displayUnit, // ⭐ Use recipe's portionUnit instead of stored unit
            isActive: recipe.isActive
          })
        }
      }
    }

    usageInfo.totalUsages = usageInfo.menuItems.length + usageInfo.parentRecipes.length

    DebugUtils.info(MODULE_NAME, 'Recipe usage found', {
      recipeId,
      menuItems: usageInfo.menuItems.length,
      parentRecipes: usageInfo.parentRecipes.length,
      totalUsages: usageInfo.totalUsages
    })

    return usageInfo
  }

  /**
   * Finds all usages of a specific preparation
   *
   * @param preparationId - ID of the preparation to search for
   * @param allPreparations - All preparations in the system
   * @param allRecipes - All recipes in the system
   * @returns Usage information
   */
  function findPreparationUsage(
    preparationId: string,
    allPreparations: Preparation[],
    allRecipes: Recipe[]
  ): PreparationUsageInfo {
    DebugUtils.info(MODULE_NAME, 'Finding preparation usage', { preparationId })

    const usageInfo: PreparationUsageInfo = {
      recipes: [],
      parentPreparations: [],
      totalUsages: 0
    }

    // 1. Find usage in Recipes
    for (const recipe of allRecipes) {
      for (const component of recipe.components) {
        if (component.componentType === 'preparation' && component.componentId === preparationId) {
          usageInfo.recipes.push({
            recipeId: recipe.id,
            recipeName: recipe.name,
            recipeCode: recipe.code,
            quantity: component.quantity,
            unit: component.unit,
            isActive: recipe.isActive
          })
        }
      }
    }

    // 2. Find usage in other Preparations (nested preparations)
    for (const preparation of allPreparations) {
      // Skip self-reference
      if (preparation.id === preparationId) continue

      // Check if this preparation uses our target preparation as an ingredient
      for (const ingredient of preparation.recipe) {
        if (ingredient.type === 'preparation' && ingredient.id === preparationId) {
          usageInfo.parentPreparations.push({
            preparationId: preparation.id,
            preparationName: preparation.name,
            preparationCode: preparation.code,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            isActive: preparation.isActive
          })
        }
      }
    }

    usageInfo.totalUsages = usageInfo.recipes.length + usageInfo.parentPreparations.length

    DebugUtils.info(MODULE_NAME, 'Preparation usage found', {
      preparationId,
      recipes: usageInfo.recipes.length,
      parentPreparations: usageInfo.parentPreparations.length,
      totalUsages: usageInfo.totalUsages
    })

    return usageInfo
  }

  /**
   * Checks if a recipe can be safely deleted
   *
   * @param recipeId - ID of the recipe to check
   * @param allRecipes - All recipes in the system
   * @param allMenuItems - All menu items in the system
   * @returns True if recipe can be deleted (not used anywhere)
   */
  function canDeleteRecipe(
    recipeId: string,
    allRecipes: Recipe[],
    allMenuItems: MenuItem[]
  ): { canDelete: boolean; blockingUsages?: string[] } {
    const usage = findRecipeUsage(recipeId, allRecipes, allMenuItems)

    if (usage.totalUsages === 0) {
      return { canDelete: true }
    }

    const blockingUsages: string[] = []

    // Add menu item usages
    usage.menuItems.forEach(item => {
      blockingUsages.push(`Menu Item: ${item.menuItemName} (${item.variantName})`)
    })

    // Add parent recipe usages
    usage.parentRecipes.forEach(item => {
      blockingUsages.push(`Recipe: ${item.recipeName}`)
    })

    return {
      canDelete: false,
      blockingUsages
    }
  }

  /**
   * Checks if a preparation can be safely deleted
   *
   * @param preparationId - ID of the preparation to check
   * @param allPreparations - All preparations in the system
   * @param allRecipes - All recipes in the system
   * @returns True if preparation can be deleted (not used anywhere)
   */
  function canDeletePreparation(
    preparationId: string,
    allPreparations: Preparation[],
    allRecipes: Recipe[]
  ): { canDelete: boolean; blockingUsages?: string[] } {
    const usage = findPreparationUsage(preparationId, allPreparations, allRecipes)

    if (usage.totalUsages === 0) {
      return { canDelete: true }
    }

    const blockingUsages: string[] = []

    // Add recipe usages
    usage.recipes.forEach(item => {
      blockingUsages.push(`Recipe: ${item.recipeName}`)
    })

    // Add parent preparation usages
    usage.parentPreparations.forEach(item => {
      blockingUsages.push(`Preparation: ${item.preparationName}`)
    })

    return {
      canDelete: false,
      blockingUsages
    }
  }

  return {
    findRecipeUsage,
    findPreparationUsage,
    canDeleteRecipe,
    canDeletePreparation
  }
}
