// src/stores/recipes/composables/useCostCalculation.ts - УПРОЩЕННАЯ версия без конвертации

import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import type {
  Preparation,
  Recipe,
  PreparationPlanCost,
  RecipePlanCost,
  ComponentPlanCost,
  CostCalculationResult,
  ProductForRecipe,
  GetProductCallback,
  GetPreparationCostCallback
} from '../types'

const MODULE_NAME = 'useCostCalculation'

// =============================================
// STATE
// =============================================

const preparationCosts = ref<Map<string, PreparationPlanCost>>(new Map())
const recipeCosts = ref<Map<string, RecipePlanCost>>(new Map())
const loading = ref(false)
const error = ref<string | null>(null)

let getProductCallback: GetProductCallback | null = null
let getPreparationCostCallback: GetPreparationCostCallback | null = null

// =============================================
// MAIN COMPOSABLE
// =============================================

export function useCostCalculation() {
  /**
   * Устанавливает callbacks для интеграции
   */
  function setIntegrationCallbacks(
    getProduct: GetProductCallback,
    getPreparationCost: GetPreparationCostCallback
  ): void {
    getProductCallback = getProduct
    getPreparationCostCallback = getPreparationCost
    DebugUtils.debug(MODULE_NAME, 'Integration callbacks configured')
  }

  /**
   * Инициализирует расчеты стоимости
   */
  async function initializeCostCalculations(): Promise<void> {
    try {
      loading.value = true
      error.value = null

      preparationCosts.value.clear()
      recipeCosts.value.clear()

      DebugUtils.debug(MODULE_NAME, 'Cost calculations initialized')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize cost calculations'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // =============================================
  // ✅ УПРОЩЕННЫЕ УТИЛИТЫ - НИКАКОЙ КОНВЕРТАЦИИ
  // =============================================

  /**
   * ✅ ПРЯМОЙ РАСЧЕТ: Все данные уже в базовых единицах после приемки
   */
  function calculateDirectCost(quantity: number, product: ProductForRecipe): number {
    return quantity * product.baseCostPerUnit
  }

  /**
   * ✅ УПРОЩЕНО: Получает базовую единицу продукта (только для справки)
   */
  function getBaseUnitForProduct(product: ProductForRecipe): string {
    return product.baseUnit || 'gram'
  }

  /**
   * ✅ УПРОЩЕНО: Получает базовую стоимость (должна быть заполнена)
   */
  function getBaseCostPerUnit(product: ProductForRecipe): number {
    return product.baseCostPerUnit || 0
  }

  // =============================================
  // ✅ УПРОЩЕННЫЙ РАСЧЕТ ПОЛУФАБРИКАТОВ
  // =============================================

  async function calculatePreparationCost(
    preparation: Preparation
  ): Promise<CostCalculationResult> {
    if (!getProductCallback) {
      return { success: false, error: 'Product provider not available' }
    }

    try {
      if (!preparation.recipe || preparation.recipe.length === 0) {
        return { success: false, error: 'Preparation has no recipe ingredients' }
      }

      let totalCost = 0
      const componentCosts: ComponentPlanCost[] = []
      const missingProducts: string[] = []
      const inactiveProducts: string[] = []
      const zeroCostProducts: string[] = []

      // ✅ ПРОСТОЙ РАСЧЕТ: Все уже в базовых единицах
      for (const ingredient of preparation.recipe) {
        const product = await getProductCallback(ingredient.id)

        if (!product) {
          missingProducts.push(ingredient.id)
          continue
        }

        if (!product.isActive) {
          inactiveProducts.push(product.name)
          continue
        }

        if (product.baseCostPerUnit === 0) {
          zeroCostProducts.push(product.name)
          continue
        }

        // ✅ ПРЯМОЙ РАСЧЕТ: количество уже в базовых единицах
        const ingredientTotalCost = calculateDirectCost(ingredient.quantity, product)
        totalCost += ingredientTotalCost

        componentCosts.push({
          componentId: ingredient.id,
          componentType: 'product',
          componentName: product.name,
          quantity: ingredient.quantity,
          unit: product.baseUnit, // ✅ Всегда базовая единица
          planUnitCost: product.baseCostPerUnit,
          totalPlanCost: ingredientTotalCost,
          percentage: 0
        })
      }

      // ✅ ТОЛЬКО КРИТИЧНЫЕ ПРЕДУПРЕЖДЕНИЯ
      if (missingProducts.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Missing products in ${preparation.name}:`, missingProducts)
        return { success: false, error: `Missing products: ${missingProducts.join(', ')}` }
      }

      if (totalCost === 0) {
        return {
          success: false,
          error: 'Total cost is zero - check product prices'
        }
      }

      // Рассчитываем проценты
      componentCosts.forEach(component => {
        component.percentage = (component.totalPlanCost / totalCost) * 100
      })

      const costPerOutputUnit = totalCost / preparation.outputQuantity

      const result: PreparationPlanCost = {
        preparationId: preparation.id,
        type: 'plan',
        totalCost,
        costPerOutputUnit,
        componentCosts,
        calculatedAt: new Date(),
        note: 'Based on current supplier prices'
      }

      preparationCosts.value.set(preparation.id, result)
      return { success: true, cost: result }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, `Failed to calculate preparation cost: ${preparation.name}`, {
        err
      })
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  // =============================================
  // ✅ УПРОЩЕННЫЙ РАСЧЕТ РЕЦЕПТОВ
  // =============================================

  async function calculateRecipeCost(recipe: Recipe): Promise<CostCalculationResult> {
    if (!getProductCallback || !getPreparationCostCallback) {
      return { success: false, error: 'Integration callbacks not available' }
    }

    try {
      if (!recipe.components || recipe.components.length === 0) {
        return { success: false, error: 'Recipe has no components' }
      }

      let totalCost = 0
      const componentCosts: ComponentPlanCost[] = []
      const missingItems: string[] = []

      // ✅ УПРОЩЕННАЯ ОБРАБОТКА компонентов
      for (const component of recipe.components) {
        let componentCost = 0
        let componentName = ''
        let unitCost = 0

        if (component.componentType === 'product') {
          const product = await getProductCallback(component.componentId)

          if (!product) {
            missingItems.push(`Product: ${component.componentId}`)
            continue
          }

          if (!product.isActive) {
            continue
          }

          componentName = product.name

          if (product.baseCostPerUnit === 0) {
            continue
          }

          // ✅ ПРЯМОЙ РАСЧЕТ: количество уже в базовых единицах
          componentCost = calculateDirectCost(component.quantity, product)
          unitCost = product.baseCostPerUnit
        } else if (component.componentType === 'preparation') {
          const preparationCost = await getPreparationCostCallback(component.componentId)

          if (!preparationCost) {
            missingItems.push(`Preparation: ${component.componentId}`)
            continue
          }

          componentName = `Preparation (${component.componentId})`
          componentCost = preparationCost.costPerOutputUnit * component.quantity
          unitCost = preparationCost.costPerOutputUnit
        }

        totalCost += componentCost

        componentCosts.push({
          componentId: component.componentId,
          componentType: component.componentType,
          componentName,
          quantity: component.quantity,
          unit: component.unit, // ✅ Уже базовая единица
          planUnitCost: unitCost,
          totalPlanCost: componentCost,
          percentage: 0
        })
      }

      // ✅ ТОЛЬКО КРИТИЧНЫЕ ПРЕДУПРЕЖДЕНИЯ
      if (missingItems.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Missing items in ${recipe.name}:`, missingItems)
        return { success: false, error: `Missing items: ${missingItems.join(', ')}` }
      }

      if (totalCost === 0) {
        return {
          success: false,
          error: 'Total cost is zero - check component prices'
        }
      }

      // Рассчитываем проценты
      componentCosts.forEach(component => {
        component.percentage = (component.totalPlanCost / totalCost) * 100
      })

      const costPerPortion = totalCost / recipe.portionSize

      const result: RecipePlanCost = {
        recipeId: recipe.id,
        type: 'plan',
        totalCost,
        costPerPortion,
        componentCosts,
        calculatedAt: new Date(),
        note: 'Based on current supplier prices + plan preparation costs'
      }

      recipeCosts.value.set(recipe.id, result)
      return { success: true, cost: result }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, `Failed to calculate recipe cost: ${recipe.name}`, { err })
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  // =============================================
  // ✅ ОПТИМИЗИРОВАННЫЕ МАССОВЫЕ ОПЕРАЦИИ
  // =============================================

  async function recalculateAllPreparationCosts(
    getPreparations: () => Preparation[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      loading.value = true
      error.value = null

      const preparations = getPreparations().filter(p => p.isActive)
      const results = { success: 0, failed: 0, errors: [] as string[] }

      for (const preparation of preparations) {
        const result = await calculatePreparationCost(preparation)
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`${preparation.name}: ${result.error}`)
        }
      }

      DebugUtils.info(
        MODULE_NAME,
        `Preparation costs: ${results.success} calculated, ${results.failed} failed`
      )

      if (results.failed > 0 && results.errors.length <= 3) {
        DebugUtils.warn(MODULE_NAME, 'Failed calculations:', results.errors)
      } else if (results.failed > 3) {
        DebugUtils.warn(
          MODULE_NAME,
          `${results.failed} calculations failed (first 3): ${results.errors.slice(0, 3).join(', ')}`
        )
      }

      return results
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to recalculate preparation costs'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function recalculateAllRecipeCosts(
    getRecipes: () => Recipe[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      loading.value = true
      error.value = null

      const recipes = getRecipes().filter(r => r.isActive)
      const results = { success: 0, failed: 0, errors: [] as string[] }

      for (const recipe of recipes) {
        const result = await calculateRecipeCost(recipe)
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`${recipe.name}: ${result.error}`)
        }
      }

      DebugUtils.info(
        MODULE_NAME,
        `Recipe costs: ${results.success} calculated, ${results.failed} failed`
      )

      if (results.failed > 0 && results.errors.length <= 3) {
        DebugUtils.warn(MODULE_NAME, 'Failed recipe calculations:', results.errors)
      } else if (results.failed > 3) {
        DebugUtils.warn(MODULE_NAME, `${results.failed} recipe calculations failed`)
      }

      return results
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to recalculate recipe costs'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // ДОБАВИТЬ эти функции в useCostCalculation.ts после существующих утилит:

  // =============================================
  // ✅ НОВЫЕ УТИЛИТЫ ДЛЯ РАБОТЫ С УПАКОВКАМИ
  // =============================================

  /**
   * ✅ НОВАЯ ФУНКЦИЯ: Расчет количества упаковок для заказа
   */
  function calculatePackageForOrder(
    productId: string,
    requiredBaseQuantity: number,
    getProductsStore: () => any,
    preferredPackageId?: string
  ): {
    recommendedPackage: any
    packagesToOrder: number
    totalCost: number
    actualQuantity: number
    surplus: number
  } | null {
    try {
      const productsStore = getProductsStore()

      const calculation = productsStore.calculatePackageQuantity(
        productId,
        requiredBaseQuantity,
        preferredPackageId
      )

      const totalCost = calculation.packageOption.packagePrice
        ? calculation.suggestedPackages * calculation.packageOption.packagePrice
        : calculation.actualBaseQuantity * calculation.packageOption.baseCostPerUnit

      return {
        recommendedPackage: calculation.packageOption,
        packagesToOrder: calculation.suggestedPackages,
        totalCost,
        actualQuantity: calculation.actualBaseQuantity,
        surplus: calculation.difference
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, `Failed to calculate package for order: ${productId}`, { error })
      return null
    }
  }

  /**
   * ✅ НОВАЯ ФУНКЦИЯ: Получение лучшей цены среди упаковок
   */
  function getBestPackagePrice(
    productId: string,
    getProductsStore: () => any
  ): {
    baseCostPerUnit: number
    bestPackage: any | null
    savings?: number
  } {
    try {
      const productsStore = getProductsStore()
      const product = productsStore.getProductById(productId)

      if (!product || !product.packageOptions.length) {
        return { baseCostPerUnit: 0, bestPackage: null }
      }

      // Ищем упаковку с минимальной стоимостью за базовую единицу
      const activePackages = product.packageOptions.filter((pkg: any) => pkg.isActive)

      if (activePackages.length === 0) {
        return { baseCostPerUnit: 0, bestPackage: null }
      }

      const bestPackage = activePackages.reduce((best: any, current: any) => {
        return current.baseCostPerUnit < best.baseCostPerUnit ? current : best
      })

      let savings = 0
      if (activePackages.length > 1) {
        const worstPackage = activePackages.reduce((worst: any, current: any) => {
          return current.baseCostPerUnit > worst.baseCostPerUnit ? current : worst
        })

        if (bestPackage.id !== worstPackage.id) {
          savings =
            ((worstPackage.baseCostPerUnit - bestPackage.baseCostPerUnit) /
              worstPackage.baseCostPerUnit) *
            100
        }
      }

      return {
        baseCostPerUnit: bestPackage.baseCostPerUnit,
        bestPackage,
        savings: savings > 0 ? savings : undefined
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, `Failed to get best package price: ${productId}`, { error })
      return { baseCostPerUnit: 0, bestPackage: null }
    }
  }

  /**
   * ✅ НОВАЯ ФУНКЦИЯ: Форматирование информации об упаковке для UI
   */
  function formatPackageInfo(packageOption: any): string {
    if (!packageOption) return ''

    const brandInfo = packageOption.brandName ? ` ${packageOption.brandName}` : ''
    const priceInfo = packageOption.packagePrice
      ? ` (${Math.round(packageOption.packagePrice)} IDR)`
      : ''

    return `${packageOption.packageName}${brandInfo}${priceInfo}`
  }

  /**
   * ✅ НОВАЯ ФУНКЦИЯ: Получение всех упаковок продукта для выбора
   */
  function getPackageOptionsForProduct(
    productId: string,
    getProductsStore: () => any
  ): Array<{
    id: string
    name: string
    displayName: string
    baseCostPerUnit: number
    packagePrice?: number
    isRecommended: boolean
  }> {
    try {
      const productsStore = getProductsStore()
      const product = productsStore.getProductById(productId)

      if (!product || !product.packageOptions) return []

      return product.packageOptions
        .filter((pkg: any) => pkg.isActive)
        .map((pkg: any) => ({
          id: pkg.id,
          name: pkg.packageName,
          displayName: formatPackageInfo(pkg),
          baseCostPerUnit: pkg.baseCostPerUnit,
          packagePrice: pkg.packagePrice,
          isRecommended: pkg.id === product.recommendedPackageId
        }))
        .sort((a, b) => {
          // Рекомендуемая упаковка первой
          if (a.isRecommended && !b.isRecommended) return -1
          if (!a.isRecommended && b.isRecommended) return 1
          // Затем по цене за базовую единицу
          return a.baseCostPerUnit - b.baseCostPerUnit
        })
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, `Failed to get package options: ${productId}`, { error })
      return []
    }
  }

  // =============================================
  // ✅ ОБНОВЛЕННАЯ ФУНКЦИЯ РАСЧЕТА С УПАКОВКАМИ
  // =============================================

  /**
   * ✅ ОБНОВЛЕНО: Расчет стоимости с информацией об упаковках
   */
  function calculateCostWithPackageInfo(
    quantity: number,
    product: ProductForRecipe,
    getProductsStore?: () => any
  ): {
    baseCost: number
    packageInfo?: {
      bestPackage: any
      savings?: number
      alternativePackages: number
    }
  } {
    const baseCost = calculateDirectCost(quantity, product)

    if (!getProductsStore) {
      return { baseCost }
    }

    try {
      const packagePrice = getBestPackagePrice(product.id, getProductsStore)
      const packageOptions = getPackageOptionsForProduct(product.id, getProductsStore)

      return {
        baseCost,
        packageInfo: {
          bestPackage: packagePrice.bestPackage,
          savings: packagePrice.savings,
          alternativePackages: packageOptions.length - 1
        }
      }
    } catch (error) {
      DebugUtils.warn(MODULE_NAME, `Failed to get package info for cost calculation`, { error })
      return { baseCost }
    }
  }

  // =============================================
  // ОСТАЛЬНЫЕ ФУНКЦИИ
  // =============================================

  async function calculatePreparationCostById(
    preparationId: string,
    getPreparation: (id: string) => Preparation | null
  ): Promise<CostCalculationResult> {
    const preparation = getPreparation(preparationId)
    if (!preparation) {
      return { success: false, error: 'Preparation not found' }
    }
    return calculatePreparationCost(preparation)
  }

  async function calculateRecipeCostById(
    recipeId: string,
    getRecipe: (id: string) => Recipe | null
  ): Promise<CostCalculationResult> {
    const recipe = getRecipe(recipeId)
    if (!recipe) {
      return { success: false, error: 'Recipe not found' }
    }
    return calculateRecipeCost(recipe)
  }

  async function recalculateAllCosts(
    type: 'preparation' | 'recipe' | 'all',
    getPreparations?: () => Preparation[],
    getRecipes?: () => Recipe[]
  ): Promise<void> {
    try {
      loading.value = true

      if (type === 'preparation' || type === 'all') {
        if (getPreparations) {
          await recalculateAllPreparationCosts(getPreparations)
        }
      }

      if (type === 'recipe' || type === 'all') {
        if (getRecipes) {
          await recalculateAllRecipeCosts(getRecipes)
        }
      }

      DebugUtils.info(MODULE_NAME, `All ${type} costs recalculated`)
    } finally {
      loading.value = false
    }
  }

  function getPreparationCost(preparationId: string): PreparationPlanCost | null {
    return preparationCosts.value.get(preparationId) || null
  }

  function getRecipeCost(recipeId: string): RecipePlanCost | null {
    return recipeCosts.value.get(recipeId) || null
  }

  function getAllPreparationCosts(): Map<string, PreparationPlanCost> {
    return new Map(preparationCosts.value)
  }

  function getAllRecipeCosts(): Map<string, RecipePlanCost> {
    return new Map(recipeCosts.value)
  }

  function clearError(): void {
    error.value = null
  }

  function clearAllCalculations(): void {
    preparationCosts.value.clear()
    recipeCosts.value.clear()
    DebugUtils.debug(MODULE_NAME, 'All calculations cleared')
  }

  const costCalculationsStats = computed(() => ({
    preparationCosts: preparationCosts.value.size,
    recipeCosts: recipeCosts.value.size,
    totalCalculations: preparationCosts.value.size + recipeCosts.value.size,
    lastCalculatedAt: getLastCalculationDate()
  }))

  function getLastCalculationDate(): Date | null {
    let lastDate: Date | null = null

    preparationCosts.value.forEach(cost => {
      if (!lastDate || cost.calculatedAt > lastDate) {
        lastDate = cost.calculatedAt
      }
    })

    recipeCosts.value.forEach(cost => {
      if (!lastDate || cost.calculatedAt > lastDate) {
        lastDate = cost.calculatedAt
      }
    })

    return lastDate
  }

  return {
    // State
    preparationCosts,
    recipeCosts,
    loading,
    error,

    // Computed
    costCalculationsStats,

    // Setup
    setIntegrationCallbacks,
    initializeCostCalculations,

    // Preparation cost calculation
    calculatePreparationCost,
    calculatePreparationCostById,

    // Recipe cost calculation
    calculateRecipeCost,
    calculateRecipeCostById,

    // Bulk operations
    recalculateAllPreparationCosts,
    recalculateAllRecipeCosts,
    recalculateAllCosts,

    // Getters
    getPreparationCost,
    getRecipeCost,
    getAllPreparationCosts,
    getAllRecipeCosts,

    // Утилиты (упрощенные)
    calculateDirectCost,
    getBaseUnitForProduct,
    getBaseCostPerUnit,
    clearError,
    clearAllCalculations,

    // НОВЫЕ функции для упаковок
    calculatePackageForOrder,
    getBestPackagePrice,
    formatPackageInfo,
    getPackageOptionsForProduct,
    calculateCostWithPackageInfo
  }
}
