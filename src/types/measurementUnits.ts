// src/types/measurementUnits.ts - SAFE VERSION with undefined protection

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
  // Portions (for preparation compositions)
  | 'portion'

// Unit types
export type UnitType = 'weight' | 'volume' | 'piece' | 'culinary' | 'portion'

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
  },

  // Portions (for portion-type preparations)
  portion: {
    id: 'portion',
    name: 'Portion',
    shortName: 'ptn',
    type: 'portion',
    conversionRate: 1,
    description: 'One portion of preparation (size defined by preparation)'
  }
}

// Group units by type
export const UNITS_BY_TYPE: Record<UnitType, MeasurementUnit[]> = {
  weight: ['gram', 'kg'],
  volume: ['ml', 'liter'],
  piece: ['piece', 'pack'],
  culinary: ['tsp', 'tbsp'],
  portion: ['portion']
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
export const MENU_COMPOSITION_UNITS: MeasurementUnit[] = ['gram', 'ml', 'piece', 'portion'] // only precise units

// =============================================
// ✅ SAFE UTILITIES FOR WORKING WITH UNITS
// =============================================

/**
 * Get unit information - SAFE VERSION
 */
export function getUnitInfo(unit: MeasurementUnit | string | undefined | null): UnitInfo | null {
  if (!unit || typeof unit !== 'string' || !MEASUREMENT_UNITS[unit as MeasurementUnit]) {
    return null
  }
  return MEASUREMENT_UNITS[unit as MeasurementUnit]
}

/**
 * Get short unit name - SAFE VERSION
 */
export function getUnitShortName(unit: MeasurementUnit | string | undefined | null): string {
  if (!unit || typeof unit !== 'string' || !MEASUREMENT_UNITS[unit as MeasurementUnit]) {
    return '?'
  }
  return MEASUREMENT_UNITS[unit as MeasurementUnit].shortName
}

/**
 * Get full unit name - SAFE VERSION
 */
export function getUnitName(unit: MeasurementUnit | string | undefined | null): string {
  if (!unit || typeof unit !== 'string' || !MEASUREMENT_UNITS[unit as MeasurementUnit]) {
    return 'Unknown'
  }
  return MEASUREMENT_UNITS[unit as MeasurementUnit].name
}

/**
 * Check unit compatibility (same type) - SAFE VERSION
 */
export function areUnitsCompatible(
  unit1: MeasurementUnit | string | undefined | null,
  unit2: MeasurementUnit | string | undefined | null
): boolean {
  if (!unit1 || !unit2 || typeof unit1 !== 'string' || typeof unit2 !== 'string') {
    return false
  }

  const info1 = MEASUREMENT_UNITS[unit1 as MeasurementUnit]
  const info2 = MEASUREMENT_UNITS[unit2 as MeasurementUnit]

  if (!info1 || !info2) {
    return false
  }

  return info1.type === info2.type
}

/**
 * Convert value between units - SAFE VERSION
 */
export function convertUnits(
  value: number,
  fromUnit: MeasurementUnit | string | undefined | null,
  toUnit: MeasurementUnit | string | undefined | null
): number {
  if (!fromUnit || !toUnit || typeof fromUnit !== 'string' || typeof toUnit !== 'string') {
    console.warn(`Invalid units for conversion: ${fromUnit} -> ${toUnit}`)
    return value // Return original value if conversion impossible
  }

  const fromInfo = MEASUREMENT_UNITS[fromUnit as MeasurementUnit]
  const toInfo = MEASUREMENT_UNITS[toUnit as MeasurementUnit]

  if (!fromInfo || !toInfo) {
    console.warn(`Unknown units for conversion: ${fromUnit} -> ${toUnit}`)
    return value
  }

  // Check compatibility
  if (!areUnitsCompatible(fromUnit, toUnit)) {
    console.warn(`Cannot convert between ${fromUnit} and ${toUnit} - different types`)
    return value // Return original value
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
 * Format value with unit - SAFE VERSION
 */
export function formatWithUnit(
  value: number,
  unit: MeasurementUnit | string | undefined | null,
  options?: {
    showFullName?: boolean
    precision?: number
  }
): string {
  const precision = options?.precision ?? 1
  const formattedValue = Number(value.toFixed(precision))

  if (!unit || typeof unit !== 'string' || !MEASUREMENT_UNITS[unit as MeasurementUnit]) {
    return `${formattedValue} ?`
  }

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
// ✅ SAFE VALIDATION
// =============================================

/**
 * Check if string is valid unit - SAFE VERSION
 */
export function isValidUnit(unit: string | undefined | null): unit is MeasurementUnit {
  if (!unit || typeof unit !== 'string') {
    return false
  }
  return Object.keys(MEASUREMENT_UNITS).includes(unit)
}

/**
 * Check if unit is suitable for context - SAFE VERSION
 */
export function isUnitValidForContext(
  unit: MeasurementUnit | string | undefined | null,
  context: 'products' | 'recipes' | 'menu'
): boolean {
  if (!unit || typeof unit !== 'string' || !isValidUnit(unit)) {
    return false
  }
  return getUnitsForContext(context).includes(unit as MeasurementUnit)
}

/**
 * Check if unit is divisible (can have fractional quantities)
 * - Weight (gram, kg) and Volume (ml, liter) are divisible
 * - Pieces (piece, pack, portion) are NOT divisible
 *
 * Use case: When ordering packages, divisible units allow fractional package quantities
 * (e.g., 1.5 kg of potatoes), while indivisible units must be rounded up
 * (e.g., can't order 1.5 bottles of milk)
 */
export function isUnitDivisible(unit: MeasurementUnit | string | undefined | null): boolean {
  const info = getUnitInfo(unit)
  if (!info) return false

  // Weight and volume are divisible
  return info.type === 'weight' || info.type === 'volume'
}
