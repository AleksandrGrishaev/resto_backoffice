// src/integrations/gobiz/catalogMapper.ts - Pure functions mapping internal menu → GoBiz catalog

import type { MenuItem, Category, ModifierGroup, ModifierOption } from '@/stores/menu/types'
import type { useChannelsStore } from '@/stores/channels/channelsStore'
import type {
  GobizCatalogRequest,
  GobizMenu,
  GobizMenuItem,
  GobizVariantCategory,
  GobizVariant,
  GobizMenuItemStockUpdate,
  GobizVariantStockUpdate,
  MenuSyncPreview,
  MenuSyncWarning,
  MenuSyncStats
} from './catalogTypes'
import { generateId } from '@/utils'

const DESCRIPTION_MAX_LENGTH = 200

// === Main Entry Point ===

/**
 * Build the full GoBiz catalog PUT payload from local menu data.
 * Pure function — no side effects, no API calls.
 */
export function buildCatalogPayload(
  menuItems: MenuItem[],
  categories: Category[],
  channelsStore: ReturnType<typeof useChannelsStore>,
  gobizChannelId: string
): MenuSyncPreview {
  const warnings: MenuSyncWarning[] = []
  const categoryMapping: MenuSyncPreview['categoryMapping'] = []
  const itemMapping: MenuSyncPreview['itemMapping'] = []

  // Build category lookup (flatten nested → "Parent - Child")
  const categoryNameMap = buildCategoryNameMap(categories)

  // Group active items by category
  const activeItems = menuItems.filter(item => item.isActive)
  const itemsByCategory = new Map<string, MenuItem[]>()

  for (const item of activeItems) {
    const catId = item.categoryId
    if (!itemsByCategory.has(catId)) {
      itemsByCategory.set(catId, [])
    }
    itemsByCategory.get(catId)!.push(item)
  }

  // Collect all variant categories (modifiers) across all items
  const variantCategoriesMap = new Map<string, GobizVariantCategory>()

  // Build GoBiz menus (one per category)
  const menus: GobizMenu[] = []
  let skippedItems = 0

  for (const [catId, items] of itemsByCategory) {
    const categoryName = categoryNameMap.get(catId) ?? 'Uncategorized'
    const gobizMenuItems: GobizMenuItem[] = []

    for (const item of items) {
      const result = mapMenuItem(
        item,
        channelsStore,
        gobizChannelId,
        variantCategoriesMap,
        warnings
      )
      if (result.length === 0) {
        skippedItems++
      } else {
        gobizMenuItems.push(...result)
        for (const mapped of result) {
          const variant = item.variants.find(
            v => mapped.external_id === item.id || mapped.external_id === `${item.id}__${v.id}`
          )
          itemMapping.push({
            localItemId: item.id,
            localVariantId: variant?.id ?? item.variants[0]?.id ?? '',
            gobizExternalId: mapped.external_id,
            gobizName: mapped.name,
            price: mapped.price
          })
        }
      }
    }

    if (gobizMenuItems.length > 0) {
      menus.push({
        name: categoryName,
        menu_items: gobizMenuItems
      })

      categoryMapping.push({
        localId: catId,
        localName: categories.find(c => c.id === catId)?.name ?? catId,
        gobizName: categoryName
      })
    }
  }

  const variantCategories = Array.from(variantCategoriesMap.values())

  const payload: GobizCatalogRequest = {
    request_id: generateId('sync'),
    menus,
    variant_categories: variantCategories
  }

  const stats: MenuSyncStats = {
    totalCategories: menus.length,
    totalItems: menus.reduce((sum, m) => sum + m.menu_items.length, 0),
    totalVariantCategories: variantCategories.length,
    totalVariants: variantCategories.reduce((sum, vc) => sum + vc.variants.length, 0),
    skippedItems,
    warnings: warnings.length
  }

  return { payload, stats, warnings, categoryMapping, itemMapping }
}

// === Stock Update Builders ===

