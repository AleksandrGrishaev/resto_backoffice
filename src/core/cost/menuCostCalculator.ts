// src/core/cost/menuCostCalculator.ts
// Centralized Menu Cost Calculator Service
// Single source of truth for all menu cost calculations

import type { MenuItem, MenuItemVariant, MenuComposition } from '@/stores/menu/types'
import type { useProductsStore } from '@/stores/productsStore'
import type { useRecipesStore } from '@/stores/recipes/recipesStore'
import {
  calculateFoodCostRange,
  calculateVariantBaseCost,
  type CostCalculationContext as ModifierContext
} from './modifierCostCalculator'
import type {
  MenuItemCostAnalysis,
  BaseCostData,
  CostRangeData,
  ModifierCostItem,
  ModifierOptionCostData,
  CompositionCostItem,
  CostCalculationContext
} from './types'

// =============================================
// Context Building
// =============================================

/**
 * Build cost calculation context from stores
 */
export function buildCostContext(
  productsStore: ReturnType<typeof useProductsStore>,
  recipesStore: ReturnType<typeof useRecipesStore>
): CostCalculationContext {
  const products = new Map()
  const recipes = new Map()
  const preparations = new Map()

  // Products
  for (const product of productsStore.products) {
    products.set(product.id, {
      id: product.id,
      name: product.name,
      baseCostPerUnit: product.baseCostPerUnit || 0,
      unit: product.baseUnit
    })
  }

  // Recipes
  for (const recipe of recipesStore.recipes) {
    const costCalc = recipesStore.getRecipeCostCalculation(recipe.id)
    recipes.set(recipe.id, {
      id: recipe.id,
      name: recipe.name,
      costPerPortion: costCalc?.costPerPortion || 0
    })
  }

  // Preparations
  for (const prep of recipesStore.preparations) {
    const costCalc = recipesStore.getPreparationCostCalculation(prep.id)
    preparations.set(prep.id, {
      id: prep.id,
      name: prep.name,
      costPerOutputUnit: costCalc?.costPerOutputUnit || 0,
      outputUnit: prep.outputUnit
    })
  }

  return { products, recipes, preparations }
}

/**
 * Convert to old context format for modifierCostCalculator
 */
function toModifierContext(
  productsStore: ReturnType<typeof useProductsStore>,
  recipesStore: ReturnType<typeof useRecipesStore>
): ModifierContext {
  return { productsStore, recipesStore }
}

// =============================================
// Base Cost Calculation
// =============================================

/**
 * Calculate detailed composition cost breakdown
 */
export function calculateCompositionBreakdown(
  composition: MenuComposition[],
  portionMultiplier: number,
  context: CostCalculationContext
): CompositionCostItem[] {
  const breakdown: CompositionCostItem[] = []

  for (const comp of composition) {
    const quantity = (comp.quantity || 1) * portionMultiplier

    if (comp.type === 'product') {
      const product = context.products.get(comp.id)
      if (product) {
        breakdown.push({
          type: 'product',
          id: product.id,
          name: product.name,
          quantity,
          unit: product.unit,
          costPerUnit: product.baseCostPerUnit,
          totalCost: product.baseCostPerUnit * quantity
        })
      }
    } else if (comp.type === 'recipe') {
      const recipe = context.recipes.get(comp.id)
      if (recipe) {
        breakdown.push({
          type: 'recipe',
          id: recipe.id,
          name: recipe.name,
          quantity,
          unit: 'portion',
          costPerUnit: recipe.costPerPortion,
          totalCost: recipe.costPerPortion * quantity
        })
      }
    } else if (comp.type === 'preparation') {
      const prep = context.preparations.get(comp.id)
      if (prep) {
        breakdown.push({
          type: 'preparation',
          id: prep.id,
          name: prep.name,
          quantity,
          unit: prep.outputUnit,
          costPerUnit: prep.costPerOutputUnit,
          totalCost: prep.costPerOutputUnit * quantity
        })
      }
    }
  }

  return breakdown
}

/**
 * Calculate base cost data (no modifiers)
 * Updated to handle required modifiers without defaults
 */
