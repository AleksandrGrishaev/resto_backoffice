// src/stores/staff/kpiBonusService.ts
// KPI Bonus Pool Service — scores department KPIs, distributes bonus pool to staff

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import {
  getFoodCostKpiMonth,
  getTargetPercent
} from '@/stores/kitchenKpi/services/foodCostKpiService'
import { getTimeKpiSummary } from '@/stores/kitchenKpi/services/timeKpiService'
import { kitchenKpiService } from '@/stores/kitchenKpi/kitchenKpiService' // for ritual completions
import type {
  KpiBonusScheme,
  KpiBonusSnapshot,
  KpiScoreBreakdown,
  DepartmentKpiResult,
  KpiBonusStaffItem,
  KpiDepartment
} from './types'
import type { PayrollStaffRow } from './payrollService'

const MODULE = 'KpiBonusService'

// =====================================================
// SCHEME CRUD
// =====================================================

export async function getKpiBonusScheme(department: KpiDepartment): Promise<KpiBonusScheme | null> {
  const { data, error } = await supabase
    .from('kpi_bonus_schemes')
    .select('*')
    .eq('department', department)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    DebugUtils.error(MODULE, 'Failed to fetch scheme', { department, error })
    return null
  }
  if (!data) return null

  return schemeFromRow(data)
}

export async function getAllKpiBonusSchemes(): Promise<KpiBonusScheme[]> {
  const { data, error } = await supabase.from('kpi_bonus_schemes').select('*').order('department')

  if (error) {
    DebugUtils.error(MODULE, 'Failed to fetch schemes', { error })
    return []
  }

  return (data || []).map(schemeFromRow)
}

