// src/stores/recipes/recipesStore.ts - Updated with Composables Integration

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { DebugUtils } from '@/utils'

// Import composables
import { usePreparations } from './composables/usePreparations'
import { useRecipes } from './composables/useRecipes'
import { useCostCalculation } from './composables/useCostCalculation'
import { useRecipeIntegration } from './composables/useRecipeIntegration'
import { useMenuRecipeLinks } from './composables/useMenuRecipeLinks'
import { useUnits } from './composables/useUnits'

// Import mock data
import { mockPreparations, mockRecipes } from './recipesMock'
import { mockUnits } from './unitsMock'

// Import legacy services for backward compatibility
import {
  PreparationService,
  RecipeService,
  MenuRecipeLinkService,
  UnitService
} from './recipesService'

import type {
  Recipe,
  Preparation,
  CreateRecipeData,
  CreatePreparationData,
  PreparationPlanCost,
  RecipePlanCost
} from './types'

const MODULE_NAME = 'RecipesStore'

// =============================================
// STORE DEFINITION
// =============================================

export const useRecipesStore = defineStore('recipes', () => {
  // =============================================
  // COMPOSABLES SETUP
  // =============================================

  // Initialize all composables
  const preparationsComposable = usePreparations()
  const recipesComposable = useRecipes()
  const costCalculationComposable = useCostCalculation()
  const integrationComposable = useRecipeIntegration()
  const menuLinksComposable = useMenuRecipeLinks()
  const unitsComposable = useUnits()

  // =============================================
  // LEGACY SERVICES (for backward compatibility)
  // =============================================

  const preparationService = new PreparationService(mockPreparations)
  const recipeService = new RecipeService(mockRecipes)
  const menuRecipeLinkService = new MenuRecipeLinkService([])
  const unitService = new UnitService(mockUnits)

  // =============================================
  // STORE STATE
  // =============================================

  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false) // 🆕 Флаг инициализации
  const selectedRecipe = ref<Recipe | null>(null)
  const selectedPreparation = ref<Preparation | null>(null)

  // =============================================
  // COMPUTED PROPERTIES
  // =============================================

  // Re-export composable computed properties
  const activeRecipes = computed(() => recipesComposable.activeRecipes.value)
  const activePreparations = computed(() => preparationsComposable.activePreparations.value)
  const recipesByCategory = computed(() => recipesComposable.recipesByCategory.value)
  const preparationsByType = computed(() => preparationsComposable.preparationsByType.value)

  // Store-level computed properties
  const state = computed(() => ({
    loading: loading.value,
    error: error.value,
    selectedRecipe: selectedRecipe.value,
    selectedPreparation: selectedPreparation.value
  }))

  const statistics = computed(() => ({
    recipes: recipesComposable.recipesStats.value,
    preparations: preparationsComposable.preparationsStats.value,
    costs: costCalculationComposable.costCalculationsStats.value
  }))

  // =============================================
  // MAIN ACTIONS
  // =============================================

  /**
   * Инициализирует Recipe Store с интеграцией
   */
  async function initialize(): Promise<void> {
    // Если уже инициализирован, не делаем ничего
    if (initialized.value) {
      DebugUtils.info(MODULE_NAME, 'Recipe Store already initialized')
      return
    }

    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, '🚀 Initializing Recipe Store with composables')

      // 1. Инициализируем базовые данные
      await Promise.all([
        preparationsComposable.initializePreparations(mockPreparations),
        recipesComposable.initializeRecipes(mockRecipes),
        menuLinksComposable.initializeMenuRecipeLinks([]),
        unitsComposable.initializeUnits(mockUnits),
        costCalculationComposable.initializeCostCalculations()
      ])

      // 2. Настраиваем интеграцию с Product Store
      await integrationComposable.setupProductStoreIntegration()

      // 3. Устанавливаем integration callbacks
      const callbacks = setupIntegrationCallbacks()
      costCalculationComposable.setIntegrationCallbacks(
        callbacks.getProduct,
        callbacks.getPreparationCost
      )
      recipesComposable.setIntegrationCallbacks(callbacks.getProduct, callbacks.getPreparationCost)

      // 4. Пересчитываем стоимости
      await recalculateAllCosts()

      // 🆕 Устанавливаем флаг инициализации
      initialized.value = true

      DebugUtils.info(MODULE_NAME, '✅ Recipe Store initialized successfully', {
        preparations: activePreparations.value.length,
        recipes: activeRecipes.value.length,
        units: unitsComposable.units.value.length
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize Recipe Store'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Настраивает integration callbacks
   */
  function setupIntegrationCallbacks() {
    const getProduct = async (productId: string) => {
      return integrationComposable.getProductForRecipe(productId)
    }

    const getPreparationCost = async (preparationId: string) => {
      return costCalculationComposable.getPreparationCost(preparationId)
    }

    return { getProduct, getPreparationCost }
  }

  // =============================================
  // PREPARATION ACTIONS
  // =============================================

  async function fetchPreparations(): Promise<void> {
    // Already handled by composable initialization
    DebugUtils.debug(MODULE_NAME, 'Preparations already loaded via composables')
  }

  async function createPreparation(data: CreatePreparationData): Promise<Preparation> {
    try {
      loading.value = true
      const preparation = await preparationsComposable.createPreparation(data)

      // Рассчитываем стоимость
      await costCalculationComposable.calculatePreparationCost(preparation)

      // Обновляем usage в Product Store
      await integrationComposable.updateUsageForAllProducts()

      DebugUtils.info(MODULE_NAME, 'Preparation created with cost calculation', {
        id: preparation.id,
        name: preparation.name
      })

      return preparation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create preparation'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updatePreparation(id: string, data: Partial<Preparation>): Promise<Preparation> {
    try {
      loading.value = true
      const preparation = await preparationsComposable.updatePreparation(id, data)

      // Пересчитываем стоимость если изменился рецепт
      if (data.recipe || data.outputQuantity !== undefined) {
        await costCalculationComposable.calculatePreparationCost(preparation)

        // Пересчитываем рецепты, использующие этот полуфабрикат
        await recalculateRecipesUsingPreparation(id)
      }

      // Обновляем usage в Product Store
      await integrationComposable.updateUsageForAllProducts()

      return preparation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update preparation'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deletePreparation(id: string): Promise<void> {
    try {
      loading.value = true
      await preparationsComposable.deletePreparation(id)

      // Удаляем из cost calculations
      costCalculationComposable.preparationCosts.value.delete(id)

      DebugUtils.info(MODULE_NAME, 'Preparation deleted', { id })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete preparation'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function togglePreparationStatus(id: string): Promise<Preparation> {
    try {
      loading.value = true
      const preparation = await preparationsComposable.togglePreparationStatus(id)

      DebugUtils.info(MODULE_NAME, 'Preparation status toggled', {
        id,
        isActive: preparation.isActive
      })

      return preparation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle preparation status'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // =============================================
  // RECIPE ACTIONS
  // =============================================

  async function fetchRecipes(): Promise<void> {
    // Already handled by composable initialization
    DebugUtils.debug(MODULE_NAME, 'Recipes already loaded via composables')
  }

  async function createRecipe(data: CreateRecipeData): Promise<Recipe> {
    try {
      loading.value = true
      const recipe = await recipesComposable.createRecipe(data)

      DebugUtils.info(MODULE_NAME, 'Recipe created', {
        id: recipe.id,
        name: recipe.name
      })

      return recipe
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create recipe'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateRecipe(id: string, data: Partial<Recipe>): Promise<Recipe> {
    try {
      loading.value = true
      const recipe = await recipesComposable.updateRecipe(id, data)

      // Пересчитываем стоимость если изменились компоненты
      if (data.components || data.portionSize !== undefined) {
        await costCalculationComposable.calculateRecipeCost(recipe)
      }

      // Обновляем usage в Product Store
      await integrationComposable.updateUsageForAllProducts()

      return recipe
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update recipe'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteRecipe(id: string): Promise<void> {
    try {
      loading.value = true
      await recipesComposable.deleteRecipe(id)

      // Удаляем из cost calculations
      costCalculationComposable.recipeCosts.value.delete(id)

      DebugUtils.info(MODULE_NAME, 'Recipe deleted', { id })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete recipe'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function toggleRecipeStatus(id: string): Promise<Recipe> {
    try {
      loading.value = true
      const recipe = await recipesComposable.toggleRecipeStatus(id)

      DebugUtils.info(MODULE_NAME, 'Recipe status toggled', {
        id,
        isActive: recipe.isActive
      })

      return recipe
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle recipe status'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function duplicateRecipe(recipeId: string, newName: string): Promise<Recipe> {
    try {
      loading.value = true
      const recipe = await recipesComposable.duplicateRecipe(recipeId, newName)

      DebugUtils.info(MODULE_NAME, 'Recipe duplicated', {
        original: recipeId,
        new: recipe.id
      })

      return recipe
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate recipe'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // =============================================
  // COST CALCULATION ACTIONS
  // =============================================

  async function calculatePreparationCost(preparationId: string): Promise<PreparationPlanCost> {
    try {
      const preparation = preparationsComposable.getPreparationById(preparationId)
      if (!preparation) {
        throw new Error('Preparation not found')
      }

      const result = await costCalculationComposable.calculatePreparationCost(preparation)
      if (!result.success || !result.cost) {
        throw new Error(result.error || 'Cost calculation failed')
      }

      DebugUtils.info(MODULE_NAME, 'Preparation cost calculated', {
        preparationId,
        totalCost: result.cost.totalCost,
        costPerUnit: result.cost.costPerOutputUnit
      })

      return result.cost as PreparationPlanCost
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate preparation cost'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    }
  }

  async function calculateRecipeCost(recipeId: string): Promise<RecipePlanCost> {
    try {
      const recipe = recipesComposable.getRecipeById(recipeId)
      if (!recipe) {
        throw new Error('Recipe not found')
      }

      const result = await costCalculationComposable.calculateRecipeCost(recipe)
      if (!result.success || !result.cost) {
        throw new Error(result.error || 'Cost calculation failed')
      }

      DebugUtils.info(MODULE_NAME, 'Recipe cost calculated', {
        recipeId,
        totalCost: result.cost.totalCost,
        costPerPortion: result.cost.costPerPortion
      })

      return result.cost as RecipePlanCost
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to calculate recipe cost'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    }
  }

  async function recalculateAllCosts(): Promise<void> {
    try {
      loading.value = true

      DebugUtils.info(MODULE_NAME, '🔄 Recalculating all costs...')

      // Сначала пересчитываем полуфабрикаты
      await costCalculationComposable.recalculateAllPreparationCosts(() =>
        preparationsComposable.getAllPreparations()
      )

      // Затем пересчитываем рецепты
      await costCalculationComposable.recalculateAllRecipeCosts(() =>
        recipesComposable.getAllRecipes()
      )

      DebugUtils.info(MODULE_NAME, '✅ All costs recalculated successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to recalculate all costs'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  async function recalculateRecipesUsingPreparation(preparationId: string): Promise<void> {
    try {
      const affectedRecipes = recipesComposable.getRecipesUsingPreparation(preparationId)

      for (const recipe of affectedRecipes) {
        await costCalculationComposable.calculateRecipeCost(recipe)
      }

      DebugUtils.info(
        MODULE_NAME,
        `♻️ Recalculated ${affectedRecipes.length} recipes using preparation ${preparationId}`
      )
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Error recalculating recipes using preparation', {
        err,
        preparationId
      })
    }
  }

  // =============================================
  // INTEGRATION METHODS
  // =============================================

  async function handleProductPriceChange(productId: string): Promise<void> {
    return integrationComposable.handleProductPriceChange(productId)
  }

  function getPreparationsForRecipes() {
    return preparationsComposable.getPreparationsForRecipes()
  }

  function getPreparationCostCalculation(preparationId: string): PreparationPlanCost | null {
    return costCalculationComposable.getPreparationCost(preparationId)
  }

  function getRecipeCostCalculation(recipeId: string): RecipePlanCost | null {
    return costCalculationComposable.getRecipeCost(recipeId)
  }

  // =============================================
  // GETTERS
  // =============================================

  function getRecipeById(id: string): Recipe | undefined {
    return recipesComposable.getRecipeById(id) || undefined
  }

  function getPreparationById(id: string): Preparation | undefined {
    return preparationsComposable.getPreparationById(id) || undefined
  }

  // =============================================
  // SELECTION METHODS
  // =============================================

  function selectRecipe(recipe: Recipe | null): void {
    selectedRecipe.value = recipe
  }

  function selectPreparation(preparation: Preparation | null): void {
    selectedPreparation.value = preparation
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  function clearError(): void {
    error.value = null
  }

  // =============================================
  // RETURN STORE
  // =============================================

  return {
    // State
    state: readonly(state),
    loading: readonly(loading),
    error: readonly(error),
    initialized: readonly(initialized), // 🆕 Флаг инициализации

    // Data (from composables)
    recipes: readonly(recipesComposable.recipes),
    preparations: readonly(preparationsComposable.preparations),
    units: readonly(unitsComposable.units),
    menuRecipeLinks: readonly(menuLinksComposable.menuRecipeLinks),

    // Computed
    activeRecipes,
    activePreparations,
    recipesByCategory,
    preparationsByType,
    statistics,

    // Main actions
    initialize,

    // Preparation actions
    fetchPreparations,
    createPreparation,
    updatePreparation,
    deletePreparation,
    togglePreparationStatus,

    // Recipe actions
    fetchRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleRecipeStatus,
    duplicateRecipe,

    // Cost calculation
    calculatePreparationCost,
    calculateRecipeCost,
    recalculateAllCosts,
    getPreparationCostCalculation,
    getRecipeCostCalculation,

    // Integration methods
    handleProductPriceChange,
    getPreparationsForRecipes,

    // Getters
    getRecipeById,
    getPreparationById,

    // Selection
    selectRecipe,
    selectPreparation,

    // Utilities
    clearError,

    // Legacy services (for backward compatibility)
    preparationService,
    recipeService,
    menuRecipeLinkService,
    unitService,

    // Direct composable access (for advanced usage)
    preparationsComposable,
    recipesComposable,
    costCalculationComposable,
    integrationComposable
  }
})
