/**
 * Combination Cost Calculator Utility
 * Calculates costs for modifier combinations
 */

import type { useProductsStore } from '@/stores/productsStore'
import type { useRecipesStore } from '@/stores/recipes/recipesStore'
import type {
  MenuItemVariant,
  MenuComposition,
  ModifierGroup,
  ModifierOption
} from '@/stores/menu/types'
import type {
  CombinationExport,
  ModifierRecipeGroupExport,
  ModifierIngredientExport,
  NestedIngredientExport,
  UniqueModifierRecipeExport,
  ModifierPortionUsage,
  UniqueRecipeIngredientExport
} from '../types'
import type { GeneratedCombination, SelectedOptionInfo } from './combinationGenerator'
import { buildCombinationDisplayName } from './combinationGenerator'

// =============================================
// Types
// =============================================

export interface CostCalculationContext {
  productsStore: ReturnType<typeof useProductsStore>
  recipesStore: ReturnType<typeof useRecipesStore>
}

export interface CombinationCostResult {
  baseCost: number
  modifierCosts: Map<string, number> // optionId -> cost
  totalCost: number
  totalPrice: number
  foodCostPercent: number
  margin: number
}

// =============================================
// Main Functions
// =============================================

/**
 * Calculate costs for a combination and convert to export format
 */
export function calculateCombinationExport(
  combination: GeneratedCombination,
  context: CostCalculationContext
): CombinationExport {
  const costResult = calculateCombinationCost(combination, context)

  return {
    variantName: combination.variant.name || 'Standard',
    displayName: buildCombinationDisplayName(combination),
    price: costResult.totalPrice,
    cost: costResult.totalCost,
    foodCostPercent: costResult.foodCostPercent,
    margin: costResult.margin
  }
}

/**
 * Calculate all costs for a combination
 */
export function calculateCombinationCost(
  combination: GeneratedCombination,
  context: CostCalculationContext
): CombinationCostResult {
  const { variant, selectedOptions } = combination
  const portionMultiplier = variant.portionMultiplier || 1

  // Calculate base cost from variant composition
  const baseCost = calculateCompositionCost(variant.composition || [], context)

  // Calculate modifier costs
  const modifierCosts = new Map<string, number>()
  let totalModifierCost = 0
  let totalPriceAdjustment = 0

  for (const selection of selectedOptions) {
    const optionCost = calculateModifierOptionCost(selection.option, portionMultiplier, context)
    modifierCosts.set(selection.option.id, optionCost)
    totalModifierCost += optionCost
    totalPriceAdjustment += selection.option.priceAdjustment || 0
  }

  const totalCost = baseCost + totalModifierCost
  const totalPrice = variant.price + totalPriceAdjustment
  const foodCostPercent = totalPrice > 0 ? (totalCost / totalPrice) * 100 : 0
  const margin = totalPrice - totalCost

  return {
    baseCost,
    modifierCosts,
    totalCost,
    totalPrice,
    foodCostPercent,
    margin
  }
}

/**
 * Calculate cost of a composition array
 */
export function calculateCompositionCost(
  composition: MenuComposition[],
  context: CostCalculationContext
): number {
  let totalCost = 0

  for (const comp of composition) {
    totalCost += calculateComponentCost(comp, context)
  }

  return totalCost
}

/**
 * Calculate cost of a single component
 */
export function calculateComponentCost(
  comp: MenuComposition,
  context: CostCalculationContext
): number {
  const { productsStore, recipesStore } = context
  const quantity = comp.quantity || 1

  if (comp.type === 'product') {
    const product = productsStore.getProductById(comp.id)
    if (product) {
      return quantity * (product.baseCostPerUnit || 0)
    }
  } else if (comp.type === 'recipe') {
    const recipeCost = recipesStore.getRecipeCostCalculation(comp.id)
    if (recipeCost && recipeCost.costPerPortion > 0) {
      return quantity * recipeCost.costPerPortion
    }
    // Fallback to recipe costPerPortion
    const recipe = recipesStore.getRecipeById(comp.id)
    if (recipe?.costPerPortion && recipe.costPerPortion > 0) {
      return quantity * recipe.costPerPortion
    }
  } else if (comp.type === 'preparation') {
    const prepCost = recipesStore.getPreparationCostCalculation(comp.id)
    if (prepCost && prepCost.costPerOutputUnit > 0) {
      return quantity * prepCost.costPerOutputUnit
    }
    // Fallback to preparation lastKnownCost
    const prep = recipesStore.getPreparationById(comp.id)
    if (prep?.lastKnownCost && prep.lastKnownCost > 0) {
      return quantity * prep.lastKnownCost
    }
    if (prep?.costPerPortion && prep.costPerPortion > 0) {
      return quantity * prep.costPerPortion
    }
  }

  return 0
}

