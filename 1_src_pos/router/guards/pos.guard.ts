// src/router/guards/pos.guard.ts
import { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { useOrderStore } from '@/stores/order.store'
import { useNavigationStore } from '@/stores/navigation.store'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PosGuard'

export const posGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  // Проверяем только при уходе со страницы POS
  if (from.name !== 'pos') {
    return next()
  }

  const orderStore = useOrderStore()

  // Если нет несохраненных изменений, пропускаем
  if (!orderStore.hasUnsavedChanges) {
    return next()
  }

  const navigationStore = useNavigationStore()

  try {
    const confirmed = await navigationStore.confirmNavigation()
    return next(confirmed ? undefined : false)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Navigation confirmation error:', error)
    return next(false)
  }
}
