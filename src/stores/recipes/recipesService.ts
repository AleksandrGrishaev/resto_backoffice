// src/stores/recipes/recipesService.ts - Supabase-only service

import type {
  Preparation,
  PreparationCategory,
  RecipeCategory,
  Recipe,
  MenuRecipeLink,
  Unit,
  CreatePreparationData,
  CreateRecipeData,
  RecipeStep,
  RecipeComponent,
  PreparationIngredient
} from './types'
import { DebugUtils, TimeUtils, generateId } from '@/utils'
import { ENV } from '@/config/environment'
import { supabase } from '@/supabase/client'
import {
  preparationToSupabaseInsert,
  preparationToSupabaseUpdate,
  preparationFromSupabase,
  preparationIngredientToSupabaseInsert,
  preparationIngredientFromSupabase,
  recipeToSupabaseInsert,
  recipeToSupabaseUpdate,
  recipeFromSupabase,
  recipeComponentToSupabaseInsert,
  recipeComponentFromSupabase,
  recipeStepToSupabaseInsert,
  recipeStepFromSupabase,
  preparationIngredientsFromSupabase,
  recipeComponentsFromSupabase,
  recipeStepsFromSupabase
} from './supabaseMappers'

const MODULE_NAME = 'RecipesService'

// Helper: Check if Supabase is available
function isSupabaseAvailable(): boolean {
  return ENV.useSupabase && !!supabase
}

// Helper: Generate next preparation code (P-001, P-002, etc.)
async function getNextPreparationCode(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('preparations')
      .select('code')
      .not('code', 'is', null)
      .order('code', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching last preparation code:', error)
      return 'P-001' // Fallback
    }

    const lastCode = data?.[0]?.code || 'P-000'
    const lastNumber = parseInt(lastCode.split('-')[1]) || 0

    return `P-${(lastNumber + 1).toString().padStart(3, '0')}`
  } catch (error) {
    console.error('Error generating preparation code:', error)
    return 'P-001' // Fallback
  }
}

// Helper: Generate next recipe code (R-001, R-002, etc.)
async function getNextRecipeCode(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('code')
      .not('code', 'is', null)
      .order('code', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching last recipe code:', error)
      return 'R-001' // Fallback
    }

    const lastCode = data?.[0]?.code || 'R-000'
    const lastNumber = parseInt(lastCode.split('-')[1]) || 0

    return `R-${(lastNumber + 1).toString().padStart(3, '0')}`
  } catch (error) {
    console.error('Error generating recipe code:', error)
    return 'R-001' // Fallback
  }
}

// Helper: Timeout wrapper for Supabase requests
const SUPABASE_TIMEOUT = 5000 // 5 seconds

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = SUPABASE_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase request timeout')), timeoutMs)
    )
  ])
}

// =============================================
// PREPARATIONS - CRUD OPERATIONS
// =============================================

/**
 * RecipesService - Supabase-only implementation
 * Pattern: Supabase-first with localStorage cache fallback
 */
export class RecipesService {
  // =============================================
  // PREPARATIONS - READ OPERATIONS
  // =============================================