/**
 * Build stock update payloads for quick PATCH operations.
 */
export function buildStockUpdates(
  menuItems: MenuItem[],
  channelsStore: ReturnType<typeof useChannelsStore>,
  gobizChannelId: string
): {
  menuItemUpdates: GobizMenuItemStockUpdate[]
  variantUpdates: GobizVariantStockUpdate[]
} {
  const menuItemUpdates: GobizMenuItemStockUpdate[] = []
  const variantUpdates: GobizVariantStockUpdate[] = []

  for (const item of menuItems) {
    if (!item.isActive) continue

    const isAvailable = channelsStore.isMenuItemAvailable(gobizChannelId, item.id)
    const activeVariants = item.variants.filter(v => v.isActive)

    if (activeVariants.length === 1) {
      // Single variant → item-level external_id
      menuItemUpdates.push({
        external_id: item.id,
        in_stock: isAvailable && activeVariants[0].isActive
      })
    } else if (activeVariants.length > 1) {
      // Multi-variant → each variant has its own external_id
      for (const variant of activeVariants) {
        menuItemUpdates.push({
          external_id: `${item.id}__${variant.id}`,
          in_stock: isAvailable && variant.isActive
        })
      }
    }

    // Modifier variant stock (always true for now)
    if (item.modifierGroups) {
      for (const group of item.modifierGroups) {
        for (const option of group.options) {
          if (option.isActive !== false) {
            variantUpdates.push({
              external_id: option.id,
              in_stock: true
            })
          }
        }
      }
    }
  }

  return { menuItemUpdates, variantUpdates }
}

// === Internal Helpers ===

/**
 * Build flat category name map, flattening nested categories into "Parent - Child" format.
 */
function buildCategoryNameMap(categories: Category[]): Map<string, string> {
  const nameMap = new Map<string, string>()

  // Build parent lookup
  const parentMap = new Map<string, Category>()
  for (const cat of categories) {
    parentMap.set(cat.id, cat)
  }

  for (const cat of categories) {
    if (cat.parentId && parentMap.has(cat.parentId)) {
      const parent = parentMap.get(cat.parentId)!
      nameMap.set(cat.id, `${parent.name} - ${cat.name}`)
    } else {
      nameMap.set(cat.id, cat.name)
    }
  }

  return nameMap
}

/**
 * Map a single MenuItem to one or more GobizMenuItems.
 * Single-variant items → 1 GobizMenuItem with external_id = item.id
 * Multi-variant items → N GobizMenuItems with external_id = "item.id__variant.id"
 */
