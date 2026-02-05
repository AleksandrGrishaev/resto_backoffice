// src/stores/channels/types.ts - Sales Channel Types

export type ChannelType = 'internal' | 'delivery_platform' | 'pickup'

export type ChannelCode = 'dine_in' | 'takeaway' | 'gobiz' | 'grab' | string

export interface SalesChannel {
  id: string
  code: ChannelCode
  name: string
  type: ChannelType
  isActive: boolean
  commissionPercent: number
  taxPercent: number
  settings: ChannelSettings
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ChannelSettings {
  // GoBiz specific
  outletId?: string
  clientId?: string
  // Grab specific
  merchantId?: string
  // Common
  autoAcceptOrders?: boolean
  defaultPrepTime?: number
  webhookUrl?: string
}

export interface ChannelPrice {
  id: string
  channelId: string
  menuItemId: string
  variantId: string
  price: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ChannelMenuItem {
  id: string
  channelId: string
  menuItemId: string
  isAvailable: boolean
  externalId?: string
  externalCategoryId?: string
  lastSyncedAt?: string
  syncStatus: 'pending' | 'synced' | 'error'
  syncError?: string
  createdAt: string
  updatedAt: string
}

export interface ChannelVariantPrice {
  channelId: string
  channelCode: ChannelCode
  menuItemId: string
  variantId: string
  netPrice: number
  taxPercent: number
  grossPrice: number
  isAvailable: boolean
  hasExplicitPrice: boolean
}

export interface VariantPricingRow {
  menuItemId: string
  menuItemName: string
  variantId: string
  variantName: string
  baseNetPrice: number
  channels: {
    channelId: string
    channelCode: ChannelCode
    netPrice: number
    grossPrice: number
    taxPercent: number
    isAvailable: boolean
  }[]
}
