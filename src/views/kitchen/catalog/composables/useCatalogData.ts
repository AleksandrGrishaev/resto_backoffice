import { computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useMenuStore } from '@/stores/menu'
import { formatIDR } from '@/utils'
import { getUnitShortName } from '@/types/measurementUnits'
import type { TreeNode } from '../detail/DependencyTree.vue'
import type { Product } from '@/stores/productsStore/types'
import type { Preparation, Recipe } from '@/stores/recipes/types'
import type { MenuItem, ModifierType, TargetComponent } from '@/stores/menu/types'
import type { EntityStatus } from '@/types/common'

// --- Modifier display types ---
export interface ModifierOptionDisplay {
  id: string
  name: string
  priceAdjustment: number
  compositionCost: number
  /** For replacement: compositionCost - replacedCost */
  netCost: number
  isDefault: boolean
  isActive: boolean
  compositionTree: TreeNode[]
}

export interface ModifierGroupDisplay {
  id: string
  name: string
  type: ModifierType
  isRequired: boolean
  minSelection?: number
  maxSelection?: number
  targetComponentNames: string[]
  options: ModifierOptionDisplay[]
}

// Unified catalog item for lists and search
export interface CatalogItem {
  id: string
  name: string
  type: 'menu' | 'recipe' | 'preparation' | 'product'
  isActive: boolean
  status: EntityStatus
  department?: string
  categoryId?: string
  categoryName?: string
  code?: string
  unit?: string
  costDisplay?: string
  cost?: number
  componentCount?: number
  variantCount?: number
}

// Search result grouped by type
export interface SearchResultGroup {
  type: CatalogItem['type']
  label: string
  color: string
  items: CatalogItem[]
}