/**
 * Calculate cost of a modifier option (scaled by portionMultiplier)
 */
export function calculateModifierOptionCost(
  option: ModifierOption,
  portionMultiplier: number,
  context: CostCalculationContext
): number {
  if (!option.composition || option.composition.length === 0) {
    return 0
  }

  let totalCost = 0

  for (const comp of option.composition) {
    const baseCost = calculateComponentCost(comp, context)
    // Apply portionMultiplier to modifier costs
    totalCost += baseCost * portionMultiplier
  }

  return totalCost
}

// =============================================
// Modifier Recipe Export Functions
// =============================================

/**
 * Build modifier recipe data for export
 */
export function buildModifierRecipeExport(
  group: ModifierGroup,
  option: ModifierOption,
  context: CostCalculationContext
): ModifierRecipeGroupExport {
  const ingredients: ModifierIngredientExport[] = []
  let totalCost = 0

  // Get quantity and unit from first composition (for display)
  let quantity: number | undefined
  let unit: string | undefined
  let recipeId: string | undefined

  if (option.composition && option.composition.length > 0) {
    const firstComp = option.composition[0]
    quantity = firstComp.quantity
    unit = firstComp.unit
    recipeId = firstComp.id

    // Build ingredients from composition
    for (const comp of option.composition) {
      const ingredient = buildIngredientExport(comp, context)
      ingredients.push(ingredient)
      totalCost += ingredient.cost
    }
  }

  return {
    modifierName: option.name,
    groupName: group.name,
    recipeId,
    ingredients,
    totalCost,
    quantity,
    unit
  }
}

/**
 * Build ingredient export from composition
 */
function buildIngredientExport(
  comp: MenuComposition,
  context: CostCalculationContext
): ModifierIngredientExport {
  const { productsStore, recipesStore } = context
  const quantity = comp.quantity || 1
  let name = ''
  let cost = 0
  let nestedIngredients: NestedIngredientExport[] | undefined

  if (comp.type === 'product') {
    const product = productsStore.getProductById(comp.id)
    name = product?.name || comp.id
    cost = quantity * (product?.baseCostPerUnit || 0)
  } else if (comp.type === 'recipe') {
    const recipe = recipesStore.getRecipeById(comp.id)
    name = recipe?.name || comp.id

    // Calculate recipe cost
    const recipeCost = recipesStore.getRecipeCostCalculation(comp.id)
    if (recipeCost) {
      cost = quantity * recipeCost.costPerPortion
    } else if (recipe?.costPerPortion) {
      cost = quantity * recipe.costPerPortion
    }

    // Get nested ingredients from recipe
    if (recipe?.components) {
      nestedIngredients = []
      for (const rc of recipe.components) {
        const nestedIng = buildNestedIngredient(
          rc.componentId,
          rc.componentType,
          rc.quantity,
          rc.unit,
          context
        )
        if (nestedIng) {
          nestedIngredients.push(nestedIng)
        }
      }
    }
  } else if (comp.type === 'preparation') {
    const prep = recipesStore.getPreparationById(comp.id)
    name = prep?.name || comp.id

    // Calculate preparation cost
    const prepCost = recipesStore.getPreparationCostCalculation(comp.id)
    if (prepCost) {
      cost = quantity * prepCost.costPerOutputUnit
    } else if (prep?.lastKnownCost) {
      cost = quantity * prep.lastKnownCost
    } else if (prep?.costPerPortion) {
      cost = quantity * prep.costPerPortion
    }

    // Get nested ingredients from preparation recipe
    if (prep?.recipe) {
      nestedIngredients = []
      for (const pi of prep.recipe) {
        const nestedIng = buildNestedIngredient(pi.id, pi.type, pi.quantity, pi.unit, context)
        if (nestedIng) {
          nestedIngredients.push(nestedIng)
        }
      }
    }
  }

  return {
    name,
    type: comp.type,
    quantity,
    unit: comp.unit,
    cost,
    nestedIngredients: nestedIngredients?.length ? nestedIngredients : undefined
  }
}

