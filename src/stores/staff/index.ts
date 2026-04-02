// src/stores/staff/index.ts - Re-exports

export { useStaffStore } from './staffStore'
export { staffService } from './staffService'
export { getPayrollMonth } from './payrollService'
export type { PayrollMonth, PayrollResult, PayrollStaffRow } from './payrollService'
export { getAllKpiBonusSchemes, saveKpiBonusScheme, loadKpiBonusSnapshots } from './kpiBonusService'
export type {
  StaffRank,
  StaffMember,
  WorkLog,
  StaffBonus,
  PayrollPeriod,
  PayrollItem,
  StaffDepartment,
  BonusType,
  PayrollStatus,
  TimeSlot,
  ShiftPreset,
  KpiBonusScheme,
  KpiBonusSnapshot,
  KpiBonusStaffItem,
  KpiDepartment,
  KpiPoolType,
  DepartmentKpiResult,
  KpiScoreBreakdown
} from './types'
export {
  DEPARTMENT_LABELS,
  BASE_MONTHLY_HOURS,
  calculateHoursFromSlots,
  mergeOverlappingSlots,
  formatHour
} from './types'
