// src/stores/recipes/composables/useRecipeIntegration.ts - Integration with Product Store

import { DebugUtils } from '@/utils'
import type {
  ProductForRecipe,
  PreparationPlanCost,
  GetProductCallback,
  NotifyUsageChangeCallback
} from '../types'

const MODULE_NAME = 'useRecipeIntegration'

// =============================================
// STATE
// =============================================

// Integration callbacks
let getProductCallback: GetProductCallback | null = null
let notifyUsageChangeCallback: NotifyUsageChangeCallback | null = null

// =============================================
// MAIN COMPOSABLE
// =============================================

export function useRecipeIntegration() {
  // =============================================
  // SETUP INTEGRATION
  // =============================================

  /**
   * Настраивает интеграцию с Product Store
   */
  async function setupProductStoreIntegration(): Promise<void> {
    try {
      // Получаем ProductStore через динамический импорт
      const { useProductsStore } = await import('@/stores/productsStore')
      const productStore = useProductsStore()

      // Устанавливаем callback для получения продуктов
      getProductCallback = async (productId: string) => {
        return productStore.getProductForRecipe(productId)
      }

      // Устанавливаем callback для уведомлений об изменении usage
      notifyUsageChangeCallback = async (productId: string, usageData: any) => {
        productStore.updateProductUsage(productId, usageData)
      }

      // Устанавливаем global callback для уведомлений об изменении цен
      window.__RECIPE_STORE_PRICE_CHANGE_CALLBACK__ = async (productId: string) => {
        await handleProductPriceChange(productId)
      }

      DebugUtils.info(MODULE_NAME, '🔗 Product Store integration setup complete')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to setup Product Store integration', { error })
      throw error
    }
  }

  // =============================================
  // PRODUCT INTEGRATION
  // =============================================

  /**
   * Получает продукт для использования в рецептах
   */
  async function getProductForRecipe(productId: string): Promise<ProductForRecipe | null> {
    if (!getProductCallback) {
      DebugUtils.warn(MODULE_NAME, 'Product callback not set')
      return null
    }

    try {
      return await getProductCallback(productId)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to get product ${productId}`, { error })
      return null
    }
  }

  /**
   * Получает стоимость полуфабриката
   */
  async function getPreparationCost(preparationId: string): Promise<PreparationPlanCost | null> {
    try {
      // Получаем из cost calculation composable
      const { getPreparationCost } = await import('./useCostCalculation')
      return getPreparationCost(preparationId)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Failed to get preparation cost ${preparationId}`, { error })
      return null
    }
  }

  // =============================================
  // PRICE CHANGE HANDLING
  // =============================================

  /**
   * Обрабатывает изменение цены продукта
   */
  async function handleProductPriceChange(productId: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, `♻️ Handling price change for product: ${productId}`)

      // Пересчитываем полуфабрикаты
      const affectedPreparations = await recalculateOnPriceChange(productId, 'preparation')

      // Пересчитываем рецепты
      const affectedRecipes = await recalculateOnPriceChange(productId, 'recipe')

      // Обновляем usage данные в ProductStore
      await updateProductUsageInProductStore(productId)

      const total = affectedPreparations.length + affectedRecipes.length
      if (total > 0) {
        DebugUtils.info(
          MODULE_NAME,
          `✅ Recalculated ${total} items (${affectedPreparations.length} preparations, ${affectedRecipes.length} recipes)`
        )
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error handling product price change', { error, productId })
      throw error
    }
  }

  /**
   * Пересчитывает стоимости при изменении цены
   */
  async function recalculateOnPriceChange(
    itemId: string,
    itemType: 'product' | 'preparation'
  ): Promise<string[]> {
    try {
      if (itemType === 'preparation') {
        // Пересчитываем полуфабрикаты при изменении цены продукта
        const { usePreparations } = await import('./usePreparations')
        const { calculatePreparationCost } = await import('./useCostCalculation')

        const { getAllPreparations } = usePreparations()
        const preparations = getAllPreparations()
        const affected: string[] = []

        for (const preparation of preparations) {
          if (!preparation.isActive) continue

          // Проверяем, использует ли полуфабрикат этот продукт
          const usesProduct = preparation.recipe.some(ingredient => ingredient.id === itemId)
          if (!usesProduct) continue

          const result = await calculatePreparationCost(preparation)
          if (result.success) {
            affected.push(preparation.id)
          }
        }

        return affected
      } else {
        // Пересчитываем рецепты при изменении цены продукта или полуфабриката
        const { useRecipes } = await import('./useRecipes')
        const { calculateRecipeCost } = await import('./useCostCalculation')

        const { getAllRecipes } = useRecipes()
        const recipes = getAllRecipes()
        const affected: string[] = []

        for (const recipe of recipes) {
          if (!recipe.isActive) continue

          // Проверяем, использует ли рецепт этот item
          const usesItem = recipe.components.some(
            component => component.componentId === itemId && component.componentType === itemType
          )
          if (!usesItem) continue

          const result = await calculateRecipeCost(recipe)
          if (result.success) {
            affected.push(recipe.id)
          }
        }

        return affected
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, `Error recalculating on ${itemType} change`, { error, itemId })
      return []
    }
  }

  // =============================================
  // USAGE TRACKING
  // =============================================

  /**
   * Обновляет данные об использовании продукта в ProductStore
   */
  async function updateProductUsageInProductStore(productId: string): Promise<void> {
    if (!notifyUsageChangeCallback) {
      DebugUtils.warn(MODULE_NAME, 'Usage change callback not set')
      return
    }

    try {
      // Собираем данные об использовании в полуфабрикатах
      const { usePreparations } = await import('./usePreparations')
      const { getProductUsageInPreparations } = usePreparations()

      const preparationUsage = getProductUsageInPreparations(productId)

      // Собираем данные об использовании в рецептах
      const { useRecipes } = await import('./useRecipes')
      const { getProductUsageInRecipes } = useRecipes()

      const recipeUsage = getProductUsageInRecipes(productId)

      const usageData = {
        usedInPreparations: preparationUsage.map(usage => ({
          preparationId: usage.preparationId,
          preparationName: usage.preparationName,
          quantity: usage.quantity,
          unit: usage.unit
        })),
        usedInRecipes: recipeUsage.map(usage => ({
          recipeId: usage.recipeId,
          recipeName: usage.recipeName,
          quantity: usage.quantity,
          unit: usage.unit
        }))
      }

      await notifyUsageChangeCallback(productId, usageData)

      DebugUtils.debug(MODULE_NAME, `Updated usage for product ${productId}`, {
        preparations: usageData.usedInPreparations.length,
        recipes: usageData.usedInRecipes.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating product usage', { error, productId })
    }
  }

  /**
   * Обновляет usage при изменении рецепта/полуфабриката
   */
  async function updateUsageForAllProducts(): Promise<void> {
    try {
      // Получаем все продукты, используемые в рецептах и полуфабрикатах
      const { usePreparations } = await import('./usePreparations')
      const { useRecipes } = await import('./useRecipes')

      const { getAllPreparations } = usePreparations()
      const { getAllRecipes } = useRecipes()

      const preparations = getAllPreparations()
      const recipes = getAllRecipes()

      // Собираем уникальные ID продуктов
      const productIds = new Set<string>()

      preparations.forEach(prep => {
        prep.recipe.forEach(ingredient => productIds.add(ingredient.id))
      })

      recipes.forEach(recipe => {
        recipe.components.forEach(component => {
          if (component.componentType === 'product') {
            productIds.add(component.componentId)
          }
        })
      })

      // Обновляем usage для каждого продукта
      for (const productId of productIds) {
        await updateProductUsageInProductStore(productId)
      }

      DebugUtils.info(MODULE_NAME, `✅ Updated usage for ${productIds.size} products`)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating usage for all products', { error })
    }
  }

  /**
   * Обновляет usage только для конкретных продуктов (оптимизация)
   */
  async function updateUsageForProductIds(productIds: Set<string>): Promise<void> {
    try {
      for (const productId of productIds) {
        await updateProductUsageInProductStore(productId)
      }
      DebugUtils.info(MODULE_NAME, `✅ Updated usage for ${productIds.size} products (targeted)`)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating usage for products', { error })
    }
  }

  // =============================================
  // RETURN COMPOSABLE
  // =============================================

  return {
    // Setup
    setupProductStoreIntegration,

    // Product integration
    getProductForRecipe,
    getPreparationCost,

    // Price change handling
    handleProductPriceChange,
    recalculateOnPriceChange,

    // Usage tracking
    updateProductUsageInProductStore,
    updateUsageForAllProducts,
    updateUsageForProductIds
  }
}
