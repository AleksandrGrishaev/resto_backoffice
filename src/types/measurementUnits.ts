// src/types/measurementUnits.ts

// =============================================
// ЕДИНАЯ СИСТЕМА ЕДИНИЦ ИЗМЕРЕНИЯ
// =============================================

export type MeasurementUnit =
  // Вес
  | 'gram'
  | 'kg'
  // Объем
  | 'ml'
  | 'liter'
  // Штучные
  | 'piece'
  | 'pack'
  // Кулинарные меры
  | 'tsp' // чайная ложка
  | 'tbsp' // столовая ложка

// Типы единиц измерения
export type UnitType = 'weight' | 'volume' | 'piece' | 'culinary'

// Детальная информация о единице измерения
export interface UnitInfo {
  id: MeasurementUnit
  name: string
  shortName: string
  type: UnitType
  baseUnit?: MeasurementUnit // базовая единица для конвертации
  conversionRate?: number // коэффициент перевода в базовую единицу
  description?: string
}

// =============================================
// КОНСТАНТЫ И СПРАВОЧНИКИ
// =============================================

export const MEASUREMENT_UNITS: Record<MeasurementUnit, UnitInfo> = {
  // Вес
  gram: {
    id: 'gram',
    name: 'Грамм',
    shortName: 'г',
    type: 'weight',
    conversionRate: 1,
    description: 'Базовая единица веса'
  },
  kg: {
    id: 'kg',
    name: 'Килограмм',
    shortName: 'кг',
    type: 'weight',
    baseUnit: 'gram',
    conversionRate: 1000,
    description: '1 кг = 1000 г'
  },

  // Объем
  ml: {
    id: 'ml',
    name: 'Миллилитр',
    shortName: 'мл',
    type: 'volume',
    conversionRate: 1,
    description: 'Базовая единица объема'
  },
  liter: {
    id: 'liter',
    name: 'Литр',
    shortName: 'л',
    type: 'volume',
    baseUnit: 'ml',
    conversionRate: 1000,
    description: '1 л = 1000 мл'
  },

  // Штучные
  piece: {
    id: 'piece',
    name: 'Штука',
    shortName: 'шт',
    type: 'piece',
    conversionRate: 1,
    description: 'Штучный товар'
  },
  pack: {
    id: 'pack',
    name: 'Упаковка',
    shortName: 'уп',
    type: 'piece',
    conversionRate: 1,
    description: 'Упаковка товара'
  },

  // Кулинарные меры
  tsp: {
    id: 'tsp',
    name: 'Чайная ложка',
    shortName: 'ч.л.',
    type: 'culinary',
    baseUnit: 'ml',
    conversionRate: 5,
    description: '1 ч.л. ≈ 5 мл ≈ 3-5 г (зависит от продукта)'
  },
  tbsp: {
    id: 'tbsp',
    name: 'Столовая ложка',
    shortName: 'ст.л.',
    type: 'culinary',
    baseUnit: 'ml',
    conversionRate: 15,
    description: '1 ст.л. ≈ 15 мл ≈ 10-15 г (зависит от продукта)'
  }
}

// Группировка единиц по типам
export const UNITS_BY_TYPE: Record<UnitType, MeasurementUnit[]> = {
  weight: ['gram', 'kg'],
  volume: ['ml', 'liter'],
  piece: ['piece', 'pack'],
  culinary: ['tsp', 'tbsp']
}

// Единицы для разных контекстов
export const PRODUCT_UNITS: MeasurementUnit[] = ['kg', 'gram', 'liter', 'ml', 'piece', 'pack']
export const RECIPE_UNITS: MeasurementUnit[] = [
  'gram',
  'kg',
  'ml',
  'liter',
  'piece',
  'tsp',
  'tbsp',
  'pack'
]
export const MENU_COMPOSITION_UNITS: MeasurementUnit[] = ['gram', 'ml', 'piece'] // только точные единицы

// =============================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С ЕДИНИЦАМИ
// =============================================

/**
 * Получить информацию о единице измерения
 */
export function getUnitInfo(unit: MeasurementUnit): UnitInfo {
  return MEASUREMENT_UNITS[unit]
}

/**
 * Получить короткое название единицы
 */
export function getUnitShortName(unit: MeasurementUnit): string {
  return MEASUREMENT_UNITS[unit].shortName
}

/**
 * Получить полное название единицы
 */
export function getUnitName(unit: MeasurementUnit): string {
  return MEASUREMENT_UNITS[unit].name
}

/**
 * Проверить совместимость единиц измерения (один тип)
 */
export function areUnitsCompatible(unit1: MeasurementUnit, unit2: MeasurementUnit): boolean {
  const info1 = MEASUREMENT_UNITS[unit1]
  const info2 = MEASUREMENT_UNITS[unit2]
  return info1.type === info2.type
}

/**
 * Конвертировать значение между единицами измерения
 */
export function convertUnits(
  value: number,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit
): number {
  const fromInfo = MEASUREMENT_UNITS[fromUnit]
  const toInfo = MEASUREMENT_UNITS[toUnit]

  // Проверяем совместимость
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    throw new Error(`Cannot convert between ${fromUnit} and ${toUnit} - different types`)
  }

  // Если единицы одинаковые
  if (fromUnit === toUnit) {
    return value
  }

  // Конвертируем через базовые единицы
  const fromRate = fromInfo.conversionRate || 1
  const toRate = toInfo.conversionRate || 1

  return (value * fromRate) / toRate
}

/**
 * Форматировать значение с единицей измерения
 */
export function formatWithUnit(
  value: number,
  unit: MeasurementUnit,
  options?: {
    showFullName?: boolean
    precision?: number
  }
): string {
  const precision = options?.precision ?? 1
  const formattedValue = Number(value.toFixed(precision))
  const unitName = options?.showFullName ? getUnitName(unit) : getUnitShortName(unit)

  return `${formattedValue} ${unitName}`
}

/**
 * Получить единицы измерения для определенного контекста
 */
export function getUnitsForContext(context: 'products' | 'recipes' | 'menu'): MeasurementUnit[] {
  switch (context) {
    case 'products':
      return PRODUCT_UNITS
    case 'recipes':
      return RECIPE_UNITS
    case 'menu':
      return MENU_COMPOSITION_UNITS
    default:
      return Object.keys(MEASUREMENT_UNITS) as MeasurementUnit[]
  }
}

/**
 * Получить единицы измерения по типу
 */
export function getUnitsByType(type: UnitType): MeasurementUnit[] {
  return UNITS_BY_TYPE[type]
}

// =============================================
// ВАЛИДАЦИЯ
// =============================================

/**
 * Проверить, является ли строка валидной единицей измерения
 */
export function isValidUnit(unit: string): unit is MeasurementUnit {
  return Object.keys(MEASUREMENT_UNITS).includes(unit)
}

/**
 * Проверить, подходит ли единица для определенного контекста
 */
export function isUnitValidForContext(
  unit: MeasurementUnit,
  context: 'products' | 'recipes' | 'menu'
): boolean {
  return getUnitsForContext(context).includes(unit)
}
