/**
 * PDF Export Types
 */

export type ExportType = 'menu' | 'recipe' | 'preparation'

export type DepartmentFilter = 'kitchen' | 'bar' | 'all'

export interface ExportOptions {
  filename?: string
  includeQuantities?: boolean
  includeInstructions?: boolean // recipes only
  includeCosts?: boolean
  pageSize?: 'a4' | 'letter'
  orientation?: 'portrait' | 'landscape'
  department?: DepartmentFilter // filter by department
}

export interface ExportItem {
  id: string
  name: string
  cost?: number
  price?: number
  category?: string
}

export interface MenuExportData {
  title: string
  date: string
  categories: MenuCategoryExport[]
  totals?: {
    itemCount: number
    totalCost: number
  }
}

export interface MenuCategoryExport {
  name: string
  items: MenuItemExport[]
}

export interface MenuItemExport {
  name: string
  dishType: 'simple' | 'component-based' | 'addon-based'
  variants: MenuVariantExport[]
}

export interface MenuVariantExport {
  name: string
  price: number
  cost: number
  foodCostPercent: number
}

export interface RecipeExportData {
  title: string
  date: string
  departments?: RecipeDepartmentExport[] // When exporting 'all' - grouped by department
  categories: RecipeCategoryExport[] // Direct categories (single department or backward compat)
}

export interface RecipeDepartmentExport {
  name: string // 'Kitchen' | 'Bar'
  department: 'kitchen' | 'bar'
  categories: RecipeCategoryExport[]
}

export interface RecipeCategoryExport {
  name: string
  recipes: RecipeExport[]
}

export interface RecipeExport {
  id: string
  name: string
  category?: string
  outputQuantity: number
  outputUnit: string
  costPerUnit: number
  totalCost: number
  components: RecipeComponentExport[]
  instructions?: string
}

export interface RecipeComponentExport {
  name: string
  type: 'product' | 'preparation'
  quantity: number
  unit: string
  cost: number
}

export interface PreparationExportData {
  title: string
  date: string
  departments?: PreparationDepartmentExport[] // When exporting 'all' - grouped by department
  categories: PreparationCategoryExport[] // Direct categories (single department or backward compat)
}

export interface PreparationDepartmentExport {
  name: string // 'Kitchen' | 'Bar'
  department: 'kitchen' | 'bar'
  categories: PreparationCategoryExport[]
}

export interface PreparationCategoryExport {
  name: string
  preparations: PreparationExport[]
}

export interface PreparationExport {
  id: string
  name: string
  category?: string
  portionType: 'weight' | 'portion' // How output is measured
  outputQuantity: number
  outputUnit: string
  costPerUnit: number
  totalCost: number
  components: PreparationComponentExport[]
  instructions?: string
}

export interface PreparationComponentExport {
  name: string
  type: 'product' | 'preparation'
  quantity: number
  unit: string
  cost: number
}

// html2pdf.js options
export interface Html2PdfOptions {
  margin?: number | [number, number, number, number]
  filename?: string
  image?: { type: string; quality: number }
  html2canvas?: { scale: number; useCORS: boolean }
  jsPDF?: { unit: string; format: string; orientation: string }
}
