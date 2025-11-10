// src/stores/pos/orders/composables/useKitchenDecomposition.ts
import type { PosBillItem } from '../../types'
import type { MenuComposition } from '@/stores/menu/types'
import { useMenuStore } from '@/stores/menu/menuStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import { useProductsStore } from '@/stores/productsStore'

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

      console.log(`📋 [${MODULE_NAME}] Found variant:`, {
        name: `${menuItem.name} - ${variant.name}`,
        baseCompositionCount: variant.composition.length,
        modifiersCount: billItem.selectedModifiers?.length || 0
      })

      const results: KitchenDecomposedItem[] = []

      // 2. Process base composition
      console.log(`  🍽️ [${MODULE_NAME}] Processing base composition...`)
      for (const comp of variant.composition) {
        const items = await decomposeComposition(
          comp,
          billItem.quantity,
          [menuItem.name, variant.name],
          'base'
        )
        results.push(...items)
      }

      // 3. Process modifiers
      if (billItem.selectedModifiers && billItem.selectedModifiers.length > 0) {
        console.log(
          `  ➕ [${MODULE_NAME}] Processing ${billItem.selectedModifiers.length} modifiers...`
        )

        for (const modifier of billItem.selectedModifiers) {
          if (!modifier.composition || modifier.composition.length === 0) {
            console.log(`  ⚠️ [${MODULE_NAME}] Modifier has no composition:`, modifier.optionName)
            continue
          }

          console.log(`    🔧 [${MODULE_NAME}] Processing modifier:`, modifier.optionName)

          for (const comp of modifier.composition) {
            const items = await decomposeComposition(
              comp,
              billItem.quantity,
              [menuItem.name, variant.name, modifier.optionName],
              'modifier',
              modifier.optionName
            )
            results.push(...items)
          }
        }
      }

      // 4. Merge duplicates
      const merged = mergeDecomposedItems(results)

      console.log(`✅ [${MODULE_NAME}] Kitchen decomposition complete:`, {
        totalProducts: merged.length,
        totalCost: merged.reduce((sum, item) => sum + item.totalCost, 0),
        baseProducts: merged.filter(i => i.source === 'base').length,
        modifierProducts: merged.filter(i => i.source === 'modifier').length
      })

      return merged
    } catch (error) {
      console.error(`❌ [${MODULE_NAME}] Kitchen decomposition failed:`, error)
      return []
    }
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
      source
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
