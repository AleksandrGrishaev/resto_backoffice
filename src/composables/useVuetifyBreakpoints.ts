// src/composables/useVuetifyBreakpoints.ts
import { useDisplay } from 'vuetify'
import { computed, ref } from 'vue'

export const useVuetifyBreakpoints = () => {
  // useDisplay() может вернуть undefined если вызван вне Vuetify контекста
  const display = useDisplay()

  // Fallback refs если display недоступен
  const fallbackFalse = ref(false)
  const fallbackTrue = ref(true)
  const fallbackWidth = ref(1024)

  const mobile = display?.mobile ?? fallbackFalse
  const tablet = display?.tablet ?? fallbackFalse
  const desktop = display?.desktop ?? fallbackTrue
  const width = display?.width ?? fallbackWidth
  const xs = display?.xs ?? fallbackFalse
  const sm = display?.sm ?? fallbackFalse
  const md = display?.md ?? fallbackFalse
  const lg = display?.lg ?? fallbackTrue
  const xl = display?.xl ?? fallbackFalse

  return {
    // Базовые состояния
    isMobile: mobile,
    isTablet: tablet,
    isDesktop: desktop,
    screenWidth: width,

    // Точные брейкпоинты
    isXs: xs,
    isSm: sm,
    isMd: md,
    isLg: lg,
    isXl: xl,

    // Композитные состояния
    isSmallScreen: computed(() => mobile?.value || tablet?.value || false), // < 960px
    isLargeScreen: computed(() => lg?.value || xl?.value || false), // >= 1280px
    isMediumScreen: computed(() => md?.value || false) // >= 960px && < 1280px
  }
}
