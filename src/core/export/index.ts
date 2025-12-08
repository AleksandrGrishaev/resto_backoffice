/**
 * PDF Export Module
 * Exports Menu, Recipes, and Preparations to PDF
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
