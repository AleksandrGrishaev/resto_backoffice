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
