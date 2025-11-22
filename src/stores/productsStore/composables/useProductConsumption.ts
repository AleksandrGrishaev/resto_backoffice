// src/stores/productsStore/composables/useProductConsumption.ts

import { ref, computed } from 'vue'
import type { ProductConsumption } from '../types'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'ProductConsumption'

export function useProductConsumption() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 🆕 MAIN FUNCTION: Calculate consumption from Storage Store operations
  const calculateConsumption = async (
    productId: string,
    days: number = 30
  ): Promise<ProductConsumption> => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '📊 Calculating consumption', { productId, days })

      // 🔧 FUTURE: Get real data from Storage Store
      // const operations = await storageStore.getOperationsByProduct(productId, cutoffDate)

      // 🆕 FOR NOW: Generate realistic consumption based on coordinator data
      const consumption = await generateRealisticConsumption(productId, days)

      DebugUtils.info(MODULE_NAME, '✅ Consumption calculated', {
        productId,
        dailyUsage: consumption.dailyAverageUsage,
        trend: consumption.trend,
        basedOnDays: consumption.basedOnDays
      })

      return consumption
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error calculating consumption', { error, productId })
      throw error
    } finally {
      loading.value = false
    }
  }

  // 🆕 Generate consumption estimate with fallback logic
  const generateRealisticConsumption = async (
    productId: string,
    days: number
  ): Promise<ProductConsumption> => {
    try {
      // 🔧 Use fallback consumption estimates
      // In the future, this will be replaced with real data from Supabase
      const categoryEstimates: Record<string, { daily: number; volatility: number }> = {
        beverages: { daily: 15, volatility: 0.4 },
        meat: { daily: 2.5, volatility: 0.3 },
        vegetables: { daily: 3.0, volatility: 0.25 },
        dairy: { daily: 1.5, volatility: 0.2 },
        spices: { daily: 0.1, volatility: 0.5 },
        seafood: { daily: 1.5, volatility: 0.35 },
        fruits: { daily: 2.0, volatility: 0.3 },
        cereals: { daily: 1.0, volatility: 0.15 },
        other: { daily: 1.0, volatility: 0.2 }
      }

      // Get default estimates (will be improved with real data later)
      const estimate = categoryEstimates['other'] || { daily: 1.0, volatility: 0.2 }
      const baseDaily = estimate.daily
      const volatility = estimate.volatility

      // Simulate realistic consumption with weekend patterns
      let totalConsumed = 0
      const dailyRecords: number[] = []

      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() - i)

        // Weekend pattern: more beverages, less cooking ingredients
        const isWeekend = date.getDay() === 0 || date.getDay() === 6
        const weekendMultiplier = 1.0 // Default neutral multiplier

        // Daily variation
        const variation = (Math.random() - 0.5) * 2 * volatility
        let dailyAmount = baseDaily * (1 + variation)

        if (isWeekend) {
          dailyAmount *= weekendMultiplier
        }

        // Seasonal factors (simple implementation)
        const seasonalFactor = 1 + 0.1 * Math.sin((date.getMonth() / 12) * 2 * Math.PI)
        dailyAmount *= seasonalFactor

        totalConsumed += dailyAmount
        dailyRecords.push(dailyAmount)
      }

      const dailyAverage = totalConsumed / days
      const weeklyAverage = dailyAverage * 7
      const monthlyAverage = dailyAverage * 30

      // Calculate trend from last 15 vs first 15 days
      const recentPeriod = dailyRecords.slice(0, 15).reduce((a, b) => a + b, 0) / 15
      const olderPeriod = dailyRecords.slice(-15).reduce((a, b) => a + b, 0) / 15
      const trendChange = ((recentPeriod - olderPeriod) / olderPeriod) * 100

      let trend: ProductConsumption['trend'] = 'stable'
      if (trendChange > 15) trend = 'increasing'
      else if (trendChange < -15) trend = 'decreasing'

      return {
        id: `consumption-${productId}-${Date.now()}`,
        productId,
        dailyAverageUsage: Math.round(dailyAverage * 100) / 100,
        weeklyAverageUsage: Math.round(weeklyAverage * 100) / 100,
        monthlyAverageUsage: Math.round(monthlyAverage * 100) / 100,
        trend,
        calculatedAt: TimeUtils.getCurrentLocalISO(),
        basedOnDays: days,
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error generating consumption estimate', {
        error,
        productId
      })

      // Fallback to basic calculation
      return {
        id: `consumption-${productId}-fallback`,
        productId,
        dailyAverageUsage: 1.0, // Basic fallback
        weeklyAverageUsage: 7.0,
        monthlyAverageUsage: 30.0,
        trend: 'stable',
        calculatedAt: TimeUtils.getCurrentLocalISO(),
        basedOnDays: 0, // Indicates fallback
        createdAt: TimeUtils.getCurrentLocalISO(),
        updatedAt: TimeUtils.getCurrentLocalISO()
      }
    }
  }

  // 🆕 Calculate consumption trend analysis
  const getConsumptionTrend = async (
    productId: string
  ): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable'
    changePercent: number
    confidence: 'high' | 'medium' | 'low'
  }> => {
    loading.value = true
    try {
      DebugUtils.debug(MODULE_NAME, '📈 Analyzing consumption trend', { productId })

      // Get recent and historical consumption
      const recent = await calculateConsumption(productId, 30) // Last 30 days
      const historical = await calculateConsumption(productId, 60) // Last 60 days (overlapping)

      // Compare averages
      const changePercent =
        ((recent.dailyAverageUsage - historical.dailyAverageUsage) / historical.dailyAverageUsage) *
        100

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
      let confidence: 'high' | 'medium' | 'low' = 'medium'

      // Determine trend
      if (Math.abs(changePercent) < 10) {
        trend = 'stable'
        confidence = 'high'
      } else if (changePercent > 20) {
        trend = 'increasing'
        confidence = 'high'
      } else if (changePercent < -20) {
        trend = 'decreasing'
        confidence = 'high'
      } else if (changePercent > 10) {
        trend = 'increasing'
        confidence = 'medium'
      } else if (changePercent < -10) {
        trend = 'decreasing'
        confidence = 'medium'
      }

      // Lower confidence for products with high volatility
      // In the future, this will use real product data from Supabase
      if (Math.abs(changePercent) > 30) {
        confidence = confidence === 'high' ? 'medium' : 'low'
      }

      DebugUtils.info(MODULE_NAME, '✅ Trend analysis completed', {
        productId,
        trend,
        changePercent: Math.round(changePercent * 10) / 10,
        confidence
      })

      return {
        trend,
        changePercent: Math.round(changePercent * 10) / 10,
        confidence
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error analyzing trend', { error, productId })
      return {
        trend: 'stable',
        changePercent: 0,
        confidence: 'low'
      }
    } finally {
      loading.value = false
    }
  }

  // 🆕 Calculate consumption for multiple products (bulk operation)
  const calculateBulkConsumption = async (
    productIds: string[],
    days: number = 30
  ): Promise<Record<string, ProductConsumption>> => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '📊 Calculating bulk consumption', {
        productCount: productIds.length,
        days
      })

      const results: Record<string, ProductConsumption> = {}

      // Process in batches to avoid overwhelming the system
      const batchSize = 5
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize)

        const batchPromises = batch.map(async productId => {
          const consumption = await generateRealisticConsumption(productId, days)
          return { productId, consumption }
        })

        const batchResults = await Promise.all(batchPromises)

        batchResults.forEach(({ productId, consumption }) => {
          results[productId] = consumption
        })

        // Small delay between batches
        if (i + batchSize < productIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      DebugUtils.info(MODULE_NAME, '✅ Bulk consumption calculated', {
        processed: Object.keys(results).length,
        avgDailyUsage:
          Object.values(results).reduce((sum, c) => sum + c.dailyAverageUsage, 0) /
          Object.keys(results).length
      })

      return results
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error calculating bulk consumption', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  // 🆕 Get consumption statistics for reporting
  const getConsumptionStatistics = (consumptions: ProductConsumption[]) => {
    if (consumptions.length === 0) {
      return {
        totalProducts: 0,
        totalDailyConsumption: 0,
        averageDailyConsumption: 0,
        highestConsumption: null,
        lowestConsumption: null,
        trendSummary: { increasing: 0, decreasing: 0, stable: 0 }
      }
    }

    const dailyUsages = consumptions.map(c => c.dailyAverageUsage)
    const totalDaily = dailyUsages.reduce((sum, usage) => sum + usage, 0)
    const avgDaily = totalDaily / consumptions.length

    const sorted = [...consumptions].sort((a, b) => b.dailyAverageUsage - a.dailyAverageUsage)

    const trendSummary = consumptions.reduce(
      (acc, c) => {
        acc[c.trend]++
        return acc
      },
      { increasing: 0, decreasing: 0, stable: 0 }
    )

    return {
      totalProducts: consumptions.length,
      totalDailyConsumption: Math.round(totalDaily * 100) / 100,
      averageDailyConsumption: Math.round(avgDaily * 100) / 100,
      highestConsumption: sorted[0] || null,
      lowestConsumption: sorted[sorted.length - 1] || null,
      trendSummary
    }
  }

  // 🆕 Predict future consumption based on trend
  const predictConsumption = (consumption: ProductConsumption, daysAhead: number): number => {
    let predicted = consumption.dailyAverageUsage

    if (consumption.trend !== 'stable') {
      // Simple linear prediction based on trend
      const trendMultiplier = consumption.trend === 'increasing' ? 1.02 : 0.98 // 2% change per week
      const weeks = daysAhead / 7
      predicted *= Math.pow(trendMultiplier, weeks)
    }

    return Math.round(predicted * 100) / 100
  }

  // Computed properties
  const isLoading = computed(() => loading.value)
  const hasError = computed(() => !!error.value)

  return {
    // State
    loading: isLoading,
    error: computed(() => error.value),

    // Core functions
    calculateConsumption,
    getConsumptionTrend,
    calculateBulkConsumption,

    // Analysis functions
    getConsumptionStatistics,
    predictConsumption,

    // Utilities
    generateRealisticConsumption
  }
}
