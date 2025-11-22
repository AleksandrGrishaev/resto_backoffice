// src/stores/supplier_2/types/supplierIntegrationTypes.ts
// ✅ NEW FILE: Types for integration with Storage and Products stores

import type { StorageDepartment, CreateReceiptData } from '@/stores/storage/types'
import type { Product } from '@/stores/productsStore/types'
import type { Receipt, PurchaseOrder, OrderSuggestion } from './types'

// =============================================
// STORAGE STORE INTEGRATION
// =============================================

/**
 * ✅ Interface for creating storage operations from receipts
 */
export interface SupplierStorageIntegration {
  createReceiptOperation(receipt: Receipt, order: PurchaseOrder): Promise<string>
  updateProductCosts(items: ReceiptItem[]): Promise<void>
  getLatestPrices(itemIds: string[]): Promise<Record<string, number>>
  getSuggestionsFromStock(department: StorageDepartment): Promise<OrderSuggestion[]>
}

/**
 * ✅ Data structure for creating storage receipt operation
 */
export interface CreateStorageReceiptData extends Omit<CreateReceiptData, 'items'> {
  items: Array<{
    itemId: string
    quantity: number
    costPerUnit: number
    notes?: string
    expiryDate?: string
  }>
  sourceType: 'purchase'
  purchaseOrderId?: string
}

/**
 * ✅ Balance information from Storage Store for suggestions
 */
export interface StorageBalanceInfo {
  itemId: string
  itemName: string
  currentStock: number
  totalValue: number
  latestCost: number
  averageCost: number
  belowMinStock: boolean
  hasNearExpiry: boolean
  hasExpired: boolean
  newestBatchDate?: string
  oldestBatchDate?: string
}

// =============================================
// PRODUCTS STORE INTEGRATION
// =============================================

/**
 * ✅ Interface for Products Store integration
 */
export interface SupplierProductsIntegration {
  getProduct(productId: string): Promise<Product | null>
  updateProductCost(productId: string, newCost: number): Promise<void>
  getProductMinStock(productId: string): number
  getProductShelfLife(productId: string): number | undefined
  validateProductExists(productId: string): boolean
}

/**
 * ✅ Product information needed for supplier operations
 */
export interface ProductInfo {
  id: string
  name: string
  category: string
  unit: string
  baseUnit?: string
  costPerUnit: number
  baseCostPerUnit?: number
  minStock?: number
  maxStock?: number
  shelfLife?: number
  isActive: boolean
  canBeSold: boolean
}

/**
 * ✅ Price history data for analysis
 */
export interface PriceHistory {
  productId: string
  date: string
  price: number
  source: 'purchase' | 'manual_update' | 'market_price'
  supplierId?: string
  notes?: string
}

// =============================================
// ORDER SUGGESTIONS GENERATION
// =============================================

/**
 * ✅ Parameters for generating order suggestions
 */
export interface GenerateSuggestionsParams {
  department?: StorageDepartment
  urgencyFilter?: 'all' | 'high' | 'medium' | 'low'
  includeOutOfStock?: boolean
  includeBelowMinimum?: boolean
  maxSuggestions?: number
  sortBy?: 'urgency' | 'value' | 'alphabetical'
}

/**
 * ✅ Suggestion calculation context
 */
export interface SuggestionContext {
  balance: StorageBalanceInfo
  product: ProductInfo
  recentPrices: PriceHistory[]
  lastOrderDate?: string
  averageConsumption?: number
  leadTimeDays?: number
}

/**
 * ✅ Enhanced order suggestion with calculation details
 */
export interface EnhancedOrderSuggestion extends OrderSuggestion {
  // Calculation details
  calculatedAt: string
  basedOnData: {
    storageBalance: boolean
    productInfo: boolean
    priceHistory: boolean
    consumptionPattern: boolean
  }

  // Additional context
  averageConsumption?: number
  leadTimeDays?: number
  lastOrderDate?: string
  priceHistory?: PriceHistory[]

  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high'
  riskReasons: string[]
}

// =============================================
// INTEGRATION VALIDATION
// =============================================

/**
 * ✅ Validation result for integration operations
 */
export interface IntegrationValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missingData: string[]
}

/**
 * ✅ Receipt validation before storage operation creation
 */
export interface ReceiptValidation extends IntegrationValidation {
  receipt: Receipt
  order: PurchaseOrder
  canCreateStorageOperation: boolean
  canUpdatePrices: boolean
  missingProducts: string[]
  invalidQuantities: Array<{
    itemId: string
    issue: string
  }>
}

// =============================================
// INTEGRATION STATISTICS
// =============================================

/**
 * ✅ Statistics about integration health
 */
export interface IntegrationStatistics {
  // Data sync status
  lastSyncAt?: string
  totalProducts: number
  productsWithPrices: number
  productsWithMinStock: number

  // Storage integration
  storageOperationsCreated: number
  storageOperationErrors: number
  lastStorageSync?: string

  // Price updates
  priceUpdatesProcessed: number
  priceUpdateErrors: number
  lastPriceUpdate?: string

  // Suggestions accuracy
  suggestionsGenerated: number
  suggestionsFromRealData: number

  // Health score
  integrationHealth: 'excellent' | 'good' | 'poor' | 'critical'
  healthReasons: string[]
}

// =============================================
// ERROR HANDLING
// =============================================

/**
 * ✅ Integration error with context
 */
export interface IntegrationError extends Error {
  code: string
  context: {
    operation: string
    itemId?: string
    receiptId?: string
    orderId?: string
    department?: StorageDepartment
  }
  recoverable: boolean
  suggestedAction?: string
}

/**
 * ✅ Error codes for integration operations
 */
export const INTEGRATION_ERROR_CODES = {
  STORAGE_OPERATION_FAILED: 'STORAGE_OPERATION_FAILED',
  PRICE_UPDATE_FAILED: 'PRICE_UPDATE_FAILED',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  DEPARTMENT_MISMATCH: 'DEPARTMENT_MISMATCH',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  VALIDATION_FAILED: 'VALIDATION_FAILED'
} as const

export type IntegrationErrorCode =
  (typeof INTEGRATION_ERROR_CODES)[keyof typeof INTEGRATION_ERROR_CODES]

// =============================================
// HELPER FUNCTIONS TYPES
// =============================================

/**
 * ✅ Function type for price calculation
 */
export type PriceCalculator = (itemId: string, context: SuggestionContext) => Promise<number>

/**
 * ✅ Function type for quantity suggestion
 */
export type QuantitySuggester = (
  currentStock: number,
  minStock: number,
  averageConsumption?: number,
  leadTimeDays?: number
) => number

/**
 * ✅ Function type for urgency determination
 */
export type UrgencyCalculator = (
  currentStock: number,
  minStock: number,
  averageConsumption?: number,
  riskFactors?: string[]
) => 'low' | 'medium' | 'high'
