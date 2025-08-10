// src/stores/productsStore/types.ts - Enhanced с поддержкой расширенных фильтров
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
  name: string
  description?: string
  category: ProductCategory
  unit: MeasurementUnit
  costPerUnit: number
  yieldPercentage: number
  isActive: boolean

  // ✅ Флаг для простой продажи
  canBeSold: boolean

  // Дополнительные поля для управления складом
  storageConditions?: string
  shelfLife?: number
  minStock?: number

  // 🆕 NEW: Enhanced fields from coordinator
  nameEn?: string
  leadTimeDays?: number
  primarySupplierId?: string
  tags?: string[]
  currentCostPerUnit?: number
  maxStock?: number
}

// 🆕 ENHANCED: ProductsState with extended filters
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
    canBeSold: boolean | 'all' // 🆕 NEW
    search: string
    // Future stock-related filters
    needsReorder: boolean // 🆕 NEW
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical' | 'all' // 🆕 NEW
  }
}

export interface CreateProductData {
  name: string
  category: ProductCategory
  unit: MeasurementUnit
  costPerUnit: number
  yieldPercentage: number
  description?: string
  isActive?: boolean
  canBeSold?: boolean
  storageConditions?: string
  shelfLife?: number
  minStock?: number

  // 🆕 NEW: Enhanced fields
  nameEn?: string
  leadTimeDays?: number
  primarySupplierId?: string
  tags?: string[]
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

export interface EnhancedProduct extends Product {
  nameEn: string
  descriptionEn?: string
  currentCostPerUnit: number
  recommendedOrderQuantity?: number
  primarySupplierId?: string
  leadTimeDays?: number
  tags?: string[]
}

// ===== FUTURE: ENHANCED STATE =====

export interface EnhancedProductsState extends ProductsState {
  stockRecommendations: StockRecommendation[]
  usageData: ProductUsage[]
  consumptionData: ProductConsumption[]
  priceHistory: ProductPriceHistory[]

  loading: {
    products: boolean
    recommendations: boolean
    usage: boolean
    consumption: boolean
    priceHistory: boolean
  }

  filters: {
    category: ProductCategory | 'all'
    isActive: boolean | 'all'
    canBeSold: boolean | 'all'
    search: string
    needsReorder: boolean
    urgencyLevel: StockRecommendation['urgencyLevel'] | 'all'
    // Advanced filters
    unit?: string
    yieldMin?: number
    yieldMax?: number
    priceMin?: number
    priceMax?: number
    hasStock?: boolean
    hasLowStock?: boolean
    hasSupplier?: boolean
  }
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
