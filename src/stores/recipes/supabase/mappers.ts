// src/stores/recipes/supabase/mappers.ts - Supabase mappers for recipes

import { generateId } from '@/utils/id'
import type {
  Recipe,
  RecipeComponent,
  RecipeStep,
  Preparation,
  PreparationIngredient
} from '../types'

// =============================================
// DATABASE TYPES (from Supabase schema)
// =============================================

interface RecipeRow {
  id: string
  created_at: string
  updated_at: string
  closed_at?: string | null
  created_by?: string | null
  updated_by?: string | null
  name: string
  code?: string | null
  description?: string | null
  category: 'main_dish' | 'side_dish' | 'dessert' | 'appetizer' | 'beverage' | 'sauce'
  portion_size: number
  portion_unit: string
  prep_time?: number | null
  cook_time?: number | null
  difficulty: 'easy' | 'medium' | 'hard'
  tags?: string[] | null
  is_active: boolean
  cost?: number | null
}

interface RecipeComponentRow {
  id: string
  recipe_id: string
  component_id: string
  component_type: 'product' | 'preparation'
  quantity: number
  unit: string
  preparation?: string | null
  is_optional?: boolean | null
  notes?: string | null
  sort_order: number
}

interface RecipeStepRow {
  id: string
  recipe_id: string
  step_number: number
  instruction: string
  duration?: number | null
  temperature?: number | null
  equipment?: string[] | null
}

interface PreparationRow {
  id: string
  created_at: string
  updated_at: string
  closed_at?: string | null
  created_by?: string | null
  updated_by?: string | null
  name: string
  code: string
  description?: string | null
  type: 'sauce' | 'garnish' | 'marinade' | 'semifinished' | 'seasoning'
  output_quantity: number
  output_unit: 'gram' | 'ml'
  preparation_time: number
  instructions: string
  is_active: boolean
  cost_per_portion?: number | null
}

interface PreparationIngredientRow {
  id: string
  preparation_id: string
  type: 'product' | 'preparation'
  product_id: string
  quantity: number
  unit: string
  notes?: string | null
  sort_order: number
}

// =============================================
// RECIPE MAPPERS
// =============================================

/**
 * Convert Recipe from TypeScript interface to Supabase row
 */
export function recipeToSupabase(recipe: Recipe): RecipeRow {
  return {
    id: recipe.id,
    created_at: recipe.createdAt || new Date().toISOString(),
    updated_at: recipe.updatedAt || new Date().toISOString(),
    closed_at: recipe.closedAt || null,
    created_by: recipe.createdBy || null,
    updated_by: recipe.updatedBy || null,
    name: recipe.name,
    code: recipe.code || null,
    description: recipe.description || null,
    category: recipe.category,
    portion_size: recipe.portionSize,
    portion_unit: recipe.portionUnit,
    prep_time: recipe.prepTime || null,
    cook_time: recipe.cookTime || null,
    difficulty: recipe.difficulty,
    tags: recipe.tags || null,
    is_active: recipe.isActive,
    cost: recipe.cost || null
  }
}

/**
 * Convert Recipe from Supabase row to TypeScript interface
 */
export function recipeFromSupabase(
  row: RecipeRow,
  components: RecipeComponent[] = [],
  instructions: RecipeStep[] = []
): Recipe {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at || undefined,
    createdBy: row.created_by || undefined,
    updatedBy: row.updated_by || undefined,
    name: row.name,
    code: row.code || undefined,
    description: row.description || undefined,
    category: row.category,
    portionSize: row.portion_size,
    portionUnit: row.portion_unit,
    components,
    instructions,
    prepTime: row.prep_time || undefined,
    cookTime: row.cook_time || undefined,
    difficulty: row.difficulty,
    tags: row.tags || undefined,
    isActive: row.is_active,
    cost: row.cost || undefined
  }
}

/**
 * Convert RecipeComponent to Supabase row
 */
