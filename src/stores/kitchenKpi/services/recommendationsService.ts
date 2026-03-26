// src/stores/kitchenKpi/services/recommendationsService.ts
// Production Recommendations Service - Rule-based schedule generation

import { DebugUtils, TimeUtils } from '@/utils'
import { generateId } from '@/utils/id'
import type { PreparationBalance, PreparationBatch } from '@/stores/preparation/types'
import type { Preparation } from '@/stores/recipes/types'
import type { ProductionRecommendation, ProductionScheduleSlot } from '@/stores/preparation/types'

const MODULE_NAME = 'RecommendationsService'

// =============================================
// Configuration
// =============================================

export interface RecommendationConfig {
  /** Number of days to calculate average consumption (default: 3) */
  daysForAverage: number
  /** Multiplier for safety stock (default: 1.5) */
  safetyStockMultiplier: number
  /** Days threshold for urgent production (default: 1) */
  urgentThresholdDays: number
  /** Days threshold for morning slot (default: 2) */
  morningThresholdDays: number
  /** Days threshold for afternoon slot (default: 3) */
  afternoonThresholdDays: number
  /** Minimum quantity to recommend (avoid tiny batches) */
  minRecommendedQuantity: number
  /** How many days worth of production to recommend */
  productionDaysAhead: number
}