  /**
   * Get all preparations with ingredients
   */
  async getAllPreparations(): Promise<Preparation[]> {
    try {
      // Try Supabase first (if online)
      if (isSupabaseAvailable()) {
        try {
          // Fetch preparations and their ingredients in parallel
          const [preparationsResult, ingredientsResult] = await Promise.all([
            withTimeout(
              supabase.from('preparations').select('*').order('name', { ascending: true })
            ),
            withTimeout(
              supabase
                .from('preparation_ingredients')
                .select('*')
                .order('sort_order', { ascending: true })
            )
          ])

          if (!preparationsResult.error && preparationsResult.data && !ingredientsResult.error) {
            // Group ingredients by preparation_id
            const ingredientsMap = new Map<string, PreparationIngredient[]>()
            if (ingredientsResult.data) {
              ingredientsResult.data.forEach(ing => {
                const preparationId = ing.preparation_id
                if (!ingredientsMap.has(preparationId)) {
                  ingredientsMap.set(preparationId, [])
                }
                ingredientsMap.get(preparationId)!.push(preparationIngredientFromSupabase(ing))
              })
            }

            // Map preparations with their ingredients
            const preparations = preparationsResult.data.map(row =>
              preparationFromSupabase(row, ingredientsMap.get(row.id) || [])
            )

            // Cache to localStorage for offline
            localStorage.setItem('preparations_cache', JSON.stringify(preparations))
            DebugUtils.info(MODULE_NAME, '✅ Preparations loaded from Supabase', {
              count: preparations.length
            })
            return preparations
          } else {
            DebugUtils.error(MODULE_NAME, 'Failed to load preparations from Supabase:', {
              preparationsError: preparationsResult.error,
              ingredientsError: ingredientsResult.error
            })
          }
        } catch (timeoutError) {
          DebugUtils.warn(MODULE_NAME, '⚠️ Supabase timeout or network error, using cache', {
            error: timeoutError instanceof Error ? timeoutError.message : 'Unknown error'
          })
        }
      }

      // Fallback to localStorage cache
      const cached = localStorage.getItem('preparations_cache')
      if (cached) {
        const preparations = JSON.parse(cached)
        DebugUtils.info(MODULE_NAME, '📦 Preparations loaded from cache', {
          count: preparations.length
        })
        return preparations
      }

      // No data available - return empty array
      DebugUtils.warn(MODULE_NAME, '⚠️ No preparations found (Supabase offline and no cache)')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting all preparations:', error)
      throw error
    }
  }

  /**
   * Get preparation by ID
   */
  async getPreparationById(id: string): Promise<Preparation | null> {
    try {
      const allPreparations = await this.getAllPreparations()
      const preparation = allPreparations.find(p => p.id === id) || null
      DebugUtils.info(MODULE_NAME, 'Preparation by ID', { id, found: !!preparation })
      return preparation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting preparation by ID:', error)
      throw error
    }
  }

  /**
   * Get active preparations
   */
  async getActivePreparations(): Promise<Preparation[]> {
    try {
      const allPreparations = await this.getAllPreparations()
      return allPreparations.filter(p => p.isActive).sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting active preparations:', error)
      throw error
    }
  }

