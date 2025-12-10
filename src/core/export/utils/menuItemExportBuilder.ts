/**
 * Menu Item Export Builder
 * Builds CombinationsExportData for menu items
 * Used by both individual item export and bulk menu export
 */

import type {
  CombinationsExportData,
  CombinationExport,
  VariantCombinationGroup,
  VariantDefaultModifier,
  MenuItemDetailExport,
  UniqueModifierRecipeExport
} from '../types'
import type { MenuItem, MenuItemVariant, ModifierOption } from '@/stores/menu/types'
import { exportService } from '../ExportService'
import {
  generateCombinations,
  calculateTotalCombinations,
  getUniqueModifierOptions,
  getDefaultModifiersForVariant,
  buildModifiersDisplayName,
  type DefaultModifierInfo
} from './combinationGenerator'
import {
  calculateCombinationExport,
  buildAllModifierRecipes,
  buildUniqueRecipesWithPortions,
  buildVariantCompositionRecipes,
  type CostCalculationContext
} from './combinationCostCalculator'
import {
  calculateFoodCostRange,
  type CostCalculationContext as ModifierCostContext
} from '@/core/cost/modifierCostCalculator'

export interface MenuItemExportBuilderOptions {
  includeAllCombinations?: boolean
  includeRecipes?: boolean
  maxCombinations?: number
}

/**
 * Calculate variant cost from composition
 */
function calculateVariantCost(
  variant: MenuItemVariant,
  context: CostCalculationContext
): { totalCost: number; foodCostPercent: number } {
  const { productsStore, recipesStore } = context
  let totalCost = 0

  for (const comp of variant.composition || []) {
    const quantity = comp.quantity || 0
    let unitCost = 0

    if (comp.type === 'product') {
      const product = productsStore.getProductById(comp.id)
      unitCost = product?.baseCostPerUnit || 0
    } else if (comp.type === 'recipe') {
      const recipeCost = recipesStore.getRecipeCostCalculation(comp.id)
      if (recipeCost && recipeCost.costPerPortion > 0) {
        unitCost = recipeCost.costPerPortion
      } else {
        const recipe = recipesStore.getRecipeById(comp.id)
        unitCost = recipe?.costPerPortion || 0
      }
    } else if (comp.type === 'preparation') {
      const prep = recipesStore.getPreparationById(comp.id)
      const prepCost = recipesStore.getPreparationCostCalculation(comp.id)
      unitCost = prepCost?.costPerOutputUnit || prep?.lastKnownCost || prep?.costPerPortion || 0
    }

    totalCost += quantity * unitCost
  }

  const foodCostPercent = variant.price > 0 ? (totalCost / variant.price) * 100 : 0

  return { totalCost, foodCostPercent }
}

/**
 * Calculate modifier option cost
 */
function calculateModifierOptionCost(
  option: ModifierOption,
  portionMultiplier: number,
  context: CostCalculationContext
): number {
  const { productsStore, recipesStore } = context
  let cost = 0

  if (option.composition && option.composition.length > 0) {
    for (const comp of option.composition) {
      const quantity = comp.quantity || 1
      let unitCost = 0

      if (comp.type === 'product') {
        const product = productsStore.getProductById(comp.id)
        unitCost = product?.baseCostPerUnit || 0
      } else if (comp.type === 'recipe') {
        const recipeCost = recipesStore.getRecipeCostCalculation(comp.id)
        if (recipeCost && recipeCost.costPerPortion > 0) {
          unitCost = recipeCost.costPerPortion
        } else {
          const recipe = recipesStore.getRecipeById(comp.id)
          unitCost = recipe?.costPerPortion || 0
        }
      } else if (comp.type === 'preparation') {
        const prep = recipesStore.getPreparationById(comp.id)
        const prepCost = recipesStore.getPreparationCostCalculation(comp.id)
        unitCost = prepCost?.costPerOutputUnit || prep?.lastKnownCost || prep?.costPerPortion || 0
      }

      cost += quantity * unitCost * portionMultiplier
    }
  }
  return cost
}