const DEFAULT_CONFIG: RecommendationConfig = {
  daysForAverage: 3,
  safetyStockMultiplier: 1.5,
  urgentThresholdDays: 1,
  morningThresholdDays: 2,
  afternoonThresholdDays: 3,
  minRecommendedQuantity: 50, // grams
  productionDaysAhead: 2
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
 * Calculate recommendation for a single preparation based on balance
 */
function calculateRecommendation(
  balance: PreparationBalance,
  preparation: Preparation,
  config: RecommendationConfig
): ProductionRecommendation | null {
  const currentStock = balance.totalQuantity
  const avgDailyConsumption = calculateAvgDailyConsumption(balance, config.daysForAverage)

  // Pre-made items: use dailyTargetQuantity if set, always morning slot
  if (preparation.isPremade) {
    return calculatePremadeRecommendation(balance, preparation, config)
  }

  // Calculate days until stockout
  const daysUntilStockout = avgDailyConsumption > 0 ? currentStock / avgDailyConsumption : 999

  // Determine urgency
  const urgency = determineUrgency(daysUntilStockout, balance, config)

  // Skip if no urgency (plenty of stock)
  if (!urgency) {
    return null
  }

  // Calculate recommended quantity
  const recommendedQuantity = calculateRecommendedQuantity(avgDailyConsumption, preparation, config)

  // Skip if recommended quantity is too small
  if (recommendedQuantity < config.minRecommendedQuantity) {
    return null
  }

  // Generate reason string
  const reason = generateReason(
    currentStock,
    avgDailyConsumption,
    daysUntilStockout,
    balance,
    preparation.outputUnit
  )

  return {
    id: generateId(),
    preparationId: preparation.id,
    preparationName: preparation.name,
    currentStock,
    avgDailyConsumption,
    daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
    recommendedQuantity: Math.round(recommendedQuantity),
    urgency,
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

  // Use fixed daily target if set, otherwise calculate
  let targetQuantity = preparation.dailyTargetQuantity || 0
  if (targetQuantity <= 0) {
    targetQuantity = calculateRecommendedQuantity(avgDailyConsumption, preparation, config)
  }

  // How much still needs to be produced
  const needToProduce = Math.max(0, targetQuantity - currentStock)

  // Skip if we already have enough stock
  if (needToProduce < config.minRecommendedQuantity) {
    return null
  }

  const daysUntilStockout = avgDailyConsumption > 0 ? currentStock / avgDailyConsumption : 999

  const reason =
    currentStock <= 0
      ? `Pre-made: needs daily prep (target: ${Math.round(targetQuantity)}${preparation.outputUnit})`
      : `Pre-made: ${Math.round(currentStock)}${preparation.outputUnit} in stock, target: ${Math.round(targetQuantity)}${preparation.outputUnit}`

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

  // For pre-made, use daily target; for others, use batch size
  let recommendedQuantity: number
  if (isPremade && preparation.dailyTargetQuantity && preparation.dailyTargetQuantity > 0) {
    recommendedQuantity = preparation.dailyTargetQuantity
  } else {
    recommendedQuantity = Math.max(preparation.outputQuantity || 500, config.minRecommendedQuantity)
  }

  return {
    id: generateId(),
    preparationId: preparation.id,
    preparationName: preparation.name,
    currentStock: 0,
    avgDailyConsumption: 0,
    daysUntilStockout: 0,
    recommendedQuantity: Math.round(recommendedQuantity),
    urgency: isPremade ? 'morning' : 'urgent',
    reason: isPremade
      ? `Pre-made: needs daily prep (target: ${Math.round(recommendedQuantity)}${preparation.outputUnit})`
      : 'Out of stock - no inventory available',
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
 * Determine urgency based on days until stockout and other factors
 */
function determineUrgency(
  daysUntilStockout: number,
  balance: PreparationBalance,
  config: RecommendationConfig
): ProductionScheduleSlot | null {
  // Check for expired or near expiry items - urgent regardless of quantity
  if (balance.hasExpired) {
    return 'urgent'
  }

  if (balance.hasNearExpiry) {
    return 'morning'
  }

  // Check stock levels
  if (daysUntilStockout <= 0 || balance.belowMinStock) {
    return 'urgent'
  }

  if (daysUntilStockout <= config.urgentThresholdDays) {
    return 'urgent'
  }

  if (daysUntilStockout <= config.morningThresholdDays) {
    return 'morning'
  }

  if (daysUntilStockout <= config.afternoonThresholdDays) {
    return 'afternoon'
  }

  // More than 3 days of stock - low priority or skip
  if (daysUntilStockout > 5) {
    return null // Don't recommend if plenty of stock
  }

  return 'evening'
}

/**
 * Calculate recommended quantity to produce
 */
function calculateRecommendedQuantity(
  avgDailyConsumption: number,
  preparation: Preparation,
  config: RecommendationConfig
): number {
  // Base recommendation: X days worth of consumption
  let recommended = avgDailyConsumption * config.productionDaysAhead

  // If no consumption data, use standard batch size
  if (recommended <= 0) {
    recommended = preparation.outputQuantity || 500
  }

  // Round to recipe output quantity (batch size)
  const batchSize = preparation.outputQuantity || 500
  const batches = Math.ceil(recommended / batchSize)
  recommended = batches * batchSize

  // Apply safety stock multiplier
  recommended = recommended * config.safetyStockMultiplier

  // For portion-type preparations, round to whole portions
  if (preparation.portionType === 'portion' && preparation.portionSize) {
    const portions = Math.ceil(recommended / preparation.portionSize)
    recommended = portions * preparation.portionSize
  }

  return Math.max(recommended, config.minRecommendedQuantity)
}

/**
 * Generate human-readable reason for recommendation
 */
function generateReason(
  currentStock: number,
  avgDailyConsumption: number,
  daysUntilStockout: number,
  balance: PreparationBalance,
  unit: string
): string {
  const stockStr = `${Math.round(currentStock)}${unit}`
  const consumptionStr = `${Math.round(avgDailyConsumption)}${unit}/day`

  if (currentStock <= 0) {
    return 'Out of stock - no inventory available'
  }

  if (balance.hasExpired) {
    return `Stock expired - ${stockStr} needs replacement`
  }

  if (balance.hasNearExpiry) {
    return `Near expiry - produce fresh batch (${stockStr} expiring soon)`
  }

  if (balance.belowMinStock) {
    return `Below minimum stock - only ${stockStr} remaining`
  }

  if (daysUntilStockout <= 1) {
    return `Critical - only ${stockStr} left (~${Math.round(daysUntilStockout * 24)}h supply)`
  }

  if (avgDailyConsumption > 0) {
    return `Based on ${consumptionStr} avg: ${stockStr} ≈ ${Math.round(daysUntilStockout)} day${daysUntilStockout !== 1 ? 's' : ''} supply`
  }

  return `Low stock - ${stockStr} remaining`
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

    // Calculate expired quantity from batches
    const expiredQuantity =
      balance.batches
        ?.filter(b => b.status === 'expired')
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
    case 'portion':
      return 'pc'
    default:
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
  taskType: 'production' | 'write_off'
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
    taskType: rec.isWriteOff ? ('write_off' as const) : ('production' as const)
  }))
}

export default {
  generateRecommendations,
  recommendationsToScheduleData
}
