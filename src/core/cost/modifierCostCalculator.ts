/**
 * Modifier Cost Calculator
 * Calculates min/max food cost for menu items with modifiers
 * Uses heuristic algorithm instead of computing all combinations
 */

import type {
  MenuItem,
  MenuItemVariant,
  ModifierGroup,
  ModifierOption,
  TargetComponent
} from '@/stores/menu/types'
import type { useProductsStore } from '@/stores/productsStore'
import type { useRecipesStore } from '@/stores/recipes/recipesStore'

// =============================================
// Types
// =============================================

export interface CostCalculationContext {
  productsStore: ReturnType<typeof useProductsStore>
  recipesStore: ReturnType<typeof useRecipesStore>
}

export interface ModifierCombinationResult {
  name: string // Display name like "Steak 1.5 + Just Vegetables"
  selectedOptions: SelectedOptionForCost[]
  cost: number
  price: number
  foodCostPercent: number
  margin: number
}

export interface SelectedOptionForCost {
  groupId: string
  groupName: string
  option: ModifierOption | null // null = no selection
}

export interface FoodCostRange {
  baseCost: number
  basePrice: number
  minCost: number
  maxCost: number
  minPrice: number
  maxPrice: number
  minFoodCostPercent: number
  maxFoodCostPercent: number
  minCombination: ModifierCombinationResult | null
  maxCombination: ModifierCombinationResult | null
  defaultCombination: ModifierCombinationResult | null
}

// =============================================
// Main Function
// =============================================

/**
 * Calculate min/max food cost range for a variant using heuristic algorithm
 * Instead of computing all N^M combinations, finds the globally optimal min/max
 *
 * Algorithm:
 * 1. Calculate base cost from variant composition
 * 2. For each modifier group, calculate "net impact" of each option
 *    - Net impact = optionCost - replacedCost + priceAdjustment effect on FC%
 * 3. For MIN FC%: select option with lowest FC% impact in each group
 * 4. For MAX FC%: select option with highest FC% impact in each group
 */
export function calculateFoodCostRange(
  variant: MenuItemVariant,
  item: MenuItem,
  context: CostCalculationContext
): FoodCostRange {
  const modifierGroups = item.modifierGroups || []
  const portionMultiplier = variant.portionMultiplier || 1

  // Calculate base cost (before any modifiers)
  const baseCost = calculateVariantBaseCost(variant, context)
  const basePrice = variant.price

  // Debug log
  console.log(`[ModifierCostCalc] ${item.name} - ${variant.name || 'Standard'}:`, {
    baseCost,
    basePrice,
    modifierGroupsCount: modifierGroups.length,
    groups: modifierGroups.map(g => ({
      name: g.name,
      type: g.type,
      isRequired: g.isRequired,
      optionsCount: g.options?.length,
      hasTargetComponents: !!g.targetComponents?.length
    }))
  })

  // If no modifiers, return base values
  if (modifierGroups.length === 0) {
    const baseFoodCostPercent = basePrice > 0 ? (baseCost / basePrice) * 100 : 0
    return {
      baseCost,
      basePrice,
      minCost: baseCost,
      maxCost: baseCost,
      minPrice: basePrice,
      maxPrice: basePrice,
      minFoodCostPercent: baseFoodCostPercent,
      maxFoodCostPercent: baseFoodCostPercent,
      minCombination: null,
      maxCombination: null,
      defaultCombination: null
    }
  }

  // Find min FC% combination (lowest food cost %)
  const minCombination = findMinFoodCostCombination(
    modifierGroups,
    baseCost,
    basePrice,
    portionMultiplier,
    context
  )

  // Find max FC% combination (highest food cost %)
  const maxCombination = findMaxFoodCostCombination(
    modifierGroups,
    baseCost,
    basePrice,
    portionMultiplier,
    context
  )

  // Find default combination (default options or first options)
  const defaultCombination = findDefaultCombination(
    modifierGroups,
    baseCost,
    basePrice,
    portionMultiplier,
    context
  )

  // Debug log result
  console.log(`[ModifierCostCalc] ${item.name} RESULT:`, {
    minFC: minCombination.foodCostPercent.toFixed(1) + '%',
    minCombo: minCombination.name,
    minCost: minCombination.cost,
    minPrice: minCombination.price,
    maxFC: maxCombination.foodCostPercent.toFixed(1) + '%',
    maxCombo: maxCombination.name,
    maxCost: maxCombination.cost,
    maxPrice: maxCombination.price,
    defaultFC: defaultCombination.foodCostPercent.toFixed(1) + '%',
    defaultCombo: defaultCombination.name
  })

  return {
    baseCost,
    basePrice,
    minCost: minCombination.cost,
    maxCost: maxCombination.cost,
    minPrice: minCombination.price,
    maxPrice: maxCombination.price,
    minFoodCostPercent: minCombination.foodCostPercent,
    maxFoodCostPercent: maxCombination.foodCostPercent,
    minCombination,
    maxCombination,
    defaultCombination
  }
}