export function calculateBaseVariantCost(
  variant: MenuItemVariant,
  _productsStore: ReturnType<typeof useProductsStore>,
  _recipesStore: ReturnType<typeof useRecipesStore>,
  context: CostCalculationContext,
  item?: MenuItem // 🆕 Optional item to check for required modifiers
): BaseCostData {
  const portionMultiplier = variant.portionMultiplier || 1
  const composition = variant.composition || []

  // Calculate composition breakdown
  const compositionBreakdown = calculateCompositionBreakdown(
    composition,
    portionMultiplier,
    context
  )

  // Total cost
  const cost = compositionBreakdown.reduce((sum, item) => sum + item.totalCost, 0)
  const price = variant.price

  // 🆕 Check if item has required modifiers without defaults
  let foodCostPercent: number | null = null
  let note: string | undefined
  let isCalculatedWithDefaults = false

  if (item) {
    const requiredGroups = (item.modifierGroups || []).filter(g => g.isRequired)
    const hasRequiredWithoutDefaults = requiredGroups.some(
      g => !g.options.some(opt => opt.isDefault)
    )

    if (hasRequiredWithoutDefaults) {
      // Cannot calculate base FC% - required modifiers must be selected
      foodCostPercent = null
      note = 'n/a - required modifiers'
    } else if (requiredGroups.length > 0) {
      // Calculate with defaults
      const defaultsCost = requiredGroups.reduce((sum, group) => {
        const defaultOption = group.options.find(opt => opt.isDefault)
        if (defaultOption) {
          const optionComposition = defaultOption.composition || []
          const optionBreakdown = calculateCompositionBreakdown(
            optionComposition,
            portionMultiplier,
            context
          )
          return sum + optionBreakdown.reduce((s, item) => s + item.totalCost, 0)
        }
        return sum
      }, 0)

      const totalCost = cost + defaultsCost
      foodCostPercent = price > 0 ? (totalCost / price) * 100 : 0
      note = 'calculated with defaults'
      isCalculatedWithDefaults = true
    } else {
      // No required modifiers - simple calculation
      foodCostPercent = price > 0 ? (cost / price) * 100 : 0
    }
  } else {
    // Fallback: no item provided, simple calculation
    foodCostPercent = price > 0 ? (cost / price) * 100 : 0
  }

  return {
    cost,
    price,
    foodCostPercent,
    composition: compositionBreakdown,
    note,
    isCalculatedWithDefaults
  }
}

// =============================================
// Modifier Cost Calculations
// =============================================

/**
 * Calculate cost range for REQUIRED modifiers only
 */
export function calculateRequiredModifiersCost(
  variant: MenuItemVariant,
  item: MenuItem,
  productsStore: ReturnType<typeof useProductsStore>,
  recipesStore: ReturnType<typeof useRecipesStore>
): CostRangeData {
  const requiredGroups = (item.modifierGroups || []).filter(g => g.isRequired)

  if (requiredGroups.length === 0) {
    const baseCost = calculateVariantBaseCost(
      variant,
      toModifierContext(productsStore, recipesStore)
    )
    const basePrice = variant.price
    const baseFoodCostPercent = basePrice > 0 ? (baseCost / basePrice) * 100 : 0

    return {
      minCost: baseCost,
      maxCost: baseCost,
      minPrice: basePrice,
      maxPrice: basePrice,
      minFoodCostPercent: baseFoodCostPercent,
      maxFoodCostPercent: baseFoodCostPercent
    }
  }

  // Use existing modifierCostCalculator with filtered groups
  const itemWithRequiredOnly = {
    ...item,
    modifierGroups: requiredGroups
  }

  const range = calculateFoodCostRange(
    variant,
    itemWithRequiredOnly,
    toModifierContext(productsStore, recipesStore)
  )

  return {
    minCost: range.minCost,
    maxCost: range.maxCost,
    minPrice: range.minPrice,
    maxPrice: range.maxPrice,
    minFoodCostPercent: range.minFoodCostPercent,
    maxFoodCostPercent: range.maxFoodCostPercent
  }
}

/**
 * Calculate cost range for OPTIONAL modifiers only
 */