  /**
   * ✅ NEW: Get all preparation categories from database
   */
  async getPreparationCategories(): Promise<PreparationCategory[]> {
    if (!isSupabaseAvailable()) {
      DebugUtils.info(MODULE_NAME, 'Supabase not available, returning empty categories')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('preparation_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load preparation categories', error)
        throw error
      }

      const categories = (data || []).map(row => ({
        id: row.id,
        key: row.key,
        name: row.name,
        description: row.description,
        icon: row.icon,
        emoji: row.emoji,
        color: row.color,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      DebugUtils.info(MODULE_NAME, 'Loaded preparation categories', {
        count: categories.length
      })

      return categories
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading preparation categories', error)
      throw error
    }
  }

  /**
   * ✅ NEW: Get recipe categories from database (Phase 2)
   */
  async getRecipeCategories(): Promise<RecipeCategory[]> {
    if (!isSupabaseAvailable()) {
      DebugUtils.info(MODULE_NAME, 'Supabase not available, returning empty categories')
      return []
    }

    try {
      const { data, error } = await supabase
        .from('recipe_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load recipe categories', error)
        throw error
      }

      const categories = (data || []).map(row => ({
        id: row.id,
        key: row.key,
        name: row.name,
        description: row.description,
        color: row.color,
        icon: row.icon,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))

      DebugUtils.info(MODULE_NAME, 'Loaded recipe categories', {
        count: categories.length
      })

      return categories
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error loading recipe categories', error)
      throw error
    }
  }

  // =============================================
  // PREPARATIONS - WRITE OPERATIONS
  // =============================================

  /**
   * Create new preparation
   */
  async createPreparation(data: CreatePreparationData): Promise<Preparation> {
    try {
      DebugUtils.info(MODULE_NAME, '🍳 Creating preparation', { data })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot create preparation.')
      }

      // Generate code if not provided
      const code = data.code || (await getNextPreparationCode())

      const now = TimeUtils.getCurrentLocalISO()

      // Create preparation data without ID - database will generate UUID
      const preparationInsert = preparationToSupabaseInsert({
        ...data,
        code,
        recipe: data.recipe || [],
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now
      })

      // Insert preparation to Supabase and return the result
      const { data: insertedPreparation, error: preparationError } = await supabase
        .from('preparations')
        .insert(preparationInsert)
        .select()
        .single()

      if (preparationError) {
        DebugUtils.error(
          MODULE_NAME,
          '❌ Failed to save preparation to Supabase:',
          preparationError
        )
        throw new Error(`Failed to create preparation: ${preparationError.message}`)
      }

      const newPreparation = preparationFromSupabase(insertedPreparation)

      // Insert ingredients if provided
      if (data.recipe && data.recipe.length > 0) {
        const ingredientsToInsert = data.recipe.map((ingredient, index) =>
          preparationIngredientToSupabaseInsert(
            {
              ...ingredient,
              sortOrder: index
            },
            newPreparation.id
          )
        )

        const { error: ingredientsError } = await supabase
          .from('preparation_ingredients')
          .insert(ingredientsToInsert)

        if (ingredientsError) {
          DebugUtils.error(
            MODULE_NAME,
            '❌ Failed to save preparation ingredients to Supabase:',
            ingredientsError
          )
          throw new Error(`Failed to create preparation ingredients: ${ingredientsError.message}`)
        }

        // Add ingredients to the preparation object
        newPreparation.recipe = data.recipe
      }

      DebugUtils.info(MODULE_NAME, '✅ Preparation saved to Supabase', {
        id: newPreparation.id,
        name: newPreparation.name,
        ingredientsCount: newPreparation.recipe.length
      })

      // Invalidate cache to force fresh read
      localStorage.removeItem('preparations_cache')

      return newPreparation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error creating preparation', { error, data })
      throw error
    }
  }

  /**
   * Update existing preparation
   */
  async updatePreparation(data: { id: string } & Partial<Preparation>): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating preparation', { data })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot update preparation.')
      }

      // Get existing preparation
      const existingPreparation = await this.getPreparationById(data.id)
      if (!existingPreparation) {
        throw new Error(`Preparation not found: ${data.id}`)
      }

      const { id, recipe, ...updateData } = data
      const updatedPreparation: Preparation = {
        ...existingPreparation,
        ...updateData,
        recipe: recipe || existingPreparation.recipe,
        updatedAt: TimeUtils.getCurrentLocalISO()
      }

      // Update preparation in Supabase
      const { error: preparationError } = await supabase
        .from('preparations')
        .update(preparationToSupabaseUpdate(updatedPreparation))
        .eq('id', id)

      if (preparationError) {
        DebugUtils.error(
          MODULE_NAME,
          '❌ Failed to update preparation in Supabase:',
          preparationError
        )
        throw new Error(`Failed to update preparation: ${preparationError.message}`)
      }

      // Update ingredients if provided
      if (recipe !== undefined) {
        // Delete existing ingredients
        const { error: deleteError } = await supabase
          .from('preparation_ingredients')
          .delete()
          .eq('preparation_id', id)

        if (deleteError) {
          DebugUtils.error(
            MODULE_NAME,
            '❌ Failed to delete old preparation ingredients:',
            deleteError
          )
          throw new Error(`Failed to update preparation ingredients: ${deleteError.message}`)
        }

        // Insert new ingredients
        if (recipe.length > 0) {
          const ingredientsToInsert = recipe.map((ingredient, index) =>
            preparationIngredientToSupabaseInsert(
              {
                ...ingredient,
                sortOrder: index
              },
              id
            )
          )

          const { error: insertError } = await supabase
            .from('preparation_ingredients')
            .insert(ingredientsToInsert)

          if (insertError) {
            DebugUtils.error(
              MODULE_NAME,
              '❌ Failed to insert new preparation ingredients:',
              insertError
            )
            throw new Error(`Failed to update preparation ingredients: ${insertError.message}`)
          }
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Preparation updated in Supabase', { id })

      // Invalidate cache
      localStorage.removeItem('preparations_cache')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error updating preparation', { error, data })
      throw error
    }
  }

  /**
   * Delete preparation
   */
  async deletePreparation(id: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deleting preparation', { id })

      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not available. Cannot delete preparation.')
      }

      // Delete ingredients first (foreign key constraint)
      const { error: ingredientsError } = await supabase
        .from('preparation_ingredients')
        .delete()
        .eq('preparation_id', id)

      if (ingredientsError) {
        DebugUtils.error(
          MODULE_NAME,
          '❌ Failed to delete preparation ingredients:',
          ingredientsError
        )
        throw new Error(`Failed to delete preparation ingredients: ${ingredientsError.message}`)
      }

      // Delete preparation
      const { error: preparationError } = await supabase.from('preparations').delete().eq('id', id)

      if (preparationError) {
        DebugUtils.error(
          MODULE_NAME,
          '❌ Failed to delete preparation from Supabase:',
          preparationError
        )
        throw new Error(`Failed to delete preparation: ${preparationError.message}`)
      }

      DebugUtils.info(MODULE_NAME, '✅ Preparation deleted from Supabase', { id })

      // Invalidate cache
      localStorage.removeItem('preparations_cache')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error deleting preparation', { error, id })
      throw error
    }
  }

  // =============================================
  // RECIPES - READ OPERATIONS
  // =============================================

  /**
   * Get all recipes with components and steps
   */
  async getAllRecipes(): Promise<Recipe[]> {
    try {
      // Try Supabase first (if online)
      if (isSupabaseAvailable()) {
        try {
          // Fetch recipes, components, and steps in parallel
          const [recipesResult, componentsResult, stepsResult] = await Promise.all([
            withTimeout(supabase.from('recipes').select('*').order('name', { ascending: true })),
            withTimeout(
              supabase
                .from('recipe_components')
                .select('*')
                .order('sort_order', { ascending: true })
            ),
            withTimeout(
              supabase.from('recipe_steps').select('*').order('step_number', { ascending: true })
            )
          ])

          if (
            !recipesResult.error &&
            recipesResult.data &&
            !componentsResult.error &&
            !stepsResult.error
          ) {
            // Group components and steps by recipe_id
            const componentsMap = new Map<string, RecipeComponent[]>()
            if (componentsResult.data) {
              componentsResult.data.forEach(comp => {
                const recipeId = comp.recipe_id
                if (!componentsMap.has(recipeId)) {
                  componentsMap.set(recipeId, [])
                }
                componentsMap.get(recipeId)!.push(recipeComponentFromSupabase(comp))
              })
            }

            const stepsMap = new Map<string, RecipeStep[]>()
            if (stepsResult.data) {
              stepsResult.data.forEach(step => {
                const recipeId = step.recipe_id
                if (!stepsMap.has(recipeId)) {
                  stepsMap.set(recipeId, [])
                }
                stepsMap.get(recipeId)!.push(recipeStepFromSupabase(step))
              })
            }

            // Map recipes with their components and steps
            const recipes = recipesResult.data.map(row =>
              recipeFromSupabase(row, componentsMap.get(row.id) || [], stepsMap.get(row.id) || [])
            )

            // Cache to localStorage for offline
            localStorage.setItem('recipes_cache', JSON.stringify(recipes))
            DebugUtils.info(MODULE_NAME, '✅ Recipes loaded from Supabase', {
              count: recipes.length
            })
            return recipes
          } else {
            DebugUtils.error(MODULE_NAME, 'Failed to load recipes from Supabase:', {
              recipesError: recipesResult.error,
              componentsError: componentsResult.error,
              stepsError: stepsResult.error
            })
          }
        } catch (timeoutError) {
          DebugUtils.warn(MODULE_NAME, '⚠️ Supabase timeout or network error, using cache', {
            error: timeoutError instanceof Error ? timeoutError.message : 'Unknown error'
          })
        }
      }

      // Fallback to localStorage cache
      const cached = localStorage.getItem('recipes_cache')
      if (cached) {
        const recipes = JSON.parse(cached)
        DebugUtils.info(MODULE_NAME, '📦 Recipes loaded from cache', { count: recipes.length })
        return recipes
      }

      // No data available - return empty array
      DebugUtils.warn(MODULE_NAME, '⚠️ No recipes found (Supabase offline and no cache)')
      return []
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting all recipes:', error)
      throw error
    }
  }

  /**
   * Get recipe by ID
   */
  async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const allRecipes = await this.getAllRecipes()
      const recipe = allRecipes.find(r => r.id === id) || null
      DebugUtils.info(MODULE_NAME, 'Recipe by ID', { id, found: !!recipe })
      return recipe
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error getting recipe by ID:', error)
      throw error
    }
  }

  // =============================================
  // RECIPES - WRITE OPERATIONS
  // =============================================

  /**
   * Create a new recipe
   */
  async createRecipe(data: CreateRecipeData): Promise<Recipe> {
    try {
      DebugUtils.info(MODULE_NAME, '🔄 Creating new recipe', { name: data.name })

      // Generate code if not provided
      const code = data.code || (await getNextRecipeCode())

      const now = TimeUtils.getCurrentLocalISO()

      // Create recipe data without ID - database will generate UUID
      const recipeInsert = recipeToSupabaseInsert({
        ...data,
        code,
        components: data.components || [],
        steps: data.steps || [],
        isActive: data.isActive ?? true,
        createdAt: now,
        updatedAt: now
      })

      // Insert recipe to Supabase and return the result
      const { data: insertedRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert(recipeInsert)
        .select()
        .single()

      if (recipeError) {
        DebugUtils.error(MODULE_NAME, '❌ Failed to save recipe to Supabase:', recipeError)
        throw new Error(`Failed to create recipe: ${recipeError.message}`)
      }

      const newRecipe = recipeFromSupabase(insertedRecipe)

      // Insert components if provided
      if (data.components && data.components.length > 0) {
        const componentsToInsert = data.components.map((component, index) =>
          recipeComponentToSupabaseInsert(
            {
              ...component,
              sortOrder: index
            },
            newRecipe.id
          )
        )

        const { error: componentsError } = await supabase
          .from('recipe_components')
          .insert(componentsToInsert)

        if (componentsError) {
          DebugUtils.error(
            MODULE_NAME,
            '❌ Failed to save recipe components to Supabase:',
            componentsError
          )
          throw new Error(`Failed to create recipe components: ${componentsError.message}`)
        }
      }

      // Insert steps if provided
      if (data.steps && data.steps.length > 0) {
        const stepsToInsert = data.steps.map((step, index) =>
          recipeStepToSupabaseInsert(
            {
              ...step,
              stepNumber: index + 1
            },
            newRecipe.id
          )
        )

        const { error: stepsError } = await supabase.from('recipe_steps').insert(stepsToInsert)

        if (stepsError) {
          DebugUtils.error(MODULE_NAME, '❌ Failed to save recipe steps to Supabase:', stepsError)
          throw new Error(`Failed to create recipe steps: ${stepsError.message}`)
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Recipe saved to Supabase', {
        id: newRecipe.id,
        name: newRecipe.name,
        code: newRecipe.code
      })

      // Return complete recipe with components and steps
      return await this.getRecipeById(newRecipe.id)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error in createRecipe:', error)
      throw error
    }
  }

  // =============================================
  // LEGACY RECIPE WRITE OPERATIONS (TODO: Remove when migration complete)
  // =============================================
  // Future implementation for recipe write operations
}

