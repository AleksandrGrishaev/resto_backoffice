// src/stores/storage/types.ts
import { BaseEntity } from '@/types/common'

// ==========================================
// BASIC ENUMS AND LITERALS
// ==========================================

export type StorageDepartment = 'kitchen' | 'bar'
export type StorageItemType = 'product' | 'preparation'
export type OperationType = 'receipt' | 'consumption' | 'inventory' | 'correction' | 'production'
export type BatchSourceType =
  | 'purchase'
  | 'production'
  | 'correction'
  | 'opening_balance'
  | 'inventory_adjustment'
export type BatchStatus = 'active' | 'expired' | 'consumed'
export type InventoryStatus = 'draft' | 'confirmed' | 'cancelled'
export type OperationStatus = 'draft' | 'confirmed'

// ==========================================
// EXPIRY TYPES
// ==========================================

export type ExpiryStatus = 'fresh' | 'expiring' | 'expired'

export interface ExpiryInfo {
  nearestExpiry: string | null
  expiryStatus: ExpiryStatus
  expiryDaysRemaining: number | null
  hasExpired: boolean
  hasNearExpiry: boolean
}

// ==========================================
// CORE ENTITIES
// ==========================================

/**
 * Партия товара на складе
 */
export interface StorageBatch extends BaseEntity {
  // Identification
  batchNumber: string
  itemId: string
  itemType: StorageItemType
  department: StorageDepartment

  // Quantity tracking
  initialQuantity: number
  currentQuantity: number
  unit: string

  // Cost tracking (FIFO)
  costPerUnit: number
  totalValue: number

  // Dates and expiry
  receiptDate: string
  expiryDate?: string

  // Source tracking
  sourceType: BatchSourceType
  notes?: string

  // Status
  status: BatchStatus
  isActive: boolean
}

/**
 * FIFO распределение для списания
 */
export interface BatchAllocation {
  batchId: string
  batchNumber: string
  quantity: number
  costPerUnit: number
  batchDate: string
}

/**
 * Элемент операции склада
 */
export interface StorageOperationItem {
  id: string
  itemId: string
  itemType: StorageItemType
  itemName: string

  // Quantity
  quantity: number
  unit: string

  // FIFO allocation (for consumption)
  batchAllocations?: BatchAllocation[]

  // Cost tracking
  totalCost?: number
  averageCostPerUnit?: number

  // Additional details
  notes?: string
  expiryDate?: string
}

/**
 * Детали списания для отслеживания использования
 */
export interface ConsumptionDetails {
  reason: 'recipe' | 'menu_item' | 'waste' | 'expired' | 'other'
  relatedId?: string // ID рецепта или блюда
  relatedName?: string // Название рецепта или блюда
  portionCount?: number // Количество порций
}

/**
 * Основная операция склада
 */
export interface StorageOperation extends BaseEntity {
  // Operation details
  operationType: OperationType
  documentNumber: string
  operationDate: string
  department: StorageDepartment

  // Responsible person
  responsiblePerson: string

  // Items involved
  items: StorageOperationItem[]

  // Financial impact
  totalValue?: number

  // Consumption tracking
  consumptionDetails?: ConsumptionDetails

  // Related documents
  relatedInventoryId?: string

  // Status and workflow
  status: OperationStatus
  notes?: string
}

/**
 * Баланс товара на складе
 */
export interface StorageBalance {
  // Item identification
  itemId: string
  itemType: StorageItemType
  itemName: string
  department: StorageDepartment

  // Current stock
  totalQuantity: number
  unit: string

  // Financial summary with price analytics
  totalValue: number
  averageCost: number
  latestCost: number
  costTrend: 'up' | 'down' | 'stable'

  // FIFO batch details
  batches: StorageBatch[]
  oldestBatchDate: string
  newestBatchDate: string

  // Expiry information
  expiryInfo?: ExpiryInfo

  // Alerts and warnings
  hasExpired: boolean
  hasNearExpiry: boolean
  belowMinStock: boolean

  // Usage analytics
  lastConsumptionDate?: string
  averageDailyConsumption?: number
  daysOfStockRemaining?: number

  // Cache timestamps
  lastCalculated: string
}

// ==========================================
// INVENTORY TYPES
// ==========================================

/**
 * Документ инвентаризации
 */
export interface InventoryDocument extends BaseEntity {
  // Document details
  documentNumber: string
  inventoryDate: string
  department: StorageDepartment
  itemType: StorageItemType

  // Responsible person
  responsiblePerson: string

  // Inventory results
  items: InventoryItem[]

  // Summary
  totalItems: number
  totalDiscrepancies: number
  totalValueDifference: number

  // Status
  status: InventoryStatus
  notes?: string
}

/**
 * Элемент инвентаризации
 */
export interface InventoryItem {
  id: string
  itemId: string
  itemType: StorageItemType
  itemName: string

  // Quantities
  systemQuantity: number // По системе
  actualQuantity: number // Фактически
  difference: number // Разница

  // Financial impact
  unit: string
  averageCost: number
  valueDifference: number

  // Details
  notes?: string
  countedBy?: string
  confirmed?: boolean
}

// ==========================================
// CREATE OPERATION DTOS
// ==========================================

/**
 * Элемент для списания
 */
export interface ConsumptionItem {
  itemId: string
  itemType: StorageItemType
  quantity: number
  notes?: string
}

/**
 * Данные для создания операции списания
 */
export interface CreateConsumptionData {
  department: StorageDepartment
  responsiblePerson: string
  items: ConsumptionItem[]
  consumptionDetails?: ConsumptionDetails
  notes?: string
}

