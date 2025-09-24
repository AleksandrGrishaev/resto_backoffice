// src/stores/recipes/composables/useCostCalculation.ts - ОПТИМИЗИРОВАННОЕ логирование

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
    // ✅ МИНИМАЛЬНЫЙ ЛОГ: Только важная информация
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

      // ✅ КРАТКИЙ ЛОГ: Без эмодзи и лишних слов
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
  // УТИЛИТЫ КОНВЕРТАЦИИ (без изменений)
  // =============================================

  function convertToBaseUnits(value: number, unit: string): number {
    const conversions: Record<string, number> = {
      gram: 1,
      g: 1,
      kg: 1000,
      kilogram: 1000,
      ml: 1,
      milliliter: 1,
      liter: 1000,
      l: 1000,
      piece: 1,
      pack: 1,
      item: 1
    }

    const factor = conversions[unit.toLowerCase()]
    if (factor === undefined) {
      // ✅ ТОЛЬКО WARNING для неизвестных единиц
      DebugUtils.warn(MODULE_NAME, `Unknown unit: ${unit}`)
      return value
    }

    return value * factor
  }

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

  function getBaseUnitForProduct(product: ProductForRecipe): string {
    if (product.baseUnit) {
      return product.baseUnit
    }

    if ((product as any).unit) {
      switch ((product as any).unit) {
        case 'kg':
          return 'gram'
        case 'liter':
          return 'ml'
        case 'piece':
        case 'pack':
          return 'piece'
        case 'gram':
          return 'gram'
        case 'ml':
          return 'ml'
        default:
          return 'gram'
      }
    }

    const category = product.category?.toLowerCase() || ''
    if (['meat', 'vegetables', 'spices', 'cereals', 'dairy'].includes(category)) {
      return 'gram'
    }
    if (['beverages'].includes(category) || product.name.toLowerCase().includes('oil')) {
      return 'ml'
    }
    return 'gram'
  }

  function getBaseCostPerUnit(product: ProductForRecipe): number {
    if (product.baseCostPerUnit && product.baseCostPerUnit > 0) {
      return product.baseCostPerUnit
    }

    if ((product as any).costPerUnit && (product as any).unit) {
      const baseUnit = getBaseUnitForProduct(product)
      const oldUnit = (product as any).unit
      const oldCost = (product as any).costPerUnit

      if (oldUnit === baseUnit) {
        return oldCost
      }

      if (oldUnit === 'kg' && baseUnit === 'gram') {
        return oldCost / 1000
      }

      if (oldUnit === 'liter' && baseUnit === 'ml') {
        return oldCost / 1000
      }

      return oldCost
    }

    // ✅ ТОЛЬКО WARNING для отсутствующих данных
    DebugUtils.warn(MODULE_NAME, `No cost data: ${product.name}`)
    return 0
  }

  // =============================================
  // ✅ ОПТИМИЗИРОВАННЫЙ РАСЧЕТ ПОЛУФАБРИКАТОВ
  // =============================================

  async function calculatePreparationCost(
    preparation: Preparation
  ): Promise<CostCalculationResult> {
    if (!getProductCallback) {
      return { success: false, error: 'Product provider not available' }
    }

    try {
      // ✅ ТОЛЬКО DEBUG: Не засоряем консоль при массовых расчетах
      DebugUtils.debug(MODULE_NAME, `Calculating preparation: ${preparation.name}`)

      if (!preparation.recipe || preparation.recipe.length === 0) {
        return { success: false, error: 'Preparation has no recipe ingredients' }
      }

      let totalCost = 0
      const componentCosts: ComponentPlanCost[] = []
      const missingProducts: string[] = []
      const inactiveProducts: string[] = []
      const zeroCostProducts: string[] = []
      const incompatibleUnits: string[] = []

      // ✅ ГРУППОВОЙ СБОР ОШИБОК: Не логируем каждую проблему отдельно
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

        const baseUnit = getBaseUnitForProduct(product)
        const baseCostPerUnit = getBaseCostPerUnit(product)

        if (baseCostPerUnit === 0) {
          zeroCostProducts.push(product.name)
          continue
        }

        if (!areUnitsCompatible(ingredient.unit, baseUnit)) {
          incompatibleUnits.push(`${product.name} (${ingredient.unit} → ${baseUnit})`)
          continue
        }

        const ingredientQuantityInBaseUnits = convertToBaseUnits(
          ingredient.quantity,
          ingredient.unit
        )

        const ingredientTotalCost = ingredientQuantityInBaseUnits * baseCostPerUnit
        totalCost += ingredientTotalCost

        componentCosts.push({
          componentId: ingredient.id,
          componentType: 'product',
          componentName: product.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          planUnitCost: baseCostPerUnit,
          totalPlanCost: ingredientTotalCost,
          percentage: 0
        })
      }

      // ✅ ГРУППОВЫЕ ПРЕДУПРЕЖДЕНИЯ: Один лог вместо множества
      if (missingProducts.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Missing products in ${preparation.name}:`, missingProducts)
      }
      if (inactiveProducts.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Inactive products in ${preparation.name}:`, inactiveProducts)
      }
      if (zeroCostProducts.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Zero cost products in ${preparation.name}:`, zeroCostProducts)
      }
      if (incompatibleUnits.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Unit mismatches in ${preparation.name}:`, incompatibleUnits)
      }

      if (missingProducts.length > 0) {
        return { success: false, error: `Missing products: ${missingProducts.join(', ')}` }
      }

      if (totalCost === 0) {
        return {
          success: false,
          error: 'Total cost is zero - check product prices and unit compatibility'
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

      // ✅ ТОЛЬКО УСПЕШНЫЕ РЕЗУЛЬТАТЫ: Краткий финальный лог
      DebugUtils.debug(
        MODULE_NAME,
        `Preparation cost: ${preparation.name} = ${totalCost.toFixed(0)} (${componentCosts.length} components)`
      )

      return { success: true, cost: result }
    } catch (err) {
      // ✅ ТОЛЬКО ОШИБКИ логируются как ERROR
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
  // ✅ ОПТИМИЗИРОВАННЫЙ РАСЧЕТ РЕЦЕПТОВ
  // =============================================

  async function calculateRecipeCost(recipe: Recipe): Promise<CostCalculationResult> {
    if (!getProductCallback || !getPreparationCostCallback) {
      return { success: false, error: 'Integration callbacks not available' }
    }

    try {
      DebugUtils.debug(MODULE_NAME, `Calculating recipe: ${recipe.name}`)

      if (!recipe.components || recipe.components.length === 0) {
        return { success: false, error: 'Recipe has no components' }
      }

      let totalCost = 0
      const componentCosts: ComponentPlanCost[] = []
      const missingItems: string[] = []
      const inactiveProducts: string[] = []
      const zeroCostItems: string[] = []
      const incompatibleUnits: string[] = []

      // ✅ ГРУППОВОЙ СБОР ОШИБОК для рецептов
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
            inactiveProducts.push(product.name)
            continue
          }

          componentName = product.name
          const baseUnit = getBaseUnitForProduct(product)
          const baseCostPerUnit = getBaseCostPerUnit(product)

          if (baseCostPerUnit === 0) {
            zeroCostItems.push(product.name)
            continue
          }

          if (!areUnitsCompatible(component.unit, baseUnit)) {
            incompatibleUnits.push(`${product.name} (${component.unit} → ${baseUnit})`)
            continue
          }

          const componentQuantityInBaseUnits = convertToBaseUnits(
            component.quantity,
            component.unit
          )

          componentCost = componentQuantityInBaseUnits * baseCostPerUnit
          unitCost = baseCostPerUnit
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
          unit: component.unit,
          planUnitCost: unitCost,
          totalPlanCost: componentCost,
          percentage: 0
        })
      }

      // ✅ ГРУППОВЫЕ ПРЕДУПРЕЖДЕНИЯ для рецептов
      if (missingItems.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Missing items in ${recipe.name}:`, missingItems)
      }
      if (inactiveProducts.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Inactive products in ${recipe.name}:`, inactiveProducts)
      }
      if (zeroCostItems.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Zero cost items in ${recipe.name}:`, zeroCostItems)
      }
      if (incompatibleUnits.length > 0) {
        DebugUtils.warn(MODULE_NAME, `Unit mismatches in ${recipe.name}:`, incompatibleUnits)
      }

      if (missingItems.length > 0) {
        return { success: false, error: `Missing items: ${missingItems.join(', ')}` }
      }

      if (totalCost === 0) {
        return {
          success: false,
          error: 'Total cost is zero - check component prices and unit compatibility'
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

      // ✅ КРАТКИЙ ФИНАЛЬНЫЙ ЛОГ
      DebugUtils.debug(
        MODULE_NAME,
        `Recipe cost: ${recipe.name} = ${totalCost.toFixed(0)} per portion: ${costPerPortion.toFixed(0)} (${componentCosts.length} components)`
      )

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

      // ✅ ОДИН ЛОГ ДЛЯ НАЧАЛА
      DebugUtils.info(MODULE_NAME, `Recalculating ${preparations.length} preparation costs...`)

      for (const preparation of preparations) {
        const result = await calculatePreparationCost(preparation)
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`${preparation.name}: ${result.error}`)
        }
      }

      // ✅ ФИНАЛЬНЫЙ СВОДНЫЙ ЛОГ
      DebugUtils.info(
        MODULE_NAME,
        `Preparation costs recalculated: ${results.success} success, ${results.failed} failed`
      )

      if (results.failed > 0) {
        DebugUtils.warn(MODULE_NAME, 'Failed calculations:', results.errors)
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

      // ✅ ОДИН ЛОГ ДЛЯ НАЧАЛА
      DebugUtils.info(MODULE_NAME, `Recalculating ${recipes.length} recipe costs...`)

      for (const recipe of recipes) {
        const result = await calculateRecipeCost(recipe)
        if (result.success) {
          results.success++
        } else {
          results.failed++
          results.errors.push(`${recipe.name}: ${result.error}`)
        }
      }

      // ✅ ФИНАЛЬНЫЙ СВОДНЫЙ ЛОГ
      DebugUtils.info(
        MODULE_NAME,
        `Recipe costs recalculated: ${results.success} success, ${results.failed} failed`
      )

      if (results.failed > 0) {
        DebugUtils.warn(MODULE_NAME, 'Failed calculations:', results.errors)
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

  // =============================================
  // ОСТАЛЬНЫЕ ФУНКЦИИ (без изменений)
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

      // ✅ ФИНАЛЬНЫЙ ЛОГ ГРУППЫ
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

    // Utilities
    convertToBaseUnits,
    areUnitsCompatible,
    getBaseUnitForProduct,
    getBaseCostPerUnit,
    clearError,
    clearAllCalculations
  }
}
