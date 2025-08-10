// src/stores/recipes/composables/useUnits.ts - Units Logic (Minimal)

import { ref } from 'vue'
import { DebugUtils } from '@/utils'
import type { Unit } from '../types'

const MODULE_NAME = 'useUnits'

// =============================================
// STATE
// =============================================

// Global state for units
const units = ref<Unit[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// =============================================
// MAIN COMPOSABLE
// =============================================

export function useUnits() {
  // =============================================
  // SETUP
  // =============================================

  /**
   * Инициализирует данные единиц измерения
   */
  async function initializeUnits(initialData: Unit[] = []): Promise<void> {
    try {
      loading.value = true
      error.value = null

      units.value = [...initialData]

      DebugUtils.info(MODULE_NAME, '✅ Units initialized', {
        total: units.value.length
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize units'
      error.value = message
      DebugUtils.error(MODULE_NAME, message, { err })
      throw err
    } finally {
      loading.value = false
    }
  }

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  /**
   * Получает все единицы измерения
   */
  function getAllUnits(): Unit[] {
    return [...units.value]
  }

  /**
   * Получает единицу по ID
   */
  function getUnitById(id: string): Unit | null {
    return units.value.find(item => item.id === id) || null
  }

  /**
   * Получает единицы по типу
   */
  function getUnitsByType(type: 'weight' | 'volume' | 'piece'): Unit[] {
    return units.value.filter(unit => unit.type === type)
  }

  /**
   * Получает единицу по короткому имени
   */
  function getUnitByShortName(shortName: string): Unit | null {
    return units.value.find(unit => unit.shortName === shortName) || null
  }

  // =============================================
  // CONVERSION
  // =============================================

  /**
   * Конвертирует между единицами измерения
   */
  function convertUnits(value: number, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return value

    const from = getUnitByShortName(fromUnit)
    const to = getUnitByShortName(toUnit)

    if (!from || !to) {
      DebugUtils.warn(MODULE_NAME, `Unknown units: ${fromUnit} -> ${toUnit}`)
      return value // возвращаем как есть
    }

    if (from.type !== to.type) {
      DebugUtils.warn(
        MODULE_NAME,
        `Cannot convert between different unit types: ${from.type} -> ${to.type}`
      )
      return value // возвращаем как есть
    }

    // Простая конвертация через базовую единицу
    const fromBase = from.conversionRate || 1
    const toBase = to.conversionRate || 1

    const result = (value * fromBase) / toBase

    DebugUtils.debug(MODULE_NAME, `Converted ${value} ${fromUnit} = ${result} ${toUnit}`)

    return result
  }

  // =============================================
  // UTILITIES
  // =============================================

  /**
   * Очищает ошибки
   */
  function clearError(): void {
    error.value = null
  }

  /**
   * Получает опции для select'ов
   */
  function getUnitOptions(type?: 'weight' | 'volume' | 'piece') {
    const filteredUnits = type ? getUnitsByType(type) : getAllUnits()

    return filteredUnits.map(unit => ({
      value: unit.shortName,
      label: `${unit.name} (${unit.shortName})`,
      type: unit.type
    }))
  }

  // =============================================
  // RETURN COMPOSABLE
  // =============================================

  return {
    // State
    units,
    loading,
    error,

    // Setup
    initializeUnits,

    // CRUD
    getAllUnits,
    getUnitById,
    getUnitsByType,
    getUnitByShortName,

    // Conversion
    convertUnits,

    // Utilities
    clearError,
    getUnitOptions
  }
}
