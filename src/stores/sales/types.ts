import type { BaseEntity } from '@/types/base'
import type { PaymentMethod } from '@/stores/pos/types'

/**
 * Profit Calculation Data
 * Расчет прибыли с учетом всех скидок
 */
export interface ProfitCalculation {
  // Revenue (Выручка)
  originalPrice: number // Цена до всех скидок
  itemOwnDiscount: number // Скидка на саму позицию
  allocatedBillDiscount: number // Доля скидки на счет (пропорциональная)
  finalRevenue: number // Итоговая выручка после всех скидок

  // Cost (Себестоимость)
  ingredientsCost: number // Себестоимость ингредиентов из decomposition

  // Profit (Прибыль)
  profit: number // finalRevenue - ingredientsCost
  profitMargin: number // (profit / finalRevenue) * 100%
}

/**
 * Decomposition Summary
 * Краткая информация о составе проданной позиции
 */
export interface DecompositionSummary {
  totalProducts: number // Количество конечных продуктов (can_be_sold = true)
  totalPreparations: number // ✅ NEW: Количество полуфабрикатов
  totalCost: number // Общая себестоимость
  decomposedItems: DecomposedItem[] // Список продуктов и полуфабрикатов (mixed)
}

/**
 * Decomposed Item
 * Конечный элемент после декомпозиции рецепта (продукт ИЛИ полуфабрикат)
 * ✅ SPRINT 1: Added support for preparations (type: 'preparation')
 */
export interface DecomposedItem {
  type: 'product' | 'preparation' // ✅ NEW: Type discriminator

  // Product fields (if type === 'product')
  productId?: string // ID конечного продукта
  productName?: string

  // Preparation fields (if type === 'preparation')
  preparationId?: string // ✅ NEW: ID полуфабриката
  preparationName?: string // ✅ NEW: Название полуфабриката

  quantity: number // Итоговое количество
  unit: string // gram, ml, piece
  costPerUnit: number | null // ✅ CHANGED: nullable - null if not yet calculated (FIFO in Sprint 2)
  totalCost: number // quantity * costPerUnit (or 0 if costPerUnit is null)

  // Trace path для debug (путь декомпозиции)
  path: string[] // ['MenuItem', 'Recipe', 'Preparation', 'Product']
}

/**
 * Batch Allocation
 * Allocation from specific batch (FIFO)
 * ✅ SPRINT 2: FIFO batch tracking
 */
export interface BatchAllocation {
  batchId: string
  batchNumber?: string
  allocatedQuantity: number
  costPerUnit: number
  totalCost: number
  batchCreatedAt: string
}

/**
 * Product Cost Item
 * Product cost from FIFO batches
 * ✅ SPRINT 2: Actual cost calculation for products
 */
export interface ProductCostItem {
  productId: string
  productName: string
  quantity: number
  unit: string

  // FIFO allocation
  batchAllocations: BatchAllocation[]
  averageCostPerUnit: number
  totalCost: number
}

/**
 * Preparation Cost Item
 * Preparation cost from FIFO batches
 * ✅ SPRINT 2: Actual cost calculation for preparations
 */
export interface PreparationCostItem {
  preparationId: string
  preparationName: string
  quantity: number
  unit: string

  // FIFO allocation
  batchAllocations: BatchAllocation[]
  averageCostPerUnit: number
  totalCost: number
}

/**
 * Actual Cost Breakdown
 * Actual cost from FIFO batches
 * ✅ SPRINT 2: Replaces decomposition-based cost calculation
 */
export interface ActualCostBreakdown {
  totalCost: number
  preparationCosts: PreparationCostItem[]
  productCosts: ProductCostItem[]

  method: 'FIFO' | 'LIFO' | 'WeightedAverage'
  calculatedAt: string
}

/**
 * Sales Transaction
 * Unified sales record для backoffice
 */
export interface SalesTransaction extends BaseEntity {
  // Reference data (ссылки на POS данные)
  paymentId: string // Link to PosPayment
  orderId: string // Link to PosOrder
  billId: string // Link to PosBill
  itemId: string // Link to PosBillItem
  shiftId?: string // Link to PosShift

  // Menu data
  menuItemId: string
  menuItemName: string
  variantId: string
  variantName: string

  // Sale data
  quantity: number // Количество проданных порций
  unitPrice: number // Цена за единицу
  totalPrice: number // unitPrice * quantity (до скидок)
  paymentMethod: PaymentMethod

  // Date/time
  soldAt: string // ISO timestamp
  processedBy: string // Имя кассира

  // Recipe/Inventory link
  recipeId?: string // If menu item has recipe
  recipeWriteOffId?: string // Link to write-off operation

  // ✅ SPRINT 2: NEW FIELDS
  actualCost?: ActualCostBreakdown // Actual cost from FIFO batches
  preparationWriteOffIds?: string[] // Preparation write-offs
  productWriteOffIds?: string[] // Product write-offs (direct sale)

  // Profit data
  profitCalculation: ProfitCalculation

  // ✅ SPRINT 8: Tax storage fields
  serviceTaxRate?: number // Service tax rate (e.g., 0.05 = 5%)
  serviceTaxAmount?: number // Service tax amount in IDR
  governmentTaxRate?: number // Government tax rate (e.g., 0.10 = 10%)
  governmentTaxAmount?: number // Government tax amount in IDR
  totalTaxAmount?: number // Total tax amount (sum of all taxes)

  // Decomposition summary (DEPRECATED: will be replaced by actualCost)
  decompositionSummary: DecompositionSummary

  // Sync status (для будущей синхронизации с API)
  syncedToBackoffice: boolean
  syncedAt?: string

  // Department (для фильтрации)
  department: 'kitchen' | 'bar'
}

/**
 * Sales Filters
 * Фильтры для запросов продаж
 */
export interface SalesFilters {
  dateFrom?: string // ISO date
  dateTo?: string // ISO date
  menuItemId?: string
  paymentMethod?: PaymentMethod
  department?: 'kitchen' | 'bar'
  shiftId?: string
}

/**
 * Sales Statistics
 * Статистика продаж для аналитики
 */
export interface SalesStatistics {
  totalRevenue: number
  totalCost: number
  totalProfit: number
  averageMargin: number // %

  totalTransactions: number
  totalItemsSold: number

  // By payment method
  revenueByPaymentMethod: Record<PaymentMethod, number>

  // By department
  revenueByDepartment: {
    kitchen: number
    bar: number
  }

  // Top selling items
  topSellingItems: TopSellingItem[]
}

/**
 * Top Selling Item
 * Топ продаваемая позиция
 */
export interface TopSellingItem {
  menuItemId: string
  menuItemName: string
  quantitySold: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  averageMargin: number // %
}

/**
 * Item With Allocated Discount
 * Позиция счета с распределенной скидкой
 */
export interface ItemWithAllocatedDiscount {
  id: string
  menuItemId: string
  quantity: number
  unitPrice: number
  itemOwnDiscount: number // Собственная скидка позиции
  allocatedBillDiscount: number // Распределенная скидка на счет
  totalDiscount: number // itemOwnDiscount + allocatedBillDiscount
  finalPrice: number // Итоговая цена после всех скидок
}
