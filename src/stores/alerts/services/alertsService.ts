// src/stores/alerts/services/alertsService.ts
// Supabase operations for Operations Alerts

import { supabase } from '@/supabase/client'
import { DebugUtils, generateId, TimeUtils } from '@/utils'
import type {
  OperationAlert,
  CreateAlertPayload,
  AlertFilters,
  AlertCounts,
  CategoryAlertCounts,
  AlertCategory,
  AlertStatus
} from '../types'

const MODULE_NAME = 'AlertsService'

// Database column mapping (snake_case to camelCase)
interface DbAlert {
  id: string
  category: string
  type: string
  severity: string
  title: string
  description: string | null
  metadata: Record<string, any> | null
  shift_id: string | null
  order_id: string | null
  bill_id: string | null
  user_id: string | null
  status: string
  acknowledged_by: string | null
  acknowledged_at: string | null
  resolved_by: string | null
  resolved_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

// Transform database row to app model
function toOperationAlert(row: DbAlert): OperationAlert {
  return {
    id: row.id,
    category: row.category as OperationAlert['category'],
    type: row.type as OperationAlert['type'],
    severity: row.severity as OperationAlert['severity'],
    title: row.title,
    description: row.description || undefined,
    metadata: row.metadata || undefined,
    shiftId: row.shift_id || undefined,
    orderId: row.order_id || undefined,
    billId: row.bill_id || undefined,
    userId: row.user_id || undefined,
    status: row.status as OperationAlert['status'],
    acknowledgedBy: row.acknowledged_by || undefined,
    acknowledgedAt: row.acknowledged_at || undefined,
    resolvedBy: row.resolved_by || undefined,
    resolvedAt: row.resolved_at || undefined,
    resolutionNotes: row.resolution_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// Transform app model to database row
function toDbRow(alert: Partial<OperationAlert>): Partial<DbAlert> {
  const row: Partial<DbAlert> = {}

  if (alert.id !== undefined) row.id = alert.id
  if (alert.category !== undefined) row.category = alert.category
  if (alert.type !== undefined) row.type = alert.type
  if (alert.severity !== undefined) row.severity = alert.severity
  if (alert.title !== undefined) row.title = alert.title
  if (alert.description !== undefined) row.description = alert.description
  if (alert.metadata !== undefined) row.metadata = alert.metadata
  if (alert.shiftId !== undefined) row.shift_id = alert.shiftId
  if (alert.orderId !== undefined) row.order_id = alert.orderId
  if (alert.billId !== undefined) row.bill_id = alert.billId
  if (alert.userId !== undefined) row.user_id = alert.userId
  if (alert.status !== undefined) row.status = alert.status
  if (alert.acknowledgedBy !== undefined) row.acknowledged_by = alert.acknowledgedBy
  if (alert.acknowledgedAt !== undefined) row.acknowledged_at = alert.acknowledgedAt
  if (alert.resolvedBy !== undefined) row.resolved_by = alert.resolvedBy
  if (alert.resolvedAt !== undefined) row.resolved_at = alert.resolvedAt
  if (alert.resolutionNotes !== undefined) row.resolution_notes = alert.resolutionNotes

  return row
}

/**
 * Fetch alerts with optional filters
 */
export async function fetchAlerts(filters?: AlertFilters): Promise<OperationAlert[]> {
  DebugUtils.debug(MODULE_NAME, 'Fetching alerts', { filters })

  let query = supabase
    .from('operations_alerts')
    .select('*')
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.severity) {
    query = query.eq('severity', filters.severity)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.shiftId) {
    query = query.eq('shift_id', filters.shiftId)
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch alerts', { error })
    throw error
  }

  const alerts = (data || []).map(toOperationAlert)
  DebugUtils.debug(MODULE_NAME, 'Fetched alerts', { count: alerts.length })

  return alerts
}

/**
 * Fetch only new/unread alerts (for badge counts)
 */
export async function fetchNewAlerts(): Promise<OperationAlert[]> {
  return fetchAlerts({ status: 'new' })
}

/**
 * Get alert counts by category and severity
 */
export async function fetchAlertCounts(): Promise<AlertCounts> {
  DebugUtils.debug(MODULE_NAME, 'Fetching alert counts')

  const { data, error } = await supabase
    .from('operations_alerts')
    .select('category, severity, status')
    .in('status', ['new', 'viewed'])

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch alert counts', { error })
    throw error
  }

  // Initialize counts
  const emptyCounts: CategoryAlertCounts = { critical: 0, warning: 0, info: 0, total: 0 }
  const counts: AlertCounts = {
    shift: { ...emptyCounts },
    account: { ...emptyCounts },
    product: { ...emptyCounts },
    supplier: { ...emptyCounts },
    total: 0,
    newCount: 0
  }

  // Count by category and severity
  for (const row of data || []) {
    const category = row.category as AlertCategory
    const severity = row.severity as keyof CategoryAlertCounts
    const status = row.status as AlertStatus

    if (counts[category] && severity in counts[category]) {
      counts[category][severity]++
      counts[category].total++
      counts.total++

      if (status === 'new') {
        counts.newCount++
      }
    }
  }

  DebugUtils.debug(MODULE_NAME, 'Alert counts', counts)
  return counts
}

/**
 * Create a new alert
 */
export async function createAlert(payload: CreateAlertPayload): Promise<OperationAlert> {
  DebugUtils.info(MODULE_NAME, 'Creating alert', { type: payload.type, severity: payload.severity })

  const now = TimeUtils.getCurrentLocalISO()
  const alert: Partial<OperationAlert> = {
    id: generateId(),
    ...payload,
    status: 'new',
    createdAt: now,
    updatedAt: now
  }

  const { data, error } = await supabase
    .from('operations_alerts')
    .insert(toDbRow(alert))
    .select()
    .single()

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create alert', { error })
    throw error
  }

