// src/stores/recipes/supabase/recipesSupabaseService.ts - Supabase service for recipes

import { supabase } from '@/config/supabase'
import { DebugUtils } from '@/utils'
import type { Recipe, RecipeComponent, RecipeStep, CreateRecipeData } from '../types'
import {
  recipeToSupabase,
  recipeFromSupabase,
  recipeComponentToSupabase,
  recipeComponentFromSupabase,
  recipeStepToSupabase,
  recipeStepFromSupabase
} from './mappers'
import { generateId } from '@/utils/id'

const MODULE_NAME = 'RecipesSupabaseService'

// =============================================
// RECIPE OPERATIONS
// =============================================

/**
 * Fetch all recipes with their components and steps
 */
export async function getAllRecipes(): Promise<Recipe[]> {
  try {
    DebugUtils.info(MODULE_NAME, 'Fetching all recipes from Supabase')

    // Fetch recipes
    const { data: recipeRows, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .order('name')

    if (recipesError) {
      throw new Error(`Failed to fetch recipes: ${recipesError.message}`)
    }

    if (!recipeRows || recipeRows.length === 0) {
      DebugUtils.info(MODULE_NAME, 'No recipes found in Supabase')
      return []
    }

    // Fetch all components for all recipes
    const recipeIds = recipeRows.map(r => r.id)
    const { data: componentRows, error: componentsError } = await supabase
      .from('recipe_components')
      .select('*')
      .in('recipe_id', recipeIds)
      .order('sort_order')

    if (componentsError) {
      DebugUtils.warn(MODULE_NAME, 'Failed to fetch recipe components', { error: componentsError })
    }

    // Fetch all steps for all recipes
    const { data: stepRows, error: stepsError } = await supabase
      .from('recipe_steps')
      .select('*')
      .in('recipe_id', recipeIds)
      .order('step_number')

    if (stepsError) {
      DebugUtils.warn(MODULE_NAME, 'Failed to fetch recipe steps', { error: stepsError })
    }

    // Group components and steps by recipe ID
    const componentsByRecipe = new Map<string, RecipeComponent[]>()
    const stepsByRecipe = new Map<string, RecipeStep[]>()

    componentRows?.forEach(row => {
      const component = recipeComponentFromSupabase(row)
      if (!componentsByRecipe.has(row.recipe_id)) {
        componentsByRecipe.set(row.recipe_id, [])
      }
      componentsByRecipe.get(row.recipe_id)!.push(component)
    })

    stepRows?.forEach(row => {
      const step = recipeStepFromSupabase(row)
      if (!stepsByRecipe.has(row.recipe_id)) {
        stepsByRecipe.set(row.recipe_id, [])
      }
      stepsByRecipe.get(row.recipe_id)!.push(step)
    })

    // Convert to Recipe objects
    const recipes = recipeRows.map(row =>
      recipeFromSupabase(row, componentsByRecipe.get(row.id) || [], stepsByRecipe.get(row.id) || [])
    )

    DebugUtils.info(MODULE_NAME, `Loaded ${recipes.length} recipes from Supabase`, {
      recipes: recipes.length,
      components: componentRows?.length || 0,
      steps: stepRows?.length || 0
    })

    return recipes
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch recipes from Supabase', { error })
    throw error
  }
}

/**
 * Fetch a single recipe by ID
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const { data: recipeRow, error: recipeError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()

    if (recipeError) {
      if (recipeError.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch recipe: ${recipeError.message}`)
    }

    // Fetch components
    const { data: componentRows } = await supabase
      .from('recipe_components')
      .select('*')
      .eq('recipe_id', id)
      .order('sort_order')

    // Fetch steps
    const { data: stepRows } = await supabase
      .from('recipe_steps')
      .select('*')
      .eq('recipe_id', id)
      .order('step_number')

    const components = componentRows?.map(recipeComponentFromSupabase) || []
    const steps = stepRows?.map(recipeStepFromSupabase) || []

    return recipeFromSupabase(recipeRow, components, steps)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch recipe by ID', { error, id })
    throw error
  }
}

/**
 * Create a new recipe
 */
export async function createRecipe(data: CreateRecipeData): Promise<Recipe> {
  try {
    const recipeId = generateId()

    const recipe: Recipe = {
      id: recipeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: data.name,
      code: data.code,
      description: data.description,
      category: data.category,
      portionSize: data.portionSize,
      portionUnit: data.portionUnit,
      components: [],
      instructions: [],
      prepTime: data.prepTime,
      cookTime: data.cookTime,
      difficulty: data.difficulty,
      tags: data.tags,
      isActive: true
    }

    const recipeRow = recipeToSupabase(recipe)

    const { error } = await supabase.from('recipes').insert([recipeRow])

    if (error) {
      throw new Error(`Failed to create recipe: ${error.message}`)
    }

    DebugUtils.info(MODULE_NAME, 'Recipe created in Supabase', { id: recipeId, name: data.name })

    return recipe
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create recipe', { error, data })
    throw error
  }
}

/**
 * Update an existing recipe
 */
export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  try {
    const existing = await getRecipeById(id)
    if (!existing) {
      throw new Error(`Recipe not found: ${id}`)
    }

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    const recipeRow = recipeToSupabase(updated)

    const { error } = await supabase.from('recipes').update(recipeRow).eq('id', id)

    if (error) {
      throw new Error(`Failed to update recipe: ${error.message}`)
    }

    // If components were updated, save them
    if (updates.components) {
      await saveRecipeComponents(id, updates.components)
    }

    // If instructions were updated, save them
    if (updates.instructions) {
      await saveRecipeSteps(id, updates.instructions)
    }

    DebugUtils.info(MODULE_NAME, 'Recipe updated in Supabase', { id })

    return (await getRecipeById(id)) as Recipe
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to update recipe', { error, id, updates })
    throw error
  }
}

