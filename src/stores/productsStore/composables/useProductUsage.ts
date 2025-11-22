// src/stores/productsStore/composables/useProductUsage.ts

import { ref, computed } from 'vue'
import type { ProductUsage } from '../types'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'ProductUsage'

export function useProductUsage() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 🆕 MAIN FUNCTION: Get complete usage info for product
  const getProductUsage = async (productId: string): Promise<ProductUsage> => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '🔍 Getting product usage', { productId })

      // 🔧 FUTURE: Query real stores
      // const recipes = await recipesStore.getRecipesUsingProduct(productId)
      // const preparations = await preparationsStore.getPreparationsUsingProduct(productId)
      // const menuItems = await menuStore.getMenuItemsUsingProduct(productId)

      // 🆕 FOR NOW: Generate realistic usage data
      const usage = await generateRealisticUsage(productId)

      DebugUtils.info(MODULE_NAME, '✅ Product usage retrieved', {
        productId,
        recipesCount: usage.usedInRecipes.length,
        preparationsCount: usage.usedInPreparations.length,
        menuItemsCount: usage.directMenuItems?.length || 0
      })

      return usage
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error getting product usage', { error, productId })
      throw error
    } finally {
      loading.value = false
    }
  }

  // 🆕 Generate realistic usage data with fallback logic
  const generateRealisticUsage = async (productId: string): Promise<ProductUsage> => {
    try {
      // 🔧 FUTURE: Get real usage data from Recipes, Preparations, and Menu stores
      // For now, return empty usage structure
      const usage: ProductUsage = {
        id: `usage-${productId}`,
        productId,
        usedInRecipes: [],
        usedInPreparations: [],
        directMenuItems: [],
        lastUpdated: TimeUtils.getCurrentLocalISO(),
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // In the future, this will query real stores:
      // - recipesStore.getRecipesUsingProduct(productId)
      // - preparationsStore.getPreparationsUsingProduct(productId)
      // - menuStore.getMenuItemsUsingProduct(productId)

      return usage
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error generating usage data', { error, productId })

      // Return empty usage structure
      return {
        id: `usage-${productId}-empty`,
        productId,
        usedInRecipes: [],
        usedInPreparations: [],
        directMenuItems: [],
        lastUpdated: TimeUtils.getCurrentLocalISO(),
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }
    }
  }

  // 🆕 Generate recipe usage for raw materials
  const generateRecipeUsage = (productDef: any): ProductUsage['usedInRecipes'] => {
    const recipesByCategory = {
      meat: [
        { name: 'Beef Steak Medium', quantity: 0.25 },
        { name: 'Beef Burger Patty', quantity: 0.15 },
        { name: 'Beef Stir Fry', quantity: 0.2 }
      ],
      vegetables: [
        { name: 'French Fries', quantity: 0.3 },
        { name: 'Mashed Potatoes', quantity: 0.25 },
        { name: 'Vegetable Salad', quantity: 0.1 },
        { name: 'Grilled Vegetables', quantity: 0.15 }
      ],
      dairy: [
        { name: 'Creamy Pasta Sauce', quantity: 0.05 },
        { name: 'Butter Garlic Bread', quantity: 0.02 },
        { name: 'Mashed Potatoes', quantity: 0.03 }
      ],
      spices: [
        { name: 'Seasoned Fries', quantity: 0.005 },
        { name: 'Grilled Meat', quantity: 0.003 },
        { name: 'Pasta Sauce', quantity: 0.002 }
      ],
      other: [
        { name: 'Salad Dressing', quantity: 0.01 },
        { name: 'Cooking Base', quantity: 0.02 }
      ]
    }

    const recipes = recipesByCategory[productDef.category] || recipesByCategory.other
    const selectedRecipes = recipes.slice(
      0,
      Math.min(recipes.length, Math.floor(Math.random() * 3) + 1)
    )

    return selectedRecipes.map((recipe, index) => ({
      recipeId: `recipe-${productDef.id}-${index}`,
      recipeName: recipe.name,
      quantityPerPortion: recipe.quantity,
      isActive: Math.random() > 0.1 // 90% active
    }))
  }

  // 🆕 Generate preparation usage for raw materials
  const generatePreparationUsage = (productDef: any): ProductUsage['usedInPreparations'] => {
    // Only some raw materials are used in preparations
    if (Math.random() > 0.4) return [] // 40% chance of being used in preparations

    const prepsByCategory = {
      meat: [{ name: 'Ground Meat Mix', quantity: 0.5 }],
      vegetables: [
        { name: 'Chopped Vegetables', quantity: 0.8 },
        { name: 'Vegetable Stock', quantity: 0.3 }
      ],
      dairy: [{ name: 'Cream Sauce Base', quantity: 0.2 }],
      spices: [{ name: 'Spice Blend', quantity: 0.1 }],
      other: [{ name: 'Base Preparation', quantity: 0.3 }]
    }

    const preps = prepsByCategory[productDef.category] || []
    if (preps.length === 0) return []

    const selectedPrep = preps[Math.floor(Math.random() * preps.length)]

    return [
      {
        preparationId: `prep-${productDef.id}`,
        preparationName: selectedPrep.name,
        quantityPerOutput: selectedPrep.quantity,
        isActive: Math.random() > 0.2 // 80% active
      }
    ]
  }

  // 🆕 Generate menu item usage for direct sale products
  const generateMenuItemUsage = (productDef: any): ProductUsage['directMenuItems'] => {
    const menuByCategory = {
      beverages: [
        { name: 'Cold Beer', variant: 'Small', quantity: 1 },
        { name: 'Cold Beer', variant: 'Large', quantity: 1 },
        { name: 'Happy Hour Special', variant: 'Standard', quantity: 1 }
      ],
      other: [
        { name: 'Ready Made Item', variant: 'Standard', quantity: 1 },
        { name: 'Special Offer', variant: 'Premium', quantity: 1 }
      ]
    }

    const items = menuByCategory[productDef.category] || menuByCategory.other
    const selectedItems = items.slice(0, Math.min(items.length, Math.floor(Math.random() * 2) + 1))

    return selectedItems.map((item, index) => ({
      menuItemId: `menu-${productDef.id}-${index}`,
      menuItemName: item.name,
      variantId: `variant-${index}`,
      variantName: item.variant,
      quantityPerItem: item.quantity,
      isActive: Math.random() > 0.05 // 95% active for menu items
    }))
  }

  // 🆕 Check if product can be safely deactivated
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

      const usage = await getProductUsage(productId)
      const blockers: Array<{
        type: 'recipe' | 'preparation' | 'menu_item'
        id: string
        name: string
        isActive: boolean
      }> = []

      // Check active recipes
      usage.usedInRecipes.forEach(recipe => {
        if (recipe.isActive) {
          blockers.push({
            type: 'recipe',
            id: recipe.recipeId,
            name: recipe.recipeName,
            isActive: true
          })
        }
      })

      // Check active preparations
      usage.usedInPreparations.forEach(prep => {
        if (prep.isActive) {
          blockers.push({
            type: 'preparation',
            id: prep.preparationId,
            name: prep.preparationName,
            isActive: true
          })
        }
      })

      // Check active menu items
      usage.directMenuItems?.forEach(item => {
        if (item.isActive) {
          blockers.push({
            type: 'menu_item',
            id: item.menuItemId,
            name: `${item.menuItemName} - ${item.variantName}`,
            isActive: true
          })
        }
      })

      const canDeactivate = blockers.length === 0
      const warnings: string[] = []

      if (!canDeactivate) {
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
        canDeactivate,
        blockersCount: blockers.length
      })

      return {
        canDeactivate,
        blockers,
        warnings
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error checking deactivation safety', { error, productId })
      return {
        canDeactivate: false,
        blockers: [],
        warnings: ['Error checking dependencies']
      }
    } finally {
      loading.value = false
    }
  }

  // 🆕 Get usage summary for multiple products
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

      // Process in batches
      const batchSize = 5
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize)

        const batchPromises = batch.map(async productId => {
          const usage = await generateRealisticUsage(productId)

          const recipeCount = usage.usedInRecipes.length
          const preparationCount = usage.usedInPreparations.length
          const menuItemCount = usage.directMenuItems?.length || 0
          const totalUsage = recipeCount + preparationCount + menuItemCount

          const hasActiveDependencies =
            usage.usedInRecipes.some(r => r.isActive) ||
            usage.usedInPreparations.some(p => p.isActive) ||
            usage.directMenuItems?.some(m => m.isActive) ||
            false

          return {
            productId,
            summary: {
              totalUsage,
              recipeCount,
              preparationCount,
              menuItemCount,
              hasActiveDependencies
            }
          }
        })

        const batchResults = await Promise.all(batchPromises)

        batchResults.forEach(({ productId, summary }) => {
          results[productId] = summary
        })

        // Small delay between batches
        if (i + batchSize < productIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Bulk usage summary completed', {
        processed: Object.keys(results).length,
        withDependencies: Object.values(results).filter((s: any) => s.hasActiveDependencies).length
      })

      return results
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error getting bulk usage summary', { error })
      throw error
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

    // Core functions
    getProductUsage,
    checkCanDeactivate,
    getBulkUsageSummary,

    // Analysis functions
    getUsageStatistics,
    findSimilarUsagePatterns,

    // Utilities
    generateRealisticUsage
  }
}