// =============================================
// Heuristic Combination Finders
// =============================================

/**
 * Find combination with MINIMUM food cost %
 * Strategy: For each group, pick option that MINIMIZES FC%
 * - Consider "no selection" for optional groups
 * - Factor in both cost change AND price change
 */
function findMinFoodCostCombination(
  groups: ModifierGroup[],
  baseCost: number,
  basePrice: number,
  portionMultiplier: number,
  context: CostCalculationContext
): ModifierCombinationResult {
  const selectedOptions: SelectedOptionForCost[] = []

  for (const group of groups) {
    const activeOptions = group.options.filter(opt => opt.isActive !== false)

    // Calculate FC% impact for each option
    const optionImpacts = activeOptions.map(option => {
      const result = calculateOptionFoodCostImpact(
        option,
        group,
        baseCost,
        basePrice,
        portionMultiplier,
        context
      )
      return { option, ...result }
    })

    // For optional groups, include "no selection" as an option
    if (!group.isRequired) {
      optionImpacts.push({
        option: null as unknown as ModifierOption,
        costDelta: 0,
        priceDelta: 0,
        foodCostPercent: basePrice > 0 ? (baseCost / basePrice) * 100 : 0
      })
    }

    // Select option with LOWEST FC%
    const best = optionImpacts.reduce((min, curr) =>
      curr.foodCostPercent < min.foodCostPercent ? curr : min
    )

    selectedOptions.push({
      groupId: group.id,
      groupName: group.name,
      option: best.option || null
    })
  }

  return buildCombinationResult(
    selectedOptions,
    groups,
    baseCost,
    basePrice,
    portionMultiplier,
    context
  )
}

/**
 * Find combination with MAXIMUM food cost %
 * Strategy: For each group, pick option that MAXIMIZES FC%
 */
function findMaxFoodCostCombination(
  groups: ModifierGroup[],
  baseCost: number,
  basePrice: number,
  portionMultiplier: number,
  context: CostCalculationContext
): ModifierCombinationResult {
  const selectedOptions: SelectedOptionForCost[] = []

  for (const group of groups) {
    const activeOptions = group.options.filter(opt => opt.isActive !== false)

    // Calculate FC% impact for each option
    const optionImpacts = activeOptions.map(option => {
      const result = calculateOptionFoodCostImpact(
        option,
        group,
        baseCost,
        basePrice,
        portionMultiplier,
        context
      )
      return { option, ...result }
    })

    // For optional groups, include "no selection"
    if (!group.isRequired) {
      optionImpacts.push({
        option: null as unknown as ModifierOption,
        costDelta: 0,
        priceDelta: 0,
        foodCostPercent: basePrice > 0 ? (baseCost / basePrice) * 100 : 0
      })
    }

    // Select option with HIGHEST FC%
    const best = optionImpacts.reduce((max, curr) =>
      curr.foodCostPercent > max.foodCostPercent ? curr : max
    )

    selectedOptions.push({
      groupId: group.id,
      groupName: group.name,
      option: best.option || null
    })
  }

  return buildCombinationResult(
    selectedOptions,
    groups,
    baseCost,
    basePrice,
    portionMultiplier,
    context
  )
}

