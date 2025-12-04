// src/stores/discounts/index.ts
/**
 * Discount Store Module
 *
 * Main exports for the discount system.
 * Provides types, constants, store, and services for managing discounts.
 *
 * Usage:
 * ```typescript
 * import { useDiscountsStore, DiscountEvent, DISCOUNT_REASON_OPTIONS } from '@/stores/discounts'
 *
 * const discountsStore = useDiscountsStore()
 * await discountsStore.initialize()
 *
 * const todayDiscounts = discountsStore.getTodayDiscounts()
 * const stats = discountsStore.getDiscountStats({ startDate: '2024-01-01' })
 * ```
 */

// Store
export { useDiscountsStore } from './discountsStore'

// Types
export type {
  DiscountEvent,
  DiscountReason,
  DiscountType,
  DiscountValueType,
  AllocationDetails,
  TaxBreakdown,
  RevenueBreakdown,
  DailyRevenueReport,
  DiscountSummary,
  DiscountTransactionView,
  DiscountFilterOptions,
  DateRangePreset,
  DateRangePresetConfig
} from './types'

export { DISCOUNT_REASON_LABELS } from './types'

// Constants
export {
  DISCOUNT_REASON_OPTIONS,
  DISCOUNT_VALUE_TYPE_OPTIONS,
  DATE_RANGE_PRESETS,
  DEFAULT_DISCOUNT_FILTER,
  DISCOUNT_PAGINATION,
  DISCOUNT_VALIDATION,
  MODULE_NAME as DISCOUNT_MODULE_NAME
} from './constants'

// Services
export {
  discountService,
  discountSupabaseService,
  DiscountService,
  DiscountSupabaseService
} from './services'

export type {
  ApplyItemDiscountParams,
  ApplyBillDiscountParams,
  DiscountResult,
  ValidationResult
} from './services'

// Composables
export { useDiscountAnalytics } from './composables'
