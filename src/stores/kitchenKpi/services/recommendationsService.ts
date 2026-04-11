// src/stores/kitchenKpi/services/recommendationsService.ts
// Production Recommendations Service - Rule-based schedule generation

import { DebugUtils } from '@/utils'
import { generateId } from '@/utils/id'
import type { PreparationBalance } from '@/stores/preparation/types'
import type { Preparation } from '@/stores/recipes/types'
import type { ProductionRecommendation, ProductionScheduleSlot } from '@/stores/preparation/types'

const MODULE_NAME = 'RecommendationsService'

// Reusable Bali hour formatter (hoisted to module scope)
const baliHourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Makassar',
  hour: 'numeric',
  hour12: false
})

/** Default AM/PM split ratio when no consumption data exists */
const DEFAULT_AM_RATIO = 0.65
const DEFAULT_PM_RATIO = 0.35

/** Get effective shelf life with default fallback */
function getShelfLife(preparation: Preparation): number {
  return preparation.shelfLife && preparation.shelfLife > 0 ? preparation.shelfLife : 7
}

/** Get targetDays multiplier for long shelf-life items (based on max, not avg) */
function getTargetDays(shelfLife: number): number {
  if (shelfLife <= 2) return 1.2
  if (shelfLife <= 3) return 1.5
  if (shelfLife <= 6) return 2.0
  return 2.5
}

// =============================================
// Configuration
// =============================================

export interface RecommendationConfig {
  /** Number of days to calculate average consumption (default: 3) */
  daysForAverage: number
  /** Days threshold for urgent production (default: 1) */
  urgentThresholdDays: number
  /** Days threshold for morning slot (default: 2) */
  morningThresholdDays: number
  /** Days threshold for afternoon slot (default: 3) */
  afternoonThresholdDays: number
  /** Minimum quantity to recommend in grams (default: 50) */
  minRecommendedQuantity: number
}

const DEFAULT_CONFIG: RecommendationConfig = {
  daysForAverage: 3,
  urgentThresholdDays: 1,
  morningThresholdDays: 2,
  afternoonThresholdDays: 3,
  minRecommendedQuantity: 50
}

// =============================================
// Priority Mapping
// =============================================

const URGENCY_PRIORITY: Record<ProductionScheduleSlot, number> = {
  urgent: 100,
  morning: 70,
  afternoon: 50,
  evening: 30
}

// =============================================
// Main Service Functions
// =============================================

/**
 * Generate production recommendations based on current stock and consumption patterns
 */
