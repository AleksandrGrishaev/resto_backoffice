// src/stores/discounts/services/index.ts
/**
 * Discount Services
 *
 * Exports all discount-related services:
 * - discountService: Core business logic for applying discounts
 * - discountSupabaseService: Database operations for discount events
 */

export { DiscountService, discountService } from './discountService'
export type {
  ApplyItemDiscountParams,
  ApplyBillDiscountParams,
  DiscountResult,
  ValidationResult
} from './discountService'

export { DiscountSupabaseService, discountSupabaseService } from './supabaseService'
export type { ServiceResponse } from './supabaseService'
