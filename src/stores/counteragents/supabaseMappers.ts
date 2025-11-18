// src/stores/counteragents/supabaseMappers.ts - Mappers for Supabase integration

import type {
  Counteragent,
  CreateCounteragentData,
  BalanceHistoryEntry,
  PaymentTerms,
  DeliverySchedule
} from './types'
import { TimeUtils } from '@/utils'

// =============================================
// DATABASE ROW TYPES
// =============================================

export interface CounteragentRow {
  id: string
  created_at: string
  updated_at: string
  name: string
  display_name: string | null
  type: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  website: string | null
  product_categories: string[] | null
  payment_terms: string
  credit_limit: number | null
  lead_time_days: number
  delivery_schedule: string | null
  min_order_amount: number | null
  description: string | null
  tags: string[] | null
  notes: string | null
  is_active: boolean | null
  is_preferred: boolean | null
  total_orders: number | null
  total_order_value: number | null
  last_order_date: string | null
  average_delivery_time: number | null
  current_balance: number | null
  balance_history: any[] | null
  last_balance_update: string | null
}

// =============================================
// MAIN MAPPERS
// =============================================

/**
 * Convert database row to Counteragent
 */
export function counteragentFromSupabase(row: CounteragentRow): Counteragent {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    name: row.name,
    displayName: row.display_name || undefined,
    type: row.type as any, // supplier | service | other
    contactPerson: row.contact_person || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    address: row.address || undefined,
    website: row.website || undefined,
    productCategories: (row.product_categories as any[]) || [],
    paymentTerms: row.payment_terms as PaymentTerms,
    creditLimit: row.credit_limit || undefined,
    leadTimeDays: row.lead_time_days,
    deliverySchedule: (row.delivery_schedule as DeliverySchedule) || undefined,
    minOrderAmount: row.min_order_amount || undefined,
    description: row.description || undefined,
    tags: (row.tags as string[]) || [],
    notes: row.notes || undefined,
    isActive: row.is_active ?? true,
    isPreferred: row.is_preferred ?? false,
    totalOrders: row.total_orders || undefined,
    totalOrderValue: row.total_order_value || undefined,
    lastOrderDate: row.last_order_date || undefined,
    averageDeliveryTime: row.average_delivery_time || undefined,
    currentBalance: row.current_balance || undefined,
    balanceHistory: row.balance_history
      ? row.balance_history.map(entry => balanceHistoryEntryFromSupabase(entry))
      : [],
    lastBalanceUpdate: row.last_balance_update || undefined
  }
}

/**
 * Convert Counteragent to database insert format
 */
export function counteragentToSupabaseInsert(
  data: CreateCounteragentData
): Omit<CounteragentRow, 'id' | 'created_at' | 'updated_at'> {
  const now = TimeUtils.getCurrentLocalISO()

  return {
    name: data.name,
    display_name: data.displayName || null,
    type: data.type,
    contact_person: data.contactPerson || null,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    website: data.website || null,
    product_categories: data.productCategories || [],
    payment_terms: data.paymentTerms,
    credit_limit: data.creditLimit || null,
    lead_time_days: data.leadTimeDays || 3,
    delivery_schedule: data.deliverySchedule || null,
    min_order_amount: data.minOrderAmount || null,
    description: data.description || null,
    tags: data.tags || [],
    notes: data.notes || null,
    is_active: data.isActive ?? true,
    is_preferred: data.isPreferred ?? false,
    total_orders: 0,
    total_order_value: 0,
    last_order_date: null,
    average_delivery_time: null,
    current_balance: 0,
    balance_history: [],
    last_balance_update: now
  }
}

/**
 * Convert Counteragent to database update format
 */
