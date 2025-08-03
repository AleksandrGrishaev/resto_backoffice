// Дефолтные данные и константы
import type { Category, MenuItem, MenuItemVariant } from './types'

export const DEFAULT_CATEGORY: Omit<Category, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true
}

export const DEFAULT_MENU_ITEM: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'> = {
  categoryId: '',
  name: '',
  description: '',
  isActive: true,
  type: 'food',
  variants: [],
  notes: '',
  sortOrder: 0,
  preparationTime: 0,
  allergens: [],
  tags: []
}

export const DEFAULT_VARIANT: MenuItemVariant = {
  id: '',
  name: '',
  price: 0,
  isActive: true,
  sortOrder: 0
}

export const MENU_ITEM_TYPES = {
  FOOD: 'food',
  BEVERAGE: 'beverage'
} as const

export const CATEGORY_SORT_OPTIONS = [
  { value: 'name', text: 'По названию' },
  { value: 'sortOrder', text: 'По порядку' },
  { value: 'createdAt', text: 'По дате создания' }
]

export const ITEM_SORT_OPTIONS = [
  { value: 'name', text: 'По названию' },
  { value: 'sortOrder', text: 'По порядку' },
  { value: 'price', text: 'По цене' },
  { value: 'createdAt', text: 'По дате создания' }
]

// Утилиты для создания новых объектов
export function createDefaultVariant(): MenuItemVariant {
  return {
    ...DEFAULT_VARIANT,
    id: crypto.randomUUID()
  }
}

export function createDefaultCategory(): Omit<Category, 'id' | 'createdAt' | 'updatedAt'> {
  return { ...DEFAULT_CATEGORY }
}

export function createDefaultMenuItem(): Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...DEFAULT_MENU_ITEM,
    variants: [createDefaultVariant()]
  }
}
