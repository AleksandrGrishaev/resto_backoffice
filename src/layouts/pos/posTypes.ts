// src/layouts/pos/posTypes.ts

export type LayoutPreset = 'compact' | 'standard' | 'comfortable' | 'wide'

export interface LayoutDimensions {
  sidebar: {
    width: number
    minWidth: number
    maxWidth: number
  }
  content: {
    menuRatio: number
    orderMinWidth: number
    orderMaxWidth: number
  }
  spacing: {
    gap: number
    padding: number
    borderRadius: number
  }
  components: {
    headerHeight: number
    tableItemHeight: number
    orderItemHeight: number
    buttonHeight: number
    iconSize: number
  }
}

export interface ComputedDimensions {
  sidebar: {
    width: number
  }
  menu: {
    width: number
  }
  order: {
    width: number
    minWidth: number
    maxWidth: number
  }
  spacing: LayoutDimensions['spacing']
  components: LayoutDimensions['components']
}

export interface LayoutChecks {
  isCompact: boolean
  isStandard: boolean
  isComfortable: boolean
  isWide: boolean
  shouldUseIconsOnly: boolean
  hasEnoughSpaceForDetails: boolean
}

export interface LayoutConfig {
  name: LayoutPreset
  displayName: string
  dimensions: LayoutDimensions
  breakpoint: {
    minWidth?: number
    maxWidth?: number
  }
}
