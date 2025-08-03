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
  MenuRecipeLink,
  CostCalculation,
  CreateRecipeData,
  CreateIngredientData,
  Unit,
  IngredientCategory,
  RecipeCategory
} from './types'

const MODULE_NAME = 'RecipesStore'

interface RecipesState {
  loading: boolean
  error: string | null
  selectedRecipe: Recipe | null
  selectedIngredient: Ingredient | null
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
    costCalculations: new Map()
  })

  // Data refs
  const recipes = ref<Recipe[]>([])
  const ingredients = ref<Ingredient[]>([])
  const units = ref<Unit[]>([])
  const menuRecipeLinks = ref<MenuRecipeLink[]>([])

  // Getters
  const activeRecipes = computed(() => recipes.value.filter(r => r.isActive))

  const activeIngredients = computed(() => ingredients.value.filter(i => i.isActive))

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

  const compositeIngredients = computed(() => activeIngredients.value.filter(i => i.isComposite))

  const baseIngredients = computed(() => activeIngredients.value.filter(i => !i.isComposite))

  // Actions

  // Initialize data
  async function initialize(): Promise<void> {
    try {
      state.value.loading = true
      await Promise.all([fetchRecipes(), fetchIngredients(), fetchUnits(), fetchMenuRecipeLinks()])
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

  // Recipes
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

  // Ingredients
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

  // Units
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

  // Menu Recipe Links
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

  // Cost calculation
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

  function getUnitById(id: string): Unit | undefined {
    return units.value.find(u => u.id === id)
  }

  function getRecipesByCategory(category: RecipeCategory): Recipe[] {
    return activeRecipes.value.filter(r => r.category === category)
  }

  function getIngredientsByCategory(category: IngredientCategory): Ingredient[] {
    return activeIngredients.value.filter(i => i.category === category)
  }

  // Selection
  function selectRecipe(recipe: Recipe | null): void {
    state.value.selectedRecipe = recipe
  }

  function selectIngredient(ingredient: Ingredient | null): void {
    state.value.selectedIngredient = ingredient
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
    units,
    menuRecipeLinks,

    // Getters
    activeRecipes,
    activeIngredients,
    recipesByCategory,
    ingredientsByCategory,
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
    getUnitById,
    getRecipesByCategory,
    getIngredientsByCategory,

    // Selection
    selectRecipe,
    selectIngredient,

    // Utils
    clearError
  }
})
