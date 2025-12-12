// src/composables/useUIScale.ts
// Composable for managing UI scaling based on viewport size

import { computed, ref, watch, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
import { ENV } from '@/config/environment'

// Scale breakpoints configuration
const SCALE_CONFIG = {
  mobile: { maxWidth: 768, scale: 0.85 },
  tablet: { maxWidth: 1024, scale: 0.9 },
  desktop: { maxWidth: Infinity, scale: 1 }
} as const

/**
 * Composable for managing adaptive UI scaling
 *
 * Scales the UI proportionally based on viewport size:
 * - Desktop (>1024px): 100%
 * - Tablet (768-1024px): 90%
 * - Mobile (<768px): 85%
 *
 * Controlled by VITE_UI_AUTO_SCALE environment variable
 */
export function useUIScale() {
  const { width } = useDisplay()
  const isEnabled = ref(ENV.ui?.autoScale ?? true)
  const isInitialized = ref(false)

  // Calculate scale based on viewport width
  const autoScale = computed(() => {
    if (!isEnabled.value) return 1

    const currentWidth = width.value
    if (currentWidth < SCALE_CONFIG.mobile.maxWidth) {
      return SCALE_CONFIG.mobile.scale
    }
    if (currentWidth < SCALE_CONFIG.tablet.maxWidth) {
      return SCALE_CONFIG.tablet.scale
    }
    return SCALE_CONFIG.desktop.scale
  })

  // Current breakpoint name
  const currentBreakpoint = computed(() => {
    const currentWidth = width.value
    if (currentWidth < SCALE_CONFIG.mobile.maxWidth) return 'mobile'
    if (currentWidth < SCALE_CONFIG.tablet.maxWidth) return 'tablet'
    return 'desktop'
  })

  // Apply scale to CSS custom property
  const applyScale = (scale: number) => {
    document.documentElement.style.setProperty('--ui-scale', String(scale))

    // Set data attribute to control CSS fallback
    if (!isEnabled.value) {
      document.documentElement.setAttribute('data-scale-disabled', 'true')
    } else {
      document.documentElement.removeAttribute('data-scale-disabled')
    }
  }

  // Watch for scale changes and apply
  watch(
    autoScale,
    newScale => {
      applyScale(newScale)
    },
    { immediate: true }
  )

  // Enable auto-scaling
  const enable = () => {
    isEnabled.value = true
    applyScale(autoScale.value)
  }

  // Disable auto-scaling (reset to 100%)
  const disable = () => {
    isEnabled.value = false
    applyScale(1)
  }

  // Toggle auto-scaling
  const toggle = () => {
    if (isEnabled.value) {
      disable()
    } else {
      enable()
    }
  }

  // Initialize on mount
  onMounted(() => {
    applyScale(autoScale.value)
    isInitialized.value = true
  })

  return {
    // State
    scale: autoScale,
    isEnabled,
    isInitialized,
    currentBreakpoint,
    viewportWidth: width,

    // Actions
    enable,
    disable,
    toggle,

    // Config (readonly)
    config: SCALE_CONFIG
  }
}

// Singleton instance for global access
let globalInstance: ReturnType<typeof useUIScale> | null = null

/**
 * Get or create a singleton instance of useUIScale
 * Use this when you need access outside of Vue component context
 */
export function getUIScaleInstance() {
  if (!globalInstance) {
    globalInstance = useUIScale()
  }
  return globalInstance
}

export type UIScaleInstance = ReturnType<typeof useUIScale>