/**
 * Build nested ingredient export with recursive expansion support
 */
function buildNestedIngredient(
  componentId: string,
  componentType: string,
  quantity: number,
  unit: string,
  context: CostCalculationContext,
  depth: number = 0 // Prevent infinite recursion
): NestedIngredientExport | null {
  const { productsStore, recipesStore } = context
  const MAX_DEPTH = 5 // Maximum nesting depth

  if (depth > MAX_DEPTH) return null

  let name = ''
  let cost = 0
  let nestedComponents: NestedIngredientExport[] | undefined

  if (componentType === 'product') {
    const product = productsStore.getProductById(componentId)
    if (!product) return null
    name = product.name
    cost = quantity * (product.baseCostPerUnit || 0)
  } else if (componentType === 'preparation') {
    const prep = recipesStore.getPreparationById(componentId)
    if (!prep) return null
    name = prep.name

    const prepCost = recipesStore.getPreparationCostCalculation(componentId)
    if (prepCost) {
      cost = quantity * prepCost.costPerOutputUnit
    } else if (prep.lastKnownCost) {
      cost = quantity * prep.lastKnownCost
    }

    // Build nested components from preparation recipe
    if (prep.recipe && prep.recipe.length > 0) {
      nestedComponents = []
      for (const item of prep.recipe) {
        const nested = buildNestedIngredient(
          item.id,
          item.type,
          item.quantity,
          item.unit,
          context,
          depth + 1
        )
        if (nested) {
          nestedComponents.push(nested)
        }
      }
    }
  } else if (componentType === 'recipe') {
    const recipe = recipesStore.getRecipeById(componentId)
    if (!recipe) return null
    name = recipe.name

    const recipeCost = recipesStore.getRecipeCostCalculation(componentId)
    if (recipeCost && recipeCost.costPerPortion > 0) {
      cost = quantity * recipeCost.costPerPortion
    } else if (recipe.costPerPortion) {
      cost = quantity * recipe.costPerPortion
    }

    // Build nested components from recipe components
    if (recipe.components && recipe.components.length > 0) {
      nestedComponents = []
      for (const comp of recipe.components) {
        const nested = buildNestedIngredient(
          comp.componentId,
          comp.componentType,
          comp.quantity,
          comp.unit,
          context,
          depth + 1
        )
        if (nested) {
          nestedComponents.push(nested)
        }
      }
    }
  } else {
    return null
  }

  return {
    name,
    type: componentType as 'product' | 'preparation' | 'recipe',
    quantity,
    unit,
    cost,
    nestedComponents: nestedComponents?.length ? nestedComponents : undefined
  }
}

/**
 * Build all modifier recipes for unique options in combinations
 */
export function buildAllModifierRecipes(
  uniqueOptions: Map<string, { group: ModifierGroup; option: ModifierOption }>,
  context: CostCalculationContext
): ModifierRecipeGroupExport[] {
  const recipes: ModifierRecipeGroupExport[] = []

  for (const [, { group, option }] of uniqueOptions) {
    // Only include options that have composition
    if (option.composition && option.composition.length > 0) {
      const recipe = buildModifierRecipeExport(group, option, context)
      recipes.push(recipe)
    }
  }

  // Sort by group name, then by modifier name
  recipes.sort((a, b) => {
    const groupCompare = a.groupName.localeCompare(b.groupName)
    if (groupCompare !== 0) return groupCompare
    return a.modifierName.localeCompare(b.modifierName)
  })

  return recipes
}

// =============================================
// Unique Recipes with Portion Columns
// =============================================

interface RecipePortionInfo {
  portionSize: number
  groupName: string
  modifierName: string
}

/**
 * Build unique recipes with portion columns
 * Groups recipes by their ID and shows all portion sizes used
 */
