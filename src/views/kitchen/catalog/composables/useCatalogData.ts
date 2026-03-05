import { computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useMenuStore } from '@/stores/menu'
import { formatIDR } from '@/utils'
import { getUnitShortName } from '@/types/measurementUnits'
import type { TreeNode } from '../detail/DependencyTree.vue'
import type { Product } from '@/stores/productsStore/types'
import type { Preparation, Recipe } from '@/stores/recipes/types'
import type { MenuItem } from '@/stores/menu/types'

// Unified catalog item for lists and search
export interface CatalogItem {
  id: string
  name: string
  type: 'menu' | 'recipe' | 'preparation' | 'product'
  isActive: boolean
  department?: string
  categoryId?: string
  categoryName?: string
  code?: string
  unit?: string
  costDisplay?: string
  cost?: number
  componentCount?: number
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
          return sum + resolveComponentCost(comp.type, comp.id, comp.quantity)
        }, 0) ?? 0
      return {
        id: mi.id,
        name: mi.name,
        type: 'menu' as const,
        isActive: mi.isActive,
        department: mi.department,
        categoryId: mi.categoryId,
        categoryName: cat?.name,
        componentCount: variant?.composition?.length ?? 0,
        cost,
        costDisplay: cost > 0 ? formatIDR(cost) : undefined
      }
    })
  )

  // --- Recipes as CatalogItems ---
  const recipeCatalogItems = computed<CatalogItem[]>(() =>
    (recipesStore.recipes as Recipe[]).map(r => ({
      id: r.id,
      name: r.name,
      type: 'recipe' as const,
      isActive: r.isActive,
      department: r.department,
      categoryId: r.category,
      categoryName: recipesStore.getRecipeCategoryName(r.category),
      code: r.code,
      componentCount: r.components?.length ?? 0,
      cost: r.cost,
      costDisplay: r.cost ? `${formatIDR(r.cost)}/portion` : undefined
    }))
  )

  // --- Preparations as CatalogItems ---
  const preparationCatalogItems = computed<CatalogItem[]>(() =>
    (recipesStore.preparations as Preparation[]).map(p => ({
      id: p.id,
      name: p.name,
      type: 'preparation' as const,
      isActive: p.isActive,
      department: p.department,
      categoryId: p.type,
      categoryName: recipesStore.getPreparationCategoryName(p.type),
      code: p.code,
      unit: p.outputUnit,
      componentCount: p.recipe?.length ?? 0,
      cost: p.costPerPortion,
      costDisplay: p.costPerPortion
        ? `${formatIDR(p.costPerPortion)}/${getUnitShortName(p.outputUnit)}`
        : undefined
    }))
  )

  // --- Products as CatalogItems ---
  const productCatalogItems = computed<CatalogItem[]>(() =>
    (productsStore.products as Product[]).map(p => ({
      id: p.id,
      name: p.name,
      type: 'product' as const,
      isActive: p.isActive,
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
  function buildTree(type: CatalogItem['type'], id: string, visited?: Set<string>): TreeNode[] {
    const seen = visited ?? new Set<string>()
    const key = `${type}:${id}`
    if (seen.has(key)) return [] // circular dependency guard
    seen.add(key)

    let nodes: TreeNode[] = []

    if (type === 'menu') {
      const mi = (menuStore.menuItems as MenuItem[]).find(m => m.id === id)
      if (!mi) return []
      const variant = mi.variants?.[0]
      if (!variant?.composition?.length) return []
      nodes = variant.composition.map(comp =>
        buildCompositionNode(
          comp.type as 'product' | 'recipe' | 'preparation',
          comp.id,
          comp.quantity,
          comp.unit,
          seen,
          comp.useYieldPercentage
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
    useYieldPercentage?: boolean
  ): TreeNode {
    const cost = resolveComponentCost(type, id, quantity, useYieldPercentage)

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
      // If stored cost is missing, derive from children: (childrenSum / outputQuantity) * quantity
      let effectiveCost = cost
      if (effectiveCost <= 0 && childrenSum > 0 && p?.outputQuantity && p.outputQuantity > 0) {
        effectiveCost = Math.round((childrenSum / p.outputQuantity) * quantity)
      }
      // For portion-type preparations, outputUnit should be "portion" not the base unit
      const outputUnit = p?.portionType === 'portion' ? 'portion' : p?.outputUnit
      // Batch cost: prefer store-calculated cost (accounts for yield etc.), fallback to children sum
      const batchCost =
        cost > 0 && p?.outputQuantity
          ? Math.round((cost / quantity) * p.outputQuantity)
          : childrenSum
      return {
        id,
        name: p?.name ?? id,
        type: 'preparation',
        quantity,
        unit: outputUnit || unit,
        cost: effectiveCost > 0 ? effectiveCost : undefined,
        children,
        outputQuantity: p?.outputQuantity,
        outputUnit,
        totalRecipeCost: batchCost > 0 ? batchCost : undefined
      }
    }

    if (type === 'recipe') {
      const r = recipesStore.getRecipeById(id) as Recipe | undefined
      const children = buildTree('recipe', id, new Set(visited))
      const childrenSum = children.reduce((sum, c) => sum + (c.cost ?? 0), 0)
      let effectiveCost = cost
      if (effectiveCost <= 0 && childrenSum > 0 && r?.portionSize && r.portionSize > 0) {
        effectiveCost = Math.round((childrenSum / r.portionSize) * quantity)
      }
      // Batch cost: prefer store-calculated cost (accounts for yield etc.), fallback to children sum
      const batchCost =
        cost > 0 && r?.portionSize ? Math.round((cost / quantity) * r.portionSize) : childrenSum
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
    useYieldPercentage?: boolean
  ): number {
    if (type === 'product') {
      const p = productsStore.getProductById(id) as Product | null
      let adjustedQuantity = quantity
      if (useYieldPercentage && p?.yieldPercentage && p.yieldPercentage < 100) {
        adjustedQuantity = quantity / (p.yieldPercentage / 100)
      }
      return (p?.baseCostPerUnit ?? 0) * adjustedQuantity
    }
    if (type === 'preparation') {
      const p = recipesStore.getPreparationById(id) as Preparation | undefined
      return (p?.costPerPortion ?? 0) * quantity
    }
    if (type === 'recipe') {
      const r = recipesStore.getRecipeById(id) as Recipe | undefined
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
    resolveComponentCost
  }
}
