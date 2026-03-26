// src/stores/staff/supabaseMappers.ts - DB row <-> domain mappers

import type {
  StaffRank,
  StaffMember,
  WorkLog,
  StaffBonus,
  PayrollPeriod,
  PayrollItem,
  ShiftPreset
} from './types'

export function mapRankFromDb(row: any): StaffRank {
  return {
    id: row.id,
    name: row.name,
    baseSalary: Number(row.base_salary) || 0,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapRankToDb(rank: Partial<StaffRank>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (rank.name !== undefined) row.name = rank.name
  if (rank.baseSalary !== undefined) row.base_salary = rank.baseSalary
  if (rank.sortOrder !== undefined) row.sort_order = rank.sortOrder
  if (rank.isActive !== undefined) row.is_active = rank.isActive
  return row
}

export function mapMemberFromDb(row: any): StaffMember {
  const member: StaffMember = {
    id: row.id,
    name: row.name,
    phone: row.phone,
    department: row.department,
    rankId: row.rank_id,
    userId: row.user_id,
    isActive: row.is_active ?? true,
    startDate: row.start_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
  if (row.staff_ranks) {
    member.rank = mapRankFromDb(row.staff_ranks)
  }
  return member
}

export function mapMemberToDb(m: Partial<StaffMember>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (m.name !== undefined) row.name = m.name
  if (m.phone !== undefined) row.phone = m.phone
  if (m.department !== undefined) row.department = m.department
  if (m.rankId !== undefined) row.rank_id = m.rankId
  if (m.userId !== undefined) row.user_id = m.userId
  if (m.isActive !== undefined) row.is_active = m.isActive
  if (m.startDate !== undefined) row.start_date = m.startDate
  if (m.notes !== undefined) row.notes = m.notes
  return row
}

export function mapWorkLogFromDb(row: any): WorkLog {
  return {
    id: row.id,
    staffId: row.staff_id,
    workDate: row.work_date,
    hoursWorked: Number(row.hours_worked) || 0,
    timeSlots: row.time_slots ?? null,
    notes: row.notes,
    recordedBy: row.recorded_by,
    editReason: row.edit_reason,
    editedBy: row.edited_by,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapShiftPresetFromDb(row: any): ShiftPreset {
  return {
    id: row.id,
    name: row.name,
    startHour: row.start_hour,
    endHour: row.end_hour,
    sortOrder: row.sort_order ?? 0,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapShiftPresetToDb(p: Partial<ShiftPreset>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (p.name !== undefined) row.name = p.name
  if (p.startHour !== undefined) row.start_hour = p.startHour
  if (p.endHour !== undefined) row.end_hour = p.endHour
  if (p.sortOrder !== undefined) row.sort_order = p.sortOrder
  if (p.isActive !== undefined) row.is_active = p.isActive
  return row
}

export function mapBonusFromDb(row: any): StaffBonus {
  return {
    id: row.id,
    staffId: row.staff_id,
    type: row.type,
    amount: Number(row.amount) || 0,
    reason: row.reason,
    effectiveDate: row.effective_date,
    endDate: row.end_date,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapBonusToDb(b: Partial<StaffBonus>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (b.staffId !== undefined) row.staff_id = b.staffId
  if (b.type !== undefined) row.type = b.type
  if (b.amount !== undefined) row.amount = b.amount
  if (b.reason !== undefined) row.reason = b.reason
  if (b.effectiveDate !== undefined) row.effective_date = b.effectiveDate
  if (b.endDate !== undefined) row.end_date = b.endDate
  if (b.isActive !== undefined) row.is_active = b.isActive
  return row
}

export function mapPayrollPeriodFromDb(row: any): PayrollPeriod {
  const period: PayrollPeriod = {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    totalServiceTax: Number(row.total_service_tax) || 0,
    totalBaseSalary: Number(row.total_base_salary) || 0,
    totalBonuses: Number(row.total_bonuses) || 0,
    totalPayroll: Number(row.total_payroll) || 0,
    calculatedAt: row.calculated_at,
    approvedBy: row.approved_by,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
  if (Array.isArray(row.payroll_items)) {
    period.items = row.payroll_items.map(mapPayrollItemFromDb)
  }
  return period
}

export function mapPayrollItemFromDb(row: any): PayrollItem {
  return {
    id: row.id,
    payrollPeriodId: row.payroll_period_id,
    staffId: row.staff_id,
    hoursWorked: Number(row.hours_worked) || 0,
    hourlyRate: Number(row.hourly_rate) || 0,
    baseSalaryEarned: Number(row.base_salary_earned) || 0,
    serviceTaxShare: Number(row.service_tax_share) || 0,
    bonusesTotal: Number(row.bonuses_total) || 0,
    totalEarned: Number(row.total_earned) || 0,
    createdAt: row.created_at,
    staffName: row.staff_members?.name,
    staffDepartment: row.staff_members?.department
  }
}
