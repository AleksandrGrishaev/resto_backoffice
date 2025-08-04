// src/stores/recipes/recipesStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  IngredientService,
  RecipeService,
  MenuRecipeLinkService,
  UnitService
} from './recipesService'
import { mockIngredients, mockRecipes, mockUnits } from './recipesMock'
import { DebugUtils } from '@/utils'
import type {
  Recipe,
  Ingredient,
  Preparation, // НОВОЕ
  MenuRecipeLink,
  CostCalculation,
  CreateRecipeData,
  CreateIngredientData,
  CreatePreparationData, // НОВОЕ
  Unit,
  IngredientCategory,
  PreparationType, // НОВОЕ
  RecipeCategory
} from './types'

const MODULE_NAME = 'RecipesStore'

interface RecipesState {
  loading: boolean
  error: string | null
  selectedRecipe: Recipe | null
  selectedIngredient: Ingredient | null
  selectedPreparation: Preparation | null // НОВОЕ
  costCalculations: Map<string, CostCalculation>
}

export const useRecipesStore = defineStore('recipes', () => {
  // Services
  const ingredientService = new IngredientService(mockIngredients)
  const recipeService = new RecipeService(mockRecipes)
  const menuRecipeLinkService = new MenuRecipeLinkService([])
  const unitService = new UnitService(mockUnits)

  // State
  const state = ref<RecipesState>({
    loading: false,
    error: null,
    selectedRecipe: null,
    selectedIngredient: null,
    selectedPreparation: null, // НОВОЕ
    costCalculations: new Map()
  })

  // Data refs
  const recipes = ref<Recipe[]>([])
  const ingredients = ref<Ingredient[]>([])
  const preparations = ref<Preparation[]>([]) // НОВОЕ
  const units = ref<Unit[]>([])
  const menuRecipeLinks = ref<MenuRecipeLink[]>([])

  // Getters
  const activeRecipes = computed(() => recipes.value.filter(r => r.isActive))
  const activeIngredients = computed(() => ingredients.value.filter(i => i.isActive))
  const activePreparations = computed(() => preparations.value.filter(p => p.isActive)) // НОВОЕ

  const recipesByCategory = computed(() => {
    const categories: Record<RecipeCategory, Recipe[]> = {
      sauce: [],
      main: [],
      side: [],
      dessert: [],
      beverage: [],
      appetizer: [],
      preparation: []
    }

    activeRecipes.value.forEach(recipe => {
      categories[recipe.category].push(recipe)
    })

    return categories
  })

  const ingredientsByCategory = computed(() => {
    const categories: Record<IngredientCategory, Ingredient[]> = {
      herbs: [],
      vegetables: [],
      meat: [],
      dairy: [],
      grains: [],
      condiments: [],
      prepared: []
    }

    activeIngredients.value.forEach(ingredient => {
      categories[ingredient.category].push(ingredient)
    })

    return categories
  })

  // НОВОЕ: Preparations by category
  const preparationsByCategory = computed(() => {
    const categories: Record<PreparationType, Preparation[]> = {
      sauce: [],
      garnish: [],
      marinade: [],
      semifinished: [],
      seasoning: []
    }

    activePreparations.value.forEach(preparation => {
      categories[preparation.category].push(preparation)
    })

    return categories
  })

  const compositeIngredients = computed(() => activeIngredients.value.filter(i => i.isComposite))
  const baseIngredients = computed(() => activeIngredients.value.filter(i => !i.isComposite))

  // Actions

  // Initialize data
  async function initialize(): Promise<void> {
    try {
      state.value.loading = true
      await Promise.all([
        fetchRecipes(),
        fetchIngredients(),
        fetchPreparations(), // НОВОЕ
        fetchUnits(),
        fetchMenuRecipeLinks()
      ])
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

  // Recipes (БЕЗ ИЗМЕНЕНИЙ)
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

  // Ingredients (БЕЗ ИЗМЕНЕНИЙ)
  async function fetchIngredients(): Promise<void> {
    try {
      ingredients.value = await ingredientService.getAll()
      DebugUtils.info(MODULE_NAME, 'Ingredients loaded', { count: ingredients.value.length })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch ingredients'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    }
  }

  async function createIngredient(data: CreateIngredientData): Promise<Ingredient> {
    try {
      state.value.loading = true
      const ingredient = await ingredientService.create(data)
      ingredients.value.push(ingredient)
      DebugUtils.info(MODULE_NAME, 'Ingredient created', { ingredient })
      return ingredient
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create ingredient'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function updateIngredient(id: string, data: Partial<Ingredient>): Promise<Ingredient> {
    try {
      state.value.loading = true
      const ingredient = await ingredientService.update(id, data)
      const index = ingredients.value.findIndex(i => i.id === id)
      if (index !== -1) {
        ingredients.value[index] = ingredient
      }
      DebugUtils.info(MODULE_NAME, 'Ingredient updated', { id, data })
      return ingredient
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update ingredient'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  async function deleteIngredient(id: string): Promise<void> {
    try {
      state.value.loading = true
      await ingredientService.delete(id)
      ingredients.value = ingredients.value.filter(i => i.id !== id)
      DebugUtils.info(MODULE_NAME, 'Ingredient deleted', { id })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete ingredient'
      state.value.error = message
      DebugUtils.error(MODULE_NAME, message)
      throw error
    } finally {
      state.value.loading = false
    }
  }

  // НОВОЕ: Preparations
  async function fetchPreparations(): Promise<void> {
    try {
      // Загружаем mock данные
      const { mockPreparations } = await import('./recipesMock')
      preparations.value = mockPreparations
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
      // Временная реализация - создаем preparation как ingredient
      const preparation: Preparation = {
        ...data,
        id: `prep-${Date.now()}`,
        isActive: true,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
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
      const index = preparations.value.findIndex(p => p.id === id)
      if (index === -1) {
        throw new Error('Preparation not found')
      }

      preparations.value[index] = {
        ...preparations.value[index],
        ...data,
        updatedAt: new Date()
      }

      DebugUtils.info(MODULE_NAME, 'Preparation updated', { id, data })
      return preparations.value[index]
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

  // Units (БЕЗ ИЗМЕНЕНИЙ)
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

  // Menu Recipe Links (БЕЗ ИЗМЕНЕНИЙ)
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

  // Cost calculation (БЕЗ ИЗМЕНЕНИЙ)
  async function calculateRecipeCost(recipeId: string): Promise<CostCalculation | null> {
    try {
      const calculation = await recipeService.calculateCost(recipeId, ingredientService)
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

  // Getters for specific items
  function getRecipeById(id: string): Recipe | undefined {
    return recipes.value.find(r => r.id === id)
  }

  function getIngredientById(id: string): Ingredient | undefined {
    return ingredients.value.find(i => i.id === id)
  }

  function getPreparationById(id: string): Preparation | undefined {
    // НОВОЕ
    return preparations.value.find(p => p.id === id)
  }

  function getUnitById(id: string): Unit | undefined {
    return units.value.find(u => u.id === id)
  }

  function getRecipesByCategory(category: RecipeCategory): Recipe[] {
    return activeRecipes.value.filter(r => r.category === category)
  }

  function getIngredientsByCategory(category: IngredientCategory): Ingredient[] {
    return activeIngredients.value.filter(i => i.category === category)
  }

  function getPreparationsByCategory(category: PreparationType): Preparation[] {
    // НОВОЕ
    return activePreparations.value.filter(p => p.category === category)
  }

  // Selection
  function selectRecipe(recipe: Recipe | null): void {
    state.value.selectedRecipe = recipe
  }

  function selectIngredient(ingredient: Ingredient | null): void {
    state.value.selectedIngredient = ingredient
  }

  function selectPreparation(preparation: Preparation | null): void {
    // НОВОЕ
    state.value.selectedPreparation = preparation
  }

  // Clear error
  function clearError(): void {
    state.value.error = null
  }

  return {
    // State
    state,
    recipes,
    ingredients,
    preparations, // НОВОЕ
    units,
    menuRecipeLinks,

    // Getters
    activeRecipes,
    activeIngredients,
    activePreparations, // НОВОЕ
    recipesByCategory,
    ingredientsByCategory,
    preparationsByCategory, // НОВОЕ
    compositeIngredients,
    baseIngredients,

    // Actions
    initialize,

    // Recipes
    fetchRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,

    // Ingredients
    fetchIngredients,
    createIngredient,
    updateIngredient,
    deleteIngredient,

    // Preparations (НОВОЕ)
    fetchPreparations,
    createPreparation,
    updatePreparation,
    deletePreparation,

    // Units
    fetchUnits,

    // Menu Recipe Links
    fetchMenuRecipeLinks,
    linkRecipeToMenuItem,

    // Cost calculation
    calculateRecipeCost,

    // Getters
    getRecipeById,
    getIngredientById,
    getPreparationById, // НОВОЕ
    getUnitById,
    getRecipesByCategory,
    getIngredientsByCategory,
    getPreparationsByCategory, // НОВОЕ

    // Selection
    selectRecipe,
    selectIngredient,
    selectPreparation, // НОВОЕ

    // Utils
    clearError
  }
})
