<!-- src/views/kitchen/kpi/components/CancellationsKpiTab.vue -->
<!-- Monthly cancelled items list with staff-on-shift info -->
<template>
  <v-card class="cancellations-kpi-tab" flat>
    <v-card-title class="pa-0 d-flex align-center">
      <v-icon start size="20" color="error">mdi-cancel</v-icon>
      <span class="text-subtitle-1 font-weight-bold">Cancelled Items — {{ monthLabel }}</span>
      <v-spacer />
      <v-chip size="small" variant="tonal" :color="totalPenalty > 0 ? 'error' : 'success'">
        {{ items.length }} items · {{ formatIDR(totalPenalty) }}
      </v-chip>
    </v-card-title>

    <v-card-text class="pa-0 mt-3">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <v-progress-circular indeterminate size="32" />
        <p class="text-medium-emphasis mt-2">Loading cancellations...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="items.length === 0" class="empty-state">
        <v-icon size="48" color="success">mdi-check-circle-outline</v-icon>
        <p class="text-medium-emphasis mt-2">No kitchen mistake cancellations this month</p>
      </div>

      <!-- Table -->
      <v-table v-else class="cancellations-table" density="compact">
        <thead>
          <tr>
            <th class="text-left">Date</th>
            <th class="text-left">Item</th>
            <th class="text-center">Dept</th>
            <th class="text-right">Price</th>
            <th class="text-left">Staff on Shift</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td class="date-cell">{{ formatDate(item.cancelledAt) }}</td>
            <td class="product-cell">
              {{ item.productName }}
              <span v-if="item.variantName" class="text-medium-emphasis">
                ({{ item.variantName }})
              </span>
              <span v-if="item.quantity > 1" class="text-medium-emphasis">
                ×{{ item.quantity }}
              </span>
            </td>
            <td class="text-center">
              <v-chip
                size="x-small"
                :color="item.department === 'bar' ? 'purple' : 'orange'"
                variant="tonal"
              >
                {{ item.department === 'bar' ? 'Bar' : 'Kitchen' }}
              </v-chip>
            </td>
            <td class="text-right price-cell">{{ formatIDR(item.totalPrice) }}</td>
            <td>
              <template v-if="item.staffOnShift.length > 0">
                <v-chip
                  v-for="s in item.staffOnShift"
                  :key="s.id"
                  size="x-small"
                  variant="outlined"
                  class="mr-1 mb-1"
                >
                  {{ s.name }}
                </v-chip>
              </template>
              <span v-else class="text-medium-emphasis font-italic">No data</span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="totals-row">
            <td colspan="3" class="text-right font-weight-bold">Total:</td>
            <td class="text-right font-weight-bold price-cell">
              {{ formatIDR(totalPenalty) }}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '@/supabase/client'
import { formatIDR, DebugUtils } from '@/utils'

const MODULE = 'CancellationsKpiTab'

const props = defineProps<{
  department: 'all' | 'kitchen' | 'bar'
}>()

interface StaffInfo {
  id: string
  name: string
}

interface CancelledItem {
  id: string
  productName: string
  variantName: string | null
  quantity: number
  totalPrice: number
  department: string
  reason: string
  cancelledAt: string
  cancelledBy: string
  staffOnShift: StaffInfo[]
}

const loading = ref(false)
const items = ref<CancelledItem[]>([])

const now = new Date()
const year = now.getFullYear()
const month = now.getMonth() + 1

