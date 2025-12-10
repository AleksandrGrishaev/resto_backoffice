/**
 * Combination Generator Utility
 * Generates all possible modifier combinations for a menu item
 */

import type { MenuItemVariant, ModifierGroup, ModifierOption } from '@/stores/menu/types'

// =============================================
// Types
// =============================================

export interface GeneratedCombination {
  variant: MenuItemVariant
  selectedOptions: SelectedOptionInfo[]
  defaultScore: number // Higher = more default options selected
}

export interface SelectedOptionInfo {
  group: ModifierGroup
  option: ModifierOption
}

export interface CombinationGeneratorOptions {
  maxCombinations?: number // default: 10
  includeAll?: boolean // default: false
}

// =============================================
// Main Functions
// =============================================

/**
 * Generate all possible modifier combinations for menu item variants
 * Sorted by "default score" (combinations with more default options come first)
 */
export function generateCombinations(
  variants: MenuItemVariant[],
  modifierGroups: ModifierGroup[],
  options: CombinationGeneratorOptions = {}
): GeneratedCombination[] {
  const { maxCombinations = 10, includeAll = false } = options

  // If no modifier groups, return one combination per variant with no modifiers
  if (!modifierGroups || modifierGroups.length === 0) {
    return variants.map(variant => ({
      variant,
      selectedOptions: [],
      defaultScore: 0
    }))
  }

  // Get active options for each group
  const optionsByGroup = modifierGroups.map(group => {
    const activeOptions = group.options.filter(opt => opt.isActive !== false)
    return {
      group,
      options: activeOptions
    }
  })

  // Filter out empty groups
  const nonEmptyGroups = optionsByGroup.filter(g => g.options.length > 0)

  if (nonEmptyGroups.length === 0) {
    return variants.map(variant => ({
      variant,
      selectedOptions: [],
      defaultScore: 0
    }))
  }

  // Generate Cartesian product of all options
  const optionCombinations = cartesianProduct(nonEmptyGroups.map(g => g.options))

  // Map back to include group info
  const allCombinations: GeneratedCombination[] = []

  for (const variant of variants) {
    if (variant.isActive === false) continue

    for (const optionCombo of optionCombinations) {
      const selectedOptions: SelectedOptionInfo[] = optionCombo.map((option, idx) => ({
        group: nonEmptyGroups[idx].group,
        option
      }))

      const defaultScore = calculateDefaultScore(optionCombo)

      allCombinations.push({
        variant,
        selectedOptions,
        defaultScore
      })
    }
  }

  // Sort by default score (descending) - combinations with more defaults first
  allCombinations.sort((a, b) => b.defaultScore - a.defaultScore)

  // Apply limit if not including all
  if (!includeAll && allCombinations.length > maxCombinations) {
    return allCombinations.slice(0, maxCombinations)
  }

  return allCombinations
}

/**
 * Calculate total number of possible combinations
 */
export function calculateTotalCombinations(
  variants: MenuItemVariant[],
  modifierGroups: ModifierGroup[]
): number {
  const activeVariants = variants.filter(v => v.isActive !== false)
  if (activeVariants.length === 0) return 0

  if (!modifierGroups || modifierGroups.length === 0) {
    return activeVariants.length
  }

  let total = activeVariants.length

  for (const group of modifierGroups) {
    const activeOptions = group.options.filter(opt => opt.isActive !== false)
    if (activeOptions.length > 0) {
      total *= activeOptions.length
    }
  }

  return total
}

/**
 * Build display name for a combination
 * Format: "Variant Name + Modifier1 (qty) + Modifier2 (qty) + ..."
 */
export function buildCombinationDisplayName(combination: GeneratedCombination): string {
  const parts: string[] = []

  // Variant name
  parts.push(combination.variant.name || 'Standard')

  // Modifier selections
  for (const selection of combination.selectedOptions) {
    const option = selection.option

    // Get quantity from composition if available
    let qtyStr = ''
    if (option.composition && option.composition.length > 0) {
      const qty = option.composition[0].quantity
      if (qty && qty !== 1) {
        qtyStr = ` (${qty})`
      }
    }

    parts.push(`${option.name}${qtyStr}`)
  }

  return parts.join(' + ')
}

// =============================================
// Helper Functions
// =============================================

/**
 * Generate Cartesian product of arrays
 * Example: [[A, B], [1, 2]] => [[A, 1], [A, 2], [B, 1], [B, 2]]
 */
