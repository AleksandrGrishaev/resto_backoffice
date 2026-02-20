import { ref, computed } from 'vue'
import { supabase } from '@/supabase/client'
import {
  WRITE_OFF_REASON_OPTIONS,
  WRITE_OFF_CLASSIFICATION,
  type WriteOffReason
} from '@/stores/storage/types'

// --- Types ---

export type WriteOffTypeFilter = 'waste' | 'training' | 'auto' | 'all'

export interface WriteOffReportFilters {
  dateFrom: string
  dateTo: string
  department: 'kitchen' | 'bar' | 'all'
  type: WriteOffTypeFilter
}

// Waste = real losses (thrown away)
// includes 'expiration' from preparation_operations (same as 'expired')
const WASTE_REASONS = ['expired', 'expiration', 'spoiled', 'other', 'cancellation_loss']
// Training/test = intentional, not losses
const TRAINING_REASONS = ['education', 'test']
// Auto = system-generated consumption
const AUTO_REASONS = ['production_consumption', 'sales_consumption']

// Map preparation-specific reasons to display labels
const EXTRA_REASON_LABELS: Record<string, string> = {
  expiration: 'Expiration'
}

export interface DailyWriteOffRow {
  date: string
  operationsCount: number
  productsValue: number
  preparationsValue: number
  totalValue: number
  topReason: string
  // Detail operations for expandable row
  operations: OperationDetail[]
}

export interface OperationDetail {
  id: string
  source: 'storage' | 'preparation'
  time: string
  reason: string
  reasonLabel: string
  department: string
  totalValue: number
  items: OperationItemDetail[]
}

export interface OperationItemDetail {
  itemName: string
  itemType: 'product' | 'preparation'
  quantity: number
  unit: string
  totalCost: number
}

export interface ReasonRow {
  reason: string
  reasonLabel: string
  count: number
  totalValue: number
  percent: number
  affectsKPI: boolean
  color: string
}

export interface TopItemRow {
  itemName: string
  itemType: 'product' | 'preparation'
  quantity: number
  unit: string
  totalCost: number
  reason: string
  reasonLabel: string
  date: string
}

export interface WriteOffSummary {
  totalValue: number
  operationsCount: number
  kpiValue: number
  kpiPercent: number
  avgDaily: number
}

// --- Helpers ---

function isWasteReason(reason: string): boolean {
  return WASTE_REASONS.includes(reason)
}

function getReasonLabel(reason: string): string {
  if (EXTRA_REASON_LABELS[reason]) return EXTRA_REASON_LABELS[reason]
  const info = WRITE_OFF_REASON_OPTIONS.find(o => o.value === reason)
  return info?.title || reason || '-'
}

function getReasonColor(reason: string): string {
  const info = WRITE_OFF_REASON_OPTIONS.find(o => o.value === reason)
  if (info) return info.color
  if (reason === 'expiration') return 'orange'
  return 'grey'
}

function matchesTypeFilter(reason: string, type: WriteOffTypeFilter): boolean {
  if (type === 'all') return true
  if (type === 'waste') return WASTE_REASONS.includes(reason)
  if (type === 'training') return TRAINING_REASONS.includes(reason)
  if (type === 'auto') return AUTO_REASONS.includes(reason)
  return false
}

// --- Composable ---