/**
 * Find default combination (default options or first active options)
 */
function findDefaultCombination(
  groups: ModifierGroup[],
  baseCost: number,
  basePrice: number,
  portionMultiplier: number,
  context: CostCalculationContext
): ModifierCombinationResult {
  const selectedOptions: SelectedOptionForCost[] = []

  for (const group of groups) {
    const activeOptions = group.options.filter(opt => opt.isActive !== false)

    // Find default option
    let selectedOption: ModifierOption | null = null

    if (group.isRequired) {
      // Required: must select default or first
      selectedOption = activeOptions.find(opt => opt.isDefault) || activeOptions[0] || null
    } else {
      // Optional: only select if there's a default
      selectedOption = activeOptions.find(opt => opt.isDefault) || null
    }

    selectedOptions.push({
      groupId: group.id,
      groupName: group.name,
      option: selectedOption
    })
  }

  return buildCombinationResult(
    selectedOptions,
    groups,
    baseCost,
    basePrice,
    portionMultiplier,
    context
  )
}

// =============================================
// Cost Calculation Helpers
// =============================================

/**
 * Calculate the food cost % impact of selecting an option
 * For replacement modifiers: subtract replaced component cost, add option cost
 * For addon modifiers: just add option cost
 */
function calculateOptionFoodCostImpact(
  option: ModifierOption,
  group: ModifierGroup,
  baseCost: number,
  basePrice: number,
  portionMultiplier: number,
  context: CostCalculationContext
): { costDelta: number; priceDelta: number; foodCostPercent: number } {
  let costDelta = 0
  const priceDelta = option.priceAdjustment || 0

  // Debug: log price adjustment if present
  if (priceDelta !== 0) {
    console.log(`[ModifierCostCalc] Option "${option.name}" has priceAdjustment: ${priceDelta}`)
  }

  // Calculate option composition cost
  const optionCost = calculateOptionCompositionCost(option, portionMultiplier, context)

  if (group.type === 'replacement' && group.targetComponents?.length) {
    // For replacement: subtract ALL target component costs, add option cost once
    const replacedCost = calculateReplacedComponentsCost(group.targetComponents, context)
    costDelta = optionCost - replacedCost
  } else if (group.type === 'addon') {
    // For addon: just add option cost
    costDelta = optionCost
  } else if (group.type === 'removal') {
    // For removal: subtract (negative costDelta)
    costDelta = -optionCost
  } else {
    // Default: treat as addon
    costDelta = optionCost
  }

  // Calculate resulting FC%
  const newCost = baseCost + costDelta
  const newPrice = basePrice + priceDelta
  const foodCostPercent = newPrice > 0 ? (newCost / newPrice) * 100 : 0

  return { costDelta, priceDelta, foodCostPercent }
}

/**
 * Calculate cost of option's composition
 */
export function calculateOptionCompositionCost(
  option: ModifierOption,
  portionMultiplier: number,
  context: CostCalculationContext
): number {
  if (!option.composition?.length) return 0

  let totalCost = 0
  for (const comp of option.composition) {
    // When unit is "portion" with portionSize, convert to base units for cost calculation
    // BUT: for portion-type preparations, outputQuantity is already in portions,
    // so we must NOT multiply by portionSize (would mix grams with portions)
    let effectiveQuantity = comp.quantity || 1
    if (comp.unit === 'portion' && comp.portionSize) {
      if (comp.type === 'preparation') {
        const prep = context.recipesStore.getPreparationById(comp.id)
        if (prep?.portionType !== 'portion') {
          effectiveQuantity = (comp.quantity || 1) * comp.portionSize
        }
      } else {
        effectiveQuantity = (comp.quantity || 1) * comp.portionSize
      }
    }
    const compCost = calculateComponentCost(comp.type, comp.id, effectiveQuantity, context)
    totalCost += compCost * portionMultiplier
  }
  return totalCost
}

