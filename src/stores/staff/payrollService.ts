// src/stores/staff/payrollService.ts - Payroll calculation logic

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { BASE_MONTHLY_HOURS } from './types'
import type { StaffMember, StaffBonus, PayrollPeriod, WorkLog } from './types'
import { staffService } from './staffService'

const MODULE = 'PayrollService'

// =====================================================
// DATE HELPERS
// =====================================================

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// =====================================================
// PERIOD HELPERS
// =====================================================

export interface PayrollMonth {
  year: number
  month: number
  /** Полный период зарплаты: последний день пред. месяца → предпоследний день текущего */
  salaryStart: string
  salaryEnd: string
  /** Service period 1: последний день пред. месяца → 14-е текущего */
  service1Start: string
  service1End: string
  /** Service period 2: 15-е → предпоследний день текущего */
  service2Start: string
  service2End: string
  /** Все даты периода для таблицы */
  allDates: string[]
  /** Дата выплаты: последний день текущего месяца */
  paymentDate: string
}

/**
 * Рассчитать все периоды для данного месяца
 *
 * Зарплата: последний день пред. месяца → предпоследний день текущего (1 раз)
 * Service 1: последний день пред. месяца → 14-е текущего
 * Service 2: 15-е текущего → предпоследний день текущего
 * Выплата: последний день текущего месяца
 */
