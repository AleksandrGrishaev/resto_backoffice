// src/integrations/gobiz/catalogTypes.ts - GoBiz GoFood Catalog API types

// === GoBiz Catalog PUT Payload ===

export interface GobizCatalogRequest {
  request_id: string
  menus: GobizMenu[]
  variant_categories: GobizVariantCategory[]
}

export interface GobizMenu {
  name: string
  menu_items: GobizMenuItem[]
}

export interface GobizMenuItem {
  external_id: string
  name: string
  internal_name?: string
  description?: string
  in_stock: boolean
  price: number // integer IDR (net price, no decimals)
  image?: string // URL
  operational_hours?: GobizOperationalHours
  variant_category_external_ids?: string[]
}

export interface GobizOperationalHours {
  display_hours: GobizTimeRange[]
}

export interface GobizTimeRange {
  start_time: string // "HH:MM"
  end_time: string // "HH:MM"
}

// === GoBiz Variant Categories (Modifiers) ===

export interface GobizVariantCategory {
  external_id: string
  name: string
  internal_name?: string
  rules: GobizVariantRules
  variants: GobizVariant[]
}

export interface GobizVariantRules {
  selection: {
    min_quantity: number
    max_quantity: number
  }
}

export interface GobizVariant {
  external_id: string
  name: string
  price: number // integer IDR
  in_stock: boolean
}

// === Stock Updates (PATCH) ===

export interface GobizMenuItemStockUpdate {
  external_id: string
  in_stock: boolean
}

export interface GobizVariantStockUpdate {
  external_id: string
  in_stock: boolean
}

// === Sync Result Types ===

export type MenuSyncWarningType =
  | 'missing_image'
  | 'description_truncated'
  | 'removal_modifier_skipped'
  | 'no_active_variants'
  | 'zero_price'
  | 'no_channel_price'

export interface MenuSyncWarning {
  type: MenuSyncWarningType
  itemName: string
  message: string
}

export interface MenuSyncError {
  code: string
  message: string
  details?: unknown
}

export interface MenuSyncStats {
  totalCategories: number
  totalItems: number
  totalVariantCategories: number
  totalVariants: number
  skippedItems: number
  warnings: number
}

export interface MenuSyncPreview {
  payload: GobizCatalogRequest
  stats: MenuSyncStats
  warnings: MenuSyncWarning[]
  categoryMapping: { localId: string; localName: string; gobizName: string }[]
  itemMapping: {
    localItemId: string
    localVariantId: string
    gobizExternalId: string
    gobizName: string
    price: number
  }[]
}

export interface MenuSyncResult {
  success: boolean
  syncedAt: string
  stats: MenuSyncStats
  warnings: MenuSyncWarning[]
  errors: MenuSyncError[]
  apiResponse?: unknown
}
