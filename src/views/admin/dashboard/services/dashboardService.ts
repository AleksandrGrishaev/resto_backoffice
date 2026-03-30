// src/views/admin/dashboard/services/dashboardService.ts

import { supabase } from '@/supabase/client'
import { TimeUtils } from '@/utils'
import type {
  DashboardData,
  DateRange,
  DaySummary,
  HourlySale,
  StaffHourly,
  WriteOffSummary,
  PaymentBreakdown,
  DepartmentSale,
  DepartmentRevenue,
  ChannelSale,
  LoyaltySale
} from '../types'

/**
 * Fetch all dashboard data for a given date range.
 * Optimized: merges queries to the same table/view.
 * Total: ~7 Supabase calls instead of 15.
 */
export async function fetchDashboardData(range: DateRange): Promise<DashboardData> {
  const prevRange = getPreviousPeriod(range)

  // Merge date ranges for v_daily_sales: fetch both current + prev in one call
  const widerDailySalesRange: DateRange = { from: prevRange.from, to: range.to }

  const [
    dailySalesRows,
    prevFoodCost,
    currFoodCost,
    salesTxRows,
    ordersData,
    staffData,
    writeOffs
  ] = await Promise.all([
    // 1. v_daily_sales — one query for summary + payments + channels (current + prev)
    fetchDailySalesRaw(widerDailySalesRange),
    // 2-3. v_food_cost_report — current + prev (small, keep separate)
    fetchFoodCostAgg(prevRange),
    fetchFoodCostAgg(range),
    // 4. sales_transactions — one query for hourly + dept + revenue-by-dept
    fetchSalesTransactionsRaw(range),
    // 5. orders + customers — one query for guests + loyalty
    fetchOrdersWithCustomers(range, prevRange),
    // 6. staff_work_logs with join — one query
    fetchStaffData(range),
    // 7. recipe_write_offs
    fetchWriteOffs(range)
  ])

  // Derive data from merged results
  const currentDailySales = dailySalesRows.filter(
    r => r.sale_date >= range.from && r.sale_date <= range.to
  )
  const prevDailySales = dailySalesRows.filter(
    r => r.sale_date >= prevRange.from && r.sale_date <= prevRange.to
  )

  const summary = buildSummary(
    currentDailySales,
    prevDailySales,
    ordersData.currentGuests,
    ordersData.prevGuests,
    currFoodCost,
    prevFoodCost
  )
  const hourlySales = buildHourlySales(salesTxRows)
  const departmentSales = buildDepartmentSales(salesTxRows)
  const revenueByDepartment = buildRevenueByDepartment(salesTxRows)
  const paymentMethods = buildPaymentMethods(currentDailySales)
  const channelSales = buildChannelSales(currentDailySales)
  const loyaltySales = ordersData.loyaltySales
  const staffByHour = buildStaffByHour(staffData, range)

  return {
    summary,
    hourlySales,
    staffByHour,
    writeOffs,
    paymentMethods,
    departmentSales,
    revenueByDepartment,
    channelSales,
    loyaltySales
  }
}

// --- Shared types for raw rows ---

interface DailySalesRow {
  sale_date: string
  channel: string
  gross_revenue: number
  net_revenue: number
  total_orders: number
  total_discounts: number
  total_tax: number
  cash_total: number
  card_total: number
  qr_total: number
}

interface SalesTxRow {
  sold_at: string
  department: string
  total_price: number
  quantity: number
}

// --- Helpers ---

