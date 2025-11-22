// src/stores/counteragents/supabaseMappers.ts
// Mappers for converting between TypeScript (camelCase) and PostgreSQL (snake_case)

import type { Counteragent, BalanceHistoryEntry } from './types'

// =============================================
// DATABASE TYPES (snake_case)
// =============================================

export interface DBCounteragent {
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
  product_categories: string[]
  payment_terms: string
  credit_limit: number | null
  lead_time_days: number
  delivery_schedule: string | null
  min_order_amount: number | null
  description: string | null
  tags: string[] | null
  notes: string | null
  is_active: boolean
  is_preferred: boolean
  total_orders: number
  total_order_value: number
  last_order_date: string | null
  average_delivery_time: number | null
  current_balance: number
  balance_history: any // jsonb
  last_balance_update: string | null
}

// =============================================
// FROM DATABASE (snake_case → camelCase)
// =============================================

export function mapCounteragentFromDB(dbCounteragent: DBCounteragent): Counteragent {
  return {
    id: dbCounteragent.id,
    createdAt: dbCounteragent.created_at,
    updatedAt: dbCounteragent.updated_at,
    name: dbCounteragent.name,
    displayName: dbCounteragent.display_name || undefined,
    type: dbCounteragent.type as any,
    contactPerson: dbCounteragent.contact_person || undefined,
    phone: dbCounteragent.phone || undefined,
    email: dbCounteragent.email || undefined,
    address: dbCounteragent.address || undefined,
    website: dbCounteragent.website || undefined,
    productCategories: dbCounteragent.product_categories as any,
    paymentTerms: dbCounteragent.payment_terms as any,
    creditLimit: dbCounteragent.credit_limit || undefined,
    leadTimeDays: dbCounteragent.lead_time_days,
    deliverySchedule: (dbCounteragent.delivery_schedule as any) || undefined,
    minOrderAmount: dbCounteragent.min_order_amount || undefined,
    description: dbCounteragent.description || undefined,
    tags: dbCounteragent.tags || undefined,
    notes: dbCounteragent.notes || undefined,
    isActive: dbCounteragent.is_active,
    isPreferred: dbCounteragent.is_preferred,
    totalOrders: dbCounteragent.total_orders || undefined,
    totalOrderValue: dbCounteragent.total_order_value || undefined,
    lastOrderDate: dbCounteragent.last_order_date || undefined,
    averageDeliveryTime: dbCounteragent.average_delivery_time || undefined,
    currentBalance: dbCounteragent.current_balance || undefined,
    balanceHistory: Array.isArray(dbCounteragent.balance_history)
      ? dbCounteragent.balance_history
      : undefined,
    lastBalanceUpdate: dbCounteragent.last_balance_update || undefined
  }
}

// =============================================
// TO DATABASE (camelCase → snake_case)
// =============================================

export function mapCounteragentToDB(counteragent: Counteragent): Partial<DBCounteragent> {
  return {
    id: counteragent.id,
    created_at: counteragent.createdAt,
    updated_at: counteragent.updatedAt,
    name: counteragent.name,
    display_name: counteragent.displayName || null,
    type: counteragent.type,
    contact_person: counteragent.contactPerson || null,
    phone: counteragent.phone || null,
    email: counteragent.email || null,
    address: counteragent.address || null,
    website: counteragent.website || null,
    product_categories: counteragent.productCategories,
    payment_terms: counteragent.paymentTerms,
    credit_limit: counteragent.creditLimit || null,
    lead_time_days: counteragent.leadTimeDays,
    delivery_schedule: counteragent.deliverySchedule || null,
    min_order_amount: counteragent.minOrderAmount || null,
    description: counteragent.description || null,
    tags: counteragent.tags || null,
    notes: counteragent.notes || null,
    is_active: counteragent.isActive,
    is_preferred: counteragent.isPreferred,
    total_orders: counteragent.totalOrders || 0,
    total_order_value: counteragent.totalOrderValue || 0,
    last_order_date: counteragent.lastOrderDate || null,
    average_delivery_time: counteragent.averageDeliveryTime || null,
    current_balance: counteragent.currentBalance || 0,
    balance_history: counteragent.balanceHistory || [],
    last_balance_update: counteragent.lastBalanceUpdate || null
  }
}
