// src/stores/channels/channelVisuals.ts
// Centralized icon/color/label constants for order types and channels

import type { ChannelCode } from './types'

export interface ChannelVisual {
  icon: string
  color: string
  label: string
  subtitle?: string
}

type OrderType = 'dine_in' | 'takeaway' | 'delivery'

const CHANNEL_VISUALS: Record<string, ChannelVisual> = {
  dine_in: {
    icon: 'mdi-table-chair',
    color: 'primary',
    label: 'Dine In',
    subtitle: 'Table service'
  },
  takeaway: { icon: 'mdi-shopping', color: 'warning', label: 'Take Away', subtitle: 'Pick up' },
  gobiz: { icon: 'mdi-food', color: '#00aa13', label: 'GoFood', subtitle: 'GoFood / GoBiz' },
  grab: { icon: 'mdi-car', color: '#00b14f', label: 'GrabFood', subtitle: 'GrabFood' }
}

// Fulfillment method visuals (for takeaway orders)
export const FULFILLMENT_VISUALS: Record<string, ChannelVisual> = {
  self_pickup: {
    icon: 'mdi-walk',
    color: 'warning',
    label: 'Self Pickup',
    subtitle: 'Customer picks up'
  },
  goshop: { icon: 'mdi-moped', color: '#00aa13', label: 'GoShop', subtitle: 'GoJek pickup' },
  courier: { icon: 'mdi-bike-fast', color: 'info', label: 'Courier', subtitle: 'Own delivery' }
}

// Online order visual (for source = 'website')
export const ONLINE_ORDER_VISUAL: ChannelVisual = {
  icon: 'mdi-web',
  color: 'teal',
  label: 'Online',
  subtitle: 'Website order'
}

const DELIVERY_FALLBACK: ChannelVisual = {
  icon: 'mdi-bike-fast',
  color: 'info',
  label: 'Delivery',
  subtitle: 'Delivery'
}

const UNKNOWN_FALLBACK: ChannelVisual = {
  icon: 'mdi-help',
  color: 'grey',
  label: 'Unknown'
}

/**
 * Get visual props (icon, color, label) for an order.
 * Priority: channelCode → orderType → delivery fallback
 */
export function getOrderVisual(
  orderType: OrderType | string,
  channelCode?: ChannelCode | string
): ChannelVisual {
  // Channel code takes priority (e.g. gobiz, grab)
  if (channelCode && CHANNEL_VISUALS[channelCode]) {
    return CHANNEL_VISUALS[channelCode]
  }

  // Fall back to order type
  if (CHANNEL_VISUALS[orderType]) {
    return CHANNEL_VISUALS[orderType]
  }

  // Delivery without specific channel
  if (orderType === 'delivery') {
    return DELIVERY_FALLBACK
  }

  return UNKNOWN_FALLBACK
}

/**
 * Get visual props for a specific channel code (used in dialogs).
 */
export function getChannelVisual(channelCode: ChannelCode | string): ChannelVisual {
  return CHANNEL_VISUALS[channelCode] || DELIVERY_FALLBACK
}

/**
 * Get visual props for fulfillment method (takeaway sub-type).
 */
export function getFulfillmentVisual(fulfillmentMethod?: string): ChannelVisual | null {
  if (!fulfillmentMethod) return null
  return FULFILLMENT_VISUALS[fulfillmentMethod] || null
}
