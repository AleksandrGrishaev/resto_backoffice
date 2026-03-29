// src/stores/staff/payrollService.ts - Payroll calculation logic

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { BASE_MONTHLY_HOURS } from './types'
import type {
  StaffMember,
  StaffBonus,
  PayrollPeriod,
  WorkLog,
  TimeSlot,
  DepartmentKpiResult,
  KpiDepartment
} from './types'
import { staffService } from './staffService'
import { calculateDepartmentKpiBonus, saveKpiBonusSnapshot } from './kpiBonusService'

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
  /** KPI rank multiplier (Senior=1.5, Junior=1.0) */
  kpiMultiplier: number
  /** Месячная ставка ранга */
  baseSalaryMonthly: number
  /** Почасовая ставка (baseSalaryMonthly / 208) */
  hourlyRate: number
  /** Часы по дням: { 'YYYY-MM-DD': hours } */
  dailyHours: Record<string, number>
  /** Тайм-слоты по дням: { 'YYYY-MM-DD': TimeSlot[] | null } */
  dailyTimeSlots: Record<string, TimeSlot[] | null>
  /** Даты, где часы были скорректированы: date → reason */
  editedDates: Map<string, string>
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
  /** Grand total = salary + service1 + service2 + bonuses + kpiBonus */
  grandTotal: number
  bonusesTotal: number
  /** Детали бонусов */
  bonusDetails: Array<{ reason: string; amount: number; type: string }>
  /** KPI bonus from department pool */
  kpiBonus: number
  /** KPI bonus details for display */
  kpiDetails?: {
    department: string
    departmentScore: number
    poolType: string
    poolAmount: number
    departmentRevenue: number
    unlockedAmount: number
  }
  /** Стажёр — индивидуальная ставка, без service tax */
  isTrainee: boolean
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
    kpiBonuses: number
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

  // 3. Build lookup: staffId → { date → WorkLog } + edited dates with reasons
  const logMap = new Map<string, Map<string, WorkLog>>()
  const editedMap = new Map<string, Map<string, string>>() // staffId → Map<date, reason>
  for (const log of workLogs) {
    if (!logMap.has(log.staffId)) logMap.set(log.staffId, new Map())
    logMap.get(log.staffId)!.set(log.workDate, log)

    // Detect edits: has edited_by or edited_at
    if (log.editedBy || log.editedAt) {
      if (!editedMap.has(log.staffId)) editedMap.set(log.staffId, new Map())
      editedMap.get(log.staffId)!.set(log.workDate, log.editReason || 'Corrected')
    }
  }

  // 4. Total team hours per sub-period (for service tax distribution)
  //    Trainees are excluded — they don't participate in service tax
  const traineeIds = new Set(activeMembers.filter(m => m.isTrainee).map(m => m.id))
  let teamHoursP1 = 0
  let teamHoursP2 = 0
  for (const log of workLogs) {
    if (traineeIds.has(log.staffId)) continue
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
    const staffLogs = logMap.get(member.id) || new Map<string, WorkLog>()
    const editedDates = editedMap.get(member.id) || new Map<string, string>()

    // Daily hours and time slots maps
    const dailyHours: Record<string, number> = {}
    const dailyTimeSlots: Record<string, TimeSlot[] | null> = {}
    for (const date of pm.allDates) {
      const log = staffLogs.get(date)
      dailyHours[date] = log?.hoursWorked || 0
      dailyTimeSlots[date] = log?.timeSlots ?? null
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

    // Salary — trainees use customSalary, regular staff use rank
    const isTrainee = member.isTrainee
    const baseSalary = isTrainee ? member.customSalary || 0 : member.rank?.baseSalary || 0
    const hourlyRate = baseSalary / BASE_MONTHLY_HOURS
    const salary = Math.round(hourlyRate * totalHours)

    // Service tax — trainees excluded (0 service)
    const service1 = isTrainee
      ? 0
      : teamHoursP1 > 0
        ? Math.round(totalServiceTaxP1 * (totalHoursP1 / teamHoursP1))
        : 0
    const service2 = isTrainee
      ? 0
      : teamHoursP2 > 0
        ? Math.round(totalServiceTaxP2 * (totalHoursP2 / teamHoursP2))
        : 0

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

    // kpiBonus will be set later by enrichWithKpiBonuses()
    const grandTotal = Math.round((salary + service1 + service2 + bonusesTotal) / 1000) * 1000

    rows.push({
      staffId: member.id,
      staffName: member.name,
      department: member.department,
      isTrainee,
      rankName: isTrainee ? 'Trainee' : member.rank?.name || '—',
      kpiMultiplier: member.rank?.kpiMultiplier ?? 1,
      baseSalaryMonthly: baseSalary,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      dailyHours,
      dailyTimeSlots,
      editedDates,
      totalHoursP1,
      totalHoursP2,
      totalHours,
      service1,
      service2,
      salary,
      grandTotal,
      bonusesTotal,
      bonusDetails,
      kpiBonus: 0
    })
  }

  // 6. Totals row (kpiBonuses will be updated after enrichWithKpiBonuses)
  const totals = {
    totalHoursP1: rows.reduce((s, r) => s + r.totalHoursP1, 0),
    totalHoursP2: rows.reduce((s, r) => s + r.totalHoursP2, 0),
    totalHours: rows.reduce((s, r) => s + r.totalHours, 0),
    service1: rows.reduce((s, r) => s + r.service1, 0),
    service2: rows.reduce((s, r) => s + r.service2, 0),
    salary: rows.reduce((s, r) => s + r.salary, 0),
    bonuses: rows.reduce((s, r) => s + r.bonusesTotal, 0),
    kpiBonuses: 0,
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
// KPI BONUS ENRICHMENT
// =====================================================

/**
 * Calculate KPI bonuses for kitchen and bar departments and enrich payroll rows.
 * Call after calculatePayrollForMonth() to add KPI bonus amounts.
 */
export async function enrichWithKpiBonuses(result: PayrollResult): Promise<DepartmentKpiResult[]> {
  const { year, month } = result.month
  const departments: KpiDepartment[] = ['kitchen', 'bar']
  const kpiResults: DepartmentKpiResult[] = []

  for (const dept of departments) {
    let kpiResult: DepartmentKpiResult | null = null
    try {
      kpiResult = await calculateDepartmentKpiBonus(dept, year, month, result.rows)
    } catch (err) {
      DebugUtils.error(MODULE, `KPI bonus calculation failed for ${dept}, skipping`, { error: err })
    }
    if (!kpiResult) continue
    kpiResults.push(kpiResult)

    // Apply bonuses to matching staff rows
    for (const item of kpiResult.staffDistribution) {
      const row = result.rows.find(r => r.staffId === item.staffId)
      if (row) {
        row.kpiBonus = item.kpiBonus
        row.kpiDetails = {
          department: kpiResult.department,
          departmentScore: kpiResult.departmentScore,
          poolType: kpiResult.poolType,
          poolAmount: kpiResult.poolAmount,
          departmentRevenue: kpiResult.departmentRevenue,
          unlockedAmount: kpiResult.unlockedAmount
        }
        // Recalculate grand total with KPI bonus
        row.grandTotal =
          Math.round(
            (row.salary + row.service1 + row.service2 + row.bonusesTotal + row.kpiBonus) / 1000
          ) * 1000
      }
    }
  }

  // Update totals
  result.totals.kpiBonuses = result.rows.reduce((s, r) => s + r.kpiBonus, 0)
  result.totals.grandTotal = result.rows.reduce((s, r) => s + r.grandTotal, 0)

  return kpiResults
}

// =====================================================
// PERSIST TO DB (optional, for history)
// =====================================================

export async function savePayrollToDb(
  result: PayrollResult,
  kpiResults?: DepartmentKpiResult[]
): Promise<PayrollPeriod> {
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
        total_kpi_bonuses: result.totals.kpiBonuses,
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
    hourly_rate: r.totalHours > 0 ? Math.round((r.salary / r.totalHours) * 100) / 100 : 0,
    base_salary_earned: r.salary,
    service_tax_share: r.service1 + r.service2,
    bonuses_total: r.bonusesTotal,
    kpi_bonus: r.kpiBonus,
    total_earned: r.grandTotal
  }))

  await supabase.from('payroll_items').insert(itemRows)

  // Save KPI bonus snapshots
  if (kpiResults?.length) {
    for (const kpi of kpiResults) {
      await saveKpiBonusSnapshot(periodId, kpi, pm.year, pm.month)
    }
  }

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
