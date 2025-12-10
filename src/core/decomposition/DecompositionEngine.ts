// src/core/decomposition/DecompositionEngine.ts
// Unified decomposition engine for menu items

import { DebugUtils, TimeUtils } from '@/utils'
import type {
  MenuItemInput,
  TraversalOptions,
  TraversalResult,
  DecomposedNode,
  DecomposedProductNode,
  DecomposedPreparationNode,
  StoreProvider,
  MenuComposition,
  SelectedModifier
} from './types'
import { DecompositionError } from './types'
import {
  buildReplacementMap,
  getReplacementForComponent,
  type ReplacementEntry
} from './utils/replacementUtils'
import { convertPortionToGrams, getPortionMultiplier } from './utils/portionUtils'
import { applyYieldAdjustment } from './utils/yieldUtils'

const MODULE_NAME = 'DecompositionEngine'

/**
 * DecompositionEngine
 *
 * Unified engine for decomposing menu items into their constituent
 * products and preparations. Supports:
 * - Replacement modifiers (swap components)
 * - Addon modifiers (add extra components)
 * - Yield percentage adjustment
 * - Portion to grams conversion
 * - Duplicate merging
 */
export class DecompositionEngine {
  private storeProvider: StoreProvider

  constructor(storeProvider: StoreProvider) {
    this.storeProvider = storeProvider
  }

  /**
   * Main entry point: Decompose a menu item
   *
   * @param input - Menu item input (id, variant, quantity, modifiers)
   * @param options - Traversal options
   * @returns Traversal result with decomposed nodes
   */
  async traverse(input: MenuItemInput, options: TraversalOptions): Promise<TraversalResult> {
    DebugUtils.info(MODULE_NAME, 'Starting decomposition', {
      menuItemId: input.menuItemId,
      variantId: input.variantId,
      quantity: input.quantity,
      modifiersCount: input.selectedModifiers?.length || 0
    })

    // 1. Get menu item
    const menuItem = this.storeProvider.getMenuItem(input.menuItemId)
    if (!menuItem) {
      throw new DecompositionError('Menu item not found', 'MENU_ITEM_NOT_FOUND', {
        menuItemId: input.menuItemId
      })
    }

    // 2. Get variant
    const variant = menuItem.variants.find(v => v.id === input.variantId)
    if (!variant) {
      throw new DecompositionError('Variant not found', 'VARIANT_NOT_FOUND', {
        menuItemId: input.menuItemId,
        variantId: input.variantId
      })
    }

    // 3. Build replacement map from modifiers
    const replacements = buildReplacementMap(input.selectedModifiers)

    // Get portion multiplier from variant (used for scaling modifier quantities)
    const portionMultiplier = getPortionMultiplier(variant.portionMultiplier)

    DebugUtils.debug(MODULE_NAME, 'Processing variant composition', {
      menuItem: menuItem.name,
      variant: variant.name,
      compositionCount: variant.composition.length,
      replacementsCount: replacements.size,
      portionMultiplier
    })

    // 4. Process base composition
    const nodes: DecomposedNode[] = []

    for (const comp of variant.composition) {
      const items = await this.traverseComposition(
        comp,
        input.quantity,
        options,
        replacements,
        options.includePath ? [menuItem.name, variant.name] : []
      )
      nodes.push(...items)
    }

    // 5. Process addon modifiers (non-replacement modifiers with composition)
    // Apply portionMultiplier to scale modifier quantities based on variant
    if (input.selectedModifiers) {
      const addonNodes = await this.processAddonModifiers(
        input.selectedModifiers,
        input.quantity,
        portionMultiplier,
        options,
        options.includePath ? [menuItem.name, variant.name] : []
      )
      nodes.push(...addonNodes)
    }

    // 6. Merge duplicates
    const mergedNodes = this.mergeNodes(nodes)

    const result: TraversalResult = {
      nodes: mergedNodes,
      metadata: {
        menuItemName: menuItem.name,
        variantName: variant.name,
        quantity: input.quantity,
        modifiersApplied: input.selectedModifiers?.length || 0,
        replacementsApplied: replacements.size,
        traversedAt: TimeUtils.getCurrentLocalISO()
      }
    }

    DebugUtils.info(MODULE_NAME, 'Decomposition complete', {
      totalNodes: mergedNodes.length,
      products: mergedNodes.filter(n => n.type === 'product').length,
      preparations: mergedNodes.filter(n => n.type === 'preparation').length
    })

    return result
  }

