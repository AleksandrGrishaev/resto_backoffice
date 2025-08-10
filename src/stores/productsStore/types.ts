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

  // ✅ ВОЗВРАЩАЕМ флаг для простой продажи
  canBeSold: boolean // может ли продаваться напрямую (пиво, напитки, готовые продукты)

  // Дополнительные поля для управления складом
  storageConditions?: string
  shelfLife?: number // срок годности в днях
  minStock?: number // минимальный остаток
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
  canBeSold?: boolean // ✅ добавляем в создание
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

// src/stores/productsStore/types.ts - Дополнения для Stock Recommendations

// ===== EXISTING TYPES (не изменяем) =====
// Product, ProductCategory, ProductsState, etc.

// ===== NEW TYPES FOR STOCK RECOMMENDATIONS =====

// 🆕 MAIN FEATURE: Stock recommendations
export interface StockRecommendation extends BaseEntity {
  productId: string
  currentStock: number // From Storage Store
  recommendedMinStock: number // Calculated minimum
  recommendedMaxStock: number // Calculated maximum
  recommendedOrderQuantity: number // Optimal order amount
  daysUntilReorder: number // When to reorder
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

// Usage tracking - where product is used
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

// Consumption analytics
export interface ProductConsumption extends BaseEntity {
  productId: string
  dailyAverageUsage: number
  weeklyAverageUsage: number
  monthlyAverageUsage: number
  trend: 'increasing' | 'decreasing' | 'stable'
  calculatedAt: string
  basedOnDays: number
}

// Price history tracking
export interface ProductPriceHistory extends BaseEntity {
  productId: string
  pricePerUnit: number
  effectiveDate: string
  sourceType: 'purchase_order' | 'receipt' | 'manual_update'
  sourceId?: string
  supplierId?: string
  notes?: string
}

// ===== ENHANCED PRODUCT INTERFACE =====

// 🆕 Enhanced Product Interface (extends existing)
export interface EnhancedProduct extends Product {
  // English support
  nameEn: string
  descriptionEn?: string

  // 🆕 ENHANCED: Smart stock management
  currentCostPerUnit: number // Latest price from supplier receipts
  recommendedOrderQuantity?: number // Calculated optimal order amount

  // Supplier basics
  primarySupplierId?: string
  leadTimeDays?: number

  // Metadata
  tags?: string[]
}

// ===== ENHANCED STATE =====

export interface EnhancedProductsState extends ProductsState {
  // 🆕 New data collections
  stockRecommendations: StockRecommendation[]
  usageData: ProductUsage[]
  consumptionData: ProductConsumption[]
  priceHistory: ProductPriceHistory[]

  // 🆕 Enhanced loading states
  loading: {
    products: boolean
    recommendations: boolean
    usage: boolean
    consumption: boolean
    priceHistory: boolean
  }

  // 🆕 Enhanced filters
  filters: {
    category: ProductCategory | 'all'
    isActive: boolean | 'all'
    canBeSold: boolean | 'all' // Filter by direct sale capability
    search: string
    needsReorder: boolean // Show products needing reorder
    urgencyLevel: StockRecommendation['urgencyLevel'] | 'all'
  }
}

// ===== CROSS-STORE INTEGRATION TYPES =====

// For Supplier Store integration
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

// For Menu Store integration
export interface ProductForMenu {
  id: string
  name: string
  nameEn: string
  canBeSold: boolean
  currentCostPerUnit: number
  unit: MeasurementUnit
}

// For Storage Store integration
export interface ProductStockInfo {
  productId: string
  currentStock: number
  unit: MeasurementUnit
  lastUpdated: string
}

// ===== CALCULATION PARAMETERS =====

export interface StockCalculationParams {
  safetyDays: number // Default: 3
  maxOrderDays: number // Default: 14
  seasonalFactors?: Record<string, number>
  volatilityThreshold: number // Default: 0.3
}

// ===== API INTERFACES =====

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

// Helper type for recommendation calculations
export interface RecommendationCalculationInput {
  product: Product
  currentStock: number
  consumption: ProductConsumption
  usage: ProductUsage
  calculationParams: StockCalculationParams
}
