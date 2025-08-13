// src/stores/debug/composables/useDebugFormatting.ts
import { computed } from 'vue'
import { DebugUtils } from '@/utils'
import type {
  DebugStoreData,
  DebugHistoryEntry,
  DebugStoreInfo,
  DebugStoreAnalysis
} from '../types'

const MODULE_NAME = 'useDebugFormatting'

/**
 * Composable для форматирования debug данных для UI
 * Фокус только на форматировании - без логики stores и истории
 */
export function useDebugFormatting() {
  // =============================================
  // RAW JSON FORMATTING
  // =============================================

  /**
   * Форматирует raw JSON для отображения в UI
   */
  function formatRawJson(storeData: DebugStoreData | null): string {
    if (!storeData) return ''

    try {
      return JSON.stringify(storeData.state, null, 2)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to format raw JSON', { error })
      return '{\n  "error": "Failed to format JSON"\n}'
    }
  }

  /**
   * Форматирует JSON с подсветкой синтаксиса (упрощенная версия)
   */
  function formatJsonWithHighlight(data: any): string {
    try {
      const jsonString = JSON.stringify(data, null, 2)

      // Простая подсветка синтаксиса через замены
      return jsonString
        .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
        .replace(/: (".*?")/g, ': <span class="json-string">$1</span>')
        .replace(/: (true|false|null)/g, ': <span class="json-boolean">$1</span>')
        .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
    } catch (error) {
      return JSON.stringify(data, null, 2)
    }
  }

  // =============================================
  // STRUCTURED DATA FORMATTING
  // =============================================

  /**
   * Форматирует структурированные данные для UI
   */
  function formatStructuredData(storeData: DebugStoreData | null) {
    if (!storeData) return null

    try {
      return {
        overview: formatOverview(storeData),
        breakdown: formatBreakdown(storeData.analysis),
        specificMetrics: formatSpecificMetrics(storeData.analysis),
        actions: formatActions(storeData.actions),
        health: formatHealth(storeData.analysis.health)
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to format structured data', { error })
      return {
        error: 'Failed to format structured data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Форматирует обзорную информацию
   */
  function formatOverview(storeData: DebugStoreData) {
    const analysis = storeData.analysis

    return {
      name: storeData.name,
      timestamp: storeData.timestamp,
      totalItems: analysis.totalItems,
      activeItems: analysis.activeItems,
      inactiveItems: analysis.inactiveItems,
      health: analysis.health,
      lastUpdated: formatTimestamp(storeData.timestamp)
    }
  }

  /**
   * Форматирует разбивку данных по типам
   */
  function formatBreakdown(analysis: DebugStoreAnalysis) {
    return {
      arrays: analysis.breakdown.arrays,
      objects: analysis.breakdown.objects,
      primitives: analysis.breakdown.primitives,
      functions: analysis.breakdown.functions,
      total: Object.values(analysis.breakdown).reduce((sum, count) => sum + count, 0)
    }
  }

  /**
   * Форматирует специфичные метрики store
   */
  function formatSpecificMetrics(analysis: DebugStoreAnalysis) {
    if (!analysis.specificMetrics || Object.keys(analysis.specificMetrics).length === 0) {
      return null
    }

    // Группируем метрики по категориям для лучшего отображения
    const categorized: Record<string, any> = {}

    for (const [key, value] of Object.entries(analysis.specificMetrics)) {
      if (key.includes('Count') || key.includes('Length') || key.includes('Total')) {
        if (!categorized.counts) categorized.counts = {}
        categorized.counts[key] = value
      } else if (key.includes('Breakdown') || key.includes('By')) {
        if (!categorized.breakdowns) categorized.breakdowns = {}
        categorized.breakdowns[key] = value
      } else if (key.includes('Avg') || key.includes('Average')) {
        if (!categorized.averages) categorized.averages = {}
        categorized.averages[key] = value
      } else {
        if (!categorized.other) categorized.other = {}
        categorized.other[key] = value
      }
    }

    return categorized
  }

  /**
   * Форматирует список действий
   */
  function formatActions(actions: string[]) {
    return actions.map(action => ({
      name: action,
      displayName: formatActionName(action),
      category: getActionCategory(action)
    }))
  }

  /**
   * Форматирует информацию о здоровье store
   */
  function formatHealth(health: DebugStoreAnalysis['health']) {
    return {
      status: health.status,
      statusColor: getHealthColor(health.status),
      statusIcon: getHealthIcon(health.status),
      issues: health.issues,
      warnings: health.warnings,
      totalProblems: health.issues.length + health.warnings.length
    }
  }

  // =============================================
  // HISTORY FORMATTING
  // =============================================

  /**
   * Форматирует историю изменений для UI
   */
  function formatHistory(history: DebugHistoryEntry[]) {
    return history.map(entry => ({
      ...entry,
      formattedTimestamp: formatTimestamp(entry.timestamp),
      formattedChanges: formatChanges(entry.changes),
      changesSummary: getChangesSummary(entry.changes),
      hasSnapshot: !!entry.snapshot,
      timeAgo: getTimeAgo(entry.timestamp),
      actionIcon: getActionIcon(entry.action),
      changeTypeColor: getChangeTypeColor(entry.changeType)
    }))
  }

  /**
   * Форматирует список изменений
   */
  function formatChanges(changes: any[]) {
    if (changes.length === 0) return 'No specific changes tracked'

    return changes
      .map(change => {
        const changeDesc = `${change.path}: ${change.type}`
        if (change.type === 'modified') {
          return `${changeDesc} (${String(change.oldValue)} → ${String(change.newValue)})`
        }
        return changeDesc
      })
      .join(', ')
  }

  /**
   * Создает краткое описание изменений
   */
  function getChangesSummary(changes: any[]) {
    if (changes.length === 0) return 'State updated'
    return `${changes.length} change${changes.length > 1 ? 's' : ''}`
  }

  // =============================================
  // STORE INFO FORMATTING
  // =============================================

  /**
   * Форматирует информацию о store для списка
   */
  function formatStoreInfo(storeInfo: DebugStoreInfo) {
    return {
      ...storeInfo,
      formattedSize: formatDataSize(storeInfo.size),
      formattedRecordCount: formatNumber(storeInfo.recordCount),
      lastUpdatedAgo: storeInfo.lastUpdated ? getTimeAgo(storeInfo.lastUpdated) : 'Never',
      statusColor: storeInfo.isLoaded ? 'success' : 'warning',
      statusText: storeInfo.isLoaded ? 'Loaded' : 'Not loaded'
    }
  }

  // =============================================
  // UTILITY FORMATTING FUNCTIONS
  // =============================================

  /**
   * Форматирует timestamp в читаемый вид
   */
  function formatTimestamp(timestamp: string): string {
    try {
      return new Date(timestamp).toLocaleString()
    } catch (error) {
      return timestamp
    }
  }

  /**
   * Форматирует число с разделителями
   */
  function formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num)
  }

  /**
   * Форматирует размер данных
   */
  function formatDataSize(size: string | number): string {
    if (typeof size === 'string') return size

    const bytes = size
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  /**
   * Получает время "назад" (time ago)
   */
  function getTimeAgo(timestamp: string): string {
    try {
      const now = new Date()
      const time = new Date(timestamp)
      const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)

      if (diffInSeconds < 60) return `${diffInSeconds}s ago`
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
      return `${Math.floor(diffInSeconds / 86400)}d ago`
    } catch (error) {
      return 'Unknown'
    }
  }

  /**
   * Форматирует имя действия в читаемый вид
   */
  function formatActionName(action: string): string {
    return action
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // =============================================
  // UI HELPER FUNCTIONS
  // =============================================

  /**
   * Получает цвет для статуса здоровья
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
        return 'default'
    }
  }

  /**
   * Получает иконку для статуса здоровья
   */
  function getHealthIcon(status: string): string {
    switch (status) {
      case 'healthy':
        return 'mdi-check-circle'
      case 'warning':
        return 'mdi-alert-circle'
      case 'error':
        return 'mdi-close-circle'
      default:
        return 'mdi-help-circle'
    }
  }

  /**
   * Получает категорию действия
   */
  function getActionCategory(action: string): string {
    if (action.includes('fetch') || action.includes('load')) return 'data'
    if (action.includes('create') || action.includes('update') || action.includes('delete'))
      return 'crud'
    if (action.includes('filter') || action.includes('search')) return 'filtering'
    if (action.includes('select') || action.includes('toggle')) return 'selection'
    return 'other'
  }

  /**
   * Получает иконку для действия
   */
  function getActionIcon(action: string): string {
    if (action.includes('fetch') || action.includes('load')) return 'mdi-download'
    if (action.includes('create')) return 'mdi-plus'
    if (action.includes('update')) return 'mdi-pencil'
    if (action.includes('delete')) return 'mdi-delete'
    if (action.includes('state_change')) return 'mdi-swap-horizontal'
    if (action.includes('tracking')) return 'mdi-radar'
    return 'mdi-cog'
  }

  /**
   * Получает цвет для типа изменения
   */
  function getChangeTypeColor(changeType: string): string {
    switch (changeType) {
      case 'state':
        return 'info'
      case 'data':
        return 'primary'
      case 'error':
        return 'error'
      default:
        return 'default'
    }
  }

  // =============================================
  // COMPUTED FORMATTERS
  // =============================================

  /**
   * Создает computed formatter для reactive использования
   */
  function createFormatterComputed<T, R>(source: () => T, formatter: (data: T) => R) {
    return computed(() => {
      try {
        const data = source()
        return formatter(data)
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Formatter computed error', { error })
        return null
      }
    })
  }

  // =============================================
  // RETURN PUBLIC API
  // =============================================

  return {
    // Raw JSON formatting
    formatRawJson,
    formatJsonWithHighlight,

    // Structured data formatting
    formatStructuredData,
    formatOverview,
    formatBreakdown,
    formatSpecificMetrics,
    formatActions,
    formatHealth,

    // History formatting
    formatHistory,
    formatChanges,
    getChangesSummary,

    // Store info formatting
    formatStoreInfo,

    // Utility formatters
    formatTimestamp,
    formatNumber,
    formatDataSize,
    getTimeAgo,
    formatActionName,

    // UI helpers
    getHealthColor,
    getHealthIcon,
    getActionCategory,
    getActionIcon,
    getChangeTypeColor,

    // Computed formatter factory
    createFormatterComputed
  }
}
