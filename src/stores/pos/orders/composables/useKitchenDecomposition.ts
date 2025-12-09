// src/stores/pos/orders/composables/useKitchenDecomposition.ts
import type { PosBillItem } from '../../types'
import type { MenuComposition, SelectedModifier, TargetComponent } from '@/stores/menu/types'
import { useMenuStore } from '@/stores/menu/menuStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import { useProductsStore } from '@/stores/productsStore'

/**
 * Key for replacement map: recipeId_componentId or variant_componentId
 */
function getReplacementKey(target: TargetComponent): string {
  if (target.sourceType === 'recipe' && target.recipeId) {
    return `${target.recipeId}_${target.componentId}`
  }
  return `variant_${target.componentId}`
}

const MODULE_NAME = 'KitchenDecomposition'

/**
 * Kitchen Decomposition Result
 * Результат декомпозиции для кухни с детальной информацией
 */
export interface KitchenDecomposedItem {
  productId: string
  productName: string
  quantity: number
  unit: string
  costPerUnit: number
  totalCost: number
  source: 'base' | 'modifier' // откуда пришел продукт
  modifierName?: string // название модификатора (если source === 'modifier')
  role?: string // роль компонента (main, garnish, sauce, addon)
  path: string[] // путь декомпозиции для отладки
}

/**
 * useKitchenDecomposition
 * Декомпозиция заказа с модификаторами до конечных продуктов для кухни
 */
