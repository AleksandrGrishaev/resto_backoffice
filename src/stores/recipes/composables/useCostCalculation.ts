// src/stores/recipes/composables/useCostCalculation.ts - FIXED Cost Calculation Logic

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

// Global state for cost calculations
const preparationCosts = ref<Map<string, PreparationPlanCost>>(new Map())
const recipeCosts = ref<Map<string, RecipePlanCost>>(new Map())
const loading = ref(false)
const error = ref<string | null>(null)

// Integration callbacks
let getProductCallback: GetProductCallback | null = null
let getPreparationCostCallback: GetPreparationCostCallback | null = null

// =============================================
// COMPUTED
// =============================================

export const costCalculationsStats = computed(() => ({
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

// =============================================
// MAIN COMPOSABLE
// =============================================

export function useCostCalculation() {
  // =============================================
  // SETUP METHODS
  // =============================================

  /**
   * Устанавливает callbacks для интеграции
   */
  function setIntegrationCallbacks(
    getProduct: GetProductCallback,
    getPreparationCost: GetPreparationCostCallback
  ): void {
    getProductCallback = getProduct
    getPreparationCostCallback = getPreparationCost
    DebugUtils.info(MODULE_NAME, 'Integration callbacks set for cost calculation')
  }

  /**
   * Инициализирует расчеты стоимости
   */
  async function initializeCostCalculations(): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // Очищаем старые расчеты
      preparationCosts.value.clear()
      recipeCosts.value.clear()

      DebugUtils.info(MODULE_NAME, '✅ Cost calculations initialized')
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
  // UTILITIES - FIXED UNIT CONVERSION
  // =============================================

  /**
   * ✅ ИСПРАВЛЕНО: Конвертирует единицы измерения (только количество, НЕ цены!)
   */
  function convertToBaseUnit(value: number, unit: string): number {
    switch (unit.toLowerCase()) {
      case 'kg':
      case 'kilogram':
        return value * 1000 // кг в граммы
      case 'gram':
      case 'g':
        return value // граммы как базовая единица
      case 'liter':
      case 'l':
        return value * 1000 // литры в мл
      case 'ml':
      case 'milliliter':
        return value // мл как базовая единица
      case 'piece':
      case 'pack':
      case 'item':
        return value // штуки как есть
      default:
        DebugUtils.warn(MODULE_NAME, `Unknown unit: ${unit}, using as-is`)
        return value
    }
  }

  /**
   * ✅ НОВАЯ ФУНКЦИЯ: Конвертирует количество из одной единицы в другую
   */
  function convertQuantityBetweenUnits(quantity: number, fromUnit: string, toUnit: string): number {
    // Если единицы одинаковые - возвращаем как есть
    if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
      return quantity
    }

    // Конвертируем через базовые единицы
    const fromBaseUnit = convertToBaseUnit(quantity, fromUnit)

    // Обратная конвертация из базовой единицы в целевую
    switch (toUnit.toLowerCase()) {
      case 'kg':
      case 'kilogram':
        return fromBaseUnit / 1000 // граммы в кг
      case 'gram':
      case 'g':
        return fromBaseUnit // уже в граммах
      case 'liter':
      case 'l':
        return fromBaseUnit / 1000 // мл в литры
      case 'ml':
      case 'milliliter':
        return fromBaseUnit // уже в мл
      case 'piece':
      case 'pack':
      case 'item':
        return fromBaseUnit // штуки как есть
      default:
        DebugUtils.warn(MODULE_NAME, `Unknown target unit: ${toUnit}, using as-is`)
        return fromBaseUnit
    }
  }

  // =============================================
  // PREPARATION COST CALCULATION - FIXED
  // =============================================

  /**
   * ✅ ИСПРАВЛЕНО: Рассчитывает планируемую стоимость полуфабриката
   */
  async function calculatePreparationCost(
    preparation: Preparation
  ): Promise<CostCalculationResult> {
    if (!getProductCallback) {
      return {
        success: false,
        error: 'Product provider not available'
      }
    }

    try {
      DebugUtils.info(MODULE_NAME, `🧮 Calculating preparation cost: ${preparation.name}`)

      if (!preparation.recipe || preparation.recipe.length === 0) {
        return {
          success: false,
          error: 'Preparation has no recipe ingredients'
        }
      }

      let totalCost = 0
      const componentCosts: ComponentPlanCost[] = []
      const missingProducts: string[] = []

      // Рассчитываем стоимость каждого ингредиента
      for (const ingredient of preparation.recipe) {
        const product = await getProductCallback(ingredient.id)

        if (!product) {
          missingProducts.push(ingredient.id)
          continue
        }

        if (!product.isActive) {
          DebugUtils.warn(MODULE_NAME, `Product ${product.name} is inactive`)
          continue
        }

        // ✅ ИСПРАВЛЕНО: Конвертируем ТОЛЬКО количество ингредиента в единицы продукта
        let ingredientQuantityInProductUnits = ingredient.quantity

        // Если единицы разные - конвертируем количество
        if (ingredient.unit !== product.unit) {
          ingredientQuantityInProductUnits = convertQuantityBetweenUnits(
            ingredient.quantity,
            ingredient.unit,
            product.unit
          )
        }

        // ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ: НЕ конвертируем costPerUnit!
        // product.costPerUnit уже в правильных единицах ($/kg, $/liter)
        const ingredientTotalCost = ingredientQuantityInProductUnits * product.costPerUnit
        totalCost += ingredientTotalCost

        DebugUtils.debug(MODULE_NAME, `Ingredient cost calculation:`, {
          productName: product.name,
          ingredientQuantity: ingredient.quantity,
          ingredientUnit: ingredient.unit,
          productUnit: product.unit,
          convertedQuantity: ingredientQuantityInProductUnits,
          costPerUnit: product.costPerUnit,
          totalCost: ingredientTotalCost
        })

        componentCosts.push({
          componentId: ingredient.id,
          componentType: 'product',
          componentName: product.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          planUnitCost: product.costPerUnit,
          totalPlanCost: ingredientTotalCost,
          percentage: 0 // будет рассчитано позже
        })
      }

      if (missingProducts.length > 0) {
        return {
          success: false,
          error: `Missing products: ${missingProducts.join(', ')}`
        }
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

      // Сохраняем в кэш
      preparationCosts.value.set(preparation.id, result)

      DebugUtils.info(MODULE_NAME, `✅ Preparation cost calculated: ${preparation.name}`, {
        totalCost: totalCost.toFixed(2),
        costPerUnit: costPerOutputUnit.toFixed(2),
        components: componentCosts.length
      })

      return {
        success: true,
        cost: result
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, `❌ Error calculating preparation cost: ${preparation.name}`, {
        err
      })
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Рассчитывает стоимость полуфабриката по ID
   */
  async function calculatePreparationCostById(
    preparationId: string,
    getPreparation: (id: string) => Preparation | null
  ): Promise<CostCalculationResult> {
    const preparation = getPreparation(preparationId)
    if (!preparation) {
      return {
        success: false,
        error: 'Preparation not found'
      }
    }

    return calculatePreparationCost(preparation)
  }

  // =============================================
  // RECIPE COST CALCULATION - FIXED
  // =============================================

  /**
   * ✅ ИСПРАВЛЕНО: Рассчитывает планируемую стоимость рецепта
   */
  async function calculateRecipeCost(recipe: Recipe): Promise<CostCalculationResult> {
    if (!getProductCallback || !getPreparationCostCallback) {
      return {
        success: false,
        error: 'Integration callbacks not available'
      }
    }

    try {
      DebugUtils.info(MODULE_NAME, `🧮 Calculating recipe cost: ${recipe.name}`)

      if (!recipe.components || recipe.components.length === 0) {
        return {
          success: false,
          error: 'Recipe has no components'
        }
      }

      let totalCost = 0
      const componentCosts: ComponentPlanCost[] = []
      const missingItems: string[] = []

      // Обрабатываем каждый компонент рецепта
      for (const component of recipe.components) {
        let componentCost = 0
        let componentName = ''
        let unitCost = 0

        if (component.componentType === 'product') {
          // Получаем стоимость продукта
          const product = await getProductCallback(component.componentId)

          if (!product) {
            missingItems.push(`Product: ${component.componentId}`)
            continue
          }

          if (!product.isActive) {
            DebugUtils.warn(MODULE_NAME, `Product ${product.name} is inactive`)
            continue
          }

          componentName = product.name

          // ✅ ИСПРАВЛЕНО: Конвертируем ТОЛЬКО количество компонента в единицы продукта
          let componentQuantityInProductUnits = component.quantity

          if (component.unit !== product.unit) {
            componentQuantityInProductUnits = convertQuantityBetweenUnits(
              component.quantity,
              component.unit,
              product.unit
            )
          }

          // ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ: НЕ конвертируем costPerUnit!
          componentCost = componentQuantityInProductUnits * product.costPerUnit
          unitCost = product.costPerUnit

          DebugUtils.debug(MODULE_NAME, `Recipe component cost:`, {
            productName: product.name,
            componentQuantity: component.quantity,
            componentUnit: component.unit,
            productUnit: product.unit,
            convertedQuantity: componentQuantityInProductUnits,
            costPerUnit: product.costPerUnit,
            totalCost: componentCost
          })
        } else if (component.componentType === 'preparation') {
          // Получаем стоимость полуфабриката
          const preparationCost = await getPreparationCostCallback(component.componentId)

          if (!preparationCost) {
            missingItems.push(`Preparation: ${component.componentId}`)
            continue
          }

          componentName = `Preparation (${component.componentId})`

          // ✅ ИСПРАВЛЕНО: Простая пропорциональная стоимость
          // Количество компонента * стоимость за единицу полуфабриката
          componentCost = preparationCost.costPerOutputUnit * component.quantity
          unitCost = preparationCost.costPerOutputUnit

          DebugUtils.debug(MODULE_NAME, `Recipe preparation cost:`, {
            preparationId: component.componentId,
            componentQuantity: component.quantity,
            costPerUnit: preparationCost.costPerOutputUnit,
            totalCost: componentCost
          })
        }

        totalCost += componentCost

        componentCosts.push({
          componentId: component.componentId,
          componentType: component.componentType,
          componentName,
          quantity: component.quantity,
          unit: component.unit,
          planUnitCost: unitCost,
          totalPlanCost: componentCost,
          percentage: 0 // будет рассчитано позже
        })
      }

      if (missingItems.length > 0) {
        return {
          success: false,
          error: `Missing items: ${missingItems.join(', ')}`
        }
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

      // Сохраняем в кэш
      recipeCosts.value.set(recipe.id, result)

      DebugUtils.info(MODULE_NAME, `✅ Recipe cost calculated: ${recipe.name}`, {
        totalCost: totalCost.toFixed(2),
        costPerPortion: costPerPortion.toFixed(2),
        components: componentCosts.length
      })

      return {
        success: true,
        cost: result
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, `❌ Error calculating recipe cost: ${recipe.name}`, { err })
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    }
  }

  /**
   * Рассчитывает стоимость рецепта по ID
   */
  async function calculateRecipeCostById(
    recipeId: string,
    getRecipe: (id: string) => Recipe | null
  ): Promise<CostCalculationResult> {
    const recipe = getRecipe(recipeId)
    if (!recipe) {
      return {
        success: false,
        error: 'Recipe not found'
      }
    }

    return calculateRecipeCost(recipe)
  }

  // =============================================
  // BULK OPERATIONS
  // =============================================

  /**
   * Пересчитывает все стоимости полуфабрикатов
   */
  async function recalculateAllPreparationCosts(
    getPreparations: () => Preparation[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      loading.value = true
      error.value = null

      const preparations = getPreparations().filter(p => p.isActive)
      const results = { success: 0, failed: 0, errors: [] as string[] }

      DebugUtils.info(MODULE_NAME, `🔄 Recalculating ${preparations.length} preparation costs...`)

      for (const preparation of preparations) {
        const result = await calculatePreparationCost(preparation)
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`${preparation.name}: ${result.error}`)
        }
      }

      DebugUtils.info(MODULE_NAME, `✅ Preparation cost recalculation complete`, results)
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

  /**
   * Пересчитывает все стоимости рецептов
   */
  async function recalculateAllRecipeCosts(
    getRecipes: () => Recipe[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      loading.value = true
      error.value = null

      const recipes = getRecipes().filter(r => r.isActive)
      const results = { success: 0, failed: 0, errors: [] as string[] }

      DebugUtils.info(MODULE_NAME, `🔄 Recalculating ${recipes.length} recipe costs...`)

      for (const recipe of recipes) {
        const result = await calculateRecipeCost(recipe)
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`${recipe.name}: ${result.error}`)
        }
      }

      DebugUtils.info(MODULE_NAME, `✅ Recipe cost recalculation complete`, results)
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

  /**
   * Пересчитывает все стоимости (универсальный метод)
   */
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

      DebugUtils.info(MODULE_NAME, `✅ All ${type} costs recalculated`)
    } finally {
      loading.value = false
    }
  }

  // =============================================
  // GETTERS
  // =============================================

  /**
   * Получает расчет стоимости полуфабриката
   */
  function getPreparationCost(preparationId: string): PreparationPlanCost | null {
    return preparationCosts.value.get(preparationId) || null
  }

  /**
   * Получает расчет стоимости рецепта
   */
  function getRecipeCost(recipeId: string): RecipePlanCost | null {
    return recipeCosts.value.get(recipeId) || null
  }

  /**
   * Получает все расчеты стоимости полуфабрикатов
   */
  function getAllPreparationCosts(): Map<string, PreparationPlanCost> {
    return new Map(preparationCosts.value)
  }

  /**
   * Получает все расчеты стоимости рецептов
   */
  function getAllRecipeCosts(): Map<string, RecipePlanCost> {
    return new Map(recipeCosts.value)
  }

  /**
   * Получает топ самых дорогих полуфабрикатов
   */
  function getTopExpensivePreparations(limit: number = 10): Array<{
    id: string
    name: string
    totalCost: number
    costPerUnit: number
  }> {
    const costs = Array.from(preparationCosts.value.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit)

    return costs.map(cost => ({
      id: cost.preparationId,
      name: cost.componentCosts[0]?.componentName || 'Unknown',
      totalCost: cost.totalCost,
      costPerUnit: cost.costPerOutputUnit
    }))
  }

  /**
   * Получает топ самых дорогих рецептов
   */
  function getTopExpensiveRecipes(limit: number = 10): Array<{
    id: string
    name: string
    totalCost: number
    costPerPortion: number
  }> {
    const costs = Array.from(recipeCosts.value.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit)

    return costs.map(cost => ({
      id: cost.recipeId,
      name: cost.componentCosts[0]?.componentName || 'Unknown',
      totalCost: cost.totalCost,
      costPerPortion: cost.costPerPortion
    }))
  }

  // =============================================
  // PRICE CHANGE IMPACT
  // =============================================

  /**
   * Рассчитывает влияние изменения цены продукта
   */
  function calculatePriceChangeImpact(
    productId: string,
    oldPrice: number,
    newPrice: number,
    getPreparations: () => Preparation[],
    getRecipes: () => Recipe[]
  ): {
    affectedPreparations: Array<{ id: string; name: string; oldCost: number; newCost: number }>
    affectedRecipes: Array<{ id: string; name: string; oldCost: number; newCost: number }>
    totalImpact: number
  } {
    const priceChange = newPrice - oldPrice
    const priceChangeRatio = newPrice / oldPrice

    const affectedPreparations: Array<{
      id: string
      name: string
      oldCost: number
      newCost: number
    }> = []
    const affectedRecipes: Array<{ id: string; name: string; oldCost: number; newCost: number }> =
      []

    // Анализируем влияние на полуфабрикаты
    getPreparations().forEach(preparation => {
      const usesProduct = preparation.recipe.some(ingredient => ingredient.id === productId)
      if (!usesProduct) return

      const currentCost = getPreparationCost(preparation.id)
      if (!currentCost) return

      // Находим компонент с этим продуктом
      const productComponent = currentCost.componentCosts.find(c => c.componentId === productId)
      if (!productComponent) return

      const componentCostChange = productComponent.totalPlanCost * (priceChangeRatio - 1)
      const newTotalCost = currentCost.totalCost + componentCostChange

      affectedPreparations.push({
        id: preparation.id,
        name: preparation.name,
        oldCost: currentCost.totalCost,
        newCost: newTotalCost
      })
    })

    // Анализируем влияние на рецепты
    getRecipes().forEach(recipe => {
      const usesProduct = recipe.components.some(
        component => component.componentId === productId && component.componentType === 'product'
      )
      if (!usesProduct) return

      const currentCost = getRecipeCost(recipe.id)
      if (!currentCost) return

      const productComponent = currentCost.componentCosts.find(
        c => c.componentId === productId && c.componentType === 'product'
      )
      if (!productComponent) return

      const componentCostChange = productComponent.totalPlanCost * (priceChangeRatio - 1)
      const newTotalCost = currentCost.totalCost + componentCostChange

      affectedRecipes.push({
        id: recipe.id,
        name: recipe.name,
        oldCost: currentCost.totalCost,
        newCost: newTotalCost
      })
    })

    const totalImpact =
      affectedPreparations.reduce((sum, item) => sum + (item.newCost - item.oldCost), 0) +
      affectedRecipes.reduce((sum, item) => sum + (item.newCost - item.oldCost), 0)

    return {
      affectedPreparations,
      affectedRecipes,
      totalImpact
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Очищает ошибки
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * Очищает все расчеты
   */
  function clearAllCalculations(): void {
    preparationCosts.value.clear()
    recipeCosts.value.clear()
    DebugUtils.info(MODULE_NAME, 'All cost calculations cleared')
  }

  /**
   * Экспортирует расчеты стоимости
   */
  function exportCostCalculations(): {
    preparationCosts: Record<string, PreparationPlanCost>
    recipeCosts: Record<string, RecipePlanCost>
    exportedAt: string
    version: string
  } {
    return {
      preparationCosts: Object.fromEntries(preparationCosts.value),
      recipeCosts: Object.fromEntries(recipeCosts.value),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }
  }

  // =============================================
  // RETURN COMPOSABLE
  // =============================================

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
    getTopExpensivePreparations,
    getTopExpensiveRecipes,

    // Price change impact
    calculatePriceChangeImpact,

    // Utilities
    convertToBaseUnit,
    clearError,
    clearAllCalculations,
    exportCostCalculations
  }
}