export function recipeComponentToSupabase(
  component: RecipeComponent,
  recipeId: string
): RecipeComponentRow {
  return {
    id: component.id,
    recipe_id: recipeId,
    component_id: component.componentId,
    component_type: component.componentType,
    quantity: component.quantity,
    unit: component.unit,
    preparation: component.preparation || null,
    is_optional: component.isOptional || false,
    notes: component.notes || null,
    sort_order: 0
  }
}

/**
 * Convert RecipeComponent from Supabase row to TypeScript interface
 */
export function recipeComponentFromSupabase(row: RecipeComponentRow): RecipeComponent {
  return {
    id: row.id,
    componentId: row.component_id,
    componentType: row.component_type,
    quantity: row.quantity,
    unit: row.unit as any, // MeasurementUnit type
    preparation: row.preparation || undefined,
    isOptional: row.is_optional || undefined,
    notes: row.notes || undefined
  }
}

/**
 * Convert RecipeStep to Supabase row
 */
export function recipeStepToSupabase(step: RecipeStep, recipeId: string): RecipeStepRow {
  return {
    id: step.id,
    recipe_id: recipeId,
    step_number: step.stepNumber,
    instruction: step.instruction,
    duration: step.duration || null,
    temperature: step.temperature || null,
    equipment: step.equipment || null
  }
}

/**
 * Convert RecipeStep from Supabase row to TypeScript interface
 */
export function recipeStepFromSupabase(row: RecipeStepRow): RecipeStep {
  return {
    id: row.id,
    stepNumber: row.step_number,
    instruction: row.instruction,
    duration: row.duration || undefined,
    temperature: row.temperature || undefined,
    equipment: row.equipment || undefined
  }
}

// =============================================
// PREPARATION MAPPERS
// =============================================

/**
 * Convert Preparation from TypeScript interface to Supabase row
 */
export function preparationToSupabase(preparation: Preparation): PreparationRow {
  return {
    id: preparation.id,
    created_at: preparation.createdAt || new Date().toISOString(),
    updated_at: preparation.updatedAt || new Date().toISOString(),
    closed_at: preparation.closedAt || null,
    created_by: preparation.createdBy || null,
    updated_by: preparation.updatedBy || null,
    name: preparation.name,
    code: preparation.code,
    description: preparation.description || null,
    type: preparation.type,
    output_quantity: preparation.outputQuantity,
    output_unit: preparation.outputUnit,
    preparation_time: preparation.preparationTime,
    instructions: preparation.instructions,
    is_active: preparation.isActive,
    cost_per_portion: preparation.costPerPortion || null
  }
}

/**
 * Convert Preparation from Supabase row to TypeScript interface
 */
export function preparationFromSupabase(
  row: PreparationRow,
  recipe: PreparationIngredient[] = []
): Preparation {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at || undefined,
    createdBy: row.created_by || undefined,
    updatedBy: row.updated_by || undefined,
    name: row.name,
    code: row.code,
    description: row.description || undefined,
    type: row.type,
    recipe,
    outputQuantity: row.output_quantity,
    outputUnit: row.output_unit,
    preparationTime: row.preparation_time,
    instructions: row.instructions,
    isActive: row.is_active,
    costPerPortion: row.cost_per_portion || undefined
  }
}

/**
 * Convert PreparationIngredient to Supabase row
 */
export function preparationIngredientToSupabase(
  ingredient: PreparationIngredient,
  preparationId: string,
  sortOrder: number = 0
): PreparationIngredientRow {
  return {
    id: generateId(), // Generate new ID for ingredient row
    preparation_id: preparationId,
    type: ingredient.type,
    product_id: ingredient.id, // component ID (product or preparation)
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    notes: ingredient.notes || null,
    sort_order: sortOrder
  }
}

/**
 * Convert PreparationIngredient from Supabase row to TypeScript interface
 */
export function preparationIngredientFromSupabase(
  row: PreparationIngredientRow
): PreparationIngredient {
  return {
    type: row.type as 'product', // Currently only products supported
    id: row.product_id,
    quantity: row.quantity,
    unit: row.unit as any, // MeasurementUnit type
    notes: row.notes || undefined
  }
}