export function useKitchenDecomposition() {
  const menuStore = useMenuStore()
  const recipesStore = useRecipesStore()
  const productsStore = useProductsStore()

  /**
   * Проверка инициализации необходимых stores
   */
  function checkStoresInitialized(): void {
    if (!recipesStore.initialized) {
      throw new Error(
        `❌ [${MODULE_NAME}] RecipesStore is not initialized! Kitchen decomposition requires recipes and preparations data.`
      )
    }

    if (!productsStore.products || productsStore.products.length === 0) {
      throw new Error(
        `❌ [${MODULE_NAME}] ProductsStore has no data! Kitchen decomposition requires products catalog.`
      )
    }

    console.log(`✅ [${MODULE_NAME}] Stores initialized check passed`, {
      recipesInitialized: recipesStore.initialized,
      recipesCount: recipesStore.recipes?.length || 0,
      preparationsCount: recipesStore.preparations?.length || 0,
      productsCount: productsStore.products.length
    })
  }

  /**
   * Main decomposition method для PosBillItem
   * Разворачивает позицию заказа (с модификаторами) до конечных продуктов
   */
  async function decomposeBillItem(billItem: PosBillItem): Promise<KitchenDecomposedItem[]> {
    checkStoresInitialized()

    console.log(`🔍 [${MODULE_NAME}] Decomposing bill item:`, {
      menuItemId: billItem.menuItemId,
      variantId: billItem.variantId,
      quantity: billItem.quantity,
      hasModifiers: !!billItem.selectedModifiers?.length
    })

    try {
      // 1. Get menu item and variant
      const menuItem = menuStore.menuItems.find(item => item.id === billItem.menuItemId)
      if (!menuItem) {
        console.error(`❌ [${MODULE_NAME}] Menu item not found: ${billItem.menuItemId}`)
        return []
      }

      const variant = menuItem.variants.find((v: any) => v.id === billItem.variantId)
      if (!variant) {
        console.error(`❌ [${MODULE_NAME}] Variant not found: ${billItem.variantId}`)
        return []
      }

      // ✨ NEW: Get portionMultiplier from variant (default 1)
      const portionMultiplier = variant.portionMultiplier ?? 1

      console.log(`📋 [${MODULE_NAME}] Found variant:`, {
        name: `${menuItem.name} - ${variant.name}`,
        baseCompositionCount: variant.composition.length,
        modifiersCount: billItem.selectedModifiers?.length || 0,
        portionMultiplier
      })

      // ✨ NEW: Build replacement map from selectedModifiers
      const replacements = new Map<string, SelectedModifier>()
      if (billItem.selectedModifiers) {
        for (const modifier of billItem.selectedModifiers) {
          // Only process replacement modifiers with targetComponent and NOT default option
          if (
            modifier.groupType === 'replacement' &&
            modifier.targetComponent &&
            !modifier.isDefault
          ) {
            const key = getReplacementKey(modifier.targetComponent)
            replacements.set(key, modifier)
            console.log(`  🔄 [${MODULE_NAME}] Replacement registered:`, {
              key,
              targetName: modifier.targetComponent.componentName,
              replacementOption: modifier.optionName
            })
          }
        }
      }

      const baseResults: KitchenDecomposedItem[] = []
      const modifierResults: KitchenDecomposedItem[] = []

      // 2. Process base composition with portionMultiplier
      console.log(`  🍽️ [${MODULE_NAME}] Processing base composition (×${portionMultiplier})...`)
      for (const comp of variant.composition) {
        const items = await decomposeCompositionWithReplacements(
          comp,
          billItem.quantity * portionMultiplier,
          [menuItem.name, variant.name],
          'base',
          undefined,
          replacements
        )
        baseResults.push(...items)
      }

      // 3. Process addon modifiers (NOT replacements - those are handled above)
      if (billItem.selectedModifiers && billItem.selectedModifiers.length > 0) {
        console.log(
          `  ➕ [${MODULE_NAME}] Processing ${billItem.selectedModifiers.length} modifiers...`
        )

        for (const modifier of billItem.selectedModifiers) {
          // Skip replacement modifiers (already handled via replacements map)
          if (modifier.groupType === 'replacement' && modifier.targetComponent) {
            continue
          }

          if (!modifier.composition || modifier.composition.length === 0) {
            console.log(`  ⚠️ [${MODULE_NAME}] Modifier has no composition:`, modifier.optionName)
            continue
          }

          console.log(`    ➕ [${MODULE_NAME}] Processing addon modifier: ${modifier.optionName}`)

          for (const comp of modifier.composition) {
            const items = await decomposeComposition(
              comp,
              billItem.quantity * portionMultiplier,
              [menuItem.name, variant.name, modifier.optionName],
              'modifier',
              modifier.optionName
            )
            modifierResults.push(...items)
          }
        }
      }

      // 4. Combine base and modifier results
      const results = [...baseResults, ...modifierResults]

      // 5. Merge duplicates
      const merged = mergeDecomposedItems(results)

      console.log(`✅ [${MODULE_NAME}] Kitchen decomposition complete:`, {
        totalProducts: merged.length,
        totalCost: merged.reduce((sum, item) => sum + item.totalCost, 0),
        baseProducts: merged.filter(i => i.source === 'base').length,
        modifierProducts: merged.filter(i => i.source === 'modifier').length,
        replacementsApplied: replacements.size
      })

      return merged
    } catch (error) {
      console.error(`❌ [${MODULE_NAME}] Kitchen decomposition failed:`, error)
      return []
    }
  }

  /**
   * Decompose composition with replacement support
   * Проверяет replacements map и заменяет target components
   */
  async function decomposeCompositionWithReplacements(
    comp: MenuComposition,
    quantity: number,
    path: string[],
    source: 'base' | 'modifier',
    modifierName?: string,
    replacements?: Map<string, SelectedModifier>
  ): Promise<KitchenDecomposedItem[]> {
    // For recipes - check if any component should be replaced
    if (comp.type === 'recipe' && replacements && replacements.size > 0) {
      return await decomposeRecipeWithReplacements(
        comp,
        quantity,
        path,
        source,
        modifierName,
        replacements
      )
    }

    // For other types - use standard decomposition
    return await decomposeComposition(comp, quantity, path, source, modifierName)
  }

  /**
   * Decompose Recipe with replacement support
   * Проверяет replacements map для каждого компонента рецепта
   */
  async function decomposeRecipeWithReplacements(
    comp: MenuComposition,
    quantity: number,
    path: string[],
    source: 'base' | 'modifier',
    modifierName: string | undefined,
    replacements: Map<string, SelectedModifier>
  ): Promise<KitchenDecomposedItem[]> {
    const recipe = recipesStore.recipes.find(r => r.id === comp.id)
    if (!recipe) {
      console.error(`❌ [${MODULE_NAME}] Recipe not found:`, comp.id)
      return []
    }

    console.log(`  📖 [${MODULE_NAME}] Decomposing recipe with replacements:`, {
      name: recipe.name,
      components: recipe.components.length,
      replacementsCount: replacements.size
    })

    const results: KitchenDecomposedItem[] = []

    // Iterate through recipe components and check for replacements
    for (const recipeComp of recipe.components) {
      const replacementKey = `${recipe.id}_${recipeComp.id}`
      const replacement = replacements.get(replacementKey)

      if (replacement && replacement.composition && replacement.composition.length > 0) {
        // ✨ REPLACEMENT: Use replacement composition instead of original component
        console.log(`    🔄 [${MODULE_NAME}] Replacing component:`, {
          original: recipeComp.name || recipeComp.componentId,
          replacement: replacement.optionName,
          compositionCount: replacement.composition.length
        })

        for (const replComp of replacement.composition) {
          const items = await decomposeComposition(
            replComp,
            comp.quantity * quantity,
            [...path, recipe.name, `→${replacement.optionName}`],
            source,
            modifierName
          )
          results.push(...items)
        }
      } else {
        // No replacement - use original component
        const menuComp: MenuComposition = {
          type: recipeComp.componentType,
          id: recipeComp.componentId,
          quantity: recipeComp.quantity,
          unit: recipeComp.unit
        }

        const items = await decomposeComposition(
          menuComp,
          comp.quantity * quantity,
          [...path, recipe.name],
          source,
          modifierName
        )
        results.push(...items)
      }
    }

    return results
  }

  /**
   * Recursive composition resolver
   * Рекурсивно разворачивает компонент композиции
   */
  async function decomposeComposition(
    comp: MenuComposition,
    quantity: number,
    path: string[],
    source: 'base' | 'modifier',
    modifierName?: string
  ): Promise<KitchenDecomposedItem[]> {
    console.log(`  🔄 [${MODULE_NAME}] Decomposing composition:`, {
      type: comp.type,
      id: comp.id,
      quantity: comp.quantity,
      multiplier: quantity,
      source
    })

    // БАЗОВЫЙ СЛУЧАЙ: Product (конечный продукт)
    if (comp.type === 'product') {
      return await decomposeProduct(comp, quantity, path, source, modifierName)
    }

    // РЕКУРСИЯ: Recipe
    if (comp.type === 'recipe') {
      return await decomposeRecipe(comp, quantity, path, source, modifierName)
    }

    // РЕКУРСИЯ: Preparation
    if (comp.type === 'preparation') {
      return await decomposePreparation(comp, quantity, path, source, modifierName)
    }

    console.warn(`⚠️ [${MODULE_NAME}] Unknown composition type:`, comp.type)
    return []
  }

  /**
   * Decompose Product (базовый случай)
   */
  async function decomposeProduct(
    comp: MenuComposition,
    quantity: number,
    path: string[],
    source: 'base' | 'modifier',
    modifierName?: string
  ): Promise<KitchenDecomposedItem[]> {
    const product = productsStore.products.find(p => p.id === comp.id)
    if (!product) {
      console.error(`❌ [${MODULE_NAME}] Product not found:`, comp.id)
      return []
    }

    const totalQuantity = comp.quantity * quantity
    const totalCost = totalQuantity * product.baseCostPerUnit

    console.log(`  ✅ [${MODULE_NAME}] Product decomposed:`, {
      name: product.name,
      quantity: totalQuantity,
      unit: comp.unit,
      cost: totalCost,
      source,
      role: comp.role
    })

    return [
      {
        productId: comp.id,
        productName: product.name,
        quantity: totalQuantity,
        unit: comp.unit,
        costPerUnit: product.baseCostPerUnit,
        totalCost,
        source,
        modifierName,
        role: comp.role,
        path: [...path, product.name]
      }
    ]
  }

  /**
   * Decompose Recipe (рекурсия)
   */
  async function decomposeRecipe(
    comp: MenuComposition,
    quantity: number,
    path: string[],
    source: 'base' | 'modifier',
    modifierName?: string
  ): Promise<KitchenDecomposedItem[]> {
    const recipe = recipesStore.recipes.find(r => r.id === comp.id)
    if (!recipe) {
      console.error(`❌ [${MODULE_NAME}] Recipe not found:`, comp.id)
      return []
    }

    console.log(`  📖 [${MODULE_NAME}] Decomposing recipe:`, {
      name: recipe.name,
      components: recipe.components.length
    })

    const results: KitchenDecomposedItem[] = []

    // Рекурсивно разворачиваем каждый компонент рецепта
    for (const recipeComp of recipe.components) {
      // Convert RecipeComponent to MenuComposition format
      const menuComp: MenuComposition = {
        type: recipeComp.componentType,
        id: recipeComp.componentId,
        quantity: recipeComp.quantity,
        unit: recipeComp.unit
      }

      const items = await decomposeComposition(
        menuComp,
        comp.quantity * quantity,
        [...path, recipe.name],
        source,
        modifierName
      )
      results.push(...items)
    }

    return results
  }

  /**
   * Decompose Preparation (рекурсия)
   */
  async function decomposePreparation(
    comp: MenuComposition,
    quantity: number,
    path: string[],
    source: 'base' | 'modifier',
    modifierName?: string
  ): Promise<KitchenDecomposedItem[]> {
    const preparation = recipesStore.preparations.find(p => p.id === comp.id)
    if (!preparation) {
      console.error(`❌ [${MODULE_NAME}] Preparation not found:`, comp.id)
      return []
    }

    console.log(`  🧪 [${MODULE_NAME}] Decomposing preparation:`, {
      name: preparation.name,
      ingredients: preparation.recipe.length
    })

    const results: KitchenDecomposedItem[] = []

    // Рекурсивно разворачиваем каждый ингредиент полуфабриката
    for (const prepIngredient of preparation.recipe) {
      // Convert PreparationIngredient to MenuComposition format
      const menuComp: MenuComposition = {
        type: prepIngredient.type, // always 'product'
        id: prepIngredient.id,
        quantity: prepIngredient.quantity,
        unit: prepIngredient.unit
      }

      const items = await decomposeComposition(
        menuComp,
        comp.quantity * quantity,
        [...path, preparation.name],
        source,
        modifierName
      )
      results.push(...items)
    }

    return results
  }

  /**
   * Merge duplicate products
   * Группирует дубликаты продуктов и суммирует количества
   * ВАЖНО: Сохраняет информацию о source (base vs modifier)
   */
  function mergeDecomposedItems(items: KitchenDecomposedItem[]): KitchenDecomposedItem[] {
    console.log(`  🔀 [${MODULE_NAME}] Merging ${items.length} items...`)

    const grouped = new Map<string, KitchenDecomposedItem>()

    for (const item of items) {
      // Key: productId + unit + source (чтобы base и modifier не смешивались)
      const key = `${item.productId}_${item.unit}_${item.source}`

      if (grouped.has(key)) {
        const existing = grouped.get(key)!
        existing.quantity += item.quantity
        existing.totalCost += item.totalCost
        // Merge paths (for debugging)
        existing.path = [...new Set([...existing.path, ...item.path])]
      } else {
        grouped.set(key, { ...item })
      }
    }

    const merged = Array.from(grouped.values())

    console.log(`  ✅ [${MODULE_NAME}] Merged to ${merged.length} unique products`)

    return merged
  }

  /**
   * Calculate total cost from decomposed items
   */
  function calculateTotalCost(items: KitchenDecomposedItem[]): number {
    return items.reduce((sum, item) => sum + item.totalCost, 0)
  }

  /**
   * Get product names from decomposed items
   */
  function getProductNames(items: KitchenDecomposedItem[]): string[] {
    return items.map(item => item.productName)
  }

  /**
   * Group by source (base vs modifiers)
   */
  function groupBySource(items: KitchenDecomposedItem[]): {
    base: KitchenDecomposedItem[]
    modifiers: KitchenDecomposedItem[]
  } {
    return {
      base: items.filter(item => item.source === 'base'),
      modifiers: items.filter(item => item.source === 'modifier')
    }
  }

  return {
    decomposeBillItem,
    decomposeComposition,
    mergeDecomposedItems,
    calculateTotalCost,
    getProductNames,
    groupBySource
  }
}
