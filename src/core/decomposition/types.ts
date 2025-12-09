// src/core/decomposition/types.ts
// Unified types for DecompositionEngine

import type { MenuComposition, SelectedModifier, TargetComponent } from '@/stores/menu/types'

// Re-export imported types for convenience
export type { MenuComposition, SelectedModifier, TargetComponent }

// =============================================
// Traversal Options
// =============================================

/**
 * Strategy for handling preparations during decomposition
 * - 'keep': Keep preparations as final elements (don't decompose further)
 * - 'decompose': Decompose preparations into their ingredients
 */
export type PreparationStrategy = 'keep' | 'decompose'

/**
 * Options for decomposition traversal
 */
export interface TraversalOptions {
  /** How to handle preparations: keep as-is or decompose to products */
  preparationStrategy: PreparationStrategy

  /** Apply yield percentage adjustment for products */
  applyYield: boolean

  /** Convert portion-type preparations to grams */
  convertPortions: boolean

  /** Include decomposition path in results (for debugging) */
  includePath: boolean
}

/**
 * Default traversal options for different use cases
 */
export const DEFAULT_WRITEOFF_OPTIONS: TraversalOptions = {
  preparationStrategy: 'keep',
  applyYield: true,
  convertPortions: true,
  includePath: true
}

export const DEFAULT_COST_OPTIONS: TraversalOptions = {
  preparationStrategy: 'keep',
  applyYield: true,
  convertPortions: true,
  includePath: false
}

// =============================================
// Input Types
// =============================================

/**
 * Input for menu item decomposition
 */
export interface MenuItemInput {
  menuItemId: string
  variantId: string
  quantity: number
  selectedModifiers?: SelectedModifier[]
}

// =============================================
// Output Types (Traversal Results)
// =============================================

/**
 * Base interface for decomposed nodes
 */
interface DecomposedNodeBase {
  /** Quantity in base units (grams for weight, pieces for countable) */
  quantity: number
  /** Unit of measurement */
  unit: string
  /** Decomposition path for debugging */
  path?: string[]
}

/**
 * Decomposed product node
 */
export interface DecomposedProductNode extends DecomposedNodeBase {
  type: 'product'
  productId: string
  productName: string
  /** Base cost per unit from product catalog */
  baseCostPerUnit: number
}

/**
 * Decomposed preparation node
 */
export interface DecomposedPreparationNode extends DecomposedNodeBase {
  type: 'preparation'
  preparationId: string
  preparationName: string
  /** Output unit from preparation definition */
  outputUnit: string
}

/**
 * Union type for decomposed nodes
 */
export type DecomposedNode = DecomposedProductNode | DecomposedPreparationNode

/**
 * Result of decomposition traversal
 */
export interface TraversalResult {
  /** Decomposed nodes (products and/or preparations) */
  nodes: DecomposedNode[]
  /** Metadata about the traversal */
  metadata: {
    menuItemName: string
    variantName: string
    quantity: number
    modifiersApplied: number
    replacementsApplied: number
    traversedAt: string
  }
}

// =============================================
// Store Data Types (for lookups)
// =============================================

/**
 * Product data needed for decomposition
 */
export interface ProductForDecomposition {
  id: string
  name: string
  baseUnit: string
  baseCostPerUnit: number
  yieldPercentage?: number
  isActive: boolean
}

/**
 * Preparation data needed for decomposition
 */
export interface PreparationForDecomposition {
  id: string
  name: string
  outputUnit: string
  outputQuantity: number
  portionType?: 'weight' | 'portion'
  portionSize?: number
  recipe: PreparationIngredient[]
  isActive: boolean
}

/**
 * Preparation ingredient (from recipe)
 */
export interface PreparationIngredient {
  id: string
  type: 'product' | 'preparation'
  quantity: number
  unit: string
  useYieldPercentage?: boolean
}

/**
 * Recipe data needed for decomposition
 */
export interface RecipeForDecomposition {
  id: string
  name: string
  portionSize: number
  components: RecipeComponent[]
  isActive: boolean
}

/**
 * Recipe component
 */
export interface RecipeComponent {
  id: string
  componentId: string
  componentType: 'product' | 'preparation'
  name?: string
  quantity: number
  unit: string
  useYieldPercentage?: boolean
}

/**
 * Menu item data needed for decomposition
 */
export interface MenuItemForDecomposition {
  id: string
  name: string
  variants: MenuVariantForDecomposition[]
}

/**
 * Menu variant data needed for decomposition
 */
export interface MenuVariantForDecomposition {
  id: string
  name: string
  composition: MenuComposition[]
}

// =============================================
// Store Provider Interface
// =============================================

/**
 * Interface for providing store data to DecompositionEngine
 * This allows the engine to be decoupled from specific store implementations
 */
export interface StoreProvider {
  getMenuItem(id: string): MenuItemForDecomposition | null
  getRecipe(id: string): RecipeForDecomposition | null
  getPreparation(id: string): PreparationForDecomposition | null
  getProduct(id: string): ProductForDecomposition | null
}

// =============================================
// Error Types
// =============================================

export class DecompositionError extends Error {
  constructor(
    message: string,
    public readonly code: DecompositionErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DecompositionError'
  }
}

export type DecompositionErrorCode =
  | 'MENU_ITEM_NOT_FOUND'
  | 'VARIANT_NOT_FOUND'
  | 'RECIPE_NOT_FOUND'
  | 'PREPARATION_NOT_FOUND'
  | 'PRODUCT_NOT_FOUND'
  | 'STORE_NOT_INITIALIZED'
  | 'INVALID_COMPOSITION'
