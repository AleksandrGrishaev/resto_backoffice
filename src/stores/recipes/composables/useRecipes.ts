// src/stores/recipes/composables/useRecipes.ts - Recipes Logic

import { ref, computed } from 'vue'
import { generateId, DebugUtils } from '@/utils'
import { recipesService } from '../recipesService'
import type {
  Recipe,
  CreateRecipeData,
  RecipeCategory,
  RecipeComponent,
  ProductUsageInRecipe,
  PreparationUsageInRecipe,
  GetProductCallback,
  GetPreparationCostCallback
} from '../types'

const MODULE_NAME = 'useRecipes'

// =============================================
// STATE
// =============================================

// Global state for recipes
const recipes = ref<Recipe[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Integration callbacks
let getProductCallback: GetProductCallback | null = null
let getPreparationCostCallback: GetPreparationCostCallback | null = null

// =============================================
// COMPUTED
// =============================================

export const activeRecipes = computed(() => recipes.value.filter(r => r.isActive))

export const recipesByCategory = computed(() => {
  const categories: Record<RecipeCategory, Recipe[]> = {
    main_dish: [],
    side_dish: [],
    dessert: [],
    appetizer: [],
    beverage: [],
    sauce: []
  }

  activeRecipes.value.forEach(recipe => {
    categories[recipe.category].push(recipe)
  })

  return categories
})

export const recipesStats = computed(() => ({
  total: recipes.value.length,
  active: activeRecipes.value.length,
  inactive: recipes.value.length - activeRecipes.value.length,
  byCategory: Object.entries(recipesByCategory.value).reduce(
    (acc, [category, items]) => {
      acc[category] = items.length
      return acc
    },
    {} as Record<string, number>
  ),
  avgCost:
    recipes.value.length > 0
      ? recipes.value.reduce((sum, r) => sum + (r.cost || 0), 0) / recipes.value.length
      : 0,
  avgComponents:
    recipes.value.length > 0
      ? recipes.value.reduce((sum, r) => sum + r.components.length, 0) / recipes.value.length
      : 0
}))

// =============================================
// MAIN COMPOSABLE
// =============================================

export function useRecipes() {
  // =============================================
  // SETUP METHODS
  // =============================================

  /**
   * Инициализирует данные рецептов
   */
  async function initializeRecipes(initialData: Recipe[] = []): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // If initialData provided, use it (for testing/migration)
      // Otherwise load from Supabase
      if (initialData.length > 0) {
        recipes.value = [...initialData]
        DebugUtils.info(MODULE_NAME, '✅ Recipes initialized with provided data', {
          total: recipes.value.length,
          active: activeRecipes.value.length
        })
      } else {
        // Load from Supabase via recipesService
        const recipesFromSupabase = await recipesService.getAllRecipes()
        recipes.value = recipesFromSupabase

        DebugUtils.info(MODULE_NAME, '✅ Recipes loaded from Supabase', {
          total: recipes.value.length,
          active: activeRecipes.value.length
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize recipes'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Устанавливает callbacks для интеграции
   */
  function setIntegrationCallbacks(
    getProduct: GetProductCallback,
    getPreparationCost: GetPreparationCostCallback
  ): void {
    getProductCallback = getProduct
    getPreparationCostCallback = getPreparationCost
    DebugUtils.info(MODULE_NAME, 'Integration callbacks set for recipes')
  }

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  /**
   * Получает все рецепты
   */
  function getAllRecipes(): Recipe[] {
    return [...recipes.value]
  }

  /**
   * Получает рецепт по ID
   */
  function getRecipeById(id: string): Recipe | null {
    return recipes.value.find(item => item.id === id) || null
  }

  /**
   * Получает рецепты по категории
   */
  function getRecipesByCategory(category: RecipeCategory): Recipe[] {
    return recipes.value.filter(item => item.category === category && item.isActive)
  }

  /**
   * Получает рецепт по коду
   */
  function getRecipeByCode(code: string): Recipe | null {
    return recipes.value.find(item => item.code === code) || null
  }

  /**
   * Проверяет существование кода
   */
  function checkCodeExists(code: string, excludeId?: string): boolean {
    const existing = getRecipeByCode(code)
    return existing !== null && existing.id !== excludeId
  }

  /**
   * Создает новый рецепт
   */
  async function createRecipe(data: CreateRecipeData): Promise<Recipe> {
    try {
      loading.value = true
      error.value = null

      // Use RecipesService to create recipe with UUID generation
      const newRecipe = await recipesService.createRecipe(data)

      // Add to local array for immediate UI update
      recipes.value.push(newRecipe)

      DebugUtils.info(MODULE_NAME, `✅ Recipe created: ${newRecipe.name}`, {
        id: newRecipe.id,
        category: newRecipe.category,
        code: newRecipe.code
      })

      return newRecipe
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create recipe'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err, data })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Обновляет рецепт
   */
  async function updateRecipe(id: string, data: Partial<Recipe>): Promise<Recipe> {
    try {
      loading.value = true
      error.value = null

      const index = recipes.value.findIndex(item => item.id === id)
      if (index === -1) {
        throw new Error('Recipe not found')
      }

      // Проверяем уникальность кода если он изменяется
      if (data.code && data.code !== recipes.value[index].code) {
        if (checkCodeExists(data.code, id)) {
          throw new Error(`Recipe with code ${data.code} already exists`)
        }
      }

      const updatedRecipe = {
        ...recipes.value[index],
        ...data,
        updatedAt: new Date().toISOString()
      }

      recipes.value[index] = updatedRecipe

      DebugUtils.info(MODULE_NAME, `✅ Recipe updated: ${updatedRecipe.name}`, {
        id,
        changes: Object.keys(data)
      })

      return updatedRecipe
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update recipe'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err, id, data })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Удаляет рецепт
   */
  async function deleteRecipe(id: string): Promise<void> {
    try {
      loading.value = true
      error.value = null

      const index = recipes.value.findIndex(item => item.id === id)
      if (index === -1) {
        throw new Error('Recipe not found')
      }

      const recipeName = recipes.value[index].name
      recipes.value.splice(index, 1)

      DebugUtils.info(MODULE_NAME, `✅ Recipe deleted: ${recipeName}`, { id })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete recipe'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err, id })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Переключает статус активности рецепта
   */
  async function toggleRecipeStatus(id: string): Promise<Recipe> {
    const recipe = getRecipeById(id)
    if (!recipe) {
      throw new Error('Recipe not found')
    }

    return updateRecipe(id, { isActive: !recipe.isActive })
  }

  /**
   * Дублирует рецепт
   */
  async function duplicateRecipe(
    recipeId: string,
    newName: string,
    newCode?: string
  ): Promise<Recipe> {
    const original = getRecipeById(recipeId)
    if (!original) {
      throw new Error('Recipe not found')
    }

    const duplicateData: CreateRecipeData = {
      name: newName,
      code: newCode,
      description: original.description,
      category: original.category,
      portionSize: original.portionSize,
      portionUnit: original.portionUnit,
      prepTime: original.prepTime,
      cookTime: original.cookTime,
      difficulty: original.difficulty,
      tags: original.tags ? [...original.tags] : undefined
    }

    const duplicatedRecipe = await createRecipe(duplicateData)

    // Копируем компоненты и инструкции
    const updatedRecipe = await updateRecipe(duplicatedRecipe.id, {
      components: original.components.map(comp => ({
        ...comp,
        id: undefined // Remove manual ID generation - database will generate UUID
      })),
      instructions: original.instructions
        ? original.instructions.map(inst => ({
            ...inst,
            id: undefined // Remove manual ID generation - database will generate UUID
          }))
        : undefined
    })

    return updatedRecipe
  }

  // =============================================
  // COMPONENT MANAGEMENT
  // =============================================

  /**
   * Добавляет компонент в рецепт
   */
  async function addRecipeComponent(
    recipeId: string,
    component: Omit<RecipeComponent, 'id'>
  ): Promise<Recipe> {
    const recipe = getRecipeById(recipeId)
    if (!recipe) {
      throw new Error('Recipe not found')
    }

    const newComponent: RecipeComponent = {
      ...component,
      id: undefined // Remove manual ID generation - database will generate UUID
    }

    const updatedComponents = [...recipe.components, newComponent]

    return updateRecipe(recipeId, { components: updatedComponents })
  }

  /**
   * Обновляет компонент рецепта
   */
  async function updateRecipeComponent(
    recipeId: string,
    componentId: string,
    data: Partial<RecipeComponent>
  ): Promise<Recipe> {
    const recipe = getRecipeById(recipeId)
    if (!recipe) {
      throw new Error('Recipe not found')
    }

    const componentIndex = recipe.components.findIndex(c => c.id === componentId)
    if (componentIndex === -1) {
      throw new Error('Component not found')
    }

    const updatedComponents = [...recipe.components]
    updatedComponents[componentIndex] = {
      ...updatedComponents[componentIndex],
      ...data
    }

    return updateRecipe(recipeId, { components: updatedComponents })
  }

  /**
   * Удаляет компонент из рецепта
   */
  async function removeRecipeComponent(recipeId: string, componentId: string): Promise<Recipe> {
    const recipe = getRecipeById(recipeId)
    if (!recipe) {
      throw new Error('Recipe not found')
    }

    const updatedComponents = recipe.components.filter(c => c.id !== componentId)

    return updateRecipe(recipeId, { components: updatedComponents })
  }

  // =============================================
  // USAGE TRACKING
  // =============================================

  /**
   * Получает использование продукта в рецептах
   */
  function getProductUsageInRecipes(productId: string): ProductUsageInRecipe[] {
    const usage: ProductUsageInRecipe[] = []

    for (const recipe of recipes.value) {
      for (const component of recipe.components) {
        if (component.componentId === productId && component.componentType === 'product') {
          usage.push({
            recipeId: recipe.id,
            recipeName: recipe.name,
            recipeCode: recipe.code,
            quantity: component.quantity,
            unit: component.unit,
            notes: component.notes,
            isActive: recipe.isActive
          })
        }
      }
    }

    return usage
  }

  /**
   * Получает использование полуфабриката в рецептах
   */
  function getPreparationUsageInRecipes(preparationId: string): PreparationUsageInRecipe[] {
    const usage: PreparationUsageInRecipe[] = []

    for (const recipe of recipes.value) {
      for (const component of recipe.components) {
        if (component.componentId === preparationId && component.componentType === 'preparation') {
          usage.push({
            recipeId: recipe.id,
            recipeName: recipe.name,
            recipeCode: recipe.code,
            quantity: component.quantity,
            unit: component.unit,
            notes: component.notes,
            isActive: recipe.isActive
          })
        }
      }
    }

    return usage
  }

  /**
   * Получает рецепты, использующие определенный продукт
   */
  function getRecipesUsingProduct(productId: string): Recipe[] {
    return recipes.value.filter(recipe =>
      recipe.components.some(
        component => component.componentId === productId && component.componentType === 'product'
      )
    )
  }

  /**
   * Получает рецепты, использующие определенный полуфабрикат
   */
  function getRecipesUsingPreparation(preparationId: string): Recipe[] {
    return recipes.value.filter(recipe =>
      recipe.components.some(
        component =>
          component.componentId === preparationId && component.componentType === 'preparation'
      )
    )
  }

  /**
   * Получает статистику использования компонентов
   */
  function getComponentUsageStats(): {
    products: Record<string, number>
    preparations: Record<string, number>
  } {
    const products: Record<string, number> = {}
    const preparations: Record<string, number> = {}

    recipes.value.forEach(recipe => {
      recipe.components.forEach(component => {
        if (component.componentType === 'product') {
          products[component.componentId] = (products[component.componentId] || 0) + 1
        } else if (component.componentType === 'preparation') {
          preparations[component.componentId] = (preparations[component.componentId] || 0) + 1
        }
      })
    })

    return { products, preparations }
  }

  // =============================================
  // SEARCH AND FILTERING
  // =============================================

  /**
   * Поиск рецептов по различным критериям
   */
  function searchRecipes(query: {
    text?: string
    category?: RecipeCategory
    difficulty?: 'easy' | 'medium' | 'hard'
    tags?: string[]
    maxCost?: number
    minCost?: number
    maxPrepTime?: number
    maxCookTime?: number
  }): Recipe[] {
    let filtered = activeRecipes.value

    if (query.text) {
      const searchText = query.text.toLowerCase()
      filtered = filtered.filter(
        recipe =>
          recipe.name.toLowerCase().includes(searchText) ||
          recipe.description?.toLowerCase().includes(searchText) ||
          recipe.tags?.some(tag => tag.toLowerCase().includes(searchText))
      )
    }

    if (query.category) {
      filtered = filtered.filter(recipe => recipe.category === query.category)
    }

    if (query.difficulty) {
      filtered = filtered.filter(recipe => recipe.difficulty === query.difficulty)
    }

    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter(
        recipe => recipe.tags && query.tags!.some(tag => recipe.tags!.includes(tag))
      )
    }

    if (query.maxCost !== undefined) {
      filtered = filtered.filter(recipe => (recipe.cost || 0) <= query.maxCost!)
    }

    if (query.minCost !== undefined) {
      filtered = filtered.filter(recipe => (recipe.cost || 0) >= query.minCost!)
    }

    if (query.maxPrepTime !== undefined) {
      filtered = filtered.filter(recipe => (recipe.prepTime || 0) <= query.maxPrepTime!)
    }

    if (query.maxCookTime !== undefined) {
      filtered = filtered.filter(recipe => (recipe.cookTime || 0) <= query.maxCookTime!)
    }

    return filtered
  }

  /**
   * Получает все уникальные теги
   */
  function getAllTags(): string[] {
    const tags = new Set<string>()

    recipes.value.forEach(recipe => {
      recipe.tags?.forEach(tag => tags.add(tag))
    })

    return Array.from(tags).sort()
  }

  // =============================================
  // VALIDATION
  // =============================================

  /**
   * Валидирует рецепт для расчета стоимости
   */
  function validateRecipeForCosting(recipeId: string): { isValid: boolean; errors: string[] } {
    const recipe = getRecipeById(recipeId)
    if (!recipe) {
      return {
        isValid: false,
        errors: ['Recipe not found']
      }
    }

    const errors: string[] = []

    if (!recipe.components || recipe.components.length === 0) {
      errors.push('No recipe components defined')
    }

    if (recipe.portionSize <= 0) {
      errors.push('Portion size must be greater than 0')
    }

    recipe.components.forEach((component, index) => {
      if (!component.componentId) {
        errors.push(`Component ${index + 1}: Component ID is required`)
      }
      if (!component.componentType) {
        errors.push(`Component ${index + 1}: Component type is required`)
      }
      if (component.quantity <= 0) {
        errors.push(`Component ${index + 1}: Quantity must be greater than 0`)
      }
      if (!component.unit) {
        errors.push(`Component ${index + 1}: Unit is required`)
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
   * Получает следующий доступный код для рецепта
   */
  function getNextAvailableCode(category: RecipeCategory): string {
    const prefixes: Record<RecipeCategory, string> = {
      main_dish: 'R-M',
      side_dish: 'R-S',
      dessert: 'R-D',
      appetizer: 'R-A',
      beverage: 'R-B',
      sauce: 'R-SC'
    }

    const prefix = prefixes[category]
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
   * Экспортирует рецепты для бэкапа
   */
  function exportRecipes(): {
    recipes: Recipe[]
    exportedAt: string
    version: string
  } {
    return {
      recipes: [...recipes.value],
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }
  }

  /**
   * Импортирует рецепты из бэкапа
   */
  async function importRecipes(data: { recipes: Recipe[]; version?: string }): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // Валидируем данные
      if (!Array.isArray(data.recipes)) {
        throw new Error('Invalid recipes data format')
      }

      // Проверяем конфликты кодов
      const conflicts: string[] = []
      data.recipes.forEach(recipe => {
        if (recipe.code && checkCodeExists(recipe.code)) {
          conflicts.push(recipe.code)
        }
      })

      if (conflicts.length > 0) {
        throw new Error(`Code conflicts found: ${conflicts.join(', ')}`)
      }

      // Импортируем
      recipes.value.push(...data.recipes)

      DebugUtils.info(MODULE_NAME, '✅ Recipes imported successfully', {
        imported: data.recipes.length,
        total: recipes.value.length
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import recipes'
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
    recipes,
    loading,
    error,

    // Computed
    activeRecipes,
    recipesByCategory,
    recipesStats,

    // Setup
    initializeRecipes,
    setIntegrationCallbacks,

    // CRUD
    getAllRecipes,
    getRecipeById,
    getRecipesByCategory,
    getRecipeByCode,
    checkCodeExists,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleRecipeStatus,
    duplicateRecipe,

    // Component management
    addRecipeComponent,
    updateRecipeComponent,
    removeRecipeComponent,

    // Usage tracking
    getProductUsageInRecipes,
    getPreparationUsageInRecipes,
    getRecipesUsingProduct,
    getRecipesUsingPreparation,
    getComponentUsageStats,

    // Search and filtering
    searchRecipes,
    getAllTags,

    // Validation
    validateRecipeForCosting,

    // Utilities
    clearError,
    getNextAvailableCode,
    exportRecipes,
    importRecipes
  }
}
