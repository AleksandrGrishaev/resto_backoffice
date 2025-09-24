// src/stores/productsStore/types.ts - ОБНОВЛЕННАЯ версия с PackageOption

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

export type BaseUnit = 'gram' | 'ml' | 'piece'

// ✅ НОВЫЙ ИНТЕРФЕЙС: PackageOption
export interface PackageOption {
  id: string
  productId: string

  // ОПИСАНИЕ УПАКОВКИ
  packageName: string // "Пачка 100г", "Бутылка 1л", "Коробка 24шт"
  packageSize: number // Количество базовых единиц в упаковке
  packageUnit: MeasurementUnit // Единица упаковки ('pack', 'bottle', 'box')
  brandName?: string // "Anchor", "Local Brand"

  // ЦЕНЫ (могут быть пустыми при создании)
  packagePrice?: number // Цена за упаковку (IDR)
  baseCostPerUnit: number // Эталонная цена за базовую единицу (IDR)

  // МЕТАДАННЫЕ
  isActive: boolean
  notes?: string // "Самая выгодная", "Только оптом"
  createdAt: string
  updatedAt: string
}

// ✅ ОБНОВЛЕННЫЙ: Product без legacy полей
export interface Product extends BaseEntity {
  name: string
  description?: string
  category: ProductCategory
  yieldPercentage: number
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

// ✅ СУЩЕСТВУЮЩИЙ: ProductsState (без изменений)
export interface ProductsState {
  products: Product[]
  loading: boolean
  error: string | null
  selectedProduct: Product | null
  useMockMode: boolean

  // 🆕 ENHANCED: Extended filters
  filters: {
    category: ProductCategory | 'all'
    isActive: boolean | 'all'
    canBeSold: boolean | 'all'
    search: string
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

// ===== UTILITY FUNCTIONS =====

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Проверяет, есть ли у продукта новая структура с базовыми единицами
 */
export function hasBaseUnitsStructure(product: Product): boolean {
  return !!(product.baseUnit && product.baseCostPerUnit !== undefined)
}

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Получает базовую единицу для продукта (определяет автоматически если нет)
 */
export function getProductBaseUnit(product: Product): BaseUnit {
  // Если есть baseUnit, используем его
  if (product.baseUnit) {
    return product.baseUnit
  }

  // Иначе определяем по категории и названию
  const category = product.category.toLowerCase()
  const name = product.name.toLowerCase()

  if (['meat', 'vegetables', 'spices', 'cereals'].includes(category)) {
    return 'gram'
  }

  if (category === 'dairy' && name.includes('milk')) {
    return 'ml'
  }

  if (category === 'beverages') {
    return 'piece'
  }

  if (name.includes('oil') || name.includes('liquid')) {
    return 'ml'
  }

  // По умолчанию граммы
  return 'gram'
}

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Получает стоимость за базовую единицу (рассчитывает если нет)
 */
export function getProductBaseCost(product: Product): number {
  // Если есть baseCostPerUnit, используем его
  if (product.baseCostPerUnit !== undefined) {
    return product.baseCostPerUnit
  }

  // Иначе рассчитываем из старых данных
  const baseUnit = getProductBaseUnit(product)
  let baseCost = product.costPerUnit

  // Конвертируем из крупных единиц в базовые
  if (baseUnit === 'gram' && product.unit === 'kg') {
    baseCost = product.costPerUnit / 1000 // IDR/кг -> IDR/г
  } else if (baseUnit === 'ml' && product.unit === 'liter') {
    baseCost = product.costPerUnit / 1000 // IDR/л -> IDR/мл
  }

  return baseCost
}

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Создает расширенный продукт из обычного
 */
export function enhanceProduct(product: Product): Product & {
  baseUnit: BaseUnit
  baseCostPerUnit: number
} {
  return {
    ...product,
    baseUnit: getProductBaseUnit(product),
    baseCostPerUnit: getProductBaseCost(product)
  }
}

/**
 * ✅ НОВАЯ ФУНКЦИЯ: Конвертирует количество в базовые единицы
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