  /**
   * Traverse a single composition element
   */
  private async traverseComposition(
    comp: MenuComposition,
    quantity: number,
    options: TraversalOptions,
    replacements: Map<string, ReplacementEntry>,
    path: string[]
  ): Promise<DecomposedNode[]> {
    switch (comp.type) {
      case 'product':
        return this.traverseProduct(comp, quantity, options, path)

      case 'recipe':
        return this.traverseRecipe(comp, quantity, options, replacements, path)

      case 'preparation':
        return this.traversePreparation(comp, quantity, options, path)

      default:
        DebugUtils.warn(MODULE_NAME, 'Unknown composition type', { type: comp.type })
        return []
    }
  }

  /**
   * Traverse a product (base case)
   */
  private async traverseProduct(
    comp: MenuComposition,
    quantity: number,
    options: TraversalOptions,
    path: string[]
  ): Promise<DecomposedProductNode[]> {
    const product = this.storeProvider.getProduct(comp.id)
    if (!product) {
      DebugUtils.error(MODULE_NAME, 'Product not found', { productId: comp.id })
      return []
    }

    // Calculate total quantity
    let totalQuantity = comp.quantity * quantity

    // Apply yield adjustment if enabled
    if (options.applyYield && comp.useYieldPercentage) {
      const yieldResult = applyYieldAdjustment(totalQuantity, product, true)
      if (yieldResult.wasAdjusted) {
        DebugUtils.debug(MODULE_NAME, 'Applied yield adjustment', {
          product: product.name,
          original: totalQuantity,
          adjusted: yieldResult.adjustedQuantity,
          yield: yieldResult.yieldPercentage
        })
        totalQuantity = yieldResult.adjustedQuantity
      }
    }

    const node: DecomposedProductNode = {
      type: 'product',
      productId: comp.id,
      productName: product.name,
      quantity: totalQuantity,
      unit: comp.unit || product.baseUnit,
      baseCostPerUnit: product.baseCostPerUnit
    }

    if (options.includePath) {
      node.path = [...path, product.name]
    }

    return [node]
  }

  /**
   * Traverse a recipe (recursive)
   */
  private async traverseRecipe(
    comp: MenuComposition,
    quantity: number,
    options: TraversalOptions,
    replacements: Map<string, ReplacementEntry>,
    path: string[]
  ): Promise<DecomposedNode[]> {
    const recipe = this.storeProvider.getRecipe(comp.id)
    if (!recipe) {
      DebugUtils.error(MODULE_NAME, 'Recipe not found', { recipeId: comp.id })
      return []
    }

    DebugUtils.debug(MODULE_NAME, 'Decomposing recipe', {
      name: recipe.name,
      components: recipe.components.length
    })

    const results: DecomposedNode[] = []

    for (const recipeComp of recipe.components) {
      // Check if this component should be replaced
      const replacementEntry = getReplacementForComponent(recipe.id, recipeComp.id, replacements)

      if (replacementEntry) {
        const { modifier, isCompositionTarget } = replacementEntry

        if (isCompositionTarget && modifier.composition?.length) {
          // First target: add replacement composition
          DebugUtils.debug(MODULE_NAME, 'Applying replacement composition', {
            original: recipeComp.name || recipeComp.componentId,
            replacement: modifier.optionName
          })

          for (const replComp of modifier.composition) {
            const items = await this.traverseComposition(
              replComp,
              quantity,
              options,
              replacements,
              options.includePath ? [...path, recipe.name, `→${modifier.optionName}`] : []
            )
            results.push(...items)
          }
        } else {
          // Not composition target: just skip (exclude) this component
          DebugUtils.debug(MODULE_NAME, 'Excluding component (multi-target)', {
            excluded: recipeComp.name || recipeComp.componentId,
            replacedBy: modifier.optionName
          })
        }
      } else {
        // Use original component
        const menuComp: MenuComposition = {
          type: recipeComp.componentType,
          id: recipeComp.componentId,
          quantity: recipeComp.quantity,
          unit: recipeComp.unit,
          useYieldPercentage: recipeComp.useYieldPercentage
        }

        const items = await this.traverseComposition(
          menuComp,
          quantity,
          options,
          replacements,
          options.includePath ? [...path, recipe.name] : []
        )
        results.push(...items)
      }
    }

    return results
  }

