// src/stores/productsStore/composables/useProductPriceHistory.ts

import { ref, computed } from 'vue'
import type { ProductPriceHistory } from '../types'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'ProductPriceHistory'

export function useProductPriceHistory() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 🆕 MAIN FUNCTION: Get price history for product
  const getPriceHistory = async (
    productId: string,
    days?: number
  ): Promise<ProductPriceHistory[]> => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '💰 Loading price history', { productId, days })

      // 🔧 FUTURE: Get real data from Supabase
      // const history = await priceHistoryService.getByProduct(productId, days)

      // 🆕 FOR NOW: Return empty array (no mock data)
      // Real price history will be implemented with Supabase
      let history: ProductPriceHistory[] = []

      // Filter by days if specified
      if (days) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        history = history.filter(record => new Date(record.effectiveDate) >= cutoffDate)
      }

      // Sort by date (newest first)
      history.sort(
        (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
      )

      DebugUtils.info(MODULE_NAME, '✅ Price history loaded', {
        productId,
        records: history.length,
        latestPrice: history[0]?.pricePerUnit,
        dateRange:
          history.length > 0
            ? {
                from: history[history.length - 1]?.effectiveDate?.slice(0, 10),
                to: history[0]?.effectiveDate?.slice(0, 10)
              }
            : null
      })

      return history
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error loading price history', { error, productId })
      throw error
    } finally {
      loading.value = false
    }
  }

  // 🆕 Add price record from supplier receipt
  const addPriceRecord = async (data: {
    productId: string
    pricePerUnit: number
    sourceType: 'purchase_order' | 'receipt' | 'manual_update'
    sourceId?: string
    supplierId?: string
    notes?: string
  }): Promise<ProductPriceHistory> => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '💰 Adding price record', {
        productId: data.productId,
        price: data.pricePerUnit,
        source: data.sourceType
      })

      const now = TimeUtils.getCurrentLocalISO()

      const priceRecord: ProductPriceHistory = {
        id: `price-${data.productId}-${Date.now()}`,
        productId: data.productId,
        pricePerUnit: data.pricePerUnit,
        effectiveDate: now,
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        supplierId: data.supplierId,
        notes: data.notes,
        createdAt: now,
        updatedAt: now
      }

      // 🔧 FUTURE: Save to Firebase
      // await priceHistoryService.create(priceRecord)

      // 🆕 FOR NOW: Update coordinator data (in development)
      if (import.meta.env.DEV) {
        DebugUtils.debug(MODULE_NAME, '📝 Mock price record added', priceRecord)
      }

      // 🆕 Update product's current cost if this is newer
      await updateProductCurrentCost(data.productId, data.pricePerUnit)

      DebugUtils.info(MODULE_NAME, '✅ Price record added', {
        id: priceRecord.id,
        productId: data.productId,
        newPrice: data.pricePerUnit
      })

      return priceRecord
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error adding price record', { error, data })
      throw error
    } finally {
      loading.value = false
    }
  }

  // 🆕 Update product's current cost per unit
  const updateProductCurrentCost = async (productId: string, newPrice: number): Promise<void> => {
    try {
      // 🔧 FUTURE: Update via ProductsStore
      // const productsStore = useProductsStore()
      // await productsStore.updateProduct({
      //   id: productId,
      //   currentCostPerUnit: newPrice
      // })

      DebugUtils.debug(MODULE_NAME, '💰 Product cost updated', {
        productId,
        newPrice
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error updating product cost', {
        error,
        productId,
        newPrice
      })
    }
  }

  // 🆕 Calculate price trend for analytics
  const getPriceTrend = (
    history: ProductPriceHistory[],
    days: number = 30
  ): {
    trend: 'increasing' | 'decreasing' | 'stable'
    changePercent: number
    volatility: number
    confidence: 'high' | 'medium' | 'low'
  } => {
    if (history.length < 2) {
      return {
        trend: 'stable',
        changePercent: 0,
        volatility: 0,
        confidence: 'low'
      }
    }

    // Filter to specified period
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const periodHistory = history
      .filter(record => new Date(record.effectiveDate) >= cutoffDate)
      .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime())

    if (periodHistory.length < 2) {
      return {
        trend: 'stable',
        changePercent: 0,
        volatility: 0,
        confidence: 'low'
      }
    }

    // Calculate trend
    const oldestPrice = periodHistory[0].pricePerUnit
    const newestPrice = periodHistory[periodHistory.length - 1].pricePerUnit
    const changePercent = ((newestPrice - oldestPrice) / oldestPrice) * 100

    // Calculate volatility (coefficient of variation)
    const prices = periodHistory.map(h => h.pricePerUnit)
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - average, 2), 0) / prices.length
    const volatility = (Math.sqrt(variance) / average) * 100

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (Math.abs(changePercent) > 10) {
      trend = changePercent > 0 ? 'increasing' : 'decreasing'
    }

    // Determine confidence based on data points and consistency
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    if (periodHistory.length >= 8 && volatility < 15) {
      confidence = 'high'
    } else if (periodHistory.length < 3 || volatility > 30) {
      confidence = 'low'
    }

    return {
      trend,
      changePercent: Math.round(changePercent * 10) / 10,
      volatility: Math.round(volatility * 10) / 10,
      confidence
    }
  }

  // 🆕 Get chart data for price visualization
  const getChartData = (
    history: ProductPriceHistory[],
    maxPoints: number = 20
  ): Array<{
    date: string
    price: number
    formattedDate: string
    sourceType: string
  }> => {
    if (history.length === 0) return []

    // Sort by date (oldest first for chart)
    const sorted = [...history].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    )

    // Sample data if too many points
    let sampled = sorted
    if (sorted.length > maxPoints) {
      const step = Math.floor(sorted.length / maxPoints)
      sampled = []
      for (let i = 0; i < sorted.length; i += step) {
        sampled.push(sorted[i])
      }
      // Always include the last point
      if (sampled[sampled.length - 1] !== sorted[sorted.length - 1]) {
        sampled.push(sorted[sorted.length - 1])
      }
    }

    return sampled.map(record => ({
      date: record.effectiveDate,
      price: record.pricePerUnit,
      formattedDate: new Date(record.effectiveDate).toLocaleDateString('id-ID'),
      sourceType: record.sourceType
    }))
  }

  // 🆕 Calculate price statistics
  const getPriceStatistics = (history: ProductPriceHistory[]) => {
    if (history.length === 0) {
      return {
        current: 0,
        average: 0,
        minimum: 0,
        maximum: 0,
        count: 0
      }
    }

    const prices = history.map(h => h.pricePerUnit)
    const current = history[0]?.pricePerUnit || 0 // Assuming sorted newest first
    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const minimum = Math.min(...prices)
    const maximum = Math.max(...prices)

    return {
      current: Math.round(current),
      average: Math.round(average),
      minimum: Math.round(minimum),
      maximum: Math.round(maximum),
      count: history.length
    }
  }

  // 🆕 Get price history for multiple products (bulk operation)
  const getBulkPriceHistory = async (
    productIds: string[],
    days?: number
  ): Promise<Record<string, ProductPriceHistory[]>> => {
    loading.value = true
    try {
      DebugUtils.info(MODULE_NAME, '💰 Loading bulk price history', {
        productCount: productIds.length,
        days
      })

      const results: Record<string, ProductPriceHistory[]> = {}

      // 🔧 FUTURE: Get all data from Supabase
      // For now, return empty arrays for all products
      const allHistory: ProductPriceHistory[] = []

      // Filter and process for each product
      productIds.forEach(productId => {
        let productHistory = allHistory.filter(record => record.productId === productId)

        // Filter by days if specified
        if (days) {
          const cutoffDate = new Date()
          cutoffDate.setDate(cutoffDate.getDate() - days)

          productHistory = productHistory.filter(
            record => new Date(record.effectiveDate) >= cutoffDate
          )
        }

        // Sort by date (newest first)
        productHistory.sort(
          (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
        )

        results[productId] = productHistory
      })

      DebugUtils.info(MODULE_NAME, '✅ Bulk price history loaded', {
        processed: Object.keys(results).length,
        totalRecords: Object.values(results).reduce((sum, history) => sum + history.length, 0)
      })

      return results
    } catch (error) {
      DebugUtils.error(MODULE_NAME, '❌ Error loading bulk price history', { error })
      throw error
    } finally {
      loading.value = false
    }
  }

  // 🆕 Predict future price based on trend
  const predictPrice = (
    history: ProductPriceHistory[],
    daysAhead: number
  ): {
    predictedPrice: number
    confidence: 'high' | 'medium' | 'low'
    range: { min: number; max: number }
  } => {
    if (history.length < 3) {
      const currentPrice = history[0]?.pricePerUnit || 0
      return {
        predictedPrice: currentPrice,
        confidence: 'low',
        range: { min: currentPrice * 0.9, max: currentPrice * 1.1 }
      }
    }

    const trend = getPriceTrend(history, 60) // Use 60 days for prediction
    const currentPrice = history[0].pricePerUnit

    // Simple linear extrapolation
    const dailyChangeRate = trend.changePercent / 60 / 100 // Daily change rate
    const futureChangeRate = dailyChangeRate * daysAhead

    const predictedPrice = currentPrice * (1 + futureChangeRate)

    // Apply volatility to create confidence range
    const volatilityRange = (trend.volatility / 100) * predictedPrice

    return {
      predictedPrice: Math.round(predictedPrice),
      confidence: trend.confidence,
      range: {
        min: Math.round(predictedPrice - volatilityRange),
        max: Math.round(predictedPrice + volatilityRange)
      }
    }
  }

  // Computed properties
  const isLoading = computed(() => loading.value)
  const hasError = computed(() => !!error.value)

  return {
    // State
    loading: isLoading,
    error: computed(() => error.value),

    // Core functions
    getPriceHistory,
    addPriceRecord,
    getBulkPriceHistory,

    // Analysis functions
    getPriceTrend,
    getChartData,
    getPriceStatistics,
    predictPrice,

    // Utilities
    updateProductCurrentCost
  }
}
