// src/stores/channels/channelsStore.ts - Sales channels state management

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SalesChannel, ChannelPrice, ChannelMenuItem, ChannelVariantPrice } from './types'
import { channelsService } from './channelsService'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ChannelsStore'

export const useChannelsStore = defineStore('channels', () => {
  // State
  const channels = ref<SalesChannel[]>([])
  const channelPrices = ref<ChannelPrice[]>([])
  const channelMenuItems = ref<ChannelMenuItem[]>([])
  const isLoading = ref(false)
  const initialized = ref(false)

  // Getters
  const activeChannels = computed(() =>
    channels.value.filter(c => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  const deliveryChannels = computed(() =>
    activeChannels.value.filter(c => c.type === 'delivery_platform')
  )

  // Lookup helpers
  function getChannelByCode(code: string): SalesChannel | undefined {
    return channels.value.find(c => c.code === code)
  }

  function getChannelById(id: string): SalesChannel | undefined {
    return channels.value.find(c => c.id === id)
  }

  // Get price for a variant in a channel
  function getChannelPrice(
    channelId: string,
    menuItemId: string,
    variantId: string,
    baseNetPrice: number
  ): ChannelVariantPrice {
    const channel = getChannelById(channelId)
    if (!channel) {
      return {
        channelId,
        channelCode: 'unknown',
        menuItemId,
        variantId,
        netPrice: baseNetPrice,
        taxPercent: 0,
        grossPrice: baseNetPrice,
        isAvailable: false,
        hasExplicitPrice: false
      }
    }

    const explicitPrice = channelPrices.value.find(
      cp =>
        cp.channelId === channelId &&
        cp.menuItemId === menuItemId &&
        cp.variantId === variantId &&
        cp.isActive
    )

    const netPrice = explicitPrice?.price ?? baseNetPrice
    const taxPercent = channel.taxPercent
    const grossPrice = Math.round(netPrice * (1 + taxPercent / 100))
    const isAvailable = isMenuItemAvailable(channelId, menuItemId)

    return {
      channelId,
      channelCode: channel.code,
      menuItemId,
      variantId,
      netPrice,
      taxPercent,
      grossPrice,
      isAvailable,
      hasExplicitPrice: !!explicitPrice
    }
  }

  function isMenuItemAvailable(channelId: string, menuItemId: string): boolean {
    const channelItem = channelMenuItems.value.find(
      ci => ci.channelId === channelId && ci.menuItemId === menuItemId
    )
    return channelItem?.isAvailable ?? true
  }

  // Actions
  async function initialize() {
    if (initialized.value) return
    isLoading.value = true

    try {
      const [loadedChannels, loadedPrices, loadedItems] = await Promise.all([
        channelsService.loadChannels(),
        channelsService.loadChannelPrices(),
        channelsService.loadChannelMenuItems()
      ])

      channels.value = loadedChannels
      channelPrices.value = loadedPrices
      channelMenuItems.value = loadedItems
      initialized.value = true

      DebugUtils.store(MODULE_NAME, 'Initialized', {
        channels: loadedChannels.length,
        prices: loadedPrices.length,
        menuItems: loadedItems.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Initialization failed', { error })
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function createChannel(
    channel: Omit<SalesChannel, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SalesChannel> {
    const newChannel = await channelsService.createChannel(channel)
    channels.value.push(newChannel)
    return newChannel
  }

  async function updateChannel(id: string, updates: Partial<SalesChannel>): Promise<SalesChannel> {
    const updated = await channelsService.updateChannel(id, updates)
    const index = channels.value.findIndex(c => c.id === id)
    if (index !== -1) {
      channels.value[index] = updated
    }
    return updated
  }

  async function setChannelPrice(
    channelId: string,
    menuItemId: string,
    variantId: string,
    price: number
  ): Promise<void> {
    const result = await channelsService.upsertChannelPrice(channelId, menuItemId, variantId, price)

    const existingIndex = channelPrices.value.findIndex(
      cp => cp.channelId === channelId && cp.menuItemId === menuItemId && cp.variantId === variantId
    )

    if (existingIndex !== -1) {
      channelPrices.value[existingIndex] = result
    } else {
      channelPrices.value.push(result)
    }
  }

  async function removeChannelPrice(
    channelId: string,
    menuItemId: string,
    variantId: string
  ): Promise<void> {
    const existing = channelPrices.value.find(
      cp => cp.channelId === channelId && cp.menuItemId === menuItemId && cp.variantId === variantId
    )

    if (existing) {
      await channelsService.deleteChannelPrice(existing.id)
      channelPrices.value = channelPrices.value.filter(cp => cp.id !== existing.id)
    }
  }

  async function setMenuItemAvailability(
    channelId: string,
    menuItemId: string,
    isAvailable: boolean
  ): Promise<void> {
    const result = await channelsService.upsertChannelMenuItem(channelId, menuItemId, isAvailable)

    const existingIndex = channelMenuItems.value.findIndex(
      ci => ci.channelId === channelId && ci.menuItemId === menuItemId
    )

    if (existingIndex !== -1) {
      channelMenuItems.value[existingIndex] = result
    } else {
      channelMenuItems.value.push(result)
    }
  }

  return {
    // State
    channels,
    channelPrices,
    channelMenuItems,
    isLoading,
    initialized,

    // Getters
    activeChannels,
    deliveryChannels,
    getChannelByCode,
    getChannelById,
    getChannelPrice,
    isMenuItemAvailable,

    // Actions
    initialize,
    createChannel,
    updateChannel,
    setChannelPrice,
    removeChannelPrice,
    setMenuItemAvailability
  }
})
