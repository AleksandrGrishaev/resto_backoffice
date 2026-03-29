// src/stores/staff/types.ts - Staff & Payroll Types

export type StaffDepartment = 'kitchen' | 'bar' | 'service' | 'management'
export type BonusType = 'one_time' | 'monthly'
export type PayrollStatus = 'draft' | 'calculated' | 'approved' | 'paid'

export interface TimeSlot {
  start: number // hour 0-23
  end: number // hour 1-24
}

export interface ShiftPreset {
  id: string
  name: string
  startHour: number
  endHour: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** Merge overlapping/adjacent time slots into non-overlapping ranges */
export function mergeOverlappingSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length <= 1) return [...slots]
  const sorted = [...slots].sort((a, b) => a.start - b.start)
  const merged: TimeSlot[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    if (sorted[i].start <= prev.end) {
      prev.end = Math.max(prev.end, sorted[i].end)
    } else {
      merged.push({ ...sorted[i] })
    }
  }
  return merged
}

export function calculateHoursFromSlots(slots: TimeSlot[]): number {
  return mergeOverlappingSlots(slots).reduce((sum, s) => sum + (s.end - s.start), 0)
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/** Часов в месяце при 6-дневной неделе по 8 часов */
export const BASE_MONTHLY_HOURS = 208

export interface StaffRank {
  id: string
  name: string
  baseSalary: number
  kpiMultiplier: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StaffMember {
  id: string
  name: string
  phone?: string
  department: StaffDepartment
  rankId?: string
  userId?: string
  isActive: boolean
  isTrainee: boolean
  customSalary?: number | null
  startDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
  // Joined
  rank?: StaffRank
}

export interface WorkLog {
  id: string
  staffId: string
  workDate: string
  hoursWorked: number
  timeSlots?: TimeSlot[] | null
  notes?: string
  recordedBy?: string
  editReason?: string
  editedBy?: string
  editedAt?: string
  createdAt: string
  updatedAt: string
}

export interface StaffBonus {
  id: string
  staffId: string
  type: BonusType
  amount: number
  reason?: string
  effectiveDate?: string
  endDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PayrollPeriod {
  id: string
  periodStart: string
  periodEnd: string
  status: PayrollStatus
  totalServiceTax: number
  totalBaseSalary: number
  totalBonuses: number
  totalKpiBonuses: number
  totalPayroll: number
  calculatedAt?: string
  approvedBy?: string
  notes?: string
  createdAt: string
  updatedAt: string
  // Joined
  items?: PayrollItem[]
}

export interface PayrollItem {
  id: string
  payrollPeriodId: string
  staffId: string
  hoursWorked: number
  hourlyRate: number
  baseSalaryEarned: number
  serviceTaxShare: number
  bonusesTotal: number
  kpiBonus: number
  totalEarned: number
  createdAt: string
  // Joined
  staffName?: string
  staffDepartment?: StaffDepartment
}

export const DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  kitchen: 'Kitchen',
  bar: 'Bar',
  service: 'Service',
  management: 'Management'
}

// KPI Bonus Pool types

export type KpiDepartment = 'kitchen' | 'bar'

export type KpiPoolType = 'fixed' | 'percent_revenue'

export interface KpiBonusScheme {
  id: string
  department: KpiDepartment
  name: string
  poolType: KpiPoolType
  poolAmount: number
  poolPercent: number
  isActive: boolean
  weightFoodCost: number
  weightTime: number
  weightProduction: number
  weightRitual: number
  minThreshold: number
  lossRateTarget: number
  thresholdFoodCost: number
  thresholdTime: number
  thresholdProduction: number
  thresholdRitual: number
  createdAt: string
  updatedAt: string
}

export interface KpiScoreBreakdown {
  foodCost: {
    score: number
    actualPercent: number
    targetPercent: number
    revenue: number
    spoilage: number
    shortage: number
  }
  time: { score: number; exceededRate: number; itemsCompleted: number }
  lossRate: {
    score: number
    lossPercent: number
    targetPercent: number
    spoilage: number
    shortage: number
  }
  ritual: { score: number; completedDays: number; totalDays: number }
}

export interface KpiBonusStaffItem {
  staffId: string
  staffName: string
  department: KpiDepartment
  hoursWorked: number
  hoursWeight: number
  kpiBonus: number
}

export interface DepartmentKpiResult {
  department: KpiDepartment
  scores: KpiScoreBreakdown
  weights: { foodCost: number; time: number; production: number; ritual: number }
  departmentScore: number
  poolType: KpiPoolType
  poolAmount: number
  departmentRevenue: number
  unlockedAmount: number
  staffDistribution: KpiBonusStaffItem[]
}

export interface KpiBonusSnapshot {
  id: string
  payrollPeriodId: string
  department: KpiDepartment
  periodMonth: number
  periodYear: number
  scoreFoodCost: number
  scoreTime: number
  scoreProduction: number
  scoreRitual: number
  weightFoodCost: number
  weightTime: number
  weightProduction: number
  weightRitual: number
  departmentScore: number
  poolType: KpiPoolType
  poolAmount: number
  departmentRevenue: number
  unlockedAmount: number
  rawMetrics: Record<string, unknown>
  createdAt: string
}
