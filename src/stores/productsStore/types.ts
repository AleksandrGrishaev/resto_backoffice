// src/stores/productsStore/types.ts
import type { BaseEntity } from '@/types/common'

export type MeasurementUnit = 'kg' | 'g' | 'l' | 'ml' | 'pcs' | 'pack'

export type ProductCategory =
  | 'meat'
  | 'vegetables'
  | 'fruits'
  | 'dairy'
  | 'cereals'
  | 'spices'
  | 'seafood'
  | 'beverages'
  | 'other'

export interface Product extends BaseEntity {
  name: string
  category: ProductCategory
  unit: MeasurementUnit
  yieldPercentage: number // процент выхода готового продукта (учет отходов при обработке)
  description?: string
  isActive: boolean
  // Дополнительные поля для расширения
  storageConditions?: string
  shelfLife?: number // срок годности в днях
  minStock?: number // минимальный остаток
}

export interface ProductsState {
  products: Product[]
  loading: boolean
  error: string | null
  selectedProduct: Product | null
  filters: {
    category: ProductCategory | 'all'
    isActive: boolean | 'all'
    search: string
  }
}

export interface CreateProductData {
  name: string
  category: ProductCategory
  unit: MeasurementUnit
  yieldPercentage: number
  description?: string
  isActive?: boolean
  storageConditions?: string
  shelfLife?: number
  minStock?: number
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string
}

// Константы для категорий
export const PRODUCT_CATEGORIES: Record<ProductCategory, string> = {
  meat: 'Мясо и птица',
  vegetables: 'Овощи',
  fruits: 'Фрукты',
  dairy: 'Молочные продукты',
  cereals: 'Крупы и злаки',
  spices: 'Специи и приправы',
  seafood: 'Морепродукты',
  beverages: 'Напитки',
  other: 'Прочее'
}

// Константы для единиц измерения
export const MEASUREMENT_UNITS: Record<MeasurementUnit, string> = {
  kg: 'Килограмм',
  g: 'Грамм',
  l: 'Литр',
  ml: 'Миллилитр',
  pcs: 'Штука',
  pack: 'Упаковка'
}