export function getPayrollMonth(year: number, month: number): PayrollMonth {
  // Последний день предыдущего месяца
  const prevMonthLastDay = new Date(year, month - 1, 0)
  // Последний день текущего месяца
  const currentMonthLastDay = new Date(year, month, 0).getDate()
  // Предпоследний день текущего месяца
  const secondToLast = currentMonthLastDay - 1

  const salaryStart = formatDate(prevMonthLastDay)
  const salaryEnd = formatDate(new Date(year, month - 1, secondToLast))

  const service1Start = salaryStart
  const service1End = formatDate(new Date(year, month - 1, 14))
  const service2Start = formatDate(new Date(year, month - 1, 15))
  const service2End = salaryEnd

  const paymentDate = formatDate(new Date(year, month - 1, currentMonthLastDay))

  // Генерация всех дат периода
  const allDates: string[] = []
  const cursor = new Date(prevMonthLastDay)
  const endDate = new Date(year, month - 1, secondToLast)
  while (cursor <= endDate) {
    allDates.push(formatDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return {
    year,
    month,
    salaryStart,
    salaryEnd,
    service1Start,
    service1End,
    service2Start,
    service2End,
    allDates,
    paymentDate
  }
}

// =====================================================
// PAYROLL CALCULATION RESULT (client-side, not saved to DB)
// =====================================================

export interface PayrollStaffRow {
  staffId: string
  staffName: string
  department: string
  rankName: string
  /** Месячная ставка ранга */
  baseSalaryMonthly: number
  /** Почасовая ставка (baseSalaryMonthly / 208) */
  hourlyRate: number
  /** Часы по дням: { 'YYYY-MM-DD': hours } */
  dailyHours: Record<string, number>
  /** Итого часов за service period 1 */
  totalHoursP1: number
  /** Итого часов за service period 2 */
  totalHoursP2: number
  /** Итого часов за весь период */
  totalHours: number
  /** Service tax доля за period 1 */
  service1: number
  /** Service tax доля за period 2 */
  service2: number
  /** Базовая зарплата (hourlyRate × totalHours) */
  salary: number
  /** Grand total = salary + service1 + service2 + bonuses */
  grandTotal: number
  bonusesTotal: number
  /** Детали бонусов */
  bonusDetails: Array<{ reason: string; amount: number; type: string }>
}

export interface PayrollResult {
  month: PayrollMonth
  rows: PayrollStaffRow[]
  totals: {
    totalHoursP1: number
    totalHoursP2: number
    totalHours: number
    service1: number
    service2: number
    salary: number
    bonuses: number
    grandTotal: number
  }
  totalServiceTaxP1: number
  totalServiceTaxP2: number
}

// =====================================================
// MAIN CALCULATION
// =====================================================

export async function calculatePayrollForMonth(
  year: number,
  month: number,
  members: StaffMember[],
  bonuses: StaffBonus[]
): Promise<PayrollResult> {
  const pm = getPayrollMonth(year, month)
  DebugUtils.info(MODULE, 'Calculating payroll', {
    year,
    month,
    salaryStart: pm.salaryStart,
    salaryEnd: pm.salaryEnd
  })

  const activeMembers = members.filter(m => m.isActive)

  // 1. Fetch work logs for full salary period
  const workLogs = await staffService.fetchWorkLogs(pm.salaryStart, pm.salaryEnd)

  // 2. Fetch service tax for both sub-periods
  const [totalServiceTaxP1, totalServiceTaxP2] = await Promise.all([
    staffService.fetchServiceTaxForPeriod(pm.service1Start, pm.service1End),
    staffService.fetchServiceTaxForPeriod(pm.service2Start, pm.service2End)
  ])

  // 3. Build lookup: staffId → { date → hours }
  const logMap = new Map<string, Map<string, number>>()
  for (const log of workLogs) {
    if (!logMap.has(log.staffId)) logMap.set(log.staffId, new Map())
    logMap.get(log.staffId)!.set(log.workDate, log.hoursWorked)
  }

  // 4. Total team hours per sub-period (for service tax distribution)
  let teamHoursP1 = 0
  let teamHoursP2 = 0
  for (const log of workLogs) {
    if (log.workDate >= pm.service1Start && log.workDate <= pm.service1End) {
      teamHoursP1 += log.hoursWorked
    }
    if (log.workDate >= pm.service2Start && log.workDate <= pm.service2End) {
      teamHoursP2 += log.hoursWorked
    }
  }

  // 5. Build per-staff rows
  const rows: PayrollStaffRow[] = []

  for (const member of activeMembers) {
    const staffDays = logMap.get(member.id) || new Map<string, number>()

    // Daily hours map
    const dailyHours: Record<string, number> = {}
    for (const date of pm.allDates) {
      dailyHours[date] = staffDays.get(date) || 0
    }

    // Sub-period hours
    let totalHoursP1 = 0
    let totalHoursP2 = 0
    for (const date of pm.allDates) {
      const h = dailyHours[date]
      if (date >= pm.service1Start && date <= pm.service1End) totalHoursP1 += h
      if (date >= pm.service2Start && date <= pm.service2End) totalHoursP2 += h
    }
    const totalHours = totalHoursP1 + totalHoursP2

    // Salary
    const baseSalary = member.rank?.baseSalary || 0
    const hourlyRate = baseSalary / BASE_MONTHLY_HOURS
    const salary = Math.round(hourlyRate * totalHours)

    // Service tax proportional share per sub-period
    const service1 =
      teamHoursP1 > 0 ? Math.round(totalServiceTaxP1 * (totalHoursP1 / teamHoursP1)) : 0
    const service2 =
      teamHoursP2 > 0 ? Math.round(totalServiceTaxP2 * (totalHoursP2 / teamHoursP2)) : 0

    // Bonuses
    const staffBonuses = bonuses.filter(b => {
      if (b.staffId !== member.id || !b.isActive) return false
      if (b.type === 'one_time') {
        return (
          b.effectiveDate && b.effectiveDate >= pm.salaryStart && b.effectiveDate <= pm.salaryEnd
        )
      }
      if (b.effectiveDate && b.effectiveDate > pm.salaryEnd) return false
      if (b.endDate && b.endDate < pm.salaryStart) return false
      return true
    })
    const bonusesTotal = staffBonuses.reduce((sum, b) => sum + b.amount, 0)
    const bonusDetails = staffBonuses.map(b => ({
      reason: b.reason || (b.type === 'monthly' ? 'Monthly bonus' : 'One-time bonus'),
      amount: b.amount,
      type: b.type
    }))

    const grandTotal = salary + service1 + service2 + bonusesTotal

    rows.push({
      staffId: member.id,
      staffName: member.name,
      department: member.department,
      rankName: member.rank?.name || '—',
      baseSalaryMonthly: baseSalary,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      dailyHours,
      totalHoursP1,
      totalHoursP2,
      totalHours,
      service1,
      service2,
      salary,
      grandTotal,
      bonusesTotal,
      bonusDetails
    })
  }

  // 6. Totals row
  const totals = {
    totalHoursP1: rows.reduce((s, r) => s + r.totalHoursP1, 0),
    totalHoursP2: rows.reduce((s, r) => s + r.totalHoursP2, 0),
    totalHours: rows.reduce((s, r) => s + r.totalHours, 0),
    service1: rows.reduce((s, r) => s + r.service1, 0),
    service2: rows.reduce((s, r) => s + r.service2, 0),
    salary: rows.reduce((s, r) => s + r.salary, 0),
    bonuses: rows.reduce((s, r) => s + r.bonusesTotal, 0),
    grandTotal: rows.reduce((s, r) => s + r.grandTotal, 0)
  }

  DebugUtils.info(MODULE, '✅ Payroll calculated', {
    staffCount: rows.length,
    totalServiceTaxP1,
    totalServiceTaxP2,
    salary: totals.salary,
    grandTotal: totals.grandTotal
  })

  return { month: pm, rows, totals, totalServiceTaxP1, totalServiceTaxP2 }
}

// =====================================================
// PERSIST TO DB (optional, for history)
// =====================================================

export async function savePayrollToDb(result: PayrollResult): Promise<PayrollPeriod> {
  const pm = result.month

  // Upsert payroll_period
  const { data: periodRow, error: periodError } = await supabase
    .from('payroll_periods')
    .upsert(
      {
        period_start: pm.salaryStart,
        period_end: pm.salaryEnd,
        status: 'calculated',
        total_service_tax: result.totalServiceTaxP1 + result.totalServiceTaxP2,
        total_base_salary: result.totals.salary,
        total_bonuses: result.rows.reduce((s, r) => s + r.bonusesTotal, 0),
        total_payroll: result.totals.grandTotal,
        calculated_at: new Date().toISOString()
      },
      { onConflict: 'period_start,period_end' }
    )
    .select()
    .single()

  if (periodError) throw periodError

  const periodId = periodRow.id

  // Replace items
  await supabase.from('payroll_items').delete().eq('payroll_period_id', periodId)

  const itemRows = result.rows.map(r => ({
    payroll_period_id: periodId,
    staff_id: r.staffId,
    hours_worked: r.totalHours,
    hourly_rate: Math.round((r.salary / r.totalHours || 0) * 100) / 100,
    base_salary_earned: r.salary,
    service_tax_share: r.service1 + r.service2,
    bonuses_total: r.bonusesTotal,
    total_earned: r.grandTotal
  }))

  await supabase.from('payroll_items').insert(itemRows)

  return staffService.fetchPayrollPeriod(periodId)
}

export async function updatePayrollStatus(
  periodId: string,
  status: 'approved' | 'paid',
  approvedBy?: string
): Promise<PayrollPeriod> {
  const update: Record<string, unknown> = { status }
  if (approvedBy) update.approved_by = approvedBy

  const { error } = await supabase.from('payroll_periods').update(update).eq('id', periodId)

  if (error) throw error
  return staffService.fetchPayrollPeriod(periodId)
}
