// src/stores/staff/staffService.ts - Supabase CRUD for staff module

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import type { StaffRank, StaffMember, WorkLog, StaffBonus, PayrollPeriod } from './types'
import {
  mapRankFromDb,
  mapRankToDb,
  mapMemberFromDb,
  mapMemberToDb,
  mapWorkLogFromDb,
  mapBonusFromDb,
  mapBonusToDb,
  mapPayrollPeriodFromDb
} from './supabaseMappers'

const MODULE = 'StaffService'

// =====================================================
// RANKS
// =====================================================

export async function fetchRanks(): Promise<StaffRank[]> {
  const { data, error } = await supabase.from('staff_ranks').select('*').order('sort_order')

  if (error) {
    DebugUtils.error(MODULE, 'fetchRanks failed', error)
    throw error
  }
  return (data || []).map(mapRankFromDb)
}

export async function createRank(rank: Partial<StaffRank>): Promise<StaffRank> {
  const { data, error } = await supabase
    .from('staff_ranks')
    .insert(mapRankToDb(rank))
    .select()
    .single()

  if (error) throw error
  return mapRankFromDb(data)
}

export async function updateRank(id: string, rank: Partial<StaffRank>): Promise<StaffRank> {
  const { data, error } = await supabase
    .from('staff_ranks')
    .update(mapRankToDb(rank))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapRankFromDb(data)
}

export async function deleteRank(id: string): Promise<void> {
  const { error } = await supabase.from('staff_ranks').delete().eq('id', id)
  if (error) throw error
}

// =====================================================
// MEMBERS
// =====================================================

export async function fetchMembers(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff_members')
    .select('*, staff_ranks(*)')
    .order('name')

  if (error) {
    DebugUtils.error(MODULE, 'fetchMembers failed', error)
    throw error
  }
  return (data || []).map(mapMemberFromDb)
}

export async function createMember(member: Partial<StaffMember>): Promise<StaffMember> {
  const { data, error } = await supabase
    .from('staff_members')
    .insert(mapMemberToDb(member))
    .select('*, staff_ranks(*)')
    .single()

  if (error) throw error
  return mapMemberFromDb(data)
}

export async function updateMember(id: string, member: Partial<StaffMember>): Promise<StaffMember> {
  const { data, error } = await supabase
    .from('staff_members')
    .update(mapMemberToDb(member))
    .eq('id', id)
    .select('*, staff_ranks(*)')
    .single()

  if (error) throw error
  return mapMemberFromDb(data)
}

export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase.from('staff_members').delete().eq('id', id)
  if (error) throw error
}

// =====================================================
// WORK LOGS
// =====================================================

export async function fetchWorkLogs(dateFrom: string, dateTo: string): Promise<WorkLog[]> {
  const { data, error } = await supabase
    .from('staff_work_logs')
    .select('*')
    .gte('work_date', dateFrom)
    .lte('work_date', dateTo)
    .order('work_date', { ascending: false })

  if (error) {
    DebugUtils.error(MODULE, 'fetchWorkLogs failed', error)
    throw error
  }
  return (data || []).map(mapWorkLogFromDb)
}

export async function upsertWorkLog(
  staffId: string,
  workDate: string,
  hoursWorked: number,
  recordedBy?: string,
  notes?: string
): Promise<WorkLog> {
  const { data, error } = await supabase
    .from('staff_work_logs')
    .upsert(
      {
        staff_id: staffId,
        work_date: workDate,
        hours_worked: hoursWorked,
        recorded_by: recordedBy,
        notes
      },
      { onConflict: 'staff_id,work_date' }
    )
    .select()
    .single()

  if (error) throw error
  return mapWorkLogFromDb(data)
}

