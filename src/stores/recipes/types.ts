// src/stores/recipes/types.ts - ОБНОВЛЕННЫЕ типы с поддержкой базовых единиц

import { BaseEntity } from '@/types/common'
import type { MeasurementUnit } from '@/types/measurementUnits'
import type { Department } from '@/stores/menu/types'

// =============================================
// ИНТЕГРАЦИЯ С ОБНОВЛЕННОЙ ПРОДУКТОВОЙ СИСТЕМОЙ
// =============================================

/**
 * ✅ ОБНОВЛЕНО: Продукт для использования в рецептах с базовыми единицами
 */
export interface ProductForRecipe {
  id: string
  name: string
  nameEn?: string

  // ✅ НОВЫЕ ПОЛЯ: Базовые единицы для правильного расчета
  baseUnit: 'gram' | 'ml' | 'piece' // Единица для расчета себестоимости
  baseCostPerUnit: number // Цена за грамм/мл/штуку в IDR
  yieldPercentage?: number // ✅ NEW: Процент выхода после обработки (очистка, разделка и т.д.)

  // Дополнительная информация
  category: string
  isActive: boolean

  // ✅ DEPRECATED: Старые поля (оставляем для совместимости)
  unit?: MeasurementUnit // Устарело, используйте baseUnit
  costPerUnit?: number // Устарело, используйте baseCostPerUnit
}

/**
 * ✅ ОБНОВЛЕНО: Полуфабрикат для использования в рецептах
 */
export interface PreparationForRecipe {
  id: string
  name: string
  code: string
  type: PreparationType
  department: Department // ✅ NEW: Department that prepares this item

  // ✅ БАЗОВЫЕ ЕДИНИЦЫ: Всегда в граммах или мл
  outputQuantity: number
  outputUnit: 'gram' | 'ml' // Только базовые единицы
  costPerOutputUnit: number // IDR за грамм/мл

  isActive: boolean
}

/**
 * ⭐ NEW: Рецепт для использования в других рецептах (Phase 1 - Recipe Nesting)
 */
export interface RecipeForRecipe {
  id: string
  name: string
  code: string
  category: string
  department: Department

  // Информация о порции для расчета стоимости
  portionSize: number
  portionUnit: string
  cost?: number // Себестоимость порции в IDR

  isActive: boolean
}

// =============================================
// PORTION TYPE (Phase 2)
// =============================================

/**
 * How preparation quantities are measured:
 * - weight: Quantities in grams/ml (default)
 * - portion: Quantities in fixed-size portions (e.g., "10 portions × 30g")
 */
export type PortionType = 'weight' | 'portion'

// =============================================
// PREPARATION (полуфабрикаты)
// =============================================

export interface Preparation extends BaseEntity {
  name: string
  code: string
  description?: string
  type: string // UUID (FK to preparation_categories), will be migrated from TEXT
  department: Department // ✅ NEW: Department that prepares this item ('kitchen' | 'bar')

  // ✅ ОБНОВЛЕНО: Рецепт из продуктов с правильными единицами
  recipe: PreparationIngredient[]

  // ✅ ОБНОВЛЕНО: Выход всегда в базовых единицах
  outputQuantity: number
  outputUnit: 'gram' | 'ml' // Только базовые единицы

  preparationTime: number
  instructions: string
  isActive: boolean
  costPerPortion?: number // Себестоимость за грамм/мл
  shelfLife?: number // Срок хранения в днях

  // ✨ NEW: Negative inventory config (Sprint 1)
  allowNegativeInventory?: boolean
  lastKnownCost?: number

  // ⭐ PHASE 2: Portion type support
  portionType: PortionType // 'weight' (default) or 'portion'
  portionSize?: number // Size of one portion in grams (only for portionType='portion')
}

/**
 * ✅ ОБНОВЛЕНО: Ингредиент полуфабриката
 * ⭐ PHASE 1: Поддержка вложенных полуфабрикатов (nested preparations)
 */
export interface PreparationIngredient {
  type: 'product' | 'preparation' // ⭐ CHANGED: теперь может быть product или preparation
  id: string // ID продукта (type=product) или ID полуфабриката (type=preparation)
  quantity: number
  unit: MeasurementUnit // Единица в рецепте (будет конвертирована в базовую)
  useYieldPercentage?: boolean // ✅ NEW: Учитывать yield percentage при расчете стоимости (только для products)
  notes?: string
  sortOrder?: number // ✅ NEW: Порядок сортировки
}

// Updated to match database keys
export type PreparationType =
  | 'sauce'
  | 'base'
  | 'garnish'
  | 'marinade'
  | 'dough'
  | 'filling'
  | 'other'

// =============================================
// RECIPE (рецепты готовых блюд)
// =============================================

export interface Recipe extends BaseEntity {
  name: string
  code: string // ✅ UPDATED: Required field (auto-generated)
  description?: string
  category: string // UUID (FK to recipe_categories)
  department: Department // ✅ NEW: Department that prepares this recipe ('kitchen' | 'bar')
  portionSize: number
  portionUnit: string