export function useCatalogData() {
  const productsStore = useProductsStore()
  const recipesStore = useRecipesStore()
  const menuStore = useMenuStore()

  // --- Menu items as CatalogItems ---
  const menuCatalogItems = computed<CatalogItem[]>(() =>
    (menuStore.menuItems as MenuItem[]).map(mi => {
      const cat = (menuStore.categories as any[]).find(c => c.id === mi.categoryId)
      const variant = mi.variants?.[0]
      const cost =
        variant?.composition?.reduce((sum, comp) => {
          const qty =
            comp.unit === 'portion' && comp.portionSize
              ? comp.quantity * comp.portionSize
              : comp.quantity
          return sum + resolveComponentCost(comp.type, comp.id, qty)
        }, 0) ?? 0
      return {
        id: mi.id,
        name: mi.name,
        type: 'menu' as const,
        isActive: mi.isActive,
        status: (mi.status || (mi.isActive ? 'active' : 'draft')) as EntityStatus,
        department: mi.department,
        categoryId: mi.categoryId,
        categoryName: cat?.name,
        componentCount: variant?.composition?.length ?? 0,
        variantCount: (mi.variants?.length ?? 0) > 1 ? mi.variants!.length : undefined,
        cost,
        costDisplay: cost > 0 ? formatIDR(cost) : undefined
      }
    })
  )

  // --- Recipes as CatalogItems ---
  const recipeCatalogItems = computed<CatalogItem[]>(() =>
    (recipesStore.recipes as Recipe[]).map(r => {
      const cost = resolveComponentCost('recipe', r.id, 1)
      return {
        id: r.id,
        name: r.name,
        type: 'recipe' as const,
        isActive: r.isActive,
        status: (r.status || (r.isActive ? 'active' : 'draft')) as EntityStatus,
        department: r.department,
        categoryId: r.category,
        categoryName: recipesStore.getRecipeCategoryName(r.category),
        code: r.code,
        componentCount: r.components?.length ?? 0,
        cost,
        costDisplay: cost > 0 ? `${formatIDR(cost)}/portion` : undefined
      }
    })
  )

  // --- Preparations as CatalogItems ---
  const preparationCatalogItems = computed<CatalogItem[]>(() =>
    (recipesStore.preparations as Preparation[]).map(p => {
      const cost = resolveComponentCost('preparation', p.id, 1)
      return {
        id: p.id,
        name: p.name,
        type: 'preparation' as const,
        isActive: p.isActive,
        status: (p.status || (p.isActive ? 'active' : 'draft')) as EntityStatus,
        department: p.department,
        categoryId: p.type,
        categoryName: recipesStore.getPreparationCategoryName(p.type),
        code: p.code,
        unit: p.outputUnit,
        componentCount: p.recipe?.length ?? 0,
        cost,
        costDisplay: cost > 0 ? `${formatIDR(cost)}/${getUnitShortName(p.outputUnit)}` : undefined
      }
    })
  )

  // --- Products as CatalogItems ---
  const productCatalogItems = computed<CatalogItem[]>(() =>
    (productsStore.products as Product[]).map(p => ({
      id: p.id,
      name: p.name,
      type: 'product' as const,
      isActive: p.isActive,
      status: (p.status || (p.isActive ? 'active' : 'draft')) as EntityStatus,
      department: p.usedInDepartments?.join(', '),
      categoryId: p.category,
      categoryName: productsStore.getCategoryName(p.category),
      unit: p.baseUnit,
      cost: p.baseCostPerUnit,
      costDisplay:
        p.baseCostPerUnit > 0 ? `${formatIDR(p.baseCostPerUnit)}/${p.baseUnit}` : undefined
    }))
  )

  // --- Universal search ---
  function search(query: string): SearchResultGroup[] {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()

    const filter = (items: CatalogItem[]) =>
      items.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          (i.code && i.code.toLowerCase().includes(q)) ||
          (i.categoryName && i.categoryName.toLowerCase().includes(q))
      )

    const groups: SearchResultGroup[] = []

    const menuResults = filter(menuCatalogItems.value)
    if (menuResults.length) {
      groups.push({ type: 'menu', label: 'Menu Items', color: 'purple', items: menuResults })
    }

    const recipeResults = filter(recipeCatalogItems.value)
    if (recipeResults.length) {
      groups.push({ type: 'recipe', label: 'Recipes', color: 'green', items: recipeResults })
    }

    const prepResults = filter(preparationCatalogItems.value)
    if (prepResults.length) {
      groups.push({
        type: 'preparation',
        label: 'Preparations',
        color: 'orange',
        items: prepResults
      })
    }

    const productResults = filter(productCatalogItems.value)
    if (productResults.length) {
      groups.push({ type: 'product', label: 'Products', color: 'blue', items: productResults })
    }

    return groups
  }

  // --- Build dependency tree for any entity ---
  function buildTree(
    type: CatalogItem['type'],
    id: string,
    visited?: Set<string>,
    variantIndex?: number
  ): TreeNode[] {
    const seen = visited ?? new Set<string>()
    const key = `${type}:${id}`
    if (seen.has(key)) return [] // circular dependency guard
    seen.add(key)

    let nodes: TreeNode[] = []

    if (type === 'menu') {
      const mi = (menuStore.menuItems as MenuItem[]).find(m => m.id === id)
      if (!mi) return []
      const variant = mi.variants?.[variantIndex ?? 0]
      if (!variant?.composition?.length) return []
      nodes = variant.composition.map(comp =>
        buildCompositionNode(
          comp.type as 'product' | 'recipe' | 'preparation',
          comp.id,
          comp.quantity,
          comp.unit,
          seen,
          comp.useYieldPercentage,
          comp.portionSize
        )
      )
    } else if (type === 'recipe') {
      const recipe = recipesStore.getRecipeById(id) as Recipe | undefined
      if (!recipe?.components?.length) return []
      nodes = recipe.components.map(comp =>
        buildCompositionNode(
          comp.componentType,
          comp.componentId,
          comp.quantity,
          comp.unit,
          seen,
          comp.useYieldPercentage
        )
      )
    } else if (type === 'preparation') {
      const prep = recipesStore.getPreparationById(id) as Preparation | undefined
      if (!prep?.recipe?.length) return []
      nodes = prep.recipe.map(ing =>
        buildCompositionNode(ing.type, ing.id, ing.quantity, ing.unit, seen, ing.useYieldPercentage)
      )
    }

    // Sort by cost descending (most expensive first)
    return nodes.sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))
  }

  function buildCompositionNode(
    type: 'product' | 'recipe' | 'preparation',
    id: string,
    quantity: number,
    unit: string,
    visited: Set<string>,
    useYieldPercentage?: boolean,
    portionSize?: number
  ): TreeNode {
    // When unit is "portion" and portionSize is set, convert to base units for cost
    // BUT: for portion-type preparations, outputQuantity is already in portions,
    // so we must NOT multiply by portionSize (would mix grams with portions)
    let effectiveQuantity = quantity
    if (unit === 'portion' && portionSize) {
      if (type === 'preparation') {
        const prep = recipesStore.getPreparationById(id) as Preparation | undefined
        if (prep?.portionType !== 'portion') {
          effectiveQuantity = quantity * portionSize
        }
      } else {
        effectiveQuantity = quantity * portionSize
      }
    }
    const cost = resolveComponentCost(type, id, effectiveQuantity, useYieldPercentage)

    if (type === 'product') {
      const p = productsStore.getProductById(id) as Product | null
      const yieldPct =
        useYieldPercentage && p?.yieldPercentage && p.yieldPercentage < 100
          ? p.yieldPercentage
          : undefined
      return {
        id,
        name: p?.name ?? id,
        type: 'product',
        quantity,
        unit,
        cost: cost > 0 ? cost : undefined,
        children: [],
        yieldPercentage: yieldPct
      }
    }

    if (type === 'preparation') {
      const p = recipesStore.getPreparationById(id) as Preparation | undefined
      const children = buildTree('preparation', id, new Set(visited))
      const childrenSum = children.reduce((sum, c) => sum + (c.cost ?? 0), 0)
      // Prefer dynamically computed children cost (current prices) over stored cost (may be stale)
      let effectiveCost = cost
      if (childrenSum > 0 && p?.outputQuantity && p.outputQuantity > 0) {
        effectiveCost = Math.round((childrenSum / p.outputQuantity) * effectiveQuantity)
      }
      // Determine display unit: use "portion" if caller specified portionSize, else prep's native unit
      const displayUnit =
        unit === 'portion' && portionSize
          ? 'portion'
          : unit === 'portion' && p?.portionType === 'portion'
            ? 'portion'
            : unit || p?.outputUnit || 'gram'
      // Batch cost: prefer children sum (dynamic), fallback to stored cost
      const batchCost =
        childrenSum > 0
          ? childrenSum
          : cost > 0 && p?.outputQuantity
            ? Math.round((cost / effectiveQuantity) * p.outputQuantity)
            : 0
      return {
        id,
        name: p?.name ?? id,
        type: 'preparation',
        quantity,
        unit: displayUnit,
        cost: effectiveCost > 0 ? effectiveCost : undefined,
        children,
        outputQuantity: p?.outputQuantity,
        outputUnit: displayUnit,
        totalRecipeCost: batchCost > 0 ? batchCost : undefined
      }
    }

    if (type === 'recipe') {
      const r = recipesStore.getRecipeById(id) as Recipe | undefined
      const children = buildTree('recipe', id, new Set(visited))
      const childrenSum = children.reduce((sum, c) => sum + (c.cost ?? 0), 0)
      // Prefer dynamically computed children cost (current prices) over stored cost (may be stale)
      let effectiveCost = cost
      if (childrenSum > 0 && r?.portionSize && r.portionSize > 0) {
        effectiveCost = Math.round((childrenSum / r.portionSize) * quantity)
      }
      // Batch cost: prefer children sum (dynamic), fallback to stored cost
      const batchCost =
        childrenSum > 0
          ? childrenSum
          : cost > 0 && r?.portionSize
            ? Math.round((cost / quantity) * r.portionSize)
            : 0
      return {
        id,
        name: r?.name ?? id,
        type: 'recipe',
        quantity,
        unit: r?.portionUnit || unit,
        cost: effectiveCost > 0 ? effectiveCost : undefined,
        children,
        outputQuantity: r?.portionSize,
        outputUnit: r?.portionUnit,
        totalRecipeCost: batchCost > 0 ? batchCost : undefined
      }
    }

    return { id, name: id, type, quantity, unit, children: [] }
  }

  function resolveComponentCost(
    type: string,
    id: string,
    quantity: number,
    useYieldPercentage?: boolean,
    visited?: Set<string>
  ): number {
    if (type === 'product') {
      const p = productsStore.getProductById(id) as Product | null
      let adjustedQuantity = quantity
      if (useYieldPercentage && p?.yieldPercentage && p.yieldPercentage < 100) {
        adjustedQuantity = quantity / (p.yieldPercentage / 100)
      }
      return (p?.baseCostPerUnit ?? 0) * adjustedQuantity
    }

    // Circular dependency guard
    const key = `${type}:${id}`
    const seen = visited ?? new Set<string>()
    if (seen.has(key)) return 0
    seen.add(key)

    if (type === 'preparation') {
      const p = recipesStore.getPreparationById(id) as Preparation | undefined
      if (p?.recipe?.length) {
        const childrenSum = p.recipe.reduce((sum, ing) => {
          return (
            sum +
            resolveComponentCost(
              ing.type,
              ing.id,
              ing.quantity,
              ing.useYieldPercentage,
              new Set(seen)
            )
          )
        }, 0)
        if (childrenSum > 0 && p.outputQuantity && p.outputQuantity > 0) {
          return Math.round((childrenSum / p.outputQuantity) * quantity)
        }
      }
      // Fallback to stored cost
      return (p?.costPerPortion ?? p?.lastKnownCost ?? 0) * quantity
    }
    if (type === 'recipe') {
      const r = recipesStore.getRecipeById(id) as Recipe | undefined
      if (r?.components?.length) {
        const childrenSum = r.components.reduce((sum, comp) => {
          return (
            sum +
            resolveComponentCost(
              comp.componentType,
              comp.componentId,
              comp.quantity,
              comp.useYieldPercentage,
              new Set(seen)
            )
          )
        }, 0)
        if (childrenSum > 0 && r.portionSize && r.portionSize > 0) {
          return Math.round((childrenSum / r.portionSize) * quantity)
        }
      }
      // Fallback to stored cost
      return (r?.cost ?? 0) * quantity
    }
    return 0
  }

  // --- Categories for filters ---
  const menuCategories = computed(() =>
    (menuStore.categories as any[]).map(c => ({ id: c.id, name: c.name }))
  )

  const recipeCategories = computed(() =>
    (recipesStore.activeRecipeCategories as any[]).map(c => ({ id: c.id, name: c.name }))
  )

  const preparationCategories = computed(() =>
    (recipesStore.activePreparationCategories as any[]).map(c => ({ id: c.id, name: c.name }))
  )

  const productCategories = computed(() =>
    (productsStore.activeCategories as any[]).map(c => ({ id: c.id, name: c.name }))
  )

  // --- Build modifier display data for a menu item ---
  function buildModifierDisplayData(menuItem: MenuItem): ModifierGroupDisplay[] {
    const groups = menuItem.modifierGroups || []
    return groups.map(group => {
      // For replacement groups, calculate cost of replaced components
      let replacedCost = 0
      if (group.type === 'replacement' && group.targetComponents?.length) {
        replacedCost = calculateTargetComponentsCost(group.targetComponents, menuItem)
      }

      const options: ModifierOptionDisplay[] = group.options.map(opt => {
        // Build mini-tree for option composition
        let compositionTree: TreeNode[] = []
        let compositionCost = 0
        if (opt.composition?.length) {
          compositionTree = opt.composition.map(comp =>
            buildCompositionNode(
              comp.type as 'product' | 'recipe' | 'preparation',
              comp.id,
              comp.quantity,
              comp.unit,
              new Set<string>(),
              comp.useYieldPercentage,
              comp.portionSize
            )
          )
          compositionCost = compositionTree.reduce((sum, n) => sum + (n.cost ?? 0), 0)
        }

        // Net cost: for replacement = option cost - replaced cost; for others = option cost
        const netCost =
          group.type === 'replacement' ? compositionCost - replacedCost : compositionCost

        return {
          id: opt.id,
          name: opt.name,
          priceAdjustment: opt.priceAdjustment || 0,
          compositionCost,
          netCost,
          isDefault: opt.isDefault ?? false,
          isActive: opt.isActive !== false,
          compositionTree
        }
      })

      const targetComponentNames = (group.targetComponents || []).map(
        tc => tc.componentName || 'Unknown'
      )

      return {
        id: group.id,
        name: group.name,
        type: group.type,
        isRequired: group.isRequired,
        minSelection: group.minSelection,
        maxSelection: group.maxSelection,
        targetComponentNames,
        options
      }
    })
  }

  /** Calculate total cost of target components being replaced */
  function calculateTargetComponentsCost(targets: TargetComponent[], menuItem: MenuItem): number {
    let total = 0
    for (const target of targets) {
      if (target.sourceType === 'recipe' && target.recipeId) {
        const recipe = recipesStore.getRecipeById(target.recipeId) as Recipe | undefined
        if (!recipe?.components) continue
        const comp = findRecipeComponent(recipe.components, target)
        if (comp) {
          total += resolveComponentCost(comp.componentType, comp.componentId, comp.quantity)
        }
      } else if (target.sourceType === 'variant') {
        const variant = menuItem.variants?.[0]
        const comp = variant?.composition?.find(c => c.id === target.componentId)
        if (comp) {
          total += resolveComponentCost(comp.type, comp.id, comp.quantity)
        }
      }
    }
    return total
  }

  /** Find recipe component matching a target (handles stale IDs) */
  function findRecipeComponent(
    components: Recipe['components'],
    target: TargetComponent
  ): Recipe['components'][number] | undefined {
    if (!components) return undefined

    // 1. Exact row ID match
    const byRowId = components.find(c => c.id === target.componentId)
    if (byRowId) return byRowId

    // 2. Match by componentType + entity ID
    const byEntityId = components.find(
      c => c.componentType === target.componentType && c.componentId === target.componentId
    )
    if (byEntityId) return byEntityId

    // 3. Build entity name map and match by name
    // (target.componentId is stale — recipe was re-saved with new component IDs)
    const sameTypeComponents = components.filter(c => c.componentType === target.componentType)
    for (const comp of sameTypeComponents) {
      const entityName = getEntityName(comp.componentType, comp.componentId)
      if (entityName && entityName === target.componentName) {
        return comp
      }
    }

    return undefined
  }

  /** Resolve entity name by type and ID */
  function getEntityName(type: string, id: string): string | undefined {
    if (type === 'recipe') {
      return (recipesStore.getRecipeById(id) as Recipe | undefined)?.name
    }
    if (type === 'preparation') {
      return (recipesStore.getPreparationById(id) as Preparation | undefined)?.name
    }
    if (type === 'product') {
      return (productsStore.getProductById(id) as Product | undefined)?.name
    }
    return undefined
  }

  return {
    menuCatalogItems,
    recipeCatalogItems,
    preparationCatalogItems,
    productCatalogItems,
    menuCategories,
    recipeCategories,
    preparationCategories,
    productCategories,
    search,
    buildTree,
    buildModifierDisplayData,
    resolveComponentCost
  }
}
