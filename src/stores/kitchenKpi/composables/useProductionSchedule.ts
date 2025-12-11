// src/stores/kitchenKpi/composables/useProductionSchedule.ts
// Composable for Production Schedule operations (TODO-list style)

import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useKitchenKpiStore } from '../kitchenKpiStore'
import { useAuthStore } from '@/stores/auth'
import { DebugUtils, TimeUtils } from '@/utils'
import type { ProductionScheduleItem, ProductionScheduleSlot } from '@/stores/preparation/types'
import type { CreateScheduleItemData, CompleteScheduleTaskData, ScheduleFilters } from '../types'

const MODULE_NAME = 'useProductionSchedule'

export function useProductionSchedule() {
  const store = useKitchenKpiStore()
  const authStore = useAuthStore()

  // Get reactive refs from store
  const {
    scheduleItems,
    loading,
    error,
    scheduleFilters,
    scheduleSummary,
    filteredScheduleItems,
    scheduleBySlot
  } = storeToRefs(store)

  // Local state
  const selectedDate = ref(TimeUtils.getCurrentLocalDate())
  const selectedTask = ref<ProductionScheduleItem | null>(null)

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
   * Current user info for task completion
   */
  const currentUser = computed(() => ({
    id: authStore.user?.id || '',
    name: authStore.user?.name || authStore.user?.email || 'Unknown'
  }))

  /**
   * Check if selected date is today
   */
  const isToday = computed(() => {
    const today = TimeUtils.getCurrentLocalDate()
    return selectedDate.value === today
  })

  /**
   * Urgent tasks (out of stock or expiring)
   */
  const urgentTasks = computed(() =>
    scheduleBySlot.value.urgent.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
  )

  /**
   * Morning tasks
   */
  const morningTasks = computed(() => scheduleBySlot.value.morning)

  /**
   * Afternoon tasks
   */
  const afternoonTasks = computed(() => scheduleBySlot.value.afternoon)

  /**
   * Evening tasks
   */
  const eveningTasks = computed(() => scheduleBySlot.value.evening)

  /**
   * Pending tasks count
   */
  const pendingCount = computed(
    () => filteredScheduleItems.value.filter(t => t.status === 'pending').length
  )

  /**
   * Completed tasks count
   */
  const completedCount = computed(
    () => filteredScheduleItems.value.filter(t => t.status === 'completed').length
  )

  /**
   * Tasks grouped by status for display
   */
  const tasksByStatus = computed(() => ({
    pending: filteredScheduleItems.value.filter(t => t.status === 'pending'),
    inProgress: filteredScheduleItems.value.filter(t => t.status === 'in_progress'),
    completed: filteredScheduleItems.value.filter(t => t.status === 'completed'),
    cancelled: filteredScheduleItems.value.filter(t => t.status === 'cancelled')
  }))

  /**
   * Get current production slot based on time
   */
  const currentSlot = computed<ProductionScheduleSlot>(() => {
    const hour = new Date().getHours()

    if (hour < 6) return 'evening' // Late night = previous day's evening
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  })

  /**
   * Tasks for current slot (highlighted in UI)
   */
  const currentSlotTasks = computed(() => {
    const slot = currentSlot.value
    return filteredScheduleItems.value.filter(
      t => t.productionSlot === slot && t.status !== 'completed' && t.status !== 'cancelled'
    )
  })

  // ===============================================
  // Actions
  // ===============================================

  /**
   * Load schedule for selected date
   */
  async function loadSchedule(): Promise<void> {
    const filters: ScheduleFilters = {
      ...scheduleFilters.value,
      date: selectedDate.value,
      department: userDepartment.value || 'all'
    }

    await store.loadSchedule(filters)
  }

  /**
   * Change selected date and reload
   */
  async function setDate(date: string): Promise<void> {
    selectedDate.value = date
    store.setScheduleDate(date)
    await loadSchedule()
  }

  /**
   * Go to today's schedule
   */
  async function goToToday(): Promise<void> {
    const today = TimeUtils.getCurrentLocalDate()
    await setDate(today)
  }

  /**
   * Go to next day
   */
  async function goToNextDay(): Promise<void> {
    const current = new Date(selectedDate.value)
    current.setDate(current.getDate() + 1)
    await setDate(current.toISOString().split('T')[0])
  }

  /**
   * Go to previous day
   */
  async function goToPreviousDay(): Promise<void> {
    const current = new Date(selectedDate.value)
    current.setDate(current.getDate() - 1)
    await setDate(current.toISOString().split('T')[0])
  }

  /**
   * Set department filter
   */
  function setDepartmentFilter(department: 'kitchen' | 'bar' | 'all'): void {
    store.setScheduleFilters({ department })
  }

  /**
   * Set slot filter
   */
  function setSlotFilter(slot: ProductionScheduleSlot | 'all'): void {
    store.setScheduleFilters({ slot })
  }

  /**
   * Set status filter
   */
  function setStatusFilter(status: 'pending' | 'completed' | 'all'): void {
    store.setScheduleFilters({ status })
  }

  /**
   * Select a task for viewing/editing
   */
  function selectTask(task: ProductionScheduleItem | null): void {
    selectedTask.value = task
  }

  /**
   * Start working on a task (mark as in_progress)
   */
  async function startTask(taskId: string): Promise<void> {
    await store.updateTaskStatus(taskId, 'in_progress')
  }

  /**
   * Complete a task with actual quantity
   */
  async function completeTask(
    taskId: string,
    completedQuantity: number,
    batchId?: string
  ): Promise<ProductionScheduleItem> {
    if (!currentUser.value.id) {
      throw new Error('User not authenticated')
    }

    const data: CompleteScheduleTaskData = {
      taskId,
      completedQuantity,
      completedBy: currentUser.value.id,
      completedByName: currentUser.value.name,
      preparationBatchId: batchId
    }

    const completed = await store.completeTask(data)

    // Clear selection if this was the selected task
    if (selectedTask.value?.id === taskId) {
      selectedTask.value = null
    }

    return completed
  }

  /**
   * Cancel a task
   */
  async function cancelTask(taskId: string): Promise<void> {
    await store.updateTaskStatus(taskId, 'cancelled')

    // Clear selection if this was the selected task
    if (selectedTask.value?.id === taskId) {
      selectedTask.value = null
    }
  }

  /**
   * Create a new schedule item
   */
  async function createTask(data: CreateScheduleItemData): Promise<ProductionScheduleItem> {
    return store.createScheduleItem(data)
  }

  /**
   * Create multiple schedule items
   */
  async function createTasks(items: CreateScheduleItemData[]): Promise<ProductionScheduleItem[]> {
    return store.createScheduleItems(items)
  }

  /**
   * Delete a schedule item
   */
  async function deleteTask(taskId: string): Promise<void> {
    await store.deleteScheduleItem(taskId)

    // Clear selection if this was the selected task
    if (selectedTask.value?.id === taskId) {
      selectedTask.value = null
    }
  }

  /**
   * Refresh schedule data
   */
  async function refresh(): Promise<void> {
    await loadSchedule()
  }

  // ===============================================
  // Helpers
  // ===============================================

  /**
   * Get slot display info
   */
  function getSlotInfo(slot: ProductionScheduleSlot) {
    const slotMap = {
      urgent: { label: 'Urgent', color: 'error', icon: 'mdi-alert-circle', timeRange: 'ASAP' },
      morning: {
        label: 'Morning',
        color: 'info',
        icon: 'mdi-weather-sunny',
        timeRange: '6:00-12:00'
      },
      afternoon: {
        label: 'Afternoon',
        color: 'warning',
        icon: 'mdi-weather-sunset',
        timeRange: '12:00-18:00'
      },
      evening: {
        label: 'Evening',
        color: 'primary',
        icon: 'mdi-weather-night',
        timeRange: '18:00-22:00'
      }
    }

    return slotMap[slot] || slotMap.morning
  }

  /**
   * Get status display info
   */
  function getStatusInfo(status: string) {
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
      pending: { label: 'Pending', color: 'grey', icon: 'mdi-clock-outline' },
      in_progress: { label: 'In Progress', color: 'info', icon: 'mdi-progress-clock' },
      completed: { label: 'Completed', color: 'success', icon: 'mdi-check-circle' },
      cancelled: { label: 'Cancelled', color: 'error', icon: 'mdi-cancel' }
    }

    return statusMap[status] || statusMap.pending
  }

  /**
   * Check if a task is overdue (past its slot time and not completed)
   */
  function isTaskOverdue(task: ProductionScheduleItem): boolean {
    if (task.status === 'completed' || task.status === 'cancelled') return false
    if (!isToday.value) return false

    const hour = new Date().getHours()
    const slotEndHours: Record<string, number> = {
      urgent: 24, // Urgent is always overdue if not done
      morning: 12,
      afternoon: 18,
      evening: 22
    }

    const endHour = slotEndHours[task.productionSlot] || 24

    return hour >= endHour
  }

  // ===============================================
  // Return API
  // ===============================================

  return {
    // State
    scheduleItems,
    loading,
    error,
    scheduleFilters,
    selectedDate,
    selectedTask,

    // Computed
    userDepartment,
    currentUser,
    isToday,
    scheduleSummary,
    filteredScheduleItems,
    scheduleBySlot,
    urgentTasks,
    morningTasks,
    afternoonTasks,
    eveningTasks,
    pendingCount,
    completedCount,
    tasksByStatus,
    currentSlot,
    currentSlotTasks,

    // Actions
    loadSchedule,
    setDate,
    goToToday,
    goToNextDay,
    goToPreviousDay,
    setDepartmentFilter,
    setSlotFilter,
    setStatusFilter,
    selectTask,
    startTask,
    completeTask,
    cancelTask,
    createTask,
    createTasks,
    deleteTask,
    refresh,

    // Helpers
    getSlotInfo,
    getStatusInfo,
    isTaskOverdue
  }
}
