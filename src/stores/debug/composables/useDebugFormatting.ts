// src/stores/debug/composables/useDebugFormatting.ts - SIMPLIFIED: Без форматирования истории
import { formatIDR, formatIDRShort } from '@/utils/currency'
import { TimeUtils } from '@/utils/time'
import type { DebugStoreInfo, DebugStoreData } from '../types'

/**
 * Упрощенный composable для форматирования debug данных (без истории)
 */
export function useDebugFormatting() {
  // =============================================
  // STORE FORMATTING
  // =============================================

  /**
   * Форматирование информации о store
   */
  function formatStoreInfo(store: DebugStoreInfo) {
    return {
      ...store,
      formattedRecordCount: formatNumber(store.recordCount),
      formattedLastUpdated: store.lastUpdated
        ? formatTimestamp(store.lastUpdated)
        : 'Never updated',
      statusColor: store.isLoaded ? 'success' : 'surface',
      statusText: store.isLoaded ? 'Loaded' : 'Not Loaded'
    }
  }

  /**
   * Форматирование структурированных данных store
   */
  function formatStructuredData(storeData: DebugStoreData | null) {
    if (!storeData) {
      return {
        overview: {
          totalItems: 0,
          activeItems: 0,
          inactiveItems: 0,
          health: { status: 'unknown', issues: [], warnings: [] }
        },
        health: { issues: [], warnings: [] },
        specificMetrics: {},
        actions: []
      }
    }

    const analysis = storeData.analysis

    return {
      overview: {
        totalItems: analysis.totalItems,
        activeItems: analysis.activeItems,
        inactiveItems: analysis.inactiveItems,
        health: analysis.health,
        formattedTotalItems: formatNumber(analysis.totalItems),
        formattedActiveItems: formatNumber(analysis.activeItems),
        formattedInactiveItems: formatNumber(analysis.inactiveItems)
      },
      health: {
        status: analysis.health.status,
        issues: analysis.health.issues,
        warnings: analysis.health.warnings,
        issuesCount: analysis.health.issues.length,
        warningsCount: analysis.health.warnings.length
      },
      specificMetrics: formatSpecificMetrics(analysis.specificMetrics),
      actions: storeData.actions,
      breakdown: {
        ...analysis.breakdown,
        total: Object.values(analysis.breakdown).reduce((sum, count) => sum + count, 0)
      },
      formattedTimestamp: formatTimestamp(storeData.timestamp),
      dataSize: estimateDataSize(storeData)
    }
  }

  /**
   * Форматирование специфичных метрик store
   */
  function formatSpecificMetrics(metrics: any): any {
    if (!metrics || typeof metrics !== 'object') {
      return {}
    }

    const formatted = { ...metrics }

    // Форматируем денежные значения
    const moneyFields = [
      'avgCostPerUnit',
      'avgPreparationCost',
      'avgRecipeCost',
      'totalBalance',
      'totalValue',
      'averageTransactionAmount',
      'avgPricePerItem'
    ]

    moneyFields.forEach(field => {
      if (typeof formatted[field] === 'number' && formatted[field] > 0) {
        formatted[`formatted_${field}`] = formatIDR(formatted[field])
      }
    })

    // Форматируем процентные значения
    const percentFields = ['workflowEfficiency']
    percentFields.forEach(field => {
      if (typeof formatted[field] === 'number') {
        formatted[`formatted_${field}`] = `${formatted[field]}%`
      }
    })

    // Форматируем числовые значения
    const numberFields = [
      'totalProducts',
      'totalCounterAgents',
      'totalPreparations',
      'totalRecipes',
      'totalAccounts',
      'totalTransactions',
      'totalCategories',
      'totalMenuItems',
      'totalVariants',
      'totalRequests',
      'totalOrders',
      'totalReceipts'
    ]

    numberFields.forEach(field => {
      if (typeof formatted[field] === 'number') {
        formatted[`formatted_${field}`] = formatNumber(formatted[field])
      }
    })

    return formatted
  }

  // =============================================
  // BASIC FORMATTING FUNCTIONS
  // =============================================

  /**
   * Форматирование timestamp
   */
  function formatTimestamp(timestamp: string): string {
    try {
      return TimeUtils.formatDateToDisplay(timestamp, 'dd.MM.yyyy HH:mm')
    } catch (error) {
      return timestamp
    }
  }

  /**
   * Форматирование чисел
   */
  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  /**
   * Получение цвета для статуса здоровья
   */
  function getHealthColor(status: string): string {
    switch (status) {
      case 'healthy':
        return 'success'
      case 'warning':
        return 'warning'
      case 'error':
        return 'error'
      default:
        return 'surface'
    }
  }

  /**
   * Форматирование размера данных
   */
  function formatDataSize(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  /**
   * Оценка размера данных объекта
   */
  function estimateDataSize(data: any): string {
    try {
      const jsonString = JSON.stringify(data)
      return formatDataSize(jsonString.length)
    } catch (error) {
      return 'Unknown'
    }
  }

  /**
   * Форматирование процента
   */
  function formatPercentage(value: number, precision: number = 1): string {
    return `${value.toFixed(precision)}%`
  }

  /**
   * Форматирование булевого значения
   */
  function formatBoolean(value: boolean): string {
    return value ? 'Yes' : 'No'
  }

  /**
   * Форматирование массива в строку
   */
  function formatArray(array: any[], maxItems: number = 3): string {
    if (!Array.isArray(array)) return 'Not an array'
    if (array.length === 0) return 'Empty'

    const preview = array.slice(0, maxItems).map(item => {
      if (typeof item === 'string') return item
      if (typeof item === 'object' && item.name) return item.name
      if (typeof item === 'object' && item.id) return item.id
      return String(item)
    })

    const result = preview.join(', ')
    return array.length > maxItems ? `${result} and ${array.length - maxItems} more` : result
  }

  /**
   * Форматирование объекта breakdown
   */
  function formatBreakdown(
    breakdown: Record<string, number>
  ): Array<{ label: string; value: number; formatted: string }> {
    return Object.entries(breakdown).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      formatted: formatNumber(value)
    }))
  }

  // =============================================
  // HEALTH STATUS FORMATTING
  // =============================================

  /**
   * Форматирование статуса здоровья с иконками
   */
  function formatHealthStatus(status: string): {
    text: string
    color: string
    icon: string
    description: string
  } {
    switch (status) {
      case 'healthy':
        return {
          text: 'Healthy',
          color: 'success',
          icon: 'mdi-check-circle',
          description: 'Store is operating normally'
        }
      case 'warning':
        return {
          text: 'Warning',
          color: 'warning',
          icon: 'mdi-alert',
          description: 'Store has minor issues'
        }
      case 'error':
        return {
          text: 'Error',
          color: 'error',
          icon: 'mdi-alert-circle',
          description: 'Store has critical issues'
        }
      default:
        return {
          text: 'Unknown',
          color: 'surface',
          icon: 'mdi-help-circle',
          description: 'Health status unknown'
        }
    }
  }

  /**
   * Форматирование списка проблем
   */
  function formatHealthIssues(
    issues: string[],
    warnings: string[]
  ): {
    hasIssues: boolean
    totalCount: number
    criticalCount: number
    warningCount: number
    formattedIssues: Array<{ type: 'error' | 'warning'; message: string; color: string }>
  } {
    const formattedIssues = [
      ...issues.map(issue => ({
        type: 'error' as const,
        message: issue,
        color: 'error'
      })),
      ...warnings.map(warning => ({
        type: 'warning' as const,
        message: warning,
        color: 'warning'
      }))
    ]

    return {
      hasIssues: formattedIssues.length > 0,
      totalCount: formattedIssues.length,
      criticalCount: issues.length,
      warningCount: warnings.length,
      formattedIssues
    }
  }

  // =============================================
  // STORE-SPECIFIC FORMATTING
  // =============================================

  /**
   * Форматирование для Products store
   */
  function formatProductsData(data: any) {
    if (!data.specificMetrics) return {}

    const metrics = data.specificMetrics
    return {
      summary: `${metrics.totalProducts || 0} products (${metrics.sellableProducts || 0} sellable, ${metrics.rawMaterials || 0} raw materials)`,
      avgCost: metrics.avgCostPerUnit ? formatIDR(metrics.avgCostPerUnit) : 'N/A',
      suppliersConnected: `${metrics.productsWithSuppliers || 0}/${metrics.totalProducts || 0}`,
      categories: Object.keys(metrics.categoriesBreakdown || {}).length,
      units: Object.keys(metrics.baseUnitsBreakdown || {}).length
    }
  }

  /**
   * Форматирование для Account store
   */
  function formatAccountsData(data: any) {
    if (!data.specificMetrics) return {}

    const metrics = data.specificMetrics
    return {
      summary: `${metrics.totalAccounts || 0} accounts with ${formatIDR(metrics.totalBalance || 0)} total balance`,
      transactions: `${metrics.totalTransactions || 0} transactions`,
      pending: `${metrics.pendingPayments || 0} pending payments`,
      urgent: `${metrics.urgentPayments || 0} urgent`,
      avgTransaction: metrics.averageTransactionAmount
        ? formatIDR(metrics.averageTransactionAmount)
        : 'N/A'
    }
  }

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // Store formatting
    formatStoreInfo,
    formatStructuredData,
    formatSpecificMetrics,

    // Basic formatting
    formatTimestamp,
    formatNumber,
    formatDataSize,
    formatPercentage,
    formatBoolean,
    formatArray,
    formatBreakdown,

    // Health formatting
    getHealthColor,
    formatHealthStatus,
    formatHealthIssues,

    // Store-specific formatting
    formatProductsData,
    formatAccountsData,

    // Utilities
    estimateDataSize
  }
}

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  setTimeout(() => {
    window.__DEBUG_FORMATTING_SIMPLIFIED__ = () => {
      console.log('=== useDebugFormatting composable (simplified) ===')
      console.log('Available for formatting debug data without history functions')

      const formatting = useDebugFormatting()
      console.log('Debug formatting instance:', formatting)

      return formatting
    }

    console.log('\n💡 useDebugFormatting (simplified) loaded! Try:')
    console.log('  • window.__DEBUG_FORMATTING_SIMPLIFIED__()')
  }, 1000)
}
