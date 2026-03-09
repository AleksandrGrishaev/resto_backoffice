// src/stores/productsStore/composables/useStockRecommendations.ts - FIXED

import { ref, computed } from 'vue'
import type {
  StockRecommendation,
  ProductConsumption,
  Product, // Use base Product instead of EnhancedProduct for now
  StockCalculationParams,
  CreateStockRecommendationData,
  RecommendationCalculationInput
} from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'StockRecommendations'

// Temporary function to get current time (will replace with TimeUtils later)
const getCurrentISO = () => new Date().toISOString()

export function useStockRecommendations() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Default calculation parameters
  const defaultParams: StockCalculationParams = {
    safetyDays: 3,
    maxOrderDays: 14,
    volatilityThreshold: 0.3
  }

  // 🆕 MAIN FUNCTION: Calculate stock recommendation for single product
  const calculateRecommendation = async (
    input: RecommendationCalculationInput
  ): Promise<StockRecommendation> => {
    loading.value = true
    try {
      const { product, currentStock, consumption, calculationParams = defaultParams } = input

      DebugUtils.debug(MODULE_NAME, '🧮 Calculating stock recommendation', {
        productId: product.id,
        productName: product.name,
        currentStock,
        dailyUsage: consumption.dailyAverageUsage,
        leadTime: product.leadTimeDays || 7
      })

      // Get calculation factors
      const leadTimeDays = product.leadTimeDays || 7
      const safetyDays = calculationParams.safetyDays
      const dailyUsage = consumption.dailyAverageUsage

      // Ensure minimum daily usage (avoid division by zero)
      const safeDailyUsage = Math.max(dailyUsage, 0.01)

      // Calculate stock levels
      const recommendedMinStock = safeDailyUsage * (leadTimeDays + safetyDays)
      const recommendedMaxStock =
        safeDailyUsage * (leadTimeDays + safetyDays + calculationParams.maxOrderDays)

      // Calculate optimal order quantity (usually 1-2 weeks worth)
      const recommendedOrderQuantity = safeDailyUsage * calculationParams.maxOrderDays

      // Calculate days until reorder needed
      const daysUntilReorder = Math.max(0, currentStock / safeDailyUsage - leadTimeDays)

      // Determine urgency level
      const urgencyLevel = calculateUrgencyLevel(
        currentStock,
        recommendedMinStock,
        safeDailyUsage,
        leadTimeDays
      )

      const recommendation: StockRecommendation = {
        id: `rec-${product.id}-${Date.now()}`,
        productId: product.id,
        currentStock: Math.round(currentStock * 100) / 100,
        recommendedMinStock: Math.round(recommendedMinStock * 100) / 100,
        recommendedMaxStock: Math.round(recommendedMaxStock * 100) / 100,
        recommendedOrderQuantity: Math.round(recommendedOrderQuantity * 100) / 100,
        daysUntilReorder: Math.round(daysUntilReorder * 10) / 10,
        urgencyLevel,
        factors: {
          averageDailyUsage: Math.round(safeDailyUsage * 100) / 100,
          leadTimeDays,
          safetyDays
        },
        calculatedAt: getCurrentISO(),
        isActive: true,
        createdAt: getCurrentISO(),
        updatedAt: getCurrentISO()
      }

      DebugUtils.info(MODULE_NAME, '✅ Stock recommendation calculated', {
        productId: product.id,
        urgencyLevel: recommendation.urgencyLevel,
        daysUntilReorder: recommendation.daysUntilReorder,
        recommendedOrder: recommendation.recommendedOrderQuantity
      })

      return recommendation
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error calculating stock recommendation', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  // Calculate urgency level based on current stock vs recommendations
  const calculateUrgencyLevel = (
    currentStock: number,
    minStock: number,
    dailyUsage: number,
    leadTimeDays: number
  ): StockRecommendation['urgencyLevel'] => {
    const daysOfStockRemaining = currentStock / Math.max(dailyUsage, 0.01)

    // Critical: Less than lead time worth of stock
    if (daysOfStockRemaining <= leadTimeDays) {
      return 'critical'
    }

    // High: Less than lead time + 2 days
    if (daysOfStockRemaining <= leadTimeDays + 2) {
      return 'high'
    }

    // Medium: Less than minimum recommended stock
    if (currentStock <= minStock) {
      return 'medium'
    }

    // Low: Above minimum stock
    return 'low'
  }

  // 🆕 Calculate recommendations for multiple products
  const calculateBulkRecommendations = async (
    products: Product[],
    stockData: Record<string, number>, // productId -> currentStock
    consumptionData: Record<string, ProductConsumption>,
    params: StockCalculationParams = defaultParams
  ): Promise<StockRecommendation[]> => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '📊 Calculating bulk recommendations', {
        productCount: products.length,
        hasStockData: Object.keys(stockData).length,
        hasConsumptionData: Object.keys(consumptionData).length
      })

      const recommendations: StockRecommendation[] = []

      for (const product of products) {
        if (!product.isActive) continue

        const currentStock = stockData[product.id] || 0
        const consumption = consumptionData[product.id]

        if (!consumption) {
          DebugUtils.debug(MODULE_NAME, '⚠️ No consumption data for product', {
            productId: product.id,
            productName: product.name
          })
          continue
        }

        try {
          const recommendation = await calculateRecommendation({
            product,
            currentStock,
            consumption,
            usage: { usedInRecipes: [], usedInPreparations: [] } as any, // Will be enhanced later
            calculationParams: params
          })

          recommendations.push(recommendation)
        } catch (error) {
          DebugUtils.error(MODULE_NAME, '❌ Error calculating recommendation for product', {
            productId: product.id,
            error
          })
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Bulk recommendations calculated', {
        total: recommendations.length,
        critical: recommendations.filter(r => r.urgencyLevel === 'critical').length,
        high: recommendations.filter(r => r.urgencyLevel === 'high').length,
        medium: recommendations.filter(r => r.urgencyLevel === 'medium').length,
        low: recommendations.filter(r => r.urgencyLevel === 'low').length
      })

      return recommendations
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error calculating bulk recommendations', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  // 🆕 Get products needing reorder (for Supplier Store)
  const getProductsNeedingReorder = (
    recommendations: StockRecommendation[],
    urgencyThreshold: StockRecommendation['urgencyLevel'] = 'medium'
  ): StockRecommendation[] => {
    const urgencyOrder = { low: 0, medium: 1, high: 2, critical: 3 }
    const threshold = urgencyOrder[urgencyThreshold]

    return recommendations
      .filter(rec => rec.isActive && urgencyOrder[rec.urgencyLevel] >= threshold)
      .sort((a, b) => urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel])
  }

  // 🆕 Generate consumption estimate when no real data available
  const generateEstimatedConsumption = async (product: Product): Promise<ProductConsumption> => {
    DebugUtils.debug(MODULE_NAME, '🔍 Generating consumption estimate', {
      productId: product.id,
      productName: product.name,
      category: product.category,
      canBeSold: product.canBeSold
    })

    let dailyUsage = 1 // Default fallback
    let basedOnDays = 0 // Estimated

    // Use real consumption data from DB if available (populated by recalculate_consumption_stats RPC)
    if (product.avgDailyUsage && product.avgDailyUsage > 0) {
      dailyUsage = product.avgDailyUsage
      basedOnDays = 30 // Data-driven (from RPC lookback period)
      DebugUtils.debug(MODULE_NAME, 'Using real consumption data', {
        productId: product.id,
        avgDailyUsage: product.avgDailyUsage
      })
    } else {
      // Fallback to category-based estimates
      const categoryEstimates: Record<string, number> = {
        beverages: product.canBeSold ? 15 : 1,
        meat: 2.5,
        vegetables: 3.0,
        dairy: 1.0,
        spices: 0.1,
        seafood: 1.5,
        fruits: 2.0,
        cereals: 1.0,
        other: 1.0
      }
      dailyUsage = categoryEstimates[product.category] || 1.0
      basedOnDays = 0 // Estimated
    }

    // 🔧 ИСПРАВЛЕНО: Убеждаемся что значение валидное
    if (isNaN(dailyUsage) || dailyUsage <= 0) {
      DebugUtils.debug(MODULE_NAME, '⚠️ Invalid daily usage, using default', {
        productId: product.id,
        invalidValue: dailyUsage
      })
      dailyUsage = 1.0
    }

    const consumption: ProductConsumption = {
      id: `consumption-${product.id}-estimated`,
      productId: product.id,
      dailyAverageUsage: Math.round(dailyUsage * 100) / 100,
      weeklyAverageUsage: Math.round(dailyUsage * 7 * 100) / 100,
      monthlyAverageUsage: Math.round(dailyUsage * 30 * 100) / 100,
      trend: 'stable',
      calculatedAt: getCurrentISO(),
      basedOnDays,
      createdAt: getCurrentISO(),
      updatedAt: getCurrentISO()
    }

    DebugUtils.debug(MODULE_NAME, '✅ Consumption estimate generated', {
      productId: product.id,
      dailyUsage: consumption.dailyAverageUsage,
      weeklyUsage: consumption.weeklyAverageUsage,
      source: 'fallback'
    })

    return consumption
  }
  // Computed properties
  const isLoading = computed(() => loading.value)
  const hasError = computed(() => !!error.value)

  return {
    // State
    loading: isLoading,
    error: computed(() => error.value),

    // Main functions
    calculateRecommendation,
    calculateBulkRecommendations,
    getProductsNeedingReorder,
    generateEstimatedConsumption,

    // Utilities
    calculateUrgencyLevel,
    defaultParams
  }
}
