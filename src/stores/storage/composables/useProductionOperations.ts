// src/stores/storage/composables/useProductionOperations.ts
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import { productionService } from '../services/productionService'
import { fifoCalculationService } from '../services/fifoCalculationService'
import { storageDataService } from '../services/storageDataService'
import { useRecipesStore } from '@/stores/recipes'
import type {
  StorageBatch,
  StorageDepartment,
  CreateProductionData,
  ProductionOperation,
  ProductionIngredient
} from '../types'
import type { Preparation } from '@/stores/recipes/types'

const MODULE_NAME = 'UseProductionOperations'

/**
 * Composable для производственных операций
 * Отвечает за: production workflow, ingredient validation, recipe integration
 */
export function useProductionOperations() {
  // ==========================================
  // STATE
  // ==========================================
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ==========================================
  // COMPUTED PROPERTIES
  // ==========================================

  const recipesStore = useRecipesStore()

  const availablePreparations = computed(() => {
    try {
      return recipesStore.activePreparations.filter(prep => prep.recipe && prep.recipe.length > 0)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get available preparations', { error: err })
      return []
    }
  })

  // ==========================================
  // VALIDATION METHODS
  // ==========================================

  /**
   * Валидирует доступность ингредиентов для производства
   */
  async function validateIngredientAvailability(
    preparationId: string,
    batchCount: number,
    department: StorageDepartment
  ): Promise<{ valid: boolean; missingIngredients: any[] }> {
    try {
      DebugUtils.info(MODULE_NAME, 'Validating ingredient availability', {
        preparationId,
        batchCount,
        department
      })

      const preparation = recipesStore.preparations.find(p => p.id === preparationId)
      if (!preparation) {
        throw new Error('Preparation not found')
      }

      // Получаем доступные батчи для департамента
      const balances = await storageDataService.getBalances(department)
      const availableBatches: StorageBatch[] = []

      balances.forEach(balance => {
        availableBatches.push(
          ...balance.batches.filter(b => b.status === 'active' && b.currentQuantity > 0)
        )
      })

      const validation = productionService.validateIngredientAvailability(
        preparation,
        batchCount,
        availableBatches
      )

      DebugUtils.info(MODULE_NAME, 'Ingredient validation completed', {
        valid: validation.valid,
        missingCount: validation.missingIngredients.length
      })

      return validation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate ingredients'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
      return { valid: false, missingIngredients: [] }
    }
  }

  /**
   * Рассчитывает максимальное количество порций
   */
  async function calculateMaxBatchCount(
    preparationId: string,
    department: StorageDepartment
  ): Promise<number> {
    try {
      const preparation = recipesStore.preparations.find(p => p.id === preparationId)
      if (!preparation) return 0

      const balances = await storageDataService.getBalances(department)
      const availableBatches: StorageBatch[] = []

      balances.forEach(balance => {
        availableBatches.push(
          ...balance.batches.filter(b => b.status === 'active' && b.currentQuantity > 0)
        )
      })

      return productionService.calculateMaxBatchCount(preparation, availableBatches)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate max batch count', { error: err })
      return 0
    }
  }

  // ==========================================
  // CALCULATION METHODS
  // ==========================================

  /**
   * Рассчитывает требования для производства
   */
  async function calculateProductionRequirements(
    preparationId: string,
    batchCount: number,
    department: StorageDepartment
  ): Promise<{
    isValid: boolean
    ingredients: ProductionIngredient[]
    totalCost: number
    outputQuantity: number
    costPerUnit: number
    missingIngredients: any[]
  }> {
    try {
      DebugUtils.info(MODULE_NAME, 'Calculating production requirements', {
        preparationId,
        batchCount,
        department
      })

      const balances = await storageDataService.getBalances(department)
      const availableBatches: StorageBatch[] = []

      balances.forEach(balance => {
        availableBatches.push(
          ...balance.batches.filter(b => b.status === 'active' && b.currentQuantity > 0)
        )
      })

      const requirements = productionService.calculateProductionRequirements(
        preparationId,
        batchCount,
        department,
        availableBatches
      )

      DebugUtils.info(MODULE_NAME, 'Production requirements calculated', {
        isValid: requirements.isValid,
        totalCost: requirements.totalCost,
        outputQuantity: requirements.outputQuantity
      })

      return requirements
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to calculate production requirements'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err })
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
   * Создает производственную операцию
   */
  async function createProduction(data: CreateProductionData): Promise<ProductionOperation> {
    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Creating production operation', {
        preparationId: data.preparationId,
        batchCount: data.batchCount,
        department: data.department
      })

      // Валидируем данные
      const validation = productionService.validateProductionData(data)
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      const preparation = recipesStore.preparations.find(p => p.id === data.preparationId)
      if (!preparation) {
        throw new Error('Preparation not found')
      }

      // Получаем доступные батчи
      const balances = await storageDataService.getBalances(data.department)
      const availableBatches: StorageBatch[] = []

      balances.forEach(balance => {
        availableBatches.push(
          ...balance.batches.filter(b => b.status === 'active' && b.currentQuantity > 0)
        )
      })

      // Финальная валидация доступности ингредиентов
      const ingredientValidation = productionService.validateIngredientAvailability(
        preparation,
        data.batchCount,
        availableBatches
      )

      if (!ingredientValidation.valid) {
        const missing = ingredientValidation.missingIngredients
          .map(ing => `${ing.name}: need ${ing.missing} ${ing.unit}`)
          .join(', ')
        throw new Error(`Insufficient ingredients: ${missing}`)
      }

      // Рассчитываем ингредиенты
      const ingredients = productionService.calculateRequiredIngredients(
        preparation,
        data.batchCount,
        availableBatches
      )

      // Создаем операцию (в реальной системе это будет через сервис)
      const operationCounter = await getOperationCounter()
      const operation = productionService.createProductionOperation(
        data,
        preparation,
        ingredients,
        operationCounter
      )

      // Обновляем батчи - списываем ингредиенты
      await updateBatchesAfterProduction(ingredients)

      // Добавляем новый батч полуфабриката
      await addProductionBatch(operation.outputBatch)

      DebugUtils.info(MODULE_NAME, 'Production operation created successfully', {
        operationId: operation.id,
        outputQuantity: operation.outputBatch.currentQuantity,
        totalCost: operation.totalValue
      })

      return operation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create production'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { error: err, data })
      throw err
    } finally {
      loading.value = false
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Получает счетчик операций (заглушка для демо)
   */
  async function getOperationCounter(): Promise<number> {
    try {
      const operations = await storageDataService.getOperations()
      return operations.length
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get operation counter', { error: err })
      return 0
    }
  }

  /**
   * Обновляет батчи после использования ингредиентов
   */
  async function updateBatchesAfterProduction(ingredients: ProductionIngredient[]): Promise<void> {
    try {
      // В реальной системе это будет обновлять базу данных
      // Здесь мы просто логируем изменения
      for (const ingredient of ingredients) {
        DebugUtils.info(MODULE_NAME, 'Updating batches for ingredient', {
          itemId: ingredient.itemId,
          quantity: ingredient.quantity,
          allocations: ingredient.batchAllocations.length
        })

        // Симулируем обновление через сервис данных
        // В реальности здесь будет вызов API
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to update batches after production', { error: err })
      throw err
    }
  }

  /**
   * Добавляет новый батч полуфабриката
   */
  async function addProductionBatch(batch: StorageBatch): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Adding production batch', {
        batchId: batch.id,
        itemId: batch.itemId,
        quantity: batch.currentQuantity
      })

      // В реальной системе это будет добавлять батч в базу данных
      // Здесь мы просто логируем
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to add production batch', { error: err })
      throw err
    }
  }

  // ==========================================
  // FORMATTING UTILITIES
  // ==========================================

  /**
   * Форматирует валюту для отображения
   */
  function formatCurrency(amount: number): string {
    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(amount)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to format currency', { error: err, amount })
      return `Rp ${amount.toLocaleString()}`
    }
  }

  /**
   * Форматирует количество с единицей измерения
   */
  function formatQuantity(quantity: number, unit: string): string {
    try {
      return `${quantity.toLocaleString()} ${unit}`
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to format quantity', { error: err, quantity, unit })
      return `${quantity} ${unit}`
    }
  }

  /**
   * Генерирует номер партии для полуфабриката
   */
  function generateProductionBatchNumber(preparationName: string, batchCount: number): string {
    try {
      return productionService.generateProductionBatchNumber(preparationName, batchCount)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate batch number', { error: err })
      return `B-PREP-${Date.now()}`
    }
  }

  /**
   * Рассчитывает срок годности полуфабриката
   */
  function calculatePreparationExpiry(preparationId: string, baseDate?: string): string {
    try {
      return productionService.calculatePreparationExpiry(preparationId, baseDate)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to calculate expiry', { error: err })

      // Fallback: 2 дня от текущей даты
      const fallback = new Date()
      fallback.setDate(fallback.getDate() + 2)
      return fallback.toISOString()
    }
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  function clearError() {
    error.value = null
  }

  function isLoading(): boolean {
    return loading.value
  }

  /**
   * Получает информацию о рецепте
   */
  function getPreparationInfo(preparationId: string): Preparation | null {
    try {
      return recipesStore.preparations.find(p => p.id === preparationId) || null
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get preparation info', { error: err, preparationId })
      return null
    }
  }

  /**
   * Проверяет, можно ли производить полуфабрикат
   */
  async function canProduce(
    preparationId: string,
    department: StorageDepartment
  ): Promise<boolean> {
    try {
      const maxBatch = await calculateMaxBatchCount(preparationId, department)
      return maxBatch > 0
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to check production capability', { error: err })
      return false
    }
  }

  // ==========================================
  // RETURN PUBLIC API
  // ==========================================
  return {
    // State
    loading,
    error,

    // Computed
    availablePreparations,

    // Helper getters
    isLoading,

    // Validation methods
    validateIngredientAvailability,
    calculateMaxBatchCount,

    // Calculation methods
    calculateProductionRequirements,

    // Production operations
    createProduction,

    // Formatting utilities
    formatCurrency,
    formatQuantity,
    generateProductionBatchNumber,
    calculatePreparationExpiry,

    // Utilities
    clearError,
    getPreparationInfo,
    canProduce
  }
}
