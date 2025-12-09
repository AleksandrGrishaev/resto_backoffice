// src/core/decomposition/utils/replacementUtils.ts
// Utilities for handling replacement modifiers

import type { SelectedModifier, TargetComponent } from '../types'

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
 * @param selectedModifiers - Array of selected modifiers
 * @returns Map of replacement key to modifier
 */
export function buildReplacementMap(
  selectedModifiers?: SelectedModifier[]
): Map<string, SelectedModifier> {
  const replacements = new Map<string, SelectedModifier>()

  if (!selectedModifiers) {
    return replacements
  }

  for (const modifier of selectedModifiers) {
    // Only process replacement modifiers with targetComponent and NOT default option
    if (modifier.groupType === 'replacement' && modifier.targetComponent && !modifier.isDefault) {
      const key = getReplacementKey(modifier.targetComponent)
      replacements.set(key, modifier)
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
 * @returns The replacement modifier if found, undefined otherwise
 */
export function getReplacementForComponent(
  recipeId: string,
  componentId: string,
  replacements: Map<string, SelectedModifier>
): SelectedModifier | undefined {
  const key = `${recipeId}_${componentId}`
  return replacements.get(key)
}

/**
 * Check if a variant component should be replaced
 *
 * @param componentId - ID of the component within the variant
 * @param replacements - Replacement map
 * @returns The replacement modifier if found, undefined otherwise
 */
export function getReplacementForVariantComponent(
  componentId: string,
  replacements: Map<string, SelectedModifier>
): SelectedModifier | undefined {
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
    // Include if NOT a replacement modifier with targetComponent
    return !(modifier.groupType === 'replacement' && modifier.targetComponent)
  })
}
