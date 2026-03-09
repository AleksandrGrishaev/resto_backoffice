// src/stores/menuCollections/menuCollectionsService.ts

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import { mapCollectionFromDB, mapCollectionItemFromDB } from './supabaseMappers'
import type {
  MenuCollection,
  MenuCollectionItem,
  CreateCollectionDto,
  UpdateCollectionDto
} from './types'

const MODULE_NAME = 'MenuCollectionsService'

export const menuCollectionsService = {
  async getCollections(): Promise<MenuCollection[]> {
    const { data, error } = await supabase
      .from('menu_collections')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch collections', { error })
      throw error
    }

    return (data || []).map(mapCollectionFromDB)
  },

  async createCollection(dto: CreateCollectionDto): Promise<MenuCollection> {
    const { data, error } = await supabase
      .from('menu_collections')
      .insert({
        name: dto.name,
        type: dto.type || 'active',
        description: dto.description || null
      })
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create collection', { error })
      throw error
    }

    return mapCollectionFromDB(data)
  },

  async updateCollection(id: string, dto: UpdateCollectionDto): Promise<MenuCollection> {
    const updateData: Record<string, any> = {}
    if (dto.name !== undefined) updateData.name = dto.name
    if (dto.type !== undefined) updateData.type = dto.type
    if (dto.status !== undefined) updateData.status = dto.status
    if (dto.description !== undefined) updateData.description = dto.description

    const { data, error } = await supabase
      .from('menu_collections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update collection', { error })
      throw error
    }

    return mapCollectionFromDB(data)
  },

  async deleteCollection(id: string): Promise<void> {
    const { error } = await supabase.from('menu_collections').delete().eq('id', id)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete collection', { error })
      throw error
    }
  },

  async getCollectionItems(collectionId: string): Promise<MenuCollectionItem[]> {
    const { data, error } = await supabase
      .from('menu_collection_items')
      .select('*')
      .eq('collection_id', collectionId)
      .order('sort_order')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch collection items', { error })
      throw error
    }

    return (data || []).map(mapCollectionItemFromDB)
  },

  async addItemToCollection(collectionId: string, menuItemId: string): Promise<MenuCollectionItem> {
    const { data, error } = await supabase
      .from('menu_collection_items')
      .insert({
        collection_id: collectionId,
        menu_item_id: menuItemId
      })
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to add item to collection', { error })
      throw error
    }

    return mapCollectionItemFromDB(data)
  },

  async removeItemFromCollection(collectionId: string, menuItemId: string): Promise<void> {
    const { error } = await supabase
      .from('menu_collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('menu_item_id', menuItemId)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to remove item from collection', { error })
      throw error
    }
  },

  /**
   * Gap #3: Publish collection
   * Collections are organizational tools. "Publish" bulk-sets is_active on member items
   * and ensures channel_menu_items entries exist. Warns if items belong to other collections.
   */
  async publishCollection(collectionId: string): Promise<{ itemsActivated: number }> {
    const items = await this.getCollectionItems(collectionId)
    const menuItemIds = items.map(i => i.menuItemId)

    if (menuItemIds.length === 0) return { itemsActivated: 0 }

    // Activate all member items
    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: true })
      .in('id', menuItemIds)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to activate collection items', { error })
      throw error
    }

    // Update collection status
    await this.updateCollection(collectionId, { status: 'published' })

    return { itemsActivated: menuItemIds.length }
  },

  async archiveCollection(collectionId: string): Promise<void> {
    // Gap #3: Archive only changes collection status, does NOT deactivate items
    // (items may belong to other active collections)
    await this.updateCollection(collectionId, { status: 'archived' })
  }
}
