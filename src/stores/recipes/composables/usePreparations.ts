// src/stores/recipes/composables/usePreparations.ts - Preparations Logic

import { ref, computed } from 'vue'
import { generateId, DebugUtils } from '@/utils'
import type {
  Preparation,
  CreatePreparationData,
  PreparationType,
  ProductUsageInPreparation,
  GetProductCallback,
  PreparationCategoryDisplay
} from '../types'
import type { preparationService } from '@/stores/preparation/preparationService'
import type { PreparationCategoryDisplay } from '@/stores/preparation/types'

const MODULE_NAME = 'usePreparations'

// =============================================
// STATE
// =============================================

// Global state for preparations
const preparations = ref<Preparation[]>([])
const categories = ref<PreparationCategoryDisplay[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Integration callback
let getProductCallback: GetProductCallback | null = null

// =============================================
// COMPUTED
// =============================================

export const activePreparations = computed(() => preparations.value.filter(p => p.isActive))

export const preparationsByType = computed(() => {
  const types: Record<PreparationType, Preparation[]> = {
    sauce: [],
    garnish: [],
    marinade: [],
    semifinished: [],
    seasoning: []
  }

  activePreparations.value.forEach(preparation => {
    types[preparation.type].push(preparation)
  })

  return types
})

export const preparationsStats = computed(() => ({
  total: preparations.value.length,
  active: activePreparations.value.length,
  inactive: preparations.value.length - activePreparations.value.length,
  byType: Object.entries(preparationsByType.value).reduce(
    (acc, [type, items]) => {
      acc[type] = items.length
      return acc
    },
    {} as Record<string, number>
  )
}))

export const preparationCategories = computed(() => categories.value)

// =============================================
// MAIN COMPOSABLE
// =============================================

export function usePreparations() {
  // =============================================
  // SETUP METHODS
  // =============================================

  /**
   * Инициализирует данные полуфабрикатов
   */
  async function initializePreparations(initialData: Preparation[] = []): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // If initialData provided, use it (for testing/migration)
      // Otherwise load from Supabase
      if (initialData.length > 0) {
        preparations.value = [...initialData]
        DebugUtils.info(MODULE_NAME, '✅ Preparations initialized with provided data', {
          total: preparations.value.length,
          active: activePreparations.value.length
        })
      } else {
        // Load from Supabase via preparationService (includes categories)
        const { preparationService } = await import('@/stores/preparation/preparationService')
        const preparationsFromSupabase = await preparationService.fetchPreparations()
        preparations.value = preparationsFromSupabase

        // Load categories from preparationService
        const preparationCategories = await preparationService.fetchCategories()
        categories.value = preparationCategories

        DebugUtils.info(MODULE_NAME, '✅ Preparations loaded from Supabase', {
          total: preparations.value.length,
          active: activePreparations.value.length
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize preparations'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Устанавливает callback для получения продуктов
   */
  function setProductProvider(callback: GetProductCallback): void {
    getProductCallback = callback
    DebugUtils.info(MODULE_NAME, 'Product provider callback set')
  }

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  /**
   * Получает все полуфабрикаты
   */
  function getAllPreparations(): Preparation[] {
    return [...preparations.value]
  }

  /**
   * Получает полуфабрикат по ID
   */
  function getPreparationById(id: string): Preparation | null {
    return preparations.value.find(item => item.id === id) || null
  }

  /**
   * Получает полуфабрикаты по типу
   */
  function getPreparationsByType(type: PreparationType): Preparation[] {
    return preparations.value.filter(item => item.type === type && item.isActive)
  }

  /**
   * Получает полуфабрикат по коду
   */
  function getPreparationByCode(code: string): Preparation | null {
    return preparations.value.find(item => item.code === code) || null
  }

  /**
   * Проверяет существование кода
   */
  function checkCodeExists(code: string, excludeId?: string): boolean {
    const existing = getPreparationByCode(code)
    return existing !== null && existing.id !== excludeId
  }

  /**
   * Создает новый полуфабрикат
   */
  async function createPreparation(data: CreatePreparationData): Promise<Preparation> {
    try {
      loading.value = true
      error.value = null

      // Генерируем код, если он не предоставлен
      let code = data.code
      if (!code) {
        code = getNextAvailableCode(data.type)
      } else {
        // Проверяем уникальность кода, если он предоставлен
        if (checkCodeExists(code)) {
          const message = `Preparation with code ${code} already exists`
          error.value = message
          DebugUtils.error(MODULE_NAME, message, { code, data })
          throw new Error(message)
        }
      }

      const preparation: Preparation = {
        ...data,
        code, // Используем сгенерированный или предоставленный код
        id: generateId(),
        isActive: true,
        costPerPortion: 0,
        recipe: data.recipe || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      preparations.value.push(preparation)

      DebugUtils.info(MODULE_NAME, `✅ Preparation created: ${preparation.name}`, {
        id: preparation.id,
        code: preparation.code,
        type: preparation.type
      })

      return preparation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create preparation'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err, data })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Обновляет полуфабрикат
   */
  async function updatePreparation(id: string, data: Partial<Preparation>): Promise<Preparation> {
    try {
      loading.value = true
      error.value = null

      const index = preparations.value.findIndex(item => item.id === id)
      if (index === -1) {
        throw new Error('Preparation not found')
      }

      // Проверяем уникальность кода если он изменяется
      if (data.code && data.code !== preparations.value[index].code) {
        if (checkCodeExists(data.code, id)) {
          const message = `Preparation with code ${data.code} already exists`
          error.value = message
          DebugUtils.error(MODULE_NAME, message, { code, id, data })
          throw new Error(message)
        }
      }

      const updatedPreparation = {
        ...preparations.value[index],
        ...data,
        updatedAt: new Date().toISOString()
      }

      preparations.value[index] = updatedPreparation

      DebugUtils.info(MODULE_NAME, `✅ Preparation updated: ${updatedPreparation.name}`, {
        id,
        changes: Object.keys(data)
      })

      return updatedPreparation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update preparation'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err, id, data })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Удаляет полуфабрикат
   */
  async function deletePreparation(id: string): Promise<void> {
    try {
      loading.value = true
      error.value = null

      const index = preparations.value.findIndex(item => item.id === id)
      if (index === -1) {
        throw new Error('Preparation not found')
      }

      const preparationName = preparations.value[index].name
      preparations.value.splice(index, 1)

      DebugUtils.info(MODULE_NAME, `✅ Preparation deleted: ${preparationName}`, { id })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete preparation'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err, id })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Переключает статус активности полуфабриката
   */
  async function togglePreparationStatus(id: string): Promise<Preparation> {
    const preparation = getPreparationById(id)
    if (!preparation) {
      throw new Error('Preparation not found')
    }

    return updatePreparation(id, { isActive: !preparation.isActive })
  }

  /**
   * Дублирует полуфабрикат
   */
  async function duplicatePreparation(
    preparationId: string,
    newName: string,
    newCode: string
  ): Promise<Preparation> {
    const original = getPreparationById(preparationId)
    if (!original) {
      throw new Error('Preparation not found')
    }

    const duplicateData: CreatePreparationData = {
      name: newName,
      code: newCode,
      type: original.type,
      description: original.description,
      outputQuantity: original.outputQuantity,
      outputUnit: original.outputUnit,
      preparationTime: original.preparationTime,
      instructions: original.instructions,
      recipe: [...original.recipe] // deep copy
    }

    return createPreparation(duplicateData)
  }

  // =============================================
  // USAGE TRACKING
  // =============================================

  /**
   * Получает использование продукта в полуфабрикатах
   */
  function getProductUsageInPreparations(productId: string): ProductUsageInPreparation[] {
    const usage: ProductUsageInPreparation[] = []

    for (const preparation of preparations.value) {
      for (const ingredient of preparation.recipe) {
        if (ingredient.id === productId) {
          usage.push({
            preparationId: preparation.id,
            preparationName: preparation.name,
            preparationCode: preparation.code,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes,
            isActive: preparation.isActive
          })
        }
      }
    }

    return usage
  }

  /**
   * Получает полуфабрикаты, использующие определенный продукт
   */
  function getPreparationsUsingProduct(productId: string): Preparation[] {
    return preparations.value.filter(preparation =>
      preparation.recipe.some(ingredient => ingredient.id === productId)
    )
  }

  /**
   * Получает статистику использования продуктов
   */
  function getProductUsageStats(): Record<string, number> {
    const stats: Record<string, number> = {}

    preparations.value.forEach(preparation => {
      preparation.recipe.forEach(ingredient => {
        stats[ingredient.id] = (stats[ingredient.id] || 0) + 1
      })
    })

    return stats
  }

  // =============================================
  // INTEGRATION HELPERS
  // =============================================

  /**
   * Получает полуфабрикаты для использования в рецептах
   */
  function getPreparationsForRecipes() {
    return activePreparations.value.map(prep => ({
      id: prep.id,
      name: prep.name,
      code: prep.code,
      type: prep.type,
      outputQuantity: prep.outputQuantity,
      outputUnit: prep.outputUnit,
      costPerOutputUnit: prep.costPerPortion || 0,
      isActive: prep.isActive
    }))
  }

  /**
   * Валидирует полуфабрикат для расчета стоимости
   */
  function validatePreparationForCosting(preparationId: string): {
    isValid: boolean
    errors: string[]
  } {
    const preparation = getPreparationById(preparationId)
    if (!preparation) {
      return {
        isValid: false,
        errors: ['Preparation not found']
      }
    }

    const errors: string[] = []

    if (!preparation.recipe || preparation.recipe.length === 0) {
      errors.push('No recipe ingredients defined')
    }

    if (preparation.outputQuantity <= 0) {
      errors.push('Output quantity must be greater than 0')
    }

    preparation.recipe.forEach((ingredient, index) => {
      if (!ingredient.id) {
        errors.push(`Ingredient ${index + 1}: Product ID is required`)
      }
      if (ingredient.quantity <= 0) {
        errors.push(`Ingredient ${index + 1}: Quantity must be greater than 0`)
      }
      if (!ingredient.unit) {
        errors.push(`Ingredient ${index + 1}: Unit is required`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
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
   * Получает следующий доступный код для полуфабриката
   */
  function getNextAvailableCode(type: PreparationType): string {
    const prefix = 'P'
    let counter = 1

    while (true) {
      const code = `${prefix}-${counter.toString().padStart(3, '0')}`
      if (!checkCodeExists(code)) {
        return code
      }
      counter++
    }
  }

  /**
   * Экспортирует полуфабрикаты для бэкапа
   */
  function exportPreparations(): {
    preparations: Preparation[]
    exportedAt: string
    version: string
  } {
    return {
      preparations: [...preparations.value],
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }
  }

  /**
   * Импортирует полуфабрикаты из бэкапа
   */
  async function importPreparations(data: {
    preparations: Preparation[]
    version?: string
  }): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // Валидируем данные
      if (!Array.isArray(data.preparations)) {
        throw new Error('Invalid preparations data format')
      }

      // Проверяем конфликты кодов
      const conflicts: string[] = []
      data.preparations.forEach(prep => {
        if (checkCodeExists(prep.code)) {
          conflicts.push(prep.code)
        }
      })

      if (conflicts.length > 0) {
        throw new Error(`Code conflicts found: ${conflicts.join(', ')}`)
      }

      // Импортируем
      preparations.value.push(...data.preparations)

      DebugUtils.info(MODULE_NAME, '✅ Preparations imported successfully', {
        imported: data.preparations.length,
        total: preparations.value.length
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import preparations'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // =============================================
  // RETURN COMPOSABLE
  // =============================================

  return {
    // State
    preparations: preparations,
    loading,
    error,

    // Computed
    activePreparations,
    preparationsByType,
    preparationsStats,
    preparationCategories,

    // Setup
    initializePreparations,
    setProductProvider,

    // CRUD
    getAllPreparations,
    getPreparationById,
    getPreparationsByType,
    getPreparationByCode,
    checkCodeExists,
    createPreparation,
    updatePreparation,
    deletePreparation,
    togglePreparationStatus,
    duplicatePreparation,

    // Usage tracking
    getProductUsageInPreparations,
    getPreparationsUsingProduct,
    getProductUsageStats,

    // Integration
    getPreparationsForRecipes,
    validatePreparationForCosting,

    // Utilities
    clearError,
    getNextAvailableCode,
    exportPreparations,
    importPreparations
  }
}
