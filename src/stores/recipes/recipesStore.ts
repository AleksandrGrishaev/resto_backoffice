// src/stores/recipes/recipesStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  PreparationService,
  RecipeService,
  MenuRecipeLinkService,
  UnitService
} from './recipesService'
import { mockPreparations, mockRecipes } from './recipesMock'
import { mockUnits } from './unitsMock'
import { DebugUtils } from '@/utils'
import type {
  Recipe,
  Preparation,
  MenuRecipeLink,
  CostCalculation,
  CreateRecipeData,
  CreatePreparationData,
  Unit,
  PreparationType,
  RecipeCategory
} from './types'

const MODULE_NAME = 'RecipesStore'

interface RecipesState {
  loading: boolean
  error: string | null
  selectedRecipe: Recipe | null
  selectedPreparation: Preparation | null
  costCalculations: Map<string, CostCalculation>
}

export const useRecipesStore = defineStore('recipes', () => {
  // Services
  const preparationService = new PreparationService(mockPreparations)
  const recipeService = new RecipeService(mockRecipes)
  const menuRecipeLinkService = new MenuRecipeLinkService([])
  const unitService = new UnitService(mockUnits)

  // State
  const state = ref<RecipesState>({
    loading: false,
    error: null,
    selectedRecipe: null,
    selectedPreparation: null,
    costCalculations: new Map()
  })

  // Data refs
  const recipes = ref<Recipe[]>([])
  const preparations = ref<Preparation[]>([])
  const units = ref<Unit[]>([])
  const menuRecipeLinks = ref<MenuRecipeLink[]>([])

  // Getters
  const activeRecipes = computed(() => recipes.value.filter(r => r.isActive))
  const activePreparations = computed(() => preparations.value.filter(p => p.isActive))

  const recipesByCategory = computed(() => {
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

  const preparationsByType = computed(() => {
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

  // Actions

  // Initialize data
  async function initialize(): Promise<void> {
    try {
      state.value.loading = true
      await Promise.all([fetchRecipes(), fetchPreparations(), fetchUnits(), fetchMenuRecipeLinks()])
      DebugUtils.info(MODULE_NAME, 'Store initialized')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  // =============================================
  // PREPARATIONS
  // =============================================

  async function fetchPreparations(): Promise<void> {
    try {
      preparations.value = await preparationService.getAll()
      DebugUtils.info(MODULE_NAME, 'Preparations loaded', { count: preparations.value.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch preparations'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    }
  }

  async function createPreparation(data: CreatePreparationData): Promise<Preparation> {
    try {
      state.value.loading = true
      const preparation = await preparationService.create(data)
      preparations.value.push(preparation)
      DebugUtils.info(MODULE_NAME, 'Preparation created', { preparation })
      return preparation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create preparation'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function updatePreparation(id: string, data: Partial<Preparation>): Promise<Preparation> {
    try {
      state.value.loading = true
      const preparation = await preparationService.update(id, data)
      const index = preparations.value.findIndex(p => p.id === id)
      if (index !== -1) {
        preparations.value[index] = preparation
      }
      DebugUtils.info(MODULE_NAME, 'Preparation updated', { id, data })
      return preparation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update preparation'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function deletePreparation(id: string): Promise<void> {
    try {
      state.value.loading = true
      await preparationService.delete(id)
      preparations.value = preparations.value.filter(p => p.id !== id)
      DebugUtils.info(MODULE_NAME, 'Preparation deleted', { id })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete preparation'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function togglePreparationStatus(id: string): Promise<Preparation> {
    try {
      state.value.loading = true
      const preparation = await preparationService.toggleStatus(id)
      const index = preparations.value.findIndex(p => p.id === id)
      if (index !== -1) {
        preparations.value[index] = preparation
      }
      DebugUtils.info(MODULE_NAME, 'Preparation status toggled', {
        id,
        isActive: preparation.isActive
      })
      return preparation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle preparation status'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  // =============================================
  // RECIPES
  // =============================================

  async function fetchRecipes(): Promise<void> {
    try {
      recipes.value = await recipeService.getAll()
      DebugUtils.info(MODULE_NAME, 'Recipes loaded', { count: recipes.value.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch recipes'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    }
  }

  async function createRecipe(data: CreateRecipeData): Promise<Recipe> {
    try {
      state.value.loading = true
      const recipe = await recipeService.create(data)
      recipes.value.push(recipe)
      DebugUtils.info(MODULE_NAME, 'Recipe created', { recipe })
      return recipe
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create recipe'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function updateRecipe(id: string, data: Partial<Recipe>): Promise<Recipe> {
    try {
      state.value.loading = true
      const recipe = await recipeService.update(id, data)
      const index = recipes.value.findIndex(r => r.id === id)
      if (index !== -1) {
        recipes.value[index] = recipe
      }
      DebugUtils.info(MODULE_NAME, 'Recipe updated', { id, data })
      return recipe
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update recipe'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function deleteRecipe(id: string): Promise<void> {
    try {
      state.value.loading = true
      await recipeService.delete(id)
      recipes.value = recipes.value.filter(r => r.id !== id)
      DebugUtils.info(MODULE_NAME, 'Recipe deleted', { id })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete recipe'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function toggleRecipeStatus(id: string): Promise<Recipe> {
    try {
      state.value.loading = true
      const recipe = await recipeService.toggleStatus(id)
      const index = recipes.value.findIndex(r => r.id === id)
      if (index !== -1) {
        recipes.value[index] = recipe
      }
      DebugUtils.info(MODULE_NAME, 'Recipe status toggled', { id, isActive: recipe.isActive })
      return recipe
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle recipe status'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function duplicateRecipe(recipeId: string, newName: string): Promise<Recipe> {
    try {
      state.value.loading = true
      const recipe = await recipeService.duplicateRecipe(recipeId, newName)
      recipes.value.push(recipe)
      DebugUtils.info(MODULE_NAME, 'Recipe duplicated', { original: recipeId, new: recipe.id })
      return recipe
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to duplicate recipe'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  // =============================================
  // UNITS
  // =============================================

  async function fetchUnits(): Promise<void> {
    try {
      units.value = await unitService.getAll()
      DebugUtils.info(MODULE_NAME, 'Units loaded', { count: units.value.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch units'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    }
  }

  // =============================================
  // MENU RECIPE LINKS
  // =============================================

  async function fetchMenuRecipeLinks(): Promise<void> {
    try {
      menuRecipeLinks.value = await menuRecipeLinkService.getAll()
      DebugUtils.info(MODULE_NAME, 'Menu recipe links loaded', {
        count: menuRecipeLinks.value.length
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch menu recipe links'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    }
  }

  async function linkRecipeToMenuItem(
    menuItemId: string,
    recipeId: string,
    variantId?: string,
    portionMultiplier: number = 1
  ): Promise<MenuRecipeLink> {
    try {
      state.value.loading = true
      const link = await menuRecipeLinkService.create(
        menuItemId,
        recipeId,
        variantId,
        portionMultiplier
      )
      menuRecipeLinks.value.push(link)
      DebugUtils.info(MODULE_NAME, 'Recipe linked to menu item', { link })
      return link
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to link recipe to menu item'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  // =============================================
  // COST CALCULATION
  // =============================================

  async function calculateRecipeCost(recipeId: string): Promise<CostCalculation | null> {
    try {
      // TODO: интегрировать с ProductsService
      const calculation = await recipeService.calculateCost(recipeId, null, preparationService)
      if (calculation) {
        state.value.costCalculations.set(recipeId, calculation)
        DebugUtils.info(MODULE_NAME, 'Recipe cost calculated', { recipeId, calculation })
      }
      return calculation
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to calculate recipe cost'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    }
  }

  // =============================================
  // GETTERS
  // =============================================

  function getRecipeById(id: string): Recipe | undefined {
    return recipes.value.find(r => r.id === id)
  }

  function getPreparationById(id: string): Preparation | undefined {
    return preparations.value.find(p => p.id === id)
  }

  function getUnitById(id: string): Unit | undefined {
    return units.value.find(u => u.id === id)
  }

  function getRecipesByCategory(category: RecipeCategory): Recipe[] {
    return activeRecipes.value.filter(r => r.category === category)
  }

  function getPreparationsByType(type: PreparationType): Preparation[] {
    return activePreparations.value.filter(p => p.type === type)
  }

  // =============================================
  // SELECTION
  // =============================================

  function selectRecipe(recipe: Recipe | null): void {
    state.value.selectedRecipe = recipe
  }

  function selectPreparation(preparation: Preparation | null): void {
    state.value.selectedPreparation = preparation
  }

  // =============================================
  // UTILS
  // =============================================

  function clearError(): void {
    state.value.error = null
  }

  return {
    // State
    state,
    recipes,
    preparations,
    units,
    menuRecipeLinks,

    // Getters
    activeRecipes,
    activePreparations,
    recipesByCategory,
    preparationsByType,

    // Actions
    initialize,

    // Preparations
    fetchPreparations,
    createPreparation,
    updatePreparation,
    deletePreparation,
    togglePreparationStatus,

    // Recipes
    fetchRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    toggleRecipeStatus,
    duplicateRecipe,

    // Units
    fetchUnits,

    // Menu Recipe Links
    fetchMenuRecipeLinks,
    linkRecipeToMenuItem,

    // Cost calculation
    calculateRecipeCost,

    // Getters
    getRecipeById,
    getPreparationById,
    getUnitById,
    getRecipesByCategory,
    getPreparationsByType,

    // Selection
    selectRecipe,
    selectPreparation,

    // Utils
    clearError
  }
})
