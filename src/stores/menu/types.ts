// src/stores/menu/types.ts
import type { BaseEntity } from '@/types/common'
import type { MeasurementUnit } from '@/types/measurementUnits'

// =============================================
// Основные типы меню
// =============================================

export interface Category extends BaseEntity {
  name: string
  description?: string
  isActive: boolean
  sortOrder: number
}

export interface MenuItem extends BaseEntity {
  categoryId: string
  name: string // "Стейк с гарниром", "Пиво Bintang"
  description?: string
  type: 'food' | 'beverage'
  isActive: boolean
  variants: MenuItemVariant[]
  sortOrder: number
  allergens?: string[]
  tags?: string[]
}

export interface MenuItemVariant {
  id: string
  name: string // "с картошкой фри", "с пюре", "330мл", "500мл"
  price: number // ЦЕНА ПРОДАЖИ (единственное место где есть цена!)
  isActive: boolean
  sortOrder?: number

  // ✅ ЕДИНСТВЕННЫЙ источник - композиция (всегда массив)
  composition: MenuComposition[]

  // Дополнительные поля
  portionMultiplier?: number // для изменения размера порции рецептов
  notes?: string
}

// =============================================
// Композиция блюда
// =============================================

export interface MenuComposition {
  type: 'product' | 'recipe' | 'preparation' // что добавляем
  id: string // ID компонента
  quantity: number // количество в конкретных единицах (не порциях!)
  unit: MeasurementUnit // 'gram', 'ml', 'piece' - конкретные единицы
  role?: ComponentRole // роль в блюде (для UI группировки)
  notes?: string
}

export type ComponentRole = 'main' | 'garnish' | 'sauce' | 'addon'

// =============================================
// Вспомогательные типы для UI
// =============================================

export interface SourceOption {
  type: 'product' | 'recipe' | 'preparation'
  id: string
  name: string
  displayName: string
  category: string
  unit: MeasurementUnit
  // Дополнительные поля в зависимости от типа
  costPerUnit?: number // для продуктов
  outputQuantity?: number // для рецептов/полуфабрикатов
  canBeSold?: boolean // для продуктов
}

// =============================================
// DTOs для создания/обновления
// =============================================

export interface CreateCategoryDto {
  name: string
  description?: string
  isActive: boolean
  sortOrder: number
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {
  id: string
}

export interface CreateMenuItemDto {
  categoryId: string
  name: string
  description?: string
  type: 'food' | 'beverage'
  variants: CreateMenuItemVariantDto[]
  sortOrder?: number
  allergens?: string[]
  tags?: string[]
}

export interface CreateMenuItemVariantDto {
  name: string
  price: number
  composition: MenuComposition[]
  portionMultiplier?: number
  isActive?: boolean
  sortOrder?: number
  notes?: string
}

export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {
  id: string
  isActive?: boolean
  variants?: MenuItemVariant[] // полная замена вариантов при обновлении
}

// =============================================
// State типы
// =============================================

export interface MenuState {
  categories: Category[]
  items: MenuItem[]
  loading: boolean
  error: string | null
  initialized: boolean
}

// =============================================
// Константы
// =============================================

export const COMPONENT_ROLES: Record<ComponentRole, string> = {
  main: 'Основное',
  garnish: 'Гарнир',
  sauce: 'Соус',
  addon: 'Дополнение'
}

export const MENU_ITEM_TYPES = {
  food: 'Кухня',
  beverage: 'Бар'
} as const

// =============================================
// Утилиты для расчетов
// =============================================

/**
 * Расчет примерной себестоимости варианта меню
 * (требует загруженные данные products/recipes/preparations)
 */
export interface MenuCostCalculation {
  totalCost: number
  margin: number
  marginPercent: number
  components: {
    type: string
    name: string
    cost: number
    quantity: number
    unit: string
  }[]
}

/**
 * Группировка компонентов по ролям для отображения
 */
export interface GroupedComposition {
  main: MenuComposition[]
  garnish: MenuComposition[]
  sauce: MenuComposition[]
  addon: MenuComposition[]
}
