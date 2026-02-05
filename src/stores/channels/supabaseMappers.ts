// src/stores/channels/supabaseMappers.ts - DB row <-> domain mappers

import type {
  SalesChannel,
  ChannelPrice,
  ChannelMenuItem,
  ChannelTaxLink,
  ChannelPaymentMethodLink
} from './types'

// =====================================================
// SALES CHANNEL MAPPERS
// =====================================================

export function mapChannelFromDb(row: any): SalesChannel {
  // Map linked taxes from joined channel_taxes data
  const taxes: ChannelTaxLink[] = Array.isArray(row.channel_taxes)
    ? row.channel_taxes
        .filter((ct: any) => ct.taxes)
        .map((ct: any) => ({
          taxId: ct.taxes.id,
          taxName: ct.taxes.name,
          taxPercentage: Number(ct.taxes.percentage)
        }))
    : []

  // Map linked payment methods from joined channel_payment_methods data
  const paymentMethods: ChannelPaymentMethodLink[] = Array.isArray(row.channel_payment_methods)
    ? row.channel_payment_methods
        .filter((cpm: any) => cpm.payment_methods)
        .map((cpm: any) => ({
          paymentMethodId: cpm.payment_methods.id,
          paymentMethodName: cpm.payment_methods.name,
          paymentMethodCode: cpm.payment_methods.code,
          paymentMethodType: cpm.payment_methods.type,
          paymentMethodIcon: cpm.payment_methods.icon,
          paymentMethodIconColor: cpm.payment_methods.icon_color
        }))
    : []

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    isActive: row.is_active,
    commissionPercent: Number(row.commission_percent) || 0,
    taxPercent: Number(row.tax_percent) || 0,
    taxMode: row.tax_mode || 'exclusive',
    taxes,
    paymentMethods,
    settings: row.settings || {},
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapChannelToDb(channel: Partial<SalesChannel>): Record<string, any> {
  const result: Record<string, any> = {}
  if (channel.code !== undefined) result.code = channel.code
  if (channel.name !== undefined) result.name = channel.name
  if (channel.type !== undefined) result.type = channel.type
  if (channel.isActive !== undefined) result.is_active = channel.isActive
  if (channel.commissionPercent !== undefined) result.commission_percent = channel.commissionPercent
  if (channel.taxPercent !== undefined) result.tax_percent = channel.taxPercent
  if (channel.taxMode !== undefined) result.tax_mode = channel.taxMode
  if (channel.settings !== undefined) result.settings = channel.settings
  if (channel.sortOrder !== undefined) result.sort_order = channel.sortOrder
  return result
}

// =====================================================
// CHANNEL PRICE MAPPERS
// =====================================================

export function mapChannelPriceFromDb(row: any): ChannelPrice {
  return {
    id: row.id,
    channelId: row.channel_id,
    menuItemId: row.menu_item_id,
    variantId: row.variant_id,
    price: Number(row.price),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// =====================================================
// CHANNEL MENU ITEM MAPPERS
// =====================================================

export function mapChannelMenuItemFromDb(row: any): ChannelMenuItem {
  return {
    id: row.id,
    channelId: row.channel_id,
    menuItemId: row.menu_item_id,
    isAvailable: row.is_available,
    externalId: row.external_id,
    externalCategoryId: row.external_category_id,
    lastSyncedAt: row.last_synced_at,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}
