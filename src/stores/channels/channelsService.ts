// src/stores/channels/channelsService.ts - Supabase CRUD operations

import { supabase } from '@/supabase/client'
import type { SalesChannel, ChannelPrice, ChannelMenuItem } from './types'
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
    const { data, error } = await supabase.from('sales_channels').select('*').order('sort_order')

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
