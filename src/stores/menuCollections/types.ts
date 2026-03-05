// src/stores/menuCollections/types.ts

export type CollectionType = 'active' | 'draft' | 'seasonal'
export type CollectionStatus = 'draft' | 'published' | 'archived'

export interface MenuCollection {
  id: string
  name: string
  type: CollectionType
  status: CollectionStatus
  description?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface MenuCollectionItem {
  id: string
  collectionId: string
  menuItemId: string
  sortOrder: number
  notes?: string
  createdAt: string
}

export interface CreateCollectionDto {
  name: string
  type?: CollectionType
  description?: string
}

export interface UpdateCollectionDto {
  name?: string
  type?: CollectionType
  status?: CollectionStatus
  description?: string
}
