/**
 * Export Utils
 * Utilities for generating and calculating export data
 */

export {
  generateCombinations,
  calculateTotalCombinations,
  buildCombinationDisplayName,
  getUniqueModifierOptions,
  generateCombinationsGroupedByVariant,
  getDefaultModifiersForVariant,
  buildModifiersDisplayName,
  type GeneratedCombination,
  type SelectedOptionInfo,
  type CombinationGeneratorOptions,
  type DefaultModifierInfo
} from './combinationGenerator'

export {
  calculateCombinationExport,
  calculateCombinationCost,
  calculateCompositionCost,
  calculateComponentCost,
  calculateModifierOptionCost,
  buildModifierRecipeExport,
  buildAllModifierRecipes,
  buildUniqueRecipesWithPortions,
  buildVariantCompositionRecipes,
  type CostCalculationContext,
  type CombinationCostResult
} from './combinationCostCalculator'

export { buildMenuItemExportData, type MenuItemExportBuilderOptions } from './menuItemExportBuilder'
