// src/core/decomposition/utils/portionUtils.ts
// Utilities for handling portion conversions

import type { PreparationForDecomposition, MenuComposition } from '../types'

/**
 * Result of portion conversion
 */
export interface PortionConversionResult {
  /** Converted quantity (in grams if converted from portions) */
  quantity: number
  /** Output unit after conversion */
  unit: string
  /** Whether conversion was applied */
  wasConverted: boolean
}

/**
 * Convert portion-type preparation quantity to base units (grams or pieces)
 * If the composition unit is 'portion' and preparation has portionType='portion',
 * multiply by portionSize to get base units.
 *
 * For weight-based (output_unit='gram'): 1 portion = portionSize grams
 * For piece-based (output_unit='pc'): 1 portion = portionSize pieces (usually 1)
 *
 * @param composition - Menu composition entry
 * @param preparation - Preparation data
 * @param multiplier - Quantity multiplier (e.g., sold quantity)
 * @returns Conversion result with quantity in base units
 */
export function convertPortionToGrams(
  composition: MenuComposition,
  preparation: PreparationForDecomposition,
  multiplier: number
): PortionConversionResult {
  const baseQuantity = composition.quantity * multiplier

  // Check if conversion is needed
  if (
    composition.unit === 'portion' &&
    preparation.portionType === 'portion' &&
    preparation.portionSize &&
    preparation.portionSize > 0
  ) {
    // Convert: portions × portionSize = base units
    // portionSize = base units per ONE portion
    //   - For gram-based: grams per portion (e.g., 200g for "Beef steak 200g")
    //   - For piece-based: pieces per portion (e.g., 1 for "Slice bread")
    // outputQuantity = number of portions per batch (NOT used for conversion)
    // See: src/About/docs/UNIT_CONVERSION_SPEC.md
    const convertedQuantity = baseQuantity * preparation.portionSize

    return {
      quantity: convertedQuantity,
      unit: preparation.outputUnit || 'gram',
      wasConverted: true
    }
  }

  // No conversion needed
  return {
    quantity: baseQuantity,
    unit: preparation.outputUnit || composition.unit,
    wasConverted: false
  }
}

/**
 * Get the portion multiplier for a menu variant
 * This is used to scale composition quantities based on variant size
 *
 * @param portionMultiplier - Optional multiplier from variant definition
 * @returns Effective multiplier (1.0 if not specified)
 */
export function getPortionMultiplier(portionMultiplier?: number): number {
  return portionMultiplier && portionMultiplier > 0 ? portionMultiplier : 1.0
}

/**
 * Calculate effective quantity for a composition component
 * Applies the sold quantity multiplier
 *
 * @param compositionQuantity - Base quantity from composition
 * @param soldQuantity - Number of items sold
 * @returns Total quantity needed
 */
export function calculateEffectiveQuantity(
  compositionQuantity: number,
  soldQuantity: number
): number {
  return compositionQuantity * soldQuantity
}

/**
 * Check if a unit represents portions (not weight/volume)
 *
 * @param unit - Unit string to check
 * @returns True if unit is a portion type
 */
export function isPortionUnit(unit: string): boolean {
  const portionUnits = ['portion', 'portions', 'piece', 'pieces', 'pcs', 'serving', 'servings']
  return portionUnits.includes(unit.toLowerCase())
}

/**
 * Normalize unit string to standard format
 *
 * @param unit - Unit string to normalize
 * @returns Normalized unit string
 */
export function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    g: 'gram',
    grams: 'gram',
    gram: 'gram',
    ml: 'milliliter',
    milliliters: 'milliliter',
    milliliter: 'milliliter',
    l: 'liter',
    liters: 'liter',
    liter: 'liter',
    kg: 'kilogram',
    kilograms: 'kilogram',
    kilogram: 'kilogram',
    pcs: 'piece',
    pieces: 'piece',
    piece: 'piece',
    portion: 'portion',
    portions: 'portion'
  }

  return unitMap[unit.toLowerCase()] || unit.toLowerCase()
}