export function buildUniqueRecipesWithPortions(
  uniqueOptions: Map<string, { group: ModifierGroup; option: ModifierOption }>,
  context: CostCalculationContext
): UniqueModifierRecipeExport[] {
  const { productsStore, recipesStore } = context

  // Group options by recipe ID
  const recipeMap = new Map<
    string,
    {
      recipeId: string
      recipeType: 'product' | 'recipe' | 'preparation'
      recipeName: string
      portions: RecipePortionInfo[]
    }
  >()

  // Collect all options that have composition
  for (const [, { group, option }] of uniqueOptions) {
    if (!option.composition || option.composition.length === 0) continue

    // Use first composition item as the recipe
    const comp = option.composition[0]
    const recipeId = comp.id
    const portionSize = comp.quantity || 1

    if (!recipeMap.has(recipeId)) {
      // Get recipe name
      let recipeName = ''
      if (comp.type === 'product') {
        const product = productsStore.getProductById(comp.id)
        recipeName = product?.name || comp.id
      } else if (comp.type === 'recipe') {
        const recipe = recipesStore.getRecipeById(comp.id)
        recipeName = recipe?.name || comp.id
      } else if (comp.type === 'preparation') {
        const prep = recipesStore.getPreparationById(comp.id)
        recipeName = prep?.name || comp.id
      }

      recipeMap.set(recipeId, {
        recipeId,
        recipeType: comp.type,
        recipeName,
        portions: []
      })
    }

    const entry = recipeMap.get(recipeId)!
    entry.portions.push({
      portionSize,
      groupName: group.name,
      modifierName: option.name
    })
  }

  // Build unique recipes
  const uniqueRecipes: UniqueModifierRecipeExport[] = []

  for (const [recipeId, info] of recipeMap) {
    const recipe = buildUniqueRecipeExport(recipeId, info, context)
    if (recipe) {
      uniqueRecipes.push(recipe)
    }
  }

  // Sort by recipe name
  uniqueRecipes.sort((a, b) => a.recipeName.localeCompare(b.recipeName))

  return uniqueRecipes
}

/**
 * Build unique recipe export for a single recipe
 */
function buildUniqueRecipeExport(
  recipeId: string,
  info: {
    recipeId: string
    recipeType: 'product' | 'recipe' | 'preparation'
    recipeName: string
    portions: RecipePortionInfo[]
  },
  context: CostCalculationContext
): UniqueModifierRecipeExport | null {
  const { productsStore, recipesStore } = context

  // Get unique portion sizes and group them
  const portionMap = new Map<number, string[]>()
  for (const p of info.portions) {
    if (!portionMap.has(p.portionSize)) {
      portionMap.set(p.portionSize, [])
    }
    portionMap.get(p.portionSize)!.push(p.groupName)
  }

  const portions: ModifierPortionUsage[] = Array.from(portionMap.entries())
    .map(([portionSize, groups]) => ({
      portionSize,
      modifierGroups: [...new Set(groups)] // Remove duplicates
    }))
    .sort((a, b) => b.portionSize - a.portionSize) // Sort by portion size descending

  // Get yield and ingredients based on recipe type
  let yieldQuantity = 1
  let yieldUnit = 'portion'
  let totalCostPerYield = 0
  let recipeCode: string | undefined
  const ingredients: UniqueRecipeIngredientExport[] = []

  if (info.recipeType === 'product') {
    // For products, yield is 1 unit and the product itself is the ingredient
    const product = productsStore.getProductById(recipeId)
    if (!product) return null

    yieldQuantity = 1
    yieldUnit = product.unit || 'unit'
    totalCostPerYield = product.baseCostPerUnit || 0
    recipeCode = product.code

    const portionSizes = portions.map(p => p.portionSize)
    ingredients.push({
      name: product.name,
      type: 'product',
      quantityPerYield: 1,
      unit: yieldUnit,
      costPerYield: totalCostPerYield,
      quantitiesByPortion: new Map(portionSizes.map(ps => [ps, ps])),
      costsByPortion: new Map(portionSizes.map(ps => [ps, totalCostPerYield * ps]))
    })
  } else if (info.recipeType === 'recipe') {
    const recipe = recipesStore.getRecipeById(recipeId)
    if (!recipe) return null

    // Show actual yield from recipe (e.g., "200 gram") for transparency
    yieldQuantity = recipe.portionSize || 1
    yieldUnit = recipe.portionUnit || 'portion'
    recipeCode = recipe.code

    // Get PRE-CALCULATED cost data from store (already has correct ingredient costs)
    const recipeCost = recipesStore.getRecipeCostCalculation(recipeId)
    totalCostPerYield = recipeCost?.costPerPortion || recipe.costPerPortion || 0

    // Use pre-calculated componentCosts from store - no recalculation needed!
    if (recipeCost?.componentCosts) {
      for (const compCost of recipeCost.componentCosts) {
        ingredients.push(
          buildIngredientFromComponentCost(
            compCost,
            portions.map(p => p.portionSize),
            context
          )
        )
      }
    }
  } else if (info.recipeType === 'preparation') {
    const prep = recipesStore.getPreparationById(recipeId)
    if (!prep) return null

    // Show actual yield from preparation (e.g., "500 ml") for transparency
    yieldQuantity = prep.output?.quantity || 1
    yieldUnit = prep.output?.unit || 'portion'
    recipeCode = prep.code

    // Get PRE-CALCULATED cost data from store (already has correct ingredient costs)
    const prepCost = recipesStore.getPreparationCostCalculation(recipeId)
    totalCostPerYield =
      prepCost?.costPerOutputUnit || prep.lastKnownCost || prep.costPerPortion || 0

    // Use pre-calculated componentCosts from store - no recalculation needed!
    if (prepCost?.componentCosts) {
      for (const compCost of prepCost.componentCosts) {
        ingredients.push(
          buildIngredientFromComponentCost(
            compCost,
            portions.map(p => p.portionSize),
            context
          )
        )
      }
    }
  }

  return {
    recipeName: info.recipeName,
    recipeId,
    recipeCode,
    recipeType: info.recipeType,
    yield: {
      quantity: yieldQuantity,
      unit: yieldUnit
    },
    portions,
    ingredients,
    totalCostPerYield
  }
}

