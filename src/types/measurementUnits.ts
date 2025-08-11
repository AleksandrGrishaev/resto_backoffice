// src/types/measurementUnits.ts - ENGLISH VERSION

// =============================================
// UNIFIED MEASUREMENT SYSTEM
// =============================================

export type MeasurementUnit =
  // Weight
  | 'gram'
  | 'kg'
  // Volume
  | 'ml'
  | 'liter'
  // Pieces
  | 'piece'
  | 'pack'
  // Culinary measures
  | 'tsp' // teaspoon
  | 'tbsp' // tablespoon

// Unit types
export type UnitType = 'weight' | 'volume' | 'piece' | 'culinary'

// Detailed unit information
export interface UnitInfo {
  id: MeasurementUnit
  name: string
  shortName: string
  type: UnitType
  baseUnit?: MeasurementUnit // base unit for conversion
  conversionRate?: number // conversion factor to base unit
  description?: string
}

// =============================================
// CONSTANTS AND REFERENCES
// =============================================

export const MEASUREMENT_UNITS: Record<MeasurementUnit, UnitInfo> = {
  // Weight
  gram: {
    id: 'gram',
    name: 'Gram',
    shortName: 'g',
    type: 'weight',
    conversionRate: 1,
    description: 'Base weight unit'
  },
  kg: {
    id: 'kg',
    name: 'Kilogram',
    shortName: 'kg',
    type: 'weight',
    baseUnit: 'gram',
    conversionRate: 1000,
    description: '1 kg = 1000 g'
  },

  // Volume
  ml: {
    id: 'ml',
    name: 'Milliliter',
    shortName: 'ml',
    type: 'volume',
    conversionRate: 1,
    description: 'Base volume unit'
  },
  liter: {
    id: 'liter',
    name: 'Liter',
    shortName: 'L',
    type: 'volume',
    baseUnit: 'ml',
    conversionRate: 1000,
    description: '1 L = 1000 ml'
  },

  // Pieces
  piece: {
    id: 'piece',
    name: 'Piece',
    shortName: 'pcs',
    type: 'piece',
    conversionRate: 1,
    description: 'Individual item'
  },
  pack: {
    id: 'pack',
    name: 'Package',
    shortName: 'pack',
    type: 'piece',
    conversionRate: 1,
    description: 'Package of items'
  },

  // Culinary measures
  tsp: {
    id: 'tsp',
    name: 'Teaspoon',
    shortName: 'tsp',
    type: 'culinary',
    baseUnit: 'ml',
    conversionRate: 5,
    description: '1 tsp ≈ 5 ml ≈ 3-5 g (depends on product)'
  },
  tbsp: {
    id: 'tbsp',
    name: 'Tablespoon',
    shortName: 'tbsp',
    type: 'culinary',
    baseUnit: 'ml',
    conversionRate: 15,
    description: '1 tbsp ≈ 15 ml ≈ 10-15 g (depends on product)'
  }
}

// Group units by type
export const UNITS_BY_TYPE: Record<UnitType, MeasurementUnit[]> = {
  weight: ['gram', 'kg'],
  volume: ['ml', 'liter'],
  piece: ['piece', 'pack'],
  culinary: ['tsp', 'tbsp']
}

// Units for different contexts
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
export const MENU_COMPOSITION_UNITS: MeasurementUnit[] = ['gram', 'ml', 'piece'] // only precise units

// =============================================
// UTILITIES FOR WORKING WITH UNITS
// =============================================

/**
 * Get unit information
 */
export function getUnitInfo(unit: MeasurementUnit): UnitInfo {
  return MEASUREMENT_UNITS[unit]
}

/**
 * Get short unit name
 */
export function getUnitShortName(unit: MeasurementUnit): string {
  return MEASUREMENT_UNITS[unit].shortName
}

/**
 * Get full unit name
 */
export function getUnitName(unit: MeasurementUnit): string {
  return MEASUREMENT_UNITS[unit].name
}

/**
 * Check unit compatibility (same type)
 */
export function areUnitsCompatible(unit1: MeasurementUnit, unit2: MeasurementUnit): boolean {
  const info1 = MEASUREMENT_UNITS[unit1]
  const info2 = MEASUREMENT_UNITS[unit2]
  return info1.type === info2.type
}

/**
 * Convert value between units
 */
export function convertUnits(
  value: number,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit
): number {
  const fromInfo = MEASUREMENT_UNITS[fromUnit]
  const toInfo = MEASUREMENT_UNITS[toUnit]

  // Check compatibility
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    throw new Error(`Cannot convert between ${fromUnit} and ${toUnit} - different types`)
  }

  // If units are the same
  if (fromUnit === toUnit) {
    return value
  }

  // Convert through base units
  const fromRate = fromInfo.conversionRate || 1
  const toRate = toInfo.conversionRate || 1

  return (value * fromRate) / toRate
}

/**
 * Format value with unit
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
 * Get units for specific context
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
 * Get units by type
 */
export function getUnitsByType(type: UnitType): MeasurementUnit[] {
  return UNITS_BY_TYPE[type]
}

// =============================================
// VALIDATION
// =============================================

/**
 * Check if string is valid unit
 */
export function isValidUnit(unit: string): unit is MeasurementUnit {
  return Object.keys(MEASUREMENT_UNITS).includes(unit)
}

/**
 * Check if unit is suitable for context
 */
export function isUnitValidForContext(
  unit: MeasurementUnit,
  context: 'products' | 'recipes' | 'menu'
): boolean {
  return getUnitsForContext(context).includes(unit)
}
