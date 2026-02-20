import { ref, computed } from 'vue'
import { supabase } from '@/supabase/client'
import {
  WRITE_OFF_REASON_OPTIONS,
  WRITE_OFF_CLASSIFICATION,
  type WriteOffReason
} from '@/stores/storage/types'

// --- Types ---

export interface WriteOffReportFilters {
  dateFrom: string
  dateTo: string
  department: 'kitchen' | 'bar' | 'all'
  type: 'manual' | 'auto' | 'all'
}

export interface DailyWriteOffRow {
  date: string
  operationsCount: number
  productsValue: number
  preparationsValue: number
  totalValue: number
  topReason: string
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
      // Fetch manual write-offs from storage_operations
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

      const { data: manualOps, error: manualErr } = await query

      if (manualErr) throw manualErr

      // Filter by type if needed
      let operations = manualOps || []
      if (filters.type === 'auto') {
        operations = operations.filter((op: any) => {
          const reason = op.write_off_details?.reason
          return reason === 'production_consumption' || reason === 'sales_consumption'
        })
      } else if (filters.type === 'manual') {
        operations = operations.filter((op: any) => {
          const reason = op.write_off_details?.reason
          return reason !== 'production_consumption' && reason !== 'sales_consumption'
        })
      }

      // Process data
      processData(operations, filters)
    } catch (err) {
      console.error('Failed to generate write-off report:', err)
      error.value = err instanceof Error ? err.message : 'Failed to generate report'
      resetData()
    } finally {
      loading.value = false
    }
  }

  function processData(operations: any[], filters: WriteOffReportFilters) {
    // --- Daily aggregation ---
    const dailyMap = new Map<
      string,
      {
        operationsCount: number
        productsValue: number
        preparationsValue: number
        totalValue: number
        reasons: Map<string, number>
      }
    >()

    // --- Reason aggregation ---
    const reasonMap = new Map<string, { count: number; totalValue: number }>()

    // --- All items (for top-5) ---
    const allItems: TopItemRow[] = []

    let totalValue = 0
    let kpiValue = 0

    for (const op of operations) {
      const dateStr = new Date(op.operation_date).toISOString().split('T')[0]
      const reason: string = op.write_off_details?.reason || 'other'
      const affectsKPI = WRITE_OFF_CLASSIFICATION.KPI_AFFECTING.includes(reason as WriteOffReason)
      const opValue = Number(op.total_value) || 0

      totalValue += opValue
      if (affectsKPI) kpiValue += opValue

      // Daily
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          operationsCount: 0,
          productsValue: 0,
          preparationsValue: 0,
          totalValue: 0,
          reasons: new Map()
        })
      }
      const day = dailyMap.get(dateStr)!
      day.operationsCount++
      day.totalValue += opValue
      day.reasons.set(reason, (day.reasons.get(reason) || 0) + 1)

      // Reason
      if (!reasonMap.has(reason)) {
        reasonMap.set(reason, { count: 0, totalValue: 0 })
      }
      const rm = reasonMap.get(reason)!
      rm.count++
      rm.totalValue += opValue

      // Items
      const items: any[] = op.items || []
      for (const item of items) {
        const itemType = item.itemType === 'preparation' ? 'preparation' : 'product'
        const cost = Number(item.totalCost) || 0

        if (itemType === 'preparation') {
          day.preparationsValue += cost
        } else {
          day.productsValue += cost
        }

        allItems.push({
          itemName: item.itemName || 'Unknown',
          itemType,
          quantity: Number(item.quantity) || 0,
          unit: item.unit || '',
          totalCost: cost,
          reason,
          reasonLabel: getReasonLabel(reason),
          date: dateStr
        })
      }
    }

    // Build daily rows sorted by date descending
    dailyRows.value = Array.from(dailyMap.entries())
      .map(([date, data]) => {
        // Find top reason for this day
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
          topReason: getReasonLabel(topReason)
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date))

    // Build reason breakdown
    reasonBreakdown.value = Array.from(reasonMap.entries())
      .map(([reason, data]) => {
        const info = WRITE_OFF_REASON_OPTIONS.find(o => o.value === reason)
        return {
          reason,
          reasonLabel: info?.title || reason,
          count: data.count,
          totalValue: data.totalValue,
          percent: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0,
          affectsKPI: WRITE_OFF_CLASSIFICATION.KPI_AFFECTING.includes(reason as WriteOffReason),
          color: info?.color || 'grey'
        }
      })
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

  function getReasonLabel(reason: string): string {
    const info = WRITE_OFF_REASON_OPTIONS.find(o => o.value === reason)
    return info?.title || reason || '-'
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
    generateReport
  }
}