/**
 * Calculate total cost of replaced components
 */
export function calculateReplacedComponentsCost(
  targetComponents: TargetComponent[],
  context: CostCalculationContext
): number {
  let totalCost = 0

  for (const target of targetComponents) {
    // Get component cost from recipe components
    const componentCost = getTargetComponentCost(target, context)
    totalCost += componentCost
  }

  return totalCost
}

/**
 * Get cost of a target component (from recipe)
 */
function getTargetComponentCost(target: TargetComponent, context: CostCalculationContext): number {
  const { recipesStore, productsStore } = context

  if (target.sourceType === 'recipe' && target.recipeId) {
    const recipe = recipesStore.getRecipeById(target.recipeId)
    if (!recipe?.components) return 0

    const component = findRecipeComponentByTarget(recipe.components, target, context)
    if (!component) return 0

    return calculateComponentCost(
      component.componentType,
      component.componentId,
      component.quantity,
      context
    )
  }

  return 0
}

/**
 * Find recipe component matching a target (handles stale IDs)
 * Target componentId can become stale when recipe is re-saved with new component IDs
 */
function findRecipeComponentByTarget(
  components: { id: string; componentId: string; componentType: string; quantity: number }[],
  target: TargetComponent,
  context: CostCalculationContext
) {
  // 1. Exact row ID match
  const byRowId = components.find(c => c.id === target.componentId)
  if (byRowId) return byRowId

  // 2. Match by type + entity ID
  const byEntityId = components.find(
    c => c.componentType === target.componentType && c.componentId === target.componentId
  )
  if (byEntityId) return byEntityId

  // 3. Match by type + entity name (most resilient)
  const { recipesStore, productsStore } = context
  const sameType = components.filter(c => c.componentType === target.componentType)
  for (const comp of sameType) {
    let entityName: string | undefined
    if (comp.componentType === 'recipe') {
      entityName = recipesStore.getRecipeById(comp.componentId)?.name
    } else if (comp.componentType === 'preparation') {
      entityName = recipesStore.getPreparationById(comp.componentId)?.name
    } else if (comp.componentType === 'product') {
      entityName = productsStore.getProductById(comp.componentId)?.name
    }
    if (entityName && entityName === target.componentName) {
      return comp
    }
  }

  return undefined
}

/**
 * Calculate cost of a single component — recursively computes from leaf products
 * to avoid stale cached costs on recipes/preparations
 */
function calculateComponentCost(
  type: string,
  id: string,
  quantity: number,
  context: CostCalculationContext,
  visited?: Set<string>
): number {
  const { productsStore, recipesStore } = context

  if (type === 'product') {
    const product = productsStore.getProductById(id)
    return quantity * (product?.baseCostPerUnit || 0)
  }

  // Circular dependency guard
  const key = `${type}:${id}`
  const seen = visited ?? new Set<string>()
  if (seen.has(key)) return 0
  seen.add(key)

  if (type === 'recipe') {
    const recipe = recipesStore.getRecipeById(id)
    if (recipe?.components?.length) {
      const childrenSum = recipe.components.reduce((sum, comp) => {
        return (
          sum +
          calculateComponentCost(
            comp.componentType,
            comp.componentId,
            comp.quantity,
            context,
            new Set(seen)
          )
        )
      }, 0)
      if (childrenSum > 0 && recipe.portionSize && recipe.portionSize > 0) {
        return Math.round((childrenSum / recipe.portionSize) * quantity)
      }
    }
    // Fallback to stored cost
    return quantity * (recipe?.cost || 0)
  }

  if (type === 'preparation') {
    const prep = recipesStore.getPreparationById(id)
    if (prep?.recipe?.length) {
      const childrenSum = prep.recipe.reduce((sum, ing) => {
        return sum + calculateComponentCost(ing.type, ing.id, ing.quantity, context, new Set(seen))
      }, 0)
      if (childrenSum > 0 && prep.outputQuantity && prep.outputQuantity > 0) {
        return Math.round((childrenSum / prep.outputQuantity) * quantity)
      }
    }
    // Fallback to stored cost
    return quantity * (prep?.lastKnownCost || prep?.costPerPortion || 0)
  }

  return 0
}

