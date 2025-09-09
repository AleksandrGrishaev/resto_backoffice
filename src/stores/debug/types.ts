// src/stores/debug/types.ts - SIMPLIFIED: Удалена вся функциональность History

// =============================================
// CORE DEBUG TYPES (без history)
// =============================================

export interface DebugStoreInfo {
  id: string
  name: string
  displayName: string
  description: string
  icon: string
  isLoaded: boolean
  lastUpdated: string
  recordCount: number
  size: string // formatted size (e.g., "1.2 KB")
}

export interface DebugStoreData {
  id: string
  name: string
  timestamp: string

  // Raw store data
  state: Record<string, any>
  getters: Record<string, any>
  actions: string[] // action names only for security

  // Structured analysis
  analysis: DebugStoreAnalysis
}

export interface DebugStoreAnalysis {
  // Basic stats
  totalItems: number
  activeItems: number
  inactiveItems: number

  // Data breakdown by type
  breakdown: {
    arrays: number
    objects: number
    primitives: number
    functions: number
  }

  // Health status
  health: {
    status: 'healthy' | 'warning' | 'error'
    issues: string[]
    warnings: string[]
  }
}

// =============================================
// SIMPLIFIED DEBUG STATE (без history)
// =============================================

export interface DebugState {
  // Available stores
  availableStores: DebugStoreInfo[]

  // Current selection
  selectedStoreId: string | null
  selectedTab: DebugTabId

  // Data cache
  storeData: Record<string, DebugStoreData>

  // UI state
  loading: boolean
  error: string | null

  // Settings (упрощенные)
  settings: {
    autoRefresh: boolean
    refreshInterval: number
  }
}

// =============================================
// STORE-SPECIFIC METRICS
// =============================================

export interface ProductsStoreMetrics {
  totalProducts: number
  sellableProducts: number
  rawMaterials: number
  categoriesBreakdown: Record<string, number>
  baseUnitsBreakdown: Record<string, number>
  avgCostPerUnit: number
  productsWithSuppliers: number
}

export interface CounteragentsStoreMetrics {
  totalCounterAgents: number
  suppliers: number
  services: number
  activeCounterAgents: number
  preferredCounterAgents: number
  categoryCoverage: Record<string, number>
  paymentTermsBreakdown: Record<string, number>
}

export interface RecipesStoreMetrics {
  totalPreparations: number
  totalRecipes: number
  activePreparations: number
  activeRecipes: number
  avgPreparationCost: number
  avgRecipeCost: number
  typeBreakdown: Record<string, number>
  complexityBreakdown: Record<string, number>
}

export interface AccountStoreMetrics extends StoreSpecificMetrics {
  // Базовые метрики
  totalAccounts: number
  activeAccounts: number
  totalBalance: number

  // ✅ ОБНОВЛЕННЫЕ метрики транзакций для новой архитектуры
  totalTransactions: number
  averageTransactionAmount: number
  transactionTypeBreakdown: {
    income: number
    expense: number
    transfer: number
    correction: number
  }

  // Метрики платежей
  pendingPayments: number
  urgentPayments: number

  // ✅ НОВЫЕ метрики для accountTransactions архитектуры
  accountsWithTransactions: number
  averageTransactionsPerAccount: number

  // ✅ НОВЫЕ метрики кеширования
  hasCachedTransactions: boolean
  cacheTimestamp?: string

  // ✅ НОВОЕ: Распределение транзакций
  transactionDistribution: Record<string, number>

  // ✅ НОВОЕ: Согласованность balanceAfter
  balanceConsistencyRate?: number
  balanceIssuesCount?: number
}

export interface StoreSpecificMetrics {
  [key: string]: any
}

export interface MenuStoreMetrics {
  totalCategories: number
  totalMenuItems: number
  activeCategories: number
  activeMenuItems: number
  totalVariants: number
  avgPricePerItem: number
  itemsPerCategory: Record<string, number>
}

export interface StorageStoreMetrics {
  totalProducts: number
  totalValue: number
  expiredItems: number
  nearExpiryItems: number
  lowStockItems: number
  departmentBreakdown: Record<string, { items: number; value: number }>
  recentOperations: number
}

export interface SupplierStoreMetrics {
  totalRequests: number
  totalOrders: number
  totalReceipts: number
  pendingRequests: number
  unpaidOrders: number
  urgentSuggestions: number
  workflowEfficiency: number
}

// Union type for all store-specific metrics
export type StoreSpecificMetrics =
  | ProductsStoreMetrics
  | CounteragentsStoreMetrics
  | RecipesStoreMetrics
  | AccountStoreMetrics
  | MenuStoreMetrics
  | StorageStoreMetrics
  | SupplierStoreMetrics
  | Record<string, any>

// =============================================
// TAB CONFIGURATION (без history)
// =============================================

export interface DebugTab {
  id: DebugTabId
  name: string
  icon: string
  description: string
}

export type DebugTabId = 'raw' | 'structured'

export const DEBUG_TABS: DebugTab[] = [
  {
    id: 'raw',
    name: 'Raw JSON',
    icon: 'mdi-code-json',
    description: 'Raw store data in JSON format'
  },
  {
    id: 'structured',
    name: 'Structured',
    icon: 'mdi-format-list-bulleted',
    description: 'Organized view with analysis'
  }
]

// =============================================
// COPY OPERATIONS
// =============================================

export interface CopyOperation {
  type: 'full' | 'raw' | 'structured'
  content: string
  timestamp: string
  success: boolean
}

// =============================================
// STORE CONFIGURATIONS
// =============================================

export const STORE_CONFIGURATIONS = {
  products: {
    name: 'Products Store',
    icon: 'mdi-package-variant',
    description: 'Products catalog with pricing and suppliers',
    priority: 1
  },
  counteragents: {
    name: 'Counteragents Store',
    icon: 'mdi-store',
    description: 'Suppliers and service providers',
    priority: 2
  },
  recipes: {
    name: 'Recipes Store',
    icon: 'mdi-book-open-page-variant',
    description: 'Recipes and preparations with cost calculations',
    priority: 3
  },
  account: {
    name: 'Account Store',
    icon: 'mdi-bank',
    description: 'Financial accounts and transactions',
    priority: 4
  },
  menu: {
    name: 'Menu Store',
    icon: 'mdi-silverware-fork-knife',
    description: 'Menu categories and items',
    priority: 5
  },
  storage: {
    name: 'Storage Store',
    icon: 'mdi-warehouse',
    description: 'Product storage and inventory',
    priority: 6
  },
  preparation: {
    name: 'Preparation Store',
    icon: 'mdi-chef-hat',
    description: 'Preparation storage and operations',
    priority: 7
  },
  supplier: {
    name: 'Supplier Store',
    icon: 'mdi-truck',
    description: 'Supplier orders and procurement',
    priority: 8
  },
  auth: {
    name: 'Auth Store',
    icon: 'mdi-account-key',
    description: 'Authentication and user management',
    priority: 9
  }
} as const

// Utility types
export type StoreId = keyof typeof STORE_CONFIGURATIONS
