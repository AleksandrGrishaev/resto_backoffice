// src/stores/websiteMenu/websiteMenuStore.ts

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils } from '@/utils'
import { websiteMenuService } from './websiteMenuService'
import type {
  WebsiteMenuCategory,
  WebsiteMenuItem,
  CreateWebsiteCategoryDto,
  UpdateWebsiteCategoryDto,
  CreateWebsiteMenuItemDto,
  UpdateWebsiteMenuItemDto,
  VariantDisplayMode
} from './types'

const MODULE_NAME = 'WebsiteMenuStore'

export const useWebsiteMenuStore = defineStore('websiteMenu', () => {
  const categories = ref<WebsiteMenuCategory[]>([])
  const itemsByCategory = ref<Map<string, WebsiteMenuItem[]>>(new Map())
  const loading = ref(false)
  const initialized = ref(false)

  async function initialize(): Promise<void> {
    if (initialized.value) return

    loading.value = true
    try {
      categories.value = await websiteMenuService.getCategories()

      // Load items for all categories
      const allItems = await websiteMenuService.getItems()
      const map = new Map<string, WebsiteMenuItem[]>()
      for (const item of allItems) {
        const list = map.get(item.categoryId) || []
        list.push(item)
        map.set(item.categoryId, list)
      }
      itemsByCategory.value = map

      initialized.value = true
      DebugUtils.info(MODULE_NAME, 'Initialized', {
        categories: categories.value.length,
        items: allItems.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize', { error })
    } finally {
      loading.value = false
    }
  }

  // ===== CATEGORIES =====

  async function createCategory(
    dto: CreateWebsiteCategoryDto
  ): Promise<WebsiteMenuCategory | null> {
    try {
      // Set sort order to append at end
      const maxSort = categories.value.reduce((max, c) => Math.max(max, c.sortOrder), -1)
      const category = await websiteMenuService.createCategory(dto)
      categories.value.push(category)
      return category
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create category', { error })
      return null
    }
  }

  async function updateCategory(id: string, dto: UpdateWebsiteCategoryDto): Promise<void> {
    try {
      const updated = await websiteMenuService.updateCategory(id, dto)
      const idx = categories.value.findIndex(c => c.id === id)
      if (idx >= 0) categories.value[idx] = updated
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update category', { error })
    }
  }

  async function deleteCategory(id: string): Promise<void> {
    try {
      await websiteMenuService.deleteCategory(id)
      categories.value = categories.value.filter(c => c.id !== id)
      const newMap = new Map(itemsByCategory.value)
      newMap.delete(id)
      itemsByCategory.value = newMap
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete category', { error })
    }
  }

  async function reorderCategories(orderedCategories: WebsiteMenuCategory[]): Promise<void> {
    // Optimistic update
    categories.value = orderedCategories.map((c, i) => ({ ...c, sortOrder: i }))

    try {
      await websiteMenuService.reorderCategories(
        orderedCategories.map((c, i) => ({ id: c.id, sortOrder: i }))
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to reorder categories', { error })
      // Reload on failure
      categories.value = await websiteMenuService.getCategories()
    }
  }

  // ===== ITEMS =====

  async function addItem(dto: CreateWebsiteMenuItemDto): Promise<WebsiteMenuItem | null> {
    try {
      const item = await websiteMenuService.addItem(dto)
      const newMap = new Map(itemsByCategory.value)
      const items = [...(newMap.get(dto.categoryId) || []), item]
      newMap.set(dto.categoryId, items)
      itemsByCategory.value = newMap
      return item
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to add item', { error })
      return null
    }
  }

  async function bulkAddItems(dtos: CreateWebsiteMenuItemDto[]): Promise<void> {
    try {
      const items = await websiteMenuService.bulkAddItems(dtos)
      const newMap = new Map(itemsByCategory.value)
      for (const item of items) {
        const list = [...(newMap.get(item.categoryId) || []), item]
        newMap.set(item.categoryId, list)
      }
      itemsByCategory.value = newMap
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to bulk add items', { error })
    }
  }

  async function updateItem(id: string, dto: UpdateWebsiteMenuItemDto): Promise<void> {
    try {
      const updated = await websiteMenuService.updateItem(id, dto)
      const newMap = new Map(itemsByCategory.value)
      const items = newMap.get(updated.categoryId)
      if (items) {
        const idx = items.findIndex(i => i.id === id)
        if (idx >= 0) {
          items[idx] = updated
          newMap.set(updated.categoryId, [...items])
          itemsByCategory.value = newMap
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update item', { error })
    }
  }

  async function removeItem(id: string, categoryId: string): Promise<void> {
    try {
      await websiteMenuService.removeItem(id)
      const newMap = new Map(itemsByCategory.value)
      const items = (newMap.get(categoryId) || []).filter(i => i.id !== id)
      newMap.set(categoryId, items)
      itemsByCategory.value = newMap
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove item', { error })
    }
  }

  async function reorderItems(categoryId: string, orderedItems: WebsiteMenuItem[]): Promise<void> {
    // Optimistic update — also update categoryId for items moved from other categories
    const newMap = new Map(itemsByCategory.value)
    const updatedItems = orderedItems.map((item, i) => ({
      ...item,
      sortOrder: i,
      categoryId
    }))
    newMap.set(categoryId, updatedItems)

    // Remove moved items from their old categories
    for (const item of orderedItems) {
      if (item.categoryId !== categoryId) {
        const oldItems = newMap.get(item.categoryId)
        if (oldItems) {
          newMap.set(
            item.categoryId,
            oldItems.filter(i => i.id !== item.id)
          )
        }
      }
    }
    itemsByCategory.value = newMap

    try {
      await websiteMenuService.reorderItems(
        orderedItems.map((item, i) => ({ id: item.id, sortOrder: i, categoryId }))
      )
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to reorder items', { error })
      // Reload on failure
      const items = await websiteMenuService.getItems(categoryId)
      const reloadMap = new Map(itemsByCategory.value)
      reloadMap.set(categoryId, items)
      itemsByCategory.value = reloadMap
    }
  }

  async function setVariantDisplayMode(
    itemId: string,
    categoryId: string,
    mode: VariantDisplayMode,
    menuItemId: string,
    menuItemName: string,
    variants: { id: string; name: string }[]
  ): Promise<void> {
    const currentItems = itemsByCategory.value.get(categoryId) || []
    const currentItem = currentItems.find(i => i.id === itemId)
    if (!currentItem) return

    if (mode === 'separate') {
      // Create individual rows for each variant with "Item — Variant" name
      const variantDtos: CreateWebsiteMenuItemDto[] = variants.map(v => ({
        categoryId,
        menuItemId,
        variantId: v.id,
        displayName: `${menuItemName} — ${v.name}`,
        variantDisplayMode: 'separate' as VariantDisplayMode
      }))

      // Remove the parent item row and add variant rows
      await removeItem(itemId, categoryId)
      await bulkAddItems(variantDtos)
    } else {
      // Collect all rows for this menu item (both variant and parent), deduplicate
      const rowsToDelete = currentItems.filter(i => i.menuItemId === menuItemId)
      const idsToDelete = new Set(rowsToDelete.map(r => r.id))

      for (const id of idsToDelete) {
        await websiteMenuService.removeItem(id)
      }

      // Add single parent item row
      await websiteMenuService.addItem({
        categoryId,
        menuItemId,
        variantDisplayMode: 'options'
      })

      // Reload category items
      const freshItems = await websiteMenuService.getItems(categoryId)
      const newMap = new Map(itemsByCategory.value)
      newMap.set(categoryId, freshItems)
      itemsByCategory.value = newMap
    }
  }

  return {
    categories,
    itemsByCategory,
    loading,
    initialized,
    initialize,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    addItem,
    bulkAddItems,
    updateItem,
    removeItem,
    reorderItems,
    setVariantDisplayMode
  }
})
