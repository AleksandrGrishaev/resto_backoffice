// src/stores/debug/types.ts

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

  // Store-specific metrics
  specificMetrics: Record<string, any>

  // Health status
  health: {
    status: 'healthy' | 'warning' | 'error'
    issues: string[]
    warnings: string[]
  }
}

export interface DebugHistoryEntry {
  id: string
  storeId: string
  timestamp: string
  action: string
  changeType: 'state' | 'data' | 'error'
  changes: DebugChange[]
  snapshot?: any // optional snapshot for major changes
}

export interface DebugChange {
  path: string
  oldValue: any
  newValue: any
  type: 'added' | 'modified' | 'deleted'
}

export interface DebugState {
  // Available stores
  availableStores: DebugStoreInfo[]

  // Current selection
  selectedStoreId: string | null
  selectedTab: 'raw' | 'structured' | 'history'

  // Data cache
  storeData: Record<string, DebugStoreData>
  history: DebugHistoryEntry[]

  // UI state
  loading: boolean
  error: string | null

  // Settings
  settings: {
    maxHistoryEntries: number
    autoRefresh: boolean
    refreshInterval: number
    enableHistory: boolean
  }
}

// Store-specific types for analysis
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

export interface AccountStoreMetrics {
  totalAccounts: number
  activeAccounts: number
  totalBalance: number
  totalTransactions: number
  pendingPayments: number
  urgentPayments: number
  averageTransactionAmount: number
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

// Tab configuration
export interface DebugTab {
  id: 'raw' | 'structured' | 'history'
  name: string
  icon: string
  description: string
}

// Copy operations
export interface CopyOperation {
  type: 'full' | 'selection'
  content: string
  timestamp: string
  success: boolean
}

// Constants
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
  },
  {
    id: 'history',
    name: 'History',
    icon: 'mdi-history',
    description: 'Store changes history'
  }
]

export const STORE_CONFIGURATIONS = {
  products: {
    icon: 'mdi-package-variant',
    description: 'Products catalog with pricing and suppliers',
    priority: 1
  },
  counteragents: {
    icon: 'mdi-store',
    description: 'Suppliers and service providers',
    priority: 2
  },
  recipes: {
    icon: 'mdi-book-open-page-variant',
    description: 'Recipes and preparations with cost calculations',
    priority: 3
  },
  account: {
    icon: 'mdi-bank',
    description: 'Financial accounts and transactions',
    priority: 4
  },
  menu: {
    icon: 'mdi-silverware-fork-knife',
    description: 'Menu categories and items',
    priority: 5
  },
  storage: {
    icon: 'mdi-warehouse',
    description: 'Product storage and inventory',
    priority: 6
  },
  preparation: {
    icon: 'mdi-chef-hat',
    description: 'Preparation storage and operations',
    priority: 7
  },
  supplier: {
    icon: 'mdi-truck',
    description: 'Supplier orders and procurement',
    priority: 8
  },
  auth: {
    icon: 'mdi-account-key',
    description: 'Authentication and user management',
    priority: 9
  }
} as const

// Utility types
export type StoreId = keyof typeof STORE_CONFIGURATIONS
export type DebugTabId = 'raw' | 'structured' | 'history'
