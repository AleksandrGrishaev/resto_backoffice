// src/stores/recipes/recipesStore.ts - Updated with Composables Integration

import { defineStore } from 'pinia'
import { ref, computed, readonly } from 'vue'
import { DebugUtils, invalidateCache } from '@/utils'

// Import composables
import { usePreparations } from './composables/usePreparations'
import { useRecipes } from './composables/useRecipes'
import { useCostCalculation } from './composables/useCostCalculation'
import { useRecipeIntegration } from './composables/useRecipeIntegration'
import { useMenuRecipeLinks } from './composables/useMenuRecipeLinks'
import { useUnits } from './composables/useUnits'
import { useAutoCostRecalculation } from './composables/useAutoCostRecalculation'
import { useCategoryManagement } from './composables/useCategoryManagement'
import type {
  CreatePreparationCategoryData,
  CreateRecipeCategoryData
} from './composables/useCategoryManagement'

// Note: Mock imports removed - recipes now use Supabase via composables
// Legacy services kept for backward compatibility if needed
import {
  PreparationService,
  RecipeService,
  MenuRecipeLinkService,
  UnitService,
  RecipesService,
  recipesService
} from './recipesService'

import type {
  Recipe,
  Preparation,
  PreparationCategory,
  RecipeCategory,
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
  const autoCostRecalculation = useAutoCostRecalculation()
  const categoryManagement = useCategoryManagement()

  // =============================================
  // LEGACY SERVICES (for backward compatibility)
  // =============================================
  // Note: Legacy services initialized with empty data since mock files are removed
  // Real data comes from Supabase via composables

  const preparationService = new PreparationService([])
  const recipeService = new RecipeService([])
  const menuRecipeLinkService = new MenuRecipeLinkService([])
  const unitService = new UnitService([])

  // =============================================
  // STORE STATE
  // =============================================

  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false) // 🆕 Флаг инициализации
  const selectedRecipe = ref<Recipe | null>(null)
  const selectedPreparation = ref<Preparation | null>(null)

  // ✅ NEW: Categories from database
  const preparationCategories = ref<PreparationCategory[]>([])
  const recipeCategories = ref<RecipeCategory[]>([]) // Phase 2

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

  // ✅ NEW: Preparation category getters
  const activePreparationCategories = computed(() =>
    preparationCategories.value.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  const getPreparationCategoryById = computed(
    () => (id: string) => preparationCategories.value.find(c => c.id === id)
  )

  const getPreparationCategoryName = computed(
    () => (id: string) => preparationCategories.value.find(c => c.id === id)?.name || id
  )

  const getPreparationCategoryColor = computed(
    () => (id: string) => preparationCategories.value.find(c => c.id === id)?.color || 'grey'
  )

  const getPreparationCategoryEmoji = computed(
    () => (id: string) => preparationCategories.value.find(c => c.id === id)?.emoji || '👨‍🍳'
  )

  // Group preparations by category
  const preparationsByCategory = computed(() => {
    const grouped: Record<string, Preparation[]> = {}
    preparationsComposable.preparations.value.forEach(prep => {
      if (!grouped[prep.type]) {
        grouped[prep.type] = []
      }
      grouped[prep.type].push(prep)
    })
    return grouped
  })

  // ✅ NEW: Recipe category getters
  const activeRecipeCategories = computed(() =>
    recipeCategories.value.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  const getRecipeCategoryById = computed(
    () => (id: string) => recipeCategories.value.find(c => c.id === id)
  )

  const getRecipeCategoryName = computed(
    () => (id: string) => recipeCategories.value.find(c => c.id === id)?.name || id
  )

  const getRecipeCategoryColor = computed(
    () => (id: string) => recipeCategories.value.find(c => c.id === id)?.color || 'grey'
  )

  const getRecipeCategoryIcon = computed(
    () => (id: string) => recipeCategories.value.find(c => c.id === id)?.icon || 'mdi-food'
  )

  // =============================================
  // MAIN ACTIONS
  // =============================================

  /**
   * Инициализирует Recipe Store с интеграцией
   * @param options.skipCostRecalculation - Пропустить пересчёт себестоимости (для POS/Kitchen)
   */
  async function initialize(options?: { skipCostRecalculation?: boolean }): Promise<void> {
    // Если уже инициализирован, не делаем ничего
    if (initialized.value) {
      DebugUtils.info(MODULE_NAME, 'Recipe Store already initialized')
      return
    }

    try {
      loading.value = true
      error.value = null

      DebugUtils.info(MODULE_NAME, '🚀 Initializing Recipe Store with composables')

      // 1. ✅ Загружаем категории первыми
      await loadPreparationCategories()
      await loadRecipeCategories() // Phase 2

      // 2. Инициализируем базовые данные из Supabase
      await Promise.all([
        preparationsComposable.initializePreparations(), // Load from Supabase
        recipesComposable.initializeRecipes(), // Load from Supabase
        menuLinksComposable.initializeMenuRecipeLinks([]),
        unitsComposable.initializeUnits(), // Load from Supabase or defaults
        costCalculationComposable.initializeCostCalculations()
      ])

      // 3. Настраиваем интеграцию с Product Store
      await integrationComposable.setupProductStoreIntegration()

      // 4. Устанавливаем integration callbacks
      const callbacks = setupIntegrationCallbacks()
      costCalculationComposable.setIntegrationCallbacks(
        callbacks.getProduct,
        callbacks.getPreparation,
        callbacks.getPreparationCost,
        callbacks.getRecipe, // ⭐ PHASE 1: Recipe Nesting
        callbacks.getRecipeCost // ⭐ PHASE 1: Recipe Nesting
      )
      recipesComposable.setIntegrationCallbacks(
        callbacks.getProduct,
        callbacks.getPreparation,
        callbacks.getPreparationCost,
        callbacks.getRecipe, // ⭐ PHASE 1: Recipe Nesting
        callbacks.getRecipeCost // ⭐ PHASE 1: Recipe Nesting
      )

      // 5. ✅ Sprint 10: Cost recalculation ОТКЛЮЧЕН при инициализации
      // Пересчёт запускается ТОЛЬКО:
      // - Вручную через кнопку "Recalculate All Cost" в UI
      // - Периодически (раз в 24ч) через schedulePeriodicRecalculation
      // Это ускоряет загрузку Backoffice с 39 сек до 3 сек

      if (options?.skipCostRecalculation) {
        DebugUtils.info(MODULE_NAME, '⏭️ Cost recalculation skipped (POS/Kitchen mode)')
      } else {
        // ✅ Sprint 10: НЕ запускаем пересчёт при старте
        // Только планируем периодический пересчёт (раз в 24ч)
        const needsRecalculation = autoCostRecalculation.isRecalculationNeeded()
        if (needsRecalculation) {
          DebugUtils.info(
            MODULE_NAME,
            '⚠️ Cost recalculation needed, but deferred. Use "Recalculate All Cost" button.'
          )
        }

        // Schedule periodic recalculation for long-running sessions (только для backoffice)
        autoCostRecalculation.schedulePeriodicRecalculation(
          recalculateAllCosts,
          updateDatabaseCosts
        )
      }

      // 🆕 Устанавливаем флаг инициализации
      initialized.value = true

      DebugUtils.info(MODULE_NAME, '✅ Recipe Store initialized successfully', {
        preparations: activePreparations.value.length,
        recipes: activeRecipes.value.length,
        units: unitsComposable.units.value.length,
        preparationCategories: preparationCategories.value.length,
        recipeCategories: recipeCategories.value.length,
        costRecalculationMode: 'manual', // ✅ Sprint 10: Only manual via "Recalculate All Cost" button
        skipCostRecalculation: options?.skipCostRecalculation ?? false
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
   * ✅ Sprint 8: Force refresh recipes from server
   * Invalidates cache and reloads preparations + recipes from Supabase
   */
  async function refresh(): Promise<void> {
    DebugUtils.info(MODULE_NAME, '🔄 Refreshing recipes (cache invalidation + reload)')

    // Invalidate SWR cache
    invalidateCache('preparations')
    invalidateCache('recipes')
    invalidateCache('preparation_categories')
    invalidateCache('recipe_categories')

    // Also clear legacy cache keys
    localStorage.removeItem('preparations_cache')
    localStorage.removeItem('recipes_cache')

    // Reset initialized flag to allow full reload
    initialized.value = false

    // Reload from server
    await initialize()

    DebugUtils.info(MODULE_NAME, '✅ Recipes refreshed', {
      preparations: activePreparations.value.length,
      recipes: activeRecipes.value.length
    })
  }

  /**
   * Настраивает integration callbacks
   */
  function setupIntegrationCallbacks() {
    const getProduct = async (productId: string) => {
      return integrationComposable.getProductForRecipe(productId)
    }

    // ⭐ NEW: Callback for getting preparation by ID (for nested preparations)
    const getPreparation = async (preparationId: string) => {
      return preparationsComposable.getPreparationById(preparationId)
    }

    const getPreparationCost = async (preparationId: string) => {
      return costCalculationComposable.getPreparationCost(preparationId)
    }

    // ⭐ PHASE 1: Recipe Nesting - callbacks for nested recipes
    const getRecipe = async (recipeId: string) => {
      return recipesComposable.getRecipeById(recipeId)
    }

    const getRecipeCost = async (recipeId: string) => {
      const recipe = await recipesComposable.getRecipeById(recipeId)
      if (!recipe) return null

      // Return cached cost if available
      if (recipe.cost && recipe.cost > 0) {
        return {
          totalCost: recipe.cost,
          costPerPortion: recipe.cost / (recipe.portionSize || 1)
        }
      }

      // Calculate cost if not cached
      const costResult = await costCalculationComposable.calculateRecipeCost(recipe, 'planned')
      return costResult
    }

    return { getProduct, getPreparation, getPreparationCost, getRecipe, getRecipeCost }
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
        const costResult = await costCalculationComposable.calculatePreparationCost(preparation)

        // ✅ FIX: Update last_known_cost in database (always per BASE UNIT, i.e. per gram)
        if (costResult.success && costResult.cost) {
          const preparationCost = costResult.cost as PreparationPlanCost
          // costPerOutputUnit is per-portion for portion-type preps — normalize to per-gram
          let costPerBaseUnit = preparationCost.costPerOutputUnit
          if (
            preparation.portionType === 'portion' &&
            preparation.portionSize &&
            preparation.portionSize > 0
          ) {
            costPerBaseUnit = preparationCost.costPerOutputUnit / preparation.portionSize
          }
          await preparationsComposable.updatePreparation(id, {
            lastKnownCost: costPerBaseUnit
          })
          // Update local state
          preparation.lastKnownCost = costPerBaseUnit
        }

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

  async function duplicatePreparation(
    preparationId: string,
    newName: string,
    newCode?: string
  ): Promise<Preparation> {
    try {
      loading.value = true
      const preparation = await preparationsComposable.duplicatePreparation(
        preparationId,
        newName,
        newCode
      )

      // Рассчитываем стоимость нового полуфабриката
      await costCalculationComposable.calculatePreparationCost(preparation)

      // Обновляем usage в Product Store
      await integrationComposable.updateUsageForAllProducts()

      DebugUtils.info(MODULE_NAME, 'Preparation duplicated with cost calculation', {
        original: preparationId,
        new: preparation.id,
        name: preparation.name
      })

      return preparation
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to duplicate preparation'
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

  /**
   * Update last_known_cost in database for all preparations and recipes
   * Called after daily cost recalculation
   */
  async function updateDatabaseCosts(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, '💾 Updating database with new costs...')

      // Get all calculated costs
      const preparationCosts = costCalculationComposable.getAllPreparationCosts()
      const recipeCosts = costCalculationComposable.getAllRecipeCosts()

      let preparationsUpdated = 0
      let recipesUpdated = 0
      const errors: string[] = []

      // Update preparations
      for (const [preparationId, cost] of preparationCosts) {
        try {
          // ✅ FIX: Normalize per-portion to per-gram for portion-type preparations
          // costPerOutputUnit is per-portion when outputUnit='portion' — normalize to per-gram
          let costForDb = cost.costPerOutputUnit
          const preparation = preparationsComposable.getPreparationById(preparationId)
          if (
            preparation &&
            preparation.portionType === 'portion' &&
            preparation.portionSize &&
            preparation.portionSize > 0
          ) {
            costForDb = cost.costPerOutputUnit / preparation.portionSize
          }
          await recipesService.updatePreparationCost(preparationId, costForDb)
          preparationsUpdated++
        } catch (err) {
          errors.push(
            `Preparation ${preparationId}: ${err instanceof Error ? err.message : 'Unknown error'}`
          )
        }
      }

      // Update recipes
      for (const [recipeId, cost] of recipeCosts) {
        try {
          await recipesService.updateRecipeCost(recipeId, cost.costPerPortion)
          recipesUpdated++
        } catch (err) {
          errors.push(`Recipe ${recipeId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Database costs updated', {
        preparationsUpdated,
        recipesUpdated,
        totalErrors: errors.length,
        sampleErrors: errors.length > 0 ? errors.slice(0, 5) : undefined
      })

      if (errors.length > 0) {
        DebugUtils.warn(MODULE_NAME, `${errors.length} cost updates failed`)
        DebugUtils.debug(MODULE_NAME, 'First 10 errors:', errors.slice(0, 10))
      }

      // ✅ Reload data from database to refresh in-memory cache
      if (preparationsUpdated > 0 || recipesUpdated > 0) {
        DebugUtils.info(MODULE_NAME, '🔄 Reloading data to refresh cache...')
        await Promise.all([
          preparationsComposable.initializePreparations(),
          recipesComposable.initializeRecipes()
        ])
        DebugUtils.info(MODULE_NAME, '✅ Cache refreshed from database')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update database costs'
      DebugUtils.error(MODULE_NAME, message, { err })
      // Don't throw - this is a non-critical operation
    }
  }

  // =============================================
  // CATEGORY ACTIONS
  // =============================================

  /**
   * ✅ NEW: Load preparation categories from database
   */
  async function loadPreparationCategories(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading preparation categories...')
      const recipesService = new RecipesService()
      const categories = await recipesService.getPreparationCategories()
      preparationCategories.value = categories
      DebugUtils.store(MODULE_NAME, 'Loaded preparation categories', {
        count: categories.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load preparation categories', error)
      throw error
    }
  }

  /**
   * ✅ NEW: Load recipe categories from database (Phase 2)
   */
  async function loadRecipeCategories(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading recipe categories...')
      const categories = await recipesService.getRecipeCategories()
      recipeCategories.value = categories
      DebugUtils.store(MODULE_NAME, 'Loaded recipe categories', {
        count: categories.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load recipe categories', error)
      throw error
    }
  }

  /**
   * ✅ NEW: Create preparation category
   */
  async function createPreparationCategory(
    data: CreatePreparationCategoryData
  ): Promise<PreparationCategory> {
    try {
      loading.value = true
      const category = await categoryManagement.createPreparationCategory(data)

      // Reload categories to reflect the new one
      await loadPreparationCategories()

      DebugUtils.info(MODULE_NAME, 'Preparation category created', { id: category.id })
      return category
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create category'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * ✅ NEW: Update preparation category
   */
  async function updatePreparationCategory(
    id: string,
    data: Partial<CreatePreparationCategoryData>
  ): Promise<PreparationCategory> {
    try {
      loading.value = true
      const category = await categoryManagement.updatePreparationCategory(id, data)

      // Reload categories to reflect changes
      await loadPreparationCategories()

      DebugUtils.info(MODULE_NAME, 'Preparation category updated', { id })
      return category
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update category'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * ✅ NEW: Delete preparation category
   */
  async function deletePreparationCategory(id: string): Promise<void> {
    try {
      loading.value = true
      await categoryManagement.deletePreparationCategory(id)

      // Reload categories to reflect deletion
      await loadPreparationCategories()

      DebugUtils.info(MODULE_NAME, 'Preparation category deleted', { id })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete category'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * ✅ NEW: Create recipe category
   */
  async function createRecipeCategory(data: CreateRecipeCategoryData): Promise<RecipeCategory> {
    try {
      loading.value = true
      const category = await categoryManagement.createRecipeCategory(data)

      // Reload categories to reflect the new one
      await loadRecipeCategories()

      DebugUtils.info(MODULE_NAME, 'Recipe category created', { id: category.id })
      return category
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create category'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * ✅ NEW: Update recipe category
   */
  async function updateRecipeCategory(
    id: string,
    data: Partial<CreateRecipeCategoryData>
  ): Promise<RecipeCategory> {
    try {
      loading.value = true
      const category = await categoryManagement.updateRecipeCategory(id, data)

      // Reload categories to reflect changes
      await loadRecipeCategories()

      DebugUtils.info(MODULE_NAME, 'Recipe category updated', { id })
      return category
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update category'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * ✅ NEW: Delete recipe category
   */
  async function deleteRecipeCategory(id: string): Promise<void> {
    try {
      loading.value = true
      await categoryManagement.deleteRecipeCategory(id)

      // Reload categories to reflect deletion
      await loadRecipeCategories()

      DebugUtils.info(MODULE_NAME, 'Recipe category deleted', { id })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete category'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
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

    // ✅ NEW: Categories data
    preparationCategories: readonly(preparationCategories),
    recipeCategories: readonly(recipeCategories), // Phase 2

    // Computed
    activeRecipes,
    activePreparations,
    recipesByCategory,
    preparationsByType,
    statistics,

    // ✅ NEW: Preparation category computed
    activePreparationCategories,
    getPreparationCategoryById,
    getPreparationCategoryName,
    getPreparationCategoryColor,
    getPreparationCategoryEmoji,
    preparationsByCategory,

    // ✅ NEW: Recipe category computed
    activeRecipeCategories,
    getRecipeCategoryById,
    getRecipeCategoryName,
    getRecipeCategoryColor,
    getRecipeCategoryIcon,

    // Main actions
    initialize,
    refresh,

    // ✅ NEW: Category actions
    loadPreparationCategories,
    loadRecipeCategories, // Phase 2
    createPreparationCategory,
    updatePreparationCategory,
    deletePreparationCategory,
    createRecipeCategory,
    updateRecipeCategory,
    deleteRecipeCategory,

    // Preparation actions
    fetchPreparations,
    createPreparation,
    updatePreparation,
    deletePreparation,
    togglePreparationStatus,
    duplicatePreparation,

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
    updateDatabaseCosts,
    getPreparationCostCalculation,
    getRecipeCostCalculation,

    // Auto cost recalculation
    autoCostRecalculationStatus: autoCostRecalculation.recalculationStatus,
    forceRecalculateCosts: () =>
      autoCostRecalculation.forceRecalculationNow(recalculateAllCosts, updateDatabaseCosts),

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