  const createdAlert = toOperationAlert(data)
  DebugUtils.info(MODULE_NAME, 'Alert created', { id: createdAlert.id, type: createdAlert.type })

  return createdAlert
}

/**
 * Mark alerts as viewed
 */
export async function markAsViewed(alertIds: string[]): Promise<void> {
  if (alertIds.length === 0) return

  DebugUtils.debug(MODULE_NAME, 'Marking alerts as viewed', { count: alertIds.length })

  const { error } = await supabase
    .from('operations_alerts')
    .update({ status: 'viewed', updated_at: TimeUtils.getCurrentLocalISO() })
    .in('id', alertIds)
    .eq('status', 'new') // Only update if currently new

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to mark alerts as viewed', { error })
    throw error
  }
}

/**
 * Acknowledge an alert (manager action)
 */
export async function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string
): Promise<OperationAlert> {
  DebugUtils.info(MODULE_NAME, 'Acknowledging alert', { alertId, acknowledgedBy })

  const now = TimeUtils.getCurrentLocalISO()

  const { data, error } = await supabase
    .from('operations_alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: acknowledgedBy,
      acknowledged_at: now,
      updated_at: now
    })
    .eq('id', alertId)
    .select()
    .single()

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to acknowledge alert', { error })
    throw error
  }

  return toOperationAlert(data)
}

/**
 * Resolve an alert (manager action)
 */
export async function resolveAlert(
  alertId: string,
  resolvedBy: string,
  resolutionNotes?: string
): Promise<OperationAlert> {
  DebugUtils.info(MODULE_NAME, 'Resolving alert', { alertId, resolvedBy })

  const now = TimeUtils.getCurrentLocalISO()

  const { data, error } = await supabase
    .from('operations_alerts')
    .update({
      status: 'resolved',
      resolved_by: resolvedBy,
      resolved_at: now,
      resolution_notes: resolutionNotes || null,
      updated_at: now
    })
    .eq('id', alertId)
    .select()
    .single()

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to resolve alert', { error })
    throw error
  }

  return toOperationAlert(data)
}

/**
 * Get single alert by ID
 */
export async function getAlertById(alertId: string): Promise<OperationAlert | null> {
  const { data, error } = await supabase
    .from('operations_alerts')
    .select('*')
    .eq('id', alertId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    throw error
  }

  return toOperationAlert(data)
}

/**
 * Subscribe to realtime alerts
 */
export function subscribeToAlerts(
  onInsert: (alert: OperationAlert) => void,
  onUpdate: (alert: OperationAlert) => void
) {
  DebugUtils.info(MODULE_NAME, 'Subscribing to realtime alerts')

  const channel = supabase
    .channel('operations_alerts_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'operations_alerts'
      },
      payload => {
        DebugUtils.debug(MODULE_NAME, 'New alert received', { id: payload.new.id })
        onInsert(toOperationAlert(payload.new as DbAlert))
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'operations_alerts'
      },
      payload => {
        DebugUtils.debug(MODULE_NAME, 'Alert updated', { id: payload.new.id })
        onUpdate(toOperationAlert(payload.new as DbAlert))
      }
    )
    .subscribe()

  return () => {
    DebugUtils.info(MODULE_NAME, 'Unsubscribing from realtime alerts')
    supabase.removeChannel(channel)
  }
}
