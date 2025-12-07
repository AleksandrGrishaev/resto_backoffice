// src/stores/productsStore/composables/useProductUsage.ts

import { ref, computed } from 'vue'
import type { ProductUsage } from '../types'
import type {
  ProductUsageInPreparation,
  ProductUsageInRecipe,
  Preparation,
  Recipe
} from '@/stores/recipes/types'
import type { MenuItem } from '@/stores/menu/types'
import { useRecipesStore } from '@/stores/recipes'
import { useMenuStore } from '@/stores/menu'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'ProductUsage'

/**
 * UsageLocation for archive check
 */
export interface UsageLocation {
  type: 'preparation' | 'recipe' | 'menu'
  id: string
  name: string
  code?: string
  details?: string
  quantity?: number
  unit?: string
  isActive: boolean
}

export interface UsageCheckResult {
  canArchive: boolean
  usageLocations: UsageLocation[]
}

export function useProductUsage() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Get product usage in preparations
   * Iterates all preparations and finds where product is used as ingredient
   */
  function getProductUsageInPreparations(productId: string): ProductUsageInPreparation[] {
    const recipesStore = useRecipesStore()
    const preparations = recipesStore.preparations as Preparation[]
    const usageList: ProductUsageInPreparation[] = []

    for (const prep of preparations) {
      if (!prep.recipe) continue

      for (const ingredient of prep.recipe) {
        if (ingredient.type === 'product' && ingredient.id === productId) {
          usageList.push({
            preparationId: prep.id,
            preparationName: prep.name,
            preparationCode: prep.code,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes,
            isActive: prep.isActive
          })
          break // Found in this preparation, move to next
        }
      }
    }

    DebugUtils.info(MODULE_NAME, '🔍 Product usage in preparations', {
      productId,
      count: usageList.length
    })

    return usageList
  }

  /**
   * Get product usage in recipes
   * Iterates all recipes and finds where product is used as component
   */
  function getProductUsageInRecipes(productId: string): ProductUsageInRecipe[] {
    const recipesStore = useRecipesStore()
    const recipes = recipesStore.recipes as Recipe[]
    const usageList: ProductUsageInRecipe[] = []

    for (const recipe of recipes) {
      if (!recipe.components) continue

      for (const component of recipe.components) {
        if (component.componentType === 'product' && component.componentId === productId) {
          usageList.push({
            recipeId: recipe.id,
            recipeName: recipe.name,
            recipeCode: recipe.code,
            quantity: component.quantity,
            unit: component.unit,
            notes: component.notes,
            isActive: recipe.isActive
          })
          break // Found in this recipe, move to next
        }
      }
    }

    DebugUtils.info(MODULE_NAME, '🔍 Product usage in recipes', {
      productId,
      count: usageList.length
    })

    return usageList
  }

  /**
   * Get product usage in menu items (direct composition)
   * Iterates all menu items and finds where product is used directly in composition
   */
  function getProductUsageInMenu(productId: string): ProductUsage['directMenuItems'] {
    const menuStore = useMenuStore()
    const menuItems = menuStore.menuItems as MenuItem[]
    const usageList: ProductUsage['directMenuItems'] = []

    for (const menuItem of menuItems) {
      // Check variants
      for (const variant of menuItem.variants) {
        if (!variant.composition) continue

        const usedInVariant = variant.composition.some(
          comp => comp.type === 'product' && comp.id === productId
        )

        if (usedInVariant) {
          const comp = variant.composition.find(c => c.type === 'product' && c.id === productId)
          usageList.push({
            menuItemId: menuItem.id,
            menuItemName: menuItem.name,
            variantId: variant.id,
            variantName: variant.name,
            quantityPerItem: comp?.quantity || 1,
            isActive: menuItem.isActive && variant.isActive
          })
        }
      }

      // Check modifiers
      if (menuItem.modifierGroups) {
        for (const group of menuItem.modifierGroups) {
          for (const option of group.options) {
            if (!option.composition) continue

            const usedInModifier = option.composition.some(
              comp => comp.type === 'product' && comp.id === productId
            )

            if (usedInModifier) {
              const comp = option.composition.find(c => c.type === 'product' && c.id === productId)
              usageList.push({
                menuItemId: menuItem.id,
                menuItemName: menuItem.name,
                variantId: option.id,
                variantName: `Modifier: ${group.name} - ${option.name}`,
                quantityPerItem: comp?.quantity || 1,
                isActive: menuItem.isActive && option.isActive !== false
              })
            }
          }
        }
      }
    }

    DebugUtils.info(MODULE_NAME, '🔍 Product usage in menu', {
      productId,
      count: usageList.length
    })

    return usageList
  }

  /**
   * Check if product can be archived
   * Returns canArchive=true only if product is NOT used in any ACTIVE preparations/recipes/menu
   */
  function checkProductCanArchive(productId: string): UsageCheckResult {
    const usageLocations: UsageLocation[] = []

    // Check preparations (only active)
    const prepUsage = getProductUsageInPreparations(productId)
    for (const prep of prepUsage) {
      if (prep.isActive) {
        usageLocations.push({
          type: 'preparation',
          id: prep.preparationId,
          name: prep.preparationName,
          code: prep.preparationCode,
          quantity: prep.quantity,
          unit: prep.unit,
          isActive: true
        })
      }
    }

    // Check recipes (only active)
    const recipeUsage = getProductUsageInRecipes(productId)
    for (const recipe of recipeUsage) {
      if (recipe.isActive) {
        usageLocations.push({
          type: 'recipe',
          id: recipe.recipeId,
          name: recipe.recipeName,
          code: recipe.recipeCode,
          quantity: recipe.quantity,
          unit: recipe.unit,
          isActive: true
        })
      }
    }

    // Check menu items (only active)
    const menuUsage = getProductUsageInMenu(productId)
    for (const item of menuUsage) {
      if (item.isActive) {
        usageLocations.push({
          type: 'menu',
          id: item.menuItemId,
          name: item.menuItemName,
          details: `Variant: ${item.variantName}`,
          quantity: item.quantityPerItem,
          isActive: true
        })
      }
    }

    const result: UsageCheckResult = {
      canArchive: usageLocations.length === 0,
      usageLocations
    }

    DebugUtils.info(MODULE_NAME, '🔒 Product archive check', {
      productId,
      canArchive: result.canArchive,
      activeUsageCount: usageLocations.length
    })

    return result
  }

  /**
   * Get complete usage info for product (for UsageTrackingWidget)
   */
  const getProductUsage = async (productId: string): Promise<ProductUsage> => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '🔍 Getting product usage', { productId })

      // Get real usage from stores
      const prepUsage = getProductUsageInPreparations(productId)
      const recipeUsage = getProductUsageInRecipes(productId)
      const menuUsage = getProductUsageInMenu(productId)

      const usage: ProductUsage = {
        id: `usage-${productId}`,
        productId,
        usedInRecipes: recipeUsage.map(r => ({
          recipeId: r.recipeId,
          recipeName: r.recipeName,
          quantityPerPortion: r.quantity,
          isActive: r.isActive
        })),
        usedInPreparations: prepUsage.map(p => ({
          preparationId: p.preparationId,
          preparationName: p.preparationName,
          quantityPerOutput: p.quantity,
          isActive: p.isActive
        })),
        directMenuItems: menuUsage,
        lastUpdated: TimeUtils.getCurrentLocalISO(),
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      DebugUtils.info(MODULE_NAME, '✅ Product usage retrieved', {
        productId,
        recipesCount: usage.usedInRecipes.length,
        preparationsCount: usage.usedInPreparations.length,
        menuItemsCount: usage.directMenuItems?.length || 0
      })

      return usage
    } catch (err) {
      DebugUtils.error(MODULE_NAME, '❌ Error getting product usage', { error: err, productId })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if product can be safely deactivated
   * @deprecated Use checkProductCanArchive instead
   */
  const checkCanDeactivate = async (
    productId: string
  ): Promise<{
    canDeactivate: boolean
    blockers: Array<{
      type: 'recipe' | 'preparation' | 'menu_item'
      id: string
      name: string
      isActive: boolean
    }>
    warnings: string[]
  }> => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '🔒 Checking deactivation safety', { productId })

      const result = checkProductCanArchive(productId)

      const blockers = result.usageLocations.map(loc => ({
        type: loc.type === 'menu' ? ('menu_item' as const) : loc.type,
        id: loc.id,
        name: loc.details ? `${loc.name} - ${loc.details}` : loc.name,
        isActive: loc.isActive
      }))

      const warnings: string[] = []
      if (!result.canArchive) {
        warnings.push(`Product is used in ${blockers.length} active items`)

        const recipeCount = blockers.filter(b => b.type === 'recipe').length
        const prepCount = blockers.filter(b => b.type === 'preparation').length
        const menuCount = blockers.filter(b => b.type === 'menu_item').length

        if (recipeCount > 0) warnings.push(`${recipeCount} active recipes`)
        if (prepCount > 0) warnings.push(`${prepCount} active preparations`)
        if (menuCount > 0) warnings.push(`${menuCount} active menu items`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Deactivation check completed', {
        productId,
        canDeactivate: result.canArchive,
        blockersCount: blockers.length
      })

      return {
        canDeactivate: result.canArchive,
        blockers,
        warnings
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, '❌ Error checking deactivation safety', {
        error: err,
        productId
      })
      return {
        canDeactivate: false,
        blockers: [],
        warnings: ['Error checking dependencies']
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Get usage summary for multiple products
   */
  const getBulkUsageSummary = async (
    productIds: string[]
  ): Promise<
    Record<
      string,
      {
        totalUsage: number
        recipeCount: number
        preparationCount: number
        menuItemCount: number
        hasActiveDependencies: boolean
      }
    >
  > => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '📊 Getting bulk usage summary', {
        productCount: productIds.length
      })

      const results: Record<string, any> = {}

      for (const productId of productIds) {
        const prepUsage = getProductUsageInPreparations(productId)
        const recipeUsage = getProductUsageInRecipes(productId)
        const menuUsage = getProductUsageInMenu(productId)

        const recipeCount = recipeUsage.length
        const preparationCount = prepUsage.length
        const menuItemCount = menuUsage.length
        const totalUsage = recipeCount + preparationCount + menuItemCount

        const hasActiveDependencies =
          recipeUsage.some(r => r.isActive) ||
          prepUsage.some(p => p.isActive) ||
          menuUsage.some(m => m.isActive)

        results[productId] = {
          totalUsage,
          recipeCount,
          preparationCount,
          menuItemCount,
          hasActiveDependencies
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Bulk usage summary completed', {
        processed: Object.keys(results).length,
        withDependencies: Object.values(results).filter((s: any) => s.hasActiveDependencies).length
      })

      return results
    } catch (err) {
      DebugUtils.error(MODULE_NAME, '❌ Error getting bulk usage summary', { error: err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // 🆕 Get usage statistics for reporting
  const getUsageStatistics = (usageData: ProductUsage[]) => {
    const stats = {
      totalProducts: usageData.length,
      usedInRecipes: 0,
      usedInPreparations: 0,
      usedInMenu: 0,
      notUsed: 0,
      averageUsagePerProduct: 0,
      mostUsedProduct: null as ProductUsage | null,
      unusedProducts: [] as string[]
    }

    let totalUsageCount = 0

    usageData.forEach(usage => {
      const recipeCount = usage.usedInRecipes.length
      const prepCount = usage.usedInPreparations.length
      const menuCount = usage.directMenuItems?.length || 0
      const productTotalUsage = recipeCount + prepCount + menuCount

      totalUsageCount += productTotalUsage

      if (recipeCount > 0) stats.usedInRecipes++
      if (prepCount > 0) stats.usedInPreparations++
      if (menuCount > 0) stats.usedInMenu++
      if (productTotalUsage === 0) {
        stats.notUsed++
        stats.unusedProducts.push(usage.productId)
      }

      // Track most used product
      if (
        !stats.mostUsedProduct ||
        productTotalUsage >
          stats.mostUsedProduct.usedInRecipes.length +
            stats.mostUsedProduct.usedInPreparations.length +
            (stats.mostUsedProduct.directMenuItems?.length || 0)
      ) {
        stats.mostUsedProduct = usage
      }
    })

    stats.averageUsagePerProduct =
      usageData.length > 0 ? Math.round((totalUsageCount / usageData.length) * 10) / 10 : 0

    return stats
  }

  // 🆕 Find products with similar usage patterns
  const findSimilarUsagePatterns = (
    targetProductId: string,
    allUsageData: ProductUsage[]
  ): Array<{
    productId: string
    similarity: number
    sharedRecipes: string[]
    sharedPreparations: string[]
  }> => {
    const targetUsage = allUsageData.find(u => u.productId === targetProductId)
    if (!targetUsage) return []

    const targetRecipes = new Set(targetUsage.usedInRecipes.map(r => r.recipeName))
    const targetPreps = new Set(targetUsage.usedInPreparations.map(p => p.preparationName))

    return allUsageData
      .filter(usage => usage.productId !== targetProductId)
      .map(usage => {
        const usageRecipes = new Set(usage.usedInRecipes.map(r => r.recipeName))
        const usagePreps = new Set(usage.usedInPreparations.map(p => p.preparationName))

        // Calculate similarity based on shared recipes and preparations
        const sharedRecipes = Array.from(targetRecipes).filter(r => usageRecipes.has(r))
        const sharedPreparations = Array.from(targetPreps).filter(p => usagePreps.has(p))

        const totalShared = sharedRecipes.length + sharedPreparations.length
        const totalUnique = Math.max(
          targetRecipes.size + targetPreps.size,
          usageRecipes.size + usagePreps.size
        )

        const similarity = totalUnique > 0 ? (totalShared / totalUnique) * 100 : 0

        return {
          productId: usage.productId,
          similarity: Math.round(similarity * 10) / 10,
          sharedRecipes,
          sharedPreparations
        }
      })
      .filter(result => result.similarity > 0)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5) // Top 5 similar products
  }

  // Computed properties
  const isLoading = computed(() => loading.value)
  const hasError = computed(() => !!error.value)

  return {
    // State
    loading: isLoading,
    error: computed(() => error.value),

    // Core functions (real store queries)
    getProductUsageInPreparations,
    getProductUsageInRecipes,
    getProductUsageInMenu,
    checkProductCanArchive,

    // Legacy API (for backwards compatibility)
    getProductUsage,
    checkCanDeactivate,
    getBulkUsageSummary,

    // Analysis functions
    getUsageStatistics,
    findSimilarUsagePatterns
  }
}