const monthLabel = computed(() => {
  return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const totalPenalty = computed(() => {
  return items.value.reduce((sum, item) => sum + item.totalPrice, 0)
})

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function loadCancellations() {
  loading.value = true
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`

    // 1. Fetch cancelled items
    let query = supabase
      .from('order_items')
      .select(
        'id, menu_item_name, variant_name, quantity, total_price, department, cancellation_reason, cancelled_at, cancelled_by, order_id'
      )
      .eq('status', 'cancelled')
      .eq('cancellation_reason', 'kitchen_mistake')
      .gte('cancelled_at', startDate)
      .lte('cancelled_at', endDate)
      .order('cancelled_at', { ascending: false })

    if (props.department !== 'all') {
      query = query.eq('department', props.department)
    }

    const { data: cancelledRows, error: cancelErr } = await query

    if (cancelErr) {
      DebugUtils.error(MODULE, 'Failed to fetch cancellations', { error: cancelErr })
      return
    }

    if (!cancelledRows || cancelledRows.length === 0) {
      items.value = []
      return
    }

    // 2. Collect unique dates to fetch staff work logs
    const dateSet = new Set<string>()
    for (const row of cancelledRows) {
      if (row.cancelled_at) {
        dateSet.add(row.cancelled_at.slice(0, 10))
      }
    }
    const uniqueDates = Array.from(dateSet)

    // 3. Fetch staff members for department(s)
    const departments = props.department === 'all' ? ['kitchen', 'bar'] : [props.department]
    const { data: staffMembers } = await supabase
      .from('staff_members')
      .select('id, name, department')
      .in('department', departments)
      .eq('is_active', true)

    // 4. Fetch work logs for those dates
    const { data: workLogs, error: wlErr } = await supabase
      .from('staff_work_logs')
      .select('staff_id, work_date')
      .in('work_date', uniqueDates)

    if (wlErr) {
      DebugUtils.warn(MODULE, 'Failed to fetch work logs, showing without staff data', {
        error: wlErr
      })
    }

    // 5. Build staff lookup and date+department -> staff[] map
    const staffById = new Map<string, { id: string; name: string; department: string }>()
    if (staffMembers) {
      for (const sm of staffMembers) {
        staffById.set(sm.id, { id: sm.id, name: sm.name, department: sm.department })
      }
    }

    const staffMap = new Map<string, StaffInfo[]>()
    if (workLogs) {
      for (const log of workLogs) {
        const sm = staffById.get(log.staff_id)
        if (!sm) continue
        const key = `${log.work_date}|${sm.department}`
        if (!staffMap.has(key)) staffMap.set(key, [])
        const arr = staffMap.get(key)!
        if (!arr.some(s => s.id === sm.id)) {
          arr.push({ id: sm.id, name: sm.name })
        }
      }
    }

    // 5. Map to display items
    items.value = cancelledRows.map(row => {
      const dateKey = row.cancelled_at?.slice(0, 10) || ''
      const dept = row.department || 'kitchen'
      const staffKey = `${dateKey}|${dept}`

      return {
        id: row.id,
        productName: row.menu_item_name || 'Unknown',
        variantName: row.variant_name,
        quantity: row.quantity || 1,
        totalPrice: Number(row.total_price) || 0,
        department: dept,
        reason: row.cancellation_reason || 'other',
        cancelledAt: row.cancelled_at || '',
        cancelledBy: row.cancelled_by || '',
        staffOnShift: staffMap.get(staffKey) || []
      }
    })

    DebugUtils.info(MODULE, 'Loaded cancellations', {
      count: items.value.length,
      total: totalPenalty.value,
      staffDays: staffMap.size
    })
  } catch (err) {
    DebugUtils.error(MODULE, 'Error loading cancellations', { error: err })
  } finally {
    loading.value = false
  }
}

watch(
  () => props.department,
  () => loadCancellations()
)

onMounted(() => loadCancellations())
</script>

<style scoped lang="scss">
.cancellations-kpi-tab {
  background: transparent;
  padding: 0;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
}

.cancellations-table {
  background: transparent !important;

  th {
    font-size: 11px !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.5) !important;
    white-space: nowrap;
  }

  td {
    font-size: 13px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  }
}

.date-cell {
  white-space: nowrap;
  font-size: 12px !important;
  color: rgba(255, 255, 255, 0.6);
}

.product-cell {
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-cell {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.totals-row {
  td {
    border-top: 2px solid rgba(255, 255, 255, 0.15) !important;
    padding-top: 8px;
  }
}
</style>
