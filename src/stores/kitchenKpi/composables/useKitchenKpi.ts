// src/stores/kitchenKpi/composables/useKitchenKpi.ts
// Composable for Kitchen/Bar KPI operations

import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useKitchenKpiStore } from '../kitchenKpiStore'
import { useAuthStore } from '@/stores/auth'
import { DebugUtils, TimeUtils } from '@/utils'
import type { ProductionKpiDetail, WriteoffKpiDetail } from '@/stores/preparation/types'
import type { KpiFilters, KpiSummary } from '../types'

const MODULE_NAME = 'useKitchenKpi'

export function useKitchenKpi() {
  const store = useKitchenKpiStore()
  const authStore = useAuthStore()

  // Get reactive refs from store
  const { kpiEntries, currentUserKpi, loading, error, kpiFilters, kpiSummary, filteredKpiEntries } =
    storeToRefs(store)

  // Local state for date range selection
  const dateRange = ref<{ from: string; to: string }>({
    from: getDefaultDateFrom(),
    to: TimeUtils.getCurrentLocalISO().split('T')[0]
  })

  // ===============================================
  // Computed
  // ===============================================

  /**
   * Current user's department based on role
   */
  const userDepartment = computed<'kitchen' | 'bar' | null>(() => {
    const roles = authStore.userRoles || []
    if (roles.includes('kitchen')) return 'kitchen'
    if (roles.includes('bar')) return 'bar'
    return null
  })

  /**
   * Current user info for KPI recording
   */
  const currentUser = computed(() => ({
    id: authStore.user?.id || '',
    name: authStore.user?.name || authStore.user?.email || 'Unknown'
  }))

  /**
   * Today's KPI for current user
   */
  const todayKpi = computed(() => currentUserKpi.value)

  /**
   * Today's production count
   */
  const todayProductions = computed(() => todayKpi.value?.productionsCompleted || 0)

  /**
   * Today's production value
   */
  const todayProductionValue = computed(() => todayKpi.value?.productionValueTotal || 0)

  /**
   * Today's write-off count (KPI-affecting)
   */
  const todayWriteoffs = computed(() => todayKpi.value?.writeoffsKpiAffecting || 0)

  /**
   * Today's write-off value (KPI-affecting)
   */
  const todayWriteoffValue = computed(() => todayKpi.value?.writeoffValueKpiAffecting || 0)

  /**
   * KPI performance indicator (production vs writeoff ratio)
   */
  const performanceRatio = computed(() => {
    if (!todayKpi.value) return 100

    const production = todayKpi.value.productionValueTotal
    const writeoff = todayKpi.value.writeoffValueKpiAffecting

    if (production === 0) return writeoff > 0 ? 0 : 100

    // Higher is better (100 = no writeoffs)
    return Math.max(0, 100 - (writeoff / production) * 100)
  })

  /**
   * KPI entries grouped by staff
   */
  const kpiByStaff = computed(() => {
    const grouped: Record<string, typeof kpiEntries.value> = {}

    for (const entry of filteredKpiEntries.value) {
      if (!grouped[entry.staffId]) {
        grouped[entry.staffId] = []
      }
      grouped[entry.staffId].push(entry)
    }

    return grouped
  })

  /**
   * Staff leaderboard (sorted by production value)
   */
  const staffLeaderboard = computed(() => {
    const staffTotals: Array<{
      staffId: string
      staffName: string
      department: 'kitchen' | 'bar'
      totalProductions: number
      totalValue: number
      totalWriteoffs: number
      writeoffValue: number
      score: number
    }> = []

    for (const [staffId, entries] of Object.entries(kpiByStaff.value)) {
      const firstEntry = entries[0]
      const totalProductions = entries.reduce((sum, e) => sum + e.productionsCompleted, 0)
      const totalValue = entries.reduce((sum, e) => sum + e.productionValueTotal, 0)
      const totalWriteoffs = entries.reduce((sum, e) => sum + e.writeoffsKpiAffecting, 0)
      const writeoffValue = entries.reduce((sum, e) => sum + e.writeoffValueKpiAffecting, 0)

      // Score: production value minus writeoff value
      const score = totalValue - writeoffValue

      staffTotals.push({
        staffId,
        staffName: firstEntry.staffName,
        department: firstEntry.department,
        totalProductions,
        totalValue,
        totalWriteoffs,
        writeoffValue,
        score
      })
    }

    return staffTotals.sort((a, b) => b.score - a.score)
  })

  // ===============================================
  // Actions
  // ===============================================

  /**
   * Initialize KPI data for current user
   */
  async function initializeUserKpi(): Promise<void> {
    if (!currentUser.value.id || !userDepartment.value) {
      DebugUtils.warn(MODULE_NAME, 'Cannot initialize KPI: no user or department')
      return
    }

    await store.loadCurrentUserKpi(currentUser.value.id, userDepartment.value)
  }

  /**
   * Load KPI entries with current filters
   */
  async function loadKpi(): Promise<void> {
    const filters: KpiFilters = {
      ...kpiFilters.value,
      dateFrom: dateRange.value.from,
      dateTo: dateRange.value.to
    }

    await store.loadKpiEntries(filters)
  }

  /**
   * Set department filter
   */
  function setDepartmentFilter(department: 'kitchen' | 'bar' | 'all'): void {
    store.setKpiFilters({ department })
  }

  /**
   * Set staff filter
   */
  function setStaffFilter(staffId?: string): void {
    store.setKpiFilters({ staffId })
  }

  /**
   * Set date range filter
   */
  function setDateRange(from: string, to: string): void {
    dateRange.value = { from, to }
    store.setKpiFilters({ dateFrom: from, dateTo: to })
  }

  /**
   * Record production completion
   */
  async function recordProduction(detail: ProductionKpiDetail): Promise<string> {
    if (!currentUser.value.id || !userDepartment.value) {
      throw new Error('User not authenticated or department not set')
    }

    return store.recordProduction(
      currentUser.value.id,
      currentUser.value.name,
      userDepartment.value,
      detail
    )
  }

  /**
   * Record write-off
   */
  async function recordWriteoff(detail: WriteoffKpiDetail): Promise<string> {
    if (!currentUser.value.id || !userDepartment.value) {
      throw new Error('User not authenticated or department not set')
    }

    return store.recordWriteoff(
      currentUser.value.id,
      currentUser.value.name,
      userDepartment.value,
      detail
    )
  }

  /**
   * Refresh all KPI data
   */
  async function refresh(): Promise<void> {
    await Promise.all([initializeUserKpi(), loadKpi()])
  }

  // ===============================================
  // Helpers
  // ===============================================

  function getDefaultDateFrom(): string {
    // Default to 7 days ago
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString().split('T')[0]
  }

  // ===============================================
  // Return API
  // ===============================================

  return {
    // State
    kpiEntries,
    currentUserKpi,
    loading,
    error,
    kpiFilters,
    dateRange,

    // Computed
    userDepartment,
    currentUser,
    todayKpi,
    todayProductions,
    todayProductionValue,
    todayWriteoffs,
    todayWriteoffValue,
    performanceRatio,
    kpiSummary,
    kpiByStaff,
    staffLeaderboard,
    filteredKpiEntries,

    // Actions
    initializeUserKpi,
    loadKpi,
    setDepartmentFilter,
    setStaffFilter,
    setDateRange,
    recordProduction,
    recordWriteoff,
    refresh
  }
}
