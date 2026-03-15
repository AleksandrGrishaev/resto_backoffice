// src/stores/website/types.ts - Website Homepage Configuration Types

export interface HomepageSection {
  id: string
  slotPosition: number // 1-4
  categoryId: string
  title: string | null // override category name
  maxItems: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  // joined
  categoryName?: string
}

export interface HomepageFeaturedItem {
  id: string
  sectionId: string
  menuItemId: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  // joined
  menuItemName?: string
  menuItemPrice?: number
  menuItemImageUrl?: string | null
  menuItemType?: string | null
}
