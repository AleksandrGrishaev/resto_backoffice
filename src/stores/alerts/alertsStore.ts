// src/stores/alerts/alertsStore.ts
// Operations Alerts Pinia Store

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { DebugUtils } from '@/utils'
import type {
  OperationAlert,
  CreateAlertPayload,
  AlertFilters,
  AlertCounts,
  CategoryAlertCounts,
  AlertCategory
} from './types'
import * as alertsService from './services/alertsService'

const MODULE_NAME = 'AlertsStore'

export const useAlertsStore = defineStore('alerts', () => {
  // =============================================
  // STATE
  // =============================================

  const alerts = ref<OperationAlert[]>([])
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)
  const lastFetch = ref<string | null>(null)

  // Realtime subscription cleanup function
  let unsubscribe: (() => void) | null = null

  // =============================================
  // COMPUTED
  // =============================================

  // Get new (unread) alerts
  const newAlerts = computed(() => alerts.value.filter(a => a.status === 'new'))

  // Has any new alerts
  const hasNewAlerts = computed(() => newAlerts.value.length > 0)

  // Alert counts by category
  const alertCounts = computed<AlertCounts>(() => {
    const emptyCounts: CategoryAlertCounts = { critical: 0, warning: 0, info: 0, total: 0 }
    const counts: AlertCounts = {
      shift: { ...emptyCounts },
      account: { ...emptyCounts },
      product: { ...emptyCounts },
      supplier: { ...emptyCounts },
      total: 0,
      newCount: 0
    }

    // Only count new and viewed alerts (not acknowledged/resolved)
    const activeAlerts = alerts.value.filter(a => a.status === 'new' || a.status === 'viewed')

    for (const alert of activeAlerts) {
      const category = alert.category as AlertCategory
      const severity = alert.severity

      if (counts[category]) {
        counts[category][severity]++
        counts[category].total++
        counts.total++

        if (alert.status === 'new') {
          counts.newCount++
        }
      }
    }

    return counts
  })

  // Get active categories (those with alerts)
  const activeCategories = computed(() => {
    const categories: AlertCategory[] = []
    if (alertCounts.value.shift.total > 0) categories.push('shift')
    if (alertCounts.value.account.total > 0) categories.push('account')
    if (alertCounts.value.product.total > 0) categories.push('product')
    if (alertCounts.value.supplier.total > 0) categories.push('supplier')
    return categories
  })

  // Alerts grouped by category
  const alertsByCategory = computed(() => {
    const grouped: Record<AlertCategory, OperationAlert[]> = {
      shift: [],
      account: [],
      product: [],
      supplier: []
    }

    for (const alert of alerts.value) {
      if (grouped[alert.category]) {
        grouped[alert.category].push(alert)
      }
    }

    return grouped
  })

  // =============================================
  // ACTIONS
  // =============================================

  /**
   * Initialize the store
   */
  async function initialize(): Promise<void> {
    if (initialized.value) {
      DebugUtils.debug(MODULE_NAME, 'Already initialized, skipping')
      return
    }

    DebugUtils.info(MODULE_NAME, 'Initializing alerts store')
    loading.value = true
    error.value = null

    try {
      // Fetch initial alerts (new and viewed only for performance)
      await fetchAlerts({ status: 'new' })
      await fetchAlerts({ status: 'viewed' })

      // Subscribe to realtime updates
      subscribeToAlerts()

      initialized.value = true
      DebugUtils.info(MODULE_NAME, 'Alerts store initialized', { count: alerts.value.length })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize alerts'
      DebugUtils.error(MODULE_NAME, 'Failed to initialize', { error: err })
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch alerts with optional filters
   */
  async function fetchAlerts(filters?: AlertFilters): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const fetchedAlerts = await alertsService.fetchAlerts(filters)

      // If no filters, replace all alerts
      // If filtering, merge with existing (avoiding duplicates)
      if (!filters) {
        alerts.value = fetchedAlerts
      } else {
        // Merge: update existing, add new
        const existingIds = new Set(alerts.value.map(a => a.id))
        for (const alert of fetchedAlerts) {
          if (existingIds.has(alert.id)) {
            // Update existing
            const index = alerts.value.findIndex(a => a.id === alert.id)
            if (index !== -1) {
              alerts.value[index] = alert
            }
          } else {
            // Add new
            alerts.value.push(alert)
          }
        }
      }

      lastFetch.value = new Date().toISOString()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch alerts'
      DebugUtils.error(MODULE_NAME, 'Failed to fetch alerts', { error: err })
    } finally {
      loading.value = false
    }
  }

  /**
   * Refresh all active alerts
   */
  async function refresh(): Promise<void> {
    DebugUtils.debug(MODULE_NAME, 'Refreshing alerts')
    alerts.value = []
    await fetchAlerts({ status: 'new' })
    await fetchAlerts({ status: 'viewed' })
  }

  /**
   * Fetch all alerts including acknowledged/resolved (for AlertsView)
   */
  async function fetchAllAlerts(filters?: AlertFilters): Promise<OperationAlert[]> {
    const allAlerts = await alertsService.fetchAlerts(filters)
    return allAlerts
  }

  /**
   * Create a new alert
   */
  async function createAlert(payload: CreateAlertPayload): Promise<OperationAlert> {
    DebugUtils.info(MODULE_NAME, 'Creating alert', { type: payload.type })

    try {
      const alert = await alertsService.createAlert(payload)

      // Add to local state
      alerts.value.unshift(alert)

      DebugUtils.info(MODULE_NAME, 'Alert created', { id: alert.id })
      return alert
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to create alert', { error: err })
      throw err
    }
  }

  /**
   * Mark alerts as viewed
   */
  async function markAsViewed(alertIds: string[]): Promise<void> {
    if (alertIds.length === 0) return

    try {
      await alertsService.markAsViewed(alertIds)

      // Update local state
      for (const id of alertIds) {
        const alert = alerts.value.find(a => a.id === id)
        if (alert && alert.status === 'new') {
          alert.status = 'viewed'
        }
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to mark as viewed', { error: err })
    }
  }

  /**
   * Mark all visible alerts as viewed
   */
  async function markAllAsViewed(): Promise<void> {
    const newIds = newAlerts.value.map(a => a.id)
    await markAsViewed(newIds)
  }

  /**
   * Acknowledge an alert (manager action)
   */
  async function acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'Acknowledging alert', { alertId })

    try {
      const updated = await alertsService.acknowledgeAlert(alertId, acknowledgedBy)

      // Update local state
      const index = alerts.value.findIndex(a => a.id === alertId)
      if (index !== -1) {
        alerts.value[index] = updated
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to acknowledge alert', { error: err })
      throw err
    }
  }

  /**
   * Resolve an alert (manager action)
   */
  async function resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<void> {
    DebugUtils.info(MODULE_NAME, 'Resolving alert', { alertId })

    try {
      const updated = await alertsService.resolveAlert(alertId, resolvedBy, resolutionNotes)

      // Update local state
      const index = alerts.value.findIndex(a => a.id === alertId)
      if (index !== -1) {
        alerts.value[index] = updated
      }
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to resolve alert', { error: err })
      throw err
    }
  }

  /**
   * Subscribe to realtime updates
   */
  function subscribeToAlerts(): void {
    if (unsubscribe) {
      unsubscribe()
    }

    unsubscribe = alertsService.subscribeToAlerts(
      // On insert
      alert => {
        // Add to beginning of list
        alerts.value.unshift(alert)
        DebugUtils.debug(MODULE_NAME, 'New alert received via realtime', { id: alert.id })
      },
      // On update
      alert => {
        const index = alerts.value.findIndex(a => a.id === alert.id)
        if (index !== -1) {
          alerts.value[index] = alert
          DebugUtils.debug(MODULE_NAME, 'Alert updated via realtime', { id: alert.id })
        }
      }
    )
  }

  /**
   * Cleanup subscriptions
   */
  function cleanup(): void {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    initialized.value = false
  }

  /**
   * Get alert by ID
   */
  function getAlertById(id: string): OperationAlert | undefined {
    return alerts.value.find(a => a.id === id)
  }

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    alerts,
    loading,
    initialized,
    error,
    lastFetch,

    // Computed
    newAlerts,
    hasNewAlerts,
    alertCounts,
    activeCategories,
    alertsByCategory,

    // Actions
    initialize,
    fetchAlerts,
    fetchAllAlerts,
    refresh,
    createAlert,
    markAsViewed,
    markAllAsViewed,
    acknowledgeAlert,
    resolveAlert,
    subscribeToAlerts,
    cleanup,
    getAlertById
  }
})
