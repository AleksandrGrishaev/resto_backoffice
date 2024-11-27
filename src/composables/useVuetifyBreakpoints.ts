// src/composables/useVuetifyBreakpoints.ts
import { useDisplay } from 'vuetify'
import { computed } from 'vue'

export const useVuetifyBreakpoints = () => {
  const { mobile, tablet, desktop, width, xs, sm, md, lg, xl } = useDisplay()

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
    isSmallScreen: computed(() => mobile.value || tablet.value), // < 960px
    isLargeScreen: computed(() => lg.value || xl.value), // >= 1280px
    isMediumScreen: computed(() => md.value) // >= 960px && < 1280px
  }
}