export async function upsertWorkLogsBatch(
  logs: Array<{ staffId: string; workDate: string; hoursWorked: number; recordedBy?: string }>
): Promise<WorkLog[]> {
  const rows = logs.map(l => ({
    staff_id: l.staffId,
    work_date: l.workDate,
    hours_worked: l.hoursWorked,
    recorded_by: l.recordedBy
  }))

  const { data, error } = await supabase
    .from('staff_work_logs')
    .upsert(rows, { onConflict: 'staff_id,work_date' })
    .select()

  if (error) throw error
  return (data || []).map(mapWorkLogFromDb)
}

// =====================================================
// BONUSES
// =====================================================

export async function fetchBonuses(staffId?: string): Promise<StaffBonus[]> {
  let query = supabase.from('staff_bonuses').select('*').order('created_at', { ascending: false })

  if (staffId) {
    query = query.eq('staff_id', staffId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []).map(mapBonusFromDb)
}

export async function createBonus(bonus: Partial<StaffBonus>): Promise<StaffBonus> {
  const { data, error } = await supabase
    .from('staff_bonuses')
    .insert(mapBonusToDb(bonus))
    .select()
    .single()

  if (error) throw error
  return mapBonusFromDb(data)
}

export async function updateBonus(id: string, bonus: Partial<StaffBonus>): Promise<StaffBonus> {
  const { data, error } = await supabase
    .from('staff_bonuses')
    .update(mapBonusToDb(bonus))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapBonusFromDb(data)
}

export async function deleteBonus(id: string): Promise<void> {
  const { error } = await supabase.from('staff_bonuses').delete().eq('id', id)
  if (error) throw error
}

// =====================================================
// PAYROLL
// =====================================================

export async function fetchPayrollPeriods(): Promise<PayrollPeriod[]> {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*, payroll_items(*, staff_members(name, department))')
    .order('period_start', { ascending: false })

  if (error) throw error
  return (data || []).map(mapPayrollPeriodFromDb)
}

export async function fetchPayrollPeriod(id: string): Promise<PayrollPeriod> {
  const { data, error } = await supabase
    .from('payroll_periods')
    .select('*, payroll_items(*, staff_members(name, department))')
    .eq('id', id)
    .single()

  if (error) throw error
  return mapPayrollPeriodFromDb(data)
}

/**
 * Получить сумму service_tax для payroll за период.
 * Для inclusive каналов (GoFood, Grab) вычитает комиссию платформы —
 * service tax распределяется только от базовой стоимости блюда, без комиссии.
 *
 * Формула:
 *   exclusive каналы: service_tax_amount as-is
 *   inclusive каналы:  service_tax_amount × (1 - commission_percent / 100)
 */
export async function fetchServiceTaxForPeriod(dateFrom: string, dateTo: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_payroll_service_tax', {
    date_from: `${dateFrom}T00:00:00+08:00`,
    date_to: `${dateTo}T23:59:59+08:00`
  })

  if (error) {
    DebugUtils.error(MODULE, 'fetchServiceTaxForPeriod RPC failed, falling back', error)
    return fetchServiceTaxFallback(dateFrom, dateTo)
  }

  return Number(data) || 0
}

/** Fallback: простая сумма без коррекции на комиссию */
async function fetchServiceTaxFallback(dateFrom: string, dateTo: string): Promise<number> {
  const { data, error } = await supabase
    .from('sales_transactions')
    .select('service_tax_amount')
    .gte('created_at', `${dateFrom}T00:00:00+08:00`)
    .lte('created_at', `${dateTo}T23:59:59+08:00`)

  if (error) {
    DebugUtils.error(MODULE, 'fetchServiceTaxFallback failed', error)
    return 0
  }

  return (data || []).reduce((sum, row) => sum + (Number(row.service_tax_amount) || 0), 0)
}

export const staffService = {
  fetchRanks,
  createRank,
  updateRank,
  deleteRank,
  fetchMembers,
  createMember,
  updateMember,
  deleteMember,
  fetchWorkLogs,
  upsertWorkLog,
  upsertWorkLogsBatch,
  fetchBonuses,
  createBonus,
  updateBonus,
  deleteBonus,
  fetchPayrollPeriods,
  fetchPayrollPeriod,
  fetchServiceTaxForPeriod
}