export function generateRecommendations(
  department: 'kitchen' | 'bar',
  balances: PreparationBalance[],
  preparations: Preparation[],
  config: Partial<RecommendationConfig> = {}
): ProductionRecommendation[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  DebugUtils.info(MODULE_NAME, '🔍 Generating recommendations', {
    department,
    balancesCount: balances.length,
    preparationsCount: preparations.length,
    config: cfg
  })

  // Log sample data for debugging
  if (balances.length > 0) {
    DebugUtils.debug(MODULE_NAME, '📦 Sample balances', {
      first3: balances.slice(0, 3).map(b => ({
        preparationId: b.preparationId,
        totalQuantity: b.totalQuantity,
        department: b.department,
        averageDailyUsage: b.averageDailyUsage,
        belowMinStock: b.belowMinStock,
        hasExpired: b.hasExpired
      }))
    })
  }

  if (preparations.length > 0) {
    const prepsWithRecipe = preparations.filter(p => p.recipe && p.recipe.length > 0)
    DebugUtils.debug(MODULE_NAME, '📋 Preparations analysis', {
      total: preparations.length,
      withRecipe: prepsWithRecipe.length,
      withoutRecipe: preparations.length - prepsWithRecipe.length,
      sampleWithRecipe: prepsWithRecipe.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        department: p.department,
        outputQuantity: p.outputQuantity,
        recipeSteps: p.recipe?.length
      }))
    })
  }

  const recommendations: ProductionRecommendation[] = []

  // Filter balances by department
  const departmentBalances = balances.filter(
    b => b.department === department || b.department === 'all'
  )

  DebugUtils.debug(MODULE_NAME, '🏷️ Department balances filtered', {
    department,
    totalBalances: balances.length,
    departmentBalances: departmentBalances.length
  })

  let skippedNoPrep = 0
  let skippedNoRecipe = 0
  let processedCount = 0

  for (const balance of departmentBalances) {
    // Find the preparation definition
    const preparation = preparations.find(p => p.id === balance.preparationId)
    if (!preparation) {
      skippedNoPrep++
      continue
    }

    // Skip preparations without recipe (can't produce)
    if (!preparation.recipe || preparation.recipe.length === 0) {
      skippedNoRecipe++
      continue
    }

    processedCount++

    // Calculate consumption and recommendation
    const recommendation = calculateRecommendation(balance, preparation, cfg)

    if (recommendation) {
      DebugUtils.debug(MODULE_NAME, `✅ Recommendation created for ${preparation.name}`, {
        currentStock: balance.totalQuantity,
        avgDailyConsumption: recommendation.avgDailyConsumption,
        daysUntilStockout: recommendation.daysUntilStockout,
        urgency: recommendation.urgency,
        recommendedQuantity: recommendation.recommendedQuantity
      })
      recommendations.push(recommendation)
    }
  }

  DebugUtils.info(MODULE_NAME, '📊 Balance processing summary', {
    processed: processedCount,
    skippedNoPreparation: skippedNoPrep,
    skippedNoRecipe: skippedNoRecipe,
    recommendationsFromBalances: recommendations.length
  })

  // Also check for preparations with zero stock (not in balances)
  let zeroStockCount = 0
  for (const preparation of preparations) {
    // Skip if already has a balance
    const hasBalance = departmentBalances.some(b => b.preparationId === preparation.id)
    if (hasBalance) continue

    // Check if preparation belongs to this department
    if (preparation.department !== department && preparation.department !== 'all') {
      continue
    }

    // Skip preparations without recipe
    if (!preparation.recipe || preparation.recipe.length === 0) {
      continue
    }

    // Create recommendation for zero stock (or pre-made without balance)
    const recommendation = createZeroStockRecommendation(preparation, cfg)
    if (recommendation) {
      zeroStockCount++
      DebugUtils.debug(MODULE_NAME, `⚠️ Zero stock recommendation for ${preparation.name}`, {
        outputQuantity: preparation.outputQuantity,
        recommendedQuantity: recommendation.recommendedQuantity
      })
      recommendations.push(recommendation)
    }
  }

  DebugUtils.info(MODULE_NAME, '📊 Zero stock preparations', {
    count: zeroStockCount
  })

  // Generate write-off tasks for expired items
  const writeOffRecs = generateWriteOffRecommendations(department, departmentBalances, preparations)
  recommendations.push(...writeOffRecs)

  DebugUtils.info(MODULE_NAME, '🗑️ Write-off recommendations', {
    count: writeOffRecs.length
  })

  // Generate defrost tasks for items with freezer stock and low fridge stock
  const defrostRecs = generateDefrostRecommendations(department, departmentBalances, preparations)
  recommendations.push(...defrostRecs)

  DebugUtils.info(MODULE_NAME, '🧊 Defrost recommendations', {
    count: defrostRecs.length
  })

  // Sort by priority (urgent first)
  recommendations.sort((a, b) => {
    const priorityA = URGENCY_PRIORITY[a.urgency] || 0
    const priorityB = URGENCY_PRIORITY[b.urgency] || 0
    return priorityB - priorityA
  })

  DebugUtils.info(MODULE_NAME, 'Recommendations generated', {
    total: recommendations.length,
    urgent: recommendations.filter(r => r.urgency === 'urgent').length,
    morning: recommendations.filter(r => r.urgency === 'morning').length,
    afternoon: recommendations.filter(r => r.urgency === 'afternoon').length,
    evening: recommendations.filter(r => r.urgency === 'evening').length
  })

  return recommendations
}

// =============================================
// Calculation Functions
// =============================================