export function counteragentToSupabaseUpdate(
  data: Partial<Counteragent>
): Partial<CounteragentRow> {
  const update: Partial<CounteragentRow> = {
    updated_at: TimeUtils.getCurrentLocalISO()
  }

  // Map only defined fields
  if (data.name !== undefined) update.name = data.name
  if (data.displayName !== undefined) update.display_name = data.displayName || null
  if (data.type !== undefined) update.type = data.type
  if (data.contactPerson !== undefined) update.contact_person = data.contactPerson || null
  if (data.phone !== undefined) update.phone = data.phone || null
  if (data.email !== undefined) update.email = data.email || null
  if (data.address !== undefined) update.address = data.address || null
  if (data.website !== undefined) update.website = data.website || null
  if (data.productCategories !== undefined) update.product_categories = data.productCategories
  if (data.paymentTerms !== undefined) update.payment_terms = data.paymentTerms
  if (data.creditLimit !== undefined) update.credit_limit = data.creditLimit || null
  if (data.leadTimeDays !== undefined) update.lead_time_days = data.leadTimeDays
  if (data.deliverySchedule !== undefined) update.delivery_schedule = data.deliverySchedule || null
  if (data.minOrderAmount !== undefined) update.min_order_amount = data.minOrderAmount || null
  if (data.description !== undefined) update.description = data.description || null
  if (data.tags !== undefined) update.tags = data.tags
  if (data.notes !== undefined) update.notes = data.notes || null
  if (data.isActive !== undefined) update.is_active = data.isActive
  if (data.isPreferred !== undefined) update.is_preferred = data.isPreferred
  if (data.totalOrders !== undefined) update.total_orders = data.totalOrders || null
  if (data.totalOrderValue !== undefined) update.total_order_value = data.totalOrderValue || null
  if (data.lastOrderDate !== undefined) update.last_order_date = data.lastOrderDate || null
  if (data.averageDeliveryTime !== undefined)
    update.average_delivery_time = data.averageDeliveryTime || null
  if (data.currentBalance !== undefined) update.current_balance = data.currentBalance || null
  if (data.balanceHistory !== undefined) {
    update.balance_history = data.balanceHistory.map(entry => balanceHistoryEntryToSupabase(entry))
  }
  if (data.balanceHistory !== undefined || data.currentBalance !== undefined) {
    update.last_balance_update = TimeUtils.getCurrentLocalISO()
  }

  return update
}

// =============================================
// BALANCE HISTORY MAPPERS
// =============================================

export interface BalanceHistoryEntrySupabase {
  id: string
  date: string
  old_balance: number
  new_balance: number
  amount: number
  reason: string
  notes?: string
  applied_by?: string
}

/**
 * Convert database balance history entry to BalanceHistoryEntry
 */
export function balanceHistoryEntryFromSupabase(entry: any): BalanceHistoryEntry {
  return {
    id: entry.id,
    date: entry.date,
    oldBalance: entry.old_balance,
    newBalance: entry.new_balance,
    amount: entry.amount,
    reason: entry.reason as any, // BalanceCorrectionReason type
    notes: entry.notes || undefined,
    appliedBy: entry.applied_by || undefined
  }
}

/**
 * Convert BalanceHistoryEntry to database format
 */
export function balanceHistoryEntryToSupabase(
  entry: BalanceHistoryEntry
): BalanceHistoryEntrySupabase {
  return {
    id: entry.id,
    date: entry.date,
    old_balance: entry.oldBalance,
    new_balance: entry.newBalance,
    amount: entry.amount,
    reason: entry.reason,
    notes: entry.notes || null,
    applied_by: entry.appliedBy || null
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Convert array of database rows to Counteragents
 */
export function counteragentsFromSupabase(rows: CounteragentRow[]): Counteragent[] {
  return rows.map(counteragentFromSupabase)
}

/**
 * Generate balance history entry ID
 */
export function generateBalanceHistoryId(): string {
  return `balance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create new balance history entry
 */
export function createBalanceHistoryEntry(
  oldBalance: number,
  newBalance: number,
  reason: string,
  notes?: string,
  appliedBy?: string
): BalanceHistoryEntry {
  return {
    id: generateBalanceHistoryId(),
    date: TimeUtils.getCurrentLocalISO(),
    oldBalance,
    newBalance,
    amount: newBalance - oldBalance,
    reason: reason as any,
    notes,
    appliedBy
  }
}
