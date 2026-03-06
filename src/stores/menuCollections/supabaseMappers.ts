// src/stores/menuCollections/supabaseMappers.ts

import type { MenuCollection, MenuCollectionItem } from './types'

export function mapCollectionFromDB(row: any): MenuCollection {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    description: row.description || undefined,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapCollectionItemFromDB(row: any): MenuCollectionItem {
  return {
    id: row.id,
    collectionId: row.collection_id,
    menuItemId: row.menu_item_id,
    sortOrder: row.sort_order ?? 0,
    notes: row.notes || undefined,
    createdAt: row.created_at
  }
}
