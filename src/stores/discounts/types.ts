// src/stores/discounts/types.ts
import type { BaseEntity } from '@/types/common'

/**
 * Discount reason types
 * Used to categorize why a discount was applied
 */
export type DiscountReason =
  | 'customer_complaint' // Жалоба клиента
  | 'service_issue' // Проблема с обслуживанием
  | 'food_quality' // Качество еды
  | 'promotion' // Промо-акция
  | 'loyalty' // Лояльность клиента
  | 'staff_error' // Ошибка персонала
  | 'compensation' // Компенсация
  | 'manager_decision' // Решение менеджера
  | 'other' // Другое

/**
 * Human-readable labels for discount reasons
 */
export const DISCOUNT_REASON_LABELS: Record<DiscountReason, string> = {
  customer_complaint: 'Customer Complaint',
  service_issue: 'Service Issue',
  food_quality: 'Food Quality',
  promotion: 'Promotion',
  loyalty: 'Customer Loyalty',
  staff_error: 'Staff Error',
  compensation: 'Compensation',
  manager_decision: 'Manager Decision',
  other: 'Other'
}

/**
 * Discount type: item-level or bill-level
 */
export type DiscountType = 'item' | 'bill'

/**
 * Discount value type: percentage or fixed amount
 */
export type DiscountValueType = 'percentage' | 'fixed'

/**
 * Allocation details for bill-level discounts
 * Shows how discount was distributed across items
 */
export interface AllocationDetails {
  totalBillAmount: number
  itemAllocations: Array<{
    itemId: string
    itemName: string
    itemAmount: number
    proportion: number // 0.0 to 1.0
    allocatedDiscount: number
  }>
}

/**
 * Main discount event entity
 * Represents a single discount application with full audit trail
 */
export interface DiscountEvent extends BaseEntity {
  // Type and value
  type: DiscountType // 'item' or 'bill'
  discountType: DiscountValueType // 'percentage' or 'fixed'
  value: number // Percentage (0-100) or fixed amount
  reason: DiscountReason

  // Links to other entities
  orderId: string
  billId?: string // For bill discounts or if item is in a bill
  itemId?: string // For item discounts
  shiftId?: string // Current shift when discount was applied

  // Calculated amounts
  originalAmount: number // Original price before discount
  discountAmount: number // Actual discount amount
  finalAmount: number // Final price after discount

  // Bill discount allocation (only for type='bill')
  allocationDetails?: AllocationDetails

  // Metadata
  appliedBy: string | null // User ID who applied discount, NULL for system-generated
  appliedAt: string // ISO timestamp
  approvedBy?: string // User ID who approved (for future approval workflow)
  approvedAt?: string // ISO timestamp (for future approval workflow)
  notes?: string // Optional notes
}

/**
 * Tax breakdown for revenue calculations
 */
export interface TaxBreakdown {
  taxId: string
  name: string
  percentage: number
  amount: number
}

/**
 * Revenue breakdown showing three views
 * - Planned: Original prices before discounts
 * - Actual: After discounts, before tax
 * - Total: With taxes included (final amount collected)
 */
export interface RevenueBreakdown {
  plannedRevenue: number // Плановая выручка (original prices)

  // Discount breakdown
  itemDiscounts: number // Sum of item-level discounts
  billDiscounts: number // Sum of bill-level discounts
  totalDiscounts: number // itemDiscounts + billDiscounts

  actualRevenue: number // Реальная выручка (planned - discounts)

  // Tax breakdown
  taxes: TaxBreakdown[]
  totalTaxes: number

  totalCollected: number // Общая выручка (actual + taxes)
}

/**
 * Daily revenue report summary
 * Aggregates all revenue data for a specific day
 */
export interface DailyRevenueReport {
  date: string // ISO date (YYYY-MM-DD)

  // Revenue metrics
  plannedRevenue: number
  actualRevenue: number
  totalCollected: number

  // Discount metrics
  totalDiscounts: number
  discountCount: number // Total number of discount events
  ordersWithDiscountCount: number // Number of unique orders with discounts

  // Tax metrics
  totalTaxes: number
  taxBreakdown: TaxBreakdown[]

  // Order metrics
  orderCount: number
  averageOrderValue: number
}

/**
 * Discount summary for analytics
 * Groups discounts by reason with totals
 */
export interface DiscountSummary {
  reason: DiscountReason
  reasonLabel: string
  count: number
  totalAmount: number
  percentage: number // % of total discounts
}

/**
 * Discount transaction view for analytics dashboard
 * Combines discount event with order context
 */
export interface DiscountTransactionView extends DiscountEvent {
  // Order context
  orderNumber?: string
  tableName?: string
  orderType?: 'dine-in' | 'takeaway' | 'delivery'

  // User context
  appliedByName?: string
  approvedByName?: string

  // Calculated fields
  discountPercentage?: number // For display (discountAmount / originalAmount * 100)
}

/**
 * Filter options for discount queries
 */
export interface DiscountFilterOptions {
  // Date range
  startDate?: string // ISO date
  endDate?: string // ISO date

  // Filters
  reason?: DiscountReason
  type?: DiscountType
  discountType?: DiscountValueType
  appliedBy?: string // User ID
  shiftId?: string

  // Pagination
  limit?: number
  offset?: number

  // Sorting
  sortBy?: 'appliedAt' | 'discountAmount' | 'reason'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Date range preset for quick filtering
 */
export type DateRangePreset = 'today' | 'yesterday' | '7days' | '30days' | 'custom'

/**
 * Date range preset configuration
 */
export interface DateRangePresetConfig {
  value: DateRangePreset
  label: string
  getDates: () => { startDate: string; endDate: string }
}