  /**
   * Traverse a preparation
   * With preparationStrategy='keep', returns preparation as final element
   * With preparationStrategy='decompose', recursively decomposes to products
   */
  private async traversePreparation(
    comp: MenuComposition,
    quantity: number,
    options: TraversalOptions,
    path: string[]
  ): Promise<DecomposedNode[]> {
    const preparation = this.storeProvider.getPreparation(comp.id)
    if (!preparation) {
      DebugUtils.error(MODULE_NAME, 'Preparation not found', { preparationId: comp.id })
      return []
    }

    // Calculate quantity with optional portion conversion
    let totalQuantity = comp.quantity * quantity
    let outputUnit = preparation.outputUnit

    if (options.convertPortions) {
      const conversionResult = convertPortionToGrams(comp, preparation, quantity)
      if (conversionResult.wasConverted) {
        totalQuantity = conversionResult.quantity
        outputUnit = conversionResult.unit

        DebugUtils.debug(MODULE_NAME, 'Converted portions to grams', {
          preparation: preparation.name,
          originalQuantity: comp.quantity * quantity,
          convertedQuantity: totalQuantity,
          portionSize: preparation.portionSize
        })
      }
    }

    // Strategy: keep preparation as final element (for write-off from prep batches)
    if (options.preparationStrategy === 'keep') {
      const node: DecomposedPreparationNode = {
        type: 'preparation',
        preparationId: comp.id,
        preparationName: preparation.name,
        quantity: totalQuantity,
        unit: outputUnit,
        outputUnit: preparation.outputUnit
      }

      if (options.includePath) {
        node.path = [...path, preparation.name]
      }

      return [node]
    }

    // Strategy: decompose preparation to its ingredients
    // This is used when we want to trace all the way to raw products
    const results: DecomposedNode[] = []

    for (const ingredient of preparation.recipe) {
      const menuComp: MenuComposition = {
        type: ingredient.type,
        id: ingredient.id,
        quantity: ingredient.quantity * (totalQuantity / preparation.outputQuantity),
        unit: ingredient.unit,
        useYieldPercentage: ingredient.useYieldPercentage
      }

      const items = await this.traverseComposition(
        menuComp,
        1, // quantity already factored in
        options,
        new Map(), // No replacements for preparation ingredients
        options.includePath ? [...path, preparation.name] : []
      )
      results.push(...items)
    }

    return results
  }

  /**
   * Process addon modifiers (non-replacement modifiers that add extra components)
   * @param selectedModifiers - Selected modifiers from order
   * @param quantity - Base quantity (number of items sold)
   * @param portionMultiplier - Multiplier from variant (e.g., 1.3 for no-ice juice)
   * @param options - Traversal options
   * @param basePath - Path for debugging
   */
  private async processAddonModifiers(
    selectedModifiers: SelectedModifier[],
    quantity: number,
    portionMultiplier: number,
    options: TraversalOptions,
    basePath: string[]
  ): Promise<DecomposedNode[]> {
    const results: DecomposedNode[] = []

    for (const modifier of selectedModifiers) {
      // Skip replacement modifiers (handled in traverseRecipe)
      if (modifier.groupType === 'replacement' && modifier.targetComponents?.length) {
        continue
      }

      // Process addon modifier composition
      if (modifier.composition && modifier.composition.length > 0) {
        DebugUtils.debug(MODULE_NAME, 'Processing addon modifier', {
          name: modifier.optionName,
          compositionCount: modifier.composition.length,
          portionMultiplier
        })

        for (const comp of modifier.composition) {
          // Apply portionMultiplier to modifier composition quantity
          const scaledComp: MenuComposition = {
            ...comp,
            quantity: comp.quantity * portionMultiplier
          }

          const items = await this.traverseComposition(
            scaledComp,
            quantity,
            options,
            new Map(), // No nested replacements for modifiers
            options.includePath ? [...basePath, `+${modifier.optionName}`] : []
          )
          results.push(...items)
        }
      }
    }

    return results
  }

  /**
   * Merge duplicate nodes (same type + id + unit)
   */
  private mergeNodes(nodes: DecomposedNode[]): DecomposedNode[] {
    const grouped = new Map<string, DecomposedNode>()

    for (const node of nodes) {
      const id = node.type === 'product' ? node.productId : node.preparationId
      const key = `${node.type}_${id}_${node.unit}`

      if (grouped.has(key)) {
        const existing = grouped.get(key)!
        existing.quantity += node.quantity

        // Merge paths for debugging
        if (existing.path && node.path) {
          existing.path = [...new Set([...existing.path, ...node.path])]
        }
      } else {
        grouped.set(key, { ...node })
      }
    }

    const merged = Array.from(grouped.values())

    DebugUtils.debug(MODULE_NAME, 'Merged duplicate nodes', {
      original: nodes.length,
      merged: merged.length
    })

    return merged
  }
}

/**
 * Ensure all required stores are initialized
 * Performs lazy initialization if stores are not ready
 *
 * @throws DecompositionError if stores cannot be initialized
 */
