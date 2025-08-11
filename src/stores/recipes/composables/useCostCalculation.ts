// src/stores/recipes/composables/useCostCalculation.ts - ИСПРАВЛЕННАЯ версия

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
    DebugUtils.info(MODULE_NAME, 'Integration callbacks set for cost calculation')
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
  // ИСПРАВЛЕННЫЕ УТИЛИТЫ КОНВЕРТАЦИИ
  // =============================================

  /**
   * ✅ ИСПРАВЛЕНО: Конвертирует количество в граммы или мл (базовые единицы)
   */
  function convertToBaseUnits(value: number, unit: string): number {
    const conversions: Record<string, number> = {
      // Вес -> граммы
      gram: 1,
      g: 1,
      kg: 1000,
      kilogram: 1000,

      // Объем -> миллилитры
      ml: 1,
      milliliter: 1,
      liter: 1000,
      l: 1000,

      // Штучные -> штуки
      piece: 1,
      pack: 1,
      item: 1
    }

    const factor = conversions[unit.toLowerCase()]
    if (factor === undefined) {
      DebugUtils.warn(MODULE_NAME, `Unknown unit: ${unit}, using as-is`)
      return value
    }

    return value * factor
  }

  /**
   * ✅ ИСПРАВЛЕНО: Проверяет совместимость единиц измерения
   */
  function areUnitsCompatible(unit1: string, unit2: string): boolean {
    const weightUnits = ['gram', 'g', 'kg', 'kilogram']
    const volumeUnits = ['ml', 'milliliter', 'liter', 'l']
    const pieceUnits = ['piece', 'pack', 'item']

    const getUnitType = (unit: string) => {
      const u = unit.toLowerCase()
      if (weightUnits.includes(u)) return 'weight'
      if (volumeUnits.includes(u)) return 'volume'
      if (pieceUnits.includes(u)) return 'piece'
      return 'unknown'
    }

    return getUnitType(unit1) === getUnitType(unit2)
  }

  // =============================================
  // ИСПРАВЛЕННЫЙ РАСЧЕТ СТОИМОСТИ ПОЛУФАБРИКАТОВ
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

        // ✅ ИСПРАВЛЕНО: Простая проверка совместимости единиц
        if (!areUnitsCompatible(ingredient.unit, getBaseUnitForProduct(product))) {
          DebugUtils.error(
            MODULE_NAME,
            `Unit mismatch: ingredient ${ingredient.unit} vs product base unit`
          )
          continue
        }

        // ✅ ИСПРАВЛЕНО: Конвертируем количество ингредиента в базовые единицы
        const ingredientQuantityInBaseUnits = convertToBaseUnits(
          ingredient.quantity,
          ingredient.unit
        )

        // ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ: Используем baseCostPerUnit (цена за грамм/мл/штуку)
        const ingredientTotalCost = ingredientQuantityInBaseUnits * product.baseCostPerUnit
        totalCost += ingredientTotalCost

        DebugUtils.debug(MODULE_NAME, `✅ Fixed ingredient cost calculation:`, {
          productName: product.name,
          ingredientQuantity: ingredient.quantity,
          ingredientUnit: ingredient.unit,
          baseQuantity: ingredientQuantityInBaseUnits,
          baseCostPerUnit: product.baseCostPerUnit,
          totalCost: ingredientTotalCost
        })

        componentCosts.push({
          componentId: ingredient.id,
          componentType: 'product',
          componentName: product.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          planUnitCost: product.baseCostPerUnit,
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
        note: 'Based on current supplier prices (fixed calculation)'
      }

      // Сохраняем в кэш
      preparationCosts.value.set(preparation.id, result)

      DebugUtils.info(MODULE_NAME, `✅ Fixed preparation cost calculated: ${preparation.name}`, {
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

  // =============================================
  // ИСПРАВЛЕННЫЙ РАСЧЕТ СТОИМОСТИ РЕЦЕПТОВ
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

          // ✅ ИСПРАВЛЕНО: Проверяем совместимость единиц
          if (!areUnitsCompatible(component.unit, getBaseUnitForProduct(product))) {
            DebugUtils.error(
              MODULE_NAME,
              `Unit mismatch: component ${component.unit} vs product base unit`
            )
            continue
          }

          // ✅ ИСПРАВЛЕНО: Конвертируем количество компонента в базовые единицы
          const componentQuantityInBaseUnits = convertToBaseUnits(
            component.quantity,
            component.unit
          )

          // ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ: Используем baseCostPerUnit
          componentCost = componentQuantityInBaseUnits * product.baseCostPerUnit
          unitCost = product.baseCostPerUnit

          DebugUtils.debug(MODULE_NAME, `✅ Fixed recipe component cost:`, {
            productName: product.name,
            componentQuantity: component.quantity,
            componentUnit: component.unit,
            baseQuantity: componentQuantityInBaseUnits,
            baseCostPerUnit: product.baseCostPerUnit,
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

          DebugUtils.debug(MODULE_NAME, `✅ Fixed recipe preparation cost:`, {
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
        note: 'Based on current supplier prices + plan preparation costs (fixed calculation)'
      }

      // Сохраняем в кэш
      recipeCosts.value.set(recipe.id, result)

      DebugUtils.info(MODULE_NAME, `✅ Fixed recipe cost calculated: ${recipe.name}`, {
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

  // =============================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =============================================

  /**
   * ✅ НОВАЯ ФУНКЦИЯ: Получает базовую единицу для продукта
   */
  function getBaseUnitForProduct(product: ProductForRecipe): string {
    // Если у продукта есть baseUnit, используем его
    if ((product as any).baseUnit) {
      return (product as any).baseUnit
    }

    // Иначе определяем по категории (для обратной совместимости)
    const category = product.category.toLowerCase()

    if (['meat', 'vegetables', 'spices', 'cereals'].includes(category)) {
      return 'gram'
    }

    if (['dairy'].includes(category) && product.name.toLowerCase().includes('milk')) {
      return 'ml'
    }

    if (['beverages'].includes(category)) {
      return 'piece'
    }

    if (product.name.toLowerCase().includes('oil')) {
      return 'ml'
    }

    // По умолчанию граммы для сыпучих продуктов
    return 'gram'
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

  // =============================================
  // COMPUTED
  // =============================================

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

    // Utilities
    convertToBaseUnits,
    areUnitsCompatible,
    clearError,
    clearAllCalculations
  }
}
