// src/layouts/pos/usePosLayout.ts

import { computed, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { POS_LAYOUTS, getAutoLayout } from './posConstants'
import type { LayoutPreset, ComputedDimensions, LayoutChecks } from './posTypes'

export const usePosLayout = () => {
  const { width, height } = useDisplay()

  // Ручное переключение режима (для настроек)
  const manualPreset = ref<LayoutPreset | null>(null)

  // Автоматическое определение layout'а
  const autoPreset = computed(() => {
    const layout = getAutoLayout(width.value)
    return layout.name
  })

  // Текущий preset (ручной или автоматический)
  const currentPreset = computed(() => manualPreset.value || autoPreset.value)

  // Конфигурация текущего layout'а
  const config = computed(() => POS_LAYOUTS[currentPreset.value])

  // Вычисляемые размеры
  const dimensions = computed((): ComputedDimensions => {
    const cfg = config.value.dimensions

    // Доступная ширина = общая ширина - sidebar
    const availableWidth = width.value - cfg.sidebar.width

    // Ширина меню по соотношению
    const menuWidth = Math.floor(availableWidth * cfg.content.menuRatio)

    // Order секция занимает оставшееся место (без фиксированной ширины)
    const orderWidth = availableWidth - menuWidth

    return {
      sidebar: { width: cfg.sidebar.width },
      menu: { width: menuWidth },
      order: {
        width: orderWidth, // Динамическая ширина
        minWidth: cfg.content.orderMinWidth,
        maxWidth: Math.max(orderWidth, cfg.content.orderMaxWidth) // Не ограничиваем если места больше
      },
      spacing: {
        ...cfg.spacing,
        gap: 0 // Убираем gap
      },
      components: cfg.components
    }
  })

  // CSS переменные
  const cssVariables = computed(() => {
    const dims = dimensions.value
    return {
      '--pos-sidebar-width': `${dims.sidebar.width}px`,
      '--pos-menu-width': `${dims.menu.width}px`,
      '--pos-order-width': `${dims.order.width}px`,
      '--pos-gap': `0px`,
      '--pos-padding': `${dims.spacing.padding}px`,
      '--pos-border-radius': `${dims.spacing.borderRadius}px`,
      '--pos-header-height': `${dims.components.headerHeight}px`,
      '--pos-table-item-height': `${dims.components.tableItemHeight}px`,
      '--pos-order-item-height': `${dims.components.orderItemHeight}px`,
      '--pos-button-height': `${dims.components.buttonHeight}px`,
      '--pos-icon-size': `${dims.components.iconSize}px`
    }
  })

  // Проверки для адаптации UI
  const checks = computed(
    (): LayoutChecks => ({
      isCompact: currentPreset.value === 'compact',
      isStandard: currentPreset.value === 'standard',
      isComfortable: currentPreset.value === 'comfortable',
      isWide: currentPreset.value === 'wide',
      shouldUseIconsOnly: currentPreset.value === 'compact',
      hasEnoughSpaceForDetails: dimensions.value.order.width >= 360
    })
  )

  // Методы
  const setPreset = (preset: LayoutPreset) => {
    manualPreset.value = preset
  }

  const resetToAuto = () => {
    manualPreset.value = null
  }

  // Debug информация (упрощенная)
  const debugInfo = computed(() => ({
    screenSize: `${width.value}x${height.value}`,
    currentPreset: currentPreset.value,
    manualPreset: manualPreset.value,
    autoPreset: autoPreset.value
  }))

  return {
    // Основные данные
    currentPreset,
    config,
    dimensions,
    cssVariables,
    checks,

    // Методы
    setPreset,
    resetToAuto,

    // Debug
    debugInfo,

    // Прямой доступ к размерам экрана
    screenWidth: width,
    screenHeight: height
  }
}