export function useWriteOffReport() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasLoaded = ref(false)

  const dailyRows = ref<DailyWriteOffRow[]>([])
  const reasonBreakdown = ref<ReasonRow[]>([])
  const topItems = ref<TopItemRow[]>([])
  const summary = ref<WriteOffSummary>({
    totalValue: 0,
    operationsCount: 0,
    kpiValue: 0,
    kpiPercent: 0,
    avgDaily: 0
  })

  const avgDailyValue = computed(() => summary.value.avgDaily)

  async function generateReport(filters: WriteOffReportFilters) {
    loading.value = true
    error.value = null
    hasLoaded.value = true

    try {
      // Query both tables in parallel
      const [storageResult, prepResult] = await Promise.all([
        fetchStorageOperations(filters),
        fetchPreparationOperations(filters)
      ])

      // Merge and process
      const allOps = [...storageResult, ...prepResult]
      processData(allOps)
    } catch (err) {
      console.error('Failed to generate write-off report:', err)
      error.value = err instanceof Error ? err.message : 'Failed to generate report'
      resetData()
    } finally {
      loading.value = false
    }
  }

  interface NormalizedOp {
    id: string
    source: 'storage' | 'preparation'
    operationDate: string
    department: string
    reason: string
    totalValue: number
    items: Array<{
      itemName: string
      itemType: 'product' | 'preparation'
      quantity: number
      unit: string
      totalCost: number
    }>
  }

  async function fetchStorageOperations(filters: WriteOffReportFilters): Promise<NormalizedOp[]> {
    let query = supabase
      .from('storage_operations')
      .select('id, operation_date, department, items, write_off_details, total_value')
      .eq('operation_type', 'write_off')
      .gte('operation_date', `${filters.dateFrom}T00:00:00`)
      .lte('operation_date', `${filters.dateTo}T23:59:59`)
      .order('operation_date', { ascending: false })

    if (filters.department !== 'all') {
      query = query.eq('department', filters.department)
    }

    const { data, error: err } = await query
    if (err) throw err

    return (data || [])
      .filter((op: any) => matchesTypeFilter(op.write_off_details?.reason || '', filters.type))
      .map((op: any) => ({
        id: op.id,
        source: 'storage' as const,
        operationDate: op.operation_date,
        department: op.department || 'unknown',
        reason: op.write_off_details?.reason || 'other',
        totalValue: Number(op.total_value) || 0,
        items: (op.items || []).map((item: any) => ({
          itemName: item.itemName || item.preparationName || 'Unknown',
          itemType:
            item.itemType === 'preparation' ? ('preparation' as const) : ('product' as const),
          quantity: Number(item.quantity) || 0,
          unit: item.unit || '',
          totalCost: Number(item.totalCost) || 0
        }))
      }))
  }

  async function fetchPreparationOperations(
    filters: WriteOffReportFilters
  ): Promise<NormalizedOp[]> {
    let query = supabase
      .from('preparation_operations')
      .select('id, operation_date, department, items, write_off_details, total_value')
      .eq('operation_type', 'write_off')
      .gte('operation_date', `${filters.dateFrom}T00:00:00`)
      .lte('operation_date', `${filters.dateTo}T23:59:59`)
      .order('operation_date', { ascending: false })

    if (filters.department !== 'all') {
      query = query.eq('department', filters.department)
    }

    const { data, error: err } = await query
    if (err) throw err

    return (data || [])
      .filter((op: any) => matchesTypeFilter(op.write_off_details?.reason || '', filters.type))
      .map((op: any) => ({
        id: op.id,
        source: 'preparation' as const,
        operationDate: op.operation_date,
        department: op.department || 'unknown',
        reason: op.write_off_details?.reason || 'other',
        totalValue: Number(op.total_value) || 0,
        items: (op.items || []).map((item: any) => ({
          itemName: item.preparationName || item.itemName || 'Unknown',
          itemType: 'preparation' as const,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || '',
          totalCost: Number(item.totalCost) || 0
        }))
      }))
  }

  function processData(operations: NormalizedOp[]) {
    const dailyMap = new Map<
      string,
      {
        operationsCount: number
        productsValue: number
        preparationsValue: number
        totalValue: number
        reasons: Map<string, number>
        operations: OperationDetail[]
      }
    >()

    const reasonMap = new Map<string, { count: number; totalValue: number }>()
    const allItems: TopItemRow[] = []

    let totalValue = 0
    let kpiValue = 0

    for (const op of operations) {
      const dateStr = new Date(op.operationDate).toISOString().split('T')[0]
      const timeStr = new Date(op.operationDate).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })
      const reason = op.reason
      const affectsKPI =
        isWasteReason(reason) &&
        WRITE_OFF_CLASSIFICATION.KPI_AFFECTING.includes(reason as WriteOffReason)
      const opValue = op.totalValue

      totalValue += opValue
      if (affectsKPI) kpiValue += opValue

      // Daily
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          operationsCount: 0,
          productsValue: 0,
          preparationsValue: 0,
          totalValue: 0,
          reasons: new Map(),
          operations: []
        })
      }
      const day = dailyMap.get(dateStr)!
      day.operationsCount++
      day.totalValue += opValue
      day.reasons.set(reason, (day.reasons.get(reason) || 0) + 1)

      // Operation detail for expandable row
      day.operations.push({
        id: op.id,
        source: op.source,
        time: timeStr,
        reason,
        reasonLabel: getReasonLabel(reason),
        department: op.department,
        totalValue: opValue,
        items: op.items
      })

      // Reason
      if (!reasonMap.has(reason)) {
        reasonMap.set(reason, { count: 0, totalValue: 0 })
      }
      const rm = reasonMap.get(reason)!
      rm.count++
      rm.totalValue += opValue

      // Items
      for (const item of op.items) {
        if (item.itemType === 'preparation') {
          day.preparationsValue += item.totalCost
        } else {
          day.productsValue += item.totalCost
        }

        allItems.push({
          itemName: item.itemName,
          itemType: item.itemType,
          quantity: item.quantity,
          unit: item.unit,
          totalCost: item.totalCost,
          reason,
          reasonLabel: getReasonLabel(reason),
          date: dateStr
        })
      }
    }

    // Build daily rows sorted by date descending
    dailyRows.value = Array.from(dailyMap.entries())
      .map(([date, data]) => {
        let topReason = ''
        let maxCount = 0
        for (const [r, c] of data.reasons) {
          if (c > maxCount) {
            maxCount = c
            topReason = r
          }
        }

        return {
          date,
          operationsCount: data.operationsCount,
          productsValue: data.productsValue,
          preparationsValue: data.preparationsValue,
          totalValue: data.totalValue,
          topReason: getReasonLabel(topReason),
          operations: data.operations.sort((a, b) => a.time.localeCompare(b.time))
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date))

    // Build reason breakdown
    reasonBreakdown.value = Array.from(reasonMap.entries())
      .map(([reason, data]) => ({
        reason,
        reasonLabel: getReasonLabel(reason),
        count: data.count,
        totalValue: data.totalValue,
        percent: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0,
        affectsKPI: WRITE_OFF_CLASSIFICATION.KPI_AFFECTING.includes(reason as WriteOffReason),
        color: getReasonColor(reason)
      }))
      .sort((a, b) => b.totalValue - a.totalValue)

    // Top 5 most expensive items
    topItems.value = allItems.sort((a, b) => b.totalCost - a.totalCost).slice(0, 5)

    // Summary
    const numDays = dailyMap.size || 1
    summary.value = {
      totalValue,
      operationsCount: operations.length,
      kpiValue,
      kpiPercent: totalValue > 0 ? (kpiValue / totalValue) * 100 : 0,
      avgDaily: totalValue / numDays
    }
  }

  function resetData() {
    dailyRows.value = []
    reasonBreakdown.value = []
    topItems.value = []
    summary.value = { totalValue: 0, operationsCount: 0, kpiValue: 0, kpiPercent: 0, avgDaily: 0 }
  }

  return {
    loading,
    error,
    hasLoaded,
    dailyRows,
    reasonBreakdown,
    topItems,
    summary,
    avgDailyValue,
    generateReport,
    getReasonLabel
  }
}
