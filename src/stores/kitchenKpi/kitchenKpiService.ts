// src/stores/kitchenKpi/kitchenKpiService.ts
// Kitchen/Bar KPI Service - Supabase operations

import { supabase } from '@/supabase/client'
import { DebugUtils, TimeUtils } from '@/utils'
import { useRecipesStore } from '@/stores/recipes'
import type {
  KitchenKpiEntry,
  ProductionScheduleItem,
  ProductionKpiDetail,
  WriteoffKpiDetail
} from '@/stores/preparation/types'
import type {
  KpiFilters,
  ScheduleFilters,
  KitchenKpiRow,
  ProductionScheduleRow,
  CreateScheduleItemData,
  CompleteScheduleTaskData,
  RecordKpiEntryData,
  ScheduleCompletionKpiDetail
} from './types'

const MODULE_NAME = 'KitchenKpiService'

// ===============================================
// Mappers: Database Row <-> Domain Types
// ===============================================

function kpiFromSupabase(row: KitchenKpiRow): KitchenKpiEntry {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    department: row.department as 'kitchen' | 'bar',
    periodDate: row.period_date,
    productionsCompleted: row.productions_completed,
    productionQuantityTotal: Number(row.production_quantity_total),
    productionValueTotal: Number(row.production_value_total),
    writeoffsKpiAffecting: row.writeoffs_kpi_affecting,
    writeoffValueKpiAffecting: Number(row.writeoff_value_kpi_affecting),
    writeoffsNonKpi: row.writeoffs_non_kpi,
    writeoffValueNonKpi: Number(row.writeoff_value_non_kpi),
    onTimeCompletions: row.on_time_completions,
    lateCompletions: row.late_completions,
    productionDetails: (row.production_details as ProductionKpiDetail[]) || [],
    writeoffDetails: (row.writeoff_details as WriteoffKpiDetail[]) || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function scheduleFromSupabase(row: ProductionScheduleRow): ProductionScheduleItem {
  return {
    id: row.id,
    preparationId: row.preparation_id,
    preparationName: row.preparation_name,
    department: row.department as 'kitchen' | 'bar',
    scheduleDate: row.schedule_date,
    productionSlot: row.production_slot as 'urgent' | 'morning' | 'afternoon' | 'evening',
    priority: row.priority,
    targetQuantity: Number(row.target_quantity),
    targetUnit: row.target_unit,
    currentStockAtGeneration: row.current_stock_at_generation
      ? Number(row.current_stock_at_generation)
      : undefined,
    recommendationReason: row.recommendation_reason || undefined,
    status: row.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
    completedAt: row.completed_at || undefined,
    completedBy: row.completed_by || undefined,
    completedByName: row.completed_by_name || undefined,
    completedQuantity: row.completed_quantity ? Number(row.completed_quantity) : undefined,
    preparationBatchId: row.preparation_batch_id || undefined,
    syncStatus: row.sync_status as 'pending' | 'synced' | 'failed',
    syncedAt: row.synced_at || undefined,
    syncError: row.sync_error || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * ⭐ PHASE 2: Enrich schedule items with portion type info from recipes store
 */
function enrichScheduleItemsWithPortionType(
  items: ProductionScheduleItem[]
): ProductionScheduleItem[] {
  const recipesStore = useRecipesStore()
  if (!recipesStore.initialized) {
    return items // Can't enrich if store not loaded
  }

  return items.map(item => {
    const preparation = recipesStore.preparations?.find(p => p.id === item.preparationId)
    if (preparation) {
      return {
        ...item,
        portionType: preparation.portionType || 'weight',
        portionSize: preparation.portionSize
      }
    }
    return item
  })
}

function scheduleToSupabase(item: CreateScheduleItemData): Partial<ProductionScheduleRow> {
  return {
    preparation_id: item.preparationId,
    preparation_name: item.preparationName,
    department: item.department,
    schedule_date: item.scheduleDate,
    production_slot: item.productionSlot,
    target_quantity: item.targetQuantity,
    target_unit: item.targetUnit,
    priority: item.priority || 0,
    recommendation_reason: item.recommendationReason || null,
    status: 'pending',
    sync_status: 'pending'
  }
}

// ===============================================
// KPI Operations
// ===============================================

class KitchenKpiService {
  // ----- KPI Entry Operations -----

  /**
   * Get KPI entries with filters
   */
  async getKpiEntries(filters: KpiFilters = {}): Promise<KitchenKpiEntry[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Fetching KPI entries', { filters })

      let query = supabase.from('kitchen_bar_kpi').select('*')

      if (filters.department && filters.department !== 'all') {
        query = query.eq('department', filters.department)
      }

      if (filters.staffId) {
        query = query.eq('staff_id', filters.staffId)
      }

      if (filters.dateFrom) {
        query = query.gte('period_date', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('period_date', filters.dateTo)
      }

      query = query.order('period_date', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      const entries = (data || []).map(row => kpiFromSupabase(row as KitchenKpiRow))

      DebugUtils.info(MODULE_NAME, 'KPI entries fetched', { count: entries.length })

      return entries
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch KPI entries', { error })
      throw error
    }
  }

  /**
   * Get KPI entry for a specific staff member and date
   */
  async getKpiEntry(
    staffId: string,
    periodDate: string,
    department: 'kitchen' | 'bar'
  ): Promise<KitchenKpiEntry | null> {
    try {
      const { data, error } = await supabase
        .from('kitchen_bar_kpi')
        .select('*')
        .eq('staff_id', staffId)
        .eq('period_date', periodDate)
        .eq('department', department)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows

      return data ? kpiFromSupabase(data as KitchenKpiRow) : null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch KPI entry', { error })
      throw error
    }
  }

  /**
   * Record/update KPI entry using upsert function
   */
  async recordKpiEntry(data: RecordKpiEntryData): Promise<string> {
    try {
      DebugUtils.info(MODULE_NAME, 'Recording KPI entry', {
        staffId: data.staffId,
        date: data.periodDate
      })

      // Prepare parameters for RPC function
      const params: Record<string, unknown> = {
        p_staff_id: data.staffId,
        p_staff_name: data.staffName,
        p_department: data.department,
        p_period_date: data.periodDate
      }

      // Add production metrics if provided
      if (data.productionDetail) {
        params.p_add_productions = 1
        params.p_add_production_quantity = data.productionDetail.quantity
        params.p_add_production_value = data.productionDetail.value
        params.p_production_detail = data.productionDetail
      }

      // Add write-off metrics if provided
      if (data.writeoffDetail) {
        if (data.writeoffDetail.affectsKpi) {
          params.p_add_writeoffs_kpi = 1
          params.p_add_writeoff_value_kpi = data.writeoffDetail.value
        } else {
          params.p_add_writeoffs_non_kpi = 1
          params.p_add_writeoff_value_non_kpi = data.writeoffDetail.value
        }
        params.p_writeoff_detail = data.writeoffDetail
      }

      // Add schedule completion metrics if provided
      if (data.scheduleCompletionDetail) {
        if (data.scheduleCompletionDetail.isOnTime) {
          params.p_add_on_time = 1
        } else {
          params.p_add_late = 1
        }
      }

      const { data: result, error } = await supabase.rpc('upsert_kitchen_kpi', params)

      if (error) throw error

      DebugUtils.info(MODULE_NAME, 'KPI entry recorded', { id: result })

      return result as string
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to record KPI entry', { error })
      throw error
    }
  }

  /**
   * Record production completion in KPI
   */
  async recordProduction(
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar',
    detail: ProductionKpiDetail
  ): Promise<string> {
    const today = TimeUtils.getCurrentLocalDate()

    return this.recordKpiEntry({
      staffId,
      staffName,
      department,
      periodDate: today,
      productionDetail: detail
    })
  }

  /**
   * Record write-off in KPI
   */
  async recordWriteoff(
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar',
    detail: WriteoffKpiDetail
  ): Promise<string> {
    const today = TimeUtils.getCurrentLocalDate()

    return this.recordKpiEntry({
      staffId,
      staffName,
      department,
      periodDate: today,
      writeoffDetail: detail
    })
  }

  /**
   * Record schedule completion in KPI (on-time or late)
   */
  async recordScheduleCompletion(
    staffId: string,
    staffName: string,
    department: 'kitchen' | 'bar',
    detail: ScheduleCompletionKpiDetail
  ): Promise<string> {
    const today = TimeUtils.getCurrentLocalDate()

    return this.recordKpiEntry({
      staffId,
      staffName,
      department,
      periodDate: today,
      scheduleCompletionDetail: detail
    })
  }

  // ----- Production Schedule Operations -----

  /**
   * Get production schedule with filters
   */
  async getSchedule(filters: ScheduleFilters = {}): Promise<ProductionScheduleItem[]> {
    try {
      const date = filters.date || TimeUtils.getCurrentLocalDate()

      DebugUtils.info(MODULE_NAME, 'Fetching production schedule', { date, filters })

      let query = supabase.from('production_schedule').select('*').eq('schedule_date', date)

      if (filters.department && filters.department !== 'all') {
        query = query.eq('department', filters.department)
      }

      if (filters.slot && filters.slot !== 'all') {
        query = query.eq('production_slot', filters.slot)
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      // Order by status (pending first), then by slot priority
      query = query.order('status', { ascending: true }).order('priority', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      const items = (data || []).map(row => scheduleFromSupabase(row as ProductionScheduleRow))

      // ⭐ PHASE 2: Enrich with portion type info
      const enrichedItems = enrichScheduleItemsWithPortionType(items)

      DebugUtils.info(MODULE_NAME, 'Schedule fetched', {
        count: enrichedItems.length,
        pending: enrichedItems.filter(i => i.status === 'pending').length,
        completed: enrichedItems.filter(i => i.status === 'completed').length
      })

      return enrichedItems
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch schedule', { error })
      throw error
    }
  }

  /**
   * Get schedule using RPC function (optimized query)
   */
  async getScheduleRpc(
    date: string,
    department: 'kitchen' | 'bar'
  ): Promise<ProductionScheduleItem[]> {
    try {
      const { data, error } = await supabase.rpc('get_production_schedule', {
        p_date: date,
        p_department: department
      })

      if (error) throw error

      const items = (data || []).map((row: ProductionScheduleRow) => scheduleFromSupabase(row))

      // ⭐ PHASE 2: Enrich with portion type info
      return enrichScheduleItemsWithPortionType(items)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch schedule via RPC', { error })
      throw error
    }
  }

  /**
   * Create schedule item
   */
  async createScheduleItem(data: CreateScheduleItemData): Promise<ProductionScheduleItem> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating schedule item', {
        preparationName: data.preparationName,
        date: data.scheduleDate
      })

      const row = scheduleToSupabase(data)

      const { data: result, error } = await supabase
        .from('production_schedule')
        .insert(row)
        .select()
        .single()

      if (error) throw error

      const item = scheduleFromSupabase(result as ProductionScheduleRow)

      DebugUtils.info(MODULE_NAME, 'Schedule item created', { id: item.id })

      return item
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create schedule item', { error })
      throw error
    }
  }

  /**
   * Create multiple schedule items (batch)
   */
  async createScheduleItems(items: CreateScheduleItemData[]): Promise<ProductionScheduleItem[]> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating schedule items batch', { count: items.length })

      const rows = items.map(scheduleToSupabase)

      const { data, error } = await supabase
        .from('production_schedule')
        .upsert(rows, {
          onConflict: 'preparation_id,schedule_date,production_slot',
          ignoreDuplicates: false
        })
        .select()

      if (error) throw error

      const created = (data || []).map(row => scheduleFromSupabase(row as ProductionScheduleRow))

      DebugUtils.info(MODULE_NAME, 'Schedule items created', { count: created.length })

      return created
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create schedule items', { error })
      throw error
    }
  }

  /**
   * Complete schedule task using RPC function
   */
  async completeTask(data: CompleteScheduleTaskData): Promise<ProductionScheduleItem> {
    try {
      DebugUtils.info(MODULE_NAME, 'Completing schedule task', {
        taskId: data.taskId,
        quantity: data.completedQuantity
      })

      const { data: result, error } = await supabase.rpc('complete_production_schedule_task', {
        p_task_id: data.taskId,
        p_completed_by: data.completedBy,
        p_completed_by_name: data.completedByName,
        p_completed_quantity: data.completedQuantity,
        p_batch_id: data.preparationBatchId || null
      })

      if (error) throw error

      const item = scheduleFromSupabase(result as ProductionScheduleRow)

      DebugUtils.info(MODULE_NAME, 'Task completed', { id: item.id, status: item.status })

      return item
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to complete task', { error })
      throw error
    }
  }

  /**
   * Auto-fulfill schedule task (system action, no user ID)
   * Uses direct SQL update since RPC requires UUID for completed_by
   */
  async completeTaskAutoFulfill(data: {
    taskId: string
    completedByName: string
    completedQuantity: number
  }): Promise<ProductionScheduleItem> {
    try {
      DebugUtils.info(MODULE_NAME, 'Auto-fulfilling schedule task', {
        taskId: data.taskId,
        quantity: data.completedQuantity
      })

      const { data: result, error } = await supabase
        .from('production_schedule')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: null,
          completed_by_name: data.completedByName,
          completed_quantity: data.completedQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.taskId)
        .in('status', ['pending', 'in_progress'])
        .select()
        .single()

      if (error) throw error

      const item = scheduleFromSupabase(result as ProductionScheduleRow)

      DebugUtils.info(MODULE_NAME, 'Task auto-fulfilled', { id: item.id, status: item.status })

      return item
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to auto-fulfill task', { error })
      throw error
    }
  }

  /**
   * Update schedule item status
   */
  async updateScheduleStatus(
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<ProductionScheduleItem> {
    try {
      const { data, error } = await supabase
        .from('production_schedule')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error

      return scheduleFromSupabase(data as ProductionScheduleRow)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update schedule status', { error })
      throw error
    }
  }

  /**
   * Mark schedule item as synced
   */
  async markAsSynced(taskId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('production_schedule')
        .update({
          sync_status: 'synced',
          synced_at: new Date().toISOString(),
          sync_error: null
        })
        .eq('id', taskId)

      if (error) throw error
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to mark as synced', { error })
      throw error
    }
  }

  /**
   * Mark schedule item sync as failed
   */
  async markSyncFailed(taskId: string, errorMessage: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('production_schedule')
        .update({
          sync_status: 'failed',
          sync_error: errorMessage
        })
        .eq('id', taskId)

      if (error) throw error
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to mark sync as failed', { error })
      throw error
    }
  }

  /**
   * Delete schedule item
   */
  async deleteScheduleItem(taskId: string): Promise<void> {
    try {
      const { error } = await supabase.from('production_schedule').delete().eq('id', taskId)

      if (error) throw error

      DebugUtils.info(MODULE_NAME, 'Schedule item deleted', { taskId })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete schedule item', { error })
      throw error
    }
  }

  /**
   * Get pending sync items for offline processing
   */
  async getPendingSyncItems(): Promise<ProductionScheduleItem[]> {
    try {
      const { data, error } = await supabase
        .from('production_schedule')
        .select('*')
        .eq('sync_status', 'pending')
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data || []).map(row => scheduleFromSupabase(row as ProductionScheduleRow))
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get pending sync items', { error })
      throw error
    }
  }
}

// Export singleton instance
export const kitchenKpiService = new KitchenKpiService()