export function calculateOptionalModifiersCost(
  variant: MenuItemVariant,
  item: MenuItem,
  productsStore: ReturnType<typeof useProductsStore>,
  recipesStore: ReturnType<typeof useRecipesStore>
): CostRangeData {
  const optionalGroups = (item.modifierGroups || []).filter(g => !g.isRequired)

  if (optionalGroups.length === 0) {
    // If no optional modifiers, return zeros (no additional impact)
    return {
      minCost: 0,
      maxCost: 0,
      minPrice: 0,
      maxPrice: 0,
      minFoodCostPercent: 0,
      maxFoodCostPercent: 0
    }
  }

  // Get base cost with required modifiers
  const requiredRange = calculateRequiredModifiersCost(variant, item, productsStore, recipesStore)

  // Calculate full range (required + optional)
  const fullRange = calculateFoodCostRange(
    variant,
    item,
    toModifierContext(productsStore, recipesStore)
  )

  // Optional impact = full - required
  return {
    minCost: fullRange.minCost - requiredRange.maxCost, // min optional adds to max required
    maxCost: fullRange.maxCost - requiredRange.minCost, // max optional adds to min required
    minPrice: fullRange.minPrice - requiredRange.maxPrice,
    maxPrice: fullRange.maxPrice - requiredRange.minPrice,
    minFoodCostPercent: fullRange.minFoodCostPercent,
    maxFoodCostPercent: fullRange.maxFoodCostPercent
  }
}

/**
 * Calculate full cost range (required + optional)
 */
export function calculateFullFoodCostRange(
  variant: MenuItemVariant,
  item: MenuItem,
  productsStore: ReturnType<typeof useProductsStore>,
  recipesStore: ReturnType<typeof useRecipesStore>
): CostRangeData {
  const range = calculateFoodCostRange(
    variant,
    item,
    toModifierContext(productsStore, recipesStore)
  )

  return {
    minCost: range.minCost,
    maxCost: range.maxCost,
    minPrice: range.minPrice,
    maxPrice: range.maxPrice,
    minFoodCostPercent: range.minFoodCostPercent,
    maxFoodCostPercent: range.maxFoodCostPercent
  }
}

// =============================================
// Modifiers Breakdown (Addon + Replacement)
// =============================================

/**
 * Calculate cost of target components that will be replaced
 */
function calculateTargetComponentsCost(
  targetComponents: any[] | undefined,
  variant: MenuItemVariant,
  context: CostCalculationContext,
  portionMultiplier: number
): { cost: number; names: string[] } {
  if (!targetComponents || targetComponents.length === 0) {
    return { cost: 0, names: [] }
  }

  const variantComposition = variant.composition || []
  let totalCost = 0
  const names: string[] = []

  for (const target of targetComponents) {
    // Find component in variant composition by componentId
    const comp = variantComposition.find(c => c.id === target.componentId)
    if (!comp) continue

    const quantity = (comp.quantity || 1) * portionMultiplier

    if (comp.type === 'product') {
      const product = context.products.get(comp.id)
      if (product) {
        totalCost += product.baseCostPerUnit * quantity
        names.push(product.name)
      }
    } else if (comp.type === 'recipe') {
      const recipe = context.recipes.get(comp.id)
      if (recipe) {
        totalCost += recipe.costPerPortion * quantity
        names.push(recipe.name)
      }
    } else if (comp.type === 'preparation') {
      const prep = context.preparations.get(comp.id)
      if (prep) {
        totalCost += prep.costPerOutputUnit * quantity
        names.push(prep.name)
      }
    }
  }

  return { cost: totalCost, names }
}

/**
 * Calculate detailed breakdown for REPLACEMENT modifiers
 * Replacement modifiers replace specific components (targetComponents) with new composition
 */
