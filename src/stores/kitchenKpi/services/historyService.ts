// src/stores/kitchenKpi/services/historyService.ts
// Service for fetching unified history (productions + write-offs)

import { supabase } from '@/supabase/client'
import { DebugUtils, TimeUtils } from '@/utils'
import type { UnifiedHistoryItem, HistorySummary } from '../types'

const MODULE_NAME = 'HistoryService'

// ===============================================
// Types
// ===============================================

export interface FetchHistoryOptions {
  department?: 'kitchen' | 'bar' | 'all'
  date?: string // ISO date (YYYY-MM-DD) - defaults to today in Bali timezone
}

export interface HistoryFetchResult {
  items: UnifiedHistoryItem[]
  summary: HistorySummary
}

// ===============================================
// Main Function
// ===============================================

/**
 * Fetch unified history for today (productions + write-offs)
 */
export async function fetchTodayHistory(
  options: FetchHistoryOptions = {}
): Promise<HistoryFetchResult> {
  const { department = 'all' } = options
  const today = options.date || TimeUtils.getCurrentLocalDate()

  // Calculate date range for today in UTC (since DB stores UTC timestamps)
  const startOfDay = TimeUtils.getStartOfDay(today)
  const endOfDay = TimeUtils.getEndOfDay(today)

  DebugUtils.info(MODULE_NAME, 'Fetching today history', {
    department,
    date: today,
    startOfDay,
    endOfDay
  })

  // Fetch all data sources in parallel
  const [productionTasksResult, preparationOpsResult, storageOpsResult] = await Promise.all([
    fetchCompletedProductions(startOfDay, endOfDay, department),
    fetchPreparationWriteOffs(startOfDay, endOfDay, department),
    fetchProductWriteOffs(startOfDay, endOfDay, department)
  ])

  // Transform and merge all items
  const items: UnifiedHistoryItem[] = [
    ...transformProductionTasks(productionTasksResult),
    ...transformPreparationWriteOffs(preparationOpsResult),
    ...transformProductWriteOffs(storageOpsResult)
  ]

  // Sort by timestamp (newest first)
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Calculate summary
  const summary = calculateSummary(items)

  DebugUtils.info(MODULE_NAME, 'History fetched', {
    totalItems: items.length,
    productions: summary.productionCount,
    writeOffs: summary.writeOffCount
  })

  return { items, summary }
}

// ===============================================
// Data Fetching Functions
// ===============================================

async function fetchCompletedProductions(
  startOfDay: string,
  endOfDay: string,
  department: string
): Promise<ProductionScheduleRow[]> {
  let query = supabase
    .from('production_schedule')
    .select('*')
    .eq('status', 'completed')
    .gte('completed_at', startOfDay)
    .lte('completed_at', endOfDay)

  if (department !== 'all') {
    query = query.eq('department', department)
  }

  const { data, error } = await query.order('completed_at', { ascending: false })

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch productions', { error })
    return []
  }

  return data || []
}

async function fetchPreparationWriteOffs(
  startOfDay: string,
  endOfDay: string,
  department: string
): Promise<PreparationOperationRow[]> {
  let query = supabase
    .from('preparation_operations')
    .select('*')
    .eq('operation_type', 'write_off')
    .gte('operation_date', startOfDay)
    .lte('operation_date', endOfDay)

  if (department !== 'all') {
    query = query.eq('department', department)
  }

  const { data, error } = await query.order('operation_date', { ascending: false })

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch prep write-offs', { error })
    return []
  }

  return data || []
}

async function fetchProductWriteOffs(
  startOfDay: string,
  endOfDay: string,
  department: string
): Promise<StorageOperationRow[]> {
  let query = supabase
    .from('storage_operations')
    .select('*')
    .eq('operation_type', 'write_off')
    .gte('operation_date', startOfDay)
    .lte('operation_date', endOfDay)

  if (department !== 'all') {
    query = query.eq('department', department)
  }

  const { data, error } = await query.order('operation_date', { ascending: false })

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch product write-offs', { error })
    return []
  }

  return data || []
}

// ===============================================
// Transform Functions
// ===============================================

function transformProductionTasks(rows: ProductionScheduleRow[]): UnifiedHistoryItem[] {
  return rows.map(row => ({
    id: row.id,
    type: 'production' as const,
    timestamp: row.completed_at || row.updated_at,
    displayName: row.preparation_name,
    quantity: row.completed_quantity || row.target_quantity,
    unit: row.target_unit,
    responsiblePerson: row.completed_by_name || undefined,
    department: row.department as 'kitchen' | 'bar',
    productionDetails: {
      productionSlot: row.production_slot as 'urgent' | 'morning' | 'afternoon' | 'evening',
      portionType: row.portion_type || undefined,
      portionSize: row.portion_size || undefined
    }
  }))
}