/**
 * Calculate recommendation(s) for a single preparation based on balance.
 *
 * v2 logic:
 * - shelf_life <= 1: split into morning (AM target) + afternoon (PM target)
 * - shelf_life > 1: single evening task with max_daily × targetDays
 * - Pre-made: always morning
 *
 */
function calculateRecommendation(
  balance: PreparationBalance,
  preparation: Preparation,
  config: RecommendationConfig
): ProductionRecommendation | null {
  // Pre-made items: use dailyTargetQuantity if set, always morning slot
  if (preparation.isPremade) {
    return calculatePremadeRecommendation(balance, preparation, config)
  }

  const shelfLife = getShelfLife(preparation)
  const maxDaily =
    preparation.maxDailyUsage || calculateAvgDailyConsumption(balance, config.daysForAverage)

  // ===== shelf_life <= 1: morning + afternoon split =====
  if (shelfLife <= 1) {
    return calculateShortShelfLifeRecommendation(balance, preparation, config, maxDaily)
  }

  // ===== shelf_life > 1: evening ritual, full quantity =====
  return calculateLongShelfLifeRecommendation(balance, preparation, config, maxDaily)
}

/**
 * Short shelf-life (<=1 day): produce for half-day at a time.
 * Morning ritual uses am_max, afternoon ritual uses pm_max.
 * Which one to generate depends on current time of day.
 */
function calculateShortShelfLifeRecommendation(
  balance: PreparationBalance,
  preparation: Preparation,
  config: RecommendationConfig,
  maxDaily: number
): ProductionRecommendation | null {
  const currentStock = balance.totalQuantity
  const amMax = preparation.amMaxUsage || Math.round(maxDaily * DEFAULT_AM_RATIO)
  const pmMax = preparation.pmMaxUsage || Math.round(maxDaily * DEFAULT_PM_RATIO)

  // Determine which slot based on current Bali time
  const baliHour = Number(baliHourFormatter.format(new Date()))

  let targetStock: number
  let slot: ProductionScheduleSlot
  let reason: string

  if (baliHour < 16) {
    // Morning ritual: target = AM consumption (7-16, covers until afternoon production is ready)
    targetStock = amMax
    slot = 'morning'
    reason = `AM target: ${Math.round(amMax)}${preparation.outputUnit} (max 3d), stock: ${Math.round(currentStock)}${preparation.outputUnit}`
  } else {
    // Afternoon ritual: target = PM consumption (16-22, dinner service)
    targetStock = pmMax
    slot = 'afternoon'
    reason = `PM target: ${Math.round(pmMax)}${preparation.outputUnit} (max 3d), stock: ${Math.round(currentStock)}${preparation.outputUnit}`
  }

  // Fixed mode override: split proportionally
  if (preparation.dailyTargetQuantity && preparation.dailyTargetQuantity > 0) {
    const totalMax = amMax + pmMax
    const ratio = totalMax > 0 ? (slot === 'morning' ? amMax / totalMax : pmMax / totalMax) : 0.5
    targetStock = Math.round(preparation.dailyTargetQuantity * ratio)
  }

  let needToProduce = Math.max(0, targetStock - currentStock)

  // Round up to whole portions for portion-type items
  if (
    preparation.portionType === 'portion' &&
    preparation.portionSize &&
    preparation.portionSize > 0
  ) {
    needToProduce = Math.ceil(needToProduce / preparation.portionSize) * preparation.portionSize
  }

  if (needToProduce < config.minRecommendedQuantity) {
    return null
  }

  // Urgent override: if stock is 0 or below min
  if (currentStock <= 0 || balance.belowMinStock) {
    slot = 'urgent'
  }

  const avgDailyConsumption = calculateAvgDailyConsumption(balance, config.daysForAverage)
  const daysUntilStockout = avgDailyConsumption > 0 ? currentStock / avgDailyConsumption : 999

  return {
    id: generateId(),
    preparationId: preparation.id,
    preparationName: preparation.name,
    currentStock,
    avgDailyConsumption,
    daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
    recommendedQuantity: Math.round(needToProduce),
    urgency: slot,
    reason,
    storageLocation: preparation.storageLocation || 'fridge',
    portionType: preparation.portionType,
    portionSize: preparation.portionSize,
    isPremade: false,
    isCompleted: false
  }
}

