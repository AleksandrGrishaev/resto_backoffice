// src/types/menu.ts
import { BaseEntity } from './common'
import type { MeasurementUnit } from './recipes'

export interface Category extends BaseEntity {
  name: string
  description?: string
  sortOrder: number
  isActive: boolean
}

// ПРОСТАЯ СВЯЗКА (для одиночных позиций)
export interface MenuItemSource {
  type: 'product' | 'recipe' // что продаем
  id: string // ID продукта или рецепта
}

// КОМПОЗИЦИЯ для сложных блюд
export interface MenuComposition {
  type: 'product' | 'recipe' | 'preparation' // что добавляем
  id: string // ID компонента
  quantity: number // количество в ГРАММАХ/МЛ (не порциях!)
  unit: MeasurementUnit // 'gram', 'ml' - конкретные единицы
  role?: 'main' | 'garnish' | 'sauce' // роль в блюде (для UI)
  notes?: string // дополнительные заметки
}

export interface MenuItemVariant {
  id: string
  name: string // "с картошкой фри", "с пюре", "Большая порция"
  price: number
  portionMultiplier?: number // множитель порции (для простых рецептов)
  isActive: boolean
  sortOrder?: number
  source?: MenuItemSource // для простых вариантов
  composition?: MenuComposition[] // НОВОЕ: для композитных вариантов
}

export interface MenuItem extends BaseEntity {
  categoryId: string
  name: string // "Стейк с гарниром", "Пиво Bintang"
  description?: string
  isActive: boolean
  type: 'food' | 'beverage'
  variants: MenuItemVariant[]
  source?: MenuItemSource // для простых позиций (одиночный продукт/рецепт)
  sortOrder: number
  preparationTime?: number
  allergens?: string[]
  tags?: string[]
  notes?: string
}

// Вспомогательные типы для создания
export interface CreateCategoryDto {
  name: string
  description?: string
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface CreateMenuItemDto {
  categoryId: string
  name: string
  description?: string
  type: 'food' | 'beverage'
  source?: MenuItemSource
  variants: Array<{
    name: string
    price: number
    isActive?: boolean
    sortOrder?: number
    portionMultiplier?: number
    source?: MenuItemSource
    composition?: MenuComposition[]
  }>
  preparationTime?: number
  allergens?: string[]
  tags?: string[]
  notes?: string
  sortOrder?: number
}

export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {
  isActive?: boolean
}

// Вспомогательные типы для расчетов
export interface MenuItemCostCalculation {
  menuItemId: string
  variantId: string
  totalCost: number // себестоимость
  profit: number // прибыль
  profitMargin: number // маржа в %
  componentCosts: {
    componentId: string
    componentType: 'product' | 'recipe' | 'preparation'
    componentName: string
    quantity: number
    unit: MeasurementUnit
    unitCost: number
    totalCost: number
  }[]
  calculatedAt: Date
}

// Типы для компонентов выбора источников
export interface SourceOption {
  id: string
  name: string
  type: 'product' | 'recipe' | 'preparation'
  category?: string
  unit?: MeasurementUnit
  costPerUnit?: number
  outputQuantity?: number
}

// Состояние store
export interface MenuState {
  categories: Category[]
  menuItems: MenuItem[]
  loading: boolean
  selectedCategoryId: string | null
  error: string | null
}

// Константы
export const MENU_ITEM_TYPES = {
  FOOD: 'food' as const,
  BEVERAGE: 'beverage' as const
}

export const SOURCE_TYPES = {
  PRODUCT: 'product' as const,
  RECIPE: 'recipe' as const,
  PREPARATION: 'preparation' as const
}

export const COMPOSITION_ROLES = {
  MAIN: 'main' as const,
  GARNISH: 'garnish' as const,
  SAUCE: 'sauce' as const
}

/*
ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:

1. Простая перепродажа (пиво):
{
  name: "Пиво Bintang",
  source: { type: 'product', id: 'prod-beer-bintang-330' },
  variants: [
    { name: "330мл", price: 25000 },
    { name: "500мл", price: 35000, source: { type: 'product', id: 'prod-beer-bintang-500' } }
  ]
}

2. Готовое блюдо (стейк):
{
  name: "Стейк говяжий",
  source: { type: 'recipe', id: 'recipe-beef-steak' },
  variants: [
    { name: "200г", price: 85000, portionMultiplier: 0.8 },
    { name: "250г", price: 95000, portionMultiplier: 1.0 }
  ]
}

3. Композитное блюдо (стейк с гарниром):
{
  name: "Стейк с гарниром",
  source: null, // композитное блюдо
  variants: [
    {
      name: "с картошкой фри",
      price: 120000,
      composition: [
        { type: 'recipe', id: 'recipe-beef-steak', quantity: 250, unit: 'gram', role: 'main' },
        { type: 'preparation', id: 'prep-french-fries', quantity: 150, unit: 'gram', role: 'garnish' },
        { type: 'preparation', id: 'prep-tomato-sauce', quantity: 30, unit: 'gram', role: 'sauce' }
      ]
    }
  ]
}
*/
