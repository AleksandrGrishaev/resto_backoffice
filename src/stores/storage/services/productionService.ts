// src/stores/storage/services/productionService.ts
import { DebugUtils, TimeUtils, generateId } from '@/utils'
import { fifoCalculationService } from './fifoCalculationService'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { generateBatchNumber } from '../mock/mockData'
import type {
  StorageBatch,
  CreateProductionData,
  ProductionOperation,
  ProductionIngredient,
  StorageDepartment,
  BatchAllocation
} from '../types'
import type { Preparation } from '@/stores/recipes/types'

const MODULE_NAME = 'ProductionService'

/**
 * Сервис для производственных операций
 * Отвечает за: создание полуфабрикатов, валидацию ингредиентов, production workflow
 */
export class ProductionService {
  // ==========================================
  // VALIDATION METHODS
  // ==========================================

  /**
   * Валидирует доступность ингредиентов для производства
   */
  validateIngredientAvailability(
    preparation: Preparation,
    batchCount: number,
    availableBatches: StorageBatch[]
  ): { valid: boolean; missingIngredients: any[] } {
    try {
      const missingIngredients: any[] = []

      if (!preparation.recipe || preparation.recipe.length === 0) {
        return { valid: false, missingIngredients: [] }
      }

      for (const ingredient of preparation.recipe) {
        const requiredQuantity = ingredient.quantity * batchCount

        // Находим все батчи этого ингредиента
        const ingredientBatches = availableBatches.filter(
          batch =>
            batch.itemId === ingredient.id && batch.currentQuantity > 0 && batch.status === 'active'
        )

        const availableQuantity = ingredientBatches.reduce(
          (sum, batch) => sum + batch.currentQuantity,
          0
        )

        if (availableQuantity < requiredQuantity) {
          const productsStore = useProductsStore()
          const product = productsStore.products.find(p => p.id === ingredient.id)

          missingIngredients.push({
            id: ingredient.id,
            name: product?.name || ingredient.id,
            required: requiredQuantity,
            available: availableQuantity,
            missing: requiredQuantity - availableQuantity,
            unit: ingredient.unit
          })
        }
      }

      return {
        valid: missingIngredients.length === 0,
        missingIngredients
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to validate ingredient availability', { error })
      return { valid: false, missingIngredients: [] }
    }
  }

  /**
   * Получает доступные рецепты для производства
   */
  getAvailablePreparations(
    department: StorageDepartment,
    availableBatches: StorageBatch[]
  ): Preparation[] {
    try {
      const recipesStore = useRecipesStore()

      // Фильтруем рецепты, для которых есть все ингредиенты
      return recipesStore.activePreparations.filter(prep => {
        if (!prep.recipe || prep.recipe.length === 0) return false

        // Проверяем доступность ингредиентов для минимум 1 порции
        const validation = this.validateIngredientAvailability(prep, 1, availableBatches)
        return validation.valid
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available preparations', { error })
      return []
    }
  }

  /**
   * Рассчитывает максимальное количество порций для рецепта
   */
  calculateMaxBatchCount(preparation: Preparation, availableBatches: StorageBatch[]): number {
    try {
      if (!preparation.recipe || preparation.recipe.length === 0) return 0

      let maxBatches = Infinity

      for (const ingredient of preparation.recipe) {
        // Находим все батчи этого ингредиента
        const ingredientBatches = availableBatches.filter(
          batch =>
            batch.itemId === ingredient.id && batch.currentQuantity > 0 && batch.status === 'active'
        )

        const availableQuantity = ingredientBatches.reduce(
          (sum, batch) => sum + batch.currentQuantity,
          0
        )

        const possibleBatches = Math.floor(availableQuantity / ingredient.quantity)
        maxBatches = Math.min(maxBatches, possibleBatches)
      }

      return maxBatches === Infinity ? 0 : maxBatches
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate max batch count', { error })
      return 0
    }
  }

  // ==========================================
  // CALCULATION METHODS
  // ==========================================

  /**
   * Рассчитывает требуемые ингредиенты для производства
   */
  calculateRequiredIngredients(
    preparation: Preparation,
    batchCount: number,
    availableBatches: StorageBatch[]
  ): ProductionIngredient[] {
    try {
      const ingredients: ProductionIngredient[] = []

      if (!preparation.recipe) return ingredients

      for (const recipeIngredient of preparation.recipe) {
        const requiredQuantity = recipeIngredient.quantity * batchCount

        // Находим батчи этого ингредиента
        const ingredientBatches = availableBatches.filter(
          batch =>
            batch.itemId === recipeIngredient.id &&
            batch.currentQuantity > 0 &&
            batch.status === 'active'
        )

        // Рассчитываем FIFO распределение
        const { allocations } = fifoCalculationService.calculateFifoAllocation(
          ingredientBatches,
          requiredQuantity
        )

        const totalCost = allocations.reduce(
          (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
          0
        )

        const productsStore = useProductsStore()
        const product = productsStore.products.find(p => p.id === recipeIngredient.id)

        ingredients.push({
          itemId: recipeIngredient.id,
          itemType: 'product',
          itemName: product?.name || recipeIngredient.id,
          quantity: requiredQuantity,
          unit: recipeIngredient.unit,
          totalCost,
          batchAllocations: allocations
        })
      }

      return ingredients
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate required ingredients', { error })
      return []
    }
  }

  /**
   * Предварительный расчет производства для UI
   */
  calculateProductionRequirements(
    preparationId: string,
    batchCount: number,
    department: StorageDepartment,
    availableBatches: StorageBatch[]
  ): {
    isValid: boolean
    ingredients: ProductionIngredient[]
    totalCost: number
    outputQuantity: number
    costPerUnit: number
    missingIngredients: any[]
  } {
    try {
      const recipesStore = useRecipesStore()
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)

      if (!preparation) {
        throw new Error('Preparation not found')
      }

      // Валидация ингредиентов
      const validation = this.validateIngredientAvailability(
        preparation,
        batchCount,
        availableBatches
      )

      // Расчет ингредиентов
      const ingredients = this.calculateRequiredIngredients(
        preparation,
        batchCount,
        availableBatches
      )

      const totalCost = ingredients.reduce((sum, ing) => sum + ing.totalCost, 0)
      const outputQuantity = preparation.outputQuantity * batchCount
      const costPerUnit = outputQuantity > 0 ? totalCost / outputQuantity : 0

      return {
        isValid: validation.valid,
        ingredients,
        totalCost,
        outputQuantity,
        costPerUnit,
        missingIngredients: validation.missingIngredients
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate production requirements', { error })
      return {
        isValid: false,
        ingredients: [],
        totalCost: 0,
        outputQuantity: 0,
        costPerUnit: 0,
        missingIngredients: []
      }
    }
  }

  // ==========================================
  // PRODUCTION CREATION
  // ==========================================

  /**
   * Создает операцию производства полуфабриката
   */
  createProductionOperation(
    data: CreateProductionData,
    preparation: Preparation,
    ingredients: ProductionIngredient[],
    operationCounter: number
  ): ProductionOperation {
    try {
      const totalOutputQuantity = preparation.outputQuantity * data.batchCount
      const totalIngredientCost = ingredients.reduce((sum, ing) => sum + ing.totalCost, 0)
      const costPerUnit = totalOutputQuantity > 0 ? totalIngredientCost / totalOutputQuantity : 0

      // Создаем новый батч полуфабриката
      const outputBatch: StorageBatch = {
        id: generateId(),
        batchNumber: generateBatchNumber(preparation.name, TimeUtils.getCurrentLocalISO()),
        itemId: preparation.id,
        itemType: 'preparation',
        department: data.department,
        initialQuantity: totalOutputQuantity,
        currentQuantity: totalOutputQuantity,
        unit: preparation.outputUnit,
        costPerUnit,
        totalValue: totalIngredientCost,
        receiptDate: TimeUtils.getCurrentLocalISO(),
        expiryDate: data.expiryDate,
        sourceType: 'production',
        notes: data.notes,
        status: 'active',
        isActive: true,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Создаем операцию производства
      const operation: ProductionOperation = {
        id: generateId(),
        operationType: 'production',
        documentNumber: `PROD-${String(operationCounter + 1).padStart(3, '0')}`,
        operationDate: TimeUtils.getCurrentLocalISO(),
        department: data.department,
        responsiblePerson: data.responsiblePerson,

        // Production specific data
        preparationId: preparation.id,
        preparationName: preparation.name,
        recipeId: preparation.id,
        batchCount: data.batchCount,
        ingredientConsumption: ingredients,
        outputBatch,

        // Standard operation data
        items: ingredients.map(ing => ({
          id: generateId(),
          itemId: ing.itemId,
          itemType: ing.itemType,
          itemName: ing.itemName,
          quantity: ing.quantity,
          unit: ing.unit,
          batchAllocations: ing.batchAllocations,
          totalCost: ing.totalCost,
          notes: `Used for ${preparation.name} production`
        })),

        totalValue: totalIngredientCost,
        status: 'confirmed',
        notes: data.notes,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      DebugUtils.info(MODULE_NAME, 'Production operation created', {
        preparationName: preparation.name,
        batchCount: data.batchCount,
        outputQuantity: totalOutputQuantity,
        totalCost: totalIngredientCost
      })

      return operation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create production operation', { error })
      throw error
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Генерирует номер батча для полуфабриката
   */
  generateProductionBatchNumber(preparationName: string, batchCount: number): string {
    try {
      const shortName =
        preparationName
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .substring(0, 4) || 'PREP'

      const counter = String(Date.now()).slice(-3)
      const dateStr = TimeUtils.getCurrentLocalISO().substring(0, 10).replace(/-/g, '')
      const batchSuffix = String(batchCount).padStart(2, '0')

      return `B-${shortName}-${batchSuffix}-${counter}-${dateStr}`
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate batch number', { error })
      return generateBatchNumber(preparationName, TimeUtils.getCurrentLocalISO())
    }
  }

  /**
   * Рассчитывает срок годности для полуфабриката
   */
  calculatePreparationExpiry(
    preparationId: string,
    baseDate: string = TimeUtils.getCurrentLocalISO()
  ): string {
    try {
      const recipesStore = useRecipesStore()
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)

      // По умолчанию полуфабрикаты хранятся 2 дня
      const shelfLifeDays = preparation?.shelfLife || 2

      const expiryDate = new Date(baseDate)
      expiryDate.setDate(expiryDate.getDate() + shelfLifeDays)
      expiryDate.setHours(23, 59, 59, 999) // Конец дня

      return expiryDate.toISOString()
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate preparation expiry', { error })

      // Fallback: 2 дня от текущей даты
      const fallbackExpiry = new Date(baseDate)
      fallbackExpiry.setDate(fallbackExpiry.getDate() + 2)
      fallbackExpiry.setHours(23, 59, 59, 999)

      return fallbackExpiry.toISOString()
    }
  }

  /**
   * Валидирует данные производства перед созданием
   */
  validateProductionData(data: CreateProductionData): { valid: boolean; errors: string[] } {
    try {
      const errors: string[] = []

      // Проверяем обязательные поля
      if (!data.preparationId) {
        errors.push('Preparation ID is required')
      }

      if (!data.batchCount || data.batchCount <= 0) {
        errors.push('Batch count must be greater than 0')
      }

      if (!data.department) {
        errors.push('Department is required')
      }

      if (!data.responsiblePerson) {
        errors.push('Responsible person is required')
      }

      // Проверяем существование рецепта
      const recipesStore = useRecipesStore()
      const preparation = recipesStore.preparations.find(p => p.id === data.preparationId)

      if (!preparation) {
        errors.push('Preparation not found')
      } else if (!preparation.recipe || preparation.recipe.length === 0) {
        errors.push('Preparation has no recipe')
      }

      return {
        valid: errors.length === 0,
        errors
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to validate production data', { error })
      return {
        valid: false,
        errors: ['Validation error occurred']
      }
    }
  }
}

export const productionService = new ProductionService()
