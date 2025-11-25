// src/stores/productsStore/types.ts - UPDATED version with PackageOption

import type { BaseEntity } from '@/types/common'
import type { MeasurementUnit } from '@/types/measurementUnits'

// ✅ NEW: Department Type
export type Department = 'kitchen' | 'bar'

// ✅ NEW: ProductCategory Interface (from database table)
export interface ProductCategory {
  id: string
  key: string
  name: string
  color?: string
  icon?: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Legacy type for old category keys (deprecated, will be removed)
export type ProductCategoryKey =
  | 'meat'
  | 'vegetables'
  | 'fruits'
  | 'dairy'
  | 'cereals'
  | 'spices'
  | 'seafood'
  | 'beverages'
  | 'other'

export type BaseUnit = 'gram' | 'ml' | 'piece'

// ✅ NEW INTERFACE: PackageOption
export interface PackageOption {
  id: string
  productId: string

  // PACKAGE DESCRIPTION
  packageName: string // "Pack 100g", "Bottle 1l", "Box 24pcs"
  packageSize: number // Number of base units in package
  packageUnit: MeasurementUnit // Package unit ('pack', 'bottle', 'box')
  brandName?: string // "Anchor", "Local Brand"

  // ЦЕНЫ (могут быть пустыми при создании)
  packagePrice?: number // Price per package (IDR)
  baseCostPerUnit: number // Эталонная цена за базовую единицу (IDR)

  // МЕТАДАННЫЕ
  isActive: boolean
  notes?: string // "Best value", "Wholesale only"
  createdAt: string
  updatedAt: string
}

// ✅ ОБНОВЛЕННЫЙ: Product без legacy полей
export interface Product extends BaseEntity {
  name: string
  description?: string
  category: string // UUID foreign key to product_categories table
  yieldPercentage: number
  usedInDepartments: Department[] // ['kitchen'] | ['bar'] | ['kitchen', 'bar']

  isActive: boolean
  canBeSold: boolean

  // ✅ ОСНОВНЫЕ ПОЛЯ (остаются)
  baseUnit: BaseUnit // 'gram' | 'ml' | 'piece'
  baseCostPerUnit: number // Цена за базовую единицу для расчетов

  // ✅ НОВЫЕ ПОЛЯ
  packageOptions: PackageOption[] // Варианты упаковки
  recommendedPackageId?: string // ID последней заказанной упаковки

  // Дополнительные поля для управления складом
  storageConditions?: string
  shelfLife?: number
  minStock?: number
  maxStock?: number
  nameEn?: string
  leadTimeDays?: number
  primarySupplierId?: string
  tags?: string[]
}

// ✅ НОВЫЕ DTO для CRUD операций с упаковками
export interface CreatePackageOptionDto {
  productId: string
  packageName: string
  packageSize: number
  packageUnit: MeasurementUnit
  brandName?: string
  packagePrice?: number
  baseCostPerUnit: number
  notes?: string
}

export interface UpdatePackageOptionDto {
  id: string
  packageName?: string
  packageSize?: number
  packageUnit?: MeasurementUnit
  brandName?: string
  packagePrice?: number
  baseCostPerUnit?: number
  isActive?: boolean
  notes?: string
}

// ✅ UPDATED: ProductsState (removed useMockMode)
export interface ProductsState {
  products: Product[]
  categories: ProductCategory[] // ✅ NEW: Categories loaded from database
  loading: boolean
  error: string | null
  selectedProduct: Product | null

  // 🆕 ENHANCED: Extended filters
  filters: {
    category: string | 'all' // UUID of category or 'all'
    isActive: boolean | 'all'
    canBeSold: boolean | 'all'
    search: string
    department: Department | 'all'
    needsReorder: boolean
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical' | 'all'
  }
}

// ✅ ОБНОВЛЕННЫЙ: CreateProductData без legacy полей
export interface CreateProductData {
  name: string
  category: ProductCategory
  baseUnit: BaseUnit // Обязательно
  baseCostPerUnit: number // Обязательно
  yieldPercentage: number
  usedInDepartments: Department[] // REQUIRED

  description?: string
  isActive?: boolean
  canBeSold?: boolean
  storageConditions?: string
  shelfLife?: number
  minStock?: number
  nameEn?: string
  leadTimeDays?: number
  primarySupplierId?: string
  tags?: string[]

