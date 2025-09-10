import { useDisplay } from 'vuetify'
import { computed } from 'vue'

export const useVuetifyBreakpoints = () => {
  const display = useDisplay()

  return {
    // Базовые состояния
    isMobile: display.mobile,
    isTablet: computed(() => display.mdAndDown.value && !display.smAndDown.value),
    isDesktop: computed(() => display.lgAndUp.value),
    screenWidth: display.width,

    // Точные брейкпоинты
    isXs: display.xs,
    isSm: display.sm,
    isMd: display.md,
    isLg: display.lg,
    isXl: display.xl,

    // Композитные состояния
    isSmallScreen: computed(() => display.smAndDown.value),
    isLargeScreen: computed(() => display.lgAndUp.value),
    isMediumScreen: computed(() => display.md.value)
  }
}
