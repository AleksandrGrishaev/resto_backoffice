// src/stores/storage/composables/useStorageOperations.ts
import { ref, computed } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { TimeUtils, DebugUtils, generateId } from '@/utils'
import type {
  StorageBatch,
  StorageBalance,
  StorageOperation,
  StorageDepartment,
  StorageItemType,
  BatchAllocation
} from '../types'
import type { Preparation } from '@/stores/recipes/types'

const MODULE_NAME = 'StorageOperations'

// ==========================================
// ТИПЫ ДЛЯ COMPOSABLE
// ==========================================

export interface ExpiryInfo {
  nearestExpiry: string | null
  expiryStatus: 'fresh' | 'expiring' | 'expired'
  expiryDaysRemaining: number | null
  hasExpired: boolean
  hasNearExpiry: boolean
}

export interface ProductionData {
  preparationId: string
  batchCount: number // Количество партий рецепта
  department: StorageDepartment
  responsiblePerson: string
  expiryDate?: string // Срок годности готового полуфабриката
  notes?: string
}

export interface ProductionOperation {
  id: string
  operationType: 'production'
  documentNumber: string
  operationDate: string
  department: StorageDepartment
  responsiblePerson: string

  // Производственная информация
  preparationId: string
  preparationName: string
  recipeId: string
  batchCount: number

  // Списанные ингредиенты
  ingredientConsumption: ProductionIngredient[]

  // Созданная партия полуфабриката
  outputBatch: StorageBatch