  // Автоматически создается базовая упаковка
}

export interface UpdateProductData extends Partial<CreateProductData> {
  id: string
  recommendedPackageId?: string
}

// ❌ REMOVED: PRODUCT_CATEGORIES constant (now loaded from database via productsStore.categories)
// Use productsStore.getCategoryName(id) and productsStore.getCategoryColor(id) instead

// Константы для единиц измерения
import { PRODUCT_UNITS, getUnitName } from '@/types/measurementUnits'

export const MEASUREMENT_UNITS_FOR_PRODUCTS = PRODUCT_UNITS.reduce(
  (acc, unit) => {
    acc[unit] = getUnitName(unit)
    return acc
  },
  {} as Record<MeasurementUnit, string>
)

export const MEASUREMENT_UNITS = MEASUREMENT_UNITS_FOR_PRODUCTS

// ===== ENHANCED PRODUCT INTERFACE =====

export interface EnhancedProduct extends Product {
  nameEn: string
  descriptionEn?: string
  currentCostPerUnit: number
  recommendedOrderQuantity?: number
  primarySupplierId?: string
  leadTimeDays?: number
  tags?: string[]
}

// ===== STOCK RECOMMENDATIONS TYPES =====

export interface StockRecommendation extends BaseEntity {
  productId: string
  currentStock: number
  recommendedMinStock: number
  recommendedMaxStock: number
  recommendedOrderQuantity: number
  daysUntilReorder: number
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: {
    averageDailyUsage: number
    leadTimeDays: number
    safetyDays: number
    seasonalFactor?: number
  }
  calculatedAt: string
  isActive: boolean
}

export interface ProductUsage extends BaseEntity {
  productId: string
  usedInRecipes: Array<{
    recipeId: string
    recipeName: string
    quantityPerPortion: number
    isActive: boolean
  }>
  usedInPreparations: Array<{
    preparationId: string
    preparationName: string
    quantityPerOutput: number
    isActive: boolean
  }>
  directMenuItems?: Array<{
    menuItemId: string
    menuItemName: string
    variantId: string
    variantName: string
    quantityPerItem: number
    isActive: boolean
  }>
  lastUpdated: string
}

export interface ProductConsumption extends BaseEntity {
  productId: string
  dailyAverageUsage: number
  weeklyAverageUsage: number
  monthlyAverageUsage: number
  trend: 'increasing' | 'decreasing' | 'stable'
  calculatedAt: string
  basedOnDays: number
}

// ✅ ОБНОВЛЕННЫЙ: ProductPriceHistory с поддержкой базовых единиц
export interface ProductPriceHistory extends BaseEntity {
  productId: string
  pricePerUnit: number // Старое поле (для совместимости)

  // 🆕 НОВЫЕ ПОЛЯ: Цена в базовых единицах
  basePricePerUnit?: number // IDR за грамм/мл/штуку

  // Информация о закупке
  purchasePrice?: number // Цена за упаковку
  purchaseUnit?: MeasurementUnit // Единица закупки
  purchaseQuantity?: number // Количество в упаковке

  effectiveDate: string
  sourceType: 'purchase_order' | 'receipt' | 'manual_update'
  sourceId?: string
  supplierId?: string
  notes?: string
}

// ===== CALCULATION PARAMETERS =====

export interface StockCalculationParams {
  safetyDays: number
  maxOrderDays: number
  seasonalFactors?: Record<string, number>
  volatilityThreshold: number
}

export interface CreateStockRecommendationData {
  productId: string
  currentStock: number
  averageDailyUsage: number
  leadTimeDays: number
  safetyDays?: number
}

export interface UpdateStockRecommendationData extends Partial<CreateStockRecommendationData> {
  id: string
}

export interface RecommendationCalculationInput {
  product: Product
  currentStock: number
  consumption: ProductConsumption
  usage: ProductUsage
  calculationParams: StockCalculationParams
}

// ===== CROSS-STORE INTEGRATION TYPES =====

export interface ProductForSupplier {
  id: string
  name: string
  nameEn: string
  currentCostPerUnit: number
  recommendedOrderQuantity: number
  urgencyLevel: StockRecommendation['urgencyLevel']
  primarySupplierId?: string
  leadTimeDays?: number
  baseUnit: BaseUnit
  recommendedPackage?: PackageOption
  packageOptions: PackageOption[]
}

export interface ProductForMenu {
  id: string
  name: string
  nameEn: string
  canBeSold: boolean
  currentCostPerUnit: number
  unit: MeasurementUnit
}

export interface ProductStockInfo {
  productId: string
  currentStock: number
  unit: MeasurementUnit
  lastUpdated: string
}

export const DEFAULT_PRODUCT: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  category: 'other',
  yieldPercentage: 100,
  usedInDepartments: ['kitchen'], // ✅ DEFAULT
  isActive: true,
  canBeSold: true,
  baseUnit: 'gram',
  baseCostPerUnit: 0,
  packageOptions: [],
  recommendedPackageId: undefined,
  storageConditions: '',
  shelfLife: undefined,
  minStock: 0,
  maxStock: undefined,
  nameEn: '',
  leadTimeDays: 1,
  primarySupplierId: undefined,
  tags: []
}

// ===== UTILITY FUNCTIONS =====

/**
 * Конвертирует количество в базовые единицы
 */
export function convertToBaseUnits(
  quantity: number,
  fromUnit: MeasurementUnit,
  baseUnit: BaseUnit
): number {
  // Коэффициенты конвертации
  const conversions: Record<MeasurementUnit, { gram?: number; ml?: number; piece?: number }> = {
    // Вес
    gram: { gram: 1 },
    kg: { gram: 1000 },

    // Объем
    ml: { ml: 1 },
    liter: { ml: 1000 },
    tsp: { ml: 5 }, // ✅ ДОБАВИТЬ
    tbsp: { ml: 15 }, // ✅ ДОБАВИТЬ

    // Штучные
    piece: { piece: 1 },
    pack: { piece: 1 }
  }

  const conversion = conversions[fromUnit]
  if (!conversion) {
    throw new Error(`Unknown unit: ${fromUnit}`)
  }

  const factor = conversion[baseUnit]
  if (factor === undefined) {
    throw new Error(`Cannot convert ${fromUnit} to ${baseUnit}`)
  }

  return quantity * factor
}
