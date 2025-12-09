// src/core/decomposition/utils/yieldUtils.ts
// Utilities for handling yield percentage adjustments

import type { ProductForDecomposition } from '../types'

/**
 * Result of yield adjustment
 */
export interface YieldAdjustmentResult {
  /** Adjusted quantity (increased if yield < 100%) */
  adjustedQuantity: number
  /** Original quantity before adjustment */
  originalQuantity: number
  /** Yield percentage applied (or 100 if no adjustment) */
  yieldPercentage: number
  /** Whether adjustment was applied */
  wasAdjusted: boolean
}

/**
 * Apply yield percentage adjustment to product quantity
 *
 * Yield percentage represents how much usable product you get from raw product.
 * For example, if yieldPercentage = 80%, you need 125g raw to get 100g usable.
 *
 * Formula: adjustedQuantity = originalQuantity / (yieldPercentage / 100)
 *
 * @param quantity - Original quantity needed (net/usable amount)
 * @param product - Product with yield percentage
 * @param useYieldPercentage - Flag to enable yield adjustment
 * @returns Yield adjustment result
 */
export function applyYieldAdjustment(
  quantity: number,
  product: ProductForDecomposition,
  useYieldPercentage: boolean
): YieldAdjustmentResult {
  // Default result (no adjustment)
  const defaultResult: YieldAdjustmentResult = {
    adjustedQuantity: quantity,
    originalQuantity: quantity,
    yieldPercentage: 100,
    wasAdjusted: false
  }

  // Check if yield adjustment should be applied
  if (!useYieldPercentage) {
    return defaultResult
  }

  // Check if product has valid yield percentage
  if (!product.yieldPercentage || product.yieldPercentage >= 100) {
    return defaultResult
  }

  // Apply yield adjustment
  // If yield is 80%, you need 100/80 = 1.25x the amount
  const adjustedQuantity = quantity / (product.yieldPercentage / 100)

  return {
    adjustedQuantity,
    originalQuantity: quantity,
    yieldPercentage: product.yieldPercentage,
    wasAdjusted: true
  }
}

/**
 * Calculate gross quantity from net quantity using yield percentage
 *
 * @param netQuantity - Net (usable) quantity needed
 * @param yieldPercentage - Yield percentage (0-100)
 * @returns Gross quantity needed to get the net quantity
 */
export function calculateGrossQuantity(netQuantity: number, yieldPercentage: number): number {
  if (yieldPercentage <= 0 || yieldPercentage >= 100) {
    return netQuantity
  }
  return netQuantity / (yieldPercentage / 100)
}

/**
 * Calculate net quantity from gross quantity using yield percentage
 *
 * @param grossQuantity - Gross (raw) quantity
 * @param yieldPercentage - Yield percentage (0-100)
 * @returns Net (usable) quantity you will get
 */
export function calculateNetQuantity(grossQuantity: number, yieldPercentage: number): number {
  if (yieldPercentage <= 0 || yieldPercentage > 100) {
    return grossQuantity
  }
  return grossQuantity * (yieldPercentage / 100)
}

/**
 * Get effective yield percentage with validation
 *
 * @param yieldPercentage - Raw yield percentage value
 * @returns Valid yield percentage (between 1 and 100)
 */
export function getEffectiveYieldPercentage(yieldPercentage?: number): number {
  if (!yieldPercentage || yieldPercentage <= 0) {
    return 100
  }
  if (yieldPercentage > 100) {
    return 100
  }
  return yieldPercentage
}

/**
 * Check if yield adjustment is significant (worth logging/tracking)
 *
 * @param yieldPercentage - Yield percentage to check
 * @returns True if yield is less than 100% (has waste)
 */
export function hasSignificantYield(yieldPercentage?: number): boolean {
  return !!yieldPercentage && yieldPercentage > 0 && yieldPercentage < 100
}
