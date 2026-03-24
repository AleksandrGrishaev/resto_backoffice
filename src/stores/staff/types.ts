// src/stores/staff/types.ts - Staff & Payroll Types

export type StaffDepartment = 'kitchen' | 'bar' | 'service' | 'management'
export type BonusType = 'one_time' | 'monthly'
export type PayrollStatus = 'draft' | 'calculated' | 'approved' | 'paid'

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