/**
 * Long shelf-life (>1 day): produce in evening ritual.
 * Target = max_daily × targetDays (based on shelf life).
 */
function calculateLongShelfLifeRecommendation(
  balance: PreparationBalance,
  preparation: Preparation,
  config: RecommendationConfig,
  maxDaily: number
): ProductionRecommendation | null {
  const currentStock = balance.totalQuantity
  const avgDailyConsumption = calculateAvgDailyConsumption(balance, config.daysForAverage)
  const shelfLife = getShelfLife(preparation)
  const targetDays = getTargetDays(shelfLife)

  // Fixed mode override
  let targetStock: number
  if (preparation.dailyTargetQuantity && preparation.dailyTargetQuantity > 0) {
    targetStock = preparation.dailyTargetQuantity
  } else {
    targetStock = maxDaily * targetDays
    // Fallback if no consumption data
    if (targetStock <= 0) {
      targetStock = preparation.outputQuantity || 500
    }
  }

  let needToProduce = Math.max(0, targetStock - currentStock)

  // Round up to whole portions for portion-type items
  if (
    preparation.portionType === 'portion' &&
    preparation.portionSize &&
    preparation.portionSize > 0
  ) {
    needToProduce = Math.ceil(needToProduce / preparation.portionSize) * preparation.portionSize
  }

  if (needToProduce < config.minRecommendedQuantity) {
    return null
  }

  const daysUntilStockout = avgDailyConsumption > 0 ? currentStock / avgDailyConsumption : 999

  // Determine slot: evening by default, urgent if critical
  let slot: ProductionScheduleSlot = 'evening'
  if (currentStock <= 0 || balance.belowMinStock || daysUntilStockout <= 1) {
    slot = 'urgent'
  } else if (balance.hasExpired) {
    slot = 'urgent'
  } else if (daysUntilStockout <= 2) {
    slot = 'morning' // Needs attention sooner than evening
  }

  const reason = `Target: ${Math.round(targetStock)}${preparation.outputUnit} (${targetDays}d × max ${Math.round(maxDaily)}), stock: ${Math.round(currentStock)}${preparation.outputUnit}`

  return {
    id: generateId(),
    preparationId: preparation.id,
    preparationName: preparation.name,
    currentStock,
    avgDailyConsumption,
    daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
    recommendedQuantity: Math.round(needToProduce),
    urgency: slot,
    reason,
    storageLocation: preparation.storageLocation || 'fridge',
    portionType: preparation.portionType,
    portionSize: preparation.portionSize,
    isPremade: false,
    isCompleted: false
  }
}

/**
 * Calculate recommendation for pre-made items (always morning slot)
 * Uses dailyTargetQuantity if set, otherwise calculates from consumption
 */
function calculatePremadeRecommendation(
  balance: PreparationBalance,
  preparation: Preparation,
  config: RecommendationConfig
): ProductionRecommendation | null {
  const currentStock = balance.totalQuantity
  const avgDailyConsumption = calculateAvgDailyConsumption(balance, config.daysForAverage)

  // Use fixed daily target if set, otherwise calculate (shelf-life aware)
  let targetStock = preparation.dailyTargetQuantity || 0
  if (targetStock <= 0) {
    targetStock = calculateRecommendedQuantity(avgDailyConsumption, preparation, config)
  }

  // How much still needs to be produced
  let needToProduce = Math.max(0, targetStock - currentStock)

  // Round up to whole portions for portion-type items
  if (
    preparation.portionType === 'portion' &&
    preparation.portionSize &&
    preparation.portionSize > 0
  ) {
    needToProduce = Math.ceil(needToProduce / preparation.portionSize) * preparation.portionSize
  }

  // Skip if we already have enough stock
  if (needToProduce < config.minRecommendedQuantity) {
    return null
  }

  const daysUntilStockout = avgDailyConsumption > 0 ? currentStock / avgDailyConsumption : 999

  const reason =
    currentStock <= 0
      ? `Pre-made: needs daily prep (target: ${Math.round(targetStock)}${preparation.outputUnit})`
      : `Pre-made: ${Math.round(currentStock)}${preparation.outputUnit} in stock, target: ${Math.round(targetStock)}${preparation.outputUnit}`

  return {
    id: generateId(),
    preparationId: preparation.id,
    preparationName: preparation.name,
    currentStock,
    avgDailyConsumption,
    daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
    recommendedQuantity: Math.round(needToProduce),
    urgency: 'morning', // Pre-made always in morning slot
    reason,
    storageLocation: preparation.storageLocation || 'fridge',
    portionType: preparation.portionType,
    portionSize: preparation.portionSize,
    isPremade: true,
    isCompleted: false
  }
}