/**
 * Build ingredient export from pre-calculated ComponentPlanCost
 * This uses the already-calculated costs from the store, avoiding recalculation
 * Now includes nested component expansion for preparations and recipes
 */
function buildIngredientFromComponentCost(
  compCost: {
    componentId: string
    componentType: string
    componentName: string
    quantity: number
    unit: string
    planUnitCost: number
    totalPlanCost: number
  },
  portionSizes: number[],
  context?: CostCalculationContext
): UniqueRecipeIngredientExport {
  const quantityPerYield = compCost.quantity // NET quantity (cleaned)
  const costPerYield = compCost.totalPlanCost

  // Calculate RAW quantity from cost (includes yield adjustment)
  // rawQty = totalCost / unitCost
  const rawQuantityPerYield =
    compCost.planUnitCost > 0 ? compCost.totalPlanCost / compCost.planUnitCost : quantityPerYield

  // Calculate quantities and costs for each portion size
  const quantitiesByPortion = new Map<number, number>()
  const costsByPortion = new Map<number, number>()

  for (const portionSize of portionSizes) {
    quantitiesByPortion.set(portionSize, quantityPerYield * portionSize)
    costsByPortion.set(portionSize, costPerYield * portionSize)
  }

  // Build nested components for preparations and recipes
  let nestedComponents: NestedIngredientExport[] | undefined
  if (
    context &&
    (compCost.componentType === 'preparation' || compCost.componentType === 'recipe')
  ) {
    nestedComponents = buildNestedComponentsForIngredient(
      compCost.componentId,
      compCost.componentType,
      context
    )
  }

  return {
    name: compCost.componentName,
    type: compCost.componentType as 'product' | 'preparation' | 'recipe',
    quantityPerYield,
    rawQuantityPerYield: rawQuantityPerYield !== quantityPerYield ? rawQuantityPerYield : undefined,
    unit: compCost.unit,
    costPerYield,
    quantitiesByPortion,
    costsByPortion,
    nestedComponents
  }
}

/**
 * Build nested components for a preparation or recipe ingredient
 */
function buildNestedComponentsForIngredient(
  componentId: string,
  componentType: string,
  context: CostCalculationContext
): NestedIngredientExport[] | undefined {
  const { recipesStore } = context

  if (componentType === 'preparation') {
    const prep = recipesStore.getPreparationById(componentId)
    if (!prep?.recipe || prep.recipe.length === 0) return undefined

    const nestedComponents: NestedIngredientExport[] = []
    for (const item of prep.recipe) {
      const nested = buildNestedIngredient(item.id, item.type, item.quantity, item.unit, context, 0)
      if (nested) {
        nestedComponents.push(nested)
      }
    }
    return nestedComponents.length > 0 ? nestedComponents : undefined
  } else if (componentType === 'recipe') {
    const recipe = recipesStore.getRecipeById(componentId)
    if (!recipe?.components || recipe.components.length === 0) return undefined

    const nestedComponents: NestedIngredientExport[] = []
    for (const comp of recipe.components) {
      const nested = buildNestedIngredient(
        comp.componentId,
        comp.componentType,
        comp.quantity,
        comp.unit,
        context,
        0
      )
      if (nested) {
        nestedComponents.push(nested)
      }
    }
    return nestedComponents.length > 0 ? nestedComponents : undefined
  }

  return undefined
}

