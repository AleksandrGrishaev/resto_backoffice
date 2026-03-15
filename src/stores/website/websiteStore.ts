// src/stores/website/websiteStore.ts - Pinia store for website homepage management

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HomepageSection, HomepageFeaturedItem } from './types'
import { websiteService } from './websiteService'

export const useWebsiteStore = defineStore('website', () => {
  // State
  const sections = ref<HomepageSection[]>([])
  const itemsBySection = ref<Record<string, HomepageFeaturedItem[]>>({})
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const activeSections = computed(() =>
    sections.value.filter(s => s.isActive).sort((a, b) => a.slotPosition - b.slotPosition)
  )

  function getSectionItems(sectionId: string): HomepageFeaturedItem[] {
    return (itemsBySection.value[sectionId] || []).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  // Actions
  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      sections.value = await websiteService.loadSections()
      const allItems = await websiteService.loadAllItems()

      // Group items by section
      const grouped: Record<string, HomepageFeaturedItem[]> = {}
      for (const item of allItems) {
        if (!grouped[item.sectionId]) grouped[item.sectionId] = []
        grouped[item.sectionId].push(item)
      }
      itemsBySection.value = grouped
    } catch (e: any) {
      error.value = e.message || 'Failed to load homepage config'
      console.error('[WebsiteStore] loadAll error:', e)
    } finally {
      loading.value = false
    }
  }

  async function saveSection(
    section: Partial<HomepageSection> & { slotPosition: number; categoryId: string }
  ) {
    saving.value = true
    error.value = null
    try {
      const saved = await websiteService.upsertSection(section)
      const idx = sections.value.findIndex(s => s.slotPosition === saved.slotPosition)
      if (idx >= 0) {
        sections.value[idx] = saved
      } else {
        sections.value.push(saved)
      }
      return saved
    } catch (e: any) {
      error.value = e.message || 'Failed to save section'
      throw e
    } finally {
      saving.value = false
    }
  }

  async function removeSection(id: string) {
    saving.value = true
    try {
      await websiteService.deleteSection(id)
      sections.value = sections.value.filter(s => s.id !== id)
      delete itemsBySection.value[id]
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      saving.value = false
    }
  }

  async function addItemToSection(sectionId: string, menuItemId: string) {
    const currentItems = getSectionItems(sectionId)
    const sortOrder = currentItems.length
    try {
      const item = await websiteService.addItem(sectionId, menuItemId, sortOrder)
      if (!itemsBySection.value[sectionId]) itemsBySection.value[sectionId] = []
      itemsBySection.value[sectionId].push(item)
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function removeItemFromSection(sectionId: string, itemId: string) {
    try {
      await websiteService.removeItem(itemId)
      if (itemsBySection.value[sectionId]) {
        itemsBySection.value[sectionId] = itemsBySection.value[sectionId].filter(
          i => i.id !== itemId
        )
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  async function moveItem(sectionId: string, itemId: string, direction: 'up' | 'down') {
    const items = getSectionItems(sectionId)
    const idx = items.findIndex(i => i.id === itemId)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return

    // Swap sort orders
    const updates = [
      { id: items[idx].id, sortOrder: items[swapIdx].sortOrder },
      { id: items[swapIdx].id, sortOrder: items[idx].sortOrder }
    ]

    try {
      await websiteService.reorderItems(updates)
      // Update local state
      const temp = items[idx].sortOrder
      items[idx].sortOrder = items[swapIdx].sortOrder
      items[swapIdx].sortOrder = temp
      itemsBySection.value[sectionId] = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
    } catch (e: any) {
      error.value = e.message
    }
  }

  return {
    sections,
    itemsBySection,
    loading,
    saving,
    error,
    activeSections,
    getSectionItems,
    loadAll,
    saveSection,
    removeSection,
    addItemToSection,
    removeItemFromSection,
    moveItem
  }
})