export function calculateReplacementModifiersBreakdown(
  item: MenuItem,
  variant: MenuItemVariant,
  context: CostCalculationContext,
  baseCost: number,
  basePrice: number
): ModifierCostItem[] {
  const replacementGroups = (item.modifierGroups || []).filter(g => g.type === 'replacement')
  const portionMultiplier = variant.portionMultiplier || 1
  const breakdown: ModifierCostItem[] = []

  for (const group of replacementGroups) {
    const activeOptions = group.options.filter(opt => opt.isActive !== false)
    const optionsCostData: ModifierOptionCostData[] = []

    // Calculate cost of components being replaced
    const targetCostData = calculateTargetComponentsCost(
      group.targetComponents,
      variant,
      context,
      portionMultiplier
    )

    let minCostImpact = Infinity
    let maxCostImpact = -Infinity
    let minPriceImpact = Infinity
    let maxPriceImpact = -Infinity

    for (const option of activeOptions) {
      const optionComposition = option.composition || []
      const optionBreakdown = calculateCompositionBreakdown(
        optionComposition,
        portionMultiplier,
        context
      )

      const optionCost = optionBreakdown.reduce((sum, item) => sum + item.totalCost, 0)
      const priceAdjustment = option.priceAdjustment || 0

      // 🆕 Replacement logic:
      // Final cost = baseCost - replacedCost + newCost
      const finalCost = baseCost - targetCostData.cost + optionCost
      const finalPrice = basePrice + priceAdjustment
      const finalFoodCostPercent = finalPrice > 0 ? (finalCost / finalPrice) * 100 : 0

      // Net cost delta = newCost - replacedCost
      const netCostDelta = optionCost - targetCostData.cost

      optionsCostData.push({
        optionId: option.id,
        optionName: option.name,
        cost: optionCost,
        costBreakdown: optionBreakdown,
        priceAdjustment,
        foodCostPercent: finalFoodCostPercent,
        finalFoodCostPercent,
        displayMode: 'replacement',
        isDefault: option.isDefault || false,
        isActive: option.isActive !== false,
        replacementInfo: {
          replaces: targetCostData.names,
          replacedCost: targetCostData.cost,
          netCostDelta,
          netPriceDelta: priceAdjustment,
          netFoodCostPercent: finalFoodCostPercent
        }
      })

      // Track min/max impact (net cost delta)
      minCostImpact = Math.min(minCostImpact, netCostDelta)
      maxCostImpact = Math.max(maxCostImpact, netCostDelta)
      minPriceImpact = Math.min(minPriceImpact, priceAdjustment)
      maxPriceImpact = Math.max(maxPriceImpact, priceAdjustment)
    }

    breakdown.push({
      groupId: group.id,
      groupName: group.name,
      groupType: 'replacement',
      isRequired: group.isRequired || false,
      options: optionsCostData,
      minCostImpact: minCostImpact === Infinity ? 0 : minCostImpact,
      maxCostImpact: maxCostImpact === -Infinity ? 0 : maxCostImpact,
      minPriceImpact: minPriceImpact === Infinity ? 0 : minPriceImpact,
      maxPriceImpact: maxPriceImpact === -Infinity ? 0 : maxPriceImpact
    })
  }

  return breakdown
}

/**
 * Calculate detailed breakdown for ADDON modifiers
 * 🆕 Updated with new display logic for different modifier types
 */
export function calculateAddonModifiersBreakdown(
  item: MenuItem,
  variant: MenuItemVariant,
  context: CostCalculationContext,
  baseCost: number, // 🆕 Base cost for final FC% calculation
  basePrice: number // 🆕 Base price for final FC% calculation
): ModifierCostItem[] {
  const addonGroups = (item.modifierGroups || []).filter(g => g.type === 'addon')
  const portionMultiplier = variant.portionMultiplier || 1
  const breakdown: ModifierCostItem[] = []

  for (const group of addonGroups) {
    const activeOptions = group.options.filter(opt => opt.isActive !== false)
    const optionsCostData: ModifierOptionCostData[] = []

    let minCostImpact = Infinity
    let maxCostImpact = -Infinity
    let minPriceImpact = Infinity
    let maxPriceImpact = -Infinity

    for (const option of activeOptions) {
      const optionComposition = option.composition || []
      const optionBreakdown = calculateCompositionBreakdown(
        optionComposition,
        portionMultiplier,
        context
      )

      const optionCost = optionBreakdown.reduce((sum, item) => sum + item.totalCost, 0)
      const priceAdjustment = option.priceAdjustment || 0

      // 🆕 Determine display mode and calculate appropriate FC%
      let displayMode: 'addon-fc' | 'final-fc' | 'free-addon' | 'replacement' = 'addon-fc'
      let foodCostPercent: number = 0
      let finalFoodCostPercent: number | undefined

      if (group.isRequired && priceAdjustment === 0) {
        // Required with Price+=0 → show Final FC%
        displayMode = 'final-fc'
        const totalCost = baseCost + optionCost
        foodCostPercent = basePrice > 0 ? (totalCost / basePrice) * 100 : 0
        finalFoodCostPercent = foodCostPercent
      } else if (!group.isRequired && priceAdjustment === 0) {
        // Optional with Price+=0 → show as free addon
        displayMode = 'free-addon'
        foodCostPercent = 0 // Not meaningful, will show "Free addon" in UI
      } else {
        // Normal addon with price adjustment
        displayMode = 'addon-fc'
        foodCostPercent = priceAdjustment > 0 ? (optionCost / priceAdjustment) * 100 : Infinity
      }

      optionsCostData.push({
        optionId: option.id,
        optionName: option.name,
        cost: optionCost,
        costBreakdown: optionBreakdown,
        priceAdjustment,
        foodCostPercent,
        finalFoodCostPercent,
        displayMode,
        isDefault: option.isDefault || false,
        isActive: option.isActive !== false
      })

      // Track min/max impact
      minCostImpact = Math.min(minCostImpact, optionCost)
      maxCostImpact = Math.max(maxCostImpact, optionCost)
      minPriceImpact = Math.min(minPriceImpact, priceAdjustment)
      maxPriceImpact = Math.max(maxPriceImpact, priceAdjustment)
    }

    // For optional groups, "no selection" is min impact (0)
    if (!group.isRequired) {
      minCostImpact = Math.min(minCostImpact, 0)
      maxCostImpact = Math.max(maxCostImpact, 0)
      minPriceImpact = Math.min(minPriceImpact, 0)
      maxPriceImpact = Math.max(maxPriceImpact, 0)
    }

    breakdown.push({
      groupId: group.id,
      groupName: group.name,
      groupType: 'addon',
      isRequired: group.isRequired || false,
      options: optionsCostData,
      minCostImpact: minCostImpact === Infinity ? 0 : minCostImpact,
      maxCostImpact: maxCostImpact === -Infinity ? 0 : maxCostImpact,
      minPriceImpact: minPriceImpact === Infinity ? 0 : minPriceImpact,
      maxPriceImpact: maxPriceImpact === -Infinity ? 0 : maxPriceImpact
    })
  }

  return breakdown
}