  // ✅ ОБНОВЛЕНО: Компоненты с поддержкой базовых единиц
  components: RecipeComponent[]

  instructions?: RecipeStep[]
  prepTime?: number
  cookTime?: number
  difficulty: 'easy' | 'medium' | 'hard'
  tags?: string[]
  isActive: boolean
  cost?: number // Себестоимость в IDR
}

/**
 * ✅ ОБНОВЛЕНО: Компонент рецепта с поддержкой базовых единиц
 * ⭐ PHASE 1: Поддержка вложенных рецептов (nested recipes)
 */
export interface RecipeComponent {
  id: string
  componentId: string // ID продукта, полуфабриката или рецепта
  componentType: 'product' | 'preparation' | 'recipe' // ⭐ NEW: добавлен тип 'recipe'
  quantity: number
  unit: MeasurementUnit // Единица в рецепте (будет конвертирована)
  useYieldPercentage?: boolean // ✅ NEW: Учитывать yield percentage при расчете стоимости (только для products)
  preparation?: string
  isOptional?: boolean
  notes?: string
}

// ✅ Updated to match database keys
export type RecipeCategoryType =
  | 'main_dish'
  | 'side_dish'
  | 'dessert'
  | 'appetizer'
  | 'beverage'
  | 'sauce'

// =============================================
// COST CALCULATION (себестоимость)
// =============================================

/**
 * ✅ ОБНОВЛЕНО: Планируемая стоимость полуфабриката
 */
export interface PreparationPlanCost {
  preparationId: string
  type: 'plan'
  totalCost: number // Общая стоимость в IDR
  costPerOutputUnit: number // IDR за грамм/мл выхода
  componentCosts: ComponentPlanCost[]
  calculatedAt: Date
  note: string
}

/**
 * ✅ ОБНОВЛЕНО: Планируемая стоимость рецепта
 */
export interface RecipePlanCost {
  recipeId: string
  type: 'plan'
  totalCost: number // Общая стоимость в IDR
  costPerPortion: number // IDR за порцию
  componentCosts: ComponentPlanCost[]
  calculatedAt: Date
  note: string
}

/**
 * ✅ ОБНОВЛЕНО: Стоимость компонента
 */
export interface ComponentPlanCost {
  componentId: string
  componentType: 'product' | 'preparation' | 'recipe'
  componentName: string
  quantity: number // Количество в рецепте
  unit: MeasurementUnit // Единица в рецепте
  planUnitCost: number // IDR за базовую единицу (грамм/мл/шт)
  totalPlanCost: number // Общая стоимость компонента в IDR
  percentage: number // Процент от общей стоимости
}

/**
 * Результат расчета стоимости
 */
export interface CostCalculationResult {
  success: boolean
  cost?: PreparationPlanCost | RecipePlanCost
  error?: string
  affectedItems?: string[]
}

// =============================================
// INTEGRATION CALLBACKS
// =============================================

export type GetProductCallback = (id: string) => Promise<ProductForRecipe | null>
export type GetPreparationCallback = (id: string) => Promise<Preparation | null> // ⭐ NEW: For nested preparations
export type GetRecipeCallback = (id: string) => Promise<Recipe | null> // ⭐ NEW: For nested recipes (Phase 1)
export type GetPreparationCostCallback = (id: string) => Promise<PreparationPlanCost | null>
export type GetRecipeCostCallback = (id: string) => Promise<RecipePlanCost | null> // ⭐ NEW: For nested recipe costs (Phase 1)
export type NotifyUsageChangeCallback = (itemId: string, usageData: any) => Promise<void>

// =============================================
// USAGE TRACKING
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
// FORM DATA TYPES
// =============================================

export interface CreateRecipeData {
  name: string
  code: string // ✅ UPDATED: Required field (auto-generated)
  description?: string
  category: string // UUID (FK to recipe_categories)
  department: Department // ✅ NEW: Department that prepares this recipe
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
  department: Department // ✅ NEW: Department that prepares this item
  description?: string
  outputQuantity: number
  outputUnit: 'gram' | 'ml' // Только базовые единицы
  preparationTime: number
  instructions: string
  shelfLife?: number // ✅ NEW: Shelf life in days
  recipe?: PreparationIngredient[]

  // ⭐ PHASE 2: Portion type support
  portionType?: PortionType // Default: 'weight'
  portionSize?: number // Required if portionType='portion'
}

// =============================================
// MENU INTEGRATION
// =============================================

