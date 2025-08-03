// Типы специфичные для menu store
import { BaseEntity } from '@/types/common'

export interface Category extends BaseEntity {
  name: string
  description?: string
  sortOrder: number
  isActive: boolean
}

export interface MenuItem extends BaseEntity {
  categoryId: string
  name: string
  description?: string
  isActive: boolean
  type: 'food' | 'beverage'
  variants: MenuItemVariant[]
  notes?: string
  sortOrder: number
  preparationTime?: number
  allergens?: string[]
  tags?: string[]
}

export interface MenuItemVariant {
  id: string
  name: string
  price: number
  isActive: boolean
  sortOrder?: number
}

export interface MenuState {
  categories: Category[]
  menuItems: MenuItem[]
  loading: boolean
  selectedCategoryId: string | null
  error: string | null
}

// DTOs для операций
export interface CreateCategoryDto {
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface CreateMenuItemDto {
  categoryId: string
  name: string
  description?: string
  type: 'food' | 'beverage'
  variants: Omit<MenuItemVariant, 'id'>[]
  notes?: string
  preparationTime?: number
  allergens?: string[]
  tags?: string[]
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}
export interface UpdateMenuItemDto extends Partial<CreateMenuItemDto> {}
