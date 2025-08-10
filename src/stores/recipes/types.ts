// src/stores/recipes/types.ts - Updated with Recipe Integration Types
import { BaseEntity } from '@/types/common'
import type { MeasurementUnit } from '@/types/measurementUnits'

// =============================================
// 1. PREPARATIONS (полуфабрикаты)
// =============================================

export interface Preparation extends BaseEntity {
  name: string // "Картофельное пюре", "Томатный соус"
  code: string // "P-1", "P-2", "P-3"
  description?: string
  type: PreparationType // "sauce", "garnish", "marinade", "semifinished"
  recipe: PreparationIngredient[] // состав ТОЛЬКО из продуктов
  outputQuantity: number // сколько получается на выходе (1500г пюре)
  outputUnit: MeasurementUnit // единица измерения выхода
  preparationTime: number // время приготовления в минутах
  instructions: string // инструкции по приготовлению
  isActive: boolean
  costPerPortion?: number // расчетная себестоимость за единицу выхода
}

// Ингредиент для полуфабриката (ТОЛЬКО продукты)
export interface PreparationIngredient {
  type: 'product' // ТОЛЬКО продукты (не другие preparations)
  id: string // ID продукта
  quantity: number // количество
  unit: MeasurementUnit // единица измерения
  notes?: string // примечания: "diced", "minced"
}

// Типы полуфабрикатов
export type PreparationType =
  | 'sauce' // соусы
  | 'garnish' // гарниры
  | 'marinade' // маринады
  | 'semifinished' // полуфабрикаты
  | 'seasoning' // приправы

// =============================================
// 2. RECIPES (рецепты готовых блюд)
// =============================================

export interface Recipe extends BaseEntity {
  name: string // "Стейк", "Картошка фри"
  code?: string // "R-1", "R-2"
  description?: string
  category: RecipeCategory // "main_dish", "side_dish", "dessert", "appetizer"
  portionSize: number // количество порций на выходе
  portionUnit: string // единица порции
  components: RecipeComponent[] // состав из products + preparations
  instructions?: RecipeStep[] // пошаговые инструкции
  prepTime?: number // время подготовки в минутах
  cookTime?: number // время готовки в минутах
  difficulty: 'easy' | 'medium' | 'hard'
  tags?: string[]
  isActive: boolean
  cost?: number // расчетная себестоимость
  yield?: {
    // выход рецепта
    quantity: number
    unit: string
  }
}

// Компонент рецепта (продукт или полуфабрикат)
export interface RecipeComponent {
  id: string // уникальный ID компонента в рецепте
  componentId: string // ID продукта или полуфабриката
  componentType: 'product' | 'preparation' // тип компонента
  quantity: number // количество
  unit: MeasurementUnit // единица измерения
  preparation?: string // способ подготовки: "sliced", "diced"
  isOptional?: boolean // опциональный ингредиент
  notes?: string // примечания
}

// Типы рецептов
export type RecipeCategory =
  | 'main_dish' // основные блюда
  | 'side_dish' // гарниры
  | 'dessert' // десерты
  | 'appetizer' // закуски
  | 'beverage' // напитки
  | 'sauce' // соусы

// =============================================
// 3. COST CALCULATION TYPES (NEW)
// =============================================

export interface PreparationPlanCost {
  preparationId: string
  type: 'plan' // планируемая стоимость
  totalCost: number
  costPerOutputUnit: number
  componentCosts: ComponentPlanCost[]
  calculatedAt: Date
  note: string // "Based on current supplier prices"
}

export interface RecipePlanCost {
  recipeId: string
  type: 'plan' // планируемая стоимость
  totalCost: number
  costPerPortion: number
  componentCosts: ComponentPlanCost[]
  calculatedAt: Date
  note: string // "Based on current supplier prices + plan preparation costs"
}

export interface ComponentPlanCost {
  componentId: string
  componentType: 'product' | 'preparation'
  componentName: string
  quantity: number
  unit: MeasurementUnit
  planUnitCost: number // планируемая цена за единицу
  totalPlanCost: number // планируемая общая стоимость
  percentage: number
}

// Результат расчета стоимости
export interface CostCalculationResult {
  success: boolean
  cost?: PreparationPlanCost | RecipePlanCost
  error?: string
  affectedItems?: string[] // какие еще items нужно пересчитать
}

// =============================================
// 4. INTEGRATION TYPES (NEW)
// =============================================

export interface ProductForRecipe {
  id: string
  name: string
  nameEn?: string
  costPerUnit: number
  unit: MeasurementUnit
  category: string
  isActive: boolean
}

export interface PreparationForRecipe {
  id: string
  name: string
  code: string
  type: PreparationType
  outputQuantity: number
  outputUnit: MeasurementUnit
  costPerOutputUnit: number
  isActive: boolean
}

