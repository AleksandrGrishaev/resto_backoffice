// src/stores/debug/composables/useEnhancedHistory.ts
import { watch } from 'vue'
import { DebugUtils } from '@/utils'
import type { DebugHistoryEntry, DebugChange } from '../types'
import { useDebugStore } from '../debugStore'

const MODULE_NAME = 'useEnhancedHistory'

interface DetailedChange extends DebugChange {
  // Enhanced change tracking
  depth: number
  context: string // parent object context
  previousSnapshot?: any // small snapshot of previous state
  currentSnapshot?: any // small snapshot of current state
  changeSize: number // how much data changed
  timestamp: string
}

interface EnhancedHistoryEntry extends Omit<DebugHistoryEntry, 'changes'> {
  changes: DetailedChange[]
  summary: {
    totalChanges: number
    significantChanges: number
    dataSize: number
    affectedKeys: string[]
  }
  diff?: {
    added: string[]
    modified: string[]
    deleted: string[]
  }
}

/**
 * Enhanced history tracking with detailed change detection
 */
export function useEnhancedHistory() {
  const debugStore = useDebugStore()

  // =============================================
  // ENHANCED CHANGE DETECTION
  // =============================================

  /**
   * Детальное сравнение объектов с контекстом
   */
  function detectDetailedChanges(
    oldData: any,
    newData: any,
    path: string = '',
    depth: number = 0
  ): DetailedChange[] {
    const changes: DetailedChange[] = []
    const maxDepth = 4 // Ограничиваем глубину для производительности

    if (depth > maxDepth) return changes

    try {
      // Обрабатываем массивы
      if (Array.isArray(oldData) && Array.isArray(newData)) {
        changes.push(...detectArrayChanges(oldData, newData, path, depth))
      }
      // Обрабатываем объекты
      else if (isObject(oldData) && isObject(newData)) {
        changes.push(...detectObjectChanges(oldData, newData, path, depth))
      }
      // Примитивные значения
      else if (oldData !== newData) {
        changes.push(createDetailedChange('modified', path, oldData, newData, depth))
      }

      return changes
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Error detecting detailed changes', { error, path })
      return []
    }
  }

  /**
   * Детекция изменений в массивах
   */
  function detectArrayChanges(
    oldArray: any[],
    newArray: any[],
    path: string,
    depth: number
  ): DetailedChange[] {
    const changes: DetailedChange[] = []
    const timestamp = new Date().toISOString()

    // Изменение длины массива
    if (oldArray.length !== newArray.length) {
      changes.push({
        path: `${path}[length]`,
        oldValue: oldArray.length,
        newValue: newArray.length,
        type: 'modified',
        depth,
        context: getContext(path),
        changeSize: Math.abs(newArray.length - oldArray.length),
        timestamp
      })
    }

    // Сравниваем элементы (только первые 10 для производительности)
    const maxItems = Math.min(10, Math.max(oldArray.length, newArray.length))

    for (let i = 0; i < maxItems; i++) {
      const itemPath = `${path}[${i}]`
      const oldItem = oldArray[i]
      const newItem = newArray[i]

      if (i >= oldArray.length) {
        // Новый элемент добавлен
        changes.push(createDetailedChange('added', itemPath, undefined, newItem, depth))
      } else if (i >= newArray.length) {
        // Элемент удален
        changes.push(createDetailedChange('deleted', itemPath, oldItem, undefined, depth))
      } else if (!deepEqual(oldItem, newItem)) {
        // Элемент изменен
        if (isObject(oldItem) && isObject(newItem)) {
          // Рекурсивно проверяем изменения в объекте
          changes.push(...detectDetailedChanges(oldItem, newItem, itemPath, depth + 1))
        } else {
          changes.push(createDetailedChange('modified', itemPath, oldItem, newItem, depth))
        }
      }
    }

    // Если массив слишком большой, добавляем сводную информацию
    if (Math.max(oldArray.length, newArray.length) > maxItems) {
      changes.push({
        path: `${path}[...more]`,
        oldValue: `${oldArray.length - maxItems} more items`,
        newValue: `${newArray.length - maxItems} more items`,
        type: 'modified',
        depth,
        context: getContext(path),
        changeSize: Math.abs(newArray.length - oldArray.length),
        timestamp
      })
    }

    return changes
  }

  /**
   * Детекция изменений в объектах
   */
  function detectObjectChanges(
    oldObj: Record<string, any>,
    newObj: Record<string, any>,
    path: string,
    depth: number
  ): DetailedChange[] {
    const changes: DetailedChange[] = []
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key
      const oldValue = oldObj[key]
      const newValue = newObj[key]

      if (!(key in oldObj)) {
        // Новое свойство
        changes.push(createDetailedChange('added', keyPath, undefined, newValue, depth))
      } else if (!(key in newObj)) {
        // Удаленное свойство
        changes.push(createDetailedChange('deleted', keyPath, oldValue, undefined, depth))
      } else if (!deepEqual(oldValue, newValue)) {
        // Измененное свойство
        if (isObject(oldValue) && isObject(newValue)) {
          // Рекурсивно проверяем вложенные изменения
          changes.push(...detectDetailedChanges(oldValue, newValue, keyPath, depth + 1))
        } else {
          changes.push(createDetailedChange('modified', keyPath, oldValue, newValue, depth))
        }
      }
    }

    return changes
  }

  /**
   * Создание детального изменения
   */
  function createDetailedChange(
    type: 'added' | 'modified' | 'deleted',
    path: string,
    oldValue: any,
    newValue: any,
    depth: number
  ): DetailedChange {
    const timestamp = new Date().toISOString()

    return {
      path,
      oldValue,
      newValue,
      type,
      depth,
      context: getContext(path),
      previousSnapshot: createValueSnapshot(oldValue),
      currentSnapshot: createValueSnapshot(newValue),
      changeSize: calculateChangeSize(oldValue, newValue),
      timestamp
    }
  }

  // =============================================
  // ENHANCED HISTORY ENTRY CREATION
  // =============================================

  /**
   * Создание расширенной записи истории
   */
  function createEnhancedHistoryEntry(
    storeId: string,
    action: string,
    oldData: any,
    newData: any,
    metadata?: any
  ): EnhancedHistoryEntry {
    const changes = detectDetailedChanges(oldData, newData)
    const summary = generateChangeSummary(changes)
    const diff = generateDiff(changes)

    return {
      id: generateHistoryId(),
      storeId,
      timestamp: new Date().toISOString(),
      action,
      changeType: determineChangeType(changes),
      changes,
      summary,
      diff,
      snapshot: {
        metadata,
        dataSize: JSON.stringify(newData).length,
        structure: analyzeDataStructure(newData)
      }
    }
  }

  /**
   * Генерация сводки изменений
   */
  function generateChangeSummary(changes: DetailedChange[]) {
    const affectedKeys = new Set<string>()
    let totalDataSize = 0
    let significantChanges = 0

    changes.forEach(change => {
      // Извлекаем ключ верхнего уровня
      const topLevelKey = change.path.split(/[.\[]/, 2)[0]
      affectedKeys.add(topLevelKey)

      totalDataSize += change.changeSize

      // Считаем значительными изменения на глубине <= 2 с размером > 10
      if (change.depth <= 2 && change.changeSize > 10) {
        significantChanges++
      }
    })

    return {
      totalChanges: changes.length,
      significantChanges,
      dataSize: totalDataSize,
      affectedKeys: Array.from(affectedKeys)
    }
  }

  /**
   * Генерация diff сводки
   */
  function generateDiff(changes: DetailedChange[]) {
    const diff = {
      added: [] as string[],
      modified: [] as string[],
      deleted: [] as string[]
    }

    changes.forEach(change => {
      diff[change.type].push(change.path)
    })

    return diff
  }

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  function isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }

  function deepEqual(a: any, b: any): boolean {
    if (a === b) return true
    if (a == null || b == null) return false
    if (typeof a !== typeof b) return false

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((val, i) => deepEqual(val, b[i]))
    }

    if (isObject(a) && isObject(b)) {
      const keysA = Object.keys(a)
      const keysB = Object.keys(b)
      if (keysA.length !== keysB.length) return false
      return keysA.every(key => deepEqual(a[key], b[key]))
    }

    return false
  }

  function getContext(path: string): string {
    const parts = path.split(/[.\[]/)
    if (parts.length > 1) {
      return parts[0] // Возвращаем корневой ключ как контекст
    }
    return 'root'
  }

  function createValueSnapshot(value: any): any {
    if (value === undefined || value === null) return value

    try {
      if (Array.isArray(value)) {
        return {
          type: 'array',
          length: value.length,
          preview: value.slice(0, 3), // Первые 3 элемента
          hasMore: value.length > 3
        }
      }

      if (isObject(value)) {
        const keys = Object.keys(value)
        return {
          type: 'object',
          keys: keys.slice(0, 5), // Первые 5 ключей
          hasMore: keys.length > 5,
          preview: keys.slice(0, 3).reduce((acc, key) => {
            acc[key] = value[key]
            return acc
          }, {} as any)
        }
      }

      // Примитивные значения
      if (typeof value === 'string' && value.length > 50) {
        return {
          type: 'string',
          preview: value.substring(0, 47) + '...',
          length: value.length
        }
      }

      return value
    } catch (error) {
      return { error: 'Failed to create snapshot' }
    }
  }

  function calculateChangeSize(oldValue: any, newValue: any): number {
    try {
      const oldSize = oldValue ? JSON.stringify(oldValue).length : 0
      const newSize = newValue ? JSON.stringify(newValue).length : 0
      return Math.abs(newSize - oldSize)
    } catch {
      return 0
    }
  }

  function determineChangeType(changes: DetailedChange[]): 'state' | 'data' | 'error' {
    // Если есть изменения в error полях, это error
    if (changes.some(c => c.path.includes('error') || c.path.includes('Error'))) {
      return 'error'
    }

    // Если есть изменения в loading или других состояниях, это state
    if (changes.some(c => c.path.includes('loading') || c.path.includes('selected'))) {
      return 'state'
    }

    // Иначе это data
    return 'data'
  }

  function analyzeDataStructure(data: any) {
    const structure: Record<string, any> = {}

    if (isObject(data)) {
      Object.keys(data).forEach(key => {
        const value = data[key]
        if (Array.isArray(value)) {
          structure[key] = {
            type: 'array',
            length: value.length,
            itemType: value.length > 0 ? typeof value[0] : 'unknown'
          }
        } else if (isObject(value)) {
          structure[key] = {
            type: 'object',
            keys: Object.keys(value).length
          }
        } else {
          structure[key] = {
            type: typeof value,
            value:
              typeof value === 'string' && value.length > 20
                ? `${value.substring(0, 20)}...`
                : value
          }
        }
      })
    }

    return structure
  }

  function generateHistoryId(): string {
    return `enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // =============================================
  // HISTORY FORMATTING FOR UI
  // =============================================

  /**
   * Форматирование расширенной истории для UI
   */
  function formatEnhancedHistory(entries: EnhancedHistoryEntry[]) {
    return entries.map(entry => ({
      ...entry,
      formattedSummary: formatChangeSummary(entry.summary),
      formattedChanges: formatDetailedChanges(entry.changes),
      importantChanges: entry.changes.filter(c => c.depth <= 2 && c.changeSize > 10),
      groupedChanges: groupChangesByContext(entry.changes)
    }))
  }

  function formatChangeSummary(summary: any): string {
    const parts = []

    if (summary.totalChanges > 0) {
      parts.push(`${summary.totalChanges} change${summary.totalChanges > 1 ? 's' : ''}`)
    }

    if (summary.significantChanges > 0) {
      parts.push(`${summary.significantChanges} significant`)
    }

    if (summary.affectedKeys.length > 0) {
      parts.push(
        `in: ${summary.affectedKeys.slice(0, 3).join(', ')}${summary.affectedKeys.length > 3 ? '...' : ''}`
      )
    }

    return parts.join(' ') || 'No changes detected'
  }

  function formatDetailedChanges(changes: DetailedChange[]): string {
    if (changes.length === 0) return 'No specific changes'

    const grouped = groupChangesByContext(changes)
    const summaries = Object.entries(grouped).map(([context, contextChanges]) => {
      const types = contextChanges.reduce(
        (acc, change) => {
          acc[change.type] = (acc[change.type] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      const typeDesc = Object.entries(types)
        .map(([type, count]) => `${count} ${type}`)
        .join(', ')

      return `${context}: ${typeDesc}`
    })

    return summaries.slice(0, 3).join(' | ') + (summaries.length > 3 ? '...' : '')
  }

  function groupChangesByContext(changes: DetailedChange[]): Record<string, DetailedChange[]> {
    return changes.reduce(
      (groups, change) => {
        const context = change.context
        if (!groups[context]) groups[context] = []
        groups[context].push(change)
        return groups
      },
      {} as Record<string, DetailedChange[]>
    )
  }

  // =============================================
  // PUBLIC API
  // =============================================

  return {
    // Enhanced detection
    detectDetailedChanges,
    createEnhancedHistoryEntry,

    // Formatting
    formatEnhancedHistory,
    formatChangeSummary,
    formatDetailedChanges,
    groupChangesByContext,

    // Utilities
    generateChangeSummary,
    createValueSnapshot
  }
}

// =============================================
// TYPE EXPORTS
// =============================================

export type { DetailedChange, EnhancedHistoryEntry }
