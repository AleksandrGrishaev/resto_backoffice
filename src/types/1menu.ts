// src/types/menu.ts
import { BaseEntity } from './common'

export interface BaseItem {
  dishId: string
  variantId?: string
  quantity: number
  price: number
  notes?: string
}

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