// Callbacks для интеграции
export type GetProductCallback = (id: string) => Promise<ProductForRecipe | null>
export type GetPreparationCostCallback = (id: string) => Promise<PreparationPlanCost | null>
export type NotifyUsageChangeCallback = (itemId: string, usageData: any) => Promise<void>

// =============================================
// 5. USAGE TRACKING TYPES (NEW)
// =============================================

export interface ProductUsageInPreparation {
  preparationId: string
  preparationName: string
  preparationCode: string
  quantity: number
  unit: MeasurementUnit
  notes?: string
  isActive: boolean
}

export interface ProductUsageInRecipe {
  recipeId: string
  recipeName: string
  recipeCode?: string
  quantity: number
  unit: MeasurementUnit
  notes?: string
  isActive: boolean
}

export interface PreparationUsageInRecipe {
  recipeId: string
  recipeName: string
  recipeCode?: string
  quantity: number
  unit: MeasurementUnit
  notes?: string
  isActive: boolean
}

// =============================================
// 6. FORM DATA TYPES
// =============================================

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

export interface CreatePreparationData {
  name: string
  code: string
  type: PreparationType
  description?: string
  outputQuantity: number
  outputUnit: MeasurementUnit
  preparationTime: number
  instructions: string
  recipe?: PreparationIngredient[]
}

// =============================================
// 7. LEGACY TYPES (для обратной совместимости)
// =============================================

// Шаг приготовления
export interface RecipeStep {
  id: string
  stepNumber: number
  instruction: string
  duration?: number // длительность в минутах
  temperature?: number // температура
  equipment?: string[] // необходимое оборудование
}

// Старый интерфейс расчета себестоимости
export interface CostCalculation {
  recipeId: string
  totalCost: number
  costPerPortion: number
  componentCosts: {
    componentId: string
    componentType: 'product' | 'preparation'
    cost: number
    percentage: number
  }[]
  calculatedAt: Date
}

// Единицы измерения (для совместимости)
export interface Unit {
  id: string
  name: string
  shortName: string
  type: 'weight' | 'volume' | 'piece'
  baseUnit?: string
  conversionRate?: number
}

// =============================================
// 8. MENU INTEGRATION TYPES
// =============================================

export interface MenuRecipeLink extends BaseEntity {
  menuItemId: string
  variantId?: string
  recipeId: string
  portionMultiplier: number // множитель для адаптации рецепта к размеру порции
  modifications?: RecipeModification[]
}

export interface RecipeModification {
  id: string
  type: 'add' | 'remove' | 'replace' | 'adjust'
  componentId?: string
  newComponentId?: string
  quantityMultiplier?: number
  notes?: string
}

// =============================================
// 9. CONSTANTS
// =============================================

import { RECIPE_UNITS, getUnitName } from '@/types/measurementUnits'

export const PREPARATION_TYPES = [
  { value: 'sauce', text: 'Соусы', prefix: 'P' },
  { value: 'garnish', text: 'Гарниры', prefix: 'P' },
  { value: 'marinade', text: 'Маринады', prefix: 'P' },
  { value: 'semifinished', text: 'Полуфабрикаты', prefix: 'P' },
  { value: 'seasoning', text: 'Приправы', prefix: 'P' }
] as const

export const RECIPE_CATEGORIES = [
  { value: 'main_dish', text: 'Основные блюда' },
  { value: 'side_dish', text: 'Гарниры' },
  { value: 'dessert', text: 'Десерты' },
  { value: 'beverage', text: 'Напитки' },
  { value: 'appetizer', text: 'Закуски' },
  { value: 'sauce', text: 'Соусы' }
] as const

export const DIFFICULTY_LEVELS = [
  { value: 'easy', text: 'Легко', color: 'success' },
  { value: 'medium', text: 'Средне', color: 'warning' },
  { value: 'hard', text: 'Сложно', color: 'error' }
] as const

export const MEASUREMENT_UNITS_FOR_RECIPES = RECIPE_UNITS.reduce(
  (acc, unit) => {
    acc[unit] = getUnitName(unit)
    return acc
  },
  {} as Record<MeasurementUnit, string>
)

// =============================================
// 10. BACKWARD COMPATIBILITY (удалить после миграции)
// =============================================

/** @deprecated Use Preparation instead */
export type Ingredient = Preparation

/** @deprecated Use PreparationType instead */
export type IngredientCategory = PreparationType

/** @deprecated Use PREPARATION_TYPES instead */
export const INGREDIENT_CATEGORIES = PREPARATION_TYPES

/** @deprecated Use RecipeComponent instead */
export type RecipeIngredient = RecipeComponent

/** @deprecated Use CreatePreparationData instead */
export type CreateIngredientData = CreatePreparationData

// Расширяем ComponentCost для совместимости
export interface ComponentCost extends ComponentPlanCost {
  // Для обратной совместимости
  unitCost: number // alias для planUnitCost
  totalCost: number // alias для totalPlanCost
}