/**
 * Create recommendation for preparation with zero stock
 */
function createZeroStockRecommendation(
  preparation: Preparation,
  config: RecommendationConfig
): ProductionRecommendation | null {
  const isPremade = preparation.isPremade === true
  const shelfLife = getShelfLife(preparation)
  const maxDaily = preparation.maxDailyUsage || 0

  let recommendedQuantity: number
  let slot: ProductionScheduleSlot

  if (isPremade) {
    slot = 'morning'
    recommendedQuantity = preparation.dailyTargetQuantity || preparation.outputQuantity || 500
  } else if (shelfLife <= 1) {
    slot = 'urgent'
    const amMax = preparation.amMaxUsage || Math.round(maxDaily * DEFAULT_AM_RATIO)
    recommendedQuantity = amMax || preparation.outputQuantity || 500
  } else {
    slot = 'urgent'
    if (preparation.dailyTargetQuantity && preparation.dailyTargetQuantity > 0) {
      recommendedQuantity = preparation.dailyTargetQuantity
    } else if (maxDaily > 0) {
      recommendedQuantity = maxDaily * getTargetDays(shelfLife)
    } else {
      recommendedQuantity = preparation.outputQuantity || 500
    }
  }

  // Skip if no meaningful quantity
  if (recommendedQuantity < config.minRecommendedQuantity) {
    return null
  }

  return {
    id: generateId(),
    preparationId: preparation.id,
    preparationName: preparation.name,
    currentStock: 0,
    avgDailyConsumption: 0,
    daysUntilStockout: 0,
    recommendedQuantity: Math.round(recommendedQuantity),
    urgency: slot,
    reason: isPremade
      ? `Pre-made: needs daily prep (target: ${Math.round(recommendedQuantity)}${preparation.outputUnit})`
      : `Out of stock (max daily: ${Math.round(maxDaily)}${preparation.outputUnit})`,
    storageLocation: preparation.storageLocation || 'fridge',
    portionType: preparation.portionType,
    portionSize: preparation.portionSize,
    isPremade: isPremade,
    isCompleted: false
  }
}

/**
 * Calculate average daily consumption from balance batches
 */
function calculateAvgDailyConsumption(balance: PreparationBalance, daysBack: number): number {
  // Use averageDailyUsage if available in balance
  if (balance.averageDailyUsage && balance.averageDailyUsage > 0) {
    return balance.averageDailyUsage
  }

  // Otherwise, estimate from batch history
  const batches = balance.batches || []
  if (batches.length === 0) {
    return 0
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)

  // Get batches created in the period
  const recentBatches = batches.filter(b => {
    const batchDate = new Date(b.createdAt)
    return batchDate >= cutoffDate
  })

  if (recentBatches.length === 0) {
    // If no recent batches, use all batches but estimate lower
    const totalProduced = batches.reduce((sum, b) => sum + (b.quantity || 0), 0)
    // Assume distributed over 30 days for old data
    return totalProduced / 30
  }

  // Total produced in recent period
  const totalProduced = recentBatches.reduce((sum, b) => sum + (b.quantity || 0), 0)

  // Average per day
  return totalProduced / daysBack
}

/**
 * Calculate TARGET STOCK LEVEL based on shelf life and daily consumption.
 * Smart defaults: shorter shelf life → less buffer, longer → more comfort.
 * Caller subtracts currentStock to get actual production amount.
 */