/**
 * Calculate min/max food cost range for a variant using the new heuristic algorithm
 * This properly handles:
 * - Optional modifiers (not just required)
 * - Replacement modifiers (subtract replaced cost, add replacement)
 * - Price adjustments affecting FC% denominator
 */
function calculateVariantFoodCostRangeNew(
  variant: MenuItemVariant,
  item: MenuItem,
  context: CostCalculationContext
) {
  // Convert context to the format expected by modifierCostCalculator
  const modifierContext: ModifierCostContext = {
    productsStore: context.productsStore,
    recipesStore: context.recipesStore
  }

  return calculateFoodCostRange(variant, item, modifierContext)
}

/**
 * Build CombinationsExportData for a menu item
 */
export function buildMenuItemExportData(
  item: MenuItem,
  categoryName: string,
  context: CostCalculationContext,
  options: MenuItemExportBuilderOptions = {}
): CombinationsExportData {
  const { includeAllCombinations = false, includeRecipes = false, maxCombinations = 10 } = options

  const isSummaryMode = !includeAllCombinations

  // Get sorted active variants
  const sortedVariants = [...(item.variants || [])]
    .filter(v => v.isActive)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  // Calculate variant costs
  const variantCosts = sortedVariants.map(variant => calculateVariantCost(variant, context))

  // Generate combinations
  const combinations = generateCombinations(sortedVariants, item.modifierGroups || [], {
    maxCombinations: includeAllCombinations ? undefined : maxCombinations,
    includeAll: includeAllCombinations
  })

  // Calculate costs for each combination
  const combinationExports: CombinationExport[] = combinations.map(combo =>
    calculateCombinationExport(combo, context)
  )

  // Get unique modifier options
  const uniqueOptions = getUniqueModifierOptions(combinations)

  // Build modifier recipes (legacy format)
  const modifierRecipes = buildAllModifierRecipes(uniqueOptions, context)

  // Build unique recipes with portion columns (new format)
  let uniqueRecipes: UniqueModifierRecipeExport[] | undefined
  if (includeRecipes) {
    // Build modifier recipes
    const modifierUniqueRecipes = buildUniqueRecipesWithPortions(uniqueOptions, context)
    modifierUniqueRecipes.forEach(r => (r.source = 'modifier'))

    // Build variant composition recipes
    const variantRecipes = buildVariantCompositionRecipes(sortedVariants, context)

    // Combine and deduplicate
    const recipeMap = new Map<string, UniqueModifierRecipeExport>()
    for (const recipe of variantRecipes) {
      recipeMap.set(recipe.recipeId, recipe)
    }
    for (const recipe of modifierUniqueRecipes) {
      if (!recipeMap.has(recipe.recipeId)) {
        recipeMap.set(recipe.recipeId, recipe)
      }
    }

    uniqueRecipes = Array.from(recipeMap.values()).sort((a, b) => {
      if (a.source !== b.source) {
        return a.source === 'variant' ? -1 : 1
      }
      return a.recipeName.localeCompare(b.recipeName)
    })
  }

  // Build variant groups
  const variantGroups: VariantCombinationGroup[] = sortedVariants.map((variant, vIdx) => {
    const variantBaseCost = variantCosts[vIdx]?.totalCost || 0
    // Use the new heuristic algorithm for min/max food cost calculation
    const foodCostRange = calculateVariantFoodCostRangeNew(variant, item, context)
    const variantCombos = combinationExports.filter(
      c => c.variantName === (variant.name || 'Standard')
    )

    let defaultModifiers: VariantDefaultModifier[] | undefined
    let defaultCombination: CombinationExport | undefined
    let minCombination: CombinationExport | undefined
    let maxCombination: CombinationExport | undefined

    if (isSummaryMode) {
      const defaultModifierInfos = getDefaultModifiersForVariant(item.modifierGroups || [])

      defaultModifiers = defaultModifierInfos.map((dm: DefaultModifierInfo) => {
        const portionMultiplier = variant.portionMultiplier || 1
        const modifierCost = calculateModifierOptionCost(dm.option, portionMultiplier, context)
        const portionSize = dm.option.composition?.[0]?.quantity || 1

        return {
          groupName: dm.groupName,
          modifierName: dm.modifierName,
          portionSize: portionSize * portionMultiplier,
          cost: modifierCost
        }
      })

      // Build min combination from heuristic result
      if (foodCostRange.minCombination) {
        minCombination = {
          variantName: variant.name || 'Standard',
          displayName: foodCostRange.minCombination.name || 'Min FC%',
          price: foodCostRange.minCombination.price,
          cost: foodCostRange.minCombination.cost,
          foodCostPercent: foodCostRange.minCombination.foodCostPercent,
          margin: foodCostRange.minCombination.margin
        }
      }

      // Build max combination from heuristic result
      if (foodCostRange.maxCombination) {
        maxCombination = {
          variantName: variant.name || 'Standard',
          displayName: foodCostRange.maxCombination.name || 'Max FC%',
          price: foodCostRange.maxCombination.price,
          cost: foodCostRange.maxCombination.cost,
          foodCostPercent: foodCostRange.maxCombination.foodCostPercent,
          margin: foodCostRange.maxCombination.margin
        }
      }

      // Build default combination from heuristic result (more accurate than legacy calculation)
      if (foodCostRange.defaultCombination) {
        defaultCombination = {
          variantName: variant.name || 'Standard',
          displayName: foodCostRange.defaultCombination.name || 'Default',
          price: foodCostRange.defaultCombination.price,
          cost: foodCostRange.defaultCombination.cost,
          foodCostPercent: foodCostRange.defaultCombination.foodCostPercent,
          margin: foodCostRange.defaultCombination.margin
        }
      } else {
        // Fallback to legacy calculation if no modifiers
        const totalModifierCost = defaultModifiers.reduce((sum, dm) => sum + dm.cost, 0)
        const totalCost = variantBaseCost + totalModifierCost
        const totalPrice = variant.price

        defaultCombination = {
          variantName: variant.name || 'Standard',
          displayName: buildModifiersDisplayName(
            defaultModifierInfos.map(dm => ({
              group: item.modifierGroups!.find(g => g.id === dm.groupId)!,
              option: dm.option
            }))
          ),
          price: totalPrice,
          cost: totalCost,
          foodCostPercent: totalPrice > 0 ? (totalCost / totalPrice) * 100 : 0,
          margin: totalPrice - totalCost
        }
      }
    }

    return {
      variantName: variant.name || 'Standard',
      variantPrice: variant.price,
      variantBaseCost,
      minFoodCostPercent: foodCostRange.minFoodCostPercent,
      maxFoodCostPercent: foodCostRange.maxFoodCostPercent,
      minCost: foodCostRange.minCost,
      maxCost: foodCostRange.maxCost,
      minPrice: foodCostRange.minPrice,
      maxPrice: foodCostRange.maxPrice,
      minCombination,
      maxCombination,
      defaultCombination,
      defaultModifiers,
      combinations: variantCombos
    }
  })

  // Build item detail
  const itemDetail: MenuItemDetailExport = {
    name: item.name,
    category: categoryName,
    department: item.department,
    dishType: item.dishType,
    description: item.description,
    variants: sortedVariants.map((variant, vIdx) => ({
      name: variant.name || 'Standard',
      price: variant.price,
      cost: variantCosts[vIdx]?.totalCost || 0,
      foodCostPercent: variantCosts[vIdx]?.foodCostPercent || 0,
      margin: variant.price - (variantCosts[vIdx]?.totalCost || 0),
      composition: []
    }))
  }

  // Calculate total combinations count
  const totalCount = calculateTotalCombinations(sortedVariants, item.modifierGroups || [])

  return {
    title: item.name,
    date: exportService.formatDate(),
    item: itemDetail,
    variantGroups,
    combinations: combinationExports,
    modifierRecipes,
    uniqueRecipes,
    totalCombinationsCount: totalCount,
    isLimited: !includeAllCombinations && combinationExports.length < totalCount,
    isSummaryMode
  }
}
