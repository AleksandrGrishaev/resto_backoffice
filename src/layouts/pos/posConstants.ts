// src/layouts/pos/posConstants.ts

import type { LayoutConfig } from './posTypes'

// Основные размеры для touch-устройств
export const TOUCH_SIZE = 44
export const SPACING_BASE = 8

// Preset конфигурации
export const POS_LAYOUTS: Record<string, LayoutConfig> = {
  compact: {
    name: 'compact',
    displayName: 'Компактный',
    dimensions: {
      sidebar: { width: 64, minWidth: 56, maxWidth: 72 },
      content: { menuRatio: 0.65, orderMinWidth: 280, orderMaxWidth: 340 },
      spacing: { gap: 4, padding: 4, borderRadius: 4 },
      components: {
        headerHeight: 44,
        tableItemHeight: 44,
        orderItemHeight: 48,
        buttonHeight: 44,
        iconSize: 16
      }
    },
    breakpoint: { maxWidth: 768 }
  },

  standard: {
    name: 'standard',
    displayName: 'Стандартный',
    dimensions: {
      sidebar: { width: 80, minWidth: 72, maxWidth: 96 },
      content: { menuRatio: 0.62, orderMinWidth: 320, orderMaxWidth: 380 },
      spacing: { gap: 6, padding: 6, borderRadius: 6 },
      components: {
        headerHeight: 48,
        tableItemHeight: 48,
        orderItemHeight: 52,
        buttonHeight: 48,
        iconSize: 20
      }
    },
    breakpoint: { minWidth: 768, maxWidth: 1200 }
  },

  comfortable: {
    name: 'comfortable',
    displayName: 'Комфортный',
    dimensions: {
      sidebar: { width: 100, minWidth: 88, maxWidth: 120 },
      content: { menuRatio: 0.6, orderMinWidth: 360, orderMaxWidth: 420 },
      spacing: { gap: 8, padding: 8, borderRadius: 8 },
      components: {
        headerHeight: 52,
        tableItemHeight: 52,
        orderItemHeight: 56,
        buttonHeight: 52,
        iconSize: 24
      }
    },
    breakpoint: { minWidth: 1200, maxWidth: 1600 }
  },

  wide: {
    name: 'wide',
    displayName: 'Широкий',
    dimensions: {
      sidebar: { width: 120, minWidth: 100, maxWidth: 160 },
      content: { menuRatio: 0.58, orderMinWidth: 400, orderMaxWidth: 480 },
      spacing: { gap: 12, padding: 12, borderRadius: 8 },
      components: {
        headerHeight: 56,
        tableItemHeight: 56,
        orderItemHeight: 60,
        buttonHeight: 56,
        iconSize: 28
      }
    },
    breakpoint: { minWidth: 1600 }
  }
}

// Утилиты
export const getLayoutByName = (name: string) => POS_LAYOUTS[name] || POS_LAYOUTS.standard

export const getAutoLayout = (screenWidth: number): LayoutConfig => {
  if (screenWidth < 768) return POS_LAYOUTS.compact
  if (screenWidth < 1200) return POS_LAYOUTS.standard
  if (screenWidth < 1600) return POS_LAYOUTS.comfortable
  return POS_LAYOUTS.wide
}