function calculateRecommendedQuantity(
  avgDailyConsumption: number,
  preparation: Preparation,
  config: RecommendationConfig
): number {
  const shelfLife = preparation.shelfLife && preparation.shelfLife > 0 ? preparation.shelfLife : 7

  // Target stock in days — scaled by shelf life, capped because we produce daily.
  // For shelfLife=1 items, targetDays includes a 20% demand buffer (can't store for tomorrow).
  // For shelfLife≥2, the extra days ARE the buffer — no additional multiplier needed.
  //
  // shelfLife=1 → 1.2 days (20% buffer for demand spikes within one day)
  // shelfLife=2 → 1.5 days (0.5 day buffer)
  // shelfLife=3 → 2.0 days (1 day buffer)
  // shelfLife=4-6 → 2.5 days (buffer grows with shelf life)
  // shelfLife≥7 → 3.0 days (max — we produce every morning anyway)
  let targetDays: number
  if (shelfLife <= 1) targetDays = 1.2
  else if (shelfLife <= 2) targetDays = 1.5
  else if (shelfLife <= 3) targetDays = 2.0
  else if (shelfLife <= 6) targetDays = 2.5
  else targetDays = 3.0

  let recommended = avgDailyConsumption * targetDays

  // If no consumption data, fallback to one recipe output
  if (recommended <= 0) {
    recommended = preparation.outputQuantity || 500
  }

  // For portion-type, round to whole portions
  if (preparation.portionType === 'portion' && preparation.portionSize) {
    const portions = Math.ceil(recommended / preparation.portionSize)
    recommended = portions * preparation.portionSize
  }

  return Math.max(recommended, config.minRecommendedQuantity)
}

// =============================================
// Write-off Recommendations
// =============================================

/**
 * Generate write-off recommendations for expired items
 * These appear as urgent tasks in the schedule
 */
function generateWriteOffRecommendations(
  department: 'kitchen' | 'bar',
  balances: PreparationBalance[],
  preparations?: Preparation[]
): ProductionRecommendation[] {
  const writeOffRecs: ProductionRecommendation[] = []

  for (const balance of balances) {
    if (!balance.hasExpired) continue

    // Calculate expired quantity from batches (check expiry date, not status field)
    const now = new Date()
    const expiredQuantity =
      balance.batches
        ?.filter(b => b.currentQuantity > 0 && b.expiryDate && new Date(b.expiryDate) < now)
        .reduce((sum, b) => sum + (b.currentQuantity || 0), 0) || 0

    if (expiredQuantity <= 0) continue

    // Look up preparation for extra metadata
    const prep = preparations?.find(p => p.id === balance.preparationId)

    writeOffRecs.push({
      id: generateId(),
      preparationId: balance.preparationId,
      preparationName: balance.preparationName,
      currentStock: balance.totalQuantity,
      avgDailyConsumption: balance.averageDailyUsage || 0,
      daysUntilStockout: 0,
      recommendedQuantity: Math.round(expiredQuantity),
      urgency: 'urgent',
      reason: `Write-off expired: ${Math.round(expiredQuantity)}${balance.unit}`,
      storageLocation: prep?.storageLocation || 'fridge',
      portionType: balance.portionType,
      portionSize: balance.portionSize,
      isPremade: prep?.isPremade || false,
      isCompleted: false,
      isWriteOff: true
    })
  }

  return writeOffRecs
}

// =============================================
// Defrost Recommendations
// =============================================

/**
 * Generate defrost recommendations for items with low fridge stock but available freezer stock.
 * When fridge stock is running low and there are frozen batches, recommend thawing.
 */
