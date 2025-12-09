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
  Html2PdfOptions
} from './types'

// Service
export { ExportService, exportService } from './ExportService'

// Composable
export { useExport } from './composables/useExport'

// Components
export { default as ExportOptionsDialog } from './components/ExportOptionsDialog.vue'

// Templates (for direct use if needed)
export { default as ExportLayout } from './templates/ExportLayout.vue'
export { default as MenuExportTemplate } from './templates/MenuExportTemplate.vue'
export { default as RecipeExportTemplate } from './templates/RecipeExportTemplate.vue'
export { default as PreparationExportTemplate } from './templates/PreparationExportTemplate.vue'
export { default as MenuItemExportTemplate } from './templates/MenuItemExportTemplate.vue'
