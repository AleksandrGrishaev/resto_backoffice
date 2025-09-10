// src/theme/colors.ts
export const themeColors = {
  primary: '#a395e9',
  secondary: '#bfb5f2',
  background: '#141416',
  surface: '#1a1a1e',
  error: '#ff9676',
  success: '#92c9af',
  warning: '#ffb076'
} as const

// Type utilities for our theme system
export type ThemeColors = typeof themeColors
export type ThemeColorKey = keyof ThemeColors
