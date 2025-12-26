// src/views/kitchen/calculator/composables/useRecipeScaling.ts
// Composable for scaling preparation recipes to target quantities

import { useRecipesStore } from '@/stores/recipes/recipesStore'
import { useProductsStore } from '@/stores/productsStore'
import type { Preparation, PreparationIngredient } from '@/stores/recipes/types'
import type { MeasurementUnit } from '@/types/measurementUnits'

export interface ScaledIngredient {
  id: string
  name: string
  type: 'product' | 'preparation'
  originalQuantity: number
  originalUnit: MeasurementUnit
  scaledQuantity: number
  displayUnit: string
}

export type TargetUnit = 'portion' | 'gram' | 'ml' | 'pc'

interface ScalingResult {
  success: boolean
  ingredients: ScaledIngredient[]
  scaleFactor: number
  error?: string
}

/**
 * Composable for scaling preparation recipes
 */
export function useRecipeScaling() {
  const recipesStore = useRecipesStore()
  const productsStore = useProductsStore()

  /**
   * Get available target units based on preparation's portionType and outputUnit
   * For portion-type: only show portions (no grams option)
   * For weight-type: show gram/ml/pc based on outputUnit
   */
  const getAvailableUnits = (preparation: Preparation | null): TargetUnit[] => {
    if (!preparation) return ['gram']

    // For portion-type preparations - only portions, no grams
    if (preparation.portionType === 'portion' && preparation.portionSize) {
      return ['portion']
    }

    // For weight-type preparations - show gram/ml/pc based on outputUnit
    if (preparation.outputUnit === 'ml') {
      return ['ml']
    } else if (preparation.outputUnit === 'pc' || preparation.outputUnit === 'piece') {
      return ['pc']
    } else {
      return ['gram']
    }
  }

  /**
   * Get the default unit for a preparation
   */
  const getDefaultUnit = (preparation: Preparation | null): TargetUnit => {
    if (!preparation) return 'gram'

    // For portion-type preparations, default to portions
    if (preparation.portionType === 'portion' && preparation.portionSize) {
      return 'portion'
    }

    // Otherwise use the output unit
    if (preparation.outputUnit === 'ml') return 'ml'
    if (preparation.outputUnit === 'pc' || preparation.outputUnit === 'piece') return 'pc'
    return 'gram'
  }

  /**
   * Calculate scale factor based on target quantity and preparation output
   *
   * Key insight: output_quantity is the number of OUTPUT units the recipe produces.
   * For portion-type: if output_quantity=1, recipe makes 1 portion
   * For weight-type: if output_quantity=500, recipe makes 500g/ml
   */
  const calculateScaleFactor = (
    preparation: Preparation,
    targetQuantity: number,
    targetUnit: TargetUnit
  ): number => {
    const outputQty = preparation.outputQuantity

    // For portion-type preparations
    if (preparation.portionType === 'portion') {
      if (targetUnit === 'portion') {
        // User wants X portions, recipe makes output_quantity portions
        // If output_quantity = 1, recipe makes 1 portion
        // So scaleFactor = targetQuantity / output_quantity
        return targetQuantity / outputQty
      } else {
        // User wants X grams/ml
        // Recipe produces: output_quantity * portionSize grams
        const totalRecipeOutput = outputQty * (preparation.portionSize || 1)
        return targetQuantity / totalRecipeOutput
      }
    }

    // For weight-type preparations (output is in grams/ml/pc)
    // scaleFactor = target / output_quantity
    return targetQuantity / outputQty
  }

  /**
   * Get ingredient name by id and type
   */
  const getIngredientName = (ingredient: PreparationIngredient): string => {
    if (ingredient.type === 'product') {
      const product = productsStore.getProductById(ingredient.id)
      return product?.name || `Product ${ingredient.id.slice(0, 8)}`
    } else {
      const prep = recipesStore.getPreparationById(ingredient.id)
      return prep?.name || `Preparation ${ingredient.id.slice(0, 8)}`
    }
  }

  /**
   * Format display unit for ingredient
   */
  const formatDisplayUnit = (unit: MeasurementUnit | string): string => {
    const unitLabels: Record<string, string> = {
      gram: 'g',
      gr: 'g',
      kg: 'kg',
      ml: 'ml',
      liter: 'L',
      piece: 'pcs',
      pc: 'pcs',
      pcs: 'pcs',
      pack: 'pack',
      portion: 'portion'
    }
    return unitLabels[unit] || unit
  }

  /**
   * Format quantity for display (round to reasonable precision)
   */
  const formatQuantity = (quantity: number): number => {
    if (quantity >= 100) {
      return Math.round(quantity)
    } else if (quantity >= 10) {
      return Math.round(quantity * 10) / 10
    } else if (quantity >= 1) {
      return Math.round(quantity * 100) / 100
    } else {
      return Math.round(quantity * 1000) / 1000
    }
  }

  /**
   * Scale a preparation recipe to target quantity
   */
  const scaleRecipe = (
    preparation: Preparation,
    targetQuantity: number,
    targetUnit: TargetUnit
  ): ScalingResult => {
    // Validate inputs
    if (!preparation) {
      return { success: false, ingredients: [], scaleFactor: 0, error: 'No preparation selected' }
    }

    if (targetQuantity <= 0) {
      return { success: false, ingredients: [], scaleFactor: 0, error: 'Quantity must be positive' }
    }

    if (!preparation.recipe || preparation.recipe.length === 0) {
      return { success: false, ingredients: [], scaleFactor: 0, error: 'Preparation has no recipe' }
    }

    // Calculate scale factor
    const scaleFactor = calculateScaleFactor(preparation, targetQuantity, targetUnit)

    // Scale each ingredient
    const scaledIngredients: ScaledIngredient[] = preparation.recipe.map(ingredient => {
      const scaledQty = ingredient.quantity * scaleFactor

      return {
        id: ingredient.id,
        name: getIngredientName(ingredient),
        type: ingredient.type,
        originalQuantity: ingredient.quantity,
        originalUnit: ingredient.unit,
        scaledQuantity: formatQuantity(scaledQty),
        displayUnit: formatDisplayUnit(ingredient.unit)
      }
    })

    // Sort by type (products first) then by name
    scaledIngredients.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'product' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    return {
      success: true,
      ingredients: scaledIngredients,
      scaleFactor: formatQuantity(scaleFactor)
    }
  }

  /**
   * Get preparation output info for display
   * Shows what the recipe produces
   */
  const getOutputInfo = (preparation: Preparation | null): string => {
    if (!preparation) return ''

    const outputQty = preparation.outputQuantity
    const outputUnit = preparation.outputUnit

    // For portion-type preparations
    if (preparation.portionType === 'portion' && preparation.portionSize) {
      // Show as "X portions (Yg each)"
      const portionSize = preparation.portionSize
      if (outputUnit === 'pc' || outputUnit === 'piece') {
        return `${outputQty} pcs (${portionSize}g each)`
      }
      return `${outputQty} portions (${portionSize}g each)`
    }

    // For weight-type preparations, show as-is
    const unitLabel = formatDisplayUnit(outputUnit)
    return `${outputQty} ${unitLabel}`
  }

  /**
   * Get unit label for display
   */
  const getUnitLabel = (unit: TargetUnit, _preparation: Preparation | null): string => {
    switch (unit) {
      case 'portion':
        return 'portions'
      case 'ml':
        return 'ml'
      case 'pc':
        return 'pcs'
      default:
        return 'g'
    }
  }

  return {
    scaleRecipe,
    getAvailableUnits,
    getDefaultUnit,
    getOutputInfo,
    getUnitLabel,
    formatQuantity,
    formatDisplayUnit
  }
}
