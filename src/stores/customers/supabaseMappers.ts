// src/stores/customers/supabaseMappers.ts - DB row <-> domain mappers

import type { Customer } from './types'

export function mapCustomerFromDb(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email || null,
    telegramId: row.telegram_id || null,
    telegramUsername: row.telegram_username || null,
    phone: row.phone || null,
    token: row.token,
    tier: row.tier || 'member',
    tierUpdatedAt: row.tier_updated_at || null,
    loyaltyBalance: Number(row.loyalty_balance) || 0,
    totalSpent: Number(row.total_spent) || 0,
    spent90d: Number(row.spent_90d) || 0,
    totalVisits: row.total_visits || 0,
    averageCheck: Number(row.average_check) || 0,
    firstVisitAt: row.first_visit_at || null,
    lastVisitAt: row.last_visit_at || null,
    notes: row.notes || null,
    personalDiscount: Number(row.personal_discount) || 0,
    loyaltyProgram: row.loyalty_program || 'stamps',
    disableLoyaltyAccrual: row.disable_loyalty_accrual || false,
    discountNote: row.discount_note || null,
    status: row.status || 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapCustomerToDb(customer: Partial<Customer>): Record<string, any> {
  const result: Record<string, any> = {}
  if (customer.name !== undefined) result.name = customer.name
  if (customer.email !== undefined) result.email = customer.email
  if (customer.telegramId !== undefined) result.telegram_id = customer.telegramId
  if (customer.telegramUsername !== undefined) result.telegram_username = customer.telegramUsername
  if (customer.phone !== undefined) result.phone = customer.phone
  if (customer.tier !== undefined) result.tier = customer.tier
  if (customer.tierUpdatedAt !== undefined) result.tier_updated_at = customer.tierUpdatedAt
  if (customer.notes !== undefined) result.notes = customer.notes
  if (customer.personalDiscount !== undefined) result.personal_discount = customer.personalDiscount
  if (customer.loyaltyProgram !== undefined) result.loyalty_program = customer.loyaltyProgram
  if (customer.disableLoyaltyAccrual !== undefined)
    result.disable_loyalty_accrual = customer.disableLoyaltyAccrual
  if (customer.discountNote !== undefined) result.discount_note = customer.discountNote
  if (customer.status !== undefined) result.status = customer.status
  return result
}