// Export singleton instance
export const recipesService = new RecipesService()

// =============================================
// LEGACY SERVICES FOR BACKWARD COMPATIBILITY
// =============================================

// Re-export legacy services for backward compatibility with existing code
export { usePreparations } from './composables/usePreparations'
export { useRecipes } from './composables/useRecipes'
export { useCostCalculation } from './composables/useCostCalculation'
export { useRecipeIntegration } from './composables/useRecipeIntegration'
export { useMenuRecipeLinks } from './composables/useMenuRecipeLinks'
export { useUnits } from './composables/useUnits'

// Legacy service classes for backward compatibility
import { ref } from 'vue'
import type {
  Preparation,
  Recipe,
  MenuRecipeLink,
  Unit,
  CreatePreparationData,
  CreateRecipeData
} from './types'

export class PreparationService {
  private preparations = ref<Preparation[]>([])

  constructor(initialData: Preparation[] = []) {
    this.preparations.value = initialData
  }

  async getAll(): Promise<Preparation[]> {
    return await recipesService.getAllPreparations()
  }

  async getById(id: string): Promise<Preparation | null> {
    return await recipesService.getPreparationById(id)
  }

  async create(data: CreatePreparationData): Promise<Preparation> {
    return await recipesService.createPreparation(data)
  }

