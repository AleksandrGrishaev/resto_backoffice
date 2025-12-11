// src/stores/kitchenKpi/kitchenKpiStore.ts
// Kitchen/Bar KPI Store - Pinia State Management

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DebugUtils, TimeUtils } from '@/utils'
import { kitchenKpiService } from './kitchenKpiService'
import { generateRecommendations as generateRecs } from './services/recommendationsService'
import { useSyncService } from '@/core/sync/SyncService'
import { PreparationBatchSyncAdapter } from '@/core/sync/adapters/PreparationBatchSyncAdapter'
import { PreparationWriteOffSyncAdapter } from '@/core/sync/adapters/PreparationWriteOffSyncAdapter'
import { ProductWriteOffSyncAdapter } from '@/core/sync/adapters/ProductWriteOffSyncAdapter'
import { ScheduleCompletionSyncAdapter } from '@/core/sync/adapters/ScheduleCompletionSyncAdapter'
import { usePreparationStore } from '@/stores/preparation'
import { useRecipesStore } from '@/stores/recipes'
import type {
  KitchenKpiEntry,
  ProductionScheduleItem,
  ProductionRecommendation,
  ProductionKpiDetail,
  WriteoffKpiDetail
} from '@/stores/preparation/types'
import type {
  KitchenKpiState,
  KpiFilters,
  ScheduleFilters,
  KpiSummary,
  ScheduleSummary,
  CreateScheduleItemData,
  CompleteScheduleTaskData,
  ScheduleCompletionKpiDetail
} from './types'

const MODULE_NAME = 'KitchenKpiStore'

