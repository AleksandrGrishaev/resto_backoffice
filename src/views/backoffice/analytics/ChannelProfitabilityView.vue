<template>
  <div class="channel-profitability-view">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-4">Channel Profitability</h1>
        </v-col>
      </v-row>

      <!-- Period Selector -->
      <v-row class="mb-4">
        <v-col cols="12" md="3">
          <v-text-field
            v-model="selectedMonth"
            label="Month"
            type="month"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-btn
            color="primary"
            size="large"
            :loading="loading"
            :disabled="!selectedMonth"
            block
            @click="loadData"
          >
            Load Report
          </v-btn>
        </v-col>
      </v-row>

      <!-- Error -->
      <v-row v-if="error">
        <v-col cols="12">
          <v-alert type="error" variant="tonal" closable @click:close="error = null">
            {{ error }}
          </v-alert>
        </v-col>
      </v-row>

      <!-- Loading -->
      <v-row v-if="loading">
        <v-col cols="12" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" size="48" />
        </v-col>
      </v-row>

      <!-- Report Content -->
      <template v-if="channels.length > 0 && !loading">
        <!-- Summary Cards -->
        <v-row class="mb-6">
          <v-col v-for="ch in channels" :key="ch.channel" cols="12" md="4">
            <v-card :color="channelColor(ch.channel)" variant="tonal">
              <v-card-text>
                <div class="d-flex align-center mb-2">
                  <v-icon :icon="channelIcon(ch.channel)" class="me-2" />
                  <span class="text-h6">{{ channelLabel(ch.channel) }}</span>
                </div>
                <div class="text-h5 mb-1">{{ formatIDR(ch.revenue_net) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ ch.orders_count }} orders | {{ ch.items_sold }} items
                </div>
                <v-chip
                  :color="
                    ch.net_margin_pct >= 30
                      ? 'success'
                      : ch.net_margin_pct >= 15
                        ? 'warning'
                        : 'error'
                  "
                  size="small"
                  class="mt-2"
                >
                  Net Margin: {{ ch.net_margin_pct }}%
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- REVENUE -->
        <v-card class="mb-6">
          <v-card-title class="text-primary">
            Revenue — {{ formatMonth(selectedMonth) }}
          </v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <v-table density="comfortable" class="pnl-table">
              <thead>
                <tr>
                  <th class="text-left" style="width: 24%"></th>
                  <th v-for="ch in channels" :key="ch.channel" class="text-right">
                    <div class="d-flex align-center justify-end ga-1">
                      <v-icon :icon="channelIcon(ch.channel)" size="small" />
                      {{ channelLabel(ch.channel) }}
                    </div>
                  </th>
                  <th class="text-right font-weight-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-medium-emphasis">Orders</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right">
                    {{ ch.orders_count }}
                  </td>
                  <td class="text-right font-weight-bold">{{ totals.orders_count }}</td>
                </tr>
                <tr>
                  <td class="text-medium-emphasis">Items Sold</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right">
                    {{ ch.items_sold }}
                  </td>
                  <td class="text-right font-weight-bold">{{ totals.items_sold }}</td>
                </tr>
                <tr>
                  <td>Gross Revenue</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right">
                    {{ formatIDR(ch.revenue_gross) }}
                  </td>
                  <td class="text-right font-weight-bold">{{ formatIDR(totals.revenue_gross) }}</td>
                </tr>
                <tr>
                  <td class="pl-6 text-error">Discounts</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right text-error">
                    -{{ formatIDR(ch.total_discounts) }}
                  </td>
                  <td class="text-right font-weight-bold text-error">
                    -{{ formatIDR(totals.total_discounts) }}
                  </td>
                </tr>
                <tr>
                  <td class="pl-6 text-error">Tax</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right text-error">
                    -{{ formatIDR(ch.tax_collected) }}
                  </td>
                  <td class="text-right font-weight-bold text-error">
                    -{{ formatIDR(totals.tax_collected) }}
                  </td>
                </tr>
                <tr>
                  <td class="pl-6 text-error">Platform Commission</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right text-error">
                    -{{ formatIDR(ch.commission) }}
                  </td>
                  <td class="text-right font-weight-bold text-error">
                    -{{ formatIDR(totals.commission) }}
                  </td>
                </tr>
                <tr>
                  <td class="pl-6 text-error">Marketing</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right text-error">
                    -{{ formatIDR(ch.marketing_cost) }}
                  </td>
                  <td class="text-right font-weight-bold text-error">
                    -{{ formatIDR(totals.marketing_cost) }}
                  </td>
                </tr>
                <tr class="subtotal-row">
                  <td class="font-weight-bold">Net Revenue</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right font-weight-bold">
                    {{ formatIDR(ch.revenue_net) }}
                  </td>
                  <td class="text-right font-weight-bold">{{ formatIDR(totals.revenue_net) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>

        <!-- COST OF GOODS -->
        <v-card class="mb-6">
          <v-card-title class="text-warning">Cost of Goods</v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <v-table density="comfortable" class="pnl-table">
              <thead>
                <tr>
                  <th class="text-left" style="width: 24%"></th>
                  <th v-for="ch in channels" :key="ch.channel" class="text-right">
                    {{ channelLabel(ch.channel) }}
                  </th>
                  <th class="text-right font-weight-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Food Cost</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right">
                    {{ formatIDR(ch.food_cost) }}
                  </td>
                  <td class="text-right font-weight-bold">{{ formatIDR(totals.food_cost) }}</td>
                </tr>
                <tr>
                  <td>Food Cost % of Net Revenue</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right">
                    <v-chip
                      :color="
                        ch.food_cost_pct <= 35
                          ? 'success'
                          : ch.food_cost_pct <= 45
                            ? 'warning'
                            : 'error'
                      "
                      size="small"
                    >
                      {{ ch.food_cost_pct }}%
                    </v-chip>
                  </td>
                  <td class="text-right">
                    <v-chip
                      :color="
                        totals.food_cost_pct <= 35
                          ? 'success'
                          : totals.food_cost_pct <= 45
                            ? 'warning'
                            : 'error'
                      "
                      size="small"
                    >
                      {{ totals.food_cost_pct }}%
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>

        <!-- NET PROFIT -->
        <v-card class="mb-6">
          <v-card-text class="pa-0">
            <v-table density="comfortable" class="pnl-table">
              <thead>
                <tr>
                  <th class="text-left" style="width: 24%"></th>
                  <th v-for="ch in channels" :key="ch.channel" class="text-right">
                    {{ channelLabel(ch.channel) }}
                  </th>
                  <th class="text-right font-weight-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="text-h6 font-weight-bold">Net Profit</td>
                  <td
                    v-for="ch in channels"
                    :key="ch.channel"
                    class="text-right text-h6 font-weight-bold"
                    :class="ch.net_profit >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ formatIDR(ch.net_profit) }}
                  </td>
                  <td
                    class="text-right text-h6 font-weight-bold"
                    :class="totals.net_profit >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ formatIDR(totals.net_profit) }}
                  </td>
                </tr>
                <tr>
                  <td class="font-weight-bold">Net Margin</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right">
                    <v-chip
                      :color="
                        ch.net_margin_pct >= 30
                          ? 'success'
                          : ch.net_margin_pct >= 15
                            ? 'warning'
                            : 'error'
                      "
                      size="small"
                    >
                      {{ ch.net_margin_pct }}%
                    </v-chip>
                  </td>
                  <td class="text-right">
                    <v-chip
                      :color="
                        totals.net_margin_pct >= 30
                          ? 'success'
                          : totals.net_margin_pct >= 15
                            ? 'warning'
                            : 'error'
                      "
                      size="small"
                    >
                      {{ totals.net_margin_pct }}%
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>

        <!-- UNIT ECONOMICS -->
        <v-card class="mb-6">
          <v-card-title class="text-info">Unit Economics</v-card-title>
          <v-divider />
          <v-card-text class="pa-0">
            <v-table density="comfortable" class="pnl-table">
              <thead>
                <tr>
                  <th class="text-left" style="width: 24%"></th>
                  <th v-for="ch in channels" :key="ch.channel" class="text-right">
                    {{ channelLabel(ch.channel) }}
                  </th>
                  <th class="text-right font-weight-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Avg Order Value</td>
                  <td v-for="ch in channels" :key="ch.channel" class="text-right">
                    {{ formatIDR(ch.orders_count > 0 ? ch.revenue_net / ch.orders_count : 0) }}
                  </td>
                  <td class="text-right font-weight-bold">
                    {{
                      formatIDR(
                        totals.orders_count > 0 ? totals.revenue_net / totals.orders_count : 0
                      )
                    }}
                  </td>
                </tr>
                <tr>
                  <td>Avg Profit / Order</td>
                  <td
                    v-for="ch in channels"
                    :key="ch.channel"
                    class="text-right"
                    :class="ch.net_profit >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ formatIDR(ch.orders_count > 0 ? ch.net_profit / ch.orders_count : 0) }}
                  </td>
                  <td
                    class="text-right font-weight-bold"
                    :class="totals.net_profit >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{
                      formatIDR(
                        totals.orders_count > 0 ? totals.net_profit / totals.orders_count : 0
                      )
                    }}
                  </td>
                </tr>
                <tr>
                  <td>Avg Profit / Item</td>
                  <td
                    v-for="ch in channels"
                    :key="ch.channel"
                    class="text-right"
                    :class="ch.net_profit >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ formatIDR(ch.items_sold > 0 ? ch.net_profit / ch.items_sold : 0) }}
                  </td>
                  <td
                    class="text-right font-weight-bold"
                    :class="totals.net_profit >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{
                      formatIDR(totals.items_sold > 0 ? totals.net_profit / totals.items_sold : 0)
                    }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>

        <!-- Monthly Trend -->
        <v-card v-if="allData.length > channels.length">
          <v-card-title>Monthly Trend</v-card-title>
          <v-divider />
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th class="text-left">Period</th>
                  <th class="text-left">Channel</th>
                  <th class="text-right">Net Revenue</th>
                  <th class="text-right">Food Cost %</th>
                  <th class="text-right">Net Profit</th>
                  <th class="text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in allData" :key="`${row.period}-${row.channel}`">
                  <td>{{ formatMonth(row.period) }}</td>
                  <td>
                    <v-chip :color="channelColor(row.channel)" size="x-small" variant="flat">
                      {{ channelLabel(row.channel) }}
                    </v-chip>
                  </td>
                  <td class="text-right">{{ formatIDR(row.revenue_net) }}</td>
                  <td class="text-right">{{ row.food_cost_pct }}%</td>
                  <td
                    class="text-right"
                    :class="row.net_profit >= 0 ? 'text-success' : 'text-error'"
                  >
                    {{ formatIDR(row.net_profit) }}
                  </td>
                  <td class="text-right">
                    <v-chip
                      :color="
                        row.net_margin_pct >= 30
                          ? 'success'
                          : row.net_margin_pct >= 15
                            ? 'warning'
                            : 'error'
                      "
                      size="x-small"
                    >
                      {{ row.net_margin_pct }}%
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </template>

      <!-- Empty State -->
      <v-row v-if="!loading && channels.length === 0 && !error">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-bar</v-icon>
              <div class="text-h6 text-medium-emphasis">No Data</div>
              <div class="text-body-2 text-medium-emphasis">
                Select a month and click "Load Report" to view channel profitability
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { formatIDR } from '@/utils/currency'