  async update(id: string, data: Partial<Preparation>): Promise<Preparation> {
    const existing = await this.getById(id)
    if (!existing) throw new Error('Preparation not found')
    await recipesService.updatePreparation({ id, ...data })
    return await this.getById(id)
  }

  async delete(id: string): Promise<void> {
    await recipesService.deletePreparation(id)
  }

  async getActivePreparations(): Promise<Preparation[]> {
    return await recipesService.getActivePreparations()
  }
}

export class RecipeService {
  private recipes = ref<Recipe[]>([])

  constructor(initialData: Recipe[] = []) {
    this.recipes.value = initialData
  }

  async getAll(): Promise<Recipe[]> {
    return await recipesService.getAllRecipes()
  }

  async getById(id: string): Promise<Recipe | null> {
    return await recipesService.getRecipeById(id)
  }

  async create(data: CreateRecipeData): Promise<Recipe> {
    // TODO: Implement when recipe write operations are added
    throw new Error('Recipe creation not yet implemented in Supabase service')
  }

  async update(id: string, data: Partial<Recipe>): Promise<Recipe> {
    // TODO: Implement when recipe write operations are added
    throw new Error('Recipe update not yet implemented in Supabase service')
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement when recipe write operations are added
    throw new Error('Recipe deletion not yet implemented in Supabase service')
  }

