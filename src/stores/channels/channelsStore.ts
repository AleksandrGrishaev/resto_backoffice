// src/stores/channels/channelsStore.ts - Sales channels state management

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  SalesChannel,
  ChannelPrice,
  ChannelMenuItem,
  ChannelVariantPrice,
  TaxMode,
  ChannelPaymentMethodLink
} from './types'
import type { Tax } from '@/types/tax'
import { channelsService } from './channelsService'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ChannelsStore'

export const useChannelsStore = defineStore('channels', () => {
  // State
  const channels = ref<SalesChannel[]>([])
  const channelPrices = ref<ChannelPrice[]>([])
  const channelMenuItems = ref<ChannelMenuItem[]>([])
  const availableTaxes = ref<Tax[]>([])
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

  function getPaymentMethodsForChannel(channelId: string): ChannelPaymentMethodLink[] {
    const channel = getChannelById(channelId)
    return channel?.paymentMethods ?? []
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
        taxMode: 'exclusive' as TaxMode,
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
      taxMode: channel.taxMode,
      grossPrice,
      isAvailable,
      hasExplicitPrice: !!explicitPrice
    }
  }

  /**
   * Get all channel IDs linked to a given channel (bidirectional).
   * Returns linked IDs only, NOT the source channelId itself.
   */
  function getLinkedChannelIds(channelId: string): string[] {
    const channel = getChannelById(channelId)
    if (!channel?.linkedChannelId) return []

    // Bidirectional: find all channels that point to this one OR that this one points to
    const linked = new Set<string>()
    if (channel.linkedChannelId) linked.add(channel.linkedChannelId)

    // Also find channels that link TO this channel
    for (const ch of channels.value) {
      if (ch.id !== channelId && ch.linkedChannelId === channelId) {
        linked.add(ch.id)
      }
    }

    return [...linked]
  }

  function isMenuItemAvailable(channelId: string, menuItemId: string): boolean {
    const channelItem = channelMenuItems.value.find(
      ci => ci.channelId === channelId && ci.menuItemId === menuItemId
    )
    return channelItem?.isAvailable ?? false
  }

  function getMenuItemChannelIds(menuItemId: string): string[] {
    return channelMenuItems.value
      .filter(ci => ci.menuItemId === menuItemId && ci.isAvailable)
      .map(ci => ci.channelId)
  }

  async function setMenuItemChannels(
    menuItemId: string,
    channelAvailability: { channelId: string; isAvailable: boolean }[]
  ): Promise<void> {
    // Propagate: if channel A is linked to B, mirror A's availability to B
    const expanded = [...channelAvailability]
    for (const ca of channelAvailability) {
      for (const linkedId of getLinkedChannelIds(ca.channelId)) {
        if (!expanded.some(e => e.channelId === linkedId)) {
          expanded.push({ channelId: linkedId, isAvailable: ca.isAvailable })
        }
      }
    }

    const results = await channelsService.bulkSetMenuItemChannels(menuItemId, expanded)

    // Replace local records for this menuItemId
    channelMenuItems.value = channelMenuItems.value.filter(ci => ci.menuItemId !== menuItemId)
    channelMenuItems.value.push(...results)
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

      // Load taxes non-blocking — new table may not be in PostgREST cache yet
      try {
        availableTaxes.value = await channelsService.loadTaxes()
      } catch (taxError) {
        DebugUtils.error(MODULE_NAME, 'Failed to load taxes (non-critical)', { taxError })
      }

      DebugUtils.store(MODULE_NAME, 'Initialized', {
        channels: loadedChannels.length,
        prices: loadedPrices.length,
        menuItems: loadedItems.length,
        taxes: availableTaxes.value.length
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
    // Apply to this channel
    const result = await channelsService.upsertChannelPrice(channelId, menuItemId, variantId, price)
    upsertLocalChannelPrice(result)

    // Propagate to linked channels
    for (const linkedId of getLinkedChannelIds(channelId)) {
      const linkedResult = await channelsService.upsertChannelPrice(
        linkedId,
        menuItemId,
        variantId,
        price
      )
      upsertLocalChannelPrice(linkedResult)
    }
  }

  function upsertLocalChannelPrice(cp: ChannelPrice): void {
    const idx = channelPrices.value.findIndex(
      p =>
        p.channelId === cp.channelId &&
        p.menuItemId === cp.menuItemId &&
        p.variantId === cp.variantId
    )
    if (idx !== -1) {
      channelPrices.value[idx] = cp
    } else {
      channelPrices.value.push(cp)
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

  async function loadAvailableTaxes(): Promise<void> {
    try {
      availableTaxes.value = await channelsService.loadTaxes()
      DebugUtils.store(MODULE_NAME, 'Taxes loaded', { count: availableTaxes.value.length })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to load taxes', { error })
    }
  }

  async function setChannelTaxes(channelId: string, taxIds: string[]): Promise<void> {
    await channelsService.setChannelTaxes(channelId, taxIds)

    // Recalculate total tax_percent from selected taxes
    const totalPercent = availableTaxes.value
      .filter(t => taxIds.includes(t.id))
      .reduce((sum, t) => sum + t.percentage, 0)

    await channelsService.recalculateChannelTaxPercent(channelId, totalPercent)

    // Reload channels to get fresh data with joined taxes
    const loadedChannels = await channelsService.loadChannels()
    channels.value = loadedChannels

    DebugUtils.store(MODULE_NAME, 'Channel taxes updated', { channelId, taxIds, totalPercent })
  }

  async function setChannelPaymentMethods(
    channelId: string,
    paymentMethodIds: string[]
  ): Promise<void> {
    await channelsService.setChannelPaymentMethods(channelId, paymentMethodIds)

    // Reload channels to get fresh data with joined payment methods
    const loadedChannels = await channelsService.loadChannels()
    channels.value = loadedChannels

    DebugUtils.store(MODULE_NAME, 'Channel payment methods updated', {
      channelId,
      paymentMethodIds
    })
  }

  async function setMenuItemAvailability(
    channelId: string,
    menuItemId: string,
    isAvailable: boolean
  ): Promise<void> {
    // Apply to this channel
    const result = await channelsService.upsertChannelMenuItem(channelId, menuItemId, isAvailable)
    upsertLocalChannelMenuItem(result)

    // Propagate to linked channels
    for (const linkedId of getLinkedChannelIds(channelId)) {
      const linkedResult = await channelsService.upsertChannelMenuItem(
        linkedId,
        menuItemId,
        isAvailable
      )
      upsertLocalChannelMenuItem(linkedResult)
    }
  }

  function upsertLocalChannelMenuItem(item: ChannelMenuItem): void {
    const idx = channelMenuItems.value.findIndex(
      ci => ci.channelId === item.channelId && ci.menuItemId === item.menuItemId
    )
    if (idx !== -1) {
      channelMenuItems.value[idx] = item
    } else {
      channelMenuItems.value.push(item)
    }
  }

  return {
    // State
    channels,
    channelPrices,
    channelMenuItems,
    availableTaxes,
    isLoading,
    initialized,

    // Getters
    activeChannels,
    deliveryChannels,
    getChannelByCode,
    getChannelById,
    getPaymentMethodsForChannel,
    getChannelPrice,
    isMenuItemAvailable,
    getMenuItemChannelIds,

    // Actions
    initialize,
    loadAvailableTaxes,
    createChannel,
    updateChannel,
    setChannelTaxes,
    setChannelPaymentMethods,
    setChannelPrice,
    removeChannelPrice,
    setMenuItemAvailability,
    setMenuItemChannels
  }
})