export async function ensureStoresInitialized(): Promise<void> {
  // Lazy import stores to avoid circular dependencies
  const { useRecipesStore } = await import('@/stores/recipes/recipesStore')
  const { useProductsStore } = await import('@/stores/productsStore')

  const recipesStore = useRecipesStore()
  const productsStore = useProductsStore()

  // Check and initialize recipesStore
  if (!recipesStore.initialized) {
    DebugUtils.warn(MODULE_NAME, 'RecipesStore not initialized, initializing now...')

    try {
      if (recipesStore.initialize) {
        await recipesStore.initialize()
        DebugUtils.info(MODULE_NAME, 'RecipesStore initialized successfully')
      } else {
        throw new Error('RecipesStore.initialize() method not found')
      }
    } catch (error) {
      throw new DecompositionError('Failed to initialize RecipesStore', 'STORE_NOT_INITIALIZED', {
        store: 'recipes',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  // Check and initialize productsStore
  if (!productsStore.products || productsStore.products.length === 0) {
    DebugUtils.warn(MODULE_NAME, 'ProductsStore empty, loading now...')

    try {
      await productsStore.loadProducts()
      DebugUtils.info(MODULE_NAME, 'ProductsStore loaded successfully')
    } catch (error) {
      throw new DecompositionError('Failed to load ProductsStore', 'STORE_NOT_INITIALIZED', {
        store: 'products',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  DebugUtils.debug(MODULE_NAME, 'Stores initialization check passed', {
    recipesInitialized: recipesStore.initialized,
    recipesCount: recipesStore.recipes?.length || 0,
    preparationsCount: recipesStore.preparations?.length || 0,
    productsCount: productsStore.products.length
  })
}

/**
 * Factory function to create DecompositionEngine with store access
 * This is the recommended way to create an engine instance
 *
 * @param autoInitialize - If true, ensures stores are initialized before returning
 */
export async function createDecompositionEngine(
  autoInitialize: boolean = true
): Promise<DecompositionEngine> {
  // Ensure stores are ready if requested
  if (autoInitialize) {
    await ensureStoresInitialized()
  }

  // Lazy import stores to avoid circular dependencies
  const { useMenuStore } = await import('@/stores/menu/menuStore')
  const { useRecipesStore } = await import('@/stores/recipes/recipesStore')
  const { useProductsStore } = await import('@/stores/productsStore')

  const menuStore = useMenuStore()
  const recipesStore = useRecipesStore()
  const productsStore = useProductsStore()

  const storeProvider: StoreProvider = {
    getMenuItem(id: string) {
      const item = menuStore.menuItems.find((m: any) => m.id === id)
      if (!item) return null

      return {
        id: item.id,
        name: item.name,
        variants: item.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          composition: v.composition || [],
          portionMultiplier: v.portionMultiplier
        }))
      }
    },

    getRecipe(id: string) {
      const recipe = recipesStore.recipes.find((r: any) => r.id === id)
      if (!recipe) return null

      return {
        id: recipe.id,
        name: recipe.name,
        portionSize: recipe.portionSize,
        components: recipe.components || [],
        isActive: recipe.isActive
      }
    },

    getPreparation(id: string) {
      const prep = recipesStore.preparations.find((p: any) => p.id === id)
      if (!prep) return null

      return {
        id: prep.id,
        name: prep.name,
        outputUnit: prep.outputUnit,
        outputQuantity: prep.outputQuantity,
        portionType: prep.portionType,
        portionSize: prep.portionSize,
        recipe: prep.recipe || [],
        isActive: prep.isActive
      }
    },

    getProduct(id: string) {
      const product = productsStore.products.find((p: any) => p.id === id)
      if (!product) return null

      return {
        id: product.id,
        name: product.name,
        baseUnit: product.baseUnit,
        baseCostPerUnit: product.baseCostPerUnit,
        yieldPercentage: product.yieldPercentage,
        isActive: product.isActive
      }
    }
  }

  return new DecompositionEngine(storeProvider)
}

// =============================================
// Utility Functions
// =============================================

/**
 * Calculate total cost from decomposed nodes
 * Only products have baseCostPerUnit, preparations need FIFO allocation
 *
 * @param nodes - Decomposed nodes
 * @returns Total cost (only from products with baseCostPerUnit)
 */
export function calculateTotalBaseCost(nodes: DecomposedNode[]): number {
  return nodes.reduce((sum, node) => {
    if (node.type === 'product') {
      return sum + node.quantity * node.baseCostPerUnit
    }
    // Preparations don't have cost here - it's calculated via FIFO in adapters
    return sum
  }, 0)
}

/**
 * Get names from decomposed nodes (products + preparations)
 *
 * @param nodes - Decomposed nodes
 * @returns Array of item names
 */
export function getNodeNames(nodes: DecomposedNode[]): string[] {
  return nodes.map(node => {
    if (node.type === 'product') {
      return node.productName
    }
    return node.preparationName
  })
}

/**
 * Filter nodes by type
 */
export function filterProductNodes(nodes: DecomposedNode[]): DecomposedProductNode[] {
  return nodes.filter((n): n is DecomposedProductNode => n.type === 'product')
}

export function filterPreparationNodes(nodes: DecomposedNode[]): DecomposedPreparationNode[] {
  return nodes.filter((n): n is DecomposedPreparationNode => n.type === 'preparation')
}
