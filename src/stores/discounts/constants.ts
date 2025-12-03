// src/stores/discounts/constants.ts
import { TimeUtils } from '@/utils'
import type {
  DiscountReason,
  DateRangePreset,
  DateRangePresetConfig,
  DiscountValueType
} from './types'
import { DISCOUNT_REASON_LABELS } from './types'

/**
 * Discount reason options for dropdowns
 * Each option includes value, label, and optional description
 */
export const DISCOUNT_REASON_OPTIONS: Array<{
  value: DiscountReason
  label: string
  description?: string
}> = [
  {
    value: 'customer_complaint',
    label: DISCOUNT_REASON_LABELS.customer_complaint,
    description: 'Customer complained about service or product'
  },
  {
    value: 'service_issue',
    label: DISCOUNT_REASON_LABELS.service_issue,
    description: 'Problem with service delivery'
  },
  {
    value: 'food_quality',
    label: DISCOUNT_REASON_LABELS.food_quality,
    description: 'Issue with food quality or preparation'
  },
  {
    value: 'promotion',
    label: DISCOUNT_REASON_LABELS.promotion,
    description: 'Promotional discount or special offer'
  },
  {
    value: 'loyalty',
    label: DISCOUNT_REASON_LABELS.loyalty,
    description: 'Loyalty program or repeat customer discount'
  },
  {
    value: 'staff_error',
    label: DISCOUNT_REASON_LABELS.staff_error,
    description: 'Error made by staff member'
  },
  {
    value: 'compensation',
    label: DISCOUNT_REASON_LABELS.compensation,
    description: 'Compensation for inconvenience'
  },
  {
    value: 'manager_decision',
    label: DISCOUNT_REASON_LABELS.manager_decision,
    description: 'Manager discretionary discount'
  },
  {
    value: 'other',
    label: DISCOUNT_REASON_LABELS.other,
    description: 'Other reason (specify in notes)'
  }
]

/**
 * Discount value type options
 */
export const DISCOUNT_VALUE_TYPE_OPTIONS: Array<{
  value: DiscountValueType
  label: string
  icon: string
}> = [
  { value: 'percentage', label: 'Percentage (%)', icon: 'mdi-percent' },
  { value: 'fixed', label: 'Fixed Amount', icon: 'mdi-currency-usd' }
]

/**
 * Date range presets for quick filtering
 * Uses TimeUtils for consistent date handling
 */
export const DATE_RANGE_PRESETS: DateRangePresetConfig[] = [
  {
    value: 'today',
    label: 'Today',
    getDates: () => {
      const today = TimeUtils.getCurrentLocalISO()
      return {
        startDate: today.split('T')[0],
        endDate: today.split('T')[0]
      }
    }
  },
  {
    value: 'yesterday',
    label: 'Yesterday',
    getDates: () => {
      const date = new Date()
      date.setDate(date.getDate() - 1)
      const yesterday = date.toISOString().split('T')[0]
      return {
        startDate: yesterday,
        endDate: yesterday
      }
    }
  },
  {
    value: '7days',
    label: 'Last 7 Days',
    getDates: () => {
      const endDate = TimeUtils.getCurrentLocalISO().split('T')[0]
      const date = new Date()
      date.setDate(date.getDate() - 6)
      const startDate = date.toISOString().split('T')[0]
      return { startDate, endDate }
    }
  },
  {
    value: '30days',
    label: 'Last 30 Days',
    getDates: () => {
      const endDate = TimeUtils.getCurrentLocalISO().split('T')[0]
      const date = new Date()
      date.setDate(date.getDate() - 29)
      const startDate = date.toISOString().split('T')[0]
      return { startDate, endDate }
    }
  },
  {
    value: 'custom',
    label: 'Custom Range',
    getDates: () => {
      // Custom range - dates will be provided by user
      return { startDate: '', endDate: '' }
    }
  }
]

/**
 * Default filter options for discount queries
 */
export const DEFAULT_DISCOUNT_FILTER = {
  limit: 50,
  offset: 0,
  sortBy: 'appliedAt' as const,
  sortOrder: 'desc' as const
}

/**
 * Default pagination settings for discount lists
 */
export const DISCOUNT_PAGINATION = {
  itemsPerPage: 25,
  itemsPerPageOptions: [10, 25, 50, 100]
}

/**
 * ⚠️ TAX RATES CONFIGURATION
 *
 * IMPORTANT: Do NOT hardcode tax rates here!
 *
 * Tax rates are managed dynamically through the payment settings system:
 * - Store: usePaymentSettingsStore()
 * - Getter: paymentSettingsStore.activeTaxes
 * - Type: Tax[] (from @/types/tax)
 *
 * Each tax has: { id, name, percentage, isActive }
 *
 * Example usage:
 * ```typescript
 * import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
 *
 * const paymentSettings = usePaymentSettingsStore()
 * const activeTaxes = paymentSettings.activeTaxes
 *
 * // Calculate taxes
 * const totalTaxes = activeTaxes.reduce((sum, tax) => {
 *   return sum + (actualRevenue * (tax.percentage / 100))
 * }, 0)
 * ```
 *
 * This approach allows:
 * - Dynamic tax configuration via UI
 * - Multiple tax types (service tax, government tax, etc.)
 * - Easy tax rate updates without code changes
 * - Proper audit trail of tax changes
 */

/**
 * Validation constants
 */
export const DISCOUNT_VALIDATION = {
  MIN_PERCENTAGE: 0,
  MAX_PERCENTAGE: 100,
  MIN_FIXED_AMOUNT: 0,
  MAX_NOTES_LENGTH: 500
}

/**
 * Module name for debug logging
 */
export const MODULE_NAME = 'DiscountStore'