interface ChannelRow {
  channel: string
  period: string
  orders_count: number
  items_sold: number
  revenue_gross: number
  revenue_net: number
  total_discounts: number
  tax_collected: number
  food_cost: number
  commission: number
  marketing_cost: number
  net_profit: number
  food_cost_pct: number
  net_margin_pct: number
}

// State
const selectedMonth = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const channels = ref<ChannelRow[]>([])
const allData = ref<ChannelRow[]>([])

const totals = computed<ChannelRow>(() => {
  const sum = (fn: (c: ChannelRow) => number) => channels.value.reduce((s, c) => s + fn(c), 0)
  const revNet = sum(c => c.revenue_net)
  const foodCost = sum(c => c.food_cost)
  const netProfit = sum(c => c.net_profit)
  return {
    channel: 'total',
    period: '',
    orders_count: sum(c => c.orders_count),
    items_sold: sum(c => c.items_sold),
    revenue_gross: sum(c => c.revenue_gross),
    revenue_net: revNet,
    total_discounts: sum(c => c.total_discounts),
    tax_collected: sum(c => c.tax_collected),
    food_cost: foodCost,
    commission: sum(c => c.commission),
    marketing_cost: sum(c => c.marketing_cost),
    net_profit: netProfit,
    food_cost_pct: revNet > 0 ? Math.round((foodCost / revNet) * 1000) / 10 : 0,
    net_margin_pct: revNet > 0 ? Math.round((netProfit / revNet) * 1000) / 10 : 0
  }
})