/**
 * Элемент для поступления
 */
export interface ReceiptItem {
  itemId: string
  itemType: StorageItemType
  quantity: number
  costPerUnit: number
  expiryDate?: string
  notes?: string
}

/**
 * Данные для создания операции поступления
 */
export interface CreateReceiptData {
  department: StorageDepartment
  responsiblePerson: string
  items: ReceiptItem[]
  sourceType: BatchSourceType
  notes?: string
}

/**
 * Данные для создания инвентаризации
 */
export interface CreateInventoryData {
  department: StorageDepartment
  itemType: StorageItemType
  responsiblePerson: string
}

// ==========================================
// PRODUCTION TYPES
// ==========================================

/**
 * Данные для создания производственной операции
 */
export interface CreateProductionData {
  preparationId: string
  batchCount: number // Количество порций рецепта
  department: StorageDepartment
  responsiblePerson: string
  expiryDate?: string // Срок годности готового полуфабриката
  notes?: string
}

/**
 * Ингредиент в производственной операции
 */
export interface ProductionIngredient {
  itemId: string
  itemType: StorageItemType
  itemName: string
  quantity: number
  unit: string
  totalCost: number
  batchAllocations: BatchAllocation[]
}

/**
 * Производственная операция (расширенная операция склада)
 */
export interface ProductionOperation extends StorageOperation {
  // Production specific fields
  preparationId: string
  preparationName: string
  recipeId: string
  batchCount: number

  // Consumption details
  ingredientConsumption: ProductionIngredient[]

  // Output details
  outputBatch: StorageBatch

  // The base operation items contain the consumed ingredients
  // The output batch is added separately to batches collection
}

// ==========================================
// FILTER AND SEARCH TYPES
// ==========================================

/**
 * Фильтры для балансов склада
 */
export interface StorageFilters {
  department: StorageDepartment | 'all'
  itemType: StorageItemType | 'all'
  showExpired: boolean
  showBelowMinStock: boolean
  showNearExpiry: boolean
  search: string
  dateFrom?: string
  dateTo?: string
}

/**
 * Настройки модуля склада
 */
export interface StorageSettings {
  expiryWarningDays: number // Days before expiry to show warning (default: 2)
  lowStockMultiplier: number // Multiplier for low stock calculation (default: 1.2)
  autoCalculateBalance: boolean // Auto-recalculate balances (default: true)
}

/**
 * Состояния загрузки для разных операций
 */
export interface StorageLoadingState {
  balances: boolean
  operations: boolean
  inventory: boolean
  production: boolean
}

// ==========================================
// STORE STATE
// ==========================================

/**
 * Основное состояние Storage store
 */
export interface StorageState {
  // Core data
  batches: StorageBatch[]
  operations: StorageOperation[]
  balances: StorageBalance[]
  inventories: InventoryDocument[]

  // UI state
  loading: StorageLoadingState
  error: string | null

  // Filters and search
  filters: StorageFilters

  // Settings
  settings: StorageSettings
}

// ==========================================
// ANALYTICS AND STATISTICS TYPES
// ==========================================

/**
 * Статистика по складу
 */
export interface StorageStatistics {
  totalItems: number
  totalValue: number

  kitchen: {
    items: number
    value: number
    products: number
    preparations: number
  }

  bar: {
    items: number
    value: number
    products: number
    preparations: number
  }

  alerts: {
    expiring: number
    expired: number
    lowStock: number
  }

  recentOperations: StorageOperation[]
  recentInventories: InventoryDocument[]

  productionStats: {
    totalProductions: number
    recentProductions: ProductionOperation[]
  }
}

/**
 * Информация о тренде цен
 */
export interface PriceTrend {
  trend: 'up' | 'down' | 'stable'
  percentage?: number
  oldPrice: number
  newPrice: number
}

/**
 * Аналитика использования товара
 */
export interface UsageAnalytics {
  itemId: string
  itemName: string
  totalConsumed: number
  averageDailyUsage: number
  lastUsageDate?: string
  popularityScore: number // 0-100
}

// ==========================================
// VALIDATION TYPES
// ==========================================

/**
 * Результат валидации операции
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

/**
 * Информация о недостающих ингредиентах
 */
export interface MissingIngredient {
  id: string
  name: string
  required: number
  available: number
  missing: number
  unit: string
}

/**
 * Результат валидации производства
 */
export interface ProductionValidation extends ValidationResult {
  missingIngredients: MissingIngredient[]
  maxBatchCount?: number
}

// ==========================================
// UTILITY TYPES
// ==========================================

/**
 * Опции для расчетов FIFO
 */
export interface FifoCalculationOptions {
  respectExpiry?: boolean // Учитывать срок годности при FIFO
  allowExpired?: boolean // Разрешить использование просроченных товаров
  sortByExpiry?: boolean // Сортировать по сроку годности вместо даты поступления
}

/**
 * Результат FIFO расчета
 */
export interface FifoAllocationResult {
  allocations: BatchAllocation[]
  remainingQuantity: number
  totalCost: number
  averageCostPerUnit: number
}

/**
 * Параметры для валидации остатков
 */
export interface StockValidationParams {
  itemId: string
  itemType: StorageItemType
  department: StorageDepartment
  requiredQuantity: number
}

/**
 * Результат валидации остатков
 */
export interface StockValidationResult {
  sufficient: boolean
  availableQuantity: number
  shortfall: number
  availableBatches: StorageBatch[]
}
