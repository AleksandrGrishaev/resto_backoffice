// src/layouts/pos/index.ts

// Основной composable
export { usePosLayout } from './usePosLayout'

// Константы и конфигурации
export { POS_LAYOUTS, getLayoutByName, getAutoLayout } from './posConstants'

// Типы
export type {
  LayoutPreset,
  LayoutDimensions,
  ComputedDimensions,
  LayoutChecks,
  LayoutConfig
} from './posTypes'
