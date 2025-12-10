/**
 * PDF Export Module
 * Exports Menu, Recipes, Preparations, and Single Menu Items to PDF
 */

// Types
export type {
  ExportType,
  ExportOptions,
  ExportItem,
  DepartmentFilter,
  MenuExportData,
  MenuCategoryExport,
  MenuItemExport,
  MenuVariantExport,
  RecipeExportData,
  RecipeDepartmentExport,
  RecipeCategoryExport,
  RecipeExport,
  RecipeComponentExport,
  PreparationExportData,
  PreparationDepartmentExport,
  PreparationCategoryExport,
  PreparationExport,
  PreparationComponentExport,
  // Single Menu Item Export Types
  MenuItemExportData,
  MenuItemDetailExport,
  MenuItemVariantDetailExport,
  MenuItemCompositionExport,
  NestedComponentExport,
  ModifierGroupExport,
  ModifierOptionExport,
  // Combinations Export Types
  CombinationsExportOptions,
  CombinationsExportData,
  VariantCombinationGroup,
  VariantDefaultModifier,
  CombinationExport,
  ModifierRecipeGroupExport,
  ModifierIngredientExport,
  NestedIngredientExport,
  // Unique Recipe Export Types (portion columns)
  UniqueModifierRecipeExport,
  ModifierPortionUsage,
  UniqueRecipeIngredientExport,
  Html2PdfOptions,
  // Detailed Menu Export
  MenuDetailedExportData,
  // Print Documents Types
  PrintDocumentCategory,
  PrintDocumentConfig,
  InventorySheetOptions,
  InventorySheetItem,
  InventorySheetData,
  // Product Yield Report Types
  ProductYieldReportOptions,
  ProductYieldItem,
  ProductYieldReportData,
  // Menu Cost Report Types
  MenuCostReportOptions,
  MenuCostCategoryGroup,
  MenuCostItemData,
  MenuCostVariantData,
  MenuCostReportData
} from './types'

// Print Documents Registry
export { PRINT_DOCUMENTS } from './types'

// Service
export { ExportService, exportService } from './ExportService'

// Composable
export { useExport } from './composables/useExport'

// Components
export { default as ExportOptionsDialog } from './components/ExportOptionsDialog.vue'
export type { ExportDialogOptions } from './components/ExportOptionsDialog.vue'
export { default as MenuItemExportOptionsDialog } from './components/MenuItemExportOptionsDialog.vue'
export type { MenuItemExportOptions } from './components/MenuItemExportOptionsDialog.vue'

// Templates (for direct use if needed)
export { default as ExportLayout } from './templates/ExportLayout.vue'
export { default as MenuExportTemplate } from './templates/MenuExportTemplate.vue'
export { default as RecipeExportTemplate } from './templates/RecipeExportTemplate.vue'
export { default as PreparationExportTemplate } from './templates/PreparationExportTemplate.vue'
export { default as MenuItemExportTemplate } from './templates/MenuItemExportTemplate.vue'
export { default as CombinationsExportTemplate } from './templates/CombinationsExportTemplate.vue'
export { default as InventorySheetTemplate } from './templates/InventorySheetTemplate.vue'

// Utils
export {
  generateCombinations,
  calculateTotalCombinations,
  buildCombinationDisplayName,
  getUniqueModifierOptions,
  generateCombinationsGroupedByVariant,
  getDefaultModifiersForVariant,
  buildModifiersDisplayName,
  calculateCombinationExport,
  calculateCombinationCost,
  buildModifierRecipeExport,
  buildAllModifierRecipes,
  buildUniqueRecipesWithPortions,
  buildVariantCompositionRecipes,
  buildMenuItemExportData,
  type GeneratedCombination,
  type SelectedOptionInfo,
  type CombinationGeneratorOptions,
  type DefaultModifierInfo,
  type CostCalculationContext,
  type MenuItemExportBuilderOptions
} from './utils'
