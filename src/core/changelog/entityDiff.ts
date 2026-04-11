// src/core/changelog/entityDiff.ts — Diff engine for recipe/preparation changes

import type {
  Recipe,
  RecipeComponent,
  Preparation,
  PreparationIngredient
} from '@/stores/recipes/types'
import type { Product } from '@/stores/productsStore/types'

// =============================================
// TYPES
// =============================================

export interface FieldChange {
  field: string
  old: any
  new: any
}

export interface ComponentChange {
  action: 'added' | 'removed' | 'modified'
  componentId: string
  componentName: string
  details?: {
    field: string
    old: any
    new: any
  }[]
}

export interface EntityDiff {
  fields: FieldChange[]
  components: ComponentChange[]
  hasChanges: boolean
}

// =============================================
// TRACKED FIELDS CONFIG
// =============================================

const RECIPE_TRACKED_FIELDS = [
  'name',
  'code',
  'category',
  'department',
  'portionSize',
  'portionUnit'
] as const

const PREPARATION_TRACKED_FIELDS = [
  'name',
  'code',
  'type',
  'department',
  'outputQuantity',
  'outputUnit',
  'portionType',
  'portionSize',
  'preparationTime',
  'shelfLife'
] as const

const PRODUCT_TRACKED_FIELDS = [
  'name',
  'category',
  'baseUnit',
  'baseCostPerUnit',
  'yieldPercentage',
  'canBeSold',
  'isActive',
  'description',
  'storageConditions',
  'shelfLife',
  'minStock'
] as const

// =============================================
// FIELD DIFF
// =============================================

function diffFields(
  oldEntity: Record<string, any>,
  newEntity: Record<string, any>,
  trackedFields: readonly string[]
): FieldChange[] {
  const changes: FieldChange[] = []

  for (const field of trackedFields) {
    const oldVal = oldEntity[field]
    const newVal = newEntity[field]

    // Skip if new value is undefined (not being updated)
    if (newVal === undefined) continue

    // Compare values (handle null/undefined equality)
    if (!isEqual(oldVal, newVal)) {
      changes.push({ field, old: oldVal ?? null, new: newVal })
    }
  }

  return changes
}

function isEqual(a: any, b: any): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  // Числа — сравниваем с приведением (строка '100' == число 100)
  if (typeof a === 'number' && typeof b === 'number') return a === b
  return String(a) === String(b)
}

// =============================================
// COMPONENT DIFF (Recipe)
// =============================================

function diffRecipeComponents(
  oldComponents: RecipeComponent[],
  newComponents: RecipeComponent[],
  resolveNameFn: (id: string, type: string) => string
): ComponentChange[] {
  const changes: ComponentChange[] = []

  // Build maps by componentId
  const oldMap = new Map(oldComponents.map(c => [c.componentId, c]))
  const newMap = new Map(newComponents.map(c => [c.componentId, c]))

  // Added
  for (const [compId, comp] of newMap) {
    if (!oldMap.has(compId)) {
      changes.push({
        action: 'added',
        componentId: compId,
        componentName: resolveNameFn(compId, comp.componentType),
        details: [
          { field: 'quantity', old: null, new: comp.quantity },
          { field: 'unit', old: null, new: comp.unit }
        ]
      })
    }
  }

  // Removed
  for (const [compId, comp] of oldMap) {
    if (!newMap.has(compId)) {
      changes.push({
        action: 'removed',
        componentId: compId,
        componentName: resolveNameFn(compId, comp.componentType),
        details: [
          { field: 'quantity', old: comp.quantity, new: null },
          { field: 'unit', old: comp.unit, new: null }
        ]
      })
    }
  }

  // Modified
  for (const [compId, newComp] of newMap) {
    const oldComp = oldMap.get(compId)
    if (!oldComp) continue

    const details: { field: string; old: any; new: any }[] = []

    if (oldComp.quantity !== newComp.quantity) {
      details.push({ field: 'quantity', old: oldComp.quantity, new: newComp.quantity })
    }
    if (oldComp.unit !== newComp.unit) {
      details.push({ field: 'unit', old: oldComp.unit, new: newComp.unit })
    }

    if (details.length > 0) {
      changes.push({
        action: 'modified',
        componentId: compId,
        componentName: resolveNameFn(compId, newComp.componentType),
        details
      })
    }
  }

  return changes
}