export async function saveKpiBonusScheme(
  scheme: Partial<KpiBonusScheme> & { department: KpiDepartment }
): Promise<KpiBonusScheme> {
  const row = {
    department: scheme.department,
    name: scheme.name || `${scheme.department} KPI Bonus`,
    pool_type: scheme.poolType ?? 'fixed',
    pool_amount: scheme.poolAmount ?? 0,
    pool_percent: scheme.poolPercent ?? 0,
    is_active: scheme.isActive ?? true,
    weight_food_cost: scheme.weightFoodCost ?? 40,
    weight_time: scheme.weightTime ?? 20,
    weight_production: scheme.weightProduction ?? 20,
    weight_ritual: scheme.weightRitual ?? 20,
    min_threshold: scheme.minThreshold ?? 0,
    loss_rate_target: scheme.lossRateTarget ?? 3,
    threshold_food_cost: scheme.thresholdFoodCost ?? 0,
    threshold_time: scheme.thresholdTime ?? 0,
    threshold_production: scheme.thresholdProduction ?? 0,
    threshold_ritual: scheme.thresholdRitual ?? 0,
    weight_avg_check: scheme.weightAvgCheck ?? 0,
    threshold_avg_check: scheme.thresholdAvgCheck ?? 0,
    avg_check_target: scheme.avgCheckTarget ?? 0,
    cancellation_penalty_rate: scheme.cancellationPenaltyRate ?? 100
  }

  const { data, error } = await supabase
    .from('kpi_bonus_schemes')
    .upsert(scheme.id ? { id: scheme.id, ...row } : row, { onConflict: 'department' })
    .select()
    .single()

  if (error) throw new Error(`Failed to save scheme: ${error.message}`)
  return schemeFromRow(data)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function schemeFromRow(row: any): KpiBonusScheme {
  return {
    id: row.id,
    department: row.department,
    name: row.name,
    poolType: row.pool_type || 'fixed',
    poolAmount: Number(row.pool_amount),
    poolPercent: Number(row.pool_percent) || 0,
    isActive: row.is_active,
    weightFoodCost: row.weight_food_cost,
    weightTime: row.weight_time,
    weightProduction: row.weight_production,
    weightRitual: row.weight_ritual,
    minThreshold: row.min_threshold,
    lossRateTarget: Number(row.loss_rate_target) || 3,
    thresholdFoodCost: row.threshold_food_cost ?? 0,
    thresholdTime: row.threshold_time ?? 0,
    thresholdProduction: row.threshold_production ?? 0,
    thresholdRitual: row.threshold_ritual ?? 0,
    weightAvgCheck: row.weight_avg_check ?? 0,
    thresholdAvgCheck: row.threshold_avg_check ?? 0,
    avgCheckTarget: Number(row.avg_check_target) || 0,
    cancellationPenaltyRate:
      row.cancellation_penalty_rate != null ? Number(row.cancellation_penalty_rate) : 100,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// =====================================================
// SCORING FUNCTIONS (each returns 0-100)
// =====================================================

/**
 * Food Cost score: 100 if COGS% <= target, linear drop to 0 at target+10%
 * Also returns revenue for pool_type=percent_revenue
 */
async function scoreFoodCost(
  department: KpiDepartment,
  year: number,
  month: number
): Promise<{
  score: number
  actualPercent: number
  targetPercent: number
  revenue: number
  spoilage: number
  shortage: number
}> {
  const targetPercent = getTargetPercent(department)
  const result = await getFoodCostKpiMonth(new Date(year, month - 1, 15), department)

  if (!result.success || !result.data || result.data.revenue === 0) {
    return { score: -1, actualPercent: 0, targetPercent, revenue: 0, spoilage: 0, shortage: 0 } // -1 = no data
  }

  const actualPercent = result.data.totalCOGSPercent
  let score: number
  if (actualPercent <= targetPercent) {
    score = 100
  } else if (actualPercent >= targetPercent + 10) {
    score = 0
  } else {
    score = 100 - ((actualPercent - targetPercent) / 10) * 100
  }

  return {
    score: Math.round(score * 100) / 100,
    actualPercent,
    targetPercent,
    revenue: result.data.revenue,
    spoilage: result.data.spoilage,
    shortage: result.data.shortage
  }
}

/**
 * Time KPI score: 100 - exceededRate (on-time percentage)
 */
async function scoreTime(
  department: KpiDepartment,
  year: number,
  month: number
): Promise<{ score: number; exceededRate: number; itemsCompleted: number }> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const result = await getTimeKpiSummary(startDate, endDate, department)

  if (!result.success || !result.data || result.data.length === 0) {
    return { score: 0, exceededRate: 0, itemsCompleted: 0 }
  }

  // Aggregate across all days
  let totalCompleted = 0
  let totalExceeded = 0
  for (const entry of result.data) {
    totalCompleted += entry.itemsCompleted
    totalExceeded += entry.itemsExceededPlan
  }

  if (totalCompleted === 0) {
    return { score: -1, exceededRate: 0, itemsCompleted: 0 } // -1 = no data
  }

  const exceededRate = (totalExceeded / totalCompleted) * 100
  const score = Math.max(0, 100 - exceededRate)

  return {
    score: Math.round(score * 100) / 100,
    exceededRate: Math.round(exceededRate * 100) / 100,
    itemsCompleted: totalCompleted
  }
}

/**
 * Loss Rate (Real Food Cost) score: (spoilage + shortage) / revenue vs target
 * Uses data already fetched by scoreFoodCost to avoid double RPC
 */
function scoreLossRate(
  revenue: number,
  spoilage: number,
  shortage: number,
  lossRateTarget: number
): {
  score: number
  lossPercent: number
  targetPercent: number
  spoilage: number
  shortage: number
} {
  if (revenue === 0) {
    return { score: -1, lossPercent: 0, targetPercent: lossRateTarget, spoilage: 0, shortage: 0 }
  }

  const lossPercent = ((spoilage + shortage) / revenue) * 100
  let score: number
  if (lossPercent <= lossRateTarget) {
    score = 100
  } else if (lossPercent >= lossRateTarget + 5) {
    score = 0
  } else {
    score = 100 - ((lossPercent - lossRateTarget) / 5) * 100
  }

  return {
    score: Math.round(score * 100) / 100,
    lossPercent: Math.round(lossPercent * 100) / 100,
    targetPercent: lossRateTarget,
    spoilage,
    shortage
  }
}

/**
 * Ritual score: completedDays / totalDays * 100
 * A day counts as "completed" if at least 80% of tasks were done for both rituals
 */
async function scoreRitual(
  department: KpiDepartment,
  year: number,
  month: number
): Promise<{ score: number; completedDays: number; totalDays: number }> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // Total days = days from start of month to min(today, end of month)
  const today = new Date()
  const monthEnd = new Date(year, month - 1, lastDay)
  const effectiveEnd = today < monthEnd ? today : monthEnd
  const totalDays = Math.max(
    1,
    Math.floor((effectiveEnd.getTime() - new Date(year, month - 1, 1).getTime()) / 86400000) + 1
  )

  try {
    const completions = await kitchenKpiService.getRitualCompletions(startDate, endDate, department)

    if (completions.length === 0) {
      return { score: -1, completedDays: 0, totalDays } // -1 = no data
    }

    // Group by date, count days with good completion (>= 80% tasks)
    const dayCompletions = new Map<string, boolean[]>()
    for (const c of completions) {
      const dateKey = c.completedAt.slice(0, 10)
      if (!dayCompletions.has(dateKey)) dayCompletions.set(dateKey, [])
      const ratio = c.totalTasks > 0 ? c.completedTasks / c.totalTasks : 0
      dayCompletions.get(dateKey)!.push(ratio >= 0.8)
    }

    // A day is "completed" if all its rituals passed the threshold
    let completedDays = 0
    for (const [, rituals] of dayCompletions) {
      if (rituals.length > 0 && rituals.every(ok => ok)) {
        completedDays++
      }
    }

    const score = totalDays > 0 ? (completedDays / totalDays) * 100 : 0

    return {
      score: Math.round(score * 100) / 100,
      completedDays,
      totalDays
    }
  } catch (err) {
    DebugUtils.error(MODULE, 'Failed to score rituals', { error: err })
    return { score: 0, completedDays: 0, totalDays }
  }
}

/**
 * Avg Check Per Guest score: actual avg vs target, graduated
 * Queries dine-in orders with guest_count > 0 for the given month
 */
async function scoreAvgCheck(
  year: number,
  month: number,
  target: number
): Promise<{ score: number; actualAvg: number; targetAvg: number; totalGuests: number }> {
  if (target <= 0) {
    return { score: -1, actualAvg: 0, targetAvg: target, totalGuests: 0 }
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  // Query bill-level guest counts from orders.bills JSONB
  const { data, error } = await supabase.rpc('get_avg_check_per_guest', {
    p_start_date: `${startDate}T00:00:00`,
    p_end_date: `${endDate}T23:59:59`
  })

  if (error) {
    // Fallback: query order-level guest_count if RPC not available
    DebugUtils.warn(MODULE, 'RPC get_avg_check_per_guest not found, using order-level fallback', {
      error
    })
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('orders')
      .select('total_amount, guest_count')
      .eq('type', 'dine_in')
      .gt('guest_count', 0)
      .not('status', 'in', '("cancelled")')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)

    if (fallbackError || !fallbackData || fallbackData.length === 0) {
      return { score: -1, actualAvg: 0, targetAvg: target, totalGuests: 0 }
    }

    const totalRevenue = fallbackData.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
    const totalGuestsFallback = fallbackData.reduce((s, r) => s + (Number(r.guest_count) || 0), 0)

    if (totalGuestsFallback === 0) {
      return { score: -1, actualAvg: 0, targetAvg: target, totalGuests: 0 }
    }

    const actualAvgFallback = totalRevenue / totalGuestsFallback
    const scoreFallback = Math.min(100, (actualAvgFallback / target) * 100)
    return {
      score: Math.round(scoreFallback * 100) / 100,
      actualAvg: Math.round(actualAvgFallback),
      targetAvg: target,
      totalGuests: totalGuestsFallback
    }
  }

  const totalRevenue = Number(data?.[0]?.total_revenue) || 0
  const totalGuests = Number(data?.[0]?.total_guests) || 0

  if (totalGuests === 0) {
    return { score: -1, actualAvg: 0, targetAvg: target, totalGuests: 0 }
  }

  const actualAvg = totalRevenue / totalGuests

  // Graduated: 100 at target, proportional below, capped at 100 above
  const score = Math.min(100, (actualAvg / target) * 100)

  return {
    score: Math.round(score * 100) / 100,
    actualAvg: Math.round(actualAvg),
    targetAvg: target,
    totalGuests
  }
}

// =====================================================
// CANCELLATION PENALTY
// =====================================================

/**
 * Query cancelled items with reason 'kitchen_mistake' for a department and date range.
 * Returns count and total selling price of cancelled items.
 */
async function getCancellationPenalty(
  department: KpiDepartment,
  year: number,
  month: number
): Promise<{ count: number; totalPrice: number }> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`

  const { data, error } = await supabase
    .from('order_items')
    .select('total_price')
    .eq('status', 'cancelled')
    .eq('cancellation_reason', 'kitchen_mistake')
    .eq('department', department)
    .gte('cancelled_at', startDate)
    .lte('cancelled_at', endDate)

  if (error) {
    DebugUtils.error(MODULE, 'Failed to query cancellation penalty', { department, error })
    return { count: 0, totalPrice: 0 }
  }

  const count = data?.length || 0
  const totalPrice = (data || []).reduce((sum, row) => sum + (Number(row.total_price) || 0), 0)

  return { count, totalPrice }
}

// =====================================================
// MAIN CALCULATION
// =====================================================

export async function calculateDepartmentKpiBonus(
  department: KpiDepartment,
  year: number,
  month: number,
  staffRows: PayrollStaffRow[]
): Promise<DepartmentKpiResult | null> {
  // 1. Get active scheme
  const scheme = await getKpiBonusScheme(department)
  if (!scheme) {
    DebugUtils.info(MODULE, 'No active KPI scheme', { department })
    return null
  }

  const weights = {
    foodCost: scheme.weightFoodCost,
    time: scheme.weightTime,
    production: scheme.weightProduction, // DB column stays "production", but it's Loss Rate now
    ritual: scheme.weightRitual,
    avgCheck: scheme.weightAvgCheck
  }

  // 2. Score metrics + cancellation penalty in parallel
  const [fc, tm, rit, ac, cancel] = await Promise.all([
    scoreFoodCost(department, year, month),
    scoreTime(department, year, month),
    scoreRitual(department, year, month),
    scoreAvgCheck(year, month, scheme.avgCheckTarget),
    getCancellationPenalty(department, year, month)
  ])

  // Loss Rate uses data from food cost fetch (no extra RPC)
  const lr = scoreLossRate(fc.revenue, fc.spoilage, fc.shortage, scheme.lossRateTarget)

  // 2b. Resolve actual pool amount
  const departmentRevenue = fc.revenue

  let resolvedPoolAmount: number
  if (scheme.poolType === 'percent_revenue') {
    resolvedPoolAmount = Math.round(departmentRevenue * (scheme.poolPercent / 100))
  } else {
    resolvedPoolAmount = scheme.poolAmount
  }

  const scores: KpiScoreBreakdown = {
    foodCost: fc,
    time: tm,
    lossRate: lr,
    ritual: rit,
    avgCheck: ac
  }

  // 3. Apply per-metric thresholds: below threshold → score becomes 0
  const thresholds = {
    foodCost: scheme.thresholdFoodCost,
    time: scheme.thresholdTime,
    production: scheme.thresholdProduction,
    ritual: scheme.thresholdRitual,
    avgCheck: scheme.thresholdAvgCheck
  }

  function applyThreshold(score: number, threshold: number): number {
    if (score < 0) return score // no data, keep -1
    if (threshold > 0 && score < threshold) return 0
    return score
  }

  const metricPairs: Array<{ score: number; weight: number }> = [
    { score: applyThreshold(fc.score, thresholds.foodCost), weight: weights.foodCost },
    { score: applyThreshold(tm.score, thresholds.time), weight: weights.time },
    { score: applyThreshold(lr.score, thresholds.production), weight: weights.production },
    { score: applyThreshold(rit.score, thresholds.ritual), weight: weights.ritual },
    { score: applyThreshold(ac.score, thresholds.avgCheck), weight: weights.avgCheck }
  ]
  const activeMetrics = metricPairs.filter(m => m.score >= 0)
  const activeWeight = activeMetrics.reduce((s, m) => s + m.weight, 0)
  const departmentScore =
    activeWeight > 0 ? activeMetrics.reduce((s, m) => s + m.score * m.weight, 0) / activeWeight : 0

  const roundedScore = Math.round(departmentScore * 100) / 100

  // 4. Pool unlock
  let unlockedAmount: number
  if (scheme.minThreshold > 0) {
    unlockedAmount = roundedScore >= scheme.minThreshold ? resolvedPoolAmount : 0
  } else {
    // Graduated: proportional to score
    unlockedAmount = Math.round(resolvedPoolAmount * (roundedScore / 100))
  }

  // 4b. Apply cancellation penalty (kitchen_mistake items deduct from pool)
  const penaltyRate = scheme.cancellationPenaltyRate ?? 100
  const penaltyAmount =
    penaltyRate > 0 && cancel.totalPrice > 0
      ? Math.round(cancel.totalPrice * (penaltyRate / 100))
      : 0
  const finalAmount = Math.max(0, unlockedAmount - penaltyAmount)

  const cancellationPenalty = {
    count: cancel.count,
    totalPrice: cancel.totalPrice,
    penaltyRate,
    penaltyAmount
  }

  if (penaltyAmount > 0) {
    DebugUtils.info(MODULE, '⚠️ Cancellation penalty applied', {
      department,
      cancelledItems: cancel.count,
      totalPrice: cancel.totalPrice,
      penaltyRate,
      penaltyAmount,
      unlockedBefore: unlockedAmount,
      finalAmount
    })
  }

  // 5. Distribute to staff (non-trainee, matching department)
  //    Weighted by hours × rank kpiMultiplier (Senior=1.5, Junior=1.0)
  const deptStaff = staffRows.filter(
    r => r.department === department && !r.isTrainee && r.totalHours > 0
  )
  const effectiveHours = deptStaff.map(r => ({
    row: r,
    effective: r.totalHours * (r.kpiMultiplier || 1)
  }))
  const totalEffective = effectiveHours.reduce((s, e) => s + e.effective, 0)

  const staffDistribution: KpiBonusStaffItem[] = []
  let distributedSum = 0

  if (totalEffective > 0 && finalAmount > 0) {
    for (const { row, effective } of effectiveHours) {
      const hoursWeight = effective / totalEffective
      const bonus = Math.round(finalAmount * hoursWeight)
      distributedSum += bonus
      staffDistribution.push({
        staffId: row.staffId,
        staffName: row.staffName,
        department,
        hoursWorked: row.totalHours,
        hoursWeight: Math.round(hoursWeight * 10000) / 10000,
        kpiBonus: bonus
      })
    }

    // Fix rounding remainder — give to top-hours person
    const remainder = finalAmount - distributedSum
    if (remainder !== 0 && staffDistribution.length > 0) {
      const top = staffDistribution.reduce((a, b) => (a.hoursWorked >= b.hoursWorked ? a : b))
      top.kpiBonus += remainder
    }
  }

  DebugUtils.info(MODULE, '✅ Department KPI calculated', {
    department,
    score: roundedScore,
    poolType: scheme.poolType,
    pool: resolvedPoolAmount,
    revenue: departmentRevenue,
    unlocked: unlockedAmount,
    penalty: penaltyAmount,
    final: finalAmount,
    staffCount: staffDistribution.length
  })

  return {
    department,
    scores,
    weights,
    thresholds,
    departmentScore: roundedScore,
    poolType: scheme.poolType,
    poolAmount: resolvedPoolAmount,
    departmentRevenue,
    unlockedAmount,
    cancellationPenalty,
    finalAmount,
    staffDistribution
  }
}

// =====================================================
// SNAPSHOT PERSISTENCE
// =====================================================

export async function saveKpiBonusSnapshot(
  payrollPeriodId: string,
  result: DepartmentKpiResult,
  year: number,
  month: number
): Promise<void> {
  const { error } = await supabase.from('kpi_bonus_snapshots').upsert(
    {
      payroll_period_id: payrollPeriodId,
      department: result.department,
      period_month: month,
      period_year: year,
      score_food_cost: Math.max(0, result.scores.foodCost.score),
      score_time: Math.max(0, result.scores.time.score),
      score_production: Math.max(0, result.scores.lossRate.score),
      score_ritual: Math.max(0, result.scores.ritual.score),
      score_avg_check: Math.max(0, result.scores.avgCheck.score),
      weight_food_cost: result.weights.foodCost,
      weight_time: result.weights.time,
      weight_production: result.weights.production,
      weight_ritual: result.weights.ritual,
      weight_avg_check: result.weights.avgCheck,
      department_score: result.departmentScore,
      pool_type: result.poolType,
      pool_amount: result.poolAmount,
      department_revenue: result.departmentRevenue,
      unlocked_amount: result.unlockedAmount,
      cancellation_penalty: result.cancellationPenalty.penaltyAmount,
      cancellation_count: result.cancellationPenalty.count,
      cancellation_total_price: result.cancellationPenalty.totalPrice,
      final_amount: result.finalAmount,
      raw_metrics: {
        foodCost: result.scores.foodCost,
        time: result.scores.time,
        lossRate: result.scores.lossRate,
        ritual: result.scores.ritual,
        avgCheck: result.scores.avgCheck,
        cancellationPenalty: result.cancellationPenalty,
        staffDistribution: result.staffDistribution
      }
    },
    { onConflict: 'payroll_period_id,department' }
  )

  if (error) {
    DebugUtils.error(MODULE, 'Failed to save KPI snapshot', { error })
  }
}

export async function loadKpiBonusSnapshots(payrollPeriodId: string): Promise<KpiBonusSnapshot[]> {
  const { data, error } = await supabase
    .from('kpi_bonus_snapshots')
    .select('*')
    .eq('payroll_period_id', payrollPeriodId)

  if (error) {
    DebugUtils.error(MODULE, 'Failed to load snapshots', { error })
    return []
  }

  return (data || []).map(snapshotFromRow)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snapshotFromRow(row: any): KpiBonusSnapshot {
  return {
    id: row.id,
    payrollPeriodId: row.payroll_period_id,
    department: row.department,
    periodMonth: row.period_month,
    periodYear: row.period_year,
    scoreFoodCost: Number(row.score_food_cost),
    scoreTime: Number(row.score_time),
    scoreProduction: Number(row.score_production),
    scoreRitual: Number(row.score_ritual),
    scoreAvgCheck: Number(row.score_avg_check ?? -1),
    weightFoodCost: row.weight_food_cost,
    weightTime: row.weight_time,
    weightProduction: row.weight_production,
    weightRitual: row.weight_ritual,
    weightAvgCheck: row.weight_avg_check ?? 0,
    departmentScore: Number(row.department_score),
    poolType: row.pool_type || 'fixed',
    poolAmount: Number(row.pool_amount),
    departmentRevenue: Number(row.department_revenue) || 0,
    unlockedAmount: Number(row.unlocked_amount),
    cancellationPenalty: Number(row.cancellation_penalty) || 0,
    cancellationCount: Number(row.cancellation_count) || 0,
    cancellationTotalPrice: Number(row.cancellation_total_price) || 0,
    finalAmount: Number(row.final_amount) || 0,
    rawMetrics: row.raw_metrics || {},
    createdAt: row.created_at
  }
}
