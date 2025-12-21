// src/core/cost/types.ts
// Type definitions for Menu Item Cost Analysis

/**
 * Detailed breakdown of a composition item cost
 */
export interface CompositionCostItem {
  type: 'product' | 'recipe' | 'preparation'
  id: string
  name: string
  quantity: number
  unit: string
  costPerUnit: number
  totalCost: number
}

/**
 * Base cost data (no modifiers)
 */
export interface BaseCostData {
  cost: number
  price: number
  foodCostPercent: number | null // null if required modifiers have no defaults
  composition: CompositionCostItem[]

  // 🆕 Additional context
  note?: string // e.g., "n/a - required modifiers" or "calculated with defaults"
  isCalculatedWithDefaults?: boolean // true if we used default required modifiers
}

/**
 * Cost range data (min/max for modifiers)
 */
export interface CostRangeData {
  minCost: number
  maxCost: number
  minPrice: number
  maxPrice: number
  minFoodCostPercent: number
  maxFoodCostPercent: number
}

/**
 * Individual modifier option cost breakdown
 */
export interface ModifierOptionCostData {
  optionId: string
  optionName: string

  // Cost of this option
  cost: number
  costBreakdown: CompositionCostItem[]

  // Price impact
  priceAdjustment: number

  // Food cost % of this modifier option
  // (for addon: cost / priceAdjustment * 100)
  foodCostPercent: number

  // Flags
  isDefault: boolean
  isActive: boolean

  // 🆕 New fields for improved display
  finalFoodCostPercent?: number // For required with Price+=0: (baseCost + optionCost) / basePrice * 100
  displayMode: 'addon-fc' | 'final-fc' | 'free-addon' | 'replacement'

  // 🆕 Replacement-specific data
  replacementInfo?: {
    replaces: string[] // Names of replaced components
    replacedCost: number // Total cost of replaced components
    netCostDelta: number // optionCost - replacedCost
    netPriceDelta: number // priceAdjustment
    netFoodCostPercent: number // netCostDelta / netPriceDelta * 100
  }
}

/**
 * Modifier group cost breakdown (for addon type)
 */
export interface ModifierCostItem {
  groupId: string
  groupName: string
  groupType: 'addon' | 'replacement' | 'removal'
  isRequired: boolean

  // Options in this group
  options: ModifierOptionCostData[]

  // Range of impact from this group
  minCostImpact: number
  maxCostImpact: number
  minPriceImpact: number
  maxPriceImpact: number
}

/**
 * Complete cost analysis for a menu item variant
 */
export interface MenuItemCostAnalysis {
  // Menu item info
  menuItemId: string
  menuItemName: string
  variantId: string
  variantName: string
  department: 'kitchen' | 'bar'
  dishType: 'simple' | 'modifiable' | 'from_modifiers_only'

  // Base cost (no modifiers)
  base: BaseCostData

  // With required modifiers
  withRequired: CostRangeData

  // With optional modifiers (on top of required)
  withOptional: CostRangeData

  // Full range (required + optional)
  full: CostRangeData

  // 🆕 Detailed breakdown of addon modifiers
  modifiersCostBreakdown: ModifierCostItem[]

  // Metadata
  hasModifiers: boolean
  hasRequiredModifiers: boolean
  hasOptionalModifiers: boolean
  hasAddonModifiers: boolean
}

/**
 * Context for cost calculations
 */
export interface CostCalculationContext {
  products: Map<string, { id: string; name: string; baseCostPerUnit: number; unit: string }>
  recipes: Map<string, { id: string; name: string; costPerPortion: number }>
  preparations: Map<
    string,
    { id: string; name: string; costPerOutputUnit: number; outputUnit: string }
  >
}