// =============================================
// COMPONENT DIFF (Preparation — uses 'id' key)
// =============================================

function diffPreparationIngredients(
  oldIngredients: PreparationIngredient[],
  newIngredients: PreparationIngredient[],
  resolveNameFn: (id: string, type: string) => string
): ComponentChange[] {
  const changes: ComponentChange[] = []

  // Build maps by ingredient id
  const oldMap = new Map(oldIngredients.map(i => [i.id, i]))
  const newMap = new Map(newIngredients.map(i => [i.id, i]))

  // Added
  for (const [ingId, ing] of newMap) {
    if (!oldMap.has(ingId)) {
      changes.push({
        action: 'added',
        componentId: ingId,
        componentName: resolveNameFn(ingId, ing.type),
        details: [
          { field: 'quantity', old: null, new: ing.quantity },
          { field: 'unit', old: null, new: ing.unit }
        ]
      })
    }
  }

  // Removed
  for (const [ingId, ing] of oldMap) {
    if (!newMap.has(ingId)) {
      changes.push({
        action: 'removed',
        componentId: ingId,
        componentName: resolveNameFn(ingId, ing.type),
        details: [
          { field: 'quantity', old: ing.quantity, new: null },
          { field: 'unit', old: ing.unit, new: null }
        ]
      })
    }
  }

  // Modified
  for (const [ingId, newIng] of newMap) {
    const oldIng = oldMap.get(ingId)
    if (!oldIng) continue

    const details: { field: string; old: any; new: any }[] = []

    if (oldIng.quantity !== newIng.quantity) {
      details.push({ field: 'quantity', old: oldIng.quantity, new: newIng.quantity })
    }
    if (oldIng.unit !== newIng.unit) {
      details.push({ field: 'unit', old: oldIng.unit, new: newIng.unit })
    }

    if (details.length > 0) {
      changes.push({
        action: 'modified',
        componentId: ingId,
        componentName: resolveNameFn(ingId, newIng.type),
        details
      })
    }
  }

  return changes
}

// =============================================
// MAIN DIFF FUNCTION
// =============================================

export function computeRecipeDiff(
  oldRecipe: Recipe,
  newData: Partial<Recipe>,
  resolveNameFn: (id: string, type: string) => string
): EntityDiff {
  const fields = diffFields(oldRecipe, newData, RECIPE_TRACKED_FIELDS)

  const components = newData.components
    ? diffRecipeComponents(oldRecipe.components || [], newData.components, resolveNameFn)
    : []

  return {
    fields,
    components,
    hasChanges: fields.length > 0 || components.length > 0
  }
}

export function computePreparationDiff(
  oldPrep: Preparation,
  newData: Partial<Preparation>,
  resolveNameFn: (id: string, type: string) => string
): EntityDiff {
  const fields = diffFields(oldPrep, newData, PREPARATION_TRACKED_FIELDS)

  const components = newData.recipe
    ? diffPreparationIngredients(oldPrep.recipe || [], newData.recipe, resolveNameFn)
    : []

  return {
    fields,
    components,
    hasChanges: fields.length > 0 || components.length > 0
  }
}

export function computeProductDiff(oldProduct: Product, newData: Partial<Product>): EntityDiff {
  const fields = diffFields(oldProduct, newData, PRODUCT_TRACKED_FIELDS)

  return {
    fields,
    components: [],
    hasChanges: fields.length > 0
  }
}