// Lifecycle
onMounted(() => {
  const now = new Date()
  selectedMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  loadData()
})

// Methods
async function loadData() {
  if (!selectedMonth.value) return

  try {
    loading.value = true
    error.value = null

    const [year, month] = selectedMonth.value.split('-')
    const periodStart = `${year}-${month}-01`

    const sixMonthsAgo = new Date(parseInt(year), parseInt(month) - 7, 1)
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0]

    const { data, error: dbError } = await supabase
      .from('v_channel_profitability')
      .select('*')
      .gte('period', sixMonthsAgoStr)
      .order('period', { ascending: false })

    if (dbError) throw dbError

    const parsed: ChannelRow[] = (data || []).map((row: any) => ({
      channel: row.channel,
      period: row.period,
      orders_count: Number(row.orders_count),
      items_sold: Number(row.items_sold),
      revenue_gross: Number(row.revenue_gross),
      revenue_net: Number(row.revenue_net),
      total_discounts: Number(row.total_discounts),
      tax_collected: Number(row.tax_collected),
      food_cost: Number(row.food_cost),
      commission: Number(row.commission),
      marketing_cost: Number(row.marketing_cost),
      net_profit: Number(row.net_profit),
      food_cost_pct: Number(row.food_cost_pct),
      net_margin_pct: Number(row.net_margin_pct)
    }))

    allData.value = parsed
    channels.value = parsed.filter(r => r.period.startsWith(periodStart))

    const order = { cafe: 0, gobiz: 1, grab: 2 }
    channels.value.sort(
      (a, b) =>
        (order[a.channel as keyof typeof order] ?? 99) -
        (order[b.channel as keyof typeof order] ?? 99)
    )
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data'
  } finally {
    loading.value = false
  }
}

function channelLabel(code: string): string {
  const labels: Record<string, string> = { cafe: 'Cafe', gobiz: 'GoFood', grab: 'Grab' }
  return labels[code] || code
}

function channelIcon(code: string): string {
  const icons: Record<string, string> = {
    cafe: 'mdi-silverware-fork-knife',
    gobiz: 'mdi-moped',
    grab: 'mdi-car'
  }
  return icons[code] || 'mdi-store'
}

function channelColor(code: string): string {
  const colors: Record<string, string> = { cafe: 'primary', gobiz: 'success', grab: 'warning' }
  return colors[code] || 'grey'
}

function formatMonth(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
</script>

<style scoped lang="scss">
.channel-profitability-view {
  .pnl-table {
    tr.subtotal-row td {
      border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    }

    // Total column highlight
    thead th:last-child,
    tbody td:last-child {
      background-color: rgba(var(--v-theme-on-surface), 0.03);
    }

    tbody tr:hover {
      background-color: rgba(var(--v-theme-on-surface), 0.04) !important;
    }
  }
}
</style>
