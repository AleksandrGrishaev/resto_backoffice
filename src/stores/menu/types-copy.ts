// src/stores/menu/types.ts
import { BaseEntity } from '@/types/common'
import type { MeasurementUnit } from '../recipes/types'

export interface Category extends BaseEntity {
  name: string
  description?: string
  sortOrder: number
  isActive: boolean
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
  allergens?: string[]
  tags?: string[]
}

// ПРОСТАЯ СВЯЗКА (для одиночных позиций)
export interface MenuItemSource {
  type: 'product' | 'recipe' // что продаем
  id: string // ID продукта или рецепта
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

// КОМПОЗИЦИЯ для сложных блюд
export interface MenuComposition {
  type: 'product' | 'recipe' | 'preparation' // что добавляем
  id: string // ID компонента
  quantity: number // количество в ГРАММАХ/МЛ (не порциях!)
  unit: MeasurementUnit // 'gram', 'ml' - конкретные единицы
  role?: 'main' | 'garnish' | 'sauce' // роль в блюде (для UI)
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

// Примеры использования в комментариях:

/*
Простая перепродажа:
{
  name: "Bintang Beer",
  source: {
    type: 'product',
    id: 'bintang-beer-product-id'
  },
  variants: [
    { name: "330ml", price: 25000 },  // ЦЕНА ПРОДАЖИ ТОЛЬКО В МЕНЮ
    { name: "500ml", price: 35000, source: { type: 'product', id: 'bintang-500ml-id' } }
  ]
}

Готовое блюдо:
{
  name: "Beef Steak",
  source: {
    type: 'recipe',
    id: 'beef-steak-recipe-id'
  },
  variants: [
    { name: "200g", price: 85000, portionMultiplier: 1 },
    { name: "300g", price: 120000, portionMultiplier: 1.5 }
  ]
}

Стейк с гарниром (композитное блюдо):
{
  name: "Стейк с гарниром",
  source: null, // композитное блюдо
  variants: [
    {
      name: "с картошкой фри",
      price: 95000,
      composition: [
        { type: 'recipe', id: 'beef-steak-recipe', quantity: 200, unit: 'gram', role: 'main' },
        { type: 'preparation', id: 'french-fries-prep', quantity: 150, unit: 'gram', role: 'garnish' }
      ]
    },
    {
      name: "с пюре",
      price: 90000,
      composition: [
        { type: 'recipe', id: 'beef-steak-recipe', quantity: 200, unit: 'gram', role: 'main' },
        { type: 'preparation', id: 'mashed-potato-prep', quantity: 180, unit: 'gram', role: 'garnish' }
      ]
    }
  ]
}
*/
