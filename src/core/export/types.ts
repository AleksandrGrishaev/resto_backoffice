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
  avoidPageBreaks?: boolean // avoid breaking modules across pages
  showPageNumbers?: boolean // show page numbers in footer
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

// =============================================
// Single Menu Item Export Types
// =============================================

export interface MenuItemExportData {
  title: string // Item name
  date: string
  item: MenuItemDetailExport
  includeRecipes?: boolean
}

export interface MenuItemDetailExport {
  name: string
  category: string
  department: 'kitchen' | 'bar'
  dishType: 'simple' | 'modifiable'
  description?: string
  variants: MenuItemVariantDetailExport[]
  modifierGroups?: ModifierGroupExport[]
}

export interface MenuItemVariantDetailExport {
  name: string
  price: number
  cost: number
  foodCostPercent: number
  margin: number
  composition: MenuItemCompositionExport[]
}

export interface MenuItemCompositionExport {
  name: string
  type: 'product' | 'recipe' | 'preparation'
  quantity: number
  unit: string
  cost: number
  role?: string
  // For recipes/preparations - show their components
  nestedComponents?: NestedComponentExport[]
}

export interface NestedComponentExport {
  name: string
  type: 'product' | 'preparation'
  quantity: number
  unit: string
  cost: number
}

export interface ModifierGroupExport {
  name: string
  type: 'replacement' | 'addon' | 'removal'
  isRequired: boolean
  options: ModifierOptionExport[]
}

export interface ModifierOptionExport {
  name: string
  priceAdjustment: number
  isDefault?: boolean
}

// =============================================
// Combinations Export Types
// =============================================

export interface CombinationsExportOptions extends ExportOptions {
  includeAllCombinations?: boolean
  maxCombinations?: number // default: 10
}

// Multi-item detailed export (for bulk menu export with recipe details)
export interface MenuDetailedExportData {
  title: string
  date: string
  department: 'all' | 'kitchen' | 'bar'
  items: CombinationsExportData[]
  summary: {
    totalItems: number
    totalVariants: number
  }
}

export interface CombinationsExportData {
  title: string
  date: string
  item: MenuItemDetailExport
  // Grouped by variant (new structure)
  variantGroups: VariantCombinationGroup[]
  // Flat list for backward compatibility
  combinations: CombinationExport[]
  modifierRecipes: ModifierRecipeGroupExport[] // Legacy format (grouped by modifier)
  uniqueRecipes?: UniqueModifierRecipeExport[] // New format (unique recipes with portion columns)
  totalCombinationsCount: number
  isLimited: boolean
  isSummaryMode: boolean // true = only default modifiers, false = all combinations
}

// Combinations grouped by variant
export interface VariantCombinationGroup {
  variantName: string
  variantPrice: number
  variantBaseCost: number
  // Theoretical min/max food cost (calculated from ALL possible modifier combinations)
  // This ensures accurate range even when combinations are limited for export
  minFoodCostPercent: number
  maxFoodCostPercent: number
  minCost: number
  maxCost: number
  // For summary mode: single combination with default modifiers
  defaultCombination?: CombinationExport
  defaultModifiers?: VariantDefaultModifier[]
  // For full mode: all combinations for this variant
  combinations: CombinationExport[]
}

export interface VariantDefaultModifier {
  groupName: string
  modifierName: string
  portionSize: number
  cost: number
}

export interface CombinationExport {
  variantName: string
  displayName: string // "No Ice + Banana (0.33) + Dragon (0.33)"
  price: number
  cost: number
  foodCostPercent: number
  margin: number
}

export interface ModifierRecipeGroupExport {
  modifierName: string // "Banana Portion"
  groupName: string // "Fruit 1"
  recipeId?: string // ID of the recipe/preparation
  ingredients: ModifierIngredientExport[]
  totalCost: number
  quantity?: number // Quantity used in modifier (e.g., 0.33)
  unit?: string
}

// Unique recipe with multiple portion sizes (for column display)
export interface UniqueModifierRecipeExport {
  recipeName: string // "Banana Portion" (from composition name)
  recipeId: string
  recipeCode?: string // "R-074" for recipes, "P-42" for preparations, product code for products
  recipeType: 'product' | 'recipe' | 'preparation'
  // Source: where this recipe is used
  source?: 'variant' | 'modifier' // 'variant' = from variant composition, 'modifier' = from modifier options
  // Recipe yield info
  yield: {
    quantity: number
    unit: string
  }
  // All portion sizes used (for column headers)
  portions: ModifierPortionUsage[]
  // Ingredients with costs per portion
  ingredients: UniqueRecipeIngredientExport[]
  // Total cost for 1 full portion (yield)
  totalCostPerYield: number
}

export interface ModifierPortionUsage {
  portionSize: number // 0.33, 0.50, 1.0
  modifierGroups: string[] // ["Fruit 1", "Fruit 2"] - where this portion is used
}

export interface UniqueRecipeIngredientExport {
  name: string
  type: 'product' | 'preparation' | 'recipe'
  // Quantity per yield (full recipe) - NET quantity (cleaned/processed)
  quantityPerYield: number
  // Raw quantity before yield adjustment (gross) - shows how much raw product needed
  rawQuantityPerYield?: number
  unit: string
  costPerYield: number
  // Quantities for each portion size (calculated from quantityPerYield * portionSize)
  quantitiesByPortion: Map<number, number> // portionSize -> quantity
  costsByPortion: Map<number, number> // portionSize -> cost
  // Nested components for full expansion (preparations/recipes inside)
  nestedComponents?: NestedIngredientExport[]
}

export interface ModifierIngredientExport {
  name: string
  type: 'product' | 'recipe' | 'preparation'
  quantity: number
  unit: string
  cost: number
  nestedIngredients?: NestedIngredientExport[]
}

export interface NestedIngredientExport {
  name: string
  type: 'product' | 'preparation' | 'recipe'
  quantity: number
  unit: string
  cost: number
  // Deep nested components (for recursive expansion)
  nestedComponents?: NestedIngredientExport[]
}

// html2pdf.js options
export interface Html2PdfOptions {
  margin?: number | [number, number, number, number]
  filename?: string
  image?: { type: string; quality: number }
  html2canvas?: {
    scale: number
    useCORS: boolean
    logging?: boolean
    allowTaint?: boolean
    scrollX?: number
    scrollY?: number
  }
  jsPDF?: { unit: string; format: string; orientation: string }
  pagebreak?: { mode: string[]; before?: string; after?: string; avoid?: string }
}
