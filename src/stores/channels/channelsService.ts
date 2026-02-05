// src/stores/channels/channelsService.ts - Supabase CRUD operations

import { supabase } from '@/supabase/client'
import type { SalesChannel, ChannelPrice, ChannelMenuItem } from './types'
import type { Tax } from '@/types/tax'
import {
  mapChannelFromDb,
  mapChannelToDb,
  mapChannelPriceFromDb,
  mapChannelMenuItemFromDb
} from './supabaseMappers'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ChannelsService'

export class ChannelsService {
  // =====================================================
  // CHANNELS
  // =====================================================

  async loadChannels(): Promise<SalesChannel[]> {
    const { data, error } = await supabase
      .from('sales_channels')
      .select(
        '*, channel_taxes(tax_id, taxes(id, name, percentage)), channel_payment_methods(payment_method_id, payment_methods(id, name, code, type, icon, icon_color))'
      )
      .order('sort_order')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load channels', { error })
      throw error
    }

    return (data || []).map(mapChannelFromDb)
  }

  async createChannel(
    channel: Omit<SalesChannel, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SalesChannel> {
    const { data, error } = await supabase
      .from('sales_channels')
      .insert(mapChannelToDb(channel))
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create channel', { error })
      throw error
    }

    return mapChannelFromDb(data)
  }

  async updateChannel(id: string, updates: Partial<SalesChannel>): Promise<SalesChannel> {
    const { data, error } = await supabase
      .from('sales_channels')
      .update(mapChannelToDb(updates))
      .eq('id', id)
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update channel', { error })
      throw error
    }

    return mapChannelFromDb(data)
  }

  // =====================================================
  // CHANNEL PRICES
  // =====================================================

  async loadChannelPrices(): Promise<ChannelPrice[]> {
    const { data, error } = await supabase.from('channel_prices').select('*')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load channel prices', { error })
      throw error
    }

    return (data || []).map(mapChannelPriceFromDb)
  }

  async upsertChannelPrice(
    channelId: string,
    menuItemId: string,
    variantId: string,
    price: number
  ): Promise<ChannelPrice> {
    const { data, error } = await supabase
      .from('channel_prices')
      .upsert(
        {
          channel_id: channelId,
          menu_item_id: menuItemId,
          variant_id: variantId,
          price,
          is_active: true
        },
        { onConflict: 'channel_id,menu_item_id,variant_id' }
      )
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to upsert channel price', { error })
      throw error
    }

    return mapChannelPriceFromDb(data)
  }

  async deleteChannelPrice(id: string): Promise<void> {
    const { error } = await supabase.from('channel_prices').delete().eq('id', id)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete channel price', { error })
      throw error
    }
  }

  // =====================================================
  // CHANNEL MENU ITEMS
  // =====================================================

  async loadChannelMenuItems(): Promise<ChannelMenuItem[]> {
    const { data, error } = await supabase.from('channel_menu_items').select('*')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load channel menu items', { error })
      throw error
    }

    return (data || []).map(mapChannelMenuItemFromDb)
  }

  // =====================================================
  // CHANNEL TAXES
  // =====================================================

  async loadTaxes(): Promise<Tax[]> {
    const { data, error } = await supabase.from('taxes').select('*').order('sort_order')

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load taxes', { error })
      throw error
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      percentage: Number(row.percentage),
      isActive: row.is_active,
      sortOrder: row.sort_order ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async setChannelTaxes(channelId: string, taxIds: string[]): Promise<void> {
    // Delete old links
    const { error: deleteError } = await supabase
      .from('channel_taxes')
      .delete()
      .eq('channel_id', channelId)

    if (deleteError) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete channel taxes', { error: deleteError })
      throw deleteError
    }

    // Insert new links
    if (taxIds.length > 0) {
      const rows = taxIds.map(taxId => ({ channel_id: channelId, tax_id: taxId }))
      const { error: insertError } = await supabase.from('channel_taxes').insert(rows)

      if (insertError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert channel taxes', { error: insertError })
        throw insertError
      }
    }

    DebugUtils.info(MODULE_NAME, 'Channel taxes updated', { channelId, taxIds })
  }

  async setChannelPaymentMethods(channelId: string, paymentMethodIds: string[]): Promise<void> {
    // Delete old links
    const { error: deleteError } = await supabase
      .from('channel_payment_methods')
      .delete()
      .eq('channel_id', channelId)

    if (deleteError) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete channel payment methods', {
        error: deleteError
      })
      throw deleteError
    }

    // Insert new links
    if (paymentMethodIds.length > 0) {
      const rows = paymentMethodIds.map(pmId => ({
        channel_id: channelId,
        payment_method_id: pmId
      }))
      const { error: insertError } = await supabase.from('channel_payment_methods').insert(rows)

      if (insertError) {
        DebugUtils.error(MODULE_NAME, 'Failed to insert channel payment methods', {
          error: insertError
        })
        throw insertError
      }
    }

    DebugUtils.info(MODULE_NAME, 'Channel payment methods updated', { channelId, paymentMethodIds })
  }

  async recalculateChannelTaxPercent(channelId: string, totalPercent: number): Promise<void> {
    const { error } = await supabase
      .from('sales_channels')
      .update({ tax_percent: totalPercent })
      .eq('id', channelId)

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to recalculate tax_percent', { error })
      throw error
    }
  }

  async upsertChannelMenuItem(
    channelId: string,
    menuItemId: string,
    isAvailable: boolean
  ): Promise<ChannelMenuItem> {
    const { data, error } = await supabase
      .from('channel_menu_items')
      .upsert(
        {
          channel_id: channelId,
          menu_item_id: menuItemId,
          is_available: isAvailable
        },
        { onConflict: 'channel_id,menu_item_id' }
      )
      .select()
      .single()

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to upsert channel menu item', { error })
      throw error
    }

    return mapChannelMenuItemFromDb(data)
  }
}

// Singleton
export const channelsService = new ChannelsService()