/**
 * Delete a recipe
 */
export async function deleteRecipe(id: string): Promise<void> {
  try {
    // Delete components
    await supabase.from('recipe_components').delete().eq('recipe_id', id)

    // Delete steps
    await supabase.from('recipe_steps').delete().eq('recipe_id', id)

    // Delete recipe
    const { error } = await supabase.from('recipes').delete().eq('id', id)

    if (error) {
      throw new Error(`Failed to delete recipe: ${error.message}`)
    }

    DebugUtils.info(MODULE_NAME, 'Recipe deleted from Supabase', { id })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to delete recipe', { error, id })
    throw error
  }
}

// =============================================
// COMPONENT OPERATIONS
// =============================================

async function saveRecipeComponents(
  recipeId: string,
  components: RecipeComponent[]
): Promise<void> {
  try {
    // Delete existing components
    await supabase.from('recipe_components').delete().eq('recipe_id', recipeId)

    if (components.length === 0) {
      return
    }

    // Insert new components
    const componentRows = components.map(c => recipeComponentToSupabase(c, recipeId))

    const { error } = await supabase.from('recipe_components').insert(componentRows)

    if (error) {
      throw new Error(`Failed to save recipe components: ${error.message}`)
    }

    DebugUtils.info(MODULE_NAME, 'Recipe components saved', {
      recipeId,
      count: components.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save recipe components', { error, recipeId })
    throw error
  }
}

// =============================================
// STEP OPERATIONS
// =============================================

async function saveRecipeSteps(recipeId: string, steps: RecipeStep[]): Promise<void> {
  try {
    // Delete existing steps
    await supabase.from('recipe_steps').delete().eq('recipe_id', recipeId)

    if (steps.length === 0) {
      return
    }

    // Insert new steps
    const stepRows = steps.map(s => recipeStepToSupabase(s, recipeId))

    const { error } = await supabase.from('recipe_steps').insert(stepRows)

    if (error) {
      throw new Error(`Failed to save recipe steps: ${error.message}`)
    }

    DebugUtils.info(MODULE_NAME, 'Recipe steps saved', { recipeId, count: steps.length })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save recipe steps', { error, recipeId })
    throw error
  }
}