function generateDefrostRecommendations(
  department: 'kitchen' | 'bar',
  balances: PreparationBalance[],
  preparations?: Preparation[]
): ProductionRecommendation[] {
  const defrostRecs: ProductionRecommendation[] = []

  for (const balance of balances) {
    const prep = preparations?.find(p => p.id === balance.preparationId)
    if (!prep) continue

    // Get active, non-expired batches split by storage location
    const now = new Date()
    const activeBatches =
      balance.batches?.filter(
        b =>
          b.currentQuantity > 0 &&
          b.status === 'active' &&
          !(b.expiryDate && new Date(b.expiryDate) < now)
      ) || []
    const freezerBatches = activeBatches.filter(b => b.storageLocation === 'freezer')
    const fridgeBatches = activeBatches.filter(
      b =>
        b.storageLocation === 'fridge' || (!b.storageLocation && prep.storageLocation !== 'freezer')
    )

    const freezerStock = freezerBatches.reduce((sum, b) => sum + b.currentQuantity, 0)
    const fridgeStock = fridgeBatches.reduce((sum, b) => sum + b.currentQuantity, 0)

    // Skip if no freezer stock available
    if (freezerStock <= 0) continue

    // Need consumption data to decide if fridge is low
    const maxDaily = prep.maxDailyUsage || balance.averageDailyUsage || 0
    if (maxDaily <= 0) continue

    // Target: 1 day of fridge stock (thawed items need time before use)
    const fridgeTarget = maxDaily

    // Only recommend defrost if fridge stock is below target
    if (fridgeStock >= fridgeTarget) continue

    const defrostQuantity = Math.min(freezerStock, Math.round(fridgeTarget - fridgeStock))
    if (defrostQuantity < 50) continue // below min threshold

    const avgDailyConsumption = balance.averageDailyUsage || 0

    defrostRecs.push({
      id: generateId(),
      preparationId: balance.preparationId,
      preparationName: balance.preparationName,
      currentStock: freezerStock, // currentStock = freezer stock for defrost
      avgDailyConsumption,
      daysUntilStockout: avgDailyConsumption > 0 ? fridgeStock / avgDailyConsumption : 999,
      recommendedQuantity: defrostQuantity,
      urgency: 'morning', // defrost needs time, always morning
      reason: `Defrost: fridge ${Math.round(fridgeStock)}${prep.outputUnit}, freezer ${Math.round(freezerStock)}${prep.outputUnit}`,
      storageLocation: prep.storageLocation || 'fridge',
      portionType: prep.portionType,
      portionSize: prep.portionSize,
      isPremade: false,
      isCompleted: false,
      isDefrost: true,
      freezerStock,
      fridgeStock
    })
  }

  return defrostRecs
}

// =============================================
// Utility Functions
// =============================================

/**
 * Convert recommendations to schedule items data
 */
/**
 * Get display unit for a recommendation based on preparation's outputUnit
 */
function getDisplayUnit(rec: ProductionRecommendation, preparations?: Preparation[]): string {
  const prep = preparations?.find(p => p.id === rec.preparationId)
  if (!prep) return 'g'
  switch (prep.outputUnit) {
    case 'ml':
      return 'ml'
    case 'piece':
      return 'pc'
    default:
      // 'portion' and 'gram' — quantities are always in grams
      // portion toggle in ProductionCard handles portion/base display
      return 'g'
  }
}

export function recommendationsToScheduleData(
  recommendations: ProductionRecommendation[],
  department: 'kitchen' | 'bar',
  scheduleDate: string,
  preparations?: Preparation[]
): Array<{
  preparationId: string
  preparationName: string
  department: 'kitchen' | 'bar'
  scheduleDate: string
  productionSlot: ProductionScheduleSlot
  targetQuantity: number
  targetUnit: string
  priority: number
  recommendationReason: string
  currentStockAtGeneration: number
  taskType: 'production' | 'write_off' | 'defrost'
}> {
  return recommendations.map(rec => ({
    preparationId: rec.preparationId,
    preparationName: rec.preparationName,
    department,
    scheduleDate,
    productionSlot: rec.urgency,
    targetQuantity: rec.recommendedQuantity,
    targetUnit: getDisplayUnit(rec, preparations),
    priority: URGENCY_PRIORITY[rec.urgency] || 50,
    recommendationReason: rec.reason,
    currentStockAtGeneration: rec.currentStock,
    taskType: rec.isWriteOff
      ? ('write_off' as const)
      : rec.isDefrost
        ? ('defrost' as const)
        : ('production' as const)
  }))
}

export default {
  generateRecommendations,
  recommendationsToScheduleData
}
