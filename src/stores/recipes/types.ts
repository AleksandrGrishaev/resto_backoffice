// src/stores/recipes/types.ts
import { BaseEntity } from '@/types/common'

// Base ingredient
export interface Ingredient extends BaseEntity {
  name: string
  code: string // e.g. H-2, V-22, M-1
  category: IngredientCategory
  unitId: string // ID of the unit
  costPerUnit?: number // cost per unit
  supplier?: string
  description?: string
  isActive: boolean
  isComposite: boolean // true if this is a composite ingredient (sauce, mix)
  allergens?: string[]
}

// Ingredient categories (from tech cards)
export type IngredientCategory =
  | 'herbs' // H - herbs, spices
  | 'vegetables' // V - vegetables
  | 'meat' // M - meat
  | 'dairy' // D - dairy products
  | 'grains' // O - grains, pasta
  | 'condiments' // C - condiments, oils
  | 'prepared' // P - prepared mixes/sauces

// Units of measurement
export interface Unit {
  id: string
  name: string
  shortName: string
  type: 'weight' | 'volume' | 'piece'
  baseUnit?: string // for conversion
  conversionRate?: number
}

// Recipe ingredient item
export interface RecipeIngredient {
  id: string
  ingredientId: string
  quantity: number
  unit: string
  preparation?: string // e.g. "sliced", "crashed"
  isOptional?: boolean
  notes?: string
}

// Recipe (tech card)
export interface Recipe extends BaseEntity {
  name: string
  code?: string
  description?: string
  category: RecipeCategory
  portionSize: number // number of portions
  portionUnit: string
  ingredients: RecipeIngredient[]
  instructions?: RecipeStep[]
  prepTime?: number // preparation time in minutes
  cookTime?: number
  difficulty: 'easy' | 'medium' | 'hard'
  tags?: string[]
  isActive: boolean
  cost?: number // calculated cost
  yield?: {
    quantity: number
    unit: string
  }
}

export type RecipeCategory =
  | 'sauce' // sauces
  | 'main' // main dishes
  | 'side' // sides
  | 'dessert' // desserts
  | 'beverage' // beverages
  | 'appetizer' // appetizers
  | 'preparation' // preparations

// Cooking step
export interface RecipeStep {
  id: string
  stepNumber: number
  instruction: string
  duration?: number
  temperature?: number
  equipment?: string[]
}

// Link between menu item and recipe
export interface MenuRecipeLink extends BaseEntity {
  menuItemId: string
  variantId?: string
  recipeId: string
  portionMultiplier: number // multiplier to adapt recipe to portion size
  modifications?: RecipeModification[]
}

// Recipe modification for specific menu dish
export interface RecipeModification {
  id: string
  type: 'add' | 'remove' | 'replace' | 'adjust'
  ingredientId?: string
  newIngredientId?: string // for replacement
  quantityMultiplier?: number
  notes?: string
}

// Cost calculation
export interface CostCalculation {
  recipeId: string
  totalCost: number
  costPerPortion: number
  ingredientCosts: {
    ingredientId: string
    cost: number
    percentage: number
  }[]
  calculatedAt: Date
}

// Form data types
export interface CreateRecipeData {
  name: string
  code?: string
  description?: string
  category: RecipeCategory
  portionSize: number
  portionUnit: string
  prepTime?: number
  cookTime?: number
  difficulty: 'easy' | 'medium' | 'hard'
  tags?: string[]
}

export interface CreateIngredientData {
  name: string
  code: string
  category: IngredientCategory
  unitId: string
  costPerUnit?: number
  supplier?: string
  description?: string
  isComposite?: boolean
  allergens?: string[]
}

// Constants for categories
export const INGREDIENT_CATEGORIES = [
  { value: 'herbs', text: 'Herbs & Spices', prefix: 'H' },
  { value: 'vegetables', text: 'Vegetables', prefix: 'V' },
  { value: 'meat', text: 'Meat', prefix: 'M' },
  { value: 'dairy', text: 'Dairy Products', prefix: 'D' },
  { value: 'grains', text: 'Grains & Pasta', prefix: 'O' },
  { value: 'condiments', text: 'Condiments & Oils', prefix: 'C' },
  { value: 'prepared', text: 'Prepared Mixes', prefix: 'P' }
] as const

export const RECIPE_CATEGORIES = [
  { value: 'sauce', text: 'Sauces' },
  { value: 'main', text: 'Main Dishes' },
  { value: 'side', text: 'Sides' },
  { value: 'dessert', text: 'Desserts' },
  { value: 'beverage', text: 'Beverages' },
  { value: 'appetizer', text: 'Appetizers' },
  { value: 'preparation', text: 'Preparations' }
] as const

export const DIFFICULTY_LEVELS = [
  { value: 'easy', text: 'Easy', color: 'success' },
  { value: 'medium', text: 'Medium', color: 'warning' },
  { value: 'hard', text: 'Hard', color: 'error' }
] as const
