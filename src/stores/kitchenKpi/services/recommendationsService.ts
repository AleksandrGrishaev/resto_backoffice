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
  /** Number of days to calculate average consumption (default: 7) */
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
  daysForAverage: 7,
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

    // Create recommendation for zero stock
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
  // For zero stock, use standard batch size or output quantity
  const recommendedQuantity = Math.max(
    preparation.outputQuantity || 500,
    config.minRecommendedQuantity
  )

  return {
    id: generateId(),
    preparationId: preparation.id,
    preparationName: preparation.name,
    currentStock: 0,
    avgDailyConsumption: 0,
    daysUntilStockout: 0,
    recommendedQuantity: Math.round(recommendedQuantity),
    urgency: 'urgent',
    reason: 'Out of stock - no inventory available',
    storageLocation: preparation.storageLocation || 'fridge',
    portionType: preparation.portionType,
    portionSize: preparation.portionSize,
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
// Utility Functions
// =============================================

/**
 * Convert recommendations to schedule items data
 */
export function recommendationsToScheduleData(
  recommendations: ProductionRecommendation[],
  department: 'kitchen' | 'bar',
  scheduleDate: string
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
}> {
  return recommendations.map(rec => ({
    preparationId: rec.preparationId,
    preparationName: rec.preparationName,
    department,
    scheduleDate,
    productionSlot: rec.urgency,
    targetQuantity: rec.recommendedQuantity,
    targetUnit: 'g', // Default unit
    priority: URGENCY_PRIORITY[rec.urgency] || 50,
    recommendationReason: rec.reason
  }))
}

export default {
  generateRecommendations,
  recommendationsToScheduleData
}