  async getActiveRecipes(): Promise<Recipe[]> {
    const allRecipes = await this.getAll()
    return allRecipes.filter(r => r.isActive)
  }
}

export class MenuRecipeLinkService {
  private links = ref<MenuRecipeLink[]>([])

  constructor(initialData: MenuRecipeLink[] = []) {
    this.links.value = initialData
  }

  async getAll(): Promise<MenuRecipeLink[]> {
    return [...this.links.value]
  }

  async getById(id: string): Promise<MenuRecipeLink | null> {
    return this.links.value.find(item => item.id === id) || null
  }

  async create(
    menuItemId: string,
    recipeId: string,
    variantId?: string,
    portionMultiplier: number = 1
  ): Promise<MenuRecipeLink> {
    // TODO: Implement when menu recipe link operations are added
    throw new Error('MenuRecipeLink creation not yet implemented')
  }

  async update(id: string, data: Partial<MenuRecipeLink>): Promise<MenuRecipeLink> {
    // TODO: Implement when menu recipe link operations are added
    throw new Error('MenuRecipeLink update not yet implemented')
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement when menu recipe link operations are added
    throw new Error('MenuRecipeLink deletion not yet implemented')
  }

  async getByMenuItem(menuItemId: string, variantId?: string): Promise<MenuRecipeLink[]> {
    return this.links.value.filter(link => {
      const matchesMenuItem = link.menuItemId === menuItemId
      const matchesVariant = variantId ? link.variantId === variantId : !link.variantId
      return matchesMenuItem && matchesVariant
    })
  }

  async getByRecipe(recipeId: string): Promise<MenuRecipeLink[]> {
    return this.links.value.filter(link => link.recipeId === recipeId)
  }
}

export class UnitService {
  private units = ref<Unit[]>([])

  constructor(initialData: Unit[] = []) {
    this.units.value = initialData
  }

  async getAll(): Promise<Unit[]> {
    return [...this.units.value]
  }

  async getById(id: string): Promise<Unit | null> {
    return this.units.value.find(item => item.id === id) || null
  }

  async getByType(type: 'weight' | 'volume' | 'piece'): Promise<Unit[]> {
    return this.units.value.filter(unit => unit.type === type)
  }

  async convert(value: number, fromUnit: string, toUnit: string): Promise<number> {
    // TODO: Implement unit conversion logic
    throw new Error('Unit conversion not yet implemented')
  }
}
