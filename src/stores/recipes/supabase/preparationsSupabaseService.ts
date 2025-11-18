// src/stores/recipes/supabase/preparationsSupabaseService.ts - Supabase service for preparations

import { supabase } from '@/config/supabase'
import { DebugUtils } from '@/utils'
import type { Preparation, PreparationIngredient, CreatePreparationData } from '../types'
import {
  preparationToSupabase,
  preparationFromSupabase,
  preparationIngredientToSupabase,
  preparationIngredientFromSupabase
} from './mappers'
import { generateId } from '@/utils/id'

const MODULE_NAME = 'PreparationsSupabaseService'

// =============================================
// PREPARATION OPERATIONS
// =============================================

/**
 * Fetch all preparations with their ingredients
 */
export async function getAllPreparations(): Promise<Preparation[]> {
  try {
    DebugUtils.info(MODULE_NAME, 'Fetching all preparations from Supabase')

    // Fetch preparations
    const { data: preparationRows, error: preparationsError } = await supabase
      .from('preparations')
      .select('*')
      .order('name')

    if (preparationsError) {
      throw new Error(`Failed to fetch preparations: ${preparationsError.message}`)
    }

    if (!preparationRows || preparationRows.length === 0) {
      DebugUtils.info(MODULE_NAME, 'No preparations found in Supabase')
      return []
    }

    // Fetch all ingredients for all preparations
    const preparationIds = preparationRows.map(p => p.id)
    const { data: ingredientRows, error: ingredientsError } = await supabase
      .from('preparation_ingredients')
      .select('*')
      .in('preparation_id', preparationIds)
      .order('sort_order')

    if (ingredientsError) {
      DebugUtils.warn(MODULE_NAME, 'Failed to fetch preparation ingredients', {
        error: ingredientsError
      })
    }

    // Group ingredients by preparation ID
    const ingredientsByPreparation = new Map<string, PreparationIngredient[]>()

    ingredientRows?.forEach(row => {
      const ingredient = preparationIngredientFromSupabase(row)
      if (!ingredientsByPreparation.has(row.preparation_id)) {
        ingredientsByPreparation.set(row.preparation_id, [])
      }
      ingredientsByPreparation.get(row.preparation_id)!.push(ingredient)
    })

    // Convert to Preparation objects
    const preparations = preparationRows.map(row =>
      preparationFromSupabase(row, ingredientsByPreparation.get(row.id) || [])
    )

    DebugUtils.info(MODULE_NAME, `Loaded ${preparations.length} preparations from Supabase`, {
      preparations: preparations.length,
      ingredients: ingredientRows?.length || 0
    })

    return preparations
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch preparations from Supabase', { error })
    throw error
  }
}

/**
 * Fetch a single preparation by ID
 */
export async function getPreparationById(id: string): Promise<Preparation | null> {
  try {
    const { data: preparationRow, error: preparationError } = await supabase
      .from('preparations')
      .select('*')
      .eq('id', id)
      .single()

    if (preparationError) {
      if (preparationError.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to fetch preparation: ${preparationError.message}`)
    }

    // Fetch ingredients
    const { data: ingredientRows } = await supabase
      .from('preparation_ingredients')
      .select('*')
      .eq('preparation_id', id)
      .order('sort_order')

    const ingredients = ingredientRows?.map(preparationIngredientFromSupabase) || []

    return preparationFromSupabase(preparationRow, ingredients)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch preparation by ID', { error, id })
    throw error
  }
}

/**
 * Create a new preparation
 */
export async function createPreparation(data: CreatePreparationData): Promise<Preparation> {
  try {
    const preparationId = generateId()

    const preparation: Preparation = {
      id: preparationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: data.name,
      code: data.code,
      description: data.description,
      type: data.type,
      recipe: data.recipe || [],
      outputQuantity: data.outputQuantity,
      outputUnit: data.outputUnit,
      preparationTime: data.preparationTime,
      instructions: data.instructions,
      isActive: true
    }

    const preparationRow = preparationToSupabase(preparation)

    const { error } = await supabase.from('preparations').insert([preparationRow])

    if (error) {
      throw new Error(`Failed to create preparation: ${error.message}`)
    }

    // Save ingredients
    if (data.recipe && data.recipe.length > 0) {
      await savePreparationIngredients(preparationId, data.recipe)
    }

    DebugUtils.info(MODULE_NAME, 'Preparation created in Supabase', {
      id: preparationId,
      name: data.name
    })

    return preparation
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create preparation', { error, data })
    throw error
  }
}

/**
 * Update an existing preparation
 */
export async function updatePreparation(
  id: string,
  updates: Partial<Preparation>
): Promise<Preparation> {
  try {
    const existing = await getPreparationById(id)
    if (!existing) {
      throw new Error(`Preparation not found: ${id}`)
    }

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    const preparationRow = preparationToSupabase(updated)

    const { error } = await supabase.from('preparations').update(preparationRow).eq('id', id)

    if (error) {
      throw new Error(`Failed to update preparation: ${error.message}`)
    }

    // If recipe (ingredients) were updated, save them
    if (updates.recipe) {
      await savePreparationIngredients(id, updates.recipe)
    }

    DebugUtils.info(MODULE_NAME, 'Preparation updated in Supabase', { id })

    return (await getPreparationById(id)) as Preparation
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to update preparation', { error, id, updates })
    throw error
  }
}

/**
 * Delete a preparation
 */
export async function deletePreparation(id: string): Promise<void> {
  try {
    // Delete ingredients
    await supabase.from('preparation_ingredients').delete().eq('preparation_id', id)

    // Delete preparation
    const { error } = await supabase.from('preparations').delete().eq('id', id)

    if (error) {
      throw new Error(`Failed to delete preparation: ${error.message}`)
    }

    DebugUtils.info(MODULE_NAME, 'Preparation deleted from Supabase', { id })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to delete preparation', { error, id })
    throw error
  }
}

// =============================================
// INGREDIENT OPERATIONS
// =============================================

async function savePreparationIngredients(
  preparationId: string,
  ingredients: PreparationIngredient[]
): Promise<void> {
  try {
    // Delete existing ingredients
    await supabase.from('preparation_ingredients').delete().eq('preparation_id', preparationId)

    if (ingredients.length === 0) {
      return
    }

    // Insert new ingredients
    const ingredientRows = ingredients.map((ingredient, index) =>
      preparationIngredientToSupabase(ingredient, preparationId, index)
    )

    const { error } = await supabase.from('preparation_ingredients').insert(ingredientRows)

    if (error) {
      throw new Error(`Failed to save preparation ingredients: ${error.message}`)
    }

    DebugUtils.info(MODULE_NAME, 'Preparation ingredients saved', {
      preparationId,
      count: ingredients.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save preparation ingredients', {
      error,
      preparationId
    })
    throw error
  }
}
