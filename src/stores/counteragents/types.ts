// src/stores/counteragents/types.ts - REFACTORED with Product Store Integration

import type { ProductCategory } from '@/stores/productsStore/types'

// =============================================
// БАЗОВЫЕ ТИПЫ
// =============================================

export type CounteragentType = 'supplier' | 'service' | 'other'

export type PaymentTerms = 'prepaid' | 'on_delivery' | 'after' | 'custom'

export type DeliverySchedule = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'on_demand'

// =============================================
// БАЗОВАЯ СУЩНОСТЬ
// =============================================

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

// =============================================
// ГЛАВНАЯ СУЩНОСТЬ КОНТРАГЕНТА
// =============================================

export interface Counteragent extends BaseEntity {
  // Базовая информация
  name: string
  displayName?: string
  type: CounteragentType

  // Контактная информация
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  website?: string

  // ✅ ИНТЕГРАЦИЯ: Связь с продуктами через категории
  productCategories: ProductCategory[]

  // Деловые условия
  paymentTerms: PaymentTerms
  creditLimit?: number

  // ✅ НОВЫЕ ПОЛЯ: Условия поставки
  leadTimeDays: number // Время поставки в днях
  deliverySchedule?: DeliverySchedule
  minOrderAmount?: number // Минимальная сумма заказа в IDR

  // Описание и метаданные
  description?: string
  tags?: string[]
  notes?: string

  // Статус и предпочтения
  isActive: boolean
  isPreferred: boolean

  // ✅ ИНТЕГРАЦИЯ: Статистика заказов (будет использоваться supplier store)
  totalOrders?: number
  totalOrderValue?: number // в IDR
  lastOrderDate?: string
  averageDeliveryTime?: number // в днях

  // BALANCE
  currentBalance?: number
  lastBalanceUpdate?: string
}

// =============================================
// ДАННЫЕ ДЛЯ СОЗДАНИЯ КОНТРАГЕНТА
// =============================================

export interface CreateCounteragentData {
  name: string
  displayName?: string
  type: CounteragentType
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  website?: string
  productCategories: ProductCategory[]
  description?: string
  paymentTerms: PaymentTerms
  isActive?: boolean
  isPreferred?: boolean
  tags?: string[]
  notes?: string
  creditLimit?: number
  leadTimeDays?: number
  deliverySchedule?: DeliverySchedule
  minOrderAmount?: number
}

// =============================================
// ФИЛЬТРЫ И СОСТОЯНИЕ STORE
// =============================================

export interface CounteragentFilters {
  search?: string
  type?: CounteragentType | 'all'
  isActive?: boolean | 'all'
  isPreferred?: boolean | 'all'
  productCategories?: ProductCategory[]
  paymentTerms?: PaymentTerms | 'all'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface CounteragentsState {
  // Core data
  counteragents: Counteragent[]

  // UI state
  loading: {
    counteragents: boolean
    stats: boolean
  }
  error: string | null

  // Current selection
  currentCounteragent?: Counteragent
  selectedIds: string[]

  // Filters
  filters: {
    search: string
    type: CounteragentType | 'all'
    isActive: boolean | 'all'
    isPreferred: boolean | 'all'
    productCategories: ProductCategory[]
    paymentTerms: PaymentTerms | 'all'
  }

  // View settings
  viewSettings: {
    sortBy: string
    sortOrder: 'asc' | 'desc'
    itemsPerPage: number
    showInactive: boolean
  }
}

// =============================================
// API RESPONSES
// =============================================

export interface CounteragentsResponse {
  data: Counteragent[]
  total: number
  page: number
  limit: number
}

export interface CounteragentResponse {
  data: Counteragent
}

// =============================================
// СТАТИСТИКА
// =============================================

export interface CounteragentsStatistics {
  totalCounterAgents: number
  activeCounterAgents: number
  preferredCounterAgents: number
  typeBreakdown: Record<CounteragentType, number>
  productCategoryBreakdown: Record<ProductCategory, number>
  paymentTermsBreakdown: Record<PaymentTerms, number>
}

// =============================================
// ✅ ИНТЕГРАЦИОННЫЕ ТИПЫ
// =============================================

/**
 * Интеграция с Product Store
 */
export interface ProductSupplierInfo {
  supplierId: string
  supplierName: string
  isPrimary: boolean
  leadTimeDays: number
  lastOrderDate?: string
  averagePrice?: number
}

/**
 * Интеграция с Supplier Store (будущая)
 */
export interface SupplierOrderSummary {
  totalOrders: number
  totalValue: number
  lastOrderDate?: string
  averageOrderValue: number
  onTimeDeliveryRate: number
}

/**
 * Данные для рекомендаций закупок
 */
export interface SupplierRecommendation {
  supplierId: string
  supplierName: string
  categories: ProductCategory[]
  recommendedProducts: string[] // Product IDs
  estimatedLeadTime: number
  reliabilityScore: number
}

// =============================================
// КОНСТАНТЫ
// =============================================

export const COUNTERAGENT_TYPES = {
  SUPPLIER: 'supplier' as const,
  SERVICE: 'service' as const,
  OTHER: 'other' as const
} as const

export const PAYMENT_TERMS = {
  PREPAID: 'prepaid' as const,
  ON_DELIVERY: 'on_delivery' as const,
  AFTER: 'after' as const,
  CUSTOM: 'custom' as const
} as const

export const DELIVERY_SCHEDULES = {
  DAILY: 'daily' as const,
  WEEKLY: 'weekly' as const,
  BIWEEKLY: 'biweekly' as const,
  MONTHLY: 'monthly' as const,
  ON_DEMAND: 'on_demand' as const
} as const
