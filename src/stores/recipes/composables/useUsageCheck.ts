// src/stores/recipes/composables/useUsageCheck.ts

import { useMenuStore } from '@/stores/menu'
import { useRecipesStore } from '@/stores/recipes'
import type { Recipe, Preparation } from '../types'
import type { MenuItem } from '@/stores/menu/types'

export interface UsageLocation {
  type: 'menu' | 'recipe'
  id: string
  name: string
  details?: string
}

export interface UsageCheckResult {
  canArchive: boolean
  usageLocations: UsageLocation[]
}

/**
 * Composable для проверки использования рецептов и полуфабрикатов
 */
export function useUsageCheck() {
  const menuStore = useMenuStore()
  const recipesStore = useRecipesStore()

  /**
   * Проверить, используется ли рецепт в меню
   */
  function checkRecipeUsageInMenu(recipeId: string): UsageLocation[] {
    const usageLocations: UsageLocation[] = []
    const menuItems = menuStore.menuItems as MenuItem[]

    for (const menuItem of menuItems) {
      // Проверяем варианты
      for (const variant of menuItem.variants) {
        if (variant.composition) {
          const usedInVariant = variant.composition.some(
            comp => comp.type === 'recipe' && comp.id === recipeId
          )
          if (usedInVariant) {
            usageLocations.push({
              type: 'menu',
              id: menuItem.id,
              name: menuItem.name,
              details: `Variant: ${variant.name}`
            })
          }
        }
      }

      // Проверяем модификаторы
      if (menuItem.modifierGroups) {
        for (const group of menuItem.modifierGroups) {
          for (const option of group.options) {
            if (option.composition) {
              const usedInModifier = option.composition.some(
                comp => comp.type === 'recipe' && comp.id === recipeId
              )
              if (usedInModifier) {
                usageLocations.push({
                  type: 'menu',
                  id: menuItem.id,
                  name: menuItem.name,
                  details: `Modifier: ${group.name} - ${option.name}`
                })
              }
            }
          }
        }
      }
    }

    return usageLocations
  }

  /**
   * Проверить, используется ли полуфабрикат в меню
   */
  function checkPreparationUsageInMenu(preparationId: string): UsageLocation[] {
    const usageLocations: UsageLocation[] = []
    const menuItems = menuStore.menuItems as MenuItem[]

    for (const menuItem of menuItems) {
      // Проверяем варианты
      for (const variant of menuItem.variants) {
        if (variant.composition) {
          const usedInVariant = variant.composition.some(
            comp => comp.type === 'preparation' && comp.id === preparationId
          )
          if (usedInVariant) {
            usageLocations.push({
              type: 'menu',
              id: menuItem.id,
              name: menuItem.name,
              details: `Variant: ${variant.name}`
            })
          }
        }
      }

      // Проверяем модификаторы
      if (menuItem.modifierGroups) {
        for (const group of menuItem.modifierGroups) {
          for (const option of group.options) {
            if (option.composition) {
              const usedInModifier = option.composition.some(
                comp => comp.type === 'preparation' && comp.id === preparationId
              )
              if (usedInModifier) {
                usageLocations.push({
                  type: 'menu',
                  id: menuItem.id,
                  name: menuItem.name,
                  details: `Modifier: ${group.name} - ${option.name}`
                })
              }
            }
          }
        }
      }
    }

    return usageLocations
  }

  /**
   * Проверить, используется ли полуфабрикат в рецептах
   */
  function checkPreparationUsageInRecipes(preparationId: string): UsageLocation[] {
    const usageLocations: UsageLocation[] = []
    const recipes = recipesStore.recipes as Recipe[]

    for (const recipe of recipes) {
      if (recipe.components) {
        const usedInRecipe = recipe.components.some(
          comp => comp.componentType === 'preparation' && comp.componentId === preparationId
        )
        if (usedInRecipe) {
          usageLocations.push({
            type: 'recipe',
            id: recipe.id,
            name: recipe.name,
            details: `Recipe code: ${recipe.code}`
          })
        }
      }
    }

    return usageLocations
  }

  /**
   * Полная проверка использования рецепта
   */
  function checkRecipeUsage(recipeId: string): UsageCheckResult {
    const usageLocations: UsageLocation[] = []

    // Проверяем использование в меню
    const menuUsage = checkRecipeUsageInMenu(recipeId)
    usageLocations.push(...menuUsage)

    return {
      canArchive: usageLocations.length === 0,
      usageLocations
    }
  }

  /**
   * Полная проверка использования полуфабриката
   */
  function checkPreparationUsage(preparationId: string): UsageCheckResult {
    const usageLocations: UsageLocation[] = []

    // Проверяем использование в меню
    const menuUsage = checkPreparationUsageInMenu(preparationId)
    usageLocations.push(...menuUsage)

    // Проверяем использование в рецептах
    const recipeUsage = checkPreparationUsageInRecipes(preparationId)
    usageLocations.push(...recipeUsage)

    return {
      canArchive: usageLocations.length === 0,
      usageLocations
    }
  }

  return {
    checkRecipeUsage,
    checkPreparationUsage,
    checkRecipeUsageInMenu,
    checkPreparationUsageInMenu,
    checkPreparationUsageInRecipes
  }
}
