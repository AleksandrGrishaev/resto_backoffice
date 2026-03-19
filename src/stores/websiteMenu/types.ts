// src/stores/websiteMenu/types.ts

export type VariantDisplayMode = 'options' | 'separate'

export interface WebsiteMenuCategory {
  id: string
  name: string
  nameEn?: string
  description?: string
  slug?: string
  imageUrl?: string
  parentId?: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WebsiteMenuItem {
  id: string
  categoryId: string
  menuItemId: string
  variantId?: string | null
  sortOrder: number
  displayName?: string
  displayDescription?: string
  displayImageUrl?: string
  variantDisplayMode: VariantDisplayMode
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateWebsiteCategoryDto {
  name: string
  nameEn?: string
  description?: string
  slug?: string
  imageUrl?: string
  parentId?: string | null
  isActive?: boolean
}

export interface UpdateWebsiteCategoryDto {
  name?: string
  nameEn?: string
  description?: string
  slug?: string
  imageUrl?: string
  parentId?: string | null
  isActive?: boolean
}

export interface CreateWebsiteMenuItemDto {
  categoryId: string
  menuItemId: string
  variantId?: string | null
  displayName?: string
  displayDescription?: string
  displayImageUrl?: string
  variantDisplayMode?: VariantDisplayMode
}

export interface UpdateWebsiteMenuItemDto {
  displayName?: string
  displayDescription?: string
  displayImageUrl?: string
  variantDisplayMode?: VariantDisplayMode
  isActive?: boolean
}