  totalValue: number
  status: 'confirmed'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ProductionIngredient {
  itemId: string
  itemType: StorageItemType
  itemName: string
  quantity: number
  unit: string
  totalCost: number
  batchAllocations: BatchAllocation[]
}

// ==========================================
// ОСНОВНОЙ COMPOSABLE
// ==========================================

export function useStorageOperations() {
  const recipesStore = useRecipesStore()
  const productsStore = useProductsStore()

  const loading = ref(false)
  const error = ref<string | null>(null)

  // ==========================================
  // РАБОТА СО СРОКАМИ ГОДНОСТИ
  // ==========================================

  /**
   * Рассчитывает информацию о сроке годности для товара
   */
  function calculateExpiryInfo(batches: StorageBatch[]): ExpiryInfo {
    if (!batches || batches.length === 0) {
      return {
        nearestExpiry: null,
        expiryStatus: 'fresh',
        expiryDaysRemaining: null,
        hasExpired: false,
        hasNearExpiry: false
      }
    }

    // Фильтруем активные батчи со сроком годности
    const activeBatchesWithExpiry = batches.filter(
      batch => batch.currentQuantity > 0 && batch.expiryDate
    )

    if (activeBatchesWithExpiry.length === 0) {
      return {
        nearestExpiry: null,
        expiryStatus: 'fresh',
        expiryDaysRemaining: null,
        hasExpired: false,
        hasNearExpiry: false
      }
    }

    // Сортируем по дате истечения (FIFO - ближайший срок первый)
    const sortedBatches = activeBatchesWithExpiry.sort((a, b) => {
      const dateA = new Date(a.expiryDate!).getTime()
      const dateB = new Date(b.expiryDate!).getTime()
      return dateA - dateB
    })

    const nearestBatch = sortedBatches[0]
    const nearestExpiry = nearestBatch.expiryDate!
    const now = new Date()
    const expiryDate = new Date(nearestExpiry)

    // Рассчитываем дни до истечения
    const timeDiff = expiryDate.getTime() - now.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

    // Определяем статус
    let expiryStatus: 'fresh' | 'expiring' | 'expired'
    let hasExpired = false
    let hasNearExpiry = false

    if (daysDiff < 0) {
      expiryStatus = 'expired'
      hasExpired = true
    } else if (daysDiff <= 2) {
      expiryStatus = 'expiring'
      hasNearExpiry = true
    } else {
      expiryStatus = 'fresh'
    }

    return {
      nearestExpiry,
      expiryStatus,
      expiryDaysRemaining: daysDiff >= 0 ? daysDiff : null,
      hasExpired,
      hasNearExpiry
    }
  }

  /**
   * Форматирует дату истечения для отображения
   */
  function formatExpiryDate(expiryInfo: ExpiryInfo): string {
    if (!expiryInfo.nearestExpiry) return '-'

    const date = new Date(expiryInfo.nearestExpiry)
    const today = new Date()
    const diffDays = expiryInfo.expiryDaysRemaining

    if (expiryInfo.hasExpired) {
      return `Expired ${Math.abs(diffDays || 0)} days ago`
    }

    if (diffDays === 0) {
      return 'Expires today'
    }

    if (diffDays === 1) {
      return 'Expires tomorrow'
    }

    if (diffDays && diffDays <= 7) {
      return `${diffDays} days left`
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  /**
   * Получает цвет для статуса срока годности
   */
  function getExpiryStatusColor(expiryInfo: ExpiryInfo): string {
    switch (expiryInfo.expiryStatus) {
      case 'expired':
        return 'error'
      case 'expiring':
        return 'warning'
      default:
        return 'success'
    }
  }

  /**
   * Получает иконку для статуса срока годности
   */
  function getExpiryStatusIcon(expiryInfo: ExpiryInfo): string {
    switch (expiryInfo.expiryStatus) {
      case 'expired':
        return 'mdi-alert-circle'
      case 'expiring':
        return 'mdi-clock-alert'
      default:
        return 'mdi-check-circle'
    }
  }

  // ==========================================
  // FIFO РАСЧЕТЫ
  // ==========================================

  /**
   * Рассчитывает FIFO распределение для списания
   */
  function calculateFifoAllocation(
    batches: StorageBatch[],
    quantity: number
  ): { allocations: BatchAllocation[]; remainingQuantity: number } {
    const allocations: BatchAllocation[] = []
    let remainingQuantity = quantity

    // Сортируем батчи по дате поступления (FIFO - старейший первый)
    const sortedBatches = [...batches]
      .filter(batch => batch.currentQuantity > 0)
      .sort((a, b) => new Date(a.receiptDate).getTime() - new Date(b.receiptDate).getTime())

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0) break

      const allocatedQuantity = Math.min(batch.currentQuantity, remainingQuantity)

      if (allocatedQuantity > 0) {
        allocations.push({
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: allocatedQuantity,
          costPerUnit: batch.costPerUnit,
          batchDate: batch.receiptDate
        })

        remainingQuantity -= allocatedQuantity
      }
    }

    return { allocations, remainingQuantity }
  }

  /**
   * Рассчитывает стоимость списания по FIFO
   */
  function calculateConsumptionCost(batches: StorageBatch[], quantity: number): number {
    const { allocations } = calculateFifoAllocation(batches, quantity)
    return allocations.reduce(
      (total, allocation) => total + allocation.quantity * allocation.costPerUnit,
      0
    )
  }

  // ==========================================
  // ПРОИЗВОДСТВО ПОЛУФАБРИКАТОВ
  // ==========================================

  /**
   * Получает доступные рецепты полуфабрикатов для производства
   */
  const availablePreparations = computed(() => {
    return recipesStore.activePreparations.filter(prep => prep.recipe && prep.recipe.length > 0)
  })

  /**
   * Валидирует доступность ингредиентов для производства
   */
  function validateIngredientAvailability(
    preparation: Preparation,
    batchCount: number,
    availableBatches: StorageBatch[]
  ): { valid: boolean; missingIngredients: any[] } {
    const missingIngredients: any[] = []

    for (const ingredient of preparation.recipe || []) {
      const requiredQuantity = ingredient.quantity * batchCount

      // Находим все батчи этого ингредиента
      const ingredientBatches = availableBatches.filter(
        batch => batch.itemId === ingredient.id && batch.currentQuantity > 0
      )

      const availableQuantity = ingredientBatches.reduce(
        (sum, batch) => sum + batch.currentQuantity,
        0
      )

      if (availableQuantity < requiredQuantity) {
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
  }

  /**
   * Рассчитывает требуемые ингредиенты для производства
   */
  function calculateRequiredIngredients(
    preparation: Preparation,
    batchCount: number,
    availableBatches: StorageBatch[]
  ): ProductionIngredient[] {
    const ingredients: ProductionIngredient[] = []

    for (const recipeIngredient of preparation.recipe || []) {
      const requiredQuantity = recipeIngredient.quantity * batchCount

      // Находим батчи этого ингредиента
      const ingredientBatches = availableBatches.filter(
        batch => batch.itemId === recipeIngredient.id && batch.currentQuantity > 0
      )

      // Рассчитываем FIFO распределение
      const { allocations } = calculateFifoAllocation(ingredientBatches, requiredQuantity)
      const totalCost = allocations.reduce(
        (sum, alloc) => sum + alloc.quantity * alloc.costPerUnit,
        0
      )

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
  }

  /**
   * Создает операцию производства полуфабриката
   */
  function createProductionOperation(
    data: ProductionData,
    preparation: Preparation,
    ingredients: ProductionIngredient[],
    operationCounter: number
  ): ProductionOperation {
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

      preparationId: preparation.id,
      preparationName: preparation.name,
      recipeId: preparation.id,
      batchCount: data.batchCount,

      ingredientConsumption: ingredients,
      outputBatch,

      totalValue: totalIngredientCost,
      status: 'confirmed',
      notes: data.notes,
      createdAt: TimeUtils.getCurrentLocalISO(),
      updatedAt: TimeUtils.getCurrentLocalISO()
    }

    return operation
  }

  /**
   * Обновляет батчи после списания ингредиентов
   */
  function updateBatchesAfterConsumption(
    batches: StorageBatch[],
    allocations: BatchAllocation[]
  ): StorageBatch[] {
    const updatedBatches = [...batches]

    for (const allocation of allocations) {
      const batchIndex = updatedBatches.findIndex(b => b.id === allocation.batchId)
      if (batchIndex !== -1) {
        const batch = updatedBatches[batchIndex]

        // Обновляем количество
        batch.currentQuantity -= allocation.quantity
        batch.totalValue = batch.currentQuantity * batch.costPerUnit
        batch.updatedAt = TimeUtils.getCurrentLocalISO()

        // Если батч исчерпан, помечаем как неактивный
        if (batch.currentQuantity <= 0) {
          batch.status = 'consumed'
          batch.isActive = false
          batch.currentQuantity = 0
          batch.totalValue = 0
        }
      }
    }

    return updatedBatches
  }

  // ==========================================
  // УТИЛИТЫ
  // ==========================================

  /**
   * Генерирует номер батча
   */
  function generateBatchNumber(itemName: string, date: string): string {
    const shortName =
      itemName
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .substring(0, 4) || 'ITEM'
    const counter = String(Date.now()).slice(-3)
    const dateStr = date.substring(0, 10).replace(/-/g, '')
    return `B-${shortName}-${counter}-${dateStr}`
  }

  /**
   * Форматирует валюту
   */
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Логирование ошибок
   */
  function handleError(message: string, error: any) {
    DebugUtils.error(MODULE_NAME, message, { error })
    error.value = message
  }

  /**
   * Очистка ошибок
   */
  function clearError() {
    error.value = null
  }

  // ==========================================
  // ВОЗВРАЩАЕМ PUBLIC API
  // ==========================================

  return {
    // Состояние
    loading,
    error,

    // Срок годности
    calculateExpiryInfo,
    formatExpiryDate,
    getExpiryStatusColor,
    getExpiryStatusIcon,

    // FIFO расчеты
    calculateFifoAllocation,
    calculateConsumptionCost,

    // Производство полуфабрикатов
    availablePreparations,
    validateIngredientAvailability,
    calculateRequiredIngredients,
    createProductionOperation,
    updateBatchesAfterConsumption,

    // Утилиты
    generateBatchNumber,
    formatCurrency,
    handleError,
    clearError
  }
}
