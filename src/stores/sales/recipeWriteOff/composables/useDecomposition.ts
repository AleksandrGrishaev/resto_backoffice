import type { DecomposedItem } from '../../types'
import type { MenuComposition } from '@/stores/menu/types'
import { useMenuStore } from '@/stores/menu/menuStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import { useProductsStore } from '@/stores/productsStore'

const MODULE_NAME = 'DecompositionEngine'

/**
 * useDecomposition
 * Рекурсивная декомпозиция позиций меню до конечных продуктов
 */
export function useDecomposition() {
  const menuStore = useMenuStore()
  const recipesStore = useRecipesStore()
  const productsStore = useProductsStore()

  /**
   * Проверка инициализации необходимых stores
   */
  function checkStoresInitialized(): void {
    if (!recipesStore.initialized) {
      throw new Error(
        '❌ RecipesStore is not initialized! Decomposition requires recipes and preparations data. ' +
          'Ensure appInitializer loads recipesStore before processing payments.'
      )
    }

    if (!productsStore.products || productsStore.products.length === 0) {
      throw new Error(
        '❌ ProductsStore has no data! Decomposition requires products catalog. ' +
          'Ensure appInitializer loads productsStore before processing payments.'
      )
    }

    console.log('✅ [DecompositionEngine] Stores initialized check passed', {
      recipesInitialized: recipesStore.initialized,
      recipesCount: recipesStore.recipes?.length || 0,
      preparationsCount: recipesStore.preparations?.length || 0,
      productsCount: productsStore.products.length
    })
  }

  /**
   * Main decomposition method
   * Разворачивает позицию меню до конечных продуктов
   */
  async function decomposeMenuItem(
    menuItemId: string,
    variantId: string,
    soldQuantity: number
  ): Promise<DecomposedItem[]> {
    // 🆕 Проверка инициализации stores перед декомпозицией
    checkStoresInitialized()

    console.log(`🔍 [${MODULE_NAME}] Decomposing menu item:`, {
      menuItemId,
      variantId,
      soldQuantity
    })

    try {
      // 1. Get menu item
      const menuItem = menuStore.menuItems.find(item => item.id === menuItemId)
      if (!menuItem) {
        console.error(`❌ [${MODULE_NAME}] Menu item not found: ${menuItemId}`)
        return []
      }

      // 2. Get variant
      const variant = menuItem.variants.find((v: any) => v.id === variantId)
      if (!variant) {
        console.error(`❌ [${MODULE_NAME}] Variant not found: ${variantId}`)
        return []
      }

      console.log(`📋 [${MODULE_NAME}] Found variant:`, {
        name: `${menuItem.name} - ${variant.name}`,
        compositionCount: variant.composition.length
      })

      // 3. Process composition
      const results: DecomposedItem[] = []

      for (const comp of variant.composition) {
        const items = await decomposeComposition(comp, soldQuantity, [menuItem.name, variant.name])
        results.push(...items)
      }

      // 4. Merge duplicates
      const merged = mergeDecomposedItems(results)

      console.log(`✅ [${MODULE_NAME}] Decomposition complete:`, {
        totalProducts: merged.length,
        totalCost: merged.reduce((sum: number, item: DecomposedItem) => sum + item.totalCost, 0)
      })

      return merged
    } catch (error) {
      console.error(`❌ [${MODULE_NAME}] Decomposition failed:`, error)
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
    path: string[]
  ): Promise<DecomposedItem[]> {
    console.log(`  🔄 [${MODULE_NAME}] Decomposing composition:`, {
      type: comp.type,
      id: comp.id,
      quantity: comp.quantity,
      multiplier: quantity
    })

    // БАЗОВЫЙ СЛУЧАЙ: Product (конечный продукт)
    if (comp.type === 'product') {
      return await decomposeProduct(comp, quantity, path)
    }

    // РЕКУРСИЯ: Recipe
    if (comp.type === 'recipe') {
      return await decomposeRecipe(comp, quantity, path)
    }

    // РЕКУРСИЯ: Preparation
    if (comp.type === 'preparation') {
      return await decomposePreparation(comp, quantity, path)
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
    path: string[]
  ): Promise<DecomposedItem[]> {
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
      cost: totalCost
    })

    return [
      {
        type: 'product', // ✅ SPRINT 1: Added type discriminator
        productId: comp.id,
        productName: product.name,
        quantity: totalQuantity,
        unit: comp.unit,
        costPerUnit: product.baseCostPerUnit,
        totalCost,
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
    path: string[]
  ): Promise<DecomposedItem[]> {
    const recipe = recipesStore.recipes.find(r => r.id === comp.id)
    if (!recipe) {
      console.error(`❌ [${MODULE_NAME}] Recipe not found:`, comp.id)
      return []
    }

    console.log(`  📖 [${MODULE_NAME}] Decomposing recipe:`, {
      name: recipe.name,
      components: recipe.components.length
    })

    const results: DecomposedItem[] = []

    // Рекурсивно разворачиваем каждый компонент рецепта
    for (const recipeComp of recipe.components) {
      // Convert RecipeComponent to MenuComposition format
      const menuComp: MenuComposition = {
        type: recipeComp.componentType,
        id: recipeComp.componentId,
        quantity: recipeComp.quantity,
        unit: recipeComp.unit
      }

      // FIX: Don't multiply by comp.quantity here - it's already in menuComp.quantity
      // quantity = soldQuantity (number of portions sold)
      const items = await decomposeComposition(menuComp, quantity, [...path, recipe.name])
      results.push(...items)
    }

    return results
  }

  /**
   * Decompose Preparation
   * ✅ SPRINT 1: STOP! Don't decompose to products - return preparation as final element
   * This prevents double write-off (products already written off during preparation production)
   */
  async function decomposePreparation(
    comp: MenuComposition,
    quantity: number,
    path: string[]
  ): Promise<DecomposedItem[]> {
    const preparation = recipesStore.preparations.find(p => p.id === comp.id)
    if (!preparation) {
      console.error(`❌ [${MODULE_NAME}] Preparation not found:`, comp.id)
      return []
    }

    const totalQuantity = comp.quantity * quantity

    console.log(`  ✅ [${MODULE_NAME}] Preparation as final element (no decomposition):`, {
      name: preparation.name,
      quantity: totalQuantity,
      unit: preparation.outputUnit,
      note: 'Cost will be calculated from FIFO batches in Sprint 2'
    })

    // ✅ Return preparation as final element (NOT decomposed to products!)
    return [
      {
        type: 'preparation', // ✅ Type: preparation (not product!)
        preparationId: comp.id,
        preparationName: preparation.name,
        quantity: totalQuantity,
        unit: preparation.outputUnit,
        costPerUnit: null, // ✅ null until Sprint 2 (FIFO calculation)
        totalCost: 0, // ✅ Will be calculated from FIFO batches in Sprint 2
        path: [...path, preparation.name]
      }
    ]
  }

  /**
   * Merge duplicate items (products AND preparations)
   * ✅ SPRINT 1: Updated to handle both products and preparations
   * Группирует дубликаты и суммирует количества
   */
  function mergeDecomposedItems(items: DecomposedItem[]): DecomposedItem[] {
    console.log(`  🔀 [${MODULE_NAME}] Merging ${items.length} items...`)

    const grouped = new Map<string, DecomposedItem>()

    for (const item of items) {
      // ✅ Key: type + id + unit (чтобы products и preparations не смешивались)
      const id = item.type === 'product' ? item.productId : item.preparationId
      const key = `${item.type}_${id}_${item.unit}`

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

    const productCount = merged.filter(item => item.type === 'product').length
    const preparationCount = merged.filter(item => item.type === 'preparation').length

    console.log(`  ✅ [${MODULE_NAME}] Merged to ${merged.length} unique items`, {
      products: productCount,
      preparations: preparationCount
    })

    return merged
  }

  /**
   * Calculate total cost from decomposed items
   */
  function calculateTotalCost(items: DecomposedItem[]): number {
    return items.reduce((sum, item) => sum + item.totalCost, 0)
  }

  /**
   * Get item names from decomposed items (products + preparations)
   * ✅ SPRINT 1: Updated to handle both products and preparations
   */
  function getProductNames(items: DecomposedItem[]): string[] {
    return items.map(item => {
      if (item.type === 'product') {
        return item.productName || 'Unknown Product'
      } else {
        return item.preparationName || 'Unknown Preparation'
      }
    })
  }

  return {
    decomposeMenuItem,
    decomposeComposition,
    mergeDecomposedItems,
    calculateTotalCost,
    getProductNames
  }
}