/**
 * Build unique ingredient with quantities for all portion sizes
 * @param useYieldPercentage - If true, apply yield percentage adjustment for products
 * @deprecated Use buildIngredientFromComponentCost with pre-calculated store data instead
 */
function buildUniqueIngredient(
  componentId: string,
  componentType: string,
  quantityPerYield: number,
  unit: string,
  portionSizes: number[],
  context: CostCalculationContext,
  useYieldPercentage: boolean = false
): UniqueRecipeIngredientExport | null {
  const { productsStore, recipesStore } = context
  let name = ''
  let costPerYield = 0

  if (componentType === 'product') {
    const product = productsStore.getProductById(componentId)
    if (!product) return null
    name = product.name

    // Apply yield percentage adjustment if enabled (same as useCostCalculation.ts)
    let adjustedQuantity = quantityPerYield
    if (useYieldPercentage && product.yieldPercentage && product.yieldPercentage < 100) {
      adjustedQuantity = quantityPerYield / (product.yieldPercentage / 100)
    }
    costPerYield = adjustedQuantity * (product.baseCostPerUnit || 0)
  } else if (componentType === 'preparation') {
    const prep = recipesStore.getPreparationById(componentId)
    if (!prep) return null
    name = prep.name
    const prepCost = recipesStore.getPreparationCostCalculation(componentId)
    costPerYield = quantityPerYield * (prepCost?.costPerOutputUnit || prep.lastKnownCost || 0)
  } else if (componentType === 'recipe') {
    // Handle recipe type - use pre-calculated cost
    const recipe = recipesStore.getRecipeById(componentId)
    if (!recipe) return null
    name = recipe.name
    const recipeCost = recipesStore.getRecipeCostCalculation(componentId)
    costPerYield = quantityPerYield * (recipeCost?.costPerPortion || recipe.costPerPortion || 0)
  } else {
    return null
  }

  // Calculate quantities and costs for each portion size
  const quantitiesByPortion = new Map<number, number>()
  const costsByPortion = new Map<number, number>()

  for (const portionSize of portionSizes) {
    quantitiesByPortion.set(portionSize, quantityPerYield * portionSize)
    costsByPortion.set(portionSize, costPerYield * portionSize)
  }

  return {
    name,
    type: componentType as 'product' | 'preparation' | 'recipe',
    quantityPerYield,
    unit,
    costPerYield,
    quantitiesByPortion,
    costsByPortion
  }
}

// =============================================
// Variant Composition Recipes Export
// =============================================

/**
 * Build recipes from variant composition (main dish ingredients)
 * These are the base recipes used in each variant, not modifier options
 */
export function buildVariantCompositionRecipes(
  variants: MenuItemVariant[],
  context: CostCalculationContext
): UniqueModifierRecipeExport[] {
  const { productsStore, recipesStore } = context

  // Collect all unique recipes/preparations from all variants
  const recipeMap = new Map<
    string,
    {
      recipeId: string
      recipeType: 'product' | 'recipe' | 'preparation'
      recipeName: string
      variants: string[] // Which variants use this recipe
      quantities: number[] // Quantities used in each variant
    }
  >()

  for (const variant of variants) {
    if (!variant.composition) continue

    for (const comp of variant.composition) {
      // Only include recipes and preparations (not products directly)
      if (comp.type === 'product') continue

      const recipeId = comp.id
      const quantity = comp.quantity || 1

      if (!recipeMap.has(recipeId)) {
        // Get recipe name
        let recipeName = ''
        if (comp.type === 'recipe') {
          const recipe = recipesStore.getRecipeById(comp.id)
          recipeName = recipe?.name || comp.id
        } else if (comp.type === 'preparation') {
          const prep = recipesStore.getPreparationById(comp.id)
          recipeName = prep?.name || comp.id
        }

        recipeMap.set(recipeId, {
          recipeId,
          recipeType: comp.type,
          recipeName,
          variants: [],
          quantities: []
        })
      }

      const entry = recipeMap.get(recipeId)!
      entry.variants.push(variant.name || 'Standard')
      entry.quantities.push(quantity)
    }
  }

  // Build unique recipes
  const uniqueRecipes: UniqueModifierRecipeExport[] = []

  for (const [recipeId, info] of recipeMap) {
    const recipe = buildVariantRecipeExport(recipeId, info, context)
    if (recipe) {
      recipe.source = 'variant' // Mark as from variant composition
      uniqueRecipes.push(recipe)
    }
  }

  // Sort by recipe name
  uniqueRecipes.sort((a, b) => a.recipeName.localeCompare(b.recipeName))

  return uniqueRecipes
}

