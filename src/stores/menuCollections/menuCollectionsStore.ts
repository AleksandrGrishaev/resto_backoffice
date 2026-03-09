// src/stores/menuCollections/menuCollectionsStore.ts

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { DebugUtils } from '@/utils'
import { menuCollectionsService } from './menuCollectionsService'
import type {
  MenuCollection,
  MenuCollectionItem,
  CreateCollectionDto,
  UpdateCollectionDto
} from './types'

const MODULE_NAME = 'MenuCollectionsStore'

export const useMenuCollectionsStore = defineStore('menuCollections', () => {
  const collections = ref<MenuCollection[]>([])
  const collectionItems = ref<Map<string, MenuCollectionItem[]>>(new Map())
  const loading = ref(false)
  const initialized = ref(false)

  async function initialize(): Promise<void> {
    if (initialized.value) return

    loading.value = true
    try {
      collections.value = await menuCollectionsService.getCollections()
      initialized.value = true
      DebugUtils.info(MODULE_NAME, 'Initialized', { count: collections.value.length })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize', { error })
    } finally {
      loading.value = false
    }
  }

  async function createCollection(dto: CreateCollectionDto): Promise<MenuCollection | null> {
    try {
      const collection = await menuCollectionsService.createCollection(dto)
      collections.value.unshift(collection)
      return collection
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create collection', { error })
      return null
    }
  }

  async function updateCollection(id: string, dto: UpdateCollectionDto): Promise<void> {
    try {
      const updated = await menuCollectionsService.updateCollection(id, dto)
      const idx = collections.value.findIndex(c => c.id === id)
      if (idx >= 0) collections.value[idx] = updated
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update collection', { error })
    }
  }

  async function deleteCollection(id: string): Promise<void> {
    try {
      await menuCollectionsService.deleteCollection(id)
      collections.value = collections.value.filter(c => c.id !== id)
      const newMap = new Map(collectionItems.value)
      newMap.delete(id)
      collectionItems.value = newMap
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete collection', { error })
    }
  }

  async function loadCollectionItems(collectionId: string): Promise<MenuCollectionItem[]> {
    try {
      const items = await menuCollectionsService.getCollectionItems(collectionId)
      // Replace entire Map to trigger Vue reactivity
      const newMap = new Map(collectionItems.value)
      newMap.set(collectionId, items)
      collectionItems.value = newMap
      return items
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load collection items', { error })
      return []
    }
  }

  async function addItemToCollection(collectionId: string, menuItemId: string): Promise<void> {
    try {
      const item = await menuCollectionsService.addItemToCollection(collectionId, menuItemId)
      const items = [...(collectionItems.value.get(collectionId) || []), item]
      const newMap = new Map(collectionItems.value)
      newMap.set(collectionId, items)
      collectionItems.value = newMap
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to add item', { error })
    }
  }

  async function removeItemFromCollection(collectionId: string, menuItemId: string): Promise<void> {
    try {
      await menuCollectionsService.removeItemFromCollection(collectionId, menuItemId)
      const items = (collectionItems.value.get(collectionId) || []).filter(
        i => i.menuItemId !== menuItemId
      )
      const newMap = new Map(collectionItems.value)
      newMap.set(collectionId, items)
      collectionItems.value = newMap
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove item', { error })
    }
  }

  async function publishCollection(collectionId: string): Promise<void> {
    try {
      await menuCollectionsService.publishCollection(collectionId)
      const idx = collections.value.findIndex(c => c.id === collectionId)
      if (idx >= 0) collections.value[idx].status = 'published'
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to publish collection', { error })
    }
  }

  async function archiveCollection(collectionId: string): Promise<void> {
    try {
      await menuCollectionsService.archiveCollection(collectionId)
      const idx = collections.value.findIndex(c => c.id === collectionId)
      if (idx >= 0) collections.value[idx].status = 'archived'
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to archive collection', { error })
    }
  }

  return {
    collections,
    collectionItems,
    loading,
    initialized,
    initialize,
    createCollection,
    updateCollection,
    deleteCollection,
    loadCollectionItems,
    addItemToCollection,
    removeItemFromCollection,
    publishCollection,
    archiveCollection
  }
})
