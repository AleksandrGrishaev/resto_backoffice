// src/stores/productsStore/types.ts
import type { BaseEntity } from '@/types/common'
import type { MeasurementUnit } from '@/types/measurementUnits'

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
  name: string // "Мука", "Пиво Bintang", "Готовый торт"
  description?: string
  category: ProductCategory
  unit: MeasurementUnit
  costPerUnit: number // ТОЛЬКО себестоимость закупки
  yieldPercentage: number // процент выхода готового продукта (учет отходов при обработке)
  isActive: boolean

  // Дополнительные поля для управления складом
  storageConditions?: string
  shelfLife?: number // срок годности в днях
  minStock?: number // минимальный остаток

  // ❌ УБИРАЕМ - цена продажи только в меню!
  // sellPrice?: number
  // canBeSold?: boolean
}

export interface ProductsState {
  products: Product[]
  loading: boolean
  error: string | null
  selectedProduct: Product | null
  useMockMode: boolean // флаг для режима работы с моками
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
  costPerUnit: number // ТОЛЬКО себестоимость закупки
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

// Константы для единиц измерения (используем из общего файла)
import { PRODUCT_UNITS, getUnitName } from '@/types/measurementUnits'

export const MEASUREMENT_UNITS_FOR_PRODUCTS = PRODUCT_UNITS.reduce(
  (acc, unit) => {
    acc[unit] = getUnitName(unit)
    return acc
  },
  {} as Record<MeasurementUnit, string>
)

// Для обратной совместимости с UI компонентами
export const MEASUREMENT_UNITS = MEASUREMENT_UNITS_FOR_PRODUCTS