function mapMenuItem(
  item: MenuItem,
  channelsStore: ReturnType<typeof useChannelsStore>,
  gobizChannelId: string,
  variantCategoriesMap: Map<string, GobizVariantCategory>,
  warnings: MenuSyncWarning[]
): GobizMenuItem[] {
  const activeVariants = item.variants.filter(v => v.isActive)

  if (activeVariants.length === 0) {
    warnings.push({
      type: 'no_active_variants',
      itemName: item.name,
      message: `"${item.name}" has no active variants — skipped`
    })
    return []
  }

  // Check for image
  if (!item.imageUrl) {
    warnings.push({
      type: 'missing_image',
      itemName: item.name,
      message: `"${item.name}" has no image`
    })
  }

  // Process modifiers → GoBiz variant categories
  const variantCategoryIds = mapModifierGroups(item, variantCategoriesMap, warnings)

  // Check description truncation
  let description = item.description
  if (description && description.length > DESCRIPTION_MAX_LENGTH) {
    description = description.substring(0, DESCRIPTION_MAX_LENGTH - 3) + '...'
    warnings.push({
      type: 'description_truncated',
      itemName: item.name,
      message: `"${item.name}" description truncated to ${DESCRIPTION_MAX_LENGTH} chars`
    })
  }

  const isAvailable = channelsStore.isMenuItemAvailable(gobizChannelId, item.id)

  if (activeVariants.length === 1) {
    // Single variant: external_id = item.id, name = item.name
    const variant = activeVariants[0]
    const price = getVariantPrice(item.id, variant.id, variant.price, channelsStore, gobizChannelId)

    if (price === 0) {
      warnings.push({
        type: 'zero_price',
        itemName: item.name,
        message: `"${item.name}" has zero price`
      })
    }

    return [
      {
        external_id: item.id,
        name: item.name,
        internal_name: item.nameEn || undefined,
        description: description || undefined,
        in_stock: isAvailable && variant.isActive,
        price: Math.round(price),
        image: item.imageUrl || undefined,
        variant_category_external_ids:
          variantCategoryIds.length > 0 ? variantCategoryIds : undefined
      }
    ]
  }

  // Multi-variant: each variant → separate GobizMenuItem
  return activeVariants.map(variant => {
    const price = getVariantPrice(item.id, variant.id, variant.price, channelsStore, gobizChannelId)
    const name = `${item.name} - ${variant.name}`

    if (price === 0) {
      warnings.push({
        type: 'zero_price',
        itemName: name,
        message: `"${name}" has zero price`
      })
    }

    return {
      external_id: `${item.id}__${variant.id}`,
      name,
      internal_name: item.nameEn ? `${item.nameEn} - ${variant.name}` : undefined,
      description: description || undefined,
      in_stock: isAvailable && variant.isActive,
      price: Math.round(price),
      image: item.imageUrl || undefined,
      variant_category_external_ids: variantCategoryIds.length > 0 ? variantCategoryIds : undefined
    }
  })
}

/**
 * Map ModifierGroups → GoBiz VariantCategories.
 * Returns list of variant_category external_ids for the item.
 * Skips 'removal' type modifiers with a warning.
 */
function mapModifierGroups(
  item: MenuItem,
  variantCategoriesMap: Map<string, GobizVariantCategory>,
  warnings: MenuSyncWarning[]
): string[] {
  if (!item.modifierGroups || item.modifierGroups.length === 0) {
    return []
  }

  const categoryIds: string[] = []

  for (const group of item.modifierGroups) {
    if (group.type === 'removal') {
      warnings.push({
        type: 'removal_modifier_skipped',
        itemName: item.name,
        message: `"${item.name}" modifier group "${group.name}" (removal type) — skipped (not supported by GoBiz)`
      })
      continue
    }

    const externalId = group.id
    categoryIds.push(externalId)

    // Only add if not already in the map (shared modifiers)
    if (!variantCategoriesMap.has(externalId)) {
      variantCategoriesMap.set(externalId, mapModifierGroup(group))
    }
  }

  return categoryIds
}

/**
 * Map a single ModifierGroup → GobizVariantCategory.
 */
function mapModifierGroup(group: ModifierGroup): GobizVariantCategory {
  const minQty = group.isRequired ? Math.max(group.minSelection ?? 1, 1) : 0
  const maxQty = group.maxSelection ?? group.options.length

  const variants: GobizVariant[] = group.options
    .filter((opt: ModifierOption) => opt.isActive !== false)
    .map((opt: ModifierOption) => ({
      external_id: opt.id,
      name: opt.name,
      price: Math.round(Math.max(opt.priceAdjustment, 0)),
      in_stock: true
    }))

  return {
    external_id: group.id,
    name: group.name,
    rules: {
      selection: {
        min_quantity: minQty,
        max_quantity: maxQty
      }
    },
    variants
  }
}

/**
 * Get the price for a variant in the GoBiz channel.
 * Channel price override → fallback to base variant price.
 * GoBiz channel has 0% tax, so net = gross.
 */
function getVariantPrice(
  menuItemId: string,
  variantId: string,
  basePrice: number,
  channelsStore: ReturnType<typeof useChannelsStore>,
  gobizChannelId: string
): number {
  const channelPrice = channelsStore.getChannelPrice(
    gobizChannelId,
    menuItemId,
    variantId,
    basePrice
  )
  return channelPrice.netPrice
}