/**
 * Build variant recipe export for a single recipe/preparation
 */
function buildVariantRecipeExport(
  recipeId: string,
  info: {
    recipeId: string
    recipeType: 'product' | 'recipe' | 'preparation'
    recipeName: string
    variants: string[]
    quantities: number[]
  },
  context: CostCalculationContext
): UniqueModifierRecipeExport | null {
  const { productsStore, recipesStore } = context

  // Build portions from variants (using quantities as portion sizes)
  const portionMap = new Map<number, string[]>()
  for (let i = 0; i < info.variants.length; i++) {
    const quantity = info.quantities[i]
    const variantName = info.variants[i]
    if (!portionMap.has(quantity)) {
      portionMap.set(quantity, [])
    }
    portionMap.get(quantity)!.push(variantName)
  }

  const portions: ModifierPortionUsage[] = Array.from(portionMap.entries())
    .map(([portionSize, groups]) => ({
      portionSize,
      modifierGroups: [...new Set(groups)] // Use variant names as "groups"
    }))
    .sort((a, b) => b.portionSize - a.portionSize)

  // Get yield and ingredients
  let yieldQuantity = 1
  let yieldUnit = 'portion'
  let totalCostPerYield = 0
  let recipeCode: string | undefined
  const ingredients: UniqueRecipeIngredientExport[] = []

  if (info.recipeType === 'recipe') {
    const recipe = recipesStore.getRecipeById(recipeId)
    if (!recipe) return null

    // Show actual yield from recipe (e.g., "200 gram") for transparency
    yieldQuantity = recipe.portionSize || 1
    yieldUnit = recipe.portionUnit || 'portion'
    recipeCode = recipe.code

    // Get PRE-CALCULATED cost data from store (already has correct ingredient costs)
    const recipeCost = recipesStore.getRecipeCostCalculation(recipeId)
    totalCostPerYield = recipeCost?.costPerPortion || recipe.costPerPortion || 0

    // Use pre-calculated componentCosts from store - no recalculation needed!
    const portionSizes = portions.map(p => p.portionSize)
    if (recipeCost?.componentCosts) {
      for (const compCost of recipeCost.componentCosts) {
        ingredients.push(buildIngredientFromComponentCost(compCost, portionSizes, context))
      }
    }
  } else if (info.recipeType === 'preparation') {
    const prep = recipesStore.getPreparationById(recipeId)
    if (!prep) return null

    // Show actual yield from preparation (e.g., "500 ml") for transparency
    yieldQuantity = prep.output?.quantity || 1
    yieldUnit = prep.output?.unit || 'portion'
    recipeCode = prep.code

    // Get PRE-CALCULATED cost data from store (already has correct ingredient costs)
    const prepCost = recipesStore.getPreparationCostCalculation(recipeId)
    totalCostPerYield =
      prepCost?.costPerOutputUnit || prep.lastKnownCost || prep.costPerPortion || 0

    // Use pre-calculated componentCosts from store - no recalculation needed!
    const portionSizes = portions.map(p => p.portionSize)
    if (prepCost?.componentCosts) {
      for (const compCost of prepCost.componentCosts) {
        ingredients.push(buildIngredientFromComponentCost(compCost, portionSizes, context))
      }
    }
  }

  return {
    recipeName: info.recipeName,
    recipeId,
    recipeCode,
    recipeType: info.recipeType,
    source: 'variant',
    yield: {
      quantity: yieldQuantity,
      unit: yieldUnit
    },
    portions,
    ingredients,
    totalCostPerYield
  }
}