// =============================================
// Main Analysis Function
// =============================================

/**
 * Analyze complete menu item cost
 * @returns Complete cost analysis with all breakdowns
 * 🆕 Updated to pass baseCost/basePrice to breakdown function
 */
export function analyzeMenuItemCost(
  item: MenuItem,
  variantId: string,
  productsStore: ReturnType<typeof useProductsStore>,
  recipesStore: ReturnType<typeof useRecipesStore>
): MenuItemCostAnalysis | null {
  const variant = item.variants.find(v => v.id === variantId)
  if (!variant) return null

  const context = buildCostContext(productsStore, recipesStore)
  const modifierGroups = item.modifierGroups || []

  // Base cost (🆕 now passing item for required modifiers check)
  const base = calculateBaseVariantCost(variant, productsStore, recipesStore, context, item)

  // Required modifiers
  const withRequired = calculateRequiredModifiersCost(variant, item, productsStore, recipesStore)

  // Optional modifiers
  const withOptional = calculateOptionalModifiersCost(variant, item, productsStore, recipesStore)

  // Full range
  const full = calculateFullFoodCostRange(variant, item, productsStore, recipesStore)

  // 🆕 Combined modifiers breakdown (addon + replacement)
  const addonBreakdown = calculateAddonModifiersBreakdown(
    item,
    variant,
    context,
    base.cost,
    base.price
  )
  const replacementBreakdown = calculateReplacementModifiersBreakdown(
    item,
    variant,
    context,
    base.cost,
    base.price
  )
  const modifiersCostBreakdown = [...addonBreakdown, ...replacementBreakdown]

  // Flags
  const hasModifiers = modifierGroups.length > 0
  const hasRequiredModifiers = modifierGroups.some(g => g.isRequired)
  const hasOptionalModifiers = modifierGroups.some(g => !g.isRequired)
  const hasAddonModifiers = modifierGroups.some(g => g.type === 'addon')
  const hasReplacementModifiers = modifierGroups.some(g => g.type === 'replacement')

  return {
    menuItemId: item.id,
    menuItemName: item.name,
    variantId: variant.id,
    variantName: variant.name || 'Standard',
    department: item.department,
    dishType: item.dishType,

    base,
    withRequired,
    withOptional,
    full,
    modifiersCostBreakdown,

    hasModifiers,
    hasRequiredModifiers,
    hasOptionalModifiers,
    hasAddonModifiers,
    hasReplacementModifiers
  }
}

/**
 * 🆕 Analyze ALL variants of a menu item
 * @returns Array of cost analyses for all variants
 */
export function analyzeAllMenuItemVariants(
  item: MenuItem,
  productsStore: ReturnType<typeof useProductsStore>,
  recipesStore: ReturnType<typeof useRecipesStore>
): MenuItemCostAnalysis[] {
  const analyses: MenuItemCostAnalysis[] = []

  for (const variant of item.variants) {
    const analysis = analyzeMenuItemCost(item, variant.id, productsStore, recipesStore)
    if (analysis) {
      analyses.push(analysis)
    }
  }

  return analyses
}