export const useKitchenKpiStore = defineStore('kitchenKpi', () => {
  // ===============================================
  // State
  // ===============================================

  // KPI data
  const kpiEntries = ref<KitchenKpiEntry[]>([])
  const currentUserKpi = ref<KitchenKpiEntry | null>(null)

  // Schedule data
  const scheduleItems = ref<ProductionScheduleItem[]>([])
  const recommendations = ref<ProductionRecommendation[]>([])

  // Loading states
  const loading = ref({
    kpi: false,
    schedule: false,
    recommendations: false,
    submitting: false
  })

  // Error state
  const error = ref<string | null>(null)

  // Filters
  const kpiFilters = ref<KpiFilters>({
    department: 'all'
  })

  const scheduleFilters = ref<ScheduleFilters>({
    department: 'all',
    slot: 'all',
    status: 'all',
    date: TimeUtils.getCurrentLocalISO().split('T')[0]
  })

  // Store status
  const initialized = ref(false)
  const lastFetchedAt = ref<string | null>(null)

  // ===============================================
  // Computed - KPI Summary
  // ===============================================

  const kpiSummary = computed<KpiSummary | null>(() => {
    if (kpiEntries.value.length === 0) return null

    const entries = kpiEntries.value

    const totalProductions = entries.reduce((sum, e) => sum + e.productionsCompleted, 0)
    const totalProductionValue = entries.reduce((sum, e) => sum + e.productionValueTotal, 0)
    const totalWriteoffs = entries.reduce(
      (sum, e) => sum + e.writeoffsKpiAffecting + e.writeoffsNonKpi,
      0
    )
    const totalWriteoffValue = entries.reduce(
      (sum, e) => sum + e.writeoffValueKpiAffecting + e.writeoffValueNonKpi,
      0
    )

    const writeoffRate =
      totalProductionValue > 0 ? (totalWriteoffValue / totalProductionValue) * 100 : 0

    const totalOnTime = entries.reduce((sum, e) => sum + e.onTimeCompletions, 0)
    const totalLate = entries.reduce((sum, e) => sum + e.lateCompletions, 0)
    const onTimeRate =
      totalOnTime + totalLate > 0 ? (totalOnTime / (totalOnTime + totalLate)) * 100 : 100

    const uniqueDays = new Set(entries.map(e => e.periodDate)).size
    const avgProductionsPerDay = uniqueDays > 0 ? totalProductions / uniqueDays : 0

    return {
      totalProductions,
      totalProductionValue,
      totalWriteoffs,
      totalWriteoffValue,
      writeoffRate,
      onTimeRate,
      avgProductionsPerDay
    }
  })

  // ===============================================
  // Computed - Schedule Summary
  // ===============================================

  const scheduleSummary = computed<ScheduleSummary | null>(() => {
    if (scheduleItems.value.length === 0) return null

    const items = scheduleItems.value

    const totalTasks = items.length
    const pendingTasks = items.filter(
      i => i.status === 'pending' || i.status === 'in_progress'
    ).length
    const completedTasks = items.filter(i => i.status === 'completed').length
    const urgentTasks = items.filter(
      i => i.productionSlot === 'urgent' && i.status !== 'completed'
    ).length

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    return {
      totalTasks,
      pendingTasks,
      completedTasks,
      urgentTasks,
      completionRate
    }
  })

  // ===============================================
  // Computed - Filtered Data
  // ===============================================

  const filteredKpiEntries = computed(() => {
    let entries = kpiEntries.value

    if (kpiFilters.value.department && kpiFilters.value.department !== 'all') {
      entries = entries.filter(e => e.department === kpiFilters.value.department)
    }

    if (kpiFilters.value.staffId) {
      entries = entries.filter(e => e.staffId === kpiFilters.value.staffId)
    }

    return entries
  })

  const filteredScheduleItems = computed(() => {
    let items = scheduleItems.value

    if (scheduleFilters.value.department && scheduleFilters.value.department !== 'all') {
      items = items.filter(i => i.department === scheduleFilters.value.department)
    }

    if (scheduleFilters.value.slot && scheduleFilters.value.slot !== 'all') {
      items = items.filter(i => i.productionSlot === scheduleFilters.value.slot)
    }

    if (scheduleFilters.value.status && scheduleFilters.value.status !== 'all') {
      const statusFilter = scheduleFilters.value.status
      if (statusFilter === 'pending') {
        items = items.filter(i => i.status === 'pending' || i.status === 'in_progress')
      } else {
        items = items.filter(i => i.status === statusFilter)
      }
    }

    return items
  })

  // Group schedule items by slot
  const scheduleBySlot = computed(() => {
    const grouped: Record<string, ProductionScheduleItem[]> = {
      urgent: [],
      morning: [],
      afternoon: [],
      evening: []
    }

    for (const item of filteredScheduleItems.value) {
      const slot = item.productionSlot
      if (grouped[slot]) {
        grouped[slot].push(item)
      }
    }

    return grouped
  })

  // ===============================================
  // Actions - Initialization
  // ===============================================

  async function initialize(): Promise<{ success: boolean; error?: string }> {
    if (initialized.value) {
      DebugUtils.debug(MODULE_NAME, 'Already initialized')
      return { success: true }
    }

    try {
      DebugUtils.info(MODULE_NAME, 'Initializing Kitchen KPI store...')

      // Register sync adapters for offline support
      DebugUtils.info(MODULE_NAME, 'Registering sync adapters...')
      const syncService = useSyncService()
      syncService.registerAdapter(new PreparationBatchSyncAdapter())
      syncService.registerAdapter(new PreparationWriteOffSyncAdapter())
      syncService.registerAdapter(new ProductWriteOffSyncAdapter())
      syncService.registerAdapter(new ScheduleCompletionSyncAdapter())
      DebugUtils.info(MODULE_NAME, '4 sync adapters registered')

      // Load today's schedule and recent KPI entries in parallel
      await Promise.all([loadSchedule(), loadKpiEntries()])

      initialized.value = true
      lastFetchedAt.value = TimeUtils.getCurrentLocalISO()

      DebugUtils.info(MODULE_NAME, 'Kitchen KPI store initialized', {
        kpiEntries: kpiEntries.value.length,
        scheduleItems: scheduleItems.value.length
      })

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = errorMessage

      DebugUtils.error(MODULE_NAME, 'Failed to initialize', { error: errorMessage })

      return { success: false, error: errorMessage }
    }
  }

  // ===============================================
  // Actions - KPI Operations
  // ===============================================

  async function loadKpiEntries(filters?: KpiFilters): Promise<void> {
    try {
      loading.value.kpi = true
      error.value = null

      const appliedFilters = filters || kpiFilters.value

      kpiEntries.value = await kitchenKpiService.getKpiEntries(appliedFilters)

      DebugUtils.info(MODULE_NAME, 'KPI entries loaded', { count: kpiEntries.value.length })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load KPI entries'
      throw err
    } finally {
      loading.value.kpi = false
    }
  }

  async function loadCurrentUserKpi(staffId: string, department: 'kitchen' | 'bar'): Promise<void> {
    try {
      const today = TimeUtils.getCurrentLocalISO().split('T')[0]
      currentUserKpi.value = await kitchenKpiService.getKpiEntry(staffId, today, department)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to load current user KPI', { err })
    }
  }

  async function recordProduction(
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar',
    detail: ProductionKpiDetail
  ): Promise<string> {
    try {
      loading.value.submitting = true

      const id = await kitchenKpiService.recordProduction(staffId, staffName, department, detail)

      // Refresh current user KPI
      await loadCurrentUserKpi(staffId, department)

      return id
    } finally {
      loading.value.submitting = false
    }
  }

  async function recordWriteoff(
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar',
    detail: WriteoffKpiDetail
  ): Promise<string> {
    try {
      loading.value.submitting = true

      const id = await kitchenKpiService.recordWriteoff(staffId, staffName, department, detail)

      // Refresh current user KPI
      await loadCurrentUserKpi(staffId, department)

      return id
    } finally {
      loading.value.submitting = false
    }
  }

  async function recordScheduleCompletion(
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar',
    detail: ScheduleCompletionKpiDetail
  ): Promise<string> {
    try {
      loading.value.submitting = true

      const id = await kitchenKpiService.recordScheduleCompletion(
        staffId,
        staffName,
        department,
        detail
      )

      // Refresh current user KPI
      await loadCurrentUserKpi(staffId, department)

      return id
    } finally {
      loading.value.submitting = false
    }
  }

  // ===============================================
  // Actions - Schedule Operations
  // ===============================================

  async function loadSchedule(filters?: ScheduleFilters): Promise<void> {
    try {
      loading.value.schedule = true
      error.value = null

      const appliedFilters = filters || scheduleFilters.value

      scheduleItems.value = await kitchenKpiService.getSchedule(appliedFilters)

      DebugUtils.info(MODULE_NAME, 'Schedule loaded', {
        count: scheduleItems.value.length,
        date: appliedFilters.date
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load schedule'
      throw err
    } finally {
      loading.value.schedule = false
    }
  }

  async function createScheduleItem(data: CreateScheduleItemData): Promise<ProductionScheduleItem> {
    try {
      loading.value.submitting = true

      const item = await kitchenKpiService.createScheduleItem(data)

      // Add to local state
      scheduleItems.value.push(item)

      return item
    } finally {
      loading.value.submitting = false
    }
  }

  async function createScheduleItems(
    items: CreateScheduleItemData[]
  ): Promise<ProductionScheduleItem[]> {
    try {
      loading.value.submitting = true

      const created = await kitchenKpiService.createScheduleItems(items)

      // Add to local state (avoiding duplicates)
      const existingIds = new Set(scheduleItems.value.map(i => i.id))
      for (const item of created) {
        if (!existingIds.has(item.id)) {
          scheduleItems.value.push(item)
        }
      }

      return created
    } finally {
      loading.value.submitting = false
    }
  }

  async function completeTask(data: CompleteScheduleTaskData): Promise<ProductionScheduleItem> {
    try {
      loading.value.submitting = true

      const completed = await kitchenKpiService.completeTask(data)

      // Update local state
      const index = scheduleItems.value.findIndex(i => i.id === data.taskId)
      if (index !== -1) {
        scheduleItems.value[index] = completed
      }

      return completed
    } finally {
      loading.value.submitting = false
    }
  }

  async function updateTaskStatus(
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<void> {
    try {
      const updated = await kitchenKpiService.updateScheduleStatus(taskId, status)

      // Update local state
      const index = scheduleItems.value.findIndex(i => i.id === taskId)
      if (index !== -1) {
        scheduleItems.value[index] = updated
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to update task status', { err })
      throw err
    }
  }

  async function deleteScheduleItem(taskId: string): Promise<void> {
    try {
      await kitchenKpiService.deleteScheduleItem(taskId)

      // Remove from local state
      const index = scheduleItems.value.findIndex(i => i.id === taskId)
      if (index !== -1) {
        scheduleItems.value.splice(index, 1)
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete schedule item', { err })
      throw err
    }
  }

  // ===============================================
  // Actions - Recommendations
  // ===============================================

  /**
   * Generate production recommendations based on current stock and consumption
   */
  async function loadRecommendations(department: 'kitchen' | 'bar'): Promise<void> {
    try {
      loading.value.recommendations = true
      error.value = null

      DebugUtils.info(MODULE_NAME, 'Generating recommendations...', { department })

      // Get required stores
      const preparationStore = usePreparationStore()
      const recipesStore = useRecipesStore()

      // Ensure we have fresh data
      await Promise.all([
        preparationStore.fetchBalances(department),
        recipesStore.initialized || recipesStore.initialize()
      ])

      // Generate recommendations using service
      const balances = preparationStore.state.balances || []
      const preparations = recipesStore.preparations || []

      recommendations.value = generateRecs(department, balances, preparations)

      DebugUtils.info(MODULE_NAME, 'Recommendations generated', {
        count: recommendations.value.length,
        urgent: recommendations.value.filter(r => r.urgency === 'urgent').length,
        morning: recommendations.value.filter(r => r.urgency === 'morning').length,
        afternoon: recommendations.value.filter(r => r.urgency === 'afternoon').length,
        evening: recommendations.value.filter(r => r.urgency === 'evening').length
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate recommendations'
      error.value = errorMessage
      DebugUtils.error(MODULE_NAME, 'Failed to generate recommendations', { error: errorMessage })
      throw err
    } finally {
      loading.value.recommendations = false
    }
  }

  /**
   * Clear recommendations
   */
  function clearRecommendations(): void {
    recommendations.value = []
  }

  // ===============================================
  // Actions - Filter Management
  // ===============================================

  function setKpiFilters(filters: Partial<KpiFilters>): void {
    kpiFilters.value = { ...kpiFilters.value, ...filters }
  }

  function setScheduleFilters(filters: Partial<ScheduleFilters>): void {
    scheduleFilters.value = { ...scheduleFilters.value, ...filters }
  }

  function setScheduleDate(date: string): void {
    scheduleFilters.value.date = date
  }

  // ===============================================
  // Actions - Utility
  // ===============================================

  function clearError(): void {
    error.value = null
  }

  function reset(): void {
    kpiEntries.value = []
    currentUserKpi.value = null
    scheduleItems.value = []
    recommendations.value = []
    error.value = null
    initialized.value = false
    lastFetchedAt.value = null
  }

  // ===============================================
  // Return Store API
  // ===============================================

  return {
    // State
    kpiEntries,
    currentUserKpi,
    scheduleItems,
    recommendations,
    loading,
    error,
    kpiFilters,
    scheduleFilters,
    initialized,
    lastFetchedAt,

    // Computed
    kpiSummary,
    scheduleSummary,
    filteredKpiEntries,
    filteredScheduleItems,
    scheduleBySlot,

    // Actions - Initialization
    initialize,

    // Actions - KPI
    loadKpiEntries,
    loadCurrentUserKpi,
    recordProduction,
    recordWriteoff,
    recordScheduleCompletion,

    // Actions - Schedule
    loadSchedule,
    createScheduleItem,
    createScheduleItems,
    completeTask,
    updateTaskStatus,
    deleteScheduleItem,

    // Actions - Recommendations
    loadRecommendations,
    clearRecommendations,

    // Actions - Filters
    setKpiFilters,
    setScheduleFilters,
    setScheduleDate,

    // Actions - Utility
    clearError,
    reset
  }
})