export interface MenuRecipeLink extends BaseEntity {
  menuItemId: string
  variantId?: string
  recipeId: string
  portionMultiplier: number
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
// STEP-BY-STEP INSTRUCTIONS
// =============================================

export interface RecipeStep {
  id: string
  stepNumber: number
  instruction: string
  duration?: number
  temperature?: number
  equipment?: string[]
}

// =============================================
// UNITS (для совместимости)
// =============================================

export interface Unit {
  id: string
  name: string
  shortName: string
  type: 'weight' | 'volume' | 'piece'
  baseUnit?: string
  conversionRate?: number
}

// =============================================
// PREPARATION CATEGORY (from database)
// =============================================

export interface PreparationCategory {
  id: string
  key: string
  name: string
  description?: string
  icon?: string
  emoji?: string
  color?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// =============================================
// RECIPE CATEGORY (from database)
// =============================================

export interface RecipeCategory {
  id: string
  key: string
  name: string
  description?: string
  color?: string
  icon?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// =============================================
// CONSTANTS
// =============================================

// ❌ PREPARATION_TYPES removed - now loaded from database via preparation_categories table
// ❌ RECIPE_CATEGORIES removed - now loaded from database via recipe_categories table

export const DIFFICULTY_LEVELS = [
  { value: 'easy', text: 'Easy', color: 'success' },
  { value: 'medium', text: 'Medium', color: 'warning' },
  { value: 'hard', text: 'Hard', color: 'error' }
] as const

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Проверяет совместимость единиц
 */
export function areUnitsCompatible(
  unit1: MeasurementUnit,
  baseUnit: 'gram' | 'ml' | 'piece'
): boolean {
  const weightUnits: MeasurementUnit[] = ['gram', 'kg']
  const volumeUnits: MeasurementUnit[] = ['ml', 'liter']
  const pieceUnits: MeasurementUnit[] = ['piece', 'pack']

  switch (baseUnit) {
    case 'gram':
      return weightUnits.includes(unit1)
    case 'ml':
      return volumeUnits.includes(unit1)
    case 'piece':
      return pieceUnits.includes(unit1)
    default:
      return false
  }
}

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Конвертирует в базовые единицы
 */
export function convertToBaseUnit(
  quantity: number,
  fromUnit: MeasurementUnit,
  baseUnit: 'gram' | 'ml' | 'piece'
): number {
  if (!areUnitsCompatible(fromUnit, baseUnit)) {
    throw new Error(`Cannot convert ${fromUnit} to ${baseUnit}`)
  }

  const conversions: Record<MeasurementUnit, { gram?: number; ml?: number; piece?: number }> = {
    // Вес
    gram: { gram: 1 },
    kg: { gram: 1000 },

    // Объем
    ml: { ml: 1 },
    liter: { ml: 1000 },

    // Штучные
    piece: { piece: 1 },
    pack: { piece: 1 }
  }

  const conversion = conversions[fromUnit]
  const factor = conversion[baseUnit]

  if (factor === undefined) {
    throw new Error(`No conversion factor for ${fromUnit} to ${baseUnit}`)
  }

  return quantity * factor
}

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Создает ProductForRecipe из новой структуры продукта
 */
export function createProductForRecipe(product: {
  id: string
  name: string
  nameEn?: string
  baseUnit: 'gram' | 'ml' | 'piece'
  baseCostPerUnit: number
  yieldPercentage?: number
  category: string
  isActive: boolean
}): ProductForRecipe {
  return {
    id: product.id,
    name: product.name,
    nameEn: product.nameEn,
    baseUnit: product.baseUnit,
    baseCostPerUnit: product.baseCostPerUnit,
    yieldPercentage: product.yieldPercentage,
    category: product.category,
    isActive: product.isActive
  }
}

// =============================================
// BACKWARD COMPATIBILITY (для постепенной миграции)
// =============================================

/** @deprecated Используйте Preparation */
export type Ingredient = Preparation

/** @deprecated Используйте PreparationType */
export type IngredientCategory = PreparationType

// ❌ INGREDIENT_CATEGORIES removed - use preparation_categories from database

/** @deprecated Используйте RecipeComponent */
export type RecipeIngredient = RecipeComponent

/** @deprecated Используйте CreatePreparationData */
export type CreateIngredientData = CreatePreparationData

/**
 * ✅ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: Преобразует старый формат ProductForRecipe в новый
 */
export function migrateProductForRecipe(oldProduct: {
  id: string
  name: string
  costPerUnit: number
  unit: MeasurementUnit
  category: string
  isActive: boolean
}): ProductForRecipe {
  // Определяем базовую единицу по старой единице
  const getBaseUnit = (unit: MeasurementUnit): 'gram' | 'ml' | 'piece' => {
    switch (unit) {
      case 'kg':
        return 'gram'
      case 'liter':
        return 'ml'
      case 'piece':
        return 'piece'
      default:
        return 'gram' // По умолчанию граммы
    }
  }

  // Конвертируем цену в базовую единицу
  const baseUnit = getBaseUnit(oldProduct.unit)
  let baseCostPerUnit = oldProduct.costPerUnit

  // Если единица была в кг или литрах, пересчитываем в граммы/мл
  if (oldProduct.unit === 'kg') {
    baseCostPerUnit = oldProduct.costPerUnit / 1000 // IDR/кг -> IDR/г
  } else if (oldProduct.unit === 'liter') {
    baseCostPerUnit = oldProduct.costPerUnit / 1000 // IDR/л -> IDR/мл
  }

  return {
    id: oldProduct.id,
    name: oldProduct.name,
    baseUnit,
    baseCostPerUnit,
    category: oldProduct.category,
    isActive: oldProduct.isActive,
    // Сохраняем старые поля для совместимости
    unit: oldProduct.unit,
    costPerUnit: oldProduct.costPerUnit
  }
}