function transformPreparationWriteOffs(rows: PreparationOperationRow[]): UnifiedHistoryItem[] {
  const items: UnifiedHistoryItem[] = []

  for (const row of rows) {
    const writeOffDetails = row.write_off_details || {}
    const operationItems = row.items || []

    // Create one history item per write-off item
    for (const item of operationItems) {
      items.push({
        id: `${row.id}-${item.id || item.preparationId || item.preparation_id}`,
        type: 'preparation_writeoff' as const,
        timestamp: row.operation_date,
        displayName: item.preparationName || item.preparation_name || 'Unknown',
        quantity: item.quantity || 0,
        unit: item.unit || 'g',
        totalValue: item.totalCost || item.total_cost || 0,
        responsiblePerson: row.responsible_person || undefined,
        department: row.department as 'kitchen' | 'bar',
        writeOffDetails: {
          operationId: row.id,
          reason: writeOffDetails.reason || 'other',
          affectsKPI: writeOffDetails.affectsKPI ?? writeOffDetails.affects_kpi ?? true,
          notes: writeOffDetails.notes || item.notes || undefined,
          itemType: 'preparation'
        }
      })
    }
  }

  return items
}

function transformProductWriteOffs(rows: StorageOperationRow[]): UnifiedHistoryItem[] {
  const items: UnifiedHistoryItem[] = []

  // Filter out internal write-offs (production_consumption, sales_consumption)
  const filteredRows = rows.filter(row => {
    const reason = row.write_off_details?.reason
    return !['production_consumption', 'sales_consumption'].includes(reason)
  })

  for (const row of filteredRows) {
    const writeOffDetails = row.write_off_details || {}
    const operationItems = row.items || []

    // Create one history item per write-off item
    for (const item of operationItems) {
      items.push({
        id: `${row.id}-${item.id || item.itemId || item.item_id}`,
        type: 'product_writeoff' as const,
        timestamp: row.operation_date,
        displayName: item.itemName || item.item_name || 'Unknown',
        quantity: item.quantity || 0,
        unit: item.unit || 'g',
        totalValue: item.totalCost || item.total_cost || 0,
        responsiblePerson: row.responsible_person || undefined,
        department: row.department as 'kitchen' | 'bar',
        writeOffDetails: {
          operationId: row.id,
          reason: writeOffDetails.reason || 'other',
          affectsKPI: writeOffDetails.affectsKPI ?? writeOffDetails.affects_kpi ?? true,
          notes: writeOffDetails.notes || item.notes || undefined,
          itemType: 'product'
        }
      })
    }
  }

  return items
}

// ===============================================
// Summary Calculation
// ===============================================

function calculateSummary(items: UnifiedHistoryItem[]): HistorySummary {
  const productions = items.filter(i => i.type === 'production')
  const writeOffs = items.filter(i => i.type !== 'production')

  return {
    totalProduced: productions.reduce((sum, i) => sum + i.quantity, 0),
    totalWrittenOff: writeOffs.reduce((sum, i) => sum + i.quantity, 0),
    productionCount: productions.length,
    writeOffCount: writeOffs.length,
    totalWriteOffValue: writeOffs.reduce((sum, i) => sum + (i.totalValue || 0), 0)
  }
}

// ===============================================
// Internal Row Types (database schema)
// ===============================================

interface ProductionScheduleRow {
  id: string
  preparation_id: string
  preparation_name: string
  department: string
  schedule_date: string
  production_slot: string
  target_quantity: number
  target_unit: string
  completed_at: string | null
  completed_by: string | null
  completed_by_name: string | null
  completed_quantity: number | null
  portion_type?: string | null
  portion_size?: number | null
  updated_at: string
}

interface PreparationOperationRow {
  id: string
  operation_type: string
  operation_date: string
  department: string
  responsible_person: string | null
  items: PreparationOperationItem[]
  write_off_details?: {
    reason?: string
    affectsKPI?: boolean
    affects_kpi?: boolean
    notes?: string
  }
}

interface PreparationOperationItem {
  id?: string
  preparationId?: string
  preparation_id?: string
  preparationName?: string
  preparation_name?: string
  quantity?: number
  unit?: string
  totalCost?: number
  total_cost?: number
  notes?: string
}

interface StorageOperationRow {
  id: string
  operation_type: string
  operation_date: string
  department: string
  responsible_person: string | null
  items: StorageOperationItem[]
  write_off_details?: {
    reason?: string
    affectsKPI?: boolean
    affects_kpi?: boolean
    notes?: string
  }
}

interface StorageOperationItem {
  id?: string
  itemId?: string
  item_id?: string
  itemName?: string
  item_name?: string
  quantity?: number
  unit?: string
  totalCost?: number
  total_cost?: number
  notes?: string
}
