// src/core/decomposition/utils/replacementUtils.ts
// Utilities for handling replacement modifiers

import type { SelectedModifier, TargetComponent } from '../types'

/**
 * Entry in the replacement map.
 * - isCompositionTarget: true → add replacement composition
 * - isCompositionTarget: false → just exclude (skip) the component
 */
export interface ReplacementEntry {
  modifier: SelectedModifier
  isCompositionTarget: boolean
}

/**
 * Generate a unique key for replacement map
 * Format: "{recipeId}_{componentId}" or "variant_{componentId}"
 *
 * @param target - Target component to generate key for
 * @returns Unique key string
 */
export function getReplacementKey(target: TargetComponent): string {
  if (target.sourceType === 'recipe' && target.recipeId) {
    return `${target.recipeId}_${target.componentId}`
  }
  return `variant_${target.componentId}`
}

/**
 * Build a map of replacement modifiers from selected modifiers
 * Only includes replacement-type modifiers that are not default options
 *
 * For multi-target replacements:
 * - First target gets isCompositionTarget: true (add composition)
 * - Other targets get isCompositionTarget: false (just exclude)
 *
 * @param selectedModifiers - Array of selected modifiers
 * @returns Map of replacement key to ReplacementEntry
 */
export function buildReplacementMap(
  selectedModifiers?: SelectedModifier[]
): Map<string, ReplacementEntry> {
  const replacements = new Map<string, ReplacementEntry>()

  if (!selectedModifiers) {
    return replacements
  }

  for (const modifier of selectedModifiers) {
    // Only process replacement modifiers with targetComponents and NOT default option
    if (
      modifier.groupType === 'replacement' &&
      modifier.targetComponents?.length &&
      !modifier.isDefault
    ) {
      // First target gets composition, rest just exclude
      modifier.targetComponents.forEach((target, index) => {
        const key = getReplacementKey(target)
        replacements.set(key, {
          modifier,
          isCompositionTarget: index === 0
        })
      })
    }
  }

  return replacements
}

/**
 * Check if a recipe component should be replaced
 *
 * @param recipeId - ID of the recipe
 * @param componentId - ID of the component within the recipe
 * @param replacements - Replacement map
 * @returns ReplacementEntry if found, undefined otherwise
 */
export function getReplacementForComponent(
  recipeId: string,
  componentId: string,
  replacements: Map<string, ReplacementEntry>
): ReplacementEntry | undefined {
  const key = `${recipeId}_${componentId}`
  return replacements.get(key)
}

/**
 * Check if a variant component should be replaced
 *
 * @param componentId - ID of the component within the variant
 * @param replacements - Replacement map
 * @returns ReplacementEntry if found, undefined otherwise
 */
export function getReplacementForVariantComponent(
  componentId: string,
  replacements: Map<string, ReplacementEntry>
): ReplacementEntry | undefined {
  const key = `variant_${componentId}`
  return replacements.get(key)
}

/**
 * Filter selected modifiers to get only addon modifiers (non-replacement)
 * These modifiers add extra components without replacing existing ones
 *
 * @param selectedModifiers - Array of selected modifiers
 * @returns Array of addon modifiers
 */
export function getAddonModifiers(selectedModifiers?: SelectedModifier[]): SelectedModifier[] {
  if (!selectedModifiers) {
    return []
  }

  return selectedModifiers.filter(modifier => {
    // Include if NOT a replacement modifier with targetComponents
    return !(modifier.groupType === 'replacement' && modifier.targetComponents?.length)
  })
}
