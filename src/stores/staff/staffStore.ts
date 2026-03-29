// src/stores/staff/staffStore.ts - Pinia store for Staff & Payroll

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils } from '@/utils'
import type {
  StaffRank,
  StaffMember,
  WorkLog,
  StaffBonus,
  PayrollPeriod,
  ShiftPreset,
  TimeSlot
} from './types'
import { staffService } from './staffService'
import {
  calculatePayrollForMonth,
  enrichWithKpiBonuses,
  savePayrollToDb,
  updatePayrollStatus,
  getPayrollMonth
} from './payrollService'
import type { PayrollResult } from './payrollService'
import type { DepartmentKpiResult } from './types'

const MODULE = 'StaffStore'

export const useStaffStore = defineStore('staff', () => {
  // =====================================================
  // STATE
  // =====================================================
  const ranks = ref<StaffRank[]>([])
  const members = ref<StaffMember[]>([])
  const bonuses = ref<StaffBonus[]>([])
  const shiftPresets = ref<ShiftPreset[]>([])
  const payrollPeriods = ref<PayrollPeriod[]>([])
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // =====================================================
  // GETTERS
  // =====================================================
  const activeMembers = computed(() => members.value.filter(m => m.isActive))
  const activeRanks = computed(() => ranks.value.filter(r => r.isActive))
  const activeShiftPresets = computed(() => shiftPresets.value.filter(p => p.isActive))

  // =====================================================
  // ACTIONS
  // =====================================================

  async function initialize() {
    if (initialized.value) return
    loading.value = true
    error.value = null

    try {
      const [ranksData, membersData, bonusesData, presetsData] = await Promise.all([
        staffService.fetchRanks(),
        staffService.fetchMembers(),
        staffService.fetchBonuses(),
        staffService.fetchShiftPresets()
      ])
      ranks.value = ranksData
      members.value = membersData
      bonuses.value = bonusesData
      shiftPresets.value = presetsData
      initialized.value = true
      DebugUtils.info(MODULE, '✅ Initialized', {
        ranks: ranksData.length,
        members: membersData.length,
        bonuses: bonusesData.length,
        shiftPresets: presetsData.length
      })
    } catch (e: any) {
      error.value = e.message
      DebugUtils.error(MODULE, 'Init failed', e)
    } finally {
      loading.value = false
    }
  }

  // --- Ranks ---

  async function addRank(rank: Partial<StaffRank>) {
    const created = await staffService.createRank(rank)
    ranks.value.push(created)
    return created
  }

  async function editRank(id: string, data: Partial<StaffRank>) {
    const updated = await staffService.updateRank(id, data)
    const idx = ranks.value.findIndex(r => r.id === id)
    if (idx >= 0) ranks.value[idx] = updated
    return updated
  }

  async function removeRank(id: string) {
    await staffService.deleteRank(id)
    ranks.value = ranks.value.filter(r => r.id !== id)
  }

  // --- Members ---

  async function addMember(member: Partial<StaffMember>) {
    const created = await staffService.createMember(member)
    members.value.push(created)
    return created
  }

  async function editMember(id: string, data: Partial<StaffMember>) {
    const updated = await staffService.updateMember(id, data)
    const idx = members.value.findIndex(m => m.id === id)
    if (idx >= 0) members.value[idx] = updated
    return updated
  }

  async function removeMember(id: string) {
    await staffService.deleteMember(id)
    members.value = members.value.filter(m => m.id !== id)
  }

  // --- Bonuses ---

  async function addBonus(bonus: Partial<StaffBonus>) {
    const created = await staffService.createBonus(bonus)
    bonuses.value.push(created)
    return created
  }

  async function editBonus(id: string, data: Partial<StaffBonus>) {
    const updated = await staffService.updateBonus(id, data)
    const idx = bonuses.value.findIndex(b => b.id === id)
    if (idx >= 0) bonuses.value[idx] = updated
    return updated
  }

  async function removeBonus(id: string) {
    await staffService.deleteBonus(id)
    bonuses.value = bonuses.value.filter(b => b.id !== id)
  }

  // --- Shift Presets ---

  async function addShiftPreset(preset: Partial<ShiftPreset>) {
    const created = await staffService.createShiftPreset(preset)
    shiftPresets.value.push(created)
    return created
  }

  async function editShiftPreset(id: string, data: Partial<ShiftPreset>) {
    const updated = await staffService.updateShiftPreset(id, data)
    const idx = shiftPresets.value.findIndex(p => p.id === id)
    if (idx >= 0) shiftPresets.value[idx] = updated
    return updated
  }

  async function removeShiftPreset(id: string) {
    await staffService.deleteShiftPreset(id)
    shiftPresets.value = shiftPresets.value.filter(p => p.id !== id)
  }

  // --- Work Logs ---

  async function fetchWorkLogs(dateFrom: string, dateTo: string): Promise<WorkLog[]> {
    return staffService.fetchWorkLogs(dateFrom, dateTo)
  }

  async function saveWorkLogs(
    logs: Array<{
      staffId: string
      workDate: string
      hoursWorked: number
      timeSlots?: TimeSlot[] | null
      recordedBy?: string
    }>
  ): Promise<WorkLog[]> {
    return staffService.upsertWorkLogsBatch(logs)
  }

  // --- Payroll ---

  async function loadPayrollPeriods() {
    payrollPeriods.value = await staffService.fetchPayrollPeriods()
  }

  /** Last KPI results from runPayrollCalculation, for display in PayrollScreen */
  const lastKpiResults = ref<DepartmentKpiResult[]>([])

  async function runPayrollCalculation(year: number, month: number): Promise<PayrollResult> {
    loading.value = true
    try {
      const result = await calculatePayrollForMonth(year, month, members.value, bonuses.value)
      // Enrich with KPI bonuses (kitchen & bar)
      const kpiResults = await enrichWithKpiBonuses(result)
      lastKpiResults.value = kpiResults
      return result
    } finally {
      loading.value = false
    }
  }

  async function savePayroll(result: PayrollResult) {
    const period = await savePayrollToDb(result, lastKpiResults.value)
    const idx = payrollPeriods.value.findIndex(p => p.id === period.id)
    if (idx >= 0) {
      payrollPeriods.value[idx] = period
    } else {
      payrollPeriods.value.unshift(period)
    }
    return period
  }

  async function approvePayroll(periodId: string, approvedBy?: string) {
    const period = await updatePayrollStatus(periodId, 'approved', approvedBy)
    const idx = payrollPeriods.value.findIndex(p => p.id === periodId)
    if (idx >= 0) payrollPeriods.value[idx] = period
    return period
  }

  async function markPayrollPaid(periodId: string) {
    const period = await updatePayrollStatus(periodId, 'paid')
    const idx = payrollPeriods.value.findIndex(p => p.id === periodId)
    if (idx >= 0) payrollPeriods.value[idx] = period
    return period
  }

  return {
    // state
    ranks,
    members,
    bonuses,
    shiftPresets,
    payrollPeriods,
    lastKpiResults,
    initialized,
    loading,
    error,
    // getters
    activeMembers,
    activeRanks,
    activeShiftPresets,
    // actions
    initialize,
    addRank,
    editRank,
    removeRank,
    addMember,
    editMember,
    removeMember,
    addBonus,
    editBonus,
    removeBonus,
    addShiftPreset,
    editShiftPreset,
    removeShiftPreset,
    fetchWorkLogs,
    saveWorkLogs,
    loadPayrollPeriods,
    runPayrollCalculation,
    savePayroll,
    approvePayroll,
    markPayrollPaid,
    getPayrollMonth
  }
})
