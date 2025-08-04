// src/composables/useMeasurementUnits.ts
import { computed } from 'vue'
import type { MeasurementUnit, UnitType } from '@/types/measurementUnits'
import {
  MEASUREMENT_UNITS,
  UNITS_BY_TYPE,
  getUnitInfo,
  getUnitShortName,
  getUnitName,
  areUnitsCompatible,
  convertUnits,
  formatWithUnit,
  getUnitsForContext,
  getUnitsByType,
  isValidUnit,
  isUnitValidForContext
} from '@/types/measurementUnits'

/**
 * Composable для работы с единицами измерения
 */
export function useMeasurementUnits() {
  // =============================================
  // ОСНОВНЫЕ ФУНКЦИИ
  // =============================================

  /**
   * Получить все единицы измерения
   */
  const getAllUnits = computed(() => MEASUREMENT_UNITS)

  /**
   * Получить единицы по типу
   */
  const getUnitsByTypeComputed = (type: UnitType) => computed(() => UNITS_BY_TYPE[type])

  /**
   * Получить единицы для определенного контекста
   */
  const getContextUnits = (context: 'products' | 'recipes' | 'menu') =>
    computed(() => getUnitsForContext(context))

  /**
   * Получить опции для select компонента
   */
  const getUnitOptions = (context?: 'products' | 'recipes' | 'menu') =>
    computed(() => {
      const units = context
        ? getUnitsForContext(context)
        : (Object.keys(MEASUREMENT_UNITS) as MeasurementUnit[])

      return units.map(unit => ({
        value: unit,
        title: getUnitName(unit),
        shortText: getUnitShortName(unit),
        type: MEASUREMENT_UNITS[unit].type
      }))
    })

  /**
   * Получить опции сгруппированные по типам
   */
  const getGroupedUnitOptions = (context?: 'products' | 'recipes' | 'menu') =>
    computed(() => {
      const units = context
        ? getUnitsForContext(context)
        : (Object.keys(MEASUREMENT_UNITS) as MeasurementUnit[])

      const grouped: Record<
        UnitType,
        Array<{ value: MeasurementUnit; text: string; shortText: string }>
      > = {
        weight: [],
        volume: [],
        piece: [],
        culinary: []
      }

      units.forEach(unit => {
        const info = MEASUREMENT_UNITS[unit]
        grouped[info.type].push({
          value: unit,
          text: info.name,
          shortText: info.shortName
        })
      })

      return Object.entries(grouped)
        .filter(([_, items]) => items.length > 0)
        .map(([type, items]) => ({
          label: getTypeLabel(type as UnitType),
          items
        }))
    })

  // =============================================
  // УТИЛИТЫ
  // =============================================

  /**
   * Конвертировать единицы измерения с обработкой ошибок
   */
  const safeConvertUnits = (
    value: number,
    fromUnit: MeasurementUnit,
    toUnit: MeasurementUnit
  ): { success: boolean; value?: number; error?: string } => {
    try {
      const convertedValue = convertUnits(value, fromUnit, toUnit)
      return { success: true, value: convertedValue }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion error'
      }
    }
  }

  /**
   * Форматировать количество с единицей
   */
  const formatQuantity = (
    value: number,
    unit: MeasurementUnit,
    options?: {
      showFullName?: boolean
      precision?: number
    }
  ) => formatWithUnit(value, unit, options)

  /**
   * Валидировать единицу для контекста
   */
  const validateUnitForContext = (
    unit: MeasurementUnit,
    context: 'products' | 'recipes' | 'menu'
  ): { valid: boolean; error?: string } => {
    if (!isValidUnit(unit)) {
      return { valid: false, error: `Неизвестная единица измерения: ${unit}` }
    }

    if (!isUnitValidForContext(unit, context)) {
      return { valid: false, error: `Единица ${unit} не подходит для контекста ${context}` }
    }

    return { valid: true }
  }

  /**
   * Получить рекомендуемую единицу для значения
   */
  const getSuggestedUnit = (value: number, currentUnit: MeasurementUnit): MeasurementUnit => {
    const unitInfo = MEASUREMENT_UNITS[currentUnit]

    // Для веса: если больше 1000г, предложить кг
    if (unitInfo.type === 'weight' && currentUnit === 'gram' && value >= 1000) {
      return 'kg'
    }

    // Для веса: если меньше 1кг, предложить граммы
    if (unitInfo.type === 'weight' && currentUnit === 'kg' && value < 1) {
      return 'gram'
    }

    // Для объема: если больше 1000мл, предложить литры
    if (unitInfo.type === 'volume' && currentUnit === 'ml' && value >= 1000) {
      return 'liter'
    }

    // Для объема: если меньше 1л, предложить мл
    if (unitInfo.type === 'volume' && currentUnit === 'liter' && value < 1) {
      return 'ml'
    }

    return currentUnit
  }

  // =============================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // =============================================

  function getTypeLabel(type: UnitType): string {
    const labels: Record<UnitType, string> = {
      weight: 'Вес',
      volume: 'Объем',
      piece: 'Штучные',
      culinary: 'Кулинарные меры'
    }
    return labels[type]
  }

  // =============================================
  // ВОЗВРАЩАЕМЫЕ ЗНАЧЕНИЯ
  // =============================================

  return {
    // Computed значения
    allUnits: getAllUnits,

    // Функции получения данных
    getUnitInfo,
    getUnitName,
    getUnitShortName,
    getUnitsByType: getUnitsByTypeComputed,
    getContextUnits,
    getUnitOptions,
    getGroupedUnitOptions,

    // Утилиты
    areUnitsCompatible,
    convertUnits,
    safeConvertUnits,
    formatQuantity,
    validateUnitForContext,
    getSuggestedUnit,

    // Валидация
    isValidUnit,
    isUnitValidForContext,

    // Константы
    MEASUREMENT_UNITS,
    UNITS_BY_TYPE
  }
}

// =============================================
// ТИПИЗИРОВАННЫЕ ХЕЛПЕРЫ
// =============================================

/**
 * Типизированный хелпер для работы с единицами продуктов
 */
export function useProductUnits() {
  const { getContextUnits, getUnitOptions, validateUnitForContext } = useMeasurementUnits()

  return {
    units: getContextUnits('products'),
    unitOptions: getUnitOptions('products'),
    validateUnit: (unit: MeasurementUnit) => validateUnitForContext(unit, 'products')
  }
}

/**
 * Типизированный хелпер для работы с единицами рецептов
 */
export function useRecipeUnits() {
  const { getContextUnits, getUnitOptions, validateUnitForContext } = useMeasurementUnits()

  return {
    units: getContextUnits('recipes'),
    unitOptions: getUnitOptions('recipes'),
    validateUnit: (unit: MeasurementUnit) => validateUnitForContext(unit, 'recipes')
  }
}

/**
 * Типизированный хелпер для работы с единицами меню
 */
export function useMenuUnits() {
  const { getContextUnits, getUnitOptions, validateUnitForContext } = useMeasurementUnits()

  return {
    units: getContextUnits('menu'),
    unitOptions: getUnitOptions('menu'),
    validateUnit: (unit: MeasurementUnit) => validateUnitForContext(unit, 'menu')
  }
}