function getPreviousPeriod(range: DateRange): DateRange {
  const from = new Date(range.from + 'T12:00:00')
  const to = new Date(range.to + 'T12:00:00')
  const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1

  const prevTo = new Date(from)
  prevTo.setDate(prevTo.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevFrom.getDate() - days + 1)

  return { from: fmtDate(prevFrom), to: fmtDate(prevTo) }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getNextDay(date: string): string {
  const d = new Date(date + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return fmtDate(d)
}

// =============================================
// RAW DATA FETCHERS (one per table/view)
// =============================================

/** Fetch v_daily_sales rows for a date range */
async function fetchDailySalesRaw(range: DateRange): Promise<DailySalesRow[]> {
  const { data, error } = await supabase
    .from('v_daily_sales' as any)
    .select(
      'sale_date, channel, gross_revenue, net_revenue, total_orders, total_discounts, total_tax, cash_total, card_total, qr_total'
    )
    .gte('sale_date', range.from)
    .lte('sale_date', range.to)

  if (error || !data?.length) return []

  return (data as any[]).map(r => ({
    sale_date: r.sale_date,
    channel: r.channel || 'direct',
    gross_revenue: Number(r.gross_revenue) || 0,
    net_revenue: Number(r.net_revenue) || 0,
    total_orders: Number(r.total_orders) || 0,
    total_discounts: Number(r.total_discounts) || 0,
    total_tax: Number(r.total_tax) || 0,
    cash_total: Number(r.cash_total) || 0,
    card_total: Number(r.card_total) || 0,
    qr_total: Number(r.qr_total) || 0
  }))
}

/** Fetch all sales_transactions for a date range — used for hourly, dept, revenue charts */
async function fetchSalesTransactionsRaw(range: DateRange): Promise<SalesTxRow[]> {
  const startISO = TimeUtils.getStartOfDay(range.from)
  const endISO = TimeUtils.getStartOfDay(getNextDay(range.to))

  // For large date ranges, we need all rows for accurate aggregation
  // Fetch in pages if needed
  const allRows: SalesTxRow[] = []
  let offset = 0
  // PostgREST default max is 1000 rows per request
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('sales_transactions')
      .select('sold_at, department, total_price, quantity')
      .gte('sold_at', startISO)
      .lt('sold_at', endISO)
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.warn('Failed to fetch sales transactions:', error)
      break
    }

    if (!data?.length) break

    for (const t of data as any[]) {
      allRows.push({
        sold_at: t.sold_at,
        department: t.department || 'other',
        total_price: Number(t.total_price) || 0,
        quantity: Number(t.quantity) || 0
      })
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  return allRows
}

/** Fetch orders with customer data — for guests + loyalty */
async function fetchOrdersWithCustomers(
  range: DateRange,
  prevRange: DateRange
): Promise<{
  currentGuests: { totalGuests: number; avgCheckPerGuest: number }
  prevGuests: { totalGuests: number; avgCheckPerGuest: number }
  loyaltySales: LoyaltySale[]
}> {
  // Fetch orders for both current and prev period
  const widerStart = TimeUtils.getStartOfDay(prevRange.from)
  const widerEnd = TimeUtils.getStartOfDay(getNextDay(range.to))

  const { data: orders, error } = await supabase
    .from('orders')
    .select('created_at, customer_id, stamp_card_id, final_amount, guest_count, status')
    .gte('created_at', widerStart)
    .lt('created_at', widerEnd)
    .neq('status', 'cancelled')

  if (error || !orders?.length) {
    const empty = { totalGuests: 0, avgCheckPerGuest: 0 }
    return { currentGuests: empty, prevGuests: empty, loyaltySales: [] }
  }

  // Split by period using timezone-aware date
  const rangeStart = TimeUtils.getStartOfDay(range.from)
  const rangeEnd = TimeUtils.getStartOfDay(getNextDay(range.to))
  const prevStart = TimeUtils.getStartOfDay(prevRange.from)
  const prevEnd = TimeUtils.getStartOfDay(getNextDay(prevRange.to))

  const currentOrders = (orders as any[]).filter(
    o => o.created_at >= rangeStart && o.created_at < rangeEnd
  )
  const prevOrders = (orders as any[]).filter(
    o => o.created_at >= prevStart && o.created_at < prevEnd
  )

  const calcGuests = (list: any[]) => {
    const withGuests = list.filter(o => Number(o.guest_count) > 0)
    const totalGuests = withGuests.reduce((sum, o) => sum + (Number(o.guest_count) || 0), 0)
    const totalAmount = withGuests.reduce((sum, o) => sum + (Number(o.final_amount) || 0), 0)
    return {
      totalGuests,
      avgCheckPerGuest: totalGuests > 0 ? Math.round(totalAmount / totalGuests) : 0
    }
  }

  // Loyalty breakdown (current period only)
  const customerIds = [...new Set(currentOrders.filter(o => o.customer_id).map(o => o.customer_id))]

  let customerMap = new Map<string, string>()
  if (customerIds.length > 0) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id, loyalty_program')
      .in('id', customerIds)

    if (customers) {
      customerMap = new Map((customers as any[]).map(c => [c.id, c.loyalty_program || 'cashback']))
    }
  }

  // 3 buckets: anonymous (no customer), stamp_card, cashback
  const buckets = {
    anonymous: { orders: 0, revenue: 0, guests: 0 },
    cashback: { orders: 0, revenue: 0, guests: 0 },
    stamp_card: { orders: 0, revenue: 0, guests: 0 }
  }

  for (const order of currentOrders) {
    const revenue = Number(order.final_amount) || 0
    const guests = Number(order.guest_count) || 0

    if (!order.customer_id) {
      buckets.anonymous.orders++
      buckets.anonymous.revenue += revenue
      buckets.anonymous.guests += guests
    } else if (order.stamp_card_id || customerMap.get(order.customer_id) === 'stamps') {
      buckets.stamp_card.orders++
      buckets.stamp_card.revenue += revenue
      buckets.stamp_card.guests += guests
    } else {
      buckets.cashback.orders++
      buckets.cashback.revenue += revenue
      buckets.cashback.guests += guests
    }
  }

  const loyaltySales = (
    Object.entries(buckets) as [keyof typeof buckets, typeof buckets.anonymous][]
  )
    .map(([type, v]) => ({ type, ...v }))
    .filter(l => l.orders > 0)

  return {
    currentGuests: calcGuests(currentOrders),
    prevGuests: calcGuests(prevOrders),
    loyaltySales
  }
}

/** Fetch staff work logs with department info */
async function fetchStaffData(
  range: DateRange
): Promise<{ staffId: string; department: string; timeSlots: any[] }[]> {
  const { data: logs, error } = await supabase
    .from('staff_work_logs')
    .select('staff_id, time_slots, hours_worked')
    .gte('work_date', range.from)
    .lte('work_date', range.to)
    .gt('hours_worked', 0)

  if (error || !logs?.length) return []

  const staffIds = [...new Set((logs as any[]).map(l => l.staff_id))]
  const { data: staff } = await supabase
    .from('staff_members')
    .select('id, department')
    .in('id', staffIds)

  const deptMap = new Map(((staff as any[]) || []).map(s => [s.id, s.department || 'service']))

  return (logs as any[]).map(l => ({
    staffId: l.staff_id,
    department: deptMap.get(l.staff_id) || 'service',
    timeSlots:
      Array.isArray(l.time_slots) && l.time_slots.length > 0
        ? l.time_slots
        : buildFallbackSlots(Number(l.hours_worked) || 0)
  }))
}

/** Generate approximate time slots when time_slots is null but hours_worked is known.
 *  Assumes a typical restaurant shift starting at 09:00. */
function buildFallbackSlots(hours: number): any[] {
  if (hours <= 0) return []
  const startHour = 9
  const endHour = Math.min(startHour + Math.round(hours), 24)
  return [
    {
      startTime: `${String(startHour).padStart(2, '0')}:00`,
      endTime: `${String(endHour).padStart(2, '0')}:00`
    }
  ]
}

/** Fetch food cost aggregation for a date range */
async function fetchFoodCostAgg(range: DateRange): Promise<{ total: number; percent: number }> {
  const { data, error } = await supabase
    .from('v_food_cost_report' as any)
    .select('total_food_cost, total_revenue_net')
    .gte('sale_date', range.from)
    .lte('sale_date', range.to)

  if (error || !data?.length) return { total: 0, percent: 0 }

  const totalCost = (data as any[]).reduce((sum, r) => sum + (Number(r.total_food_cost) || 0), 0)
  const totalRevenue = (data as any[]).reduce(
    (sum, r) => sum + (Number(r.total_revenue_net) || 0),
    0
  )

  return {
    total: totalCost,
    percent: totalRevenue > 0 ? Math.round((totalCost / totalRevenue) * 1000) / 10 : 0
  }
}

/** Fetch write-offs */
async function fetchWriteOffs(range: DateRange): Promise<WriteOffSummary> {
  const startISO = TimeUtils.getStartOfDay(range.from)
  const endISO = TimeUtils.getStartOfDay(getNextDay(range.to))

  const { data, error } = await supabase
    .from('recipe_write_offs')
    .select('operation_type, department')
    .gte('performed_at', startISO)
    .lt('performed_at', endISO)

  if (error || !data?.length) {
    return { total: 0, byType: [], byDepartment: [] }
  }

  const typeCount = new Map<string, number>()
  const deptCount = new Map<string, number>()

  for (const row of data as any[]) {
    const t = row.operation_type || 'unknown'
    const d = row.department || 'unknown'
    typeCount.set(t, (typeCount.get(t) || 0) + 1)
    deptCount.set(d, (deptCount.get(d) || 0) + 1)
  }

  return {
    total: data.length,
    byType: Array.from(typeCount.entries()).map(([type, count]) => ({ type, count })),
    byDepartment: Array.from(deptCount.entries()).map(([department, count]) => ({
      department,
      count
    }))
  }
}

// =============================================
// BUILDERS (derive widget data from raw rows)
// =============================================

function buildSummary(
  current: DailySalesRow[],
  prev: DailySalesRow[],
  currentGuests: { totalGuests: number; avgCheckPerGuest: number },
  prevGuests: { totalGuests: number; avgCheckPerGuest: number },
  currFoodCost: { total: number; percent: number },
  prevFoodCost: { total: number; percent: number }
): DaySummary {
  const sumRows = (rows: DailySalesRow[]) =>
    rows.reduce(
      (acc, r) => ({
        grossRevenue: acc.grossRevenue + r.gross_revenue,
        netRevenue: acc.netRevenue + r.net_revenue,
        totalOrders: acc.totalOrders + r.total_orders,
        totalDiscounts: acc.totalDiscounts + r.total_discounts,
        totalTax: acc.totalTax + r.total_tax
      }),
      { grossRevenue: 0, netRevenue: 0, totalOrders: 0, totalDiscounts: 0, totalTax: 0 }
    )

  const curr = sumRows(current)
  const previous = sumRows(prev)

  const calcDelta = (c: number, p: number): number | null =>
    p > 0 ? Math.round(((c - p) / p) * 1000) / 10 : null

  return {
    grossRevenue: curr.grossRevenue,
    netRevenue: curr.netRevenue,
    totalOrders: curr.totalOrders,
    totalGuests: currentGuests.totalGuests,
    avgCheckPerGuest: currentGuests.avgCheckPerGuest,
    foodCostPercent: currFoodCost.percent,
    totalFoodCost: currFoodCost.total,
    totalDiscounts: curr.totalDiscounts,
    totalTax: curr.totalTax,
    revenueDelta: calcDelta(curr.grossRevenue, previous.grossRevenue),
    ordersDelta: calcDelta(curr.totalOrders, previous.totalOrders),
    avgCheckDelta: calcDelta(currentGuests.avgCheckPerGuest, prevGuests.avgCheckPerGuest),
    foodCostDelta:
      prevFoodCost.percent > 0
        ? Math.round((currFoodCost.percent - prevFoodCost.percent) * 10) / 10
        : null
  }
}

function buildHourlySales(rows: SalesTxRow[]): HourlySale[] {
  const hourMap = new Map<number, { revenue: number; items: number }>()

  for (const t of rows) {
    const localTime = TimeUtils.formatDateToDisplay(t.sold_at, 'H')
    const hour = parseInt(localTime, 10)
    if (isNaN(hour)) continue
    const existing = hourMap.get(hour) || { revenue: 0, items: 0 }
    existing.revenue += t.total_price
    existing.items += t.quantity
    hourMap.set(hour, existing)
  }

  return Array.from(hourMap.entries())
    .map(([hour, v]) => ({ hour, revenue: v.revenue, itemsSold: v.items }))
    .sort((a, b) => a.hour - b.hour)
}

function buildDepartmentSales(rows: SalesTxRow[]): DepartmentSale[] {
  const deptMap = new Map<string, { revenue: number; items: number }>()

  for (const t of rows) {
    const existing = deptMap.get(t.department) || { revenue: 0, items: 0 }
    existing.revenue += t.total_price
    existing.items += t.quantity
    deptMap.set(t.department, existing)
  }

  return Array.from(deptMap.entries())
    .map(([department, v]) => ({ department, revenue: v.revenue, itemsSold: v.items }))
    .sort((a, b) => b.revenue - a.revenue)
}

function buildRevenueByDepartment(rows: SalesTxRow[]): DepartmentRevenue[] {
  const map = new Map<string, number>()

  for (const t of rows) {
    const date = TimeUtils.formatDateToDisplay(t.sold_at, 'yyyy-MM-dd')
    const key = `${date}|${t.department}`
    map.set(key, (map.get(key) || 0) + t.total_price)
  }

  return Array.from(map.entries())
    .map(([key, revenue]) => {
      const [date, department] = key.split('|')
      return { date, department, revenue }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

function buildPaymentMethods(rows: DailySalesRow[]): PaymentBreakdown {
  return rows.reduce(
    (acc, r) => ({
      cash: acc.cash + r.cash_total,
      card: acc.card + r.card_total,
      qr: acc.qr + r.qr_total
    }),
    { cash: 0, card: 0, qr: 0 }
  )
}

function buildChannelSales(rows: DailySalesRow[]): ChannelSale[] {
  const map = new Map<string, { revenue: number; orders: number }>()

  for (const r of rows) {
    const existing = map.get(r.channel) || { revenue: 0, orders: 0 }
    existing.revenue += r.gross_revenue
    existing.orders += r.total_orders
    map.set(r.channel, existing)
  }

  return Array.from(map.entries())
    .map(([channel, v]) => ({ channel, revenue: v.revenue, orders: v.orders }))
    .sort((a, b) => b.revenue - a.revenue)
}

function buildStaffByHour(
  staffData: { staffId: string; department: string; timeSlots: any[] }[],
  range: DateRange
): StaffHourly[] {
  const hourMap = new Map<number, { kitchen: number; bar: number; service: number }>()
  for (let h = 0; h < 24; h++) {
    hourMap.set(h, { kitchen: 0, bar: 0, service: 0 })
  }

  for (const staff of staffData) {
    const key =
      staff.department === 'kitchen' ? 'kitchen' : staff.department === 'bar' ? 'bar' : 'service'

    for (const slot of staff.timeSlots) {
      // Support both formats: {startTime:"09:00", endTime:"17:00"} and {start:9, end:17}
      let startHour: number
      let endHour: number
      if (slot.startTime != null) {
        startHour = parseInt(String(slot.startTime).split(':')[0], 10)
        endHour = parseInt(String(slot.endTime).split(':')[0], 10)
      } else if (slot.start != null) {
        startHour = Number(slot.start)
        endHour = Number(slot.end)
      } else {
        continue
      }
      if (isNaN(startHour) || isNaN(endHour)) continue

      if (endHour > startHour) {
        for (let h = startHour; h < endHour && h < 24; h++) {
          hourMap.get(h)![key]++
        }
      } else if (endHour < startHour) {
        // Overnight shift
        for (let h = startHour; h < 24; h++) {
          hourMap.get(h)![key]++
        }
        for (let h = 0; h < endHour; h++) {
          hourMap.get(h)![key]++
        }
      }
    }
  }

  // For multi-day ranges, show average staff per hour (not sum across all days)
  const dayCount = Math.max(1, getDaysBetween(range.from, range.to))

  return Array.from(hourMap.entries())
    .map(([hour, counts]) => ({
      hour,
      kitchen: Math.round(counts.kitchen / dayCount),
      bar: Math.round(counts.bar / dayCount),
      service: Math.round(counts.service / dayCount)
    }))
    .sort((a, b) => a.hour - b.hour)
}

function getDaysBetween(from: string, to: string): number {
  const d1 = new Date(from)
  const d2 = new Date(to)
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
}