function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]]

  return arrays.reduce<T[][]>(
    (acc, curr) => {
      const result: T[][] = []
      for (const a of acc) {
        for (const c of curr) {
          result.push([...a, c])
        }
      }
      return result
    },
    [[]]
  )
}

/**
 * Calculate default score for a combination
 * Higher score = more default options selected
 */
function calculateDefaultScore(options: ModifierOption[]): number {
  return options.filter(opt => opt.isDefault === true).length
}

/**
 * Get unique modifier options from combinations
 * Used to build the modifier recipes section
 */
export function getUniqueModifierOptions(
  combinations: GeneratedCombination[]
): Map<string, { group: ModifierGroup; option: ModifierOption }> {
  const uniqueOptions = new Map<string, { group: ModifierGroup; option: ModifierOption }>()

  for (const combo of combinations) {
    for (const selection of combo.selectedOptions) {
      const key = `${selection.group.id}-${selection.option.id}`
      if (!uniqueOptions.has(key)) {
        uniqueOptions.set(key, {
          group: selection.group,
          option: selection.option
        })
      }
    }
  }

  return uniqueOptions
}

// =============================================
// Variant Grouping Functions
// =============================================

export interface DefaultModifierInfo {
  groupName: string
  groupId: string
  modifierName: string
  modifierId: string
  option: ModifierOption
}

/**
 * Get default modifiers from required groups for a variant
 * Returns one default modifier per required group
 */
export function getDefaultModifiersForVariant(
  modifierGroups: ModifierGroup[]
): DefaultModifierInfo[] {
  const defaults: DefaultModifierInfo[] = []

  for (const group of modifierGroups) {
    // Only process required groups
    if (!group.isRequired) continue

    // Find the default option or first active option
    const activeOptions = group.options.filter(opt => opt.isActive !== false)
    const defaultOption = activeOptions.find(opt => opt.isDefault) || activeOptions[0]

    if (defaultOption) {
      defaults.push({
        groupName: group.name,
        groupId: group.id,
        modifierName: defaultOption.name,
        modifierId: defaultOption.id,
        option: defaultOption
      })
    }
  }

  return defaults
}

/**
 * Generate combinations grouped by variant
 * For summary mode: only default modifiers from required groups
 * For full mode: all combinations grouped by variant
 */
export function generateCombinationsGroupedByVariant(
  variants: MenuItemVariant[],
  modifierGroups: ModifierGroup[],
  options: CombinationGeneratorOptions & { summaryMode?: boolean } = {}
): Map<string, GeneratedCombination[]> {
  const { maxCombinations = 10, includeAll = false, summaryMode = false } = options
  const groupedCombinations = new Map<string, GeneratedCombination[]>()

  // Get active variants
  const activeVariants = variants.filter(v => v.isActive !== false)

  if (summaryMode) {
    // Summary mode: only default modifiers from required groups
    for (const variant of activeVariants) {
      const defaultModifiers = getDefaultModifiersForVariant(modifierGroups)

      const selectedOptions: SelectedOptionInfo[] = defaultModifiers.map(dm => ({
        group: modifierGroups.find(g => g.id === dm.groupId)!,
        option: dm.option
      }))

      const combination: GeneratedCombination = {
        variant,
        selectedOptions,
        defaultScore: selectedOptions.length // All are defaults
      }

      groupedCombinations.set(variant.id, [combination])
    }
  } else {
    // Full mode: all combinations grouped by variant
    // First get all combinations
    const allCombinations = generateCombinations(variants, modifierGroups, {
      maxCombinations: includeAll ? undefined : maxCombinations,
      includeAll
    })

    // Group by variant
    for (const combo of allCombinations) {
      const variantId = combo.variant.id
      if (!groupedCombinations.has(variantId)) {
        groupedCombinations.set(variantId, [])
      }
      groupedCombinations.get(variantId)!.push(combo)
    }
  }

  return groupedCombinations
}

/**
 * Build combination display name without variant prefix
 * Format: "Modifier1 (qty) + Modifier2 (qty) + ..."
 */
export function buildModifiersDisplayName(selectedOptions: SelectedOptionInfo[]): string {
  if (selectedOptions.length === 0) return 'No modifiers'

  const parts: string[] = []

  for (const selection of selectedOptions) {
    const option = selection.option

    // Get quantity from composition if available
    let qtyStr = ''
    if (option.composition && option.composition.length > 0) {
      const qty = option.composition[0].quantity
      if (qty && qty !== 1) {
        qtyStr = ` (${qty})`
      }
    }

    parts.push(`${option.name}${qtyStr}`)
  }

  return parts.join(' + ')
}
