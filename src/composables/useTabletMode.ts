// src/composables/useTabletMode.ts
/**
 * Composable for detecting tablet/touch device mode.
 * Used to conditionally show custom NumericKeypad instead of system keyboard.
 *
 * Detection criteria:
 * 1. Touch capability (primary)
 * 2. Screen size (tablet range: 600px - 1200px width typically)
 * 3. User agent hints (Android tablets, iPads)
 * 4. Manual override via localStorage
 *
 * Usage:
 * const { isTabletMode, isTouchDevice, forceTabletMode, resetTabletMode } = useTabletMode()
 */

import { ref, computed, onMounted } from 'vue'
import { ENV } from '@/config/environment'

// =============================================
// CONSTANTS
// =============================================

const STORAGE_KEY = 'app:tabletMode'
const TABLET_MIN_WIDTH = 600
const TABLET_MAX_WIDTH = 1400
const MOBILE_MAX_WIDTH = 768

// =============================================
// SINGLETON STATE
// =============================================

// Global state (shared across all component instances)
let isInitialized = false
const isTouchDevice = ref(false)
const screenWidth = ref(0)
const screenHeight = ref(0)
const manualOverride = ref<boolean | null>(null)
const userAgent = ref('')

// =============================================
// DETECTION FUNCTIONS
// =============================================

function detectTouchCapability(): boolean {
  if (typeof window === 'undefined') return false

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints for older browsers
    navigator.msMaxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  )
}

function detectTabletUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent.toLowerCase()

  // iPad detection (including iPadOS 13+ which reports as Mac)
  const isIPad = ua.includes('ipad') || (ua.includes('macintosh') && 'ontouchend' in document)

  // Android tablet detection
  const isAndroidTablet = ua.includes('android') && !ua.includes('mobile')

  // Surface/Windows tablets
  const isWindowsTablet = ua.includes('windows') && ua.includes('touch')

  return isIPad || isAndroidTablet || isWindowsTablet
}

function isTabletScreenSize(): boolean {
  const width = screenWidth.value
  const height = screenHeight.value

  // Portrait tablet: width 600-1200, height > width
  // Landscape tablet: width 900-1400, height < width
  const isPortraitTablet = width >= TABLET_MIN_WIDTH && width <= 1200 && height > width

  const isLandscapeTablet =
    width >= 900 && width <= TABLET_MAX_WIDTH && height < width && height >= 500

  // Also consider large phones in landscape as "tablet-like" for input purposes
  const isLargePhoneLandscape = width >= MOBILE_MAX_WIDTH && width <= 1100 && height < width

  return isPortraitTablet || isLandscapeTablet || isLargePhoneLandscape
}

// =============================================
// INITIALIZATION
// =============================================

function initialize() {
  if (isInitialized || typeof window === 'undefined') return

  // Initial detection
  isTouchDevice.value = detectTouchCapability()
  screenWidth.value = window.innerWidth
  screenHeight.value = window.innerHeight
  userAgent.value = navigator.userAgent

  // Check URL param for testing: ?tabletMode=true
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const urlTabletMode = urlParams.get('tabletMode')
    if (urlTabletMode !== null) {
      manualOverride.value = urlTabletMode === 'true'
      // Also save to localStorage so it persists
      localStorage.setItem(STORAGE_KEY, String(manualOverride.value))
    }
  } catch {
    // URL parsing failed
  }

  // Load manual override from storage (if not set by URL)
  if (manualOverride.value === null) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        manualOverride.value = stored === 'true'
      }
    } catch {
      // localStorage not available
    }
  }

  // Listen for resize
  const handleResize = () => {
    screenWidth.value = window.innerWidth
    screenHeight.value = window.innerHeight
  }

  // Listen for orientation change
  const handleOrientationChange = () => {
    // Small delay to get accurate dimensions after orientation change
    setTimeout(() => {
      screenWidth.value = window.innerWidth
      screenHeight.value = window.innerHeight
    }, 100)
  }

  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', handleOrientationChange)

  isInitialized = true
}

// =============================================
// COMPOSABLE
// =============================================

export function useTabletMode() {
  // Initialize on first use
  onMounted(() => {
    initialize()
  })

  // Computed: Auto-detected tablet mode
  const autoDetectedTabletMode = computed(() => {
    // Must have touch capability
    if (!isTouchDevice.value) return false

    // Check screen size OR user agent
    return isTabletScreenSize() || detectTabletUserAgent()
  })

  // Computed: Final tablet mode (with manual override)
  const isTabletMode = computed(() => {
    // Manual override takes precedence
    if (manualOverride.value !== null) {
      return manualOverride.value
    }

    // Mobile platform from ENV always uses tablet mode for numeric input
    if (ENV.isMobile) {
      return true
    }

    return autoDetectedTabletMode.value
  })

  // Computed: Device info for debugging
  const deviceInfo = computed(() => ({
    isTouchDevice: isTouchDevice.value,
    screenWidth: screenWidth.value,
    screenHeight: screenHeight.value,
    isTabletScreenSize: isTabletScreenSize(),
    isTabletUserAgent: detectTabletUserAgent(),
    autoDetectedTabletMode: autoDetectedTabletMode.value,
    manualOverride: manualOverride.value,
    finalTabletMode: isTabletMode.value,
    platform: ENV.platform,
    userAgent: userAgent.value.substring(0, 100)
  }))

  // Methods
  function forceTabletMode(enabled: boolean) {
    manualOverride.value = enabled
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled))
    } catch {
      // localStorage not available
    }
  }

  function resetTabletMode() {
    manualOverride.value = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage not available
    }
  }

  function toggleTabletMode() {
    forceTabletMode(!isTabletMode.value)
  }

  return {
    // State
    isTabletMode,
    isTouchDevice,
    screenWidth,
    screenHeight,

    // Computed
    autoDetectedTabletMode,
    deviceInfo,

    // Methods
    forceTabletMode,
    resetTabletMode,
    toggleTabletMode
  }
}

// =============================================
// UTILITY: Input mode attributes
// =============================================

/**
 * Returns HTML attributes to prevent system keyboard.
 * Use with v-bind on input elements.
 *
 * Usage:
 * <input v-bind="noKeyboardAttrs" @click="openKeypad" />
 */
export function useNoKeyboardAttrs() {
  const { isTabletMode } = useTabletMode()

  return computed(() => {
    if (!isTabletMode.value) return {}

    return {
      inputmode: 'none' as const,
      readonly: true,
      autocomplete: 'off',
      autocorrect: 'off',
      autocapitalize: 'off',
      spellcheck: false
    }
  })
}

// =============================================
// TYPE EXPORTS
// =============================================

export type TabletModeReturn = ReturnType<typeof useTabletMode>