/**
 * Calculate base cost from variant composition
 */
function calculateVariantBaseCost(
  variant: MenuItemVariant,
  context: CostCalculationContext
): number {
  let totalCost = 0

  for (const comp of variant.composition || []) {
    // For portion-type preparations, don't multiply by portionSize — outputQuantity is in portions
    let effectiveQuantity = comp.quantity || 1
    if (comp.unit === 'portion' && comp.portionSize) {
      if (comp.type === 'preparation') {
        const prep = context.recipesStore.getPreparationById(comp.id)
        if (prep?.portionType !== 'portion') {
          effectiveQuantity = (comp.quantity || 1) * comp.portionSize
        }
      } else {
        effectiveQuantity = (comp.quantity || 1) * comp.portionSize
      }
    }
    totalCost += calculateComponentCost(comp.type, comp.id, effectiveQuantity, context)
  }

  return totalCost
}

// =============================================
// Result Builder
// =============================================

/**
 * Build final combination result with all costs calculated
 * Now properly handles replacement modifiers by subtracting replaced costs
 */
function buildCombinationResult(
  selectedOptions: SelectedOptionForCost[],
  groups: ModifierGroup[],
  baseCost: number,
  basePrice: number,
  portionMultiplier: number,
  context: CostCalculationContext
): ModifierCombinationResult {
  let totalCostDelta = 0
  let totalPriceDelta = 0
  const names: string[] = []

  for (const selection of selectedOptions) {
    if (!selection.option) continue

    const option = selection.option
    names.push(option.name)

    // Find the corresponding group for this selection
    const group = groups.find(g => g.id === selection.groupId)
    if (!group) {
      // Fallback: just add option cost
      const optionCost = calculateOptionCompositionCost(option, portionMultiplier, context)
      totalCostDelta += optionCost
      totalPriceDelta += option.priceAdjustment || 0
      continue
    }

    // Calculate option composition cost
    const optionCost = calculateOptionCompositionCost(option, portionMultiplier, context)

    // Handle based on group type
    if (group.type === 'replacement' && group.targetComponents?.length) {
      // For replacement: subtract ALL target component costs, add option cost
      const replacedCost = calculateReplacedComponentsCost(group.targetComponents, context)
      totalCostDelta += optionCost - replacedCost
    } else if (group.type === 'removal') {
      // For removal: subtract option cost (what's being removed)
      totalCostDelta -= optionCost
    } else {
      // Addon or default: just add option cost
      totalCostDelta += optionCost
    }

    // Always add price adjustment
    totalPriceDelta += option.priceAdjustment || 0
  }

  const totalCost = baseCost + totalCostDelta
  const totalPrice = basePrice + totalPriceDelta
  const foodCostPercent = totalPrice > 0 ? (totalCost / totalPrice) * 100 : 0

  return {
    name: names.length > 0 ? names.join(' + ') : 'Default',
    selectedOptions,
    cost: totalCost,
    price: totalPrice,
    foodCostPercent,
    margin: totalPrice - totalCost
  }
}

// =============================================
// Utility Exports
// =============================================

export { calculateVariantBaseCost, calculateComponentCost }
